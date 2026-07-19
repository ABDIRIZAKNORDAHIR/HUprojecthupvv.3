@echo off
REM OPTION B — 24/7 cloud deploy checklist
start "" notepad "%~dp0YOU_DO_THIS.txt"
start "" "https://github.com/login/device"
timeout /t 2 >nul
start "" "https://supabase.com/dashboard/project/new"
timeout /t 2 >nul
start "" "https://dashboard.render.com/blueprint/new"
echo.
echo  Opening GitHub login + Supabase + Render...
echo  Follow YOU_DO_THIS.txt — 3 browser clicks.
echo.
call "%~dp0DEPLOY_DO_IT.bat"
