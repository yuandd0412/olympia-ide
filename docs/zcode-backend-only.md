# 分工：ZCode = 后端 only

仓库 `D:\oler-ide-v2`。**你只改 Rust 后端与必要 types；前端由另一代理改，禁止改 `frontend/src/**`。**

## 你负责（后端）

### 1. AI 聊天持久化（`storage.rs` + `lib.rs`）
- 文件：`~/.oleride/chats.json`，JSON 数组 `[{role, content, ts}]`，上限约 200 条。
- Commands（`lib.rs` 注册）：
  - `load_chats() -> Vec<ChatMessageOut>`
  - `save_chats(messages: Vec<ChatMessageIn>) -> Result<(), String>`
- 消息结构与现有 `ai::ChatMessage` 对齐，可扩展 `ts: u64`（ms）。

### 2. AI 上下文注入（`ai.rs` 或 `lib.rs`）
- `chat_with_ai` 在发请求前，若前端传入了可选字段则拼进最后一条 user 消息：
  - `context: Option<String>`（题目/代码/测例摘要由前端拼好传入）
- 或提供 `build_ai_context(...)` 辅助；保持向后兼容（字段全 Option）。

### 3. 超时杀子进程（`runner.rs`）
- `execute_code` / stress 超时路径必须 `child.kill().await`（Windows 可用 job object 若易做，否则 kill 即可）。
- 不改 verdict 字符串语义（AC/WA/TLE/RE/CE）。

## 前端契约（假定我会实现，不要改前端）
```ts
// tauri invoke
load_chats(): Promise<{role:string; content:string; ts?:number}[]>
save_chats(msgs): Promise<void>
chat_with_ai(messages, base_url?, api_key?, model?, context?: string)
```

## 验收（必须全绿）
```powershell
cd D:\oler-ide-v2\frontend\src-tauri
cargo check --all-targets
cargo test --lib
```
前端 build/lint 由我跑。

## 禁止
- 禁止改 `frontend/src/**`
- 禁止 git commit/push
- 禁止动 `docs/zcode-handoff-task.md` 以外无关文档
- 工作区已有未提交改动，不要 revert

完成后输出：改动文件列表 + 验证命令输出摘要。
