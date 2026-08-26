use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sample {
    pub input: String,
    pub output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Problem {
    pub id: String,
    pub title: String,
    pub oj: String,
    pub difficulty: String,
    pub tags: Vec<String>,
    pub time_limit_ms: u64,
    pub memory_limit_kb: u64,
    pub description_md: String,
    pub input_format: String,
    pub output_format: String,
    pub samples: Vec<Sample>,
    pub hint: String,
    pub source_url: String,
    pub is_favorite: bool,
    pub last_practiced: Option<DateTime<Utc>>,
}



#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolveRecord {
    pub id: String,
    pub problem_id: String,
    pub oj: String,
    pub title: String,
    pub difficulty: String,
    pub solved_at: DateTime<Utc>,
    pub time_ms: u64,
    pub memory_kb: u64,
    pub verdict: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrainingSession {
    pub id: String,
    pub title: String,
    pub date: String,
    pub problem_ids: Vec<String>,
    pub completed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub is_first_run: Option<bool>,
    pub theme: String,
    pub compiler_path: String,
    pub compiler_flags: Vec<String>,
    pub enable_code_template: bool,
    pub code_template: String,
    pub ai_base_url: String,
    pub ai_api_key: String,
    pub ai_model: String,
    pub prefer_terminal_run: bool,
    pub daily_goal: u32,
    pub auto_save: bool,
    pub font_size: u32,
    pub font_family: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            is_first_run: Some(true),
            theme: "OneDarkPro".to_string(),
            compiler_path: "g++".to_string(),
            compiler_flags: vec![
                "-O2".to_string(),
                "-std=c++17".to_string(),
                "-Wall".to_string(),
                "-Wextra".to_string(),
            ],
            enable_code_template: false,
            code_template: String::new(),
            ai_base_url: "https://api.openai.com/v1".to_string(),
            ai_api_key: String::new(),
            ai_model: "gpt-4o-mini".to_string(),
            prefer_terminal_run: false,
            daily_goal: 5,
            auto_save: true,
            font_size: 14,
            font_family: "Cascadia Mono".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalCommandResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseInput {
    pub id: usize,
    pub input: String,
    pub expected_output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseResult {
    pub id: usize,
    pub input: String,
    pub expected_output: String,
    pub actual_output: String,
    pub verdict: String,
    pub time_ms: u64,
    pub memory_kb: u64,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunResult {
    pub success: bool,
    pub is_compilation_error: bool,
    pub compiler_output: String,
    pub testcases: Vec<TestCaseResult>,
    pub overall_verdict: String,
    pub total_time_ms: u64,
    pub max_memory_kb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StressRoundResult {
    pub round: usize,
    pub passed: bool,
    pub input: String,
    pub sol_output: String,
    pub brute_output: String,
    pub error_msg: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StressTestResult {
    pub total_rounds: usize,
    pub passed_rounds: usize,
    pub success: bool,
    pub is_compilation_error: bool,
    pub compiler_output: String,
    pub failed_round: Option<StressRoundResult>,
}

