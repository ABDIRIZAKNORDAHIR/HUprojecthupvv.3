param(
  [string]$Url,
  [int]$TimeoutSec = 3
)
try {
  $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
  if ($r.StatusCode -eq 200) { exit 0 }
} catch {}
exit 1
