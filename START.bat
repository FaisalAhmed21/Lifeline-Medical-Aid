@echo off
echo ================================================
echo   LIFELINE - NOTIFICATION SYSTEM (FIXED!)
echo ================================================
echo.
echo Starting servers...
echo.

REM Kill any existing Node processes
taskkill /F /IM node.exe >nul 2>&1

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo [1/2] Starting BACKEND on port 5000...
start "LIFELINE BACKEND" cmd /k "cd backend && node server.js"

timeout /t 5 /nobreak >nul

echo [2/2] Starting FRONTEND on port 3000...
start "LIFELINE FRONTEND" cmd /k "cd frontend && npm start"

echo.
echo ================================================
echo   SERVERS STARTING!
echo ================================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Check the opened terminal windows for status.
echo Backend should show: "Firebase Admin initialized successfully"
echo Frontend should show: "Compiled successfully!" (takes 30-60 seconds)
echo.
echo Press any key to close this window...
pause >nul
