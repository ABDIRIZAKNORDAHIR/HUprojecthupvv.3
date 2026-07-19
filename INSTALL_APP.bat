@echo off
call "%~dp0scripts\env-path.bat"
cd /d "%~dp0"

set "APP_URL=http://localhost:5180/"
set "CHROME="

where chrome >nul 2>&1
if not errorlevel 1 set "CHROME=chrome"
if not defined CHROME if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

echo.
echo  ProjectHub Desktop App
echo  Make sure START_HERE.bat is running first.
echo.

if not defined CHROME (
  echo Chrome not found. Open %APP_URL% in your browser.
  start "" "%APP_URL%"
  pause
  exit /b 1
)

start "" "%CHROME%" --app=%APP_URL% --window-size=1280,800

echo  ProjectHub opened as a desktop app window.
echo  To pin permanently: homepage Install button or Chrome menu - Install ProjectHub
echo.
pause
