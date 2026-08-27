# Oler IDE v2 - UI Design Spec

> **Status**: v0 design file (Oler-IDE-Redesign.design + colors_and_type.css) captured
> into v2 docs and QSS. v2 implementation has 4 themes wired and 5 shell-page
> placeholders. Phase 5+ implements the per-page content. This document is the
> single source of truth for the visual design - any new color, type, or
> radius must reference this file (no ad-hoc hex in page code).
>
> **Source files** (read-only):
> - `D:\oler\oler-ide-redesign\colors_and_type.css` (canonical tokens)
> - `D:\oler\oler-ide-redesign\orchestration-summary.json` (page metadata)
> - `D:\oler\oler-ide-redesign\oler-ide-redesign.design` (page JSON)
> - `D:\oler-ide-v2\resources\themes\*.qss` (4 shipped themes)
> - `D:\oler-ide-v2\docs\02-design-system\tokens.md` (full tokens table)
> - `D:\oler-ide-v2\docs\03-shell-pages\*.md` (5 shell pages)
> - `D:\oler-ide-v2\docs\04-editor\subpages.md` (4 editor subpages)
> - `D:\oler-ide-v2\docs\05-test-results\panel.md` (verdict panel)
> - `D:\oler-ide-v2\docs\06-welcome\onboarding.md` (onboarding)

---

## 0. Brand Positioning

- **Product**: Oler IDE - desktop competitive-programming IDE for Chinese OI
  learners (CSP-J/S, CSP-S/NOIP, NOI).
- **Voice**: 极简信息密集, 暗色优先, 边框优先 surface. No hero, no marketing
  gradient, no oversized empty state. 受 Luogu (Chinese) and VSCode (intl)
  Explorer aesthetics, with the Apple/Google/Atom color discipline applied
  (style brief: `Professional competitive / dark-first / warm amber + cool
  blue-purple`).
- **Tagline**: "Built-in toolchain, OJ credentials, AI assistant. No setup."

---

## 1. Design Tokens (the single source of truth)

### 1.1 Color - Core Brand

| Token                    | Value                       | Role                            |
|--------------------------|-----------------------------|---------------------------------|
| `--oler-primary`         | `#d97757`                   | Brand accent (warm terracotta)  |
| `--oler-primary-hover`   | `#e08a6c`                   | Primary hover state             |
| `--oler-primary-muted`   | `rgba(217, 119, 87, 0.15)`  | Filled badge / chip background  |
| `--oler-primary-subtle`  | `rgba(217, 119, 87, 0.08)`  | Hover wash on dark surface      |

### 1.2 Color - Neutrals (backgrounds + text)

| Token                  | Value                 | Role                       |
|------------------------|-----------------------|----------------------------|
| `--oler-bg-base`       | `#131311`             | App background (darkest)   |
| `--oler-bg-surface`    | `#1a1915`             | Card / panel surface       |
| `--oler-bg-elevated`   | `#252524`             | Elevated card / row hover  |
| `--oler-bg-overlay`    | `#2c2c2b`             | Popover / menu surface     |
| `--oler-bg-floating`   | `#353533`             | Floating panel / dialog    |
| `--oler-bg-nav`        | `rgba(0, 0, 0, 0.35)` | Top nav backdrop          |
| `--oler-text-primary`  | `#f1f1ef`             | Body text (high contrast)  |
| `--oler-text-secondary`| `#a0a0a3`             | Body text (default)        |
| `--oler-text-tertiary` | `#6e6d68`             | Caption / hint             |
| `--oler-text-muted`    | `#46443b`             | Disabled / placeholder     |

### 1.3 Color - State (success/warning/error/info)

| Token               | Value                      | Role                              |
|---------------------|----------------------------|-----------------------------------|
| `--state-success`   | `#34c759`                  | Success accent (also AC verdict)  |
| `--state-success-bg`| `rgba(52, 199, 89, 0.15)`  | Success badge background          |
| `--state-warning`   | `#ff9f0a`                  | Warning accent (also TLE verdict) |
| `--state-warning-bg`| `rgba(255, 159, 10, 0.15)` | Warning badge background          |
| `--state-error`     | `#ff453a`                  | Error accent (also WA verdict)    |
| `--state-error-bg`  | `rgba(255, 69, 58, 0.15)`  | Error badge background            |
| `--state-info`      | `#7daed4`                  | Info accent (syn-function)        |
| `--state-info-bg`   | `rgba(125, 174, 212, 0.15)`| Info badge background             |

### 1.4 Color - Borders

| Token                   | Value                              | Role                       |
|-------------------------|------------------------------------|----------------------------|
| `--oler-border`         | `rgba(255, 255, 255, 0.06)`        | Default 1px divider        |
| `--oler-border-hover`   | `rgba(255, 255, 255, 0.12)`        | Hovered surface            |
| `--oler-border-active`  | `rgba(217, 119, 87, 0.4)`          | Focused / active element   |

### 1.5 Color - OI Judgement (test verdict)

| Token       | Value     | Verdict                                |
|-------------|-----------|----------------------------------------|
| `--oler-ac` | `#34c759` | Accepted (full pass)                   |
| `--oler-wa` | `#ff453a` | Wrong Answer                           |
| `--oler-tle`| `#ff9f0a` | Time Limit Exceeded                    |
| `--oler-re` | `#c45c4a` | Runtime Error (subtler red than WA)    |
| `--oler-ce` | `#c49a3c` | Compile Error (amber, not red)         |

1:1 with test-results panel verdict badges and Mistakes-tab tags. These stay
identical across light/dark themes (red is red, green is green - readability
beats brand symmetry in OI).

### 1.6 Radius

| Token           | Value     | Use                       |
|-----------------|-----------|---------------------------|
| `--radius-xs`   | `2px`     | Tags, inline pills        |
| `--radius-sm`   | `6px`     | Buttons, inputs           |
| `--radius-md`   | `8px`     | Cards, list rows          |
| `--radius-lg`   | `12px`    | Modals, large surfaces (max)  |
| `--radius-full` | `9999px`  | Avatars, round toggles    |

Radius ceiling **12px** (`radiusMax: 12` in v0 design). Anything rounder
breaks the "professional competitive" feel.

### 1.7 Shadow

| Token               | Value                                                          | Use                       |
|---------------------|----------------------------------------------------------------|---------------------------|
| `--shadow-floating` | `0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2)` | Popovers, dialogs         |
| `--shadow-static`   | `0 1px 2px rgba(0, 0, 0, 0.05)`                                | Reserved (alpha <= 0.05)  |

Static shadow alpha is capped at 0.05 (`staticShadowAlphaMax: 0.05`).
Idle surfaces are bordered, not shadowed. Floating elements earn a real shadow.

### 1.8 Typography

| Token                  | Value                                                                              | Role                  |
|------------------------|------------------------------------------------------------------------------------|-----------------------|
| `--font-display`       | `SF Pro Display, -apple-system, system-ui, Segoe UI, sans-serif`                   | UI typography         |
| `--font-mono`          | `JetBrains Mono, SF Mono, Fira Code, Consolas, monospace`                          | Code, stats, tables   |
| `--font-size-xs`       | `11px`                                                                             | Caption               |
| `--font-size-sm`       | `12px`                                                                             | Mono / dense          |
| `--font-size-base`     | `13px`                                                                             | Body (compact)        |
| `--font-size-md`       | `14px`                                                                             | Heading               |
| `--font-size-lg`       | `16px`                                                                             | Title                 |
| `--font-size-xl`       | `20px`                                                                             | Section header        |
| `--font-size-2xl`      | `28px`                                                                             | Display               |
| `--font-size-3xl`      | `36px`                                                                             | Hero                  |
| `--line-height-tight`  | `1.25`                                                                             | Titles, display       |
| `--line-height-normal` | `1.5`                                                                              | Body, lists           |
| `--line-height-relaxed`| `1.65`                                                                             | Long-form prose       |

`.oler-mono` sets `font-variant-numeric: tabular-nums` so timing/memory stats
in the test-results panel line up vertically.

### 1.9 Spacing (4-pt grid)

| Token        | Value   | Use                              |
|--------------|---------|----------------------------------|
| `--space-1`  | `4px`   | Hairline gap                     |
| `--space-2`  | `8px`   | Inline element gap               |
| `--space-3`  | `12px`  | Row gap                          |
| `--space-4`  | `16px`  | Section padding                  |
| `--space-5`  | `20px`  | Card inner padding               |
| `--space-6`  | `24px`  | Card outer padding               |
| `--space-8`  | `32px`  | Section gap                      |
| `--space-10` | `40px`  | Page-level margin                |
| `--space-12` | `48px`  | Hero spacing                     |

### 1.10 Motion

| Token                  | Value         | Use                          |
|------------------------|---------------|------------------------------|
| `--transition-fast`    | `0.1s ease`   | Hover, focus                 |
| `--transition-normal`  | `0.2s ease`   | State change                 |
| `--transition-slow`    | `0.3s ease`   | Panel open/close             |

`motionIntensity: 1` in v0 design - no bounce, no parallax, no spring physics.
Transitions make state changes legible, not entertain.

### 1.11 Z-Index Layers

| Token         | Value | Use                            |
|---------------|-------|--------------------------------|
| `--z-content` | `1`   | Page content (default)         |
| `--z-nav`     | `10`  | ActivityBar (56px rail)        |
| `--z-tabbar`  | `20`  | TabBar (36px)                  |
| `--z-overlay` | `100` | Dropdowns, popovers            |
| `--z-modal`   | `200` | Modal dialogs                  |
| `--z-toast`   | `300` | Toasts (always on top)         |

### 1.12 Syntax Highlight (synced with KSyntax Theme Mapping)

KSyntax ships with Title Case theme names. Oler's `OlerEditor` maps:

| Oler Theme    | KSyntax Theme  | When used                  |
|---------------|----------------|----------------------------|
| `AmberDark`   | `Breeze Dark`  | Default dark, warm accent  |
| `AmberLight`  | `Breeze Light` | Default light, warm accent |
| `OneDarkPro`  | `Atom One Dark`| Cool dark, blue accent     |
| `OneLight`    | `Atom One Light`| Cool light, blue accent    |

In-app syntax token colors (fall back when no theme binding):

| Class              | Color      | Role                          |
|--------------------|------------|-------------------------------|
| `syn-keyword`      | `#cc7a5a`  | `if`, `for`, `class`, `using` |
| `syn-function`     | `#7daed4`  | Function names                |
| `syn-type`         | `#c4a65a`  | Type names                    |
| `syn-string`       | `#b89a6a`  | String literals               |
| `syn-comment`      | `#6e6d68`  | Comments (italic)             |
| `syn-number`       | `#8aab6e`  | Numeric literals              |
| `syn-operator`     | `#f1f1ef`  | Operators                     |
| `syn-preprocessor` | `#cc7a5a`  | `#include`, `#define`         |
| `syn-variable`     | `#c3c0b6`  | Identifiers                   |

---

## 2. The 4 Themes

All 4 themes live in `D:\oler-ide-v2\resources\themes\*.qss` and are loaded
by `CThemeManager::instance()->applyTheme("AmberDark")` etc. 4 themes =
2 hue families (cool/blue-purple, warm/amber) x 2 lightnesses (dark, light).

| Theme          | Family  | Mode  | BG base  | FG primary | Accent     |
|----------------|---------|-------|----------|------------|------------|
| OneDarkPro     | Cool    | Dark  | #282c34  | #abb2bf    | #61afef    |
| OneLight       | Cool    | Light | #fafafa  | #383a42    | #4078f2    |
| AmberDark      | Warm    | Dark  | #131311  | #f1f1ef    | #d97757    |
| AmberLight     | Warm    | Light | #fafaf7  | #2c2a26    | #d97757    |

Theme switching is real-time (`qApp->setStyleSheet(...)`) and
`CThemeManager::themeChanged(name)` signal fires for OlerEditor to sync the
KSyntax theme (via the Oler-to-KSyntax map in section 1.12).

Default theme: `AmberDark` (per v0 design's "dark-first" priority + warm brand
accent). `CThemeManager` exposes `cycleTheme()` which rotates
AmberDark -> AmberLight -> OneDarkPro -> OneLight -> AmberDark.

---

## 3. Shell Layout (used by all 5 pages)

### 3.1 Layout Skeleton (ascii)

```
+---+----------------------------------------------------------+
| A | TabBar(36px)                                            |
| c |  Editor | Problems | Training | Mistakes | AI | Settings
| t |----------------------------------------------------------+
| i |                                                          |
| v | Main content area (scrollable)                          |
| i | 56px wide ActivityBar | 12 icons max (one per shell page)|
| t |                       |                                 |
| y |-----------------------+---------------------------------|
| B | Status bar (24px) - timer / OJ status / theme switcher   |
| a |                                                          |
| r |                                                          |
+---+----------------------------------------------------------+
```

### 3.2 Continuity Anchors (every shell page must use)

| Anchor                | Value     | Source             |
|-----------------------|-----------|--------------------|
| `oler-nav-56px`       | 56px wide | ActivityBar rail   |
| `oler-tabbar-36px`    | 36px tall | TabBar (top)       |
| `shared-shell-layout` | struct    | sidebar + main split |

### 3.3 Page-to-icon mapping (ActivityBar order, left-to-right)

1. Editor (icon: pencil/code) - **default selected, NEW in Phase 4**
2. Problems (P)
3. Training (T)
4. Mistakes (M)
5. AI (A)
6. Settings (S)

---

## 4. Shell 5 Pages (visual north star per page)

### 4.1 Problems (题库) - default landing

- **North Star** (verbatim from orchestration-summary): *"Compact file-browser
  style with search bar, problem cards showing OJ/source/difficulty tags, recent
  problems grid, quick actions."*
- **Layout**: SearchBar (28px tall) at top, "Recent" pinned row (8 cards), then
  scrollable grid of all problem cards. Cards show: problem ID (`P1001`),
  title, OJ badge (Luogu/Codeforces/AtCoder), difficulty chip, "Add to training"
  quick action on hover.
- **Difficulty chips**: 入门(灰 `--oler-text-tertiary`) / 普及(蓝 `--state-info`) /
  提高(橙 `--state-warning`) / NOI(红 `--state-error`).
- **Empty state**: "Pick a problem to start" with brand mark + 2-line hint.
- **Doc**: `docs/03-shell-pages/problems.md`

### 4.2 Training (训练)

- **North Star**: *"Training dashboard with streak counter, daily goal progress
  bar, planned sessions list, completion stats chart."*
- **Layout**: Top row 3 KPI cards (Streak, Today's goal, Total solved). Below:
  a vertical list of "Planned sessions" (each row: title, scheduled time, est.
  duration, start button). Right column: completion stats chart (heatmap or
  bar chart of last 30 days).
- **Streak counter**: large number, flame icon, "天" suffix. Color: green if
  active streak, tertiary if 0.
- **Doc**: `docs/03-shell-pages/training.md`

### 4.3 Mistakes (错题本)

- **North Star**: *"Mistake journal with verdict-colored tags (WA/TLE/RE/CE),
  filterable list, frequency heatmap hint, review actions."*
- **Layout**: Top filter bar (verdict multi-select: AC/WA/TLE/RE/CE, OJ multi-
  select, date range). Main: scrollable list of mistake rows, each row shows
  problem title, verdict badge (using `--oler-{ac,wa,tle,re,ce}`), wrong
  attempt summary, "Open" and "Re-attempt" actions. Right rail: small
  frequency heatmap of "you make most mistakes on tag X".
- **Verdict badge style**: filled chip with the verdict color as BG and
  `--oler-text-primary` as text. Round `--radius-xs` (2px).
- **Doc**: `docs/03-shell-pages/mistakes.md`

### 4.4 AI Coach (AI 教练)

- **North Star**: *"Chat interface with message bubbles, code block rendering,
  suggested prompts chips, model selector, clean conversation flow."*
- **Layout**: Top: model selector dropdown (dots3-note-prev default, or
  user-provided API key). Middle: scrolling chat area, user messages right-
  aligned with `--oler-bg-elevated` BG, AI messages left-aligned with
  `--oler-bg-surface` BG. Bottom: input box (multi-line) with submit button
  + 3 suggested-prompt chips above ("Explain this WA", "Optimize complexity",
  "Find edge cases").
- **Code block in chat**: rendered with monospace font, `--oler-bg-base` BG,
  1px `--oler-border`, copy button on hover.
- **Doc**: `docs/03-shell-pages/ai.md`

### 4.5 Settings

- **North Star**: *"Settings panel with grouped sections, toggle switches,
  dropdown selectors, compiler config, OJ receiver status, keyboard shortcuts
  reference."*
- **Layout**: 2-column. Left rail: section list (Compiler / Editor / Theme /
  OJ credentials / Shortcuts). Right pane: the active section's controls.
  Each control: label above, control below, helper text below that in tertiary.
- **Theme picker**: 4 large swatches (2x2 grid), each shows the theme name
  + a tiny preview strip of its BG + accent. Click applies immediately via
  `CThemeManager::applyTheme()`.
- **Doc**: `docs/03-shell-pages/settings.md`

---

## 5. Editor Subpages

The editor is `OlerEditor` (QPlainTextEdit + KSyntaxHighlighting::SyntaxHighlighter)
and is the main central view in the Editor tab. The v0 design has 4 editor
subpages (main / file-explorer / output / test-cases) which in v2 are wired
as a 4-way QSplitter or as auxiliary panels inside the Editor tab.

### 5.1 Main editor

- **Layout**: full-bleed editor with mono font, line numbers in
  `--oler-text-tertiary` gutter, current-line highlight in
  `--oler-bg-elevated`, selection in `--oler-primary-muted`.
- **Gutter**: 40px wide, line numbers right-aligned, current line bold.
- **Cursor**: 2px wide, `--oler-primary` color, 500ms blink.
- **Doc**: `docs/04-editor/subpages.md` (Main section)

### 5.2 File Explorer (left panel inside Editor tab)

- **Layout**: tree view of the current project root, file icons (different
  per extension), expand/collapse arrows. Each file/folder: mono font, name
  in `--oler-text-primary`, dim folder names in `--oler-text-secondary`.
- **Status**: git-modified files get a small orange dot, git-untracked get
  blue, conflicted get red. (Phase 5+ when git integration lands.)
- **Doc**: `docs/04-editor/subpages.md` (File Explorer section)

### 5.3 Output panel (bottom panel inside Editor tab)

- **Layout**: text area at the bottom, 6-8 lines tall, mono font
  `--font-mono`, BG `--oler-bg-base`. Tabs: "Build", "Run", "Compiler" (each
  is a sub-tab inside the output panel).
- **Build output**: lines color-coded by type - errors `--state-error`, warnings
  `--state-warning`, info `--oler-text-secondary`, success `--state-success`.
- **Doc**: `docs/04-editor/subpages.md` (Output section)

### 5.4 Test cases (right panel inside Editor tab)

- **Layout**: list of test cases per problem. Each test case: row with index,
  name (e.g. "1.in / 1.out"), expected vs actual verdict badge, "Run" button.
- **Empty state**: "Add a test case to start" + 2-line hint.
- **Doc**: `docs/04-editor/subpages.md` (Test Cases section)

---

## 6. Test Results Panel

- **Layout**: bottom-docked panel (or modal dialog) showing the test-results
  for the most recent compile-and-run. Top: summary bar with pass rate
  (e.g. "4 / 5 passed in 1.23s") + verdict donut chart. Middle: per-test-case
  rows, each with verdict badge + diff preview (collapsible). Bottom:
  compilation output section.
- **Pass rate bar**: width-fills with `--state-success` (passed fraction) +
  `--state-error` (failed fraction). Mono font, tabular numbers.
- **Diff viewer**: side-by-side or unified, `--oler-text-primary` for added,
  `--state-success-bg` for unchanged context, `--state-error-bg` for removed.
  Use `--font-mono` for code.
- **Verdict badge**: filled chip (see 4.3 for shape), always 8px tall, fits
  in one line.
- **Doc**: `docs/05-test-results/panel.md`

---

## 7. Welcome / Onboarding

- **Layout**: centered single-column hero. Brand mark (80px logo), tagline,
  4-step quick start guide (numbered cards in a row), 3x2 demo problem
  cards grid, OJ credential status badge at the bottom.
- **Step cards** (Quick start):
  1. Pick a problem (Problems tab)
  2. Open in editor (click problem -> editor opens)
  3. Run sample tests (Cmd+R or Run button)
  4. Submit to OJ (when ready)
- **Demo cards**: 6 example problems (CSP-J, CSP-S, NOIP, NOI) shown as
  example - clicking jumps to the Problems tab filtered.
- **OJ credential status**: green badge "洛谷已登录: yuandd" or yellow
  "未登录 - 点击登录" - 24px tall, sits at the bottom of the welcome page.
- **Doc**: `docs/06-welcome/onboarding.md`

---

## 8. Cross-page Navigation Map

The ActivityBar order = the tab order. From the v0 design's `interactions` in
oler-ide-redesign.design:

| From            | Trigger         | To                       |
|-----------------|-----------------|--------------------------|
| Welcome         | btn-open-shell  | Problems (default)       |
| Problems        | nav-training    | Training                 |
| Problems        | nav-mistakes    | Mistakes                 |
| Problems        | nav-ai          | AI Coach                 |
| Problems        | nav-settings    | Settings                 |
| (every page)    | nav-{any}       | the respective shell page |
| Editor          | btn-open-shell  | Problems                 |
| Editor          | nav-file-explorer | File Explorer (panel)  |

The 6-tab ActivityBar/TabBar handles all shell navigation. File Explorer,
Output, Test Cases are subpanels inside the Editor tab (splitter).

---

## 9. Implementation Status (as of v2.1.0)

| Item                              | Status   | Where                                    |
|-----------------------------------|----------|------------------------------------------|
| Design tokens (1.1-1.11)          | DONE     | `docs/02-design-system/tokens.md`        |
| 4 theme QSS files                 | DONE     | `resources/themes/*.qss`                 |
| CThemeManager + cycleTheme        | DONE     | `src/core/theme/CThemeManager.cpp`       |
| OlerEditor + KSyntax theme map    | DONE     | `src/ui/editor/OlerEditor.cpp`           |
| MainWindow 6-tab shell            | DONE     | `src/ui/mainwindow/MainWindow.cpp`       |
| Welcome page                      | PENDING  | Phase 5 (placeholder label)             |
| Problems 5-cards grid             | PENDING  | Phase 5 (placeholder label)             |
| Training 3-KPI cards              | PENDING  | Phase 5 (placeholder label)             |
| Mistakes verdict badges           | PENDING  | Phase 5 (placeholder label)             |
| AI Coach chat UI                  | PENDING  | Phase 5 (placeholder label)             |
| Settings theme picker             | PENDING  | Phase 5 (placeholder label)             |
| Test results panel                | PENDING  | Phase 6 (depends on compiler pipeline)  |
| File Explorer subpanel            | PENDING  | Phase 5+                                |
| Output subpanel                   | PENDING  | Phase 6 (depends on compiler pipeline)  |
| Test cases subpanel               | PENDING  | Phase 6 (depends on OJ integration)     |

---

## 10. Rules for Phase 5+ Implementers

1. **No ad-hoc hex**. Any new color must be added to section 1 first, then
   referenced in the page code.
2. **No ad-hoc radius**. Use one of the 5 radius tokens (xs/sm/md/lg/full).
3. **Border-first surfaces**. Idle surfaces get `--oler-border`, not
   `--shadow-static` (alpha too low). Only floating elements earn
   `--shadow-floating`.
4. **No animations beyond 0.3s**. If you need more, you're overdoing it.
5. **Continuity anchors are mandatory**. Every shell page must use
   `oler-nav-56px`, `oler-tabbar-36px`, and `shared-shell-layout`.
6. **Light theme doesn't compromise verdicts**. AC stays green, WA stays red,
   even in light mode. Readability > brand symmetry.
7. **Mono font for all numerics**. Use `.oler-mono` for any number that needs
   to line up (timing, memory, problem IDs).
8. **Test the theme switch**. Any new widget must look right in all 4 themes
   before merge.
9. **Update docs first**. Add the page's design to `docs/03-shell-pages/*.md`
   before writing page code.
10. **No placeholder hex in page code**. If you don't have a token, propose
    one in this spec first.

---

## 11. References (v0 source)

- `D:\oler\oler-ide-redesign\colors_and_type.css` (160 lines, full token set)
- `D:\oler\oler-ide-redesign\orchestration-summary.json` (page metadata, visual
  north stars, design brief)
- `D:\oler\oler-ide-redesign\oler-ide-redesign.design` (12 page nodes, cross-tab
  interactions, JSON)

**End of spec.**
