# Windows Quick Start Guide

## ✅ Installation Complete!

You've successfully installed Truth Extractor on Windows with Python 3.13.7.

## 🚀 Running Truth Extractor

You have two options to run the tool:

### Option 1: Using Python Module (Recommended)

```powershell
py -m truth_extractor.cli https://example.com
```

### Option 2: Using Batch File

We've created a convenience batch file:

```powershell
.\truth-extractor.bat https://example.com
```

Or add it to your PATH and run from anywhere:
```powershell
truth-extractor https://example.com
```

## 📋 Quick Commands

### Extract from a Single Website
```powershell
py -m truth_extractor.cli https://example.com
```

### With Custom Output Directory
```powershell
py -m truth_extractor.cli https://example.com --out results
```

### Crawl More Pages
```powershell
py -m truth_extractor.cli https://example.com --max-pages 30
```

### Batch Process Multiple Sites

Create `sites.txt`:
```
https://business1.com
https://business2.com
https://business3.com
```

Then run:
```powershell
py -m truth_extractor.cli --batch sites.txt
```

### Verbose Mode (See All Details)
```powershell
py -m truth_extractor.cli https://example.com -v
```

## 📁 Output Location

By default, results are saved to:
```
out\
└── example.com\
    ├── truth.json       # Full extraction record
    ├── summary.csv      # Quick summary
    ├── crawl.json       # Crawl metadata
    └── assets\
        └── logo.svg     # Downloaded logo (if found)
```

## 🧪 Run Tests

Verify everything works:

```powershell
py -m pytest tests/
```

With coverage:
```powershell
py -m pytest tests/ --cov=truth_extractor
```

## 📖 View Results

### View truth.json (Pretty Format)
```powershell
Get-Content out\example.com\truth.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### View summary.csv
```powershell
Import-Csv out\example.com\summary.csv | Format-Table
```

### Open in Notepad
```powershell
notepad out\example.com\truth.json
```

## 🔧 Python Library Usage

You can also use it as a Python library:

```python
from truth_extractor.config import Config
from truth_extractor.orchestrator import TruthExtractor

# Configure
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

Save as `test_extract.py` and run:
```powershell
py test_extract.py
```

## ⚡ Quick Test

Try extracting from a test website:

```powershell
py -m truth_extractor.cli https://example.com --max-pages 5
```

## 📚 More Documentation

- `README.md` - Full documentation
- `QUICKSTART.md` - General quick start guide
- `USAGE_EXAMPLES.md` - Advanced examples
- `PROJECT_SUMMARY.md` - Architecture details

## 🎯 Common Tasks

### Create an Alias (PowerShell Profile)

Add to your PowerShell profile (`$PROFILE`):
```powershell
function truth-extractor { py -m truth_extractor.cli $args }
```

Then you can just run:
```powershell
truth-extractor https://example.com
```

### Add to System PATH (Optional)

To use `truth-extractor.exe` directly, add this to your PATH:
```
C:\Users\YOUR_USERNAME\AppData\Local\Programs\Python\Python313\Scripts
```

Then you can run:
```powershell
truth-extractor https://example.com
```

## 🛠️ Troubleshooting

**Issue**: "py: command not found"
**Solution**: Use `python` or `python3` instead of `py`

**Issue**: "Module not found"
**Solution**: Re-run `py -m pip install -e .` from the project directory

**Issue**: Tests fail
**Solution**: Make sure you're in the project root directory (`F:\Project\SiteTestGenerator`)

**Issue**: Slow extraction
**Solution**: Reduce pages: `--max-pages 10`

**Issue**: Permission denied
**Solution**: Run PowerShell as Administrator

## ✅ Verification

Check that everything is working:

```powershell
# Check Python version
py --version

# Check installation
py -m pip show truth-extractor

# Run tests
py -m pytest tests/ -v

# Show help
py -m truth_extractor.cli --help
```

## 🎉 You're Ready!

Start extracting business information from websites:

```powershell
py -m truth_extractor.cli https://your-target-website.com
```

Happy extracting! 🚀




