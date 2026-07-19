@echo off
title Hormuud ProjectHub - Promo Animation Video
cd /d "%~dp0"
call scripts\env-path.bat

echo.
echo  ============================================================
echo   HORMUUD PROJECTHUB - ANIMATION VIDEO EXPORT
echo  ============================================================
echo.

call npm run export:promo-video
if errorlevel 1 goto :fail

echo.
echo  Opening video folder...
start "" "%~dp0design\animation\output"
echo.
pause
exit /b 0

:fail
echo.
echo  Export failed. Try: npx playwright install chromium
pause
exit /b 1
