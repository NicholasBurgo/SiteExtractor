#!/usr/bin/env python3
"""
Services Extractor
Extracts service offerings, descriptions, and pricing from websites
"""

import sys
import json
import re
import requests
from datetime import datetime
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import logging
from typing import Dict, List, Optional, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ServicesExtractor:
    """Extract services information from web pages."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def extract_services(self, url: str) -> List[Dict[str, Any]]:
        """Extract services from a URL."""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            text = soup.get_text(" ")
            
            services = []
            
            # Method 1: Services section
            services_sections = soup.find_all(['div', 'section'], class_=re.compile(r'services|offerings|what.*we.*do', re.I))
            for section in services_sections:
                section_services = self._extract_services_from_section(section)
                services.extend(section_services)
            
            # Method 2: Menu/Navigation items
            nav_services = self._extract_services_from_navigation(soup)
            services.extend(nav_services)
            
            # Method 3: List items that look like services
            list_services = self._extract_services_from_lists(soup)
            services.extend(list_services)
            
            # Method 4: Structured data
            structured_services = self._extract_services_from_structured_data(soup)
            services.extend(structured_services)
            
            # Remove duplicates and clean up
            unique_services = self._deduplicate_services(services)
            
            return unique_services[:10]  # Limit to 10 services
            
        except Exception as e:
            logger.error(f"Error extracting services from {url}: {e}")
            return []
    
    def _extract_services_from_section(self, section: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract services from a services section."""
        services = []
        
        # Look for service cards/items
        service_items = section.find_all(['div', 'article', 'li'], class_=re.compile(r'service|offering|item|card', re.I))
        
        for item in service_items:
            service = self._parse_service_item(item)
            if service:
                services.append(service)
        
        # If no specific service items, look for headings
        if not services:
            headings = section.find_all(['h2', 'h3', 'h4'])
            for heading in headings:
                service_text = heading.get_text().strip()
                if self._looks_like_service(service_text):
                    service = {
                        "id": f"svc-{len(services) + 1}",
                        "name": service_text,
                        "description": None,
                        "price": None,
                        "category": None,
                        "confirmed": False
                    }
                    services.append(service)
        
        return services
    
    def _extract_services_from_navigation(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract services from navigation menu."""
        services = []
        
        # Look for navigation menus
        nav_elements = soup.find_all(['nav', 'ul'], class_=re.compile(r'nav|menu', re.I))
        
        for nav in nav_elements:
            links = nav.find_all('a', href=True)
            for link in links:
                link_text = link.get_text().strip()
                if self._looks_like_service(link_text):
                    service = {
                        "id": f"svc-nav-{len(services) + 1}",
                        "name": link_text,
                        "description": None,
                        "price": None,
                        "category": "Navigation",
                        "confirmed": False
                    }
                    services.append(service)
        
        return services
    
    def _extract_services_from_lists(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract services from list items."""
        services = []
        
        # Look for unordered lists that might contain services
        lists = soup.find_all('ul')
        
        for ul in lists:
            # Check if this list looks like it contains services
            list_text = ul.get_text().lower()
            if any(keyword in list_text for keyword in ['service', 'offering', 'what we do', 'our services']):
                list_items = ul.find_all('li')
                for li in list_items:
                    item_text = li.get_text().strip()
                    if self._looks_like_service(item_text):
                        service = {
                            "id": f"svc-list-{len(services) + 1}",
                            "name": item_text,
                            "description": None,
                            "price": None,
                            "category": "List",
                            "confirmed": False
                        }
                        services.append(service)
        
        return services
    
    def _extract_services_from_structured_data(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract services from structured data (JSON-LD)."""
        services = []
        
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    # Look for service-related structured data
                    if 'hasOfferCatalog' in data:
                        catalog = data['hasOfferCatalog']
                        if isinstance(catalog, dict) and 'itemListElement' in catalog:
                            for item in catalog['itemListElement']:
                                if isinstance(item, dict) and 'item' in item:
                                    service_item = item['item']
                                    if isinstance(service_item, dict) and 'name' in service_item:
                                        service = {
                                            "id": f"svc-structured-{len(services) + 1}",
                                            "name": service_item['name'],
                                            "description": service_item.get('description'),
                                            "price": service_item.get('price'),
                                            "category": "Structured Data",
                                            "confirmed": False
                                        }
                                        services.append(service)
            except:
                continue
        
        return services
    
    def _parse_service_item(self, item: BeautifulSoup) -> Optional[Dict[str, Any]]:
        """Parse a service item element."""
        # Extract service name
        name_element = item.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'span'])
        if not name_element:
            name_element = item
        
        service_name = name_element.get_text().strip()
        if not self._looks_like_service(service_name):
            return None
        
        # Extract description
        description = None
        desc_element = item.find(['p', 'div'], class_=re.compile(r'description|summary|details', re.I))
        if not desc_element:
            # Look for any paragraph in the item
            desc_element = item.find('p')
        
        if desc_element:
            description = desc_element.get_text().strip()
            if len(description) > 200:
                description = description[:200] + "..."
        
        # Extract price
        price = None
        price_element = item.find(string=re.compile(r'\$[\d,]+(?:\.\d{2})?|\d+\s*(?:dollars?|USD)', re.I))
        if price_element:
            price_match = re.search(r'\$[\d,]+(?:\.\d{2})?|\d+\s*(?:dollars?|USD)', str(price_element), re.I)
            if price_match:
                price = price_match.group(0)
        
        # Extract category
        category = None
        category_element = item.find(class_=re.compile(r'category|type|class', re.I))
        if category_element:
            category = category_element.get_text().strip()
        
        return {
            "id": f"svc-item-{hash(service_name) % 10000}",
            "name": service_name,
            "description": description,
            "price": price,
            "category": category,
            "confirmed": False
        }
    
    def _looks_like_service(self, text: str) -> bool:
        """Check if text looks like a service name."""
        if not text or len(text) < 3 or len(text) > 100:
            return False
        
        # Skip common non-service text
        skip_patterns = [
            r'^(home|about|contact|blog|news|careers|privacy|terms)$',
            r'^(login|sign up|register|account)$',
            r'^(facebook|twitter|instagram|linkedin)$',
            r'^\d+$',  # Just numbers
            r'^(more|less|read more|show more)$',
        ]
        
        for pattern in skip_patterns:
            if re.match(pattern, text, re.I):
                return False
        
        # Look for service-like keywords
        service_keywords = [
            'service', 'cleaning', 'repair', 'maintenance', 'consulting',
            'design', 'development', 'marketing', 'support', 'training',
            'installation', 'inspection', 'treatment', 'therapy', 'care',
            'washing', 'painting', 'construction', 'renovation', 'remodeling'
        ]
        
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in service_keywords)
    
    def _deduplicate_services(self, services: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate services based on name similarity."""
        unique_services = []
        seen_names = set()
        
        for service in services:
            name_lower = service['name'].lower().strip()
            
            # Check for exact duplicates
            if name_lower in seen_names:
                continue
            
            # Check for similar names (fuzzy matching)
            is_duplicate = False
            for seen_name in seen_names:
                if self._names_are_similar(name_lower, seen_name):
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_services.append(service)
                seen_names.add(name_lower)
        
        return unique_services
    
    def _names_are_similar(self, name1: str, name2: str) -> bool:
        """Check if two service names are similar enough to be considered duplicates."""
        # Simple similarity check - can be enhanced with more sophisticated algorithms
        if name1 == name2:
            return True
        
        # Check if one name is contained in the other
        if name1 in name2 or name2 in name1:
            return True
        
        # Check word overlap
        words1 = set(name1.split())
        words2 = set(name2.split())
        
        if len(words1) > 0 and len(words2) > 0:
            overlap = len(words1.intersection(words2))
            total_words = len(words1.union(words2))
            similarity = overlap / total_words
            
            return similarity > 0.7  # 70% word overlap
        
        return False

def main():
    """Main function for command line usage."""
    if len(sys.argv) < 2:
        print("Usage: python services_extractor.py <url>")
        sys.exit(1)
    
    url = sys.argv[1]
    extractor = ServicesExtractor()
    result = extractor.extract_services(url)
    
    # Output JSON to stdout
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
