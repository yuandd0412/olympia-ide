$proc = Start-Process -FilePath "D:\oler-ide-v2\frontend\src-tauri\target\debug\app.exe" -PassThru
Start-Sleep -Milliseconds 3000
if ($proc.HasExited) {
    Write-Host "EXITED_EARLY ExitCode=$($proc.ExitCode)"
} else {
    Write-Host "RUNNING PID=$($proc.Id)"
    Stop-Process -Id $proc.Id -Force
    Write-Host "SMOKE_TEST_PASS"
}
