# ProjectHub — one command in Cursor / PowerShell terminal
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$env:Path = "$env:ProgramFiles\nodejs;$env:Path"
if (Test-Path "$env:LOCALAPPDATA\Programs\node\node.exe") {
  $env:Path = "$env:LOCALAPPDATA\Programs\node;$env:Path"
}

Write-Host ""
Write-Host "Starting ProjectHub (database + API + AI + frontend)..." -ForegroundColor Green
Write-Host ""

npm start
