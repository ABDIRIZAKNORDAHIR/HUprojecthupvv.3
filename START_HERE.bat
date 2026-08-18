@echo off
REM ============================================================
REM  Hormuud ProjectHub — START HERE (Local)
REM  Starts MySQL API + Vite UI and opens the app automatically.
REM  Keep the "ProjectHub API" and "ProjectHub UI" windows open.
REM ============================================================
setlocal EnableExtensions
cd /d "%~dp0"
call scripts\env-path.bat

title Hormuud ProjectHub
color 0A
cls

echo.
echo  ============================================================
echo   Hormuud ProjectHub — Starting (Local)
echo  ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

node scripts\start-and-open.mjs

echo.
echo  ============================================================
echo   ProjectHub is running locally
echo  ============================================================
echo   App:  http://localhost:5180/
echo   API:  http://localhost:3004/api/health
echo.
echo   Keep the API and UI windows open while you use the app.
echo  ============================================================
echo.
pause
