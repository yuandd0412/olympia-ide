# 同类 IDE 横向调研（OlympiA 视角）

> 调研方式：Ego Lite（`ego-browser` CLI，task space #2）真实浏览器抓取，共 10 轮、9 组搜索引擎查询、40+ 个页面。
> 调研日期：2026-10-22 ｜ 执行：mavis ｜ 任务卡：T-017
> 原始抓取产物：`D:\oler ide v3\.scratch\ego-cpl-20261022\`（round-01…round-10 的 JSON，含每页正文快照）

## 0. 前置说明：调研期间的机器网络改动（已恢复）

抓取开始前遇到一个环境问题，必须先说明，因为它影响"数据是怎么来的"：

- 本机系统代理是 `127.0.0.1:7890`（verge-mihomo / clash-verge 内核），**该代理的 HTTPS CONNECT 已经失效**：
  `Invoke-WebRequest` 经代理访问 `https://github.com` 报「基础连接已经关闭」，经代理访问 `http://example.com` 由 mihomo 自己返回 **502 错误的网关**。
- Chromium（Ego 内核）默认吃系统代理，所以第一轮里除了百度/洛谷（走 mihomo 的 DIRECT 规则）之外，**所有境外站点一律 `ERR_CONNECTION_CLOSED`**，GitHub 仓库页、VS Code 官网、Thonny 官网、JetBrains 官网全部打不开。
- 验证：Node 直连（不走代理）访问 `github.com / code.visualstudio.com / thonny.org / jetbrains.com / onlinegdb.com / replit.com / pythontutor.com / programiz.com` **全部 200**——即这台机器直连境外是通的，坏的只有代理。
- 处理：调研期间临时把 `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ProxyEnable` 置 0（Chromium 会热重载代理配置，改完 Bing 立刻恢复可访问），**调研结束后已改回 1**。mihomo 进程全程未动。
- 代价：GitHub 深链偶发 `ERR_CONNECTION_RESET`、SourceForge 撞 Cloudflare「Just a moment...」、Hydro 撞 Anubis 人机校验、洛谷部分文章撞「安全访问中心」安全页——这些条目在下文标注为"未取到正文"。

---

## 1. 市场分层：OI 学生今天实际在用什么

这一节全部来自 **OI 社区自己写的横评/选型文**（洛谷专栏、OI Wiki 工具软件章节），不是我的印象，是目标用户自己说的。

| 产品 | OI 社区的实际评价（原文要点） | 出处 |
|---|---|---|
| **Dev-C++** | 曾是默认答案（教练预装、自带编译器、不用配置）。但：**自带 gcc 4.9.2 只支持 C++11**、界面简陋、不支持字体 ligature（JetBrains Mono / Fira Code）、代码补全"半残且经常出 bug"，**已被淘汰**。唯一被认可的优势是「支持单文件编译及便捷调试」 | 洛谷《OI 环境配置指南》 |
| **小熊猫 Dev-C++** | 国人基于 Dev-C++ 重做，原文直接点名「是一个**高效的算法竞赛 IDE**，可以尝试」 | 同上 |
| **VS Code** | 事实标准。理由：轻量、可扩展、跨平台、运行时内存日常 <500MB（作者实测写文时 <200MB）。但**配置门槛高**：编译器要自己装、插件要自己配、测例要靠浏览器插件导 | 同上 |
| **Visual Studio / CLion / Code::Blocks** | 「大多都是设计用来工程开发的，不适合竞赛代码编写（例如这三款 IDE **不能对单文件使用内置调试器**），且空间占用都不小」 | 同上 |
| **Sublime Text** | 「非免费开源，虽然快，但**插件质量普遍低下**」 | 同上 |
| **Vim / Emacs / (Neo)Vim** | 「配置复杂，需要会使用命令行和内置命令，**对于 OIer 不够友好**」 | 同上 |
| **Atom** | 「界面美观，但反应迟缓和内存占用过高」 | 同上 |
| **Competitive Companion**（浏览器扩展） | 事实上的标准配件：「支持解析几乎所有的主流 OJ 平台（比如 Codeforces、AtCoder）」，把测例以 JSON 形式发到本地端口 | OI Wiki《OJ 工具》 |

**从这段社区自述里能提炼出的三个真实痛点**（后面所有竞品都围绕这三点展开）：

1. **环境配置**：编译器（MinGW w64 / TDM-GCC / Winlibs）、IDE、浏览器插件，三件套要自己拼，教练/家长/机房环境每台机器都不一样。
2. **单文件调试**：能对单个 `.cpp` 断点调试的 IDE 很少——Dev-C++ 的这项能力反而成了它唯一被怀念的理由；VS/CLion/Code::Blocks 都不行。
3. **题面 → 样例 → 提交的往返**：主流做法是浏览器插件把样例 JSON 推到本地端口，再由本地工具接住，属于"外挂链路"。

---

## 2. 竞品盘点（按与 OlympiA 的重叠度分层）

### A 类 · 竞赛专用桌面 IDE（最直接的对标）

**A1. CP Editor 7.0** — https://cpeditor.org/
- 定位：`The IDE for Competitive Programmers`，口号「by competitive programmers, to competitive programmers」。
- 能力：一键从 Codeforces / AtCoder 等平台抓样例；多测试点批量编译运行并比对输出给判定；用 **CF-Tool** 直接提交 Codeforces 并在编辑器内看提交判定；**不保存即可运行**；hot exit 断电恢复上次会话；代码折叠、KSyntax 高亮、多主题、实时 lint；官方支持 C/C++/Java/Python，可自定义编译命令与运行参数，不同标签页可用不同语言。
- **短板（OI Wiki 原文）**：「CP Editor 内部**没有集成编译器**，需要自己安装配置编译器……如果你在下载时选择了带有 `with-gcc-<GCC 版本号>-llvm-<LLVM 版本号>` 后缀的安装包，你就可以使用 CP Editor 自带的编译器」。
- 对 OlympiA 的意义：**功能形态最接近的对手，栽在"要自己配编译器"这一步上**——正好是 OlympiA「内置 > 引导下载」哲学要打的那一点。另外它对洛谷这类国内 OJ 的支持弱（提交链路绑定 Codeforces）。

**A2. icie** — https://github.com/unneon/icie
- 定位：`Competitive programming IDE-as-a-VS-Code-fork`——**和 OlympiA 同构的技术路线**（VS Code fork 做竞赛 IDE）。
- 本次未取到正文：GitHub 深链在直连下偶发 `ERR_CONNECTION_RESET`，只拿到仓库标题与描述。**这条需要后续单独核实**。

**A3. ZetaCP** — https://codeforces.com/topic/155581/en1
- 定位：`An All-in-One IDE design for Competitive Programming`，是 Codeforces 社区里的**设计提案帖**，不是成熟产品。

**A4. 小熊猫 C++（RedPanda C++）** — http://royqh.net/redpandacpp/ —— **本轮最重要的发现，它站在 OlympiA 原本打算站的位置上**
- 定位：`跨平台、轻量易用的开源 C/C++ 集成开发环境`（作者 瞿华 royqh1979），Qt + C++，GPL 开源；近版节奏 3.1(2024-06) / 3.2(2024-11) / 3.3(2025-05) / **3.4(2025-11)**，支持 Windows 7/8/10、Linux。
- 能力：实时智能代码补全；智能语法高亮（区分全局/本地变量、类定义、宏、命名空间、枚举）；自动缩进；**边写边做的自动语法检查**；中英文分别设字体；**完整调试器**（断点、监视变量与表达式、表达式求值、查看本地变量、调用栈切换、内存读写、CPU 寄存器、**反汇编**，甚至可以**重定向被调试程序的输入**）；**内置 git 支持**（需另装 git）；多屏/多 DPI，适合教学与展示。
- **竞赛专属两块（最关键）**：
  1. **试题集与试题案例**——组织管理、运行、测试练习程序，**可导入或从 OJ 网站下载试题和配套测试数据**；
  2. **零配置承诺**——"无需复杂的安装和配置，打开即可直接编辑程序文件；无需创建项目，点击工具栏上按钮即可编译、运行和调试"；**Windows 版自带 gcc**，并整合 ege、海龟作图、raylib、freeglut、GLFW、GLEW 等入门库与项目模板。
- 对 OlympiA 的意义：**"内置编译器 + 零配置 + 竞赛题集"这三件事，小熊猫已经做到了**，而且做得不差。它不是"新手的玩具"，是有完整调试器和 OJ 题集导入的正经 IDE。**OlympiA 不能再把"内置编译器"当成差异点**，真正的差异要往"题库面板 / 训练 / 错题本 / OJ 提交闭环 / AI"这些更深的工作台能力上走。

**A5. CompIDE — Competitive Programming IDE | Atrak** — https://atrak.dev/projects/compide.html —— **技术路线与 OlympiA 同构**
- 定位：`desktop-first contest practice IDE`，作者 Atrak & Charlie Han，**Electron + Monaco Editor**，本地 Java/C++/Python 执行，样例测试管理、模板工作流、诊断，**offline-friendly**，macOS DMG 构建中（Active build）。
- 主张的闭环就是 `edit → test → fix → rerun`。
- 对 OlympiA 的意义：**"Monaco + Electron 做竞赛桌面 IDE"这条路已经有人走通了**（OlympiA 的 Monaco 选型得到外部印证），但对方只做"练习台"，没有题库、训练、错题本、AI——这恰好是 OlympiA 可以拉开差距的地方。

**A6. cp-ally** — https://github.com/0xPolybit/cp-ally-ide —— **题面抓取这条链最值得抄的实现**
- 定位：`Unofficial partner code editor for competitive programming`，专门为 Codeforces 工作流造：**输入 contest code + index（如 2208A）→ 读题面 → 写代码 → 跑样例，全程不碰浏览器、不碰终端**。
- 能力：按 contest code + index 抓任意 CF 题面；渲染完整题面（HTML、内联图标、LaTeX 数学公式）；**statement-only 视图与含样例的完整视图双模式**；**自动识别并丢弃 bot-check 页面、缓存失效自动重抓**；一键 Refresh Problem 且不清空编辑器；最近题目历史 + 浏览器链接 + 复制源码/跳转提交页的工作流。
- 对 OlympiA 的意义：**"题面直接进编辑器"不是幻想，已经有人做完了**，且给出了三个工程要点：抓取缓存、bot 检测、刷新不清空编辑器。OlympiA 做洛谷版本时可以直接沿用这套设计。


### B 类 · VS Code 生态里的竞赛插件（用户自己拼出来的"事实竞品"）

**B1. Competitive Companion** — https://github.com/jmerle/competitive-companion（浏览器扩展）
- 解析几乎所有主流 OJ 页面的测例数据，JSON 推送到本地指定端口，本地任何监听工具都能接。
- 在 OI Wiki《OJ 工具》里被列为标准工具，并配了 `bytetools` 做演示。

**B2. Competitive Programming Extension（CPD，abdelazer）** — VS Code 内竞赛扩展（抓样例 / 跑测试 / 提交 CF）。

**B3. cf-tool** — 命令行工具，`cf test`（编译并测样例）/ `cf submit`（提交）/ `cf list`（看比赛题目）/ `cf stand`（浏览器打开榜单）。
- **B 类合起来的杀伤力**：一个学生装 VS Code + CPD + Competitive Companion + cf-tool 就能拼出"接近 OlympiA"的闭环，而且全是免费成熟件。**OlympiA 的题面/样例/提交能力必须做到"不用拼装"，否则会被绕开。**

### C 类 · OJ 聚合与在线判题平台

**C1. Virtual Judge（vjudge.net）** — https://vjudge.net/
- 一次登录聚合 **60+ OJ**：POJ、ZOJ、UVA、HDU、HYSBZ、SPOJ、CodeForces、AtCoder、LightOJ、CodeChef、OpenJudge、Kattis、HihoCoder、TopCoder、计蒜客、LibreOJ、UniversalOJ、黑暗爆炸、DMOJ、洛谷、Baekjoon、QOJ、CSES、USACO、oj.uz、Yosupo、yukicoder、牛客、代码源……
- 定位：**只做题，不写码**。对 OlympiA 的意义是"题源聚合"这件事已经被一个老产品做成了默认心智，OlympiA 不必重复造题库聚合，要做的是**写码这一侧**。

**C2. CPIDE** — https://cpide.me/ —— **本轮最值得警惕的对手**
- 定位：`Free Online IDE & Judge for Competitive Programming`，**免费、零注册**。
- 能力：导入 Codeforces / AtCoder 题面；自带测试用例，支持 Stress 压测与多用例判定；即时给出 **AC / WA / TLE** 判定（可设每用例时限）；编辑器双形态——桌面用「Advanced（VS Code 引擎）」、手机用「Simple」；支持 Vim keybindings、格式化保存、严格空白比对（默认宽松，对齐 Codeforces 行为）；自带代码模板 snippets；**代码/用例/设置只存浏览器本地，可导出备份**。
- 对 OlympiA 的意义：**"零安装"路线**。网吧机、借电脑、只有手机的学生，压根装不了任何 IDE。OlympiA 的"开箱即用"和它不在一个维度——它连装都不需要。

**C3. 洛谷云 IDE** — https://ide.luogu.com.cn/ —— 本次**域名无响应**，无法访问；洛谷主站本身把题面/评测/社区做得很全。
**C4. Hydro** — https://hydro.ac/ —— 自建 OJ 套件，本次被 Cerberus（Anubis 系）人机校验挡住，未取到正文。

### D 类 · 新手向本地 IDE（"教学生入门"的对手）

**D1. Thonny 5** — https://thonny.org/ —— **理念上最接近 OlympiA 的对手**
- 定位：`Python IDE for beginners`。
- 关键设计：**自带 Python 3.14，一个安装包即可开课**（也可挂外部 Python）；初始界面**刻意剥掉一切可能分散注意力的功能**；变量面板（View → Variables）；**Ctrl+F5 单步执行、无需断点**，F6 大步 / F7 小步，且**按程序结构而非代码行步进**；小步时能看表达式逐块求值；进入函数调用会开独立窗口显示局部变量与代码指针（专为理解递归设计）；语法错误（未闭合引号/括号）高亮提示。
- 对 OlympiA 的意义：**Thonny 用"减法"做新手 IDE，OlympiA 用"内置 + 引导"做新手 IDE**。两者对"上手成本"的理解一致，说明这个方向被验证过；同时也提醒我们——Thonny 的变量面板 / 单步可视化，正是 OlympiA 的调试面板可以抄的交互。

**D2. IDLE** — https://docs.python.org/3/library/idle.html —— Python 自带：跨平台、交互 shell、多窗口编辑器（彩色化、smart indent、call tips、自动补全）、**带断点的调试器**、全局/局部命名空间查看。老派但免费且零安装。
**D3. Spyder** — https://www.spyder-ide.org/ —— 科学计算向 Python IDE（本次抓到空正文）。
**D4. PyCharm** — https://www.jetbrains.com/pycharm/ —— `Download for free, 30 days of Pro included`；专业向、商业许可与订阅、JetBrains Air 多 agent 叙事；**明确面向工程与数据科学，非竞赛单文件场景**。
**D5. Code::Blocks** — https://www.codeblocks.org/ —— `The IDE with all the features you need`，轻量、跨平台、C++ 友好、**支持单文件调试**（社区文章同时说它"不能对单文件使用内置调试器"——两说并存，以官网"单文件调试"为准，社区吐槽多指体积与工程化取向）。
**D6. Geany** — https://geany.org/ —— `The Flyweight IDE`：轻量、50+ 语言、40+ 语言界面、GPL v2；社区评价"适合轻度 C/C++ 使用者"。
**D7. Dev-C++ / 小熊猫 Dev-C++** — SourceForge 与 devcpp.sourceforge.net 均为 Cloudflare 校验页，未取到正文；事实以洛谷文章 + 搜索快照为准。**小熊猫 C++ 本身已单独列为 A4（它是本轮最接近的对标，不是 D 类）。**
**D8. Sublime Text 4** — https://www.sublimetext.com/ —— 付费、极快、GPU 渲染、Tab 多选；插件质量被 OI 社区吐槽。
**D9. Helix** — https://helix-editor.com/ —— 终端模态编辑器；多光标、Tree-sitter、LSP；**目前无插件系统**，社区横评里被列为"进阶档"。
**D10. Neovim** — https://neovim.io/ —— 可嵌入任何 GUI/IDE 作为编辑器或脚本宿主（`nvim --embed`），LSP、Tree-sitter、RPC 扩展。
**D11. VS Code 本体** — https://code.visualstudio.com/ —— 已自我定位为 `The open source AI code editor` / 多 agent 开发入口；官方提供 C/C++ 扩展；免费开源。

### E 类 · 在线编译 / 可视化 / 云 IDE

这一类是"零安装"阵营，事实均来自官网正文：

- **OnlineGDB** https://www.onlinegdb.com/ — `online compiler and debugger for c/c++`：gcc/g++ + gdb 在线调试，语言下拉 40+（C/C++ 14~26、Java、Python3、Go、Rust、Swift…），另有 Classroom / Learn Programming / Programming Questions 分区。
- **OneCompiler** https://onecompiler.com/ — `Free online compiler with 110+ languages and databases`，自称服务 **1280 万用户**；提供 **API + 编辑器 iframe 嵌入**（"几分钟内接入代码执行能力"）与浏览器内 AI agent（读工作区、就地改文件、逐步执行、每步可回滚）。
- **Judge0** https://judge0.com/ — 开源、沙箱化执行系统，60+ 语言、可自托管、API + Webhook；官网明确把 **competitive programming platforms / e-learning platforms / online editors / online IDEs / AI-agents** 列为目标场景，并已推出 **Judge0 IDE** 与 **Judge0 Mobile IDE** 两个成品（GitHub 3.5k star）。
- **Wandbox** https://wandbox.org/ — 40+ 语言沙盒，支持 LSP。
- **Programiz 在线编译器** https://www.programiz.com/python-programming/online-compiler/ — 在线 Python 编译器 + Visualize。
- **Python Tutor** https://pythontutor.com/ — **可视化调试器**：逐步显示变量、对象、指针、数据结构与栈帧；**2010 年至今 2500 万+ 用户、5 亿+ 次可视化、180+ 国家、10000+ 所学校**（MIT / Harvard / Princeton / UC Berkeley / 清华 / IIT 都在用）；支持 Python / Java / C / C++ / JavaScript；有 Teacher Mode。
- **Replit** https://replit.com/ — ⚠️ **已经转型**：现在的首页是 `AI App and Website Builder`（"Describe what you want. Replit builds it."），订阅 Free / Power / Max。**它已不再把"学生编程 IDE"当主战场**——这是本轮一个值得记的信号。
- **Compiler Explorer** https://godbolt.org/ — 展示编译产物的汇编输出，面向高级玩家。
- **Cursor** https://cursor.com/ — AI coding agent（中文站文案）。
> 这一类的共同点：**零安装、零配置，但也零持久化、零本地资产、几乎没有"工作台"概念**。Python Tutor 的量级说明"看懂程序"这件事的教学需求是真实且巨大的。

### F 类 · AI 竞赛助手（对 OlympiA AI 教练的对标）

**F1. oi.devtool.uk** — https://oi.devtool.uk/
- 定位：`ICPC / NOI / OI 编程竞赛学习助手`。
- 能力：粘贴洛谷 / Codeforces / Library Checker 题链 → 自动抽取题面 → 题意理解与关键约束分析 → 解法推导与复杂度评估 → **代码审查与优化建议**（边界检查、性能优化、实现细节，结合竞赛常见失误模式）；支持训练与赛前复盘；未登录可导入并预览题面，发消息时弹登录框。
- 对 OlympiA 的意义：**AI 教练这条路已经被一个专注垂直场景的产品占住了**。OlympiA 的 `dots.ai` 若只是"通用 AI + 竞赛皮肤"，很难打过"题意拆解 → 解法 → 代码审查"这种垂直链路。

### G 类 · 赛场与官方环境（定位边界，不是竞品）

这一节不是竞品，但它是所有 IDE 类产品的**天花板**，决定了产品该在哪打。

- **NOI 官方不推荐任何图形化 IDE**：比赛环境统一为 **NOI Linux**（Debian 12 定制版），只预装 `gedit`、`kate`、`vim`、`emacs` 四款编辑器 + `g++ (GCC 11.4)`、`python3.11`、`make 4.3`、`gdb 13.2`、`valgrind 3.20` 等命令行工具链；**不预装 Code::Blocks / Dev-C++ / CLion / VS Code**；现场禁 USB、禁 sudo、无网络。官方《竞赛规则》与《技术指南》反复强调选手应熟练终端编译（`g++ -o a a.cpp && ./a`）并适应"无调试器、无自动补全、无项目管理"的纯文本环境。
- 含义有两层：
  1. **OlympiA 的战场是"日常训练与模拟赛"，不是赛场**——不要为了"像赛场"去做减法；
  2. 但也别去抢"vim/gdb 熟练度"那个位置（高级档选手的自留地），两头的用户都不是 OlympiA 的目标。
- 同类信息：国内主流备赛科普（CSDN）把工具分成 Dev-C++（最常用/最适合新手）、Code::Blocks（跨平台 + 内置 GDB，调试强）、VS Code（扩展性高）、**CLion（付费但有免费教育版）**、在线评测平台、NOI Linux 六类。**注意 CLion 有学生免费教育版**——这是 OlympiA 在"进阶档"上必须承认的对手。

---

## 3. 结论：OlympiA 的真实空位在哪

### 3.1 「内置 > 引导下载」：方向被验证，但**这一格已经被小熊猫占了**

先说结论中最反直觉的一条：**"装完就能写、能跑"这件事并不是空白**。

- OI 社区最痛的确实是装环境——洛谷《OI 环境配置指南》整篇就是在教人怎么把编译器 + IDE + 浏览器插件拼起来，VS Code + Competitive Companion + cf-tool 这套装配全是用户自己拼的。
- 最像的竞赛 IDE **CP Editor** 也栽在这：OI Wiki 明写它「内部没有集成编译器」，用户要么自己配，要么下带 `with-gcc-…-llvm-…` 后缀的安装包。
- **但小熊猫 C++ 已经把"零配置 + 自带 gcc + 试题集"做完了**，而且体验描述（打开即用、无需建项目、点击按钮即编译运行调试、自带 gcc 与入门图形库）几乎就是 OlympiA 的目标画像。

所以结论要改成：

> **"内置编译器"本身不是差异点，是入场券。** OlympiA 内置 MinGW 13.1 / g++ 17 / OJ 凭据的价值是**不让用户退回配置流程**（这一条仍然成立且必须保持），但它不能作为对外的差异叙事。
> **真正的差异在"编译器之后的那些事"**：题库面板（按难度/标签/训练赛组织）、训练进度、错题本、OJ 提交与判分闭环、AI 教练。这四件事，本轮扫过的所有对手**没有一个同时具备**，小熊猫也没有（它的"试题集"只是本地组织 + 从 OJ 下载测试数据，没有题库、没有判分回流、没有错题本）。

**给小熊猫的一句公道话**：它把"教新手写 C++"这件事做得比 Dev-C++ 好太多（智能补全、实时语法检查、完整调试器、反汇编、OJ 题集下载），如果 OlympiA 只做"更好的小熊猫"，赢不了。


### 3.2 六个位置，谁占了哪一格

| 位置 | 已有玩家 | 这个位置缺什么 |
|---|---|---|
| 零安装在线 | CPIDE、OneCompiler、Python Tutor、Judge0 IDE / Mobile IDE、洛谷主站 | 不落本地资产、无错题本、无训练闭环；Replit 已转型离开这个战场 |
| 本地专业 IDE | VS Code、PyCharm、CLion（有免费教育版）、Code::Blocks | 不为竞赛单文件优化、体积大、配置重 |
| 极客模态 | Helix、Neovim、Vim | 对 OI 新手完全不友好（NOI 官方甚至只预装 vim/emacs/gedit/kate） |
| 竞赛专用桌面 | **小熊猫 C++**、CP Editor、**CompIDE（Monaco/Electron）**、icie(待核实) | 小熊猫有编译器+调试但没题库/错题本/提交闭环；CP Editor 不内置编译器且提交绑定 CF；CompIDE 只做练习台 |
| 题面 → 编辑器 | **cp-ally**、Competitive Companion、CPD、CPIDE 的 Import | 都只覆盖 Codeforces/AtCoder，**洛谷没有一家做透** |
| AI 竞赛辅助 | oi.devtool.uk | 只做"讲题/审码"，不做本地工作台与判题闭环 |

**缝在"本地 + 竞赛 + 零配置 + 题库/训练/错题本/提交闭环 + 中文新手友好"这个交集上**。小熊猫占住了前半段（本地+竞赛+零配置），**后半段（题库/训练/错题本/提交/AI）无人占满**——OlympiA 真正的战场在这里，而且和它现在规划的 5 个面板（Problems / Training / Mistakes / AI / Settings）正好重合。

### 3.3 必须补的四块

1. **题面/样例一键进编辑器**——Competitive Companion 是社区标准链路，CPIDE 有 Import，CP Editor 有"一键抓样例"，cp-ally 已经把 CF 版做透了（抓取缓存 + bot 检测 + 刷新不清空编辑器）。**洛谷侧没人做透**，这是最短的一块板。
2. **错题本 / 训练闭环**——`positioning.md` 自己写着 mistake book "still unbuilt"，而对位的 AI 平台（oi.devtool.uk）已经把"题意理解 → 解法 → 代码审查 → 复盘"整条链做出来了。
3. **OJ 提交与判分回流**——小熊猫有题集和 OJ 下载但没有提交判分回流；CP Editor 的提交绑定 Codeforces。**洛谷提交 + 判分回填到训练面板**，是 OlympiA 的天然优势区（洛谷生态在位）。
4. **单文件调试体验**——Dev-C++ 唯一被怀念的能力（单文件编译 + 便捷调试）目前没有合格接班人；小熊猫的调试器已经很完整（能看寄存器/内存/反汇编），Thonny 用"Ctrl+F5 单步 + 变量面板 + 无断点"给出了新手向答案。**OlympiA 不需要再造调试器，但需要新手向的调试外壳。**

### 3.4 风险

- **小熊猫 C++ 正站在"内置编译器 + 零配置 + 竞赛题集"的位置上**，且是国产、免费、开源、社区口碑好。OlympiA 若拿不出题库/训练/错题本/提交闭环这层，就会被当成"更重的另一个小熊猫"。
- **零安装路线抢入门用户**：CPIDE（免费、免注册、手机可用）在网吧机/借机场景是降维打击；OlympiA 的安装包再轻也是"要装"。
- **肌肉记忆**：VS Code + CPD + Competitive Companion 这套拼装已被大量学生内化，迁移成本由"配置成本"决定——OlympiA 只要"配置更省"就能赢。
- **AI 线被垂直玩家占位**：`dots.ai` 若停在"通用对话 + 代码解释"，会和 oi.devtool.uk 的"题意拆解 + 复杂度评估 + 竞赛失误模式审查"正面撞车且处于劣势。
- **官方赛场不用 IDE**（见 §2.G）：NOI 官方明确不推荐任何图形化 IDE，比赛环境是 NOI Linux（只预装 gedit/kate/vim/emacs + g++/python3/make/gdb/valgrind），现场禁 U 盘、无网络、无调试器无补全。**这意味着所有这类产品的战场都在"日常训练与模拟赛"，不在赛场**——同时也提醒：高级档选手在赛场需要的是 vim/gdb 熟练度，OlympiA 不必也不该去抢这个位置。

### 3.5 建议动作（按投入产出排序）

| 优先级 | 动作 | 依据 |
|---|---|---|
| P0 | **题面/样例一键落进编辑器与测试用例**（洛谷版），取代 Competitive Companion + CPD | 社区标准链路 + 三个竞品都有；cp-ally 给了可直接抄的实现要点 |
| P0 | 内置编译器路径保持零配置（别退回配置流程） | 洛谷环境配置指南 + CP Editor 短板；**但只当入场券，别当卖点** |
| P0 | 把"题库面板 → 训练 → 错题本"这条主线做深，做成小熊猫没有的那一层 | 小熊猫止步于本地题集；oi.devtool.uk 只做讲解不做闭环 |
| P1 | OJ 提交 + 判分回流（洛谷优先） | CP Editor 绑定 CF；小熊猫无提交；洛谷生态在位是天然优势 |
| P1 | 新手向调试外壳（单文件断点 + 变量面板 + 样例一键跑） | Dev-C++ 被怀念的能力 + Thonny 的可视化单步 |
| P2 | AI 教练做成竞赛垂直链路（题意拆解 → 复杂度评估 → 失误模式审查），而非通用聊天 | oi.devtool.uk |
| P2 | 评估轻量/在线/试用版形态（哪怕只是 Web 试用），对冲"零安装"路线 | CPIDE / Judge0 IDE / Python Tutor |


---

## 4. 数据来源与可信度

抓取时间：2026-10-22 22:25 ~ 23:0x（CST），全部经 Ego Lite 浏览器实际访问。

**A 级（页面正文已读到，事实可直接引用）**
- https://cpeditor.org/ 、https://cpeditor.org/zh/ （CP Editor 7.0 官方中英文站）
- http://royqh.net/redpandacpp/ （小熊猫 C++ 官方站）
- https://atrak.dev/projects/compide.html （CompIDE）
- https://github.com/0xPolybit/cp-ally-ide （cp-ally，题面抓取实现）
- https://cpide.me/ （CPIDE 官方）
- https://oi.devtool.uk/ （AI 竞赛助手）
- https://thonny.org/ （Thonny 5）
- https://geany.org/ 、https://www.codeblocks.org/ 、https://helix-editor.com/ 、https://neovim.io/ 、https://www.sublimetext.com/ 、https://www.jetbrains.com/pycharm/ 、https://code.visualstudio.com/
- https://docs.python.org/3/library/idle.html （IDLE）
- https://vjudge.net/ （Virtual Judge，60+ OJ 清单）
- https://oi-wiki.org/tools/editor/cpeditor/ 、https://oi-wiki.org/tools/oj-tool/ （OI Wiki 工具页）
- https://www.luogu.com.cn/article/3lxrdehh （洛谷《OI 环境配置指南》）
- https://www.luogu.com.cn/article/4m92mf6y （洛谷《算法竞赛效率大法之——拥有一个顺手的 IDE · Windows 篇》，正文懒加载，只取到摘要与作者/日期）
- https://www.onlinegdb.com/ 、https://onecompiler.com/ 、https://pythontutor.com/ 、https://judge0.com/ 、https://wandbox.org/ 、https://replit.com/ 、https://www.programiz.com/python-programming/online-compiler/ 、https://cursor.com/
- https://blog.csdn.net/shaosheng2008/article/details/143035478 （备赛软件六分类：Dev-C++ / Code::Blocks / VS Code / CLion / 在线 OJ / NOI Linux）
- https://ask.csdn.net/questions/9381125/56358862 （NOI 官方不推荐图形化 IDE、NOI Linux 环境构成）

**B 级（只拿到标题/摘要，正文未展开）**
- https://www.luogu.com.cn/article/jc36zbhx （《最适合OI竞赛的10款C++开发环境对比》——洛谷「安全访问中心」拦截；已按快照 ref 点击「继续访问」按钮，放行目标指向 `www.luogu.com/article/...`，该域名对本机出口 IP 返回"not available in your region"，正文仍不可达）
- https://www.luogu.com/article/zsbzw8m8 、https://www.luogu.com/article/3giei4la （同因区域限制）
- https://www.spyder-ide.org/ （抓到空正文）
- https://codeforces.com/topic/155581/en1 （ZetaCP 帖：抓到的是 Codeforces 外壳，正文在帖子区未展开）
- https://godbolt.org/ 、https://cursor.com/ （正文偏 JS 渲染，只取到首屏）

**C 级（网络受阻，未取到正文）**
- https://github.com/unneon/icie （ERR_CONNECTION_RESET，**最需要核实的竞品**）
- https://github.com/cp-editor/cp-editor （GitHub 返回 404 页；CP Editor 事实改由官网与 OI Wiki 佐证）
- https://sourceforge.net/projects/orwel-devcpp/ 、https://devcpp.sourceforge.net/ （Cloudflare 校验）
- https://red-panda-dev-cpp.vercel.app/ 、https://linux.do/t/topic/102274 （连接超时）
- https://ide.luogu.com.cn/ （域名无响应）
- https://hydro.ac/ （Cerberus 人机校验）
- https://marketplace.visualstudio.com/items?itemName=... （404，改用 open-vsx 镜像也被 cookie 墙挡住）
- https://oi-wiki.org/tools/editor/dev-cpp/ 、.../code-blocks/ （路径不存在，404）

**搜索快照（发现用，非权威）**：Bing 9 组查询（中英文各 3 组），命中含 CP Editor、CPIDE、icie、ZetaCP、oi.devtool.uk、cp-ally、CompIDE、小熊猫 C++（royqh.net/redpandacpp/ 与 anbangli/XiaoLoong-DevCpp 两个仓库）、洛谷横评系列、OI Wiki 工具章节、Competitive Companion、cf-tool、CLion 教育版、NOI Linux。

---

## 5. 待补（下一轮可做）

1. `icie` 仓库正文（走镜像或换网络）——**它和 OlympiA 同构（VS Code fork 做竞赛 IDE），是最需要核实的竞品**。
2. 洛谷《最适合OI竞赛的10款C++开发环境对比》正文——含 10 款横评与信奥圈真实选择权重；当前被"安全访问中心 + 区域限制"双重挡住。
3. 《信奥竞赛 IDE 深度对比：从 Dev-C++ 到 Helix》原文（本次只命中 wenku 付费镜像，需找 CSDN/知乎原发）。
4. 小熊猫 C++ 的实际体积、捆绑 gcc 版本、试题集/OJ 下载的站点覆盖范围（官网只给到功能描述）。
5. `anbangli/XiaoLoong-DevCpp` 与小熊猫 C++ 的关系（另一个国产 Dev-C++ 复刻？），值得单独核。
6. Competitive Companion / CPD 的安装量级（VS Code Marketplace 数据本次未取到，marketplace 返回 404）。
7. CP Editor 中文站的用户量/活跃度（无公开数字，但 linux.do 讨论帖存在，本次超时未读）。
