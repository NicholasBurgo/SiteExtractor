/**
 * Site Generator Extractor v2 - Main Entry Point
 * Provides comprehensive extraction capabilities with image placement and all extractors
 */

export * from './core/schema.js';
export * from './core/crawler.js';
export * from './core/htmlLoader.js';

export * from './extractors/images.js';
export * from './extractors/navbar.js';
export * from './extractors/paragraphs.js';
export * from './extractors/misc.js';
export * from './extractors/truthTable.js';

export * from './utils/text.js';
export * from './utils/url.js';
export * from './utils/metrics.js';
export * from './utils/file.js';
export * from './utils/robots.js';
export * from './utils/sitemap.js';

// Main extraction functions
export { extractFromHtml, extractFromUrls, extractFromFile } from './pipeline/extract.js';
export { writePageJson, writeStructuredArtifacts, readPageJson } from './pipeline/io.js';

// CLI interface
export { runExtractor, retryExtraction } from './cli.js';