@echo off
echo Starting JobTracker...
echo.

start "JobTracker Backend" cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak >nul
start "JobTracker Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Close this window and the two terminal windows to stop.
pause
