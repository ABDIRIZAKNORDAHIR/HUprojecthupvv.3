@echo off
call "%~dp0env-path.bat"
pushd "%~dp0.."
title ProjectHub API
echo ProjectHub API starting on port 3004...
npm run start:server
