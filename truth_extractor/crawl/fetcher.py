"""
Web fetcher with robots.txt compliance, rate limiting, caching, and retries.
"""

import logging
import random
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
import requests_cache
import tldextract
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from truth_extractor.config import CrawlConfig

logger = logging.getLogger(__name__)


@dataclass
class FetchResult:
    """Result of a page fetch attempt."""
    
    url: str
    success: bool
    status_code: Optional[int] = None
    content: Optional[str] = None
    content_type: Optional[str] = None
    error: Optional[str] = None
    elapsed_ms: Optional[float] = None
    from_cache: bool = False


@dataclass
class CrawlStats:
    """Statistics for a crawl session."""
    
    pages_attempted: int = 0
    pages_successful: int = 0
    pages_failed: int = 0
    pages_cached: int = 0
    total_bytes: int = 0
    total_time_ms: float = 0


class WebFetcher:
    """
    Polite web fetcher with robots.txt compliance, rate limiting, and caching.
    """
    
    def __init__(self, config: CrawlConfig, cache_dir: Optional[Path] = None):
        """
        Initialize the fetcher.
        
        Args:
            config: Crawl configuration
            cache_dir: Optional directory for response cache
        """
        self.config = config
        self.stats = CrawlStats()
        
        # Setup caching
        if cache_dir:
            cache_path = cache_dir / "http_cache"
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            requests_cache.install_cache(
                str(cache_path),
                expire_after=config.cache_expire_hours * 3600,
                allowable_codes=(200, 301, 302, 404),
            )
        
        # Setup session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=config.retry_attempts,
            backoff_factor=config.retry_backoff,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "HEAD"],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Rate limiting
        self.last_request_time = 0.0
        
        # Robots.txt parsers (cached per domain)
        self.robots_parsers: dict[str, RobotFileParser] = {}
    
    def _get_user_agent(self) -> str:
        """Get a random user agent from the configured list."""
        return random.choice(self.config.user_agents)
    
    def _respect_rate_limit(self):
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.config.rate_limit_delay:
            time.sleep(self.config.rate_limit_delay - elapsed)
        self.last_request_time = time.time()
    
    def _get_robots_parser(self, base_url: str) -> Optional[RobotFileParser]:
        """
        Get or create a robots.txt parser for a domain.
        
        Args:
            base_url: Base URL of the site
            
        Returns:
            RobotFileParser instance or None if disabled
        """
        if not self.config.respect_robots:
            return None
        
        parsed = urlparse(base_url)
        domain = f"{parsed.scheme}://{parsed.netloc}"
        
        if domain not in self.robots_parsers:
            parser = RobotFileParser()
            robots_url = urljoin(domain, "/robots.txt")
            parser.set_url(robots_url)
            
            try:
                parser.read()
                self.robots_parsers[domain] = parser
                logger.debug(f"Loaded robots.txt from {robots_url}")
            except Exception as e:
                logger.warning(f"Failed to load robots.txt from {robots_url}: {e}")
                # Allow crawling if robots.txt can't be fetched
                self.robots_parsers[domain] = None
        
        return self.robots_parsers[domain]
    
    def can_fetch(self, url: str, user_agent: Optional[str] = None) -> bool:
        """
        Check if a URL can be fetched according to robots.txt.
        
        Args:
            url: URL to check
            user_agent: Optional specific user agent
            
        Returns:
            True if URL can be fetched
        """
        if not self.config.respect_robots:
            return True
        
        parser = self._get_robots_parser(url)
        if parser is None:
            return True
        
        ua = user_agent or self._get_user_agent()
        return parser.can_fetch(ua, url)
    
    def fetch(self, url: str) -> FetchResult:
        """
        Fetch a single URL with all safety measures.
        
        Args:
            url: URL to fetch
            
        Returns:
            FetchResult with status and content
        """
        self.stats.pages_attempted += 1
        start_time = time.time()
        
        # Check robots.txt
        if not self.can_fetch(url):
            logger.info(f"Blocked by robots.txt: {url}")
            return FetchResult(
                url=url,
                success=False,
                error="Blocked by robots.txt",
            )
        
        # Rate limiting
        self._respect_rate_limit()
        
        # Fetch
        try:
            headers = {
                "User-Agent": self._get_user_agent(),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate",
                "DNT": "1",
            }
            
            response = self.session.get(
                url,
                headers=headers,
                timeout=self.config.timeout,
                allow_redirects=True,
            )
            
            elapsed_ms = (time.time() - start_time) * 1000
            from_cache = getattr(response, "from_cache", False)
            
            if from_cache:
                self.stats.pages_cached += 1
            
            if response.status_code == 200:
                content = response.text
                content_type = response.headers.get("Content-Type", "")
                
                self.stats.pages_successful += 1
                self.stats.total_bytes += len(content)
                self.stats.total_time_ms += elapsed_ms
                
                logger.debug(
                    f"Fetched {url} ({len(content)} bytes, {elapsed_ms:.0f}ms, "
                    f"cached={from_cache})"
                )
                
                return FetchResult(
                    url=url,
                    success=True,
                    status_code=response.status_code,
                    content=content,
                    content_type=content_type,
                    elapsed_ms=elapsed_ms,
                    from_cache=from_cache,
                )
            else:
                self.stats.pages_failed += 1
                logger.warning(f"Failed to fetch {url}: HTTP {response.status_code}")
                return FetchResult(
                    url=url,
                    success=False,
                    status_code=response.status_code,
                    error=f"HTTP {response.status_code}",
                    elapsed_ms=elapsed_ms,
                )
        
        except requests.Timeout:
            self.stats.pages_failed += 1
            logger.warning(f"Timeout fetching {url}")
            return FetchResult(url=url, success=False, error="Timeout")
        
        except requests.RequestException as e:
            self.stats.pages_failed += 1
            logger.warning(f"Request failed for {url}: {e}")
            return FetchResult(url=url, success=False, error=str(e))
        
        except Exception as e:
            self.stats.pages_failed += 1
            logger.error(f"Unexpected error fetching {url}: {e}")
            return FetchResult(url=url, success=False, error=str(e))
    
    def get_stats(self) -> CrawlStats:
        """Get current crawl statistics."""
        return self.stats


def extract_domain(url: str) -> str:
    """
    Extract the registered domain from a URL.
    
    Args:
        url: URL to parse
        
    Returns:
        Domain string (e.g., "example.com")
    """
    extracted = tldextract.extract(url)
    return f"{extracted.domain}.{extracted.suffix}"


def is_same_domain(url1: str, url2: str) -> bool:
    """
    Check if two URLs belong to the same registered domain.
    
    Args:
        url1: First URL
        url2: Second URL
        
    Returns:
        True if same domain
    """
    return extract_domain(url1) == extract_domain(url2)


def normalize_url(url: str, base_url: str) -> str:
    """
    Normalize a URL relative to a base URL.
    
    Args:
        url: URL to normalize (may be relative)
        base_url: Base URL for resolution
        
    Returns:
        Absolute normalized URL
    """
    # Join with base
    absolute = urljoin(base_url, url)
    
    # Parse and normalize
    parsed = urlparse(absolute)
    
    # Remove fragment
    normalized = parsed._replace(fragment="").geturl()
    
    return normalized


