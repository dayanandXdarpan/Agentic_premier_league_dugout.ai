@echo off
echo ==================================================
echo Starting Dugout.ai Hackathon Demo
echo ==================================================

echo [1/2] Starting FastAPI Backend on Port 8000...
start cmd /k "cd backend && call venv\Scripts\activate 2>nul || echo Virtual env not found, relying on global Python && uvicorn main:app --host 0.0.0.0 --port 8000"

echo [2/2] Starting Vite React Frontend on Port 5173...
start cmd /k "cd frontend && npm run dev"

echo ==================================================
echo Dugout.ai is booting up!
echo The UI will be available at http://localhost:5173
echo ==================================================
