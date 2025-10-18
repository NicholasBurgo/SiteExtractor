"""
Validators for extracted data.
"""

import logging
import re
from typing import Optional

import dns.resolver
import phonenumbers

logger = logging.getLogger(__name__)


class EmailValidator:
    """Validate email addresses."""
    
    # Basic email regex
    EMAIL_REGEX = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    @classmethod
    def validate(cls, email: str, check_mx: bool = True) -> tuple[bool, float, str]:
        """
        Validate an email address.
        
        Args:
            email: Email address to validate
            check_mx: Whether to check MX records
            
        Returns:
            Tuple of (is_valid, bonus_score, notes)
        """
        email = email.strip().lower()
        
        # Basic format check
        if not cls.EMAIL_REGEX.match(email):
            return False, 0.0, "invalid format"
        
        notes = []
        bonus = 0.0
        
        # MX record check
        if check_mx:
            domain = email.split("@")[1]
            try:
                mx_records = dns.resolver.resolve(domain, "MX")
                if mx_records:
                    notes.append("MX valid")
                    bonus += 0.1
            except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
                notes.append("MX not found")
            except Exception as e:
                logger.debug(f"MX lookup failed for {domain}: {e}")
                notes.append("MX check failed")
        
        return True, bonus, "; ".join(notes)


class PhoneValidator:
    """Validate and format phone numbers."""
    
    @classmethod
    def validate(cls, phone: str, default_region: str = "US") -> tuple[bool, Optional[str], float, str]:
        """
        Validate and format a phone number.
        
        Args:
            phone: Phone number string
            default_region: Default country region
            
        Returns:
            Tuple of (is_valid, e164_format, bonus_score, notes)
        """
        try:
            # Parse phone number
            parsed = phonenumbers.parse(phone, default_region)
            
            # Check if valid
            if not phonenumbers.is_valid_number(parsed):
                return False, None, 0.0, "invalid number"
            
            # Format to E.164
            e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            
            notes = []
            bonus = 0.1  # Valid phone gets bonus
            
            # Check number type
            number_type = phonenumbers.number_type(parsed)
            if number_type == phonenumbers.PhoneNumberType.MOBILE:
                notes.append("mobile")
            elif number_type == phonenumbers.PhoneNumberType.FIXED_LINE:
                notes.append("landline")
            
            return True, e164, bonus, "; ".join(notes)
        
        except phonenumbers.NumberParseException as e:
            return False, None, 0.0, f"parse error: {e}"


class AddressValidator:
    """Validate and normalize addresses."""
    
    # US zip code pattern
    ZIP_PATTERN = re.compile(r'^\d{5}(?:-\d{4})?$')
    
    @classmethod
    def validate(cls, address: dict, geocode_token: Optional[str] = None) -> tuple[bool, float, str]:
        """
        Validate an address.
        
        Args:
            address: Address dict with components
            geocode_token: Optional geocoding API token
            
        Returns:
            Tuple of (is_valid, bonus_score, notes)
        """
        notes = []
        bonus = 0.0
        
        # Check required components
        has_city = bool(address.get("city"))
        has_region = bool(address.get("region"))
        has_postal = bool(address.get("postal"))
        
        if not (has_city or has_region or has_postal):
            return False, 0.0, "insufficient components"
        
        # Validate postal code format (US)
        postal = address.get("postal")
        if postal:
            if cls.ZIP_PATTERN.match(postal):
                notes.append("valid zip")
                bonus += 0.05
            else:
                notes.append("non-US postal")
        
        # TODO: Geocoding validation (optional, requires API token)
        # If geocode_token is provided, could validate coordinates
        if geocode_token:
            notes.append("geocoding not implemented")
        
        # If we have multiple components, it's more trustworthy
        component_count = sum([has_city, has_region, has_postal, bool(address.get("street"))])
        if component_count >= 3:
            bonus += 0.05
            notes.append(f"{component_count} components")
        
        return True, bonus, "; ".join(notes)


class ColorValidator:
    """Validate brand colors for accessibility."""
    
    @classmethod
    def validate(cls, colors: list[str]) -> tuple[bool, float, str]:
        """
        Validate brand colors.
        
        Args:
            colors: List of HEX colors
            
        Returns:
            Tuple of (is_valid, bonus_score, notes)
        """
        notes = []
        bonus = 0.0
        
        # Check format
        hex_pattern = re.compile(r'^#[0-9A-Fa-f]{6}$')
        for color in colors:
            if not hex_pattern.match(color):
                return False, 0.0, "invalid HEX format"
        
        # Check WCAG AA contrast (at least one should pass)
        from truth_extractor.extraction.colors import ColorExtractor
        
        white_pass = any(ColorExtractor.check_wcag_contrast(c, "#FFFFFF") for c in colors)
        black_pass = any(ColorExtractor.check_wcag_contrast(c, "#000000") for c in colors)
        
        if white_pass or black_pass:
            bonus += 0.1
            if white_pass and black_pass:
                notes.append("AA vs white & black")
            elif white_pass:
                notes.append("AA vs white")
            else:
                notes.append("AA vs black")
        else:
            notes.append("low contrast")
        
        return True, bonus, "; ".join(notes)


