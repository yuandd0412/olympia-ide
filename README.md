# Olympia IDE

面向 OI（信息学奥赛）选手的桌面编程 IDE：题目库 / 训练 / 错题本、内置编译运行 + 对拍、AI 教练，一站式完成"刷题 → 写题 → 调题 → 复盘"。

## 当前状态

单主线：**Tauri 2 + React 19 + TypeScript** 桌面应用（`frontend/`）。题目库、训练、错题本、AI 教练、对拍器、运行面板、终端、设置、引导向导均已成形；官网（[olympia.dpdns.org](https://olympia.dpdns.org)）与双版本安装包（精简 / 完整）已发布。

早期曾以 Qt 6.8 / C++17 完成过一版 foundation 实现（Phase 0–5），已移出主线；需要回溯时 checkout 标签 [`qt-foundation`](https://github.com/yuandd0412/olympia-ide/tree/qt-foundation)（历史提交永远可访问）。

## 快速开始

前置：Node.js 与 Rust stable 工具链。

```powershell
cd frontend
npm install          # 首次一次
npm run tauri dev    # 开发运行（Vite 热更新 + Tauri 窗口）
npm run build        # 仅前端：tsc 类型检查 + vite 构建
npm run tauri build  # 精简版安装包
npm run tauri:full   # 完整版安装包（内置 MinGW，先跑 scripts/strip-toolchain.py）
```

## 下载

官网：<https://olympia.dpdns.org>
Releases：<https://github.com/yuandd0412/olympia-ide/releases>

## 目录速览

```
frontend/            Tauri 桌面应用
  src/               React 组件 / stores / services
  src-tauri/         Rust 后端命令层 + 打包配置
resources/brand/     品牌 master 标志（logo.svg）
website/             官网（纯静态，Cloudflare Pages 发布）
docs/                产品 / 设计 / 路线图文档（00–10 编号）
scripts/             工具链裁剪等构建辅助脚本
```

## 文档

产品与设计文档按编号组织于 [docs/](docs/README.md)：产品定位（01）、设计系统（02）、页面规范（03）、编辑器（04）、测试结果（05）、风险与教训（07）、路线图（08）、术语表（09）、UI 风格指南（10）；根级 v0 设计规格在 [docs/00-design-spec.md](docs/00-design-spec.md)。发布流程见 [website/DEPLOY.md](website/DEPLOY.md)。

## License

MIT — see LICENSE.
