/**
 * Robots.txt parser and validator
 * Provides robots.txt parsing and URL validation functions
 */

import { fetch } from 'node-fetch';

export interface RobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}

export interface RobotsTxt {
  rules: RobotsRule[];
  sitemaps: string[];
  host?: string;
}

/**
 * Parse robots.txt content
 */
export function parseRobotsTxt(content: string): RobotsTxt {
  const lines = content.split('\n').map(line => line.trim());
  const robots: RobotsTxt = {
    rules: [],
    sitemaps: []
  };

  let currentRule: RobotsRule | null = null;

  for (const line of lines) {
    if (line.startsWith('#') || line === '') continue;

    const [directive, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    switch (directive.toLowerCase()) {
      case 'user-agent':
        if (currentRule) {
          robots.rules.push(currentRule);
        }
        currentRule = {
          userAgent: value,
          allow: [],
          disallow: []
        };
        break;

      case 'allow':
        if (currentRule) {
          currentRule.allow.push(value);
        }
        break;

      case 'disallow':
        if (currentRule) {
          currentRule.disallow.push(value);
        }
        break;

      case 'crawl-delay':
        if (currentRule) {
          currentRule.crawlDelay = parseInt(value) || 0;
        }
        break;

      case 'sitemap':
        robots.sitemaps.push(value);
        break;

      case 'host':
        robots.host = value;
        break;
    }
  }

  if (currentRule) {
    robots.rules.push(currentRule);
  }

  return robots;
}

/**
 * Fetch and parse robots.txt from URL
 */
export async function fetchRobotsTxt(robotsUrl: string): Promise<RobotsTxt> {
  try {
    const response = await fetch(robotsUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const content = await response.text();
    return parseRobotsTxt(content);
  } catch (error) {
    console.warn(`Failed to fetch robots.txt from ${robotsUrl}:`, error);
    return { rules: [], sitemaps: [] };
  }
}

/**
 * Check if URL is allowed by robots.txt
 */
export function checkRobotsAllowed(url: string, robots: RobotsTxt, userAgent: string = '*'): boolean {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Find applicable rules
    const applicableRules = robots.rules.filter(rule => 
      rule.userAgent === '*' || rule.userAgent === userAgent
    );

    if (applicableRules.length === 0) {
      return true; // No specific rules, allow by default
    }

    // Check each applicable rule
    for (const rule of applicableRules) {
      // Check disallow patterns
      for (const disallowPattern of rule.disallow) {
        if (matchesPattern(path, disallowPattern)) {
          // Check if there's a more specific allow pattern
          let allowed = false;
          for (const allowPattern of rule.allow) {
            if (matchesPattern(path, allowPattern)) {
              allowed = true;
              break;
            }
          }
          if (!allowed) {
            return false;
          }
        }
      }
    }

    return true;
  } catch (error) {
    return true; // Allow if URL is invalid
  }
}

/**
 * Check if path matches robots.txt pattern
 */
function matchesPattern(path: string, pattern: string): boolean {
  if (pattern === '') return false;
  if (pattern === '/') return true;

  // Convert robots.txt pattern to regex
  let regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*/g, '.*') // Convert * to .*
    .replace(/\$/g, '$'); // Keep $ as end anchor

  // Add start anchor if not present
  if (!regexPattern.startsWith('^')) {
    regexPattern = '^' + regexPattern;
  }

  // Add end anchor if not present
  if (!regexPattern.endsWith('$')) {
    regexPattern = regexPattern + '$';
  }

  try {
    const regex = new RegExp(regexPattern);
    return regex.test(path);
  } catch (error) {
    return false;
  }
}

/**
 * Get crawl delay for user agent
 */
export function getCrawlDelay(robots: RobotsTxt, userAgent: string = '*'): number {
  const applicableRules = robots.rules.filter(rule => 
    rule.userAgent === '*' || rule.userAgent === userAgent
  );

  for (const rule of applicableRules) {
    if (rule.crawlDelay !== undefined) {
      return rule.crawlDelay;
    }
  }

  return 0; // No crawl delay specified
}

/**
 * Extract sitemap URLs from robots.txt
 */
export function extractSitemapUrls(robots: RobotsTxt): string[] {
  return robots.sitemaps;
}

/**
 * Validate robots.txt rules
 */
export function validateRobotsRules(robots: RobotsTxt): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate user agents
  const userAgents = robots.rules.map(rule => rule.userAgent);
  const duplicates = userAgents.filter((agent, index) => userAgents.indexOf(agent) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate user agents found: ${duplicates.join(', ')}`);
  }

  // Check for invalid patterns
  for (const rule of robots.rules) {
    for (const pattern of [...rule.allow, ...rule.disallow]) {
      if (pattern.includes('**')) {
        warnings.push(`Double asterisk pattern may not work as expected: ${pattern}`);
      }
    }
  }

  // Check for missing wildcard rule
  const hasWildcard = robots.rules.some(rule => rule.userAgent === '*');
  if (!hasWildcard) {
    warnings.push('No wildcard (*) user agent rule found');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate robots.txt content
 */
export function generateRobotsTxt(robots: RobotsTxt): string {
  let content = '';

  // Add host directive if present
  if (robots.host) {
    content += `Host: ${robots.host}\n\n`;
  }

  // Add rules
  for (const rule of robots.rules) {
    content += `User-agent: ${rule.userAgent}\n`;
    
    for (const allow of rule.allow) {
      content += `Allow: ${allow}\n`;
    }
    
    for (const disallow of rule.disallow) {
      content += `Disallow: ${disallow}\n`;
    }
    
    if (rule.crawlDelay !== undefined) {
      content += `Crawl-delay: ${rule.crawlDelay}\n`;
    }
    
    content += '\n';
  }

  // Add sitemaps
  for (const sitemap of robots.sitemaps) {
    content += `Sitemap: ${sitemap}\n`;
  }

  return content;
}

