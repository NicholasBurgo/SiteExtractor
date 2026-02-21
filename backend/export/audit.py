"""
Audit aggregator — scans extracted pages for quality issues.

Findings are keyed by type:
  missing_title             — page has no <title>
  missing_meta_description  — page has no meta description
  broken_internal_link      — page returned HTTP 4xx/5xx
  missing_alt_text          — image element has no alt text
"""

import json
import os
from typing import Any, Dict, List


class AuditAggregator:
    def __init__(self, run_id: str, data_dir: str = "runs"):
        self.run_id = run_id
        self.run_dir = os.path.join(data_dir, run_id)

    def _load_pages(self) -> List[Dict[str, Any]]:
        pages_file = os.path.join(self.run_dir, "pages.json")
        if not os.path.exists(pages_file):
            return []
        with open(pages_file, "r") as f:
            return json.load(f)

    def run_audit(self) -> Dict[str, Any]:
        pages = self._load_pages()
        findings: List[Dict[str, Any]] = []

        for page in pages:
            summary = page.get("summary", {})
            url = summary.get("url", "")
            page_meta = page.get("meta", {})

            if not summary.get("title", "").strip():
                findings.append(
                    {
                        "type": "missing_title",
                        "url": url,
                        "message": "Page has no title",
                    }
                )

            if not page_meta.get("description", "").strip():
                findings.append(
                    {
                        "type": "missing_meta_description",
                        "url": url,
                        "message": "Page has no meta description",
                    }
                )

            status = summary.get("status")
            if isinstance(status, int) and status >= 400:
                findings.append(
                    {
                        "type": "broken_internal_link",
                        "url": url,
                        "message": f"Page returned HTTP {status}",
                    }
                )

            for img in page.get("images", []):
                if isinstance(img, dict):
                    alt = img.get("alt", img.get("alt_text", ""))
                    if not (alt or "").strip():
                        img_url = img.get("url", img.get("src", ""))
                        findings.append(
                            {
                                "type": "missing_alt_text",
                                "url": url,
                                "message": f"Image missing alt text: {img_url}",
                            }
                        )

        type_counts: Dict[str, int] = {}
        for f in findings:
            type_counts[f["type"]] = type_counts.get(f["type"], 0) + 1

        return {
            "run_id": self.run_id,
            "total_findings": len(findings),
            "type_counts": type_counts,
            "findings": findings,
        }

    def generate_markdown(self, audit_data: Dict[str, Any]) -> str:
        lines = [
            f"# Audit Report — {audit_data['run_id']}",
            "",
            f"**Total findings:** {audit_data['total_findings']}",
            "",
        ]

        type_counts = audit_data.get("type_counts", {})
        if type_counts:
            lines += ["## Summary by Type", ""]
            for t, count in sorted(type_counts.items()):
                lines.append(f"- `{t}`: {count}")
            lines.append("")

        findings = audit_data.get("findings", [])
        if findings:
            lines += ["## All Findings", ""]
            for finding in findings:
                lines.append(
                    f"- **[{finding['type']}]** {finding['url']} — {finding['message']}"
                )
            lines.append("")

        return "\n".join(lines)
