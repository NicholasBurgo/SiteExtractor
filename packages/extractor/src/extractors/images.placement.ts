import type * as cheerio from 'cheerio';
import { PlacementRef, PlacementZone } from '../types.js';

// Keyword patterns for placement detection
const KW = {
  hero: /(hero|masthead|banner|jumbotron|main-banner|header-banner)/i,
  logo: /(logo|brandmark|brand-logo|site-logo|company-logo)/i,
  menu: /(menu|entrees|dishes|food|drink|beverage|pizza|burger|taco|sushi|appetizer|main-course|dessert)/i,
  product: /(product|sku|item|catalog|shop|store|buy|purchase)/i,
  service: /(service|offering|what\s+we\s+do|our\s+services|solutions|expertise)/i,
  team: /(team|staff|doctors|dentists|crew|employees|about\s+us|meet\s+our)/i,
  testimonial: /(testimonial|review|customer\s+review|client\s+review|feedback)/i,
  gallery: /(gallery|portfolio|work|case\s*stud|projects|showcase)/i,
  map: /(map|directions|find\s+us|location|address|contact\s+us)/i,
  beforeAfter: /(before[-_ ]?after|ba|transformation|results)/i,
  cta: /(call\s+now|get\s+a\s+quote|book|schedule|contact|order\s+now|buy\s+now)/i,
  pricing: /(pricing|price|cost|rates|plans|packages)/i
};

/**
 * Infer placement zone for an image element using deterministic heuristics
 */
export function inferPlacement($: cheerio.CheerioAPI, el: any, baseUrl: string): PlacementRef {
  const $el = $(el);
  
  // Gather context information
  const cls = ($el.attr('class') || '') + ' ' + ($el.parent().attr('class') || '');
  const id = ($el.attr('id') || '') + ' ' + ($el.parent().attr('id') || '');
  const src = $el.attr('src') || '';
  const alt = $el.attr('alt') || '';
  
  // Get nearby text content (within closest section/article/div/li)
  const container = $el.closest('section, article, li, div, header, footer, nav');
  const nearText = container.length ? container.text().slice(0, 200) : '';
  
  // Get nearest heading for targetRefId
  const nearHeading = container.find('h1, h2, h3, h4').first().text().trim();
  
  // Test different placement zones with confidence weights
  const tests: Array<{
    zone: PlacementZone;
    ok: boolean;
    weight: number;
    why: string;
  }> = [
    // Logo detection (highest priority)
    {
      zone: 'logo',
      ok: KW.logo.test(cls + id + src + alt) || 
          $el.closest('header').length > 0 && 
          (cls.includes('logo') || id.includes('logo') || src.includes('logo')),
      weight: 0.98,
      why: 'logo keyword in class/id/src or in header'
    },
    
    // Hero/banner detection
    {
      zone: 'hero',
      ok: KW.hero.test(cls + id) || 
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
    
    // Footer detection
    {
      zone: 'footer',
      ok: $el.closest('footer').length > 0 || 
          $el.closest('.footer').length > 0,
      weight: 0.7,
      why: 'inside footer element'
    },
    
    // Menu item detection
    {
      zone: 'menu_item',
      ok: KW.menu.test(nearText) || 
          KW.menu.test(cls + id) ||
          $el.closest('.menu, .food-menu, .restaurant-menu').length > 0,
      weight: 0.8,
      why: 'menu keywords nearby or menu container'
    },
    
    // Product detection
    {
      zone: 'product',
      ok: KW.product.test(cls + id + nearText) ||
          $el.closest('.product, .item, .catalog').length > 0,
      weight: 0.75,
      why: 'product keywords or product container'
    },
    
    // Service detection
    {
      zone: 'service',
      ok: KW.service.test(cls + id + nearText) ||
          $el.closest('.service, .services, .offering').length > 0,
      weight: 0.75,
      why: 'service keywords or service container'
    },
    
    // Team detection
    {
      zone: 'team',
      ok: KW.team.test(cls + id + nearText) ||
          $el.closest('.team, .staff, .about').length > 0,
      weight: 0.7,
      why: 'team keywords or team container'
    },
    
    // Testimonial detection
    {
      zone: 'testimonial',
      ok: KW.testimonial.test(cls + id + nearText) ||
          $el.closest('.testimonial, .review, .feedback').length > 0,
      weight: 0.7,
      why: 'testimonial keywords or testimonial container'
    },
    
    // Gallery/portfolio detection
    {
      zone: 'gallery',
      ok: KW.gallery.test(cls + id + nearText) ||
          $el.closest('.gallery, .portfolio, .work').length > 0,
      weight: 0.7,
      why: 'gallery/portfolio keywords or gallery container'
    },
    
    // Before/after detection
    {
      zone: 'before_after',
      ok: KW.beforeAfter.test(cls + id + src) ||
          $el.closest('.before-after, .transformation').length > 0,
      weight: 0.8,
      why: 'before-after pattern or transformation container'
    },
    
    // Map detection
    {
      zone: 'map',
      ok: KW.map.test(cls + id + nearText) ||
          $el.closest('.map, .location').length > 0,
      weight: 0.65,
      why: 'map/directions keywords or map container'
    },
    
    // Pricing detection
    {
      zone: 'pricing',
      ok: KW.pricing.test(cls + id + nearText) ||
          $el.closest('.pricing, .price, .plans').length > 0,
      weight: 0.6,
      why: 'pricing keywords or pricing container'
    },
    
    // CTA detection
    {
      zone: 'cta',
      ok: KW.cta.test(nearText) ||
          $el.closest('.cta, .call-to-action, .button').length > 0,
      weight: 0.6,
      why: 'CTA keywords or CTA container'
    }
  ];

  // Find the best matching zone
  let best = {
    zone: 'inline' as PlacementZone,
    confidence: 0.35,
    reasoning: 'no strong signals detected'
  } as PlacementRef;

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

  // Additional geometry-based adjustments
  const width = parseInt($el.attr('width') || '0');
  const height = parseInt($el.attr('height') || '0');
  
  if (width > 0 && height > 0) {
    const aspectRatio = width / height;
    
    // Banner-like images (wide aspect ratio)
    if (aspectRatio >= 2.0 && best.zone === 'inline') {
      best = {
        zone: 'top_banner',
        confidence: 0.6,
        reasoning: 'wide aspect ratio suggests banner',
        targetRefId: best.targetRefId
      };
    }
    
    // Square-ish images might be avatars or icons
    if (aspectRatio >= 0.8 && aspectRatio <= 1.2 && width < 200 && best.zone === 'inline') {
      best = {
        zone: 'team',
        confidence: 0.5,
        reasoning: 'square small image suggests avatar',
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
 * Get placement zone from filename/URL patterns
 */
export function getPlacementFromUrl(src: string): Partial<PlacementRef> {
  const urlLower = src.toLowerCase();
  
  if (KW.logo.test(urlLower)) {
    return { zone: 'logo', confidence: 0.8, reasoning: 'logo in filename' };
  }
  
  if (KW.hero.test(urlLower)) {
    return { zone: 'hero', confidence: 0.7, reasoning: 'hero in filename' };
  }
  
  if (KW.menu.test(urlLower)) {
    return { zone: 'menu_item', confidence: 0.6, reasoning: 'menu in filename' };
  }
  
  if (KW.beforeAfter.test(urlLower)) {
    return { zone: 'before_after', confidence: 0.8, reasoning: 'before-after in filename' };
  }
  
  if (KW.team.test(urlLower)) {
    return { zone: 'team', confidence: 0.6, reasoning: 'team in filename' };
  }
  
  return {};
}

/**
 * Combine multiple placement signals for final determination
 */
export function combinePlacementSignals(
  domPlacement: PlacementRef,
  urlPlacement: Partial<PlacementRef>,
  geometryHints?: { width?: number; height?: number; aspect?: number }
): PlacementRef {
  // Start with DOM-based placement
  let final = { ...domPlacement };
  
  // Boost confidence if URL patterns agree
  if (urlPlacement.zone === domPlacement.zone) {
    final.confidence = Math.min(0.95, final.confidence + 0.1);
    final.reasoning = `${final.reasoning}; ${urlPlacement.reasoning}`;
  }
  
  // Override with URL placement if it has higher confidence
  if (urlPlacement.confidence && urlPlacement.confidence > final.confidence) {
    final = {
      zone: urlPlacement.zone!,
      confidence: urlPlacement.confidence,
      reasoning: urlPlacement.reasoning,
      targetRefId: final.targetRefId
    };
  }
  
  // Apply geometry hints
  if (geometryHints) {
    const { width, height, aspect } = geometryHints;
    
    // Very wide images are likely banners
    if (aspect && aspect >= 2.5 && final.zone === 'inline') {
      final = {
        zone: 'top_banner',
        confidence: 0.7,
        reasoning: 'very wide aspect ratio suggests banner',
        targetRefId: final.targetRefId
      };
    }
    
    // Very small images might be icons
    if (width && height && width < 100 && height < 100 && final.zone === 'inline') {
      final = {
        zone: 'navbar',
        confidence: 0.5,
        reasoning: 'small size suggests icon/nav element',
        targetRefId: final.targetRefId
      };
    }
  }
  
  return final;
}
