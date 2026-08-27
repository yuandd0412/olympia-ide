# Oler IDE

面向 OI（信息学奥赛）选手的桌面编程 IDE：题目库 / 训练 / 错题本、内置编译运行 + 对拍、AI 教练，一站式完成"刷题 → 写题 → 调题 → 复盘"。

## 当前状态

仓库内含**两条技术线**：

| | `frontend/` — 主线 | `src/` — Qt 参考实现 |
|---|---|---|
| 技术栈 | Tauri 2 · React 19 · TypeScript · Vite · Monaco · xterm.js · Zustand | Qt 6.8 · C++17 · MinGW 13.1.0 · KSyntax 高亮 |
| 后端 | Rust（`src-tauri`）：ingest / runner / stress / storage / ai | C++ core 同构模块 + Qt Widgets UI |
| 测试 | ingest 冒烟 bin（暂无 Rust 单测） | `tests/` 下 7 个 ctest 套件 |

**当前开发重心是 `frontend/`**：题目库、训练、错题本、AI 教练、对拍器、运行面板、终端、设置、引导向导等页面均已成形，近期工作集中在主题系统、设置持久化与 UI 打磨。

Qt 线完成了 Phase 0–5（骨架、主题 QSS、ECM/KSyntax vendor、核心类、五大页框架），Phase 6+（编译 pipeline 与 OJ 提交适配）未启动；现作为参考实现与回归测试基线保留。详见 [docs/08-roadmap/phases.md](docs/08-roadmap/phases.md)。

## 快速开始

### Tauri 版（主线）

前置：Node.js 与 Rust stable 工具链。

```powershell
cd frontend
npm install          # 首次一次
npm run tauri dev    # 开发运行（Vite 热更新 + Tauri 窗口）
npm run build        # 仅前端：tsc 类型检查 + vite 构建
npm run tauri build  # 打包桌面安装程序

# ingest 冒烟测试
cd src-tauri
cargo run --bin test_ingest
```

### Qt 参考实现

前置：Qt 6.8.0 (mingw_64) + MinGW **13.1.0**（ABI 锁死，换版本会堆损坏——见 AGENTS.md）。首次构建前需按 AGENTS.md 对 `third_party/` 应用 KSyntax 补丁。

```powershell
cmake -G Ninja -B D:\oler-ide-v2\build -S D:\oler-ide-v2 -DCMAKE_CXX_COMPILER=C:/Qt/Tools/mingw1310_64/bin/g++.exe -DCMAKE_PREFIX_PATH=C:/Qt/6.8.0/mingw_64
cmake --build D:\oler-ide-v2\build --parallel
ctest --test-dir D:\oler-ide-v2\build --output-on-failure   # 7 套测试
D:\oler-ide-v2\build\oler-ide.exe                           # windeployqt 已随构建拷贝 DLL
```

## 目录速览

```
frontend/            Tauri 桌面应用（主线）
  src/               React 组件 / stores / services
  src-tauri/         Rust 后端命令层
src/                 Qt 参考实现（app / core / ui）
tests/               Qt ctest 套件 ×7
docs/                产品、设计系统、页面规范、路线图等（00–10 编号）
resources/           主题 QSS、KSyntax 预生成索引等
scripts/oneoff/      历史一次性修复脚本归档（勿重复运行）
third_party/         vendor 库（gitignored，克隆后需打补丁，见 AGENTS.md）
```

## 文档

根级设计规格在 [docs/00-design-spec.md](docs/00-design-spec.md)；其余按编号组织于 `docs/`：
产品（01）、设计系统（02）、页面规范（03）、编辑器（04）、测试结果（05）、welcome（06）、风险（07）、路线图（08）、术语表（09）、UI 风格指南（10），另有 `mockups/` 视觉原型。

## License

MIT — see LICENSE.
