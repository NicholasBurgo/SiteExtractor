<div align="center">

# Site Test Generator
Robust full‑stack crawler and content extractor with a review and confirmation workflow

<br/>

<a href="#"><img src="https://img.shields.io/badge/BUILD-PASSING-FF006E?style=for-the-badge" alt="Build Status"/></a>
<a href="#license"><img src="https://img.shields.io/badge/LICENSE-PROPRIETARY-00D9FF?style=for-the-badge" alt="License"/></a>
<a href="#"><img src="https://img.shields.io/badge/VERSION-2.0.0-8B5CF6?style=for-the-badge" alt="Version"/></a>

</div>

---

## About
Site Test Generator is a production‑ready toolkit for crawling websites, rendering pages when needed, and extracting structured content (HTML, images, PDFs, DOCX) into organized datasets. It includes a React frontend to review, summarize, and confirm extracted data before export/packaging.

It focuses on reliability at scale with a modular crawler, robust parsing pipeline, and a clean UI for human‑in‑the‑loop verification.

<br/>

---

## Key Features
- **Full‑stack extraction pipeline**: Crawl, render, and parse HTML, PDFs, DOCX, and images
- **Human‑in‑the‑loop review**: Rich React UI to review pages, summaries, and assets
- **High‑performance backend**: FastAPI + Uvicorn with efficient parsers and orjson
- **Content aggregation & rollups**: Summaries, truth tables, and navigation/footer extraction
- **Local, file‑based runs**: Deterministic run folders with indexed pages and metadata
- **Dockerized dev**: One‑command startup for API and web UI with proxying

<br/>

---

## Tech Stack

<div align="center">

<b>Languages</b><br/>
<img src="https://img.shields.io/badge/Python-FF006E?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-8B5CF6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/JavaScript-00D9FF?style=for-the-badge&logo=javascript&logoColor=black" />
<img src="https://img.shields.io/badge/HTML5-FF006E?style=for-the-badge&logo=html5&logoColor=white" />

<br/>

<b>Frontend</b><br/>
<img src="https://img.shields.io/badge/React-00D9FF?style=for-the-badge&logo=react&logoColor=white" />
<img src="https://img.shields.io/badge/Vite-8B5CF6?style=for-the-badge&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Tailwind_CSS-FF006E?style=for-the-badge&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/React_Router-00D9FF?style=for-the-badge&logo=reactrouter&logoColor=white" />

<br/>

<b>Backend</b><br/>
<img src="https://img.shields.io/badge/FastAPI-8B5CF6?style=for-the-badge&logo=fastapi&logoColor=white" />
<img src="https://img.shields.io/badge/Uvicorn-FF006E?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/aiohttp-00D9FF?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/Pydantic_v2-8B5CF6?style=for-the-badge&logo=pydantic&logoColor=white" />

<br/>

<b>Parsing & Extraction</b><br/>
<img src="https://img.shields.io/badge/BeautifulSoup-FF006E?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/lxml-00D9FF?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/trafilatura-8B5CF6?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/readability--lxml-FF006E?style=for-the-badge&logo=python&logoColor=white" />

<br/>

<b>Documents & Media</b><br/>
<img src="https://img.shields.io/badge/PyPDF2-00D9FF?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/pdfminer--six-8B5CF6?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/python--docx-FF006E?style=for-the-badge&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/Pillow-00D9FF?style=for-the-badge&logo=python&logoColor=white" />

<br/>

<b>DevOps & Tools</b><br/>
<img src="https://img.shields.io/badge/Docker-8B5CF6?style=for-the-badge&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/Docker_Compose-FF006E?style=for-the-badge&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/Playwright-00D9FF?style=for-the-badge&logo=microsoft&logoColor=white" />
<img src="https://img.shields.io/badge/ORJSON-8B5CF6?style=for-the-badge&logo=json&logoColor=white" />

</div>

<br/>

---

## Architecture
This project is organized as a **monorepo** with a FastAPI backend and a React (Vite) frontend.

- **Backend (`backend/`)**: FastAPI application exposing endpoints for runs, pages, review, and confirmation. Crawler/extractor modules handle fetching, rendering, parsing, and aggregation. Data is written to run‑scoped folders under `backend/runs/`.
- **Frontend (`frontend/`)**: React app using Vite and Tailwind for a responsive UI. It proxies API calls to the backend during development.
- **Docker**: `docker-compose.yml` builds and runs both services for local development.

<br/>

---

 

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (optional, for containerized dev)

<br/>

### Installation (local dev)
```bash
# 1) Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# If using Playwright-based rendering:
python -m playwright install --with-deps || true

# 2) Frontend
cd ../frontend
npm install
```

<br/>

### Running (local dev)
```bash
# Terminal A - Backend
cd backend
uvicorn backend.app:app --host 0.0.0.0 --port 5051

# Terminal B - Frontend (with API proxy)
cd frontend
npm run dev
```

Open the web app at `http://localhost:5173`.

API docs available at `http://localhost:5051/docs` and `http://localhost:5051/redoc`.

<br/>

### Running with Docker Compose
```bash
docker-compose up --build
```

- API: `http://localhost:5051`
- Web: `http://localhost:5173`

<br/>

---

## API Documentation
The FastAPI backend exposes these main routes (see interactive docs at `/docs`):

- `GET /health` — health check
- `GET /api/runs/*` — run management endpoints
- `GET /api/pages/*` — page retrieval and detail
- `GET /api/review/*` — review pipeline endpoints
- `GET /api/confirm/*` — confirmation workflow endpoints

Full OpenAPI schema and try‑it‑out UI are available at `/docs` and `/redoc`.

<br/>

---

## Project Structure
```text
SiteTestGenerator/
├─ backend/
│  ├─ app.py                 # FastAPI app + routers
│  ├─ core/                  # config, deps, types, utils
│  ├─ crawl/                 # fetch, frontier, render, robots, runner
│  ├─ extract/               # html, images, pdfs, docx, aggregations
│  ├─ routers/               # runs, pages, review, confirm
│  ├─ runs/                  # run artifacts (site.json, pages, indexes)
│  ├─ storage/               # run storage, simhash, seed helpers
│  └─ requirements.txt
├─ frontend/
│  ├─ src/                   # React app (Vite + Tailwind)
│  ├─ index.html
│  └─ vite.config.ts         # dev proxy to backend
├─ docker-compose.yml        # dev orchestration (API + Web)
├─ scripts/                  # dev/build helper scripts
└─ README.md
```

<br/>

---

 

## License
This project is released under a proprietary license. See the [`LICENSE`](./LICENSE) file for details.

<br/>

---

<div align="center">

Built with ♥ using <b style="color:#FF006E">FastAPI</b>, <b style="color:#8B5CF6">React</b>, and <b style="color:#00D9FF">Vite</b>.

</div>

# Universal Site Extractor v2

A clean, production-ready fullstack site extractor with FastAPI backend, React frontend, and comprehensive content extraction capabilities.

## ✨ What's New in v2

This is a **complete rewrite** that replaces the old extraction system with:

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

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+** (for FastAPI backend)
- **Node.js 18+** (for React frontend)
- **Git** (for cloning)

### Option 1: Development Mode (Recommended)

1. **Start both servers**:
   ```bash
   # On Windows (PowerShell)
   .\scripts\dev.sh
   
   # On Linux/Mac
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
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

## 📖 How to Use

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

## ⚙️ Configuration

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

## 📁 Project Structure

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

## Configuration

Copy `env.example` to `.env` and customize settings:

```bash
cp env.example .env
```

Key settings:
- `GLOBAL_CONCURRENCY`: Number of concurrent requests
- `PER_HOST_LIMIT`: Requests per host
- `MAX_PAGES_DEFAULT`: Default page limit
- `RENDER_ENABLED`: Enable JavaScript rendering
- `RENDER_BUDGET`: Percentage of pages to render with JS

## Usage

### Starting an Extraction

1. Open the web interface
2. Enter the target URL
3. Configure settings (max pages, depth, concurrency)
4. Click "Start Run"

### Monitoring Progress

- View real-time progress in the run summary
- Monitor queued, visited, and error counts
- Check per-host statistics
- View estimated time remaining

### Exploring Results

- **Filter pages**: By content type, word count, errors, etc.
- **Search**: Find specific pages by title or content
- **Sort**: By word count, images, links, or processing time
- **Details**: Click any page to view full content and metadata

## Advanced Features

### JavaScript Rendering

Enable Playwright for JavaScript-heavy sites:

```bash
pip install playwright
playwright install chromium
```

Set `RENDER_ENABLED=true` in your `.env` file.

### Custom Extractors

Extend the system with custom content extractors:

```python
from backend.extract.base import BaseExtractor

class CustomExtractor(BaseExtractor):
    async def extract(self, url, content, headers):
        # Your extraction logic
        return PageResult(...)
```

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

## License

MIT License - see LICENSE file for details.

## Support

- Issues: GitHub Issues
- Documentation: This README
- API Docs: http://localhost:5051/docs (when running)