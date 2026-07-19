@echo off
title ProjectHub — AI Key Setup
cd /d "%~dp0"
echo.
echo  ============================================================
echo   PROJECTHUB — SET UP REAL AI (ChatGPT or Gemini)
echo  ============================================================
echo.
echo  Your .env file has no active API key yet.
echo  This wizard will save your key and test the connection.
echo.
echo  Get a key free/cheap:
echo    ChatGPT: https://platform.openai.com/api-keys
echo    Gemini:  https://aistudio.google.com/apikey
echo.
pause
node "%~dp0scripts\setup-ai-key.mjs"
echo.
pause

