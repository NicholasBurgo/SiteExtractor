/**
 * Core schema definitions for the Site Generator Extractor v2
 * Provides strong typing and stable schemas for all extraction components
 */

export interface ImageData {
  id: string;
  pageSlug: string;
  src: string;
  alt?: string;
  description?: string;
  width?: number;
  height?: number;
  aspect?: number;
  placement: {
    zone: 'hero' | 'logo' | 'navbar' | 'gallery' | 'service' | 'product' | 'menu_item' |
          'testimonial' | 'team' | 'cta' | 'map' | 'inline' | 'unknown';
    targetRefId?: string;
    confidence: number;
    reasoning?: string;
  };
  source: 'extracted' | 'user_local' | 'user_url';
  license?: 'unknown' | 'provided' | 'free_commercial';
  attribution?: string;
}

export interface NavbarItem {
  text: string;
  href: string;
  isExternal?: boolean;
  depth?: number;
}

export interface ParagraphData {
  text: string;
  type: 'paragraph' | 'heading' | 'list' | 'quote' | 'table';
  level?: number; // For headings
  wordCount: number;
}

export interface MiscData {
  meta: {
    title?: string;
    description?: string;
    keywords?: string[];
    author?: string;
    robots?: string;
  };
  links: {
    internal: string[];
    external: string[];
  };
  diagnostics: {
    wordCount: number;
    readabilityScore?: number;
    hasSchemaOrg?: boolean;
    hasOpenGraph?: boolean;
  };
}

export interface TruthTableData {
  table: Record<string, {
    value: any;
    confidence: number;
    provenance: Array<{
      url: string;
      method: string;
    }>;
  }>;
}

export interface PackBundle {
  slug: string;
  truthTable: TruthTableData;
  images: ImageData[];
  paragraphs: ParagraphData[];
  navbar: NavbarItem[];
  misc: MiscData;
  metadata: {
    extractedAt: string;
    sourceUrl: string;
    pageCount: number;
    version: string;
  };
}

export interface ExtractionResult {
  success: boolean;
  page?: PackBundle;
  error?: string;
  warnings?: string[];
}

export interface ExtractorConfig {
  userAgent?: string;
  timeout?: number;
  maxRedirects?: number;
  includeImages?: boolean;
  includeLinks?: boolean;
  maxImageSize?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  usePlaywright?: boolean;
  headless?: boolean;
  waitForTimeout?: number;
  maxPages?: number;
}

export interface CrawlResult {
  url: string;
  html: string;
  statusCode: number;
  contentType: string;
  contentLength: number;
  finalUrl: string;
}

export interface PageData {
  slug: string;
  source: {
    url: string;
    statusCode?: number;
    contentType?: string;
    contentLength?: number;
  };
  truthTable: TruthTableData;
  images: ImageData[];
  paragraphs: ParagraphData[];
  navbar: NavbarItem[];
  misc: MiscData;
  extractedAt: string;
}

