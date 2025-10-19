// Library entry point for programmatic API
export { crawlUrl, crawlFromFile, crawlFromString } from './adapters/crawler.js';
export { extractFromHtml, extractFromUrls, extractFromFile, extractFromString } from './pipeline/extract.js';
export { writePageJson, writeStructuredArtifacts, readPageJson, readAllPageJson } from './pipeline/io.js';

// Export types
export type {
  ExtractedPage,
  ExtractionResult,
  Field,
  Status,
  Image,
  PlacementZone,
  PlacementRef,
  NavItem,
  Block,
  Link,
  OpenGraph,
  TruthTable,
  ExtractorConfig,
  ExtractionPlugin
} from './types.js';

// Export individual extractors for advanced usage
export { extractImages, extractHeroImages, extractLogoImages, createImageIndex } from './extractors/image.js';
export { extractNavbar, deduplicateNavbar, sortNavbar } from './extractors/navbar.js';
export { extractParagraphs, groupBlocksIntoSections, extractMainContent, extractHeroContent, extractCallToActions, cleanBlockText } from './extractors/paragraphs.js';
export { extractMiscData, extractContactInfo, extractSocialLinks } from './extractors/misc.js';
export { extractTruthTableFromHtml } from './extractors/truthTable.js';

// Export placement utilities
export { inferPlacement, getPlacementFromUrl, combinePlacementSignals } from './extractors/images.placement.js';

// Export utility functions
export { normalizeUrl, extractDomain, generateSlug, pickDominantRole, calculateReadability, isInternalUrl } from './utils/dom.js';
