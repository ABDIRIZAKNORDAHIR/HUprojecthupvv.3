@echo off
REM ============================================================
REM  OPEN PROJECTHUB AS A REAL DESKTOP APP (on this PC)
REM  Same app — own window, no browser tabs. Uses local SQL Server.
REM ============================================================
setlocal EnableExtensions
call "%~dp0scripts\env-path.bat"
cd /d "%~dp0"

title Hormuud ProjectHub App
color 0A

echo.
echo  Building and opening ProjectHub as a REAL desktop application...
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo Building application...
  call npm run build
)

node scripts\build-desktop-icon.mjs 2>nul

if not exist "node_modules\electron\package.json" (
  echo Installing desktop app engine (one time)...
  call npm install electron@^33 --save-dev
)

echo Starting ProjectHub desktop app...
echo  - Local server + full app in its own window
echo  - Close the window to exit
echo.

call npm run desktop
pause
