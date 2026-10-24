---
feature: adapter-layer
status: delivered
updated: 2026-09-26
branch: master
commits: 654172b  # feature work uncommitted on this base; range TBD at first commit
---

# Adapter Layer（外部能力融合骨架）

## Report

**What was built** — 建立 `src/ports/{editor,layout,document,motion}` 稳定接口与 `src/adapters/**` 第三方实现（Monaco、react-resizable-panels、Markdown+KaTeX、PDF、motion token）。`components/**` 与 `App.tsx` 全部改为经 ports 访问外部能力；layout port 采用 React 形态（对 spec 命令式 API 的有意偏离，避免对 v4 panels 嵌套 createRoot）。原 `MathMarkdown` 保留为 deprecated shim。AGENTS.md 前端节写入 ports 约定与 grep 验收。死文件 `pdfjsExtractAdapter.ts` 与依赖 `pdfjs-dist` 已删除。

**Verification** — `npm run build` ✅；`npm run lint` 0 error / 4 warning（已少于旧 6 条基线）；`npm run notices:check` ✅（244 packages）；components 内第三方 import grep 为空；`cargo test --lib` 48/48（回归，非本 spec 主验）。

**Journey log**
- 与 webview-sink 并行：viewer/pdfExtract 被下沉改写，T3 改为 adapter 包装 `tauriApi.extractPdfProblems`。
- `pdfjsExtractAdapter` 曾为竞态废稿，清理阶段删除；`pdfjs-dist` 随之移出依赖。
- lint 债从 6→4：SettingsPage 两条被并行重构消除，非本 spec 回归。

## [S1] Problem

Olympia 整壳跑在 Tauri WebView 内，多类开源能力以「直接照搬」方式散落在组件里：

- 编辑器：`@monaco-editor/react` 在 `MonacoCodeEditor` / `SettingsPage` / `StressTesterPage` 各自实例化
- 布局：`react-resizable-panels` 在 `App` / `StressTesterPage` 各自 `useDefaultLayout`
- 文档：PDF 用 **裸 iframe** 嵌在 `ProblemViewerPanel`；题面是 `MathMarkdown` 直连 KaTeX；PDF 抽取另走 `pdfjs-dist`
- 动效：`framer-motion` 与 `lib/motion.ts` token 已有约定，但组件仍手写大量 `motion.*`

结果是：视觉/交互像拼盘；后续想「视觉统一、WebView 下沉、换库」时没有稳定挂点，每处都要改调用方。

本轮（Spec1）只搭**适配层骨架与迁移约定**，不换库、不改视觉、不把解析下沉 Rust。

## [S2] Design

### 目标

组件**只依赖本仓库 port 接口**；具体开源实现收敛为 adapter。后续 Spec（视觉封装 / WebView 下沉 / 精简换库）通过替换 adapter 或收紧 port 实现，不再改业务组件。

### 分层

```
components/**          →  只 import ports/* 与设计 token
lib/design/**          →  Olympia 主题、motion token、共用 UI 原语（已有 motion.ts 演进）
adapters/**            →  monaco / panels / pdf / markdown / motion 的第三方实现
ports/*                →  稳定 TypeScript 接口 + 少量工厂函数
stores/services        →  可继续用 tauriApi；对 UI 能力改走 ports
```

### Ports（最小集）

1. **`ports/editor`**
   - `createEditorHost(container, options): EditorHost`
   - `EditorHost`: `getValue/setValue/getModelMarkers/setModelMarkers/dispose/onDidChangeModelContent/addCommand`
   - options：fontSize、fontFamily、themeName、language、tabSize —— **只暴露 Olympia 字段**，不透传 Monaco raw options（raw 仅 `editorOptionsExtras?: Record<string, unknown>` 逃生舱，标注 deprecated）
2. **`ports/layout`**
   - `PanelSpec { id, defaultSize, minSize, maxSize, collapsible? }`
   - `createSplitLayout(el, { orientation, panels, onLayout }): LayoutHost`
   - `LayoutHost`: `expand/collapse(id)/getSizes/setSizes/dispose`
   - 不再在业务组件里 `import { Group as PanelGroup }`
3. **`ports/document`**
   - `renderMarkdown(el, md, opts): void`（内部仍可用 MathMarkdown/KaTeX，但组件不直接 import katex/react-markdown）
   - `openPdf(el, path, page?): PdfHost` / `PdfHost.setPage/dispose`
   - `extractPdf(path): Promise<ExtractedProblem[]>`（现 `pdfExtract` 变为 adapter 实现）
4. **`ports/motion`**
   - re-export 已有 `lib/motion.ts` 的 `tabFade/modalShell/modalCard/fadeItem/EASE_*`，并规定新 UI **禁止**在组件内散写未登记的缓动曲线
   - 提供 `createStagger(listEl, opts)` 包 IntersectionObserver（官网 main.js 同类逻辑可复用思路，但本轮只做应用内）

### 融合规则（写进 AGENTS 简短条目）

- 新代码禁止从 `@monaco-editor/react`、`react-resizable-panels`、`pdfjs-dist`、`katex` 直接 import（lint 或简单 oxlint 自定义/目录约定；若成本高则 AGENTS+review 约定）
- 第三方类型不出现在 `components/**` 的公开 props
- adapter 允许在 `adapters/**` 内持有第三方类型

### 迁移（本 Spec 必做）

| 现调用点 | 迁到 |
|---|---|
| `MonacoCodeEditor.tsx` | `ports/editor` |
| `SettingsPage` 代码预览 Editor | `ports/editor` |
| `StressTesterPage` 双栏 + Editor | `ports/editor` + `ports/layout` |
| `App.tsx` 主分栏 | `ports/layout` |
| `ProblemViewerPanel` PDF iframe | `ports/document` |
| `ProblemViewerPanel` / detail / AI 的 Markdown+KaTeX | `ports/document`（`renderMarkdown`） |
| `pdfExtract.ts` 调用方 | `ports/document.extractPdf` |

### 明确不做（本 Spec）

- 不替换 Monaco/panels/pdfjs/KaTeX 版本
- 不改视觉 token、不做 native 下沉
- 不改 `src-tauri`
- 不动 `website/`
- 不引入新 UI 框架

### 测试边界

- ports 提供纯 TS 单测可测的部分：`LayoutSpec` 尺寸合并、`panel id` 校验、`renderMarkdown` 在 jsdom 不可用时 skip（以 build/lint 为主）
- 迁移验收以 **现有 `npm run build && npm run lint` 0 error + 6 条 warning 基线** 为准

## [S3] Out of Scope

- 视觉重塑 / 新组件库
- Rust 下沉 PDF 或解析
- 删除或替换 Monaco、react-resizable-panels、pdfjs-dist、KaTeX
- OJ 提交、题库功能变更
- 发布安装包、官网

## Tasks

- [x] T1: 建立 `ports/*` 接口与 `adapters/{editor,layout,document,motion}` 目录骨架与最小实现（motion 先 re-export） — acceptance: `npm run build` 通过，components 尚未全部迁移也可先绿 (covers: S2)
- [x] T2: 迁移编辑器与布局调用点到 ports（MonacoCodeEditor / Settings / Stress / App 主分栏） — acceptance: 无从 components 直接 import `@monaco-editor/react` 或 `react-resizable-panels`；build+lint 绿 (covers: S2; depends: T1)
- [x] T3: 迁移文档渲染与 PDF（MathMarkdown 调用点 + iframe + pdfExtract）到 `ports/document` — acceptance: 题面侧栏/详情/AI 仍能渲染公式；build+lint 绿 (covers: S2; depends: T1)
- [x] T4: 在 `AGENTS.md` 前端节增加「外部能力必须经 ports」约定 + 简单 grep 式验收命令写入任务书 — acceptance: 文档存在且列出禁令与目录 (covers: S2; depends: T2)
- [x] T5: 全量验收 build/lint，确认 warning 基线不涨 — acceptance: 0 error；实测 warning=4（≤6，因并行重构消除 2 条旧债）(covers: S2; depends: T2; T3; T4)
