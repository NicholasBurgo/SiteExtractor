# Site Test Generator - Extraction System Documentation

## Overview

The Site Test Generator is a comprehensive web scraping and data extraction system that analyzes websites to extract structured business information, assets, content, and navigation data. The system uses Python extractors running in parallel to efficiently gather data from target websites.

## System Architecture

### Core Components

1. **Frontend (React + TypeScript)**
   - Main extraction interface
   - Tab-based data review system
   - Dynamic truth table for data overview
   - Real-time status updates

2. **Backend (Fastify + Node.js)**
   - API endpoints for individual extractions
   - File system management
   - Parallel extraction orchestration

3. **Python Extractors**
   - Individual specialized extraction scripts
   - BeautifulSoup-based HTML parsing
   - Sophisticated data validation and filtering

## File Structure

```
SiteTestGenerator/
├── apps/
│   ├── web/                          # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── DynamicTruthTable.tsx    # Consolidated data overview
│   │   │   │   ├── ExtractionForm.tsx       # Main extraction interface
│   │   │   │   └── MainMenu.tsx             # Extraction orchestration
│   │   │   ├── pages/
│   │   │   │   ├── ConfirmPage.tsx          # Main confirmation interface
│   │   │   │   ├── SummaryTab.tsx           # Summary and status overview
│   │   │   │   ├── AssetsTab.tsx            # Images and file assets
│   │   │   │   ├── ParagraphsTab.tsx        # Text content extraction
│   │   │   │   ├── BusinessTab.tsx          # Business information hub
│   │   │   │   ├── business/                # Business sub-tabs
│   │   │   │   │   ├── IdentitySubTab.tsx   # Business identity & meta
│   │   │   │   │   ├── ServicesSubTab.tsx   # Services offered
│   │   │   │   │   ├── ContactSubTab.tsx    # Contact information
│   │   │   │   │   └── LegalSubTab.tsx      # Legal documents
│   │   │   │   └── NavbarTab.tsx            # Navigation structure
│   │   │   └── hooks/
│   │   │       └── usePageManager.ts        # Navigation data management
│   │   └── dist-electron/                   # Electron build output
│   └── server/                          # Backend API
│       └── src/
│           ├── routes/
│           │   ├── extract/                # Individual extraction endpoints
│           │   │   ├── meta.ts             # Business meta information
│           │   │   ├── services.ts         # Services extraction
│   │   │   │   ├── contact.ts              # Contact information
│   │   │   │   ├── legal.ts                # Legal documents
│   │   │   │   ├── assets.ts               # File assets
│   │   │   │   ├── navbar.ts               # Navigation structure
│   │   │   │   ├── images.ts               # Image assets
│   │   │   │   └── paragraphs.ts           # Text content
│   │   │   ├── runs.ts                     # Run management
│   │   │   └── index.ts                    # Route registration
│   │   └── index.ts                        # Server entry point
├── extractors/                          # Python extraction scripts
│   ├── meta_extractor.py                 # Business identity & meta data
│   ├── services_extractor.py             # Services offered
│   ├── contact_extractor.py              # Contact information
│   ├── legal_extractor.py                # Legal documents & policies
│   ├── assets_extractor.py               # File assets & downloads
│   ├── navbar_extractor.py               # Navigation structure
│   ├── image_extractor.py                # Image assets
│   ├── paragraphs_extractor.py           # Text content extraction
│   ├── truth_extractor.py                # Comprehensive truth extraction
│   └── README.md                         # Extractor documentation
├── packages/
│   └── types/                            # TypeScript type definitions
│       ├── meta.ts                       # Business meta types
│       ├── services.ts                   # Services types
│       ├── contact.ts                    # Contact types
│       ├── legal.ts                      # Legal types
│       ├── assets.ts                     # Assets types
│       ├── navbar.ts                     # Navigation types
│       ├── images.ts                     # Image types
│       ├── paragraphs.ts                 # Paragraph types
│       └── text.ts                       # Text extraction types
└── runs/                                # Extraction output directory
    └── {runId}/                          # Individual extraction runs
        ├── meta.json                     # Business meta data
        ├── services.json                 # Services data
        ├── contact.json                  # Contact information
        ├── legal.json                    # Legal documents
        ├── assets.json                   # Assets data
        ├── navbar/                       # Navigation data
        │   └── navbar.json               # Navigation structure
        ├── images/                       # Image data
        │   └── manifest.json             # Image manifest
        ├── text/                         # Text content
        │   └── text.json                 # Paragraphs data
        └── truth.json                    # Comprehensive truth data
```

## Data Extraction Types

### 1. Business Meta Information (`meta_extractor.py`)
**Purpose**: Extract core business identity and metadata

**Extracted Data**:
- **Business Name**: Sophisticated extraction using multiple methods
  - Fan title tags (highest priority)
  - Meta property og:title
  - Meta property og:site_name
  - H1 tags (filtered for brand content)
  - Logo alt text
  - Structured data (JSON-LD)
  - Domain-based fallback
- **Business Type**: Categorized as services, restaurant, law, retail, or other
- **Slogan**: Company taglines and mottos
- **Background**: Company history and background information
- **Service Area**: Geographic coverage areas
- **Brand Colors**: Extracted color palette from CSS and images

**Validation Logic**:
- Rejects phone numbers, emails, URLs
- Filters out common non-brand phrases
- Requires minimum length and letter content
- Confidence scoring for multiple candidates

### 2. Services Information (`services_extractor.py`)
**Purpose**: Extract services offered by the business

**Extracted Data**:
- Service names and descriptions
- Service categories
- Pricing information (if available)
- Service areas and coverage
- Specializations and expertise

**Extraction Methods**:
- Service-specific page sections
- Navigation menu analysis
- Content analysis for service keywords
- Structured data extraction

### 3. Contact Information (`contact_extractor.py`)
**Purpose**: Extract all contact-related information

**Extracted Data**:
- **Phone Numbers**: Multiple formats and locations
- **Email Addresses**: Contact and support emails
- **Physical Addresses**: Full address information
- **Social Media Links**: Facebook, Twitter, LinkedIn, etc.
- **Contact Forms**: Form locations and types
- **Business Hours**: Operating hours and schedules
- **Emergency Contacts**: After-hours and emergency numbers

**Validation**:
- Phone number format validation
- Email format verification
- Address completeness checking

### 4. Legal Information (`legal_extractor.py`)
**Purpose**: Extract legal documents and compliance information

**Extracted Data**:
- **Privacy Policy**: Links and content
- **Terms of Service**: Links and content
- **Cookie Policy**: Cookie usage information
- **Disclaimer**: Legal disclaimers
- **Accessibility Statement**: ADA compliance information
- **Copyright Information**: Copyright notices

### 5. Assets and Files (`assets_extractor.py`)
**Purpose**: Extract downloadable files and media assets

**Extracted Data**:
- **Favicons**: Website icons in various sizes
- **Downloadable Files**: PDFs, documents, brochures
- **Media Files**: Videos, audio files
- **File Metadata**: Sizes, types, last modified dates

### 6. Navigation Structure (`navbar_extractor.py`)
**Purpose**: Extract website navigation and page structure

**Extracted Data**:
- **Page Hierarchy**: Tree structure of pages
- **Navigation Menus**: Primary and secondary menus
- **Page URLs**: All accessible page links
- **Page Labels**: Menu item names
- **Navigation Order**: Menu item ordering
- **Quality Scores**: Navigation completeness scoring

### 7. Image Assets (`image_extractor.py`)
**Purpose**: Extract and categorize all images

**Extracted Data**:
- **Image URLs**: All image sources
- **Image Metadata**: Alt text, titles, dimensions
- **Image Categories**: Logo, content, banner, etc.
- **Page Associations**: Which page each image appears on
- **Image Quality**: Resolution and format analysis

**Categorization Logic**:
- **Logo Detection**: Based on alt text, filename, and position
- **Content Images**: Photos, banners, illustrations
- **Page Grouping**: Images grouped by page location

### 8. Text Content (`paragraphs_extractor.py`)
**Purpose**: Extract meaningful text content

**Extracted Data**:
- **Paragraphs**: Meaningful text blocks
- **Word Counts**: Content length analysis
- **Page Associations**: Source page for each paragraph
- **Content Quality**: Relevance and completeness scoring

## Data Flow

### 1. Extraction Initiation
```
User Input (URL) → MainMenu.tsx → Parallel API Calls
```

### 2. Parallel Processing
```
/api/extract/meta      → meta_extractor.py
/api/extract/services  → services_extractor.py
/api/extract/contact   → contact_extractor.py
/api/extract/legal     → legal_extractor.py
/api/extract/assets    → assets_extractor.py
/api/extract/navbar    → navbar_extractor.py
/api/extract/images    → image_extractor.py
/api/extract/paragraphs → paragraphs_extractor.py
```

### 3. Data Storage
- **Server-side**: JSON files in `runs/{runId}/` directory
- **Client-side**: localStorage for immediate access
- **Preloading**: Data cached for instant tab switching

### 4. Data Display
- **Individual Tabs**: Specialized views for each data type
- **Dynamic Truth Table**: Consolidated overview
- **Summary Tab**: Status and confirmation interface

## Key Features

### 1. Parallel Extraction
- All extractors run simultaneously for maximum efficiency
- Independent failure handling
- Real-time progress updates

### 2. Data Preloading
- All data loaded during initial extraction
- Instant tab switching without API calls
- localStorage caching for performance

### 3. Sophisticated Validation
- Multi-method extraction with confidence scoring
- Fallback mechanisms for missing data
- Quality scoring for extracted content

### 4. Real-time Updates
- Dynamic truth table updates every 2 seconds
- Live status monitoring
- Progress tracking for long-running extractions

### 5. Error Handling
- Graceful degradation for missing data
- Comprehensive null checks
- Fallback data generation

## API Endpoints

### Extraction Endpoints
- `POST /api/extract/meta` - Business meta information
- `POST /api/extract/services` - Services offered
- `POST /api/extract/contact` - Contact information
- `POST /api/extract/legal` - Legal documents
- `POST /api/extract/assets` - File assets
- `POST /api/extract/navbar` - Navigation structure
- `POST /api/extract/images` - Image assets
- `POST /api/extract/paragraphs` - Text content

### Management Endpoints
- `GET /api/runs/list` - List all extraction runs
- `DELETE /api/runs/:runId` - Delete specific run

## Configuration

### Environment Variables
- `PORT`: Server port (default: 5174)
- `NODE_ENV`: Environment mode
- `PYTHON_PATH`: Python executable path

### Path Resolution
- Flexible path resolution for different deployment scenarios
- Automatic detection of extractors directory
- Fallback mechanisms for missing files

## Development Guidelines

### Adding New Extractors
1. Create Python script in `extractors/` directory
2. Add corresponding API route in `apps/server/src/routes/extract/`
3. Define TypeScript types in `packages/types/`
4. Create frontend component for data display
5. Update MainMenu.tsx to include new extraction

### Data Structure Standards
- All extractors return JSON with consistent structure
- Include confidence scores and provenance information
- Provide fallback data for missing information
- Use consistent naming conventions

### Error Handling
- Always include try-catch blocks
- Provide meaningful error messages
- Implement graceful degradation
- Log errors for debugging

## Performance Considerations

### Optimization Strategies
- Parallel extraction for maximum throughput
- Data preloading for instant access
- Efficient data structures and algorithms
- Minimal DOM manipulation in frontend

### Scalability
- Stateless API design
- File-based data storage
- Independent extractor processes
- Horizontal scaling support

## Troubleshooting

### Common Issues
1. **Path Resolution Errors**: Check extractors directory location
2. **Data Structure Mismatches**: Verify localStorage key consistency
3. **Null Reference Errors**: Ensure comprehensive null checks
4. **Extraction Failures**: Check Python dependencies and permissions

### Debug Tools
- Console logging in all components
- Server-side request logging
- Python extractor stdout/stderr capture
- Network request monitoring

## Future Enhancements

### Planned Features
- Machine learning-based content classification
- Advanced image analysis and OCR
- Multi-language support
- Batch processing capabilities
- Data export in multiple formats
- API rate limiting and throttling
- Caching and performance optimization

### Technical Improvements
- TypeScript strict mode compliance
- Comprehensive test coverage
- Performance monitoring and metrics
- Automated deployment pipeline
- Documentation generation

## Contributing

### Code Standards
- TypeScript for frontend code
- Python 3.8+ for extractors
- Consistent error handling
- Comprehensive documentation
- Unit tests for critical functions

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request with description
5. Address review feedback

---

*Last Updated: 2025-01-20*
*Version: 1.0.0*
