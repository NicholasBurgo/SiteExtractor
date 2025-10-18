"""
Contact information extraction (email, phone, address).
"""

import logging
import re
from typing import Optional

from truth_extractor.crawl.parser import HTMLParser
from truth_extractor.extraction.models import Candidate, Provenance

logger = logging.getLogger(__name__)


class ContactExtractor:
    """Extract contact information using heuristics and patterns."""
    
    # Email pattern
    EMAIL_PATTERN = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    )
    
    # Phone pattern (flexible, catches various formats)
    PHONE_PATTERN = re.compile(
        r'(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    )
    
    def __init__(self, parser: HTMLParser):
        """
        Initialize extractor.
        
        Args:
            parser: HTMLParser instance
        """
        self.parser = parser
        self.url = parser.base_url
        self.soup = parser.get_soup()
    
    def extract_emails(self) -> list[Candidate]:
        """Extract email addresses from the page."""
        candidates = []
        seen = set()
        
        # 1. mailto: links (highest confidence)
        mailto_emails = self.parser.find_mailto_links()
        for email in mailto_emails:
            email = email.lower().strip()
            if email and email not in seen:
                seen.add(email)
                candidates.append(Candidate(
                    value=email,
                    source_weight=0.9,
                    method_weight=1.0,
                    provenance=[Provenance(
                        url=self.url,
                        path="a[href^='mailto:']"
                    )],
                ))
        
        # 2. Look in contact sections
        contact_sections = self.parser.find_sections_by_text(["contact", "email", "reach"])
        for section in contact_sections[:3]:  # Limit to first few
            text = section.get_text()
            emails = self.EMAIL_PATTERN.findall(text)
            for email in emails:
                email = email.lower().strip()
                if email and email not in seen:
                    seen.add(email)
                    candidates.append(Candidate(
                        value=email,
                        source_weight=0.7,
                        method_weight=0.7,
                        provenance=[Provenance(
                            url=self.url,
                            path="contact_section"
                        )],
                    ))
        
        # 3. Meta tags
        meta_email = self.parser.get_meta_content(name="email")
        if meta_email:
            email = meta_email.lower().strip()
            if email and email not in seen:
                seen.add(email)
                candidates.append(Candidate(
                    value=email,
                    source_weight=0.85,
                    method_weight=1.0,
                    provenance=[Provenance(
                        url=self.url,
                        path="meta[name='email']"
                    )],
                ))
        
        # 4. Footer (lower confidence)
        footer = self.soup.find("footer")
        if footer:
            emails = self.EMAIL_PATTERN.findall(footer.get_text())
            for email in emails[:2]:  # Limit to first 2
                email = email.lower().strip()
                if email and email not in seen:
                    seen.add(email)
                    candidates.append(Candidate(
                        value=email,
                        source_weight=0.6,
                        method_weight=0.7,
                        provenance=[Provenance(
                            url=self.url,
                            path="footer"
                        )],
                    ))
        
        return candidates
    
    def extract_phones(self) -> list[Candidate]:
        """Extract phone numbers from the page."""
        candidates = []
        seen = set()
        
        # 1. tel: links (highest confidence)
        tel_numbers = self.parser.find_tel_links()
        for phone in tel_numbers:
            phone = self._normalize_phone_display(phone)
            if phone and phone not in seen:
                seen.add(phone)
                candidates.append(Candidate(
                    value=phone,
                    source_weight=0.9,
                    method_weight=1.0,
                    provenance=[Provenance(
                        url=self.url,
                        path="a[href^='tel:']"
                    )],
                ))
        
        # 2. Look in contact sections
        contact_sections = self.parser.find_sections_by_text(
            ["contact", "phone", "call", "reach"]
        )
        for section in contact_sections[:3]:
            text = section.get_text()
            phones = self.PHONE_PATTERN.findall(text)
            for phone in phones:
                phone = self._normalize_phone_display(phone)
                if phone and phone not in seen:
                    seen.add(phone)
                    candidates.append(Candidate(
                        value=phone,
                        source_weight=0.7,
                        method_weight=0.7,
                        provenance=[Provenance(
                            url=self.url,
                            path="contact_section"
                        )],
                    ))
        
        # 3. Header (business often puts phone in header)
        header = self.soup.find("header")
        if header:
            phones = self.PHONE_PATTERN.findall(header.get_text())
            for phone in phones[:2]:
                phone = self._normalize_phone_display(phone)
                if phone and phone not in seen:
                    seen.add(phone)
                    candidates.append(Candidate(
                        value=phone,
                        source_weight=0.75,
                        method_weight=0.7,
                        provenance=[Provenance(
                            url=self.url,
                            path="header"
                        )],
                    ))
        
        return candidates
    
    def extract_addresses(self) -> list[Candidate]:
        """Extract physical addresses from the page."""
        candidates = []
        
        # 1. Structured microdata
        structured_addresses = self.parser.extract_structured_address()
        for addr_dict in structured_addresses:
            address = {
                "street": addr_dict.get("streetAddress"),
                "city": addr_dict.get("addressLocality"),
                "region": addr_dict.get("addressRegion"),
                "postal": addr_dict.get("postalCode"),
                "country": addr_dict.get("addressCountry"),
            }
            
            # Build formatted
            parts = [v for v in address.values() if v]
            address["formatted"] = ", ".join(parts)
            
            candidates.append(Candidate(
                value=address,
                source_weight=0.95,
                method_weight=1.0,
                provenance=[Provenance(
                    url=self.url,
                    path="microdata.PostalAddress"
                )],
            ))
        
        # 2. Look for address patterns in contact sections
        contact_sections = self.parser.find_sections_by_text(
            ["contact", "address", "location", "visit"]
        )
        for section in contact_sections[:2]:
            text = section.get_text()
            # Simple heuristic: look for zip codes as anchor
            zip_match = re.search(r'\b\d{5}(?:-\d{4})?\b', text)
            if zip_match:
                # Extract surrounding context (rough address)
                start = max(0, zip_match.start() - 100)
                end = min(len(text), zip_match.end() + 20)
                context = text[start:end].strip()
                
                candidates.append(Candidate(
                    value={
                        "street": None,
                        "city": None,
                        "region": None,
                        "postal": zip_match.group(),
                        "country": "US",  # Assumption
                        "formatted": context[:200],  # Limit length
                    },
                    source_weight=0.6,
                    method_weight=0.6,
                    provenance=[Provenance(
                        url=self.url,
                        path="contact_section.address_pattern"
                    )],
                    notes="heuristic extraction",
                ))
        
        return candidates
    
    @staticmethod
    def _normalize_phone_display(phone: str) -> str:
        """Normalize phone number for display (remove some formatting)."""
        # Remove common separators but keep structure
        phone = phone.strip()
        phone = re.sub(r'\s+', ' ', phone)
        return phone


