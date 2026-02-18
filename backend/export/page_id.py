"""
Deterministic page ID generation from URLs.
Produces stable, filesystem-safe identifiers for extraction pages.
"""
import hashlib
from urllib.parse import urlparse, urlunparse, unquote


def normalize_url(url: str) -> str:
    """
    Normalize a URL for consistent hashing.
    - Lowercases scheme and host
    - Removes default ports (80 for http, 443 for https)
    - Removes trailing slashes from path (except root)
    - Decodes percent-encoded characters
    - Strips fragments
    """
    parsed = urlparse(url)

    scheme = parsed.scheme.lower()
    host = parsed.hostname.lower() if parsed.hostname else ""

    # Remove default ports
    port = parsed.port
    if (scheme == "http" and port == 80) or (scheme == "https" and port == 443):
        port = None

    netloc = host
    if port:
        netloc = f"{host}:{port}"

    # Normalize path
    path = unquote(parsed.path)
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    if not path:
        path = "/"

    # Keep query, drop fragment
    query = parsed.query

    return urlunparse((scheme, netloc, path, "", query, ""))


def make_page_id(url: str) -> str:
    """
    Create a deterministic page ID from a URL.
    Returns first 12 hex characters of SHA-256 of the normalized URL.
    """
    normalized = normalize_url(url)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:12]
