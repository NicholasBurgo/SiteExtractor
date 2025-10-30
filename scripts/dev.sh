#!/usr/bin/env bash
set -euo pipefail

echo "Starting Universal Site Extractor v2..."

# Start backend
echo "Starting FastAPI backend..."
(cd backend && pip install -r requirements.txt && uvicorn backend.app:app --reload --port 5051) &

# Start frontend
echo "Starting React frontend..."
(cd frontend && npm install && npm run dev) &

echo "Services starting..."
echo "Backend API: http://localhost:5051"
echo "Frontend UI: http://localhost:5173"
echo "API Docs: http://localhost:5051/docs"

wait