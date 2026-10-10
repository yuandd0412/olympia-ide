use crate::models::{AppSettings, Problem, SolveRecord, TrainingSession};
use serde::{Deserialize, Serialize};
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

/// Test bypass: when `OLYMPIA_FORCE_FIRST_RUN=1`, the onboarding wizard shows
/// again on every launch without touching the saved settings file.
fn force_first_run_requested() -> bool {
    // Debug builds only. A shipped installer must not replay the wizard forever because some other
    // program left OLYMPIA_FORCE_FIRST_RUN in the environment.
    cfg!(debug_assertions) && std::env::var("OLYMPIA_FORCE_FIRST_RUN").as_deref() == Ok("1")
}

pub fn load_settings() -> AppSettings {
    let path = data_dir().join("settings.json");
    let mut settings = match std::fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<AppSettings>(&content) {
            Ok(s) => s,
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
    };
    if force_first_run_requested() {
        settings.is_first_run = Some(true);
    }
    settings
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

/// One AI chat message as persisted in `chats.json`; mirrors the frontend
/// `ChatMessage` (`{role, content, ts?}`) with ts in epoch milliseconds.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChatMessageRecord {
    pub role: String,
    pub content: String,
    /// Older files may lack ts entirely.
    #[serde(default)]
    pub ts: u64,
}

/// Cap for the persisted chat history so `chats.json` cannot grow without
/// bound; when exceeded the oldest entries (array head) are dropped.
pub const CHATS_CAP: usize = 200;

fn cap_chats(mut messages: Vec<ChatMessageRecord>) -> Vec<ChatMessageRecord> {
    if messages.len() > CHATS_CAP {
        messages.drain(..messages.len() - CHATS_CAP);
    }
    messages
}

/// Per-message content cap applied on load: a runaway AI reply (or a
/// hand-edited file) must not blow up the UI or the next request payload.
const CHAT_CONTENT_MAX_CHARS: usize = 32 * 1024;

/// Truncate to `max` chars (not bytes) without splitting a UTF-8 char.
fn truncate_chars(s: &str, max: usize) -> String {
    match s.char_indices().nth(max) {
        Some((idx, _)) => s[..idx].to_string(),
        None => s.to_string(),
    }
}

fn clamp_chat_contents(chats: Vec<ChatMessageRecord>) -> Vec<ChatMessageRecord> {
    chats
        .into_iter()
        .map(|mut m| {
            m.content = truncate_chars(&m.content, CHAT_CONTENT_MAX_CHARS);
            m
        })
        .collect()
}

pub fn load_chats() -> Vec<ChatMessageRecord> {
    let path = data_dir().join("chats.json");
    match std::fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<Vec<ChatMessageRecord>>(&content) {
            Ok(chats) => cap_chats(clamp_chat_contents(chats)),
            Err(_) => {
                quarantine_corrupt(&path);
                vec![]
            }
        },
        Err(_) => vec![],
    }
}

pub fn save_chats(messages: Vec<ChatMessageRecord>) -> Result<(), String> {
    let path = data_dir().join("chats.json");
    let s = serde_json::to_string_pretty(&cap_chats(messages))
        .map_err(|e| format!("Failed to serialize chats: {}", e))?;
    write_atomic(&path, &s)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rec(role: &str, content: &str, ts: u64) -> ChatMessageRecord {
        ChatMessageRecord {
            role: role.to_string(),
            content: content.to_string(),
            ts,
        }
    }

    #[test]
    fn chat_cap_keeps_the_most_recent_tail() {
        let msgs: Vec<ChatMessageRecord> = (0..250u64).map(|i| rec("user", "m", i)).collect();
        let capped = cap_chats(msgs);
        assert_eq!(capped.len(), CHATS_CAP);
        assert_eq!(capped[0].ts, 50);
        assert_eq!(capped.last().unwrap().ts, 249);
    }

    #[test]
    fn chat_cap_leaves_short_histories_untouched() {
        let capped = cap_chats(vec![rec("user", "a", 1), rec("assistant", "b", 2)]);
        assert_eq!(capped.len(), 2);
        assert_eq!(capped[0].ts, 1);
    }

    #[test]
    fn chat_record_tolerates_missing_ts() {
        let parsed: ChatMessageRecord =
            serde_json::from_str(r#"{"role":"user","content":"hello"}"#).unwrap();
        assert_eq!(parsed.ts, 0);
        assert_eq!(parsed.role, "user");
    }

    #[test]
    fn chat_record_json_roundtrip() {
        let msgs = vec![rec("user", "hello", 123), rec("assistant", "hi there", 456)];
        let s = serde_json::to_string(&msgs).unwrap();
        let back: Vec<ChatMessageRecord> = serde_json::from_str(&s).unwrap();
        assert_eq!(back, msgs);
    }

    #[test]
    fn chat_content_clamped_to_32k_chars() {
        let oversized = "汉".repeat(CHAT_CONTENT_MAX_CHARS + 10);
        let clamped = clamp_chat_contents(vec![rec("assistant", &oversized, 1)]);
        assert_eq!(clamped[0].content.chars().count(), CHAT_CONTENT_MAX_CHARS);
        // The cap counts chars, not bytes: 32768 CJK chars are ~96 KiB.
        assert_eq!(clamped[0].content.len(), CHAT_CONTENT_MAX_CHARS * 3);
    }

    #[test]
    fn chat_content_within_cap_untouched() {
        let clamped = clamp_chat_contents(vec![rec("user", "normal message", 1)]);
        assert_eq!(clamped[0].content, "normal message");
    }

    #[test]
    fn env_olympia_force_first_run_forces_flag() {
        std::env::set_var("OLYMPIA_FORCE_FIRST_RUN", "1");
        assert!(force_first_run_requested());
        assert_eq!(load_settings().is_first_run, Some(true));
        std::env::remove_var("OLYMPIA_FORCE_FIRST_RUN");
        assert!(!force_first_run_requested());
    }

    #[test]
    fn settings_json_uses_camel_case_first_run_key() {
        let mut s = AppSettings::default();
        s.is_first_run = Some(true);
        let v: serde_json::Value = serde_json::to_value(&s).unwrap();
        assert_eq!(v["isFirstRun"], true);
        assert!(v.get("is_first_run").is_none());
        let back: AppSettings = serde_json::from_value(v).unwrap();
        assert_eq!(back.is_first_run, Some(true));
    }
}
