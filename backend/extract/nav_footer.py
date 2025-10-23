"""
Navigation and Footer extraction utilities.
Extracts exact navigation structure and footer content with proper ordering.
"""
import re
import hashlib
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional, Tuple


def hash_string(text: str) -> str:
    """Generate a stable hash for a string."""
    return hashlib.md5(text.encode('utf-8')).hexdigest()[:8]


def dedupe_by(items: List[Dict[str, Any]], key_func) -> List[Dict[str, Any]]:
    """Remove duplicates from a list based on a key function, keeping first occurrence."""
    seen = set()
    result = []
    for item in items:
        key = key_func(item)
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


def buildNavTree(soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
    """
    Build a hierarchical navigation tree by parsing <nav> structures and dropdown/megamenu patterns.
    Returns NavNode[] with proper hierarchy, order, and normalization.
    """
    # Find navigation roots
    nav_roots = soup.select('header nav, [role="navigation"]')
    if not nav_roots:
        nav_roots = soup.select('nav')
    
    if not nav_roots:
        return []
    
    root = nav_roots[0]
    
    def to_abs(url: str) -> str:
        """Convert URL to absolute form."""
        if not url:
            return ""
        if url.startswith('#'):
            return base_url + url
        if url.startswith('//'):
            parsed_base = urlparse(base_url)
            return f"{parsed_base.scheme}:{url}"
        if url.startswith('/'):
            parsed_base = urlparse(base_url)
            return f"{parsed_base.scheme}://{parsed_base.netloc}{url}"
        if not url.startswith(('http://', 'https://')):
            return urljoin(base_url, url)
        return url
    
    def to_path(url: str) -> str:
        """Extract normalized path from URL."""
        if not url:
            return ""
        try:
            parsed = urlparse(url)
            path = parsed.path.rstrip('/') or '/'
            return path
        except:
            return ""
    
    def is_good_nav_item(label: str) -> bool:
        """Check if a navigation item is good (not phone numbers, CTAs, etc.)."""
        if not label or len(label.strip()) < 1:
            return False
        
        # Filter out phone numbers
        phone_pattern = r'\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{3}\.\d{3}\.\d{4}'
        if re.search(phone_pattern, label):
            return False
        
        # Filter out common CTAs (but allow short navigation words)
        cta_patterns = [
            r'call us at', r'get a quote', r'free estimate', r'click here',
            r'learn more', r'read more', r'view more', r'shop now',
            r'buy now', r'sign up', r'subscribe', r'follow us',
            r'like us', r'share', r'download', r'free', r'sale',
            r'special offer', r'phone', r'email', r'address'
        ]
        
        label_lower = label.lower()
        for pattern in cta_patterns:
            if re.search(pattern, label_lower):
                return False
        
        # Allow common navigation words even if short
        common_nav_words = [
            'home', 'about', 'contact', 'services', 'work', 'blog', 'news',
            'shop', 'store', 'products', 'gallery', 'portfolio', 'team',
            'careers', 'jobs', 'faq', 'help', 'support', 'login', 'register',
            'account', 'profile', 'settings', 'admin', 'dashboard'
        ]
        if label_lower in common_nav_words:
            return True
        
        # Filter out very short labels (but allow common nav words above)
        if len(label) < 3:
            return False
        
        # Filter out labels that are mostly numbers or symbols
        if len(re.sub(r'[^a-zA-Z]', '', label)) < 2:
            return False
        
        return True
    
    # Track all processed URLs to prevent duplication
    processed_urls = set()
    
    def process_nav_element(nav_element, is_top_level=True):
        """Process a navigation element and return nodes."""
        nodes = []
        
        # Find direct child li elements
        lis = nav_element.select(':scope > ul > li, :scope > li')
        
        for i, li in enumerate(lis):
            # Find the main link in this li
            main_link = li.select_one(':scope > a, :scope > span[role="link"]')
            if not main_link:
                continue
            
            # Extract label and href
            label = main_link.get_text().strip()
            label = re.sub(r'\s+', ' ', label)  # Normalize whitespace
            
            if not is_good_nav_item(label):
                continue
            
            href = ""
            if main_link.name == 'a' and main_link.get('href'):
                href = to_abs(main_link['href'])
            elif main_link.get('data-href'):
                href = to_abs(main_link['data-href'])
            
            # Skip if we've already processed this URL (prevents duplication)
            if href and href in processed_urls:
                continue
            
            # Mark this URL as processed
            if href:
                processed_urls.add(href)
            
            # Create the node
            node_id = hash_string(label + href)
            node = {
                'id': node_id,
                'label': label,
                'href': href,
                'order': i,
                'path': to_path(href) if href else None,
                'children': []
            }
            
            # Find children: nested ULs, dropdowns, megamenu columns
            child_links = li.select(':scope ul li > a')
            
            if child_links:
                children = []
                for j, child_link in enumerate(child_links):
                    child_label = child_link.get_text().strip()
                    child_label = re.sub(r'\s+', ' ', child_label)
                    
                    if not is_good_nav_item(child_label):
                        continue
                    
                    child_href = to_abs(child_link['href']) if child_link.get('href') else ""
                    
                    # Skip if we've already processed this child URL
                    if child_href and child_href in processed_urls:
                        continue
                    
                    # Mark this child URL as processed
                    if child_href:
                        processed_urls.add(child_href)
                    
                    child_id = hash_string(child_label + child_href)
                    
                    child_node = {
                        'id': child_id,
                        'label': child_label,
                        'href': child_href,
                        'order': j,
                        'path': to_path(child_href) if child_href else None
                    }
                    children.append(child_node)
                
                node['children'] = children
            
            nodes.append(node)
        
        return nodes
    
    # Process the main navigation element
    nodes = process_nav_element(root, is_top_level=True)
    
    return nodes


def extract_navigation(soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
    """
    Extract navigation using the new hierarchical tree builder.
    Returns NavNode[] with proper hierarchy, order, and normalization.
    """
    return buildNavTree(soup, base_url)


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
