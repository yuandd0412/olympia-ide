<#
.SYNOPSIS
    Produces the Windows installer, with the bundled C++ toolchain included.

.DESCRIPTION
    Four stages, in order:

      1. bundle     — `build/next/index.ts bundle` emits `out-vscode/`, the tree the packaging
                      task consumes. Also runs NLS extraction, so the Chinese localisation generated
                      in earlier steps is what actually ships.
      2. toolchain  — assembles MinGW-w64 into `.build/toolchain/` unless it is already staged.
                      Skipped when present, because the download is the slow part.
      3. package    — `gulp vscode-win32-x64-ci` writes the unpacked product and the installer.
      4. cache      — launches the packaged app once in generation mode to emit the Node.js compile
                      cache under `resources/app/node-compile-cache`, cutting module compile cost on
                      every later start. Upstream folds this into stage 3, but gates it on
                      `product.quality`, which this fork does not set.

    The toolchain stage is skipped, not failed, when no toolchain is staged: the packaging task
    only copies `.build/toolchain/**` if that directory exists, so a source-only build still
    produces a valid (compiler-less) package.

.PARAMETER SkipBundle
    Reuse the existing `out-vscode/` instead of rebuilding it. Saves ~2 minutes when only the
    packaging step changed.

.PARAMETER SkipToolchain
    Do not attempt the toolchain download even if it is missing.

.PARAMETER SkipPackage
    Stop after the bundle stage; useful when only `out-vscode/` is wanted.

.EXAMPLE
    .\oss-package.ps1
    Full pipeline: bundle → toolchain → installer.

.EXAMPLE
    .\oss-package.ps1 -SkipBundle
    Rebuild only the installer, reusing the current bundle and toolchain.

.NOTES
    Close Olympia IDE first. Windows locks loaded binaries and the packaging copy fails with EPERM
    on an already-running install.
#>

[CmdletBinding()]
param(
    [switch]$SkipBundle,
    [switch]$SkipToolchain,
    [switch]$SkipPackage
)

$ErrorActionPreference = 'Continue'
$stamp = { (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') }
$Oss = 'D:\oler-ide-v2\oss'
$Toolchain = Join-Path $Oss '.build\toolchain'

# dead proxy in the user environment makes every outbound request exit 7
$env:HTTP_PROXY = ''; $env:HTTPS_PROXY = ''; $env:http_proxy = ''; $env:https_proxy = ''
# user ~/.npmrc electron_mirror points at a host with no DNS; packaging downloads Electron
$env:ELECTRON_MIRROR = 'https://registry.npmmirror.com/-/binary/electron/'
$env:ELECTRON_CUSTOM_DIR = '{{ version }}'

# oss/.git has no commits, so build/lib/getVersion.ts yields undefined and packaging drops
# product.commit. agentHost/node/appNodeModules.ts gates on that field to pick
# node_modules.asar.unpacked, so without it the agent host reads wasm out of the plain
# node_modules dir and aborts on ENOENT. Stamp the build with the containing repo's commit.
if (-not $env:BUILD_SOURCEVERSION) {
    $sha = & git -C 'D:\oler-ide-v2' rev-parse HEAD 2>$null
    if ($sha -match '^[0-9a-f]{40}$') {
        $env:BUILD_SOURCEVERSION = $sha
        Write-Output "=== BUILD_SOURCEVERSION=$sha ==="
    } else {
        Write-Warning 'Could not resolve a 40-char commit; product.commit will be missing.'
    }
}

$running = @(Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ProcessName -like 'Olympia*' -or $_.ProcessName -eq 'electron' })
if ($running.Count -gt 0) {
    Write-Output ("=== " + $running.Count + " app process(es) still running ===")
    Write-Output "Close Olympia IDE before packaging, then re-run this script."
    exit 2
}

Set-Location $Oss

# ---------------------------------------------------------------- 1. bundle

if ($SkipBundle) {
    Write-Output "=== STAGE 1/4 bundle SKIPPED (reusing out-vscode) ==="
} else {
    Write-Output ("=== STAGE 1/4 bundle START " + (& $stamp) + " ===")
    node --experimental-strip-types --max-old-space-size=8192 build/next/index.ts bundle --nls
    $rc = $LASTEXITCODE
    Write-Output ("=== STAGE 1/4 bundle EXITCODE=$rc  " + (& $stamp) + " ===")
    if ($rc -ne 0) { exit $rc }
}

# ---------------------------------------------------------------- 2. toolchain

$haveToolchain = (Test-Path (Join-Path $Toolchain 'mingw64\bin\g++.exe'))
if ($SkipToolchain) {
    Write-Output '=== STAGE 2/4 toolchain SKIPPED (-SkipToolchain) ==='
} elseif ($haveToolchain) {
    Write-Output '=== STAGE 2/4 toolchain already staged ==='
} else {
    Write-Output ("=== STAGE 2/4 toolchain START " + (& $stamp) + " ===")
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'D:\oler-ide-v2\build\fetch-toolchain.ps1'
    $rc = $LASTEXITCODE
    Write-Output ("=== STAGE 2/4 toolchain EXITCODE=$rc  " + (& $stamp) + " ===")
    if ($rc -ne 0) {
        Write-Output '工具链组装失败，打包继续但产物不含编译器。' -ForegroundColor Yellow
    }
}

if ($SkipPackage) {
    Write-Output '=== STAGE 3/4 package SKIPPED (-SkipPackage) ==='
    exit 0
}

# ---------------------------------------------------------------- 3. package

Write-Output ("=== STAGE 3/4 package START " + (& $stamp) + " ===")
node node_modules/gulp/bin/gulp.js vscode-win32-x64-ci
$rc = $LASTEXITCODE
Write-Output ("=== STAGE 3/4 package EXITCODE=$rc  " + (& $stamp) + " ===")
if ($rc -ne 0) { exit $rc }

$dist = Join-Path (Split-Path $Oss -Parent) 'VSCode-win32-x64'

# ---------------------------------------------------------------- 4. compile cache

Write-Output ("=== STAGE 4/4 node-compile-cache START " + (& $stamp) + " ===")
node 'D:\oler-ide-v2\build\gen-node-compile-cache.mjs' $dist
$rc = $LASTEXITCODE
Write-Output ("=== STAGE 4/4 node-compile-cache EXITCODE=$rc  " + (& $stamp) + " ===")
if ($rc -ne 0) { exit $rc }

# ---------------------------------------------------------------- report

Write-Output ''
Write-Output '=== 产物 ==='
if (Test-Path $dist) {
    $size = (Get-ChildItem $dist -Recurse -File -ErrorAction SilentlyContinue |
        Measure-Object Length -Sum).Sum / 1MB
    Write-Output ("  {0}" -f $dist)
    Write-Output ("  {0:N1} MB" -f $size)
} else {
    Write-Output "  未找到 $dist" -ForegroundColor Yellow
}

# The one thing that must be true: the packaged product contains a compiler that actually runs.
# Checking that g++.exe exists proves nothing, so compile and execute P1001 with the copy that
# shipped inside the product.
Write-Output ''
Write-Output '=== 验证产物内置编译器 ==='
node 'D:\oler-ide-v2\build\verify-product-toolchain.mjs' $dist
$vrc = $LASTEXITCODE
if ($vrc -ne 0) {
    Write-Output '产物内置编译器不可用。' -ForegroundColor Red
    exit $vrc
}

exit 0