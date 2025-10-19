@echo off
REM Site Generator - Complete Workflow Script
REM This script runs the extraction and then starts the confirmation app

echo 🚀 Starting Site Generator Workflow...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the project root directory
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    pnpm install
)

REM Build the extractor
echo 🔨 Building extractor...
cd packages\extractor
pnpm build

REM Run test extraction to generate sample data
echo 🧪 Running test extraction...
pnpm test

REM Go back to project root
cd ..\..

REM Start the confirmation app
echo 🖥️  Starting confirmation app...
cd packages\confirm-app

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing confirmation app dependencies...
    pnpm install
)

REM Install server dependencies
echo 📦 Installing server dependencies...
pnpm install express cors

REM Start the confirmation app
echo 🌐 Confirmation app will be available at http://localhost:3001
pnpm dev

pause

