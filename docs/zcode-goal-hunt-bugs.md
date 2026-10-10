# 目标模式 · 持续找 Bug（Olympia IDE）

仓库：`D:\oler-ide-v2`。本会话用**目标模式**持续推进，直到目标完成或你主动停下。

## 目标（Goal）
在不改变产品行为的前提下，找出并修复 **Olympia IDE** 中真实的 bug：
- 崩溃 / 数据丢失 / 错误状态卡死
- 逻辑错误（保存、打开、评测、导入、AI、引导）
- 明显资源泄漏（进程、文件句柄、未清理 temp）
- 前后端契约不一致（Tauri command 参数/返回值）

**不要**：重构大架构、改视觉设计、加新功能、git commit/push。

## 工作方式（循环）
1. **读** `AGENTS.md` + `docs/08-roadmap/phases.md` 已知缺陷
2. **扫** 高风险文件：
   - `frontend/src-tauri/src/{runner,stress,multi_oj,enrich,practice,storage,lib}.rs`
   - `frontend/src/stores/useAppStore.ts`
   - `frontend/src/components/{editor,viewer,ai,problems}/*`
3. **每轮只修 1–3 个确认的 bug**，修完立刻：
   ```
   cd D:\oler-ide-v2\frontend\src-tauri && cargo check --all-targets && cargo test --lib
   cd D:\oler-ide-v2\frontend && npm run build && npm run lint
   ```
4. 全绿后继续下一轮；失败则回滚该轮最小改动再试
5. 日志式输出：`[bug N] 文件:行 — 问题 — 修法 — 验证`

## 已知优先线索（从高到低）
- runner/stress：超时杀进程后的 exe 清理、并发多测例、stdout 缓冲
- practice 文件夹：路径分隔符、无权限目录、匹配歧义（P1 vs P10）
- multi_oj/enrich：HTML 变体、AI 超时后半截 JSON、样例配对错位
- useAppStore：tab 关闭/保存竞态、problemFiles 与磁盘不一致
- AiCoach：赛事锁、会话加载失败、context 过长
- Onboarding/Settings：保存丢字段、组件在 early-return 前 hooks

## 完成定义
- 至少修复 **≥5 个** 可验证 bug，且全部验收命令保持全绿
- 或明确列出「查过但无法安全修」的清单（附证据）

持续直到上述完成，不要中途问确认（目标模式）。
