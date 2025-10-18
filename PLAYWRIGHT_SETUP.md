# Playwright Setup Guide

## 🎯 What is Playwright Support?

Playwright allows the `truth_extractor` to work with **JavaScript-rendered websites** (React, Vue, Angular, Next.js, etc.) by launching a real browser to execute JavaScript and extract the fully-rendered content.

## 📦 Installation

### Step 1: Install Playwright Python Package

```powershell
pip install playwright
```

### Step 2: Install Browser Binaries

```powershell
playwright install chromium
```

This downloads the Chromium browser (~200MB) that Playwright uses.

## ✅ Verify Installation

Test that Playwright is working:

```powershell
py -c "from playwright.sync_api import sync_playwright; print('Playwright installed successfully!')"
```

## 🚀 Usage

### Enable Playwright with the `--use-playwright` Flag

```powershell
# Regular extraction (fast, static HTML only)
py -m truth_extractor.cli https://example.com

# With Playwright (slower, works with JavaScript sites)
py -m truth_extractor.cli https://example.com --use-playwright
```

### How It Works

1. **Without `--use-playwright`** (default):
   - Uses fast HTTP requests
   - Only sees static HTML
   - Works for 80% of sites
   - ~1-2 seconds per page

2. **With `--use-playwright`**:
   - Detects JavaScript SPAs automatically
   - Launches headless Chrome browser
   - Waits for JavaScript to render
   - Extracts fully-rendered HTML
   - ~5-10 seconds per page

## 📊 Performance Comparison

| Mode | Speed | Works With SPAs | Browser Required |
|------|-------|-----------------|------------------|
| Default (HTTP) | ⚡ Fast (1-2s/page) | ❌ No | No |
| Playwright | 🐌 Slower (5-10s/page) | ✅ Yes | Yes (auto-managed) |

## 🎯 When to Use Playwright

### ✅ Use `--use-playwright` When:
- Site returns 0 fields extracted
- You see: "WARNING: JavaScript SPA detected"
- Modern web app (React, Vue, Angular)
- Content loads dynamically after page load

### ❌ Don't Use `--use-playwright` When:
- Site already works (9-10 fields extracted)
- Traditional website (WordPress, static HTML)
- Batch processing many sites (too slow)

## 💡 Example: northshorebusiness.com

### Without Playwright ❌
```powershell
py -m truth_extractor.cli https://northshorebusiness.com
```

**Result:**
```
Brand Name: null
Email: null
Phone: null
...
Summary: 0/10 fields extracted

WARNING: No data extracted.
This website may be a JavaScript Single-Page App
```

### With Playwright ✅
```powershell
py -m truth_extractor.cli https://northshorebusiness.com --use-playwright
```

**Result:**
```
[Playwright launches browser]
[JavaScript executes and renders content]
[Extraction proceeds on rendered HTML]

Brand Name: North Shore Business
Email: contact@northshorebusiness.com
Phone: +15551234567
...
Summary: 8/10 fields extracted successfully! 🎉
```

## 🛠️ Advanced Configuration

### Programmatic Usage

```python
from truth_extractor.config import Config
from truth_extractor.orchestrator import TruthExtractor

# Create config with Playwright enabled
config = Config()
config.crawl.use_playwright = True
config.crawl.playwright_timeout = 30000  # 30 seconds

# Extract data
extractor = TruthExtractor(config)
result = extractor.extract("https://javascript-site.com")
```

### Customize Playwright Timeout

```python
config.crawl.playwright_timeout = 60000  # 60 seconds for slow sites
```

## ⚠️ Troubleshooting

### Error: "Playwright is not installed"

**Solution:**
```powershell
pip install playwright
playwright install chromium
```

### Error: "Executable doesn't exist at ..."

**Solution:** Re-run browser installation:
```powershell
playwright install --force chromium
```

### Slow Performance

Playwright is inherently slower because it:
- Launches a real browser
- Executes all JavaScript
- Waits for network requests
- Renders the full page

**Tips:**
- Only use for sites that need it
- Don't use in batch mode (too slow)
- Consider increasing `--max-pages` to crawl more pages since you're already paying the browser startup cost

## 🎯 Best Practices

1. **Try without Playwright first:**
   ```powershell
   py -m truth_extractor.cli https://example.com
   ```

2. **If you get 0 fields, try with Playwright:**
   ```powershell
   py -m truth_extractor.cli https://example.com --use-playwright
   ```

3. **For batch processing, test a few sites first:**
   ```powershell
   # Test individual site
   py -m truth_extractor.cli https://site1.com --use-playwright
   
   # If it works, add to batch file
   # But be aware: 100 sites × 10 seconds = ~17 minutes!
   ```

## 📝 Summary

| Feature | Default Mode | Playwright Mode |
|---------|--------------|-----------------|
| **Installation** | `pip install -r requirements.txt` | + `pip install playwright && playwright install chromium` |
| **Speed** | ⚡ 1-2s per page | 🐌 5-10s per page |
| **Works with SPAs** | ❌ No | ✅ Yes |
| **Browser Needed** | No | Yes (auto-managed) |
| **Disk Space** | ~50MB | ~250MB |
| **Use Case** | Static sites, batch processing | Modern SPAs, dynamic content |
| **CLI Flag** | (default) | `--use-playwright` |

## 🚀 Quick Start

```powershell
# 1. Install Playwright
pip install playwright
playwright install chromium

# 2. Test with a JavaScript site
py -m truth_extractor.cli https://northshorebusiness.com --use-playwright --max-pages 5

# 3. Check the results!
```

Now you can extract data from **any website** - static or JavaScript! 🎉




