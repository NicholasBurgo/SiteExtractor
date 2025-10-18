"""
HTML parsing utilities using BeautifulSoup and lxml.
"""

import logging
import re
from typing import Optional
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)


class HTMLParser:
    """HTML parser with utility methods for extraction."""
    
    def __init__(self, html: str, base_url: str):
        """
        Initialize parser.
        
        Args:
            html: HTML content
            base_url: Base URL for resolving relative links
        """
        self.html = html
        self.base_url = base_url
        self.soup = BeautifulSoup(html, "lxml")
    
    def get_soup(self) -> BeautifulSoup:
        """Get the BeautifulSoup object."""
        return self.soup
    
    def is_javascript_spa(self) -> bool:
        """
        Detect if the page is a JavaScript Single Page Application or parked domain.
        
        Returns:
            True if the page appears to be an SPA/parked with minimal extractable content
        """
        # Check for common SPA indicators
        body = self.soup.find("body")
        
        # If no body tag at all, check if page is mostly empty with JavaScript redirect
        if not body:
            # No body tag - check if this is a JavaScript-only redirect
            if "window.location" in str(self.soup) or "document.location" in str(self.soup):
                return True
            # If page is very small and has no body, probably not useful
            if len(str(self.soup)) < 300:
                return True
            return False
        
        body_text = body.get_text(strip=True)
        
        # 1. Very strict check: body is nearly empty (<50 chars)
        if len(body_text) < 50:
            return True
        
        # 2. Look for empty root divs (React, Vue, Angular) with no siblings
        spa_roots = body.find_all(["div"], id=re.compile(r"^(root|app|__next)$"))
        for root in spa_roots:
            # If root has no meaningful content AND is the only child
            if not root.get_text(strip=True) and len(list(body.children)) <= 3:
                return True
        
        # 3. Check for domain parking pages
        parking_indicators = ["domain parking", "parked domain", "this domain", "adsense/domains"]
        if any(indicator in str(self.soup).lower() for indicator in parking_indicators):
            if len(body_text) < 300:  # Parking pages are usually very short
                return True
        
        # 4. Explicit redirect-only pages
        if len(body_text) == 0 and "window.location" in str(self.soup):
            return True
        
        return False
    
    def get_title(self) -> Optional[str]:
        """Extract page title."""
        title_tag = self.soup.find("title")
        if title_tag:
            return title_tag.get_text(strip=True)
        return None
    
    def get_meta_content(self, name: Optional[str] = None, 
                        property: Optional[str] = None) -> Optional[str]:
        """
        Get content from a meta tag.
        
        Args:
            name: Value of 'name' attribute
            property: Value of 'property' attribute
            
        Returns:
            Content value or None
        """
        if name:
            tag = self.soup.find("meta", attrs={"name": name})
        elif property:
            tag = self.soup.find("meta", attrs={"property": property})
        else:
            return None
        
        if tag and isinstance(tag, Tag):
            return tag.get("content")
        return None
    
    def get_all_links(self, absolute: bool = True) -> list[str]:
        """
        Extract all links from the page.
        
        Args:
            absolute: Convert to absolute URLs
            
        Returns:
            List of URLs
        """
        links = []
        for a_tag in self.soup.find_all("a", href=True):
            href = a_tag["href"]
            if absolute:
                href = urljoin(self.base_url, href)
            
            # Skip non-http(s) links
            parsed = urlparse(href)
            if parsed.scheme in ("http", "https"):
                links.append(href)
        
        return links
    
    def get_navigation_links(self) -> list[str]:
        """
        Extract links from navigation elements.
        
        Returns:
            List of absolute URLs from nav elements
        """
        links = []
        
        # Find nav elements
        for nav in self.soup.find_all(["nav", "header"]):
            for a_tag in nav.find_all("a", href=True):
                href = urljoin(self.base_url, a_tag["href"])
                parsed = urlparse(href)
                if parsed.scheme in ("http", "https"):
                    links.append(href)
        
        return links
    
    def find_sections_by_text(self, patterns: list[str]) -> list[Tag]:
        """
        Find sections/divs containing specific text patterns.
        
        Args:
            patterns: List of case-insensitive patterns to search
            
        Returns:
            List of matching Tag elements
        """
        matches = []
        
        for pattern in patterns:
            regex = re.compile(pattern, re.IGNORECASE)
            
            # Search in headings
            for tag in self.soup.find_all(["h1", "h2", "h3", "section", "div"]):
                text = tag.get_text(strip=True)
                if regex.search(text):
                    matches.append(tag)
        
        return matches
    
    def extract_text_from_tag(self, tag: Tag, max_words: Optional[int] = None) -> str:
        """
        Extract clean text from a tag.
        
        Args:
            tag: BeautifulSoup Tag
            max_words: Optional word limit
            
        Returns:
            Cleaned text
        """
        text = tag.get_text(separator=" ", strip=True)
        text = re.sub(r"\s+", " ", text)
        
        if max_words:
            words = text.split()[:max_words]
            text = " ".join(words)
        
        return text
    
    def find_by_itemprop(self, itemprop: str) -> list[Tag]:
        """
        Find elements with specific itemprop attribute (microdata).
        
        Args:
            itemprop: Value of itemprop attribute
            
        Returns:
            List of matching tags
        """
        return self.soup.find_all(attrs={"itemprop": itemprop})
    
    def find_jsonld_scripts(self) -> list[str]:
        """
        Extract JSON-LD script contents.
        
        Returns:
            List of JSON-LD script text contents
        """
        scripts = []
        for script in self.soup.find_all("script", type="application/ld+json"):
            if script.string:
                scripts.append(script.string)
        
        return scripts
    
    def find_tel_links(self) -> list[str]:
        """
        Find all tel: links.
        
        Returns:
            List of telephone numbers (with tel: prefix stripped)
        """
        phones = []
        for a_tag in self.soup.find_all("a", href=True):
            href = a_tag["href"]
            if href.startswith("tel:"):
                phone = href[4:].strip()
                phones.append(phone)
        
        return phones
    
    def find_mailto_links(self) -> list[str]:
        """
        Find all mailto: links.
        
        Returns:
            List of email addresses (with mailto: prefix stripped)
        """
        emails = []
        for a_tag in self.soup.find_all("a", href=True):
            href = a_tag["href"]
            if href.startswith("mailto:"):
                email = href[7:].split("?")[0].strip()
                emails.append(email)
        
        return emails
    
    def find_social_links(self, domains: list[str]) -> dict[str, list[str]]:
        """
        Find links to social media platforms.
        
        Args:
            domains: List of domain patterns to search for
            
        Returns:
            Dict mapping domain to list of URLs
        """
        social_links = {domain: [] for domain in domains}
        
        for a_tag in self.soup.find_all("a", href=True):
            href = a_tag["href"]
            parsed = urlparse(href)
            hostname = parsed.netloc.lower()
            
            for domain in domains:
                if domain in hostname:
                    absolute = urljoin(self.base_url, href)
                    social_links[domain].append(absolute)
        
        return social_links
    
    def get_css_variables(self) -> dict[str, str]:
        """
        Extract CSS variables from inline styles and style tags.
        
        Returns:
            Dict mapping CSS variable names to values
        """
        variables = {}
        
        # Find style tags
        for style_tag in self.soup.find_all("style"):
            if style_tag.string:
                # Look for :root or CSS variable declarations
                matches = re.findall(
                    r"--([a-zA-Z0-9-]+)\s*:\s*([^;]+);",
                    style_tag.string
                )
                for name, value in matches:
                    variables[f"--{name}"] = value.strip()
        
        return variables
    
    def find_images(self, patterns: Optional[list[str]] = None) -> list[dict]:
        """
        Find images, optionally filtering by src/class/alt patterns.
        
        Args:
            patterns: Optional list of patterns to match
            
        Returns:
            List of dicts with src, alt, class, width, height
        """
        images = []
        
        for img in self.soup.find_all("img"):
            src = img.get("src", "")
            alt = img.get("alt", "")
            classes = " ".join(img.get("class", []))
            
            # Filter by patterns if provided
            if patterns:
                combined = f"{src} {alt} {classes}".lower()
                if not any(p.lower() in combined for p in patterns):
                    continue
            
            # Make src absolute
            if src:
                src = urljoin(self.base_url, src)
            
            images.append({
                "src": src,
                "alt": alt,
                "class": classes,
                "width": img.get("width"),
                "height": img.get("height"),
            })
        
        return images
    
    def extract_structured_address(self) -> list[dict]:
        """
        Extract addresses from structured markup (microdata, schema.org).
        
        Returns:
            List of address dicts with components
        """
        addresses = []
        
        # Look for schema.org PostalAddress
        for elem in self.soup.find_all(attrs={"itemtype": re.compile(r"schema.org/PostalAddress")}):
            address = {}
            
            # Extract components
            for prop in ["streetAddress", "addressLocality", "addressRegion", 
                        "postalCode", "addressCountry"]:
                tag = elem.find(attrs={"itemprop": prop})
                if tag:
                    address[prop] = tag.get_text(strip=True)
            
            if address:
                addresses.append(address)
        
        return addresses

