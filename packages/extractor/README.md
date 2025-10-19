# Site Generator Extractor v2

A comprehensive TypeScript module for extracting structured data from websites with advanced image placement detection and all extractors.

## Features

- **Enhanced Image Extraction**: Advanced placement detection using DOM position, filename, text proximity, and class names
- **Comprehensive Data Extraction**: Images, navigation, paragraphs, miscellaneous data, and truth table
- **BFS Crawling**: Breadth-first search with sitemap and robots.txt support
- **Strong Typing**: Full TypeScript support with stable schemas
- **CLI Interface**: Command-line tools for extraction and retry operations
- **Deterministic**: No AI calls, fully rule-based extraction

## Installation

```bash
pnpm install
```

## Usage

### CLI Commands

#### Extract from URL
```bash
pnpm extractor run --url https://example.com --max-pages 10
```

#### Retry specific plugin
```bash
pnpm extractor retry --slug home-page --plugin images --from ./build/extract/html/home-page.html
```

### Programmatic Usage

```typescript
import { runExtractor, extractImages, extractNavbar } from '@sg/extractor';

// Extract from URL
const results = await runExtractor('https://example.com', {
  userAgent: 'SG-Extractor/2.0',
  timeout: 30000,
  usePlaywright: true
});

// Extract specific data
const images = await extractImages($, 'https://example.com', {
  pageSlug: 'home-page',
  maxImages: 50
});
```

## Architecture

```
packages/extractor/
├── src/
│   ├── index.ts                # Main entry point
│   ├── cli.ts                  # CLI interface
│   ├── core/
│   │   ├── crawler.ts          # BFS + sitemap + robots parser
│   │   ├── htmlLoader.ts       # HTML load + normalize
│   │   └── schema.ts           # Shared interfaces
│   ├── extractors/
│   │   ├── images.ts           # Image extraction with placement
│   │   ├── navbar.ts           # Navigation extraction
│   │   ├── paragraphs.ts       # Text content extraction
│   │   ├── misc.ts             # Miscellaneous data
│   │   └── truthTable.ts       # Truth table extraction
│   └── utils/
│       ├── text.ts             # Text processing
│       ├── url.ts              # URL utilities
│       ├── metrics.ts          # Performance metrics
│       ├── file.ts             # File operations
│       ├── robots.ts           # Robots.txt parser
│       └── sitemap.ts          # Sitemap parser
├── package.json
└── README.md
```

## Image Placement Detection

The image extractor uses sophisticated placement detection:

### Placement Zones
- `hero`: Hero banners and main images
- `logo`: Company logos and brand marks
- `navbar`: Navigation icons and elements
- `gallery`: Portfolio and showcase images
- `service`: Service-related images
- `product`: Product catalog images
- `menu_item`: Food menu items
- `testimonial`: Customer testimonials
- `team`: Staff and team photos
- `cta`: Call-to-action images
- `map`: Location and map images
- `inline`: General content images

### Detection Methods
1. **DOM Position**: Analyzes parent elements and CSS classes
2. **Filename Patterns**: Extracts hints from image URLs
3. **Text Proximity**: Analyzes nearby text content
4. **Geometry**: Uses aspect ratio and size for classification
5. **Context**: Considers surrounding HTML structure

## Output Format

### PackBundle Structure
```typescript
interface PackBundle {
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
```

### ImageData Structure
```typescript
interface ImageData {
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
```

## Output Files

The extractor creates the following output structure:

```
build/extract/
├── pages/
│   └── {slug}.page.json        # Extracted data bundle
├── html/
│   └── {slug}.html             # Original HTML content
└── logs/
    └── extractor.log           # Extraction diagnostics
```

## Configuration

### ExtractorConfig
```typescript
interface ExtractorConfig {
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
```

## CLI Options

### Run Command
- `--url, -u <url>`: URL to extract from
- `--max-pages <number>`: Maximum pages to crawl (default: 10)
- `--max-depth <number>`: Maximum crawl depth (default: 3)
- `--output, -o <dir>`: Output directory (default: ./build/extract)
- `--no-robots`: Don't respect robots.txt
- `--no-sitemap`: Don't use sitemap

### Retry Command
- `--slug <slug>`: Page slug for retry operation
- `--plugin <plugin>`: Plugin to retry (images, navbar, paragraphs, misc, truthTable)
- `--from <html-file>`: HTML file to extract from

## Examples

### Basic Extraction
```bash
pnpm extractor run --url https://example.com
```

### Advanced Extraction
```bash
pnpm extractor run --url https://example.com --max-pages 5 --output ./my-extract
```

### Retry Image Extraction
```bash
pnpm extractor retry --slug home-page --plugin images --from ./build/extract/html/home-page.html
```

## Integration

The extractor integrates seamlessly with the Site Generator pipeline:

1. **Extract**: Run extraction to get structured data
2. **Confirm**: Use confirmation app to review and edit
3. **Pack**: Export confirmed data bundle
4. **Generate**: Use bundle for site generation
5. **Render**: Output final website

## Development

### Build
```bash
pnpm build
```

### Development Mode
```bash
pnpm dev
```

### Run Tests
```bash
pnpm test
```

## Dependencies

- **cheerio**: HTML parsing and manipulation
- **playwright**: Browser automation for JavaScript sites
- **fast-xml-parser**: XML parsing for sitemaps
- **sharp**: Image processing (optional)
- **minimist**: CLI argument parsing
- **node-fetch**: HTTP requests

## License

MIT License - see LICENSE file for details.

