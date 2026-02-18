"""
Asset discovery from extraction JSON.
Collects candidate asset URLs from page data for optional downloading.
"""
import re
from urllib.parse import urljoin, urlparse
from typing import Dict, List, Optional
from bs4 import BeautifulSoup


def discover_image_urls(page_data: dict) -> List[Dict[str, str]]:
    """
    Extract image URLs from a page's extraction data.

    Sources:
    - images list (string or dict with url/src keys)
    - htmlExcerpt <img> tags: src, data-src, data-lazy-src, srcset

    Returns list of dicts: [{"url": ..., "alt": ...}, ...]
    Only includes http:// and https:// URLs. Skips data: URIs.
    """
    results: Dict[str, Dict[str, str]] = {}  # url -> {url, alt}

    # 1. From images list in extraction data
    for img in page_data.get("images", []):
        if isinstance(img, str):
            url = img
            alt = ""
        elif isinstance(img, dict):
            url = img.get("url", img.get("src", ""))
            alt = img.get("alt", img.get("alt_text", ""))
        else:
            continue
        if url and _is_http_url(url):
            results.setdefault(url, {"url": url, "alt": alt or ""})

    # 2. From htmlExcerpt <img> tags
    html_excerpt = page_data.get("htmlExcerpt", "") or ""
    if html_excerpt:
        try:
            soup = BeautifulSoup(html_excerpt, "lxml")
            for img_tag in soup.find_all("img"):
                alt = img_tag.get("alt", "") or ""

                # Try src, data-src, data-lazy-src
                for attr in ("src", "data-src", "data-lazy-src"):
                    url = (img_tag.get(attr) or "").strip()
                    if url and _is_http_url(url):
                        results.setdefault(url, {"url": url, "alt": alt})

                # srcset: pick the largest candidate
                srcset = (img_tag.get("srcset") or "").strip()
                if srcset:
                    best = _best_srcset_candidate(srcset)
                    if best and _is_http_url(best):
                        results.setdefault(best, {"url": best, "alt": alt})
        except Exception:
            pass  # Don't fail discovery on malformed HTML

    return list(results.values())


def normalize_asset_url(page_url: str, asset_url: str) -> str:
    """
    Resolve a possibly-relative asset URL against the page URL
    to produce an absolute URL.
    """
    if not asset_url:
        return ""
    # Already absolute
    parsed = urlparse(asset_url)
    if parsed.scheme in ("http", "https"):
        return asset_url
    # Resolve relative
    return urljoin(page_url, asset_url)


def is_in_scope(
    url: str,
    base_origin: str,
    scope: str = "same-origin",
) -> bool:
    """
    Check whether an asset URL is in scope for downloading.

    Scopes:
    - same-origin: must share exact origin (scheme + host + port)
    - include-cdn: same origin OR a subdomain of the same root domain
    - all: any http/https URL
    """
    if not url:
        return False

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False

    if scope == "all":
        return True

    base_parsed = urlparse(base_origin)
    base_host = (base_parsed.hostname or "").lower()
    asset_host = (parsed.hostname or "").lower()

    if scope == "same-origin":
        return (
            parsed.scheme == base_parsed.scheme
            and asset_host == base_host
            and parsed.port == base_parsed.port
        )

    if scope == "include-cdn":
        # Same origin check first
        if (
            parsed.scheme == base_parsed.scheme
            and asset_host == base_host
            and parsed.port == base_parsed.port
        ):
            return True
        # Check if asset is a subdomain of the same root domain
        base_root = _root_domain(base_host)
        asset_root = _root_domain(asset_host)
        return base_root == asset_root and base_root != ""

    return False


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _is_http_url(url: str) -> bool:
    """Check if a URL uses http or https scheme (or is protocol-relative)."""
    url = url.strip()
    if url.startswith("//"):
        return True  # protocol-relative
    return url.startswith("http://") or url.startswith("https://")


def _root_domain(hostname: str) -> str:
    """
    Extract root domain from a hostname.
    e.g. 'cdn.images.example.com' -> 'example.com'
    """
    parts = hostname.split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return hostname


def _best_srcset_candidate(srcset: str) -> Optional[str]:
    """
    Parse a srcset attribute and return the URL of the largest candidate.
    srcset format: "url1 100w, url2 200w, url3 300w"
    or: "url1 1x, url2 2x"
    """
    candidates = []
    for part in srcset.split(","):
        part = part.strip()
        if not part:
            continue
        tokens = part.split()
        if not tokens:
            continue
        url = tokens[0]
        # Parse descriptor
        size = 0
        if len(tokens) > 1:
            desc = tokens[1].lower()
            match = re.match(r"(\d+(?:\.\d+)?)(w|x)", desc)
            if match:
                size = float(match.group(1))
        candidates.append((url, size))

    if not candidates:
        return None

    # Sort by descriptor value descending, pick largest
    candidates.sort(key=lambda c: c[1], reverse=True)
    return candidates[0][0]
