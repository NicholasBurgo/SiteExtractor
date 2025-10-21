#!/usr/bin/env python3
"""
Legal Documents Extractor
Extracts privacy policy, terms of service, copyright notices, and other legal content
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

class LegalExtractor:
    """Extract legal documents and notices from web pages."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def extract_legal(self, url: str) -> Dict[str, Any]:
        """Extract legal documents from a URL."""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            data = {
                "privacy_policy": None,
                "terms_of_service": None,
                "copyright": None,
                "disclaimer": None,
                "legal_links": [],
                "cookie_policy": None,
                "accessibility": None,
                "extraction_date": datetime.now().isoformat(),
                "url": url
            }
            
            # Extract privacy policy
            privacy_policy = self._extract_privacy_policy(soup, url)
            data["privacy_policy"] = privacy_policy
            
            # Extract terms of service
            terms_of_service = self._extract_terms_of_service(soup, url)
            data["terms_of_service"] = terms_of_service
            
            # Extract copyright notice
            copyright_notice = self._extract_copyright(soup)
            data["copyright"] = copyright_notice
            
            # Extract disclaimer
            disclaimer = self._extract_disclaimer(soup)
            data["disclaimer"] = disclaimer
            
            # Extract legal links
            legal_links = self._extract_legal_links(soup, url)
            data["legal_links"] = legal_links
            
            # Extract cookie policy
            cookie_policy = self._extract_cookie_policy(soup, url)
            data["cookie_policy"] = cookie_policy
            
            # Extract accessibility statement
            accessibility = self._extract_accessibility(soup, url)
            data["accessibility"] = accessibility
            
            return data
            
        except Exception as e:
            logger.error(f"Error extracting legal info from {url}: {e}")
            return {
                "privacy_policy": None,
                "terms_of_service": None,
                "copyright": None,
                "disclaimer": None,
                "legal_links": [],
                "cookie_policy": None,
                "accessibility": None,
                "extraction_date": datetime.now().isoformat(),
                "url": url,
                "error": str(e)
            }
    
    def _extract_privacy_policy(self, soup: BeautifulSoup, base_url: str) -> Optional[Dict[str, Any]]:
        """Extract privacy policy information."""
        # Look for privacy policy links
        privacy_links = soup.find_all('a', href=True, string=re.compile(r'privacy|privacy policy', re.I))
        
        for link in privacy_links:
            href = link.get('href', '')
            text = link.get_text().strip()
            
            # Convert relative URLs to absolute
            if href.startswith('/'):
                href = urljoin(base_url, href)
            elif not href.startswith(('http://', 'https://')):
                href = urljoin(base_url, href)
            
            return {
                "url": href,
                "text": text,
                "found_in": "footer_link"
            }
        
        # Look for privacy policy in page content
        privacy_sections = soup.find_all(['div', 'section'], 
                                        class_=re.compile(r'privacy', re.I))
        
        for section in privacy_sections:
            content = section.get_text().strip()
            if len(content) > 100:  # Only include substantial content
                return {
                    "url": None,
                    "text": content[:500] + "..." if len(content) > 500 else content,
                    "found_in": "page_content"
                }
        
        return None
    
    def _extract_terms_of_service(self, soup: BeautifulSoup, base_url: str) -> Optional[Dict[str, Any]]:
        """Extract terms of service information."""
        # Look for terms of service links
        terms_patterns = [
            r'terms of service', r'terms and conditions', r'terms of use',
            r'user agreement', r'service agreement', r'legal terms'
        ]
        
        for pattern in terms_patterns:
            terms_links = soup.find_all('a', href=True, string=re.compile(pattern, re.I))
            
            for link in terms_links:
                href = link.get('href', '')
                text = link.get_text().strip()
                
                # Convert relative URLs to absolute
                if href.startswith('/'):
                    href = urljoin(base_url, href)
                elif not href.startswith(('http://', 'https://')):
                    href = urljoin(base_url, href)
                
                return {
                    "url": href,
                    "text": text,
                    "found_in": "footer_link"
                }
        
        # Look for terms in page content
        terms_sections = soup.find_all(['div', 'section'], 
                                     class_=re.compile(r'terms|agreement', re.I))
        
        for section in terms_sections:
            content = section.get_text().strip()
            if len(content) > 100:
                return {
                    "url": None,
                    "text": content[:500] + "..." if len(content) > 500 else content,
                    "found_in": "page_content"
                }
        
        return None
    
    def _extract_copyright(self, soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
        """Extract copyright notice."""
        # Look for copyright symbols and text
        copyright_patterns = [
            r'©\s*\d{4}', r'copyright\s*\d{4}', r'\(c\)\s*\d{4}',
            r'all rights reserved', r'©\s*\d{4}.*all rights reserved'
        ]
        
        # Check footer and copyright sections
        footer_elements = soup.find_all(['footer', 'div'], 
                                      class_=re.compile(r'footer|copyright', re.I))
        
        for element in footer_elements:
            text = element.get_text()
            for pattern in copyright_patterns:
                match = re.search(pattern, text, re.I)
                if match:
                    return {
                        "text": match.group().strip(),
                        "full_text": text.strip(),
                        "found_in": "footer"
                    }
        
        # Check entire page for copyright notices
        page_text = soup.get_text()
        for pattern in copyright_patterns:
            match = re.search(pattern, page_text, re.I)
            if match:
                return {
                    "text": match.group().strip(),
                    "full_text": None,
                    "found_in": "page_content"
                }
        
        return None
    
    def _extract_disclaimer(self, soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
        """Extract disclaimer information."""
        # Look for disclaimer sections
        disclaimer_sections = soup.find_all(['div', 'section', 'p'], 
                                           class_=re.compile(r'disclaimer', re.I))
        
        for section in disclaimer_sections:
            content = section.get_text().strip()
            if len(content) > 50:
                return {
                    "text": content[:500] + "..." if len(content) > 500 else content,
                    "found_in": "disclaimer_section"
                }
        
        # Look for disclaimer text patterns
        disclaimer_patterns = [
            r'disclaimer.*?\.', r'no warranty.*?\.', r'as is.*?\.',
            r'not responsible.*?\.', r'use at your own risk.*?\.'
        ]
        
        page_text = soup.get_text()
        for pattern in disclaimer_patterns:
            match = re.search(pattern, page_text, re.I | re.DOTALL)
            if match:
                return {
                    "text": match.group().strip(),
                    "found_in": "page_content"
                }
        
        return None
    
    def _extract_legal_links(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Extract all legal-related links."""
        legal_links = []
        
        # Legal link patterns
        legal_patterns = [
            r'privacy', r'terms', r'legal', r'disclaimer', r'copyright',
            r'cookie', r'accessibility', r'compliance', r'gdpr', r'ccpa'
        ]
        
        # Find all links
        links = soup.find_all('a', href=True)
        for link in links:
            href = link.get('href', '')
            text = link.get_text().strip().lower()
            
            # Check if link text contains legal keywords
            is_legal = any(pattern in text for pattern in legal_patterns)
            
            if is_legal:
                # Convert relative URLs to absolute
                if href.startswith('/'):
                    href = urljoin(base_url, href)
                elif not href.startswith(('http://', 'https://')):
                    href = urljoin(base_url, href)
                
                link_data = {
                    "url": href,
                    "text": link.get_text().strip(),
                    "type": self._categorize_legal_link(text),
                    "position": self._get_element_position(link)
                }
                legal_links.append(link_data)
        
        return legal_links
    
    def _extract_cookie_policy(self, soup: BeautifulSoup, base_url: str) -> Optional[Dict[str, Any]]:
        """Extract cookie policy information."""
        # Look for cookie policy links
        cookie_links = soup.find_all('a', href=True, string=re.compile(r'cookie', re.I))
        
        for link in cookie_links:
            href = link.get('href', '')
            text = link.get_text().strip()
            
            # Convert relative URLs to absolute
            if href.startswith('/'):
                href = urljoin(base_url, href)
            elif not href.startswith(('http://', 'https://')):
                href = urljoin(base_url, href)
            
            return {
                "url": href,
                "text": text,
                "found_in": "footer_link"
            }
        
        # Look for cookie consent banners
        cookie_banners = soup.find_all(['div', 'section'], 
                                     class_=re.compile(r'cookie|consent|banner', re.I))
        
        for banner in cookie_banners:
            content = banner.get_text().strip()
            if len(content) > 20:
                return {
                    "url": None,
                    "text": content[:300] + "..." if len(content) > 300 else content,
                    "found_in": "cookie_banner"
                }
        
        return None
    
    def _extract_accessibility(self, soup: BeautifulSoup, base_url: str) -> Optional[Dict[str, Any]]:
        """Extract accessibility statement."""
        # Look for accessibility links
        accessibility_links = soup.find_all('a', href=True, 
                                          string=re.compile(r'accessibility', re.I))
        
        for link in accessibility_links:
            href = link.get('href', '')
            text = link.get_text().strip()
            
            # Convert relative URLs to absolute
            if href.startswith('/'):
                href = urljoin(base_url, href)
            elif not href.startswith(('http://', 'https://')):
                href = urljoin(base_url, href)
            
            return {
                "url": href,
                "text": text,
                "found_in": "footer_link"
            }
        
        # Look for accessibility sections
        accessibility_sections = soup.find_all(['div', 'section'], 
                                             class_=re.compile(r'accessibility', re.I))
        
        for section in accessibility_sections:
            content = section.get_text().strip()
            if len(content) > 50:
                return {
                    "url": None,
                    "text": content[:400] + "..." if len(content) > 400 else content,
                    "found_in": "accessibility_section"
                }
        
        return None
    
    def _categorize_legal_link(self, text: str) -> str:
        """Categorize legal link based on text content."""
        text_lower = text.lower()
        
        if 'privacy' in text_lower:
            return 'privacy_policy'
        elif 'terms' in text_lower:
            return 'terms_of_service'
        elif 'cookie' in text_lower:
            return 'cookie_policy'
        elif 'accessibility' in text_lower:
            return 'accessibility'
        elif 'copyright' in text_lower:
            return 'copyright'
        elif 'disclaimer' in text_lower:
            return 'disclaimer'
        else:
            return 'legal_general'
    
    def _get_element_position(self, element) -> Dict[str, Any]:
        """Get approximate position of element in the page."""
        parent = element.parent
        siblings = parent.find_all(element.name) if parent else []
        index = siblings.index(element) if element in siblings else 0
        
        return {
            "section": self._get_section_name(element),
            "index": index,
            "total_siblings": len(siblings)
        }
    
    def _get_section_name(self, element) -> str:
        """Determine which section of the page the element is in."""
        current = element
        while current and current.name != 'body':
            classes = ' '.join(current.get('class', [])).lower()
            if any(section in classes for section in ['header', 'nav', 'navbar']):
                return 'header'
            elif any(section in classes for section in ['hero', 'banner', 'main']):
                return 'hero'
            elif any(section in classes for section in ['footer']):
                return 'footer'
            elif any(section in classes for section in ['sidebar']):
                return 'sidebar'
            current = current.parent
        
        return 'content'

def main():
    """Main function for command line usage."""
    if len(sys.argv) < 2:
        print("Usage: python legal_extractor.py <url>")
        sys.exit(1)
    
    url = sys.argv[1]
    extractor = LegalExtractor()
    result = extractor.extract_legal(url)
    
    # Output JSON to stdout
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()

