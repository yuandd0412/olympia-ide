$ErrorActionPreference = 'Continue'

# NOTE: keep this file pure ASCII. Editing a .ps1 that contains CJK comments
# can merge a comment line with the next code line, silently commenting out
# the assignment below.

$env:HTTP_PROXY = ''
$env:HTTPS_PROXY = ''
$env:http_proxy = ''
$env:https_proxy = ''
$env:npm_config_proxy = ''
$env:npm_config_https_proxy = ''
$env:npm_config_noproxy = '*'

# The user's ~/.npmrc points proxy at 127.0.0.1:7890 (dead port).
# postinstall.ts spawns child `npm install` processes that do NOT inherit our
# CLI flags and re-read ~/.npmrc. Point NPM_CONFIG_USERCONFIG at a proxy-free
# config so parent and children all bypass it, without editing the user file.
$env:NPM_CONFIG_USERCONFIG = 'D:\oler-ide-v2\build\npmrc-clean'

Write-Output ('NPM_CONFIG_USERCONFIG = ' + $env:NPM_CONFIG_USERCONFIG)
Write-Output ('  file exists        = ' + (Test-Path $env:NPM_CONFIG_USERCONFIG))
Write-Output ('  proxy              = ' + (& npm config get proxy 2>$null))
Write-Output ('  https-proxy        = ' + (& npm config get https-proxy 2>$null))
Write-Output ('  registry           = ' + (& npm config get registry 2>$null))

# Electron headers are pre-seeded (sha256 verified). Pinning devdir avoids the
# race where a parallel native build starts before headers finish downloading.
$devdir = Join-Path $env:USERPROFILE '.electron-gyp'
$env:npm_config_devdir = $devdir
# Windows dev mode is OFF on this machine: symlink creation needs admin.
# extensions/microsoft-authentication depends on file:./packageMocks/keytar;
# npm_config_install_links makes npm COPY file: deps instead of symlinking.
# It must be an env var (not a CLI flag) so postinstall's child npm sees it.
$env:npm_config_install_links = 'true'
Write-Output ('node-gyp devdir     = ' + $devdir)
Write-Output ('  js_native_api.h    = ' + (Test-Path (Join-Path $devdir '43.7.3\include\node\js_native_api.h')))

$vcvars = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat'
Write-Output '=== importing MSVC env ==='
cmd /c "`"$vcvars`" >nul 2>&1 && set" | ForEach-Object {
  if ($_ -match '^([^=]+)=(.*)$') { Set-Item -Path "env:$($matches[1])" -Value $matches[2] }
}
$cl = Get-Command cl.exe -ErrorAction SilentlyContinue
Write-Output ('cl.exe = ' + $(if ($cl) { $cl.Source } else { 'NOT FOUND' }))
Write-Output ('node   = ' + (node -v) + '   npm = ' + (npm -v))
Write-Output ('USERPROFILE survived vcvars = ' + $env:USERPROFILE)
Write-Output ('NPM_CONFIG_USERCONFIG after vcvars = ' + $env:NPM_CONFIG_USERCONFIG)

Set-Location 'D:\oler-ide-v2\oss'
Write-Output ('=== npm ci START ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ===')
npm ci --no-audit --no-fund
$rc = $LASTEXITCODE
Write-Output ('=== npm ci EXITCODE=' + $rc + '  ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ===')
Write-Output ('node_modules exists = ' + (Test-Path 'D:\oler-ide-v2\oss\node_modules'))
if (Test-Path 'D:\oler-ide-v2\oss\node_modules') {
  Write-Output ('node_modules entries = ' + (Get-ChildItem 'D:\oler-ide-v2\oss\node_modules' | Measure-Object).Count)
}
exit $rc
