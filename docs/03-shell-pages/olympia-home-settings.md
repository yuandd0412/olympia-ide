# Olympia 首页与设置页 —— 完全替换架构

> 这份文档记录 **Olympia IDE 自己** 的首页（开始页）与设置页是怎么「整块换成我们的」的、
> 哪些视觉红线被门禁钉死、以及与同类 VS Code fork 的取舍。
> 目标读者：改这两块界面的人。

## 1. 一句话

**上游的欢迎页和设置页都还在，但用户点不到** —— 我们的界面在**前面**接管，
上游那套只作为**逃生口**保留（任何带参数的调用都仍然走原生路径）。

## 2. 首页：三处落点共用一份视图

`oss/src/vs/workbench/contrib/olympia/browser/`

| 文件 | 角色 |
|---|---|
| `olympiaHomeView.ts` | 共享视图 `createOlympiaHomeView()` —— 唯一的 UI 来源 |
| `olympiaWelcomePage.ts` | 开始页 EditorPane（scheme `olympia-welcome`） |
| `olympiaHomeEmptyState.ts` | 空编辑区渲染器（内核扩展点 `olympia.home.emptyState`） |
| `olympiaHomeInterceptor.ts` | 劫持判据 `olympiaShouldInterceptWelcome`（**零 import**） |
| `media/olympiaHome.css` | 首页样式 |

三处落点：

1. **开始页** —— 独立 scheme（不与上游 walkthrough 抢注册）
2. **空编辑区** —— 内核问「有没有自定义渲染器」，我们注册 `olympia.home.emptyState`
3. **「帮助 > 欢迎」** —— `olympiaHomeInterceptor.ts` 拦 `workbench.action.openWalkthrough`
   **完全无参**的调用；带 `walkthroughID` / `toSide` / `inactive` / 布尔参数的一律放行

三者渲染的是**同一份** `createOlympiaHomeView()`，所以三处不会各长成三套 UI。

首页有 8 个入口（拉题面 / 插模板 / 集训清单 / AI 教练 / 新建文件 / 打开文件夹 /
命令面板 / 设置），每个入口都指向**真实存在**的命令（扩展命令查内置扩展
`package.json`，内核命令回上游源码找注册点）。页脚「完整设置」指向
`workbench.action.openSettings2` —— 原生完整设置页永远可达。

## 3. 设置页：接管 + 逃生口

| 文件 | 角色 |
|---|---|
| `olympiaSettingsPage.ts` | 设置页视图 |
| `olympiaSettingsSchema.ts` | 9 组约 30 项设置的声明 |
| `olympiaSettingsInterceptor.ts` | 劫持判据 `olympiaShouldInterceptSettings`（**零 import**） |
| `olympiaSettingsInput.ts` | 输入型控件（字符串 / 数组 / 数字） |
| `media/olympiaSettings.css` | 设置页样式 |

- 拦截 `workbench.action.openSettings` 的**无参 / 空对象**调用 → 打开我们的简化设置页
- **带 `query` / `focusSearch` / `openToSide` / `revealSetting` 的一律放行** —— 用户
  明确表达了意图时不该被劫持
- 逃生口：`workbench.action.openSettings2` 未被劫持，设置页内也有「高级设置」按钮

## 4. 视觉红线怎么被钉死

两条红线：

- **系统的自带下拉框不要出来**（原生 `<select>` 弹的是操作系统菜单）
- **白底白字是大错误**（前景与背景同色 = 看不见）

做法不是「小心写代码」，而是**写进门禁**：

| 红线 | 实现 | 门禁断言 |
|---|---|---|
| 不弹系统下拉 | 用上游 `SelectBox` 且强制 `useCustomDrawn: true` | G10 / G11 |
| 下拉颜色走主题 | `defaultSelectBoxStyles`，页面不自己刷颜色 | G12 |
| 不留原生 select 样式 | CSS 里不再有针对原生 `select` 的选择器 | G14 |
| 输入框不要白底浅字 | 禁止 `input[type=...]` 属性选择器（上游 `$()` 不支持属性选择器 → 规则匹配不上 → 白底浅字） | G21 |
| 输入框样式挂自有 class | `.olympiaSettings-input`，颜色取主题变量 | G22 |
| 首页不许硬编码颜色 | 只用 `--vscode-*` 主题变量 | G3（首页门） |

> 上游 `$()` 不支持属性选择器这条特别隐蔽：写 `input[type=text]` 不会报错，
> 只是**规则悄悄匹配不上**，控件退回浏览器默认样式 —— 浅灰底 + 浅色字。

## 5. 门禁清单

这六条必须成对存在，且**全部登记在 `check-all.mjs` 的 GATES 登记表里**
（登记了才算在跑；文件在仓库里不算）。

| 门禁 | 断言数 | 保证什么 |
|---|---|---|
| `check-olympia-start-page.mjs` | — | 开始页接线：独立 scheme / 配置节点 id / CSS 红线 |
| `mutation-test-olympia-start-page.mjs` | — | 上面那条的断言真能抓住回归 |
| `check-olympia-home.mjs` | 50 | 三处落点共用一份视图 / 入口指向真实命令 / 劫持只拦无参 / 首页 CSS 红线 |
| `mutation-test-olympia-home.mjs` | — | 上面那条的断言真能抓住回归 |
| `check-olympia-settings-page.mjs` | 69 | 接管与逃生口 / 不自建原生 select / 输入框 class 与主题色 / 窄容器响应式与底栏贴底 |
| `mutation-test-olympia-settings-page.mjs` | — | 上面那条的断言真能抓住回归 |

判据的写法有一条硬规矩：

- **真跑判据，而不是匹配写法。** 拦截判据 `olympiaShouldInterceptWelcome` /
  `olympiaShouldInterceptSettings` 住在 TypeScript 源里，门禁把函数抠出来、
  剥掉类型标注、用 `new Function` **真的调用**，喂完整真值表。改判据 → 真值表立刻红。
  匹配「源码里有没有 `walkthroughID === undefined`」这种写法，换个等价写法就假绿。
- **锚在使用处，不在声明处。** 例：命令 id 常量定义在 `olympiaHomeView.ts`，
  拦截点却要取上游那一处 —— 两者必须分别取、且都锚在拦截分支内部。
- **扫描范围不许把被测对象自己算进去。** 首页门扫 `oss/src/vs/workbench` 全部 `.ts`，
  必须排除 `contrib/olympia/` —— 否则就是拿我们的声明跟我们自己比，恒绿。

## 6. 与同类 VS Code fork 的取舍

对标的是同类的 OI 场景 VS Code fork（同样是改上游源码本体、同样内置工具链）。
它们值得抄的做法：

| 做法 | 我们的状况 |
|---|---|
| 独立首启窗口（自绘 HTML，配色自己写） | 我们走「workbench 内的开始页」，形态不同但同样不依赖上游欢迎页 |
| 首页与设置页共用同一套控件层 | 我们的首页与设置页共用主题变量与控件约定；首页视图三处共用一份 |
| 扩展自带单测 | 我们的门禁在**外层仓库**（oss 仓的 pre-commit 会拒收新增 `.mjs`），断言 + 变异脚本成对 |
| 改 `product.json` 加自有字段（版本号、更新源） | 已有 `olympiaVersion` / `olympiaExcludedBuiltInExtensions` 等 |
| 内置离线工具链 | 已有随包 MinGW（`check-toolchain-notices.mjs` 卡住第三方声明） |
| 字体下拉只列**检测到的系统等宽字体** | **我们还没做**，见下 |

**我们比它更严的一处**：它用原生 `<select>`（`document.createElement('select')`）
做字体与主题下拉 —— 关闭态能靠 CSS 压暗，**展开态仍是系统绘制的菜单**；
我们强制 `useCustomDrawn: true`，下拉列表完全自绘，不弹系统菜单。

## 7. 已知差距（下一步候选）

1. **字体下拉改成真实系统字体列表。** 现在 `editor.fontFamily` 是自由文本，
   可以填出本机不存在的字体。同类实现的路径是：在**扩展宿主**里
   `child_process.execFile` 调系统命令枚举字体（Windows：`powershell.exe` +
   `System.Drawing.Text.InstalledFontCollection`；macOS：`osascript`/CoreText；
   Linux：`fc-list`），再经命令通道把结果交给设置页 —— **不需要改内核**。
   注意这与第 4 节的红线有张力：列出来的下拉仍必须是自绘的，不能退化成原生 `<select>`。
2. **设置项覆盖面。** 同类实现分了 8 类并含 clangd 变量类型提示、文件命名模板、
   格式化细节等；我们目前 9 组约 30 项，可按 OI 实际使用频率取舍增补。
3. **工具链诊断页。** 把「编译器能不能跑、clangd 在哪、系统头文件在哪」做成一个页面。

## 8. 维护规则

- 改首页 / 设置页 → 跑对应两条门（断言 + 变异）→ 跑 `check-all.mjs`
- 加新门禁 → **同时登记进 `check-all.mjs`**，且断言门与变异脚本成对登记
- 新增断言 → 先搜「同一个选择器 + 同一个属性，在别处钉过没有」，避免写重复断言
- 任何门禁改动 → 跑一次 `node .collab/selftest.mjs`（以它的输出为准）
