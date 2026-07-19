@echo off

set PATH=%ProgramFiles%\nodejs;%PATH%

cd /d "%~dp0"



echo ========================================

echo  ProjectHub - Starting

echo ========================================



echo.

echo [1/5] Installing dependencies...

call npm install

if errorlevel 1 goto :error

call npm install --prefix server

if errorlevel 1 goto :error



echo.

echo [2/5] Database setup...

call npm run setup:db

if errorlevel 1 goto :error



echo.

echo [3/5] Preparing database...

call npm run seed

if errorlevel 1 goto :error



echo.

echo [4/5] Starting servers...

echo   API:  http://localhost:3004

echo   UI:   http://localhost:5180/

start "ProjectHub API" cmd /k "set PATH=%ProgramFiles%\nodejs;%PATH% && cd /d %~dp0 && npm run start:server"



echo.

echo [5/5] Waiting for API...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-WebRequest -Uri 'http://localhost:3004/api/health' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){ $ok=$true; break } } catch {} Start-Sleep -Seconds 1 }; if(-not $ok){ Write-Host 'WARNING: API did not respond in time — check the API window.'; exit 0 }"

if errorlevel 1 (

  echo WARNING: Could not verify API health. Check the API window for errors.

)



start "ProjectHub UI" cmd /k "set PATH=%ProgramFiles%\nodejs;%PATH% && cd /d %~dp0 && npm run dev"

timeout /t 4 /nobreak >nul



start "" "http://localhost:5180/"



echo.

echo ========================================

echo  OPEN THIS URL:

echo    http://localhost:5180/

echo.

echo  Portals:

echo    Student  http://localhost:5180/student

echo    Teacher  http://localhost:5180/teacher

echo    Admin    http://localhost:5180/admin

echo.

echo  OTHER COMPUTERS (same Wi-Fi): see NETWORK_ACCESS.txt

for /f "delims=" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' } | Select-Object -First 1 -ExpandProperty IPAddress)"') do set LAN_IP=%%i

if defined LAN_IP (
  echo    http://%LAN_IP%:5180/
)

echo.

echo  Admin credentials: see ADMIN_ACCESS.txt

echo.

echo  DESKTOP APP: double-click LAUNCH_APP.bat

echo  DO NOT use port 5173 - use 5180 only.

echo ========================================

pause

goto :eof



:error

echo FAILED - check SQL Server and Node.js are installed

pause

