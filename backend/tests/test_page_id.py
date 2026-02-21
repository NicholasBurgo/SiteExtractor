"""Tests for deterministic page ID generation."""

from backend.export.page_id import make_page_id, normalize_url


class TestNormalizeUrl:
    def test_strips_trailing_slash(self):
        assert (
            normalize_url("https://example.com/about/") == "https://example.com/about"
        )

    def test_keeps_root_slash(self):
        assert normalize_url("https://example.com/") == "https://example.com/"

    def test_lowercases_scheme_and_host(self):
        assert normalize_url("HTTPS://Example.COM/About") == "https://example.com/About"

    def test_removes_fragment(self):
        assert (
            normalize_url("https://example.com/page#section")
            == "https://example.com/page"
        )

    def test_removes_default_port_443(self):
        assert (
            normalize_url("https://example.com:443/page") == "https://example.com/page"
        )

    def test_removes_default_port_80(self):
        assert normalize_url("http://example.com:80/page") == "http://example.com/page"

    def test_keeps_non_default_port(self):
        assert (
            normalize_url("https://example.com:8080/page")
            == "https://example.com:8080/page"
        )

    def test_preserves_query_string(self):
        assert (
            normalize_url("https://example.com/search?q=test")
            == "https://example.com/search?q=test"
        )

    def test_decodes_percent_encoding(self):
        assert (
            normalize_url("https://example.com/%41bout") == "https://example.com/About"
        )


class TestMakePageId:
    def test_deterministic(self):
        """Same URL always produces the same page ID."""
        url = "https://example.com/about"
        assert make_page_id(url) == make_page_id(url)

    def test_length(self):
        """Page ID is 12 hex characters."""
        pid = make_page_id("https://example.com/about")
        assert len(pid) == 12
        assert all(c in "0123456789abcdef" for c in pid)

    def test_different_urls_different_ids(self):
        pid1 = make_page_id("https://example.com/about")
        pid2 = make_page_id("https://example.com/contact")
        assert pid1 != pid2

    def test_ignores_trailing_slash(self):
        """Trailing slash normalization means these produce the same ID."""
        assert make_page_id("https://example.com/about") == make_page_id(
            "https://example.com/about/"
        )

    def test_ignores_fragment(self):
        """Fragment removal means these produce the same ID."""
        assert make_page_id("https://example.com/page") == make_page_id(
            "https://example.com/page#section"
        )

    def test_case_insensitive_host(self):
        """Host case normalization means these produce the same ID."""
        assert make_page_id("https://Example.COM/path") == make_page_id(
            "https://example.com/path"
        )
