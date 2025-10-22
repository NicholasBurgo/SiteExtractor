"""
Navigation and Footer extraction utilities.
Extracts exact navigation structure and footer content with proper ordering.
"""
import re
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional, Tuple


def extract_navigation(soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
    """
    Extract navigation from header landmarks or elements with role="navigation".
    Preserves visual order and nesting (dropdowns) with children[].
    Normalizes hrefs to absolute; keeps original labels (trim only).
    """
    nav_items = []
    
    # Look for navigation in header landmarks first
    header_nav = soup.find('header')
    if header_nav:
        nav_elements = header_nav.find_all(['nav', '[role="navigation"]'])
        for nav in nav_elements:
            items = _extract_nav_items(nav, base_url)
            nav_items.extend(items)
    
    # Look for standalone navigation elements
    if not nav_items:
        nav_elements = soup.find_all(['nav', '[role="navigation"]'])
        for nav in nav_elements:
            items = _extract_nav_items(nav, base_url)
            nav_items.extend(items)
    
    # Look for common navigation patterns if no explicit nav found
    if not nav_items:
        nav_patterns = [
            'nav',
            '.navbar',
            '.navigation',
            '.menu',
            '.main-menu',
            '.primary-menu',
            '.header-menu',
            '.nav-menu',
            '.site-nav',
            '.top-nav',
            '.main-nav',
            '.header-nav',
            '.nav-links',
            '.menu-links',
            '.nav-list',
            '.menu-list'
        ]
        
        for pattern in nav_patterns:
            nav_elements = soup.select(pattern)
            for nav in nav_elements:
                items = _extract_nav_items(nav, base_url)
                if items:
                    nav_items.extend(items)
                    break
            if nav_items:
                break
    
    # If still no navigation found, look for any ul/ol with links in header
    if not nav_items:
        header = soup.find('header')
        if header:
            for ul in header.find_all(['ul', 'ol']):
                items = _extract_nav_items(ul, base_url)
                if items:
                    nav_items.extend(items)
                    break
    
    # Last resort: look for any div with class containing "nav" or "menu"
    if not nav_items:
        for div in soup.find_all('div'):
            class_attr = div.get('class', [])
            if any('nav' in cls.lower() or 'menu' in cls.lower() for cls in class_attr):
                items = _extract_nav_items(div, base_url)
                if items:
                    nav_items.extend(items)
                    break
    
    return nav_items


def extract_footer(soup: BeautifulSoup, base_url: str) -> Dict[str, Any]:
    """
    Extract footer content grouped by headings if present.
    Includes socials (platform guess by hostname).
    """
    footer_data = {
        "columns": [],
        "socials": [],
        "contact": {}
    }
    
    footer_element = soup.find('footer')
    if not footer_element:
        return footer_data
    
    # Extract columns (grouped by headings)
    columns = []
    current_column = None
    
    for element in footer_element.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'p', 'div']):
        if element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            # Start new column
            if current_column:
                columns.append(current_column)
            current_column = {
                "heading": element.get_text().strip(),
                "links": []
            }
        elif element.name == 'a' and element.get('href'):
            if not current_column:
                current_column = {"heading": None, "links": []}
            
            href = urljoin(base_url, element['href'])
            label = element.get_text().strip()
            if label and href:
                current_column["links"].append({
                    "label": label,
                    "href": href
                })
    
    # Add last column
    if current_column:
        columns.append(current_column)
    
    footer_data["columns"] = columns
    
    # Extract social links
    social_patterns = {
        'facebook': ['facebook.com', 'fb.com'],
        'twitter': ['twitter.com', 'x.com'],
        'instagram': ['instagram.com'],
        'linkedin': ['linkedin.com'],
        'youtube': ['youtube.com', 'youtu.be'],
        'tiktok': ['tiktok.com'],
        'pinterest': ['pinterest.com'],
        'github': ['github.com']
    }
    
    socials = []
    for link in footer_element.find_all('a', href=True):
        href = link['href']
        label = link.get_text().strip()
        
        # Check if it's a social link
        for platform, domains in social_patterns.items():
            if any(domain in href.lower() for domain in domains):
                socials.append({
                    "platform": platform,
                    "url": urljoin(base_url, href),
                    "label": label
                })
                break
    
    footer_data["socials"] = socials
    
    # Extract contact information
    contact = {}
    footer_text = footer_element.get_text()
    
    # Extract email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, footer_text)
    if emails:
        contact["email"] = emails[0]
    
    # Extract phone
    phone_pattern = r'(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
    phones = re.findall(phone_pattern, footer_text)
    if phones:
        contact["phone"] = ''.join(phones[0])
    
    footer_data["contact"] = contact
    
    return footer_data


def _extract_nav_items(nav_element, base_url: str) -> List[Dict[str, Any]]:
    """Extract navigation items from a nav element, preserving order and nesting."""
    import re
    
    items = []
    
    def _is_good_nav_item(label: str) -> bool:
        """Check if a navigation item is good (not phone numbers, CTAs, etc.)."""
        if not label or len(label.strip()) < 1:
            return False
        
        # Filter out phone numbers
        phone_pattern = r'\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{3}\.\d{3}\.\d{4}'
        if re.search(phone_pattern, label):
            return False
        
        # Filter out common CTAs (but allow short navigation words)
        cta_patterns = [
            r'call us at',
            r'get a quote',
            r'free estimate',
            r'click here',
            r'learn more',
            r'read more',
            r'view more',
            r'shop now',
            r'buy now',
            r'sign up',
            r'subscribe',
            r'follow us',
            r'like us',
            r'share',
            r'download',
            r'free',
            r'sale',
            r'special offer',
            r'phone',
            r'email',
            r'address'
        ]
        
        label_lower = label.lower()
        for pattern in cta_patterns:
            if re.search(pattern, label_lower):
                return False
        
        # Allow common navigation words even if short
        common_nav_words = ['home', 'about', 'contact', 'services', 'work', 'blog', 'news', 'shop', 'store', 'products', 'gallery', 'portfolio', 'team', 'careers', 'jobs', 'faq', 'help', 'support', 'login', 'register', 'account', 'profile', 'settings', 'admin', 'dashboard']
        if label_lower in common_nav_words:
            return True
        
        # Filter out very short labels (but allow common nav words above)
        if len(label) < 3:
            return False
        
        # Filter out labels that are mostly numbers or symbols
        if len(re.sub(r'[^a-zA-Z]', '', label)) < 2:
            return False
        
        return True
    
    # Find all direct child links
    for link in nav_element.find_all('a', href=True, recursive=False):
        href = urljoin(base_url, link['href'])
        label = link.get_text().strip()
        
        if label and href and _is_good_nav_item(label):
            item = {
                "label": label,
                "href": href,
                "children": []
            }
            
            # Check for dropdown/submenu
            parent_li = link.find_parent('li')
            if parent_li:
                submenu = parent_li.find('ul')
                if submenu:
                    item["children"] = _extract_nav_items(submenu, base_url)
            
            items.append(item)
    
    # If no direct links found, look for nested structure
    if not items:
        for li in nav_element.find_all('li', recursive=False):
            link = li.find('a', href=True)
            if link:
                href = urljoin(base_url, link['href'])
                label = link.get_text().strip()
                
                if label and href and _is_good_nav_item(label):
                    item = {
                        "label": label,
                        "href": href,
                        "children": []
                    }
                    
                    # Check for submenu
                    submenu = li.find('ul')
                    if submenu:
                        item["children"] = _extract_nav_items(submenu, base_url)
                    
                    items.append(item)
    
    return items


def normalize_url(href: str, base_url: str) -> str:
    """Normalize URL to absolute form."""
    if not href:
        return ""
    
    # Handle fragment-only URLs
    if href.startswith('#'):
        return base_url + href
    
    # Handle protocol-relative URLs
    if href.startswith('//'):
        parsed_base = urlparse(base_url)
        return f"{parsed_base.scheme}:{href}"
    
    # Handle relative URLs
    if href.startswith('/'):
        parsed_base = urlparse(base_url)
        return f"{parsed_base.scheme}://{parsed_base.netloc}{href}"
    
    # Handle relative URLs without leading slash
    if not href.startswith(('http://', 'https://')):
        return urljoin(base_url, href)
    
    return href


def guess_social_platform(url: str) -> Optional[str]:
    """Guess social media platform from URL hostname."""
    hostname = urlparse(url).hostname.lower()
    
    platform_map = {
        'facebook.com': 'facebook',
        'fb.com': 'facebook',
        'twitter.com': 'twitter',
        'x.com': 'twitter',
        'instagram.com': 'instagram',
        'linkedin.com': 'linkedin',
        'youtube.com': 'youtube',
        'youtu.be': 'youtube',
        'tiktok.com': 'tiktok',
        'pinterest.com': 'pinterest',
        'github.com': 'github',
        'snapchat.com': 'snapchat',
        'reddit.com': 'reddit'
    }
    
    for domain, platform in platform_map.items():
        if domain in hostname:
            return platform
    
    return None
