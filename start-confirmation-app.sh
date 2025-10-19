#!/bin/bash

# Site Generator - Data Conversion and Confirmation App Startup
# This script converts site-app data to confirm-app format and starts the confirmation app

echo "🔄 Converting site-app data to confirm-app format..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Go to confirm-app directory
cd packages/confirm-app

# Run the data converter
echo "📊 Converting extraction data..."
node data-converter.js

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing confirmation app dependencies..."
    pnpm install
fi

# Install server dependencies
echo "📦 Installing server dependencies..."
pnpm install express cors

# Start the confirmation app
echo "🌐 Starting confirmation app..."
echo "📱 The confirmation app will be available at http://localhost:3001"
echo "🔗 Make sure you have run the extraction first!"
pnpm dev

