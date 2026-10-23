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
      3. package    — compiles the built-in extensions into `.build/extensions/` first, because the
                      packaging task copies that directory verbatim and cannot build it itself; then
                      `gulp vscode-win32-x64-ci` writes the unpacked product and the installer.
      4. cache      — launches the packaged app once in generation mode to emit the Node.js compile
                      cache under `resources/app/node-compile-cache`, cutting module compile cost on
                      every later start. Upstream folds this into stage 3, but gates it on
                      `product.quality`, which this fork does not set.

    The toolchain stage is skipped, not failed, when no toolchain is staged: the packaging task
    only copies `.build/toolchain/**` if that directory exists, so a source-only build still
    produces a valid (compiler-less) package.

    An installer build keeps that toolchain: `code.iss` excludes `\bin,\bin\*`, and per Inno's
    pattern rules a leading backslash anchors a pattern to the start of the path, so only the
    product root's `bin` is dropped — `resources\app\toolchain\mingw64\bin\g++.exe` survives,
    which is exactly the path `olympia-onboarding/src/toolchain.ts` probes second.

.PARAMETER SkipBundle
    Reuse the existing `out-vscode/` instead of rebuilding it. Saves ~2 minutes when only the
    packaging step changed.

.PARAMETER SkipToolchain
    Do not attempt the toolchain download even if it is missing.

.PARAMETER SkipExtensions
    Reuse the existing `.build/extensions/` instead of recompiling every built-in extension. Saves
    several minutes when only the product tree, the toolchain or the cache changed.

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
    [switch]$SkipExtensions,
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

# Only instances this build actually touches: the packaged product, or an electron started
# from the fork's own tree. Matching on the bare process name 'electron' blocked packaging
# (exit 2) whenever any unrelated Electron app was running on the machine.
$running = @(Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ProcessName -like 'Olympia*' -or
                   ($_.ProcessName -eq 'electron' -and $_.Path -and $_.Path.StartsWith($Oss, 'OrdinalIgnoreCase')) })
if ($running.Count -gt 0) {
    Write-Output ("=== " + $running.Count + " app process(es) still running ===")
    Write-Output "Close Olympia IDE before packaging, then re-run this script."
    exit 2
}

Set-Location $Oss

# ---------------------------------------------------------------- 0. pre-flight

# build/ 不在 compile-client 的覆盖范围里，所以里面的类型错误要等到第 3 阶段才炸，
# 而那时 clean-vscode-win32-x64 已经跑过，产物目录是空的。2026-10-15 那次就是这么
# 报废了一整轮 bundle（许可证存在性检查读了后面才声明的 const root）。1 秒，先挡住。
Write-Output ("=== STAGE 0/4 build typecheck START " + (& $stamp) + " ===")
node 'D:\oler-ide-v2\scripts\oneoff\check-build-typecheck.mjs'
$rc = $LASTEXITCODE
Write-Output ("=== STAGE 0/4 build typecheck EXITCODE=$rc  " + (& $stamp) + " ===")
if ($rc -ne 0) {
    Write-Output 'build/ 的类型检查没过，按上面列出的文件改完再打包。' -ForegroundColor Red
    exit $rc
}

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

if ($SkipExtensions) {
    Write-Output '=== STAGE 3/4 extensions SKIPPED (reusing .build/extensions) ==='
} else {
    # `-ci` consumes `.build/extensions`; the tasks that fill it hang off the outer
    # vscode-win32-x64 task, which this script does not run because it re-bundles the workbench.
    Write-Output ("=== STAGE 3/4 extensions START " + (& $stamp) + " ===")
    # The three Olympia extensions are NOT in the upstream extension list, so
    # `compile-extensions-build` never touches them and `vscode-win32-x64-ci` just copies whatever
    # `oss/extensions/<ext>/out` already holds. Without this loop a source change ships the
    # previous build silently — measured 2026-10-17: coach/onboarding fixes committed at 15:00
    # came out at 15:07 as byte-identical 12:16 output.
    foreach ($olympiaExt in @('olympia-coach', 'olympia-contest', 'olympia-onboarding')) {
        Push-Location (Join-Path $Oss "extensions\$olympiaExt")
        npm run compile
        if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Output "=== STAGE 3/4 extensions $olympiaExt FAILED ==="; exit $LASTEXITCODE }
        Pop-Location
    }
    node node_modules/gulp/bin/gulp.js compile-extensions-build
    $rc = $LASTEXITCODE
    node node_modules/gulp/bin/gulp.js compile-extension-media
    if ($rc -eq 0) { $rc = $LASTEXITCODE }
    Write-Output ("=== STAGE 3/4 extensions EXITCODE=$rc  " + (& $stamp) + " ===")
    if ($rc -ne 0) { exit $rc }
}

Write-Output ("=== STAGE 3/4 package START " + (& $stamp) + " ===")
node node_modules/gulp/bin/gulp.js vscode-win32-x64-ci
$rc = $LASTEXITCODE
Write-Output ("=== STAGE 3/4 package EXITCODE=$rc  " + (& $stamp) + " ===")
if ($rc -ne 0) { exit $rc }

$dist = Join-Path (Split-Path $Oss -Parent) 'VSCode-win32-x64'

# workbench 自己也得跟源码对得上。`-SkipBundle` 会复用 `out-vscode/`，那意味着
# 「改了产品源码但没重跑 bundle」时，产物里静默是旧代码 —— 2026-10-23 实测踩中：
# 源码里文案已改、状态位已加，产物里搜到的还是旧的，而打包一路 EXITCODE=0。
# 扩展那边已经有同类门（verify-product-extensions.mjs），这里补上 workbench + NLS + CSS。
Write-Output ''
Write-Output '=== 验证产物里的 workbench / NLS / CSS 不是旧源码 ==='
node 'D:\oler-ide-v2\build\verify-product-workbench.mjs' $dist
$wrc = $LASTEXITCODE
if ($wrc -ne 0) {
    Write-Output '产物里的 workbench 不是当前源码编出来的（bundle 或 NLS 没重跑）。' -ForegroundColor Red
    exit $wrc
}

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
Write-Output '=== 验证产物里的三个 Olympia 扩展不是旧编译 ==='
node 'D:\oler-ide-v2\build\verify-product-extensions.mjs' $dist
$erc = $LASTEXITCODE
if ($erc -ne 0) {
    Write-Output '产物里的 Olympia 扩展比源码旧（打包链路没编它们，或 out/ 没重编）。' -ForegroundColor Red
    exit $erc
}
Write-Output ''
Write-Output '=== 验证产物内置编译器 ==='
node 'D:\oler-ide-v2\build\verify-product-toolchain.mjs' $dist
$vrc = $LASTEXITCODE
if ($vrc -ne 0) {
    Write-Output '产物内置编译器不可用。' -ForegroundColor Red
    exit $vrc
}

# The licence texts are the other thing that must be true: scripts/oneoff/check-licence-surface.mjs
# only proves the packaging *code* asks for them, and gulp.src(..., { allowEmpty: true }) silently
# drops a name that matched nothing. This reads the finished directory instead.
Write-Output ''
Write-Output '=== 验证许可证文本进产物 ==='
node 'D:\oler-ide-v2\build\verify-product-licence.mjs' $dist
$lrc = $LASTEXITCODE
if ($lrc -ne 0) {
    Write-Output '产物里缺许可证文本，这是 GPL 合规的底线。' -ForegroundColor Red
    exit $lrc
}

exit 0