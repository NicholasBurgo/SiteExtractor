#!/bin/bash

# Site Generator - Complete Workflow Script
# This script runs the extraction and then starts the confirmation app

echo "🚀 Starting Site Generator Workflow..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Build the extractor
echo "🔨 Building extractor..."
cd packages/extractor
pnpm build

# Run test extraction to generate sample data
echo "🧪 Running test extraction..."
pnpm test

# Go back to project root
cd ../..

# Start the confirmation app
echo "🖥️  Starting confirmation app..."
cd packages/confirm-app

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing confirmation app dependencies..."
    pnpm install
fi

# Install server dependencies
echo "📦 Installing server dependencies..."
pnpm install express cors

# Start the confirmation app
echo "🌐 Confirmation app will be available at http://localhost:3001"
pnpm dev

