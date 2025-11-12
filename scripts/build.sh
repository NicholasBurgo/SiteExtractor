#!/usr/bin/env bash
set -euo pipefail

echo "Building Universal Site Extractor v2..."

# Setup virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Build backend
echo "Building FastAPI backend..."
(cd backend && pip install -q -r requirements.txt)

# Build frontend
echo "Building React frontend..."
(cd frontend && npm install && npm run build)

echo "Build complete!"
echo "To start production:"
echo "  Backend: source venv/bin/activate && cd backend && uvicorn backend.app:app --port 5051"
echo "  Frontend: cd frontend && npm run preview"