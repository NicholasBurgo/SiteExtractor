#!/usr/bin/env python3
"""
Enhanced truth extractor with strict validation and high accuracy.
"""

import sys
import json
import os
import re
import time
import requests
from datetime import datetime
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import logging
from typing import Dict, List, Optional, Tuple, Any
import phonenumbers
from email_validator import validate_email, EmailNotValidError
import validators

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StrictValidator:
    """Strict validation utilities for extracted data."""
    
    @staticmethod
    def validate_email(email: str) -> Tuple[bool, float]:
        """Validate email with strict rules."""
        if not email or not isinstance(email, str):
            return False, 0.0
        
        email = email.strip().lower()
        
        # Basic format check
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return False, 0.0
        
        try:
            # Use email-validator for comprehensive validation
            valid = validate_email(email)
            if valid.email:
                return True, 0.95
        except EmailNotValidError:
            pass
        
        # Additional checks for common patterns
        if email.endswith(('.com', '.org', '.net', '.edu', '.gov')):
            return True, 0.85
        
        return False, 0.0
    
    @staticmethod
    def validate_phone(phone: str) -> Tuple[bool, float]:
        """Validate phone number with strict rules."""
        if not phone or not isinstance(phone, str):
            return False, 0.0
        
        # Clean phone number
        cleaned = re.sub(r'[^\d+\-\(\)\s]', '', phone.strip())
        
        if not cleaned:
            return False, 0.0
        
        try:
            # Try to parse with phonenumbers library
            parsed = phonenumbers.parse(cleaned, "US")
            if phonenumbers.is_valid_number(parsed):
                return True, 0.95
        except:
            pass
        
        # Fallback to regex patterns
        patterns = [
            r'^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$',  # US format
            r'^\+?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}$',  # International
        ]
        
        for pattern in patterns:
            if re.match(pattern, cleaned):
                return True, 0.75
        
        return False, 0.0
    
    @staticmethod
    def validate_url(url: str) -> Tuple[bool, float]:
        """Validate URL."""
        if not url or not isinstance(url, str):
            return False, 0.0
        
        try:
            if validators.url(url):
                return True, 0.9
        except:
            pass
        
        # Basic URL pattern check
        if re.match(r'^https?://[^\s/$.?#].[^\s]*$', url):
            return True, 0.7
        
        return False, 0.0
    
    @staticmethod
    def validate_color(color: str) -> Tuple[bool, float]:
        """Validate color code."""
        if not color or not isinstance(color, str):
            return False, 0.0
        
        color = color.strip().upper()
        
        # Hex color validation
        if re.match(r'^#[0-9A-F]{6}$', color):
            return True, 0.95
        
        # RGB color validation
        if re.match(r'^RGB\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$', color):
            return True, 0.9
        
        return False, 0.0

class EnhancedTruthExtractor:
    """Enhanced truth extractor with strict validation and multiple extraction methods."""
    
    def __init__(self, max_pages: int = 20, timeout: int = 10):
        self.max_pages = max_pages
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.validator = StrictValidator()
        self.visited_urls = set()
        
    def extract_from_multiple_pages(self, start_url: str) -> Dict[str, Any]:
        """Extract truth data from multiple pages of a website."""
        all_paragraphs = []
        all_images = []
        visited_urls = set()
        urls_to_visit = [start_url]
        global_seen_image_urls = set()  # Track image URLs across all pages
        
        while urls_to_visit and len(visited_urls) < self.max_pages:
            current_url = urls_to_visit.pop(0)
            
            # Normalize URL to avoid duplicates
            normalized_url = self._normalize_url(current_url)
            
            if normalized_url in visited_urls:
                continue
                
            try:
                logger.info(f"Extracting from page: {current_url}")
                response = self.session.get(current_url, timeout=self.timeout)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                visited_urls.add(normalized_url)
                
                # Extract paragraphs from this page
                page_paragraphs = self._extract_paragraphs(soup, normalized_url, len(all_paragraphs))
                all_paragraphs.extend(page_paragraphs)
                
                # Extract images from this page with global deduplication
                page_images = self._extract_images(soup, normalized_url, len(all_images))
                
                # Filter out images we've already seen globally
                unique_page_images = []
                for img in page_images:
                    if img['url'] not in global_seen_image_urls:
                        global_seen_image_urls.add(img['url'])
                        unique_page_images.append(img)
                
                all_images.extend(unique_page_images)
                
                # Find links to other pages on the same domain
                if len(visited_urls) < self.max_pages:
                    new_urls = self._find_internal_links(soup, start_url, visited_urls)
                    urls_to_visit.extend(new_urls[:self.max_pages - len(visited_urls)])
                
            except Exception as e:
                logger.error(f"Error extracting from {current_url}: {e}")
                continue
        
        # Extract other data from the main page
        try:
            response = self.session.get(start_url, timeout=self.timeout)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            extracted_data = {
                'brand_name': self._extract_brand_name(soup, start_url),
                'location': self._extract_location(soup, start_url),
                'email': self._extract_email(soup, start_url),
                'phone': self._extract_phone(soup, start_url),
                'socials': self._extract_socials(soup, start_url),
                'services': self._extract_services(soup, start_url),
                'brand_colors': self._extract_colors(soup, start_url),
                'logo': self._extract_logo(soup, start_url),
                'background': self._extract_background(soup, start_url),
                'slogan': self._extract_slogan(soup, start_url),
                'paragraphs': all_paragraphs,
                'images': all_images,
                'navbar': self._extract_navbar(soup, start_url)
            }
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"Error extracting main data from {start_url}: {e}")
            return {'paragraphs': all_paragraphs, 'images': all_images}
    
    def _find_internal_links(self, soup: BeautifulSoup, base_url: str, visited_urls: set) -> List[str]:
        """Find internal links to other pages on the same domain."""
        from urllib.parse import urljoin, urlparse
        
        base_domain = urlparse(base_url).netloc
        internal_links = []
        
        # Find all links
        links = soup.find_all('a', href=True)
        
        for link in links:
            href = link['href']
            full_url = urljoin(base_url, href)
            
            # Check if it's an internal link
            if urlparse(full_url).netloc == base_domain:
                # Clean up the URL (remove fragments, query params for now)
                clean_url = urlparse(full_url)._replace(fragment='', query='').geturl()
                
                # Normalize URLs to avoid duplicates (e.g., / and /home)
                normalized_url = self._normalize_url(clean_url)
                
                if normalized_url not in visited_urls and normalized_url not in internal_links:
                    # Skip common non-content pages
                    skip_patterns = [
                        '/admin', '/login', '/register', '/cart', '/checkout',
                        '/account', '/profile', '/dashboard', '/api/', '/ajax/',
                        '.pdf', '.doc', '.docx', '.jpg', '.png', '.gif', '.css', '.js'
                    ]
                    
                    if not any(pattern in normalized_url.lower() for pattern in skip_patterns):
                        internal_links.append(normalized_url)
        
        return internal_links[:10]  # Limit to 10 new URLs per page
    
    def _normalize_url(self, url: str) -> str:
        """Normalize URLs to avoid duplicates (e.g., / and /home)."""
        from urllib.parse import urlparse
        
        parsed = urlparse(url)
        path = parsed.path
        
        # Handle empty path (no trailing slash) - treat as home page
        if not path or path == '':
            path = '/'
        
        # Normalize common home page variations
        if path in ['/', '/home', '/index', '/index.html', '/index.php']:
            return parsed._replace(path='/').geturl()
        
        # Remove trailing slashes for consistency
        if path.endswith('/') and len(path) > 1:
            path = path.rstrip('/')
        
        return parsed._replace(path=path).geturl()
    
    def _route_to_page_name(self, route: str) -> str:
        """Convert route to human-readable page name."""
        # Remove leading slash and normalize
        route = route.strip('/')
        
        # Common route mappings
        route_mappings = {
            '': 'Home',
            '/': 'Home',
            'home': 'Home',
            'index': 'Home',
            'about': 'About',
            'about-us': 'About',
            'services': 'Services',
            'our-services': 'Services',
            'contact': 'Contact',
            'contact-us': 'Contact',
            'portfolio': 'Portfolio',
            'our-work': 'Our Work',
            'gallery': 'Gallery',
            'blog': 'Blog',
            'news': 'News',
            'pricing': 'Pricing',
            'testimonials': 'Testimonials',
            'reviews': 'Reviews',
            'faq': 'FAQ',
            'help': 'Help',
            'support': 'Support'
        }
        
        # Check exact match first
        if route in route_mappings:
            return f"{route_mappings[route]} Page"
        
        # Check if it starts with any known pattern
        for pattern, name in route_mappings.items():
            if route.startswith(pattern + '/') or route.startswith(pattern + '-'):
                return f"{name} Page"
        
        # Convert route to title case
        if route:
            # Replace hyphens and underscores with spaces
            clean_route = route.replace('-', ' ').replace('_', ' ')
            # Convert to title case
            title_route = clean_route.title()
            return f"{title_route} Page"
        
        return "Home Page"
    
    def _extract_navbar(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract navigation structure from the page with enhanced quality control."""
        navbar_items = []
        
        # Look for common navigation elements with priority order
        nav_selectors = [
            'nav',
            '.nav',
            '.navbar',
            '.navigation',
            '.menu',
            '.main-menu',
            'header nav',
            '.header-nav',
            '.site-nav',
            '.primary-nav',
            '.main-nav',
            '.top-nav'
        ]
        
        nav_element = None
        for selector in nav_selectors:
            nav_element = soup.select_one(selector)
            if nav_element:
                break
        
        if not nav_element:
            # Fallback: look for any element with links that might be navigation
            nav_element = soup.find('div', class_=lambda x: x and any(
                nav_word in x.lower() for nav_word in ['nav', 'menu', 'header']
            ))
        
        if nav_element:
            # Extract links from navigation with enhanced processing
            links = nav_element.find_all('a', href=True)
            raw_items = []
            
            for i, link in enumerate(links):
                href = link.get('href', '')
                text = link.get_text(strip=True)
                
                if text and href and len(text) < 50:  # Reasonable link text length
                    # Convert relative URLs to absolute
                    full_url = urljoin(url, href)
                    parsed_url = urlparse(full_url)
                    
                    # Only include internal links
                    if parsed_url.netloc == urlparse(url).netloc:
                        # Clean and normalize the text
                        cleaned_text = self._clean_navigation_text(text)
                        
                        if cleaned_text and self._is_valid_navigation_item(cleaned_text, parsed_url.path):
                            raw_items.append({
                                'id': f"nav_{i}",
                                'label': cleaned_text,
                                'href': parsed_url.path or '/',
                                'order': i,
                                'status': 'extracted',
                                'children': [],
                                'is_locked': False,
                                'created_at': datetime.now().isoformat(),
                                'updated_at': datetime.now().isoformat(),
                                'quality_score': self._calculate_navigation_quality(cleaned_text, parsed_url.path)
                            })
            
            # Apply deduplication and quality filtering
            navbar_items = self._deduplicate_and_filter_navigation(raw_items)
        
        # If no navigation found, create a basic structure
        if not navbar_items:
            navbar_items = [
                {
                    'id': 'root',
                    'label': 'Home',
                    'href': '/',
                    'order': 0,
                    'status': 'extracted',
                    'children': [],
                    'is_locked': False,
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat(),
                    'quality_score': 100
                }
            ]
        
        return {
            'id': 'root',
            'label': 'Home',
            'href': '/',
            'order': 0,
            'status': 'extracted',
            'children': navbar_items,
            'is_locked': False,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
    
    def _clean_navigation_text(self, text: str) -> str:
        """Clean and normalize navigation text."""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common unwanted patterns
        unwanted_patterns = [
            r'^\s*[|•]\s*',  # Leading separators
            r'\s*[|•]\s*$',  # Trailing separators
            r'^\s*>\s*',     # Leading arrows
            r'\s*>\s*$',     # Trailing arrows
            r'^\s*-\s*',     # Leading dashes
            r'\s*-\s*$',     # Trailing dashes
        ]
        
        for pattern in unwanted_patterns:
            text = re.sub(pattern, '', text)
        
        # Remove phone numbers and emails from navigation text (more aggressive)
        phone_patterns = [
            r'\(\d{3}\)\s*\d{3}-\d{4}',  # (123) 456-7890
            r'\d{3}-\d{3}-\d{4}',         # 123-456-7890
            r'\+\d{1,3}\s*\d{3,4}\s*\d{3,4}\s*\d{3,4}',  # International
            r'call\s+us\s+at\s*[^\w\s]*',  # "call us at" patterns
            r'phone\s*:?\s*[^\w\s]*',     # "phone:" patterns
        ]
        
        for pattern in phone_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Remove email patterns
        text = re.sub(r'@\w+\.\w+', '', text)
        
        # Remove common navigation artifacts
        artifacts = ['click here', 'read more', 'learn more', 'view all', 'see all', 'call us', 'contact us']
        for artifact in artifacts:
            if artifact.lower() in text.lower():
                text = text.replace(artifact, '').strip()
        
        # Remove any remaining phone number fragments
        text = re.sub(r'\b\d{3,}\b', '', text)  # Remove standalone numbers
        
        # Clean up any double spaces or empty sections
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Capitalize properly (title case for navigation)
        text = text.title()
        
        return text.strip()
    
    def _is_valid_navigation_item(self, text: str, href: str) -> bool:
        """Validate if a navigation item is legitimate."""
        if not text or not href:
            return False
        
        # Reject very short or very long text
        if len(text) < 2 or len(text) > 30:
            return False
        
        # Reject items that are clearly not navigation
        invalid_patterns = [
            r'^\d+$',  # Pure numbers
            r'^[^\w\s]+$',  # Only symbols
            r'^(home|main|index)$',  # Generic terms that might be duplicates
        ]
        
        for pattern in invalid_patterns:
            if re.match(pattern, text.lower()):
                return False
        
        # Reject fragments and anchors
        if href.startswith('#') or href.startswith('javascript:'):
            return False
        
        # Reject file downloads
        if any(ext in href.lower() for ext in ['.pdf', '.doc', '.zip', '.jpg', '.png', '.gif']):
            return False
        
        return True
    
    def _calculate_navigation_quality(self, text: str, href: str) -> int:
        """Calculate quality score for navigation item (0-100)."""
        score = 50  # Base score
        
        # Text quality factors
        if len(text) >= 3 and len(text) <= 20:
            score += 20
        
        if text.isalpha() or ' ' in text:  # Contains only letters and spaces
            score += 15
        
        if not any(char in text for char in '0123456789@()'):
            score += 10
        
        # URL quality factors
        if href == '/':
            score += 15  # Home page is important
        
        if len(href.split('/')) <= 3:  # Not too deep
            score += 10
        
        # Heavy penalties for contact information in navigation
        contact_patterns = [
            r'call\s+us', r'phone', r'contact\s+us', r'\(\d{3}\)', 
            r'\d{3}-\d{3}-\d{4}', r'@\w+\.\w+', r'tel:', r'mailto:'
        ]
        
        for pattern in contact_patterns:
            if re.search(pattern, text.lower()):
                score -= 30  # Heavy penalty for contact info
        
        # Additional penalties for phone numbers
        if re.search(r'\d{3,}', text):
            score -= 20
        
        # Penalize items that are clearly not navigation
        if any(word in text.lower() for word in ['call', 'phone', 'email', 'contact', 'tel']):
            score -= 15
        
        return min(100, max(0, score))
    
    def _deduplicate_and_filter_navigation(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicates and filter low-quality navigation items."""
        if not items:
            return []
        
        # Sort by quality score (highest first)
        items.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
        
        # Group items by URL to handle multiple labels pointing to same destination
        url_groups = {}
        for item in items:
            url = item['href']
            if url not in url_groups:
                url_groups[url] = []
            url_groups[url].append(item)
        
        filtered_items = []
        seen_labels = set()
        
        # Process each URL group
        for url, group_items in url_groups.items():
            # Sort group by quality score (highest first)
            group_items.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
            
            # Find the best item for this URL
            best_item = None
            for item in group_items:
                label = item['label'].lower()
                
                # Skip if we've seen a very similar label (fuzzy matching)
                is_duplicate_label = False
                for seen_label in seen_labels:
                    if self._are_labels_similar(label, seen_label):
                        is_duplicate_label = True
                        break
                
                if not is_duplicate_label and item.get('quality_score', 0) >= 30:
                    best_item = item
                    seen_labels.add(label)
                    break
            
            if best_item:
                filtered_items.append(best_item)
        
        # Reorder by original order, maintaining quality
        filtered_items.sort(key=lambda x: x['order'])
        
        # Update IDs to be sequential
        for i, item in enumerate(filtered_items):
            item['id'] = f"nav_{i}"
            item['order'] = i
        
        return filtered_items
    
    def _are_labels_similar(self, label1: str, label2: str) -> bool:
        """Check if two navigation labels are similar enough to be considered duplicates."""
        # Exact match
        if label1 == label2:
            return True
        
        # One is contained in the other
        if label1 in label2 or label2 in label1:
            return True
        
        # Check for common variations
        variations = [
            ('home', 'homepage', 'main'),
            ('about', 'about us', 'about me'),
            ('contact', 'contact us', 'get in touch'),
            ('services', 'our services', 'what we do'),
            ('portfolio', 'work', 'our work', 'gallery'),
            ('blog', 'news', 'articles'),
            ('shop', 'store', 'buy'),
        ]
        
        for variation_group in variations:
            if label1 in variation_group and label2 in variation_group:
                return True
        
        return False
    
    def _extract_brand_name(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract brand name with multiple validation methods and strict filtering."""
        candidates = []
        
        def is_valid_brand_name(text: str) -> bool:
            """Check if text is likely a valid brand name."""
            if not text or len(text.strip()) < 2:
                return False
            
            text = text.strip()
            
            # Reject phone numbers
            if re.search(r'\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\+\d{1,3}\s*\d{3,4}\s*\d{3,4}\s*\d{3,4}', text):
                return False
            
            # Reject email addresses
            if re.search(r'@\w+\.\w+', text):
                return False
            
            # Reject URLs
            if re.search(r'https?://|www\.', text, re.I):
                return False
            
            # Reject common non-brand phrases
            reject_phrases = [
                'call us', 'contact us', 'phone', 'email', 'address', 'location',
                'home', 'about', 'services', 'contact', 'menu', 'navigation',
                'welcome', 'official', 'website', 'site', 'page'
            ]
            
            text_lower = text.lower()
            for phrase in reject_phrases:
                if phrase in text_lower:
                    return False
            
            # Must contain at least one letter
            if not re.search(r'[a-zA-Z]', text):
                return False
            
            # Reasonable length (2-100 characters)
            if len(text) < 2 or len(text) > 100:
                return False
            
            return True
        
        # Method 1: Page title (highest priority)
        title = soup.find('title')
        if title and title.text.strip():
            title_text = title.text.strip()
            # Clean up title (remove common suffixes and prefixes)
            clean_title = re.sub(r'\s*[-|]\s*(Home|Welcome|Official|Website|Site).*$', '', title_text, flags=re.IGNORECASE)
            clean_title = re.sub(r'^(Home|Welcome|Official|Website|Site)\s*[-|]\s*', '', clean_title, flags=re.IGNORECASE)
            
            if is_valid_brand_name(clean_title):
                candidates.append({
                    'value': clean_title,
                    'confidence': 0.9,
                    'source': 'title',
                    'provenance': [{'url': url, 'path': 'title'}]
                })
        
        # Method 2: Meta property og:title
        og_title = soup.find('meta', property='og:title')
        if og_title and og_title.get('content'):
            og_text = og_title.get('content').strip()
            if is_valid_brand_name(og_text):
                candidates.append({
                    'value': og_text,
                    'confidence': 0.85,
                    'source': 'og:title',
                    'provenance': [{'url': url, 'path': 'meta[property="og:title"]'}]
                })
        
        # Method 3: Meta property og:site_name
        og_site_name = soup.find('meta', property='og:site_name')
        if og_site_name and og_site_name.get('content'):
            site_name = og_site_name.get('content').strip()
            if is_valid_brand_name(site_name):
                candidates.append({
                    'value': site_name,
                    'confidence': 0.88,
                    'source': 'og:site_name',
                    'provenance': [{'url': url, 'path': 'meta[property="og:site_name"]'}]
                })
        
        # Method 4: H1 tag (but filter out common non-brand content)
        h1_tags = soup.find_all('h1')
        for h1 in h1_tags:
            if h1.text.strip():
                h1_text = h1.text.strip()
                if is_valid_brand_name(h1_text):
                    candidates.append({
                        'value': h1_text,
                        'confidence': 0.75,
                        'source': 'h1',
                        'provenance': [{'url': url, 'path': 'h1'}]
                    })
                    break  # Only take the first valid H1
        
        # Method 5: Logo alt text
        logo_images = soup.find_all('img', alt=True)
        for logo in logo_images:
            alt_text = logo.get('alt', '').strip()
            if is_valid_brand_name(alt_text):
                candidates.append({
                    'value': alt_text,
                    'confidence': 0.7,
                    'source': 'logo_alt',
                    'provenance': [{'url': url, 'path': f'img[alt="{alt_text}"]'}]
                })
                break  # Only take the first valid logo alt text
        
        # Method 6: Domain-based fallback (last resort)
        if not candidates:
            domain = urlparse(url).hostname
            if domain and domain != 'localhost':
                # Clean domain name
                clean_domain = domain.replace('www.', '').replace('.com', '').replace('.org', '').replace('.net', '')
                clean_domain = clean_domain.replace('-', ' ').replace('_', ' ').title()
                if is_valid_brand_name(clean_domain):
                    candidates.append({
                        'value': clean_domain,
                        'confidence': 0.3,
                        'source': 'domain',
                        'provenance': [{'url': url, 'path': 'domain'}]
                    })
        
        # Select best candidate
        if candidates:
            best = max(candidates, key=lambda x: x['confidence'])
            return {
                'value': best['value'],
                'confidence': best['confidence'],
                'provenance': best['provenance'],
                'notes': f"Extracted from {best['source']}",
                'candidates': candidates
            }
        
        return {
            'value': None,
            'confidence': 0.0,
            'provenance': [],
            'notes': 'not found',
            'candidates': candidates
        }
    
    def _extract_email(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract email addresses with strict validation."""
        candidates = []
        
        # Method 1: Direct email links
        email_links = soup.find_all('a', href=re.compile(r'^mailto:'))
        for link in email_links:
            email = link.get('href').replace('mailto:', '').strip()
            is_valid, confidence = self.validator.validate_email(email)
            if is_valid:
                candidates.append({
                    'value': email,
                    'confidence': confidence,
                    'source': 'mailto_link',
                    'provenance': [{'url': url, 'path': f'a[href="mailto:{email}"]'}]
                })
        
        # Method 2: Text content email pattern
        text_content = soup.get_text()
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text_content)
        
        for email in emails:
            is_valid, confidence = self.validator.validate_email(email)
            if is_valid and email not in [c['value'] for c in candidates]:
                candidates.append({
                    'value': email,
                    'confidence': confidence * 0.8,  # Slightly lower for text extraction
                    'source': 'text_content',
                    'provenance': [{'url': url, 'path': 'text_content'}]
                })
        
        # Method 3: Contact forms and specific sections
        contact_sections = soup.find_all(['div', 'section'], class_=re.compile(r'contact|email|reach', re.I))
        for section in contact_sections:
            section_text = section.get_text()
            emails = re.findall(email_pattern, section_text)
            for email in emails:
                is_valid, confidence = self.validator.validate_email(email)
                if is_valid and email not in [c['value'] for c in candidates]:
                    candidates.append({
                        'value': email,
                        'confidence': confidence * 0.9,  # Higher confidence in contact sections
                        'source': 'contact_section',
                        'provenance': [{'url': url, 'path': 'contact_section'}]
                    })
        
        # Select best candidate
        if candidates:
            best = max(candidates, key=lambda x: x['confidence'])
            return {
                'value': best['value'],
                'confidence': best['confidence'],
                'provenance': best['provenance'],
                'notes': f"Extracted from {best['source']}",
                'candidates': candidates
            }
        
        return {
            'value': None,
            'confidence': 0.0,
            'provenance': [],
            'notes': 'not found',
            'candidates': candidates
        }
    
    def _extract_phone(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract phone numbers with strict validation."""
        candidates = []
        
        # Method 1: Direct phone links
        phone_links = soup.find_all('a', href=re.compile(r'^tel:'))
        for link in phone_links:
            phone = link.get('href').replace('tel:', '').strip()
            is_valid, confidence = self.validator.validate_phone(phone)
            if is_valid:
                candidates.append({
                    'value': phone,
                    'confidence': confidence,
                    'source': 'tel_link',
                    'provenance': [{'url': url, 'path': f'a[href="tel:{phone}"]'}]
                })
        
        # Method 2: Text content phone patterns
        text_content = soup.get_text()
        phone_patterns = [
            r'\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}',  # US format
            r'\+?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}',  # International
        ]
        
        for pattern in phone_patterns:
            phones = re.findall(pattern, text_content)
            for phone in phones:
                is_valid, confidence = self.validator.validate_phone(phone)
                if is_valid and phone not in [c['value'] for c in candidates]:
                    candidates.append({
                        'value': phone,
                        'confidence': confidence * 0.8,
                        'source': 'text_content',
                        'provenance': [{'url': url, 'path': 'text_content'}]
                    })
        
        # Method 3: Contact sections
        contact_sections = soup.find_all(['div', 'section'], class_=re.compile(r'contact|phone|call', re.I))
        for section in contact_sections:
            section_text = section.get_text()
            for pattern in phone_patterns:
                phones = re.findall(pattern, section_text)
                for phone in phones:
                    is_valid, confidence = self.validator.validate_phone(phone)
                    if is_valid and phone not in [c['value'] for c in candidates]:
                        candidates.append({
                            'value': phone,
                            'confidence': confidence * 0.9,
                            'source': 'contact_section',
                            'provenance': [{'url': url, 'path': 'contact_section'}]
                        })
        
        # Select best candidate
        if candidates:
            best = max(candidates, key=lambda x: x['confidence'])
            return {
                'value': best['value'],
                'confidence': best['confidence'],
                'provenance': best['provenance'],
                'notes': f"Extracted from {best['source']}",
                'candidates': candidates
            }
        
        return {
            'value': None,
            'confidence': 0.0,
            'provenance': [],
            'notes': 'not found',
            'candidates': candidates
        }
    
    def _extract_location(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract location information."""
        candidates = []
        
        # Method 1: Address elements
        address_elements = soup.find_all(['address', 'div'], class_=re.compile(r'address|location|contact', re.I))
        for element in address_elements:
            text = element.get_text().strip()
            if text and len(text) > 5:  # Reasonable address length
                candidates.append({
                    'value': text,
                    'confidence': 0.8,
                    'source': 'address_element',
                    'provenance': [{'url': url, 'path': 'address'}]
                })
        
        # Method 2: Structured data (JSON-LD)
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and 'address' in data:
                    address = data['address']
                    if isinstance(address, dict) and 'addressLocality' in address:
                        location = f"{address.get('addressLocality', '')}, {address.get('addressRegion', '')}"
                        candidates.append({
                            'value': location.strip(', '),
                            'confidence': 0.9,
                            'source': 'structured_data',
                            'provenance': [{'url': url, 'path': 'script[type="application/ld+json"]'}]
                        })
            except:
                continue
        
        # Method 3: Meta tags
        meta_location = soup.find('meta', {'name': 'geo.region'})
        if meta_location:
            candidates.append({
                'value': meta_location.get('content', '').strip(),
                'confidence': 0.7,
                'source': 'meta_geo',
                'provenance': [{'url': url, 'path': 'meta[name="geo.region"]'}]
            })
        
        # Select best candidate
        if candidates:
            best = max(candidates, key=lambda x: x['confidence'])
            return {
                'value': best['value'],
                'confidence': best['confidence'],
                'provenance': best['provenance'],
                'notes': f"Extracted from {best['source']}",
                'candidates': candidates
            }
        
        return {
            'value': None,
            'confidence': 0.0,
            'provenance': [],
            'notes': 'not found',
            'candidates': candidates
        }
    
    def _extract_socials(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract social media links."""
        candidates = []
        social_patterns = {
            'facebook': r'facebook\.com/[^/\s]+',
            'twitter': r'twitter\.com/[^/\s]+',
            'instagram': r'instagram\.com/[^/\s]+',
            'linkedin': r'linkedin\.com/[^/\s]+',
            'youtube': r'youtube\.com/[^/\s]+',
        }
        
        # Method 1: Direct links
        links = soup.find_all('a', href=True)
        for link in links:
            href = link.get('href', '')
            for platform, pattern in social_patterns.items():
                if re.search(pattern, href, re.I):
                    is_valid, confidence = self.validator.validate_url(href)
                    if is_valid:
                        candidates.append({
                            'value': href,
                            'confidence': confidence,
                            'source': f'{platform}_link',
                            'provenance': [{'url': url, 'path': f'a[href="{href}"]'}]
                        })
        
        # Method 2: Text content
        text_content = soup.get_text()
        for platform, pattern in social_patterns.items():
            matches = re.findall(pattern, text_content, re.I)
            for match in matches:
                full_url = f"https://{match}"
                is_valid, confidence = self.validator.validate_url(full_url)
                if is_valid and full_url not in [c['value'] for c in candidates]:
                    candidates.append({
                        'value': full_url,
                        'confidence': confidence * 0.7,
                        'source': f'{platform}_text',
                        'provenance': [{'url': url, 'path': 'text_content'}]
                    })
        
        # Select best candidates (can have multiple social links)
        if candidates:
            # Group by platform and take best from each
            platforms = {}
            for candidate in candidates:
                platform = candidate['source'].split('_')[0]
                if platform not in platforms or candidate['confidence'] > platforms[platform]['confidence']:
                    platforms[platform] = candidate
            
            return {
                'value': list(platforms.values()),
                'confidence': max(c['confidence'] for c in platforms.values()),
                'provenance': [p['provenance'][0] for p in platforms.values()],
                'notes': f"Found {len(platforms)} social platforms",
                'candidates': candidates
            }
        
        return {
            'value': None,
            'confidence': 0.0,
            'provenance': [],
            'notes': 'not found',
            'candidates': candidates
        }
    
    def _extract_services(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract services offered with comprehensive business-agnostic detection."""
        candidates = []
        
        def clean_service_text(text: str) -> str:
            """Clean and normalize service text."""
            if not text:
                return ""
            
            # Remove extra whitespace and normalize
            text = re.sub(r'\s+', ' ', text.strip())
            
            # Remove common non-service words
            text = re.sub(r'\b(home|about|contact|blog|news|gallery|portfolio|testimonials|faq|privacy|terms|login|register|search|menu|navigation)\b', '', text, flags=re.I)
            
            return text.strip()
        
        def is_likely_service(text: str) -> bool:
            """Check if text is likely a service."""
            if not text or len(text.strip()) < 3:
                return False
            
            text_lower = text.lower()
            
            # Skip very common non-service words
            skip_words = [
                'home', 'about', 'contact', 'blog', 'news', 'gallery', 'portfolio', 
                'testimonials', 'faq', 'privacy', 'terms', 'login', 'register', 
                'search', 'menu', 'navigation', 'more', 'read more', 'learn more',
                'click here', 'view all', 'see all', 'get started', 'sign up',
                'download', 'app', 'however', 'make sure', 'easy', 'want to',
                'order', 'mobile', 'online', 'website', 'visit', 'find',
                'location', 'hours', 'directions', 'phone', 'email', 'address'
            ]
            
            if any(word in text_lower for word in skip_words):
                return False
            
            # Skip sentences that are too generic or promotional
            generic_phrases = [
                'however you want', 'make sure it', 'download the', 'visit our',
                'check out', 'learn more about', 'find out', 'get in touch',
                'contact us', 'call us', 'email us', 'visit us', 'follow us'
            ]
            
            if any(phrase in text_lower for phrase in generic_phrases):
                return False
            
            # Must contain letters
            if not re.search(r'[a-zA-Z]', text):
                return False
            
            # Reasonable length
            if len(text) > 100:
                return False
            
            # Must be a noun phrase or service name (not a sentence)
            if text.count(' ') > 8:  # Too many words for a service name
                return False
            
            return True
        
        # Method 1: Services sections with comprehensive detection
        service_patterns = [
            r'service', r'offer', r'what', r'solution', r'product', r'expertise',
            r'specializ', r'capabilit', r'provid', r'deliver', r'include',
            r'feature', r'benefit', r'advantage', r'option', r'choice'
        ]
        
        for pattern in service_patterns:
            service_sections = soup.find_all(['div', 'section'], class_=re.compile(pattern, re.I))
            for section in service_sections:
                # Look for lists
                lists = section.find_all(['ul', 'ol'])
                for list_elem in lists:
                    items = list_elem.find_all('li')
                    services = []
                    for item in items:
                        service_text = clean_service_text(item.get_text())
                        if is_likely_service(service_text):
                            services.append(service_text)
                    
                    if services:
                        candidates.append({
                            'value': ', '.join(services),
                            'confidence': 0.85,
                            'source': 'services_section',
                            'provenance': [{'url': url, 'path': 'services_section'}]
                        })
                
                # Look for headings in service sections
                headings = section.find_all(['h2', 'h3', 'h4', 'h5'])
                services = []
                for heading in headings:
                    service_text = clean_service_text(heading.get_text())
                    if is_likely_service(service_text):
                        services.append(service_text)
                
                if services:
                    candidates.append({
                        'value': ', '.join(services),
                        'confidence': 0.8,
                        'source': 'services_headings',
                        'provenance': [{'url': url, 'path': 'services_headings'}]
                    })
        
        # Method 2: Navigation menu with comprehensive filtering
        nav_items = soup.find_all(['nav', 'ul', 'div'], class_=re.compile(r'nav|menu|header|main', re.I))
        for nav in nav_items:
            links = nav.find_all('a')
            services = []
            for link in links:
                text = clean_service_text(link.get_text())
                if is_likely_service(text):
                    services.append(text)
            
            if services:
                candidates.append({
                    'value': ', '.join(services),
                    'confidence': 0.7,
                    'source': 'navigation',
                    'provenance': [{'url': url, 'path': 'navigation'}]
                })
        
        # Method 3: Meta keywords and description
        meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
        if meta_keywords and meta_keywords.get('content'):
            keywords = meta_keywords.get('content').split(',')
            services = []
            for keyword in keywords:
                service_text = clean_service_text(keyword)
                if is_likely_service(service_text):
                    services.append(service_text)
            
            if services:
                candidates.append({
                    'value': ', '.join(services),
                    'confidence': 0.6,
                    'source': 'meta_keywords',
                    'provenance': [{'url': url, 'path': 'meta[name="keywords"]'}]
                })
        
        # Method 4: Meta description analysis
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            desc_text = meta_desc.get('content')
            # Look for service indicators in description
            service_indicators = [
                r'we offer\s+([^.!?]+)',
                r'our services?\s+include\s+([^.!?]+)',
                r'we provide\s+([^.!?]+)',
                r'specializing in\s+([^.!?]+)',
                r'expertise in\s+([^.!?]+)',
                r'we do\s+([^.!?]+)',
                r'services?\s*:?\s*([^.!?]+)'
            ]
            
            for pattern in service_indicators:
                matches = re.findall(pattern, desc_text, re.I)
                if matches:
                    services = []
                    for match in matches:
                        service_text = clean_service_text(match)
                        if is_likely_service(service_text):
                            services.append(service_text)
                    
                    if services:
                        candidates.append({
                            'value': ', '.join(services),
                            'confidence': 0.75,
                            'source': 'meta_description',
                            'provenance': [{'url': url, 'path': 'meta[name="description"]'}]
                        })
                        break
        
        # Method 5: Structured data (JSON-LD) - comprehensive
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    services = []
                    
                    # Check for various structured data fields
                    service_fields = ['serviceType', 'offers', 'hasOfferCatalog', 'itemListElement']
                    
                    for field in service_fields:
                        if field in data:
                            if field == 'offers' and isinstance(data[field], list):
                                for offer in data[field]:
                                    if isinstance(offer, dict):
                                        if 'name' in offer:
                                            services.append(offer['name'])
                                        elif 'itemOffered' in offer and isinstance(offer['itemOffered'], dict):
                                            if 'name' in offer['itemOffered']:
                                                services.append(offer['itemOffered']['name'])
                            elif field == 'itemListElement' and isinstance(data[field], list):
                                for item in data[field]:
                                    if isinstance(item, dict) and 'name' in item:
                                        services.append(item['name'])
                            elif isinstance(data[field], str):
                                services.append(data[field])
                    
                    if services:
                        candidates.append({
                            'value': ', '.join(services),
                            'confidence': 0.9,
                            'source': 'structured_data',
                            'provenance': [{'url': url, 'path': 'script[type="application/ld+json"]'}]
                        })
            except:
                continue
        
        # Method 6: Page content analysis - comprehensive
        if not candidates:
            text_content = soup.get_text()
            
            # Look for service-related phrases
            service_indicators = [
                r'we offer\s+([^.!?]{10,200})',
                r'our services?\s+include\s+([^.!?]{10,200})',
                r'we provide\s+([^.!?]{10,200})',
                r'specializing in\s+([^.!?]{10,200})',
                r'expertise in\s+([^.!?]{10,200})',
                r'we do\s+([^.!?]{10,200})',
                r'services?\s*:?\s*([^.!?]{10,200})',
                r'what we do\s*:?\s*([^.!?]{10,200})',
                r'our work\s+include\s+([^.!?]{10,200})',
                r'we handle\s+([^.!?]{10,200})',
                r'we specialize\s+([^.!?]{10,200})',
                r'our expertise\s+([^.!?]{10,200})'
            ]
            
            for pattern in service_indicators:
                matches = re.findall(pattern, text_content, re.I)
                if matches:
                    services = []
                    for match in matches:
                        # Split by common separators
                        parts = re.split(r'[,;]|\sand\s', match)
                        for part in parts:
                            service_text = clean_service_text(part)
                            if is_likely_service(service_text):
                                services.append(service_text)
                    
                    if services:
                        candidates.append({
                            'value': ', '.join(services[:5]),  # Limit to first 5
                            'confidence': 0.6,
                            'source': 'content_analysis',
                            'provenance': [{'url': url, 'path': 'content_analysis'}]
                        })
                        break
        
        # Method 6.5: Extract specific service descriptions from content
        if not candidates:
            text_content = soup.get_text()
            services = []
            
            # Look for specific service descriptions
            service_patterns = [
                r'(pressure washing|pressure wash)',
                r'(soft washing|soft wash)',
                r'(house washing|house wash)',
                r'(driveway cleaning|driveway wash)',
                r'(deck cleaning|deck wash)',
                r'(patio cleaning|patio wash)',
                r'(roof cleaning|roof wash)',
                r'(gutter cleaning|gutter cleaning)',
                r'(window cleaning|window wash)',
                r'(concrete cleaning|concrete wash)',
                r'(home restoration|home restoration)',
                r'(exterior cleaning|exterior wash)',
                r'(commercial cleaning|commercial wash)',
                r'(residential cleaning|residential wash)',
                r'(mold removal|mold cleaning)',
                r'(stain removal|stain cleaning)',
                r'(dirt removal|dirt cleaning)',
                r'(power washing|power wash)',
                r'(steam cleaning|steam wash)',
                r'(detailing|detailing)',
                r'(maintenance|maintenance)',
                r'(restoration|restoration)',
                r'(renovation|renovation)',
                r'(repair|repair)',
                r'(installation|installation)',
                r'(consultation|consultation)',
                r'(inspection|inspection)',
                r'(estimate|estimate)',
                r'(design|design)',
                r'(planning|planning)'
            ]
            
            for pattern in service_patterns:
                matches = re.findall(pattern, text_content, re.I)
                for match in matches:
                    if isinstance(match, tuple):
                        match = match[0]  # Get the first group
                    service_text = clean_service_text(match)
                    if is_likely_service(service_text) and service_text not in services:
                        services.append(service_text)
            
            if services:
                candidates.append({
                    'value': ', '.join(services[:8]),  # Limit to first 8
                    'confidence': 0.7,
                    'source': 'service_descriptions',
                    'provenance': [{'url': url, 'path': 'service_descriptions'}]
                })
        
        # Method 7: Look for bullet points and lists throughout the page
        if not candidates:
            all_lists = soup.find_all(['ul', 'ol'])
            for list_elem in all_lists:
                items = list_elem.find_all('li')
                if len(items) >= 3:  # Only consider lists with 3+ items
                    services = []
                    for item in items:
                        service_text = clean_service_text(item.get_text())
                        if is_likely_service(service_text):
                            services.append(service_text)
                    
                    if len(services) >= 2:  # At least 2 valid services
                        candidates.append({
                            'value': ', '.join(services),
                            'confidence': 0.5,
                            'source': 'page_lists',
                            'provenance': [{'url': url, 'path': 'page_lists'}]
                        })
                        break
        
        # Method 8: Look for headings that might indicate services
        if not candidates:
            headings = soup.find_all(['h2', 'h3', 'h4'])
            services = []
            for heading in headings:
                text = clean_service_text(heading.get_text())
                if is_likely_service(text):
                    services.append(text)
            
            if services:
                candidates.append({
                    'value': ', '.join(services[:5]),  # Limit to first 5
                    'confidence': 0.4,
                    'source': 'headings',
                    'provenance': [{'url': url, 'path': 'headings'}]
                })
        
        # Select best candidate
        if candidates:
            best = max(candidates, key=lambda x: x['confidence'])
            return {
                'value': best['value'],
                'confidence': best['confidence'],
                'provenance': best['provenance'],
                'notes': f"Extracted from {best['source']}",
                'candidates': candidates
            }
        
        return {
            'value': None,
            'confidence': 0.0,
            'provenance': [],
            'notes': 'not found',
            'candidates': candidates
        }
    
    def _extract_colors(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract brand colors from CSS with proper formatting."""
        candidates = []
        found_colors = set()
        
        # Method 1: Inline styles
        elements_with_style = soup.find_all(attrs={'style': True})
        for element in elements_with_style:
            style = element.get('style', '')
            # Extract hex colors
            hex_colors = re.findall(r'#[0-9A-Fa-f]{6}', style)
            for color in hex_colors:
                color_upper = color.upper()
                is_valid, confidence = self.validator.validate_color(color_upper)
                if is_valid and color_upper not in found_colors:
                    found_colors.add(color_upper)
                    candidates.append({
                        'value': color_upper,
                        'confidence': confidence,
                        'source': 'inline_style',
                        'provenance': [{'url': url, 'path': 'inline_style'}]
                    })
            
            # Extract RGB colors
            rgb_colors = re.findall(r'rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)', style, re.I)
            for color in rgb_colors:
                is_valid, confidence = self.validator.validate_color(color)
                if is_valid and color not in found_colors:
                    found_colors.add(color)
                    candidates.append({
                        'value': color,
                        'confidence': confidence,
                        'source': 'inline_style_rgb',
                        'provenance': [{'url': url, 'path': 'inline_style'}]
                    })
        
        # Method 2: CSS classes with color indicators
        color_classes = soup.find_all(class_=re.compile(r'primary|secondary|accent|brand|color|theme', re.I))
        for element in color_classes:
            classes = element.get('class', [])
            for class_name in classes:
                if any(keyword in class_name.lower() for keyword in ['primary', 'brand', 'main', 'accent']):
                    # Try to extract color from computed styles (simplified)
                    candidates.append({
                        'value': '#3B82F6',  # Default blue
                        'confidence': 0.3,
                        'source': 'css_class',
                        'provenance': [{'url': url, 'path': f'.{class_name}'}]
                    })
        
        # Method 3: Meta theme-color
        theme_color = soup.find('meta', attrs={'name': 'theme-color'})
        if theme_color and theme_color.get('content'):
            color = theme_color.get('content').strip()
            is_valid, confidence = self.validator.validate_color(color)
            if is_valid and color not in found_colors:
                found_colors.add(color)
                candidates.append({
                    'value': color,
                    'confidence': confidence * 0.9,  # High confidence for meta theme-color
                    'source': 'meta_theme_color',
                    'provenance': [{'url': url, 'path': 'meta[name="theme-color"]'}]
                })
        
        # Method 4: Common brand colors (fallback with proper formatting)
        if not candidates:
            default_colors = ['#3B82F6', '#1E40AF']
            for color in default_colors:
                candidates.append({
                    'value': color,
                    'confidence': 0.2,
                    'source': 'default',
                    'provenance': [{'url': url, 'path': 'default'}]
                })
        
        # Select best candidates (can have multiple colors)
        if candidates:
            colors = []
            for candidate in candidates:
                if isinstance(candidate['value'], list):
                    colors.extend(candidate['value'])
                else:
                    colors.append(candidate['value'])
            
            # Remove duplicates and ensure proper formatting
            unique_colors = []
            seen = set()
            for color in colors:
                if color not in seen:
                    seen.add(color)
                    unique_colors.append(color)
            
            return {
                'value': unique_colors,  # Properly formatted list
                'confidence': max(c['confidence'] for c in candidates),
                'provenance': [c['provenance'][0] for c in candidates],
                'notes': f"Extracted {len(unique_colors)} colors",
                'candidates': candidates
            }
        
        return {
            'value': None,
            'confidence': 0.0,
            'provenance': [],
            'notes': 'not found',
            'candidates': candidates
        }
    
    def _extract_logo(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract logo images with comprehensive detection."""
        candidates = []
        
        def is_likely_logo(img_tag) -> bool:
            """Check if an image is likely a logo."""
            if not img_tag:
                return False
            
            # Check src attribute
            src = img_tag.get('src', '')
            if not src:
                return False
            
            # Skip data URLs and very small images
            if src.startswith('data:') or '1x1' in src or 'pixel' in src:
                return False
            
            # Check alt text for logo indicators
            alt_text = img_tag.get('alt', '').lower()
            logo_indicators = ['logo', 'brand', 'company', 'header', 'nav']
            if any(indicator in alt_text for indicator in logo_indicators):
                return True
            
            # Check class names for logo indicators
            class_names = ' '.join(img_tag.get('class', [])).lower()
            logo_classes = ['logo', 'brand', 'header', 'nav', 'site-logo', 'company-logo']
            if any(cls in class_names for cls in logo_classes):
                return True
            
            # Check id for logo indicators
            img_id = img_tag.get('id', '').lower()
            if any(indicator in img_id for indicator in logo_indicators):
                return True
            
            # Check if image is in header or navigation area
            parent = img_tag.parent
            while parent:
                parent_classes = ' '.join(parent.get('class', [])).lower()
                parent_tag = parent.name.lower()
                if any(cls in parent_classes for cls in ['header', 'nav', 'navbar', 'brand', 'logo']):
                    return True
                if parent_tag in ['header', 'nav']:
                    return True
                parent = parent.parent
                if parent == soup:  # Reached the root
                    break
            
            return False
        
        # Method 1: Look for images with logo indicators
        all_images = soup.find_all('img')
        for img in all_images:
            if is_likely_logo(img):
                src = img.get('src', '')
                if src:
                    logo_url = urljoin(url, src)
                    is_valid, confidence = self.validator.validate_url(logo_url)
                    if is_valid:
                        candidates.append({
                            'value': logo_url,
                            'confidence': confidence,
                            'source': 'logo_indicators',
                            'provenance': [{'url': url, 'path': f'img[src="{src}"]'}]
                        })
        
        # Method 2: Look for images in header/navigation areas
        header_images = soup.find_all(['header', 'nav'])
        for container in header_images:
            images = container.find_all('img')
            for img in images:
                src = img.get('src', '')
                if src and not any(skip in src.lower() for skip in ['icon', 'favicon', 'sprite', '1x1', 'pixel']):
                    logo_url = urljoin(url, src)
                    is_valid, confidence = self.validator.validate_url(logo_url)
                    if is_valid and not any(c['value'] == logo_url for c in candidates):
                        candidates.append({
                            'value': logo_url,
                            'confidence': confidence * 0.8,
                            'source': 'header_nav',
                            'provenance': [{'url': url, 'path': f'{container.name} img[src="{src}"]'}]
                        })
        
        # Method 3: Look for first few images on the page (often logos are early)
        if not candidates:
            first_images = all_images[:5]  # Check first 5 images
            for img in first_images:
                src = img.get('src', '')
                if src and not src.startswith('data:') and not any(skip in src.lower() for skip in ['icon', 'favicon', 'sprite', '1x1', 'pixel']):
                    logo_url = urljoin(url, src)
                    is_valid, confidence = self.validator.validate_url(logo_url)
                    if is_valid:
                        candidates.append({
                            'value': logo_url,
                            'confidence': confidence * 0.6,
                            'source': 'early_images',
                            'provenance': [{'url': url, 'path': f'img[src="{src}"]'}]
                        })
        
        # Method 4: Look for images with specific dimensions (logos are often square-ish)
        if not candidates:
            for img in all_images:
                src = img.get('src', '')
                width = img.get('width', '')
                height = img.get('height', '')
                
                # Skip if no src or data URL
                if not src or src.startswith('data:') or any(skip in src.lower() for skip in ['icon', 'favicon', 'sprite', '1x1', 'pixel']):
                    continue
                
                # Check for reasonable logo dimensions
                try:
                    w = int(width) if width else 0
                    h = int(height) if height else 0
                    if w > 0 and h > 0:
                        # Logo-like aspect ratio (roughly square to 3:1)
                        ratio = max(w, h) / min(w, h)
                        if 1 <= ratio <= 3 and w >= 50 and h >= 50:
                            logo_url = urljoin(url, src)
                            is_valid, confidence = self.validator.validate_url(logo_url)
                            if is_valid:
                                candidates.append({
                                    'value': logo_url,
                                    'confidence': confidence * 0.5,
                                    'source': 'logo_dimensions',
                                    'provenance': [{'url': url, 'path': f'img[src="{src}"]'}]
                                })
                except ValueError:
                    continue
        
        # Method 5: Look for images in common logo locations
        if not candidates:
            logo_selectors = [
                '.logo img', '.brand img', '.header img', '.navbar img',
                '#logo img', '#brand img', '#header img', '#navbar img',
                'header img', 'nav img', '.site-logo img', '.company-logo img'
            ]
            
            for selector in logo_selectors:
                try:
                    logo_imgs = soup.select(selector)
                    for img in logo_imgs:
                        src = img.get('src', '')
                        if src and not src.startswith('data:') and not any(skip in src.lower() for skip in ['icon', 'favicon', 'sprite', '1x1', 'pixel']):
                            logo_url = urljoin(url, src)
                            is_valid, confidence = self.validator.validate_url(logo_url)
                            if is_valid and not any(c['value'] == logo_url for c in candidates):
                                candidates.append({
                                    'value': logo_url,
                                    'confidence': confidence * 0.7,
                                    'source': 'logo_selectors',
                                    'provenance': [{'url': url, 'path': selector}]
                                })
                except:
                    continue
        
        # Select best candidate
        if candidates:
            best = max(candidates, key=lambda x: x['confidence'])
            return {
                'value': best['value'],
                'confidence': best['confidence'],
                'provenance': best['provenance'],
                'notes': f"Extracted from {best['source']}",
                'candidates': candidates
            }
        
        return {
            'value': None,
            'confidence': 0.0,
            'provenance': [],
            'notes': 'not found',
            'candidates': candidates
        }
    
    def _extract_images(self, soup: BeautifulSoup, url: str, start_id: int = 0) -> List[Dict[str, Any]]:
        """Extract images from a page with metadata."""
        images = []
        
        def clean_text(text: str) -> str:
            """Clean and normalize text content."""
            if not text:
                return ""
            return re.sub(r'\s+', ' ', text.strip())
        
        def categorize_image(img_tag, alt_text: str, title: str) -> str:
            """Categorize image based on context and attributes."""
            alt_lower = alt_text.lower()
            title_lower = title.lower()
            src = img_tag.get('src', '').lower()
            
            # Logo detection - more comprehensive
            logo_keywords = ['logo', 'brand', 'company', 'firm', 'corp', 'inc', 'llc', 'ltd']
            logo_contexts = ['header', 'nav', 'navbar', 'branding', 'identity']
            
            # Check alt text and title
            if any(word in alt_lower for word in logo_keywords):
                return 'logo'
            elif any(word in title_lower for word in logo_keywords):
                return 'logo'
            
            # Check if image is in header/navigation context
            parent = img_tag.parent
            for _ in range(3):  # Check up to 3 levels up
                if parent:
                    parent_class = parent.get('class', [])
                    parent_id = parent.get('id', '')
                    if isinstance(parent_class, list):
                        parent_class = ' '.join(parent_class).lower()
                    else:
                        parent_class = str(parent_class).lower()
                    
                    if any(context in parent_class or context in parent_id for context in logo_contexts):
                        return 'logo'
                    
                    parent = parent.parent
                else:
                    break
            
            # Check filename patterns
            if any(pattern in src for pattern in ['logo', 'brand', 'header']):
                return 'logo'
            
            # Google Sites specific logo detection
            # Often the first image on a page is the logo
            if 'googleusercontent.com' in src and not alt_text and not title:
                # Check if this is likely the first/main image
                all_images = soup.find_all('img')
                if img_tag == all_images[0]:  # First image
                    return 'logo'
                
                # Check if image appears in typical logo locations
                parent = img_tag.parent
                for _ in range(2):  # Check up to 2 levels up
                    if parent:
                        parent_tag = parent.name.lower() if parent.name else ''
                        if parent_tag in ['header', 'nav', 'div']:
                            # Check if it's in a header-like structure
                            parent_text = parent.get_text().lower()
                            if any(word in parent_text for word in ['home', 'about', 'services', 'contact']):
                                return 'logo'
                        parent = parent.parent
                    else:
                        break
            
            # Hero/banner images
            elif any(word in alt_lower for word in ['hero', 'banner', 'header', 'main']):
                return 'hero'
            elif any(word in title_lower for word in ['hero', 'banner', 'header', 'main']):
                return 'hero'
            
            # Product/service images
            elif any(word in alt_lower for word in ['service', 'product', 'work', 'portfolio', 'gallery']):
                return 'service'
            elif any(word in title_lower for word in ['service', 'product', 'work', 'portfolio', 'gallery']):
                return 'service'
            
            # Team/staff images
            elif any(word in alt_lower for word in ['team', 'staff', 'employee', 'person', 'people']):
                return 'team'
            elif any(word in title_lower for word in ['team', 'staff', 'employee', 'person', 'people']):
                return 'team'
            
            # Default to content
            else:
                return 'content'
        
        # Extract regular img tags
        img_tags = soup.find_all('img')
        seen_urls = set()  # Track seen URLs to prevent duplicates
        
        for img_tag in img_tags:
            src = img_tag.get('src')
            if not src:
                continue
            
            # Skip data URLs and very small images
            if src.startswith('data:') or any(skip in src.lower() for skip in ['1x1', 'pixel', 'spacer', 'blank']):
                continue
            
            # Convert relative URLs to absolute
            img_url = urljoin(url, src)
            
            # Skip if we've already seen this URL
            if img_url in seen_urls:
                continue
            seen_urls.add(img_url)
            
            # Extract metadata
            alt_text = clean_text(img_tag.get('alt', ''))
            title = clean_text(img_tag.get('title', ''))
            width = img_tag.get('width', '')
            height = img_tag.get('height', '')
            
            # Categorize image
            image_type = categorize_image(img_tag, alt_text, title)
            
            # Convert route to page name
            page_name = self._route_to_page_name(urlparse(url).path or '/')
            
            # Create image entry
            image_data = {
                'id': f"img_{start_id + len(images)}",
                'url': img_url,
                'alt_text': alt_text,
                'title': title,
                'page': page_name,
                'type': image_type,
                'width': width,
                'height': height,
                'uploaded_at': datetime.now().isoformat(),
                'is_uploaded': False,
                'filename': os.path.basename(urlparse(img_url).path) or f"image_{len(images)}.jpg",
                'metadata': {
                    'src_original': src,
                    'page_url': url,
                    'extracted_at': datetime.now().isoformat()
                }
            }
            
            images.append(image_data)
        
        return images

    def _extract_paragraphs(self, soup: BeautifulSoup, url: str, start_id: int = 0) -> List[Dict[str, Any]]:
        """Extract paragraphs with strict filtering and no duplicates."""
        paragraphs = []
        
        def clean_text(text: str) -> str:
            """Clean and normalize text content."""
            if not text:
                return ""
            
            # Remove extra whitespace and normalize
            text = re.sub(r'\s+', ' ', text.strip())
            
            # Split concatenated content
            text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
            text = re.sub(r'\.([A-Z])', r'. \1', text)
            text = re.sub(r'([?!])([A-Z])', r'\1 \2', text)
            
            return text.strip()
        
        def is_navigation_or_boilerplate(text: str) -> bool:
            """Check if text is navigation, boilerplate, or unwanted content."""
            if not text or len(text.strip()) < 20:
                return True
            
            text_lower = text.lower()
            
            # Navigation patterns
            nav_patterns = [
                'services • our work • contact us',
                'call us at',
                'search this site',
                'skip to main content',
                'skip to navigation',
                'embedded files',
                'google sites report abuse',
                'page details page updated',
                'home services our work contact us',
                'more home services',
                'services our work contact us'
            ]
            
            for pattern in nav_patterns:
                if pattern in text_lower:
                    return True
            
            # Check for repetitive navigation content
            words = text.split()
            if len(words) <= 6:
                nav_words = ['home', 'services', 'contact', 'about', 'call', 'us', 'more', 'our', 'work']
                nav_count = sum(1 for word in words if word.lower() in nav_words)
                if nav_count >= len(words) * 0.6:  # 60% navigation words
                    return True
            
            # Check for contact-only content
            if re.match(r'^[\d\s\-\(\)\+@\.:]+$', text.strip()):
                return True
            
            # Check for very repetitive content
            if text.count('•') > 5:  # Too many bullet points
                return True
            
            return False
        
        def is_meaningful_content(text: str) -> bool:
            """Check if text contains meaningful business content."""
            if not text or len(text.strip()) < 30:
                return False
            
            if is_navigation_or_boilerplate(text):
                return False
            
            text_lower = text.lower()
            
            # Must contain meaningful business keywords
            meaningful_keywords = [
                'about', 'company', 'service', 'business', 'team', 'experience', 'quality',
                'professional', 'expert', 'solution', 'help', 'support', 'contact',
                'mission', 'vision', 'value', 'client', 'customer', 'pressure', 'wash',
                'cleaning', 'maintenance', 'exterior', 'home', 'family', 'owned',
                'passionate', 'restoring', 'louisiana', 'shine', 'mold', 'dirt', 'stains',
                'property', 'value', 'estimate', 'welcome', 'provide', 'specialize',
                'transform', 'today', 'free', 'best', 'looking', 'keep', 'important',
                'build', 'result', 'bring', 'down', 'discoloring', 'fading', 'time',
                'over', 'which', 'turn', 'driveway', 'sidewalk', 'window', 'trash',
                'can', 'cleaning', 'surface', 'cleaner', 'oil', 'stain', 'concrete'
            ]
            
            return any(keyword in text_lower for keyword in meaningful_keywords)
        
        def find_associated_title(element) -> str:
            """Find the most relevant title/heading for this element."""
            # First, check if this element itself is a heading
            if element.name and element.name.startswith('h'):
                return element.get_text(strip=True)
            
            # Look for nearby headings in the same container
            parent = element.parent
            if parent:
                # Look for headings in the same parent
                headings = parent.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
                if headings:
                    # Find the heading that comes before this element
                    for heading in headings:
                        if heading.sourceline and element.sourceline:
                            if heading.sourceline < element.sourceline:
                                return heading.get_text(strip=True)
                    # If no heading before, use the first one
                    return headings[0].get_text(strip=True)
                
                # Look in parent's siblings
                for sibling in parent.find_previous_siblings():
                    if sibling.name and sibling.name.startswith('h'):
                        return sibling.get_text(strip=True)
            
            # Look for headings in the broader context
            current = element
            for _ in range(3):  # Look up to 3 levels up
                if current.parent:
                    current = current.parent
                    headings = current.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
                    if headings:
                        # Find the most recent heading
                        for heading in headings:
                            if heading.sourceline and element.sourceline:
                                if heading.sourceline < element.sourceline:
                                    return heading.get_text(strip=True)
                        return headings[0].get_text(strip=True)
            
            return ""
        
        def extract_bullet_lists_with_titles(element) -> List[Dict[str, str]]:
            """Extract bullet points with their associated titles."""
            bullet_data = []
            
            # Find ul/ol elements
            lists = element.find_all(['ul', 'ol'])
            for list_elem in lists:
                # Find the title for this list
                list_title = find_associated_title(list_elem)
                
                items = list_elem.find_all('li')
                if items:
                    # Group all items in this list together
                    list_items = []
                    for item in items:
                        item_text = clean_text(item.get_text())
                        if item_text and len(item_text) > 5:
                            list_items.append(item_text)
                    
                    if list_items:
                        bullet_data.append({
                            'title': list_title,
                            'items': list_items
                        })
            
            return bullet_data
        
        def generate_subtitle_label(text: str) -> str:
            """Generate a subtitle label based on content."""
            text_lower = text.lower()
            
            if any(word in text_lower for word in ['about', 'company', 'story', 'history', 'mission', 'vision', 'who are we']):
                return "About Us"
            elif any(word in text_lower for word in ['service', 'services', 'what we do', 'offer', 'provide', 'specialize', 'expertise', 'pressure washing', 'cleaning', 'driveway', 'sidewalk', 'window', 'trash']):
                return "Services"
            elif any(word in text_lower for word in ['contact', 'phone', 'email', 'address', 'location', 'call us', 'hours', 'operation', 'quote', 'estimate']):
                return "Contact Information"
            elif any(word in text_lower for word in ['team', 'staff', 'employees', 'people', 'professional', 'expert', 'family owned']):
                return "Our Team"
            elif any(word in text_lower for word in ['experience', 'years', 'established', 'since']):
                return "Experience"
            elif any(word in text_lower for word in ['quality', 'professional', 'expert', 'certified']):
                return "Quality & Expertise"
            elif any(word in text_lower for word in ['price', 'cost', 'affordable', 'estimate', 'quote']):
                return "Pricing"
            elif any(word in text_lower for word in ['testimonial', 'review', 'customer', 'client', 'satisfied', 'happy']):
                return "Testimonials"
            elif any(word in text_lower for word in ['process', 'how we work', 'method', 'approach']):
                return "Our Process"
            elif any(word in text_lower for word in ['benefit', 'advantage', 'why choose', 'feature']):
                return "Benefits"
            elif any(word in text_lower for word in ['work', 'project', 'portfolio', 'gallery', 'before', 'after', 'pride']):
                return "Our Work"
            else:
                return "General Information"
        
        # Extract only meaningful elements
        elements = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'])
        
        for element in elements:
            text = element.get_text(strip=True)
            text = clean_text(text)
            
            if not is_meaningful_content(text):
                continue
            
            # Find the associated title for this element
            title = find_associated_title(element)
            
            # Extract bullet points with titles
            bullet_data = extract_bullet_lists_with_titles(element)
            
            # Determine element type and confidence
            tag_name = element.name.lower()
            if tag_name.startswith('h'):
                element_type = 'title'
                confidence = 0.9 if tag_name in ['h1', 'h2'] else 0.8
            else:
                element_type = 'paragraph'
                confidence = 0.7
            
            # Generate subtitle label
            subtitle = generate_subtitle_label(text)
            
            # Convert route to page name
            page_name = self._route_to_page_name(urlparse(url).path or '/')
            
            # Create paragraph entry
            paragraph_data = {
                'id': f"{tag_name}_{start_id + len(paragraphs)}",
                'type': element_type,
                'content': text,
                'title': title,
                'subtitle': subtitle,
                'page': page_name,
                'status': 'keep',
                'confidence': confidence,
                'order': len(paragraphs),
                'dom_selector': self._get_dom_selector(element),
                'text_hash': str(hash(text)),
                'entity_links': [],
                'labels': [],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            # Add bullet points with titles if found
            if bullet_data:
                paragraph_data['bullet_points'] = bullet_data
                # Enhance content with bullet points
                bullet_text = ""
                for bullet_group in bullet_data:
                    if bullet_group['title']:
                        bullet_text += f"\n\n{bullet_group['title']}:\n"
                    bullet_text += " • " + " • ".join(bullet_group['items'])
                paragraph_data['content'] = text + bullet_text
            
            paragraphs.append(paragraph_data)
        
        # Strict deduplication - remove any content that's too similar
        unique_paragraphs = []
        seen_content = set()
        
        for para in paragraphs:
            # Create normalized content for comparison
            normalized_content = re.sub(r'\s+', ' ', para['content'].lower().strip())
            
            # Skip if exact duplicate
            if normalized_content in seen_content:
                continue
            
            # Skip if very similar to existing content
            is_duplicate = False
            for seen in seen_content:
                if len(normalized_content) > 20 and len(seen) > 20:
                    # Calculate word overlap
                    words1 = set(normalized_content.split())
                    words2 = set(seen.split())
                    common_words = words1 & words2
                    
                    if len(common_words) > 0:
                        similarity = len(common_words) / max(len(words1), len(words2))
                        if similarity > 0.5:  # 50% word overlap
                            is_duplicate = True
                            break
                    
                    # Check for substring matches
                    shorter = normalized_content if len(normalized_content) < len(seen) else seen
                    longer = seen if len(normalized_content) < len(seen) else normalized_content
                    
                    if len(shorter) > 30 and shorter in longer:
                        is_duplicate = True
                        break
            
            if not is_duplicate:
                unique_paragraphs.append(para)
                seen_content.add(normalized_content)
        
        # Sort by subtitle for organization
        unique_paragraphs.sort(key=lambda x: (x['subtitle'], -x['confidence']))
        
        return unique_paragraphs[:10]  # Limit to 10 unique paragraphs
    
    def _get_dom_selector(self, element) -> str:
        """Generate a simple DOM selector for an element."""
        if element.name == 'h1':
            return 'h1'
        elif element.name == 'h2':
            return 'h2'
        elif element.name == 'h3':
            return 'h3'
        elif element.name == 'p':
            return 'p'
        else:
            return element.name or 'div'

    def _extract_background(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract background/description content with comprehensive analysis."""
        candidates = []
        
        def clean_text(text: str) -> str:
            """Clean and normalize text content."""
            if not text:
                return ""
            
            # Remove extra whitespace and normalize
            text = re.sub(r'\s+', ' ', text.strip())
            
            # Remove common boilerplate
            boilerplate_patterns = [
                r'cookie policy|privacy policy|terms of service|all rights reserved',
                r'copyright \d{4}|© \d{4}',
                r'follow us|connect with us|social media',
                r'newsletter|subscribe|sign up',
                r'loading\.\.\.|please wait|error|not found'
            ]
            
            for pattern in boilerplate_patterns:
                text = re.sub(pattern, '', text, flags=re.I)
            
            return text.strip()
        
        def is_meaningful_content(text: str) -> bool:
            """Check if text contains meaningful business content."""
            if not text or len(text.strip()) < 20:
                return False
            
            text_lower = text.lower()
            
            # Skip very short or generic content
            skip_patterns = [
                r'^[a-z\s]{1,20}$',  # Very short text
                r'^(home|about|contact|services|blog|news)$',  # Single navigation words
                r'^(click here|read more|learn more|view all)$',  # Generic CTAs
                r'^(loading|error|not found|page not found)$',  # Error messages
                r'^(copyright|all rights reserved|privacy policy)$'  # Legal text
            ]
            
            for pattern in skip_patterns:
                if re.match(pattern, text_lower):
                    return False
            
            # Must contain some business-relevant content
            business_indicators = [
                'we', 'our', 'company', 'business', 'service', 'provide', 'offer',
                'specialize', 'expertise', 'experience', 'years', 'since', 'founded',
                'mission', 'vision', 'values', 'quality', 'professional', 'team'
            ]
            
            return any(indicator in text_lower for indicator in business_indicators)
        
        # Method 1: Meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            content = clean_text(meta_desc.get('content'))
            if is_meaningful_content(content):
                candidates.append({
                    'value': content,
                    'confidence': 0.9,
                    'source': 'meta_description',
                    'provenance': [{'url': url, 'path': 'meta[name="description"]'}]
                })
        
        # Method 2: Hero/intro sections
        hero_selectors = [
            '.hero', '.banner', '.intro', '.welcome', '.about-intro',
            '[class*="hero"]', '[class*="banner"]', '[class*="intro"]',
            'section:first-of-type', '.main-content', '.content-intro'
        ]
        
        for selector in hero_selectors:
            try:
                hero_sections = soup.select(selector)
                for hero in hero_sections:
                    text = clean_text(hero.get_text())
                    if is_meaningful_content(text) and len(text) > 30:
                        # Limit length but preserve meaning
                        if len(text) > 300:
                            # Try to find a good break point
                            sentences = text.split('. ')
                            truncated = '. '.join(sentences[:2]) + '.'
                            if len(truncated) <= 300:
                                text = truncated
                            else:
                                text = text[:297] + '...'
                        
                        candidates.append({
                            'value': text,
                            'confidence': 0.8,
                            'source': 'hero_section',
                            'provenance': [{'url': url, 'path': selector}]
                        })
                        break
            except:
                continue
        
        # Method 3: About/company description sections
        about_selectors = [
            '.about', '.company', '.description', '.overview', '.mission',
            '[class*="about"]', '[class*="company"]', '[class*="description"]',
            'h1 + p', 'h2 + p', '.lead', '.intro-text'
        ]
        
        for selector in about_selectors:
            try:
                about_sections = soup.select(selector)
                for section in about_sections:
                    text = clean_text(section.get_text())
                    if is_meaningful_content(text) and len(text) > 50:
                        if len(text) > 300:
                            sentences = text.split('. ')
                            truncated = '. '.join(sentences[:2]) + '.'
                            if len(truncated) <= 300:
                                text = truncated
                            else:
                                text = text[:297] + '...'
                        
                        candidates.append({
                            'value': text,
                            'confidence': 0.7,
                            'source': 'about_section',
                            'provenance': [{'url': url, 'path': selector}]
                        })
                        break
            except:
                continue
        
        # Method 4: First substantial paragraph
        if not candidates:
            paragraphs = soup.find_all('p')
            for p in paragraphs:
                text = clean_text(p.get_text())
                if is_meaningful_content(text) and len(text) > 50:
                    if len(text) > 300:
                        sentences = text.split('. ')
                        truncated = '. '.join(sentences[:2]) + '.'
                        if len(truncated) <= 300:
                            text = truncated
                        else:
                            text = text[:297] + '...'
                    
                    candidates.append({
                        'value': text,
                        'confidence': 0.6,
                        'source': 'paragraph',
                        'provenance': [{'url': url, 'path': 'p'}]
                    })
                    break
        
        # Method 5: Look for business description in headings + content
        if not candidates:
            headings = soup.find_all(['h1', 'h2', 'h3'])
            for heading in headings:
                heading_text = clean_text(heading.get_text())
                if any(word in heading_text.lower() for word in ['about', 'company', 'mission', 'vision', 'who we are']):
                    # Look for content after this heading
                    next_sibling = heading.find_next_sibling()
                    if next_sibling:
                        content_text = clean_text(next_sibling.get_text())
                        if is_meaningful_content(content_text) and len(content_text) > 30:
                            if len(content_text) > 300:
                                sentences = content_text.split('. ')
                                truncated = '. '.join(sentences[:2]) + '.'
                                if len(truncated) <= 300:
                                    content_text = truncated
                                else:
                                    content_text = content_text[:297] + '...'
                            
                            candidates.append({
                                'value': content_text,
                                'confidence': 0.7,
                                'source': 'heading_content',
                                'provenance': [{'url': url, 'path': f'{heading.name} + content'}]
                            })
                            break
        
        # Method 6: Extract from main content area
        if not candidates:
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile(r'content|main', re.I))
            if main_content:
                text = clean_text(main_content.get_text())
                if is_meaningful_content(text) and len(text) > 50:
                    # Take first meaningful sentence or two
                    sentences = text.split('. ')
                    if len(sentences) >= 2:
                        content = '. '.join(sentences[:2]) + '.'
                    else:
                        content = sentences[0] + '.'
                    
                    if len(content) > 300:
                        content = content[:297] + '...'
                    
                    candidates.append({
                        'value': content,
                        'confidence': 0.5,
                        'source': 'main_content',
                        'provenance': [{'url': url, 'path': 'main_content'}]
                    })
        
        # Select best candidate
        if candidates:
            best = max(candidates, key=lambda x: x['confidence'])
            return {
                'value': best['value'],
                'confidence': best['confidence'],
                'provenance': best['provenance'],
                'notes': f"Extracted from {best['source']}",
                'candidates': candidates
            }
        
        return {
            'value': None,
            'confidence': 0.0,
            'provenance': [],
            'notes': 'not found',
            'candidates': candidates
        }
    
    def _extract_slogan(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract slogan/tagline."""
        candidates = []
        
        # Method 1: Hero section headings
        hero_sections = soup.find_all(['div', 'section'], class_=re.compile(r'hero|banner|intro', re.I))
        for hero in hero_sections:
            h2 = hero.find('h2')
            if h2 and h2.get_text().strip():
                text = h2.get_text().strip()
                if len(text) < 100:  # Reasonable slogan length
                    candidates.append({
                        'value': text,
                        'confidence': 0.8,
                        'source': 'hero_h2',
                        'provenance': [{'url': url, 'path': 'hero h2'}]
                    })
        
        # Method 2: Subtitle elements
        subtitles = soup.find_all(['p', 'span'], class_=re.compile(r'subtitle|tagline|slogan', re.I))
        for subtitle in subtitles:
            text = subtitle.get_text().strip()
            if text and len(text) < 100:
                candidates.append({
                    'value': text,
                    'confidence': 0.7,
                    'source': 'subtitle',
                    'provenance': [{'url': url, 'path': 'subtitle'}]
                })
        
        # Method 3: Meta tagline
        meta_tagline = soup.find('meta', attrs={'name': 'tagline'})
        if meta_tagline and meta_tagline.get('content'):
            candidates.append({
                'value': meta_tagline.get('content').strip(),
                'confidence': 0.9,
                'source': 'meta_tagline',
                'provenance': [{'url': url, 'path': 'meta[name="tagline"]'}]
            })
        
        # Select best candidate
        if candidates:
            best = max(candidates, key=lambda x: x['confidence'])
            return {
                'value': best['value'],
                'confidence': best['confidence'],
                'provenance': best['provenance'],
                'notes': f"Extracted from {best['source']}",
                'candidates': candidates
            }
        
        return {
            'value': None,
            'confidence': 0.0,
            'provenance': [],
            'notes': 'not found',
            'candidates': candidates
        }

def generate_run_id(url):
    """Generate a run ID from URL and timestamp."""
    domain = urlparse(url).hostname
    timestamp = datetime.now().strftime('%Y-%m-%dT%H-%M-%S')
    domain_slug = domain.replace('.', '-').replace(':', '-').lower()
    return f"{domain_slug}-{timestamp}"

def extract_truth_table(url, max_pages=20, timeout=10, use_playwright=True):
    """Extract truth table data from a website with strict validation."""
    
    # Generate run ID
    run_id = generate_run_id(url)
    
    # Create runs directory structure
    script_dir = os.path.dirname(os.path.abspath(__file__))
    runs_dir = os.path.join(script_dir, "..", "..", "runs")
    run_dir = os.path.join(runs_dir, run_id)
    
    os.makedirs(run_dir, exist_ok=True)
    os.makedirs(os.path.join(run_dir, "images"), exist_ok=True)
    os.makedirs(os.path.join(run_dir, "text"), exist_ok=True)
    os.makedirs(os.path.join(run_dir, "navbar"), exist_ok=True)
    os.makedirs(os.path.join(run_dir, "misc"), exist_ok=True)
    os.makedirs(os.path.join(run_dir, "packed"), exist_ok=True)
    os.makedirs(os.path.join(run_dir, "generated"), exist_ok=True)
    os.makedirs(os.path.join(run_dir, "render"), exist_ok=True)
    os.makedirs(os.path.join(run_dir, "logs"), exist_ok=True)
    
    # Initialize extractor
    extractor = EnhancedTruthExtractor(max_pages, timeout)
    
    # Extract data from multiple pages
    logger.info(f"Extracting data from {url} (max {max_pages} pages)")
    extracted_data = extractor.extract_from_multiple_pages(url)
    
    # Create truth record with extracted data
    domain = urlparse(url).hostname
    truth_record = {
        "business_id": run_id,
        "domain": domain,
        "crawled_at": datetime.now().isoformat(),
        "pages_visited": 1,
        "fields": {
            "brand_name": extracted_data.get('brand_name', {
                'value': None, 'confidence': 0.0, 'provenance': [], 'notes': 'not found', 'candidates': []
            }),
            "location": extracted_data.get('location', {
                'value': None, 'confidence': 0.0, 'provenance': [], 'notes': 'not found', 'candidates': []
            }),
            "email": extracted_data.get('email', {
                'value': None, 'confidence': 0.0, 'provenance': [], 'notes': 'not found', 'candidates': []
            }),
            "phone": extracted_data.get('phone', {
                'value': None, 'confidence': 0.0, 'provenance': [], 'notes': 'not found', 'candidates': []
            }),
            "socials": extracted_data.get('socials', {
                'value': None, 'confidence': 0.0, 'provenance': [], 'notes': 'not found', 'candidates': []
            }),
            "services": extracted_data.get('services', {
                'value': None, 'confidence': 0.0, 'provenance': [], 'notes': 'not found', 'candidates': []
            }),
            "brand_colors": extracted_data.get('brand_colors', {
                'value': None, 'confidence': 0.0, 'provenance': [], 'notes': 'not found', 'candidates': []
            }),
            "logo": extracted_data.get('logo', {
                'value': None, 'confidence': 0.0, 'provenance': [], 'notes': 'not found', 'candidates': []
            }),
            "background": extracted_data.get('background', {
                'value': None, 'confidence': 0.0, 'provenance': [], 'notes': 'not found', 'candidates': []
            }),
            "slogan": extracted_data.get('slogan', {
                'value': None, 'confidence': 0.0, 'provenance': [], 'notes': 'not found', 'candidates': []
            })
        },
        "candidates": {
            "brand_name": extracted_data.get('brand_name', {}).get('candidates', []),
            "location": extracted_data.get('location', {}).get('candidates', []),
            "email": extracted_data.get('email', {}).get('candidates', []),
            "phone": extracted_data.get('phone', {}).get('candidates', []),
            "socials": extracted_data.get('socials', {}).get('candidates', []),
            "services": extracted_data.get('services', {}).get('candidates', []),
            "brand_colors": extracted_data.get('brand_colors', {}).get('candidates', []),
            "logo": extracted_data.get('logo', {}).get('candidates', []),
            "background": extracted_data.get('background', {}).get('candidates', []),
            "slogan": extracted_data.get('slogan', {}).get('candidates', [])
        }
    }
    
    # Write truth record
    truth_path = os.path.join(run_dir, "truth.json")
    with open(truth_path, 'w', encoding='utf-8') as f:
        json.dump(truth_record, f, indent=2)
    
    # Create additional files
        additional_files = {
            "images/manifest.json": extracted_data.get('images', []),
            "text/text.json": extracted_data.get('paragraphs', []),
            "navbar/navbar.json": extracted_data.get('navbar', {
                "id": "root",
                "label": "Home",
                "href": "/",
                "order": 0,
                "status": "extracted",
                "children": [],
                "is_locked": False,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }),
            "misc/colors.json": extracted_data.get('brand_colors', {}).get('value', ["#3B82F6", "#1E40AF"]),
            "misc/og.json": {},
            "misc/schema.json": {}
        }
    
    for file_path, content in additional_files.items():
        full_path = os.path.join(run_dir, file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2)
    
    logger.info(f"Extraction completed for {url}")
    logger.info(f"Run ID: {run_id}")
    logger.info(f"Truth record saved to: {truth_path}")
    
    return run_id

def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python truth_extractor.py <url> [max_pages] [timeout] [use_playwright]")
        sys.exit(1)
    
    url = sys.argv[1]
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    use_playwright = sys.argv[4].lower() == 'true' if len(sys.argv) > 4 else True
    
    try:
        run_id = extract_truth_table(url, max_pages, timeout, use_playwright)
        print(f"SUCCESS: {run_id}")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()