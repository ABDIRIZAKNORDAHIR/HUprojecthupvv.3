param(
  [string]$Url,
  [int]$MaxAttempts = 45,
  [int]$TimeoutSec = 2
)

for ($i = 0; $i -lt $MaxAttempts; $i++) {
  & "$PSScriptRoot\test-url.ps1" -Url $Url -TimeoutSec $TimeoutSec | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: $Url"
    exit 0
  }
  Start-Sleep -Seconds 1
}

Write-Host "FAIL: $Url"
exit 1
