# Olympia IDE

面向 OI（信息学奥赛）选手的桌面编程 IDE：题号导入题面、内置编译运行 + 多样例评测 + 对拍、AI 教练，一站式完成"刷题 → 写题 → 调题 → 复盘"。

## 当前状态

本仓库产出**两个**桌面产品：

- `frontend/` — Tauri 2 + React 19 + TypeScript 桌面应用（主线）：题库、AI 教练、对拍器、运行面板、设置、引导向导。训练页与错题本尚未接入界面（训练页组件存在但没有导航入口，错题本只有一个 `Mistake` 类型定义，没有存储与页面），应用内终端已移除。
- `oss/` — VS Code 分支持有的 **Olympia IDE**（product `Olympia`，基线 1.140.0）：自带三个自研扩展（入门引导、题面拉取与赛制模板、`@coach` 聊天教练），工作台界面为就地改写中文，不注册语言包。

安装包为**单一完整版**（内置精简后的 MinGW 工具链），已发布到官网 <https://olympia.dpdns.org>。精简版与 `tauri.full.conf.json` 已删除。

## 快速开始

前置：Node.js 与 Rust stable 工具链。

```powershell
cd frontend
npm install          # 首次一次
npm run tauri dev    # 开发运行（Vite 热更新 + Tauri 窗口）
npm run build        # 仅前端：tsc 类型检查 + vite 构建
npm run lint         # oxlint
npm run notices:check # 第三方许可证清单是否过期
npm run tauri build  # 安装包（内置 MinGW；先跑 python scripts/strip-toolchain.py 裁剪）
```

fork 侧的构建与约定（内嵌 git 仓库、汉化生成链、hygiene 例外）见 [AGENTS.md](AGENTS.md) 的「VS Code Fork (`oss/`) Line」一节，入口脚本是 `build/oss-package.ps1`。

## 下载

官网：<https://olympia.dpdns.org>

Releases：<https://github.com/yuandd0412/olympia-ide/releases>

## 目录速览

```
frontend/            Tauri 桌面应用
  src/               React 组件 / stores / services
  src/ports/         对外部 UI 能力的稳定接口（编辑器 / 分栏 / 文档 / 动效）
  src/adapters/      上述接口的第三方实现（Monaco、react-resizable-panels、KaTeX、PDF）
  src-tauri/         Rust 后端命令层 + 打包配置
oss/                 VS Code 分支（Olympia IDE，内嵌 git 仓库）
  extensions/olympia-*   三个自研扩展：引导 / 题面与模板 / AI 教练
build/               fork 打包、汉化生成与审计脚本（oss-package.ps1、audit-*.mjs）
resources/brand/     品牌 master 标志（logo.svg）
website/             官网（纯静态，Cloudflare Pages 发布）
docs/                产品 / 设计 / 路线图文档（00–11 编号）
scripts/             工具链裁剪等构建辅助脚本
```

## 文档

按编号组织于 [docs/](docs/README.md)：产品定位（01）、设计系统（02）、页面规范（03）、编辑器（04）、测试结果（05）、欢迎页（06）、风险与教训（07）、路线图（08）、术语表（09）、UI 风格指南（10）、fork 侧自研扩展（11）；根级 v0 设计规格在 [docs/00-design-spec.md](docs/00-design-spec.md)。`docs/` 里大量正文写的是已移除的 Qt 6.8 实现，**以 [docs/README.md](docs/README.md) 的状态表为准**；当前实现的真实状态看 [docs/08-roadmap/phases.md](docs/08-roadmap/phases.md)，构建与交付约定看 [AGENTS.md](AGENTS.md)。发布流程见 [website/DEPLOY.md](website/DEPLOY.md)。

## License

MIT — see LICENSE.
