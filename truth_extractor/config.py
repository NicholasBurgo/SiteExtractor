"""
Configuration management for Truth Extractor.
"""

import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CrawlConfig:
    """Configuration for web crawling behavior."""
    
    max_pages: int = 20
    max_depth: int = 2
    timeout: int = 10
    rate_limit_delay: float = 1.0  # seconds between requests
    retry_attempts: int = 3
    retry_backoff: float = 2.0  # exponential backoff multiplier
    cache_expire_hours: int = 24
    respect_robots: bool = True
    
    user_agents: list[str] = field(default_factory=lambda: [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ])
    
    # URL patterns that likely contain useful information
    priority_patterns: list[str] = field(default_factory=lambda: [
        "contact", "about", "service", "location", "team", "who-we-are",
        "our-story", "meet", "get-in-touch", "reach-us"
    ])
    
    # Playwright support for JavaScript sites (optional)
    use_playwright: bool = True  # Enable Playwright for JS-rendered sites by default
    playwright_timeout: int = 30000  # milliseconds


@dataclass
class ExtractionConfig:
    """Configuration for extraction strategies."""
    
    # Source weights for confidence scoring
    source_weights: dict[str, float] = field(default_factory=lambda: {
        "jsonld": 1.0,
        "microdata": 0.95,
        "meta": 0.9,
        "header": 0.85,
        "nav": 0.7,
        "main": 0.7,
        "footer": 0.6,
        "body": 0.5,
    })
    
    # Method weights for confidence scoring
    method_weights: dict[str, float] = field(default_factory=lambda: {
        "direct_attribute": 1.0,
        "semantic_extraction": 0.9,
        "pattern_matching": 0.7,
        "heuristic": 0.6,
    })
    
    # Validator bonuses
    validator_bonuses: dict[str, float] = field(default_factory=lambda: {
        "email_mx_valid": 0.1,
        "phone_valid": 0.1,
        "address_geocoded": 0.1,
        "color_wcag_aa": 0.1,
    })
    
    # Text extraction limits
    background_max_words: int = 50
    slogan_max_words: int = 8
    services_max_count: int = 8


@dataclass
class Config:
    """Main configuration object."""
    
    crawl: CrawlConfig = field(default_factory=CrawlConfig)
    extraction: ExtractionConfig = field(default_factory=ExtractionConfig)
    
    output_dir: str = "out"
    geocode_token: Optional[str] = None
    custom_user_agent: Optional[str] = None
    
    def __post_init__(self):
        """Apply custom overrides."""
        if self.custom_user_agent:
            self.crawl.user_agents = [self.custom_user_agent]
        
        # Load geocode token from environment if available
        if not self.geocode_token:
            self.geocode_token = os.getenv("GEOCODE_TOKEN")


# Default configuration instance
DEFAULT_CONFIG = Config()

