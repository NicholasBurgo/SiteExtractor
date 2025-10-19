# Quick Start Guide

Get up and running with Truth Extractor in 5 minutes!

## Installation

### Option 1: Poetry (Recommended)
```bash
# Install Poetry if you don't have it
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
cd SiteTestGenerator
poetry install

# Activate virtual environment
poetry shell
```

### Option 2: pip
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install package in development mode
pip install -e .
```

## Your First Extraction

### Command Line

```bash
# Extract from a single website
truth-extractor https://example.com

# Check the output
ls -la out/example.com/
# You'll see: truth.json, summary.csv, crawl.json, and assets/
```

### Python Script

Create `test_extract.py`:

```python
from truth_extractor.config import Config
from truth_extractor.orchestrator import TruthExtractor

# Setup
config = Config()
config.output_dir = "output"

# Extract
extractor = TruthExtractor(config)
result = extractor.extract("https://example.com")

# Show results
fields = result["fields"]
print(f"Business: {fields['brand_name']['value']}")
print(f"Email: {fields['email']['value']}")
print(f"Phone: {fields['phone']['value']}")
```

Run it:
```bash
python test_extract.py
```

## Understanding the Output

### truth.json
Complete extraction record with:
- All field values
- Confidence scores (0-1)
- Provenance (where each value came from)
- All candidate values considered

### summary.csv
Simple CSV with one row per field:
```
field,value,confidence,source
brand_name,Acme Plumbing,0.94,jsonld.Organization.name
email,info@acme.com,0.97,a[href^='mailto:']
phone,+15551234567,0.96,a[href^='tel:']
...
```

### crawl.json
Metadata about the crawl:
- Pages visited
- HTTP status codes
- Timing information
- Cache statistics

## Common Use Cases

### 1. Batch Process Multiple Sites

Create `sites.txt`:
```
https://business1.com
https://business2.com
https://business3.com
```

Run:
```bash
truth-extractor --batch sites.txt
```

### 2. Customize Crawl Depth

```bash
# Crawl more pages for better coverage
truth-extractor https://example.com --max-pages 50
```

### 3. Extract Specific Information

```python
from truth_extractor.extraction.contact import ContactExtractor
from truth_extractor.crawl.parser import HTMLParser

html = open("page.html").read()
parser = HTMLParser(html, "https://example.com")

contact = ContactExtractor(parser)
emails = contact.extract_emails()

for candidate in emails:
    print(f"Email: {candidate.value} (score: {candidate.score})")
```

## Interpreting Confidence Scores

| Score | Meaning | Action |
|-------|---------|--------|
| 0.9 - 1.0 | Very high confidence | Use with confidence |
| 0.7 - 0.89 | High confidence | Likely correct |
| 0.5 - 0.69 | Medium confidence | Review recommended |
| 0.3 - 0.49 | Low confidence | Verify manually |
| 0.0 - 0.29 | Very low / not found | Don't use |

## Testing

Run the test suite to verify everything works:

```bash
# All tests
pytest

# Specific test
pytest tests/test_validators.py

# With verbose output
pytest -v

# With coverage
pytest --cov=truth_extractor
```

## Next Steps

1. **Read the full README** - Detailed architecture and features
2. **Check USAGE_EXAMPLES.md** - More advanced use cases
3. **Customize taxonomy** - Edit `truth_extractor/taxonomy/services.yaml`
4. **Extend extractors** - Add custom extraction logic
5. **Build integrations** - Connect to your database or API

## Getting Help

- Check the logs: `truth-extractor https://example.com -v`
- Review the output: `cat out/example.com/truth.json | python -m json.tool`
- Inspect candidates: Look at the `candidates` section in truth.json
- Run tests: `pytest tests/ -v`

## Performance Tips

1. **Use caching** - Responses are cached automatically in `out/.cache/`
2. **Adjust rate limits** - Default is 1 req/sec, increase if needed
3. **Limit pages** - Use `--max-pages` to control crawl size
4. **Batch smartly** - Process similar sites together to leverage cache

## Common Issues

**Issue**: "Blocked by robots.txt"
**Solution**: The site restricts crawling. Respect their wishes or contact the site owner.

**Issue**: Low confidence scores
**Solution**: Site may have minimal structured data. Check `candidates` in truth.json to see what was found.

**Issue**: Slow extraction
**Solution**: Reduce `--max-pages` or increase `rate_limit_delay` in config.

**Issue**: Missing fields
**Solution**: Some sites don't expose all information. Check if data exists on the site manually.

## Example Output

```bash
$ truth-extractor https://acmeplumbing.com

2025-10-12 10:30:45 [INFO] Starting extraction for https://acmeplumbing.com
2025-10-12 10:30:45 [INFO] Step 1: Crawling website...
2025-10-12 10:30:46 [INFO] Crawled [1/20] https://acmeplumbing.com (depth=0, title='Acme Plumbing')
2025-10-12 10:30:47 [INFO] Crawled [2/20] https://acmeplumbing.com/about (depth=1, title='About Us')
...
2025-10-12 10:31:15 [INFO] Crawl complete: 14 successful, 0 failed
2025-10-12 10:31:15 [INFO] Step 2: Extracting candidates...
2025-10-12 10:31:16 [INFO] Step 3: Resolving candidates...
2025-10-12 10:31:17 [INFO] Step 4: Writing outputs...
2025-10-12 10:31:17 [INFO] Wrote truth.json to out/acmeplumbing.com/truth.json
2025-10-12 10:31:17 [INFO] Extraction complete for https://acmeplumbing.com

✓ Successfully extracted truth record for https://acmeplumbing.com
  Business: Acme Plumbing
  Confidence: 0.94
  Pages crawled: 14
```

Happy extracting! 🚀






