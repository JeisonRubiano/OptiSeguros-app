@echo off
echo ==========================================
echo    OptiSeguros - FAST LAUNCH
echo ==========================================

cd /d "%~dp0"

echo.
echo [1/2] Starting Backend...
start "OptiSeguros BACKEND" cmd /k "server\venv\Scripts\python -m uvicorn main:app --app-dir server --reload --host 0.0.0.0 --port 8000"

echo [2/2] Starting Frontend...
start "OptiSeguros FRONTEND" cmd /k "cd client && npm run dev"

echo.
echo ==========================================
echo    System Online.
echo    Backend: http://localhost:8000
echo    Frontend: http://localhost:5173
echo.
echo    Network Access:
echo    Backend: http://192.168.1.14:8000
echo    Frontend: http://192.168.1.14:5173
echo ==========================================
echo.
echo TIP: Si algo falla, usa fix_and_start.bat
echo.
pause
