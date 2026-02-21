# Universal Site Extractor

A fullstack site extractor with FastAPI backend, React frontend, and comprehensive content extraction capabilities.

## Features

- **FastAPI Backend**: High-performance async API with automatic Swagger documentation
- **React Frontend**: Modern UI with real-time progress updates and advanced filtering
- **Multi-format Support**: HTML, PDF, DOCX, JSON, CSV, and image extraction
- **JavaScript Rendering**: Optional Playwright integration for JS-heavy sites
- **Smart Extraction**: Uses readability, trafilatura, and custom extractors
- **Deduplication**: SimHash-based near-duplicate detection
- **Rate Limiting**: Polite crawling with robots.txt compliance
- **Real-time Monitoring**: Live progress updates and statistics
- **Confirmation Workflow**: Review and edit extracted data before seeding
- **Seed Generation**: Export generator-ready JSON for site building

## Quick Start

### Prerequisites

- **Python 3.10+** (for FastAPI backend)
- **Node.js 18+** (for React frontend)
- **Git** (for cloning)

### Fedora Linux Setup

Fedora ships with most prerequisites, but a few development headers are needed to compile Python packages such as `lxml` and `Pillow`.

```bash
sudo dnf install \
  python3 python3-pip python3-virtualenv \
  nodejs npm \
  libxml2-devel libxslt-devel \
  gcc-c++ make file

# Optional: install browser deps for Playwright rendering
python3 -m pip install --upgrade pip
python3 -m pip install playwright
python3 -m playwright install-deps
python3 -m playwright install chromium
```

With the dependencies in place, the provided `scripts/dev.sh` and `scripts/build.sh` will create a project-local virtual environment (`.venv`) automatically when you run them.

### Option 1: Development Mode (Recommended)

1. **Start both servers**:
   ```bash
   # Cross-platform (recommended)
   python scripts/dev.py

   # Legacy helpers
   #   macOS/Linux: ./scripts/dev.sh
   #   Windows:     scripts\dev.bat
   ```

2. **Access the application**:
   - **Frontend UI**: http://localhost:5173
   - **Backend API**: http://localhost:5051  
   - **Swagger Docs**: http://localhost:5051/docs

### Option 2: Manual Setup

1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn backend.app:app --reload --port 5051
   ```

2. **Frontend** (in new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Option 3: Docker

```bash
docker-compose up --build
```

### Production Build

```bash
# On Windows (PowerShell)
.\scripts\build.sh

# On Linux/Mac
chmod +x scripts/build.sh
./scripts/build.sh
```

## How to Use

### 1. Starting an Extraction

1. **Open the web interface**: http://localhost:5173
2. **Enter target URL**: e.g., `https://example.com`
3. **Click "Start Run"**: The system will begin crawling
4. **Monitor progress**: Real-time updates in the left panel

### 2. Exploring Results

The interface has **three panels**:

- **Left Panel**: Run controls and progress summary
- **Center Panel**: Page table with filtering options  
- **Right Panel**: Detailed page preview

### 3. Filtering and Search

- **Search**: Type in the search box to find pages by title/content
- **Content Type**: Filter by HTML, PDF, DOCX, JSON, CSV, Images
- **Min Words**: Show only pages with minimum word count
- **Status**: View successful pages vs. errors

### 4. Confirmation and Seeding

After extraction completes, you can review and edit the data:

1. **Navigate to Confirmation**: Click "Confirm" on any completed run
2. **Review Prime Data**: Edit navigation structure and footer content
3. **Edit Page Content**: Modify titles, descriptions, media alt text, and links
4. **Export Seed**: Generate generator-ready JSON for site building

The confirmation interface provides:
- **Prime Tab**: Navigation and footer editing with drag-and-drop reordering
- **Content Tab**: Per-page editing of media, files, words, and links
- **Summary Tab**: Overview statistics and content quality recommendations

### 5. Page Details

Click any page in the table to see:
- **Full text content** (first 5000 characters)
- **Metadata** (title, author, creation date, etc.)
- **Headings** structure
- **Images** and links found
- **Statistics** (word count, image count, etc.)

## Export System

### Data Formats

- **JSON is the canonical format.** All extraction data is stored as JSON. It is the source of truth for page content, metadata, images, links, and audit findings.
- **Markdown is a derived view.** Each page in the export bundle includes a `content.md` file rendered from the JSON data for human readability.

### Downloading the Export Bundle

```
GET /api/runs/{run_id}/export
```

By default, the export creates a lightweight zip with remote image URLs in Markdown. No images are downloaded.

### Asset Downloading (Optional)

To download referenced images and rewrite Markdown links to local paths, pass query parameters:

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `download_assets` | `none`, `images`, `all` | `none` | What to download |
| `assets_scope` | `same-origin`, `include-cdn`, `all` | `same-origin` | URL scope filter |
| `max_asset_bytes` | integer (bytes) | `5242880` (5 MB) | Max size per file |
| `max_total_asset_bytes` | integer (bytes) | `104857600` (100 MB) | Total download budget |
| `assets_dir` | string | `assets` | Asset folder name in bundle |

**Example — download same-origin images:**
```
GET /api/runs/abc123/export?download_assets=images
```

**Example — download all images including CDNs:**
```
GET /api/runs/abc123/export?download_assets=images&assets_scope=include-cdn
```

### Export Bundle Layout

```
export_<run_id>.zip
├── run.json
├── pages/
│   ├── index.json
│   └── <page_id>/
│       ├── page.json          # full structured extraction (canonical)
│       ├── content.md         # derived Markdown view
│       ├── content.txt        # plain text
│       └── snapshot.html      # sanitized HTML snapshot
├── assets/
│   ├── manifest.json          # asset registry (downloaded + skipped)
│   └── images/                # downloaded files (when enabled)
│       └── <sha256>.<ext>     # content-hash named files
├── reports/
│   ├── audit.json
│   └── audit.md
└── graphs/
    ├── links.csv
    └── crawl_graph.json
```

Assets are deduplicated by SHA-256 content hash. If the same image appears on multiple pages, it is stored once. Skipped assets (too large, out of scope, failed) are recorded in `assets/manifest.json` with a reason.

## Configuration

Copy `env.example` to `.env` and customize:

```bash
cp env.example .env
```

### Key Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `GLOBAL_CONCURRENCY` | 12 | Number of concurrent requests |
| `PER_HOST_LIMIT` | 6 | Requests per host (politeness) |
| `REQUEST_TIMEOUT_SEC` | 20 | Request timeout in seconds |
| `MAX_PAGES_DEFAULT` | 400 | Default page limit |
| `RENDER_ENABLED` | false | Enable JavaScript rendering |
| `RENDER_BUDGET` | 0.10 | Percentage of pages to render with JS |

## Project Structure

```
site_extractor_v2/
├── backend/                    # FastAPI Backend
│   ├── app.py                 # Main FastAPI application
│   ├── routers/               # API route handlers
│   │   ├── __init__.py
│   │   ├── runs.py           # Run management endpoints
│   │   ├── pages.py          # Page listing/details endpoints
│   │   ├── review.py         # Review and aggregation endpoints
│   │   └── confirm.py        # Confirmation workflow endpoints
│   ├── core/                 # Core configuration and types
│   │   ├── config.py         # Settings and environment config
│   │   ├── deps.py           # Dependency injection
│   │   └── types.py          # Pydantic models
│   ├── crawl/                # Crawling engine
│   │   ├── runner.py         # Main orchestration
│   │   ├── frontier.py       # URL queue management
│   │   ├── fetch.py          # Async HTTP client
│   │   ├── render_pool.py    # Playwright browser pool
│   │   └── robots.py         # Robots.txt compliance
│   ├── extract/              # Content extractors
│   │   ├── html.py           # HTML content extraction
│   │   ├── pdfs.py           # PDF text extraction
│   │   ├── docx_.py          # DOCX document extraction
│   │   ├── json_csv.py       # JSON/CSV data extraction
│   │   ├── images.py         # Image metadata extraction
│   │   ├── nav_footer.py     # Navigation and footer extraction
│   │   └── files_words_links.py # Structured content extraction
│   ├── storage/              # Data storage
│   │   ├── runs.py           # File-based run storage
│   │   ├── simhash.py        # Near-duplicate detection
│   │   ├── confirmation.py   # Confirmation data storage
│   │   └── seed.py           # Seed generation utilities
│   ├── Dockerfile            # Backend container config
│   ├── requirements.txt      # Python dependencies
│   └── README.md            # Backend documentation
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── App.tsx          # Main application component
│   │   ├── main.tsx         # React entry point
│   │   ├── styles.css       # Tailwind CSS imports
│   │   ├── components/      # Reusable UI components
│   │   │   ├── TopBar.tsx
│   │   │   ├── RunSummary.tsx
│   │   │   ├── RunFilters.tsx
│   │   │   ├── RunTable.tsx
│   │   │   ├── PageDetail.tsx
│   │   │   ├── PrimeTabs.tsx
│   │   │   ├── ContentTabs.tsx
│   │   │   └── SummaryTab.tsx
│   │   ├── lib/             # Utilities and types
│   │   │   ├── api.ts       # API client functions
│   │   │   ├── types.ts     # TypeScript interfaces
│   │   │   ├── api.confirm.ts # Confirmation API client
│   │   │   └── types.confirm.ts # Confirmation types
│   │   └── pages/           # Page components
│   │       ├── Generator.tsx
│   │       ├── Review.tsx
│   │       ├── RunView.tsx
│   │       └── ConfirmPage.tsx
│   ├── Dockerfile           # Frontend container config
│   ├── index.html           # HTML template
│   ├── package.json         # Node.js dependencies
│   ├── tailwind.config.js   # Tailwind CSS config
│   ├── tsconfig.json        # TypeScript config
│   └── vite.config.ts      # Vite build config
├── scripts/                  # Development scripts
│   ├── dev.sh              # Linux/Mac dev startup
│   ├── dev.bat             # Windows dev startup
│   ├── build.sh            # Linux/Mac build script
│   └── build.bat           # Windows build script
├── runs/                    # Generated extraction data
├── docker-compose.yml       # Multi-service Docker setup
├── .env.example            # Environment configuration template
├── LICENSE                 # MIT License
└── README.md              # This file
```

## Architecture

### Backend (FastAPI)

- **Crawler**: Async HTTP client with rate limiting and retry logic
- **Extractors**: Content-type specific extraction modules
- **Storage**: File-based storage with JSON serialization
- **Deduplication**: SimHash for near-duplicate detection
- **Rendering**: Optional Playwright pool for JavaScript pages

### Frontend (React + TypeScript)

- **Real-time Updates**: Live progress monitoring
- **Advanced Filtering**: Multi-criteria page filtering
- **Responsive Design**: Mobile-friendly interface
- **Virtualization**: Handle large datasets efficiently

## API Reference

### Core Endpoints

- `POST /api/runs/start` - Start new extraction
- `GET /api/runs/{run_id}/progress` - Get run progress
- `GET /api/runs/{run_id}/pages` - Get paginated pages
- `GET /api/runs/{run_id}/page/{page_id}` - Get page details
- `POST /api/runs/{run_id}/stop` - Stop running extraction

### Confirmation Endpoints

- `GET /api/confirm/{run_id}/prime` - Get navigation, footer, and pages index
- `GET /api/confirm/{run_id}/content?page_path={path}` - Get structured page content
- `PATCH /api/confirm/{run_id}/prime/nav` - Update navigation structure
- `PATCH /api/confirm/{run_id}/prime/footer` - Update footer content
- `PATCH /api/confirm/{run_id}/content?page_path={path}` - Update page content
- `POST /api/confirm/{run_id}/seed` - Generate seed.json for site building

### Content Types Supported

- **HTML**: Full text extraction with metadata, links, images
- **PDF**: Text extraction with page count and metadata
- **DOCX**: Document text with heading structure
- **JSON/CSV**: Schema inference and sample data
- **Images**: Metadata extraction (size, format, EXIF)


## Advanced Features

### JavaScript Rendering

Enable Playwright for JavaScript-heavy sites:

```bash
pip install playwright
playwright install chromium
```

Set `RENDER_ENABLED=true` in your `.env` file.


### Rate Limiting

Configure per-domain rate limits:

```python
# In your configuration
PER_HOST_LIMIT = 6  # requests per host
REQUESTS_PER_SECOND = 2.0  # global rate limit
```

## Troubleshooting

### Common Issues

1. **Import errors**: Ensure all dependencies are installed
2. **Port conflicts**: Change ports in `scripts/dev.sh`
3. **Memory issues**: Reduce `GLOBAL_CONCURRENCY` for large sites
4. **Timeout errors**: Increase `REQUEST_TIMEOUT_SEC`

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=DEBUG
```

### Performance Tuning

For large sites (500+ pages):
- Increase `GLOBAL_CONCURRENCY` to 20-30
- Set `PER_HOST_LIMIT` to 10-15
- Use SSD storage for better I/O performance
- Consider running on multiple machines

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, coding standards, and the pull request process.

## License

This project is licensed under the [MIT License](LICENSE).
Copyright (c) 2025 Nicholas Burgo.

## Support

- Issues: GitHub Issues
- Documentation: This README
- API Docs: http://localhost:5051/docs (when running)