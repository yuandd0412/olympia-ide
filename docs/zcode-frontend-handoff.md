# 任务：Olympia 前端交给 ZCode（设计稿执行）

仓库：`D:\oler-ide-v2`。你从本文件起**负责 `frontend/src/**` 实现**；设计约束见下，不要推翻设计系统。不 git commit。

## 设计系统（必须遵守，来自已完成工作）
- 读 `frontend/src/lib/motion.ts`：统一用 `tabFade` / `modalShell` / `modalCard` / `fadeItem` / `EASE_OUT`
- 引导参考 `OnboardingWizard.tsx`：进度点、`N/M · 徽章`、交错 45ms fade、reduced-motion
- 题面公式统一走 `components/common/MathMarkdown.tsx`（含 `prepareMath` 处理 `\red`）
- 颜色只用 CSS 变量：`--accent` / `--bg-*` / `--text-*` / `--border`；状态色 AC 绿 / WA 红 / TLE 橙
- 密度：信息优先，13px 正文、圆角 ≤ 16px（模态可用 16）

## 本批前端任务（按序做）

### F1 · 练习文件夹 UI 打磨（后端已就绪）
- Settings「练习文件夹」：显示路径 + 选择按钮 +「在资源管理器打开」（可用现有 `open_url`/`open` 或跳过若无命令）
- 打开题目若从文件夹命中，状态栏或标签页 title 加小图标/`●` 提示「已加载磁盘文件」
- 保存成功 toast/瞬时提示路径（若有现有通知模式则复用，无则不新增全局 toast 系统）

### F2 · 题面侧栏空态与加载
- `ProblemViewerPanel`：导入/解析中显示骨架或 spinner（`fetchOnlineProblem` 期间）
- 空题面保留现有提示；有 hint/样例时分区卡片间距统一 `gap-3`

### F3 · AI 教练会话栏
- 顶部与引导一致：badge「AI」+ 模型名 chip（来自 `settings.aiModel`）
- 错误消息保留；加载态与 `AiCoachPage` 现有 spinner 一致

### F4 · 小清理
- 确认无未使用 import / 死组件（若 `TrainingPage` 仍无路由则文件可保留不接线）
- `npm run build && npm run lint` 必须 0 error（6 条 intentional warning 可保留）

## 禁止
- 不改 `src-tauri/**`（另一批已交后端）
- 不引入新 UI 库（已有 framer-motion / lucide / tailwind）
- 不重做整体信息架构 / 五页导航

## 验收
```
cd D:\oler-ide-v2\frontend
npm run build
npm run lint
```
输出：改动文件列表 + 验收输出摘要。

## 设计协作约定
- 实现前若与上冲突，以本文件与 `lib/motion.ts`、`MathMarkdown` 为准
- 大改布局先在回复里列 3 行方案再动手
