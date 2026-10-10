# 批次 2 · 后端任务（ZCode / GLM）

仓库：`D:\oler-ide-v2`。**只改 Rust（`frontend/src-tauri/src/**`），禁止改 `frontend/src/**`。**

工作区已有未提交改动（含 enrich.rs / multi_oj 解析 / 前端引导），**不要 revert**。不要 git commit/push。

## 任务 1 · AI 富化：超时与降级（enrich.rs）
- `ask_extract` 超时改为 connect 10s / total 45s（抓取导入不应卡 2 分钟）
- 响应若非 JSON，再试一次「去掉 response_format」的请求（已有雏形则核对）
- `enrich_problem` 全程 `tokio::time::timeout` 包住，超时返回原题
- 单测：`extract_json_object` 能吃 `{"a":1}` 前后有杂字

## 任务 2 · runner 超时后回收 exe（runner.rs / stress.rs）
- 超时 kill 后，确保 temp 下 `{uuid}.exe` 尽量删除（best-effort，失败忽略）
- 不改 verdict 字符串语义

## 任务 3 · chats.json 损坏自愈已做过；补 AI 教练历史上限
- `save_chats` 已 cap 200；在 `load_chats` 对超大单条 content 截断到 32k 字符（防 AI 回写爆炸）

## 任务 4 · 导入命令可观测
- `lib.rs` 的 `fetch_problem_online`：在 debug 日志或返回前，若 AI enrich 成功/失败可不改 API；仅当 description 仍为空时保持现状
- **不要**改 Tauri command 签名（前端已绑定）

## 验收（全绿）
```
cd D:\oler-ide-v2\frontend\src-tauri
cargo check --all-targets
cargo test --lib
```

完成后输出：改动文件列表 + 测试摘要。
