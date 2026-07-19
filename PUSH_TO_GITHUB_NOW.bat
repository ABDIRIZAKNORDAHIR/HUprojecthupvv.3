@echo off
REM ============================================================
REM  PUSH ENTIRE PROJECT TO GITHUB (one-time login, then push)
REM ============================================================
setlocal EnableExtensions
set "PATH=C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;%PATH%"
cd /d "%~dp0"
call scripts\env-path.bat

title Push ProjectHub to GitHub
color 0A
cls

echo.
echo  ============================================================
echo   PUSH PROJECT TO GITHUB
echo  ============================================================
echo.

where git >nul 2>&1 || (echo Install Git from https://git-scm.com & pause & exit /b 1)
where gh >nul 2>&1 || (echo Install GitHub CLI: winget install GitHub.cli & pause & exit /b 1)

echo [1/4] Checking GitHub login...
gh auth status >nul 2>&1
if errorlevel 1 (
  echo.
  echo  You must log in to GitHub ONCE (30 seconds):
  echo    1. Browser opens: https://github.com/login/device
  echo    2. Copy the code shown below into GitHub
  echo    3. Click Authorize
  echo.
  start "" "https://github.com/login/device"
  gh auth login --hostname github.com --git-protocol https --web
  if errorlevel 1 (
    echo Login failed. Try again.
    pause
    exit /b 1
  )
)

echo [2/4] Saving latest code...
git add -A
git reset HEAD GITHUB_LOGIN_NOW.txt Hormuud-ProjectHub-FULL-PROJECT.zip 2>nul
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Update ProjectHub before GitHub push"
)

echo [3/4] Creating GitHub repo and uploading...
gh repo create hormuud-projecthub --public --source=. --remote=origin --push 2>nul
if errorlevel 1 (
  git remote remove origin 2>nul
  gh repo view hormuud-projecthub >nul 2>&1
  if errorlevel 1 (
    gh repo create hormuud-projecthub --public --source=. --remote=origin --push
  ) else (
    git remote add origin https://github.com/%USERNAME%/hormuud-projecthub.git 2>nul
    git push -u origin main
  )
)

echo [4/4] Done!
echo.
for /f "delims=" %%u in ('gh repo view --json url -q .url 2^>nul') do set REPO_URL=%%u
if defined REPO_URL (
  echo  YOUR PROJECT IS ON GITHUB:
  echo  %REPO_URL%
  start "" "%REPO_URL%"
) else (
  echo  Push may have succeeded. Check: https://github.com/YOUR-USERNAME/hormuud-projecthub
)
echo.
pause
