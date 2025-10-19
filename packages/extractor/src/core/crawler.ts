/**
 * Enhanced crawler with BFS, sitemap, and robots.txt parsing
 * Provides comprehensive site discovery and crawling capabilities
 */

import { CrawlResult, ExtractorConfig } from './schema.js';
import { parseRobotsTxt, checkRobotsAllowed } from '../utils/robots.js';
import { parseSitemap, extractUrlsFromSitemap } from '../utils/sitemap.js';
import { crawlUrl } from '../adapters/crawler.js';
import { normalizeUrl, isValidUrl } from '../utils/url.js';

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  respectRobots?: boolean;
  includeSitemap?: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
}

export interface CrawlSession {
  config: ExtractorConfig;
  options: CrawlOptions;
  visited: Set<string>;
  queue: Array<{ url: string; depth: number }>;
  results: CrawlResult[];
  robotsRules?: any;
  sitemapUrls?: string[];
}

/**
 * Initialize a crawl session with robots.txt and sitemap discovery
 */
export async function initializeCrawlSession(
  startUrl: string,
  config: ExtractorConfig,
  options: CrawlOptions = {}
): Promise<CrawlSession> {
  const session: CrawlSession = {
    config,
    options: {
      maxPages: 10,
      maxDepth: 3,
      respectRobots: true,
      includeSitemap: true,
      ...options
    },
    visited: new Set(),
    queue: [{ url: startUrl, depth: 0 }],
    results: []
  };

  // Parse robots.txt if enabled
  if (session.options.respectRobots) {
    try {
      const robotsUrl = new URL('/robots.txt', startUrl).toString();
      session.robotsRules = await parseRobotsTxt(robotsUrl);
    } catch (error) {
      console.warn('Failed to parse robots.txt:', error);
    }
  }

  // Discover sitemap URLs if enabled
  if (session.options.includeSitemap) {
    try {
      const sitemapUrl = new URL('/sitemap.xml', startUrl).toString();
      session.sitemapUrls = await extractUrlsFromSitemap(sitemapUrl);
      
      // Add sitemap URLs to queue (up to maxPages)
      const sitemapLimit = Math.min(session.sitemapUrls.length, session.options.maxPages! - 1);
      for (let i = 0; i < sitemapLimit; i++) {
        session.queue.push({ url: session.sitemapUrls[i], depth: 0 });
      }
    } catch (error) {
      console.warn('Failed to parse sitemap:', error);
    }
  }

  return session;
}

/**
 * Perform BFS crawl of the website
 */
export async function crawlWebsite(session: CrawlSession): Promise<CrawlResult[]> {
  const { maxPages, maxDepth, allowedDomains, blockedDomains } = session.options;
  
  while (session.queue.length > 0 && session.results.length < maxPages!) {
    const { url, depth } = session.queue.shift()!;
    
    // Skip if already visited or depth exceeded
    if (session.visited.has(url) || depth > maxDepth!) {
      continue;
    }
    
    // Check domain restrictions
    if (!isUrlAllowed(url, allowedDomains, blockedDomains)) {
      continue;
    }
    
    // Check robots.txt if enabled
    if (session.options.respectRobots && session.robotsRules) {
      if (!checkRobotsAllowed(url, session.robotsRules)) {
        console.log(`Skipping ${url} - blocked by robots.txt`);
        continue;
      }
    }
    
    try {
      console.log(`Crawling: ${url} (depth: ${depth})`);
      const result = await crawlUrl(url, session.config);
      
      session.results.push(result);
      session.visited.add(url);
      
      // Extract links for further crawling
      const links = extractLinksFromHtml(result.html, url);
      
      // Add new links to queue
      for (const link of links) {
        if (!session.visited.has(link) && depth < maxDepth!) {
          session.queue.push({ url: link, depth: depth + 1 });
        }
      }
      
    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error);
    }
  }
  
  return session.results;
}

/**
 * Extract internal links from HTML content
 */
function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const base = new URL(baseUrl);
  
  // Simple regex to find href attributes
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;
  
  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      const url = new URL(href, baseUrl);
      
      // Only include internal links
      if (url.hostname === base.hostname) {
        links.push(url.toString());
      }
    } catch (error) {
      // Skip invalid URLs
    }
  }
  
  return [...new Set(links)]; // Remove duplicates
}

/**
 * Check if URL is allowed based on domain restrictions
 */
function isUrlAllowed(
  url: string,
  allowedDomains?: string[],
  blockedDomains?: string[]
): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check blocked domains first
    if (blockedDomains) {
      for (const blocked of blockedDomains) {
        if (hostname.includes(blocked)) {
          return false;
        }
      }
    }
    
    // Check allowed domains
    if (allowedDomains && allowedDomains.length > 0) {
      for (const allowed of allowedDomains) {
        if (hostname.includes(allowed)) {
          return true;
        }
      }
      return false; // Not in allowed list
    }
    
    return true; // No restrictions
  } catch (error) {
    return false; // Invalid URL
  }
}

/**
 * Crawl a single URL with enhanced error handling
 */
export async function crawlSingleUrl(url: string, config: ExtractorConfig): Promise<CrawlResult> {
  return await crawlUrl(url, config);
}

/**
 * Get crawl statistics
 */
export function getCrawlStats(session: CrawlSession): {
  totalPages: number;
  visitedPages: number;
  queuedPages: number;
  sitemapUrls: number;
} {
  return {
    totalPages: session.results.length,
    visitedPages: session.visited.size,
    queuedPages: session.queue.length,
    sitemapUrls: session.sitemapUrls?.length || 0
  };
}

