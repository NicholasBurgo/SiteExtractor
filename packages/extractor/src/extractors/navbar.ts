/**
 * Navigation bar extractor
 * Extracts navigation links and structure from HTML
 */

import type { CheerioAPI } from 'cheerio';
import { NavbarItem } from '../core/schema.js';
import { normalizeUrl } from '../utils/url.js';

export interface NavbarExtractionOptions {
  maxDepth?: number;
  includeExternal?: boolean;
  normalizeText?: boolean;
  baseUrl?: string;
}

/**
 * Extract navigation items from HTML
 */
export function extractNavbar(
  $: CheerioAPI,
  baseUrl: string,
  options: NavbarExtractionOptions = {}
): NavbarItem[] {
  const {
    maxDepth = 3,
    includeExternal = false,
    normalizeText = true,
    baseUrl: optionBaseUrl
  } = options;

  const actualBaseUrl = optionBaseUrl || baseUrl;
  const navbarItems: NavbarItem[] = [];
  const seen = new Set<string>();

  // Look for navigation elements
  const navSelectors = [
    'nav',
    '.nav',
    '.navigation',
    '.navbar',
    '.menu',
    '.main-menu',
    '.primary-menu',
    '.header-menu',
    '.site-menu',
    '.top-menu',
    '.main-nav',
    '.primary-nav',
    '.site-nav',
    '.header-nav'
  ];

  for (const selector of navSelectors) {
    $(selector).each((_, navEl) => {
      const $nav = $(navEl);
      extractNavbarFromElement($nav, actualBaseUrl, navbarItems, seen, maxDepth, includeExternal, normalizeText);
    });
  }

  // If no navigation found, look for common header patterns
  if (navbarItems.length === 0) {
    $('header').each((_, headerEl) => {
      const $header = $(headerEl);
      $header.find('a[href]').each((_, linkEl) => {
        const $link = $(linkEl);
        const href = $link.attr('href');
        const text = $link.text().trim();

        if (href && text && !seen.has(href)) {
          try {
            const normalizedHref = new URL(href, actualBaseUrl).toString();
            const isExternal = !normalizedHref.startsWith(actualBaseUrl);

            if (includeExternal || !isExternal) {
              navbarItems.push({
                text: normalizeText ? normalizeNavText(text) : text,
                href: normalizedHref,
                isExternal,
                depth: 0
              });
              seen.add(href);
            }
          } catch (error) {
            // Skip invalid URLs
          }
        }
      });
    });
  }

  return navbarItems;
}

/**
 * Extract navigation items from a specific element
 */
function extractNavbarFromElement(
  $nav: any,
  baseUrl: string,
  navbarItems: NavbarItem[],
  seen: Set<string>,
  maxDepth: number,
  includeExternal: boolean,
  normalizeText: boolean,
  currentDepth: number = 0
): void {
  if (currentDepth >= maxDepth) return;

  $nav.find('a[href]').each((_, linkEl) => {
    const $link = $(linkEl);
    const href = $link.attr('href');
    const text = $link.text().trim();

    if (href && text && !seen.has(href)) {
      try {
        const normalizedHref = new URL(href, baseUrl).toString();
        const isExternal = !normalizedHref.startsWith(baseUrl);

        if (includeExternal || !isExternal) {
          navbarItems.push({
            text: normalizeText ? normalizeNavText(text) : text,
            href: normalizedHref,
            isExternal,
            depth: currentDepth
          });
          seen.add(href);
        }
      } catch (error) {
        // Skip invalid URLs
      }
    }
  });

  // Look for nested navigation structures
  $nav.find('ul, ol').each((_, listEl) => {
    const $list = $(listEl);
    if ($list.find('a[href]').length > 0) {
      extractNavbarFromElement($list, baseUrl, navbarItems, seen, maxDepth, includeExternal, normalizeText, currentDepth + 1);
    }
  });
}

/**
 * Normalize navigation text
 */
function normalizeNavText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extract breadcrumb navigation
 */
export function extractBreadcrumbs($: CheerioAPI, baseUrl: string): NavbarItem[] {
  const breadcrumbs: NavbarItem[] = [];
  const seen = new Set<string>();

  // Look for breadcrumb elements
  const breadcrumbSelectors = [
    '.breadcrumb',
    '.breadcrumbs',
    '.breadcrumb-nav',
    '.breadcrumb-navigation',
    '.nav-breadcrumb',
    '[aria-label="breadcrumb"]',
    '[role="navigation"][aria-label*="breadcrumb"]'
  ];

  for (const selector of breadcrumbSelectors) {
    $(selector).find('a[href]').each((_, linkEl) => {
      const $link = $(linkEl);
      const href = $link.attr('href');
      const text = $link.text().trim();

      if (href && text && !seen.has(href)) {
        try {
          const normalizedHref = new URL(href, baseUrl).toString();
          breadcrumbs.push({
            text: normalizeNavText(text),
            href: normalizedHref,
            isExternal: !normalizedHref.startsWith(baseUrl),
            depth: breadcrumbs.length
          });
          seen.add(href);
        } catch (error) {
          // Skip invalid URLs
        }
      }
    });
  }

  return breadcrumbs;
}

/**
 * Extract footer navigation
 */
export function extractFooterNav($: CheerioAPI, baseUrl: string): NavbarItem[] {
  const footerNav: NavbarItem[] = [];
  const seen = new Set<string>();

  $('footer').find('a[href]').each((_, linkEl) => {
    const $link = $(linkEl);
    const href = $link.attr('href');
    const text = $link.text().trim();

    if (href && text && !seen.has(href)) {
      try {
        const normalizedHref = new URL(href, baseUrl).toString();
        footerNav.push({
          text: normalizeNavText(text),
          href: normalizedHref,
          isExternal: !normalizedHref.startsWith(baseUrl),
          depth: 0
        });
        seen.add(href);
      } catch (error) {
        // Skip invalid URLs
      }
    }
  });

  return footerNav;
}

/**
 * Group navigation items by depth
 */
export function groupNavbarByDepth(navbarItems: NavbarItem[]): Record<number, NavbarItem[]> {
  const grouped: Record<number, NavbarItem[]> = {};
  
  for (const item of navbarItems) {
    const depth = item.depth || 0;
    if (!grouped[depth]) {
      grouped[depth] = [];
    }
    grouped[depth].push(item);
  }
  
  return grouped;
}

/**
 * Extract navigation structure as tree
 */
export function extractNavbarTree($: CheerioAPI, baseUrl: string): {
  main: NavbarItem[];
  breadcrumbs: NavbarItem[];
  footer: NavbarItem[];
} {
  return {
    main: extractNavbar($, baseUrl),
    breadcrumbs: extractBreadcrumbs($, baseUrl),
    footer: extractFooterNav($, baseUrl)
  };
}