# Olympia IDE — Code-OSS Fork 迁移设计（Phase 0 交付物）

> **Source**
> - 任务书：[`oss-fork-pivot.md`](oss-fork-pivot.md)（派工单，原样保留，不被本文覆盖）
> - 本仓约定：`D:\oler-ide-v2\AGENTS.md`、`docs/08-roadmap/phases.md`
> - 上游基线：`microsoft/vscode` **tag `1.140.0`**（commit `07f806f999227108933c2e30515b26eecc1fda74`）的
>   `product.json` / `.nvmrc` / `package.json` / `build/npm/preinstall.ts`
> - 思路参考：ShortestPath IDE `rename-code-oss-to-shortestpath-ide.md` + 其 `AGENTS.md`
>   「上游同步红线」（本机镜像：`D:\oler-ide-v2\build\ref\`）
>
> 状态：**设计已定，Phase 1 未开工**。本文档不描述任何已完成的代码改动。

---

## 0. 与任务书的关系

任务书 `oss-fork-pivot.md` 是**派工单**，本身不是设计结论。本文是任务书「交付物 1：迁移设计短文」的实际落盘，
故另起文件名 `oss-fork-pivot-design.md`，**不覆盖任务书**。

---

## 1. 决策摘要

| # | 决策项 | 取值 | 依据 |
|---|---|---|---|
| D1 | 新主线形态 | `oss/` 工作树 = Code-OSS 全量 fork + `product.json` 深度定制 | 任务书「范围决策 1」 |
| D2 | fork 基线 | ✅已拍板 `microsoft/vscode` @ **tag `1.140.0`**（最新 stable，2026-09-30 发布） | 不以 ShortestPath 为底 → 零商标污染，合上游最干净 |
| D3 | Tauri `frontend/` | **降级 legacy，禁止删除、禁止覆盖**；OSS 线达 M1 前仍发安装包 | 任务书「范围决策 2」 |
| D4 | 产品标识 | `applicationName: olympia` / `dataFolderName: .olympia-ide` / 标识 `dev.oler.ide` | 任务书 + 本仓 `tauri.conf.json` 的 `identifier` |
| D5 | 许可 | fork 整体 **GPL-3.0-or-later**；Olympia 自研扩展/资源可 MIT，About 内分层声明 | Code-OSS 是 GPL-3；沿用 SP 的 ThirdPartyNotices 模式 |
| D6 | 扩展市场 | `extensionsGallery` 指向 **open-vsx.org**（不指向 MS Marketplace） | GPL 发行不应默认绑 MS 市场；SP 同款选择 |
| D7 | Windows GUID | **重新生成 4 个 GUID**，不复用 Microsoft 原值 | 复用会让 Olympia 安装包与真机已装的 Code-OSS 抢同一个注册表槽位 |
| D8 | Copilot | **删 `product.json` 里的 Copilot 声明**，但**保留 chat/MCP/agent 服务层** | SP `AGENTS.md` 上游同步红线 |
| D9 | Node 门槛 | ✅已拍板 fork 内把 `.nvmrc` 定为 `24.16.0`（本机版本），而非升级本机 Node | 本机 Node 24.16.0 < 上游 24.18.0，会被 preinstall 硬拦 |
| D10 | 里程碑 | M1a 工具链向导 → M1b 一键评测 → M1c 导题 → M2 对拍/比赛/AI 教练 | 任务书「范围决策 3」 |
| D11 | AI 接入 | ✅已拍板 **Olympia 自建接入层 + 用户自带 API Key（BYOK）**；线格式 OpenAI 兼容；Key 存 SecretStorage；**不使用 `vscode.lm` / chat 服务层** | 用户 2026-10-07 指示；语义沿用 Tauri 线 `aiBaseUrl`/`aiApiKey`/`aiModel`。详见 §12 |
| D12 | UI 载体 | ✅已拍板 **native-first**：新代码一律不写 webview，白名单仅 KaTeX 公式 + PDF 且须懒加载 | 用户 2026-10-07 指示。载体归属见 §13.3，webview 白名单见 §13.4 |

---

## 2. 目录布局

```
D:\oler-ide-v2\                  ← 仓库根保持 ASCII（AGENTS.md 硬约束）
├── frontend/                    ← legacy 主线，冻结但不删
│   ├── src/                     ←   Tauri 2 + React 19（v0.1.0）
│   └── src-tauri/               ←   Rust: ingest/runner/stress/storage/models/ai/toolchain
├── oss/                         ← 【新主线】Code-OSS fork（独立 git 仓库）
│   ├── product.json             ←   品牌唯一权威源
│   ├── package.json             ←   name: olympia-ide-dev
│   ├── .nvmrc                   ←   24.16.0（改，见 D9）
│   ├── extensions/              ←   上游内置扩展 + olympia.* 自研扩展
│   │   ├── olympia.setup/       ←   M1a 首启向导 / 工具链探测
│   │   ├── olympia.oj/          ←   M1c 洛谷 / CF / AtCoder 导题
│   │   ├── olympia.judger/      ←   M1b 评测 / 样例
│   │   ├── olympia.stress/      ←   M2 对拍
│   │   ├── olympia.coach/       ←   M2 AI 教练
│   │   ├── olympia.draw/        ←   M2 题面 KaTeX 渲染
│   │   └── vscode-clangd/       ←   第三方 MIT，vendor 进仓
│   ├── src/                     ←   workbench / platform（只砍 UI，不砍 service）
│   ├── build/                   ←   gulp 构建（含 product.json 注入 @@APPNAME@@）
│   └── resources/               ←   桌面模板（需去微软硬编码）
├── resources/brand/logo.svg     ← 品牌源，Phase 2 复制进 oss/resources/ 替换图标
└── docs/compose/spec/           ← 本设计所在
```

**关键约束**：`oss/` 必须是**独立 git 仓库**（`git clone` 后 `rm -rf .git` 再 `git init`）。
若作为本仓子目录并入，本仓 `.gitignore` 的 `build/`、`out/`、`node_modules` 规则会与 Code-OSS 构建目录语义冲突，
且「禁止 git commit」下无法安全表达 upstream remote。

---

## 3. product.json Olympia 字段表（全量）

基线字段值来自 **上游 `1.140.0` 原始 `product.json`**（非 SP 的改后文件），逐字段对照。

### 3.1 身份类（必改）

| 字段 | 上游 `1.140.0` | Olympia 取值 | 说明 |
|---|---|---|---|
| `nameShort` | `Code - OSS` | `Olympia` | 菜单栏粗体名；`productService.nameShort` |
| `nameLong` | `Code - OSS` | `Olympia IDE` | 窗口标题 / About / 欢迎页 / 设置同步提示 |
| `applicationName` | `code-oss` | `olympia` | CLI 名 + `bin/` 可执行名；**任务书指定** |
| `dataFolderName` | `.vscode-oss` | `.olympia-ide` | 扩展目录前缀 + CLI 数据目录；**任务书指定** |
| `sharedDataFolderName` | `.vscode-oss-shared` | `.olympia-ide-shared` | |
| `urlProtocol` | `code-oss` | `olympia` | `olympia://` 深链 |
| `win32MutexName` | `vscodeoss` | `olympia` | 单实例互斥量 |
| `win32DirName` | `Microsoft Code OSS` | `Olympia IDE` | 开始菜单目录 |
| `win32NameVersion` | `Microsoft Code OSS` | `Olympia IDE` | |
| `win32RegValueName` | `CodeOSS` | `OlympiaIDE` | 注册表值名 |
| `win32AppUserModelId` | `Microsoft.CodeOSS` | `dev.oler.ide` | 与 Tauri `identifier` 对齐 |
| `win32ShellNameShort` | `C&ode - OSS` | `O&lympia IDE` | `&` 是助记符，落在 O |
| `win32TunnelServiceMutex` | `vscodeoss-tunnelservice` | `olympia-tunnelservice` | |
| `win32TunnelMutex` | `vscodeoss-tunnel` | `olympia-tunnel` | |
| `darwinBundleIdentifier` | `com.visualstudio.code.oss` | `dev.oler.ide` | 跨平台同一标识 |
| `linuxDesktopName` | `com.visualstudio.CodeOSS` | `dev.oler.ide` | |
| `linuxIconName` | `code-oss` | `olympia` | 需同时放 `resources/linux/code-oss.png` → `olympia.png` |
| `serverApplicationName` | `code-server-oss` | `olympia-server` | |
| `serverDataFolderName` | `.vscode-server-oss` | `.olympia-server` | |
| `tunnelApplicationName` | `code-tunnel-oss` | `olympia-tunnel` | |

### 3.2 Windows GUID（重新生成，见 D7）

| 字段 | 上游值 | Olympia 取值 |
|---|---|---|
| `win32x64AppId` | `{{D77B7E06-...}}` | `{{92A230A6-89AD-4887-92F7-91F5257ECB38}` |
| `win32arm64AppId` | `{{D1ACE434-...}}` | `{{8E09D57A-123B-4EE5-8E3B-F5C269967B7A}` |
| `win32x64UserAppId` | `{{CC6B787D-...}}` | `{{5E32210D-FEB0-426D-99B2-9E5BF16E44B5}` |
| `win32arm64UserAppId` | `{{3AEBF0C8-...}}` | `{{867C3D1C-1EF1-4D4F-AA5E-D3734607DEEF}` |

> **与 SP 的分歧**：SP 选择沿用微软原 GUID。Olympia 不沿用——本仓用户机若已装真 Code-OSS，
> 沿用 GUID 会让 Olympia 的 NSIS 安装包直接覆盖 Code-OSS 的注册表项与开始菜单项。
> 这 4 个 GUID 已于 Phase 0 生成，写入后**不可再改**（改了等于换新应用身份）。

### 3.3 许可与遥测类（必改 / 必删）

| 字段 | 上游 `1.140.0` | Olympia 取值 | 理由 |
|---|---|---|---|
| `licenseName` | `MIT` | `GPL-3.0-or-later` | **不能沿用 MIT**——Code-OSS 主体是 GPL-3 |
| `licenseUrl` | `github.com/microsoft/vscode/blob/main/LICENSE.txt` | `github.com/yuandd0412/olympia-ide/blob/main/LICENSE` | 指向本仓 LICENSE |
| `licenseFileName` | `LICENSE.txt` | `LICENSE` | 本仓文件名无 `.txt` |
| `serverLicenseUrl` | 同上游 | 同上 | |
| `reportIssueUrl` | `github.com/microsoft/vscode/issues/new` | `github.com/yuandd0412/olympia-ide/issues/new` | 反馈不回流微软 |
| `agentsTelemetryAppName` | `agents` | `olympia` | |
| `defaultChatAgent` | Copilot 整块（~70 行） | ⚠ **不能删**，改为**指向我们自己的扩展**：`extensionId` / `chatExtensionId` = `olympia.olympia-coach`，`provider.default` = `{ id: olympia, name: Olympia }`，`providerUriSetting` = `olympia.ai.baseUrl`（正好接上 §12 的 BYOK） | **实测教训**：删除会导致首启引导崩溃 `Onboarding requires a default chat agent product configuration.`（`onboardingVariationA.ts:80` 硬断言）。`product.ts:276` 声明它为非可选，且 `abstractExtensionManagementService.ts:987`、`extensionGalleryService.ts:1164` 均无可选链 |
| `trustedExtensionAuthAccess` | github / github-enterprise / microsoft | **删除整块** | 随 Copilot 一起去 |
| `builtInExtensionsEnabledWithAutoUpdates` | `["GitHub.copilot-chat"]` | `[]` | |
| `voiceWsUrl` | `wss://falcon-caas.mai.microsoft.com/...` | **删除** | 不接微软语音服务 |
| `sessionsWindowAllowedExtensions` | `[]` | `[]` | 保持 |
| `webviewContentExternalBaseUrlTemplate` | vscode-cdn | **保持不变** | webview 预加载资源依赖 |

> ⚠ **红线**：`defaultChatAgent` 等**只是 product.json 声明**。删它们 ≠ 删 chat 服务。
> 服务层单例必须保留，见 §7。

### 3.4 扩展市场与内置扩展

| 字段 | 取值 | 说明 |
|---|---|---|
| `extensionsGallery.serviceUrl` | `https://open-vsx.org/vscode/gallery` | D6 |
| `extensionsGallery.itemUrl` | `https://open-vsx.org/vscode/item` | |
| `extensionsGallery.resourceUrlTemplate` | `https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}` | |
| `linkProtectionTrustedDomains` | `["https://open-vsx.org"]` | 依赖市场需加入白名单 |
| `builtInExtensions` | 保留 `ms-vscode.js-debug-companion`；`ms-vscode.js-debug` 降级为非内置（OI 场景无 JS 调试） | 上游 3 项含 profile-table，OI 场景无意义 |
| `onboardingKeymaps` | 保留 6 项，但 `"label": "VS Code"` 改为 `"默认键位"` | 文案去微软化 |
| `onboardingThemes` | 保留 6 项 | 主题名属上游资产，不改 |
| `olympiaVersion` | `"0.1.0"` | **新增字段**，对齐 Tauri 线版本号 |
| `olympiaUpdateUrl` | `https://raw.githubusercontent.com/yuandd0412/olympia-ide/main/latest.json` | 新增；**注意本机 `raw.githubusercontent.com` 当前无 DNS**，发布前需改 Gitee 镜像 |

---

## 4. 上游 UI 位置（改 `product.json` 即自动跟随，无需改源码）

改 `product.json` 后自动生效的位置（来自 SP 改名文档，Olympia 同理）：

| 位置 | 显示内容 |
|---|---|
| `src/vs/platform/menubar/electron-main/menubar.ts` | 菜单栏粗体名 `nameShort`；About / Hide / Quit 用 `nameLong` |
| `src/vs/platform/windows/electron-main/windows.ts`、`windowImpl.ts` | 窗口标题 `nameLong` |
| `src/vs/workbench/browser/parts/titlebar/windowTitle.ts` | 窗口标题 |
| `src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.ts` | 欢迎页产品名 `nameLong`、遥测提示 `nameShort` |
| `src/vs/workbench/contrib/userDataSync/browser/*` | 设置同步提示 `nameLong` |

**需手改的打包模板**（`resources/` 下硬编码产品名）：

- `resources/linux/code.desktop`、`code-url-handler.desktop`
- `resources/linux/code.appdata.xml`
- `resources/linux/debian/{control,templates,postinst}.template`
- `resources/linux/snap/snapcraft.yaml`
- `resources/linux/rpm/code.spec.template`
- `resources/server/manifest.json`
- `resources/win32/VisualElementsManifest.xml`

`build/gulpfile.vscode.ts` 用 `@@APPNAME@@` 动态注入 desktop 文件名 / `bin/` 可执行名 / deb / rpm 包名，**自动传导，不硬改**。

---

## 5. 与 Tauri 线的并行策略

| 维度 | `frontend/`（legacy） | `oss/`（新主线） |
|---|---|---|
| 状态 | 冻结功能开发，**仍可构建、仍可发安装包** | 主线 |
| 定位 | 里程碑 M1 达成前的兜底发行通道 | v1 正式形态 |
| 数据 | `~/.oleride/`（工具链）、应用内 `problems.json` | `%APPDATA%\Olympia IDE` + `~/.olympia-ide/` |
| 品牌一致性 | `dev.oler.ide` / `Olympia IDE` | 同左（D4） |
| 何时停 | 用户拍板，不在本任务范围内 | — |

**禁止事项（硬红线）**：

1. 禁止删除 `frontend/`（含 `src-tauri/vendor/`）
2. 禁止在 `oss/` 之外改动主线
3. 禁止 `git commit`（本轮所有改动保持 working tree 可见）
4. 所有新增配置文件 **UTF-8 无 BOM**

> **工具链目录提示**：Tauri 线工具链落在 `~/.oleride/mingw64`，OSS 线若用 `dataFolderName=.olympia-ide`
> 会变成 `~/.olympia-ide/`。Phase 3 应让 `olympia.setup` **优先探测 `~/.oleride/mingw64`**
> 再回落 `~/.olympia-ide/mingw64`，避免同一台机器出现两套 MinGW 占几个 GB。

---

## 6. 功能映射：Tauri → OSS 扩展

| Tauri 能力 | 源码位置（legacy） | OSS 落点 | 里程碑 |
|---|---|---|---|
| 编译运行 | `src-tauri/src/runner.rs` | vendor `danielpinto8zz6.c-cpp-compile-run`（MIT）作底 + `olympia.judger` 包 AC/WA/TLE 判定 | M1b |
| 工具链探测 | `src-tauri/src/toolchain.rs`（bundled → `~/.oleride` → 配置 → PATH） | `olympia.setup` 用 TS 复刻同四级顺序 | **M1a** |
| 内置 MinGW | `src-tauri/vendor/mingw64` + `scripts/strip-toolchain.py` | 同思路搬入 `oss/build/toolchain/` | M1a 二期 |
| 洛谷导题 | `src-tauri/src/ingest.rs` | `olympia.oj` | M1c |
| PDF 题面 | `react-markdown+KaTeX` / `pdfjs-dist` adapter | `olympia.draw`（webview + KaTeX + CSP） | M2 |
| 对拍器 | `src-tauri/src/stress.rs` | `olympia.stress` | M2 |
| 比赛模式 | `ContestBar.tsx` | 状态栏扩展 `olympia.*` contribution | M2 |
| AI 教练 | `src-tauri/src/ai.rs` + `AiCoachPage.tsx`（OpenAI 兼容 BYOK） | `olympia.coach`——**自建接入层 + 自带 Key**，见 §12。**不骑 Copilot、不走 `vscode.lm`** | M1a 只做配置向导；对话能力 M2 |
| 题库 | `storage.rs` + `problems.json` | 扩展侧 storage API | M1c |
| 判定色 | AC/WA/TLE/RE/CE | `olympia.judger` + token | M1b |

---

## 7. 合上游纪律（保服务层，只砍 UI）

直接沿用 SP `AGENTS.md`「上游同步红线」，并按本仓风险补强：

1. **删 UI 入口 ≠ 删 service**。Chat / MCP / Interactive / ChatSessions / agentHost 的
   **服务注册单例必须保留**；SP 已踩过「删 service → extension host 死」。
2. **保留 `chat.shared.contribution`**，勿重复注册其 `LanguageModel` 服务。
3. **静态核对 desktop 入口的服务注册与全部 `mainThread*.ts` 注入**——
   **扫描全部 decorator，不能只看首个构造函数**（SP 原文警告）。
4. 保留 sessions 的颜色 / 尺寸 token，UI 入口可摘。
5. 删除 Copilot 时，`package.json` 的 `compile` 脚本要从
   `npm-run-all2 -lp compile-client compile-copilot`（上游 `1.140.0`）改为仅 `compile-client`
   （SP 已是 `compile` → `compile-client`）。**这是 `1.140.0` 相对 SP 基线的新增差异，容易漏。**
6. 中文本地化覆盖 IDE 自有文本；**外部题目内容、OJ 返回的元数据必须原样保留**，
   webview 内容用 `data-i18n-ignore` 标记，MutationObserver 写入前先比值保证幂等。

> **⚠ 关键区分：保留 ≠ 使用。**
> 上面的「保留服务层」是**工程存活约束**（删了扩展宿主会死），**不是功能依赖**。
> Olympia 自己的 AI 后端是 §12 的自建接入层，**每一次请求都不经过 `vscode.lm` / chat 服务层**。
> 两者不冲突：既满足本节的存活红线，又保证 AI 后端完全在我们自己手里。

---

## 8. 环境事实（Phase 0 已实测）

| 项 | 实测值 | 结论 |
|---|---|---|
| OS | Windows NT 10.0.26200 (x64) | — |
| CPU / RAM / 磁盘 | 16 逻辑核 / 31.7 GB / D: 剩 251.7 GB | fork + `node_modules` + `out/` 空间充足 |
| Git | 2.54.0（装在 `D:\软件\Git`，CJK 路径，调用需加引号） | — |
| Node | **v24.16.0** | ⚠ 低于上游要求，见 §9-R1 |
| npm | 11.13.0 | — |
| Python | 3.13.13 | `gyp` / `node-gyp` 依赖 |
| **MSVC** | ✅ **VS 2022 BuildTools，`Microsoft.VisualStudio.Component.VC.Tools.x86.x64` 组件在位** | 原生模块（node-pty 等）可重编 |
| Windows SDK | 10.0.22621.0 | 在位 |
| 网络：`github.com:443` | ✅ 直连通（20.205.243.166） | **代理绕过即可用** |
| 网络：环境变量代理 | ⚠ `HTTP_PROXY` / `HTTPS_PROXY` = `http://127.0.0.1:7890`，**该端口无监听（死代理）** | 见 §9-R2 |
| 网络：`raw.githubusercontent.com` | ❌ **无 DNS 解析** | 用 `api.github.com` 替代取文件；`olympiaUpdateUrl` 发布前须换源 |
| 网络：`objects.githubusercontent.com` | ❌ 无 DNS | 影响 git LFS / release 直链下载 |
| `gitee.com` | ✅ 可解析（180.76.198.225） | 备选镜像源 |

---

## 9. 风险与阻塞

| ID | 风险 | 影响 | 处置 |
|---|---|---|---|
| **R1** | 上游 `.nvmrc` = **24.18.0**，本机 **24.16.0**。`build/npm/preinstall.ts` 对**所有**近期 tag（1.135.0 ~ 1.140.0）一律要求 ≥24.18.0，并 `console.error` 后退出 | **`npm ci` 直接被拦死**，fork 无法安装依赖 | **方案 A（推荐）**：fork 内把 `.nvmrc` 改 `24.16.0`。一行、构建配置、不涉及产品逻辑。**方案 B**：装 Node 24.18.0（需用户批准动系统软件）。**方案 C**：选更老的 tag —— 已实测 1.135.0~1.140.0 全是 24.18.0，**无更小可行 tag**，故 C 不可行 |
| **R2** | 环境级 `HTTP_PROXY=127.0.0.1:7890` 指向死代理，git 默认走它 → `Failed to connect ... via 127.0.0.1` | clone/ls-remote 全失败 | 每条 git/npm 命令前置 `-c http.proxy= -c https.proxy=` 或清空代理环境变量。已实测可用 |
| **R3** | `oss/` 内含 `node_modules`（~2–3 GB）+ `out/` | 仓库体积膨胀 | `oss/` 独立 `.gitignore`（沿用上游）+ 独立 git 仓库；**不并入本仓 git** |
| **R4** | GPL-3 fork 需完整对应源码提供义务 | 法务 | Phase 2 起维护 `THIRD-PARTY-NOTICES` + 源码 tarball 发布流程；About 内标注 GPL-3 |
| **R5** | **`defaultChatAgent` 在运行时是必需项，不是有声明无引用的配置** | 删掉它 → 首启引导抛 `assertDefined` → **窗口起得来但立刻崩**，扩展宿主不启动（进程数只有 5 而非 12）。极易误判为「启动成功」 | 保留该块但改指 `olympia.olympia-coach`（§3.3）；**验证启动必须看进程数与窗口内容，不能只看标题存在** |
| **R6** | `npm ci` 在 Windows 上需跑 `postinstall` → `build/npm/postinstall.ts`（装 distro 依赖 + 原生模块重编） | 耗时 20–40 分钟，可能因单模块编译失败 | 有 MSVC（已确认）；失败时定位到具体原生模块再决策 |
| **R7** | **用户 `~/.npmrc` 里写着死代理** `proxy=http://127.0.0.1:7890` / `https-proxy=同上`，与 §8 的环境变量代理同一个死端口。**npm 优先读 `.npmrc`，清环境变量无效** | `npm ci` 报 `npm error Exit handler never called!`，debug 日志里实际是数百条 `ECONNREFUSED`。此报错极具误导性——**看起来像 npm 自身 bug 或镜像挂了，实际是代理** | **必须用 `NPM_CONFIG_USERCONFIG` 指向一份不含 proxy 的配置**（见下） |
| **R8** | **并行原生编译竞态**：多模块并发 `node-gyp rebuild`，某模块在头文件尚未下载完时即开始编译 | `error C1083: 无法打开包括文件 "js_native_api.h"`。看起来像头文件缺失，实际文件随后就出现在缓存里 | 预置 electron 头文件到 `%USERPROFILE%\.electron-gyp\43.7.3`（sha256 须校验），并用 `npm_config_devdir` 指向它，所有模块共用，杜绝竞态 |
| **R9** | 用户 `~/.npmrc` 的 `electron_mirror=https://npmmirror.com/mirrors/electron/` **该主机无 DNS** | 编译阶段不受影响（node-gyp 走项目 `.npmrc` 的 `disturl=https://electronjs.org/headers`，可解析），但**启动阶段下载 Electron 会失败** | 启动前用 `ELECTRON_MIRROR` 指向可解析的镜像；或修用户 `.npmrc` |

---

## 10. 分阶段验收命令

### Phase 1 — 建工作树

```powershell
$env:HTTP_PROXY=''; $env:HTTPS_PROXY=''
git -c http.proxy= -c https.proxy= clone --depth 1 --branch 1.140.0 `
    https://github.com/microsoft/vscode.git D:\oler-ide-v2\oss
```
证据：`git -C D:\oler-ide-v2\oss rev-parse HEAD` == `07f806f999227108933c2e30515b26eecc1fda74`

### Phase 2 — 品牌化 + 启动

```powershell
# 编码自检（BOM 会让 JSON 解析炸 / 与 AGENTS.md 历史 bug 同类）
$b = [IO.File]::ReadAllBytes('D:\oler-ide-v2\oss\product.json')
if ($b[0] -eq 239 -and $b[1] -eq 187) { 'FAIL: BOM' } else { 'OK: no BOM' }

cd D:\oler-ide-v2\oss
npm ci --proxy=null --https-proxy=null   # 或先设 $env:HTTP_PROXY=''
npm run compile
.\scripts\code.bat                        # Windows 等价启动脚本
```
证据：编译日志 + 启动后窗口标题为 `Olympia IDE`、About 显示 `Olympia IDE`。

### Phase 3 — M1a

证据：`olympia.setup` 激活后向导出现；能报出 `g++` 路径与版本（或明确「未找到」）。

### 不破坏 legacy 的自检

```powershell
cd D:\oler-ide-v2\frontend
npm run build     # 必须仍然通过
```

---

## 11. 决策状态

### 11.1 已拍板（2026-10-07，用户确认）

| # | 问题 | **已定** | 落地动作 |
|---|---|---|---|
| Q1 | fork 基线 | ✅ **`microsoft/vscode` @ tag `1.140.0`**（commit `07f806f999227108933c2e30515b26eecc1fda74`） | 不以 `shortestpath-ide` 为底；`oss/` 内零 ShortestPath 商标，`extensions/` 全部自研 `olympia.*` |
| Q2 | Node 门槛（R1） | ✅ **fork 内 `.nvmrc` 改 `24.16.0`**（不动本机环境、不装系统软件） | Phase 1 建树后第一件事就是改 `.nvmrc`；**只改这一行，不碰 `preinstall.ts`**，让与上游的 diff 保持最小 |
| Q6 | AI 接入方式 | ✅ **自建接入层 + BYOK**，用户自带 Key；线格式 OpenAI 兼容；Key 存 `context.secrets`；**不骑 Copilot、不走 `vscode.lm`** | 用户 2026-10-07 指示。完整设计见 **§12** |

### 11.1b 已定位的 legacy 缺陷（新线必须避免，不在本次修 legacy）

| 位置 | 问题 | 新线做法 |
|---|---|---|
| `frontend/src-tauri/src/models.rs:67` → `storage.rs:36-43` | `ai_api_key` **明文落盘** `settings.json` | `ExtensionContext.secrets` |
| `frontend/src/stores/useAppStore.ts` | Zustand 持有第二份明文副本 | 不进 store，只从 secrets 读 |
| `frontend/src-tauri/src/ai.rs:32` | 空 Key 提示宣称「支持 Claude」，但 Claude 非 OpenAI 兼容协议 | 删掉或标注需 OpenAI 兼容中转 |

### 11.2 仍待定（Phase 2 开工前拍板即可，不阻塞 Phase 1）

| # | 问题 | 建议 |
|---|---|---|
| Q3 | `oss/` 是否确认为**独立 git 仓库**（不并入 `D:\oler-ide-v2` 的 git）？ | **确认独立**。理由见 §2：否则本仓 `.gitignore` 的 `build/` `out/` 规则会与 Code-OSS 构建目录语义冲突，且在「禁止 git commit」约束下无法安全表达 upstream remote |
| Q4 | `builtInExtensions` 是否保留 `ms-vscode.js-debug`？ | **移出内置**。OI 场景无 JS 调试，省装机体积 |
| Q5 | `olympiaUpdateUrl` 用哪个源？ | 本机 `raw.githubusercontent.com` 无 DNS（§8），发布前建议指向 Gitee 镜像 |
| Q7 | 「AI 配置」步骤是否并入 **M1a** 向导？ | **建议并入**。任务书的引导语义本就含 AI，且与工具链向导共用同一 shell，边际成本低；只做配置，不做对话 |
| Q8 | 是否将来要 **Olympia 自营 AI 网关**（用户拿我们发的 key，而非自己的第三方 key）？ | 当前按**纯 BYOK** 设计，无后端。若要自营，需要额外一套：网关服务 + 账号 + 额度 + 计费，且 GPL-3 发行体与 SaaS 的边界要重新想清楚——**这会推翻 §12 的纯客户端架构** |

### 11.3 Phase 1 开工前置条件（你放行后按此机械执行）

1. 清空代理：`$env:HTTP_PROXY=''; $env:HTTPS_PROXY=''`
2. 带代理绕过 clone（注意路径含 CJK，`git.exe` 调用需加引号）：
   `git -c http.proxy= -c https.proxy= clone --depth 1 --branch 1.140.0 https://github.com/microsoft/vscode.git D:\oler-ide-v2\oss`
3. 验证 HEAD == `07f806f999227108933c2e30515b26eecc1fda74`
4. 改 `.nvmrc` → `24.16.0`（无 BOM）
5. **`npm ci` 不在 Phase 1**，留到 Phase 2（耗时 20–40 min，且需 MSVC 环境变量）

---

## 12. AI 接入设计（BYOK · 用户自带 Key）

> 用户 2026-10-07 指示：「AI 要接我们自己的，给用户自己配 API KEY」。

### 12.1 语义澄清

「我们自己的」= **Olympia 自建的 AI 接入层**，明确**不是**：

- ❌ 上游 Copilot / `GitHub.copilot-chat` 扩展
- ❌ VSCode 内置 `vscode.lm` LanguageModel API 与 chat 服务层
- ❌ 任何 ShortestPath 的 AI 接口

「给用户自己配 API KEY」= **BYOK**，沿用 Tauri 线既有三件套语义：

| 配置 | legacy 默认值（`models.rs:93-95`） |
|---|---|
| `aiBaseUrl` | `https://api.openai.com/v1` |
| `aiApiKey` | 空 |
| `aiModel` | `gpt-4o-mini` |

→ 新线命名为 `olympia.ai.baseUrl` / `olympia.ai.model` + SecretStorage 里的 Key。

### 12.2 线格式：唯一 OpenAI 兼容

`olympia.coach` **只实现一种协议**——OpenAI 兼容 `POST {baseUrl}/chat/completions`。
所有 provider 差异由 `baseUrl` 吸收，扩展内部不写 provider 分支。

- Ollama：填 `http://127.0.0.1:11434/v1` 即同协议
- 模型发现：先试 `{baseUrl}/models`，空则回落 Ollama 原生 `{base}/api/tags`（复刻 `ai.rs:137-170` 的两级策略）
- URL 拼接必须防重复后缀（复刻 `chat_completions_url`，legacy 有 3 条单测）

> **⚠ 文案修正**：legacy `ai.rs:32` 的空 Key 提示写「支持 DeepSeek / OpenAI / **Claude** / Ollama」。
> **Claude 原生 API 不是 OpenAI 兼容协议**，只有经第三方 OpenAI 兼容网关才成立。
> 新线文案必须删掉 Claude，或明确标注「需 OpenAI 兼容中转」。

### 12.3 凭据存储（安全红线）

| 字段 | 落点 | 可否明文 |
|---|---|---|
| `olympia.ai.baseUrl` | `settings.json` | ✅ 可（非敏感） |
| `olympia.ai.model` | `settings.json` | ✅ 可（非敏感） |
| **API Key** | **`ExtensionContext.secrets`（→ Windows 凭据管理器 / DPAPI）** | ❌ **禁止**进 `settings.json`、`localStorage`、日志、崩溃报告 |

**legacy 现存缺陷，新线必须避免**：`frontend/src-tauri/src/models.rs:67` 的
`AppSettings.ai_api_key` 经 `storage.rs:36-43` **明文写入 `settings.json`**，
前端 Zustand (`useAppStore.ts`) 还持有第二份明文副本。
fork 到 OSS 线时必须换 `context.secrets`，且**读 key 时绝不进任何 log/日志通道**。

### 12.4 网络与 CSP

- 所有请求从**扩展宿主进程**发出，**不经 webview**
- AI 设置 UI 用**原生 VSCode 面板**（`contributes.configuration` + 侧栏视图），**不用 webview**——
  这样完全绕开 CSP 的 `connect-src` 需要放行任意用户自定义 host 的问题。载体归属详见 **§13.3**
- 扩展宿主出网不受 `product.json` 的 `linkProtectionTrustedDomains` 约束（那管的是 webview 链接）

### 12.5 首启向导的 AI 步骤（并入 M1a）

任务书的引导语义含 AI。建议与工具链向导**同一个 wizard shell**，边际成本低：

1. 填 `baseUrl`（预填 `https://api.openai.com/v1`）
2. 填 API Key（密码框 → 直写 SecretStorage，不回显）
3. 拉模型列表（失败则允许手填模型名，不卡流程）
4. 「测试连接」——复刻 `probe_ai_endpoint` 语义：`max_tokens: 1` 发一个 `ping`，2xx 即通过
5. **允许跳过**：不配 Key 也必须能正常用 IDE 其余全部功能

### 12.6 隐私

- 用户代码与题面会发往**第三方** API → 首次配置时必须明示目标 host
- **不做任何 AI 请求的遥测上报**；产品遥测默认关闭
- 失败日志只记 host 与状态码，**不记请求体、不记 Key**

### 12.7 与 §7 chat 服务层的关系

见 §7 末尾的「保留 ≠ 使用」框。一句话：
**服务层保留是为了扩展宿主不死；Olympia 的 AI 后端是本节的自建通道，两者互不依赖。**

---

## 13. UI 策略：native-first，webview 例外清单

> 用户 2026-10-07 指示：「最好大规模替换 webview，效率低、空间消耗大、环境要求高；
> UI 设计提升很重要，可以参考类似其他 IDE 的 UI 设计方案」。

### 13.1 先纠正一条前提

**webview 本身不占安装体积、不提高环境要求** —— 它跑在 Electron 自带的 Chromium 里，零额外运行时依赖。
所以「空间大 / 环境要求高」不是砍 webview 的理由。真正成立的成本是下面四条，
按对 OI 场景的杀伤力排序：

| # | 真实成本 | 对 OI 场景的后果 |
|---|---|---|
| **1** | **中文输入法（IME）在 webview 里有组合态与候选框定位的老问题** | OI 用户大量写中文注释、中文题面摘要，**这是硬伤，不是体验瑕疵** |
| **2** | **主题必须手工同步** `vscode` CSS 变量并监听 `themeKind` 变化 | 换主题时 webview 内容不跟随 → 白底白字 / 黑底黑字 |
| **3** | **每个 webview = 一个独立 renderer 进程** | 题面 + 题库 + AI + 评测四面板同开 = 四进程，内存与启动时间线性增长 |
| **4** | **postMessage 桥的类型丢失与时序问题** | 调试成本高；大列表还得自己实现虚拟化才扛得住十万题 |

> 体积这块真正的大头是 **KaTeX 与 pdf.js 的静态资源**，不是 webview 机制本身 → 处置见 §13.4。

**结论**：native-first 的方向是对的，但理由要换成上面四条，否则以后做取舍会算错账。

### 13.2 原生载体优先级（新代码按此顺序选型）

1. `contributes.configuration` — 设置走原生 settings.json，自带 schema 校验、全局搜索、主题联动
2. `TreeView` + `TreeDataProvider` — 题库、对拍器、比赛记录（大列表自动虚拟化）
3. `StatusBarItem` — 比赛倒计时、评测状态
4. `TextDocumentContentProvider` + 自定义 Editor — 评测报告、题面 Markdown
5. `QuickPick` / `InputBox` — 命令入口（**不要自己画弹窗**）
6. `contributes.snippets` — 竞赛模板（比 AI 补全更可靠、零延迟，见 §13.5）
7. `contributes.commands` / `menus` / `keybindings` — 所有入口统一收口
8. `contributes.colors` — 判定色 token 接入用户主题

### 13.3 各功能面的载体归属

| 功能 | 载体 | 备注 |
|---|---|---|
| 设置页 | `contributes.configuration` | **零自绘**；Key 输入框用 `password` 类型，不回显 |
| 题库列表 | `TreeView` | 十万级自动虚拟化 |
| AI 对话 | 原生侧栏视图 | 非 webview；输入走原生 `InputBox` |
| 评测结果 | `TextDocumentContentProvider` + diff 编辑器 | 复用 VSCode 原生 diff |
| 对拍器 | `TreeView` + 表格视图 | |
| 比赛模式 | `StatusBarItem` | 倒计时常驻 |
| 竞赛模板 | `contributes.snippets` | |
| 题面（Markdown） | `TextDocumentContentProvider` | |
| **题面公式** | ⚠ webview（白名单） | §13.4 |
| **PDF 题面** | ⚠ webview（白名单） | §13.4 |

### 13.4 webview 白名单（仅两处，且必须懒加载）

| 场景 | 为什么必须 webview | 降重手段 |
|---|---|---|
| **KaTeX 公式渲染** | 数学公式排版无原生方案，自研排版引擎成本远超收益 | 扩展懒加载；题面存本地 Markdown，**首次打开该题才拉 KaTeX** |
| **PDF 渲染** | pdf.js 是唯一成熟方案 | 同上，按需下载 |

**除这两类外，新代码一律不写 webview。** 已有的 webview 代码（若从别处移植）也要按本表逐条审判。

### 13.5 参照系：同类 IDE 的做法（2026-10-07 调研）

| 来源 | 做法 | 采纳 |
|---|---|---|
| **CP Studio**（VS Code 竞赛扩展） | 侧边栏 4 视图（统计 / 比赛 / AI / 题库），**同时只展开一个**，点标题切换 | ✅ OI 屏幕小，**视图互斥展开是刚需**，直接采纳 |
| **CP Studio** | 常用命令打包进视图标题栏工具条；编辑器上下文工具条随文件类型出现 | ✅ 采纳 |
| **CP Studio** | `Configure API Key` 入口就放在侧边栏 | ✅ 采纳，对应 §12.5 |
| **CP Supports**（VS Code 扩展） | **纯原生分屏**：左 `main.cpp` / 右上 `sample-1.in` / 右下 `sample-1.out`，零 webview | ✅ 采纳为「打开样例」默认布局 |
| **CP Editor**（独立 IDE） | 自述「简洁但强大，解题时不会迷惑，**你需要的一切始终在眼前**」 | ✅ 采纳为布局总原则 |
| **CP Editor** | testlib checker → 判定语义；**不保存即可运行** | ✅ M1b |
| **Cursor** | **Tab（行内补全）与 Agent 侧栏（对话委派）是两个不同工具，混用是早期挫败主因** | ✅ AI 教练走侧栏；**竞赛模板优先用 snippet 而非 AI**；行内 AI 补全列 M2+ |
| **JetBrains 工具窗口模型** | 每功能一个可停靠面板 | VSCode 侧栏 + 编辑器分屏已覆盖同等诉求，不额外引入 |

### 13.6 OI 语义落到 UI 的硬约束

- **判定色**用 `contributes.colors` 走主题语义（AC / WA / TLE / MLE / RE / CE），**不硬编码 hex**
- **中文优先**，但 OI 术语保留原样（SPJ / TLE / MLE / DFS / 普及 / 提高 / NOI）
- **键盘优先**：OI 用户是键盘流，比赛时手不离键盘；所有主流程必须有快捷键
- **题面 + 代码 + 样例三区同屏可见**，不靠切标签页来回跳

> ⚠ **R7 的坑在于「子进程」**：`build/npm/postinstall.ts` 会自己 spawn 子 `npm install`
> （`npmInstallAsync`，`env: { ...process.env }`）。**子 npm 不继承父进程的 CLI 参数
> `--proxy=null`**，会回头读用户 `~/.npmrc` → 再次 `ECONNREFUSED 127.0.0.1:7890`。
> 清 `npm_config_proxy=''` 也无效（空串不被 npm 当作「已设置」）。
> **唯一可靠解法**是换掉 userconfig 文件路径，让父子进程一次性全部生效，且**不修改用户文件**：
>
> ```powershell
> $env:NPM_CONFIG_USERCONFIG = 'D:\oler-ide-v2\build\npmrc-clean'   # 该文件只写 registry 等，不写 proxy
> npm ci
> ```
>
> 验收：`npm config get proxy` 应输出 `null`。

---

## 14. 变更记录

| 日期 | 阶段 | 内容 |
|---|---|---|
| 2026-10-07 | Phase 0 | 设计成文；实测环境、网络、Node 门槛、MSVC；产出 product.json 全量字段表 |
| 2026-10-07 | Phase 0 | 用户拍板 Q1（基线 `1.140.0`）/ Q2（`.nvmrc` 改 `24.16.0`）；**用户指示暂不开跑 Phase 1** |
| 2026-10-07 | Phase 0 | 用户指示 AI 接自建接入层 + 用户自带 Key → 新增 **§12 AI 接入设计**、D11；发现并记录 legacy 明文存 Key 缺陷 |
| 2026-10-07 | Phase 1 | 用户指示「开始完成」+ native-first UI → 新增 **§13 UI 策略**、D12；调研 CP Studio / CP Supports / CP Editor / Cursor 参照系 |
| 2026-10-07 | Phase 1 | **§11.3 第 2 步偏离**：`git clone` 卡死（pack 4 分钟 0 增长，smart-HTTP 被挡），改走 `codeload.github.com` tarball（54.3 MB / 7 分钟）。tarball 无 `.git`，按 §2 原定方案直接 `git init` 建独立仓库，**不提交** |
| 2026-10-07 | Phase 2 | `product.json` 全量 Olympia 化（§3 字段表逐项落地）；`package.json` name → `olympia-ide-dev`；`resources/` 7 个文件去微软化（§4） |
| 2026-10-07 | Phase 2 | 排障记：`npm ci` 连败 6 轮，根因各不相同（R7/R8/R9 + 一处本地脚本被改坏）。逐条已并入 §9 风险表与 §10 前置条件 |
| 2026-10-07 | Phase 2 | **`npm ci` EXITCODE=0**（1580 包 / 10 min）+ **`npm run compile` EXITCODE=0**（`with 0 errors` / 4.7 min，`out/` 11403 文件 394.6 MB） |
| 2026-10-07 | Phase 2 | 启动发现 **R5 实锤**：删 `defaultChatAgent` 会让首启引导 `assertDefined` 崩溃。已按 §12 决策改指 `olympia.olympia-coach`；**修复后窗口标题 `Welcome - Olympia IDE Dev`、12 进程、欢迎页正常渲染** |
| 2026-10-07 | Phase 2 | 另发现上游硬编码品牌漏网：`src/vs/platform/environment/node/userDataPath.ts:48` 写死 `'code-oss-dev'`（`VSCODE_DEV` 时覆盖 `nameLong`），已改为跟随 Olympia 品牌。**待重新编译生效** |
| 2026-10-09 | 中文化 | **路线变更**：放弃逐条手写（成本线性爆炸），改用官方 zh-hans 语言包 → AST join → 自动生成词典。一条命令产出 9,989 条词典 → apply 出 **11,498 处字面量 / 1,438 文件**，剩余英文 17,092 → 5,116。手写批次天然优先（`alreadyChinese` 自动排除） |
| 2026-10-09 | 做减法 | 排除 50 个 OI 不需要的内置扩展（git 全家桶 / 账户 / JS 工具链 / 33 种无关语言）。当时两处各抄一份：`build/lib/extensions.ts` 的 `excludedExtensions`、`extensionsScannerService.ts` 的 `OLYMPIA_EXCLUDED_EXTENSION_DIRS`（**dev 模式唯一生效的一处**）。~~第三处 `gulpfile.extensions.ts` 编译列表~~ **该处从未有过这张表（2026-10-14 grep 全文无 OLYMPIA/excluded 命中），当初记错了** |
| 2026-10-09 | 做加法 | 新建 `extensions/olympia-contest`：题面拉取（洛谷 / Codeforces / AtCoder）+ ACM/IOI 赛制模板。洛谷走内嵌 JSON，AtCoder 走 HTML，Codeforces 因 Cloudflare 人机校验改走官方 API 元数据 + 浏览器兜底 |
| 2026-10-09 | 修缺陷 | **D8 补漏**：上游在 `agentHostMain.ts` / `agentHostServerMain.ts` **无条件**注册 `CopilotAgent`，每次启动仍会拉起 `copilot-runtime.exe`（与「完全拆除 Copilot」矛盾，且日志泄露 `GITHUB_COPILOT_*`）。已加 `VSCODE_AGENT_HOST_COPILOT_AGENT_ENABLED` 门控，**默认 OFF** |
| 2026-10-09 | 真机验证 | 减法/加法首次经真实启动确认：`vscode.git` **零加载**、`olympia.contest` 已激活、全树**零 Copilot 引用**、零 `copilot-runtime` 进程、零真实错误 |
| 2026-10-14 | 做减法 | 裁剪表收进 `product.json:olympiaExcludedBuiltInExtensions` 一处，打包流与运行时扫描器都读它（**两处手抄就是这张表腐烂的原因**）。反证出两个真缺陷：两份名单都写着 `prompt`，而真实目录是 `prompt-basics` → **Prompt 语法扩展一直在出厂**；`ms-vscode.js-debug` 等 5 项指不到任何实物（本产品 `builtInExtensions` 为空、从不下载）。顺带 `gulpfile.vscode.ts` 的 `isCopilotExcludedFromProduct()` 原来问的是恒为空的下载清单，属于永真判断，改问这张表。新增 8 项裁剪（emmet / typescript-language-features / ipynb / notebook-renderers / tunnel-forwarding / debug-auto-launch / debug-server-ready / prompt-basics）：59 裁 / 41 留，由 `scripts/oneoff/check-built-in-trim.mjs` 守住死项、重复、承诺项、保留扩展对被裁扩展的依赖、以及"表被抄回代码"。装机目录里这 8 项目前仍在，等下一次 oss-package 出厂 |
| 2026-10-14 | 做加法 | **跑样例补上逐用例对照**（老版本 Tauri 有、fork 一直没有的那块）：`compareCase` 由同一个函数同时给出判定与诊断，WA 直接说「第几行第几个数不同」「只输出了前 N 行」「多了 N 行」「每行都有只是顺序不同」「程序没有任何输出」，而不是像原来那样把两个字符串压成一行再各砍 200 字符；`olympia.judge.compareOutput`（`Ctrl+Alt+K`、通知按钮、面板行三个入口）经内存 content provider 喂 `vscode.diff` 开并排对照，不往学生工程里写临时文件。官网 docs 里那句「WA 会把期望输出和你的输出并排列出来」从此才真是产品能力（此前描述的是旧版）。4 条新检查 + 7 次反证；反证过程中抓出自己写重复的 `failedCases.push`（同一组样例进列表两次，会让「只有一组失败也不先问」退化成每次都问）|

### 剩余英文处置（2026-10-09 定案）

剩余 5,116 条按「产品在 Olympia 里是否可达」分桶，**不按文本形状分类**：

| 桶 | 条数 | 处置 |
|---|---|---|
| AI 基础设施（`agentHost` / `chatDebug` / `aiCustomization` / `copilotCliConfig`） | 1,860 | **不翻**。协议层与调试器，OI 学生不可见 |
| `sessions/` / `automations` / agent 会话 | 1,287 | **不翻**。BYOK 方案落地前不可达 |
| 聊天 UI 本体（`chatPet` 成就 / `voice` / `modelPicker`） | 1,004 | **不翻**。`chatPet` 是游戏化成就系统，对 OI 纯噪声；深度嵌入 chat 输入框，裁剪会破坏布局，风险高于收益 |
| 核心 / 基础 / 配置 | 736 | **按需补**，优先编辑器、调试、终端、搜索用户高频面 |
| 测试文件 `.test.ts` | 113 | **不翻**。不进入产物 |

结论：**不追求 100% 中文化**。官方语言包已覆盖全部用户高频路径；剩余项继承上游现状即可，逐条翻译的边际收益低于其成本与出错风险。

### 首启效果模拟工具（2026-10-09）

`build/first-run-sim.ps1` —— 让本机产生与「新用户首次下载打开」完全一致的观感，用于验收欢迎页、首启引导、默认主题等。

```powershell
.\first-run-sim.ps1 -Reset          # 备份 user data → 清空 → 启动，看到首启
.\first-run-sim.ps1 -Restore        # 从最近备份还原
.\first-run-sim.ps1 -ListBackups    # 列出备份
.\first-run-sim.ps1 -Reset -WhatIf  # 干跑，不动数据
.\first-run-sim.ps1 -Reset -KeepLogs  # 保留日志便于对照
```

**为什么是「移动」而不是「删除」**：本机安全策略会拦截 `Remove-Item` / `rmdir /s`，且删除不可逆。脚本用 `robocopy /MOVE`（目录）与 `Move-Item`（单文件）把 27 项 user data 内容搬到 `build/firstrun-backups\<时间戳>\`，一键可还原。

**首启状态由什么决定**（实测确认，非推测）：

| 载体 | 作用 |
|---|---|
| `User/globalStorage/state.vscdb` | SQLite。`telemetry.firstSessionDate`（首启时间戳）、`memento/gettingStartedService`（各步骤 `done` 标记）、`workbench.welcomePage.walkthroughMetadata`、`workbench.welcomePage.hiddenCategories`（首启后会把引导从欢迎页隐藏） |
| `User/settings.json`、`User/keybindings.json` | 用户自定义设置（首启时**不存在**） |
| `User/workspaceStorage/*` | 工作区状态与布局 |
| `logs/`、`Cache/`、`GPUCache/` 等 | 历史会话与缓存 |

注意「隐藏引导」本身也是首启**之后**才写入的 —— 所以首启时欢迎页会正常列出 `olympia.onboarding#olympia.gettingStarted` 引导条目。

**实测结果**：`-Reset` 后应用零错误启动、`olympia.onboarding` 正常激活、`settings.json` 被应用自己写入默认主题 `"Light 2026"`（首启真实行为，非脚本副作用）；`-Restore` 后 14.3 MB 数据完整回归，`firstSessionDate` / 引导进度 / copilot 残留全部还原。

**两个 Windows 特有的坑（已修）**：
1. `.ps1` **必须带 UTF-8 BOM** —— PS 5.1 无 BOM 时按 GBK 解析，中文字符串被读成乱码直接导致 ParserError。这与「配置文件一律 UTF-8 无 BOM」的常规约定相反，PowerShell 脚本是例外。
2. `state.vscdb` 被运行中的实例独占 —— 必须**先关进程再读状态**，否则 `ReadAllBytes` 抛 IOException；读取要用 `FileShare.ReadWrite`，且 `[System.Text.Encoding]::Latin1` 在 PS 5.1 不存在，要用 `GetEncoding(28591)`。

## 15. 内置 C++ 编译器（2026-10-10 落地）

**决策**：直接内置进安装包。理由是 OI 场景的核心体验就是「装完就能编译」，让小白去装 MinGW 等于把最大的一道坎留在门外，这与 §2 的产品定位冲突。

### 15.1 成果

| 项 | 数据 |
|---|---|
| 来源 | MSYS2 官方 `mingw-w64-x86_64-*` 包，清华镜像（GitHub 在本机不可达） |
| 必需包 | **11 个** |
| 压缩下载 | **68.8 MB** |
| 安装后体积 | **466 MB**（剪枝后） |
| GCC 版本 | **15.2.0**，与洛谷要求的 15.1.0 同代 |
| 真实验证 | 用洛谷官方参数编译并运行 P1001，输出 `50` |

构建脚本 `build/fetch-toolchain.mjs`，产物落在 `oss/.build/toolchain/mingw64/`。

### 15.2 五个必须实测才能发现的坑

这套工具链的包依赖关系**无法靠经验推断**，每一个都是靠「实际编译一次」暴露的：

1. **`g++` 是符号链接**。手写 tar 解析器会静默跳过符号链接，结果 `g++.exe` 根本不存在。解法是用 Windows 自带的 bsdtar（原生支持 zstd / GNU 长名 / 链接解析），并把丢失的驱动实体化复制——Windows 无开发者模式时无法创建符号链接。

2. **不能剥掉 `mingw64/` 前缀**。GCC 的 sysroot 按 `<prefix>/x86_64-w64-mingw32/...` 解析，剥掉后所有内部路径错位一级，链接报 `collect2: error: ld returned 8`。

3. **`ld.exe` 启动即崩**。链接器直接导入 `zlib1.dll` / `libzstd.dll` / `libintl-8.dll`，三个包看起来像「可选依赖」，实际缺了就起不来。collect2 只报一句毫无信息量的 `ld returned 8`。

4. **退出码要会读**。`0xC0000135` = DLL 找不到，`0xC0000138` = 入口点缺失，两者都不告诉你是谁。脚本内建了 PE 导入表扫描，直接报出「缺失的依赖 DLL: …」。

5. **剪枝必须重新验证**。第一次按 `lib*.a` 宽泛规则剪掉 955 个静态库（省 96 MB），结果链接报 `cannot find -lm / -lmsvcrt / -lkernel32` —— 那些是**必需**的。最终改为精确 deny-list：只删 `cc1*`（GCC 自举用，约 61 MB）和 Windows API-set 归档。

**方法论**：包清单不能凭经验列。每加一个包都必须跑一次真实编译 + 运行，否则无法区分「解压成功」和「能用」。脚本已把这一步固化为 `verifyCompile()`。

### 15.3 探测顺序

`extensions/olympia-onboarding/src/toolchain.ts`：

1. `olympia.compiler.path` —— 用户显式配置永远优先
2. **内置工具链** —— `<appRoot>/toolchain/mingw64/bin/g++.exe`
3. `g++` on PATH —— 覆盖已有 MinGW/LLVM 的学生

内置优先于 PATH 是刻意的：内置版本是参数已按评测机核对过的那一份，PATH 上一个更新的 GCC 反而会接受评测机拒绝的代码。

### 15.4 打包接入

`build/gulpfile.vscode.ts` 的 `packageTask` 新增 `.build/toolchain/**` glob（存在才加，缺失时静默跳过 —— 没有工具链的 dev 构建仍是合法 IDE，只是回落到 PATH）。工具链落在包根，`code.iss` 的 `Source: "*"` 会自动收进安装包。

**合规**：`share/licenses` 在剪枝时被刻意保留 —— GPL 声明必须随二进制分发。

### 已在 fork 内落地的上游补丁（合上游时需重放）

| 文件 | 补丁 | 原因 |
|---|---|---|
| `build/npm/postinstall.ts` | `ensureAgentHarnessLink` 补 `UNKNOWN`(-4094) 分支 + 目录 `fs.cpSync` 兜底 | 无开发者模式下上游只判 `EPERM`，导致 agent 便利链接失败并**中断整个 postinstall** |
| `src/vs/platform/environment/node/userDataPath.ts` | `'code-oss-dev'` → `'Olympia IDE'` | dev 实例数据目录硬编码泄露上游品牌名 |
| `extensions/microsoft-authentication/package.json` | keytar mock 改 `file:./keytar-7.9.0.tgz` | `file:` 目录依赖需建符号链接，无开发者模式时失败 |
| `package.json` | `allowScripts["foundry-local-sdk@1.2.3"] = false` | 其原生库需从需授权的 NuGet 源下载；Copilot 听写用，Olympia 不需要 |

### Phase 1 实际执行记录（2026-10-07）

| 项 | 结果 |
|---|---|
| 源码 | `codeload.github.com/microsoft/vscode/tar.gz/refs/tags/1.140.0`，54.3 MB，解出 **19483 文件 / 266.9 MB** |
| **版本核验** | `oss/product.json` SHA256 = `104A252A…A945`，与经 `api.github.com` 取的上游 `1.140.0` 原件**逐字节一致** |
| 版本锚点 | `package.json` = `code-oss-dev` / `1.140.0` |
| 独立仓库 | `git init`，branch `master`，`core.longpaths=true`，`core.autocrlf=false`，**commit count = 0** |
| `.nvmrc` | `24.18.0` → **`24.16.0`**（8 bytes，UTF-8 无 BOM，保留尾换行）；闸门复查：本机 `v24.16.0` == `.nvmrc` → **放行** |
| Olympia 本仓 | HEAD 仍 `654172b`，**未 commit、未删 `frontend/`** |

**2 个文件未能落盘，均为测试 fixture，不影响编译与运行：**

1. `extensions/terminal-suggest/src/test/fixtures/symlink-test/symlink-executable.sh`
 —— Windows 无开发者模式时无法创建符号链接；上游该文件本身就是符号链接。

2. `src/vs/workbench/services/search/test/node/fixtures/…/….txt`
 —— 文件名含**刻意构造的畸形字节**（落盘为 `EE 87 A2` = U+E0E2 私有区字符），
 属上游用于测试「搜索服务处理非法 UTF-8 文件名」的 fixture。

> 二者只影响 `yarn test` 的对应用例，**不影响 `npm run compile` 与启动**。