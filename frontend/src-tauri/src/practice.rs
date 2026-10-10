//! Practice folder: the on-disk root where per-problem source files live.
//! Opening a problem looks for an existing file here first; saving defaults
//! to `{root}/{id}.cpp` so no save dialog is needed once a root is set.

use crate::storage;
use std::collections::VecDeque;
use std::path::{Path, PathBuf};

/// Mirror of the settings value, so the backend keeps working even when a
/// hand-edited settings.json drops the field.
fn root_txt_path() -> PathBuf {
    storage::data_dir().join("practice_root.txt")
}

/// Configured practice root: settings value first, txt fallback second.
pub fn practice_root() -> Option<String> {
    if let Some(p) = storage::load_settings().practice_root {
        let t = p.trim();
        if !t.is_empty() {
            return Some(t.to_string());
        }
    }
    std::fs::read_to_string(root_txt_path())
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Persist the practice root to both settings and the fallback txt file.
pub fn set_practice_root(path: &str) -> Result<(), String> {
    let p = path.trim();
    if p.is_empty() {
        return Err("empty practice root".to_string());
    }
    let mut settings = storage::load_settings();
    settings.practice_root = Some(p.to_string());
    storage::save_settings(&settings)?;
    std::fs::write(root_txt_path(), p)
        .map_err(|e| format!("Failed to write practice_root.txt: {e}"))
}

/// Does `file_name` (name only, no path) belong to `problem_id`?
/// Accepted shapes, case-insensitive on the id part:
/// `{id}.cpp|.cc|.cxx`, `{id}_*.cpp|.cc|.cxx`, `{id}-*.cpp|.cc|.cxx`.
/// A different id sharing the prefix must NOT match: `P1001A.cpp` is not
/// `P1001`.
pub fn matches_problem_file(file_name: &str, problem_id: &str) -> bool {
    let name = file_name.trim();
    let id = problem_id.trim();
    if name.is_empty() || id.is_empty() {
        return false;
    }
    let name_lc = name.to_ascii_lowercase();
    let id_lc = id.to_ascii_lowercase();
    let Some((stem, ext)) = name_lc.rsplit_once('.') else {
        return false;
    };
    if !matches!(ext, "cpp" | "cc" | "cxx") {
        return false;
    }
    if stem == id_lc {
        return true;
    }
    match stem.strip_prefix(&id_lc) {
        Some(rest) => rest.starts_with('_') || rest.starts_with('-'),
        None => false,
    }
}

/// Replace characters Windows forbids in file names with `_`.
fn sanitize_file_name(s: &str) -> String {
    s.trim()
        .chars()
        .map(|c| {
            if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') || c.is_control()
            {
                '_'
            } else {
                c
            }
        })
        .collect()
}

/// BFS the practice root for any file matching `problem_id`; shallow wins.
/// Depth-capped and symlink-safe (symlinked dirs are not followed).
fn find_matching_file(root: &Path, problem_id: &str) -> Option<PathBuf> {
    let mut queue: VecDeque<(PathBuf, usize)> = VecDeque::new();
    queue.push_back((root.to_path_buf(), 0));
    while let Some((dir, depth)) = queue.pop_front() {
        if depth > 8 {
            continue;
        }
        let Ok(entries) = std::fs::read_dir(&dir) else {
            continue;
        };
        for entry in entries.flatten() {
            let Ok(ft) = entry.file_type() else { continue };
            let path = entry.path();
            if ft.is_dir() {
                queue.push_back((path, depth + 1));
            } else if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if matches_problem_file(name, problem_id) {
                    return Some(path);
                }
            }
        }
    }
    None
}

/// Find an existing source file for `problem_id` under the practice root.
/// Returns the absolute path, or None when no root is set / nothing matches.
/// (The frontend's problemFiles map is checked by the frontend itself first.)
pub fn resolve_problem_file(problem_id: &str) -> Option<String> {
    let root = practice_root()?;
    find_matching_file(Path::new(&root), problem_id)
        .map(|p| p.to_string_lossy().into_owned())
}

/// Default save target for a problem: `{practice_root}/{id}.cpp` (the title
/// is the stem when there is no id, e.g. free practice). Empty string when
/// no root is configured - the frontend then falls back to a save dialog.
pub fn default_save_path(problem_id: &str, title: &str) -> String {
    let Some(root) = practice_root() else {
        return String::new();
    };
    let id = problem_id.trim();
    let stem = if id.is_empty() {
        sanitize_file_name(title)
    } else {
        sanitize_file_name(id)
    };
    if stem.is_empty() {
        return String::new();
    }
    Path::new(&root)
        .join(format!("{stem}.cpp"))
        .to_string_lossy()
        .into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_exact_ids() {
        assert!(matches_problem_file("P1001.cpp", "P1001"));
        assert!(matches_problem_file("CF1900A.cpp", "CF1900A"));
        assert!(matches_problem_file("ABC300A.cc", "ABC300A"));
        assert!(matches_problem_file("ABC300A.cxx", "ABC300A"));
    }

    #[test]
    fn matching_is_case_insensitive() {
        assert!(matches_problem_file("p1001.CPP", "P1001"));
        assert!(matches_problem_file("P1001.cpp", "p1001"));
        assert!(matches_problem_file("cf1900a.cpp", "CF1900A"));
    }

    #[test]
    fn matches_prefixed_variants() {
        assert!(matches_problem_file("P1001_sol.cpp", "P1001"));
        assert!(matches_problem_file("P1001-2.cpp", "P1001"));
        assert!(matches_problem_file("CF1900A_bruteforce.cc", "CF1900A"));
    }

    #[test]
    fn different_ids_and_extensions_do_not_match() {
        // Same prefix but a different problem id.
        assert!(!matches_problem_file("P1001A.cpp", "P1001"));
        assert!(!matches_problem_file("P1002.cpp", "P1001"));
        // Wrong extension or no extension at all.
        assert!(!matches_problem_file("P1001.py", "P1001"));
        assert!(!matches_problem_file("P1001_sol.py", "P1001"));
        assert!(!matches_problem_file("P1001.cpp.bak", "P1001"));
        assert!(!matches_problem_file("P1001", "P1001"));
        // Degenerate inputs.
        assert!(!matches_problem_file(".cpp", "P1001"));
        assert!(!matches_problem_file("P1001.cpp", ""));
        assert!(!matches_problem_file("", "P1001"));
    }

    #[test]
    fn sanitize_replaces_windows_forbidden_chars() {
        assert_eq!(sanitize_file_name("CF1900A"), "CF1900A");
        assert_eq!(
            sanitize_file_name("a/b\\c:d*e?f\"g<h>i|j"),
            "a_b_c_d_e_f_g_h_i_j"
        );
        assert_eq!(sanitize_file_name("  P1001  "), "P1001");
    }

    #[test]
    fn finds_file_in_nested_subdirectory() {
        let base =
            std::env::temp_dir().join(format!("oler_practice_test_{}", uuid::Uuid::new_v4()));
        let sub = base.join("luogu").join("shallow");
        std::fs::create_dir_all(&sub).unwrap();
        std::fs::write(sub.join("P1001.cpp"), "int main(){}").unwrap();
        // A decoy that shares the id prefix but is a different problem.
        std::fs::write(base.join("P1001A.cpp"), "decoy").unwrap();

        let hit = find_matching_file(&base, "P1001").expect("should find nested file");
        assert!(hit.ends_with("P1001.cpp"));
        // BFS: the root-level decoy is a different id; the nested match wins.
        assert!(hit.to_string_lossy().contains("luogu"));

        // Unknown ids find nothing.
        assert!(find_matching_file(&base, "CF9999Z").is_none());

        let _ = std::fs::remove_dir_all(&base);
    }
}
