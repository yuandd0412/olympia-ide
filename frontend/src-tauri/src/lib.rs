pub mod ai;
pub mod ingest;
pub mod models;
pub mod runner;
pub mod storage;
pub mod stress;

use models::{
    AppSettings, Problem, RunResult, SolveRecord, StressTestResult, TestCaseInput,
    TrainingSession, TerminalCommandResult
};

#[tauri::command]
fn get_settings() -> AppSettings {
    storage::load_settings()
}

#[tauri::command]
fn update_settings(settings: AppSettings) -> Result<(), String> {
    storage::save_settings(&settings)
}

#[tauri::command]
fn get_problems() -> Vec<Problem> {
    storage::load_problems()
}

#[tauri::command]
fn save_problems_list(problems: Vec<Problem>) -> Result<(), String> {
    storage::save_problems(&problems)
}

#[tauri::command]
async fn fetch_problem_online(problem_id: String) -> Result<Problem, String> {
    ingest::fetch_luogu_problem(problem_id).await
}

#[tauri::command]
fn toggle_favorite_problem(problem_id: String) -> Result<Vec<Problem>, String> {
    let mut list = storage::load_problems();
    if let Some(p) = list.iter_mut().find(|x| x.id == problem_id) {
        p.is_favorite = !p.is_favorite;
    }
    storage::save_problems(&list)?;
    Ok(list)
}

#[tauri::command]
fn get_solves() -> Vec<SolveRecord> {
    storage::load_solves()
}

#[tauri::command]
fn record_solve_entry(solve: SolveRecord) -> Result<Vec<SolveRecord>, String> {
    let mut list = storage::load_solves();
    list.insert(0, solve);
    storage::save_solves(&list)?;
    Ok(list)
}

#[tauri::command]
fn get_sessions() -> Vec<TrainingSession> {
    storage::load_sessions()
}

#[tauri::command]
fn save_sessions_list(sessions: Vec<TrainingSession>) -> Result<(), String> {
    storage::save_sessions(&sessions)
}

#[tauri::command]
async fn run_code(
    source_code: String,
    testcases: Vec<TestCaseInput>,
    compiler_path: Option<String>,
    flags: Option<Vec<String>>,
    time_limit_ms: Option<u64>,
) -> Result<RunResult, String> {
    runner::execute_code(source_code, testcases, compiler_path, flags, time_limit_ms).await
}

#[tauri::command]
async fn run_stress_test(
    sol_code: String,
    brute_code: String,
    gen_code: String,
    max_rounds: u32,
    time_limit_ms: Option<u64>,
    compiler_path: Option<String>,
    flags: Option<Vec<String>>,
) -> Result<StressTestResult, String> {
    stress::execute_stress_test(
        sol_code,
        brute_code,
        gen_code,
        max_rounds as usize,
        time_limit_ms,
        compiler_path,
        flags,
    )
    .await
}

#[tauri::command]
async fn run_terminal_command(
    command: String,
    cwd: Option<String>,
) -> Result<TerminalCommandResult, String> {
    runner::execute_terminal_command(command, cwd).await
}

#[tauri::command]
async fn write_temp_code(source_code: String) -> Result<(String, String), String> {
    runner::write_temp_code(source_code).await
}

#[tauri::command]
async fn chat_with_ai(
    messages: Vec<ai::ChatMessage>,
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let settings = storage::load_settings();
    let b_url = base_url.unwrap_or(settings.ai_base_url);
    let a_key = api_key.unwrap_or(settings.ai_api_key);
    let m_name = model.unwrap_or(settings.ai_model);

    ai::ask_ai_coach(b_url, a_key, m_name, messages).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            update_settings,
            get_problems,
            save_problems_list,
            fetch_problem_online,
            toggle_favorite_problem,
            get_solves,
            record_solve_entry,
            get_sessions,
            save_sessions_list,
            run_code,
            run_stress_test,
            run_terminal_command,
            write_temp_code,
            chat_with_ai
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
#[tauri::command]
async fn submit_problem,
            check_syntax(problem_id: String, code: String) -> Result<String, String> {
    // 占位接口，未来接入各种 OJ 的自动提交机制
    Ok(format!("Submitted {} successfully", problem_id))
}
#[derive(serde::Serialize, Clone)]
pub struct SyntaxErrorMarker {
    pub line: u32,
    pub column: u32,
    pub message: String,
    pub severity: String,
}

#[tauri::command]
async fn check_syntax(
    source_code: String,
    compiler_path: String,
    flags: Vec<String>,
) -> Result<Vec<SyntaxErrorMarker>, String> {
    let temp_dir = std::env::temp_dir().join("oler_ide_syntax");
    let _ = tokio::fs::create_dir_all(&temp_dir).await;
    let src_path = temp_dir.join(format!("{}.cpp", uuid::Uuid::new_v4()));
    tokio::fs::write(&src_path, source_code).await.map_err(|e| e.to_string())?;

    let mut cmd_args = flags.clone();
    cmd_args.push("-fsyntax-only".to_string());
    cmd_args.push("-fdiagnostics-color=never".to_string());
    cmd_args.push(src_path.to_string_lossy().to_string());

    let output = tokio::process::Command::new(&compiler_path)
        .args(&cmd_args)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let mut markers = Vec::new();

    for line in stderr.lines() {
        if line.contains(".cpp:") {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 4 {
                let ln: u32 = parts[1].parse().unwrap_or(1);
                let col: u32 = parts[2].parse().unwrap_or(1);
                let sev = parts[3].trim().to_string();
                let msg = parts[4..].join(":");
                markers.push(SyntaxErrorMarker {
                    line: ln,
                    column: col,
                    severity: if sev.contains("error") { "error".to_string() } else { "warning".to_string() },
                    message: msg.trim().to_string(),
                });
            }
        }
    }

    Ok(markers)
}
