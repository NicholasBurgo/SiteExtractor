#!/usr/bin/env python3
"""
Assets Extractor
Extracts favicons, logo images, downloadable files, and other site assets
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

class AssetsExtractor:
    """Extract site assets from web pages."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def extract_assets(self, url: str) -> Dict[str, Any]:
        """Extract site assets from a URL."""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            data = {
                "favicons": [],
                "logos": [],
                "downloadable_files": [],
                "fonts": [],
                "stylesheets": [],
                "scripts": [],
                "extraction_date": datetime.now().isoformat(),
                "url": url
            }
            
            # Extract favicons
            favicons = self._extract_favicons(soup, url)
            data["favicons"] = favicons
            
            # Extract logos
            logos = self._extract_logos(soup, url)
            data["logos"] = logos
            
            # Extract downloadable files
            downloadable_files = self._extract_downloadable_files(soup, url)
            data["downloadable_files"] = downloadable_files
            
            # Extract fonts
            fonts = self._extract_fonts(soup, url)
            data["fonts"] = fonts
            
            # Extract stylesheets
            stylesheets = self._extract_stylesheets(soup, url)
            data["stylesheets"] = stylesheets
            
            # Extract scripts
            scripts = self._extract_scripts(soup, url)
            data["scripts"] = scripts
            
            return data
            
        except Exception as e:
            logger.error(f"Error extracting assets from {url}: {e}")
            return {
                "favicons": [],
                "logos": [],
                "downloadable_files": [],
                "fonts": [],
                "stylesheets": [],
                "scripts": [],
                "extraction_date": datetime.now().isoformat(),
                "url": url,
                "error": str(e)
            }
    
    def _extract_favicons(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Extract favicon links from HTML."""
        favicons = []
        
        # Look for favicon link tags
        favicon_links = soup.find_all('link', rel=re.compile(r'icon|shortcut|apple-touch-icon', re.I))
        
        for link in favicon_links:
            href = link.get('href')
            if href:
                # Convert relative URLs to absolute
                if href.startswith('/'):
                    href = urljoin(base_url, href)
                elif not href.startswith(('http://', 'https://')):
                    href = urljoin(base_url, href)
                
                favicon_data = {
                    "url": href,
                    "rel": link.get('rel', []),
                    "sizes": link.get('sizes'),
                    "type": link.get('type')
                }
                favicons.append(favicon_data)
        
        # Also check for common favicon locations
        common_favicon_paths = [
            '/favicon.ico',
            '/favicon.png',
            '/apple-touch-icon.png',
            '/apple-touch-icon-precomposed.png'
        ]
        
        for path in common_favicon_paths:
            favicon_url = urljoin(base_url, path)
            # Check if favicon exists (simplified check)
            favicon_data = {
                "url": favicon_url,
                "rel": ["icon"],
                "sizes": None,
                "type": None,
                "common_path": True
            }
            favicons.append(favicon_data)
        
        return favicons
    
    def _extract_logos(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """Extract logo images from HTML."""
        logos = []
        
        # Look for images with logo-related attributes
        logo_indicators = ['logo', 'brand', 'header', 'navbar', 'site-title']
        
        # Check img tags
        images = soup.find_all('img')
        for img in images:
            src = img.get('src')
            alt = img.get('alt', '').lower()
            title = img.get('title', '').lower()
            classes = ' '.join(img.get('class', [])).lower()
            
            # Check if image is likely a logo
            is_logo = (
                any(indicator in alt for indicator in logo_indicators) or
                any(indicator in title for indicator in logo_indicators) or
                any(indicator in classes for indicator in logo_indicators) or
                'logo' in src.lower()
            )
            
            if is_logo and src:
                # Convert relative URLs to absolute
                if src.startswith('/'):
                    src = urljoin(base_url, src)
                elif not src.startswith(('http://', 'https://')):
                    src = urljoin(base_url, src)
                
                logo_data = {
                    "url": src,
                    "alt": img.get('alt', ''),
                    "title": img.get('title', ''),
                    "class": img.get('class', []),
                    "width": img.get('width'),
                    "height": img.get('height'),
                    "position": self._get_element_position(img)
                }
                logos.append(logo_data)
        
        # Check for logos in CSS background images
        elements_with_bg = soup.find_all(attrs={'style': re.compile(r'background-image', re.I)})
        for element in elements_with_bg:
            style = element.get('style', '')
            bg_match = re.search(r'background-image:\s*url\(["\']?([^"\']+)["\']?\)', style, re.I)
            
            if bg_match:
                bg_url = bg_match.group(1)
                classes = ' '.join(element.get('class', [])).lower()
                
                if any(indicator in classes for indicator in logo_indicators):
                    # Convert relative URLs to absolute
                    if bg_url.startswith('/'):
                        bg_url = urljoin(base_url, bg_url)
                    elif not bg_url.startswith(('http://', 'https://')):
                        bg_url = urljoin(base_url, bg_url)
                    
                    logo_data = {
                        "url": bg_url,
                        "alt": "",
                        "title": "",
                        "class": element.get('class', []),
                        "width": None,
                        "height": None,
                        "position": self._get_element_position(element),
                        "source": "css_background"
                    }
                    logos.append(logo_data)
        
        return logos
    
    def _extract_downloadable_files(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """Extract downloadable file links."""
        downloadable_files = []
        
        # File extensions to look for
        file_extensions = [
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.zip', '.rar', '.7z', '.tar', '.gz',
            '.mp3', '.mp4', '.avi', '.mov', '.wmv',
            '.jpg', '.jpeg', '.png', '.gif', '.svg', '.bmp',
            '.txt', '.csv', '.xml', '.json'
        ]
        
        # Find all links
        links = soup.find_all('a', href=True)
        for link in links:
            href = link.get('href', '')
            text = link.get_text().strip()
            
            # Check if link points to a downloadable file
            is_downloadable = False
            
            # Check by file extension
            for ext in file_extensions:
                if href.lower().endswith(ext):
                    is_downloadable = True
                    break
            
            # Check by download attribute
            if link.get('download'):
                is_downloadable = True
            
            # Check by text content
            download_text_indicators = ['download', 'get', 'fetch', 'obtain', 'retrieve']
            if any(indicator in text.lower() for indicator in download_text_indicators):
                is_downloadable = True
            
            if is_downloadable:
                # Convert relative URLs to absolute
                if href.startswith('/'):
                    href = urljoin(base_url, href)
                elif not href.startswith(('http://', 'https://')):
                    href = urljoin(base_url, href)
                
                file_data = {
                    "url": href,
                    "text": text,
                    "download_attribute": link.get('download'),
                    "class": link.get('class', []),
                    "file_type": self._get_file_type(href),
                    "position": self._get_element_position(link)
                }
                downloadable_files.append(file_data)
        
        return downloadable_files
    
    def _extract_fonts(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Extract font references from HTML."""
        fonts = []
        
        # Look for font link tags
        font_links = soup.find_all('link', rel='stylesheet')
        for link in font_links:
            href = link.get('href', '')
            if 'font' in href.lower() or 'googleapis' in href.lower():
                fonts.append({
                    "url": href,
                    "type": "external_font",
                    "source": "link_tag"
                })
        
        # Look for @font-face in style tags
        style_tags = soup.find_all('style')
        for style in style_tags:
            style_content = style.get_text()
            if '@font-face' in style_content:
                fonts.append({
                    "url": None,
                    "type": "embedded_font",
                    "source": "style_tag",
                    "content": style_content[:200] + "..." if len(style_content) > 200 else style_content
                })
        
        return fonts
    
    def _extract_stylesheets(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Extract stylesheet references."""
        stylesheets = []
        
        # Look for CSS link tags
        css_links = soup.find_all('link', rel='stylesheet')
        for link in css_links:
            href = link.get('href', '')
            if href:
                # Convert relative URLs to absolute
                if href.startswith('/'):
                    href = urljoin(base_url, href)
                elif not href.startswith(('http://', 'https://')):
                    href = urljoin(base_url, href)
                
                stylesheet_data = {
                    "url": href,
                    "media": link.get('media'),
                    "type": link.get('type'),
                    "integrity": link.get('integrity'),
                    "crossorigin": link.get('crossorigin')
                }
                stylesheets.append(stylesheet_data)
        
        return stylesheets
    
    def _extract_scripts(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Extract script references."""
        scripts = []
        
        # Look for script tags
        script_tags = soup.find_all('script')
        for script in script_tags:
            src = script.get('src')
            if src:
                # Convert relative URLs to absolute
                if src.startswith('/'):
                    src = urljoin(base_url, src)
                elif not src.startswith(('http://', 'https://')):
                    src = urljoin(base_url, src)
                
                script_data = {
                    "url": src,
                    "type": script.get('type'),
                    "async": script.has_attr('async'),
                    "defer": script.has_attr('defer'),
                    "integrity": script.get('integrity'),
                    "crossorigin": script.get('crossorigin')
                }
                scripts.append(script_data)
            else:
                # Inline script
                script_content = script.get_text()
                if script_content.strip():
                    script_data = {
                        "url": None,
                        "type": script.get('type'),
                        "async": script.has_attr('async'),
                        "defer": script.has_attr('defer'),
                        "inline": True,
                        "content_length": len(script_content)
                    }
                    scripts.append(script_data)
        
        return scripts
    
    def _get_file_type(self, url: str) -> str:
        """Determine file type from URL."""
        url_lower = url.lower()
        
        if url_lower.endswith('.pdf'):
            return 'pdf'
        elif url_lower.endswith(('.doc', '.docx')):
            return 'document'
        elif url_lower.endswith(('.xls', '.xlsx')):
            return 'spreadsheet'
        elif url_lower.endswith(('.ppt', '.pptx')):
            return 'presentation'
        elif url_lower.endswith(('.zip', '.rar', '.7z', '.tar', '.gz')):
            return 'archive'
        elif url_lower.endswith(('.mp3', '.wav', '.ogg')):
            return 'audio'
        elif url_lower.endswith(('.mp4', '.avi', '.mov', '.wmv')):
            return 'video'
        elif url_lower.endswith(('.jpg', '.jpeg', '.png', '.gif', '.svg', '.bmp')):
            return 'image'
        else:
            return 'other'
    
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
        print("Usage: python assets_extractor.py <url>")
        sys.exit(1)
    
    url = sys.argv[1]
    extractor = AssetsExtractor()
    result = extractor.extract_assets(url)
    
    # Output JSON to stdout
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
