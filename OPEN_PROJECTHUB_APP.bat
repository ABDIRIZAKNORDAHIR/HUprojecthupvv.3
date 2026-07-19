@echo off
REM Launch the built Hormuud ProjectHub desktop application
cd /d "%~dp0"
if exist "release\win-unpacked\Hormuud ProjectHub.exe" (
  start "" "release\win-unpacked\Hormuud ProjectHub.exe"
  exit /b 0
)
if exist "release\Hormuud-ProjectHub-1.0.0-Portable.exe" (
  start "" "release\Hormuud-ProjectHub-1.0.0-Portable.exe"
  exit /b 0
)
echo Run BUILD_REAL_APP.bat first, or use REAL_APP.bat for local app.
pause
