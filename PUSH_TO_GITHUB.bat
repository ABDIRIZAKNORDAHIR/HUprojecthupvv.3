@echo off
REM Run AFTER you finish GitHub login (Authorize in browser)
setlocal
set "PATH=C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;%PATH%"
cd /d "%~dp0"

echo Uploading to GitHub...
gh auth status || (
  echo Not logged in. Run DEPLOY_DO_IT.bat first and complete GitHub login.
  pause
  exit /b 1
)

gh repo create hormuud-projecthub --public --source=. --remote=origin --push 2>nul || (
  gh repo view hormuud-projecthub >nul 2>&1 && git push -u origin main
)

echo.
echo SUCCESS! Repo: 
gh repo view --json url -q .url
echo.
echo NEXT: Open RENDER_ENV_COPY.txt and follow YOU_DO_THIS.txt Step 2 and 3.
start "" notepad "%~dp0YOU_DO_THIS.txt"
pause
