@echo off
REM Set the cloud URL for Hormuud ProjectHub.exe (after Render deploy)
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo  ============================================================
echo   SET CLOUD URL FOR PROJECTHUB DESKTOP APP
echo  ============================================================
echo.
echo  After you deploy on Render, paste your live link here.
echo  Example: https://hormuud-projecthub.onrender.com
echo.

set /p APPURL="Paste your ProjectHub URL: "

if "%APPURL%"=="" (
  echo Nothing entered. Cancelled.
  pause
  exit /b 1
)

echo {> "%~dp0desktop\app-config.json"
echo   "appUrl": "%APPURL%",>> "%~dp0desktop\app-config.json"
echo   "startLocalServer": false,>> "%~dp0desktop\app-config.json"
echo   "appName": "Hormuud ProjectHub">> "%~dp0desktop\app-config.json"
echo }>> "%~dp0desktop\app-config.json"

if exist "%~dp0release\" (
  copy /Y "%~dp0desktop\app-config.json" "%~dp0release\app-config.json" >nul
  echo.
  echo  Also copied to release\app-config.json next to your .exe
)

echo.
echo  Saved! Desktop app will open: %APPURL%
echo.
pause
