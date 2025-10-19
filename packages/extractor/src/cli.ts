/**
 * CLI interface for the Site Generator Extractor v2
 * Provides command-line interface for extraction operations
 */

import minimist from 'minimist';
import { initializeCrawlSession, crawlWebsite } from './core/crawler.js';
import { loadHtml } from './core/htmlLoader.js';
import { extractImages } from './extractors/images.js';
import { extractNavbar } from './extractors/navbar.js';
import { extractParagraphs } from './extractors/paragraphs.js';
import { extractMiscData } from './extractors/misc.js';
import { extractTruthTable } from './extractors/truthTable.js';
import { writeJsonFile, ensureDirectoryExists } from './utils/file.js';
import { generateSlugFromUrl } from './utils/url.js';
import { ExtractorConfig, ExtractionResult, PackBundle } from './core/schema.js';
import fs from 'fs';
import path from 'path';

/**
 * Run extraction from URL
 */
export async function runExtractor(
  url: string,
  config: ExtractorConfig,
  options: {
    maxPages?: number;
    maxDepth?: number;
    respectRobots?: boolean;
    includeSitemap?: boolean;
    outputDir?: string;
  } = {}
): Promise<ExtractionResult[]> {
  const {
    maxPages = 10,
    maxDepth = 3,
    respectRobots = true,
    includeSitemap = true,
    outputDir = './build/extract'
  } = options;

  try {
    console.log(`Starting extraction from: ${url}`);
    
    // Initialize crawl session
    const session = await initializeCrawlSession(url, config, {
      maxPages,
      maxDepth,
      respectRobots,
      includeSitemap
    });

    // Perform crawl
    const crawlResults = await crawlWebsite(session);
    
    console.log(`Crawled ${crawlResults.length} pages`);

    // Extract data from each page
    const results: ExtractionResult[] = [];
    
    for (const crawlResult of crawlResults) {
      try {
        const result = await extractFromCrawlResult(crawlResult, outputDir);
        results.push(result);
        
        if (result.success) {
          console.log(`✓ Extracted: ${result.page?.slug}`);
        } else {
          console.log(`✗ Failed: ${result.error}`);
        }
      } catch (error) {
        results.push({
          success: false,
          error: `Failed to extract from ${crawlResult.url}: ${error}`
        });
      }
    }

    return results;
  } catch (error) {
    return [{
      success: false,
      error: `Extraction failed: ${error}`
    }];
  }
}

/**
 * Extract data from a single crawl result
 */
async function extractFromCrawlResult(
  crawlResult: any,
  outputDir: string
): Promise<ExtractionResult> {
  try {
    // Load and normalize HTML
    const normalizedHtml = loadHtml(crawlResult.html, crawlResult.finalUrl);
    
    // Extract all data
    const images = await extractImages(normalizedHtml.$, crawlResult.finalUrl, {
      pageSlug: generateSlugFromUrl(crawlResult.finalUrl)
    });
    
    const navbar = extractNavbar(normalizedHtml.$, crawlResult.finalUrl);
    
    const paragraphs = extractParagraphs(normalizedHtml.$);
    
    const misc = extractMiscData(normalizedHtml.$, crawlResult.finalUrl);
    
    const truthTable = await extractTruthTable(normalizedHtml.$, crawlResult.finalUrl);
    
    // Create pack bundle
    const packBundle: PackBundle = {
      slug: generateSlugFromUrl(crawlResult.finalUrl),
      truthTable,
      images,
      paragraphs,
      navbar,
      misc,
      metadata: {
        extractedAt: new Date().toISOString(),
        sourceUrl: crawlResult.finalUrl,
        pageCount: 1,
        version: '2.0.0'
      }
    };
    
    // Write output files
    await writeExtractionOutput(packBundle, normalizedHtml.html, outputDir);
    
    return {
      success: true,
      page: packBundle
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract data: ${error}`
    };
  }
}

/**
 * Write extraction output files
 */
async function writeExtractionOutput(
  packBundle: PackBundle,
  html: string,
  outputDir: string
): Promise<void> {
  // Ensure output directories exist
  ensureDirectoryExists(outputDir);
  ensureDirectoryExists(path.join(outputDir, 'pages'));
  ensureDirectoryExists(path.join(outputDir, 'html'));
  ensureDirectoryExists(path.join(outputDir, 'logs'));
  
  // Write page JSON
  const pageJsonPath = path.join(outputDir, 'pages', `${packBundle.slug}.page.json`);
  writeJsonFile(pageJsonPath, packBundle);
  
  // Write HTML
  const htmlPath = path.join(outputDir, 'html', `${packBundle.slug}.html`);
  fs.writeFileSync(htmlPath, html, 'utf8');
  
  // Write log entry
  const logPath = path.join(outputDir, 'logs', 'extractor.log');
  const logEntry = {
    timestamp: new Date().toISOString(),
    slug: packBundle.slug,
    url: packBundle.metadata.sourceUrl,
    images: packBundle.images.length,
    paragraphs: packBundle.paragraphs.length,
    navbar: packBundle.navbar.length,
    success: true
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(logPath, logLine, 'utf8');
}

/**
 * Retry extraction for a specific plugin
 */
export async function retryExtraction(
  slug: string,
  plugin: string,
  htmlFile: string,
  outputDir: string
): Promise<ExtractionResult> {
  try {
    // Load existing page data
    const pageJsonPath = path.join(outputDir, 'pages', `${slug}.page.json`);
    if (!fs.existsSync(pageJsonPath)) {
      throw new Error(`Page JSON not found: ${pageJsonPath}`);
    }
    
    const existingPage = JSON.parse(fs.readFileSync(pageJsonPath, 'utf8'));
    const html = fs.readFileSync(htmlFile, 'utf8');
    
    // Load and normalize HTML
    const normalizedHtml = loadHtml(html, existingPage.metadata.sourceUrl);
    
    // Re-extract specific plugin
    let newData: any;
    
    switch (plugin) {
      case 'images':
        newData = await extractImages(normalizedHtml.$, existingPage.metadata.sourceUrl, {
          pageSlug: slug
        });
        existingPage.images = newData;
        break;
        
      case 'navbar':
        newData = extractNavbar(normalizedHtml.$, existingPage.metadata.sourceUrl);
        existingPage.navbar = newData;
        break;
        
      case 'paragraphs':
        newData = extractParagraphs(normalizedHtml.$);
        existingPage.paragraphs = newData;
        break;
        
      case 'misc':
        newData = extractMiscData(normalizedHtml.$, existingPage.metadata.sourceUrl);
        existingPage.misc = newData;
        break;
        
      case 'truthTable':
        newData = await extractTruthTable(normalizedHtml.$, existingPage.metadata.sourceUrl);
        existingPage.truthTable = newData;
        break;
        
      default:
        throw new Error(`Unknown plugin: ${plugin}`);
    }
    
    // Write updated page JSON
    writeJsonFile(pageJsonPath, existingPage);
    
    // Write log entry
    const logPath = path.join(outputDir, 'logs', 'extractor.log');
    const logEntry = {
      timestamp: new Date().toISOString(),
      slug,
      plugin,
      action: 'retry',
      success: true
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logPath, logLine, 'utf8');
    
    return {
      success: true,
      page: existingPage,
      warnings: [`Retried ${plugin} extraction`]
    };
  } catch (error) {
    return {
      success: false,
      error: `Retry failed: ${error}`
    };
  }
}

/**
 * Main CLI function
 */
export async function main(): Promise<void> {
  const argv = minimist(process.argv.slice(2));
  
  if (argv.help || argv.h) {
    console.log(`
Site Generator Extractor v2

Usage:
  pnpm extractor run --url <url> [options]
  pnpm extractor retry --slug <slug> --plugin <plugin> --from <html-file> [options]

Commands:
  run                     Extract data from URL
  retry                   Retry extraction for specific plugin

Options:
  --url, -u <url>         URL to extract from
  --max-pages <number>    Maximum pages to crawl (default: 10)
  --max-depth <number>    Maximum crawl depth (default: 3)
  --output, -o <dir>      Output directory (default: ./build/extract)
  --slug <slug>           Page slug for retry operation
  --plugin <plugin>       Plugin to retry (images, navbar, paragraphs, misc, truthTable)
  --from <html-file>      HTML file to extract from (for retry)
  --no-robots             Don't respect robots.txt
  --no-sitemap            Don't use sitemap
  --help, -h              Show this help

Examples:
  pnpm extractor run --url https://example.com
  pnpm extractor run --url https://example.com --max-pages 5 --output ./my-extract
  pnpm extractor retry --slug home-page --plugin images --from ./build/extract/html/home-page.html
`);
    process.exit(0);
  }
  
  const command = argv._[0];
  
  if (command === 'run') {
    const url = argv.url || argv.u;
    if (!url) {
      console.error('Error: --url is required for run command');
      process.exit(1);
    }
    
    const config: ExtractorConfig = {
      userAgent: 'SG-Extractor/2.0',
      timeout: 30000,
      maxRedirects: 5,
      includeImages: true,
      includeLinks: true,
      maxImageSize: 5242880,
      usePlaywright: true,
      headless: true,
      waitForTimeout: 2000
    };
    
    const options = {
      maxPages: parseInt(argv['max-pages'] || '10'),
      maxDepth: parseInt(argv['max-depth'] || '3'),
      respectRobots: !argv['no-robots'],
      includeSitemap: !argv['no-sitemap'],
      outputDir: argv.output || argv.o || './build/extract'
    };
    
    console.log(`Extracting from: ${url}`);
    const results = await runExtractor(url, config, options);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const result of results) {
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        console.error(`Error: ${result.error}`);
      }
    }
    
    console.log(`\nExtraction complete: ${successCount} successful, ${errorCount} failed`);
    
  } else if (command === 'retry') {
    const slug = argv.slug;
    const plugin = argv.plugin;
    const htmlFile = argv.from;
    
    if (!slug || !plugin || !htmlFile) {
      console.error('Error: --slug, --plugin, and --from are required for retry command');
      process.exit(1);
    }
    
    const outputDir = argv.output || argv.o || './build/extract';
    
    console.log(`Retrying ${plugin} extraction for ${slug} from ${htmlFile}`);
    const result = await retryExtraction(slug, plugin, htmlFile, outputDir);
    
    if (result.success) {
      console.log(`✓ Retry successful`);
    } else {
      console.error(`✗ Retry failed: ${result.error}`);
      process.exit(1);
    }
    
  } else {
    console.error('Error: Unknown command. Use --help for usage information.');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

