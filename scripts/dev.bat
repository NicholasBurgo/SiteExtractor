@echo off
echo Starting Universal Site Extractor v2...

REM Setup virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    py -m venv venv
)

REM Activate virtual environment and start backend
echo Starting FastAPI backend...
start "Backend" cmd /k "call venv\Scripts\activate && cd backend && pip install -q -r requirements.txt && cd .. && uvicorn backend.app:app --reload --port 5051"

echo Starting React frontend...
start "Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo Services starting...
echo Backend API: http://localhost:5051
echo Frontend UI: http://localhost:5173
echo API Docs: http://localhost:5051/docs

pause