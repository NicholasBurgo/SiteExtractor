"""
Asset downloader with content-hash deduplication.
Downloads images (and optionally other assets) and stores them
keyed by SHA-256 of their content bytes.
"""
import hashlib
import mimetypes
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)


@dataclass
class AssetDownloadConfig:
    """Configuration for asset downloading."""
    download_assets: str = "none"          # none | images | all
    assets_scope: str = "same-origin"      # same-origin | include-cdn | all
    max_asset_bytes: int = 5_242_880       # 5 MB per file
    max_total_asset_bytes: int = 104_857_600  # 100 MB total
    request_timeout: int = 15             # seconds per request
    max_retries: int = 2
    assets_dir: str = "assets"


# HTTP status codes that warrant a retry
_RETRYABLE_STATUS_CODES = {500, 502, 503, 504}


class AssetStore:
    """
    Downloads and deduplicates assets by content SHA-256.

    Files are stored in memory (for zip building) keyed by sha256.
    Manifest tracks all original URLs, local paths, and metadata.
    """

    def __init__(self, config: AssetDownloadConfig, base_origin: str):
        self.config = config
        self.base_origin = base_origin

        # sha256 -> file bytes
        self._file_data: Dict[str, bytes] = {}

        # sha256 -> manifest entry
        self._manifest: Dict[str, Dict[str, Any]] = {}

        # original_url -> sha256 (for quick lookup)
        self._url_to_hash: Dict[str, str] = {}

        # Skipped entries (not keyed by hash)
        self._skipped: List[Dict[str, Any]] = []

        # Running total of downloaded bytes
        self._total_bytes: int = 0

    async def download_and_store(
        self,
        url: str,
        page_id: str,
        client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Download an asset and store it, deduplicating by content hash.

        Returns the manifest entry dict, or None if skipped/failed.
        If the URL was already downloaded, updates referenced_by and returns
        the existing entry.
        """
        # Already downloaded this exact URL?
        if url in self._url_to_hash:
            sha = self._url_to_hash[url]
            entry = self._manifest[sha]
            if page_id not in entry["referenced_by"]:
                entry["referenced_by"].append(page_id)
            return entry

        # Budget exhausted?
        if self._total_bytes >= self.config.max_total_asset_bytes:
            self._record_skipped(url, page_id, "total_budget_exhausted")
            return None

        # Download
        own_client = client is None
        if own_client:
            client = httpx.AsyncClient(
                timeout=self.config.request_timeout,
                follow_redirects=True,
            )

        try:
            data = await self._fetch_with_retry(client, url, page_id)
            if data is None:
                return None

            # Check per-file size
            if len(data) > self.config.max_asset_bytes:
                self._record_skipped(
                    url, page_id,
                    f"exceeds_max_asset_bytes ({len(data)} > {self.config.max_asset_bytes})",
                )
                return None

            # Check total budget
            if self._total_bytes + len(data) > self.config.max_total_asset_bytes:
                self._record_skipped(url, page_id, "total_budget_exhausted")
                return None

            # Compute content hash
            sha = hashlib.sha256(data).hexdigest()

            # Deduplicate by content hash
            if sha in self._manifest:
                # Same content, different URL
                self._url_to_hash[url] = sha
                entry = self._manifest[sha]
                if page_id not in entry["referenced_by"]:
                    entry["referenced_by"].append(page_id)
                return entry

            # Determine extension and mime
            mime, ext = self._guess_type(url)
            local_path = f"{self.config.assets_dir}/images/{sha}{ext}"

            entry = {
                "original_url": url,
                "local_path": local_path,
                "sha256": sha,
                "mime": mime,
                "bytes": len(data),
                "first_seen_on_page_id": page_id,
                "status": "downloaded",
                "referenced_by": [page_id],
            }

            self._file_data[sha] = data
            self._manifest[sha] = entry
            self._url_to_hash[url] = sha
            self._total_bytes += len(data)

            return entry

        except Exception as exc:
            logger.warning("Failed to download asset %s: %s", url, exc)
            self._record_skipped(url, page_id, f"error: {type(exc).__name__}: {exc}")
            return None
        finally:
            if own_client:
                await client.aclose()

    def get_manifest(self) -> List[Dict[str, Any]]:
        """Return the full asset manifest (downloaded + skipped)."""
        downloaded = list(self._manifest.values())
        return downloaded + self._skipped

    def get_downloaded_manifest(self) -> List[Dict[str, Any]]:
        """Return only successfully downloaded asset entries."""
        return list(self._manifest.values())

    def get_file_data(self, sha256: str) -> Optional[bytes]:
        """Return stored file bytes for a given content hash."""
        return self._file_data.get(sha256)

    def get_local_path(self, original_url: str) -> Optional[str]:
        """Return the local path for a downloaded asset, or None."""
        sha = self._url_to_hash.get(original_url)
        if sha and sha in self._manifest:
            return self._manifest[sha]["local_path"]
        return None

    def get_url_to_local_map(self) -> Dict[str, str]:
        """Return a mapping of original_url -> local_path for all downloaded assets."""
        result = {}
        for url, sha in self._url_to_hash.items():
            if sha in self._manifest:
                result[url] = self._manifest[sha]["local_path"]
        return result

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _fetch_with_retry(
        self,
        client: httpx.AsyncClient,
        url: str,
        page_id: str,
    ) -> Optional[bytes]:
        """Fetch URL bytes with retry on transient failures."""
        last_exc = None
        for attempt in range(1 + self.config.max_retries):
            try:
                resp = await client.get(url)

                if resp.status_code == 200:
                    return resp.content

                if resp.status_code in _RETRYABLE_STATUS_CODES:
                    last_exc = Exception(f"HTTP {resp.status_code}")
                    continue

                # Non-retryable HTTP error
                self._record_skipped(
                    url, page_id,
                    f"http_{resp.status_code}",
                )
                return None

            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                last_exc = exc
                continue
            except Exception as exc:
                self._record_skipped(url, page_id, f"error: {exc}")
                return None

        # Exhausted retries
        self._record_skipped(
            url, page_id,
            f"retries_exhausted: {last_exc}",
        )
        return None

    def _record_skipped(self, url: str, page_id: str, reason: str) -> None:
        """Record a skipped asset in the manifest."""
        self._skipped.append({
            "original_url": url,
            "local_path": None,
            "sha256": None,
            "mime": None,
            "bytes": 0,
            "first_seen_on_page_id": page_id,
            "status": "skipped",
            "skip_reason": reason,
            "referenced_by": [page_id],
        })

    @staticmethod
    def _guess_type(url: str) -> tuple[str, str]:
        """Guess MIME type and file extension from URL path."""
        parsed = urlparse(url)
        path = parsed.path

        # Try mimetypes first
        mime, _ = mimetypes.guess_type(path)
        if mime:
            ext = mimetypes.guess_extension(mime) or ""
            # Fix common issues: mimetypes returns .jpe for image/jpeg
            if mime == "image/jpeg" and ext not in (".jpg", ".jpeg"):
                ext = ".jpg"
            return mime, ext

        # Fallback: extract extension from path
        if "." in path.split("/")[-1]:
            ext = "." + path.split("/")[-1].rsplit(".", 1)[-1].lower()
            mime_guess, _ = mimetypes.guess_type(f"file{ext}")
            return mime_guess or "application/octet-stream", ext

        return "application/octet-stream", ""
