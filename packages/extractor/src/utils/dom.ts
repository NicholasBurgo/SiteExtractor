import type { CheerioAPI } from 'cheerio';
import { URL } from 'url';

/**
 * Normalize a URL relative to a base URL
 */
export function normalizeUrl(base: string, href?: string): string | undefined {
  if (!href) return undefined;
  
  try {
    const url = new URL(href, base);
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Determine the dominant role of an image based on context
 */
export function pickDominantRole($el: any, $?: CheerioAPI): 'hero' | 'logo' | 'gallery' | 'inline' {
  const src: string = ($el.attr('src') || '').toLowerCase();
  const cls: string = ($el.attr('class') || '').toLowerCase();
  const id: string = ($el.attr('id') || '').toLowerCase();
  const alt: string = ($el.attr('alt') || '').toLowerCase();
  
  // Check for logo indicators
  if (/logo/.test(src) || /logo/.test(cls) || /logo/.test(id) || /logo/.test(alt)) {
    return 'logo';
  }
  
  // Check for hero/banner indicators
  if (/hero|banner|masthead|header|jumbotron|splash/.test(cls) || 
      /hero|banner|masthead|header|jumbotron|splash/.test(id)) {
    return 'hero';
  }
  
  // Check if it's in a gallery or carousel
  if ($) {
    const parent = $el.parent();
    if (parent.length) {
      const parentCls = (parent.attr('class') || '').toLowerCase();
      const parentId = (parent.attr('id') || '').toLowerCase();
      
      if (/gallery|carousel|slider|grid/.test(parentCls) || 
          /gallery|carousel|slider|grid/.test(parentId)) {
        return 'gallery';
      }
    }
  }
  
  return 'inline';
}

/**
 * Extract semantic blocks from HTML
 */
export function toBlocks($: CheerioAPI): any[] {
  const blocks: any[] = [];
  
  // Process headings
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().trim();
    if (text) {
      blocks.push({
        kind: 'heading',
        level: Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6,
        text
      });
    }
  });
  
  // Process paragraphs
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20) { // Filter out very short paragraphs
      blocks.push({
        kind: 'paragraph',
        text
      });
    }
  });
  
  // Process lists
  $('ul, ol').each((_, el) => {
    const items = $(el).find('li').toArray()
      .map(li => $(li).text().trim())
      .filter(Boolean);
    
    if (items.length > 0) {
      blocks.push({
        kind: 'list',
        ordered: el.tagName.toLowerCase() === 'ol',
        items
      });
    }
  });
  
  // Process blockquotes
  $('blockquote').each((_, el) => {
    const text = $(el).text().trim();
    const cite = $(el).attr('cite') || $(el).find('cite').text().trim() || undefined;
    
    if (text) {
      blocks.push({
        kind: 'quote',
        text,
        cite
      });
    }
  });
  
  // Process tables
  $('table').each((_, el) => {
    const rows: string[][] = [];
    
    $(el).find('tr').each((_, row) => {
      const rowData: string[] = [];
      $(row).find('td, th').each((_, cell) => {
        rowData.push($(cell).text().trim());
      });
      if (rowData.length > 0) {
        rows.push(rowData);
      }
    });
    
    if (rows.length > 0) {
      const headers = rows[0]; // Assume first row is headers
      blocks.push({
        kind: 'table',
        headers: headers.length > 1 ? headers : undefined,
        rows: headers.length > 1 ? rows.slice(1) : rows
      });
    }
  });
  
  return blocks;
}

/**
 * Extract navigation items from HTML
 */
export function extractNavbar($: CheerioAPI, baseUrl: string): any[] {
  const navbar: any[] = [];
  const seen = new Set<string>();
  
  // Common navigation selectors
  const navSelectors = [
    'nav a',
    'header nav a',
    '.navbar a',
    '.navigation a',
    '.menu a',
    '.nav a',
    '.header a',
    '[role="navigation"] a'
  ];
  
  navSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      const href = normalizeUrl(baseUrl, $(el).attr('href'));
      
      if (text && href && !seen.has(href)) {
        seen.add(href);
        navbar.push({ text, href });
      }
    });
  });
  
  return navbar;
}

/**
 * Calculate Flesch reading ease score
 */
export function calculateReadability(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, score));
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;
  
  word = word.toLowerCase();
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Handle silent 'e'
  if (word.endsWith('e')) {
    count--;
  }
  
  return Math.max(1, count);
}

/**
 * Generate a slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    || 'page';
}

/**
 * Check if a URL is internal to the domain
 */
export function isInternalUrl(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseUrl);
    return urlObj.hostname === baseObj.hostname;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
