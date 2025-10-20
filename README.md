# SiteTestGenerator

A comprehensive website data extraction and analysis platform with both desktop (Electron) and web interfaces. Features advanced truth table extraction, image analysis, and content processing capabilities.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

- **Web App**: http://localhost:3000
- **API Server**: http://localhost:5174
- **Desktop App**: Electron application with native OS integration

## 📚 Documentation

All documentation is organized in the [`docs/`](./docs/) folder:

- **[Documentation Index](./docs/README.md)** - Complete documentation overview
- **[Setup Guide](./docs/SETUP_COMPLETE.md)** - Initial setup and configuration
- **[Desktop App](./docs/DESKTOP_APP_READY.md)** - Desktop application features
- **[Migration Guide](./docs/MONOREPO_MIGRATION.md)** - Project structure migration
- **[Cleanup Summary](./docs/CLEANUP_COMPLETE.md)** - Project cleanup details

## 🏗️ Project Structure

```
SiteTestGenerator/
├─ apps/                           # Applications
│  ├─ server/                     # Fastify API server
│  │  ├─ src/
│  │  │  ├─ config/              # Environment configuration
│  │  │  ├─ routes/              # API endpoints
│  │  │  │  └─ extract/          # Data extraction routes
│  │  │  │     ├─ images.ts      # Image extraction API
│  │  │  │     ├─ misc.ts        # Miscellaneous data
│  │  │  │     ├─ navbar.ts      # Navigation extraction
│  │  │  │     ├─ paragraphs.ts  # Content extraction
│  │  │  │     └─ truth-table.ts # Truth table API
│  │  │  ├─ index.ts             # Server entry point
│  │  │  └─ lib/                 # Server utilities
│  │  └─ package.json
│  └─ web/                        # React web application
│     ├─ src/
│     │  ├─ api/                  # API client & endpoints
│     │  ├─ components/           # React components
│     │  │  ├─ ExtractionForm.tsx # Main extraction form
│     │  │  └─ ImageExtraction.tsx # Image extraction UI
│     │  ├─ pages/                # Page components
│     │  │  ├─ ConfirmPage.tsx    # Confirmation page
│     │  │  ├─ ImagesTab.tsx      # Images tab
│     │  │  ├─ MiscTab.tsx        # Miscellaneous tab
│     │  │  ├─ NavbarTab.tsx      # Navigation tab
│     │  │  ├─ ParagraphsTab.tsx  # Content tab
│     │  │  ├─ SummaryTab.tsx     # Summary tab
│     │  │  └─ TruthTableTab.tsx  # Truth table tab
│     │  ├─ hooks/                # Custom React hooks
│     │  ├─ types/                # TypeScript types
│     │  ├─ App.tsx               # Main app component
│     │  └─ main.tsx              # App entry point
│     ├─ electron/                # Electron desktop app
│     │  ├─ main.ts               # Main process
│     │  └─ preload.ts            # Preload script
│     ├─ runs/                    # Extraction results
│     ├─ image_extractions/       # Image extraction results
│     ├─ truth_extractor.py       # Python truth extraction
│     ├─ image_extractor.py       # Python image extraction
│     ├─ image-extraction-demo.html # Demo interface
│     └─ package.json
├─ packages/                      # Shared packages
│  ├─ types/                      # TypeScript types & Zod schemas
│  │  ├─ src/
│  │  │  ├─ index.ts              # Main exports
│  │  │  ├─ manifest.ts           # Manifest types
│  │  │  ├─ navbar.ts              # Navigation types
│  │  │  ├─ packed.ts             # Packed data types
│  │  │  ├─ text.ts               # Text content types
│  │  │  └─ truth.ts              # Truth table types
│  │  └─ dist/                    # Compiled types
│  └─ utils/                      # Utility functions
│     ├─ src/
│     │  ├─ index.ts              # Main exports
│     │  ├─ detect.ts             # Detection utilities
│     │  ├─ files.ts              # File operations
│     │  ├─ hashing.ts            # Hash functions
│     │  ├─ html.ts               # HTML processing
│     │  └─ strings.ts            # String utilities
│     └─ dist/                    # Compiled utilities
├─ docs/                          # Documentation
├─ runs/                          # Global extraction results
└─ Configuration files
```

## ✨ Core Features

### 🔍 **Truth Table Extraction**
- **Enhanced Accuracy**: Strict validation with multiple extraction methods
- **Business-Agnostic**: Works across all industries and business types
- **Comprehensive Fields**: Brand name, location, email, phone, socials, services, colors, logo, background, slogan
- **Confidence Scoring**: Accurate confidence levels based on source quality
- **Provenance Tracking**: Full source tracking for each extracted field

### 🖼️ **Image Extraction System**
- **Logo Detection**: Extracts logo from truth table with high confidence
- **Page Organization**: Groups images by page with titles and metadata
- **Image Categorization**: Automatically categorizes (content, background, logo, banner)
- **Preview System**: Shows image thumbnails with download functionality
- **Upload Integration**: Users can add additional images via URL
- **Statistics Dashboard**: Real-time extraction statistics

### 📄 **Content Processing**
- **Real Data Extraction**: No mock data - extracts actual website content
- **Paragraph Analysis**: Meaningful content extraction with boilerplate filtering
- **Navigation Extraction**: Comprehensive navigation structure analysis
- **Miscellaneous Data**: Colors, metadata, structured data extraction

### 🖥️ **Multi-Platform Support**
- **Web Interface**: Modern React application with responsive design
- **Desktop App**: Electron application with native OS integration
- **API Server**: Fastify-based REST API for programmatic access
- **Python Backend**: Advanced extraction logic in Python

## 🔧 Development Commands

```bash
# Development
pnpm dev                    # Start all development servers
pnpm dev:web               # Start web app only
pnpm dev:server            # Start API server only

# Building
pnpm build                 # Build all packages
pnpm build:web             # Build web app
pnpm build:server          # Build server

# Code Quality
pnpm lint                  # Run ESLint
pnpm format                # Format code with Prettier
pnpm type-check            # Run TypeScript checks

# Python Scripts
py truth_extractor.py <url> [max_pages] [timeout] [use_playwright]
py image_extractor.py <url> [max_pages] [output_dir]
```

## 🐍 Python Dependencies

The Python extraction scripts require these packages:

```bash
pip install beautifulsoup4 requests email-validator phonenumbers validators
```

## 📊 API Endpoints

### Truth Table Extraction
- `POST /api/truth-table` - Extract truth table data
- `GET /api/truth-table/:runId` - Get extraction results

### Image Extraction
- `POST /api/image-extraction` - Extract images from website
- `GET /api/image-extraction/:runId` - Get image extraction results
- `POST /api/image-extraction/:runId/upload` - Upload additional images

### Other Extractions
- `POST /api/extract/navbar` - Extract navigation structure
- `POST /api/extract/paragraphs` - Extract content paragraphs
- `POST /api/extract/misc` - Extract miscellaneous data

## 🎯 Usage Examples

### Truth Table Extraction
```bash
# Command line
py truth_extractor.py https://example.com 5 10 true

# API call
curl -X POST http://localhost:5174/api/truth-table \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "maxPages": 5}'
```

### Image Extraction
```bash
# Command line
py image_extractor.py https://example.com 3 ./output

# API call
curl -X POST http://localhost:5174/api/image-extraction \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "maxPages": 3}'
```

## 🔄 Data Flow

1. **Input**: User provides website URL and extraction parameters
2. **Processing**: Python scripts perform web scraping and data extraction
3. **Validation**: Strict validation ensures data accuracy and quality
4. **Storage**: Results saved to JSON files in organized directory structure
5. **API**: Fastify server provides REST endpoints for data access
6. **UI**: React application displays results with interactive interface
7. **Export**: Users can download individual files or complete datasets

## 📁 Output Structure

```
runs/
└─ {domain}-{timestamp}/
   ├─ truth.json              # Truth table extraction results
   ├─ images/                 # Image extraction results
   ├─ navbar/                 # Navigation structure
   ├─ text/                   # Text content
   ├─ misc/                   # Miscellaneous data
   └─ logs/                   # Extraction logs
```

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Fastify, Node.js, TypeScript
- **Desktop**: Electron
- **Extraction**: Python, BeautifulSoup, Requests
- **Validation**: email-validator, phonenumbers, validators
- **Build**: pnpm, TypeScript, ESLint, Prettier

## 🚀 Future Development

### Planned Features
- **AI Integration**: Machine learning for better content classification
- **Batch Processing**: Multiple URL extraction in parallel
- **Export Formats**: PDF, Excel, CSV export options
- **Real-time Monitoring**: Live extraction progress tracking
- **Custom Extractors**: User-defined extraction rules
- **Cloud Storage**: Integration with cloud storage providers

### Extension Points
- **Custom Validators**: Add domain-specific validation rules
- **New Extractors**: Implement additional data extraction methods
- **UI Themes**: Multiple interface themes and customization
- **Plugin System**: Third-party plugin architecture
- **API Versioning**: Backward-compatible API evolution

## 📝 Development Notes

### Key Files for Future Development
- `apps/web/truth_extractor.py` - Main truth extraction logic
- `apps/web/image_extractor.py` - Image extraction system
- `apps/server/src/routes/extract/` - API endpoint implementations
- `apps/web/src/components/` - React UI components
- `packages/types/src/` - TypeScript type definitions
- `packages/utils/src/` - Shared utility functions

### Important Considerations
- **Python Dependencies**: Ensure all Python packages are installed
- **File Permissions**: Check write permissions for output directories
- **Rate Limiting**: Implement rate limiting for production use
- **Error Handling**: Comprehensive error handling throughout the stack
- **Security**: Validate all inputs and sanitize outputs
- **Performance**: Optimize for large-scale extraction operations

---

For detailed documentation, see the [`docs/`](./docs/) folder.