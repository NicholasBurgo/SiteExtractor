"""
Export bundle builder.
Creates a structured zip from extraction run data.

Zip structure:
  run.json                      — top-level metadata
  pages/
    index.json                  — list of pages
    <page_id>/
      page.json                 — structured extraction result
      snapshot.html             — sanitized HTML snapshot
      content.md                — readable main content in markdown
      content.txt               — plain text
  assets/
    manifest.json               — deduped asset manifest
    images/                     — downloaded images (when enabled)
  reports/
    audit.json                  — all audit findings
    audit.md                    — human-readable report
  graphs/
    links.csv                   — source_url, target_url, type, status
"""

import asyncio
import hashlib
import io
import json
import os
import time
import zipfile
from typing import Any, Dict, List, Optional

from backend.export.page_id import make_page_id
from backend.export.sanitizer import sanitize_html
from backend.export.audit import AuditAggregator
from backend.export.asset_discovery import (
    discover_image_urls,
    normalize_asset_url,
    is_in_scope,
)
from backend.export.asset_store import AssetStore, AssetDownloadConfig
from backend.export.md_rewriter import rewrite_markdown_images


class ExportBundleBuilder:
    """Build a downloadable zip bundle from an extraction run."""

    def __init__(self, run_id: str, data_dir: str = "runs"):
        self.run_id = run_id
        self.data_dir = data_dir
        self.run_dir = os.path.join(data_dir, run_id)

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------

    def _load_json(self, path: str) -> Any:
        if not os.path.exists(path):
            return None
        with open(path, "r") as f:
            return json.load(f)

    def _content_hash(self, data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------

    def build_manifest(self) -> Dict[str, Any]:
        """
        Return the same data that would be in run.json + counts
        for the UI preview endpoint (no zip creation).
        """
        pages = self._load_json(os.path.join(self.run_dir, "pages.json")) or []
        meta = self._load_json(os.path.join(self.run_dir, "meta.json")) or {}

        # Collect asset URLs and broken link count
        asset_urls: set = set()
        broken_links = 0
        missing_titles = 0
        missing_descriptions = 0

        for page in pages:
            summary = page.get("summary", {})
            page_meta = page.get("meta", {})

            # count images as assets
            for img in page.get("images", []):
                img_url = (
                    img if isinstance(img, str) else img.get("url", img.get("src", ""))
                )
                if img_url:
                    asset_urls.add(img_url)

            if not summary.get("title", "").strip():
                missing_titles += 1

            if not page_meta.get("description", "").strip():
                missing_descriptions += 1

        # Run a quick audit for broken link count
        auditor = AuditAggregator(self.run_id, self.data_dir)
        audit_data = auditor.run_audit()
        broken_links = audit_data["type_counts"].get("broken_internal_link", 0)

        return {
            "run_id": self.run_id,
            "url": meta.get("url", ""),
            "status": meta.get("status", "unknown"),
            "started_at": meta.get("started_at"),
            "completed_at": meta.get("completed_at"),
            "total_pages": len(pages),
            "total_assets": len(asset_urls),
            "broken_links": broken_links,
            "missing_titles": missing_titles,
            "missing_descriptions": missing_descriptions,
            "total_findings": audit_data["total_findings"],
        }

    def build_zip(
        self,
        asset_config: Optional[AssetDownloadConfig] = None,
        export_format: str = "both",
    ) -> io.BytesIO:
        """
        Build the full export zip in memory and return the BytesIO buffer.

        Args:
            asset_config: When provided and download_assets != "none",
                          downloads assets and rewrites Markdown links.
                          Default (None) preserves original lightweight behavior.
            export_format: "both" (default), "markdown", or "json".
                           Controls which per-page content files are included.
        """
        pages = self._load_json(os.path.join(self.run_dir, "pages.json")) or []
        meta = self._load_json(os.path.join(self.run_dir, "meta.json")) or {}
        base_url = meta.get("url", "")

        # Determine if we should download assets
        should_download = (
            asset_config is not None and asset_config.download_assets != "none"
        )

        # If downloading, run the async download pipeline
        asset_store: Optional[AssetStore] = None
        url_to_local: Dict[str, str] = {}

        if should_download:
            asset_store = AssetStore(asset_config, base_url)
            url_to_local = self._run_asset_downloads(
                pages,
                base_url,
                asset_store,
                asset_config,
            )

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            # ---- run.json ----
            run_json = {
                "run_id": self.run_id,
                "url": base_url,
                "status": meta.get("status", ""),
                "started_at": meta.get("started_at"),
                "completed_at": meta.get("completed_at"),
                "total_pages": len(pages),
                "exported_at": time.time(),
                "asset_download": asset_config.download_assets
                if asset_config
                else "none",
                "format": export_format,
            }
            zf.writestr("run.json", json.dumps(run_json, indent=2))

            # ---- pages/ ----
            pages_index: List[Dict[str, Any]] = []
            asset_registry: Dict[str, Dict[str, Any]] = {}  # sha256 -> info

            for page in pages:
                summary = page.get("summary", {})
                url = summary.get("url", "")
                pid = make_page_id(url) if url else summary.get("pageId", "unknown")
                title = summary.get("title", "")
                status = summary.get("status")

                # Build page index entry
                text = page.get("text", "") or ""
                content_hash = self._content_hash(text.encode("utf-8"))
                pages_index.append(
                    {
                        "page_id": pid,
                        "url": url,
                        "title": title,
                        "status": status,
                        "content_hash": content_hash,
                    }
                )

                include_json = export_format in ("both", "json")
                include_md = export_format in ("both", "markdown")

                # page.json — full structured data
                if include_json:
                    zf.writestr(
                        f"pages/{pid}/page.json",
                        json.dumps(page, indent=2, default=str),
                    )

                # snapshot.html
                html_excerpt = page.get("htmlExcerpt", "") or ""
                if html_excerpt:
                    sanitized = sanitize_html(html_excerpt)
                    zf.writestr(f"pages/{pid}/snapshot.html", sanitized)

                # content.md — with optional asset rewriting
                if include_md:
                    md_lines = []
                    if title:
                        md_lines.append(f"# {title}\n")

                    # Add image references in markdown
                    for img in page.get("images", []):
                        if isinstance(img, str):
                            img_url = img
                            img_alt = ""
                        else:
                            img_url = img.get("url", img.get("src", ""))
                            img_alt = img.get("alt", img.get("alt_text", ""))

                        if img_url:
                            md_lines.append(f"![{img_alt or ''}]({img_url})")

                    if text:
                        md_lines.append("")
                        md_lines.append(text)

                    md_content = "\n".join(md_lines)

                    # Rewrite image links if assets were downloaded
                    if should_download and url_to_local:
                        page_dir = f"pages/{pid}"
                        md_content = rewrite_markdown_images(
                            md_content,
                            url_to_local,
                            page_dir,
                        )

                    zf.writestr(f"pages/{pid}/content.md", md_content)

                # content.txt
                zf.writestr(f"pages/{pid}/content.txt", text)

                # Collect assets for manifest (when NOT downloading)
                if not should_download:
                    for img in page.get("images", []):
                        if isinstance(img, str):
                            img_url = img
                            img_info = {"url": img}
                        else:
                            img_url = img.get("url", img.get("src", ""))
                            img_info = img

                        if img_url:
                            ahash = self._content_hash(img_url.encode("utf-8"))
                            if ahash not in asset_registry:
                                asset_registry[ahash] = {
                                    "original_url": img_url,
                                    "sha256": ahash,
                                    "mime": img_info.get("mime_type", "image/unknown"),
                                    "size": img_info.get("size_bytes"),
                                    "referenced_by": [],
                                }
                            asset_registry[ahash]["referenced_by"].append(url)

            # pages/index.json
            zf.writestr("pages/index.json", json.dumps(pages_index, indent=2))

            # ---- assets/ ----
            if should_download and asset_store is not None:
                # Write downloaded asset files into the zip
                for entry in asset_store.get_downloaded_manifest():
                    file_data = asset_store.get_file_data(entry["sha256"])
                    if file_data:
                        zf.writestr(entry["local_path"], file_data)

                # Write full manifest (downloaded + skipped)
                asset_manifest = asset_store.get_manifest()
            else:
                asset_manifest = list(asset_registry.values())

            zf.writestr(
                "assets/manifest.json",
                json.dumps(asset_manifest, indent=2, default=str),
            )

            # ---- reports/ ----
            auditor = AuditAggregator(self.run_id, self.data_dir)
            audit_data = auditor.run_audit()
            zf.writestr("reports/audit.json", json.dumps(audit_data, indent=2))
            zf.writestr("reports/audit.md", auditor.generate_markdown(audit_data))

            # ---- graphs/ ----
            # links.csv
            csv_lines = ["source_url,target_url,type,status"]
            for page in pages:
                summary = page.get("summary", {})
                src_url = summary.get("url", "")
                for link in page.get("links", []):
                    if isinstance(link, str):
                        link_url = link
                    else:
                        link_url = link.get("url", "")
                    if link_url:
                        link_type = (
                            "internal" if link_url.startswith("/") else "external"
                        )
                        csv_lines.append(f"{src_url},{link_url},{link_type},")
            zf.writestr("graphs/links.csv", "\n".join(csv_lines))

            # crawl_graph.json
            crawl_graph = {
                "nodes": [
                    {
                        "id": make_page_id(p.get("summary", {}).get("url", "")),
                        "url": p.get("summary", {}).get("url", ""),
                    }
                    for p in pages
                    if p.get("summary", {}).get("url")
                ],
                "edges": [],
            }
            for page in pages:
                src = page.get("summary", {}).get("url", "")
                if not src:
                    continue
                src_id = make_page_id(src)
                for link in page.get("links", []):
                    tgt = link if isinstance(link, str) else link.get("url", "")
                    if tgt:
                        crawl_graph["edges"].append(
                            {
                                "source": src_id,
                                "target": make_page_id(tgt),
                            }
                        )
            zf.writestr("graphs/crawl_graph.json", json.dumps(crawl_graph, indent=2))

        buf.seek(0)
        return buf

    # ------------------------------------------------------------------
    # Asset download pipeline
    # ------------------------------------------------------------------

    def _run_asset_downloads(
        self,
        pages: List[Dict[str, Any]],
        base_url: str,
        asset_store: AssetStore,
        config: AssetDownloadConfig,
    ) -> Dict[str, str]:
        """
        Discover and download assets from all pages.
        Returns url_to_local mapping for markdown rewriting.
        """
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            # We're inside an async context (e.g. FastAPI).
            # Create a new loop in a thread to avoid deadlock.
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(
                    asyncio.run,
                    self._async_download_all(pages, base_url, asset_store, config),
                )
                return future.result()
        else:
            return asyncio.run(
                self._async_download_all(pages, base_url, asset_store, config),
            )

    async def _async_download_all(
        self,
        pages: List[Dict[str, Any]],
        base_url: str,
        asset_store: AssetStore,
        config: AssetDownloadConfig,
    ) -> Dict[str, str]:
        """Async coroutine that downloads all in-scope assets."""
        import httpx

        async with httpx.AsyncClient(
            timeout=config.request_timeout,
            follow_redirects=True,
        ) as client:
            for page in pages:
                summary = page.get("summary", {})
                page_url = summary.get("url", "")
                pid = (
                    make_page_id(page_url)
                    if page_url
                    else summary.get("pageId", "unknown")
                )

                # Discover candidate image URLs
                candidates = discover_image_urls(page)

                for candidate in candidates:
                    raw_url = candidate["url"]

                    # Normalize relative URLs
                    abs_url = normalize_asset_url(page_url, raw_url)
                    if not abs_url:
                        continue

                    # Scope check
                    if not is_in_scope(abs_url, base_url, config.assets_scope):
                        continue

                    # Download and store
                    await asset_store.download_and_store(abs_url, pid, client)

        return asset_store.get_url_to_local_map()
