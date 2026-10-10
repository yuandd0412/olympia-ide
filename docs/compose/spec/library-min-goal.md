# 目标模式 · Spec4 依赖审计与精简（可与 Spec3 并行）

仓库：`D:\oler-ide-v2`。目标模式连续执行，中途不要停下来问确认。

## 并行红线（必须遵守）
- **另一实例**正在做 visual-fusion：只许改 `frontend/src/lib/design/**`、`ActivityBar`、`StatusBar`、`ContestBar`、主题相关。
- **你只许**：`docs/compose/dependency-audit.md`、`frontend/package.json`、`frontend/package-lock.json`、`scripts/gen-third-party-notices*`（若需）、`docs/compose/spec/library-min.md`。
- **禁止**：`src/components/**`、`src/ports/**`、`src/adapters/**`、`src-tauri/**`、`website/**`、git commit/revert。

## Goal
按 `docs/compose/spec/library-min.md` 完成 T1–T2：

1. **T1** 写 `docs/compose/dependency-audit.md`：枚举 `package.json` dependencies 每一项 → 用到它的文件 → 体积/必要性 → **keep | drop | defer** + 一句话理由。已知结论写入：
   - `pdfjs-dist` 已删除（keep 无）
   - monaco / panels / katex/remark / framer-motion / lucide：keep，且必须经 ports
2. **T2** 执行至少一项可证明的 drop（若 audit 发现死依赖则删；无死依赖则 defer 并说明）：
   - `npm install` 同步 lock
   - `npm run notices` 后 `npm run notices:check`
   - 若删依赖导致 build 挂，恢复该依赖并记 defer

## 验收（每轮结束必跑）
```
cd D:\oler-ide-v2\frontend
npm run build
npm run lint
npm run notices:check
```
0 error；不要新增 warning；不碰另一实例正在改的文件。

## 完成定义
- `dependency-audit.md` 全依赖覆盖
- notices 绿，build/lint 绿
- `library-min.md` 任务勾选并写简短 Report
