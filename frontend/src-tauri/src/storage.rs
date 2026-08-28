use crate::models::{AppSettings, Problem, Sample, SolveRecord, TrainingSession};
use std::path::PathBuf;

pub fn data_dir() -> PathBuf {
    let base = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let p = base.join(".oleride");
    if !p.exists() {
        let _ = std::fs::create_dir_all(&p);
    }
    p
}

pub fn load_settings() -> AppSettings {
    let path = data_dir().join("settings.json");
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
            return settings;
        }
    }
    let default_s = AppSettings::default();
    let _ = save_settings(&default_s);
    default_s
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = data_dir().join("settings.json");
    let s = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    std::fs::write(&path, s).map_err(|e| format!("Failed to write settings.json: {}", e))
}

pub fn load_problems() -> Vec<Problem> {
    let path = data_dir().join("problems.json");
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(problems) = serde_json::from_str::<Vec<Problem>>(&content) {
            return problems;
        }
    }
    let default_p = vec![Problem {
        id: "P1001".to_string(),
        title: "A+B Problem".to_string(),
        oj: "Luogu".to_string(),
        difficulty: "����".to_string(),
        tags: vec!["ģ��".to_string()],
        time_limit_ms: 1000,
        memory_limit_kb: 128000,
        description_md: "## ��Ŀ����\n������������ , b$��������ǵĺ�($|a|,|b| \\\\le 10^9$)��".to_string(),
        input_format: "�������� , b$��".to_string(),
        output_format: "һ������ +b$��".to_string(),
        samples: vec![Sample {
            input: "20 30".to_string(),
            output: "50".to_string(),
        }],
        hint: "".to_string(),
        source_url: "https://www.luogu.com.cn/problem/P1001".to_string(),
        is_favorite: false,
        last_practiced: None,
    }];
    let _ = save_problems(&default_p);
    default_p
}

pub fn save_problems(problems: &[Problem]) -> Result<(), String> {
    let path = data_dir().join("problems.json");
    let s = serde_json::to_string_pretty(problems)
        .map_err(|e| format!("Failed to serialize problems: {}", e))?;
    std::fs::write(&path, s).map_err(|e| format!("Failed to write problems.json: {}", e))
}

pub fn load_solves() -> Vec<SolveRecord> {
    let path = data_dir().join("solves.json");
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(solves) = serde_json::from_str::<Vec<SolveRecord>>(&content) {
            return solves;
        }
    }
    vec![]
}

pub fn save_solves(solves: &[SolveRecord]) -> Result<(), String> {
    let path = data_dir().join("solves.json");
    let s = serde_json::to_string_pretty(solves)
        .map_err(|e| format!("Failed to serialize solves: {}", e))?;
    std::fs::write(&path, s).map_err(|e| format!("Failed to write solves.json: {}", e))
}

pub fn load_sessions() -> Vec<TrainingSession> {
    let path = data_dir().join("sessions.json");
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(sessions) = serde_json::from_str::<Vec<TrainingSession>>(&content) {
            return sessions;
        }
    }
    vec![]
}

pub fn save_sessions(sessions: &[TrainingSession]) -> Result<(), String> {
    let path = data_dir().join("sessions.json");
    let s = serde_json::to_string_pretty(sessions)
        .map_err(|e| format!("Failed to serialize sessions: {}", e))?;
    std::fs::write(&path, s).map_err(|e| format!("Failed to write sessions.json: {}", e))
}
