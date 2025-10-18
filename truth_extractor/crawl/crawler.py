"""
Intelligent crawler that navigates a website to find key pages.
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Set
from urllib.parse import urlparse

from truth_extractor.config import CrawlConfig
from truth_extractor.crawl.fetcher import (
    FetchResult,
    WebFetcher,
    is_same_domain,
    normalize_url,
)
from truth_extractor.crawl.parser import HTMLParser

logger = logging.getLogger(__name__)


@dataclass
class CrawledPage:
    """Information about a crawled page."""
    
    url: str
    title: Optional[str] = None
    success: bool = False
    status_code: Optional[int] = None
    content: Optional[str] = None
    parser: Optional[HTMLParser] = None
    depth: int = 0
    elapsed_ms: Optional[float] = None
    from_cache: bool = False


@dataclass
class CrawlResult:
    """Result of crawling a website."""
    
    start_url: str
    domain: str
    pages: list[CrawledPage] = field(default_factory=list)
    failed_urls: list[str] = field(default_factory=list)
    
    def get_successful_pages(self) -> list[CrawledPage]:
        """Get only successfully crawled pages."""
        return [p for p in self.pages if p.success]
    
    def get_page_by_url(self, url: str) -> Optional[CrawledPage]:
        """Find a page by URL."""
        for page in self.pages:
            if page.url == url:
                return page
        return None


class WebCrawler:
    """
    Intelligent web crawler that finds and fetches important pages.
    """
    
    def __init__(self, config: CrawlConfig, cache_dir: Optional[Path] = None):
        """
        Initialize crawler.
        
        Args:
            config: Crawl configuration
            cache_dir: Optional cache directory
        """
        self.config = config
        self.fetcher = WebFetcher(config, cache_dir)
    
    def _is_priority_url(self, url: str) -> bool:
        """
        Check if URL likely contains important information.
        
        Args:
            url: URL to check
            
        Returns:
            True if URL matches priority patterns
        """
        url_lower = url.lower()
        return any(pattern in url_lower for pattern in self.config.priority_patterns)
    
    def _should_crawl_url(self, url: str, base_domain: str, 
                          visited: Set[str], queued: Set[str]) -> bool:
        """
        Determine if a URL should be crawled.
        
        Args:
            url: URL to check
            base_domain: Base domain we're crawling
            visited: Set of already visited URLs
            queued: Set of URLs already in queue
            
        Returns:
            True if URL should be crawled
        """
        # Already processed?
        if url in visited or url in queued:
            return False
        
        # Same domain?
        if not is_same_domain(url, base_domain):
            return False
        
        # Parse URL
        parsed = urlparse(url)
        
        # Skip non-HTML resources
        path = parsed.path.lower()
        skip_extensions = (
            ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".css", ".js",
            ".xml", ".zip", ".mp4", ".mp3", ".doc", ".docx", ".xls", ".xlsx"
        )
        if any(path.endswith(ext) for ext in skip_extensions):
            return False
        
        # Skip common non-content paths
        skip_paths = ("/wp-admin", "/admin", "/login", "/search", "/cart", "/checkout")
        if any(skip in path for skip in skip_paths):
            return False
        
        return True
    
    def crawl(self, start_url: str) -> CrawlResult:
        """
        Crawl a website starting from a URL.
        
        Args:
            start_url: Starting URL (typically homepage)
            
        Returns:
            CrawlResult with all crawled pages
        """
        logger.info(f"Starting crawl of {start_url}")
        
        # Normalize start URL
        start_url = normalize_url(start_url, start_url)
        parsed = urlparse(start_url)
        base_domain = f"{parsed.scheme}://{parsed.netloc}"
        
        result = CrawlResult(start_url=start_url, domain=base_domain)
        
        # BFS queue: (url, depth)
        queue: list[tuple[str, int]] = [(start_url, 0)]
        visited: Set[str] = set()
        queued: Set[str] = {start_url}
        
        while queue and len(result.pages) < self.config.max_pages:
            url, depth = queue.pop(0)
            
            # Skip if too deep
            if depth > self.config.max_depth:
                continue
            
            visited.add(url)
            
            # Fetch page
            fetch_result = self.fetcher.fetch(url)
            
            if fetch_result.success and fetch_result.content:
                # Parse HTML
                parser = HTMLParser(fetch_result.content, url)
                title = parser.get_title()
                
                # Check if this is the first page and it's a JavaScript SPA
                is_spa = parser.is_javascript_spa()
                is_first_page = len(result.pages) == 0
                logger.info(f"Page check: SPA={is_spa}, FirstPage={is_first_page}, PlaywrightEnabled={self.config.use_playwright}")
                
                if is_first_page and is_spa and self.config.use_playwright:
                    logger.warning(f"JavaScript SPA detected, attempting Playwright fetch...")
                    
                    try:
                        from truth_extractor.crawl.playwright_fetcher import fetch_with_playwright
                        
                        playwright_html = fetch_with_playwright(url, self.config.playwright_timeout)
                        
                        if playwright_html:
                            # Replace with Playwright-rendered content
                            parser = HTMLParser(playwright_html, url)
                            title = parser.get_title()
                            fetch_result.content = playwright_html
                            logger.info(f"Successfully rendered with Playwright")
                        else:
                            logger.warning(f"Playwright fetch failed, using static HTML")
                    
                    except ImportError:
                        logger.warning(f"Playwright not installed, cannot render JavaScript")
                    except Exception as e:
                        logger.error(f"Playwright error: {e}")
                
                page = CrawledPage(
                    url=url,
                    title=title,
                    success=True,
                    status_code=fetch_result.status_code,
                    content=fetch_result.content,
                    parser=parser,
                    depth=depth,
                    elapsed_ms=fetch_result.elapsed_ms,
                    from_cache=fetch_result.from_cache,
                )
                result.pages.append(page)
                
                logger.info(
                    f"Crawled [{len(result.pages)}/{self.config.max_pages}] "
                    f"{url} (depth={depth}, title='{title}')"
                )
                
                # Extract links for next level
                if depth < self.config.max_depth:
                    # Prioritize navigation links
                    nav_links = parser.get_navigation_links()
                    all_links = parser.get_all_links()
                    
                    # Sort: priority URLs first, then navigation, then others
                    priority_links = [l for l in all_links if self._is_priority_url(l)]
                    nav_only = [l for l in nav_links if l not in priority_links]
                    other_links = [l for l in all_links 
                                  if l not in priority_links and l not in nav_links]
                    
                    candidate_links = priority_links + nav_only + other_links
                    
                    # Add to queue
                    for link in candidate_links:
                        normalized = normalize_url(link, url)
                        if self._should_crawl_url(normalized, base_domain, visited, queued):
                            queue.append((normalized, depth + 1))
                            queued.add(normalized)
                            
                            # Limit queue size
                            if len(queue) + len(visited) >= self.config.max_pages:
                                break
            
            else:
                # Failed fetch
                page = CrawledPage(
                    url=url,
                    success=False,
                    status_code=fetch_result.status_code,
                    depth=depth,
                )
                result.pages.append(page)
                result.failed_urls.append(url)
                
                logger.warning(
                    f"Failed to crawl {url}: {fetch_result.error}"
                )
        
        logger.info(
            f"Crawl complete: {len(result.get_successful_pages())} successful, "
            f"{len(result.failed_urls)} failed"
        )
        
        return result

