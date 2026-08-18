@echo off
REM Re-open the last public Cloudflare link saved by SHARE_ON_INTERNET.bat
setlocal EnableExtensions
cd /d "%~dp0"

if not exist PUBLIC_LINK.txt (
  echo Run SHARE_ON_INTERNET.bat first to create your public link.
  pause
  exit /b 1
)

for /f "usebackq tokens=1,* delims=:" %%A in (`findstr /i "PUBLIC LINK" PUBLIC_LINK.txt`) do (
  set "URL=%%B"
  goto :open
)
for /f "usebackq tokens=1,* delims=:" %%A in (`findstr /i "https://" PUBLIC_LINK.txt ^| findstr /i "trycloudflare"`) do (
  set "URL=%%B"
  goto :open
)

:open
set "URL=%URL: =%"
if "%URL%"=="" (
  echo Could not read link from PUBLIC_LINK.txt. Run SHARE_ON_INTERNET.bat again.
  pause
  exit /b 1
)

call scripts\open-app.bat %URL%
echo Opened public link:
echo %URL%
pause
