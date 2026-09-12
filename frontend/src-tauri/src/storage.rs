use crate::models::{AppSettings, Problem, SolveRecord, TrainingSession};
use std::path::{Path, PathBuf};

pub fn data_dir() -> PathBuf {
    let base = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let p = base.join(".oleride");
    if !p.exists() {
        let _ = std::fs::create_dir_all(&p);
    }
    p
}

/// Atomic write: tmp file + rename, so a crash mid-write can never leave a
/// half-written JSON behind (the corruption source this file once suffered).
fn write_atomic(path: &Path, content: &str) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, content).map_err(|e| format!("Failed to write {}: {}", tmp.display(), e))?;
    std::fs::rename(&tmp, path).map_err(|e| format!("Failed to replace {}: {}", path.display(), e))
}

/// Preserve a JSON file that failed to parse before anything overwrites it,
/// so user data stays recoverable instead of being silently reseeded.
fn quarantine_corrupt(path: &Path) {
    let bak = path.with_extension("corrupt-bak.json");
    let _ = std::fs::rename(path, bak);
}

pub fn load_settings() -> AppSettings {
    let path = data_dir().join("settings.json");
    match std::fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<AppSettings>(&content) {
            Ok(settings) => settings,
            Err(_) => {
                quarantine_corrupt(&path);
                let default_s = AppSettings::default();
                let _ = save_settings(&default_s);
                default_s
            }
        },
        Err(_) => {
            let default_s = AppSettings::default();
            let _ = save_settings(&default_s);
            default_s
        }
    }
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = data_dir().join("settings.json");
    let s = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    write_atomic(&path, &s)
}

/// Fresh installs start with an EMPTY problem library - no seeded content.
pub fn load_problems() -> Vec<Problem> {
    let path = data_dir().join("problems.json");
    match std::fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<Vec<Problem>>(&content) {
            Ok(problems) => problems,
            Err(_) => {
                quarantine_corrupt(&path);
                vec![]
            }
        },
        Err(_) => vec![],
    }
}

pub fn save_problems(problems: &[Problem]) -> Result<(), String> {
    let path = data_dir().join("problems.json");
    let s = serde_json::to_string_pretty(problems)
        .map_err(|e| format!("Failed to serialize problems: {}", e))?;
    write_atomic(&path, &s)
}

pub fn load_solves() -> Vec<SolveRecord> {
    let path = data_dir().join("solves.json");
    match std::fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<Vec<SolveRecord>>(&content) {
            Ok(solves) => solves,
            Err(_) => {
                quarantine_corrupt(&path);
                vec![]
            }
        },
        Err(_) => vec![],
    }
}

pub fn save_solves(solves: &[SolveRecord]) -> Result<(), String> {
    let path = data_dir().join("solves.json");
    let s = serde_json::to_string_pretty(solves)
        .map_err(|e| format!("Failed to serialize solves: {}", e))?;
    write_atomic(&path, &s)
}

pub fn load_sessions() -> Vec<TrainingSession> {
    let path = data_dir().join("sessions.json");
    match std::fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<Vec<TrainingSession>>(&content) {
            Ok(sessions) => sessions,
            Err(_) => {
                quarantine_corrupt(&path);
                vec![]
            }
        },
        Err(_) => vec![],
    }
}

pub fn save_sessions(sessions: &[TrainingSession]) -> Result<(), String> {
    let path = data_dir().join("sessions.json");
    let s = serde_json::to_string_pretty(sessions)
        .map_err(|e| format!("Failed to serialize sessions: {}", e))?;
    write_atomic(&path, &s)
}
