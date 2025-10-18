"""
Service extraction and taxonomy mapping.
"""

import logging
from pathlib import Path
from typing import Optional

import yaml

from truth_extractor.crawl.parser import HTMLParser
from truth_extractor.extraction.models import Candidate, Provenance

logger = logging.getLogger(__name__)


class ServicesExtractor:
    """Extract and map services to canonical taxonomy."""
    
    def __init__(self, parser: HTMLParser, taxonomy_path: Optional[Path] = None):
        """
        Initialize extractor.
        
        Args:
            parser: HTMLParser instance
            taxonomy_path: Optional path to services.yaml
        """
        self.parser = parser
        self.url = parser.base_url
        self.soup = parser.get_soup()
        
        # Load taxonomy
        if taxonomy_path is None:
            # Default path
            module_dir = Path(__file__).parent.parent
            taxonomy_path = module_dir / "taxonomy" / "services.yaml"
        
        self.taxonomy = self._load_taxonomy(taxonomy_path)
    
    def _load_taxonomy(self, path: Path) -> dict[str, list[str]]:
        """
        Load service taxonomy from YAML.
        
        Args:
            path: Path to services.yaml
            
        Returns:
            Dict mapping canonical name to list of synonyms
        """
        taxonomy = {}
        
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            
            for item in data.get("services", []):
                canonical = item["canonical"]
                synonyms = item.get("synonyms", [])
                taxonomy[canonical] = [s.lower() for s in synonyms]
        
        except Exception as e:
            logger.error(f"Failed to load taxonomy from {path}: {e}")
        
        return taxonomy
    
    def extract_services(self, max_services: int = 8) -> list[Candidate]:
        """
        Extract services and map to taxonomy.
        
        Args:
            max_services: Maximum number of services to return
            
        Returns:
            List of service candidates
        """
        # Find service-related text from multiple sources
        raw_services = self._find_service_text()
        
        # Clean the raw services first
        cleaned_services = self._clean_raw_services(raw_services)
        
        # Map to canonical taxonomy
        mapped_services = self._map_to_taxonomy(cleaned_services)
        
        # Create candidates
        candidates = []
        
        # 1. Canonical services (mapped to taxonomy)
        if mapped_services:
            canonical_services = list(mapped_services.keys())[:max_services]
            candidates.append(Candidate(
                value=canonical_services,
                source_weight=0.85,
                method_weight=0.9,
                provenance=[Provenance(
                    url=self.url,
                    path="services_section.taxonomy"
                )],
                notes=f"canonical: {len(canonical_services)} services",
            ))
        
        # 2. Raw services (if no canonical matches found)
        if not mapped_services and cleaned_services:
            candidates.append(Candidate(
                value=cleaned_services[:max_services],
                source_weight=0.6,
                method_weight=0.7,
                provenance=[Provenance(
                    url=self.url,
                    path="services_section.raw"
                )],
                notes=f"raw: {len(cleaned_services)} services",
            ))
        
        return candidates
    
    def _find_service_text(self) -> list[str]:
        """
        Find service-related text on the page using multiple strategies.
        
        Returns:
            List of potential service strings
        """
        services = []
        seen = set()
        
        # 1. Look for sections with service-related headings
        service_keywords = [
            "service", "services", "what we do", "our services", "we offer",
            "specialty", "specialties", "expertise", "capabilities", "offerings",
            "lawn", "landscaping", "plumbing", "hvac", "electrical", "cleaning",
            "repair", "installation", "maintenance", "inspection"
        ]
        
        service_sections = self.parser.find_sections_by_text(service_keywords)
        
        for section in service_sections[:5]:  # Check more sections
            # Look for lists
            for ul in section.find_all(["ul", "ol"]):
                for li in ul.find_all("li"):
                    text = li.get_text(strip=True)
                    if text and len(text) < 100 and text.lower() not in seen:
                        seen.add(text.lower())
                        services.append(text)
            
            # Look for headings (h2, h3, h4)
            for heading in section.find_all(["h2", "h3", "h4"]):
                text = heading.get_text(strip=True)
                if text and len(text) < 100 and text.lower() not in seen:
                    seen.add(text.lower())
                    services.append(text)
            
            # Look for paragraph text that might describe services
            for p in section.find_all("p"):
                text = p.get_text(strip=True)
                if text and 10 < len(text) < 200:
                    # Look for service-like phrases
                    if any(keyword in text.lower() for keyword in ["we provide", "we offer", "services include", "we specialize"]):
                        # Extract potential service phrases
                        sentences = text.split(".")
                        for sentence in sentences:
                            sentence = sentence.strip()
                            if 5 < len(sentence) < 80 and sentence.lower() not in seen:
                                seen.add(sentence.lower())
                                services.append(sentence)
        
        # 2. Look in navigation for service links
        nav = self.soup.find("nav")
        if nav:
            for a in nav.find_all("a"):
                text = a.get_text(strip=True)
                href = a.get("href", "").lower()
                if text and len(text) < 50 and text.lower() not in seen:
                    # Check if it looks like a service
                    service_indicators = [
                        "service" in href,
                        len(text.split()) >= 2 and len(text.split()) <= 5,
                        any(word in text.lower() for word in ["repair", "install", "clean", "maintain", "inspect"])
                    ]
                    if any(service_indicators):
                        seen.add(text.lower())
                        services.append(text)
        
        # 3. Look for buttons/links that might be services
        for element in self.soup.find_all(["button", "a"]):
            text = element.get_text(strip=True)
            if text and 5 < len(text) < 50 and text.lower() not in seen:
                # Check for service-like action words
                action_words = ["repair", "install", "clean", "maintain", "inspect", "fix", "replace", "upgrade"]
                if any(word in text.lower() for word in action_words):
                    seen.add(text.lower())
                    services.append(text)
        
        # 4. Look in footer for service mentions
        footer = self.soup.find("footer")
        if footer:
            for li in footer.find_all("li"):
                text = li.get_text(strip=True)
                if text and 3 < len(text) < 50 and text.lower() not in seen:
                    # Footer often lists services
                    if len(text.split()) <= 4:  # Short phrases
                        seen.add(text.lower())
                        services.append(text)
        
        return services
    
    def _map_to_taxonomy(self, raw_services: list[str]) -> dict[str, float]:
        """
        Map raw service strings to canonical taxonomy.
        
        Args:
            raw_services: List of raw service text
            
        Returns:
            Dict mapping canonical service to confidence score
        """
        matched = {}
        
        for service_text in raw_services:
            service_lower = service_text.lower()
            
            # Try to match against taxonomy
            for canonical, synonyms in self.taxonomy.items():
                # Check for exact match or substring match
                for synonym in synonyms:
                    if synonym in service_lower or service_lower in synonym:
                        # Score based on match quality
                        if synonym == service_lower:
                            score = 1.0  # Exact match
                        elif service_lower in synonym:
                            score = 0.9  # Substring match
                        else:
                            score = 0.8  # Contains match
                        
                        # Keep highest score for each canonical service
                        if canonical not in matched or matched[canonical] < score:
                            matched[canonical] = score
                        
                        break  # Found match, move to next service
        
        return matched
    
    def _clean_raw_services(self, raw_services: list[str]) -> list[str]:
        """
        Clean and deduplicate raw service strings.
        
        Args:
            raw_services: List of raw service strings
            
        Returns:
            List of cleaned service strings
        """
        cleaned = []
        seen = set()
        
        for service in raw_services:
            # Basic cleaning
            service = service.strip()
            service = service.replace("\n", " ").replace("\r", " ")
            service = " ".join(service.split())  # Normalize whitespace
            
            # Skip if too short or too long
            if len(service) < 3 or len(service) > 100:
                continue
            
            # Skip if it's a full sentence (contains "we", "our", "I", etc.)
            # BUT allow service descriptions that contain key service terms
            sentence_indicators = [
                " we ", " our ", " us ", " i ", " my ", " they ",
                " you ", " your ", " it ", " this ", " that ",
                " then ", " and then ", " which ", " who "
            ]
            service_lower_spaced = f" {service.lower()} "
            
            # Check if it contains service keywords - if so, extract the service name
            service_keywords = [
                "clean", "cleaning", "wash", "washing", "pressure", "soft",
                "driveway", "sidewalk", "concrete", "house", "window", 
                "trash", "garbage", "bin", "mold", "stain", "stains"
            ]
            
            has_service_keywords = any(keyword in service_lower_spaced for keyword in service_keywords)
            
            if any(indicator in service_lower_spaced for indicator in sentence_indicators):
                if has_service_keywords:
                    # Try to extract service name from the description
                    extracted = self._extract_service_from_description(service)
                    if extracted:
                        service = extracted  # Replace with extracted service name
                    else:
                        continue  # Skip if we can't extract a service name
                else:
                    continue  # Skip non-service sentences
            
            # Skip if it starts with common sentence starters
            sentence_starters = [
                "we ", "our ", "i ", "my ", "they ", "you ", "it ",
                "this ", "that ", "then ", "which ", "who ", "when ",
                "where ", "why ", "how ", "the ", "a ", "an "
            ]
            service_lower = service.lower()
            if any(service_lower.startswith(starter) for starter in sentence_starters):
                continue
            
            # Skip exact navigation terms (case-insensitive)
            nav_exact_terms = [
                "services", "service", "home", "contact", "about", 
                "portfolio", "gallery", "blog", "news",
                "privacy", "terms", "sitemap", "our work", "work",
                "hours of operation", "hours", "operation", "open", "closed"
            ]
            if service_lower in nav_exact_terms:
                continue
            
            # Skip common non-service phrases (partial matches)
            skip_patterns = [
                "contact us", "about us", "home page",
                # CTAs
                "more", "read", "learn", "click", "here", "now", "today",
                "call", "phone", "tel", "address", "email",
                "get in touch", "reach out", "send us", "message us",
                "follow us", "like us", "share", "subscribe", "sign up", "book now",
                # Social/form elements
                "facebook", "instagram", "twitter", "linkedin", "youtube", "tiktok",
                "your message", "has been sent", "thank you", "submit", "send",
                # Common page elements
                "back to", "return to", "go to", "view", "see", "show",
                "welcome", "hello"
            ]
            
            # Check if ANY skip pattern appears in the service text
            if any(pattern in service_lower for pattern in skip_patterns):
                continue
            
            # Skip if it's just a URL or email
            if service_lower.startswith(("http", "www", "@")):
                continue
            
            # Skip if it's mostly punctuation
            if len([c for c in service if c.isalnum()]) < 3:
                continue
            
            # Prefer shorter, title-case service names (likely headings)
            # Penalize long lowercase sentences
            if len(service.split()) > 8:  # More than 8 words is likely a sentence
                continue
            
            # Deduplicate
            if service_lower not in seen:
                seen.add(service_lower)
                cleaned.append(service)
        
        # Sort by length (shorter services first, they're usually more accurate)
        cleaned.sort(key=len)
        
        return cleaned
    
    def _extract_service_from_description(self, description: str) -> Optional[str]:
        """
        Extract a service name from a descriptive sentence.
        
        Args:
            description: The description text
            
        Returns:
            Extracted service name or None
        """
        desc_lower = description.lower()
        
        # Pattern matching for common service descriptions
        patterns = [
            # Trash can cleaning
            (r"clean.*inside.*outside.*trash.*can", "Trash Can Cleaning"),
            (r"clean.*trash.*can", "Trash Can Cleaning"),
            (r"trash.*can.*clean", "Trash Can Cleaning"),
            
            # Driveway/concrete cleaning
            (r"surface.*cleaner.*oil.*stain.*concrete", "Driveway Cleaning"),
            (r"remove.*oil.*stain.*concrete", "Driveway Cleaning"),
            (r"clean.*concrete", "Concrete Cleaning"),
            (r"driveway.*clean", "Driveway Cleaning"),
            
            # Soft washing
            (r"mold.*stain.*eco.*friendly.*chemical.*soft.*wash", "Soft Washing"),
            (r"soft.*wash", "Soft Washing"),
            (r"eco.*friendly.*chemical.*wash", "Soft Washing"),
            
            # Pressure washing
            (r"pressure.*wash", "Pressure Washing"),
            (r"power.*wash", "Pressure Washing"),
            
            # House/window cleaning
            (r"house.*window.*clean", "House and Window Cleaning"),
            (r"window.*clean", "Window Cleaning"),
            (r"house.*clean", "House Cleaning"),
        ]
        
        import re
        for pattern, service_name in patterns:
            if re.search(pattern, desc_lower):
                return service_name
        
        # If no pattern matches, try to extract key terms
        key_terms = []
        if "trash" in desc_lower and "clean" in desc_lower:
            key_terms.append("Trash Can Cleaning")
        if "concrete" in desc_lower or "driveway" in desc_lower:
            key_terms.append("Concrete Cleaning")
        if "soft" in desc_lower and "wash" in desc_lower:
            key_terms.append("Soft Washing")
        if "pressure" in desc_lower or "power" in desc_lower:
            key_terms.append("Pressure Washing")
        if "house" in desc_lower or "window" in desc_lower:
            key_terms.append("House and Window Cleaning")
        
        return key_terms[0] if key_terms else None
    
