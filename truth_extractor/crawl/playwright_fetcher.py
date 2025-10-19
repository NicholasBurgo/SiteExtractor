"""
Playwright-based fetcher for JavaScript-rendered websites.

This is an optional module that requires playwright to be installed.
Install with: pip install playwright && playwright install chromium
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Check if playwright is available
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    sync_playwright = None
    PlaywrightTimeoutError = None


class PlaywrightFetcher:
    """
    Fetch and render JavaScript-heavy websites using Playwright.
    
    This fetcher launches a real browser to execute JavaScript and
    wait for content to be rendered before extracting HTML.
    """
    
    def __init__(
        self,
        timeout: int = 30000,  # milliseconds
        user_agent: Optional[str] = None,
        headless: bool = True
    ):
        """
        Initialize Playwright fetcher.
        
        Args:
            timeout: Page load timeout in milliseconds (default: 30s)
            user_agent: Custom user agent string
            headless: Run browser in headless mode
        """
        if not PLAYWRIGHT_AVAILABLE:
            raise ImportError(
                "Playwright is not installed. Install with:\n"
                "  pip install playwright\n"
                "  playwright install chromium"
            )
        
        self.timeout = timeout
        self.user_agent = user_agent or (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
        self.headless = headless
    
    def fetch(self, url: str) -> tuple[bool, Optional[str], Optional[str]]:
        """
        Fetch a URL using Playwright and return rendered HTML.
        
        Args:
            url: URL to fetch
            
        Returns:
            Tuple of (success, html_content, error_message)
        """
        logger.info(f"Fetching with Playwright: {url}")
        
        try:
            with sync_playwright() as p:
                # Launch browser
                browser = p.chromium.launch(headless=self.headless)
                
                # Create context with custom user agent
                context = browser.new_context(
                    user_agent=self.user_agent,
                    viewport={"width": 1920, "height": 1080}
                )
                
                # Create page
                page = context.new_page()
                
                try:
                    # Navigate to URL
                    page.goto(url, timeout=self.timeout, wait_until="networkidle")
                    
                    # Wait a bit more for any lazy-loaded content
                    page.wait_for_timeout(2000)  # 2 seconds
                    
                    # Get rendered HTML
                    html = page.content()
                    
                    logger.info(f"Successfully fetched {url} with Playwright ({len(html)} bytes)")
                    
                    return True, html, None
                
                except PlaywrightTimeoutError as e:
                    logger.warning(f"Timeout fetching {url}: {e}")
                    return False, None, f"Timeout: {e}"
                
                except Exception as e:
                    logger.error(f"Error fetching {url}: {e}")
                    return False, None, str(e)
                
                finally:
                    # Clean up
                    page.close()
                    context.close()
                    browser.close()
        
        except Exception as e:
            logger.error(f"Failed to launch Playwright browser: {e}")
            return False, None, f"Browser launch failed: {e}"


def fetch_with_playwright(url: str, timeout: int = 30000) -> Optional[str]:
    """
    Convenience function to fetch a URL with Playwright.
    
    Args:
        url: URL to fetch
        timeout: Timeout in milliseconds
        
    Returns:
        HTML content if successful, None otherwise
    """
    if not PLAYWRIGHT_AVAILABLE:
        logger.warning("Playwright is not installed. Cannot fetch JavaScript sites.")
        return None
    
    fetcher = PlaywrightFetcher(timeout=timeout)
    success, html, error = fetcher.fetch(url)
    
    if success:
        return html
    else:
        logger.error(f"Playwright fetch failed: {error}")
        return None


def is_playwright_available() -> bool:
    """
    Check if Playwright is installed and available.
    
    Returns:
        True if Playwright can be used
    """
    return PLAYWRIGHT_AVAILABLE







