@echo off
echo Starting Universal Site Extractor v2...

echo Starting FastAPI backend...
start "Backend" cmd /k "cd backend && py -m pip install -r requirements.txt && py -m uvicorn app:app --reload --port 5051"

echo Starting React frontend...
start "Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo Services starting...
echo Backend API: http://localhost:5051
echo Frontend UI: http://localhost:5173
echo API Docs: http://localhost:5051/docs

pause