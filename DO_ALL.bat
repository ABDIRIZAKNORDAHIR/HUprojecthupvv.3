@echo off
REM ============================================================
REM  DO ALL — ProjectHub online + GitHub + Supabase + Render
REM ============================================================
setlocal EnableExtensions
set "PATH=C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;%PATH%"
call "%~dp0scripts\env-path.bat"
cd /d "%~dp0"

title ProjectHub - DO ALL
color 0A
cls

echo.
echo  ============================================================
echo   DO ALL — Hormuud ProjectHub
echo  ============================================================
echo.

where node >nul 2>&1 || (echo Install Node.js from nodejs.org & pause & exit /b 1)

echo [1/6] Building app...
if not exist "dist\index.html" call npm run build

echo [2/6] Starting ProjectHub on port 8080...
start "ProjectHub Server" /MIN cmd /c "set NODE_ENV=production&& set SERVE_STATIC=true&& set PUBLIC_DEPLOY=true&& set PORT=8080&& node server\src\index.js"
node scripts\wait-url.mjs "http://127.0.0.1:8080/api/health" 90

echo [3/6] Opening public internet tunnel...
start "ProjectHub Tunnel" cmd /k "node scripts\share-internet.mjs"

echo [4/6] GitHub login + upload...
gh auth status >nul 2>&1
if errorlevel 1 (
  echo.
  echo  >>> GITHUB: A browser will open. Enter the code shown below.
  echo.
  start "" "https://github.com/login/device"
  gh auth login --web --git-protocol https --hostname github.com
)

echo [5/6] Pushing code to GitHub...
gh repo create hormuud-projecthub --public --source=. --remote=origin --push 2>nul
if errorlevel 1 (
  gh repo view hormuud-projecthub >nul 2>&1 && git push -u origin main
)

echo [6/6] Opening Supabase + Render...
start "" notepad "%~dp0RENDER_ENV_COPY.txt"
start "" notepad "%~dp0YOU_DO_THIS.txt"
start "" "https://supabase.com/dashboard/project/new"
timeout /t 2 >nul
start "" "https://dashboard.render.com/blueprint/new"

echo.
echo  ============================================================
echo   DONE — WHAT YOU HAVE NOW:
echo.
echo   LOCAL:    http://localhost:8080/
echo   INTERNET: see "ProjectHub Tunnel" window for public link
echo   GITHUB:   github.com/YOUR-NAME/hormuud-projecthub
echo.
echo   LAST 2 STEPS (browser, 10 min):
echo     1. Supabase: create project, paste DATABASE_URL in RENDER_ENV_COPY.txt
echo     2. Render: Blueprint, pick repo, paste env vars, Save
echo  ============================================================
echo.
start "" "http://localhost:8080/"
pause
