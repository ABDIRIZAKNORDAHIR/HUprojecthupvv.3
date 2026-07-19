@echo off
setlocal EnableDelayedExpansion
set PATH=%ProgramFiles%\nodejs;%PATH%
cd /d "%~dp0"

set "BACKUP_ROOT=%~dp0..\ProjectHub-Backups"
set "STAMP=%date:~-4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "STAMP=!STAMP: =0!"
set "ZIP_FILE=%BACKUP_ROOT%\ProjectHub-FULL-!STAMP!.zip"

echo ========================================
echo  ProjectHub — SAVE EVERYTHING
echo ========================================
echo.

if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%"

echo [1/4] Building production app...
call npm run build
if errorlevel 1 (
  echo Build warning — continuing backup anyway...
)

echo.
echo [2/4] Exporting SQL Server database...
node server/src/scripts/exportDatabase.js
if errorlevel 1 (
  echo Database export failed — SQL Server may be offline.
  echo Code backup will still continue...
)

echo.
echo [3/4] Copying access info into backup folder...
if not exist ".backup" mkdir ".backup"
copy /Y "ACCESS.txt" ".backup\ACCESS.txt" >nul 2>&1
echo ProjectHub full backup > ".backup\README.txt"
echo Created: !STAMP! >> ".backup\README.txt"
echo Restore: unzip, run npm install, npm run setup:db, npm run seed, START.bat >> ".backup\README.txt"

echo.
echo [4/4] Creating full zip (code + dist + database export + config)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\backup-project.ps1" -Root "%CD%" -Destination "!ZIP_FILE!" -Mode full

if errorlevel 1 goto :error

copy /Y "!ZIP_FILE!" "%BACKUP_ROOT%\ProjectHub-FULL-LATEST.zip" >nul 2>&1

echo.
echo ========================================
echo  EVERYTHING SAVED
echo ========================================
echo.
echo  Full backup zip:
echo    !ZIP_FILE!
echo.
echo  Latest copy:
echo    %BACKUP_ROOT%\ProjectHub-FULL-LATEST.zip
echo.
echo  Includes:
echo    - All source code
echo    - Production build (dist)
echo    - .env configuration
echo    - Database export (.backup/database-export)
echo    - ACCESS.txt login details
echo.
echo  Project folder:
echo    %CD%
echo.
echo  Admin login (also in ACCESS.txt):
echo    Email:    admin@hu.edu  (no HU ID needed)
echo    Email:    admin@hu.edu
echo    Password: ProjectHub123!
echo.
echo  App URL: http://localhost:5180/
echo ========================================
pause
goto :eof

:error
echo.
echo BACKUP FAILED — check disk space and try again.
pause
