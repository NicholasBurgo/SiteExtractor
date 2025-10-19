# Truth Extractor - Project Summary

## Overview

Truth Extractor is a production-ready Python 3.11 program that crawls business websites and extracts normalized, validated information with confidence scoring and provenance tracking. It uses deterministic, rule-based extraction (no LLMs) and outputs structured JSON records.

## Project Structure

```
truth_extractor/
├── __init__.py                 # Package initialization
├── __main__.py                 # Entry point for python -m
├── cli.py                      # Command-line interface
├── config.py                   # Configuration management
├── orchestrator.py             # Main extraction coordinator
│
├── crawl/                      # Web crawling module
│   ├── fetcher.py             # HTTP fetching with robots.txt, caching, rate limiting
│   ├── parser.py              # HTML parsing utilities (BeautifulSoup/lxml)
│   └── crawler.py             # Intelligent site navigation
│
├── extraction/                 # Field-specific extractors
│   ├── models.py              # Data models (Candidate, FieldResult, Provenance)
│   ├── jsonld.py              # JSON-LD & schema.org extraction
│   ├── contact.py             # Email, phone, address extraction
│   ├── socials.py             # Social media link extraction & normalization
│   ├── logo.py                # Logo discovery & quality scoring
│   ├── colors.py              # Brand color extraction from CSS/images
│   ├── services.py            # Service extraction & taxonomy mapping
│   └── textbits.py            # Background & slogan extraction
│
├── resolve/                    # Candidate resolution
│   ├── validators.py          # Email, phone, address, color validation
│   ├── scoring.py             # Candidate scoring & deduplication
│   └── resolver.py            # Winner selection & confidence calculation
│
├── reporting/                  # Output generation
│   └── writer.py              # JSON, CSV, asset downloads
│
├── taxonomy/                   # Service taxonomy
│   └── services.yaml          # Canonical services & synonyms
│
└── data/schemas/               # Output schemas
    └── truth.schema.json      # JSON schema for validation

tests/                          # Comprehensive test suite
├── test_validators.py          # Validator tests
├── test_scoring.py             # Scoring logic tests
├── test_fetcher.py             # URL & domain tests
├── test_extraction.py          # Extraction tests
└── test_colors.py              # Color validation tests
```

## Key Features Implemented

### ✅ Deterministic Extraction
- JSON-LD & microdata parsing (schema.org)
- Meta tag extraction (OpenGraph, Twitter Cards)
- Semantic HTML analysis (header, nav, footer)
- Link extraction (tel:, mailto:, social domains)
- CSS variable inspection

### ✅ Confidence Scoring
- **Source weights**: JSON-LD (1.0), meta (0.9), header (0.85), nav (0.7), footer (0.6)
- **Method weights**: Direct (1.0), semantic (0.9), pattern (0.7), heuristic (0.6)
- **Validator bonuses**: Email MX (+0.1), phone valid (+0.1), WCAG colors (+0.1)
- Final score: `source_weight × method_weight + validator_bonus`

### ✅ Validation
- **Phone**: phonenumbers library, E.164 formatting, area code validation
- **Email**: Regex + MX DNS lookup
- **Address**: Component parsing, US zip validation, optional geocoding
- **Colors**: HEX format, WCAG AA contrast checking (4.5:1 ratio)

### ✅ Crawling Safety
- Respects robots.txt (configurable user-agent)
- Rate limiting (1 req/sec default)
- Same-host restriction
- Smart navigation (prioritizes contact/about/services)
- Depth limit (≤2, configurable)
- Request caching (requests-cache)
- Exponential backoff retries

### ✅ Field Extraction

| Field | Sources | Validation |
|-------|---------|------------|
| **Brand Name** | JSON-LD, meta tags, header, footer © | Legal suffix removal |
| **Location** | JSON-LD PostalAddress, microdata, patterns | Component parsing, geocoding |
| **Email** | mailto: links, contact sections, meta | MX lookup |
| **Phone** | tel: links, contact sections, header | E.164 formatting |
| **Socials** | Profile links (7 platforms) | URL normalization |
| **Services** | Nav, service sections, lists | Taxonomy mapping |
| **Brand Colors** | CSS vars, theme-color, logo palette | WCAG AA contrast |
| **Logo** | itemprop, class/id, header | Format (SVG>PNG>JPG) |
| **Background** | About sections, hero, meta description | 50-word limit |
| **Slogan** | Header tagline, hero, title | 8-word limit, CTA filter |

### ✅ Service Taxonomy
12 canonical categories with synonyms:
- Drain Cleaning, Leak Repair, Installations, Emergency Services
- Maintenance, Inspections, Water Heater Service, Pipe Repair
- Sewer Services, Fixture Installation, Gas Line Services, Remodeling

### ✅ Output Formats

**truth.json**: Complete extraction record
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
      "provenance": [{"url": "...", "path": "jsonld.Organization.name"}],
      "notes": "matched © line"
    }
  },
  "candidates": {}
}
```

**summary.csv**: One row per field with value, confidence, source

**crawl.json**: Crawl metadata (pages, timings, HTTP status)

**assets/**: Downloaded logo files

### ✅ CLI Modes

**Single site**:
```bash
truth-extractor https://example.com --out out --max-pages 20
```

**Batch mode**:
```bash
truth-extractor --batch sites.txt
```

**Evaluate mode** (placeholder):
```bash
truth-extractor --batch sites.txt --evaluate goldens/ --report report.csv
```

### ✅ Testing
- 50+ unit tests covering validators, scoring, extraction, and utilities
- Test fixtures for HTML parsing
- Mock-friendly architecture
- pytest + pytest-cov integration

## Technical Specifications

### Dependencies
- **Core**: requests, requests-cache, beautifulsoup4, lxml, tldextract
- **Validation**: phonenumbers, dnspython, Pillow
- **Data**: pydantic, pyyaml, jsonschema
- **CLI**: colorama (cross-platform colors)

### Python Requirements
- Python 3.11+
- Type hints throughout
- Dataclasses for models
- Logging at all levels

### Performance
- Response caching (24h default)
- Parallel-capable architecture
- Configurable rate limits
- Smart page prioritization

## Configuration

All configurable via `Config` dataclass:

```python
config = Config()
config.crawl.max_pages = 20
config.crawl.max_depth = 2
config.crawl.timeout = 10
config.crawl.rate_limit_delay = 1.0
config.extraction.background_max_words = 50
config.extraction.slogan_max_words = 8
config.geocode_token = "YOUR_TOKEN"
```

## No Hallucination Guarantee

✅ **Never invents values**
- If field not found → `null` with `confidence: 0.0`
- All values traceable to source via provenance
- Multiple candidates preserved in output
- Transparent scoring formula

## Extending the System

### Add a new extraction method:
1. Create extractor class in `extraction/`
2. Return list of `Candidate` objects
3. Call from `orchestrator.py`
4. Add resolver method in `resolve/resolver.py`

### Add a new field:
1. Add to `_extract_all_candidates()` in orchestrator
2. Add to `_resolve_fields()` in orchestrator
3. Add to output schema `truth.schema.json`
4. Add resolver method if needed

### Extend taxonomy:
Edit `taxonomy/services.yaml` - add canonical names and synonyms

### Add validators:
Create validator class in `resolve/validators.py` with `validate()` method

## Limitations & Future Work

**Current limitations**:
- No computer vision for logo quality
- No ML-based classification
- No sentiment analysis
- Geocoding requires external API (optional)
- Evaluation mode is placeholder

**Future improvements**:
- Vision model for logo scoring
- ML service classifier
- LLM as optional ranking module (non-generative)
- OCR for image-based contact info
- Multi-language support

## Usage Examples

See:
- **QUICKSTART.md** - Get started in 5 minutes
- **USAGE_EXAMPLES.md** - Advanced use cases
- **example_usage.py** - Python library example
- **README.md** - Full documentation

## Command Reference

```bash
# Basic
truth-extractor URL

# Options
--out DIR              # Output directory (default: out)
--max-pages N          # Max pages to crawl (default: 20)
--timeout N            # Request timeout (default: 10)
--user-agent UA        # Custom user-agent
--geocode-token TOKEN  # Geocoding API token

# Modes
--batch FILE           # Batch mode
--evaluate DIR         # Evaluation mode
--report FILE          # Evaluation report path
-v, --verbose          # Verbose logging
```

## Installation

```bash
# With Poetry
poetry install

# With pip
pip install -r requirements.txt
pip install -e .

# Run
truth-extractor https://example.com
```

## Testing

```bash
# All tests
pytest

# With coverage
pytest --cov=truth_extractor --cov-report=html

# Specific test
pytest tests/test_validators.py -v
```

## Architecture Highlights

1. **Modular design**: Each extractor is independent
2. **Layered extraction**: Multiple sources per field
3. **Transparent scoring**: Explainable confidence values
4. **Provenance tracking**: Every value cites its source
5. **Validator bonuses**: Quality checks improve confidence
6. **Graceful degradation**: Missing data → low confidence, not errors
7. **Cache-friendly**: Repeated crawls use cached responses
8. **Polite crawling**: Respects robots.txt and rate limits

## Code Quality

- ✅ Type hints throughout
- ✅ Comprehensive docstrings
- ✅ PEP 8 compliant
- ✅ Modular & testable
- ✅ Production-ready error handling
- ✅ Logging at all levels
- ✅ Configuration-driven
- ✅ No hardcoded values

## License

MIT License (implied) - Customize as needed

## Summary

This is a **production-ready, deterministic, explainable** business information extraction system. It respects web standards, validates all data, tracks provenance, scores confidence, and never hallucinates. The architecture is extensible, well-tested, and documented.

**Ready to extract truth from the web! 🚀**






