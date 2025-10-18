"""
Brand color extraction from CSS and images.
"""

import logging
import re
from io import BytesIO
from typing import Optional
from urllib.parse import urljoin

import requests
from PIL import Image

from truth_extractor.crawl.parser import HTMLParser
from truth_extractor.extraction.models import Candidate, Provenance

logger = logging.getLogger(__name__)


class ColorExtractor:
    """Extract brand colors from CSS and logo images."""
    
    def __init__(self, parser: HTMLParser):
        """
        Initialize extractor.
        
        Args:
            parser: HTMLParser instance
        """
        self.parser = parser
        self.url = parser.base_url
    
    def extract_colors(self, logo_url: Optional[str] = None) -> list[Candidate]:
        """
        Extract brand colors.
        
        Args:
            logo_url: Optional logo URL for color extraction
            
        Returns:
            List of color candidates (each candidate has list of 1-2 colors)
        """
        candidates = []
        
        # 1. CSS variables (highest confidence)
        css_colors = self._extract_from_css()
        if css_colors:
            candidates.append(Candidate(
                value=css_colors,
                source_weight=0.9,
                method_weight=1.0,
                provenance=[Provenance(
                    url=self.url,
                    path="css_var(--primary)"
                )],
                notes="from CSS variables",
            ))
        
        # 2. Meta theme-color
        theme_color = self.parser.get_meta_content(name="theme-color")
        if theme_color:
            normalized = self._normalize_color(theme_color)
            if normalized:
                candidates.append(Candidate(
                    value=[normalized],
                    source_weight=0.85,
                    method_weight=1.0,
                    provenance=[Provenance(
                        url=self.url,
                        path="meta[name='theme-color']"
                    )],
                ))
        
        # 3. Extract from logo (fallback)
        if logo_url:
            logo_colors = self._extract_from_logo(logo_url)
            if logo_colors:
                candidates.append(Candidate(
                    value=logo_colors,
                    source_weight=0.7,
                    method_weight=0.8,
                    provenance=[Provenance(
                        url=self.url,
                        path="logo_palette"
                    )],
                    notes="extracted from logo",
                ))
        
        return candidates
    
    def _extract_from_css(self) -> Optional[list[str]]:
        """
        Extract colors from CSS variables.
        
        Returns:
            List of 1-2 HEX colors or None
        """
        css_vars = self.parser.get_css_variables()
        
        # Look for common brand color variable names
        priority_names = [
            "--primary", "--primary-color", "--brand", "--brand-color",
            "--accent", "--accent-color", "--theme", "--theme-color"
        ]
        
        colors = []
        for name in priority_names:
            if name in css_vars:
                value = css_vars[name]
                normalized = self._normalize_color(value)
                if normalized and normalized not in colors:
                    colors.append(normalized)
                    if len(colors) >= 2:
                        break
        
        # If we didn't find enough, look for any color variables
        if len(colors) < 2:
            for name, value in css_vars.items():
                if "color" in name.lower():
                    normalized = self._normalize_color(value)
                    if normalized and normalized not in colors:
                        colors.append(normalized)
                        if len(colors) >= 2:
                            break
        
        return colors if colors else None
    
    def _extract_from_logo(self, logo_url: str) -> Optional[list[str]]:
        """
        Extract dominant colors from logo image.
        
        Args:
            logo_url: Logo image URL
            
        Returns:
            List of 1-2 HEX colors or None
        """
        try:
            # Fetch image
            absolute_url = urljoin(self.url, logo_url)
            response = requests.get(absolute_url, timeout=5)
            response.raise_for_status()
            
            # Open with PIL
            img = Image.open(BytesIO(response.content))
            
            # Convert to RGB if needed
            if img.mode != "RGB":
                img = img.convert("RGB")
            
            # Resize for performance
            img.thumbnail((100, 100))
            
            # Get dominant colors using simple quantization
            colors = self._get_dominant_colors(img, num_colors=2)
            
            return colors
        
        except Exception as e:
            logger.warning(f"Failed to extract colors from logo: {e}")
            return None
    
    def _get_dominant_colors(self, img: Image.Image, num_colors: int = 2) -> list[str]:
        """
        Get dominant colors from an image.
        
        Args:
            img: PIL Image
            num_colors: Number of colors to extract
            
        Returns:
            List of HEX color strings
        """
        # Use PIL's quantize to get dominant colors
        img_quantized = img.quantize(colors=num_colors + 3)  # Extra colors to filter grays
        palette = img_quantized.getpalette()[:num_colors * 3 * 3]  # Get more than needed
        
        # Convert palette to RGB tuples
        colors = []
        for i in range(0, len(palette), 3):
            rgb = (palette[i], palette[i + 1], palette[i + 2])
            
            # Skip near-grayscale colors (when R≈G≈B)
            if not self._is_grayscale(rgb):
                hex_color = self._rgb_to_hex(rgb)
                if hex_color not in colors:
                    colors.append(hex_color)
                    if len(colors) >= num_colors:
                        break
        
        return colors[:num_colors]
    
    @staticmethod
    def _is_grayscale(rgb: tuple[int, int, int], threshold: int = 20) -> bool:
        """Check if color is near-grayscale."""
        r, g, b = rgb
        return abs(r - g) < threshold and abs(g - b) < threshold and abs(r - b) < threshold
    
    @staticmethod
    def _rgb_to_hex(rgb: tuple[int, int, int]) -> str:
        """Convert RGB tuple to HEX string."""
        return "#{:02X}{:02X}{:02X}".format(rgb[0], rgb[1], rgb[2])
    
    @staticmethod
    def _normalize_color(color_str: str) -> Optional[str]:
        """
        Normalize a color string to HEX format.
        
        Args:
            color_str: Color in various formats (#RGB, #RRGGBB, rgb(...))
            
        Returns:
            HEX color or None
        """
        color_str = color_str.strip()
        
        # Already HEX
        hex_match = re.match(r'^#([0-9A-Fa-f]{6})$', color_str)
        if hex_match:
            return color_str.upper()
        
        # Short HEX (#RGB -> #RRGGBB)
        short_hex_match = re.match(r'^#([0-9A-Fa-f]{3})$', color_str)
        if short_hex_match:
            r, g, b = short_hex_match.group(1)
            return f"#{r}{r}{g}{g}{b}{b}".upper()
        
        # rgb(r, g, b)
        rgb_match = re.match(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', color_str)
        if rgb_match:
            r, g, b = map(int, rgb_match.groups())
            return f"#{r:02X}{g:02X}{b:02X}"
        
        return None
    
    @staticmethod
    def check_wcag_contrast(hex_color: str, background: str = "#FFFFFF") -> bool:
        """
        Check if color has sufficient WCAG AA contrast against background.
        
        Args:
            hex_color: Foreground color in HEX
            background: Background color in HEX (default white)
            
        Returns:
            True if passes WCAG AA (contrast ratio >= 4.5:1)
        """
        def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
            hex_str = hex_str.lstrip("#")
            return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))
        
        def relative_luminance(rgb: tuple[int, int, int]) -> float:
            r, g, b = [x / 255.0 for x in rgb]
            r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
            g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
            b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
        
        try:
            fg_rgb = hex_to_rgb(hex_color)
            bg_rgb = hex_to_rgb(background)
            
            l1 = relative_luminance(fg_rgb)
            l2 = relative_luminance(bg_rgb)
            
            lighter = max(l1, l2)
            darker = min(l1, l2)
            
            contrast_ratio = (lighter + 0.05) / (darker + 0.05)
            
            return contrast_ratio >= 4.5
        
        except Exception:
            return False


