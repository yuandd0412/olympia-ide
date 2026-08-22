# Oler IDE — UI 风格指南 v1.0

> 状态：**设计基准文档**。实现与本文件冲突时，以本文件为准。
> 上游：`00-design-spec.md`（v0 原型整理）、`D:\oler\oler-ide-redesign\pages\*.html`（视觉原型）、
> `docs/02-design-system/tokens.md`。
> 本版新增：对 Google Material 3、Apple HIG、VSCode、洛谷 四套成熟体系的吸收与裁剪。

---

## 0. 设计哲学一句话

**「竞赛选手的驾驶舱」——信息密度像 VSCode，克制优雅像 Apple，反馈明确像 Google，
词汇亲切像洛谷。**

四个来源各自只取一样东西：

| 来源 | 只学这一件事 | 明确不学的 |
|------|------------|-----------|
| **Google Material 3** | 状态层（state layer）与高程语义：任何可交互元素 hover +8% 白/黑遮罩、pressed +12%，层级用表面色深浅表达而非阴影 | 波浪动画、FAB、大圆角卡片、Material You 动态取色 |
| **Apple HIG** | 排版纪律：字号阶梯严格、字重只用 Regular/Medium/Semibold 三档；留白是焦点的一部分；暗色是「语义色」不是「反色」 | 毛玻璃材质（Qt 实现代价高）、spring 弹性动画 |
| **VSCode** | 工作台骨架：ActivityBar / TabBar / 编辑器组 / 底部 Panel / 状态栏五区结构；键盘优先；命令面板心智模型 | 图标市场式插件 UI、面包屑堆叠过深 |
| **洛谷** | OI 原生词汇与情绪：题号 mono 高亮、难度色点、AC 绿 WA 红、打卡连续天数；列表行 hover 才露出操作 | 模板化蓝白配色、广告位式运营区块 |

---

## 1. 设计令牌（Tokens）

### 1.1 色彩

**唯一来源**：`src/ui/common/OlerTheme.{h,cpp}`。代码中出现裸 hex 即为 bug。

```css
/* 中性面 —— 由深到浅的「海拔」序列 */
--oler-bg-base:      #131311;   /* 最底层：窗口背景 */
--oler-bg-surface:   #1a1915;   /* 卡片、面板 */
--oler-bg-elevated:  #252524;   /* 悬浮卡、输入框底 */
--oler-bg-overlay:   #2c2c2b;   /* 下拉菜单、hover 后的行 */
--oler-bg-floating:  #353533;   /* tooltip、拖拽影子 */

/* 文字 —— 四级灰阶 */
--oler-text-primary:   #f1f1ef; /* 正文强调 */
--oler-text-secondary: #a0a0a3; /* 默认正文 */
--oler-text-tertiary:  #6e6d68; /* 辅助说明 */
--oler-text-muted:     #46443b; /* 占位符、禁用 */

/* 描边 —— border-first，禁用阴影表达静态层级 */
--oler-border:        rgba(255,255,255,0.06);
--oler-border-hover:  rgba(255,255,255,0.12);
--oler-border-active: rgba(217,119,87,0.4);

/* 品牌 */
--oler-primary:       #d97757;
--oler-primary-hover: #e08a6c;

/* 判定色（OI 词汇，四主题恒定不变）*/
--oler-ac:#34c759; --oler-wa:#ff453a; --oler-tle:#ff9f0a;
--oler-re:#c45c4a; --oler-ce:#c49a3c;
```

### 1.2 状态层（新增，源自 Material）

所有可点击元素不再单独写 hover 色，统一叠加状态层：

```
hover:   叠加 rgba(255,255,255,0.05)   （浅色主题换 rgba(0,0,0,0.04)）
pressed: 叠加 rgba(255,255,255,0.09)
selected: --oler-bg-overlay 或 primary-muted（导航类）
disabled: 内容 opacity 0.4，不叠层
```

### 1.3 高程（Elevation，新增）

用**背景色深浅**表达，阴影只给真正漂浮物：

| 层级 | 表面 | 用途 |
|-----|------|------|
| E0 | bg-base | 窗口、内容区 |
| E1 | bg-surface | 卡片、侧栏、面板 |
| E2 | bg-elevated | 输入框、悬浮卡 |
| E3 | bg-overlay | 菜单、下拉 |
| E4 | bg-floating + shadow-floating | tooltip、模态 |

### 1.4 字体排印

```
UI 字体栈: 'Segoe UI', system-ui, sans-serif        (Windows 实际渲染 Segoe UI)
代码字体栈: 'Cascadia Mono', 'Consolas', monospace   (数字一律 mono + tabular)

Display  28px/700   打卡天数等英雄数字（每页最多一个）
Title    16px/600   分区标题
Body     13px/400   默认正文
Caption  11px/400   辅助说明、时间戳
Mono-SM  12px       题号、时间、内存、代码
```

字重只用三档：**400 / 500 / 600**。禁止 300 和 700+。

### 1.5 圆角 / 间距 / 动效

```
radius: xs 2px(徽章) · sm 6px(按钮输入框) · md 8px(卡片) · lg 12px(模态上限)
间距: 4pt 网格 —— 行内 8 · 行间 12 · 区块内 16 · 区块间 24 · 页边距 20/24
动效: fast 100ms ease(hover) · normal 150ms ease(展开) · slow 250ms ease(panel)
      缓动统一 cubic-bezier(0.2, 0, 0, 1)；无弹跳、无回弹。
```

---

## 2. 壳层布局（Shell）

```
+------------------------------------------------------------------+
| Titlebar 32px  [logo][Oler IDE]              [clock] [_ ][□ ][× ]|
+----+-------------------------------------------------------------+
| A  | TabBar 36px   Editor · Problems · Training · Mistakes · AI · Settings
| c  +-------------------------------------------------------------+
| t  |                                                             |
| i  |   Content（各页面自管滚动）                                    |
| v  |   padding: 20px 24px                                         |
| 56 |                                                             |
| px |                                                             |
+----+-------------------------------------------------------------+
| Statusbar 24px [Ready · Ctrl+R]          [Ln 21, Col 23] [UTF-8] |
+------------------------------------------------------------------+
```

- **ActivityBar 56px**：40×40 图标钮（20px SVG，描边 1.8）。idle = tertiary；
  hover = overlay 底 + secondary 图标；active = primary-muted 底 + primary 图标 +
  左缘 3×20px 圆角指示条。
- **TabBar 36px**：surface 底；tab 12px/500 padding 0 16px；active 文字 primary +
  底部 2px primary 条（左右缩进 16px）；未保存 tab 加 6px 主色圆点。
- **Statusbar 24px**：左消息、右光标位置 + 编码，mono 11px tertiary。

---

## 3. 组件规范

### 3.1 按钮（三款，禁止第四种）

| 款式 | 底色 | 字色 | 边框 | 用途（唯一）|
|------|------|------|------|------------|
| Primary | primary | #fff | 无 | 每屏至多一个的主行动（运行/发送/检测）|
| Secondary | elevated | secondary | border | 其余一切普通按钮 |
| Ghost | 透明 | secondary | 无 | 行内小操作、chips |

高度 32px（紧凑 26px），radius-sm，padding 0 14px，字 12px/500。
hover 一律加状态层；Primary hover = primary-hover。

### 3.2 输入框

高 36px（搜索）/32px（表单），elevated 底，border，radius-md，聚焦时 border-active。
搜索框左侧 14px 放大镜图标，右侧可放 kbd 快捷键 chips（Ctrl K 样式）。
数值输入右侧后缀单位（ms / MB），值用 mono。

### 3.3 卡片

surface 底 + border + radius-md + padding 14px；hover 升为 elevated + border-hover。
卡片内部三行制（题库卡）：题号行 → 标题行（13px/500，两行截断 min-height 35px）→ 元信息行。

### 3.4 徽章 / Chips

| 类型 | 样式 |
|------|------|
| 判定徽章 AC/WA/TLE/RE/CE | 判定色 @15% 底 + 判定色字，mono 10px/600，pill，高 18px |
| OJ 来源 pill | 各 OJ 专属色（Luogu #73ba4b / CF #7daed4 / AtCoder #b57850），@15% 底 |
| 难度点 | 8×8 实心圆 + 同色 30% 光晕；入门绿/普及橙黄/提高红（沿用原型 easy/medium/hard 映射）|
| kbd 键帽 | overlay 底 + border，radius-xs，10px mono，高 20px |

### 3.5 空状态

一行主文案（secondary 13px）+ 一行提示（tertiary 11px），居中，无插画。
示例：「Pick a problem to start」/「还没有错题记录 —— Ctrl+R 跑一次测试试试」。

---

## 4. 页面级规格摘要

| 页面 | 骨架 | 数据真实度要求 |
|------|------|---------------|
| Problems | 搜索栏(36px, Ctrl+K chip) → 快捷按钮排(拉取/新建/导入) → 最近题目横滑条 → 全部题目 4 列网格 → 底部统计条 | 卡片双击建工作区进编辑器（已实现）|
| Training | 4 张 KPI 卡(streak/今日/总量/正确率环) → 今日目标卡(进度条 6px 渐变) → 训练计划列表 → 最近提交列表 | streak/提交来自本地日志；计划允许空状态 |
| Mistakes | 左判定筛选 chips(WA/TLE/RE/CE 计数) + 列表行卡(左缘 3px 判定色条) + 右 7×4 热力图 | 已实现，行卡需从表格改为卡片列表 |
| AI Coach | 顶栏 dots.ai + 模型选择 → 聊天流(用户右/elevated，AI 左/surface+border，头像 28×28) → prompt chips → composer(自适应高 ≤120px + 36×36 主色圆发送钮) | mock 应答保留到 Phase 7 |
| Settings | 单栏 max-width 640px：页头(设置+副标题) → 分区(编译器/运行/OJ/快捷键/关于)，分区间 1px 分隔线；表单行 = 140px 右对齐标签 + 控件 + hint | 优化等级改 radio 药丸组 |
| Editor | 文件标签条(closable, 未存=斜体+圆点) → 行号槽(56px, muted) → 当前行高亮(primary-subtle) → 底部输出面板(Build/Run 子tab) | 已有大半 |

---

## 5. 交互规则

1. **键盘优先**：Ctrl+K 搜索聚焦、Ctrl+R 运行、Ctrl+B 编译、Ctrl+, 设置、Ctrl+1~6 切页。
2. **反馈即时**：所有按钮按下即有 pressed 态；长任务（编译）在状态栏转菊花文案，完成后判定徽章淡入（150ms）。
3. **破坏性操作**（删题单、清空错题）：按钮变 error 色 + 需二次确认 toast。
4. **Toast**：右下角浮出，floating 底 + shadow-floating，3s 自动消失，同时最多 1 条。
5. **列表行操作**：默认只显示内容，hover 尾部浮现图标钮（重做/打开/删除）。

---

## 6. 主题系统

4 主题 = 2 色相（暖琥珀 / 冷蓝）× 2 明暗：

| 主题 | base | surface | accent |
|------|------|---------|--------|
| AmberDark（默认）| #131311 | #1a1915 | #d97757 |
| OneDarkPro | #282c34 | #21252b | #61afef |
| AmberLight | #fafaf7 | #f0eee8 | #d97757 |
| OneLight | #fafafa | #f0f0f0 | #4078f2 |

规则：
- 浅色主题的中性面按同语义反转，但**判定色与品牌 accent 不反转**（铁律 6）。
- 状态层浅色主题用黑 alpha（hover 0.04）。
- 任何新控件必须 4 主题全过才能合并（铁律 8）。

---

## 7. Do / Don't

✅ Do
- 数字（时间/内存/通过率）一律 mono + tabular-nums
- hover 才出现的操作放行尾，占位 ≤ 48px
- 每屏只有一个 Primary 按钮
- 空状态给下一步动作指引

❌ Don't
- 不用纯黑 #000 / 纯白 #fff 做大面积背景
- 不用阴影区分静态层级（只有 E4 浮层可用 shadow）
- 不出现第三种按钮样式、第四种字号
- 不在标题栏塞菜单按钮（保持 32px 极简）

---

## 8. 示意图

见 `docs/mockups/shell-preview.html` —— 浏览器直接打开，
含全部 6 页的可切换交互预览，即本文件的像素级呈现。
Qt 实现以该 HTML 为像素基准逐页对齐。
