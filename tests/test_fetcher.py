"""
Tests for web fetcher module.
"""

import pytest

from truth_extractor.crawl.fetcher import (
    extract_domain,
    is_same_domain,
    normalize_url,
)


class TestDomainExtraction:
    """Test domain extraction utilities."""
    
    def test_extract_domain(self):
        """Test extracting registered domain."""
        assert extract_domain("https://www.example.com/path") == "example.com"
        assert extract_domain("https://subdomain.example.com/path") == "example.com"
        assert extract_domain("https://example.co.uk/path") == "example.co.uk"
    
    def test_is_same_domain(self):
        """Test same-domain checking."""
        assert is_same_domain("https://www.example.com/page1", "https://example.com/page2")
        assert is_same_domain("https://sub.example.com", "https://example.com")
        assert not is_same_domain("https://example.com", "https://other.com")
        assert not is_same_domain("https://example.com", "https://example.org")


class TestURLNormalization:
    """Test URL normalization."""
    
    def test_normalize_relative_url(self):
        """Test normalizing relative URLs."""
        base = "https://example.com/page"
        
        assert normalize_url("/about", base) == "https://example.com/about"
        assert normalize_url("contact", base) == "https://example.com/contact"
        assert normalize_url("../parent", base) == "https://example.com/parent"
    
    def test_normalize_absolute_url(self):
        """Test normalizing absolute URLs."""
        base = "https://example.com/page"
        
        url = normalize_url("https://other.com/path", base)
        assert url == "https://other.com/path"
    
    def test_remove_fragment(self):
        """Test that fragments are removed."""
        base = "https://example.com"
        
        url = normalize_url("https://example.com/page#section", base)
        assert url == "https://example.com/page"
        assert "#" not in url


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


