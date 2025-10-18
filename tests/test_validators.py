"""
Tests for validators module.
"""

import pytest

from truth_extractor.resolve.validators import (
    AddressValidator,
    ColorValidator,
    EmailValidator,
    PhoneValidator,
)


class TestEmailValidator:
    """Test email validation."""
    
    def test_valid_email_format(self):
        """Test basic email format validation."""
        is_valid, bonus, notes = EmailValidator.validate("test@example.com", check_mx=False)
        assert is_valid is True
    
    def test_invalid_email_format(self):
        """Test invalid email formats."""
        is_valid, _, _ = EmailValidator.validate("invalid.email", check_mx=False)
        assert is_valid is False
        
        is_valid, _, _ = EmailValidator.validate("@example.com", check_mx=False)
        assert is_valid is False
        
        is_valid, _, _ = EmailValidator.validate("test@", check_mx=False)
        assert is_valid is False
    
    def test_email_normalization(self):
        """Test email normalization (lowercase, strip)."""
        is_valid, _, _ = EmailValidator.validate("  Test@Example.COM  ", check_mx=False)
        assert is_valid is True


class TestPhoneValidator:
    """Test phone validation."""
    
    def test_valid_us_phone(self):
        """Test valid US phone numbers."""
        is_valid, e164, bonus, notes = PhoneValidator.validate("(202) 456-1111", "US")
        assert is_valid is True
        assert e164 is not None
        assert e164.startswith("+1")
        assert bonus > 0
    
    def test_valid_international_phone(self):
        """Test international phone number."""
        is_valid, e164, bonus, notes = PhoneValidator.validate("+44 20 7946 0958", "GB")
        assert is_valid is True
        assert e164 is not None
        assert e164.startswith("+44")
    
    def test_invalid_phone(self):
        """Test invalid phone numbers."""
        is_valid, e164, _, _ = PhoneValidator.validate("123", "US")
        assert is_valid is False
        assert e164 is None
        
        is_valid, e164, _, _ = PhoneValidator.validate("not-a-phone", "US")
        assert is_valid is False
        assert e164 is None
    
    def test_e164_format(self):
        """Test E.164 formatting."""
        is_valid, e164, _, _ = PhoneValidator.validate("202-456-1111", "US")
        assert is_valid is True
        assert e164 == "+12024561111"


class TestAddressValidator:
    """Test address validation."""
    
    def test_valid_address_with_components(self):
        """Test valid address with multiple components."""
        address = {
            "street": "123 Main St",
            "city": "Springfield",
            "region": "IL",
            "postal": "62701",
            "country": "US",
        }
        is_valid, bonus, notes = AddressValidator.validate(address)
        assert is_valid is True
        assert bonus > 0
    
    def test_partial_address(self):
        """Test address with some components missing."""
        address = {
            "street": None,
            "city": "Springfield",
            "region": "IL",
            "postal": None,
            "country": "US",
        }
        is_valid, bonus, notes = AddressValidator.validate(address)
        assert is_valid is True
    
    def test_empty_address(self):
        """Test empty address."""
        address = {
            "street": None,
            "city": None,
            "region": None,
            "postal": None,
            "country": None,
        }
        is_valid, _, _ = AddressValidator.validate(address)
        assert is_valid is False
    
    def test_us_zip_code_validation(self):
        """Test US zip code format validation."""
        address = {"city": "Test", "region": "TX", "postal": "12345"}
        is_valid, bonus, notes = AddressValidator.validate(address)
        assert is_valid is True
        assert "valid zip" in notes
        
        address = {"city": "Test", "region": "TX", "postal": "12345-6789"}
        is_valid, bonus, notes = AddressValidator.validate(address)
        assert is_valid is True
        assert "valid zip" in notes


class TestColorValidator:
    """Test color validation."""
    
    def test_valid_hex_colors(self):
        """Test valid HEX color formats."""
        is_valid, bonus, notes = ColorValidator.validate(["#FF0000", "#00FF00"])
        assert is_valid is True
    
    def test_invalid_hex_format(self):
        """Test invalid HEX formats."""
        is_valid, _, _ = ColorValidator.validate(["#FF00"])  # Too short
        assert is_valid is False
        
        is_valid, _, _ = ColorValidator.validate(["FF0000"])  # Missing #
        assert is_valid is False
        
        is_valid, _, _ = ColorValidator.validate(["#GGGGGG"])  # Invalid hex
        assert is_valid is False
    
    def test_wcag_contrast_bonus(self):
        """Test WCAG contrast validation bonus."""
        # Dark blue should have good contrast vs white
        is_valid, bonus, notes = ColorValidator.validate(["#0000FF"])
        assert is_valid is True
        # Should get bonus for passing WCAG AA
        assert bonus > 0 or "contrast" in notes
    
    def test_multiple_colors(self):
        """Test validation of multiple colors."""
        is_valid, bonus, notes = ColorValidator.validate(["#000000", "#FFFFFF"])
        assert is_valid is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

