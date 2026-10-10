use crate::models::{RunResult, TestCaseInput, TestCaseResult};
use std::path::PathBuf;
use std::process::Stdio;
use std::time::Instant;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

/// Clean compare output string according to standard OI rules:
/// Trailing whitespace on each line is stripped, trailing empty lines are removed.
fn normalize_output(s: &str) -> Vec<String> {
    let mut lines: Vec<String> = s
        .lines()
        .map(|l| l.trim_end().to_string())
        .collect();
    while let Some(last) = lines.last() {
        if last.is_empty() {
            lines.pop();
        } else {
            break;
        }
    }
    lines
}

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;
#[cfg(windows)]
const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;

/// Suppress the flashing console window for headless spawns (compile/judge).
pub(crate) fn headless(cmd: &mut Command) -> &mut Command {
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

/// Background best-effort delete with short retries. After a timeout kill,
/// the victim's orphaned grandchildren (or Windows releasing the last file
/// handle) can keep the path locked for a moment; a locked temp file must
/// not turn into litter. Silent on final failure by design.
pub(crate) fn delete_best_effort(path: PathBuf, is_dir: bool) {
    tokio::spawn(async move {
        for _ in 0..10 {
            let res = if is_dir {
                tokio::fs::remove_dir_all(&path).await
            } else {
                tokio::fs::remove_file(&path).await
            };
            if res.is_ok() {
                return;
            }
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
    });
}

/// Peak working set (KB) of a process with an open handle, via
/// GetProcessMemoryInfo. Works on a terminated process as long as a handle to
/// it is still held - see [`ProcessHandle`], which is what the judge uses.
#[cfg(windows)]
pub(crate) fn peak_memory_kb_from_handle(handle: windows_sys::Win32::Foundation::HANDLE) -> Option<u64> {
    use windows_sys::Win32::System::ProcessStatus::{
        GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS,
    };
    let mut counters = PROCESS_MEMORY_COUNTERS {
        cb: std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32,
        PageFaultCount: 0,
        PeakWorkingSetSize: 0,
        WorkingSetSize: 0,
        QuotaPeakPagedPoolUsage: 0,
        QuotaPagedPoolUsage: 0,
        QuotaPeakNonPagedPoolUsage: 0,
        QuotaNonPagedPoolUsage: 0,
        PagefileUsage: 0,
        PeakPagefileUsage: 0,
    };
    let ok = unsafe { GetProcessMemoryInfo(handle, &mut counters, counters.cb) };
    if ok != 0 && counters.PeakWorkingSetSize > 0 {
        Some(counters.PeakWorkingSetSize as u64 / 1024)
    } else {
        None
    }
}

/// An owned handle to a spawned child, taken while the process is still alive.
///
/// tokio closes the child's own handle as soon as `wait()` reaps it, so
/// `GetProcessMemoryInfo` can no longer be aimed at a run that has finished —
/// which is exactly when the judge wants the peak working set. Holding our own
/// handle keeps the process object (and its accounting data) queryable until we
/// close it. Sample with [`ProcessHandle::peak_memory_kb`], drop normally.
#[cfg(windows)]
pub(crate) struct ProcessHandle(windows_sys::Win32::Foundation::HANDLE);

#[cfg(windows)]
impl ProcessHandle {
    /// `PROCESS_QUERY_INFORMATION | PROCESS_VM_READ`: the access rights
    /// `GetProcessMemoryInfo` requires (the limited-information right is not enough).
    pub(crate) fn from_child(child: &tokio::process::Child) -> Option<Self> {
        use windows_sys::Win32::System::Threading::{
            OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ,
        };
        let pid = child.id()?;
        let handle =
            unsafe { OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, pid) };
        if handle == 0 {
            None
        } else {
            Some(Self(handle))
        }
    }

    pub(crate) fn peak_memory_kb(&self) -> Option<u64> {
        peak_memory_kb_from_handle(self.0)
    }
}

#[cfg(windows)]
impl Drop for ProcessHandle {
    fn drop(&mut self) {
        unsafe { windows_sys::Win32::Foundation::CloseHandle(self.0) };
    }
}

/// No peak-memory sampling off Windows; callers see "not measured" (0 KB).
#[cfg(not(windows))]
#[derive(Debug)]
pub(crate) struct ProcessHandle;

#[cfg(not(windows))]
impl ProcessHandle {
    pub(crate) fn from_child(_child: &tokio::process::Child) -> Option<Self> {
        None
    }

    pub(crate) fn peak_memory_kb(&self) -> Option<u64> {
        None
    }
}

/// Write source to the runner temp dir and compile it headlessly.
/// Ok returns (src, exe, combined compiler output for warning display);
/// on compile failure Err carries the diagnostics and the source is cleaned up.
async fn write_and_compile(
    source_code: &str,
    compiler_path: Option<&str>,
    flags: Option<&Vec<String>>,
) -> Result<(PathBuf, PathBuf, String), String> {
    let temp_dir = std::env::temp_dir().join("oler_ide_runner");
    tokio::fs::create_dir_all(&temp_dir)
        .await
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let session_id = uuid::Uuid::new_v4().to_string();
    let src_path: PathBuf = temp_dir.join(format!("{}.cpp", session_id));
    let exe_path: PathBuf = if cfg!(windows) {
        temp_dir.join(format!("{}.exe", session_id))
    } else {
        temp_dir.join(format!("{}", session_id))
    };

    tokio::fs::write(&src_path, source_code)
        .await
        .map_err(|e| format!("Failed to write source file: {}", e))?;

    // 编译器解析：裸默认 "g++"/失效路径在新设备上回退到内置/已安装工具链
    let comp = crate::toolchain::resolve_compiler(compiler_path.as_deref().unwrap_or("g++")).await;
    let mut comp_cmd = Command::new(&comp);

    if let Some(f) = flags {
        for flag in f {
            comp_cmd.arg(flag);
        }
    } else {
        comp_cmd
            .arg("-O2")
            .arg("-std=c++17")
            .arg("-Wall")
            .arg("-Wextra");
    }

    comp_cmd.arg(&src_path).arg("-o").arg(&exe_path);
    headless(&mut comp_cmd);

    let comp_output = match comp_cmd.output().await {
        Ok(o) => o,
        Err(e) => {
            // Invoke failure (compiler missing / not executable) must still
            // delete the source; the compile-failure path below does the same.
            let _ = tokio::fs::remove_file(&src_path).await;
            return Err(format!("Failed to invoke compiler '{}': {}", comp, e));
        }
    };

    let stderr = String::from_utf8_lossy(&comp_output.stderr).to_string();
    let stdout = String::from_utf8_lossy(&comp_output.stdout).to_string();
    let combined = if stderr.is_empty() { stdout } else { stderr };

    if !comp_output.status.success() {
        let _ = tokio::fs::remove_file(&src_path).await;
        return Err(combined);
    }

    Ok((src_path, exe_path, combined))
}

/// Dev-C++ style run: compile headlessly, then open a NEW console window
/// running the program interactively; "& pause" keeps the window alive
/// after program exit so the user can read the output.
#[tauri::command]
pub async fn run_in_console(
    source_code: String,
    compiler_path: Option<String>,
    flags: Option<Vec<String>>,
) -> Result<String, String> {
    let (_src_path, exe_path, _compiler_output) =
        write_and_compile(&source_code, compiler_path.as_deref(), flags.as_ref()).await?;

    let mut cmd = Command::new("cmd");
    // Separate args: std quotes exe_path only when needed. Hand-rolling quotes
    // here breaks cmd.exe (it rejects \" escapes, unlike argv parsers).
    cmd.arg("/C")
        .arg(exe_path.display().to_string())
        .arg("&")
        .arg("pause");
    if let Some(dir) = exe_path.parent() {
        cmd.current_dir(dir);
    }
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NEW_CONSOLE);
    let spawn_res = cmd.spawn();
    // Compilation is done: the source is dead weight from here on. Delete it
    // on both exit paths (spawn failure included) - the exe must survive
    // because the console window is running it, but the .cpp used to leak.
    let _ = tokio::fs::remove_file(&_src_path).await;
    spawn_res.map_err(|e| format!("Failed to launch console window: {}", e))?;
    Ok(exe_path.to_string_lossy().into_owned())
}

/// 判定严格度排序，与评测机的呈现顺序一致：RE > TLE > MLE > WA > AC。
/// 汇总一次运行的最差判定时用这个函数，而不是"只在仍为 AC 时才覆盖"——
/// 否则一个后面的 AC/WA 会把已经发生的 RE 或 MLE 冲掉。
fn worse_verdict<'a>(current: &'a str, candidate: &'a str) -> &'a str {
    const RANK: [&str; 5] = ["AC", "WA", "MLE", "TLE", "RE"];
    let rank = |v: &str| RANK.iter().position(|x| *x == v).unwrap_or(0);
    if rank(candidate) > rank(current) {
        candidate
    } else {
        current
    }
}

pub async fn execute_code(
    source_code: String,
    testcases: Vec<TestCaseInput>,
    compiler_path: Option<String>,
    flags: Option<Vec<String>>,
    time_limit_ms: Option<u64>,
    memory_limit_kb: Option<u64>,
) -> Result<RunResult, String> {
    let (src_path, exe_path, full_comp_out) = match write_and_compile(
        &source_code,
        compiler_path.as_deref(),
        flags.as_ref(),
    )
    .await
    {
        Ok(paths) => paths,
        Err(stderr) => {
            return Ok(RunResult {
                success: false,
                is_compilation_error: true,
                compiler_output: stderr,
                testcases: vec![],
                overall_verdict: "CE".to_string(),
                total_time_ms: 0,
                max_memory_kb: 0,
            });
        }
    };

    let t_limit = Duration::from_millis(time_limit_ms.unwrap_or(1000));
    // 262144 KB is the limit the app itself shows for a problem with no stated one
    // (`useAppStore` default), so a run without problem context is judged the same way the
    // problem list would describe it.
    let mem_limit_kb = memory_limit_kb.unwrap_or(262_144);
    let mut results = Vec::new();
    let mut all_ac = true;
    let mut worst_verdict = "AC".to_string();
    let mut total_time = 0u64;
    let mut max_mem = 0u64;

    for tc in testcases {
        let mut run_cmd = Command::new(&exe_path);
        run_cmd
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        headless(&mut run_cmd);
        // The TLE branch below kills the child explicitly; kill_on_drop stays
        // as a safety net for any path that drops the child early.
        run_cmd.kill_on_drop(true);

        let start = Instant::now();
        let mut child = match run_cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                results.push(TestCaseResult {
                    id: tc.id,
                    input: tc.input,
                    expected_output: tc.expected_output,
                    actual_output: String::new(),
                    verdict: "RE".to_string(),
                    time_ms: 0,
                    memory_kb: 0,
                    error_message: Some(format!("Failed to spawn process: {}", e)),
                });
                all_ac = false;
                worst_verdict = worse_verdict(&worst_verdict, "RE").to_string();
                continue;
            }
        };

        if let Some(mut stdin) = child.stdin.take() {
            let inp = tc.input.clone();
            tokio::spawn(async move {
                let _ = stdin.write_all(inp.as_bytes()).await;
                let _ = stdin.flush().await;
            });
        }

        // Grab our own handle now, while the process is certainly alive; the
        // peak-memory sample below can only be read after the run finishes.
        let proc_handle = ProcessHandle::from_child(&child);

        // Drain stdout/stderr concurrently like wait_with_output does, but
        // keep the child owned outside the timed future so the TLE branch
        // can kill it explicitly instead of relying on drop ordering.
        let stdout_pipe = child.stdout.take();
        let stderr_pipe = child.stderr.take();
        let read_stdout = tokio::spawn(async move {
            let mut buf = Vec::new();
            if let Some(mut pipe) = stdout_pipe {
                let _ = pipe.read_to_end(&mut buf).await;
            }
            buf
        });
        let read_stderr = tokio::spawn(async move {
            let mut buf = Vec::new();
            if let Some(mut pipe) = stderr_pipe {
                let _ = pipe.read_to_end(&mut buf).await;
            }
            buf
        });

        let exec_res = timeout(t_limit, child.wait()).await;
        let elapsed = start.elapsed().as_millis() as u64;
        total_time += elapsed;
        // Peak working set of the finished run, read through the handle taken
        // above. 0 means "not measured": a failed Win32 call must not read as a
        // real 1 MB sample, and it must never escalate to MLE.
        let mem_kb = proc_handle
            .as_ref()
            .and_then(ProcessHandle::peak_memory_kb)
            .unwrap_or(0);

        match exec_res {
            Ok(Ok(status)) => {
                let actual =
                    String::from_utf8_lossy(&read_stdout.await.unwrap_or_default()).to_string();
                let actual_err =
                    String::from_utf8_lossy(&read_stderr.await.unwrap_or_default()).to_string();

                if !status.success() {
                    results.push(TestCaseResult {
                        id: tc.id,
                        input: tc.input,
                        expected_output: tc.expected_output,
                        actual_output: actual,
                        verdict: "RE".to_string(),
                        time_ms: elapsed,
                        memory_kb: mem_kb,
                        error_message: Some(if actual_err.is_empty() {
                            format!("Process exited with status: {}", status)
                        } else {
                            actual_err
                        }),
                    });
                    all_ac = false;
                    worst_verdict = worse_verdict(&worst_verdict, "RE").to_string();
                } else {
                    let norm_exp = normalize_output(&tc.expected_output);
                    let norm_act = normalize_output(&actual);

                    let verdict = if mem_kb > mem_limit_kb {
                        "MLE".to_string()
                    } else if norm_exp == norm_act {
                        "AC".to_string()
                    } else {
                        "WA".to_string()
                    };
                    if verdict != "AC" {
                        all_ac = false;
                        worst_verdict = worse_verdict(&worst_verdict, &verdict).to_string();
                    }

                    results.push(TestCaseResult {
                        id: tc.id,
                        input: tc.input,
                        expected_output: tc.expected_output,
                        actual_output: actual,
                        verdict,
                        time_ms: elapsed,
                        memory_kb: mem_kb,
                        error_message: None,
                    });
                }
            }
            Ok(Err(e)) => {
                results.push(TestCaseResult {
                    id: tc.id,
                    input: tc.input,
                    expected_output: tc.expected_output,
                    actual_output: String::new(),
                    verdict: "RE".to_string(),
                    time_ms: elapsed,
                    memory_kb: mem_kb,
                    error_message: Some(e.to_string()),
                });
                all_ac = false;
                worst_verdict = worse_verdict(&worst_verdict, "RE").to_string();
            }
            Err(_) => {
                // Time Limit Exceeded: kill the timed-out child outright and
                // reap it, so no orphan survives and the exe unlocks for cleanup.
                let _ = child.kill().await;
                let _ = child.wait().await;
                results.push(TestCaseResult {
                    id: tc.id,
                    input: tc.input,
                    expected_output: tc.expected_output,
                    actual_output: String::new(),
                    verdict: "TLE".to_string(),
                    time_ms: t_limit.as_millis() as u64,
                    memory_kb: mem_kb,
                    error_message: Some("Time Limit Exceeded".to_string()),
                });
                all_ac = false;
                worst_verdict = worse_verdict(&worst_verdict, "TLE").to_string();
            }
        }
        max_mem = max_mem.max(mem_kb);
    }

    let _ = tokio::fs::remove_file(&src_path).await;
    if tokio::fs::remove_file(&exe_path).await.is_err() {
        // Still locked after the timeout kill (orphaned grandchildren keep the
        // exe open on Windows): keep trying briefly instead of leaking it.
        delete_best_effort(exe_path, false);
    }

    Ok(RunResult {
        success: all_ac,
        is_compilation_error: false,
        compiler_output: full_comp_out,
        testcases: results,
        overall_verdict: if all_ac { "AC".to_string() } else { worst_verdict },
        total_time_ms: total_time,
        max_memory_kb: max_mem,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(windows)]
    #[test]
    fn samples_current_process_peak_memory() {
        use windows_sys::Win32::System::Threading::GetCurrentProcess;
        let handle = unsafe { GetCurrentProcess() };
        let kb = peak_memory_kb_from_handle(handle).expect("GetProcessMemoryInfo should succeed");
        assert!(kb > 0);
    }

    /// The judge samples *after* wait(), so peak memory must survive the child
    /// exiting. If this ever regresses, every case reports "not measured"
    /// (0 KB) and MLE can never fire.
    #[cfg(windows)]
    #[tokio::test]
    async fn samples_peak_memory_of_a_child_that_already_exited() {
        let mut cmd = Command::new("cmd.exe");
        headless(&mut cmd);
        let mut child = cmd
            .args(["/C", "exit", "0"])
            .spawn()
            .expect("spawn child");
        let handle = ProcessHandle::from_child(&child).expect("handle taken while the child runs");
        let status = child.wait().await.expect("wait child");
        assert!(status.success());
        let kb = handle
            .peak_memory_kb()
            .expect("peak memory of an exited child must still be readable");
        assert!(kb > 0);
    }

    #[test]
    fn overall_verdict_prefers_the_stricter_failure() {
        assert_eq!(worse_verdict("AC", "WA"), "WA");
        assert_eq!(worse_verdict("WA", "MLE"), "MLE");
        assert_eq!(worse_verdict("MLE", "TLE"), "TLE");
        assert_eq!(worse_verdict("TLE", "RE"), "RE");
        // 已经拿到的更差判定不能被后面的 AC / WA 冲掉
        assert_eq!(worse_verdict("RE", "AC"), "RE");
        assert_eq!(worse_verdict("MLE", "WA"), "MLE");
        assert_eq!(worse_verdict("MLE", "MLE"), "MLE");
    }

    #[test]
    fn unknown_verdict_never_escalates() {
        assert_eq!(worse_verdict("TLE", "UNKNOWN"), "TLE");
        assert_eq!(worse_verdict("UNKNOWN", "WA"), "WA");
    }

    /// End-to-end MLE check. Needs a working g++, so it is `#[ignore]`d and run
    /// deliberately: `cargo test --lib -- --ignored`.
    #[tokio::test]
    #[ignore]
    async fn a_memory_greedy_run_is_judged_mle() {
        let source = r#"
#include <cstdio>
#include <cstdlib>
int main() {
    volatile long long acc = 0;
    for (int i = 0; i < 40; i++) {
        char* p = (char*) malloc(8ull << 20);
        if (!p) return 1;
        for (int j = 0; j < (8 << 20); j += 4096) p[j] = 1;
        for (int j = 0; j < (8 << 20); j += 4096) acc += p[j];
    }
    printf("%lld\n", acc);
    return 0;
}
"#
        .to_string();
        let res = execute_code(
            source,
            vec![TestCaseInput {
                id: 1,
                input: String::new(),
                expected_output: String::new(),
            }],
            None,
            None,
            Some(20_000),
            Some(65_536),
        )
        .await
        .expect("judge");
        assert_eq!(res.overall_verdict, "MLE", "cases: {:?}", res.testcases);
        assert!(res.testcases[0].memory_kb > 65_536);
        assert!(res.max_memory_kb > 65_536);
    }
}

pub async fn write_temp_code(source_code: String) -> Result<(String, String), String> {
    let temp_dir = std::env::temp_dir().join("oler_ide_runner");
    tokio::fs::create_dir_all(&temp_dir)
        .await
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;
    let session_id = uuid::Uuid::new_v4().to_string();
    let src_path: std::path::PathBuf = temp_dir.join(format!("{}.cpp", session_id));
    let exe_path: std::path::PathBuf = if cfg!(windows) {
        temp_dir.join(format!("{}.exe", session_id))
    } else {
        temp_dir.join(format!("{}", session_id))
    };
    tokio::fs::write(&src_path, source_code)
        .await
        .map_err(|e| format!("Failed to write source code: {}", e))?;
    Ok((src_path.to_string_lossy().to_string(), exe_path.to_string_lossy().to_string()))
}
