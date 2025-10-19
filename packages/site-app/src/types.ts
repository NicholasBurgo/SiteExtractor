// Enhanced types matching the new extractor output
export type Status = 'ok' | 'missing' | 'low_confidence' | 'error' | 'skipped';

export interface Field<T> {
  value?: T;
  status: Status;
  confidence: number;
  notes?: string;
}

export type PlacementZone =
  'hero' | 'top_banner' | 'logo' | 'navbar' | 'footer' | 'gallery' | 'portfolio' | 'team' | 'testimonial' | 'map' |
  'menu_item' | 'product' | 'service' | 'before_after' | 'pricing' | 'cta' | 'inline' | 'unknown';

export interface PlacementRef {
  zone: PlacementZone;
  targetRefId?: string;
  reasoning?: string;
  confidence: number;
}

export interface Image {
  id: string;
  pageSlug: string;
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  aspect?: number;
  bytes?: number;
  format?: string;
  role?: 'logo' | 'hero' | 'inline' | 'gallery' | 'icon' | 'bg';
  placement: PlacementRef;
  description?: string;
  ocrText?: string;
  hash: string;
}

export interface Block {
  kind: 'heading' | 'paragraph' | 'list' | 'table' | 'quote';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  items?: string[];
  ordered?: boolean;
  rows?: string[][];
  headers?: string[];
  cite?: string;
}

export interface NavItem {
  text: string;
  href: string;
  children?: NavItem[];
}

export interface Link {
  text: string;
  href: string;
  internal?: boolean;
  nofollow?: boolean;
}

export interface OpenGraph {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  site_name?: string;
  url?: string;
}

export interface TruthTable {
  table: Record<string, string>[];
}

export interface ExtractedPage {
  slug: string;
  source: {
    url: string;
    crawledAt: string;
    statusCode?: number;
    contentType?: string;
    contentLength?: number;
  };
  meta: Field<{
    title?: string;
    description?: string;
    canonical?: string;
    og?: OpenGraph;
    schemaOrg?: string[];
    favicon?: string;
    robots?: string;
    keywords?: string;
  }>;
  navbar: Field<NavItem[]>;
  blocks: Field<Block[]>;
  images: Field<Image[]>;
  imageIndex?: Field<Record<string, Image>>;
  links: Field<Link[]>;
  truth?: Field<TruthTable>;
  diagnostics?: Field<{
    readability?: number;
    wordCount?: number;
    imageCount?: number;
    linkCount?: number;
    blockCount?: number;
  }>;
  // UI state
  approved?: boolean;
  heroImages?: string[];
}

export interface PackPage {
  slug: string;
  approved: boolean;
  navbar: NavItem[];
  hero?: {
    images: string[];
  };
  blocks: Block[];
  images: Image[];
  meta?: {
    title?: string;
    description?: string;
    canonical?: string;
  };
}

export interface PackBundle {
  site: {
    domain: string;
    brand?: {
      name?: string;
      logo?: string;
      colors?: string[];
    };
  };
  pages: PackPage[];
  metadata?: {
    created: string;
    version: string;
    extractorVersion?: string;
  };
}

// Action types for confirmation UI
export type ConfirmationAction = 'confirm' | 'retry' | 'edit' | 'deny';

export interface ConfirmationState {
  [key: string]: {
    action: ConfirmationAction;
    timestamp: string;
    notes?: string;
  };
}
