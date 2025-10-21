#!/usr/bin/env python3
"""
Contact Information Extractor
Extracts phone numbers, email addresses, addresses, business hours, social media links, and map embeds
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
import phonenumbers
from email_validator import validate_email, EmailNotValidError
import validators

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ContactExtractor:
    """Extract contact information from web pages."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def extract_contact(self, url: str) -> Dict[str, Any]:
        """Extract contact information from a URL."""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            text = soup.get_text(" ")
            
            data = {
                "phone": [],
                "email": [],
                "address": [],
                "hours": {},
                "social": {},
                "mapEmbed": None,
                "contacts": [],  # For multiple people/contacts
                "extraction_date": datetime.now().isoformat(),
                "url": url
            }
            
            # Extract phone numbers (multiple)
            phones = self._extract_phones(text, soup)
            data["phone"] = phones
            
            # Extract email addresses (multiple)
            emails = self._extract_emails(text, soup)
            data["email"] = emails
            
            # Extract addresses (multiple)
            addresses = self._extract_addresses(text, soup)
            data["address"] = addresses
            
            # Extract business hours
            hours = self._extract_hours(text, soup)
            if hours:
                data["hours"] = hours
            
            # Extract social media links
            social = self._extract_social_links(soup)
            if social:
                data["social"] = social
            
            # Extract map embed
            map_embed = self._extract_map_embed(soup)
            if map_embed:
                data["mapEmbed"] = map_embed
            
            # Extract individual contacts (people)
            contacts = self._extract_individual_contacts(soup)
            data["contacts"] = contacts
            
            return data
            
        except Exception as e:
            logger.error(f"Error extracting contact info from {url}: {e}")
            return {
                "phone": None,
                "email": None,
                "address": None,
                "hours": {},
                "social": {},
                "mapEmbed": None,
                "extraction_date": datetime.now().isoformat(),
                "url": url,
                "error": str(e)
            }
    
    def _extract_phones(self, text: str, soup: BeautifulSoup) -> List[str]:
        """Extract phone numbers from text and HTML."""
        phones = []
        # Phone number patterns
        phone_patterns = [
            r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # US format
            r'\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}',  # US with country code
            r'\+?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}',  # International
        ]
        
        # Try to find phone numbers in text
        for pattern in phone_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                try:
                    # Clean and validate phone number
                    cleaned = re.sub(r'[^\d+\-\(\)\s]', '', match.strip())
                    parsed = phonenumbers.parse(cleaned, "US")
                    if phonenumbers.is_valid_number(parsed):
                        formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)
                        if formatted not in phones:
                            phones.append(formatted)
                except:
                    continue
        
        # Look for phone numbers in specific HTML elements
        phone_elements = soup.find_all(['a', 'span', 'div'], string=re.compile(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'))
        for element in phone_elements:
            text_content = element.get_text().strip()
            for pattern in phone_patterns:
                match = re.search(pattern, text_content)
                if match:
                    try:
                        cleaned = re.sub(r'[^\d+\-\(\)\s]', '', match.group().strip())
                        parsed = phonenumbers.parse(cleaned, "US")
                        if phonenumbers.is_valid_number(parsed):
                            formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)
                            if formatted not in phones:
                                phones.append(formatted)
                    except:
                        continue
        
        return phones
    
    def _extract_emails(self, text: str, soup: BeautifulSoup) -> List[str]:
        """Extract email addresses from text and HTML."""
        emails = []
        # Email pattern
        email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
        
        # Find emails in text
        matches = re.findall(email_pattern, text)
        for match in matches:
            try:
                # Validate email
                valid = validate_email(match.strip().lower())
                if valid.email and valid.email not in emails:
                    emails.append(valid.email)
            except EmailNotValidError:
                continue
        
        # Look for email links
        email_links = soup.find_all('a', href=re.compile(r'^mailto:'))
        for link in email_links:
            href = link.get('href', '')
            email_match = re.search(r'mailto:([^\?]+)', href)
            if email_match:
                email = email_match.group(1).strip()
                try:
                    valid = validate_email(email.lower())
                    if valid.email and valid.email not in emails:
                        emails.append(valid.email)
                except EmailNotValidError:
                    continue
        
        return emails
    
    def _extract_addresses(self, text: str, soup: BeautifulSoup) -> List[str]:
        """Extract physical addresses from text and HTML using enhanced methods."""
        addresses = []
        
        # Method 1: Structured data (JSON-LD) - highest confidence
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and 'address' in data:
                    address = data['address']
                    if isinstance(address, dict):
                        # Build address from structured data
                        address_parts = []
                        if 'streetAddress' in address:
                            address_parts.append(address['streetAddress'])
                        if 'addressLocality' in address:
                            address_parts.append(address['addressLocality'])
                        if 'addressRegion' in address:
                            address_parts.append(address['addressRegion'])
                        if 'postalCode' in address:
                            address_parts.append(address['postalCode'])
                        
                        if address_parts:
                            full_address = ', '.join(filter(None, address_parts))
                            if full_address not in addresses:
                                addresses.append(full_address)
            except:
                continue
        
        # Method 2: Address elements with better validation
        address_elements = soup.find_all(['address', 'div', 'span'], class_=re.compile(r'address|location|contact', re.I))
        for element in address_elements:
            text = element.get_text().strip()
            if text and len(text) > 10 and len(text) < 200:  # Reasonable address length
                # Clean up the text - remove extra whitespace and common website text
                cleaned_text = re.sub(r'\s+', ' ', text)
                cleaned_text = re.sub(r'(Home|Services|Our work|Contact|More|Contact Us|Northshore|Exterior|Upkeep|We serve|Baton rouge|all the way|PM Contact)', '', cleaned_text, flags=re.I)
                cleaned_text = cleaned_text.strip()
                
                if cleaned_text and len(cleaned_text) > 10:
                    if cleaned_text not in addresses:
                        addresses.append(cleaned_text)
        
        # Method 3: Enhanced regex patterns for US addresses
        address_patterns = [
            # Standard US address format
            r'\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct|Place|Pl|Parkway|Pkwy)[\s,]*[A-Za-z\s,]*\d{5}(?:-\d{4})?',
            # Address with city, state, zip
            r'\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct|Place|Pl|Parkway|Pkwy)[\s,]*[A-Za-z\s,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?',
            # PO Box
            r'P\.?O\.?\s+Box\s+\d+[\s,]*[A-Za-z\s,]*\d{5}(?:-\d{4})?',
        ]
        
        # Look for addresses in text
        for pattern in address_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                    cleaned_address = match.strip()
                    if cleaned_address not in addresses:
                        addresses.append(cleaned_address)
        
        # Method 4: Meta tags for location
        meta_location = soup.find('meta', {'name': 'geo.region'})
        if meta_location:
            location = meta_location.get('content', '').strip()
            if location and location not in addresses:
                addresses.append(location)
        
        # Method 5: Look for specific address containers
        address_containers = soup.find_all(['div', 'section'], class_=re.compile(r'address|location|contact.*info|business.*address', re.I))
        for container in address_containers:
            container_text = container.get_text().strip()
            # Look for address-like patterns in the container
            for pattern in address_patterns:
                match = re.search(pattern, container_text, re.IGNORECASE)
                if match:
                    cleaned_address = match.group().strip()
                    if cleaned_address not in addresses:
                        addresses.append(cleaned_address)
        
        # Filter out addresses that are too short or contain common website text
        filtered_addresses = []
        for addr in addresses:
            if (len(addr) > 15 and 
                not re.search(r'(Home|Services|Our work|Contact|More|Contact Us|Northshore|Exterior|Upkeep|We serve|Baton rouge|all the way|PM Contact)', addr, re.I) and
                not re.search(r'^\d+$', addr)):  # Not just a number
                filtered_addresses.append(addr)
        
        return filtered_addresses[:3]  # Return top 3 addresses
    
    def _extract_hours(self, text: str, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract business hours from text and HTML with comprehensive day coverage and proper ordering."""
        hours = {}
        
        # Enhanced hours patterns to catch more variations including day ranges
        hours_patterns = [
            # Day range format: Mon-Thu 8:30 AM - 7:00 PM
            r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s-]*(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s:]*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?[\s-]*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)',
            # Single day format: Monday: 9:00 AM - 5:00 PM
            r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s:]*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?[\s-]*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)',
            # Format without colons: Mon 9 AM - 5 PM
            r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s:]*(\d{1,2}\s*(?:AM|PM|am|pm)?[\s-]*\d{1,2}\s*(?:AM|PM|am|pm)?)',
            # 24-hour format: Mon: 09:00-17:00
            r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s:]*(\d{1,2}:\d{2}[\s-]*\d{1,2}:\d{2})',
            # Closed days: Mon: Closed
            r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s:]*((?:Closed|CLOSED|closed))',
        ]
        
        # Look for hours in text content
        for pattern in hours_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if len(match) == 2:  # Single day format
                    day, time_range = match
                    day_key = self._normalize_day(day)
                    if day_key:
                        hours[day_key] = time_range.strip()
                elif len(match) == 3:  # Day range format
                    start_day, end_day, time_range = match
                    start_key = self._normalize_day(start_day)
                    end_key = self._normalize_day(end_day)
                    if start_key and end_key:
                        # Apply the same hours to all days in the range
                        for day_key in self._get_day_range(start_key, end_key):
                            hours[day_key] = time_range.strip()
        
        # Look for hours in specific HTML elements
        hours_elements = soup.find_all(['div', 'span', 'p', 'table'], class_=re.compile(r'hours|time|schedule|business.*hours|opening.*hours', re.I))
        for element in hours_elements:
            element_text = element.get_text()
            for pattern in hours_patterns:
                matches = re.findall(pattern, element_text, re.IGNORECASE)
                for match in matches:
                    if len(match) == 2:
                        day, time_range = match
                        day_key = self._normalize_day(day)
                        if day_key:
                            hours[day_key] = time_range.strip()
                    elif len(match) == 3:
                        start_day, end_day, time_range = match
                        start_key = self._normalize_day(start_day)
                        end_key = self._normalize_day(end_day)
                        if start_key and end_key:
                            for day_key in self._get_day_range(start_key, end_key):
                                hours[day_key] = time_range.strip()
        
        # Look for structured data (JSON-LD) for hours
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and 'openingHours' in data:
                    opening_hours = data['openingHours']
                    if isinstance(opening_hours, list):
                        for hours_spec in opening_hours:
                            if isinstance(hours_spec, str):
                                # Parse format like "Mo-Fr 09:00-17:00" or "Mo 09:00-17:00"
                                self._parse_structured_hours(hours_spec, hours)
            except:
                continue
        
        # Look for table-based hours
        hours_tables = soup.find_all('table', class_=re.compile(r'hours|schedule', re.I))
        for table in hours_tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    day_text = cells[0].get_text().strip()
                    time_text = cells[1].get_text().strip()
                    day_key = self._normalize_day(day_text)
                    if day_key and time_text:
                        hours[day_key] = time_text
        
        # Return hours in proper chronological order
        return self._order_hours_chronologically(hours)
    
    def _normalize_day(self, day: str) -> str:
        """Normalize day names to 3-letter abbreviations."""
        day_mapping = {
            'monday': 'mon', 'tuesday': 'tue', 'wednesday': 'wed',
            'thursday': 'thu', 'friday': 'fri', 'saturday': 'sat', 'sunday': 'sun',
            'mon': 'mon', 'tue': 'tue', 'wed': 'wed', 'thu': 'thu',
            'fri': 'fri', 'sat': 'sat', 'sun': 'sun'
        }
        return day_mapping.get(day.lower().strip(), '')
    
    def _get_day_range(self, start_day: str, end_day: str) -> List[str]:
        """Get all days in a range from start_day to end_day."""
        days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        try:
            start_idx = days.index(start_day)
            end_idx = days.index(end_day)
            if start_idx <= end_idx:
                return days[start_idx:end_idx + 1]
            else:  # Wrap around (e.g., Fri-Mon)
                return days[start_idx:] + days[:end_idx + 1]
        except ValueError:
            return [start_day, end_day]
    
    def _order_hours_chronologically(self, hours: Dict[str, str]) -> Dict[str, str]:
        """Order business hours in chronological order (Monday to Sunday)."""
        day_order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        ordered_hours = {}
        
        # Add days in chronological order
        for day in day_order:
            if day in hours:
                ordered_hours[day] = hours[day]
        
        return ordered_hours
    
    def _parse_structured_hours(self, hours_spec: str, hours_dict: Dict[str, str]):
        """Parse structured hours format like 'Mo-Fr 09:00-17:00'."""
        # Map ISO day abbreviations to our format
        iso_mapping = {
            'Mo': 'mon', 'Tu': 'tue', 'We': 'wed', 'Th': 'thu',
            'Fr': 'fri', 'Sa': 'sat', 'Su': 'sun'
        }
        
        # Parse format like "Mo-Fr 09:00-17:00"
        match = re.match(r'([A-Za-z]{2})(?:-([A-Za-z]{2}))?\s+(.+)', hours_spec)
        if match:
            start_day_iso, end_day_iso, time_range = match.groups()
            start_day = iso_mapping.get(start_day_iso, start_day_iso.lower())
            
            if end_day_iso:
                end_day = iso_mapping.get(end_day_iso, end_day_iso.lower())
                for day in self._get_day_range(start_day, end_day):
                    hours_dict[day] = time_range
            else:
                hours_dict[start_day] = time_range
    
    def _extract_social_links(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract social media links from HTML."""
        social = {}
        
        # Social media patterns
        social_patterns = {
            'facebook': r'facebook\.com',
            'instagram': r'instagram\.com',
            'twitter': r'twitter\.com|x\.com',
            'linkedin': r'linkedin\.com',
            'youtube': r'youtube\.com',
            'tiktok': r'tiktok\.com',
            'pinterest': r'pinterest\.com',
            'snapchat': r'snapchat\.com',
        }
        
        # Find all links
        links = soup.find_all('a', href=True)
        for link in links:
            href = link['href'].lower()
            for platform, pattern in social_patterns.items():
                if re.search(pattern, href):
                    social[platform] = link['href']
                    break
        
        return social
    
    def _extract_map_embed(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract map embed (Google Maps iframe) from HTML."""
        # Look for Google Maps iframes
        iframes = soup.find_all('iframe', src=True)
        for iframe in iframes:
            src = iframe['src']
            if 'maps.google.com' in src or 'google.com/maps' in src:
                return src
        
        return None
    
    def _extract_individual_contacts(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract individual people/contacts from the website."""
        contacts = []
        
        # Look for team/staff/about sections
        team_sections = soup.find_all(['div', 'section'], class_=re.compile(r'team|staff|about|people|contact.*person', re.I))
        
        for section in team_sections:
            # Look for individual contact cards
            contact_cards = section.find_all(['div', 'article'], class_=re.compile(r'person|member|contact|card', re.I))
            
            for card in contact_cards:
                contact_info = {
                    "name": None,
                    "title": None,
                    "email": None,
                    "phone": None,
                    "bio": None,
                    "image": None
                }
                
                # Extract name (usually in h1, h2, h3, or strong tags)
                name_elements = card.find_all(['h1', 'h2', 'h3', 'h4', 'strong', 'span'], class_=re.compile(r'name|title', re.I))
                if not name_elements:
                    name_elements = card.find_all(['h1', 'h2', 'h3', 'h4'])
                
                if name_elements:
                    contact_info["name"] = name_elements[0].get_text().strip()
                
                # Extract title/position
                title_elements = card.find_all(['p', 'span', 'div'], class_=re.compile(r'title|position|role|job', re.I))
                if not title_elements:
                    # Look for common title patterns
                    text_content = card.get_text()
                    title_patterns = [
                        r'(?:CEO|CTO|CFO|President|Director|Manager|Lead|Senior|Junior|Developer|Designer|Analyst|Coordinator|Specialist)',
                        r'(?:Founder|Co-founder|Owner|Partner|Consultant|Advisor)'
                    ]
                    for pattern in title_patterns:
                        match = re.search(pattern, text_content, re.I)
                        if match:
                            contact_info["title"] = match.group().strip()
                            break
                else:
                    contact_info["title"] = title_elements[0].get_text().strip()
                
                # Extract email
                email_links = card.find_all('a', href=re.compile(r'^mailto:'))
                if email_links:
                    href = email_links[0].get('href', '')
                    email_match = re.search(r'mailto:([^\?]+)', href)
                    if email_match:
                        try:
                            valid = validate_email(email_match.group(1).strip().lower())
                            if valid.email:
                                contact_info["email"] = valid.email
                        except EmailNotValidError:
                            pass
                
                # Extract phone
                phone_elements = card.find_all(['a', 'span'], string=re.compile(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'))
                if phone_elements:
                    phone_text = phone_elements[0].get_text().strip()
                    phone_patterns = [
                        r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
                        r'\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}'
                    ]
                    for pattern in phone_patterns:
                        match = re.search(pattern, phone_text)
                        if match:
                            try:
                                cleaned = re.sub(r'[^\d+\-\(\)\s]', '', match.group().strip())
                                parsed = phonenumbers.parse(cleaned, "US")
                                if phonenumbers.is_valid_number(parsed):
                                    contact_info["phone"] = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)
                                    break
                            except:
                                continue
                
                # Extract bio/description
                bio_elements = card.find_all(['p', 'div'], class_=re.compile(r'bio|description|about', re.I))
                if not bio_elements:
                    # Look for paragraphs that might contain bio
                    bio_elements = card.find_all('p')
                
                if bio_elements:
                    bio_text = bio_elements[0].get_text().strip()
                    if len(bio_text) > 20:  # Only include substantial bios
                        contact_info["bio"] = bio_text[:200] + "..." if len(bio_text) > 200 else bio_text
                
                # Extract image
                img_elements = card.find_all('img')
                if img_elements:
                    img_src = img_elements[0].get('src')
                    if img_src and not img_src.startswith('data:'):
                        contact_info["image"] = img_src
                
                # Only add contact if we found at least a name
                if contact_info["name"]:
                    contacts.append(contact_info)
        
        return contacts

def main():
    """Main function for command line usage."""
    if len(sys.argv) < 2:
        print("Usage: python contact_extractor.py <url>")
        sys.exit(1)
    
    url = sys.argv[1]
    extractor = ContactExtractor()
    result = extractor.extract_contact(url)
    
    # Output JSON to stdout
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
