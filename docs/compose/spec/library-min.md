---
feature: library-min
status: done
updated: 2026-09-27
branch: master
commits:
---

# 第三方库精简与受控

## Report

- **T1 完成**（2026-09-27）：`docs/compose/dependency-audit.md` 覆盖全部 17 项 dependencies + 11 项 devDependencies，逐项给出引用位置（grep 证据）、node_modules 磁盘体积、keep/drop/defer 与一句话理由。结论：keep 25 / drop 3 / defer 0。`pdfjs-dist` 维持 webview-sink 之后的已移除状态。
- **T2 完成**：drop `clsx`、`tailwind-merge`（零引用死依赖，lock 反查无任何传递消费者）；顶层移除 `@types/katex`（DT stub，katex 0.16+ 自带类型；卸载后经 `rehype-katex`/`micromark-extension-math` 的声明依赖自动转为传递依赖保留）。package-lock 同步移除 clsx/tailwind-merge 条目，`npm run notices` 重新生成附录（242 包，clsx/tailwind-merge 条目移除）。
- **验收（2026-09-27 全绿）**：`npm run build` exit 0（tsc -b + vite build，7.8s）；`npm run lint` 0 error / 4 warning（恰为 AGENTS.md 记录的 4 条 intentional 项，无新增）；`npm run notices:check` appendix up to date。
- **边界**：未触碰 `src/components/**`、`src/ports/**`、`src/adapters/**`、`src-tauri/**`、`website/**`；未 git commit；与 visual-fusion 并行实例无文件交集。

## [S1] Problem

依赖多且直接散用；版本升级与替换成本高，也无法证明「必须用它」。

## [S2] Design

在 adapter-layer 落地后执行盘点与收敛：

| 库 | 策略 |
|---|---|
| monaco-editor / @monaco-editor/react | **保留**，仅经 ports/editor |
| react-resizable-panels | **保留**，仅经 ports/layout；评估是否可用更小的自研 grid（可选，不强制） |
| pdfjs-dist | 抽取下沉后 **移除运行时依赖**（若预览仍需则留 iframe 外的最小使用并标注） |
| katex + remark/rehype | **保留**，仅经 ports/document |
| framer-motion | **保留**，仅经 ports/motion；高成本替换不强制 |
| react-markdown | 仅经 ports/document |
| lucide-react | 保留（图标） |

流程：
1. 生成 `docs/compose/dependency-audit.md`（谁在用、大小、替换成本、结论 keep/drop/defer）
2. 执行 drop 项并跑 `npm run notices`
3. `package.json` 不留未引用依赖

## [S3] Out of Scope

- 自研编辑器/布局引擎
- 为减而减导致功能回退

## Tasks

- [x] T1: 依赖审计文档 — acceptance: 每项依赖有 keep/drop/defer + 证据 (covers: S2)
- [x] T2: 执行至少 1 项 drop（优先 pdfjs 抽取路径已随 sink 删除后的残留） — acceptance: package.json/无 import 一致；build lint notices 绿 (covers: S2; depends: T1)
