// Types for the confirmation app
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
  level?: number;
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

export interface ConfirmationState {
  confirmed: boolean;
  edited: boolean;
  denied: boolean;
  retryRequested: boolean;
}

export interface ImageUpload {
  file: File;
  preview: string;
  placement: ImageData['placement'];
  alt?: string;
  description?: string;
}

export interface ExportOptions {
  includeImages: boolean;
  includeParagraphs: boolean;
  includeNavbar: boolean;
  includeMisc: boolean;
  includeTruthTable: boolean;
  format: 'json' | 'csv' | 'zip';
}

export interface BulkAction {
  type: 'confirm' | 'deny' | 'retry' | 'set-zone' | 'set-license';
  items: string[];
  value?: any;
}

export interface GroupByOption {
  value: 'page' | 'zone' | 'confidence' | 'source';
  label: string;
}

export interface FilterOption {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'in';
  value: any;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

