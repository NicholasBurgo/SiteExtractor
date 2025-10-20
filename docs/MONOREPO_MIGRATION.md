# Monorepo Migration Complete

This document outlines the migration from the previous structure to the new monorepo layout.

## New Structure

```
├─ package.json                    # Root workspace configuration
├─ pnpm-workspace.yaml            # Updated to include apps/* and packages/*
├─ tsconfig.base.json             # Shared TypeScript configuration
├─ apps/
│  ├─ server/                      # Fastify API server
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ index.ts               # Server entry point
│  │  │  ├─ config/env.ts          # Environment configuration
│  │  │  ├─ routes/                # API routes
│  │  │  │  ├─ extract/            # Extraction endpoints
│  │  │  │  │  ├─ truth-table.ts   # POST /api/extract/truth-table
│  │  │  │  │  ├─ images.ts        # POST /api/extract/images
│  │  │  │  │  ├─ navbar.ts        # POST /api/extract/navbar
│  │  │  │  │  ├─ paragraphs.ts    # POST /api/extract/paragraphs
│  │  │  │  │  └─ misc.ts          # POST /api/extract/misc
│  │  │  │  └─ index.ts            # Route registration
│  │  │  └─ lib/                   # Shared server utilities
│  │  └─ static/                   # Static file serving
│  │
│  └─ web/                         # React confirmation UI
│     ├─ package.json
│     ├─ vite.config.ts            # Vite configuration with proxy
│     ├─ src/
│     │  ├─ main.tsx               # React entry point
│     │  ├─ App.tsx                # Main app component
│     │  ├─ pages/
│     │  │  ├─ ConfirmPage.tsx     # Main confirmation page
│     │  │  ├─ ImagesTab.tsx       # Images confirmation tab
│     │  │  ├─ ParagraphsTab.tsx   # Text blocks tab
│     │  │  ├─ NavbarTab.tsx       # Navigation tab
│     │  │  └─ MiscTab.tsx         # Miscellaneous tab
│     │  ├─ api/
│     │  │  ├─ client.ts           # API client
│     │  │  └─ endpoints.ts        # Typed endpoints
│     │  ├─ hooks/                 # React hooks
│     │  └─ types/                 # Re-exported shared types
│     └─ styles.css                # Tailwind CSS
│
├─ packages/
│  ├─ types/                       # Shared TypeScript types and Zod schemas
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ index.ts               # Re-exports
│  │  │  ├─ truth.ts               # Truth record schemas
│  │  │  ├─ manifest.ts            # Image manifest schemas
│  │  │  ├─ text.ts                # Text block schemas
│  │  │  ├─ navbar.ts              # Navigation schemas
│  │  │  └─ packed.ts              # Packed data schemas
│  │  └─ tsconfig.json
│  │
│  └─ utils/                       # Shared utility functions
│     ├─ package.json
│     ├─ src/
│     │  ├─ index.ts               # Re-exports
│     │  ├─ hashing.ts             # Hash functions
│     │  ├─ html.ts                # HTML utilities
│     │  ├─ strings.ts             # String utilities
│     │  ├─ files.ts               # File system utilities
│     │  └─ detect.ts              # Detection utilities
│     └─ tsconfig.json
│
└─ runs/                           # On-disk artifacts (per run)
   └─ <site-id>-<timestamp>/
      ├─ truth.json                # From truth-table extractor
      ├─ images/
      │  ├─ manifest.json          # Image manifest
      │  ├─ assets/                # Downloaded images
      │  └─ thumbs/                # Thumbnail images
      ├─ text/
      │  └─ text.json              # Text blocks
      ├─ navbar/
      │  └─ navbar.json            # Navigation structure
      ├─ misc/
      │  ├─ colors.json            # Detected colors
      │  ├─ og.json                # Open Graph data
      │  └─ schema.json            # Schema.org data
      ├─ packed/                   # Normalized data
      ├─ generated/                # Component JSON
      ├─ render/                   # Final rendered assets
      └─ logs/                     # Extraction logs
```

## Migration Status

✅ **Completed:**
- Created new monorepo structure with `apps/` and `packages/`
- Updated workspace configuration (`pnpm-workspace.yaml`, root `package.json`)
- Created shared packages (`@sg/types`, `@sg/utils`)
- Created Fastify server app with extraction routes
- Created React web app with confirmation UI
- Created runs directory structure
- Migrated existing data to new structure

🔄 **In Progress:**
- Truth extractor integration (Python → TypeScript)

⏳ **Pending:**
- Full extraction module implementation
- Confirmation API endpoints
- Packer/Generator/Seeder modules
- Complete UI components

## Next Steps

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start development:**
   ```bash
   pnpm dev
   ```
   This will start both the server (port 5174) and web app (port 3000) concurrently.

3. **Integrate existing Python truth extractor:**
   - Move Python code to `apps/server/src/modules/extraction/truth-table/`
   - Create Node.js wrapper or API integration

4. **Implement remaining extraction modules:**
   - Images extraction
   - Navbar extraction
   - Paragraphs extraction
   - Misc extraction

5. **Complete confirmation UI:**
   - Image grid with previews
   - Text block editing
   - Navigation tree editing
   - Bulk actions

## API Endpoints

### Extraction
- `POST /api/extract/truth-table` - Extract truth table data
- `POST /api/extract/images` - Extract images
- `POST /api/extract/navbar` - Extract navigation
- `POST /api/extract/paragraphs` - Extract text blocks
- `POST /api/extract/misc` - Extract miscellaneous data

### Confirmation (TODO)
- `GET /api/manifest/:runId` - Get image manifest
- `PUT /api/manifest/:runId/image/:imageId` - Update image
- `PUT /api/manifest/:runId/bulk` - Bulk update images
- `GET /api/text/:runId` - Get text blocks
- `PUT /api/text/:runId/block/:id` - Update text block
- `PUT /api/text/:runId/bulk` - Bulk update text
- `GET /api/navbar/:runId` - Get navigation
- `PUT /api/navbar/:runId` - Update navigation

### Processing (TODO)
- `POST /api/pack/:runId` - Pack confirmed data
- `POST /api/seed/:runId` - Seed from packed data
- `POST /api/generate/:runId` - Generate components
- `POST /api/render/:runId` - Render final output

## Environment Variables

- `PORT` - Server port (default: 5174)
- `DATA_DIR` - Runs directory (default: ./runs)
- `PUPPETEER_HEADLESS` - Puppeteer headless mode (default: true)
- `EXTRACT_MAX_DEPTH` - Max crawl depth (default: 2)
- `NODE_ENV` - Environment (development/production)
