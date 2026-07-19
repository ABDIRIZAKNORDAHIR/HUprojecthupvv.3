@echo off
REM Automated Option B — does git + GitHub + opens Supabase/Render for you
setlocal EnableExtensions
call "%~dp0scripts\env-path.bat"
cd /d "%~dp0"

title ProjectHub - Auto Deploy Option B
color 0B

echo.
echo  ============================================================
echo   AUTOMATED DEPLOY — Option B (24/7 online)
echo  ============================================================
echo.
echo   I will:
echo     - Prepare your code for GitHub
echo     - Open GitHub login (you click Authorize once)
echo     - Upload code to GitHub
echo     - Open Supabase + Render for you
echo.
echo   You only need to click a few buttons in the browser.
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js required
  pause
  exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
  echo Installing Git...
  winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
  echo Close this window, open a NEW one, run this file again.
  pause
  exit /b 0
)

where gh >nul 2>&1
if errorlevel 1 (
  echo Installing GitHub CLI...
  winget install --id GitHub.cli -e --accept-package-agreements --accept-source-agreements
  echo Close this window, open a NEW one, run this file again.
  pause
  exit /b 0
)

node scripts\deploy-option-b.mjs
echo.
pause
