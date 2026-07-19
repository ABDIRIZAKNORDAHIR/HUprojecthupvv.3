@echo off
setlocal EnableExtensions
set "URL=%~1"
if "%URL%"=="" set "URL=http://localhost:5180/"

set "CHROME="
where chrome >nul 2>&1
if not errorlevel 1 set "CHROME=chrome"
if not defined CHROME if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  echo Opening ProjectHub application window...
  start "" "%CHROME%" --app=%URL% --window-size=1280,800
  exit /b 0
)

where msedge >nul 2>&1
if not errorlevel 1 (
  echo Opening ProjectHub in Edge app window...
  start "" msedge --app=%URL% --window-size=1280,800
  exit /b 0
)

echo Opening in browser...
start "" "%URL%"
