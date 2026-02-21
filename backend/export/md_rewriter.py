"""
Markdown image link rewriter.
Rewrites remote image URLs in Markdown content to local relative paths
when assets have been downloaded.
"""

import re
from typing import Dict


# Matches Markdown image syntax: ![alt text](url "optional title")
_MD_IMAGE_RE = re.compile(
    r"(!\[(?P<alt>[^\]]*)\])"  # ![alt]
    r"\((?P<url>[^\s\)]+)"  # (url
    r'(?:\s+"[^"]*")?'  # optional "title"
    r"\)",  # )
)

# Matches HTML <img> tags with src attribute
_HTML_IMG_RE = re.compile(
    r"(<img\b[^>]*?\bsrc\s*=\s*)"  # <img ... src=
    r'(["\'])(?P<url>[^"\']+)\2'  # "url" or 'url'
    r"([^>]*?>)",  # rest of tag
    re.IGNORECASE,
)


def rewrite_markdown_images(
    md_content: str,
    url_to_local: Dict[str, str],
    page_dir: str = "",
) -> str:
    """
    Rewrite image references in Markdown content to point to local files.

    Args:
        md_content: The Markdown content string.
        url_to_local: Mapping of original_url -> local_path (e.g. "assets/images/abc.png").
        page_dir: The directory path of the current page within the zip
                  (e.g. "pages/abc123"). Used to compute relative paths.

    Returns:
        The rewritten Markdown content.
    """
    if not url_to_local or not md_content:
        return md_content

    # Rewrite Markdown image syntax: ![alt](url)
    def _replace_md_image(match: re.Match) -> str:
        url = match.group("url")
        alt = match.group("alt")
        local = url_to_local.get(url)
        if local:
            rel_path = _relative_path(page_dir, local)
            return f"![{alt}]({rel_path})"
        return match.group(0)

    result = _MD_IMAGE_RE.sub(_replace_md_image, md_content)

    # Rewrite HTML <img src="url"> tags
    def _replace_html_img(match: re.Match) -> str:
        url = match.group("url")
        local = url_to_local.get(url)
        if local:
            rel_path = _relative_path(page_dir, local)
            prefix = match.group(1)
            quote = match.group(2)
            suffix = match.group(4)
            return f"{prefix}{quote}{rel_path}{quote}{suffix}"
        return match.group(0)

    result = _HTML_IMG_RE.sub(_replace_html_img, result)

    return result


def _relative_path(from_dir: str, to_path: str) -> str:
    """
    Compute a relative path from from_dir to to_path within the zip.
    Both paths are relative to the zip root.

    Example:
        from_dir="pages/abc123", to_path="assets/images/def.png"
        -> "../../assets/images/def.png"
    """
    if not from_dir:
        return to_path

    from_parts = from_dir.strip("/").split("/")
    to_parts = to_path.strip("/").split("/")

    # Find common prefix
    common = 0
    for a, b in zip(from_parts, to_parts):
        if a == b:
            common += 1
        else:
            break

    # Go up from from_dir, then down to to_path
    up = len(from_parts) - common
    down = to_parts[common:]

    parts = [".."] * up + down
    return "/".join(parts)
