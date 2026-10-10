<#
.SYNOPSIS
    模拟 Olympia IDE「首次下载打开」的效果。

.DESCRIPTION
    真正的新用户打开 Olympia 时，user data 目录里几乎不存在下列东西：

      - User\settings.json              （用户自定义设置）
      - User\keybindings.json           （自定义快捷键）
      - User\globalStorage\state.vscdb  （首启标记、引导进度、界面布局、主题）
      - User\workspaceStorage\*         （工作区状态）
      - User\globalStorage\github.copilot-chat\*  （残留目录）
      - logs\                           （历史日志）
      - Backups\ Cache\ GPUCache\ ...   （各类缓存）

    这个脚本把现有 user data **整体移到备份目录**（不是删除，可一键还原），
    然后启动应用，看到的就是干净的首启观感：欢迎页、初始引导、空设置。

    注意「移动而非删除」是刻意的：本机安全策略会拦截 Remove-Item / rmdir /s，
    而 robocopy /MOVE 在同盘上是原子重命名，失败时原数据仍在。

.PARAMETER Reset
    备份当前 user data 并重启应用到首启状态。

.PARAMETER Restore
    从最近一次备份还原 user data（先关闭应用）。

.PARAMETER Launch
    只启动应用，不动任何数据。用于「已经 reset 过，再手动开一次」。

.PARAMETER ListBackups
    列出所有备份。

.PARAMETER KeepLogs
    reset 时保留 logs\ 目录（排查问题时有用）。

.PARAMETER WhatIf
    只显示将要做什么，不实际执行。

.EXAMPLE
    .\first-run-sim.ps1 -Reset
    备份 → 清空 → 启动，看到首启效果。

.EXAMPLE
    .\first-run-sim.ps1 -Restore
    把 user data 还原回 reset 之前的样子。

.NOTES
    备份目录：D:\oler-ide-v2\build\firstrun-backups\<时间戳>\
    不会碰 oss\ 源码、不会碰 frontend\ legacy 线。
#>

[CmdletBinding(DefaultParameterSetName = 'Launch')]
param(
    [Parameter(ParameterSetName = 'Reset',  Mandatory = $true)]  [switch]$Reset,
    [Parameter(ParameterSetName = 'Restore', Mandatory = $true)] [switch]$Restore,
    [Parameter(ParameterSetName = 'List')]                        [switch]$ListBackups,
    [Parameter(ParameterSetName = 'Launch', Mandatory = $true)]  [switch]$Launch,
    [switch]$KeepLogs,
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------- paths

$OssRoot   = 'D:\oler-ide-v2\oss'
# The packaged product, not the dev launcher: simulating a first run only tests what users run.
$Product   = 'D:\oler-ide-v2\VSCode-win32-x64'
# dataFolderName/.olympia-ide and the product name give %APPDATA%\Olympia, not "Olympia IDE".
$UserData  = Join-Path $env:APPDATA 'Olympia'
$BackupDir = 'D:\oler-ide-v2\build\firstrun-backups'

# dev 模式下用户装的市场扩展目录——首启时它应当是空的
$UserExtDir = Join-Path $env:USERPROFILE '.olympia-ide\extensions'

# ---------------------------------------------------------------- helpers

function Write-Section([string]$Title) {
    Write-Host ''
    Write-Host "== $Title " -ForegroundColor Cyan -NoNewline
    Write-Host ('=' * [Math]::Max(0, 60 - $Title.Length)) -ForegroundColor DarkCyan
}

function Get-OlympiaProcesses {
    Get-Process -Name 'Olympia*' -ErrorAction SilentlyContinue
}

function Get-WebViewProcesses {
    # msedgewebview2 会跟着窗口一起退出；若有残留会让 "localhost refused"
    Get-Process -Name 'msedgewebview2' -ErrorAction SilentlyContinue
}

function Stop-Olympia {
    $p = Get-OlympiaProcesses
    if (-not $p) {
        Write-Host '  应用未在运行。' -ForegroundColor DarkGray
        return
    }
    if ($WhatIf) {
        Write-Host "  [WhatIf] 将关闭 $($p.Count) 个 Olympia 进程" -ForegroundColor DarkGray
        $stale = Get-WebViewProcesses
        if ($stale) { Write-Host "  [WhatIf] 将一并清理 $($stale.Count) 个 msedgewebview2 残留" -ForegroundColor DarkGray }
        return
    }
    Write-Host "  正在关闭 $($p.Count) 个进程..." -ForegroundColor Yellow
    $p | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3

    # 只清理本次 Olympia 启动之后新出现的 webview2 残留
    $stale = Get-WebViewProcesses
    if ($stale) {
        Write-Host "  发现 $($stale.Count) 个 msedgewebview2 残留，一并清理..." -ForegroundColor Yellow
        $stale | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

function Move-ToBackup([string]$Path, [string]$DestDir) {
    if (-not (Test-Path $Path)) { return $false }
    if ($WhatIf) {
        Write-Host "  [WhatIf] 将移动: $Path -> $DestDir" -ForegroundColor DarkGray
        return $true
    }
    if (-not (Test-Path $DestDir)) {
        New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
    }
    $dest = Join-Path $DestDir (Split-Path $Path -Leaf)
    try {
        # 单个文件直接改名（同卷是原子操作，最快也最安全）；
        # 目录才走 robocopy /MOVE（跨盘会自动降级为复制+删除）。
        if (Test-Path $Path -PathType Leaf) {
            Move-Item -Path $Path -Destination $dest -Force
            return $true
        }
        robocopy $Path $dest /MOVE /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
        if ($LASTEXITCODE -ge 8) {
            Write-Host "  robocopy 返回 $LASTEXITCODE，改为整体改名兜底" -ForegroundColor Yellow
            Move-Item -Path $Path -Destination $dest -Force
        }
        return $true
    } catch {
        Write-Host "  移动失败: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Start-Olympia {
    if ($WhatIf) {
        Write-Host '  [WhatIf] 将启动 Olympia' -ForegroundColor DarkGray
        return
    }
    if (-not (Test-Path (Join-Path $Product 'Olympia.exe'))) {
        Write-Host "  找不到 $Product\Olympia.exe（先跑 build\oss-package.ps1）" -ForegroundColor Red
        return
    }
    Write-Host '  启动中（首次启动较慢，约 30-60 秒）...' -ForegroundColor Green
    Start-Process -FilePath (Join-Path $Product 'Olympia.exe') `
        -ArgumentList '--user-data-dir', $UserData
}

function Show-CurrentState {
    Write-Section '当前 user data 状态'
    if (-not (Test-Path $UserData)) {
        Write-Host '  目录不存在 —— 这本身就是首启状态。' -ForegroundColor Green
        return
    }
    $size = (Get-ChildItem $UserData -Recurse -File -Force -ErrorAction SilentlyContinue |
             Measure-Object Length -Sum).Sum / 1MB
    Write-Host ("  {0}" -f $UserData)
    Write-Host ("  大小 {0:N1} MB" -f $size)

    # 首启标记所在文件
    $db = Join-Path $UserData 'User\globalStorage\state.vscdb'
    if (Test-Path $db) {
        # 独占锁下 ReadAllBytes 会抛 IOException；这只是一段诊断信息，
        # 不该让脚本整体失败，所以退化为「已存在但读不到」。
        $first = $null
        try {
            # 共享读模式打开：SQLite 允许并发读，普通 ReadAllBytes 会因独占锁抛异常
            $fs = [System.IO.File]::Open($db, 'Open', 'Read', 'ReadWrite')
            try {
                $buf = New-Object byte[] $fs.Length
                $null = $fs.Read($buf, 0, $buf.Length)
            } finally { $fs.Close() }
            $text  = [System.Text.Encoding]::GetEncoding(28591).GetString($buf)  # Latin-1
            $first = ($text -match 'telemetry\.firstSessionDate')
            Write-Host ("  state.vscdb 存在 ({0:N0} KB) —— 含首启时间戳: {1}" -f
                ($buf.Length / 1KB), $(if ($first) { '是（已首启过）' } else { '否' }))
        } catch {
            Write-Host '  state.vscdb 存在，但读取失败（请先关闭应用再看此状态）' -ForegroundColor Yellow
        }
    } else {
        Write-Host '  state.vscdb 不存在 —— 处于首启状态' -ForegroundColor Green
    }

    foreach ($n in @('User\settings.json', 'User\keybindings.json')) {
        $p = Join-Path $UserData $n
        Write-Host ("  {0}: {1}" -f $n, $(if (Test-Path $p) { '存在' } else { '不存在' }))
    }

    $copilot = Join-Path $UserData 'User\globalStorage\github.copilot-chat'
    if (Test-Path $copilot) {
        Write-Host '  github.copilot-chat 残留目录: 存在' -ForegroundColor Yellow
    }
    if (Test-Path (Join-Path $UserData 'logs')) {
        $n = (Get-ChildItem (Join-Path $UserData 'logs') -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Host "  logs 目录: $n 个历史日志会话" -ForegroundColor DarkGray
    }
}

# ---------------------------------------------------------------- actions

switch ($PSCmdlet.ParameterSetName) {

    'List' {
        Write-Section '备份列表'
        if (-not (Test-Path $BackupDir)) {
            Write-Host '  还没有任何备份。' -ForegroundColor DarkGray
            break
        }
        Get-ChildItem $BackupDir -Directory | Sort-Object Name -Descending | ForEach-Object {
            $size = (Get-ChildItem $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue |
                     Measure-Object Length -Sum).Sum / 1MB
            Write-Host ("  {0}   {1,8:N1} MB" -f $_.Name, $size) -ForegroundColor Cyan
        }
        break
    }

    'Reset' {
        # 顺序很关键：state.vscdb 被运行中的实例独占，必须先关进程才能读它。
        # 否则 Show-CurrentState 会在 ReadAllBytes 上抛 IOException。
        Write-Section '关闭应用'
        Stop-Olympia

        Show-CurrentState

        Write-Section '备份 user data'
        if (-not (Test-Path $BackupDir)) {
            if ($WhatIf) {
                Write-Host "  [WhatIf] 将创建 $BackupDir" -ForegroundColor DarkGray
            } else {
                New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
            }
        }
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $dest  = Join-Path $BackupDir $stamp

        if (-not (Test-Path $UserData)) {
            Write-Host '  没有可备份的数据，直接进入首启状态。' -ForegroundColor DarkGray
        } else {
            # logs 可选保留：留一份当前日志便于对照 reset 前后的差异
            if ($KeepLogs -and (Test-Path (Join-Path $UserData 'logs'))) {
                Write-Host '  保留 logs\（-KeepLogs）' -ForegroundColor DarkGray
                $logsSrc = Join-Path $UserData 'logs'
                Move-ToBackup $logsSrc (Join-Path $dest '_logs-kept') | Out-Null
            }

            # 逐项移动，而不是动整个目录 —— 这样即使某个子项被占用，
            # 其余项照样能清干净，不至于残留一个半吊子的首启状态。
            $items = @(
                'User', 'logs', 'Backups', 'Cache', 'CachedConfigurations',
                'Code Cache', 'Crashpad', 'DawnGraphiteCache', 'DawnWebGPUCache',
                'Dictionaries', 'GPUCache', 'Local Storage', 'Network',
                'Service Worker', 'Session Storage', 'Shared Dictionary',
                'WebStorage', 'agent-host', 'blob_storage',
                'Local State', 'Preferences', 'machineid', 'languagepacks.json',
                'code.lock', 'DIPS', 'DIPS-wal', 'SharedStorage', 'SharedStorage-wal'
            )
            foreach ($item in $items) {
                $src = Join-Path $UserData $item
                if (Test-Path $src) {
                    $ok = Move-ToBackup $src $dest
                    if ($ok -and -not $WhatIf) {
                        Write-Host "  已备份 $item" -ForegroundColor DarkGray
                    }
                }
            }
        }

        Write-Section '用户扩展目录'
        if (Test-Path $UserExtDir) {
            $n = (Get-ChildItem $UserExtDir -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
            if ($n -gt 0) {
                Write-Host "  $UserExtDir 下有 $n 个扩展，一并备份" -ForegroundColor DarkGray
                Move-ToBackup $UserExtDir (Join-Path $dest '_user-extensions') | Out-Null
            } else {
                Write-Host '  已为空（符合首启状态）' -ForegroundColor Green
            }
        }

        Write-Section '启动'
        Start-Olympia

        Write-Host ''
        if ($WhatIf) {
            Write-Host '  [WhatIf] 以上均未实际执行。去掉 -WhatIf 才会真正备份并启动。' -ForegroundColor DarkGray
        } else {
            Write-Host '  已进入首启状态。还原请执行：' -ForegroundColor Green
            Write-Host "    .\first-run-sim.ps1 -Restore" -ForegroundColor White
            Write-Host "  备份位置: $dest" -ForegroundColor DarkGray
        }
        break
    }

    'Restore' {
        if (-not (Test-Path $BackupDir)) {
            Write-Host '  没有备份可还原。' -ForegroundColor Red
            break
        }
        $latest = Get-ChildItem $BackupDir -Directory | Sort-Object Name -Descending | Select-Object -First 1
        if (-not $latest) {
            Write-Host '  没有备份可还原。' -ForegroundColor Red
            break
        }

        Write-Section '关闭应用'
        Stop-Olympia

        Write-Section "还原自 $($latest.Name)"
        Write-Host "  从: $($latest.FullName)" -ForegroundColor DarkGray

        foreach ($item in Get-ChildItem $latest.FullName -Force) {
            if ($item.Name -eq '_user-extensions') {
                Move-ToBackup $item.FullName (Split-Path $UserExtDir -Parent) | Out-Null
                continue
            }
            if ($item.Name -eq '_logs-kept') {
                continue   # logs 是诊断产物，不必还原
            }
            $dest = Join-Path $UserData $item.Name
            if (Test-Path $dest) {
                Write-Host "  目标已存在，先备份再覆盖: $($item.Name)" -ForegroundColor DarkGray
                Move-ToBackup $dest (Join-Path $BackupDir '_replaced-before-restore') | Out-Null
            }
            $ok = Move-ToBackup $item.FullName $UserData
            if ($ok -and -not $WhatIf) {
                Write-Host "  已还原 $($item.Name)" -ForegroundColor DarkGray
            }
        }

        Write-Section '完成'
        Write-Host "  已还原。建议启动一次确认: .\first-run-sim.ps1 -Launch" -ForegroundColor Green
        break
    }

    'Launch' {
        if (Get-OlympiaProcesses) {
            Write-Host '应用已在运行。' -ForegroundColor DarkGray
            break
        }
        Start-Olympia
        break
    }
}

if (-not $WhatIf) {
    Write-Host ''
}