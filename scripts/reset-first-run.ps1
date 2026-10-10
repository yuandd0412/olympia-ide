# reset-first-run.ps1 - force Olympia IDE's onboarding wizard on next launch.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\reset-first-run.ps1
#
# Env-var alternative (no file change, per-launch):
#   $env:OLYMPIA_FORCE_FIRST_RUN = "1"; & "path\to\olympia-ide.exe"

$ErrorActionPreference = "Stop"

$path = Join-Path $env:USERPROFILE ".oleride\settings.json"

# Defaults aligned with models::AppSettings::default() (camelCase JSON keys).
$defaults = [ordered]@{
    isFirstRun         = $true
    theme              = "OneDarkPro"
    compilerPath       = "g++"
    compilerFlags      = @("-O2", "-std=c++17", "-Wall", "-Wextra")
    enableCodeTemplate = $false
    codeTemplate       = ""
    aiBaseUrl          = "https://api.openai.com/v1"
    aiApiKey           = ""
    aiModel            = "gpt-4o-mini"
    preferTerminalRun  = $false
    dailyGoal          = 5
    autoSave           = $true
    fontSize           = 14
    fontFamily         = "Cascadia Mono"
}

# [System.IO.File] read/write with explicit UTF-8 (no BOM): Get-Content would
# decode as cp936 on this machine and serde_json rejects a BOM.
New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null
if (Test-Path $path) {
    $raw = [System.IO.File]::ReadAllText($path)
    $settings = $raw | ConvertFrom-Json
    $key = if ($null -ne $settings.PSObject.Properties["isFirstRun"]) { "isFirstRun" }
           elseif ($null -ne $settings.PSObject.Properties["is_first_run"]) { "is_first_run" }
           else { "isFirstRun" }
    $before = $settings.PSObject.Properties[$key].Value
    $settings.PSObject.Properties[$key].Value = $true
    $out = $settings | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($path, $out, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "settings.json updated:"
    Write-Host ("  {0}: {1} -> true" -f $key, $before)
} else {
    Write-Host "settings.json not found - writing minimal defaults with isFirstRun=true"
    $out = $defaults | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($path, $out, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "  isFirstRun: <no file> -> true"
}
Write-Host ("  file: {0}" -f $path)
Write-Host ""
Write-Host 'Env-var alternative (no file change, per-launch):'
Write-Host '  $env:OLYMPIA_FORCE_FIRST_RUN = "1"; & "path\to\olympia-ide.exe"'
