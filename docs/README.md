# Olympia IDE — Documentation

This directory contains the **product, design, and engineering docs** for
Olympia IDE (repo codename `oler-ide-v2`). It is the single source of truth that the next agent reads
before changing any code in `src/`, `cmake/`, or `resources/`.

The 13 files are organised into 9 sub-directories. Each sub-directory
covers one facet of the product, and the layout mirrors the project's
own source layout (`src/{core,ui}/`).

## Index

### 1. Product

- [`01-product/positioning.md`](01-product/positioning.md) — who the
  product is for, what it does, what it explicitly does not do.

### 2. Design System

- [`02-design-system/tokens.md`](02-design-system/tokens.md) — the
  CSS-variable contract that every page, theme, and widget follows.

### 3. Shell Pages (5 tabs)

- [`03-shell-pages/problems.md`](03-shell-pages/problems.md) — 题库
  (default landing tab).
- [`03-shell-pages/training.md`](03-shell-pages/training.md) — 训练
  (streak + goal + sessions + chart).
- [`03-shell-pages/mistakes.md`](03-shell-pages/mistakes.md) — 错题本
  (verdict-tagged journal).
- [`03-shell-pages/ai.md`](03-shell-pages/ai.md) — dots.ai (chat
  surface).
- [`03-shell-pages/settings.md`](03-shell-pages/settings.md) — 设置
  (grouped control panel).

### 4. Editor

- [`04-editor/subpages.md`](04-editor/subpages.md) — the four
  layout states of the editor (main / file-explorer / output /
  testcases).

### 5. Test Results

- [`05-test-results/panel.md`](05-test-results/panel.md) — the
  post-run verdict surface.

### 6. Welcome

- [`06-welcome/onboarding.md`](06-welcome/onboarding.md) — the
  first-run experience.

### 7. Risks

- [`07-risks/v1-lessons.md`](07-risks/v1-lessons.md) — the 10
  pitfalls v1 walked into, in narrative form.

### 8. Roadmap

- [`08-roadmap/phases.md`](08-roadmap/phases.md) — Phase 0 through
  7+ with status and acceptance bars.

### 9. Glossary

- [`09-glossary/terms.md`](09-glossary/terms.md) — OI terms, verdict
  codes, OJs, slang.

## Source Provenance

All docs are derived from the v0 design artifacts in
`D:\oler\oler-ide-redesign\`:

- `oler-ide-redesign.design` — page nodes, interactions, asset list.
- `orchestration-summary.json` — project metadata, visual north
  star per page, continuity anchors.
- `colors_and_type.css` — design tokens (color, type, spacing,
  radius, shadow, motion, z-index).

Plus internal sources:

- `D:\oler-ide-v2\AGENTS.md` — v1 lessons, vendored-patch notes.
- `D:\oler-ide-v2\README.md` — top-level phase list.
- `.superpowers/sdd/2026-08-21-oler-ide-v2-foundation/progress.md`
  — per-task review and minor findings.

## Document Conventions

- Every doc cites the v0 source it was derived from in a "Source"
  block at the top.
- Tables use GFM pipe syntax; no HTML.
- Each doc closes with a **"Phase 5+ 待实装"** section if it
  describes a page that is not yet implemented.
- Chinese terms appear alongside their English / Pinyin where the
  UI surface uses the Chinese form (verdict codes, OJ names,
  feature names).
- All paths are **ASCII** (the project root is `D:\oler-ide-v2`).
  See `07-risks/v1-lessons.md` §5 for why.

## How to Use This Tree

- **Adding a new page?** Copy the template in
  `03-shell-pages/problems.md` and link it from this index.
- **Adding a new color?** Add it to `02-design-system/tokens.md`
  first, then reference the token in the QSS file. Never inline
  a hex in page code.
- **Adding a new OI term?** Add it to `09-glossary/terms.md`
  before it lands in the UI.
- **Adding a new phase?** Append to `08-roadmap/phases.md` with a
  status (Pending / In progress / Done) and an acceptance bar.

## Maintenance

- Every Phase 5+ commit that adds or changes a public surface
  updates the relevant doc in the same commit.
- Every new pitfall discovered during development appends to
  `07-risks/v1-lessons.md` AND the `AGENTS.md` "v1 留下来的坑" list
  (the docs version is the human-readable form; the AGENTS.md
  list is the agent-readable form).
- A change to `02-design-system/tokens.md` is a **breaking change**
  to all 4 themes; update each `*.qss` in the same commit.
