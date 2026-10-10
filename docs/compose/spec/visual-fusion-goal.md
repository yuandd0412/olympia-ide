# 目标模式 · Spec3 视觉融合（可与 Spec4 并行）

仓库：`D:\oler-ide-v2`。目标模式连续执行，中途不要停下来问确认。

## 并行红线（必须遵守）
- **另一实例**只动 `docs/compose/dependency-audit.md` 与 `frontend/package.json`。
- **你只许改**：`frontend/src/lib/design/**`（新建）、`ActivityBar.tsx`、`StatusBar.tsx`、`ContestBar.tsx`、以及（若时间富余）`monacoTheme` 与 PDF 外框 **仅限 ports 的 adapter 文件内加包装类名**——**不要**改 `ports/*.ts` 接口签名。
- **禁止**：`src-tauri`、`package.json`、`website`、git commit/revert、大范围重写 `App.tsx`/`SettingsPage`。

## Goal
按 `docs/compose/spec/visual-fusion.md` 完成 T1–T3（可裁剪到 T1+T2 若时间紧，但目标优先做完）：

1. **T1** `lib/design/tokens.ts`（从 `index.css` CSS 变量导出 TS 常量；禁止新 hex 魔法值散落）+ 薄原语 `OButton` / `OCard` / `OEmpty`（可选 `OSection`），统一圆角、border、focus、hover。
2. **T2** `ActivityBar` / `StatusBar` / `ContestBar` 改用上述原语与 tokens；动效只用 `ports/motion`（`lib/motion`）已有曲线。
3. **T3** 若有余力：`services/monacoTheme.ts` 色值改为引用 tokens；PDF/iframe **仅在 adapter 组件**外包 `OCard` 类名。

风格约束：信息密度、13px 正文感、圆角与现网一致；`prefers-reduced-motion` 不破坏。

## 验收
```
cd D:\oler-ide-v2\frontend
npm run build
npm run lint
```
0 error；warning 不得超过当前 4 条（不得回涨）。

## 完成定义
- `visual-fusion.md` 任务勾选 + 简短 Report
- build/lint 绿
