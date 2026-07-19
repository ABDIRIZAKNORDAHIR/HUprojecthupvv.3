@echo off
REM ============================================================
REM  FULL AUTO SETUP — builds app, starts server, opens tunnel
REM ============================================================
setlocal EnableExtensions
call "%~dp0scripts\env-path.bat"
cd /d "%~dp0"

title ProjectHub - Full Setup
color 0A

echo.
echo  ============================================================
echo   PROJECTHUB — FULL AUTOMATIC SETUP
echo  ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

echo [1/8] Stopping old services...
node "%~dp0scripts\stop-services.mjs" 3004 5180 8080
ping 127.0.0.1 -n 2 >nul

echo [2/8] Installing dependencies...
call npm install
if errorlevel 1 goto :fail
cd server
call npm install
cd ..
if errorlevel 1 goto :fail

echo [3/8] Database setup...
call npm run setup:db
if errorlevel 1 goto :fail

echo [4/8] Seeding demo users...
call npm run seed
if errorlevel 1 goto :fail

echo [5/8] Building application...
call npm run build
if errorlevel 1 goto :fail

echo [6/8] Building desktop app icon...
node scripts\build-desktop-icon.mjs

echo [7/8] Installing desktop app builder...
if not exist "node_modules\electron\package.json" (
  call npm install electron@^33 electron-builder@^25 --save-dev
)

echo [8/8] Building Hormuud ProjectHub.exe (may take 3-5 min)...
call npm run desktop:build
if errorlevel 1 (
  echo  Desktop build skipped or failed — cloud tunnel still works.
)

echo.
echo  Starting internet sharing...
node "%~dp0scripts\share-internet.mjs"
goto :end

:fail
echo.
echo  Setup failed at a step above. Check SQL Server is running.
pause
exit /b 1

:end
pause
