import fetch from 'node-fetch';
import { crawlUrlWithPlaywright } from './playwright_fetcher.js';
import type { ExtractorConfig } from '../types.js';

export interface CrawlResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  contentType?: string;
  contentLength?: number;
}

/**
 * Crawl a URL and return HTML content
 */
export async function crawlUrl(url: string, config: Partial<ExtractorConfig> = {}): Promise<CrawlResult> {
  // Use Playwright if enabled
  if (config.usePlaywright) {
    return await crawlUrlWithPlaywright(url, {
      headless: config.headless !== false,
      timeout: config.timeout || 30000,
      userAgent: config.userAgent || 'SG-Extractor/1.0',
      waitForTimeout: config.waitForTimeout || 2000
    });
  }
  const {
    userAgent = 'SG-Extractor/1.0',
    timeout = 30000,
    maxRedirects = 5
  } = config;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow',
      size: 10 * 1024 * 1024 // 10MB limit
    } as any);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    return {
      html,
      finalUrl: response.url,
      statusCode: response.status,
      contentType: response.headers.get('content-type') || undefined,
      contentLength: parseInt(response.headers.get('content-length') || '0') || undefined
    };
    
  } catch (error) {
    throw new Error(`Failed to crawl ${url}: ${error}`);
  }
}

/**
 * Crawl from local HTML file
 */
export async function crawlFromFile(filePath: string): Promise<CrawlResult> {
  const fs = await import('fs');
  const path = await import('path');
  
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const finalUrl = `file://${path.resolve(filePath)}`;
    
    return {
      html,
      finalUrl,
      statusCode: 200,
      contentType: 'text/html',
      contentLength: html.length
    };
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

/**
 * Crawl from HTML string
 */
export function crawlFromString(html: string, url: string = 'about:blank'): CrawlResult {
  return {
    html,
    finalUrl: url,
    statusCode: 200,
    contentType: 'text/html',
    contentLength: html.length
  };
}
