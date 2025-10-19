# 🧪 Tests & Examples

This folder contains test files, examples, and sample data for the Site Generator project.

## 📋 Test Files

### Python Tests
- **[test_colors.py](test_colors.py)** - Color extraction and validation tests
- **[test_extraction.py](test_extraction.py)** - HTML parsing and extraction tests
- **[test_fetcher.py](test_fetcher.py)** - URL normalization and domain extraction tests
- **[test_scoring.py](test_scoring.py)** - Confidence scoring and candidate ranking tests
- **[test_validators.py](test_validators.py)** - Email, phone, address, color validation tests

### Custom Tests
- **[test_header_extraction.py](test_header_extraction.py)** - Header extraction testing
- **[test_northshore.py](test_northshore.py)** - Northshore-specific testing

### HTML Examples
- **[simple-test.html](simple-test.html)** - Simple HTML test page
- **[test-page.html](test-page.html)** - Test page for extraction

## 🚀 Running Tests

### All Tests
```bash
# Run all Python tests
python -m pytest tests/

# Run specific test file
python tests/test_colors.py
```

### Individual Test Categories
```bash
# Color validation tests
python tests/test_colors.py

# Extraction tests
python tests/test_extraction.py

# Validation tests
python tests/test_validators.py
```

## 📊 Test Coverage

The test suite covers:
- ✅ **Color extraction** - HEX validation, WCAG contrast
- ✅ **Email validation** - MX lookup, format validation
- ✅ **Phone validation** - E.164 format, number parsing
- ✅ **Address parsing** - Component extraction, formatting
- ✅ **HTML parsing** - BeautifulSoup integration, DOM traversal
- ✅ **URL normalization** - Domain extraction, path handling
- ✅ **Confidence scoring** - Candidate ranking, deduplication

## 🎯 Test Examples

### Color Testing
```python
# Test color validation
python tests/test_colors.py

# Expected output: All color validation tests pass
```

### Extraction Testing
```python
# Test HTML extraction
python tests/test_extraction.py

# Expected output: HTML parsing and extraction tests pass
```

## 📝 Adding New Tests

1. **Create test file**: `tests/test_new_feature.py`
2. **Follow naming**: Use `test_` prefix for functions
3. **Add to suite**: Tests will be automatically discovered
4. **Run tests**: Use `python -m pytest tests/`

## 🔧 Test Configuration

Tests use the standard Python testing framework:
- **Framework**: pytest (if available) or unittest
- **Coverage**: All major extraction functions
- **Validation**: Input/output validation
- **Edge cases**: Error handling and boundary conditions
