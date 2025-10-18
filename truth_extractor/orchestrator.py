"""
Main orchestrator that coordinates crawling, extraction, resolution, and output.
"""

import logging
from pathlib import Path
from typing import Optional

from truth_extractor.config import Config
from truth_extractor.crawl.crawler import WebCrawler
from truth_extractor.crawl.fetcher import extract_domain
from truth_extractor.extraction.brand_name import BrandNameExtractor
from truth_extractor.extraction.colors import ColorExtractor
from truth_extractor.extraction.contact import ContactExtractor
from truth_extractor.extraction.jsonld import JSONLDExtractor
from truth_extractor.extraction.logo import LogoExtractor
from truth_extractor.extraction.services import ServicesExtractor
from truth_extractor.extraction.socials import SocialExtractor
from truth_extractor.extraction.textbits import TextBitsExtractor
from truth_extractor.reporting.writer import (
    OutputWriter,
    build_crawl_metadata,
    build_truth_record,
)
from truth_extractor.resolve.resolver import FieldResolver

logger = logging.getLogger(__name__)


class TruthExtractor:
    """
    Main orchestrator for extracting truth records from websites.
    """
    
    def __init__(self, config: Config):
        """
        Initialize extractor.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.resolver = FieldResolver(geocode_token=config.geocode_token)
    
    def extract(self, url: str) -> dict:
        """
        Extract truth record from a URL.
        
        Args:
            url: URL to process
            
        Returns:
            Truth record dict
        """
        logger.info(f"Starting extraction for {url}")
        
        # Setup cache directory
        cache_dir = Path(self.config.output_dir) / ".cache"
        cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Step 1: Crawl website
        logger.info("Step 1: Crawling website...")
        crawler = WebCrawler(self.config.crawl, cache_dir=cache_dir)
        crawl_result = crawler.crawl(url)
        
        successful_pages = crawl_result.get_successful_pages()
        if not successful_pages:
            logger.error("No pages successfully crawled")
            raise Exception("Failed to crawl any pages")
        
        logger.info(f"Crawled {len(successful_pages)} pages successfully")
        
        # Check if the main page is a JavaScript SPA
        if successful_pages and successful_pages[0].parser:
            is_spa = successful_pages[0].parser.is_javascript_spa()
            logger.debug(f"SPA detection: {is_spa}, Playwright enabled: {self.config.crawl.use_playwright}")
            
            if is_spa and not self.config.crawl.use_playwright:
                logger.warning(
                    "Website appears to be a JavaScript SPA or parked domain! "
                    "The truth_extractor works with static HTML only. "
                    "This site may return no or limited results. "
                    "Try using --use-playwright flag."
                )
        
        # Step 2: Extract candidates from all pages
        logger.info("Step 2: Extracting candidates...")
        all_candidates = self._extract_all_candidates(successful_pages)
        
        # Step 2.5: Merge service candidates from multiple pages
        all_candidates["services"] = self._merge_service_candidates(all_candidates["services"])
        
        # Step 3: Resolve candidates to final values
        logger.info("Step 3: Resolving candidates...")
        fields = self._resolve_fields(all_candidates)
        
        # Step 4: Build truth record
        domain = extract_domain(url)
        truth_record = build_truth_record(
            domain=domain,
            crawl_result=crawl_result,
            fields=fields,
            candidates=self._candidates_to_dict(all_candidates),
        )
        
        # Step 5: Write outputs
        logger.info("Step 4: Writing outputs...")
        writer = OutputWriter(Path(self.config.output_dir), domain)
        
        # Download logo if available
        logo_result = fields.get("logo")
        if logo_result and logo_result.value:
            downloaded_logo = writer.download_asset(
                url=logo_result.value,
                base_url=url,
                preferred_name="logo"
            )
            if downloaded_logo:
                # Update logo path to relative path
                fields["logo"].value = writer.get_relative_path(downloaded_logo)
        
        # Rebuild truth record with updated logo path
        truth_record = build_truth_record(
            domain=domain,
            crawl_result=crawl_result,
            fields=fields,
            candidates=self._candidates_to_dict(all_candidates),
        )
        
        # Write files
        writer.write_truth_json(truth_record)
        writer.write_summary_csv(truth_record["fields"])
        
        # Write crawl metadata
        crawl_metadata = build_crawl_metadata(crawl_result, crawler.fetcher.get_stats())
        writer.write_crawl_json(crawl_metadata)
        
        logger.info(f"Extraction complete for {url}")
        
        return truth_record
    
    def _extract_all_candidates(self, pages: list) -> dict:
        """
        Extract candidates from all crawled pages.
        
        Args:
            pages: List of CrawledPage objects
            
        Returns:
            Dict of field_name -> list of candidates
        """
        candidates = {
            "brand_name": [],
            "location": [],
            "email": [],
            "phone": [],
            "socials": {platform: [] for platform in [
                "facebook", "instagram", "linkedin", "x", "youtube", "tiktok", "yelp"
            ]},
            "services": [],
            "brand_colors": [],
            "logo": [],
            "background": [],
            "slogan": [],
        }
        
        for page in pages:
            if not page.parser:
                continue
            
            try:
                # JSON-LD extraction
                jsonld = JSONLDExtractor(page.parser)
                candidates["brand_name"].extend(jsonld.extract_organization_name())
                candidates["location"].extend(jsonld.extract_address())
                
                # Brand name extraction (from titles, headers, etc.)
                brand_name_extractor = BrandNameExtractor(page.parser)
                candidates["brand_name"].extend(brand_name_extractor.extract_from_title())
                candidates["brand_name"].extend(brand_name_extractor.extract_from_og_title())
                candidates["brand_name"].extend(brand_name_extractor.extract_from_header())
                
                contact_info = jsonld.extract_contact_info()
                candidates["email"].extend(contact_info["email"])
                candidates["phone"].extend(contact_info["phone"])
                
                candidates["logo"].extend(jsonld.extract_logo())
                candidates["background"].extend(jsonld.extract_description())
                
                # Contact extraction
                contact = ContactExtractor(page.parser)
                candidates["email"].extend(contact.extract_emails())
                candidates["phone"].extend(contact.extract_phones())
                candidates["location"].extend(contact.extract_addresses())
                
                # Social links
                socials = SocialExtractor(page.parser)
                social_links = socials.extract_all()
                for platform, platform_candidates in social_links.items():
                    candidates["socials"][platform].extend(platform_candidates)
                
                # Logo
                logo_extractor = LogoExtractor(page.parser)
                candidates["logo"].extend(logo_extractor.extract_logos())
                
                # Services (only from pages likely to contain them)
                if any(keyword in page.url.lower() for keyword in ["service", "about", "home", "work"]):
                    services = ServicesExtractor(page.parser)
                    candidates["services"].extend(
                        services.extract_services(self.config.extraction.services_max_count)
                    )
                
                # Text bits (primarily from homepage and about page)
                if any(keyword in page.url.lower() for keyword in ["about", "home"]) or page.depth == 0:
                    textbits = TextBitsExtractor(page.parser)
                    candidates["background"].extend(
                        textbits.extract_background(self.config.extraction.background_max_words)
                    )
                    candidates["slogan"].extend(
                        textbits.extract_slogan(self.config.extraction.slogan_max_words)
                    )
            
            except Exception as e:
                logger.warning(f"Error extracting from {page.url}: {e}")
        
        # Extract colors (after we have a logo candidate)
        logo_url = None
        if candidates["logo"]:
            from truth_extractor.resolve.scoring import score_candidates
            sorted_logos = score_candidates(candidates["logo"])
            if sorted_logos:
                logo_url = sorted_logos[0].value
        
        # Extract colors from homepage
        homepage = pages[0] if pages else None
        if homepage and homepage.parser:
            colors = ColorExtractor(homepage.parser)
            candidates["brand_colors"].extend(colors.extract_colors(logo_url))
        
        return candidates
    
    def _merge_service_candidates(self, service_candidates: list) -> list:
        """
        Merge service candidates from multiple pages into a single combined candidate.
        
        Args:
            service_candidates: List of service candidates (each with value as list of services)
            
        Returns:
            List with single merged candidate or original list if no merging needed
        """
        if not service_candidates:
            return service_candidates
        
        # Collect all unique services across all candidates
        all_services = set()
        best_candidate = None
        best_score = 0.0
        
        for candidate in service_candidates:
            if isinstance(candidate.value, list):
                all_services.update(candidate.value)
                # Calculate score the same way as in models.py
                score = (candidate.source_weight or 0.5) * (candidate.method_weight or 0.5)
                if score > best_score:
                    best_score = score
                    best_candidate = candidate
        
        # If we found services from multiple candidates, create one merged candidate
        if len(service_candidates) > 1 and all_services and best_candidate:
            from truth_extractor.extraction.models import Candidate
            
            merged = Candidate(
                value=sorted(list(all_services)),  # Sort for consistency
                source_weight=best_candidate.source_weight,
                method_weight=best_candidate.method_weight,
                provenance=best_candidate.provenance,
                notes=f"merged from {len(service_candidates)} pages"
            )
            return [merged]
        
        return service_candidates
    
    def _resolve_fields(self, candidates: dict) -> dict:
        """
        Resolve all field candidates to final values.
        
        Args:
            candidates: Dict of candidates per field
            
        Returns:
            Dict of field_name -> FieldResult
        """
        fields = {}
        
        fields["brand_name"] = self.resolver.resolve_brand_name(candidates["brand_name"])
        fields["location"] = self.resolver.resolve_address(candidates["location"])
        fields["email"] = self.resolver.resolve_email(candidates["email"])
        fields["phone"] = self.resolver.resolve_phone(candidates["phone"])
        fields["socials"] = self.resolver.resolve_socials(candidates["socials"])
        fields["services"] = self.resolver.resolve_services(candidates["services"])
        fields["brand_colors"] = self.resolver.resolve_colors(candidates["brand_colors"])
        fields["logo"] = self.resolver.resolve_logo(candidates["logo"])
        fields["background"] = self.resolver.resolve_text(candidates["background"])
        fields["slogan"] = self.resolver.resolve_text(candidates["slogan"])
        
        return fields
    
    @staticmethod
    def _candidates_to_dict(candidates: dict) -> dict:
        """
        Convert candidates to dict format for JSON output.
        
        Args:
            candidates: Dict of candidates
            
        Returns:
            Serializable dict
        """
        result = {}
        
        for field_name, field_candidates in candidates.items():
            if field_name == "socials":
                # Special handling for socials dict
                result[field_name] = {}
                for platform, platform_candidates in field_candidates.items():
                    result[field_name][platform] = [
                        {
                            "value": c.value,
                            "score": c.score,
                            "provenance": [p.to_dict() for p in c.provenance],
                        }
                        for c in platform_candidates
                    ]
            else:
                result[field_name] = [
                    {
                        "value": c.value,
                        "score": c.score,
                        "provenance": [p.to_dict() for p in c.provenance],
                        "notes": c.notes,
                    }
                    for c in field_candidates
                ]
        
        return result

