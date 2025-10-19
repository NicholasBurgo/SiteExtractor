/**
 * URL processing utilities
 * Provides URL normalization, validation, and manipulation functions
 */

/**
 * Normalize URL to standard format
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash for consistency
    if (urlObj.pathname === '/' && urlObj.search === '' && urlObj.hash === '') {
      return urlObj.origin;
    }
    return urlObj.toString();
  } catch (error) {
    return url; // Return original if invalid
  }
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if URL is external to base URL
 */
export function isExternalUrl(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseUrl);
    return urlObj.hostname !== baseObj.hostname;
  } catch (error) {
    return false;
  }
}

/**
 * Resolve relative URL against base URL
 */
export function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch (error) {
    return url; // Return original if invalid
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return null;
  }
}

/**
 * Extract path from URL
 */
export function extractPath(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch (error) {
    return null;
  }
}

/**
 * Extract query parameters from URL
 */
export function extractQueryParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch (error) {
    return {};
  }
}

/**
 * Remove query parameters from URL
 */
export function removeQueryParams(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.search = '';
    return urlObj.toString();
  } catch (error) {
    return url;
  }
}

/**
 * Remove hash from URL
 */
export function removeHash(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.hash = '';
    return urlObj.toString();
  } catch (error) {
    return url;
  }
}

/**
 * Generate slug from URL
 */
export function generateSlugFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Remove leading slash and split by slashes
    const segments = path.replace(/^\//, '').split('/').filter(segment => segment.length > 0);
    
    if (segments.length === 0) {
      return urlObj.hostname.replace(/\./g, '-');
    }
    
    // Use the last segment or combine segments
    if (segments.length === 1) {
      return segments[0].replace(/\.html?$/, '');
    }
    
    return segments.join('-');
  } catch (error) {
    // Fallback to simple slug generation
    return url
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }
}

/**
 * Check if URL is a file (has extension)
 */
export function isFileUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return /\.[a-zA-Z0-9]+$/.test(pathname);
  } catch (error) {
    return false;
  }
}

/**
 * Get file extension from URL
 */
export function getFileExtension(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if URL is an image
 */
export function isImageUrl(url: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const extension = getFileExtension(url);
  return extension ? imageExtensions.includes(extension) : false;
}

/**
 * Check if URL is a PDF
 */
export function isPdfUrl(url: string): boolean {
  return getFileExtension(url) === 'pdf';
}

/**
 * Check if URL is a document
 */
export function isDocumentUrl(url: string): boolean {
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
  const extension = getFileExtension(url);
  return extension ? documentExtensions.includes(extension) : false;
}

/**
 * Sanitize URL for safe use
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove potentially dangerous protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Unsafe protocol');
    }
    return urlObj.toString();
  } catch (error) {
    return '';
  }
}

/**
 * Compare two URLs for equality
 */
export function compareUrls(url1: string, url2: string): boolean {
  try {
    const url1Obj = new URL(url1);
    const url2Obj = new URL(url2);
    
    return url1Obj.hostname === url2Obj.hostname &&
           url1Obj.pathname === url2Obj.pathname &&
           url1Obj.search === url2Obj.search;
  } catch (error) {
    return false;
  }
}

/**
 * Extract base URL from URL
 */
export function extractBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch (error) {
    return url;
  }
}

/**
 * Check if URL is HTTPS
 */
export function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Convert HTTP URL to HTTPS
 */
export function convertToHttps(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === 'http:') {
      urlObj.protocol = 'https:';
    }
    return urlObj.toString();
  } catch (error) {
    return url;
  }
}

/**
 * Generate robots.txt URL from base URL
 */
export function generateRobotsUrl(baseUrl: string): string {
  try {
    const urlObj = new URL(baseUrl);
    return `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;
  } catch (error) {
    return `${baseUrl}/robots.txt`;
  }
}

/**
 * Generate sitemap URL from base URL
 */
export function generateSitemapUrl(baseUrl: string): string {
  try {
    const urlObj = new URL(baseUrl);
    return `${urlObj.protocol}//${urlObj.hostname}/sitemap.xml`;
  } catch (error) {
    return `${baseUrl}/sitemap.xml`;
  }
}

