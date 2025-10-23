#!/usr/bin/env bash
set -euo pipefail

echo "Building Universal Site Extractor v2..."

# Build backend
echo "Building FastAPI backend..."
(cd backend && pip install -r requirements.txt)

# Build frontend
echo "Building React frontend..."
(cd frontend && npm install && npm run build)

echo "Build complete!"
echo "To start production:"
echo "  Backend: cd backend && uvicorn backend.app:app --port 5051"
echo "  Frontend: cd frontend && npm run preview"