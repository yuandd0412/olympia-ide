# oneoff — 一次性修复脚本归档

2026-08 清理 `frontend/` 源码中的 UTF-8 mojibake（中文字符串被替换成 `?`）
以及若干零散问题时，临时编写的 Node 字符串替换脚本（`fix.js` … `fix11.js`）。

- 每个脚本只设计为跑一次，其效果已固化在对应提交里（如 `20a2267`
  "eliminate all UTF-8 mojibake"）。**不要重复运行。**
- 留档仅供追溯；确认不再需要时可整体删除整个 `scripts/` 目录：
  `cmd /c rmdir /s /q D:\oler-ide-v2\scripts`
