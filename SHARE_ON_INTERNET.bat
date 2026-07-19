@echo off
REM ============================================================
REM  SHARE PROJECTHUB ON THE INTERNET — FREE (Cloudflare Tunnel)
REM  Anyone with the link can use your app while this PC is on.
REM  Uses your local SQL Server — no hosting payment needed.
REM ============================================================
setlocal EnableExtensions
call "%~dp0scripts\env-path.bat"
cd /d "%~dp0"

title ProjectHub - Share on Internet
color 0B

echo.
echo  ============================================================
echo   PROJECTHUB — SHARE ON THE INTERNET (FREE)
echo   Your computer must stay on while others use the app.
echo  ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo  cloudflared not found. Installing via winget...
  winget install --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
  echo.
  echo  If install finished, close and re-open this window, then run again.
  echo  Or download: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  echo.
)

node "%~dp0scripts\stop-services.mjs" 8080
node "%~dp0scripts\share-internet.mjs"
pause
