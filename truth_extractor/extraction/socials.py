"""
Social media link extraction.
"""

import logging
import re
from urllib.parse import urlparse

from truth_extractor.crawl.parser import HTMLParser
from truth_extractor.extraction.models import Candidate, Provenance

logger = logging.getLogger(__name__)


# Social platform configuration
SOCIAL_PLATFORMS = {
    "facebook": {
        "domains": ["facebook.com", "fb.com"],
        "profile_pattern": r"facebook\.com/(?:profile\.php\?id=\d+|[a-zA-Z0-9.]+)/?$",
        "skip_paths": ["/sharer", "/share", "/dialog", "/plugins"],
    },
    "instagram": {
        "domains": ["instagram.com"],
        "profile_pattern": r"instagram\.com/[a-zA-Z0-9._]+/?$",
        "skip_paths": ["/p/", "/tv/", "/reel/", "/stories/"],
    },
    "linkedin": {
        "domains": ["linkedin.com"],
        "profile_pattern": r"linkedin\.com/(company|in)/[a-zA-Z0-9-]+/?$",
        "skip_paths": ["/sharing", "/share"],
    },
    "x": {
        "domains": ["twitter.com", "x.com"],
        "profile_pattern": r"(?:twitter|x)\.com/[a-zA-Z0-9_]+/?$",
        "skip_paths": ["/share", "/intent", "/status/"],
    },
    "youtube": {
        "domains": ["youtube.com"],
        "profile_pattern": r"youtube\.com/(?:channel|c|user|@)/[a-zA-Z0-9_-]+/?$",
        "skip_paths": ["/watch", "/playlist", "/shorts"],
    },
    "tiktok": {
        "domains": ["tiktok.com"],
        "profile_pattern": r"tiktok\.com/@[a-zA-Z0-9._]+/?$",
        "skip_paths": ["/video/"],
    },
    "yelp": {
        "domains": ["yelp.com"],
        "profile_pattern": r"yelp\.com/biz/[a-zA-Z0-9-]+",
        "skip_paths": [],
    },
}


class SocialExtractor:
    """Extract and normalize social media profile links."""
    
    def __init__(self, parser: HTMLParser):
        """
        Initialize extractor.
        
        Args:
            parser: HTMLParser instance
        """
        self.parser = parser
        self.url = parser.base_url
    
    def extract_all(self) -> dict[str, list[Candidate]]:
        """
        Extract all social media links.
        
        Returns:
            Dict mapping platform name to list of candidates
        """
        result = {platform: [] for platform in SOCIAL_PLATFORMS.keys()}
        
        # Get all social links from parser
        domain_patterns = []
        for config in SOCIAL_PLATFORMS.values():
            domain_patterns.extend(config["domains"])
        
        social_links = self.parser.find_social_links(domain_patterns)
        
        # Process each link
        for domain_pattern, urls in social_links.items():
            for url in urls:
                platform = self._identify_platform(url)
                if platform and self._is_profile_url(platform, url):
                    normalized = self._normalize_url(platform, url)
                    
                    # Check if already found
                    if not any(c.value == normalized for c in result[platform]):
                        result[platform].append(Candidate(
                            value=normalized,
                            source_weight=0.85,
                            method_weight=0.9,
                            provenance=[Provenance(
                                url=self.url,
                                path=f"a[href*='{platform}']"
                            )],
                        ))
        
        return result
    
    def _identify_platform(self, url: str) -> str | None:
        """
        Identify which platform a URL belongs to.
        
        Args:
            url: URL to check
            
        Returns:
            Platform name or None
        """
        parsed = urlparse(url)
        hostname = parsed.netloc.lower()
        
        for platform, config in SOCIAL_PLATFORMS.items():
            if any(domain in hostname for domain in config["domains"]):
                return platform
        
        return None
    
    def _is_profile_url(self, platform: str, url: str) -> bool:
        """
        Check if URL is a profile/page URL (not a post or share link).
        
        Args:
            platform: Platform name
            url: URL to check
            
        Returns:
            True if it's a profile URL
        """
        config = SOCIAL_PLATFORMS[platform]
        
        # Check skip paths
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        for skip in config["skip_paths"]:
            if skip in path:
                return False
        
        # Check profile pattern
        pattern = config["profile_pattern"]
        if re.search(pattern, url, re.IGNORECASE):
            return True
        
        return False
    
    def _normalize_url(self, platform: str, url: str) -> str:
        """
        Normalize a social URL (remove query params, trailing slashes, etc.).
        
        Args:
            platform: Platform name
            url: URL to normalize
            
        Returns:
            Normalized URL
        """
        parsed = urlparse(url)
        
        # Use https
        scheme = "https"
        
        # Normalize hostname
        hostname = parsed.netloc.lower()
        if platform == "x" and "twitter.com" in hostname:
            hostname = hostname.replace("twitter.com", "x.com")
        
        # Clean path (remove trailing slash, query params)
        path = parsed.path.rstrip("/")
        
        # Reconstruct
        normalized = f"{scheme}://{hostname}{path}"
        
        return normalized


