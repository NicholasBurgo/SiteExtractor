#!/usr/bin/env python3
"""
Meta Information Extractor
Extracts business name, type, slogan, background, and colors from websites
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

class MetaExtractor:
    """Extract meta/business information from web pages."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def extract_meta(self, url: str) -> Dict[str, Any]:
        """Extract meta information from a URL."""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            text = soup.get_text(" ")
            
            data = {
                "businessName": None,
                "businessType": None,
                "slogan": None,
                "background": None,
                "colors": [],
                "extraction_date": datetime.now().isoformat(),
                "url": url
            }
            
            # Extract business name
            business_name = self._extract_business_name(soup, text)
            data["businessName"] = business_name
            
            # Extract business type
            business_type = self._extract_business_type(soup, text)
            data["businessType"] = business_type
            
            # Extract slogan
            slogan = self._extract_slogan(soup, text)
            data["slogan"] = slogan
            
            # Extract background/description
            background = self._extract_background(soup, text)
            data["background"] = background
            
            # Extract colors
            colors = self._extract_colors(soup)
            data["colors"] = colors
            
            return data
            
        except Exception as e:
            logger.error(f"Error extracting meta info from {url}: {e}")
            return {
                "businessName": None,
                "businessType": None,
                "slogan": None,
                "background": None,
                "colors": [],
                "extraction_date": datetime.now().isoformat(),
                "url": url,
                "error": str(e)
            }
    
    def _extract_business_name(self, soup: BeautifulSoup, text: str) -> Optional[str]:
        """Extract business name from various sources."""
        # Method 1: Title tag
        title_tag = soup.find('title')
        if title_tag:
            title_text = title_tag.get_text().strip()
            # Clean up common title patterns
            title_text = re.sub(r'\s*[-|]\s*(Home|Services|About|Contact).*$', '', title_text, flags=re.I)
            if title_text and len(title_text) > 2:
                return title_text
        
        # Method 2: H1 tag
        h1_tag = soup.find('h1')
        if h1_tag:
            h1_text = h1_tag.get_text().strip()
            if h1_text and len(h1_text) > 2 and len(h1_text) < 100:
                return h1_text
        
        # Method 3: Logo alt text
        logo_img = soup.find('img', alt=True)
        if logo_img:
            alt_text = logo_img.get('alt', '').strip()
            if alt_text and len(alt_text) > 2 and len(alt_text) < 100:
                return alt_text
        
        # Method 4: Meta tags
        meta_title = soup.find('meta', {'property': 'og:title'})
        if meta_title:
            og_title = meta_title.get('content', '').strip()
            if og_title and len(og_title) > 2:
                return og_title
        
        # Method 5: Structured data
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    if 'name' in data:
                        return data['name']
                    elif '@type' in data and data['@type'] == 'Organization' and 'name' in data:
                        return data['name']
            except:
                continue
        
        return None
    
    def _extract_business_type(self, soup: BeautifulSoup, text: str) -> Optional[str]:
        """Extract business type from content analysis."""
        # Common business type keywords
        business_types = {
            'services': ['service', 'services', 'consulting', 'consultation', 'maintenance', 'repair', 'cleaning', 'pressure washing', 'soft wash'],
            'restaurant': ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'menu', 'cuisine', 'kitchen', 'chef'],
            'law': ['law', 'legal', 'attorney', 'lawyer', 'law firm', 'litigation', 'legal services', 'counsel'],
            'retail': ['store', 'shop', 'retail', 'products', 'merchandise', 'buy', 'purchase', 'sale', 'shopping'],
            'other': ['company', 'business', 'corporation', 'inc', 'llc', 'ltd']
        }
        
        text_lower = text.lower()
        
        # Count occurrences of each business type
        type_scores = {}
        for business_type, keywords in business_types.items():
            score = 0
            for keyword in keywords:
                score += text_lower.count(keyword)
            type_scores[business_type] = score
        
        # Return the type with highest score, or 'other' if no clear winner
        if type_scores:
            max_type = max(type_scores, key=type_scores.get)
            if type_scores[max_type] > 0:
                return max_type
        
        return 'other'
    
    def _extract_slogan(self, soup: BeautifulSoup, text: str) -> Optional[str]:
        """Extract slogan or tagline from various sources."""
        # Method 1: Meta description
        meta_desc = soup.find('meta', {'name': 'description'})
        if meta_desc:
            desc = meta_desc.get('content', '').strip()
            if desc and len(desc) > 10 and len(desc) < 200:
                return desc
        
        # Method 2: Look for common slogan patterns
        slogan_patterns = [
            r'(?:We|Our|Your)\s+(?:mission|goal|promise|commitment)[\s:]*([^.!?]{10,100})',
            r'(?:Quality|Excellence|Professional|Reliable)[\s\w]*(?:service|work|care)[\s\w]*',
            r'(?:Serving|Proudly serving|We serve)[\s\w]*(?:since|for)[\s\w]*',
        ]
        
        for pattern in slogan_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                slogan = match.group(0).strip()
                if len(slogan) > 10 and len(slogan) < 150:
                    return slogan
        
        # Method 3: Look for subtitle elements
        subtitle_elements = soup.find_all(['h2', 'h3', 'p'], class_=re.compile(r'subtitle|tagline|slogan|mission', re.I))
        for element in subtitle_elements:
            subtitle_text = element.get_text().strip()
            if subtitle_text and len(subtitle_text) > 10 and len(subtitle_text) < 150:
                return subtitle_text
        
        # Method 4: Look for structured data
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    if 'description' in data:
                        desc = data['description']
                        if isinstance(desc, str) and len(desc) > 10 and len(desc) < 200:
                            return desc
            except:
                continue
        
        return None
    
    def _extract_background(self, soup: BeautifulSoup, text: str) -> Optional[str]:
        """Extract background/company description."""
        # Method 1: About section
        about_sections = soup.find_all(['div', 'section'], class_=re.compile(r'about|company|background|history', re.I))
        for section in about_sections:
            section_text = section.get_text().strip()
            if len(section_text) > 50 and len(section_text) < 500:
                # Clean up the text
                cleaned_text = re.sub(r'\s+', ' ', section_text)
                return cleaned_text[:300] + "..." if len(cleaned_text) > 300 else cleaned_text
        
        # Method 2: First substantial paragraph
        paragraphs = soup.find_all('p')
        for p in paragraphs:
            p_text = p.get_text().strip()
            if len(p_text) > 50 and len(p_text) < 500:
                # Check if it's not navigation or footer content
                if not re.search(r'(home|services|contact|about|menu|login|sign up)', p_text, re.I):
                    return p_text[:300] + "..." if len(p_text) > 300 else p_text
        
        # Method 3: Meta description as fallback
        meta_desc = soup.find('meta', {'name': 'description'})
        if meta_desc:
            desc = meta_desc.get('content', '').strip()
            if desc and len(desc) > 20:
                return desc
        
        return None
    
    def _extract_colors(self, soup: BeautifulSoup) -> List[str]:
        """Extract brand colors from CSS and HTML."""
        colors = []
        
        # Method 1: CSS color values in style attributes
        elements_with_style = soup.find_all(attrs={'style': True})
        for element in elements_with_style:
            style = element['style']
            # Look for color values
            color_matches = re.findall(r'color\s*:\s*([^;]+)', style, re.I)
            for color_match in color_matches:
                color = color_match.strip()
                if self._is_valid_color(color):
                    colors.append(color)
            
            # Look for background colors
            bg_matches = re.findall(r'background(?:-color)?\s*:\s*([^;]+)', style, re.I)
            for bg_match in bg_matches:
                color = bg_match.strip()
                if self._is_valid_color(color):
                    colors.append(color)
        
        # Method 2: CSS classes that might indicate colors
        color_classes = soup.find_all(class_=re.compile(r'(blue|red|green|yellow|purple|orange|pink|gray|black|white)', re.I))
        for element in color_classes:
            class_name = ' '.join(element.get('class', []))
            color_match = re.search(r'(blue|red|green|yellow|purple|orange|pink|gray|black|white)', class_name, re.I)
            if color_match:
                color_name = color_match.group(1).lower()
                # Convert color names to hex codes
                color_map = {
                    'blue': '#3B82F6',
                    'red': '#EF4444',
                    'green': '#10B981',
                    'yellow': '#F59E0B',
                    'purple': '#8B5CF6',
                    'orange': '#F97316',
                    'pink': '#EC4899',
                    'gray': '#6B7280',
                    'black': '#000000',
                    'white': '#FFFFFF'
                }
                if color_name in color_map:
                    colors.append(color_map[color_name])
        
        # Method 3: Look for common brand color patterns
        brand_colors = ['#3B82F6', '#1E40AF', '#10B981', '#059669', '#F59E0B', '#D97706']
        colors.extend(brand_colors[:2])  # Add some default brand colors
        
        # Remove duplicates and limit to 5 colors
        unique_colors = list(dict.fromkeys(colors))
        return unique_colors[:5]
    
    def _is_valid_color(self, color: str) -> bool:
        """Check if a color string is valid."""
        # Hex colors
        if re.match(r'^#[0-9A-Fa-f]{3,6}$', color):
            return True
        # RGB colors
        if re.match(r'^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$', color):
            return True
        # RGBA colors
        if re.match(r'^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$', color):
            return True
        # Named colors
        named_colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'gray', 'black', 'white']
        if color.lower() in named_colors:
            return True
        return False

def main():
    """Main function for command line usage."""
    if len(sys.argv) < 2:
        print("Usage: python meta_extractor.py <url>")
        sys.exit(1)
    
    url = sys.argv[1]
    extractor = MetaExtractor()
    result = extractor.extract_meta(url)
    
    # Output JSON to stdout
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
