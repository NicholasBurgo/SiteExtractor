/**
 * HTML loader and normalizer for consistent processing
 * Handles various HTML sources and normalizes content for extraction
 */

import * as cheerio from 'cheerio';
import { normalizeUrl } from '../utils/url.js';

export interface HtmlLoadOptions {
  baseUrl?: string;
  normalizeWhitespace?: boolean;
  removeScripts?: boolean;
  removeStyles?: boolean;
  preserveImages?: boolean;
  preserveLinks?: boolean;
}

export interface NormalizedHtml {
  $: cheerio.CheerioAPI;
  html: string;
  baseUrl: string;
  metadata: {
    title?: string;
    description?: string;
    charset?: string;
    language?: string;
    wordCount: number;
    linkCount: number;
    imageCount: number;
  };
}

/**
 * Load and normalize HTML from various sources
 */
export function loadHtml(
  html: string,
  baseUrl: string,
  options: HtmlLoadOptions = {}
): NormalizedHtml {
  const {
    normalizeWhitespace = true,
    removeScripts = true,
    removeStyles = false,
    preserveImages = true,
    preserveLinks = true
  } = options;

  // Load HTML into Cheerio
  const $ = cheerio.load(html, {
    normalizeWhitespace,
    xmlMode: false,
    decodeEntities: true
  });

  // Normalize base URL
  const normalizedBaseUrl = normalizeUrl(baseUrl);

  // Remove scripts if requested
  if (removeScripts) {
    $('script').remove();
    $('noscript').remove();
  }

  // Remove styles if requested
  if (removeStyles) {
    $('style').remove();
    $('link[rel="stylesheet"]').remove();
  }

  // Normalize image sources
  if (preserveImages) {
    $('img').each((_, el) => {
      const $el = $(el);
      const src = $el.attr('src');
      if (src) {
        try {
          const normalizedSrc = new URL(src, normalizedBaseUrl).toString();
          $el.attr('src', normalizedSrc);
        } catch (error) {
          // Remove invalid image sources
          $el.remove();
        }
      }
    });
  }

  // Normalize link hrefs
  if (preserveLinks) {
    $('a[href]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      if (href) {
        try {
          const normalizedHref = new URL(href, normalizedBaseUrl).toString();
          $el.attr('href', normalizedHref);
        } catch (error) {
          // Keep original href for invalid URLs
        }
      }
    });
  }

  // Clean up empty elements
  $('*').each((_, el) => {
    const $el = $(el);
    if ($el.children().length === 0 && $el.text().trim() === '') {
      $el.remove();
    }
  });

  // Extract metadata
  const metadata = extractMetadata($, normalizedBaseUrl);

  return {
    $,
    html: $.html(),
    baseUrl: normalizedBaseUrl,
    metadata
  };
}

/**
 * Extract metadata from HTML
 */
function extractMetadata($: cheerio.CheerioAPI, baseUrl: string): NormalizedHtml['metadata'] {
  const title = $('title').text().trim() || undefined;
  const description = $('meta[name="description"]').attr('content') || undefined;
  const charset = $('meta[charset]').attr('charset') || 
                 $('meta[http-equiv="Content-Type"]').attr('content')?.match(/charset=([^;]+)/)?.[1] || undefined;
  const language = $('html').attr('lang') || undefined;

  // Count elements
  const wordCount = $('body').text().split(/\s+/).filter(word => word.length > 0).length;
  const linkCount = $('a[href]').length;
  const imageCount = $('img').length;

  return {
    title,
    description,
    charset,
    language,
    wordCount,
    linkCount,
    imageCount
  };
}

/**
 * Load HTML from file
 */
export async function loadHtmlFromFile(filePath: string, baseUrl: string): Promise<NormalizedHtml> {
  const fs = await import('fs/promises');
  const html = await fs.readFile(filePath, 'utf-8');
  return loadHtml(html, baseUrl);
}

/**
 * Load HTML from URL (using existing crawler)
 */
export async function loadHtmlFromUrl(url: string, config: any): Promise<NormalizedHtml> {
  const { crawlUrl } = await import('../adapters/crawler.js');
  const result = await crawlUrl(url, config);
  return loadHtml(result.html, result.finalUrl);
}

/**
 * Validate HTML structure
 */
export function validateHtmlStructure($: cheerio.CheerioAPI): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for basic structure
  if ($('html').length === 0) {
    issues.push('Missing <html> tag');
  }

  if ($('head').length === 0) {
    issues.push('Missing <head> tag');
  }

  if ($('body').length === 0) {
    issues.push('Missing <body> tag');
  }

  // Check for title
  if ($('title').length === 0) {
    issues.push('Missing <title> tag');
  }

  // Check for meta description
  if ($('meta[name="description"]').length === 0) {
    issues.push('Missing meta description');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Extract structured data from HTML
 */
export function extractStructuredData($: cheerio.CheerioAPI): {
  jsonLd: any[];
  microdata: any[];
  rdfa: any[];
} {
  const jsonLd: any[] = [];
  const microdata: any[] = [];
  const rdfa: any[] = [];

  // Extract JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (content) {
        const data = JSON.parse(content);
        jsonLd.push(data);
      }
    } catch (error) {
      // Skip invalid JSON-LD
    }
  });

  // Extract microdata (simplified)
  $('[itemscope]').each((_, el) => {
    const $el = $(el);
    const itemType = $el.attr('itemtype');
    const itemProps: Record<string, any> = {};
    
    $el.find('[itemprop]').each((_, propEl) => {
      const $prop = $(propEl);
      const propName = $prop.attr('itemprop');
      const propValue = $prop.attr('content') || $prop.text().trim();
      
      if (propName) {
        itemProps[propName] = propValue;
      }
    });
    
    if (itemType) {
      microdata.push({ itemType, properties: itemProps });
    }
  });

  return { jsonLd, microdata, rdfa };
}

