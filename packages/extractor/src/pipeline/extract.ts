import * as cheerio from 'cheerio';
import type { ExtractedPage, ExtractionResult, Field } from '../types.js';
import { extractNavbar } from '../extractors/navbar.js';
import { extractImages, createImageIndex } from '../extractors/image.js';
import { extractParagraphs } from '../extractors/paragraphs.js';
import { extractMiscData } from '../extractors/misc.js';
import { extractTruthTableFromHtml } from '../extractors/truthTable.js';
import { generateSlug } from '../utils/dom.js';

/**
 * Helper function to wrap extractor results in Field
 */
function wrapInField<T>(value: T, status: Field<T>['status'] = 'ok', confidence: number = 0.8, notes?: string): Field<T> {
  return { value, status, confidence, notes };
}

/**
 * Helper function to wrap navbar extraction
 */
function extractNavbarField($: any, baseUrl: string): Field<any[]> {
  try {
    const navbar = extractNavbar($, baseUrl);
    return wrapInField(navbar, navbar.length > 0 ? 'ok' : 'missing', navbar.length > 0 ? 0.8 : 0);
  } catch (error) {
    return wrapInField([], 'error', 0, `Navbar extraction failed: ${error}`);
  }
}

/**
 * Helper function to wrap paragraph extraction
 */
function extractParagraphsField($: any, options: any = {}): Field<any[]> {
  try {
    const blocks = extractParagraphs($, options);
    return wrapInField(blocks, blocks.length > 0 ? 'ok' : 'missing', blocks.length > 0 ? 0.8 : 0);
  } catch (error) {
    return wrapInField([], 'error', 0, `Paragraph extraction failed: ${error}`);
  }
}

/**
 * Helper function to wrap misc data extraction
 */
function extractMiscDataField($: any, baseUrl: string, options: any = {}): Field<any> {
  try {
    const miscData = extractMiscData($, baseUrl, options);
    return wrapInField(miscData, 'ok', 0.7);
  } catch (error) {
    return wrapInField({}, 'error', 0, `Misc data extraction failed: ${error}`);
  }
}

/**
 * Helper function to wrap truth table extraction
 */
function extractTruthTableField($: any): Field<any> {
  try {
    const truth = extractTruthTableFromHtml($);
    return wrapInField(truth, truth.table.length > 0 ? 'ok' : 'missing', truth.table.length > 0 ? 0.6 : 0);
  } catch (error) {
    return wrapInField({ table: [] }, 'error', 0, `Truth table extraction failed: ${error}`);
  }
}

/**
 * Extract all data from HTML content
 */
export async function extractFromHtml(
  url: string, 
  html: string, 
  options: any = {}
): Promise<ExtractionResult> {
  try {
    const $ = cheerio.load(html);
    
    // Extract basic page information
    const title = $('head > title').first().text().trim();
    const slug = generateSlug(title || new URL(url).pathname || 'page');
    
    // Extract all data using Field wrappers
    const navbarField = extractNavbarField($, url);
    const imagesField = await extractImages($, url, { pageSlug: slug });
    const blocksField = extractParagraphsField($, options.paragraphOptions);
    const miscDataField = extractMiscDataField($, url, options.miscOptions);
    const truthField = extractTruthTableField($);
    
    // Create image index for convenience
    const imageIndexField = imagesField.value 
      ? wrapInField(createImageIndex(imagesField.value), 'ok', imagesField.confidence)
      : wrapInField({}, 'missing', 0);
    
    // Build the extracted page with Field wrappers
    const page: ExtractedPage = {
      slug,
      source: {
        url,
        crawledAt: new Date().toISOString()
      },
      meta: miscDataField.value?.meta ? wrapInField(miscDataField.value.meta, 'ok', 0.8) : wrapInField({}, 'missing', 0),
      navbar: navbarField,
      blocks: blocksField,
      images: imagesField,
      imageIndex: imageIndexField,
      links: miscDataField.value?.links ? wrapInField(miscDataField.value.links, 'ok', 0.7) : wrapInField([], 'missing', 0),
      truth: truthField,
      diagnostics: miscDataField.value?.diagnostics ? wrapInField(miscDataField.value.diagnostics, 'ok', 0.6) : wrapInField({}, 'missing', 0)
    };
    
    return {
      success: true,
      page,
      warnings: []
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Extraction failed: ${error}`,
      warnings: []
    };
  }
}

/**
 * Extract from multiple URLs
 */
export async function extractFromUrls(
  urls: string[], 
  options: any = {}
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];
  
  for (const url of urls) {
    try {
      const { crawlUrl } = await import('../adapters/crawler.js');
      const crawlResult = await crawlUrl(url, options.crawlerConfig);
      const result = await extractFromHtml(crawlResult.finalUrl, crawlResult.html, options);
      
      // Add crawl metadata
      if (result.page && result.success) {
        result.page.source.statusCode = crawlResult.statusCode;
        result.page.source.contentType = crawlResult.contentType;
        result.page.source.contentLength = crawlResult.contentLength;
      }
      
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        error: `Failed to crawl ${url}: ${error}`,
        warnings: []
      });
    }
  }
  
  return results;
}

/**
 * Extract from local HTML file
 */
export async function extractFromFile(
  filePath: string, 
  options: any = {}
): Promise<ExtractionResult> {
  try {
    const { crawlFromFile } = await import('../adapters/crawler.js');
    const crawlResult = await crawlFromFile(filePath);
    return await extractFromHtml(crawlResult.finalUrl, crawlResult.html, options);
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract from file ${filePath}: ${error}`,
      warnings: []
    };
  }
}

/**
 * Extract from HTML string
 */
export async function extractFromString(
  html: string, 
  url: string = 'about:blank', 
  options: any = {}
): Promise<ExtractionResult> {
  try {
    const { crawlFromString } = await import('../adapters/crawler.js');
    const crawlResult = crawlFromString(html, url);
    return await extractFromHtml(crawlResult.finalUrl, crawlResult.html, options);
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract from string: ${error}`,
      warnings: []
    };
  }
}
