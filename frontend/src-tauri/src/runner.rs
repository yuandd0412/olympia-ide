use crate::models::{RunResult, TestCaseInput, TestCaseResult};
use std::path::PathBuf;
use std::process::Stdio;
use std::time::Instant;
use tokio::io::AsyncWriteExt;
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

    let comp = compiler_path.unwrap_or_else(|| "g++");
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

    let comp_output = comp_cmd
        .output()
        .await
        .map_err(|e| format!("Failed to invoke compiler '{}': {}", comp, e))?;

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
    cmd.arg("/C")
        .arg(format!("\"{}\" & pause", exe_path.display()));
    if let Some(dir) = exe_path.parent() {
        cmd.current_dir(dir);
    }
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NEW_CONSOLE);
    cmd.spawn()
        .map_err(|e| format!("Failed to launch console window: {}", e))?;
    Ok(exe_path.to_string_lossy().into_owned())
}

pub async fn execute_code(
    source_code: String,
    testcases: Vec<TestCaseInput>,
    compiler_path: Option<String>,
    flags: Option<Vec<String>>,
    time_limit_ms: Option<u64>,
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
                worst_verdict = "RE".to_string();
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

        let exec_res = timeout(t_limit, child.wait_with_output()).await;
        let elapsed = start.elapsed().as_millis() as u64;
        total_time += elapsed;

        match exec_res {
            Ok(Ok(output)) => {
                let actual = String::from_utf8_lossy(&output.stdout).to_string();
                let actual_err = String::from_utf8_lossy(&output.stderr).to_string();

                if !output.status.success() {
                    results.push(TestCaseResult {
                        id: tc.id,
                        input: tc.input,
                        expected_output: tc.expected_output,
                        actual_output: actual,
                        verdict: "RE".to_string(),
                        time_ms: elapsed,
                        memory_kb: 1024,
                        error_message: Some(if actual_err.is_empty() {
                            format!("Process exited with status: {}", output.status)
                        } else {
                            actual_err
                        }),
                    });
                    all_ac = false;
                    if worst_verdict == "AC" {
                        worst_verdict = "RE".to_string();
                    }
                } else {
                    let norm_exp = normalize_output(&tc.expected_output);
                    let norm_act = normalize_output(&actual);

                    let verdict = if norm_exp == norm_act {
                        "AC".to_string()
                    } else {
                        all_ac = false;
                        if worst_verdict == "AC" {
                            worst_verdict = "WA".to_string();
                        }
                        "WA".to_string()
                    };

                    results.push(TestCaseResult {
                        id: tc.id,
                        input: tc.input,
                        expected_output: tc.expected_output,
                        actual_output: actual,
                        verdict,
                        time_ms: elapsed,
                        memory_kb: 1024,
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
                    memory_kb: 0,
                    error_message: Some(e.to_string()),
                });
                all_ac = false;
                worst_verdict = "RE".to_string();
            }
            Err(_) => {
                // Time Limit Exceeded
                results.push(TestCaseResult {
                    id: tc.id,
                    input: tc.input,
                    expected_output: tc.expected_output,
                    actual_output: String::new(),
                    verdict: "TLE".to_string(),
                    time_ms: t_limit.as_millis() as u64,
                    memory_kb: 0,
                    error_message: Some("Time Limit Exceeded".to_string()),
                });
                all_ac = false;
                worst_verdict = "TLE".to_string();
            }
        }
        max_mem = max_mem.max(1024);
    }

    let _ = tokio::fs::remove_file(&src_path).await;
    let _ = tokio::fs::remove_file(&exe_path).await;

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

pub async fn execute_terminal_command(
    command_str: String,
    cwd: Option<String>,
) -> Result<crate::models::TerminalCommandResult, String> {
    let start = Instant::now();
    let mut cmd = if cfg!(windows) {
        let mut c = Command::new("powershell");
        c.arg("-NoProfile").arg("-Command").arg(&command_str);
        c
    } else {
        let mut c = Command::new("sh");
        c.arg("-c").arg(&command_str);
        c
    };

    if let Some(dir) = cwd {
        if !dir.is_empty() {
            cmd.current_dir(dir);
        }
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    headless(&mut cmd);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let duration_ms = start.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    Ok(crate::models::TerminalCommandResult {
        exit_code,
        stdout,
        stderr,
        duration_ms,
    })
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
