@echo off
REM Add Node.js and cloudflared to PATH for all ProjectHub batch files
if exist "%ProgramFiles%\nodejs\node.exe" (
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
)
if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
  set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
)
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
  set "PATH=C:\Program Files (x86)\cloudflared;%PATH%"
)
if exist "C:\Program Files\cloudflared\cloudflared.exe" (
  set "PATH=C:\Program Files\cloudflared;%PATH%"
)
