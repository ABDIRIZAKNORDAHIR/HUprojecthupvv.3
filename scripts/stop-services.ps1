param(
  [int[]]$Ports = @(3004, 5180, 5181)
)

foreach ($port in $Ports) {
  $pids = @()
  netstat -ano | ForEach-Object {
    if ($_ -match ":$port\s+.*LISTENING\s+(\d+)$") {
      $pids += $Matches[1]
    }
  }
  $pids | Select-Object -Unique | ForEach-Object {
    Write-Host "Stopping PID $_ on port $port"
    cmd /c "taskkill /F /PID $_" | Out-Null
    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
  }
}
