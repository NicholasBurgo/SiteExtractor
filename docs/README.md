# SiteTestGenerator Documentation

Welcome to the SiteTestGenerator documentation! This folder contains all the project documentation organized by topic.

## 📚 Documentation Index

### Setup & Installation
- **[Setup Complete](SETUP_COMPLETE.md)** - Initial setup guide and what's working
- **[Desktop App Ready](DESKTOP_APP_READY.md)** - Desktop application setup and features

### Project Structure & Migration
- **[Monorepo Migration](MONOREPO_MIGRATION.md)** - Complete migration guide from old structure to monorepo
- **[Cleanup Complete](CLEANUP_COMPLETE.md)** - Summary of cleanup and restructuring

## 🚀 Quick Start

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Start Development:**
   ```bash
   pnpm dev
   ```

3. **Visit the Application:**
   - Web App: http://localhost:3000
   - API Server: http://localhost:5174

## 📁 Project Structure

```
SiteTestGenerator/
├─ apps/                          # Applications
│  ├─ server/                     # Fastify API server
│  └─ web/                        # React confirmation UI
├─ packages/                      # Shared packages
│  ├─ types/                      # TypeScript types & Zod schemas
│  └─ utils/                      # Utility functions
├─ docs/                          # Documentation (this folder)
├─ runs/                          # On-disk artifacts
└─ Configuration files
```

## 🔧 Available Commands

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

## 📖 Documentation Files

| File | Description |
|------|-------------|
| [SETUP_COMPLETE.md](SETUP_COMPLETE.md) | Initial setup and what's working |
| [DESKTOP_APP_READY.md](DESKTOP_APP_READY.md) | Desktop app features and setup |
| [MONOREPO_MIGRATION.md](MONOREPO_MIGRATION.md) | Migration from old structure |
| [CLEANUP_COMPLETE.md](CLEANUP_COMPLETE.md) | Cleanup and restructuring summary |

## 🎯 Key Features

- **Clean Monorepo Structure** - Organized apps and packages
- **Modern Tooling** - TypeScript, Vite, Fastify, React
- **Real Data Extraction** - Actual paragraph extraction (no mock data)
- **Proper Organization** - All files follow project structure
- **Desktop & Web Support** - Both Electron and web versions

## 📝 Contributing

When adding new documentation:

1. Create your `.md` file in this `docs/` folder
2. Update this `README.md` index
3. Follow the existing documentation style
4. Include clear headings and examples

---

*Last updated: October 2025*
