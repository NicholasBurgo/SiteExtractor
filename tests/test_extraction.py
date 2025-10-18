"""
Tests for extraction modules.
"""

import pytest

from truth_extractor.crawl.parser import HTMLParser


class TestHTMLParser:
    """Test HTML parser utilities."""
    
    def test_get_title(self):
        """Test title extraction."""
        html = "<html><head><title>Test Page</title></head><body></body></html>"
        parser = HTMLParser(html, "https://example.com")
        
        assert parser.get_title() == "Test Page"
    
    def test_get_meta_content(self):
        """Test meta tag extraction."""
        html = """
        <html>
        <head>
            <meta name="description" content="Test description">
            <meta property="og:title" content="OG Title">
        </head>
        <body></body>
        </html>
        """
        parser = HTMLParser(html, "https://example.com")
        
        assert parser.get_meta_content(name="description") == "Test description"
        assert parser.get_meta_content(property="og:title") == "OG Title"
    
    def test_find_mailto_links(self):
        """Test mailto: link extraction."""
        html = """
        <html>
        <body>
            <a href="mailto:test@example.com">Email</a>
            <a href="mailto:other@example.com?subject=Hi">Other</a>
        </body>
        </html>
        """
        parser = HTMLParser(html, "https://example.com")
        
        emails = parser.find_mailto_links()
        assert "test@example.com" in emails
        assert "other@example.com" in emails
    
    def test_find_tel_links(self):
        """Test tel: link extraction."""
        html = """
        <html>
        <body>
            <a href="tel:+15551234567">Call</a>
            <a href="tel:(555) 123-4567">Call</a>
        </body>
        </html>
        """
        parser = HTMLParser(html, "https://example.com")
        
        phones = parser.find_tel_links()
        assert len(phones) == 2
        assert "+15551234567" in phones
    
    def test_find_jsonld_scripts(self):
        """Test JSON-LD script extraction."""
        html = """
        <html>
        <head>
            <script type="application/ld+json">
            {
                "@type": "Organization",
                "name": "Test Org"
            }
            </script>
        </head>
        <body></body>
        </html>
        """
        parser = HTMLParser(html, "https://example.com")
        
        scripts = parser.find_jsonld_scripts()
        assert len(scripts) == 1
        assert "Organization" in scripts[0]


class TestBrandNameNormalization:
    """Test business name normalization."""
    
    def test_remove_llc(self):
        """Test removal of LLC suffix."""
        from truth_extractor.resolve.resolver import FieldResolver
        
        name = FieldResolver._normalize_business_name("Acme Plumbing LLC")
        assert name == "Acme Plumbing"
        
        name = FieldResolver._normalize_business_name("Acme Plumbing L.L.C.")
        assert name == "Acme Plumbing"
    
    def test_remove_inc(self):
        """Test removal of Inc. suffix."""
        from truth_extractor.resolve.resolver import FieldResolver
        
        name = FieldResolver._normalize_business_name("Acme Inc.")
        assert name == "Acme"
        
        name = FieldResolver._normalize_business_name("Acme Incorporated")
        assert name == "Acme"
    
    def test_no_suffix(self):
        """Test name without suffix."""
        from truth_extractor.resolve.resolver import FieldResolver
        
        name = FieldResolver._normalize_business_name("Acme Plumbing")
        assert name == "Acme Plumbing"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


