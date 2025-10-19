# Site Generator - Confirmation App

A React + TypeScript application for visually confirming, editing, and packing extracted data for the universal site generator. Built with Vite, Tailwind CSS, and designed to look and behave consistently with the existing Truth Table UI.

## Features

- **Visual Confirmation Interface**: Review and confirm extracted data with intuitive UI
- **Image Management**: Drag-and-drop, file picker, and URL import for user-provided images
- **Hero Image Tray**: Enforce exactly 3 selected hero images
- **Bulk Actions**: Confirm, deny, retry, and edit multiple items at once
- **Dark Mode UI**: Professional dark theme with specified color palette
- **Export Functionality**: Export confirmed data as JSON, CSV, or ZIP bundles
- **Real-time Updates**: Hot reload from extractor output folder

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Preview

```bash
pnpm preview
```

## Usage

### Prerequisites

Before using the confirmation app, you need to run the extraction process:

```bash
pnpm extractor run --url https://example.com --max-pages 10
```

### Confirmation Workflow

1. **Dashboard**: Overview of extraction statistics and progress
2. **Images**: Review, edit, and manage extracted images
3. **Truth Table**: Edit and confirm truth table data
4. **Paragraphs**: Review and edit text content
5. **Navigation**: Edit navigation structure
6. **Miscellaneous**: Review metadata and diagnostics
7. **Export**: Export confirmed data bundle

## UI Design

### Color Palette

- **Background**: `#0e0e10` - Deep dark background
- **Surface**: `#181a20` - Card and panel backgrounds
- **Border**: `#22252d` - Border colors
- **Text**: `#e8e8ea` - Primary text color
- **Accent**: `#7db2ff` - Primary actions and links
- **Confirm**: `#7db2ff` - Confirmation actions
- **Retry**: `#f8d34c` - Retry actions
- **Deny**: `#ff4d4d` - Denial actions
- **Edit**: `#3a3f4b` - Edit actions

### Components

- **Layout**: Responsive sidebar navigation with mobile support
- **Dashboard**: Statistics overview and quick actions
- **ImageManager**: Advanced image management with drag-and-drop
- **TruthTableEditor**: Edit truth table data with confidence scoring
- **ParagraphEditor**: Review and edit text content
- **NavbarEditor**: Edit navigation structure
- **MiscEditor**: Review metadata and diagnostics
- **ExportManager**: Export confirmed data bundles

## Image Management

### Features

- **Drag & Drop**: Drop image files directly onto the interface
- **File Picker**: Select images from your computer
- **URL Import**: Import images from URLs
- **Placement Detection**: Automatic zone detection with manual override
- **Bulk Actions**: Select multiple images for batch operations
- **Hero Image Tray**: Enforce exactly 3 hero images
- **Duplicate Prevention**: File hash checking to prevent duplicates
- **Format Support**: JPG, PNG, GIF, WebP, SVG

### Image Zones

- `hero`: Hero banners and main images
- `logo`: Company logos and brand marks
- `navbar`: Navigation icons and elements
- `gallery`: Portfolio and showcase images
- `service`: Service-related images
- `product`: Product catalog images
- `menu_item`: Food menu items
- `testimonial`: Customer testimonials
- `team`: Staff and team photos
- `cta`: Call-to-action images
- `map`: Location and map images
- `inline`: General content images

## Export Options

### Formats

- **JSON**: Structured data bundle
- **CSV**: Tabular data export
- **ZIP**: Compressed archive with assets

### Export Contents

- Confirmed images with metadata
- Confirmed paragraphs and text content
- Confirmed navigation structure
- Confirmed truth table data
- Miscellaneous metadata and diagnostics
- User-uploaded images and assets

## Integration

The confirmation app integrates seamlessly with the Site Generator pipeline:

1. **Extract**: Run extraction to get structured data
2. **Confirm**: Use this app to review and confirm data
3. **Pack**: Export confirmed data bundle
4. **Generate**: Use bundle for site generation
5. **Render**: Output final website

## Development

### Project Structure

```
packages/confirm-app/
├── src/
│   ├── components/          # React components
│   │   ├── Layout.tsx      # Main layout with navigation
│   │   ├── Dashboard.tsx   # Dashboard overview
│   │   ├── ImageManager.tsx # Image management
│   │   ├── TruthTableEditor.tsx # Truth table editing
│   │   ├── ParagraphEditor.tsx # Paragraph editing
│   │   ├── NavbarEditor.tsx # Navigation editing
│   │   ├── MiscEditor.tsx  # Miscellaneous data
│   │   └── ExportManager.tsx # Export functionality
│   ├── hooks/
│   │   └── useDataStore.ts # Zustand data store
│   ├── types.ts           # TypeScript type definitions
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # App entry point
│   └── styles.css        # Tailwind CSS styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### Key Technologies

- **React 18**: Modern React with hooks
- **TypeScript**: Strong typing and IntelliSense
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Router**: Client-side routing
- **React Dropzone**: Drag-and-drop functionality
- **Lucide React**: Icon library
- **React Hot Toast**: Toast notifications

## API Integration

The app expects extraction data to be available at `/api/extraction-data` or in the local file system at `build/extract/pages/*.page.json`.

### Data Format

The app works with `PackBundle` objects containing:

```typescript
interface PackBundle {
  slug: string;
  truthTable: TruthTableData;
  images: ImageData[];
  paragraphs: ParagraphData[];
  navbar: NavbarItem[];
  misc: MiscData;
  metadata: {
    extractedAt: string;
    sourceUrl: string;
    pageCount: number;
    version: string;
  };
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

