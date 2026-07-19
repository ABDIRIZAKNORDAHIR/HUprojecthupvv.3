@echo off
set PATH=%ProgramFiles%\nodejs;%PATH%
cd /d "%~dp0"
echo.
echo ProjectHub — Health Check
echo.
call npm run health-check
echo.
pause
