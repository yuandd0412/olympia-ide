use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use tauri::Emitter;

use crate::storage;

/// Pinned redistributable toolchain shown to users as "MinGW 13.1.0 (x64)".
/// Source: niXman/mingw-builds rt_v11-rev1 (msvcrt), mirrored by download.qt.io.
pub const TOOLCHAIN_VERSION: &str = "13.1.0";
const ARCHIVE_NAME: &str = "MinGW-w64-x86_64-13.1.0-release-posix-seh-msvcrt-rt_v11-rev1.7z";
const SHA256: &str = "6b41fdf246756c04d2ac413d8835e347ffc18fdeda265f5310ac6aeb3c1dbbcf";
/// First entry is the China-friendly mirror; the official host is the fallback.
const MIRRORS: [&str; 2] = [
    "https://mirrors.tuna.tsinghua.edu.cn/qt/development_releases/prebuilt/mingw_64/",
    "https://download.qt.io/development_releases/prebuilt/mingw_64/",
];

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ToolchainStatus {
    /// "bundled" | "appdata" | "system" | "none"
    pub variant: String,
    pub gpp_path: Option<String>,
    pub version: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Progress {
    phase: String, // "download" | "verify" | "extract"
    downloaded: u64,
    total: Option<u64>,
}

fn appdata_gpp() -> Option<PathBuf> {
    let p = storage::data_dir().join("mingw64").join("bin").join("g++.exe");
    p.is_file().then_some(p)
}

/// Present only in the "full" installer build, which ships vendor/mingw64
/// as a bundle resource next to the exe.
fn bundled_gpp() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let p = exe.parent()?.join("mingw64").join("bin").join("g++.exe");
    p.is_file().then_some(p)
}

fn status(variant: &str, gpp: Option<PathBuf>, version: Option<String>) -> ToolchainStatus {
    ToolchainStatus {
        variant: variant.to_string(),
        gpp_path: gpp.map(|p| p.to_string_lossy().into_owned()),
        version,
    }
}

/// A compiler the user pointed at explicitly, as opposed to the bare `g++` default, which merely
/// asks the PATH. Ranking the default as an override let an unrelated system compiler beat the
/// toolchain the installer ships, while the environment report still claimed "bundled".
fn explicit_compiler_path(hint: &str) -> Option<PathBuf> {
    let hint = hint.trim();
    if hint.is_empty() {
        return None;
    }
    let path = Path::new(hint);
    let names_a_directory = path.parent().map(|d| !d.as_os_str().is_empty()).unwrap_or(false);
    (names_a_directory && path.is_file()).then(|| path.to_path_buf())
}

/// The one resolution order shared by the runner and the environment report:
/// explicit setting → bundled → appdata-installed → working PATH command → nothing.
/// The first string is "configured" | "bundled" | "appdata" | "system"; `None` means nothing usable.
async fn first_compiler(hint: &str) -> (&'static str, Option<String>) {
    if let Some(path) = explicit_compiler_path(hint) {
        return ("configured", Some(path.to_string_lossy().into_owned()));
    }
    for (variant, found) in [("bundled", bundled_gpp()), ("appdata", appdata_gpp())] {
        if let Some(path) = found {
            return (variant, Some(path.to_string_lossy().into_owned()));
        }
    }
    let name = if hint.trim().is_empty() { "g++" } else { hint.trim() };
    if probe_version(name).await.is_some() {
        return ("system", Some(name.to_string()));
    }
    ("none", None)
}

/// Resolve the compiler executable actually used for a run.
///
/// An empty hint, a stale absolute path from another machine, or the bare `g++` default all fall
/// through to the shipped / installed toolchain, so compilation works before any settings UI has
/// ever been touched. When nothing resolves, the caller's own string is returned so the compiler
/// error names what the user actually configured.
pub async fn resolve_compiler(hint: &str) -> String {
    match first_compiler(hint).await {
        (_, Some(path)) => path,
        (_, None) => {
            let hint = hint.trim();
            if hint.is_empty() { "g++".to_string() } else { hint.to_string() }
        }
    }
}

async fn probe_version(gpp: &str) -> Option<String> {
    let mut cmd = tokio::process::Command::new(gpp);
    cmd.arg("--version");
    crate::runner::headless(&mut cmd);
    let out = cmd
        .output()
        .await
        .ok()?;
    if !out.status.success() {
        return None;
    }
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .next()
        .map(|l| l.trim().to_string())
}

#[tauri::command]
pub async fn detect_toolchain() -> ToolchainStatus {
    let settings = storage::load_settings();
    let (variant, resolved) = first_compiler(&settings.compiler_path).await;
    let Some(path) = resolved else {
        return status("none", None, None);
    };
    let version = probe_version(&path).await;
    // An explicit path is a system compiler by definition; the frontend distinguishes sources only
    // in broad terms, so reporting it as its own variant would buy nothing.
    let variant = if variant == "configured" { "system" } else { variant };
    status(variant, Some(PathBuf::from(path)), version)
}

async fn download_archive(window: &tauri::WebviewWindow, dest: &Path) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;

    let mut last_err = String::from("no mirror attempted");
    for base in MIRRORS {
        let url = format!("{base}{ARCHIVE_NAME}");
        let resp = match client.get(&url).send().await {
            Ok(r) => match r.error_for_status() {
                Ok(r) => r,
                Err(e) => {
                    last_err = format!("{url}: {e}");
                    continue;
                }
            },
            Err(e) => {
                last_err = format!("{url}: {e}");
                continue;
            }
        };

        let total = resp.content_length();
        let mut file = match tokio::fs::File::create(dest).await {
            Ok(f) => f,
            Err(e) => return Err(format!("无法写入 {}: {e}", dest.display())),
        };
        let mut downloaded: u64 = 0;
        let mut next_emit: u64 = 0;
        let mut stream = resp.bytes_stream();
        let mut failed: Option<String> = None;

        use tokio::io::AsyncWriteExt;
        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(bytes) => {
                    if let Err(e) = file.write_all(&bytes).await {
                        failed = Some(format!("写入失败: {e}"));
                        break;
                    }
                    downloaded += bytes.len() as u64;
                    if downloaded >= next_emit {
                        next_emit = downloaded + 2_000_000;
                        let _ = window.emit(
                            "olympia://toolchain-progress",
                            Progress { phase: "download".into(), downloaded, total },
                        );
                    }
                }
                Err(e) => {
                    failed = Some(format!("{url}: {e}"));
                    break;
                }
            }
        }

        match failed {
            None => return Ok(()),
            Some(e) => {
                let _ = tokio::fs::remove_file(dest).await;
                last_err = e;
            }
        }
    }
    Err(format!("所有下载源均失败。最后一个错误: {last_err}"))
}

#[tauri::command]
pub async fn install_toolchain(
    window: tauri::WebviewWindow,
) -> Result<ToolchainStatus, String> {
    if let Some(p) = appdata_gpp() {
        let v = probe_version(&p.to_string_lossy()).await;
        return Ok(status("appdata", Some(p), v));
    }

    let dest = storage::data_dir().join(ARCHIVE_NAME);
    download_archive(&window, &dest).await?;

    // Verify the pinned hash before anything touches the filesystem layout.
    let _ = window.emit(
        "olympia://toolchain-progress",
        Progress { phase: "verify".into(), downloaded: 0, total: None },
    );
    let archive = dest.clone();
    let hash = tokio::task::spawn_blocking(move || -> Result<String, String> {
        let bytes = std::fs::read(&archive).map_err(|e| e.to_string())?;
        Ok(format!("{:x}", Sha256::digest(&bytes)))
    })
    .await
    .map_err(|e| e.to_string())??;
    if !hash.eq_ignore_ascii_case(SHA256) {
        let _ = tokio::fs::remove_file(&dest).await;
        return Err(format!(
            "下载文件校验失败（sha256 不匹配），已删除。请重试或手动配置编译器。"
        ));
    }

    let _ = window.emit(
        "olympia://toolchain-progress",
        Progress { phase: "extract".into(), downloaded: 0, total: None },
    );
    let extract_dest = storage::data_dir();
    let src = dest.clone();
    tokio::task::spawn_blocking(move || {
        sevenz_rust::decompress_file(&src, &extract_dest)
            .map_err(|e| format!("解压失败: {e}"))
    })
    .await
    .map_err(|e| e.to_string())??;

    let _ = tokio::fs::remove_file(&dest).await;

    let gpp = appdata_gpp().ok_or("解压完成但未找到 mingw64/bin/g++.exe")?;
    let version = probe_version(&gpp.to_string_lossy()).await;

    // Point settings at the freshly installed compiler when still on the bare default.
    let mut settings = storage::load_settings();
    if settings.compiler_path == "g++" {
        settings.compiler_path = gpp.to_string_lossy().into_owned();
        storage::save_settings(&settings)?;
    }

    Ok(status("appdata", Some(gpp), version))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn resolve_keeps_a_real_existing_compiler() {
        // 当前测试可执行文件一定存在，充当一个"已配置且存在"的编译器路径。
        let hint = std::env::current_exe().unwrap().to_string_lossy().into_owned();
        assert_eq!(resolve_compiler(&hint).await, hint);
    }

    #[tokio::test]
    async fn resolve_falls_back_when_hint_is_missing() {
        // 不存在的绝对路径必须触发回退探测；本机若有 bundled/appdata 工具链则
        // 必须切过去，若两者皆无则保持原 hint（沿用修复前的报错行为）。
        let missing = "Z:\\definitely\\missing\\g++.exe";
        let resolved = resolve_compiler(missing).await;
        assert!(!resolved.trim().is_empty());
        if bundled_gpp().is_some() || appdata_gpp().is_some() {
            assert_ne!(resolved, missing);
        } else {
            assert_eq!(resolved, missing);
        }
    }

    #[tokio::test]
    async fn resolve_empty_hint_returns_something_usable_or_default() {
        let resolved = resolve_compiler("   ").await;
        assert!(!resolved.trim().is_empty());
    }

    #[test]
    fn a_bare_path_name_is_not_an_explicit_override() {
        assert_eq!(explicit_compiler_path("g++"), None);
        assert_eq!(explicit_compiler_path(""), None);
        assert_eq!(explicit_compiler_path("   "), None);
        let exe = std::env::current_exe().unwrap().to_string_lossy().into_owned();
        assert_eq!(explicit_compiler_path(&exe), Some(PathBuf::from(&exe)));
    }

    #[tokio::test]
    async fn bare_default_never_beats_the_shipped_toolchain() {
        // The settings default is the bare PATH name "g++". Ranking it as an override made an
        // unrelated system compiler win while the environment report still said "bundled".
        if bundled_gpp().is_none() && appdata_gpp().is_none() {
            return;
        }
        let resolved = resolve_compiler("g++").await;
        assert_ne!(resolved, "g++");
        assert!(Path::new(&resolved).is_file());
    }
}
