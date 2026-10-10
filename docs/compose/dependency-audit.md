# 依赖审计 · dependency-audit

> 生成：2026-09-26 · 对应 spec：`docs/compose/spec/library-min.md`（T1）
> 方法：对 `frontend/src/**`、`vite.config.ts`、`index.html` 全量 grep import 语句；`package-lock.json` 反向依赖核查（谁还依赖它）；`node_modules` 逐包磁盘占用（`du -sk`，含 sourcemap 等非运行时文件，仅作量级参考）；`tsconfig*.json` 的 `types` 字段核查。

## 结论汇总

- **drop 3 项**：`clsx`、`tailwind-merge`（dependencies，零引用且 lock 反查无传递消费者）、`@types/katex`（devDependencies，零引用；卸载后因是 `rehype-katex`/`micromark-extension-math` 的声明依赖而自动转为传递依赖保留，类型不丢）。
- **defer 0 项**：无"疑似可删但证据不足"的项。
- **其余 25 项 keep**。`pdfjs-dist` 已随 webview-sink 落地从 package.json 移除（不在本轮清单内）。
- 运行时赢面很小（三个死依赖合计 < 50 KB bundle 量级），收益主要在：安装体积（~1.0 MB，tailwind-merge 为主）、依赖面收敛、以及"package.json 不留未引用依赖"这一验收项本身。

## T2 执行记录（2026-09-27 实跑回填）

| 动作 | 结果 |
|---|---|
| `npm uninstall clsx tailwind-merge @types/katex` | package.json 三项全部移除；lock 同步移除 clsx、tailwind-merge 条目（工作区对 HEAD 累计 -300 行，其中大部分为此前 pdfjs-dist/@napi-rs-canvas 的既有未提交清理）。`removed 2 packages`——clsx、tailwind-merge 实体移除；`@types/katex` 因是 `rehype-katex`/`micromark-extension-math` 的**声明依赖**而自动转为传递依赖保留（类型不丢；且 katex 0.16+ 自带 `types/katex.d.ts`，@types/katex 本身是 DefinitelyTyped stub） |
| `npm run notices` | 重新生成 `src-tauri/THIRD-PARTY-NOTICES.md`：242 packages（88 scoped）；附录移除 clsx、tailwind-merge 条目（对 HEAD 累计 -18 行，另含先前 xterm/pdfjs-dist/canvas 既有清理） |
| `npm run build` | ✓ exit 0（tsc -b + vite build，7.8s；936 kB 主 chunk 体积提示为既有信息级输出） |
| `npm run lint` | ✓ 0 error / 4 warning，恰为 AGENTS.md 记录的 4 条 intentional 项，无新增 |
| `npm run notices:check` | ✓ "appendix is up to date (242 packages, 88 scoped)" |

## dependencies（17 项）

| 包 | 版本 | 引用位置（grep 证据） | node_modules 体积 | 结论 | 理由 |
|---|---|---|---|---|---|
| `@monaco-editor/react` | ^4.7.0 | `adapters/editor/MonacoEditorAdapter.tsx`（仅此一处） | 0.2 MB | **keep** | 编辑器 React 壳，已经 ports/editor 收敛到 adapter 层 |
| `@tauri-apps/api` | ^2.11.1 | `services/tauriApi.ts`（core.invoke/event.listen）、`components/common/CustomTitleBar.tsx`（window.getCurrentWindow） | 0.8 MB | **keep** | Tauri IPC 基础设施，无替代 |
| `@tauri-apps/plugin-dialog` | ^2.7.2 | `services/tauriApi.ts`（仅此一处） | <0.1 MB | **keep** | 文件对话框，tauri.conf.json 已注册插件 |
| `@tauri-apps/plugin-fs` | ^2.5.1 | `services/tauriApi.ts`（仅此一处） | 0.1 MB | **keep** | 前端文件读写，同上 |
| `clsx` | ^2.1.1 | **无**（src/index.html/vite.config 全查为 0） | <0.1 MB | **drop** | 死依赖；lock 反查无传递消费者 |
| `framer-motion` | ^13.1.1 | `App.tsx`、`main.tsx`、`lib/motion.ts`（type Transition）+ 9 个组件文件（共 12 处 import） | 5.3 MB | **keep** | 动画基座；动效 token 已抽到 ports/motion，直接 import motion 组件是现状，替换成本高（spec 明确不强制） |
| `katex` | ^0.18.4 | `adapters/document/MarkdownMathAdapter.tsx`（`katex/dist/katex.min.css`）；TS 代码无直接 import | 4.3 MB | **keep** | rehype-katex 的运行时 peer + 公式样式来源，仅经 ports/document |
| `lucide-react` | ^1.34.0 | 16 个组件文件（App/各 Page/Bar 系） | 36.3 MB | **keep** | 唯一图标库；tree-shaking 后仅打包用到的图标 |
| `monaco-editor` | ^0.56.0 | `services/monacoCpp.ts`（type-only import） | 97.1 MB | **keep** | 编辑器内核；类型经 services 层喂给 adapter，组件层零直接引用 |
| `react` | ^19.2.8 | 全局（JSX runtime 隐式 + hooks 显式） | 0.2 MB | **keep** | 框架 |
| `react-dom` | ^19.2.8 | `main.tsx`、`adapters/editor/editorHost.ts` | 7.1 MB | **keep** | 框架；editorHost 需要 ReactDOM API |
| `react-markdown` | ^10.1.0 | `adapters/document/MarkdownMathAdapter.tsx`（仅此一处） | 0.1 MB | **keep** | Markdown 渲染，仅经 ports/document |
| `react-resizable-panels` | ^4.12.3 | `adapters/layout/ReactPanelsAdapter.tsx`、`adapters/layout/useSplitLayout.ts` | 0.6 MB | **keep** | 分栏布局，仅经 ports/layout；自研 grid 属可选优化，不强制 |
| `rehype-katex` | ^7.0.1 | `adapters/document/MarkdownMathAdapter.tsx`（仅此一处） | 4.4 MB | **keep** | 公式渲染管线，仅经 ports/document |
| `remark-math` | ^6.0.0 | `adapters/document/MarkdownMathAdapter.tsx`（仅此一处） | <0.1 MB | **keep** | 数学语法解析，同上 |
| `tailwind-merge` | ^3.6.0 | **无**（src/index.html/vite.config 全查为 0） | 1.0 MB | **drop** | 死依赖；无 `cn()` 工具消费它；lock 反查无传递消费者 |
| `zustand` | ^5.0.15 | `stores/useAppStore.ts` | 0.2 MB | **keep** | 唯一状态管理，替换无收益 |

## devDependencies（11 项）

| 包 | 版本 | 引用位置 | 结论 | 理由 |
|---|---|---|---|---|
| `@tailwindcss/vite` | ^4.3.3 | `vite.config.ts` | **keep** | Tailwind v4 的 Vite 集成 |
| `@tauri-apps/cli` | ^2.11.4 | `npm run tauri`（dev/build 脚本链） | **keep** | Tauri CLI |
| `@types/katex` | ^0.16.8 | **无**（无 TS 代码 import `katex` 模块；`tsconfig.app.json` 的 `types` 仅 `["vite/client"]`） | **drop** | 死类型包（DT stub——katex 0.16+ 自带 `types/katex.d.ts`）；顶层移除后由 rehype-katex / micromark-extension-math 的声明依赖自动转为传递依赖 |
| `@types/node` | ^24.13.3 | `tsconfig.node.json` 的 `"types": ["node"]`（vite.config.ts 编译环境） | **keep** | 显式引用 |
| `@types/react` | ^19.2.18 | 全局类型 | **keep** | React 类型 |
| `@types/react-dom` | ^19.2.4 | 全局类型 | **keep** | 同上 |
| `@vitejs/plugin-react` | ^6.1.0 | `vite.config.ts` | **keep** | React fast refresh |
| `oxlint` | ^1.79.0 | `npm run lint` | **keep** | Linter（已知 4 条 intentional warning，见 AGENTS.md） |
| `tailwindcss` | ^4.3.3 | `@tailwindcss/vite` 的运行时引擎 | **keep** | v4 架构下必须显式安装 |
| `typescript` | ~6.0.2 | `npm run build`（tsc -b） | **keep** | 编译器 |
| `vite` | ^8.2.2 | `npm run dev/build/preview` | **keep** | 构建器 |

## 复查命令（下次审计直接用）

```bash
cd /d/oler-ide-v2/frontend
# 每个依赖的 import 位置
for dep in <deps>; do grep -rEln "from ['\"]${dep}(/|['\"])" src --include='*.ts' --include='*.tsx'; done
# lock 反向依赖（是否被其他包传递依赖）
node -e "const l=require('./package-lock.json'); for(const [k,v] of Object.entries(l.packages)){for(const t of ['clsx','tailwind-merge']) if(v.dependencies?.[t]) console.log(k||'(root)','->',t)}"
```
