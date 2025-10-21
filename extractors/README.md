# Extractors

This directory contains all Python extraction scripts for the Site Test Generator.

## Files

- `assets_extractor.py` - Extracts images, videos, documents, and other assets from websites
- `contact_extractor.py` - Extracts contact information (phone, email, address, hours, social media)
- `image_extractor.py` - Specialized image extraction functionality
- `legal_extractor.py` - Extracts legal documents and policies (privacy policy, terms of service, etc.)
- `meta_extractor.py` - Extracts business meta information (name, type, slogan, colors, background)
- `services_extractor.py` - Extracts business services and offerings
- `truth_extractor.py` - Main truth table extraction script

## Usage

These scripts are called by the server API routes and Electron main process. They should not be run directly from the command line unless for testing purposes.

## Extraction Flow

The extraction process now runs all individual extractors in parallel for better performance:
1. **Truth Table Extraction** - Main extraction that creates the run directory
2. **Parallel Business Extraction** - All business extractors run simultaneously:
   - Meta extraction (business identity)
   - Services extraction
   - Contact extraction
   - Legal extraction
   - Assets extraction

## Dependencies

All scripts require Python 3.x with the following packages:
- requests
- beautifulsoup4
- phonenumbers
- email-validator
- validators
