"""
HTML snapshot sanitizer.
Strips scripts, inline event handlers, and dangerous attributes
to make snapshots safe to open locally.
"""
import re
from bs4 import BeautifulSoup


# Inline event handler attributes to remove
EVENT_ATTRS = re.compile(r"^on\w+$", re.IGNORECASE)


def sanitize_html(raw_html: str) -> str:
    """
    Sanitize raw HTML for safe local viewing.
    - Removes all <script> and <noscript> tags
    - Removes all inline event handlers (onclick, onerror, etc.)
    - Removes <iframe> tags
    - Removes javascript: hrefs
    """
    soup = BeautifulSoup(raw_html, "lxml")

    # Remove script and noscript tags entirely
    for tag in soup.find_all(["script", "noscript", "iframe"]):
        tag.decompose()

    # Remove inline event handlers from all elements
    for tag in soup.find_all(True):
        attrs_to_remove = [attr for attr in tag.attrs if EVENT_ATTRS.match(attr)]
        for attr in attrs_to_remove:
            del tag[attr]

        # Remove javascript: hrefs
        if tag.get("href", "").strip().lower().startswith("javascript:"):
            tag["href"] = "#"
        if tag.get("src", "").strip().lower().startswith("javascript:"):
            del tag["src"]

    return str(soup)
