@echo off
REM ============================================================
REM  PROJECTHUB - DOUBLE-CLICK TO START
REM  SQL Server + API + Frontend → opens app automatically
REM  Keep the "ProjectHub Server" window open while using the app
REM ============================================================
setlocal EnableExtensions
cd /d "%~dp0"
call scripts\env-path.bat

title ProjectHub Launcher
color 0A

echo.
echo  ============================================================
echo   Hormuud ProjectHub - Starting...
echo  ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

echo  Opening server window and starting app...
echo  The app will open automatically in your browser.
echo.
echo  URL: http://localhost:8080/
echo.

start "ProjectHub Server" cmd /k "cd /d "%~dp0" && call scripts\env-path.bat && title ProjectHub Server && color 0A && npm.cmd start"

timeout /t 3 /nobreak >nul
echo  Done. If the app did not open, go to: http://localhost:8080/
echo.
pause
