# Site Generator Desktop App

A desktop application built with Electron + Vite + React + TypeScript that provides a user-friendly interface for the Site Generator pipeline.

## Features

- **Simple Interface**: Paste a website URL, choose how many pages to crawl, and click Generate
- **Real-time Progress**: Live log streaming from the extraction pipeline
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Secure**: Uses Electron's context isolation for security
- **One-click Results**: Direct access to generated files and folders

## Usage

### Development Mode
```bash
pnpm app:dev
```

### Production Build
```bash
pnpm app:build
```

### Run Built App
```bash
pnpm app:start
```

## App Interface

### Input Fields
- **Website URL**: The URL to crawl and extract information from
- **Pages to crawl**: Dropdown with options (1, 5, 10, 25, 50, 100)
- **Output folder**: Where to save the generated site (with browse button)
- **Base path**: Base path for links/CSS (default: ".")
- **Deterministic**: Checkbox to use rule-based extraction only (no LLM)

### Progress Display
- Real-time log output from the Python pipeline
- Status badges showing current state (Running, Success, Error)
- Last 200 lines of output for debugging

### Results
- **Open Folder**: Opens the output directory in file explorer
- **Open index.html**: Opens the generated site in default browser
- **Copy Preview URL**: Copies the file:// URL to clipboard

## Technical Details

- **Main Process**: `electron/main.ts` - Handles file dialogs and spawns Python processes
- **Preload**: `electron/preload.ts` - Secure IPC bridge between main and renderer
- **Renderer**: React components in `src/` - UI components and state management
- **Pipeline Integration**: Calls `python -m truth_extractor` with appropriate flags

## Security

- Context isolation enabled
- Node integration disabled
- Only specific IPC methods exposed via preload
- No direct access to Node.js APIs from renderer

## Dependencies

- Electron 30.x for desktop app framework
- React 18.x for UI components
- Vite for build tooling and dev server
- TypeScript for type safety
- Concurrently for running dev processes in parallel


