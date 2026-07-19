@echo off
title ProjectHub — FREE AI Setup (No credit card)
cd /d "%~dp0"
color 0A
echo.
echo  ============================================================
echo   FREE AI FOR PROJECTHUB — NO DOLLARS NEEDED
echo  ============================================================
echo.
echo   Best option: GROQ (100%% free, no credit card)
echo   - Sign up with Google or email
echo   - Get key in 2 minutes
echo   - Real AI for teacher project review
echo.
echo  ============================================================
echo.
echo  Step 1: Opening Groq sign-up page in your browser...
start https://console.groq.com/keys
echo.
echo  Step 2: Click "Create API Key" and copy it (starts with gsk_)
echo.
pause
echo.
echo  Step 3: Paste your Groq key below...
node "%~dp0scripts\setup-groq-key.mjs"
echo.
pause
