"""
Brand name extraction from various sources including page titles.
"""

import logging
import re

from truth_extractor.crawl.parser import HTMLParser
from truth_extractor.extraction.models import Candidate, Provenance

logger = logging.getLogger(__name__)


class BrandNameExtractor:
    """Extract brand name from page metadata and structure."""
    
    def __init__(self, parser: HTMLParser):
        """
        Initialize extractor.
        
        Args:
            parser: HTMLParser instance
        """
        self.parser = parser
        self.url = parser.base_url
        self.soup = parser.get_soup()
    
    def extract_from_title(self) -> list[Candidate]:
        """
        Extract brand name from page title.
        
        Page titles often follow patterns like:
        - "Business Name – Tagline"
        - "Business Name | Category"
        - "Page Name – Business Name"
        
        Returns:
            List of brand name candidates
        """
        candidates = []
        title = self.parser.get_title()
        
        if not title:
            return candidates
        
        # Common separators in titles
        separators = [' – ', ' — ', ' - ', ' | ', ' :: ']
        
        for sep in separators:
            if sep in title:
                parts = title.split(sep)
                
                # Often the brand name is the last part or first part
                for i, part in enumerate(parts):
                    part = part.strip()
                    
                    # Skip if too short or too long
                    if len(part) < 3 or len(part) > 100:
                        continue
                    
                    # Skip common page names
                    page_names = ['home', 'contact', 'about', 'services', 'portfolio', 
                                 'about us', 'contact us', 'our services']
                    if part.lower() in page_names:
                        continue
                    
                    # Check if it looks like a business name
                    if self._looks_like_business_name(part):
                        # Last part in title usually has higher confidence
                        weight_modifier = 0.1 if i == len(parts) - 1 else 0.0
                        
                        candidates.append(Candidate(
                            value=part,
                            source_weight=0.65 + weight_modifier,  # Lower than structured data
                            method_weight=0.7,
                            provenance=[Provenance(
                                url=self.url,
                                path="title"
                            )],
                            notes="from page title",
                        ))
                
                break  # Only process first separator found
        
        # If no separator found, use the whole title if it looks good
        if not candidates and len(title) >= 3 and len(title) <= 100:
            if self._looks_like_business_name(title):
                candidates.append(Candidate(
                    value=title,
                    source_weight=0.6,
                    method_weight=0.7,
                    provenance=[Provenance(
                        url=self.url,
                        path="title"
                    )],
                    notes="full page title",
                ))
        
        return candidates
    
    def extract_from_og_title(self) -> list[Candidate]:
        """
        Extract from OpenGraph og:title meta tag.
        
        Returns:
            List of brand name candidates
        """
        candidates = []
        
        og_title = self.parser.get_meta_content(property="og:title")
        if og_title:
            og_title = og_title.strip()
            
            if len(og_title) >= 3 and self._looks_like_business_name(og_title):
                candidates.append(Candidate(
                    value=og_title,
                    source_weight=0.8,
                    method_weight=0.9,
                    provenance=[Provenance(
                        url=self.url,
                        path="meta[property='og:title']"
                    )],
                ))
        
        return candidates
    
    def extract_from_header(self) -> list[Candidate]:
        """
        Extract from header elements (h1, logo alt text).
        
        Returns:
            List of brand name candidates
        """
        candidates = []
        seen = set()
        
        # Look in header tag
        header = self.soup.find("header")
        if header:
            # Check h1 in header
            h1 = header.find("h1")
            if h1:
                text = h1.get_text(strip=True)
                if text and len(text) >= 3 and text not in seen:
                    if self._looks_like_business_name(text):
                        seen.add(text)
                        candidates.append(Candidate(
                            value=text,
                            source_weight=0.85,
                            method_weight=0.8,
                            provenance=[Provenance(
                                url=self.url,
                                path="header h1"
                            )],
                        ))
            
            # Check logo alt text
            for img in header.find_all("img"):
                alt = img.get("alt", "").strip()
                if alt and len(alt) >= 3 and alt not in seen:
                    # Logo alt often contains business name
                    if "logo" in img.get("class", []) or "logo" in img.get("id", ""):
                        if self._looks_like_business_name(alt):
                            seen.add(alt)
                            candidates.append(Candidate(
                                value=alt,
                                source_weight=0.8,
                                method_weight=0.75,
                                provenance=[Provenance(
                                    url=self.url,
                                    path="header img[logo].alt"
                                )],
                                notes="from logo alt text",
                            ))
        
        # If no header or no H1 in header, check all H1s on the page
        if not candidates:
            h1_tags = self.soup.find_all("h1")
            for h1 in h1_tags[:3]:  # Check first 3 H1s
                text = h1.get_text(strip=True)
                if text and len(text) >= 3 and text not in seen:
                    if self._looks_like_business_name(text):
                        seen.add(text)
                        candidates.append(Candidate(
                            value=text,
                            source_weight=0.75,  # Slightly lower than header H1
                            method_weight=0.8,
                            provenance=[Provenance(
                                url=self.url,
                                path="h1"
                            )],
                            notes="from h1 tag",
                        ))
        
        return candidates
    
    @staticmethod
    def _looks_like_business_name(text: str) -> bool:
        """
        Heuristic to check if text looks like a business name.
        
        Rejects:
        - Phone numbers
        - Email addresses
        - Call-to-action phrases
        - URLs
        - Common sentences
        - Navigation text
        
        Args:
            text: Text to check
            
        Returns:
            True if it looks like a business name
        """
        text_lower = text.lower()
        
        # HARD REJECTS: These are NEVER business names
        
        # 1. Reject phone numbers (any format)
        phone_patterns = [
            r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # 123-456-7890
            r'\(\d{3}\)\s*\d{3}[-.\s]?\d{4}',   # (123) 456-7890
            r'\+\d{1,3}\s*\d{3}',                # +1 123
            r'call.*\d{3}',                      # call us at 123
            r'\d{3}.*\d{3}.*\d{4}',             # any 10 digit pattern
        ]
        if any(re.search(pattern, text, re.IGNORECASE) for pattern in phone_patterns):
            return False
        
        # 2. Reject if contains phone-related keywords with digits
        if any(keyword in text_lower for keyword in ['call', 'phone', 'tel:', 'telephone']) and re.search(r'\d', text):
            return False
        
        # 3. Reject email addresses
        if '@' in text or 'email' in text_lower:
            return False
        
        # 4. Reject URLs
        if text_lower.startswith(('http://', 'https://', 'www.')) or '.com' in text_lower:
            return False
        
        # 5. Reject call-to-action phrases
        cta_phrases = [
            'call us', 'contact us', 'click here', 'learn more', 'get started',
            'schedule', 'book now', 'free estimate', 'request', 'sign up',
            'subscribe', 'follow us', 'join us', 'visit us', 'find us',
            'call now', 'call today', 'click to', 'tap to', 'reach us'
        ]
        if any(phrase in text_lower for phrase in cta_phrases):
            return False
        
        # 6. Reject common navigation/page names and social platforms
        nav_terms = [
            'home', 'about', 'about us', 'contact', 'contact us', 'services',
            'portfolio', 'gallery', 'blog', 'news', 'careers', 'team',
            'our services', 'our work', 'our team', 'get in touch',
            'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'yelp'
        ]
        if text_lower in nav_terms:
            return False
        
        # 7. Reject if it's mostly numbers
        digit_count = sum(c.isdigit() for c in text)
        if len(text) > 0 and digit_count / len(text) > 0.3:  # More than 30% digits
            return False
        
        # 8. Reject if it's mostly punctuation or special chars
        alphanumeric_count = sum(c.isalnum() for c in text)
        if len(text) > 0 and alphanumeric_count / len(text) < 0.6:  # Less than 60% alphanumeric
            return False
        
        # 9. Reject if it's a full sentence (has lots of common words)
        common_words = [
            'the', 'and', 'for', 'with', 'about', 'from', 'this', 'that',
            'what', 'when', 'where', 'why', 'how', 'welcome', 'get', 'learn',
            'find', 'your', 'our', 'we', 'you', 'are', 'is', 'will', 'can'
        ]
        words = text_lower.split()
        if len(words) > 3:  # Only check longer phrases
            common_count = sum(1 for word in words if word in common_words)
            if common_count / len(words) > 0.4:  # More than 40% common words
                return False
        
        # 10. Reject if it's too long (probably a sentence)
        if len(words) > 10:
            return False
        
        # 11. Reject single-word names that are too short (must be > 5 chars if single word)
        # This filters out "Facebook", "Contact", "Home", etc.
        if len(words) == 1 and len(text) <= 6:
            return False
        
        # POSITIVE CHECKS: Must have these to be a business name
        
        # 1. Must have at least one capital letter (proper noun)
        has_capitals = any(c.isupper() for c in text)
        if not has_capitals:
            return False
        
        # 2. Must have reasonable length
        if len(text) < 3 or len(text) > 100:
            return False
        
        # 3. Must have at least one letter
        has_letters = any(c.isalpha() for c in text)
        if not has_letters:
            return False
        
        return True

