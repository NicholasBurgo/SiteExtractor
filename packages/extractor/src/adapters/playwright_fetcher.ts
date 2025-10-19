import { chromium, Browser, Page } from 'playwright';
import type { CrawlResult } from './crawler.js';

export interface PlaywrightConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
  waitForSelector?: string;
  waitForTimeout?: number;
}

/**
 * Crawl a URL using Playwright browser automation
 */
export async function crawlUrlWithPlaywright(
  url: string, 
  config: PlaywrightConfig = {}
): Promise<CrawlResult> {
  const {
    headless = true,
    timeout = 30000,
    userAgent = 'SG-Extractor/1.0',
    viewport = { width: 1920, height: 1080 },
    waitForSelector,
    waitForTimeout = 2000
  } = config;

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    browser = await chromium.launch({ 
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create new page
    page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewportSize(viewport);
    await page.setExtraHTTPHeaders({
      'User-Agent': userAgent
    });

    // Set timeout
    page.setDefaultTimeout(timeout);

    // Navigate to URL
    const response = await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout 
    });

    if (!response) {
      throw new Error(`Failed to load ${url}`);
    }

    // Wait for specific selector if provided
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 5000 });
      } catch (error) {
        console.warn(`Selector ${waitForSelector} not found, continuing...`);
      }
    }

    // Wait for additional timeout to ensure content is loaded
    if (waitForTimeout > 0) {
      await page.waitForTimeout(waitForTimeout);
    }

    // Get page content
    const html = await page.content();
    const finalUrl = page.url();
    const statusCode = response.status();

    // Get response headers
    const headers = await response.allHeaders();
    const contentType = headers['content-type'] || 'text/html';

    return {
      html,
      finalUrl,
      statusCode,
      contentType,
      contentLength: html.length
    };

  } catch (error) {
    throw new Error(`Playwright crawl failed for ${url}: ${error}`);
  } finally {
    // Clean up
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Crawl multiple URLs with Playwright
 */
export async function crawlUrlsWithPlaywright(
  urls: string[],
  config: PlaywrightConfig = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  
  for (const url of urls) {
    try {
      const result = await crawlUrlWithPlaywright(url, config);
      results.push(result);
    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error);
      // Add error result
      results.push({
        html: '',
        finalUrl: url,
        statusCode: 0,
        contentType: 'text/html',
        contentLength: 0
      });
    }
  }
  
  return results;
}
