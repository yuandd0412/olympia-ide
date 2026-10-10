# Olympia IDE → ZCode 交接任务书

## 背景
仓库：`D:\oler-ide-v2`（产品名 Olympia IDE）
栈：Tauri 2 + React 19 + TypeScript + Monaco + Rust
验证命令（必须全绿才算完成）：
```powershell
cd D:\oler-ide-v2\frontend
npm run build
npm run lint          # 允许已知的 6 条 intentional react warnings，0 errors
cd src-tauri
cargo check --all-targets
cargo test --lib
```

## 工作区注意
当前有未提交改动（勿随意 revert）：
- `frontend/src/App.tsx`
- `frontend/src/components/common/OnboardingWizard.tsx`
- `frontend/src/stores/useAppStore.ts`
- `docs/08-roadmap/phases.md`
- `frontend/src-tauri/THIRD-PARTY-NOTICES.md`

## 任务 A（主任务）：AI 教练可用性补齐
文件：`frontend/src-tauri/src/ai.rs`、`lib.rs`、`frontend/src/components/ai/AiCoachPage.tsx`、`storage.rs`、`useAppStore.ts`

1. **对话持久化**：会话写入 `~/.oleride/chats.json`（数组，含 role/content/time），启动时加载最近会话；提供 Rust command `load_chats` / `save_chats`（或等价设计）。
2. **上下文注入**：发给 AI 前自动附带：
   - 当前题目 id/标题（若有）
   - 当前编辑器代码（截断到合理长度，如 8k chars）
   - 最近一次 run/stress 结果摘要（verdict、失败用例 expected/actual 各截断）
3. **本地 Ollama 默认友好**：设置页 AI baseUrl 占位/文档注明可用 `http://127.0.0.1:11434/v1`；**不要**把真实 API key 写进代码或提交。
4. 保持非流式也可以，但超时/错误要在 UI 有明确展示（已有 120s timeout 保留）。

## 任务 B（次任务，时间够再做）：runner 超时杀进程
文件：`frontend/src-tauri/src/runner.rs`
- 超时路径必须 `Child::kill`（及/或 Windows Job Object），避免僵尸 g++ 子进程。
- 保持现有 verdict 语义（AC/WA/TLE/RE/CE）不变。

## 明确不做
- 不要实现 OJ 真实提交（`submit_problem` 仍保持 placeholder 或另开任务）
- 不要大范围重构 `useAppStore.ts`
- 不要改品牌/UI 视觉 token
- 不要 git commit / push，除非用户明确要求

## 完成定义
- 上述 4 条验证命令通过
- 简要报告：改了哪些文件、如何手测（AI 会话重启仍在、超时能杀进程）
