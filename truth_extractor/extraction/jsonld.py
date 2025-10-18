"""
JSON-LD and structured data extraction.
"""

import json
import logging
from typing import Any, Optional

from truth_extractor.crawl.parser import HTMLParser
from truth_extractor.extraction.models import Candidate, Provenance

logger = logging.getLogger(__name__)


class JSONLDExtractor:
    """Extract information from JSON-LD structured data."""
    
    SOURCE_WEIGHT = 1.0  # Highest trust for structured data
    METHOD_WEIGHT = 1.0  # Direct extraction
    
    def __init__(self, parser: HTMLParser):
        """
        Initialize extractor.
        
        Args:
            parser: HTMLParser instance
        """
        self.parser = parser
        self.url = parser.base_url
        self._parsed_data: Optional[list[dict]] = None
    
    def _get_parsed_data(self) -> list[dict]:
        """Parse all JSON-LD scripts from the page."""
        if self._parsed_data is not None:
            return self._parsed_data
        
        self._parsed_data = []
        scripts = self.parser.find_jsonld_scripts()
        
        for script in scripts:
            try:
                data = json.loads(script)
                # Handle both single objects and @graph arrays
                if isinstance(data, dict):
                    if "@graph" in data:
                        self._parsed_data.extend(data["@graph"])
                    else:
                        self._parsed_data.append(data)
                elif isinstance(data, list):
                    self._parsed_data.extend(data)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON-LD: {e}")
        
        return self._parsed_data
    
    def _find_by_type(self, type_name: str) -> list[dict]:
        """
        Find all JSON-LD objects of a specific @type.
        
        Args:
            type_name: Schema.org type (e.g., "Organization", "LocalBusiness")
            
        Returns:
            List of matching objects
        """
        results = []
        for obj in self._get_parsed_data():
            obj_type = obj.get("@type", "")
            # Handle both string and list types
            if isinstance(obj_type, str):
                if obj_type == type_name or obj_type.endswith(f"/{type_name}"):
                    results.append(obj)
            elif isinstance(obj_type, list):
                if any(t == type_name or t.endswith(f"/{type_name}") for t in obj_type):
                    results.append(obj)
        
        return results
    
    def extract_organization_name(self) -> list[Candidate]:
        """Extract organization/business name."""
        candidates = []
        
        # Look for Organization or LocalBusiness types
        for type_name in ["Organization", "LocalBusiness", "Corporation"]:
            for org in self._find_by_type(type_name):
                name = org.get("name")
                if name and isinstance(name, str):
                    candidates.append(Candidate(
                        value=name.strip(),
                        source_weight=self.SOURCE_WEIGHT,
                        method_weight=self.METHOD_WEIGHT,
                        provenance=[Provenance(
                            url=self.url,
                            path=f"jsonld.{type_name}.name"
                        )],
                    ))
                
                # Also check legalName
                legal_name = org.get("legalName")
                if legal_name and isinstance(legal_name, str):
                    candidates.append(Candidate(
                        value=legal_name.strip(),
                        source_weight=self.SOURCE_WEIGHT * 0.95,
                        method_weight=self.METHOD_WEIGHT,
                        provenance=[Provenance(
                            url=self.url,
                            path=f"jsonld.{type_name}.legalName"
                        )],
                        notes="legal name",
                    ))
        
        return candidates
    
    def extract_address(self) -> list[Candidate]:
        """Extract postal address information."""
        candidates = []
        
        # Look for Organization/LocalBusiness with address
        for type_name in ["Organization", "LocalBusiness"]:
            for org in self._find_by_type(type_name):
                address_obj = org.get("address")
                if address_obj and isinstance(address_obj, dict):
                    candidates.append(self._parse_address_object(address_obj, type_name))
        
        # Also look for PostalAddress directly
        for addr_obj in self._find_by_type("PostalAddress"):
            candidates.append(self._parse_address_object(addr_obj, "PostalAddress"))
        
        return [c for c in candidates if c is not None]
    
    def _parse_address_object(self, addr: dict, parent_type: str) -> Optional[Candidate]:
        """Parse a PostalAddress object."""
        address = {
            "street": addr.get("streetAddress"),
            "city": addr.get("addressLocality"),
            "region": addr.get("addressRegion"),
            "postal": addr.get("postalCode"),
            "country": addr.get("addressCountry"),
        }
        
        # Check if we have at least some components
        if not any(address.values()):
            return None
        
        # Build formatted string
        parts = []
        if address["street"]:
            parts.append(address["street"])
        if address["city"]:
            parts.append(address["city"])
        if address["region"]:
            parts.append(address["region"])
        if address["postal"]:
            parts.append(address["postal"])
        if address["country"]:
            parts.append(address["country"])
        
        address["formatted"] = ", ".join(parts)
        
        return Candidate(
            value=address,
            source_weight=self.SOURCE_WEIGHT,
            method_weight=self.METHOD_WEIGHT,
            provenance=[Provenance(
                url=self.url,
                path=f"jsonld.{parent_type}.address"
            )],
        )
    
    def extract_contact_info(self) -> dict[str, list[Candidate]]:
        """
        Extract email and phone from JSON-LD.
        
        Returns:
            Dict with 'email' and 'phone' keys
        """
        result = {"email": [], "phone": []}
        
        for type_name in ["Organization", "LocalBusiness"]:
            for org in self._find_by_type(type_name):
                # Email
                email = org.get("email")
                if email and isinstance(email, str):
                    result["email"].append(Candidate(
                        value=email.strip(),
                        source_weight=self.SOURCE_WEIGHT,
                        method_weight=self.METHOD_WEIGHT,
                        provenance=[Provenance(
                            url=self.url,
                            path=f"jsonld.{type_name}.email"
                        )],
                    ))
                
                # Phone
                phone = org.get("telephone")
                if phone and isinstance(phone, str):
                    result["phone"].append(Candidate(
                        value=phone.strip(),
                        source_weight=self.SOURCE_WEIGHT,
                        method_weight=self.METHOD_WEIGHT,
                        provenance=[Provenance(
                            url=self.url,
                            path=f"jsonld.{type_name}.telephone"
                        )],
                    ))
        
        return result
    
    def extract_logo(self) -> list[Candidate]:
        """Extract logo URL from JSON-LD."""
        candidates = []
        
        for type_name in ["Organization", "LocalBusiness"]:
            for org in self._find_by_type(type_name):
                logo = org.get("logo")
                
                # Logo can be a string URL or an ImageObject
                logo_url = None
                if isinstance(logo, str):
                    logo_url = logo
                elif isinstance(logo, dict):
                    logo_url = logo.get("url") or logo.get("contentUrl")
                
                if logo_url:
                    candidates.append(Candidate(
                        value=logo_url.strip(),
                        source_weight=self.SOURCE_WEIGHT,
                        method_weight=self.METHOD_WEIGHT,
                        provenance=[Provenance(
                            url=self.url,
                            path=f"jsonld.{type_name}.logo"
                        )],
                    ))
        
        return candidates
    
    def extract_description(self) -> list[Candidate]:
        """Extract business description."""
        candidates = []
        
        for type_name in ["Organization", "LocalBusiness"]:
            for org in self._find_by_type(type_name):
                description = org.get("description")
                if description and isinstance(description, str):
                    candidates.append(Candidate(
                        value=description.strip(),
                        source_weight=self.SOURCE_WEIGHT,
                        method_weight=self.METHOD_WEIGHT,
                        provenance=[Provenance(
                            url=self.url,
                            path=f"jsonld.{type_name}.description"
                        )],
                    ))
        
        return candidates


