# 任务：一键重置「首次启动」状态（测试用）

仓库：`D:\oler-ide-v2`。**只改 Rust / 脚本，禁止改 `frontend/src/**` 的业务 UI**（除非必要只加极薄入口）。不要 git commit。

## 背景
`isFirstRun`（AppSettings）控制 OnboardingWizard 是否弹出；目前不方便反复测引导。

## 要求

### 1. 新增 Tauri command（lib.rs 注册）
```rust
#[tauri::command]
fn reset_onboarding_for_tests() -> Result<String, String>
```
行为：
- 加载 `~/.oleride/settings.json`
- 置 `is_first_run: true`（Rust 字段名以 `models::AppSettings` 实际为准；若前端是 camelCase 由 serde rename 处理则保持一致）
- 可选：不删 problems/chats，只重置 onboarding 相关（至少 isFirstRun）
- 保存并返回新 settings 的 JSON 字符串或 "ok"

### 2. CLI 一键脚本（Windows）
`D:\oler-ide-v2\scripts\reset-first-run.ps1`：
- 优先 `Invoke-Tauri` 不可行时：**直接改 JSON**：读写 `%USERPROFILE%\.oleride\settings.json`，把 `isFirstRun`/`is_first_run` 置 true；若文件不存在则写入最小 settings（含 isFirstRun true + 默认字段与 AppDefaults 对齐）
- 打印修改前后的关键字段
- 同时提供环境变量方式说明（若实现）

### 3. 环境变量旁路（推荐实现，最稳）
在 settings 加载路径（`storage::load_settings`）：
- 若 `OLYMPIA_FORCE_FIRST_RUN=1`，则强制返回 `is_first_run = true`（不影响落盘其它字段）
- 这样测试：`$env:OLYMPIA_FORCE_FIRST_RUN=1; & path\to\app.exe` 即每次首启

### 4. 单测
- `load_settings` 在 env 下 force first run
- JSON 往返 isFirstRun 字段名正确

## 验收
```
cd D:\oler-ide-v2\frontend\src-tauri
cargo check --all-targets
cargo test --lib
```

输出：改动文件列表 + 测试摘要 + 测试用法（env / ps1 各一行示例）。
