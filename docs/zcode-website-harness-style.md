# 任务：Olympia 官网动态化（参考 DeepSeek Harness 风格）

范围：**仅** `D:\oler-ide-v2\website/`（静态站，无打包依赖）。不改 `frontend/**`、不 git commit。

## 参考（风格锚点，非抄袭）
DeepSeek Harness / deepseek.com：
- 大标题 + 短副标 + 双 CTA
- **模式/能力切换卡片**（点击切换说明与配图区域）
- 分区「设计思路」式叙事 + 产品截图
- 代码/命令 **一键复制**
- 滚动显现（已有 `.reveal` 保留并加强）

## 必须先做的修复
1. 删除 `index.html` 中重复的第二行 `dl-meta`（约 L143）
2. 下载按钮保持你给的新链接（确认已是）：
   `https://gitee.com/yuanddMSK/olympia-ide/releases/download/v0.1.0/Olympia%20IDE_0.1.0_x64-setup.exe`
3. 特性文案与真实能力对齐：
   - 去掉或改写未实现的 **MLE** 表述（可写「时间/内存展示」）
   - 「训练打卡 / 错题本」若未上线 → 标「计划中」或移入路线图

## 新增动态交互（纯前端，vanilla JS + CSS，无框架）

### D1 · 导航增强
- 滚动时 nav 阴影/背景加深
- 当前 section 高亮（IntersectionObserver）

### D2 · 首屏仿真编辑器「演示模式」
- 按钮「看演示」：自动输入几行 C++（`type` 动画），然后 runner 区依次弹出 AC 行（stagger）
- 再点停止/重置；尊重 `prefers-reduced-motion`

### D3 · 能力切换（Harness 式 tab）
- 四张卡：`评测` / `对拍` / `比赛模式` / `AI 教练`
- 点击切换下方「说明 + 迷你演示」（可用 CSS/SVG/已有 window 结构变体，不必真截图）
- 键盘可达（button + aria-selected）

### D4 · 下载区
- 大按钮 + 文件大小徽章（49 MB）
- 点击后短暂显示「已开始下载 · 校验 Gitee」
- 可选：`downloads/` 若有本地包，加「国内镜像」第二按钮

### D5 · 数字滚动（stats）
- 三格：`49 MB 安装包` · `3 OJ 一键导入` · `0 配置 内置工具链`
- 进入视口时 count-up（reduced-motion 时直接显示终值）

### D6 · 动效规范
- 沿用现有：cubic-bezier(.2,.8,.2,1)、0.3–0.5s、`.reveal` 45–80ms 错开
- 禁止引入框架；单文件 JS 可放 `main.js` 或页尾 script

## 交付
- `index.html` / `style.css` / 可选 `main.js`
- 本地打开无控制台报错；`prefers-reduced-motion` 下无自动打字

## 验收
- 浏览器打开 `website/index.html` 手测：导航、演示打字、能力 tab、下载按钮、数字滚动
- 输出：改动文件列表 + 交互清单勾选
