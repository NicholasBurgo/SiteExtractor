/**
 * Sitemap parser and URL extractor
 * Provides sitemap parsing and URL extraction functions
 */

import { fetch } from 'node-fetch';
import { parseString } from 'fast-xml-parser';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export interface Sitemap {
  urls: SitemapUrl[];
  sitemaps: string[];
}

/**
 * Parse XML sitemap content
 */
export function parseSitemapXml(content: string): Sitemap {
  try {
    const parser = new parseString({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    
    const result = parser.parse(content);
    const sitemap: Sitemap = {
      urls: [],
      sitemaps: []
    };

    // Handle sitemap index
    if (result.sitemapindex) {
      const sitemaps = result.sitemapindex.sitemap;
      if (Array.isArray(sitemaps)) {
        for (const sitemapEntry of sitemaps) {
          if (sitemapEntry.loc) {
            sitemap.sitemaps.push(sitemapEntry.loc);
          }
        }
      } else if (sitemaps && sitemaps.loc) {
        sitemap.sitemaps.push(sitemaps.loc);
      }
    }

    // Handle regular sitemap
    if (result.urlset) {
      const urls = result.urlset.url;
      if (Array.isArray(urls)) {
        for (const url of urls) {
          sitemap.urls.push({
            loc: url.loc,
            lastmod: url.lastmod,
            changefreq: url.changefreq,
            priority: url.priority ? parseFloat(url.priority) : undefined
          });
        }
      } else if (urls && urls.loc) {
        sitemap.urls.push({
          loc: urls.loc,
          lastmod: urls.lastmod,
          changefreq: urls.changefreq,
          priority: urls.priority ? parseFloat(urls.priority) : undefined
        });
      }
    }

    return sitemap;
  } catch (error) {
    console.warn('Failed to parse sitemap XML:', error);
    return { urls: [], sitemaps: [] };
  }
}

/**
 * Parse text sitemap content
 */
export function parseSitemapText(content: string): Sitemap {
  const lines = content.split('\n').map(line => line.trim());
  const sitemap: Sitemap = {
    urls: [],
    sitemaps: []
  };

  for (const line of lines) {
    if (line.startsWith('#') || line === '') continue;
    
    try {
      new URL(line); // Validate URL
      sitemap.urls.push({ loc: line });
    } catch (error) {
      // Skip invalid URLs
    }
  }

  return sitemap;
}

/**
 * Parse sitemap content (auto-detect format)
 */
export function parseSitemap(content: string): Sitemap {
  const trimmed = content.trim();
  
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
    return parseSitemapXml(content);
  } else {
    return parseSitemapText(content);
  }
}

/**
 * Fetch and parse sitemap from URL
 */
export async function fetchSitemap(sitemapUrl: string): Promise<Sitemap> {
  try {
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const content = await response.text();
    return parseSitemap(content);
  } catch (error) {
    console.warn(`Failed to fetch sitemap from ${sitemapUrl}:`, error);
    return { urls: [], sitemaps: [] };
  }
}

/**
 * Extract URLs from sitemap
 */
export function extractUrlsFromSitemap(sitemap: Sitemap): string[] {
  return sitemap.urls.map(url => url.loc);
}

/**
 * Extract URLs from sitemap URL
 */
export async function extractUrlsFromSitemapUrl(sitemapUrl: string): Promise<string[]> {
  const sitemap = await fetchSitemap(sitemapUrl);
  return extractUrlsFromSitemap(sitemap);
}

/**
 * Filter URLs by priority
 */
export function filterUrlsByPriority(sitemap: Sitemap, minPriority: number = 0.5): SitemapUrl[] {
  return sitemap.urls.filter(url => 
    url.priority === undefined || url.priority >= minPriority
  );
}

/**
 * Filter URLs by change frequency
 */
export function filterUrlsByChangeFreq(sitemap: Sitemap, frequencies: string[] = ['daily', 'weekly']): SitemapUrl[] {
  return sitemap.urls.filter(url => 
    url.changefreq === undefined || frequencies.includes(url.changefreq)
  );
}

/**
 * Sort URLs by priority
 */
export function sortUrlsByPriority(sitemap: Sitemap): SitemapUrl[] {
  return [...sitemap.urls].sort((a, b) => {
    const priorityA = a.priority || 0.5;
    const priorityB = b.priority || 0.5;
    return priorityB - priorityA;
  });
}

/**
 * Sort URLs by last modified date
 */
export function sortUrlsByLastMod(sitemap: Sitemap): SitemapUrl[] {
  return [...sitemap.urls].sort((a, b) => {
    if (!a.lastmod) return 1;
    if (!b.lastmod) return -1;
    return new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime();
  });
}

/**
 * Get sitemap statistics
 */
export function getSitemapStats(sitemap: Sitemap): {
  totalUrls: number;
  totalSitemaps: number;
  priorityDistribution: Record<string, number>;
  changeFreqDistribution: Record<string, number>;
  avgPriority: number;
} {
  const stats = {
    totalUrls: sitemap.urls.length,
    totalSitemaps: sitemap.sitemaps.length,
    priorityDistribution: {} as Record<string, number>,
    changeFreqDistribution: {} as Record<string, number>,
    avgPriority: 0
  };

  let totalPriority = 0;
  let priorityCount = 0;

  for (const url of sitemap.urls) {
    // Count priorities
    if (url.priority !== undefined) {
      const priorityKey = url.priority.toFixed(1);
      stats.priorityDistribution[priorityKey] = (stats.priorityDistribution[priorityKey] || 0) + 1;
      totalPriority += url.priority;
      priorityCount++;
    }

    // Count change frequencies
    if (url.changefreq) {
      stats.changeFreqDistribution[url.changefreq] = (stats.changeFreqDistribution[url.changefreq] || 0) + 1;
    }
  }

  stats.avgPriority = priorityCount > 0 ? totalPriority / priorityCount : 0;

  return stats;
}

/**
 * Validate sitemap URLs
 */
export function validateSitemapUrls(sitemap: Sitemap): {
  validUrls: string[];
  invalidUrls: string[];
  errors: string[];
} {
  const validUrls: string[] = [];
  const invalidUrls: string[] = [];
  const errors: string[] = [];

  for (const url of sitemap.urls) {
    try {
      new URL(url.loc);
      validUrls.push(url.loc);
    } catch (error) {
      invalidUrls.push(url.loc);
      errors.push(`Invalid URL: ${url.loc}`);
    }
  }

  return { validUrls, invalidUrls, errors };
}

/**
 * Generate sitemap XML
 */
export function generateSitemapXml(sitemap: Sitemap): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of sitemap.urls) {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    
    if (url.lastmod) {
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    }
    
    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }
    
    if (url.priority !== undefined) {
      xml += `    <priority>${url.priority}</priority>\n`;
    }
    
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

/**
 * Generate sitemap index XML
 */
export function generateSitemapIndexXml(sitemaps: string[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const sitemap of sitemaps) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${sitemap}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += '  </sitemap>\n';
  }

  xml += '</sitemapindex>';
  return xml;
}

