# Editor — Subpages

> Source: `D:\oler\oler-ide-redesign\oler-ide-redesign.design` →
> `data[?type=page & id^=page-editor-]`: `page-editor-main`,
> `page-file-explorer`, `page-editor-output`, `page-editor-testcases`.
>
> The editor itself is `OlerEditor` (`src/ui/editor/OlerEditor.cpp`),
> currently rendered in `MainWindow` as a stacked page. The four v0
> subpages describe different layout states of the same editor surface.

The editor area is a **single surface** with four layout states. The
states are not separate windows or routes — they are modes that the
editor switches between based on what the user is doing (read code,
manage files, run, test).

## Visual North Star (combined)

> *"Code editor with file explorer, output panel, testcase panel —
> the IDE is its sibling panels that surround a centered editing
> surface."*
> — derived from the four subpages in
> `oler-ide-redesign.design` and the v0 brief wording
> ("page-editor-main", "page-file-explorer", "page-editor-output",
> "page-editor-testcases").

The four v0 subpages map to four layout states:

| v0 page node              | Layout state                   | When shown                |
|---------------------------|--------------------------------|---------------------------|
| `page-editor-main`        | Editor only, full bleed        | Default editing           |
| `page-file-explorer`      | File explorer + editor split   | `Ctrl+P` or open          |
| `page-editor-output`      | Editor + output panel (bottom) | After run                 |
| `page-editor-testcases`   | Editor + testcases (right)     | After run on full set     |

The implementations below live in `src/ui/editor/OlerEditor.{h,cpp}` and
the surrounding dock widgets in `src/ui/mainwindow/`.

## 1. Editor Main (`page-editor-main`)

The default state. Centered editing surface, top tab strip showing open
files, line numbers in the gutter, status bar with `Ln n, Col n` and
language mode (C++ / Python / Java in v1, C++ first).

- **Top tab strip** — file name + dirty dot. Active tab uses
  `--oler-border-active`. Hover on close button (`x`) shows
  `--oler-primary`.
- **Line numbers** — `--oler-text-tertiary`, right-aligned, 4ch wide.
- **Cursor line** — `--oler-bg-elevated` background, no border.
- **Selection** — `--oler-primary-muted` (`rgba(217, 119, 87, 0.15)`).
- **Status bar** — bottom 24px, `--oler-bg-nav` background,
  `--oler-text-secondary` text, tabular-nums for line/col.

Interactions (from v0 design):

| DOM id               | Target page              |
|----------------------|--------------------------|
| `btn-open-shell`     | `page-shell-problems`    |
| `nav-file-explorer`  | `page-file-explorer`     |

## 2. File Explorer (`page-file-explorer`)

A left-docked panel (~240px wide) showing the current project tree.
v1's project is a single problem folder with `main.cpp`,
`input.txt`, `output.txt`, and (when applicable) `tests/*.in` /
`tests/*.out`. The explorer is read-only in v1 — file operations go
through the OS file manager or `Ctrl+P` quick-open.

- **Tree** — single root (the problem folder). Folders first, then
  files, alphabetical.
- **File row** — 24px tall, icon + name. Hover =
  `--oler-bg-elevated`. Selected = `--oler-border-active` on the
  left edge.
- **Top action row** — `+ New file`, `+ New folder`, `Refresh`. Icon
  buttons, 24px.
- **Bottom** — `Open in OS file manager` link in
  `--oler-text-tertiary`.

Interactions:

| DOM id      | Target page           |
|-------------|-----------------------|
| `nav-editor`| `page-editor-main`    |

## 3. Editor + Output (`page-editor-output`)

Same as Editor Main, plus a bottom-docked panel (240px tall when
expanded) showing the **run output**. Two tabs inside the panel:
`stdout` and `stderr`.

- **Tab header** — 28px, `--oler-bg-surface` background, active tab
  underlined with `--oler-primary`.
- **Output body** — `--oler-mono` (12px), `--oler-text-primary`
  default. Errors in `--state-error`. Warnings in `--state-warning`.
- **Status row** — `Exit 0`, `Time 12ms`, `Memory 1.2MB`, `Verdict: ?`.
  Tabular-nums. The verdict badge is the same component used in
  `05-test-results/panel.md`.
- **Resize handle** — 4px-tall drag strip at the top of the panel;
  cursor changes to `ns-resize`.

This subpage does not declare any explicit interactions in the v0
design; it is a layout-only state.

## 4. Editor + Testcases (`page-editor-testcases`)

Same as Editor Main, plus a right-docked panel (~320px wide) showing
the **testcase table**. Each row: index, time, memory, verdict,
"Reveal diff" button.

- **Header row** — `# / Time / Memory / Verdict / Action`. Text in
  `--oler-text-tertiary`, 11px (`--font-size-xs`).
- **Verdict cell** — colored badge using `--oler-ac / wa / tle / re / ce`.
- **Diff reveal** — clicking opens a 200px-tall diff sub-panel
  below the row, using `--oler-mono` and `--oler-bg-surface`.
  Expected lines in `--state-success`, actual in `--state-error`,
  aligned side by side.
- **Footer** — `Pass rate 4/5 (80%)` summary bar, 4px tall,
  `--oler-primary` fill.

Like the output panel, this subpage is layout-only; no interactions
declared in the v0 design.

## Phase 5+ 待实装 (Pending)

- File operations. v1's file explorer is read-only; Phase 5+ adds
  `New file / New folder / Rename / Delete` actions.
- Multi-project workspace. v1 is one problem folder at a time;
  Phase 5+ adds workspace roots.
- Editor split / multi-cursor. KSyntax 6.x supports both; Oler
  v1 has neither. Phase 5+ roadmap.
- Code completion / LSP. Not in v1; deferred until Oler IDE has a
  real reason to need a language server.
- Diff viewer polish. v1's diff is a text dump; Phase 5+ adds
  side-by-side mode and a unified mode toggle.

## Cross-Reference

- The 5 verdict colors used in the testcases panel come from
  `02-design-system/tokens.md` (`--oler-ac / wa / tle / re / ce`).
- The test-results surface is a sibling view (full panel, not
  docked); see `05-test-results/panel.md`.
- The "Open in editor" action from `03-shell-pages/problems.md`
  loads a problem into this editor surface.
