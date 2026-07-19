$url = 'http://localhost:5180/'
if (Get-Command msedge -ErrorAction SilentlyContinue) {
  Start-Process msedge -ArgumentList "--app=$url", '--window-size=1280,800'
} elseif (Get-Command chrome -ErrorAction SilentlyContinue) {
  Start-Process chrome -ArgumentList "--app=$url", '--window-size=1280,800'
} else {
  Start-Process $url
}

$projectRoot = Split-Path $PSScriptRoot -Parent
$WshShell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$bat = Join-Path $projectRoot 'LAUNCH_APP.bat'
$lnk = Join-Path $desktop 'ProjectHub.lnk'
$sc = $WshShell.CreateShortcut($lnk)
$sc.TargetPath = $bat
$sc.WorkingDirectory = $projectRoot
$sc.Description = 'ProjectHub - Hormuud University'
$sc.Save()
Write-Host "App opened. Desktop shortcut: $lnk"
