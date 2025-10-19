# 🏗️ Site Generator - Extraction & Confirmation System

A robust, extensible **Extraction** module and lightweight **Confirmation/Packer** desktop-style app for human review. Built with **TypeScript + pnpm** for deterministic extraction with optional LLM assists.

## 🎯 Features

### ✅ Extraction Module
- **Truth Table extraction** (integrates with existing Python truth-extractor)
- **Image extraction** (src + alt + dominant color + dimensions + role detection)
- **Navbar extraction** (top-level nav, nested menus; normalize text + href; dedupe)
- **Paragraph extraction** (semantic blocks: headings, paragraphs, lists, tables, quotes)
- **Misc extraction** (title, meta description, canonical, OpenGraph, favicon, schema.org types, contact details)

### ✅ Confirmation/Packer App
- **Drag-and-drop interface** for content block reordering
- **Point-and-click approval** system for pages and content
- **Hero image selection** (up to 3 images for carousel)
- **Navigation editor** with add/edit/delete functionality
- **Metadata editor** for SEO and OpenGraph data
- **Bundle creation** with automatic asset copying and ZIP generation

## 📁 Project Structure

```
site-generator/
├── packages/
│   ├── extractor/              # Complete extraction engine
│   │   ├── src/
│   │   │   ├── adapters/       # fetch & DOM adapters
│   │   │   ├── extractors/     # Individual extractors
│   │   │   ├── pipeline/       # Orchestrator & I/O
│   │   │   ├── utils/          # DOM utils, helpers
│   │   │   ├── types.ts        # Shared types/interfaces
│   │   │   └── index.ts        # CLI entry point
│   │   └── package.json
│   └── confirm-app/            # Vite React confirmation app
│       ├── src/
│       │   ├── components/     # UI components
│       │   ├── pages/          # App pages
│       │   ├── store/          # Zustand state management
│       │   └── lib/            # Bundle packer, utilities
│       └── package.json
├── build/
│   ├── extract/                # Raw extracted JSON files
│   └── packs/                  # Human-approved bundles (.zip)
├── config/
│   └── extractor.config.yaml   # Extraction configuration
└── package.json                # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **pnpm 9.11.0+**
- **Python 3.11+** (for truth table extraction)

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd site-generator
pnpm install

# Install Python dependencies (optional, for truth table extraction)
pip install -r requirements.txt
```

### Usage

#### 1. Extract from URL
```bash
# Extract from a single URL
pnpm x:extract -- --url https://example.com

# Extract from multiple URLs
pnpm x:extract -- --urls https://example.com,https://example.com/about

# Extract from local HTML file
pnpm x:extract -- --file ./page.html

# Custom output directory
pnpm x:extract -- --url https://example.com --out ./my-extracts
```

#### 2. Launch Confirmation App
```bash
# Start the confirmation app
pnpm x:confirm

# Build for production
pnpm x:pack
```

#### 3. Complete Workflow
```bash
# Extract and then open confirmation app
pnpm x:all
```

## 📋 API Reference

### Extractor CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url, -u` | URL to extract from | - |
| `--file, -f` | Local HTML file to extract from | - |
| `--urls` | Comma-separated list of URLs | - |
| `--out, -o` | Output directory | `./build/extract` |
| `--user-agent` | User agent string | `SG-Extractor/1.0` |
| `--timeout` | Request timeout (ms) | `30000` |
| `--redirects` | Maximum redirects | `5` |
| `--no-images` | Skip image extraction | `false` |
| `--no-links` | Skip link extraction | `false` |
| `--max-image-size` | Max image size (bytes) | `5MB` |
| `--allowed-domains` | Allowed domains (comma-separated) | - |
| `--blocked-domains` | Blocked domains (comma-separated) | - |

### ExtractedPage Schema

```typescript
interface ExtractedPage {
  slug: string;
  source: {
    url: string;
    crawledAt: string;
    statusCode?: number;
    contentType?: string;
    contentLength?: number;
  };
  meta: {
    title?: string;
    description?: string;
    canonical?: string;
    og?: OpenGraphData;
    schemaOrg?: string[];
    favicon?: string;
    robots?: string;
    keywords?: string;
  };
  navbar: NavItem[];
  blocks: Block[];
  images: Image[];
  links: Link[];
  truth?: { table: Record<string, string>[] };
  diagnostics?: {
    readability?: number;
    wordCount?: number;
    imageCount?: number;
    linkCount?: number;
    blockCount?: number;
  };
}
```

### PackBundle Schema

```typescript
interface PackBundle {
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
```

## 🔧 Configuration

### Extractor Configuration (`config/extractor.config.yaml`)

```yaml
crawler:
  user_agent: "SG-Extractor/1.0"
  timeout: 30000
  max_redirects: 5

extraction:
  include_images: true
  include_links: true
  max_images: 50
  max_image_size: 5242880
  
  paragraphs:
    min_word_count: 10
    max_word_count: 500
    include_lists: true
    include_tables: true
  
  navbar:
    max_depth: 3
    include_external: false
    normalize_text: true

truth_table:
  enabled: true
  python_module: "truth_extractor.cli"
  fallback_to_html: true
```

## 🎨 Confirmation App Features

### Navigation Editor
- Add/edit/delete navigation items
- Nested menu support
- Link validation
- Drag-and-drop reordering

### Content Block Editor
- Drag-and-drop block reordering
- Show/hide individual blocks
- Edit block content inline
- Support for headings, paragraphs, lists, tables, quotes

### Image Gallery
- Hero image selection (up to 3 images)
- Image metadata display
- Role-based categorization
- Asset copying for bundles

### Metadata Editor
- SEO metadata (title, description, keywords)
- OpenGraph data
- Canonical URLs
- Schema.org types

### Bundle Creation
- ZIP file generation with assets
- Automatic image copying
- Bundle validation
- Download functionality

## 🔌 Extensibility

### Custom Extractors

Create custom extractors by implementing the `ExtractionPlugin` interface:

```typescript
interface ExtractionPlugin {
  name: string;
  version: string;
  extract($: CheerioAPI, url: string, html: string): Promise<Partial<ExtractedPage>>;
}
```

### Truth Table Integration

The system integrates with the existing Python truth-extractor:

```typescript
// Automatic integration via subprocess
const truthData = await extractTruthTable($, url, html);

// Fallback to HTML extraction
const fallbackData = extractTruthTableFromHtml($);
```

## 🧪 Development

### Running in Development Mode

```bash
# Start extractor in watch mode
pnpm -C packages/extractor dev

# Start confirmation app in development mode
pnpm -C packages/confirm-app dev

# Run both simultaneously
pnpm dev
```

### Building for Production

```bash
# Build all packages
pnpm build

# Build individual packages
pnpm -C packages/extractor build
pnpm -C packages/confirm-app build
```

## 📊 Example Output

### ExtractedPage Example
```json
{
  "slug": "home",
  "source": {
    "url": "https://example.com",
    "crawledAt": "2025-01-18T18:38:00.000Z"
  },
  "meta": {
    "title": "Welcome to Example Company",
    "description": "We provide amazing services for your business needs.",
    "og": {
      "title": "Example Company - Your Business Partner",
      "description": "Leading provider of business solutions",
      "image": "https://example.com/og-image.jpg"
    }
  },
  "navbar": [
    { "text": "Home", "href": "/" },
    { "text": "About", "href": "/about" },
    { "text": "Services", "href": "/services" },
    { "text": "Contact", "href": "/contact" }
  ],
  "blocks": [
    {
      "kind": "heading",
      "level": 1,
      "text": "Welcome to Our Amazing Company"
    },
    {
      "kind": "paragraph",
      "text": "We are a leading provider of innovative business solutions..."
    },
    {
      "kind": "list",
      "ordered": false,
      "items": ["Web Development", "Digital Marketing", "Consulting Services", "Cloud Solutions"]
    }
  ],
  "images": [],
  "links": [],
  "diagnostics": {
    "readability": 62.3,
    "wordCount": 150,
    "blockCount": 3
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions and ideas

---

**Built with ❤️ using TypeScript, React, and modern web technologies.**

