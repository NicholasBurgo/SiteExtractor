export interface StartRunRequest {
  url: string;
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  renderBudget?: number;
  botAvoidanceEnabled?: boolean;
}

export interface RunProgress {
  runId: string;
  queued: number;
  visited: number;
  errors: number;
  etaSeconds?: number;
  hosts: Record<string, number>;
}

export interface PageSummary {
  pageId: string;
  url: string;
  contentType: string;
  title?: string;
  words: number;
  images: number;
  links: number;
  status?: number;
  path?: string;
  type?: string;
}

export interface PageDetail {
  summary: PageSummary;
  meta: Record<string, any>;
  text?: string;
  htmlExcerpt?: string;
  headings: string[];
  images: string[];
  links: string[];
  tables: any[];
  structuredData: any[];
  stats: Record<string, any>;
}

// Review and Confirmation Types
export interface BusinessProfile {
  name?: string;
  tagline?: string;
  phones: string[];
  emails: string[];
  socials: Record<string, string>;
  logo?: string;
  brand_colors: string[];
  sources: string[];
}

export interface ItemBase {
  id: string;
  title: string;
  description?: string;
  image?: string;
  price?: string;
  cta?: Record<string, string>;
  confidence: number;
  sources: string[];
}

export interface Location {
  id: string;
  name?: string;
  address?: string;
  phone?: string;
  hours?: Record<string, string>;
  latlng?: [number, number];
  confidence: number;
  sources: string[];
}

export interface NavItem {
  label: string;
  href?: string;
  children: NavItem[];
}

export interface DraftModel {
  runId: string;
  business: BusinessProfile;
  services: ItemBase[];
  products: ItemBase[];
  menu: ItemBase[];
  locations: Location[];
  team: ItemBase[];
  faqs: any[];
  testimonials: any[];
  policies: any[];
  media: any[];
  sitemap: {
    primary: NavItem[];
    secondary: NavItem[];
    footer: NavItem[];
  };
}

export interface ConfirmRequest {
  draft: DraftModel;
}

export interface FilterOptions {
  query: string;
  type: string;
  minWords: number;
}

export interface PageResult {
  pageId: string;
  title: string;
  url: string;
  type: string;
  words: number;
  images: number;
  links: number;
  status: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}