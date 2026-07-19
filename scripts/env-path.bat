@echo off
REM Add Node.js to PATH for all ProjectHub batch files
if exist "%ProgramFiles%\nodejs\node.exe" (
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
)
if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
  set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
)
