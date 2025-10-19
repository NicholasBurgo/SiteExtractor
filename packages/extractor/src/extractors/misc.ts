/**
 * Miscellaneous data extractor
 * Extracts various metadata, links, and diagnostic information
 */

import type { CheerioAPI } from 'cheerio';
import { MiscData } from '../core/schema.js';
import { normalizeUrl } from '../utils/url.js';

export interface MiscExtractionOptions {
  includeExternalLinks?: boolean;
  extractSchemaOrg?: boolean;
  extractOpenGraph?: boolean;
  calculateReadability?: boolean;
  baseUrl?: string;
}

/**
 * Extract miscellaneous data from HTML
 */
export function extractMiscData(
  $: CheerioAPI,
  baseUrl: string,
  options: MiscExtractionOptions = {}
): MiscData {
  const {
    includeExternalLinks = false,
    extractSchemaOrg = true,
    extractOpenGraph = true,
    calculateReadability = true,
    baseUrl: optionBaseUrl
  } = options;

  const actualBaseUrl = optionBaseUrl || baseUrl;

  return {
    meta: extractMetaData($),
    links: extractLinks($, actualBaseUrl, includeExternalLinks),
    diagnostics: extractDiagnostics($, actualBaseUrl, {
      extractSchemaOrg,
      extractOpenGraph,
      calculateReadability
    })
  };
}

/**
 * Extract meta data from HTML
 */
function extractMetaData($: CheerioAPI): MiscData['meta'] {
  const meta: MiscData['meta'] = {};

  // Extract title
  const title = $('title').text().trim();
  if (title) {
    meta.title = title;
  }

  // Extract description
  const description = $('meta[name="description"]').attr('content');
  if (description) {
    meta.description = description.trim();
  }

  // Extract keywords
  const keywords = $('meta[name="keywords"]').attr('content');
  if (keywords) {
    meta.keywords = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }

  // Extract author
  const author = $('meta[name="author"]').attr('content');
  if (author) {
    meta.author = author.trim();
  }

  // Extract robots
  const robots = $('meta[name="robots"]').attr('content');
  if (robots) {
    meta.robots = robots.trim();
  }

  return meta;
}

/**
 * Extract links from HTML
 */
function extractLinks($: CheerioAPI, baseUrl: string, includeExternal: boolean): MiscData['links'] {
  const internal: string[] = [];
  const external: string[] = [];
  const seen = new Set<string>();

  $('a[href]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    
    if (href && !seen.has(href)) {
      try {
        const normalizedHref = new URL(href, baseUrl).toString();
        const isExternal = !normalizedHref.startsWith(baseUrl);
        
        if (isExternal && includeExternal) {
          external.push(normalizedHref);
        } else if (!isExternal) {
          internal.push(normalizedHref);
        }
        
        seen.add(href);
      } catch (error) {
        // Skip invalid URLs
      }
    }
  });

  return {
    internal: [...new Set(internal)], // Remove duplicates
    external: [...new Set(external)]
  };
}

/**
 * Extract diagnostic information
 */
function extractDiagnostics(
  $: CheerioAPI,
  baseUrl: string,
  options: {
    extractSchemaOrg: boolean;
    extractOpenGraph: boolean;
    calculateReadability: boolean;
  }
): MiscData['diagnostics'] {
  const diagnostics: MiscData['diagnostics'] = {
    wordCount: 0,
    hasSchemaOrg: false,
    hasOpenGraph: false
  };

  // Calculate word count
  const bodyText = $('body').text();
  diagnostics.wordCount = bodyText.split(/\s+/).filter(word => word.length > 0).length;

  // Check for Schema.org structured data
  if (options.extractSchemaOrg) {
    diagnostics.hasSchemaOrg = $('script[type="application/ld+json"]').length > 0 ||
                              $('[itemscope]').length > 0 ||
                              $('[typeof]').length > 0;
  }

  // Check for Open Graph meta tags
  if (options.extractOpenGraph) {
    diagnostics.hasOpenGraph = $('meta[property^="og:"]').length > 0;
  }

  // Calculate readability score if requested
  if (options.calculateReadability) {
    diagnostics.readabilityScore = calculateReadabilityScore($);
  }

  return diagnostics;
}

/**
 * Calculate readability score (simplified Flesch Reading Ease)
 */
function calculateReadabilityScore($: CheerioAPI): number {
  const text = $('body').text();
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (words.length === 0 || sentences.length === 0) return 0;
  
  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }
  
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;
  
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Count syllables in a word (simplified)
 */
function countSyllables(word: string): number {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleanWord.length === 0) return 0;
  
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < cleanWord.length; i++) {
    const isVowel = vowels.includes(cleanWord[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Handle silent 'e'
  if (cleanWord.endsWith('e') && count > 1) {
    count--;
  }
  
  return Math.max(1, count);
}

/**
 * Extract structured data (JSON-LD, Microdata, RDFa)
 */
export function extractStructuredData($: CheerioAPI): {
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

  // Extract microdata
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

  // Extract RDFa (simplified)
  $('[typeof]').each((_, el) => {
    const $el = $(el);
    const typeOf = $el.attr('typeof');
    const properties: Record<string, any> = {};
    
    $el.find('[property]').each((_, propEl) => {
      const $prop = $(propEl);
      const propName = $prop.attr('property');
      const propValue = $prop.attr('content') || $prop.text().trim();
      
      if (propName) {
        properties[propName] = propValue;
      }
    });
    
    if (typeOf) {
      rdfa.push({ typeOf, properties });
    }
  });

  return { jsonLd, microdata, rdfa };
}

/**
 * Extract Open Graph meta tags
 */
export function extractOpenGraphData($: CheerioAPI): Record<string, string> {
  const ogData: Record<string, string> = {};

  $('meta[property^="og:"]').each((_, el) => {
    const $el = $(el);
    const property = $el.attr('property');
    const content = $el.attr('content');
    
    if (property && content) {
      ogData[property] = content;
    }
  });

  return ogData;
}

/**
 * Extract Twitter Card meta tags
 */
export function extractTwitterCardData($: CheerioAPI): Record<string, string> {
  const twitterData: Record<string, string> = {};

  $('meta[name^="twitter:"]').each((_, el) => {
    const $el = $(el);
    const name = $el.attr('name');
    const content = $el.attr('content');
    
    if (name && content) {
      twitterData[name] = content;
    }
  });

  return twitterData;
}

/**
 * Extract canonical URL
 */
export function extractCanonicalUrl($: CheerioAPI, baseUrl: string): string | undefined {
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) {
    try {
      return new URL(canonical, baseUrl).toString();
    } catch (error) {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Extract language information
 */
export function extractLanguageInfo($: CheerioAPI): {
  htmlLang?: string;
  metaLang?: string;
  contentLanguage?: string;
} {
  return {
    htmlLang: $('html').attr('lang'),
    metaLang: $('meta[http-equiv="Content-Language"]').attr('content'),
    contentLanguage: $('meta[name="language"]').attr('content')
  };
}

/**
 * Extract viewport information
 */
export function extractViewportInfo($: CheerioAPI): {
  viewport?: string;
  isResponsive: boolean;
} {
  const viewport = $('meta[name="viewport"]').attr('content');
  const isResponsive = viewport ? viewport.includes('width=device-width') : false;
  
  return { viewport, isResponsive };
}