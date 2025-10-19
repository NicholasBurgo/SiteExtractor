# 🔧 Scripts & Automation

This folder contains batch files and automation scripts for the Site Generator project.

## 📋 Available Scripts

### Application Scripts
- **[run-app.bat](run-app.bat)** - Run the Site Generator app
- **[run-site-app.bat](run-site-app.bat)** - Start the desktop application
- **[test-confirmation-ui.bat](test-confirmation-ui.bat)** - Test the confirmation interface

### Build & Fix Scripts
- **[fix-build.bat](fix-build.bat)** - Fix common build issues and dependencies

## 🚀 Usage

### Windows Users
```cmd
# Run the main application
scripts\run-app.bat

# Test the confirmation UI
scripts\test-confirmation-ui.bat

# Fix build issues
scripts\fix-build.bat
```

### Cross-Platform (pnpm)
```bash
# Development
pnpm dev

# Build
pnpm build

# Start
pnpm start

# Fix dependencies
pnpm app:fix
```

## 🔧 What Each Script Does

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `run-app.bat` | Launches the main app | Daily usage |
| `run-site-app.bat` | Starts desktop app | Quick app launch |
| `test-confirmation-ui.bat` | Tests confirmation interface | Development/testing |
| `fix-build.bat` | Fixes build issues | When build fails |

## 🎯 Quick Start

1. **First time**: Run `fix-build.bat` to ensure dependencies are installed
2. **Daily use**: Run `run-app.bat` to start the application
3. **Testing**: Use `test-confirmation-ui.bat` to verify functionality

## 📝 Notes

- All scripts use **pnpm** (not npm)
- Scripts automatically navigate to the correct directories
- Build scripts include error checking and user feedback
- Test scripts verify that all components are working properly
