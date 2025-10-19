import type { CheerioAPI } from 'cheerio';
import type { Image, Field } from '../types.js';
import { normalizeUrl, pickDominantRole } from '../utils/dom.js';
import { inferPlacement, getPlacementFromUrl, combinePlacementSignals } from './images.placement.js';
import crypto from 'node:crypto';

export interface ImageExtractionOptions {
  maxImages?: number;
  minWidth?: number;
  minHeight?: number;
  allowedFormats?: string[];
  pageSlug?: string;
}

/**
 * Extract images from HTML with enhanced placement taxonomy
 */
export async function extractImages(
  $: CheerioAPI, 
  baseUrl: string, 
  options: ImageExtractionOptions = {}
): Promise<Field<Image[]>> {
  const {
    maxImages = 50,
    minWidth = 50,
    minHeight = 50,
    allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    pageSlug = 'unknown'
  } = options;
  
  const images: Image[] = [];
  const seen = new Set<string>();
  
  $('img').each((_, el) => {
    if (images.length >= maxImages) return false; // Break loop
    
    const $el = $(el);
    const srcAttr = $el.attr('src');
    if (!srcAttr) return;
    
    let src: string;
    try {
      src = new URL(srcAttr, baseUrl).toString();
    } catch {
      return; // Skip invalid URLs
    }
    
    if (seen.has(src)) return;
    
    // Check if format is allowed
    const format = getImageFormat(src);
    if (!allowedFormats.includes(format)) return;
    
    // Extract dimensions
    const width = parseInt($el.attr('width') || '0');
    const height = parseInt($el.attr('height') || '0');
    
    // Skip very small images
    if (width > 0 && width < minWidth) return;
    if (height > 0 && height < minHeight) return;
    
    const alt = ($el.attr('alt') || '').trim();
    const aspect = width && height ? width / height : undefined;
    
    // Generate stable ID and hash
    const hash = crypto.createHash('sha1').update(src).digest('hex');
    const id = hash.slice(0, 16); // Use first 16 chars as ID
    
    // Infer placement using our enhanced logic
    const domPlacement = inferPlacement($, el, baseUrl);
    const urlPlacement = getPlacementFromUrl(src);
    const placement = combinePlacementSignals(domPlacement, urlPlacement, { width, height, aspect });
    
    // Determine legacy role from placement
    const role = placement.zone === 'logo' ? 'logo' : 
                 placement.zone === 'hero' ? 'hero' : 
                 placement.zone === 'gallery' ? 'gallery' : 'inline';
    
    seen.add(src);
    
    images.push({
      id,
      pageSlug,
      src,
      alt: alt || undefined,
      width: width || undefined,
      height: height || undefined,
      aspect,
      format,
      role,
      placement,
      description: alt || undefined, // Use alt as initial description
      hash
    });
  });
  
  // Also extract images from CSS background-image
  $('*').each((_, el) => {
    if (images.length >= maxImages) return false;
    
    const $el = $(el);
    const style = $el.attr('style') || '';
    
    // Look for background-image in style attribute
    const bgMatch = style.match(/background-image\s*:\s*url\(['"]?([^'"]+)['"]?\)/i);
    if (bgMatch) {
      let src: string;
      try {
        src = new URL(bgMatch[1], baseUrl).toString();
      } catch {
        return; // Skip invalid URLs
      }
      
      if (src && !seen.has(src)) {
        const format = getImageFormat(src);
        if (!allowedFormats.includes(format)) return;
        
        const hash = crypto.createHash('sha1').update(src).digest('hex');
        const id = hash.slice(0, 16);
        
        // Infer placement for background images
        const domPlacement = inferPlacement($, el, baseUrl);
        const urlPlacement = getPlacementFromUrl(src);
        const placement = combinePlacementSignals(domPlacement, urlPlacement);
        
        const role = placement.zone === 'hero' ? 'hero' : 'bg';
        
        seen.add(src);
        images.push({
          id,
          pageSlug,
          src,
          format,
          role,
          placement,
          hash
        });
      }
    }
  });
  
  // Calculate overall confidence and status
  const confidence = images.length > 0 
    ? Math.min(0.95, images.reduce((sum, img) => sum + img.placement.confidence, 0) / images.length)
    : 0;
  
  const status: Field<Image[]>['status'] = images.length > 0 ? 'ok' : 'missing';
  const notes = images.length === 0 ? 'no <img> tags detected' : undefined;
  
  return {
    value: images,
    status,
    confidence,
    notes
  };
}

/**
 * Get image format from URL
 */
function getImageFormat(url: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : 'unknown';
}

/**
 * Extract hero images specifically (largest, most prominent images)
 */
export function extractHeroImages(images: Image[]): Image[] {
  return images
    .filter(img => img.placement.zone === 'hero' || img.placement.zone === 'top_banner' || img.role === 'hero')
    .sort((a, b) => {
      // Sort by placement confidence first, then by size
      if (a.placement.confidence !== b.placement.confidence) {
        return b.placement.confidence - a.placement.confidence;
      }
      const sizeA = (a.width || 0) * (a.height || 0);
      const sizeB = (b.width || 0) * (b.height || 0);
      return sizeB - sizeA;
    })
    .slice(0, 5); // Top 5 hero images
}

/**
 * Extract logo images specifically
 */
export function extractLogoImages(images: Image[]): Image[] {
  return images
    .filter(img => img.placement.zone === 'logo' || img.role === 'logo')
    .sort((a, b) => {
      // Sort by placement confidence first
      if (a.placement.confidence !== b.placement.confidence) {
        return b.placement.confidence - a.placement.confidence;
      }
      // Prefer SVG logos, then by size
      if (a.format === 'svg' && b.format !== 'svg') return -1;
      if (b.format === 'svg' && a.format !== 'svg') return 1;
      
      const sizeA = (a.width || 0) * (a.height || 0);
      const sizeB = (b.width || 0) * (b.height || 0);
      return sizeB - sizeA;
    });
}

/**
 * Create image index map for quick lookup
 */
export function createImageIndex(images: Image[]): Record<string, Image> {
  const index: Record<string, Image> = {};
  for (const img of images) {
    index[img.id] = img;
  }
  return index;
}
