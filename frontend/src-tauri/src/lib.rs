pub mod ai;
pub mod enrich;
pub mod ingest;
pub mod models;
pub mod multi_oj;
pub mod pdf_extract;
pub mod practice;
pub mod runner;
pub mod storage;
pub mod stress;
pub mod toolchain;

use models::{
    AppSettings, Problem, RunResult, SolveRecord, StressTestResult, TestCaseInput,
    TrainingSession
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
    let p = multi_oj::fetch_problem_auto(problem_id).await?;
    // Observability only - an under-parsed description is returned as-is.
    log::debug!(
        "import done: {} [{}] \"{}\" description_len={} samples={}",
        p.id,
        p.oj,
        p.title,
        p.description_md.len(),
        p.samples.len()
    );
    Ok(p)
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
async fn write_temp_code(source_code: String) -> Result<(String, String), String> {
    runner::write_temp_code(source_code).await
}

#[tauri::command]
async fn chat_with_ai(
    messages: Vec<ai::ChatMessage>,
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
    context: Option<String>,
) -> Result<String, String> {
    let settings = storage::load_settings();
    let b_url = base_url.unwrap_or(settings.ai_base_url);
    let a_key = api_key.unwrap_or(settings.ai_api_key);
    let m_name = model.unwrap_or(settings.ai_model);

    // Optional context block (problem/code/testcase summary assembled by the
    // frontend) is folded into the last user message; absent or empty context
    // leaves the conversation untouched (backward compatible).
    let messages = match context {
        Some(ctx) if !ctx.trim().is_empty() => ai::merge_context(messages, &ctx),
        _ => messages,
    };

    ai::ask_ai_coach(b_url, a_key, m_name, messages).await
}

#[tauri::command]
fn load_chats() -> Vec<storage::ChatMessageRecord> {
    storage::load_chats()
}

#[tauri::command]
fn save_chats(messages: Vec<storage::ChatMessageRecord>) -> Result<(), String> {
    storage::save_chats(messages)
}

#[tauri::command]
async fn list_ollama_models(base_url: Option<String>) -> Vec<String> {
    ai::list_ollama_models(base_url).await
}

#[tauri::command]
async fn probe_ai_endpoint(
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    ai::probe_ai_endpoint(base_url, api_key, model).await
}

#[tauri::command]
async fn pick_practice_folder(app: tauri::AppHandle) -> Option<String> {
    // blocking_pick_folder must never run on the main thread; hop to a worker.
    tauri::async_runtime::spawn_blocking(move || {
        use tauri_plugin_dialog::DialogExt;
        match app.dialog().file().blocking_pick_folder() {
            Some(tauri_plugin_dialog::FilePath::Path(p)) => {
                Some(p.to_string_lossy().into_owned())
            }
            _ => None,
        }
    })
    .await
    .unwrap_or(None)
}

#[tauri::command]
fn get_practice_folder() -> Option<String> {
    practice::practice_root()
}

#[tauri::command]
fn set_practice_folder(path: String) -> Result<(), String> {
    practice::set_practice_root(&path)
}

#[tauri::command]
fn resolve_problem_file(problem_id: String) -> Option<String> {
    practice::resolve_problem_file(&problem_id)
}

#[tauri::command]
fn default_save_path(problem_id: String, title: String) -> String {
    practice::default_save_path(&problem_id, &title)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
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
            write_temp_code,
            chat_with_ai,
            load_chats,
            save_chats,
            list_ollama_models,
            probe_ai_endpoint,
            pick_practice_folder,
            get_practice_folder,
            set_practice_folder,
            resolve_problem_file,
            default_save_path,
            pdf_extract::extract_pdf_problems,
            check_syntax,
            open_url,
            runner::run_in_console,
            toolchain::detect_toolchain,
            toolchain::install_toolchain
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
#[derive(serde::Serialize, Clone)]
pub struct SyntaxErrorMarker {
    pub line: u32,
    pub column: u32,
    pub message: String,
    pub severity: String,
}

/// Parse g++ diagnostic lines into editor markers. Tolerant of Windows
/// drive-letter paths (`C:\t\a.cpp:3:5: error: ...`) where a naive
/// `split(':')` mis-assigns path/line/column; non-diagnostic lines
/// (function context, linker errors without a location) are skipped.
fn parse_syntax_markers(stderr: &str) -> Vec<SyntaxErrorMarker> {
    let Ok(re) = regex::Regex::new(
        r"^(.*?):([0-9]+):([0-9]+):\s*(error|warning|note|fatal error)\s*:\s*(.*)$",
    ) else {
        return vec![];
    };
    let mut markers = Vec::new();
    for line in stderr.lines() {
        let Some(c) = re.captures(line) else {
            continue;
        };
        let line_no: u32 = c[2].parse().unwrap_or(1);
        let column: u32 = c[3].parse().unwrap_or(1);
        let sev = c[4].to_string();
        let message = c[5].trim().to_string();
        markers.push(SyntaxErrorMarker {
            line: line_no,
            column,
            severity: if sev.contains("error") {
                "error".to_string()
            } else {
                "warning".to_string()
            },
            message,
        });
    }
    markers
}

#[tauri::command]
async fn check_syntax(
    source_code: String,
    compiler_path: String,
    flags: Vec<String>,
) -> Result<Vec<SyntaxErrorMarker>, String> {
    // 新设备兜底：裸默认/失效路径回退到内置或已安装的工具链
    let compiler_path = crate::toolchain::resolve_compiler(&compiler_path).await;
    let temp_dir = std::env::temp_dir().join("oler_ide_syntax");
    let _ = tokio::fs::create_dir_all(&temp_dir).await;
    let src_path = temp_dir.join(format!("{}.cpp", uuid::Uuid::new_v4()));
    tokio::fs::write(&src_path, source_code).await.map_err(|e| e.to_string())?;

    let mut cmd_args = flags.clone();
    cmd_args.push("-fsyntax-only".to_string());
    cmd_args.push("-fdiagnostics-color=never".to_string());
    cmd_args.push(src_path.to_string_lossy().to_string());

    let mut syntax_cmd = tokio::process::Command::new(&compiler_path);
    syntax_cmd.args(&cmd_args);
    #[cfg(windows)]
    syntax_cmd.creation_flags(0x0800_0000);
    let output = match syntax_cmd.output().await {
        Ok(o) => o,
        Err(e) => {
            // Invoke failure (no usable compiler on this machine) must still
            // delete the source: this path runs on every keystroke debounce,
            // so leaking here litters one .cpp per check.
            let _ = tokio::fs::remove_file(&src_path).await;
            return Err(e.to_string());
        }
    };

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let markers = parse_syntax_markers(&stderr);

    let _ = tokio::fs::remove_file(&src_path).await;

    Ok(markers)
}

/// Escape the target for the `cmd /c start "" <target>` line. cmd.exe does
/// not follow MSVCRT quoting, so an unquoted target containing `&` (a
/// practice-root path like `D:\R&D`, or a URL with a query string) is split
/// into two commands; force-quote the target and drop embedded quotes so it
/// always stays a single token.
fn cmd_start_target(target: &str) -> String {
    format!("start \"\" \"{}\"", target.replace('"', ""))
}

#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("cmd")
            .raw_arg("/c")
            .raw_arg(cmd_start_target(&url))
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_windows_drive_letter_diagnostics() {
        let stderr = "C:\\Users\\dev\\AppData\\Local\\Temp\\oler_ide_syntax\\a.cpp:3:5: error: expected ';' before '}' token\r\n";
        let m = parse_syntax_markers(stderr);
        assert_eq!(m.len(), 1);
        assert_eq!(m[0].line, 3);
        assert_eq!(m[0].column, 5);
        assert_eq!(m[0].severity, "error");
        assert_eq!(m[0].message, "expected ';' before '}' token");
    }

    #[test]
    fn parses_relative_paths_warnings_and_notes() {
        let stderr = "main.cpp:10:2: warning: unused variable 'x' [-Wunused-variable]\n\
                      main.cpp:4:1: note: declared here\n";
        let m = parse_syntax_markers(stderr);
        assert_eq!(m.len(), 2);
        assert_eq!(m[0].line, 10);
        assert_eq!(m[0].severity, "warning");
        // Notes keep the historical severity mapping (anything but error).
        assert_eq!(m[1].severity, "warning");
        assert_eq!(m[1].message, "declared here");
    }

    #[test]
    fn skips_non_diagnostic_lines() {
        let stderr = "In function 'int main()':\n\
                      collect2.exe: error: ld returned 1 exit status\n\
                      In file included from C:\\x.cpp:2:\n";
        assert!(parse_syntax_markers(stderr).is_empty());
    }

    #[test]
    fn fatal_error_message_with_colons_parses() {
        let stderr = "a.cpp:1:10: fatal error: foo.h: No such file or directory\n";
        let m = parse_syntax_markers(stderr);
        assert_eq!(m.len(), 1);
        assert_eq!(m[0].severity, "error");
        assert_eq!(m[0].message, "foo.h: No such file or directory");
    }

    #[test]
    fn cmd_start_target_keeps_metachars_inside_one_quoted_token() {
        assert_eq!(cmd_start_target("D:\\R&D"), "start \"\" \"D:\\R&D\"");
        assert_eq!(
            cmd_start_target("https://x.com/a?b=1&c=2"),
            "start \"\" \"https://x.com/a?b=1&c=2\""
        );
        // Embedded quotes are stripped so the wrapper quoting cannot be broken
        // out of: only the 4 structural quotes remain.
        let hostile = cmd_start_target("https://x.com/\" & calc & echo \"");
        assert_eq!(hostile.matches('"').count(), 4);
        assert!(hostile.ends_with('"'));
    }
}
