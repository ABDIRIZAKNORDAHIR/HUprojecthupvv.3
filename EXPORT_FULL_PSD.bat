@echo off
title Hormuud ProjectHub - Full Photoshop PSD Export
cd /d "%~dp0"
call scripts\env-path.bat

echo.
echo  ============================================================
echo   HORMUUD PROJECTHUB - FULL DESIGN AS PHOTOSHOP PSD
echo  ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

echo  [1/3] Checking ProjectHub is running...
node -e "fetch('http://localhost:3004/api/health').then(r=>r.json()).then(d=>process.exit(d.status==='ok'?0:1)).catch(()=>process.exit(1))"
if errorlevel 1 (
  echo  Starting ProjectHub...
  start "ProjectHub API" cmd /k ""%~dp0scripts\start-api.bat""
  start "ProjectHub UI" cmd /k ""%~dp0scripts\start-ui.bat""
  ping 127.0.0.1 -n 8 >nul
)

echo  [2/3] Capturing all screens...
call npm run export:figma-screens
if errorlevel 1 goto :fail

echo  [3/3] Converting to Photoshop PSD...
call npm run export:photoshop
if errorlevel 1 goto :fail

echo.
echo  DONE! Open this folder in Adobe Photoshop:
echo  %~dp0design\photoshop-export
echo.
echo  Files:
echo    - screens\*.psd          (each screen, own file)
echo    - ProjectHub-Full-Design.psb   (ALL screens, one file)
echo    - ProjectHub-Full-Design-Part1.psd
echo    - ProjectHub-Full-Design-Part2.psd
echo.
start "" "%~dp0design\photoshop-export"
pause
exit /b 0

:fail
echo.
echo  Export failed. Run START_HERE.bat first, then try again.
pause
exit /b 1
