#!/usr/bin/env python3
"""
Enhanced Image Extraction System
Extracts images grouped by page with previews and upload functionality
"""

import requests
import json
import re
import os
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from typing import Dict, List, Any, Optional
import base64
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def extract_images_by_page(self, base_url: str, max_pages: int = 5) -> Dict[str, Any]:
        """Extract images grouped by page with metadata."""
        logger.info(f"Starting image extraction from {base_url}")
        
        # First, get the logo from truth table
        logo_info = self._extract_logo_from_truth_table(base_url)
        
        # Extract images from main page and linked pages
        pages_data = {}
        visited_urls = set()
        
        # Start with main page
        main_page_images = self._extract_page_images(base_url, base_url)
        if main_page_images:
            pages_data[base_url] = {
                'title': self._get_page_title(base_url),
                'url': base_url,
                'images': main_page_images,
                'is_main_page': True
            }
            visited_urls.add(base_url)
        
        # Find and visit linked pages
        if max_pages > 1:
            linked_pages = self._find_linked_pages(base_url)
            for page_url in linked_pages[:max_pages-1]:  # -1 because we already processed main page
                if page_url not in visited_urls:
                    page_images = self._extract_page_images(page_url, base_url)
                    if page_images:
                        pages_data[page_url] = {
                            'title': self._get_page_title(page_url),
                            'url': page_url,
                            'images': page_images,
                            'is_main_page': False
                        }
                    visited_urls.add(page_url)
        
        return {
            'logo': logo_info,
            'pages': pages_data,
            'total_images': sum(len(page['images']) for page in pages_data.values()),
            'extraction_date': datetime.now().isoformat(),
            'base_url': base_url
        }
    
    def _extract_logo_from_truth_table(self, url: str) -> Optional[Dict[str, Any]]:
        """Extract logo from truth table data."""
        try:
            # Import and use the truth extractor
            import sys
            import os
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            
            # Import the EnhancedTruthExtractor class
            from truth_extractor import EnhancedTruthExtractor
            
            extractor = EnhancedTruthExtractor()
            truth_data = extractor.extract_from_url(url)
            
            if truth_data and 'logo' in truth_data:
                logo_data = truth_data['logo']
                if logo_data.get('value'):
                    return {
                        'url': logo_data['value'],
                        'confidence': logo_data.get('confidence', 0.0),
                        'source': 'truth_table',
                        'preview': self._generate_image_preview(logo_data['value']),
                        'metadata': {
                            'provenance': logo_data.get('provenance', []),
                            'notes': logo_data.get('notes', '')
                        }
                    }
        except Exception as e:
            logger.warning(f"Could not extract logo from truth table: {e}")
        
        return None
    
    def _extract_page_images(self, page_url: str, base_url: str) -> List[Dict[str, Any]]:
        """Extract all images from a specific page."""
        try:
            response = self.session.get(page_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            images = []
            
            # Find all img tags
            img_tags = soup.find_all('img')
            
            for img in img_tags:
                img_data = self._process_image_tag(img, page_url, base_url)
                if img_data:
                    images.append(img_data)
            
            # Find background images in CSS
            bg_images = self._extract_background_images(soup, page_url, base_url)
            images.extend(bg_images)
            
            return images
            
        except Exception as e:
            logger.error(f"Error extracting images from {page_url}: {e}")
            return []
    
    def _process_image_tag(self, img_tag, page_url: str, base_url: str) -> Optional[Dict[str, Any]]:
        """Process an individual img tag and extract metadata."""
        src = img_tag.get('src')
        if not src:
            return None
        
        # Convert relative URLs to absolute
        img_url = urljoin(page_url, src)
        
        # Skip data URLs, very small images, and common non-content images
        if (src.startswith('data:') or 
            any(skip in src.lower() for skip in ['1x1', 'pixel', 'spacer', 'blank']) or
            any(skip in src.lower() for skip in ['favicon', 'icon', 'sprite'])):
            return None
        
        # Extract metadata
        alt_text = img_tag.get('alt', '')
        title = img_tag.get('title', '')
        width = img_tag.get('width', '')
        height = img_tag.get('height', '')
        
        # Determine image type/category
        image_type = self._categorize_image(img_tag, alt_text, title)
        
        # Generate preview
        preview = self._generate_image_preview(img_url)
        
        return {
            'url': img_url,
            'alt_text': alt_text,
            'title': title,
            'width': width,
            'height': height,
            'type': image_type,
            'preview': preview,
            'metadata': {
                'src_original': src,
                'page_url': page_url,
                'extracted_at': datetime.now().isoformat()
            }
        }
    
    def _extract_background_images(self, soup: BeautifulSoup, page_url: str, base_url: str) -> List[Dict[str, Any]]:
        """Extract background images from CSS styles."""
        bg_images = []
        
        # Find elements with background-image styles
        elements_with_bg = soup.find_all(attrs={'style': re.compile(r'background-image', re.I)})
        
        for element in elements_with_bg:
            style = element.get('style', '')
            bg_match = re.search(r'background-image:\s*url\(["\']?([^"\']+)["\']?\)', style, re.I)
            
            if bg_match:
                bg_url = urljoin(page_url, bg_match.group(1))
                
                # Skip data URLs and small images
                if not bg_url.startswith('data:') and '1x1' not in bg_url.lower():
                    bg_images.append({
                        'url': bg_url,
                        'alt_text': '',
                        'title': '',
                        'width': '',
                        'height': '',
                        'type': 'background',
                        'preview': self._generate_image_preview(bg_url),
                        'metadata': {
                            'src_original': bg_match.group(1),
                            'page_url': page_url,
                            'extracted_at': datetime.now().isoformat(),
                            'source': 'css_background'
                        }
                    })
        
        return bg_images
    
    def _categorize_image(self, img_tag, alt_text: str, title: str) -> str:
        """Categorize image based on context and attributes."""
        alt_lower = alt_text.lower()
        title_lower = title.lower()
        
        # Check for logo indicators
        logo_indicators = ['logo', 'brand', 'company', 'header']
        if any(indicator in alt_lower or indicator in title_lower for indicator in logo_indicators):
            return 'logo'
        
        # Check if in header/navigation
        parent = img_tag.parent
        while parent:
            parent_classes = ' '.join(parent.get('class', [])).lower()
            if any(cls in parent_classes for cls in ['header', 'nav', 'navbar', 'brand']):
                return 'logo'
            parent = parent.parent
            if parent.name == 'body':  # Reached body tag
                break
        
        # Check for product/service images
        product_indicators = ['product', 'service', 'gallery', 'portfolio', 'work']
        if any(indicator in alt_lower or indicator in title_lower for indicator in product_indicators):
            return 'product'
        
        # Check dimensions for categorization
        width = img_tag.get('width', '')
        height = img_tag.get('height', '')
        
        try:
            w = int(width) if width else 0
            h = int(height) if height else 0
            
            if w > 0 and h > 0:
                ratio = max(w, h) / min(w, h)
                if 1 <= ratio <= 1.5 and w >= 100 and h >= 100:  # Square-ish and reasonably sized
                    return 'logo'
                elif w > h * 2:  # Wide banner-like
                    return 'banner'
        except ValueError:
            pass
        
        return 'content'
    
    def _generate_image_preview(self, image_url: str) -> Dict[str, Any]:
        """Generate preview data for an image."""
        try:
            # For now, return the URL and basic info
            # In a real implementation, you might want to:
            # - Download and resize the image
            # - Generate thumbnails
            # - Extract color palette
            # - Detect faces/objects
            
            parsed_url = urlparse(image_url)
            filename = os.path.basename(parsed_url.path)
            
            return {
                'url': image_url,
                'filename': filename,
                'domain': parsed_url.netloc,
                'preview_available': True,
                'thumbnail_url': image_url,  # In real implementation, this would be a thumbnail
                'dimensions': None,  # Would be populated by actual image analysis
                'file_size': None,   # Would be populated by actual image analysis
                'colors': None      # Would be populated by color extraction
            }
        except Exception as e:
            logger.warning(f"Could not generate preview for {image_url}: {e}")
            return {
                'url': image_url,
                'filename': 'unknown',
                'domain': 'unknown',
                'preview_available': False,
                'thumbnail_url': None,
                'dimensions': None,
                'file_size': None,
                'colors': None
            }
    
    def _get_page_title(self, page_url: str) -> str:
        """Get the title of a page."""
        try:
            response = self.session.get(page_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            title_tag = soup.find('title')
            
            if title_tag:
                return title_tag.get_text().strip()
            
            # Fallback to h1 or page URL
            h1_tag = soup.find('h1')
            if h1_tag:
                return h1_tag.get_text().strip()
            
            return urlparse(page_url).path or page_url
            
        except Exception as e:
            logger.warning(f"Could not get title for {page_url}: {e}")
            return urlparse(page_url).path or page_url
    
    def _find_linked_pages(self, base_url: str) -> List[str]:
        """Find linked pages from the main page."""
        try:
            response = self.session.get(base_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            links = []
            
            # Find internal links
            for link in soup.find_all('a', href=True):
                href = link['href']
                full_url = urljoin(base_url, href)
                
                # Only include internal links
                if urlparse(full_url).netloc == urlparse(base_url).netloc:
                    # Skip common non-content pages
                    if not any(skip in href.lower() for skip in ['#', 'javascript:', 'mailto:', 'tel:']):
                        links.append(full_url)
            
            return list(set(links))[:10]  # Limit to 10 unique links
            
        except Exception as e:
            logger.warning(f"Could not find linked pages for {base_url}: {e}")
            return []
    
    def save_extraction_results(self, results: Dict[str, Any], output_dir: str) -> str:
        """Save extraction results to a JSON file."""
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"image_extraction_{timestamp}.json"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Image extraction results saved to {filepath}")
        return filepath

def main():
    """Main function for command line usage."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python image_extractor.py <url> [max_pages] [output_dir]")
        sys.exit(1)
    
    url = sys.argv[1]
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    output_dir = sys.argv[3] if len(sys.argv) > 3 else 'image_extractions'
    
    extractor = ImageExtractor()
    results = extractor.extract_images_by_page(url, max_pages)
    
    # Save results
    filepath = extractor.save_extraction_results(results, output_dir)
    
    # Print summary
    print(f"\nImage Extraction Complete!")
    print(f"Base URL: {results['base_url']}")
    print(f"Total Pages: {len(results['pages'])}")
    print(f"Total Images: {results['total_images']}")
    print(f"Logo Found: {'Yes' if results['logo'] else 'No'}")
    print(f"Results saved to: {filepath}")
    
    # Print page summary
    for page_url, page_data in results['pages'].items():
        print(f"\nPage: {page_data['title']}")
        print(f"URL: {page_url}")
        print(f"Images: {len(page_data['images'])}")
        
        # Show image types
        image_types = {}
        for img in page_data['images']:
            img_type = img['type']
            image_types[img_type] = image_types.get(img_type, 0) + 1
        
        for img_type, count in image_types.items():
            print(f"  - {img_type}: {count}")

if __name__ == "__main__":
    main()
