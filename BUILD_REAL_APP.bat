@echo off
REM ============================================================
REM  BUILD Hormuud ProjectHub.exe — real Windows application
REM  Give the .exe to students/teachers (after cloud deploy)
REM ============================================================
setlocal EnableExtensions
call "%~dp0scripts\env-path.bat"
cd /d "%~dp0"

title Build ProjectHub Desktop App
color 0E

echo.
echo  ============================================================
echo   BUILD REAL WINDOWS APP — Hormuud ProjectHub.exe
echo  ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

echo [1/3] Preparing icon...
node scripts\build-desktop-icon.mjs

echo [2/3] Installing build tools (one time, may take a few minutes)...
if not exist "node_modules\electron-builder\package.json" (
  call npm install electron@^33 electron-builder@^25 --save-dev
)

echo [3/3] Building Hormuud ProjectHub.exe ...
call npm run desktop:build

echo.
if exist "release\Hormuud ProjectHub*.exe" (
  echo  SUCCESS! Your real application is in the release\ folder:
  dir /b "release\*.exe"
  echo.
  echo  NEXT: Run SET_APP_URL.bat and paste your Render cloud link
  echo        so the .exe connects to the internet for everyone.
  explorer "release"
) else (
  echo  Build finished — check release\ folder for the .exe
  explorer "release" 2>nul
)
echo.
pause
