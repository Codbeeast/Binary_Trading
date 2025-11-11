@echo off
echo ========================================
echo   Binary Trading Chart System
echo ========================================
echo.
echo Starting Socket.IO Server and Next.js...
echo.

REM Start Socket.IO server in a new window
start "Socket.IO Server" cmd /k "node server.js"

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

REM Start Next.js dev server
start "Next.js Dev Server" cmd /k "npm run dev"

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo.
echo Socket.IO Server: http://localhost:3001
echo Next.js App: http://localhost:3000
echo Admin Panel: http://localhost:3000/admin
echo.
echo Press any key to open the app in browser...
pause >nul

start http://localhost:3000

echo.
echo To stop servers, close the terminal windows.
echo.
