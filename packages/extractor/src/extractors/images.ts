/**
 * Enhanced image extractor with comprehensive placement detection
 * Uses Cheerio + sharp (optional) to parse <img> tags and compute metadata
 */

import type { CheerioAPI } from 'cheerio';
import { ImageData } from '../core/schema.js';
import { normalizeUrl } from '../utils/url.js';
import crypto from 'node:crypto';

export interface ImageExtractionOptions {
  maxImages?: number;
  minWidth?: number;
  minHeight?: number;
  allowedFormats?: string[];
  pageSlug?: string;
  baseUrl?: string;
}

export interface ImagePlacementZone {
  zone: 'hero' | 'logo' | 'navbar' | 'gallery' | 'service' | 'product' | 'menu_item' |
        'testimonial' | 'team' | 'cta' | 'map' | 'inline' | 'unknown';
  targetRefId?: string;
  confidence: number;
  reasoning?: string;
}

/**
 * Extract images from HTML with enhanced placement detection
 */
export async function extractImages(
  $: CheerioAPI,
  baseUrl: string,
  options: ImageExtractionOptions = {}
): Promise<ImageData[]> {
  const {
    maxImages = 50,
    minWidth = 50,
    minHeight = 50,
    allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    pageSlug = 'unknown'
  } = options;

  const images: ImageData[] = [];
  const seen = new Set<string>();

  // Extract from <img> tags
  $('img').each((_, el) => {
    if (images.length >= maxImages) return false;

    const $el = $(el);
    const srcAttr = $el.attr('src');
    if (!srcAttr) return;

    let src: string;
    try {
      src = new URL(srcAttr, baseUrl).toString();
    } catch {
      return; // Skip invalid URLs
    }

    if (seen.has(src)) return;

    // Check if format is allowed
    const format = getImageFormat(src);
    if (!allowedFormats.includes(format)) return;

    // Extract dimensions
    const width = parseInt($el.attr('width') || '0');
    const height = parseInt($el.attr('height') || '0');

    // Skip very small images
    if (width > 0 && width < minWidth) return;
    if (height > 0 && height < minHeight) return;

    const alt = ($el.attr('alt') || '').trim();
    const aspect = width && height ? width / height : undefined;

    // Generate stable ID
    const hash = crypto.createHash('sha1').update(src).digest('hex');
    const id = hash.slice(0, 16);

    // Detect placement
    const placement = detectImagePlacement($, el, baseUrl, { width, height, aspect });

    seen.add(src);

    images.push({
      id,
      pageSlug,
      src,
      alt: alt || undefined,
      description: alt || undefined,
      width: width || undefined,
      height: height || undefined,
      aspect,
      placement,
      source: 'extracted',
      license: 'unknown'
    });
  });

  // Extract from CSS background-image
  $('*').each((_, el) => {
    if (images.length >= maxImages) return false;

    const $el = $(el);
    const style = $el.attr('style') || '';

    // Look for background-image in style attribute
    const bgMatch = style.match(/background-image\s*:\s*url\(['"]?([^'"]+)['"]?\)/i);
    if (bgMatch) {
      let src: string;
      try {
        src = new URL(bgMatch[1], baseUrl).toString();
      } catch {
        return;
      }

      if (src && !seen.has(src)) {
        const format = getImageFormat(src);
        if (!allowedFormats.includes(format)) return;

        const hash = crypto.createHash('sha1').update(src).digest('hex');
        const id = hash.slice(0, 16);

        // Detect placement for background images
        const placement = detectImagePlacement($, el, baseUrl);

        seen.add(src);
        images.push({
          id,
          pageSlug,
          src,
          placement,
          source: 'extracted',
          license: 'unknown'
        });
      }
    }
  });

  return images;
}

/**
 * Detect image placement using DOM position, filename, text proximity, and class names
 */
function detectImagePlacement(
  $: CheerioAPI,
  el: any,
  baseUrl: string,
  geometryHints?: { width?: number; height?: number; aspect?: number }
): ImagePlacementZone {
  const $el = $(el);
  
  // Gather context information
  const cls = ($el.attr('class') || '') + ' ' + ($el.parent().attr('class') || '');
  const id = ($el.attr('id') || '') + ' ' + ($el.parent().attr('id') || '');
  const src = $el.attr('src') || '';
  const alt = $el.attr('alt') || '';
  
  // Get nearby text content
  const container = $el.closest('section, article, li, div, header, footer, nav');
  const nearText = container.length ? container.text().slice(0, 200) : '';
  
  // Get nearest heading for targetRefId
  const nearHeading = container.find('h1, h2, h3, h4').first().text().trim();
  
  // Keyword patterns for placement detection
  const patterns = {
    hero: /(hero|masthead|banner|jumbotron|main-banner|header-banner)/i,
    logo: /(logo|brandmark|brand-logo|site-logo|company-logo)/i,
    menu: /(menu|entrees|dishes|food|drink|beverage|pizza|burger|taco|sushi|appetizer|main-course|dessert)/i,
    product: /(product|sku|item|catalog|shop|store|buy|purchase)/i,
    service: /(service|offering|what\s+we\s+do|our\s+services|solutions|expertise)/i,
    team: /(team|staff|doctors|dentists|crew|employees|about\s+us|meet\s+our)/i,
    testimonial: /(testimonial|review|customer\s+review|client\s+review|feedback)/i,
    gallery: /(gallery|portfolio|work|case\s*stud|projects|showcase)/i,
    map: /(map|directions|find\s+us|location|address|contact\s+us)/i,
    cta: /(call\s+now|get\s+a\s+quote|book|schedule|contact|order\s+now|buy\s+now)/i
  };

  // Test different placement zones
  const tests: Array<{
    zone: ImagePlacementZone['zone'];
    ok: boolean;
    weight: number;
    why: string;
  }> = [
    // Logo detection (highest priority)
    {
      zone: 'logo',
      ok: patterns.logo.test(cls + id + src + alt) || 
          $el.closest('header').length > 0 && 
          (cls.includes('logo') || id.includes('logo') || src.includes('logo')),
      weight: 0.98,
      why: 'logo keyword in class/id/src or in header'
    },
    
    // Hero/banner detection
    {
      zone: 'hero',
      ok: patterns.hero.test(cls + id) || 
          $el.closest('.hero, .banner, .masthead, .jumbotron').length > 0,
      weight: 0.9,
      why: 'hero/banner class or container'
    },
    
    // Navigation detection
    {
      zone: 'navbar',
      ok: $el.closest('nav').length > 0 || 
          $el.closest('.nav, .navigation, .menu').length > 0,
      weight: 0.85,
      why: 'inside navigation element'
    },
    
    // Menu item detection
    {
      zone: 'menu_item',
      ok: patterns.menu.test(nearText) || 
          patterns.menu.test(cls + id) ||
          $el.closest('.menu, .food-menu, .restaurant-menu').length > 0,
      weight: 0.8,
      why: 'menu keywords nearby or menu container'
    },
    
    // Product detection
    {
      zone: 'product',
      ok: patterns.product.test(cls + id + nearText) ||
          $el.closest('.product, .item, .catalog').length > 0,
      weight: 0.75,
      why: 'product keywords or product container'
    },
    
    // Service detection
    {
      zone: 'service',
      ok: patterns.service.test(cls + id + nearText) ||
          $el.closest('.service, .services, .offering').length > 0,
      weight: 0.75,
      why: 'service keywords or service container'
    },
    
    // Team detection
    {
      zone: 'team',
      ok: patterns.team.test(cls + id + nearText) ||
          $el.closest('.team, .staff, .about').length > 0,
      weight: 0.7,
      why: 'team keywords or team container'
    },
    
    // Testimonial detection
    {
      zone: 'testimonial',
      ok: patterns.testimonial.test(cls + id + nearText) ||
          $el.closest('.testimonial, .review, .feedback').length > 0,
      weight: 0.7,
      why: 'testimonial keywords or testimonial container'
    },
    
    // Gallery/portfolio detection
    {
      zone: 'gallery',
      ok: patterns.gallery.test(cls + id + nearText) ||
          $el.closest('.gallery, .portfolio, .work').length > 0,
      weight: 0.7,
      why: 'gallery/portfolio keywords or gallery container'
    },
    
    // Map detection
    {
      zone: 'map',
      ok: patterns.map.test(cls + id + nearText) ||
          $el.closest('.map, .location').length > 0,
      weight: 0.65,
      why: 'map/directions keywords or map container'
    },
    
    // CTA detection
    {
      zone: 'cta',
      ok: patterns.cta.test(nearText) ||
          $el.closest('.cta, .call-to-action, .button').length > 0,
      weight: 0.6,
      why: 'CTA keywords or CTA container'
    }
  ];

  // Find the best matching zone
  let best: ImagePlacementZone = {
    zone: 'inline',
    confidence: 0.35,
    reasoning: 'no strong signals detected'
  };

  for (const test of tests) {
    if (test.ok && test.weight > best.confidence) {
      best = {
        zone: test.zone,
        confidence: test.weight,
        reasoning: test.why
      };
    }
  }

  // Add targetRefId for contextual zones
  if (nearHeading && ['menu_item', 'product', 'service', 'gallery', 'testimonial', 'team'].includes(best.zone)) {
    best.targetRefId = `${best.zone}:${nearHeading.slice(0, 80)}`;
  }

  // Apply geometry hints
  if (geometryHints) {
    const { width, height, aspect } = geometryHints;
    
    // Very wide images are likely banners
    if (aspect && aspect >= 2.5 && best.zone === 'inline') {
      best = {
        zone: 'hero',
        confidence: 0.7,
        reasoning: 'very wide aspect ratio suggests banner',
        targetRefId: best.targetRefId
      };
    }
    
    // Very small images might be icons
    if (width && height && width < 100 && height < 100 && best.zone === 'inline') {
      best = {
        zone: 'navbar',
        confidence: 0.5,
        reasoning: 'small size suggests icon/nav element',
        targetRefId: best.targetRefId
      };
    }
  }

  // Check if image is inside a link (common for products/services)
  if ($el.closest('a').length > 0 && best.zone === 'inline') {
    best = {
      zone: 'product',
      confidence: 0.4,
      reasoning: 'image inside link suggests product/service',
      targetRefId: best.targetRefId
    };
  }

  return best;
}

/**
 * Get image format from URL
 */
function getImageFormat(url: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : 'unknown';
}

/**
 * Extract hero images specifically (largest, most prominent images)
 */
export function extractHeroImages(images: ImageData[]): ImageData[] {
  return images
    .filter(img => img.placement.zone === 'hero')
    .sort((a, b) => {
      // Sort by placement confidence first, then by size
      if (a.placement.confidence !== b.placement.confidence) {
        return b.placement.confidence - a.placement.confidence;
      }
      const sizeA = (a.width || 0) * (a.height || 0);
      const sizeB = (b.width || 0) * (b.height || 0);
      return sizeB - sizeA;
    })
    .slice(0, 3); // Top 3 hero images
}

/**
 * Extract logo images specifically
 */
export function extractLogoImages(images: ImageData[]): ImageData[] {
  return images
    .filter(img => img.placement.zone === 'logo')
    .sort((a, b) => {
      // Sort by placement confidence first
      if (a.placement.confidence !== b.placement.confidence) {
        return b.placement.confidence - a.placement.confidence;
      }
      // Prefer SVG logos, then by size
      const aIsSvg = a.src.toLowerCase().includes('.svg');
      const bIsSvg = b.src.toLowerCase().includes('.svg');
      if (aIsSvg && !bIsSvg) return -1;
      if (bIsSvg && !aIsSvg) return 1;
      
      const sizeA = (a.width || 0) * (a.height || 0);
      const sizeB = (b.width || 0) * (b.height || 0);
      return sizeB - sizeA;
    });
}

/**
 * Create image index map for quick lookup
 */
export function createImageIndex(images: ImageData[]): Record<string, ImageData> {
  const index: Record<string, ImageData> = {};
  for (const img of images) {
    index[img.id] = img;
  }
  return index;
}

