# Shell — Settings (设置)

> Source: `D:\oler\oler-ide-redesign\orchestration-summary.json` →
> `pages[?nodeId=page-shell-settings]` (visualNorthStar, continuityAnchors) +
> `oler-ide-redesign.design` → `data[?id=page-shell-settings]`
> (interactions: nav-problems / nav-training / nav-mistakes / nav-ai).

The Settings tab is the **single control panel** for the IDE. Every
configurable behavior — theme, compiler, OJ credentials, AI model,
keyboard shortcuts — is reachable from here. v1 is intentionally sparse:
no nested pages, no "advanced" toggle that hides controls. Everything is
visible and editable.

## Visual North Star

> *"Settings panel with grouped sections, toggle switches, dropdown
> selectors, compiler config, OJ receiver status, keyboard shortcuts
> reference."*
> — orchestration-summary.json

The layout is a flat two-column settings list, not a tree. Each group is
a `GroupHeader` followed by 2-6 controls. The right edge is reserved for
the **OJ receiver status** and **keyboard shortcuts reference** cards,
which never collapse.

## Continuity Anchors

| Anchor                | Dimension  | Purpose                |
|-----------------------|------------|------------------------|
| `shared-shell-layout` | structural | Sidebar / main layout  |
| `oler-nav-56px`       | 56px       | ActivityBar            |
| `oler-tabbar-36px`    | 36px       | TabBar                 |

## Key Features

1. **Grouped sections** — left column. Order:
   1. **Appearance** — theme selector (4 themes), font size scale,
     editor font override, accent override.
   2. **Compiler** — g++ path (auto-detected; "Re-detect" button),
     optimization preset (`-O0 / -O2 / -O2 -std=c++17`), warning
     flags.
   3. **OJ receivers** — credential entries for Luogu, Codeforces,
     AtCoder. "Add receiver" button.
   4. **AI assistant** — dots.ai model selector, prompt style
     preset, "Show token count" toggle.
   5. **Keyboard shortcuts** — read-only reference table (see below).
2. **Toggle switches** — used for boolean settings. Track
   `--oler-bg-elevated` (off) → `--oler-primary` (on). Thumb
   `--oler-text-primary`. No animation; instant state change.
3. **Dropdown selectors** — used for enum choices (theme, opt
   level). Trigger is a `--oler-bg-surface` button, menu opens
   with `--shadow-floating`.
4. **OJ receiver status** — right column card. Shows each added
   receiver with a small status dot: green = verified, amber =
   pending, red = error. Clicking a row opens the credential
   editor inline.
5. **Keyboard shortcuts reference** — bottom-right card. Static
   table of common shortcuts (see below).

## Layout Sketch

```
+----------------------------------------------------------+
| ActivityBar(56) | Appearance                       [ ]  |
|                 |   Theme [OneDarkPro v]                 |
|  P  icon        |   Font scale [ 13px v]                 |
|  T  icon        |                                       |
|  M  icon        | Compiler                              |
|  A  icon        |   g++ path [C:\Qt\.../g++.exe] [detect]|
|  S  icon        |   Opt level [-O2 v]                    |
|                 |                                       |
|                 | OJ receivers                          |
|                 |   [Luogu verified]    [Edit] [Remove] |
|                 |   [Codeforces amber]  [Edit] [Remove] |
|                 |   [+ Add receiver]                    |
|                 |                                       |
|                 | AI assistant                          |
|                 |   Model [gpt-x v]                      |
|                 |   [ ] Show token count                |
|                 |                                       |
|                 | Keyboard                              |
|                 |   Ctrl+B    Build                     |
|                 |   Ctrl+R    Run                       |
|                 |   Ctrl+;    Open AI coach             |
|                 |   ...                                  |
+-----------------+--------------------------------------+
```

## State Colors

| State              | Token                  | Use                          |
|--------------------|------------------------|------------------------------|
| Toggle on          | `--oler-primary`       | Active track                 |
| Toggle off         | `--oler-bg-elevated`   | Inactive track               |
| Receiver verified  | `--state-success`      | Green status dot             |
| Receiver pending   | `--state-warning`      | Amber status dot             |
| Receiver error     | `--state-error`        | Red status dot               |
| Dropdown trigger   | `--oler-bg-surface`    | Default chrome               |
| Dropdown menu      | `--oler-bg-overlay` + `--shadow-floating` | Open menu          |

## Default Shortcuts (subject to change in Phase 5+)

| Shortcut   | Action                          |
|------------|---------------------------------|
| `Ctrl+B`   | Build current file              |
| `Ctrl+R`   | Run on sample tests             |
| `Ctrl+Shift+R` | Run on all testcases         |
| `Ctrl+J`   | Submit to OJ                    |
| `Ctrl+,`   | Open Settings                   |
| `Ctrl+;`   | Open AI coach                   |
| `Ctrl+P`   | Quick open file                 |
| `Ctrl+1..5`| Switch shell tab                |

## Phase 5+ 待实装 (Pending)

- OJ receiver verification flow. v1 lets users paste a token and
  save; the real flow will sign in via OAuth / browser handshake
  in Phase 6.
- Per-receiver template overrides. v1 has one global submit
  template; Phase 6 will let each receiver pick its own
  (Codeforces has different language IDs than Luogu).
- Settings search. The flat list works at v1 size; once we add
  20+ options, a search box at the top is needed.
- Settings export / import is available from the top of the Settings page;
  imported JSON is validated, defaults are restored for missing keys, and
  the active settings file is updated.

## Cross-Tab Navigation

| DOM id           | Target page              |
|------------------|--------------------------|
| `nav-problems`   | `page-shell-problems`    |
| `nav-training`   | `page-shell-training`    |
| `nav-mistakes`   | `page-shell-mistakes`    |
| `nav-ai`         | `page-shell-ai`          |
