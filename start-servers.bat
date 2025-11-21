@echo off
echo Starting LifeLine Application...
echo.

REM Kill any existing Node processes
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo Starting Backend Server on port 5000...
start "Backend Server" cmd /k "cd backend && npm run dev"

REM Wait for backend to start
timeout /t 5 /nobreak

echo Starting Frontend Server on port 3000...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Both servers are starting!
echo ========================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Wait about 30 seconds for frontend to compile...
echo Then open: http://localhost:3000
echo.
echo Press any key to view this message again, or close this window.
pause
