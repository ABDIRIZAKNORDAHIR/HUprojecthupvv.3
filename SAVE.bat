@echo off
setlocal EnableDelayedExpansion
set PATH=%ProgramFiles%\nodejs;%PATH%
cd /d "%~dp0"

set "BACKUP_ROOT=%~dp0..\ProjectHub-Backups"
set "STAMP=%date:~-4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "STAMP=!STAMP: =0!"
set "ZIP_FILE=%BACKUP_ROOT%\ProjectHub-backup-!STAMP!.zip"

echo ========================================
echo  ProjectHub — Saving Project Backup
echo ========================================
echo.

if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%"

echo Creating backup (no node_modules, no dist)...
echo   To: !ZIP_FILE!
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\backup-project.ps1" -Root "%CD%" -Destination "!ZIP_FILE!"

if errorlevel 1 goto :error

echo.
echo ========================================
echo  BACKUP SAVED
echo  !ZIP_FILE!
echo.
echo  Project folder: %CD%
echo  Login info:     ACCESS.txt
echo ========================================
pause
goto :eof

:error
echo.
echo BACKUP FAILED — check disk space and try again.
pause
