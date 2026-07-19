param(
    [string]$Root,
    [string]$Destination,
    [string]$Mode = "code"
)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$excludeNames = if ($Mode -eq "full") { @('node_modules', '.git') } else { @('node_modules', 'dist', '.git') }

if (Test-Path $Destination) { Remove-Item $Destination -Force }
$destDir = Split-Path $Destination -Parent
if ($destDir -and -not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }

$zip = [System.IO.Compression.ZipFile]::Open($Destination, [System.IO.Compression.ZipArchiveMode]::Create)
$count = 0
$bytes = 0

function Should-Skip($rel) {
    $parts = $rel -split '[\\/]'
    foreach ($part in $parts) {
        if ($excludeNames -contains $part) { return $true }
    }
    # Skip backup output folder at parent level duplicates
    if ($rel -match '^ProjectHub-Backups') { return $true }
    return $false
}

try {
    Get-ChildItem -Path $Root -Recurse -File -Force | ForEach-Object {
        $full = $_.FullName
        $rel = $full.Substring($Root.Length).TrimStart('\', '/')
        if (Should-Skip $rel) { return }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $full, $rel.Replace('\', '/')) | Out-Null
        $count++
        $bytes += $_.Length
    }
} finally {
    $zip.Dispose()
}

$mb = [math]::Round($bytes / 1MB, 2)
Write-Host "Saved $count files ($mb MB) to $Destination"
