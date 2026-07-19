@echo off
call "%~dp0env-path.bat"
pushd "%~dp0.."
title ProjectHub UI
echo ProjectHub UI starting on port 5180...
npm run dev
