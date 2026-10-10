---
feature: visual-fusion
status: delivered
updated: 2026-09-27
branch: master
commits:
---

# 视觉与交互融合（设计系统封装）

## Report

### 2026-09-27 · T1–T3 落地（goal 模式，与 dependency-audit 实例并行）

**交付物**
- `lib/design/tokens.ts`：`bg` / `fg` / `line` / `brand` / `verdict`（全部 `var(--…)` 引用 index.css 变量）、`tint`（比赛紧急度 rgba）、`themeIcon`、`statusSurface(theme)`、`editorPalette`（Monaco 原始色板）、类令牌 `radius` / `borders` / `states` / `focusRing` / `buttons`。**无新增颜色**：每个 raw hex/rgba 均为既有值的原样搬迁（Monaco 色板来自 monacoTheme.ts；`#7aa2f7`/`#e5a43b` 来自 ActivityBar/StatusBar；WA/TLE alpha 来自 ContestBar 既有工具类）。
- `lib/design/ui.tsx`：`OButton`（primary/ghost/outline/accent/accentSoft/onAccent/danger/dangerOutline × xs/sm/md/icon）、`OCard`（surface/elevated/base 三色调）、`OSection`、`OEmpty`、`O_CARD_FRAME`（供 motion.div 复用卡片皮肤）。纯 DOM + Tailwind，零第三方依赖。variant 设计为互斥类集——激活态用 variant 切换而非 className 覆盖，规避同类属性在生成 CSS 中不可预测的覆盖顺序。
- `lib/design/index.ts`：barrel。

**T2 组件迁移**
- ActivityBar：导航/设置按钮 → OButton（激活态 `onAccent`/`accentSoft` variant）；aside 底色描边走 `bg`/`line`；主题切换按钮**保留 bespoke**（需 `transition-all` 的 scale 微交互，会与 OButton 的 `transition-colors` 冲突）；图标色走 `themeIcon`。`Date.now()` 豁免行原样保留。
- StatusBar：脚手架色 → `statusSurface`/`line`/`fg`；判定色全部改 `--color-*` 变量类；主题胶囊 → OButton ghost xs。深色状态栏底色 `#181818`→`var(--bg-base)`（#1e1e1e）、边框/文字改跟主题变量——有意的融合对齐。
- ContestBar：内联缓动 `[0.16,1,0.3,1]` → `ports/motion` 的 `EASE_MODAL`，弹窗改用 `modalShell`/`modalCard` 预设并接入 `useReducedMotion`；颜色全走 `tint`/`verdict`/`bg`/`line`/`fg`；三个按钮 → OButton（dangerOutline/outline/danger）；信息框 → OCard(elevated)；弹窗卡片 → `O_CARD_FRAME`（rounded-2xl 统一为 rounded-xl）。`set-state-in-effect` 豁免行原样保留。

**T3 嵌入件**
- `services/monacoTheme.ts`：色板改从 `lib/design/tokens` 的 `editorPalette` 构建（Monaco defineTheme 无法读 CSS 变量，故 tokens 内保留原始 hex 镜像），主题同步逻辑不变。
- `adapters/document/PdfIframeAdapter.tsx`：iframe 外包 `O_CARD_FRAME`（圆角裁切+主题描边，消灭生硬黑边）；`ports/document.ts` 签名未动，消费方 className 落在外框上。加载占位未做（goal 限定 adapter 内仅加包装类名）。

**验收**：`npm run build` 绿（tsc + vite，4.4s）；`npm run lint` 0 error / 4 warning —— 与基线持平不回涨（仍为 AiCoachPage:59、ActivityBar:17、ContestBar:17、OnboardingWizard:50 四条既定豁免，仅行号偏移）。

**范围与遗留**
- 文件范围遵守红线：仅 `lib/design/**`（新建）+ 三 Bar + monacoTheme + PDF adapter；`ports/*.ts`、`package.json`、`src-tauri`、`website`、git 提交均未触碰。
- 未做（超出本goal文件授权）：O* 单页演示页（需动 Settings/App.tsx）；弹窗全面迁移 modalShell 规范（S2.3 剩余项）；视觉回归需真机确认（布局结构未变，仅记录了上述两处有意的样式统一）。

## [S1] Problem

同一产品内 Monaco 主题、framer 动画、手写 Tailwind、PDF iframe、各弹窗圆角/间距不一致，观感「多库拼盘」而非 Olympia 一体。

## [S2] Design

### 设计系统落点（仅前端，不碰 tauri）

1. **`lib/design/tokens`**：从现有 `index.css` 变量导出 TS 常量（色、圆角、间距、elevation），禁止新 hex 魔法值
2. **`lib/design/ui` 原语**（薄封装，非新库）：
   - `OCard` / `OSection` / `OButton` / `OField` / `OBadge` / `OEmpty`
   - 统一：圆角、border、focus ring、hover、`fadeItem` 入场
3. **嵌入件皮肤**：
   - Monaco：统一 `monacoTheme` 对齐 tokens；分栏把手、Tab bar 与 OCard 同系
   - PDF iframe：外框 OCard + 加载占位，消灭「生硬黑边」
   - 弹窗：全部走 `modalShell/modalCard` + OCard 标题栏规范
4. **动效**：禁止新缓动；只用 `lib/motion` 登记曲线

### 迁移顺序（避免与 adapter-layer 抢文件）

- 本 Spec **允许**在 adapter 完成后改同一批组件；若并行，仅允许新建 `lib/design/**` 与 `ActivityBar`/`StatusBar`/`ContestBar` 等**未**被 adapter 大改的文件
- 并行期间以 `lib/design` 交付为主，组件替换列为后续任务

## [S3] Out of Scope

- 换掉 Monaco/panels
- Rust
- 产品信息架构

## Tasks

- [x] T1: `lib/design/tokens` + `OButton/OCard/OEmpty` 与单页演示（可挂 Settings 或独立 demo 路由） — acceptance: build/lint 绿；tokens 无新增 raw hex (covers: S2) — 2026-09-27 tokens+三原语(+OSection)落地；演示页因文件范围红线未做
- [x] T2: 将 ActivityBar/StatusBar/ContestBar 改用 O* 原语 — acceptance: 视觉回归无布局破碎；lint 基线 6 (covers: S2; depends: T1) — 2026-09-27 完成；lint 0 error / 4 warning（低于基线 6）
- [x] T3: Monaco 主题与 iframe 外框对齐 tokens — acceptance: 主题变量引用 lib/design；iframe 有 OCard 包装 (covers: S2; depends: T1) — 2026-09-27 editorPalette 引用 + OCard 框架包装（ports 签名未动）
