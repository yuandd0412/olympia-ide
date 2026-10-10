<#
.SYNOPSIS
    One-shot bootstrap for the bundled C++ toolchain.

.DESCRIPTION
    Fetches and assembles the MinGW-w64 toolchain that ships inside Olympia, then verifies it by
    compiling and running Luogu P1001 with the exact flags the product uses.

    Run this after a fresh clone, or whenever the toolchain version needs to be refreshed. It is
    idempotent: packages already present in the temp cache are reused, and the assembly step can be
    repeated safely.

.PARAMETER Out
    Where to stage the toolchain. Defaults to oss/.build/toolchain. Packaging picks this up
    automatically (see gulpfile.vscode.ts); no further wiring is needed.

.PARAMETER Force
    Re-download every package instead of reusing the cache.

.EXAMPLE
    .\fetch-toolchain.ps1
    Stages and verifies the toolchain in the default location.

.EXAMPLE
    .\fetch-toolchain.ps1 -Force
    Ignores the cache and pulls the newest upstream builds.

.NOTES
    .ps1 is intentionally UTF-8 **with** BOM — Windows PowerShell 5.1 reads BOM-less files as GBK,
    which turns the Chinese progress output into mojibake and can break parsing outright. This is the
    one exception to the project's "UTF-8 no BOM" rule.
#>

[CmdletBinding()]
param(
    [string]$Out = 'D:\oler-ide-v2\oss\.build\toolchain',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$script = 'D:\oler-ide-v2\build\fetch-toolchain.mjs'
if (-not (Test-Path $script)) {
    throw "找不到 $script"
}

# The environment carries a dead proxy (127.0.0.1:7890) that makes every request exit 7.
$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:http_proxy = ''
$env:https_proxy = ''

$args = @($script, "--out=$Out")
if ($Force) { $args += '--force' }

Write-Host "暂存目录: $Out" -ForegroundColor Cyan
& node @args
$code = $LASTEXITCODE

if ($code -ne 0) {
    Write-Host ''
    Write-Host '工具链组装失败。上面的输出包含具体缺失的包或库。' -ForegroundColor Red
    exit $code
}

Write-Host ''
Write-Host '下一步：' -ForegroundColor Green
Write-Host '  1. 打包时 gulpfile.vscode.ts 会自动把 .build/toolchain 收进安装包' -ForegroundColor Gray
Write-Host '  2. 开发模式下 olympia-onboarding 会从 <appRoot>/.build/toolchain 探测内置编译器' -ForegroundColor Gray
Write-Host '  3. 运行 node build\verify-out.mjs 确认断言全过' -ForegroundColor Gray