use crate::models::{StressRoundResult, StressTestResult};
use crate::runner::headless;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

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

async fn compile_target(
    temp_dir: &PathBuf,
    name: &str,
    source_code: &str,
    compiler_path: &str,
    flags: &[String],
) -> Result<PathBuf, String> {
    let src_path = temp_dir.join(format!("{}.cpp", name));
    let exe_path = if cfg!(windows) {
        temp_dir.join(format!("{}.exe", name))
    } else {
        temp_dir.join(format!("{}", name))
    };

    tokio::fs::write(&src_path, source_code)
        .await
        .map_err(|e| format!("Failed to write source {}: {}", name, e))?;

    let mut cmd = Command::new(compiler_path);
    for f in flags {
        cmd.arg(f);
    }
    cmd.arg(&src_path).arg("-o").arg(&exe_path);
    headless(&mut cmd);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to invoke compiler for {}: {}", name, e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        let out = String::from_utf8_lossy(&output.stdout).to_string();
        return Err(format!(
            "[{}] 编译失败:\n{}",
            name,
            if err.is_empty() { out } else { err }
        ));
    }

    Ok(exe_path)
}

async fn run_binary_with_input(
    exe_path: &PathBuf,
    input: Option<&str>,
    time_limit: Duration,
) -> Result<(String, Option<u64>), String> {
    let mut cmd = Command::new(exe_path);
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    headless(&mut cmd);
    // The timeout branch below kills the child explicitly; kill_on_drop stays
    // as a safety net (see runner.rs note).
    cmd.kill_on_drop(true);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {}", exe_path.display(), e))?;

    if let Some(inp) = input {
        if let Some(mut stdin) = child.stdin.take() {
            let data = inp.to_string();
            tokio::spawn(async move {
                let _ = stdin.write_all(data.as_bytes()).await;
                let _ = stdin.flush().await;
            });
        }
    }

    // Taken while the process is alive; the peak-memory sample below is only
    // readable once the run has finished (see runner::ProcessHandle).
    let proc_handle = crate::runner::ProcessHandle::from_child(&child);

    // Drain stdout/stderr concurrently like wait_with_output does, but keep
    // the child owned outside the timed future so the timeout branch can
    // kill it explicitly instead of relying on drop ordering.
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

    match timeout(time_limit, child.wait()).await {
        Ok(Ok(status)) => {
            if !status.success() {
                let err =
                    String::from_utf8_lossy(&read_stderr.await.unwrap_or_default()).to_string();
                return Err(if err.is_empty() {
                    format!("Exit status: {}", status)
                } else {
                    err
                });
            }
            let mem = proc_handle
                .as_ref()
                .and_then(crate::runner::ProcessHandle::peak_memory_kb);
            Ok((String::from_utf8_lossy(&read_stdout.await.unwrap_or_default()).to_string(), mem))
        }
        Ok(Err(e)) => Err(format!("Process error: {}", e)),
        Err(_) => {
            // Timeout: kill the child outright and reap it so nothing leaks.
            let _ = child.kill().await;
            let _ = child.wait().await;
            Err("Time Limit Exceeded".to_string())
        }
    }
}

pub async fn execute_stress_test(
    sol_code: String,
    brute_code: String,
    gen_code: String,
    max_rounds: usize,
    time_limit_ms: Option<u64>,
    compiler_path: Option<String>,
    flags: Option<Vec<String>>,
) -> Result<StressTestResult, String> {
    let temp_dir = std::env::temp_dir().join(format!("oler_stress_{}", uuid::Uuid::new_v4()));
    tokio::fs::create_dir_all(&temp_dir)
        .await
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let comp = crate::toolchain::resolve_compiler(
        compiler_path.as_deref().unwrap_or("g++"),
    )
    .await;
    let comp_flags = flags.unwrap_or_else(|| {
        vec![
            "-O2".to_string(),
            "-std=c++17".to_string(),
            "-Wall".to_string(),
        ]
    });

    // 1. Compile Solution
    let sol_exe = match compile_target(&temp_dir, "solution", &sol_code, &comp, &comp_flags).await {
        Ok(p) => p,
        Err(err) => {
            let _ = tokio::fs::remove_dir_all(&temp_dir).await;
            return Ok(StressTestResult {
                total_rounds: 0,
                passed_rounds: 0,
                success: false,
                is_compilation_error: true,
                compiler_output: err,
                failed_round: None,
                max_sol_memory_kb: None,
            });
        }
    };

    // 2. Compile Brute-force / Standard
    let brute_exe = match compile_target(&temp_dir, "brute", &brute_code, &comp, &comp_flags).await {
        Ok(p) => p,
        Err(err) => {
            let _ = tokio::fs::remove_dir_all(&temp_dir).await;
            return Ok(StressTestResult {
                total_rounds: 0,
                passed_rounds: 0,
                success: false,
                is_compilation_error: true,
                compiler_output: err,
                failed_round: None,
                max_sol_memory_kb: None,
            });
        }
    };

    // 3. Compile Generator
    let gen_exe = match compile_target(&temp_dir, "generator", &gen_code, &comp, &comp_flags).await {
        Ok(p) => p,
        Err(err) => {
            let _ = tokio::fs::remove_dir_all(&temp_dir).await;
            return Ok(StressTestResult {
                total_rounds: 0,
                passed_rounds: 0,
                success: false,
                is_compilation_error: true,
                compiler_output: err,
                failed_round: None,
                max_sol_memory_kb: None,
            });
        }
    };

    let t_limit = Duration::from_millis(time_limit_ms.unwrap_or(2000));
    let mut passed_rounds = 0;
    let mut failed_round = None;
    let mut max_sol_memory: Option<u64> = None;

    for round in 1..=max_rounds {
        // Run generator
        let input_data = match run_binary_with_input(&gen_exe, None, Duration::from_millis(3000)).await
        {
            Ok((inp, _mem)) => inp,
            Err(e) => {
                failed_round = Some(StressRoundResult {
                    round,
                    passed: false,
                    input: String::new(),
                    sol_output: String::new(),
                    brute_output: String::new(),
                    error_msg: Some(format!("数据生成器异常: {}", e)),
                    sol_memory_kb: None,
                });
                break;
            }
        };

        // Run Solution
        let sol_res = run_binary_with_input(&sol_exe, Some(&input_data), t_limit).await;
        // Run Brute
        let brute_res = run_binary_with_input(&brute_exe, Some(&input_data), t_limit).await;

        match (sol_res, brute_res) {
            (Ok((sol_out, sol_mem)), Ok((brute_out, _brute_mem))) => {
                max_sol_memory = max_sol_memory.max(sol_mem);
                let norm_sol = normalize_output(&sol_out);
                let norm_brute = normalize_output(&brute_out);

                if norm_sol == norm_brute {
                    passed_rounds += 1;
                } else {
                    failed_round = Some(StressRoundResult {
                        round,
                        passed: false,
                        input: input_data,
                        sol_output: sol_out,
                        brute_output: brute_out,
                        error_msg: Some("答案不一致 (Wrong Answer on Stress Test)".to_string()),
                        sol_memory_kb: sol_mem,
                    });
                    break;
                }
            }
            (Err(e), _) => {
                failed_round = Some(StressRoundResult {
                    round,
                    passed: false,
                    input: input_data,
                    sol_output: String::new(),
                    brute_output: String::new(),
                    error_msg: Some(format!("待测代码运行异常 / 超时: {}", e)),
                    sol_memory_kb: None,
                });
                break;
            }
            (Ok((_, sol_mem)), Err(e)) => {
                max_sol_memory = max_sol_memory.max(sol_mem);
                failed_round = Some(StressRoundResult {
                    round,
                    passed: false,
                    input: input_data,
                    sol_output: String::new(),
                    brute_output: String::new(),
                    error_msg: Some(format!("暴力标准程序运行异常 / 超时: {}", e)),
                    sol_memory_kb: sol_mem,
                });
                break;
            }
        }
    }

    // Clean up temporary files; a killed binary's leftover process can keep
    // the dir locked briefly, so retry in the background instead of leaking it.
    if tokio::fs::remove_dir_all(&temp_dir).await.is_err() {
        crate::runner::delete_best_effort(temp_dir, true);
    }

    let success = failed_round.is_none() && passed_rounds == max_rounds;

    Ok(StressTestResult {
        total_rounds: max_rounds,
        passed_rounds,
        success,
        is_compilation_error: false,
        compiler_output: String::new(),
        failed_round,
        max_sol_memory_kb: max_sol_memory,
    })
}
