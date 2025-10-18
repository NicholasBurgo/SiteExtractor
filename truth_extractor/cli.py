"""
Command-line interface for Truth Extractor.
"""

import argparse
import logging
import sys
from pathlib import Path

import colorama

from truth_extractor.config import Config
from truth_extractor.orchestrator import TruthExtractor

# Initialize colorama for cross-platform colored output
colorama.init()

# Setup logging
logger = logging.getLogger(__name__)


def setup_logging(verbose: bool = False):
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    
    # Configure root logger
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    
    # Reduce noise from libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)


def process_single_url(url: str, config: Config) -> bool:
    """
    Process a single URL.
    
    Args:
        url: URL to process
        config: Configuration
        
    Returns:
        True if successful
    """
    try:
        extractor = TruthExtractor(config)
        result = extractor.extract(url)
        
        print(f"\n{colorama.Fore.GREEN}[SUCCESS] Extracted truth record for {url}{colorama.Style.RESET_ALL}")
        print(f"  Pages crawled: {result['pages_visited']}")
        
        # Display results table
        print(f"\n{colorama.Fore.CYAN}{'='*80}{colorama.Style.RESET_ALL}")
        print(f"{'FIELD':<15} {'VALUE':<35} {'CONFIDENCE':<12} {'STATUS'}")
        print(f"{'-'*80}")
        
        fields = result['fields']
        field_names = {
            'brand_name': 'Brand Name',
            'location': 'Location', 
            'email': 'Email',
            'phone': 'Phone',
            'socials': 'Social Media',
            'services': 'Services',
            'brand_colors': 'Colors',
            'logo': 'Logo',
            'background': 'Background',
            'slogan': 'Slogan'
        }
        
        for field_key, display_name in field_names.items():
            field_data = fields.get(field_key, {})
            value = field_data.get('value')
            confidence = field_data.get('confidence', 0.0)
            
            # Format value for display
            if value is None:
                display_value = "null"
                status = f"{colorama.Fore.RED}Not Found{colorama.Style.RESET_ALL}"
            elif isinstance(value, list):
                if len(value) == 0:
                    display_value = "null"
                    status = f"{colorama.Fore.RED}Not Found{colorama.Style.RESET_ALL}"
                else:
                    display_value = ", ".join(str(v) for v in value[:2])  # Show first 2
                    if len(value) > 2:
                        display_value += f" (+{len(value)-2} more)"
                    status = f"{colorama.Fore.GREEN}Found{colorama.Style.RESET_ALL}"
            elif isinstance(value, dict):
                # For socials dict
                non_null = {k: v for k, v in value.items() if v is not None}
                if non_null:
                    display_value = f"{len(non_null)} platforms"
                    status = f"{colorama.Fore.GREEN}Found{colorama.Style.RESET_ALL}"
                else:
                    display_value = "null"
                    status = f"{colorama.Fore.RED}Not Found{colorama.Style.RESET_ALL}"
            else:
                # Truncate long strings
                display_value = str(value)
                if len(display_value) > 32:
                    display_value = display_value[:29] + "..."
                status = f"{colorama.Fore.GREEN}Found{colorama.Style.RESET_ALL}"
            
            # Color code confidence
            if confidence >= 0.8:
                conf_color = colorama.Fore.GREEN
            elif confidence >= 0.5:
                conf_color = colorama.Fore.YELLOW
            else:
                conf_color = colorama.Fore.RED
            
            print(f"{display_name:<15} {display_value:<35} {conf_color}{confidence:.2f}{colorama.Style.RESET_ALL:<12} {status}")
        
        print(f"{'-'*80}")
        
        # Summary stats
        found_count = sum(1 for f in fields.values() if f.get('value') is not None and f.get('value') != [] and f.get('value') != {})
        total_count = len(field_names)
        print(f"Summary: {found_count}/{total_count} fields extracted successfully")
        
        # Warning for JavaScript SPAs
        if found_count == 0 and result.get('pages_visited', 0) == 1:
            print(f"\n{colorama.Fore.YELLOW}WARNING: No data extracted.{colorama.Style.RESET_ALL}")
            print(f"{colorama.Fore.YELLOW}This website may be:{colorama.Style.RESET_ALL}")
            print(f"{colorama.Fore.YELLOW}  - A JavaScript Single-Page App (React/Vue/Angular){colorama.Style.RESET_ALL}")
            print(f"{colorama.Fore.YELLOW}  - A parked/placeholder domain{colorama.Style.RESET_ALL}")
            print(f"{colorama.Fore.YELLOW}  - Blocking scraping/crawling{colorama.Style.RESET_ALL}")
            print(f"{colorama.Fore.YELLOW}The truth_extractor works best with static HTML websites.{colorama.Style.RESET_ALL}")
        
        return True
    
    except Exception as e:
        print(f"\n{colorama.Fore.RED}[FAILED] Failed to process {url}: {e}{colorama.Style.RESET_ALL}")
        logger.exception("Extraction failed")
        return False


def process_batch(batch_file: Path, config: Config) -> dict:
    """
    Process multiple URLs from a file.
    
    Args:
        batch_file: Path to file with one URL per line
        config: Configuration
        
    Returns:
        Dict with success/failure stats
    """
    urls = []
    
    # Read URLs
    with open(batch_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                urls.append(line)
    
    print(f"Processing {len(urls)} URLs from {batch_file}")
    
    results = {"success": 0, "failed": 0, "failed_urls": []}
    
    for i, url in enumerate(urls, 1):
        print(f"\n[{i}/{len(urls)}] Processing {url}...")
        
        if process_single_url(url, config):
            results["success"] += 1
        else:
            results["failed"] += 1
            results["failed_urls"].append(url)
    
    # Summary
    print(f"\n{colorama.Fore.CYAN}{'='*60}{colorama.Style.RESET_ALL}")
    print(f"Batch processing complete:")
    print(f"  [OK] Success: {results['success']}")
    print(f"  [FAIL] Failed: {results['failed']}")
    
    if results["failed_urls"]:
        print(f"\nFailed URLs:")
        for url in results["failed_urls"]:
            print(f"  - {url}")
    
    return results


def evaluate_against_golden(batch_file: Path, golden_dir: Path, config: Config) -> dict:
    """
    Evaluate extraction against golden dataset.
    
    Args:
        batch_file: Path to file with URLs
        golden_dir: Directory with golden truth.json files
        config: Configuration
        
    Returns:
        Evaluation metrics
    """
    import json
    
    print(f"Evaluating against golden dataset in {golden_dir}")
    
    # TODO: Implement evaluation logic
    # This would:
    # 1. Process each URL
    # 2. Load corresponding golden truth.json
    # 3. Compare field by field
    # 4. Calculate precision/recall/coverage per field
    # 5. Generate evaluation report
    
    print(f"{colorama.Fore.YELLOW}Note: Evaluation mode is not yet fully implemented{colorama.Style.RESET_ALL}")
    
    # For now, just process the batch
    return process_batch(batch_file, config)


def main():
    """Main CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Truth Extractor: Extract normalized business information from websites",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single site
  truth-extractor https://example.com
  
  # With options
  truth-extractor https://example.com --out output --max-pages 30
  
  # Batch mode
  truth-extractor --batch sites.txt
  
  # Evaluation mode
  truth-extractor --batch sites.txt --evaluate goldens/ --report report.csv
        """
    )
    
    # Main arguments
    parser.add_argument(
        "url",
        nargs="?",
        help="URL to extract (required unless --batch is used)"
    )
    
    # Options
    parser.add_argument(
        "--out",
        default="out",
        help="Output directory (default: out)"
    )
    
    parser.add_argument(
        "--max-pages",
        type=int,
        default=20,
        help="Maximum pages to crawl (default: 20)"
    )
    
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Request timeout in seconds (default: 10)"
    )
    
    parser.add_argument(
        "--geocode-token",
        help="Optional geocoding API token"
    )
    
    parser.add_argument(
        "--user-agent",
        help="Custom user-agent string"
    )
    
    parser.add_argument(
        "--use-playwright",
        action="store_true",
        help="Use Playwright for JavaScript-rendered sites (requires: pip install playwright && playwright install chromium)"
    )
    
    # Batch mode
    parser.add_argument(
        "--batch",
        type=Path,
        help="Batch mode: process URLs from file (one per line)"
    )
    
    # Evaluation mode
    parser.add_argument(
        "--evaluate",
        type=Path,
        help="Evaluation mode: compare against golden dataset"
    )
    
    parser.add_argument(
        "--report",
        type=Path,
        help="Evaluation report output path"
    )
    
    # Verbose logging
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    
    # Validate arguments
    if not args.url and not args.batch:
        parser.error("Either URL or --batch must be provided")
    
    if args.evaluate and not args.batch:
        parser.error("--evaluate requires --batch")
    
    # Build config
    config = Config()
    config.output_dir = args.out
    config.crawl.max_pages = args.max_pages
    config.crawl.timeout = args.timeout
    config.crawl.use_playwright = args.use_playwright
    config.geocode_token = args.geocode_token
    config.custom_user_agent = args.user_agent
    
    # Execute
    try:
        if args.evaluate:
            # Evaluation mode
            results = evaluate_against_golden(args.batch, args.evaluate, config)
            success = results["failed"] == 0
        
        elif args.batch:
            # Batch mode
            results = process_batch(args.batch, config)
            success = results["failed"] == 0
        
        else:
            # Single URL mode
            success = process_single_url(args.url, config)
        
        sys.exit(0 if success else 1)
    
    except KeyboardInterrupt:
        print(f"\n{colorama.Fore.YELLOW}Interrupted by user{colorama.Style.RESET_ALL}")
        sys.exit(130)
    
    except Exception as e:
        print(f"\n{colorama.Fore.RED}Fatal error: {e}{colorama.Style.RESET_ALL}")
        logger.exception("Fatal error")
        sys.exit(1)


if __name__ == "__main__":
    main()

