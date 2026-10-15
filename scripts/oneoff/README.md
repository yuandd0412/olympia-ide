# oneoff — 一次性修复脚本归档

2026-08 清理 `frontend/` 源码中的 UTF-8 mojibake（中文字符串被替换成 `?`）
以及若干零散问题时，临时编写的 Node 字符串替换脚本（`fix.js` … `fix11.js`）。

- 每个脚本只设计为跑一次，其效果已固化在对应提交里（如 `20a2267`
  "eliminate all UTF-8 mojibake"）。**不要重复运行。**
- 留档仅供追溯；确认不再需要时可整体删除整个 `scripts/` 目录：
  `cmd /c rmdir /s /q D:\oler-ide-v2\scripts`

## 常驻检查台（和上面那些 fix*.js 无关）

`check-*` 是静态门，`test-*` 是用假 `vscode` 模块加载编译产物 `oss/extensions/*/out/*.js` 的行为台。
两条约定：断言只在真的坏掉时才红（改动前先做一次针对性破坏），以及检查脚本自己崩了不能算过。

出厂链路上新加的两个：

- `check-build-typecheck.mjs` —— 对 `oss/build/` 跑 tsc（实测 1.1 s）。`compile-client` 不覆盖
  `build/`，2026-10-15 一次 `TS2448`（声明前使用）就是这么混到打包第 3 阶段才炸，而那时
  `clean-vscode-win32-x64` 已经跑完。它接在 `build/oss-package.ps1` 的 STAGE 0。
  上游自带的 17 条错误记成了基线（`build/lib/policies/policyDto.ts` 本就不存在），只降不升。
- `../../build/verify-product-licence.mjs` —— 读**打包好的目录**，证明许可证文本真的进了产物；
  `check-licence-surface.mjs` 只证明打包代码"点名要它们"，而 `gulp.src(..., { allowEmpty: true })`
  会把匹配不到的名字静默吞掉。

发布侧：`../../build/make-release.mjs --tag v<x>` 收分卷、生成 SHA256SUMS.txt、按同一 tag 编引导器，
并把 `website/index.html` 里的体积/总字节改成这次的真实数字；之后
`node scripts/oneoff/check-website.mjs --online` 会 HEAD 每条下载直链，确认线上真的存在再部署官网。

