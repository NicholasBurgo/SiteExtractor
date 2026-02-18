"""
Extraction summary — neutral counts only.
No severity, no findings, no scoring. Just facts about what was extracted.
"""
import json
import os
from typing import Any, Dict, List
from datetime import datetime, timezone


class ExtractionSummary:
    """
    Produces neutral counts from stored extraction data.
    No judgments, no grading — only quantities.
    """

    def __init__(self, run_id: str, data_dir: str = "runs"):
        self.run_id = run_id
        self.run_dir = os.path.join(data_dir, run_id)
        self.pages_file = os.path.join(self.run_dir, "pages.json")

    def _load_pages(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.pages_file):
            return []
        with open(self.pages_file, "r") as f:
            return json.load(f)

    def build(self) -> Dict[str, Any]:
        """
        Build neutral extraction summary.
        Returns counts of: pages, assets, links, images, scripts,
        stylesheets, forms, schema_types.
        """
        pages = self._load_pages()

        total_links = 0
        total_images = 0
        total_scripts = 0
        total_stylesheets = 0
        total_forms = 0
        schema_types: set = set()
        asset_urls: set = set()
        internal_links: set = set()
        external_links: set = set()

        for page in pages:
            summary = page.get("summary", {})
            meta = page.get("meta", {})
            url = summary.get("url", "")

            # Links
            links = page.get("links", [])
            total_links += len(links)
            for link in links:
                link_url = link if isinstance(link, str) else link.get("url", "")
                if link_url:
                    if link_url.startswith("/") or (url and link_url.startswith(url.split("//")[0])):
                        internal_links.add(link_url)
                    else:
                        external_links.add(link_url)

            # Images
            images = page.get("images", [])
            total_images += len(images)
            for img in images:
                img_url = img if isinstance(img, str) else img.get("url", img.get("src", ""))
                if img_url:
                    asset_urls.add(img_url)

            # Scripts (from meta or structured data)
            scripts = meta.get("scripts", [])
            total_scripts += len(scripts) if isinstance(scripts, list) else 0

            # Stylesheets
            stylesheets = meta.get("stylesheets", [])
            total_stylesheets += len(stylesheets) if isinstance(stylesheets, list) else 0

            # Forms
            forms = meta.get("forms", [])
            total_forms += len(forms) if isinstance(forms, list) else 0

            # Structured data / schema types
            structured = page.get("structuredData", [])
            for sd in structured:
                if isinstance(sd, dict):
                    st = sd.get("@type", sd.get("type", ""))
                    if st:
                        schema_types.add(st)

        return {
            "run_id": self.run_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "pages": len(pages),
            "assets": len(asset_urls),
            "links": {
                "total": total_links,
                "internal": len(internal_links),
                "external": len(external_links),
            },
            "images": total_images,
            "scripts": total_scripts,
            "stylesheets": total_stylesheets,
            "forms": total_forms,
            "schema_types": sorted(schema_types),
        }
