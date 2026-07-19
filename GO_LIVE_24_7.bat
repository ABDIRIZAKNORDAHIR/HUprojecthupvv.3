@echo off
REM ============================================================
REM  BEST WAY — 24/7 INTERNET (everyone can access, PC can be OFF)
REM  Opens the full guide + signup pages
REM ============================================================
setlocal EnableExtensions
cd /d "%~dp0"

title ProjectHub - Go Live 24/7
color 0E

echo.
echo  ============================================================
echo   HORMUUD PROJECTHUB — GO LIVE FOR EVERYONE (FREE, 24/7)
echo  ============================================================
echo.
echo   This is the BEST way for your full project on the internet.
echo   NOT the tunnel (that only works while your PC is on).
echo.
echo   You will use:
echo     1. Supabase  - free cloud database
echo     2. GitHub     - store your code
echo     3. Render     - host the app 24/7
echo.
echo   Opening guide and signup pages...
echo.

start "" notepad "%~dp0BEST_WAY_GO_LIVE.txt"
timeout /t 2 >nul
start "" "https://supabase.com/dashboard"
timeout /t 1 >nul
start "" "https://desktop.github.com"
timeout /t 1 >nul
start "" "https://render.com"

echo.
echo  ============================================================
echo   FOLLOW BEST_WAY_GO_LIVE.txt STEP BY STEP
echo.
echo   Step 1: Supabase  (database)  - browser opened
echo   Step 2: GitHub Desktop        - download page opened
echo   Step 3: Render                - browser opened
echo.
  echo   Step 4:  BUILD_REAL_APP.bat     - Windows .exe for students/teachers
  echo   Step 5:  SET_APP_URL.bat        - link .exe to your cloud URL
  echo.
  echo   Phone app: open cloud link in Chrome - Install app / Add to Home Screen
  echo   Full guide: REAL_APP_GUIDE.txt
echo  ============================================================
echo.
pause
