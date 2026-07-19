@echo off
cd /d "%~dp0"
echo Restarting ProjectHub...
call STOP.bat
call GO.bat
