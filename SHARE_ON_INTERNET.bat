@echo off
REM ============================================================
REM  Hormuud ProjectHub — SHARE ON INTERNET (Cloud)
REM  Starts API + UI, creates a free Cloudflare public link,
REM  and opens it automatically in your browser.
REM  Keep this window open while others use the app.
REM ============================================================
setlocal EnableExtensions
cd /d "%~dp0"
call scripts\env-path.bat

title ProjectHub - Cloud Link
color 0B
cls

echo.
echo  ============================================================
echo   Hormuud ProjectHub — Share on Internet
echo  ============================================================
echo   Your PC must stay on while others use the public link.
echo   The app will open automatically when the link is ready.
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
  if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
    set "PATH=C:\Program Files (x86)\cloudflared;%PATH%"
  ) else if exist "C:\Program Files\cloudflared\cloudflared.exe" (
    set "PATH=C:\Program Files\cloudflared;%PATH%"
  ) else (
    echo  cloudflared not found. Installing via winget...
    winget install --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
    set "PATH=C:\Program Files (x86)\cloudflared;C:\Program Files\cloudflared;%PATH%"
    echo.
  )
)

node scripts\share-dev-tunnel.mjs
pause
