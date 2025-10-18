# Truth Extractor - Usage Examples

## Installation

### With Poetry (recommended)
```bash
poetry install
```

### With pip
```bash
pip install -r requirements.txt
```

## Command-Line Usage

### 1. Single Website

Extract information from a single website:

```bash
truth-extractor https://acmeplumbing.com
```

With custom options:
```bash
truth-extractor https://acmeplumbing.com \
  --out output \
  --max-pages 30 \
  --timeout 15
```

### 2. Batch Processing

Create a file `sites.txt` with one URL per line:
```
https://acmeplumbing.com
https://smithhvac.com
https://joneselectrical.com
```

Then run:
```bash
truth-extractor --batch sites.txt --out results
```

### 3. Custom User Agent

Use a custom user-agent string:
```bash
truth-extractor https://example.com \
  --user-agent "MyBot/1.0 (contact@example.com)"
```

### 4. With Geocoding (optional)

If you have a geocoding API token:
```bash
truth-extractor https://example.com \
  --geocode-token YOUR_TOKEN_HERE
```

### 5. Verbose Mode

Enable detailed logging:
```bash
truth-extractor https://example.com -v
```

## Python Library Usage

### Basic Example

```python
from truth_extractor.config import Config
from truth_extractor.orchestrator import TruthExtractor

# Configure
config = Config()
config.output_dir = "output"
config.crawl.max_pages = 20

# Extract
extractor = TruthExtractor(config)
result = extractor.extract("https://example.com")

# Access results
print(f"Business: {result['fields']['brand_name']['value']}")
print(f"Email: {result['fields']['email']['value']}")
print(f"Phone: {result['fields']['phone']['value']}")
```

### Advanced Configuration

```python
from truth_extractor.config import Config, CrawlConfig, ExtractionConfig

# Custom crawl config
crawl_config = CrawlConfig(
    max_pages=30,
    max_depth=3,
    timeout=15,
    rate_limit_delay=0.5,  # Faster crawling
    respect_robots=True,
)

# Custom extraction config
extraction_config = ExtractionConfig(
    background_max_words=100,
    slogan_max_words=10,
    services_max_count=10,
)

# Create main config
config = Config()
config.crawl = crawl_config
config.extraction = extraction_config
config.output_dir = "custom_output"

# Run extraction
extractor = TruthExtractor(config)
result = extractor.extract("https://example.com")
```

### Custom Processing

```python
from truth_extractor.crawl.crawler import WebCrawler
from truth_extractor.extraction.jsonld import JSONLDExtractor
from truth_extractor.resolve.resolver import FieldResolver

# Manual crawling
crawler = WebCrawler(config.crawl)
crawl_result = crawler.crawl("https://example.com")

# Extract from specific pages
for page in crawl_result.get_successful_pages():
    if page.parser:
        # JSON-LD extraction
        jsonld = JSONLDExtractor(page.parser)
        name_candidates = jsonld.extract_organization_name()
        
        print(f"Found {len(name_candidates)} name candidates from {page.url}")

# Resolve candidates
resolver = FieldResolver()
field_result = resolver.resolve_brand_name(name_candidates)

print(f"Winner: {field_result.value} (confidence: {field_result.confidence})")
```

## Output Files

After extraction, you'll find these files in the output directory:

```
output/
└── example.com/
    ├── truth.json          # Full extraction record
    ├── summary.csv         # Summary table
    ├── crawl.json          # Crawl metadata
    └── assets/
        └── logo.svg        # Downloaded logo
```

### truth.json Structure

```json
{
  "business_id": "example-com",
  "domain": "example.com",
  "crawled_at": "2025-10-12T10:30:45Z",
  "pages_visited": 14,
  "fields": {
    "brand_name": {
      "value": "Acme Plumbing",
      "confidence": 0.94,
      "provenance": [{
        "url": "https://example.com",
        "path": "jsonld.Organization.name"
      }],
      "notes": "matched © line"
    },
    "email": {
      "value": "info@example.com",
      "confidence": 0.97,
      "provenance": [...]
    },
    ...
  },
  "candidates": {
    "brand_name": [...],
    ...
  }
}
```

## Extending the Service Taxonomy

Edit `truth_extractor/taxonomy/services.yaml`:

```yaml
services:
  - canonical: "Custom Service"
    synonyms:
      - "custom"
      - "bespoke service"
      - "tailored"
```

## Testing

Run all tests:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=truth_extractor --cov-report=html
```

Run specific test file:
```bash
pytest tests/test_validators.py -v
```

## Troubleshooting

### Rate Limiting

If you're being rate-limited, increase the delay:
```python
config.crawl.rate_limit_delay = 2.0  # 2 seconds between requests
```

### Robots.txt Blocking

If robots.txt blocks crawling, you can disable it (use responsibly):
```python
config.crawl.respect_robots = False
```

### DNS/Network Issues

Increase timeout and retries:
```python
config.crawl.timeout = 30
config.crawl.retry_attempts = 5
```

### Cache Issues

Clear the cache:
```bash
rm -rf output/.cache/
```

## Best Practices

1. **Respect robots.txt** - Always check and follow robots.txt rules
2. **Rate limiting** - Don't overwhelm servers; use appropriate delays
3. **User-agent** - Use a descriptive user-agent with contact info
4. **Caching** - Let the built-in cache avoid redundant requests
5. **Error handling** - Check confidence scores before trusting values
6. **Validation** - Low confidence fields may need manual review

## Integration Examples

### Save to Database

```python
import sqlite3

result = extractor.extract("https://example.com")
fields = result["fields"]

conn = sqlite3.connect("businesses.db")
cursor = conn.cursor()

cursor.execute("""
    INSERT INTO businesses (name, email, phone, website)
    VALUES (?, ?, ?, ?)
""", (
    fields["brand_name"]["value"],
    fields["email"]["value"],
    fields["phone"]["value"],
    result["domain"]
))

conn.commit()
```

### Export to CSV

```python
import csv

results = []
for url in urls:
    result = extractor.extract(url)
    results.append(result)

with open("businesses.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["Name", "Email", "Phone", "Website"])
    
    for result in results:
        fields = result["fields"]
        writer.writerow([
            fields["brand_name"]["value"],
            fields["email"]["value"],
            fields["phone"]["value"],
            result["domain"]
        ])
```

### API Integration

```python
from flask import Flask, jsonify, request

app = Flask(__name__)
extractor = TruthExtractor(Config())

@app.route("/extract", methods=["POST"])
def extract():
    url = request.json.get("url")
    
    try:
        result = extractor.extract(url)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000)
```


