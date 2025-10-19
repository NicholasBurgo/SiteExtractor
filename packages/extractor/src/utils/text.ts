/**
 * Text processing utilities
 * Provides text normalization, cleaning, and analysis functions
 */

/**
 * Normalize text content
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Clean HTML text content
 */
export function cleanHtmlText(html: string): string {
  return html
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
}

/**
 * Extract text from HTML element
 */
export function extractTextFromElement(element: any): string {
  return element.text().trim();
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count sentences in text
 */
export function countSentences(text: string): number {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
}

/**
 * Count syllables in a word (simplified)
 */
export function countSyllables(word: string): number {
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
 * Calculate Flesch Reading Ease score
 */
export function calculateFleschScore(text: string): number {
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
 * Extract keywords from text
 */
export function extractKeywords(text: string, minLength: number = 3): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length >= minLength);
  
  // Count word frequency
  const frequency: Record<string, number> = {};
  for (const word of words) {
    frequency[word] = (frequency[word] || 0) + 1;
  }
  
  // Sort by frequency and return top keywords
  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Remove duplicate lines from text
 */
export function removeDuplicateLines(text: string): string {
  const lines = text.split('\n');
  const uniqueLines = [...new Set(lines)];
  return uniqueLines.join('\n');
}

/**
 * Extract first paragraph from text
 */
export function extractFirstParagraph(text: string): string {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs[0] || text;
}

/**
 * Extract last paragraph from text
 */
export function extractLastParagraph(text: string): string {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs[paragraphs.length - 1] || text;
}

/**
 * Check if text contains specific keywords
 */
export function containsKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Extract sentences containing specific keywords
 */
export function extractSentencesWithKeywords(text: string, keywords: string[]): string[] {
  const sentences = text.split(/[.!?]+/);
  return sentences.filter(sentence => 
    containsKeywords(sentence, keywords)
  ).map(sentence => sentence.trim());
}

/**
 * Generate text summary
 */
export function generateTextSummary(text: string, maxSentences: number = 3): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (sentences.length <= maxSentences) {
    return text;
  }
  
  // Simple extractive summarization - take first few sentences
  return sentences.slice(0, maxSentences).join('. ') + '.';
}

/**
 * Detect language of text (simplified)
 */
export function detectLanguage(text: string): string {
  // Simple heuristic based on common words
  const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le'];
  const frenchWords = ['le', 'la', 'de', 'et', 'à', 'un', 'il', 'que', 'ne', 'se', 'ce', 'pas', 'pour', 'par'];
  
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let englishCount = 0;
  let spanishCount = 0;
  let frenchCount = 0;
  
  for (const word of words) {
    if (englishWords.includes(word)) englishCount++;
    if (spanishWords.includes(word)) spanishCount++;
    if (frenchWords.includes(word)) frenchCount++;
  }
  
  if (spanishCount > englishCount && spanishCount > frenchCount) return 'es';
  if (frenchCount > englishCount && frenchCount > spanishCount) return 'fr';
  return 'en'; // Default to English
}

