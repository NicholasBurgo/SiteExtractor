"""Tests for audit aggregation."""
import json
import os
import pytest
import tempfile
import shutil
from backend.export.audit import AuditAggregator


@pytest.fixture
def run_dir():
    """Create a temporary run directory with test data."""
    tmpdir = tempfile.mkdtemp()
    run_id = "test_run"
    rd = os.path.join(tmpdir, run_id)
    os.makedirs(rd, exist_ok=True)
    yield tmpdir, run_id, rd
    shutil.rmtree(tmpdir)


def write_pages(rd, pages):
    with open(os.path.join(rd, "pages.json"), "w") as f:
        json.dump(pages, f)


class TestAuditAggregator:
    def test_missing_title(self, run_dir):
        tmpdir, run_id, rd = run_dir
        write_pages(rd, [
            {
                "summary": {"url": "https://example.com/", "pageId": "p1", "title": "", "type": "HTML"},
                "meta": {"description": "A description"},
                "headings": ["Some heading"],
                "images": [],
                "links": [],
            }
        ])

        auditor = AuditAggregator(run_id, data_dir=tmpdir)
        result = auditor.run_audit()

        types = [f["type"] for f in result["findings"]]
        assert "missing_title" in types
        assert result["total_findings"] >= 1

    def test_missing_meta_description(self, run_dir):
        tmpdir, run_id, rd = run_dir
        write_pages(rd, [
            {
                "summary": {"url": "https://example.com/", "pageId": "p1", "title": "Home", "type": "HTML"},
                "meta": {},
                "headings": ["H1"],
                "images": [],
                "links": [],
            }
        ])

        auditor = AuditAggregator(run_id, data_dir=tmpdir)
        result = auditor.run_audit()

        types = [f["type"] for f in result["findings"]]
        assert "missing_meta_description" in types

    def test_missing_alt_text(self, run_dir):
        tmpdir, run_id, rd = run_dir
        write_pages(rd, [
            {
                "summary": {"url": "https://example.com/", "pageId": "p1", "title": "Home", "type": "HTML"},
                "meta": {"description": "desc"},
                "headings": ["H1"],
                "images": [{"url": "https://example.com/img.jpg", "alt": ""}],
                "links": [],
            }
        ])

        auditor = AuditAggregator(run_id, data_dir=tmpdir)
        result = auditor.run_audit()

        types = [f["type"] for f in result["findings"]]
        assert "missing_alt_text" in types

    def test_duplicate_title(self, run_dir):
        tmpdir, run_id, rd = run_dir
        write_pages(rd, [
            {
                "summary": {"url": "https://example.com/a", "pageId": "p1", "title": "Same Title", "type": "HTML"},
                "meta": {"description": "d1"},
                "headings": ["H1"],
                "images": [],
                "links": [],
            },
            {
                "summary": {"url": "https://example.com/b", "pageId": "p2", "title": "Same Title", "type": "HTML"},
                "meta": {"description": "d2"},
                "headings": ["H1"],
                "images": [],
                "links": [],
            },
        ])

        auditor = AuditAggregator(run_id, data_dir=tmpdir)
        result = auditor.run_audit()

        types = [f["type"] for f in result["findings"]]
        assert "duplicate_title" in types

    def test_noindex(self, run_dir):
        tmpdir, run_id, rd = run_dir
        write_pages(rd, [
            {
                "summary": {"url": "https://example.com/", "pageId": "p1", "title": "Home", "type": "HTML"},
                "meta": {"description": "desc", "robots": "noindex,nofollow"},
                "headings": ["H1"],
                "images": [],
                "links": [],
            }
        ])

        auditor = AuditAggregator(run_id, data_dir=tmpdir)
        result = auditor.run_audit()

        types = [f["type"] for f in result["findings"]]
        assert "noindex" in types

    def test_markdown_output(self, run_dir):
        tmpdir, run_id, rd = run_dir
        write_pages(rd, [
            {
                "summary": {"url": "https://example.com/", "pageId": "p1", "title": "", "type": "HTML"},
                "meta": {},
                "headings": [],
                "images": [],
                "links": [],
            }
        ])

        auditor = AuditAggregator(run_id, data_dir=tmpdir)
        md = auditor.generate_markdown()
        assert "# Audit Report" in md
        assert "Missing Title" in md

    def test_clean_page_no_findings(self, run_dir):
        tmpdir, run_id, rd = run_dir
        write_pages(rd, [
            {
                "summary": {"url": "https://example.com/", "pageId": "p1", "title": "Home", "type": "HTML"},
                "meta": {"description": "A great homepage"},
                "headings": ["Welcome"],
                "images": [{"url": "https://example.com/img.jpg", "alt": "Photo"}],
                "links": [],
            }
        ])

        auditor = AuditAggregator(run_id, data_dir=tmpdir)
        result = auditor.run_audit()
        assert result["total_findings"] == 0
