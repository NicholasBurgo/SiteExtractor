"""
Audit aggregator for extraction runs.
Produces findings from stored page data without recrawling.
"""
import json
import os
from typing import Any, Dict, List
from datetime import datetime, timezone


# Threshold for "oversized" images in bytes (500 KB)
OVERSIZED_IMAGE_THRESHOLD = 500 * 1024


class AuditAggregator:
    """
    Scans stored extraction data and produces audit findings.

    Checks:
    - Broken internal links
    - Missing or duplicate title tags
    - Missing meta descriptions
    - Missing H1
    - Images missing alt text
    - Pages with noindex
    - Oversized images (>500 KB)
    """

    def __init__(self, run_id: str, data_dir: str = "runs"):
        self.run_id = run_id
        self.run_dir = os.path.join(data_dir, run_id)
        self.pages_file = os.path.join(self.run_dir, "pages.json")

    def _load_pages(self) -> List[Dict[str, Any]]:
        """Load all extracted pages from the run store."""
        if not os.path.exists(self.pages_file):
            return []
        with open(self.pages_file, "r") as f:
            return json.load(f)

    def run_audit(self) -> Dict[str, Any]:
        """
        Run all audit checks and return structured findings.
        Returns: { findings: [...], summary: {...}, generated_at: str }
        """
        pages = self._load_pages()
        findings: List[Dict[str, Any]] = []

        # Build URL set for link checking
        known_urls = set()
        for page in pages:
            summary = page.get("summary", {})
            url = summary.get("url", "")
            if url:
                known_urls.add(url)
                # Also add without trailing slash variant
                if url.endswith("/"):
                    known_urls.add(url.rstrip("/"))
                else:
                    known_urls.add(url + "/")

        title_map: Dict[str, List[str]] = {}  # title -> [urls]

        for page in pages:
            summary = page.get("summary", {})
            meta = page.get("meta", {})
            url = summary.get("url", "")
            page_id = summary.get("pageId", "")

            # --- Missing title ---
            title = summary.get("title", "")
            if not title or not title.strip():
                findings.append({
                    "type": "missing_title",
                    "severity": "warning",
                    "url": url,
                    "page_id": page_id,
                    "message": "Page has no title tag.",
                })
            else:
                title_map.setdefault(title.strip(), []).append(url)

            # --- Missing meta description ---
            description = meta.get("description", "")
            if not description or not description.strip():
                findings.append({
                    "type": "missing_meta_description",
                    "severity": "warning",
                    "url": url,
                    "page_id": page_id,
                    "message": "Page has no meta description.",
                })

            # --- Missing H1 ---
            headings = page.get("headings", [])
            # headings can be list of strings or list of dicts
            has_h1 = False
            for h in headings:
                if isinstance(h, dict):
                    if h.get("tag", "").lower() == "h1":
                        has_h1 = True
                        break
                elif isinstance(h, str):
                    # If headings are plain strings the first is typically h1
                    has_h1 = True
                    break
            if not has_h1 and summary.get("type", "").upper() == "HTML":
                findings.append({
                    "type": "missing_h1",
                    "severity": "info",
                    "url": url,
                    "page_id": page_id,
                    "message": "Page has no H1 heading.",
                })

            # --- Images missing alt text ---
            images = page.get("images", [])
            for img in images:
                if isinstance(img, dict):
                    alt = img.get("alt", img.get("alt_text", ""))
                    img_url = img.get("url", img.get("src", ""))
                    if not alt or not alt.strip():
                        findings.append({
                            "type": "missing_alt_text",
                            "severity": "warning",
                            "url": url,
                            "page_id": page_id,
                            "resource": img_url,
                            "message": f"Image missing alt text: {img_url}",
                        })
                    # --- Oversized images ---
                    size = img.get("size_bytes", 0) or 0
                    if size > OVERSIZED_IMAGE_THRESHOLD:
                        findings.append({
                            "type": "oversized_image",
                            "severity": "info",
                            "url": url,
                            "page_id": page_id,
                            "resource": img_url,
                            "size_bytes": size,
                            "message": f"Oversized image ({size / 1024:.0f} KB): {img_url}",
                        })

            # --- Noindex ---
            robots = meta.get("robots", "")
            if "noindex" in str(robots).lower():
                findings.append({
                    "type": "noindex",
                    "severity": "info",
                    "url": url,
                    "page_id": page_id,
                    "message": "Page has noindex directive.",
                })

            # --- Broken internal links ---
            links = page.get("links", [])
            for link in links:
                link_url = link if isinstance(link, str) else link.get("url", "")
                if not link_url:
                    continue
                # Only check internal links (same domain)
                if link_url.startswith("/") or (url and link_url.startswith(url.split("/")[0] + "//" + url.split("/")[2])):
                    # Normalize for lookup
                    if link_url not in known_urls:
                        findings.append({
                            "type": "broken_internal_link",
                            "severity": "error",
                            "url": url,
                            "page_id": page_id,
                            "target": link_url,
                            "message": f"Broken internal link: {link_url}",
                        })

        # --- Duplicate titles ---
        for title, urls in title_map.items():
            if len(urls) > 1:
                findings.append({
                    "type": "duplicate_title",
                    "severity": "warning",
                    "urls": urls,
                    "title": title,
                    "message": f"Duplicate title \"{title}\" found on {len(urls)} pages.",
                })

        # Summary
        severity_counts = {"error": 0, "warning": 0, "info": 0}
        type_counts: Dict[str, int] = {}
        for f in findings:
            sev = f.get("severity", "info")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
            ftype = f.get("type", "unknown")
            type_counts[ftype] = type_counts.get(ftype, 0) + 1

        return {
            "run_id": self.run_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_pages": len(pages),
            "total_findings": len(findings),
            "severity_counts": severity_counts,
            "type_counts": type_counts,
            "findings": findings,
        }

    def generate_markdown(self, audit_data: Dict[str, Any] | None = None) -> str:
        """Generate a human-readable markdown audit report."""
        if audit_data is None:
            audit_data = self.run_audit()

        lines = [
            f"# Audit Report — Run {audit_data['run_id']}",
            f"",
            f"**Generated**: {audit_data['generated_at']}  ",
            f"**Pages scanned**: {audit_data['total_pages']}  ",
            f"**Total findings**: {audit_data['total_findings']}",
            f"",
            f"## Summary",
            f"",
            f"| Severity | Count |",
            f"|----------|-------|",
        ]
        for sev, count in audit_data["severity_counts"].items():
            lines.append(f"| {sev.capitalize()} | {count} |")
        lines.append("")

        lines.append("## Findings by Type")
        lines.append("")
        for ftype, count in sorted(audit_data["type_counts"].items()):
            lines.append(f"### {ftype.replace('_', ' ').title()} ({count})")
            lines.append("")
            type_findings = [f for f in audit_data["findings"] if f["type"] == ftype]
            for f in type_findings[:50]:  # Cap display at 50 per type
                lines.append(f"- **{f.get('severity', 'info').upper()}** {f['message']}")
                if f.get("url"):
                    lines.append(f"  - Page: {f['url']}")
            if len(type_findings) > 50:
                lines.append(f"- _...and {len(type_findings) - 50} more_")
            lines.append("")

        return "\n".join(lines)
