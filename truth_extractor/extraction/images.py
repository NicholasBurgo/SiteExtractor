"""
Comprehensive image extraction from all pages.
"""

import logging
from typing import Optional
from urllib.parse import urljoin

from truth_extractor.crawl.parser import HTMLParser
from truth_extractor.extraction.models import Candidate, Provenance

logger = logging.getLogger(__name__)


class ImageExtractor:
    """Extract all images from pages with categorization and scoring."""
    
    def __init__(self, parser: HTMLParser):
        """
        Initialize extractor.
        
        Args:
            parser: HTMLParser instance
        """
        self.parser = parser
        self.url = parser.base_url
        self.soup = parser.get_soup()
    
    def extract_all_images(self) -> list[Candidate]:
        """
        Extract all images from the page with categorization.
        
        Returns:
            List of image candidates with zone categorization
        """
        candidates = []
        seen_urls = set()
        
        # 1. Hero images (large images at top of page)
        hero_images = self._extract_hero_images(seen_urls)
        candidates.extend(hero_images)
        
        # 2. Logo images
        logo_images = self._extract_logo_images(seen_urls)
        candidates.extend(logo_images)
        
        # 3. Gallery images
        gallery_images = self._extract_gallery_images(seen_urls)
        candidates.extend(gallery_images)
        
        # 4. Service images
        service_images = self._extract_service_images(seen_urls)
        candidates.extend(service_images)
        
        # 5. Team images
        team_images = self._extract_team_images(seen_urls)
        candidates.extend(team_images)
        
        # 6. Testimonial images
        testimonial_images = self._extract_testimonial_images(seen_urls)
        candidates.extend(testimonial_images)
        
        # 7. Product images
        product_images = self._extract_product_images(seen_urls)
        candidates.extend(product_images)
        
        # 8. Footer images
        footer_images = self._extract_footer_images(seen_urls)
        candidates.extend(footer_images)
        
        # 9. Any remaining images
        remaining_images = self._extract_remaining_images(seen_urls)
        candidates.extend(remaining_images)
        
        # Sort by score
        candidates.sort(key=lambda c: c.score, reverse=True)
        
        return candidates
    
    def _extract_hero_images(self, seen_urls: set) -> list[Candidate]:
        """Extract hero/banner images."""
        candidates = []
        
        # Look for large images in header or first section
        hero_selectors = [
            ".hero img", ".banner img", ".header img", 
            ".jumbotron img", ".carousel img", ".slider img"
        ]
        
        for selector in hero_selectors:
            for img in self.soup.select(selector):
                src = img.get("src")
                if src and src not in seen_urls:
                    src = self._make_absolute(src)
                    seen_urls.add(src)
                    candidates.append(self._create_candidate(
                        src=src,
                        zone="hero",
                        source_weight=0.9,
                        path=selector,
                        alt=img.get("alt", ""),
                        width=img.get("width"),
                        height=img.get("height"),
                    ))
        
        return candidates
    
    def _extract_logo_images(self, seen_urls: set) -> list[Candidate]:
        """Extract logo images."""
        candidates = []
        
        # Look for logos in various ways
        logo_selectors = [
            "img[itemprop='logo']",
            "img[class*='logo']",
            "img[id*='logo']",
            "header img",
            ".logo img",
            ".brand img"
        ]
        
        for selector in logo_selectors:
            for img in self.soup.select(selector):
                src = img.get("src")
                if src and src not in seen_urls:
                    src = self._make_absolute(src)
                    seen_urls.add(src)
                    candidates.append(self._create_candidate(
                        src=src,
                        zone="logo",
                        source_weight=0.95,
                        path=selector,
                        alt=img.get("alt", ""),
                        width=img.get("width"),
                        height=img.get("height"),
                    ))
        
        return candidates
    
    def _extract_gallery_images(self, seen_urls: set) -> list[Candidate]:
        """Extract gallery/portfolio images."""
        candidates = []
        
        gallery_selectors = [
            ".gallery img", ".portfolio img", ".grid img",
            ".masonry img", ".lightbox img", ".carousel img"
        ]
        
        for selector in gallery_selectors:
            for img in self.soup.select(selector):
                src = img.get("src")
                if src and src not in seen_urls:
                    src = self._make_absolute(src)
                    seen_urls.add(src)
                    candidates.append(self._create_candidate(
                        src=src,
                        zone="gallery",
                        source_weight=0.8,
                        path=selector,
                        alt=img.get("alt", ""),
                        width=img.get("width"),
                        height=img.get("height"),
                    ))
        
        return candidates
    
    def _extract_service_images(self, seen_urls: set) -> list[Candidate]:
        """Extract service-related images."""
        candidates = []
        
        # Look for images in service sections
        service_sections = self.soup.find_all(["section", "div"], 
                                             class_=lambda x: x and any(
                                                 keyword in x.lower() 
                                                 for keyword in ["service", "work", "project", "offer"]
                                             ))
        
        for section in service_sections:
            for img in section.find_all("img"):
                src = img.get("src")
                if src and src not in seen_urls:
                    src = self._make_absolute(src)
                    seen_urls.add(src)
                    candidates.append(self._create_candidate(
                        src=src,
                        zone="service",
                        source_weight=0.75,
                        path="service_section img",
                        alt=img.get("alt", ""),
                        width=img.get("width"),
                        height=img.get("height"),
                    ))
        
        return candidates
    
    def _extract_team_images(self, seen_urls: set) -> list[Candidate]:
        """Extract team/staff images."""
        candidates = []
        
        team_selectors = [
            ".team img", ".staff img", ".about img",
            ".employee img", ".crew img", ".member img"
        ]
        
        for selector in team_selectors:
            for img in self.soup.select(selector):
                src = img.get("src")
                if src and src not in seen_urls:
                    src = self._make_absolute(src)
                    seen_urls.add(src)
                    candidates.append(self._create_candidate(
                        src=src,
                        zone="team",
                        source_weight=0.7,
                        path=selector,
                        alt=img.get("alt", ""),
                        width=img.get("width"),
                        height=img.get("height"),
                    ))
        
        return candidates
    
    def _extract_testimonial_images(self, seen_urls: set) -> list[Candidate]:
        """Extract testimonial images."""
        candidates = []
        
        testimonial_selectors = [
            ".testimonial img", ".review img", ".quote img",
            ".customer img", ".client img", ".feedback img"
        ]
        
        for selector in testimonial_selectors:
            for img in self.soup.select(selector):
                src = img.get("src")
                if src and src not in seen_urls:
                    src = self._make_absolute(src)
                    seen_urls.add(src)
                    candidates.append(self._create_candidate(
                        src=src,
                        zone="testimonial",
                        source_weight=0.6,
                        path=selector,
                        alt=img.get("alt", ""),
                        width=img.get("width"),
                        height=img.get("height"),
                    ))
        
        return candidates
    
    def _extract_product_images(self, seen_urls: set) -> list[Candidate]:
        """Extract product images."""
        candidates = []
        
        product_selectors = [
            ".product img", ".item img", ".menu img",
            ".catalog img", ".inventory img", ".store img"
        ]
        
        for selector in product_selectors:
            for img in self.soup.select(selector):
                src = img.get("src")
                if src and src not in seen_urls:
                    src = self._make_absolute(src)
                    seen_urls.add(src)
                    candidates.append(self._create_candidate(
                        src=src,
                        zone="product",
                        source_weight=0.7,
                        path=selector,
                        alt=img.get("alt", ""),
                        width=img.get("width"),
                        height=img.get("height"),
                    ))
        
        return candidates
    
    def _extract_footer_images(self, seen_urls: set) -> list[Candidate]:
        """Extract footer images."""
        candidates = []
        
        footer = self.soup.find("footer")
        if footer:
            for img in footer.find_all("img"):
                src = img.get("src")
                if src and src not in seen_urls:
                    src = self._make_absolute(src)
                    seen_urls.add(src)
                    candidates.append(self._create_candidate(
                        src=src,
                        zone="footer",
                        source_weight=0.5,
                        path="footer img",
                        alt=img.get("alt", ""),
                        width=img.get("width"),
                        height=img.get("height"),
                    ))
        
        return candidates
    
    def _extract_remaining_images(self, seen_urls: set) -> list[Candidate]:
        """Extract any remaining images not caught by other methods."""
        candidates = []
        
        for img in self.soup.find_all("img"):
            src = img.get("src")
            if src and src not in seen_urls:
                src = self._make_absolute(src)
                seen_urls.add(src)
                
                # Determine zone based on context
                zone = self._determine_image_zone(img)
                
                candidates.append(self._create_candidate(
                    src=src,
                    zone=zone,
                    source_weight=0.4,
                    path="img",
                    alt=img.get("alt", ""),
                    width=img.get("width"),
                    height=img.get("height"),
                ))
        
        return candidates
    
    def _determine_image_zone(self, img_element) -> str:
        """Determine the zone/context of an image based on its surroundings."""
        # Check parent elements for context clues
        parent = img_element.parent
        while parent and parent.name != 'body':
            classes = parent.get("class", [])
            class_str = " ".join(classes).lower()
            
            if any(keyword in class_str for keyword in ["hero", "banner", "header"]):
                return "hero"
            elif any(keyword in class_str for keyword in ["service", "work", "project"]):
                return "service"
            elif any(keyword in class_str for keyword in ["gallery", "portfolio", "grid"]):
                return "gallery"
            elif any(keyword in class_str for keyword in ["team", "staff", "about"]):
                return "team"
            elif any(keyword in class_str for keyword in ["testimonial", "review", "quote"]):
                return "testimonial"
            elif any(keyword in class_str for keyword in ["product", "item", "menu"]):
                return "product"
            elif any(keyword in class_str for keyword in ["footer"]):
                return "footer"
            
            parent = parent.parent
        
        return "unknown"
    
    def _create_candidate(
        self,
        src: str,
        zone: str,
        source_weight: float,
        path: str,
        alt: str = "",
        width: Optional[str] = None,
        height: Optional[str] = None,
    ) -> Candidate:
        """
        Create an image candidate with quality scoring.
        
        Args:
            src: Image URL
            zone: Image zone/category
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
        notes_parts = [zone]
        
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
                
                # Reasonable dimensions boost score
                if 100 <= w <= 2000 and 50 <= h <= 2000:
                    method_weight = min(1.0, method_weight + 0.05)
            except ValueError:
                pass
        
        # Alt text is a good sign
        if alt and len(alt.strip()) > 0:
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

