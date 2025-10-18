# Truth Extractor

A production-ready Python tool that crawls business websites and extracts normalized, validated information with confidence scoring and provenance tracking.

## What It Does

Truth Extractor visits a business website (e.g., `https://acmeplumbing.com`), intelligently crawls key pages (homepage, about, contact, services), and extracts:

- **Brand Name** with legal suffix normalization
- **Location** (parsed address components + formatted string)
- **Contact Info** (validated email and E.164 phone)
- **Social Links** (Facebook, Instagram, LinkedIn, X, YouTube, TikTok, Yelp)
- **Services** (mapped to canonical taxonomy)
- **Brand Colors** (1-2 primary HEX with WCAG AA contrast validation)
- **Logo** (best quality, preferring SVG/transparent PNG)
- **Background** (50-word about paragraph)
- **Mission/Slogan** (≤8 words)

Every field includes:
- **value**: The extracted data
- **confidence**: 0-1 score based on source quality, method reliability, and validation
- **provenance**: Exact page URL and extraction method (e.g., `jsonld.Organization.name`, `meta[og:site_name]`)
- **notes**: Optional validation details

## How It Works

### Deterministic Extraction

Uses rule-based and structural extraction only (no LLMs):
1. **JSON-LD** & microdata (schema.org)
2. **Meta tags** (OpenGraph, Twitter Cards, theme-color)
3. **Semantic HTML** (header, nav, footer sections)
4. **Links** (tel:, mailto:, social domains)
5. **CSS variables** (--primary, --brand-color)

### Confidence Scoring

Each candidate is scored as:
```
candidate_score = source_weight × method_weight + validator_bonus
```

**Source weights:**
- JSON-LD structured data: 1.0
- Meta tags / header elements: 0.9
- Navigation / main content: 0.7
- Footer: 0.6
- Body text: 0.5

**Method weights:**
- Direct attribute/property: 1.0
- Semantic extraction: 0.9
- Pattern matching: 0.7
- Heuristic inference: 0.6

**Validator bonuses:**
- Email with valid MX record: +0.1
- Phone number validation: +0.1
- Address geocoded: +0.1
- Color passes WCAG AA: +0.1

### Crawling Scope & Safety

- **Respects robots.txt** (configurable user-agent)
- **Same-host only** (no external redirects)
- **Smart navigation**: Follows links likely containing contact/about/services
- **Depth limit**: ≤2 hops, max 20 pages (configurable)
- **Rate limiting**: 1 req/sec with exponential backoff retries
- **Caching**: Disk cache to avoid re-fetching (uses requests-cache)
- **Random user-agent rotation** for polite crawling

### Validation

- **Phone**: Parsed with `phonenumbers` library, formatted to E.164
- **Email**: Regex + MX DNS lookup
- **Address**: Component parsing and normalization (optional geocoding)
- **Colors**: WCAG AA contrast ratio validation, HEX + HSL output

## Setup

### Prerequisites
- Python 3.11+
- Poetry (optional but recommended)

### Installation

```bash
# With Poetry
poetry install

# Or with pip
pip install -e .
```

## Usage

### Single Site

```bash
truth-extractor https://acmeplumbing.com --out out --max-pages 20
```

Output:
- `out/acmeplumbing.com/truth.json` - Full extraction record
- `out/acmeplumbing.com/summary.csv` - One row per field
- `out/acmeplumbing.com/assets/` - Downloaded logo
- `out/acmeplumbing.com/crawl.json` - Crawl metadata

### Batch Mode

```bash
# Create sites.txt with one URL per line
truth-extractor --batch sites.txt --out out
```

### Evaluation Mode

Compare outputs against golden dataset:

```bash
truth-extractor --batch sites.txt --evaluate goldens/ --report report.csv
```

### Options

- `--out DIR` - Output directory (default: `out`)
- `--max-pages N` - Maximum pages to crawl (default: 20)
- `--timeout N` - Request timeout in seconds (default: 10)
- `--geocode-token TOKEN` - Optional geocoding API token
- `--user-agent UA` - Custom user-agent string
- `--batch FILE` - Batch mode: process URLs from file
- `--evaluate DIR` - Evaluation mode: compare against golden dataset
- `--report FILE` - Evaluation report output path

## Services Taxonomy

The tool maps extracted service phrases to a canonical taxonomy defined in `truth_extractor/taxonomy/services.yaml`.

Default categories include:
- Drain Cleaning
- Leak Repair
- Installations
- Emergency Services
- Maintenance
- Inspections
- Water Heater Service
- Pipe Repair
- Sewer Services
- Fixture Installation

Each category includes synonyms for flexible matching. You can extend the taxonomy by editing the YAML file.

## Output Schema

See `truth_extractor/data/schemas/truth.schema.json` for the complete JSON schema.

Example output:
```json
{
  "business_id": "acmeplumbing-com",
  "domain": "acmeplumbing.com",
  "crawled_at": "2025-10-12T10:30:45Z",
  "pages_visited": 14,
  "fields": {
    "brand_name": {
      "value": "Acme Plumbing",
      "confidence": 0.94,
      "provenance": [{"url": "https://acmeplumbing.com", "path": "jsonld.Organization.name"}],
      "notes": "matched © line"
    },
    "email": {
      "value": "info@acmeplumbing.com",
      "confidence": 0.97,
      "provenance": [{"url": "https://acmeplumbing.com/contact", "path": "a[href^=mailto:]"}],
      "notes": "MX record valid"
    }
  }
}
```

## Architecture

```
truth_extractor/
├── crawl/          # Fetching, robots.txt, rate limiting, caching
├── extraction/     # Field-specific extractors
├── resolve/        # Scoring, validation, winner selection
├── reporting/      # Output writers (JSON, CSV, assets)
├── taxonomy/       # Service categories and synonyms
└── data/schemas/   # JSON schema definitions
```

## Limitations & Future Work

**Current limitations:**
- No computer vision for logo quality assessment
- No ML-based service classification
- No sentiment analysis for background text
- Geocoding requires external API (optional)

**Potential improvements:**
- Vision model for logo scoring
- ML classifier for service categorization
- LLM as optional ranking module (non-generative)
- OCR for image-based contact info
- Multi-language support

## Testing

```bash
# Run tests
poetry run pytest

# With coverage
poetry run pytest --cov=truth_extractor
```

## License

MIT License


