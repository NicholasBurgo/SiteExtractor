"""
Logo discovery and quality assessment.
"""

import logging
from typing import Optional
from urllib.parse import urlparse

from truth_extractor.crawl.parser import HTMLParser
from truth_extractor.extraction.models import Candidate, Provenance

logger = logging.getLogger(__name__)


class LogoExtractor:
    """Discover and score logo images."""
    
    def __init__(self, parser: HTMLParser):
        """
        Initialize extractor.
        
        Args:
            parser: HTMLParser instance
        """
        self.parser = parser
        self.url = parser.base_url
        self.soup = parser.get_soup()
    
    def extract_logos(self) -> list[Candidate]:
        """
        Extract logo candidates with quality scoring.
        
        Returns:
            List of logo candidates sorted by score
        """
        candidates = []
        seen_urls = set()
        
        # 1. Look for itemprop="logo"
        logo_items = self.parser.find_by_itemprop("logo")
        for item in logo_items:
            if item.name == "img":
                src = item.get("src")
                if src:
                    src = self._make_absolute(src)
                    if src not in seen_urls:
                        seen_urls.add(src)
                        candidates.append(self._create_candidate(
                            src=src,
                            source_weight=0.95,
                            path="img[itemprop='logo']",
                            alt=item.get("alt", ""),
                            width=item.get("width"),
                            height=item.get("height"),
                        ))
        
        # 2. Look for rel="logo" or class/id containing "logo"
        logo_images = self.parser.find_images(patterns=["logo"])
        for img in logo_images:
            src = img["src"]
            if src and src not in seen_urls:
                seen_urls.add(src)
                candidates.append(self._create_candidate(
                    src=src,
                    source_weight=0.85,
                    path="img[class*='logo']",
                    alt=img["alt"],
                    width=img["width"],
                    height=img["height"],
                ))
        
        # 3. Look in header for likely logos
        header = self.soup.find("header")
        if header:
            for img in header.find_all("img"):
                src = img.get("src")
                if src:
                    src = self._make_absolute(src)
                    if src not in seen_urls:
                        seen_urls.add(src)
                        candidates.append(self._create_candidate(
                            src=src,
                            source_weight=0.75,
                            path="header img",
                            alt=img.get("alt", ""),
                            width=img.get("width"),
                            height=img.get("height"),
                        ))
        
        # 4. OpenGraph image (fallback)
        og_image = self.parser.get_meta_content(property="og:image")
        if og_image:
            og_image = self._make_absolute(og_image)
            if og_image not in seen_urls:
                seen_urls.add(og_image)
                candidates.append(self._create_candidate(
                    src=og_image,
                    source_weight=0.6,
                    path="meta[property='og:image']",
                ))
        
        # Sort by score
        candidates.sort(key=lambda c: c.score, reverse=True)
        
        return candidates
    
    def _create_candidate(
        self,
        src: str,
        source_weight: float,
        path: str,
        alt: str = "",
        width: Optional[str] = None,
        height: Optional[str] = None,
    ) -> Candidate:
        """
        Create a logo candidate with quality scoring.
        
        Args:
            src: Image URL
            source_weight: Base source weight
            path: Extraction path
            alt: Alt text
            width: Width attribute
            height: Height attribute
            
        Returns:
            Candidate object
        """
        # Calculate method weight based on quality indicators
        method_weight = 0.8
        notes_parts = []
        
        # Prefer SVG
        if src.lower().endswith(".svg"):
            method_weight = 1.0
            notes_parts.append("svg")
        
        # PNG is good (likely has transparency)
        elif src.lower().endswith(".png"):
            method_weight = 0.9
            notes_parts.append("png")
        
        # WebP is acceptable
        elif src.lower().endswith(".webp"):
            method_weight = 0.85
            notes_parts.append("webp")
        
        # JPG is less ideal for logos
        elif src.lower().endswith((".jpg", ".jpeg")):
            method_weight = 0.7
            notes_parts.append("jpg")
        
        # Check dimensions if available
        if width and height:
            try:
                w = int(width)
                h = int(height)
                notes_parts.append(f"{w}x{h}")
                
                # Reasonable logo dimensions boost score
                if 100 <= w <= 1000 and 50 <= h <= 500:
                    method_weight = min(1.0, method_weight + 0.05)
            except ValueError:
                pass
        
        # Alt text containing "logo" is a good sign
        if "logo" in alt.lower():
            method_weight = min(1.0, method_weight + 0.05)
        
        notes = " ".join(notes_parts) if notes_parts else ""
        
        return Candidate(
            value=src,
            source_weight=source_weight,
            method_weight=method_weight,
            provenance=[Provenance(url=self.url, path=path)],
            notes=notes,
        )
    
    def _make_absolute(self, url: str) -> str:
        """Make URL absolute."""
        from urllib.parse import urljoin
        return urljoin(self.url, url)


