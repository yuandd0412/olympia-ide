$ErrorActionPreference = 'Continue'
$env:HTTP_PROXY = ''; $env:HTTPS_PROXY = ''; $env:http_proxy = ''; $env:https_proxy = ''
$env:npm_config_proxy = ''; $env:npm_config_https_proxy = ''; $env:npm_config_noproxy = '*'
# user ~/.npmrc electron_mirror points at a host with no DNS; use npmmirror when fetching Electron
$env:ELECTRON_MIRROR = 'https://registry.npmmirror.com/-/binary/electron/'
# user ~/.npmrc registry is npmmirror and the project .npmrc disturl dependency must be preserved
$env:ELECTRON_CUSTOM_DIR = '{{ version }}'

$vcvars = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat'
Write-Output "=== importing MSVC env ==="
cmd /c "`"$vcvars`" >nul 2>&1 && set" | ForEach-Object {
  if ($_ -match '^([^=]+)=(.*)$') { Set-Item -Path "env:$($matches[1])" -Value $matches[2] }
}
$cl = Get-Command cl.exe -ErrorAction SilentlyContinue
Write-Output ("cl.exe = " + $(if ($cl) { $cl.Source } else { 'NOT FOUND' }))
Write-Output ("node = " + (node -v))

# REFUSE TO RUN WHILE THE APP IS OPEN: Windows locks loaded .node / DLL images, and the
# build then dies with EPERM while unlinking them. Kill it first, or close it yourself.
$running = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like 'Olympia*' -or $_.ProcessName -eq 'electron' })
if ($running.Count -gt 0) {
  Write-Output ("=== WARNING: " + $running.Count + " app process(es) still running ===")
  Write-Output "Close Olympia IDE before building, then re-run this script."
  exit 2
}

Set-Location 'D:\oler-ide-v2\oss'
$stamp = { (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') }

# STEP 1 - type check only. `npm run compile` -> `gulp compile` -> `tsc --noEmit`.
# It does NOT emit JavaScript. A green EXITCODE here says nothing about out/.
Write-Output ("=== STEP 1/2 typecheck START " + (& $stamp) + " ===")
npm run compile --proxy=null --https-proxy=null
$rc = $LASTEXITCODE
Write-Output ("=== STEP 1/2 typecheck EXITCODE=$rc  " + (& $stamp) + " ===")
if ($rc -ne 0) { Write-Output "typecheck failed, skipping transpile"; exit $rc }

# STEP 2 - actually emit out/*.js. This is the pipeline that produces runnable artifacts.
# It cleans out/ first, then rewrites all ~9440 files (~65s).
Write-Output ("=== STEP 2/2 transpile START " + (& $stamp) + " ===")
node --experimental-strip-types --max-old-space-size=8192 build/next/index.ts transpile
$rc2 = $LASTEXITCODE
Write-Output ("=== STEP 2/2 transpile EXITCODE=$rc2  " + (& $stamp) + " ===")

Write-Output ("out/ exists = " + (Test-Path 'D:\oler-ide-v2\oss\out'))
if (Test-Path 'D:\oler-ide-v2\oss\out') {
  Write-Output ("out/ files = " + (Get-ChildItem 'D:\oler-ide-v2\oss\out' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count)
}
if ($rc2 -ne 0) { exit $rc2 }

Write-Output "=== verifying artifacts ==="
node D:\oler-ide-v2\build\verify-out.mjs
exit $LASTEXITCODE