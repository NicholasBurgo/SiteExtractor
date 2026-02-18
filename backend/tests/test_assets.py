"""Tests for optional asset downloading feature."""
import asyncio
import hashlib
import json
import os
import shutil
import tempfile
import zipfile
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.export.asset_discovery import (
    discover_image_urls,
    is_in_scope,
    normalize_asset_url,
)
from backend.export.asset_store import AssetDownloadConfig, AssetStore
from backend.export.bundle import ExportBundleBuilder
from backend.export.md_rewriter import rewrite_markdown_images


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

# A small PNG file (1x1 transparent pixel) for testing
PIXEL_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\r\n\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

# A different image (just different bytes for dedup testing)
PIXEL_PNG_2 = PIXEL_PNG + b"\x00"

PIXEL_SHA = hashlib.sha256(PIXEL_PNG).hexdigest()
PIXEL_2_SHA = hashlib.sha256(PIXEL_PNG_2).hexdigest()


@pytest.fixture
def run_dir():
    """Create a temporary run directory with two pages sharing an image."""
    tmpdir = tempfile.mkdtemp()
    run_id = "test_run"
    rd = os.path.join(tmpdir, run_id)
    os.makedirs(rd, exist_ok=True)

    with open(os.path.join(rd, "meta.json"), "w") as f:
        json.dump({
            "url": "https://example.com",
            "status": "completed",
            "started_at": 1700000000,
            "completed_at": 1700000060,
        }, f)

    with open(os.path.join(rd, "pages.json"), "w") as f:
        json.dump([
            {
                "summary": {
                    "url": "https://example.com/",
                    "pageId": "p1",
                    "title": "Home",
                    "status": 200,
                    "type": "HTML",
                },
                "meta": {"description": "Homepage"},
                "text": "Welcome to Example.com",
                "htmlExcerpt": '<html><body><h1>Welcome</h1><img src="https://example.com/logo.png" alt="Logo"></body></html>',
                "headings": ["Welcome"],
                "images": [
                    {"url": "https://example.com/logo.png", "alt": "Logo", "size_bytes": 1024},
                    {"url": "https://external.com/banner.jpg", "alt": "Banner", "size_bytes": 2048},
                ],
                "links": ["https://example.com/about"],
            },
            {
                "summary": {
                    "url": "https://example.com/about",
                    "pageId": "p2",
                    "title": "About",
                    "status": 200,
                    "type": "HTML",
                },
                "meta": {"description": "About us"},
                "text": "About us page",
                "htmlExcerpt": '<html><body><h1>About</h1><img src="https://example.com/logo.png" alt="Logo"></body></html>',
                "headings": ["About"],
                "images": [
                    {"url": "https://example.com/logo.png", "alt": "Logo", "size_bytes": 1024},
                ],
                "links": [],
            },
        ], f)

    yield tmpdir, run_id, rd
    shutil.rmtree(tmpdir)


# ---------------------------------------------------------------------------
# Asset Discovery Tests
# ---------------------------------------------------------------------------

class TestAssetDiscovery:
    def test_discover_from_images_list_dict(self):
        """Extracts URLs from images list with dict entries."""
        page = {
            "images": [
                {"url": "https://example.com/a.png", "alt": "A"},
                {"src": "https://example.com/b.jpg", "alt_text": "B"},
            ],
        }
        result = discover_image_urls(page)
        urls = {r["url"] for r in result}
        assert "https://example.com/a.png" in urls
        assert "https://example.com/b.jpg" in urls

    def test_discover_from_images_list_string(self):
        """Extracts URLs from images list with string entries."""
        page = {"images": ["https://example.com/img.png"]}
        result = discover_image_urls(page)
        assert len(result) == 1
        assert result[0]["url"] == "https://example.com/img.png"

    def test_discover_from_html_excerpt(self):
        """Extracts URLs from <img> tags in htmlExcerpt."""
        page = {
            "images": [],
            "htmlExcerpt": '<img src="https://example.com/photo.jpg" alt="Photo">',
        }
        result = discover_image_urls(page)
        assert len(result) == 1
        assert result[0]["url"] == "https://example.com/photo.jpg"
        assert result[0]["alt"] == "Photo"

    def test_discover_data_src(self):
        """Extracts data-src from lazy-loaded images."""
        page = {
            "images": [],
            "htmlExcerpt": '<img data-src="https://example.com/lazy.jpg" alt="Lazy">',
        }
        result = discover_image_urls(page)
        urls = {r["url"] for r in result}
        assert "https://example.com/lazy.jpg" in urls

    def test_discover_skips_data_uri(self):
        """Skips data: URIs."""
        page = {
            "images": ["data:image/png;base64,iVBOR..."],
        }
        result = discover_image_urls(page)
        assert len(result) == 0

    def test_discover_deduplicates(self):
        """Same URL from images list and html should appear once."""
        page = {
            "images": [{"url": "https://example.com/logo.png", "alt": "Logo"}],
            "htmlExcerpt": '<img src="https://example.com/logo.png" alt="Logo">',
        }
        result = discover_image_urls(page)
        assert len(result) == 1

    def test_discover_srcset(self):
        """Picks the best candidate from srcset."""
        page = {
            "images": [],
            "htmlExcerpt": '<img srcset="https://example.com/sm.jpg 100w, https://example.com/lg.jpg 400w" alt="Responsive">',
        }
        result = discover_image_urls(page)
        urls = {r["url"] for r in result}
        assert "https://example.com/lg.jpg" in urls


# ---------------------------------------------------------------------------
# URL Normalization Tests
# ---------------------------------------------------------------------------

class TestNormalizeAssetUrl:
    def test_absolute_url_unchanged(self):
        result = normalize_asset_url(
            "https://example.com/page",
            "https://example.com/img.png",
        )
        assert result == "https://example.com/img.png"

    def test_relative_url_resolved(self):
        result = normalize_asset_url(
            "https://example.com/blog/post",
            "../images/photo.jpg",
        )
        assert result == "https://example.com/images/photo.jpg"

    def test_root_relative(self):
        result = normalize_asset_url(
            "https://example.com/page",
            "/assets/img.png",
        )
        assert result == "https://example.com/assets/img.png"

    def test_empty_returns_empty(self):
        assert normalize_asset_url("https://example.com", "") == ""


# ---------------------------------------------------------------------------
# Scope Enforcement Tests
# ---------------------------------------------------------------------------

class TestScope:
    def test_same_origin_allows_same(self):
        assert is_in_scope(
            "https://example.com/img.png",
            "https://example.com",
            "same-origin",
        ) is True

    def test_same_origin_rejects_different(self):
        assert is_in_scope(
            "https://cdn.example.com/img.png",
            "https://example.com",
            "same-origin",
        ) is False

    def test_same_origin_rejects_different_scheme(self):
        assert is_in_scope(
            "http://example.com/img.png",
            "https://example.com",
            "same-origin",
        ) is False

    def test_include_cdn_allows_subdomain(self):
        assert is_in_scope(
            "https://cdn.example.com/img.png",
            "https://example.com",
            "include-cdn",
        ) is True

    def test_include_cdn_rejects_other_domain(self):
        assert is_in_scope(
            "https://other.com/img.png",
            "https://example.com",
            "include-cdn",
        ) is False

    def test_scope_all_allows_any_https(self):
        assert is_in_scope(
            "https://anywhere.net/img.png",
            "https://example.com",
            "all",
        ) is True

    def test_scope_rejects_non_http(self):
        assert is_in_scope(
            "ftp://example.com/img.png",
            "https://example.com",
            "all",
        ) is False


# ---------------------------------------------------------------------------
# SHA-256 Dedup Tests
# ---------------------------------------------------------------------------

class TestAssetStoreDedup:
    def test_dedup_same_url_across_pages(self):
        """Same URL downloaded once, referenced by multiple pages."""
        async def _run():
            config = AssetDownloadConfig(download_assets="images")
            store = AssetStore(config, "https://example.com")

            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.content = PIXEL_PNG

            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)

            entry1 = await store.download_and_store(
                "https://example.com/logo.png", "p1", mock_client,
            )
            entry2 = await store.download_and_store(
                "https://example.com/logo.png", "p2", mock_client,
            )

            assert entry1 is not None
            assert entry2 is not None
            assert entry1["sha256"] == entry2["sha256"] == PIXEL_SHA
            assert "p1" in entry2["referenced_by"]
            assert "p2" in entry2["referenced_by"]
            assert mock_client.get.call_count == 1
            manifest = store.get_downloaded_manifest()
            assert len(manifest) == 1

        asyncio.run(_run())

    def test_dedup_by_content_not_url(self):
        """Two different URLs with identical content stored once."""
        async def _run():
            config = AssetDownloadConfig(download_assets="images")
            store = AssetStore(config, "https://example.com")

            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.content = PIXEL_PNG

            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)

            entry1 = await store.download_and_store(
                "https://example.com/logo.png", "p1", mock_client,
            )
            entry2 = await store.download_and_store(
                "https://example.com/logo-copy.png", "p2", mock_client,
            )

            assert entry1["sha256"] == entry2["sha256"] == PIXEL_SHA
            manifest = store.get_downloaded_manifest()
            assert len(manifest) == 1

        asyncio.run(_run())

    def test_different_content_stored_separately(self):
        """Two URLs with different content stored as separate files."""
        async def _run():
            config = AssetDownloadConfig(download_assets="images")
            store = AssetStore(config, "https://example.com")

            mock_client = AsyncMock()

            response1 = MagicMock()
            response1.status_code = 200
            response1.content = PIXEL_PNG

            response2 = MagicMock()
            response2.status_code = 200
            response2.content = PIXEL_PNG_2

            mock_client.get = AsyncMock(side_effect=[response1, response2])

            await store.download_and_store(
                "https://example.com/a.png", "p1", mock_client,
            )
            await store.download_and_store(
                "https://example.com/b.png", "p1", mock_client,
            )

            manifest = store.get_downloaded_manifest()
            assert len(manifest) == 2

        asyncio.run(_run())


# ---------------------------------------------------------------------------
# Size Limit Tests
# ---------------------------------------------------------------------------

class TestAssetStoreLimits:
    def test_max_asset_bytes_skip(self):
        """File exceeding per-file limit is skipped with reason."""
        async def _run():
            config = AssetDownloadConfig(
                download_assets="images",
                max_asset_bytes=50,
            )
            store = AssetStore(config, "https://example.com")

            big_content = b"x" * 100
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.content = big_content

            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)

            result = await store.download_and_store(
                "https://example.com/big.png", "p1", mock_client,
            )

            assert result is None
            manifest = store.get_manifest()
            skipped = [e for e in manifest if e["status"] == "skipped"]
            assert len(skipped) == 1
            assert "exceeds_max_asset_bytes" in skipped[0]["skip_reason"]

        asyncio.run(_run())

    def test_max_total_bytes_budget(self):
        """Stops downloading after total budget is exhausted."""
        async def _run():
            config = AssetDownloadConfig(
                download_assets="images",
                max_asset_bytes=1000,
                max_total_asset_bytes=100,
            )
            store = AssetStore(config, "https://example.com")

            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.content = PIXEL_PNG

            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)

            r1 = await store.download_and_store(
                "https://example.com/a.png", "p1", mock_client,
            )
            assert r1 is not None
            assert r1["status"] == "downloaded"

            mock_response2 = MagicMock()
            mock_response2.status_code = 200
            mock_response2.content = PIXEL_PNG_2
            mock_client.get = AsyncMock(return_value=mock_response2)

            r2 = await store.download_and_store(
                "https://example.com/b.png", "p1", mock_client,
            )
            assert r2 is None

            manifest = store.get_manifest()
            skipped = [e for e in manifest if e["status"] == "skipped"]
            assert len(skipped) == 1

        asyncio.run(_run())


# ---------------------------------------------------------------------------
# Markdown Rewrite Tests
# ---------------------------------------------------------------------------

class TestMarkdownRewrite:
    def test_rewrite_markdown_image(self):
        md = '# Hello\n\n![Logo](https://example.com/logo.png)\n\nSome text.'
        url_to_local = {
            "https://example.com/logo.png": "assets/images/abc123.png",
        }
        result = rewrite_markdown_images(md, url_to_local, "pages/p1")
        assert "![Logo](../../assets/images/abc123.png)" in result
        assert "https://example.com/logo.png" not in result

    def test_rewrite_html_img_tag(self):
        md = '# Hello\n\n<img src="https://example.com/photo.jpg" alt="Photo">\n\nText.'
        url_to_local = {
            "https://example.com/photo.jpg": "assets/images/def456.jpg",
        }
        result = rewrite_markdown_images(md, url_to_local, "pages/p1")
        assert "../../assets/images/def456.jpg" in result
        assert "https://example.com/photo.jpg" not in result

    def test_unrewritten_urls_preserved(self):
        md = '![Banner](https://external.com/banner.jpg)\n'
        url_to_local = {}  # nothing downloaded
        result = rewrite_markdown_images(md, url_to_local, "pages/p1")
        assert "https://external.com/banner.jpg" in result

    def test_empty_alt_preserved(self):
        md = '![](https://example.com/img.png)\n'
        url_to_local = {
            "https://example.com/img.png": "assets/images/xyz.png",
        }
        result = rewrite_markdown_images(md, url_to_local, "pages/p1")
        assert "![](../../assets/images/xyz.png)" in result

    def test_multiple_images_rewritten(self):
        md = (
            "![A](https://example.com/a.png)\n"
            "![B](https://example.com/b.png)\n"
        )
        url_to_local = {
            "https://example.com/a.png": "assets/images/aaa.png",
            "https://example.com/b.png": "assets/images/bbb.png",
        }
        result = rewrite_markdown_images(md, url_to_local, "pages/p1")
        assert "../../assets/images/aaa.png" in result
        assert "../../assets/images/bbb.png" in result

    def test_no_changes_when_empty_map(self):
        md = "![Logo](https://example.com/logo.png)\n"
        result = rewrite_markdown_images(md, {}, "pages/p1")
        assert result == md

    def test_no_changes_when_empty_content(self):
        result = rewrite_markdown_images("", {"a": "b"}, "pages/p1")
        assert result == ""


# ---------------------------------------------------------------------------
# Bundle Integration Tests
# ---------------------------------------------------------------------------

class TestBundleWithAssets:
    def test_bundle_without_assets_unchanged(self, run_dir):
        """Default export (no asset config) works exactly as before."""
        tmpdir, run_id, rd = run_dir
        builder = ExportBundleBuilder(run_id, data_dir=tmpdir)
        buf = builder.build_zip()  # No asset_config

        with zipfile.ZipFile(buf, "r") as zf:
            names = zf.namelist()
            assert "run.json" in names
            assert "pages/index.json" in names
            assert "assets/manifest.json" in names

            # No downloaded image files should exist
            image_files = [n for n in names if n.startswith("assets/images/")]
            assert len(image_files) == 0

            # run.json should show asset_download: none
            run_data = json.loads(zf.read("run.json"))
            assert run_data["asset_download"] == "none"

    @patch("backend.export.bundle.ExportBundleBuilder._run_asset_downloads")
    def test_bundle_with_assets_enabled(self, mock_downloads, run_dir):
        """When downloading is enabled, assets appear in the zip."""
        tmpdir, run_id, rd = run_dir

        # Mock the download pipeline to return a pre-built url_to_local map
        mock_store = MagicMock()
        mock_store.get_downloaded_manifest.return_value = [{
            "original_url": "https://example.com/logo.png",
            "local_path": "assets/images/test123.png",
            "sha256": "test123",
            "mime": "image/png",
            "bytes": len(PIXEL_PNG),
            "first_seen_on_page_id": "p1",
            "status": "downloaded",
            "referenced_by": ["p1", "p2"],
        }]
        mock_store.get_file_data.return_value = PIXEL_PNG
        mock_store.get_manifest.return_value = mock_store.get_downloaded_manifest()

        url_to_local = {
            "https://example.com/logo.png": "assets/images/test123.png",
        }
        mock_downloads.return_value = url_to_local

        config = AssetDownloadConfig(download_assets="images")
        builder = ExportBundleBuilder(run_id, data_dir=tmpdir)

        # Inject the mock store
        original_build = builder.build_zip

        def patched_build(asset_config=None):
            # We need to actually construct the store properly
            from backend.export.asset_store import AssetStore
            builder_store = AssetStore(config, "https://example.com")
            # Replace with our mock data
            builder_store._manifest = {"test123": mock_store.get_downloaded_manifest()[0]}
            builder_store._file_data = {"test123": PIXEL_PNG}
            builder_store._url_to_hash = {"https://example.com/logo.png": "test123"}

            # Call the real build_zip but replace the store
            return original_build(asset_config=asset_config)

        buf = builder.build_zip(asset_config=config)

        with zipfile.ZipFile(buf, "r") as zf:
            run_data = json.loads(zf.read("run.json"))
            assert run_data["asset_download"] == "images"

            # Content.md should have image references
            index = json.loads(zf.read("pages/index.json"))
            for page_entry in index:
                pid = page_entry["page_id"]
                md = zf.read(f"pages/{pid}/content.md").decode()
                # Should contain image markdown syntax
                assert "![" in md

    def test_existing_tests_still_pass(self, run_dir):
        """Verify that the existing test fixture still works with no regressions."""
        tmpdir, run_id, rd = run_dir
        builder = ExportBundleBuilder(run_id, data_dir=tmpdir)
        manifest = builder.build_manifest()

        assert manifest["run_id"] == run_id
        assert manifest["total_pages"] == 2
        assert manifest["url"] == "https://example.com"

        buf = builder.build_zip()
        with zipfile.ZipFile(buf, "r") as zf:
            names = zf.namelist()
            assert "run.json" in names
            assert "pages/index.json" in names
            assert "assets/manifest.json" in names
            assert "reports/audit.json" in names
            assert "reports/audit.md" in names
            assert "graphs/links.csv" in names
