@echo off
echo ========================================================
echo Starting SmartServe AI (Backend + Frontend)
echo ========================================================

start "SmartServe Backend" cmd /k "python -m uvicorn backend.app.main:app --reload --port 8000"
start "SmartServe Frontend" cmd /k "npm run dev"

echo.
echo Backend running at:  http://localhost:8000 (Docs: http://localhost:8000/docs)
echo Frontend running at: http://localhost:5173
echo.
echo Press any key to exit this launcher window...
pause >nul
