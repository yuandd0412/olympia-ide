---
feature: webview-sink
status: delivered
updated: 2026-09-26
branch: master
commits: 654172b  # feature work uncommitted on this base
---

# WebView 下沉（文档解析先下沉）

## Report

**What was built** — PDF 题目抽取从 WebView/`pdfjs-dist` 下沉到 Rust：`src-tauri/src/pdf_extract.rs` 实现 `extract_pdf_problems`（依赖 `pdf-extract` 0.12.1，移植 TS 启发式：标题正则、跨页切分、空行折叠）。Tauri 开 `protocol-asset`，viewer 改系统对话框取绝对路径、预览走 asset URL；`services/pdfExtract.ts` 变为对 Tauri 命令的薄封装。`pdfjs-dist` 运行时抽取路径移除，依赖随后在 adapter 收尾中彻底删除。

**Verification** — `cargo check --all-targets` ✅；`cargo test --lib` **48/48**（含 pdf_extract fixture）；`npm run build` ✅；`npm run lint` 0 error；`notices:check` ✅（清理后 244 packages）。

**Journey log**
- 并行 adapter-layer 同时改 viewer：最终 extract 经 `ports/document` → `pdfExtractAdapter` → 本命令，无双路径。
- blob URL 无法给 Rust：入口改为 dialog 绝对路径 + asset 协议预览。
- 跨实例一度回加 pdfjs 依赖：收尾删除；现 `src` 内仅注释提及。

## [S1] Problem

PDF 抽取（`services/pdfExtract.ts`）与部分重活全在 WebView 的 JS 里：启动贵、占内存、与「桌面应用」定位不符；题面/大文件路径也受 webview 沙箱限制。

## [S2] Design

### 策略（本 Spec 仅文档链路下沉，不动编辑器）

| 能力 | 现状 | 目标 |
|---|---|---|
| PDF 文本/题目抽取 | 纯前端 `pdfjs-dist` | **Rust 命令** `extract_pdf_problems(path) -> Vec<ExtractedProblem>`；JS 不再跑 pdf.worker |
| PDF **预览** | viewer 内 iframe | 本轮仍保留 iframe/浏览器能力（下沉预览成本高，见 Out of Scope） |
| 题面 Markdown+KaTeX | 前端渲染 | 不动（归 Spec visual/adapter） |

### 契约

```rust
#[tauri::command]
async fn extract_pdf_problems(path: String) -> Result<Vec<ExtractedProblem>, String>
```

- Rust 侧优先用已能编译的方案：`lodo`/`pdf-extract` 类 crate **或** 在 command 内 spawn 已打包的轻量提取（避免引入巨型依赖时，允许 Phase1 用 `pdfium` 绑定评估；实现方选一种可编译方案并写进 AGENTS）
- `ExtractedProblem` 字段与前端 `services/pdfExtract.ts` **字段级兼容**（id/title/pageStart/pageEnd…以现 TS 接口为准）
- 前端：`tauriApi.extractPdfProblems` 替换直接 pdfjs 调用；删除或降级 `pdfjs-dist` 动态依赖（`npm run notices` 须仍绿）
- 错误：中文可读 `Err(String)`，与现前端 catch 对齐

### 数据流

`ProblemViewerPanel.importPdf` → `tauriApi.extractPdfProblems(absolutePath)` → Rust 解析 → 同一 `ExtractedProblem[]` 进入现有导入向导状态机。

## [S3] Out of Scope

- PDF 预览 iframe 替换为原生
- Monaco/布局 ports（Spec adapter-layer）
- 视觉样式
- OJ 提交

## Tasks

- [x] T1: Rust `extract_pdf_problems` + 字段对齐 + 单测 — acceptance: `cargo test --lib` 含新测通过（48/48）(covers: S2)
- [x] T2: `tauriApi`/viewer 切换到新命令；移除 pdfjs 运行时抽取路径 — acceptance: build 无 pdfjs 抽取引用；lint 0 error (covers: S2; depends: T1)
- [x] T3: `notices` 与双端验收 — acceptance: cargo + build + lint 全绿 (covers: S2; depends: T2)
