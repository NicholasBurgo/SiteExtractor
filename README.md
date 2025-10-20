# SiteTestGenerator

A comprehensive website data extraction and analysis platform with both desktop (Electron) and web interfaces. Features advanced truth table extraction, image analysis, and content processing capabilities.

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+ recommended)
- **Python** (v3.8+ recommended)
- **pnpm** (will be installed via Corepack)

### Setup Instructions

#### 1. Clone and Install Node.js Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd SiteTestGenerator

# Install Node.js dependencies using pnpm
# Option A: Using npx (recommended, no admin required)
npx -y pnpm@9.11.0 install

# Option B: Enable pnpm globally (requires admin)
# Open PowerShell as Administrator, then:
corepack enable
corepack prepare pnpm@9.11.0 --activate
pnpm install
```

#### 2. Setup Python Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows Command Prompt:
venv\Scripts\activate.bat
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

#### 3. Start Development Servers
```bash
# Start all development servers
npx -y pnpm@9.11.0 dev
# OR if pnpm is enabled globally:
pnpm dev
```

### Access Points
- **Web App**: http://localhost:3000
- **API Server**: http://localhost:5174
- **Desktop App**: Electron application with native OS integration

### Running Python Scripts
```bash
# Make sure virtual environment is activated
.\venv\Scripts\Activate.ps1

# Run extraction scripts
python apps/web/truth_extractor.py <url> [max_pages] [timeout] [use_playwright]
python apps/web/image_extractor.py <url> [max_pages] [output_dir]
```

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

The Python extraction scripts require these packages (automatically installed via `requirements.txt`):

```bash
# Install from requirements.txt (recommended)
pip install -r requirements.txt

# Or install manually:
pip install beautifulsoup4 requests email-validator phonenumbers validators
```

**Required packages:**
- `requests` - HTTP requests for web scraping
- `beautifulsoup4` - HTML parsing and content extraction
- `email-validator` - Email address validation
- `phonenumbers` - Phone number validation and formatting
- `validators` - URL and other data validation

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

## 🔧 Troubleshooting

### Common Setup Issues

#### pnpm Command Not Found
```bash
# Solution 1: Use npx (recommended)
npx -y pnpm@9.11.0 install

# Solution 2: Enable Corepack globally (requires admin)
# Open PowerShell as Administrator:
corepack enable
corepack prepare pnpm@9.11.0 --activate
```

#### Python Virtual Environment Issues
```bash
# If virtual environment activation fails:
# Windows PowerShell (if execution policy blocks):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then activate:
.\venv\Scripts\Activate.ps1
```

#### Permission Errors
- **Windows**: Run PowerShell as Administrator for global pnpm setup
- **File permissions**: Ensure write access to project directory
- **Python packages**: Use virtual environment to avoid permission issues

#### Node.js Version Issues
- Ensure Node.js v18+ is installed
- Check with: `node -v`
- Update if needed: Download from [nodejs.org](https://nodejs.org/)

#### Python Version Issues
- Ensure Python v3.8+ is installed
- Check with: `python --version`
- Update if needed: Download from [python.org](https://python.org/)

### 🚨 Server 500 Errors (Transfer to New Computer)

If you're getting 500 Internal Server Error when transferring the project to a new computer, follow these steps:

#### 1. Install Missing Python Dependencies
```bash
# Install Python packages required for extraction
pip install -r requirements.txt

# Verify installation
pip list | findstr -i "requests beautifulsoup phonenumbers email-validator validators"
```

#### 2. Install pnpm (if not available)
```bash
# Install pnpm globally
npm install -g pnpm

# Or use npx if pnpm command not found
npx pnpm install
```

#### 3. Build Workspace Packages
```bash
# Install all dependencies
npx pnpm install

# Build required packages
npx pnpm --filter @sg/utils build
npx pnpm --filter @sg/types build
```

#### 4. Start Server Correctly
```bash
# Start server using pnpm
npx pnpm --filter @sg/server dev

# Verify server is running
curl http://localhost:5174/health
```

#### 5. Test Extraction Endpoints
```bash
# Test navbar extraction
curl -X POST http://localhost:5174/api/extract/navbar \
  -H "Content-Type: application/json" \
  -d '{"runId": "your-run-id"}'

# Test images extraction  
curl -X POST http://localhost:5174/api/extract/images \
  -H "Content-Type: application/json" \
  -d '{"runId": "your-run-id"}'

# Test paragraphs extraction
curl -X POST http://localhost:5174/api/extract/paragraphs \
  -H "Content-Type: application/json" \
  -d '{"runId": "your-run-id"}'
```

#### Common Error Messages and Solutions

**Error: `Cannot find module '@sg/utils'`**
```bash
# Solution: Build the workspace packages
npx pnpm --filter @sg/utils build
npx pnpm --filter @sg/types build
```

**Error: `ModuleNotFoundError: No module named 'beautifulsoup4'`**
```bash
# Solution: Install Python dependencies
pip install -r requirements.txt
```

**Error: `pnpm: command not found`**
```bash
# Solution: Install pnpm or use npx
npm install -g pnpm
# OR
npx pnpm install
```

**Error: `500 Internal Server Error` on extraction endpoints**
```bash
# Solution: Complete setup process
pip install -r requirements.txt
npx pnpm install
npx pnpm --filter @sg/utils build
npx pnpm --filter @sg/types build
npx pnpm --filter @sg/server dev
```

#### Verification Checklist
- [ ] Python dependencies installed (`pip list` shows all required packages)
- [ ] pnpm available (`npx pnpm --version` works)
- [ ] Workspace packages built (`@sg/utils` and `@sg/types` have `dist/` folders)
- [ ] Server starts without errors (`npx pnpm --filter @sg/server dev`)
- [ ] Health endpoint responds (`curl http://localhost:5174/health`)
- [ ] Extraction endpoints return 200 status (not 500)

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