#!/usr/bin/env bash
set -euo pipefail

echo "Starting Universal Site Extractor v2..."

# Setup virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and get its path
source venv/bin/activate

# Start backend
echo "Starting FastAPI backend..."
pip install -q -r backend/requirements.txt && (cd backend && uvicorn app:app --reload --port 5051) &

# Start frontend
echo "Starting React frontend..."
(cd frontend && npm install && npm run dev) &

echo "Services starting..."
echo "Backend API: http://localhost:5051"
echo "Frontend UI: http://localhost:5173"
echo "API Docs: http://localhost:5051/docs"

wait