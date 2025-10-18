"""
Output writers for JSON, CSV, and asset downloads.
"""

import csv
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests

logger = logging.getLogger(__name__)


class OutputWriter:
    """Write extraction results to various formats."""
    
    def __init__(self, output_dir: Path, domain: str):
        """
        Initialize writer.
        
        Args:
            output_dir: Base output directory
            domain: Domain being processed (for subdirectory)
        """
        self.output_dir = output_dir
        self.domain = domain
        
        # Create domain-specific subdirectory
        self.domain_dir = output_dir / self._sanitize_domain(domain)
        self.domain_dir.mkdir(parents=True, exist_ok=True)
        
        # Assets subdirectory
        self.assets_dir = self.domain_dir / "assets"
        self.assets_dir.mkdir(exist_ok=True)
    
    @staticmethod
    def _sanitize_domain(domain: str) -> str:
        """Sanitize domain for use as directory name."""
        # Remove protocol, keep only domain
        parsed = urlparse(domain)
        clean = parsed.netloc or domain
        
        # Remove www. prefix
        if clean.startswith("www."):
            clean = clean[4:]
        
        # Replace invalid characters
        clean = clean.replace(":", "-").replace("/", "-")
        
        return clean
    
    def write_truth_json(self, truth_data: dict) -> Path:
        """
        Write full truth.json file.
        
        Args:
            truth_data: Complete truth record
            
        Returns:
            Path to written file
        """
        output_path = self.domain_dir / "truth.json"
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(truth_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Wrote truth.json to {output_path}")
        return output_path
    
    def write_summary_csv(self, fields: dict) -> Path:
        """
        Write summary.csv with one row per field.
        
        Args:
            fields: Dict of field results
            
        Returns:
            Path to written file
        """
        output_path = self.domain_dir / "summary.csv"
        
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["field", "value", "confidence", "source"])
            
            for field_name, field_result in fields.items():
                value = field_result.get("value")
                confidence = field_result.get("confidence", 0)
                provenance = field_result.get("provenance", [])
                
                # Format value for CSV
                if isinstance(value, dict):
                    value_str = json.dumps(value)
                elif isinstance(value, list):
                    value_str = ", ".join(str(v) for v in value)
                else:
                    value_str = str(value) if value is not None else ""
                
                # Get first source
                source = provenance[0]["path"] if provenance else ""
                
                writer.writerow([field_name, value_str, confidence, source])
        
        logger.info(f"Wrote summary.csv to {output_path}")
        return output_path
    
    def write_crawl_json(self, crawl_data: dict) -> Path:
        """
        Write crawl.json with metadata about the crawl.
        
        Args:
            crawl_data: Crawl metadata
            
        Returns:
            Path to written file
        """
        output_path = self.domain_dir / "crawl.json"
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(crawl_data, f, indent=2)
        
        logger.info(f"Wrote crawl.json to {output_path}")
        return output_path
    
    def download_asset(
        self,
        url: str,
        base_url: str,
        preferred_name: Optional[str] = None,
        timeout: int = 10
    ) -> Optional[Path]:
        """
        Download an asset (e.g., logo) to the assets directory.
        
        Args:
            url: Asset URL
            base_url: Base URL for resolving relative URLs
            preferred_name: Preferred filename
            timeout: Request timeout
            
        Returns:
            Path to downloaded file or None if failed
        """
        try:
            # Make URL absolute
            absolute_url = urljoin(base_url, url)
            
            # Fetch
            response = requests.get(absolute_url, timeout=timeout)
            response.raise_for_status()
            
            # Determine filename
            if preferred_name:
                filename = preferred_name
            else:
                # Extract from URL
                parsed = urlparse(absolute_url)
                filename = Path(parsed.path).name or "asset"
            
            # Ensure we have an extension
            if "." not in filename:
                # Try to infer from content-type
                content_type = response.headers.get("Content-Type", "")
                if "svg" in content_type:
                    filename += ".svg"
                elif "png" in content_type:
                    filename += ".png"
                elif "jpeg" in content_type or "jpg" in content_type:
                    filename += ".jpg"
            
            # Write to assets directory
            output_path = self.assets_dir / filename
            
            with open(output_path, "wb") as f:
                f.write(response.content)
            
            logger.info(f"Downloaded asset to {output_path} ({len(response.content)} bytes)")
            return output_path
        
        except Exception as e:
            logger.warning(f"Failed to download asset from {url}: {e}")
            return None
    
    def get_relative_path(self, absolute_path: Path) -> str:
        """
        Get path relative to domain directory for JSON output.
        
        Args:
            absolute_path: Absolute path to file
            
        Returns:
            Relative path string
        """
        try:
            return str(absolute_path.relative_to(self.domain_dir))
        except ValueError:
            return str(absolute_path)


def build_truth_record(
    domain: str,
    crawl_result,
    fields: dict,
    candidates: dict,
) -> dict:
    """
    Build the complete truth record.
    
    Args:
        domain: Domain being processed
        crawl_result: CrawlResult object
        fields: Dict of resolved field results
        candidates: Dict of all candidates (for transparency)
        
    Returns:
        Complete truth record dict
    """
    # Create business ID from domain
    business_id = domain.replace(".", "-").replace("www-", "")
    
    # Convert fields to dict format
    fields_dict = {}
    for field_name, field_result in fields.items():
        if hasattr(field_result, "to_dict"):
            fields_dict[field_name] = field_result.to_dict()
        else:
            fields_dict[field_name] = field_result
    
    truth_record = {
        "business_id": business_id,
        "domain": domain,
        "crawled_at": datetime.utcnow().isoformat() + "Z",
        "pages_visited": len(crawl_result.get_successful_pages()),
        "fields": fields_dict,
        "candidates": candidates,  # Include all candidates for transparency
    }
    
    return truth_record


def build_crawl_metadata(crawl_result, stats) -> dict:
    """
    Build crawl metadata.
    
    Args:
        crawl_result: CrawlResult object
        stats: CrawlStats object
        
    Returns:
        Crawl metadata dict
    """
    pages_info = []
    
    for page in crawl_result.pages:
        pages_info.append({
            "url": page.url,
            "title": page.title,
            "success": page.success,
            "status_code": page.status_code,
            "depth": page.depth,
            "elapsed_ms": page.elapsed_ms,
            "from_cache": page.from_cache,
        })
    
    metadata = {
        "start_url": crawl_result.start_url,
        "domain": crawl_result.domain,
        "pages_attempted": stats.pages_attempted,
        "pages_successful": stats.pages_successful,
        "pages_failed": stats.pages_failed,
        "pages_cached": stats.pages_cached,
        "total_bytes": stats.total_bytes,
        "total_time_ms": stats.total_time_ms,
        "failed_urls": crawl_result.failed_urls,
        "pages": pages_info,
    }
    
    return metadata


