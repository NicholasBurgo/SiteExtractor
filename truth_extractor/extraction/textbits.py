"""
Extract text snippets: background/about and mission/slogan.
"""

import logging
import re

from truth_extractor.crawl.parser import HTMLParser
from truth_extractor.extraction.models import Candidate, Provenance

logger = logging.getLogger(__name__)


class TextBitsExtractor:
    """Extract background paragraph and mission/slogan."""
    
    def __init__(self, parser: HTMLParser):
        """
        Initialize extractor.
        
        Args:
            parser: HTMLParser instance
        """
        self.parser = parser
        self.url = parser.base_url
        self.soup = parser.get_soup()
    
    def extract_background(self, max_words: int = 50) -> list[Candidate]:
        """
        Extract business background/about text.
        
        Args:
            max_words: Maximum words for background
            
        Returns:
            List of background candidates
        """
        candidates = []
        seen = set()
        
        # 1. Look for JSON-LD description (handled elsewhere, but include as candidate)
        # This is a placeholder; typically extracted via JSONLDExtractor
        
        # 2. Look for About sections
        about_sections = self.parser.find_sections_by_text(
            ["about", "who we are", "our story", "about us"]
        )
        
        for section in about_sections[:2]:
            # Find first substantial paragraph
            for p in section.find_all("p"):
                text = p.get_text(strip=True)
                if text and len(text.split()) >= 10:  # Substantial enough
                    # Truncate to max words
                    words = text.split()[:max_words]
                    truncated = " ".join(words)
                    
                    if truncated not in seen:
                        seen.add(truncated)
                        candidates.append(Candidate(
                            value=truncated,
                            source_weight=0.75,
                            method_weight=0.7,
                            provenance=[Provenance(
                                url=self.url,
                                path="about_section.p"
                            )],
                        ))
                    break  # Take first paragraph only
        
        # 3. Look for hero/intro text
        hero_sections = self.soup.find_all(["section", "div"], class_=re.compile(r"hero|intro|banner", re.I))
        for hero in hero_sections[:2]:
            for p in hero.find_all("p"):
                text = p.get_text(strip=True)
                if text and len(text.split()) >= 10:
                    words = text.split()[:max_words]
                    truncated = " ".join(words)
                    
                    if truncated not in seen:
                        seen.add(truncated)
                        candidates.append(Candidate(
                            value=truncated,
                            source_weight=0.65,
                            method_weight=0.7,
                            provenance=[Provenance(
                                url=self.url,
                                path="hero_section.p"
                            )],
                        ))
                    break
        
        # 4. Meta description (fallback)
        meta_desc = self.parser.get_meta_content(name="description")
        if meta_desc:
            words = meta_desc.split()[:max_words]
            truncated = " ".join(words)
            
            if truncated not in seen:
                seen.add(truncated)
                candidates.append(Candidate(
                    value=truncated,
                    source_weight=0.6,
                    method_weight=0.8,
                    provenance=[Provenance(
                        url=self.url,
                        path="meta[name='description']"
                    )],
                    notes="from meta description",
                ))
        
        return candidates
    
    def extract_slogan(self, max_words: int = 8) -> list[Candidate]:
        """
        Extract mission statement or slogan.
        
        Args:
            max_words: Maximum words for slogan
            
        Returns:
            List of slogan candidates
        """
        candidates = []
        seen = set()
        
        # 1. Look near logo/header
        header = self.soup.find("header")
        if header:
            # Look for tagline elements
            for elem in header.find_all(["p", "span", "div"], class_=re.compile(r"tagline|slogan|motto", re.I)):
                text = elem.get_text(strip=True)
                if text and len(text.split()) <= max_words and not self._is_cta(text):
                    if text not in seen:
                        seen.add(text)
                        candidates.append(Candidate(
                            value=text,
                            source_weight=0.8,
                            method_weight=0.8,
                            provenance=[Provenance(
                                url=self.url,
                                path="header.tagline"
                            )],
                        ))
        
        # 2. Look for hero text (short phrases)
        hero_sections = self.soup.find_all(["section", "div"], class_=re.compile(r"hero|banner", re.I))
        for hero in hero_sections[:1]:
            # Look for headings or short paragraphs
            for elem in hero.find_all(["h2", "h3", "p"]):
                text = elem.get_text(strip=True)
                word_count = len(text.split())
                
                # Good slogan length: 3-8 words
                if 3 <= word_count <= max_words and not self._is_cta(text):
                    if text not in seen:
                        seen.add(text)
                        candidates.append(Candidate(
                            value=text,
                            source_weight=0.7,
                            method_weight=0.75,
                            provenance=[Provenance(
                                url=self.url,
                                path="hero.heading"
                            )],
                        ))
        
        # 3. Look in page title (sometimes includes slogan)
        title = self.parser.get_title()
        if title:
            # Split by common separators
            parts = re.split(r"[|–—-]", title)
            for part in parts:
                text = part.strip()
                word_count = len(text.split())
                if 2 <= word_count <= max_words and not self._is_cta(text):
                    if text not in seen:
                        seen.add(text)
                        candidates.append(Candidate(
                            value=text,
                            source_weight=0.6,
                            method_weight=0.7,
                            provenance=[Provenance(
                                url=self.url,
                                path="title"
                            )],
                            notes="from page title",
                        ))
        
        return candidates
    
    @staticmethod
    def _is_cta(text: str) -> bool:
        """
        Check if text is a call-to-action (not a slogan).
        
        Args:
            text: Text to check
            
        Returns:
            True if likely a CTA
        """
        text_lower = text.lower()
        cta_phrases = [
            "call now", "contact us", "get started", "learn more",
            "book now", "schedule", "request", "get a quote",
            "click here", "read more", "view", "see",
        ]
        
        return any(cta in text_lower for cta in cta_phrases)


