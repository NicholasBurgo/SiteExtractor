@echo off
echo Building Universal Site Extractor v2...

echo Building FastAPI backend...
cd backend
py -m pip install -r requirements.txt
cd ..

echo Building React frontend...
cd frontend
npm install
npm run build
cd ..

echo Build complete!
echo To start production:
echo   Backend: cd backend && uvicorn app:app --port 5051
echo   Frontend: cd frontend && npm run preview

pause