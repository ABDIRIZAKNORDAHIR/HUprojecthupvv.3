@echo off
call "%~dp0scripts\env-path.bat"
cd /d "%~dp0"

echo Stopping ProjectHub (ports 3004, 5180, 5181)...
node "%~dp0scripts\stop-services.mjs" 3004 5180 5181
echo.
echo Done. Run ProjectHub.bat to start again.
pause
