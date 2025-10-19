@echo off
REM Site Generator - Data Conversion and Confirmation App Startup
REM This script converts site-app data to confirm-app format and starts the confirmation app

echo 🔄 Converting site-app data to confirm-app format...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the project root directory
    pause
    exit /b 1
)

REM Go to confirm-app directory
cd packages\confirm-app

REM Run the data converter
echo 📊 Converting extraction data...
node data-converter.js

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing confirmation app dependencies...
    pnpm install
)

REM Install server dependencies
echo 📦 Installing server dependencies...
pnpm install express cors

REM Start the confirmation app
echo 🌐 Starting confirmation app...
echo 📱 The confirmation app will be available at http://localhost:3001
echo 🔗 Make sure you have run the extraction first!
pnpm dev

pause

