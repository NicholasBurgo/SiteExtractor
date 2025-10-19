/**
 * Paragraphs extractor
 * Extracts text content and structures from HTML
 */

import type { CheerioAPI } from 'cheerio';
import { ParagraphData } from '../core/schema.js';

export interface ParagraphExtractionOptions {
  minWordCount?: number;
  maxWordCount?: number;
  includeLists?: boolean;
  includeTables?: boolean;
  includeQuotes?: boolean;
  filterEmpty?: boolean;
  preserveFormatting?: boolean;
}

/**
 * Extract paragraphs and text content from HTML
 */
export function extractParagraphs(
  $: CheerioAPI,
  options: ParagraphExtractionOptions = {}
): ParagraphData[] {
  const {
    minWordCount = 10,
    maxWordCount = 500,
    includeLists = true,
    includeTables = true,
    includeQuotes = true,
    filterEmpty = true,
    preserveFormatting = false
  } = options;

  const paragraphs: ParagraphData[] = [];

  // Extract regular paragraphs
  $('p').each((_, el) => {
    const text = extractTextContent($(el), preserveFormatting);
    if (text && text.trim().length > 0) {
      const wordCount = text.split(/\s+/).length;
      if (wordCount >= minWordCount && wordCount <= maxWordCount) {
        paragraphs.push({
          text,
          type: 'paragraph',
          wordCount
        });
      }
    }
  });

  // Extract headings
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    const text = extractTextContent($el, preserveFormatting);
    if (text && text.trim().length > 0) {
      const level = parseInt($el.prop('tagName').substring(1));
      const wordCount = text.split(/\s+/).length;
      
      if (wordCount >= minWordCount && wordCount <= maxWordCount) {
        paragraphs.push({
          text,
          type: 'heading',
          level,
          wordCount
        });
      }
    }
  });

  // Extract lists if enabled
  if (includeLists) {
    $('ul, ol').each((_, el) => {
      const $el = $(el);
      const text = extractListContent($el, preserveFormatting);
      if (text && text.trim().length > 0) {
        const wordCount = text.split(/\s+/).length;
        if (wordCount >= minWordCount && wordCount <= maxWordCount) {
          paragraphs.push({
            text,
            type: 'list',
            wordCount
          });
        }
      }
    });
  }

  // Extract tables if enabled
  if (includeTables) {
    $('table').each((_, el) => {
      const $el = $(el);
      const text = extractTableContent($el, preserveFormatting);
      if (text && text.trim().length > 0) {
        const wordCount = text.split(/\s+/).length;
        if (wordCount >= minWordCount && wordCount <= maxWordCount) {
          paragraphs.push({
            text,
            type: 'table',
            wordCount
          });
        }
      }
    });
  }

  // Extract quotes if enabled
  if (includeQuotes) {
    $('blockquote, q').each((_, el) => {
      const $el = $(el);
      const text = extractTextContent($el, preserveFormatting);
      if (text && text.trim().length > 0) {
        const wordCount = text.split(/\s+/).length;
        if (wordCount >= minWordCount && wordCount <= maxWordCount) {
          paragraphs.push({
            text,
            type: 'quote',
            wordCount
          });
        }
      }
    });
  }

  // Filter empty paragraphs if requested
  if (filterEmpty) {
    return paragraphs.filter(p => p.text.trim().length > 0);
  }

  return paragraphs;
}

/**
 * Extract text content from an element
 */
function extractTextContent($el: any, preserveFormatting: boolean): string {
  if (preserveFormatting) {
    // Preserve some formatting
    return $el.html()
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  } else {
    // Plain text only
    return $el.text().trim();
  }
}

/**
 * Extract list content
 */
function extractListContent($el: any, preserveFormatting: boolean): string {
  const items: string[] = [];
  
  $el.find('li').each((_, liEl) => {
    const text = extractTextContent($(liEl), preserveFormatting);
    if (text) {
      items.push(`• ${text}`);
    }
  });
  
  return items.join('\n');
}

/**
 * Extract table content
 */
function extractTableContent($el: any, preserveFormatting: boolean): string {
  const rows: string[] = [];
  
  $el.find('tr').each((_, trEl) => {
    const $tr = $(trEl);
    const cells: string[] = [];
    
    $tr.find('td, th').each((_, cellEl) => {
      const text = extractTextContent($(cellEl), preserveFormatting);
      if (text) {
        cells.push(text);
      }
    });
    
    if (cells.length > 0) {
      rows.push(cells.join(' | '));
    }
  });
  
  return rows.join('\n');
}

/**
 * Extract main content area (skip navigation, footer, etc.)
 */
export function extractMainContent($: CheerioAPI, options: ParagraphExtractionOptions = {}): ParagraphData[] {
  // Remove navigation, header, footer, and other non-content elements
  const $content = $.load($.html());
  
  $content('nav, header, footer, .nav, .navigation, .navbar, .menu, .sidebar, .advertisement, .ads').remove();
  
  return extractParagraphs($content, options);
}

/**
 * Extract content by section
 */
export function extractContentBySection($: CheerioAPI, options: ParagraphExtractionOptions = {}): Record<string, ParagraphData[]> {
  const sections: Record<string, ParagraphData[]> = {};
  
  // Extract from main content areas
  $('main, .main, .content, .main-content, article, .article').each((_, el) => {
    const $el = $(el);
    const sectionId = $el.attr('id') || $el.attr('class') || 'main';
    const $section = $.load($el.html());
    sections[sectionId] = extractParagraphs($section, options);
  });
  
  // If no main sections found, extract from body
  if (Object.keys(sections).length === 0) {
    sections['body'] = extractMainContent($, options);
  }
  
  return sections;
}

/**
 * Calculate readability score (simplified)
 */
export function calculateReadabilityScore(paragraphs: ParagraphData[]): number {
  if (paragraphs.length === 0) return 0;
  
  let totalWords = 0;
  let totalSentences = 0;
  let totalSyllables = 0;
  
  for (const paragraph of paragraphs) {
    const words = paragraph.text.split(/\s+/);
    totalWords += words.length;
    
    // Count sentences (simple heuristic)
    const sentences = paragraph.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    totalSentences += sentences.length;
    
    // Count syllables (simplified)
    for (const word of words) {
      totalSyllables += countSyllables(word);
    }
  }
  
  if (totalWords === 0 || totalSentences === 0) return 0;
  
  // Simplified Flesch Reading Ease formula
  const avgWordsPerSentence = totalWords / totalSentences;
  const avgSyllablesPerWord = totalSyllables / totalWords;
  
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  
  return Math.max(0, Math.min(100, score));
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
 * Group paragraphs by type
 */
export function groupParagraphsByType(paragraphs: ParagraphData[]): Record<string, ParagraphData[]> {
  const grouped: Record<string, ParagraphData[]> = {};
  
  for (const paragraph of paragraphs) {
    if (!grouped[paragraph.type]) {
      grouped[paragraph.type] = [];
    }
    grouped[paragraph.type].push(paragraph);
  }
  
  return grouped;
}

/**
 * Extract paragraphs with metadata
 */
export function extractParagraphsWithMetadata($: CheerioAPI, options: ParagraphExtractionOptions = {}): {
  paragraphs: ParagraphData[];
  metadata: {
    totalWordCount: number;
    averageWordCount: number;
    readabilityScore: number;
    typeDistribution: Record<string, number>;
  };
} {
  const paragraphs = extractParagraphs($, options);
  const totalWordCount = paragraphs.reduce((sum, p) => sum + p.wordCount, 0);
  const averageWordCount = paragraphs.length > 0 ? totalWordCount / paragraphs.length : 0;
  const readabilityScore = calculateReadabilityScore(paragraphs);
  const typeDistribution = groupParagraphsByType(paragraphs);
  
  const metadata = {
    totalWordCount,
    averageWordCount: Math.round(averageWordCount),
    readabilityScore: Math.round(readabilityScore),
    typeDistribution: Object.fromEntries(
      Object.entries(typeDistribution).map(([type, items]) => [type, items.length])
    )
  };
  
  return { paragraphs, metadata };
}