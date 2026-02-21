"""Tests for export bundle builder."""

import json
import os
import pytest
import tempfile
import shutil
import zipfile
from backend.export.bundle import ExportBundleBuilder


@pytest.fixture
def run_dir():
    """Create a temporary run directory with test data."""
    tmpdir = tempfile.mkdtemp()
    run_id = "test_run"
    rd = os.path.join(tmpdir, run_id)
    os.makedirs(rd, exist_ok=True)

    # Write meta.json
    with open(os.path.join(rd, "meta.json"), "w") as f:
        json.dump(
            {
                "url": "https://example.com",
                "status": "completed",
                "started_at": 1700000000,
                "completed_at": 1700000060,
            },
            f,
        )

    # Write pages.json
    with open(os.path.join(rd, "pages.json"), "w") as f:
        json.dump(
            [
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
                    "htmlExcerpt": "<html><body><h1>Welcome</h1><script>alert(1)</script></body></html>",
                    "headings": ["Welcome"],
                    "images": [
                        {
                            "url": "https://example.com/logo.png",
                            "alt": "Logo",
                            "size_bytes": 1024,
                        }
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
                    "htmlExcerpt": "<html><body><h1>About</h1></body></html>",
                    "headings": ["About"],
                    "images": [
                        {
                            "url": "https://example.com/logo.png",
                            "alt": "Logo",
                            "size_bytes": 1024,
                        }
                    ],
                    "links": [],
                },
            ],
            f,
        )

    yield tmpdir, run_id, rd
    shutil.rmtree(tmpdir)


class TestExportBundleBuilder:
    def test_build_manifest(self, run_dir):
        tmpdir, run_id, rd = run_dir
        builder = ExportBundleBuilder(run_id, data_dir=tmpdir)
        manifest = builder.build_manifest()

        assert manifest["run_id"] == run_id
        assert manifest["total_pages"] == 2
        assert manifest["url"] == "https://example.com"

    def test_build_zip_structure(self, run_dir):
        tmpdir, run_id, rd = run_dir
        builder = ExportBundleBuilder(run_id, data_dir=tmpdir)
        buf = builder.build_zip()

        with zipfile.ZipFile(buf, "r") as zf:
            names = zf.namelist()

            # Top-level files
            assert "run.json" in names
            assert "pages/index.json" in names
            assert "assets/manifest.json" in names
            assert "reports/audit.json" in names
            assert "reports/audit.md" in names
            assert "graphs/links.csv" in names
            assert "graphs/crawl_graph.json" in names

    def test_run_json(self, run_dir):
        tmpdir, run_id, rd = run_dir
        builder = ExportBundleBuilder(run_id, data_dir=tmpdir)
        buf = builder.build_zip()

        with zipfile.ZipFile(buf, "r") as zf:
            run_data = json.loads(zf.read("run.json"))
            assert run_data["run_id"] == run_id
            assert run_data["total_pages"] == 2
            assert "exported_at" in run_data

    def test_pages_have_content(self, run_dir):
        tmpdir, run_id, rd = run_dir
        builder = ExportBundleBuilder(run_id, data_dir=tmpdir)
        buf = builder.build_zip()

        with zipfile.ZipFile(buf, "r") as zf:
            index = json.loads(zf.read("pages/index.json"))
            assert len(index) == 2

            # Each page should have its files
            for page_entry in index:
                pid = page_entry["page_id"]
                assert f"pages/{pid}/page.json" in zf.namelist()
                assert f"pages/{pid}/content.md" in zf.namelist()
                assert f"pages/{pid}/content.txt" in zf.namelist()

    def test_snapshot_sanitized(self, run_dir):
        tmpdir, run_id, rd = run_dir
        builder = ExportBundleBuilder(run_id, data_dir=tmpdir)
        buf = builder.build_zip()

        with zipfile.ZipFile(buf, "r") as zf:
            index = json.loads(zf.read("pages/index.json"))
            pid = index[0]["page_id"]  # Home page
            snapshot = zf.read(f"pages/{pid}/snapshot.html").decode()

            # Script should be stripped
            assert "<script>" not in snapshot
            assert "alert(1)" not in snapshot
            # Content should remain
            assert "Welcome" in snapshot

    def test_asset_deduplication(self, run_dir):
        """Both pages reference the same logo.png — should appear once in manifest."""
        tmpdir, run_id, rd = run_dir
        builder = ExportBundleBuilder(run_id, data_dir=tmpdir)
        buf = builder.build_zip()

        with zipfile.ZipFile(buf, "r") as zf:
            manifest = json.loads(zf.read("assets/manifest.json"))
            # Only one unique asset URL
            urls = [a["original_url"] for a in manifest]
            assert len(urls) == 1
            assert urls[0] == "https://example.com/logo.png"
            # But referenced by both pages
            assert len(manifest[0]["referenced_by"]) == 2

    def test_links_csv(self, run_dir):
        tmpdir, run_id, rd = run_dir
        builder = ExportBundleBuilder(run_id, data_dir=tmpdir)
        buf = builder.build_zip()

        with zipfile.ZipFile(buf, "r") as zf:
            csv = zf.read("graphs/links.csv").decode()
            lines = csv.strip().split("\n")
            assert lines[0] == "source_url,target_url,type,status"
            # Home page has one link to /about
            assert len(lines) >= 2
