# Olympia IDE — Documentation

> **Read this first — mainline status as of 2026-09-10.**
> The mainline is the **Tauri 2 + React 19 + TypeScript** desktop app in `frontend/`.
> Everything in this tree was written during the earlier **Qt 6.8 / C++17** foundation
> phase; that implementation was removed from the mainline (commit `b3292ee`, preserved
> by tag `qt-foundation`).
>
> **What survived the port is the design intent** — page structure, visual north stars,
> token contract, Chinese copy, and the v1 lessons. **What did not survive is every
> implementation claim** — C++ class names, `src/` / `cmake/` / `resources/` paths, QSS
> theming, `cmake -G Ninja` builds, and the per-phase status tables.
>
> - How the app is built and shipped **today** → repo-root `AGENTS.md` and `README.md`.
> - What is implemented **today** → [`08-roadmap/phases.md`](08-roadmap/phases.md)
>   (rewritten against the code on 2026-09-10).
> - A "Status: DONE" line inside any doc body below is **not** authoritative. Trust the
>   table in this file, not the doc.

This tree holds 18 markdown files and 2 HTML mockups across 11 sub-directories, and it is
the source of truth for **design intent** — not for build commands or code paths.

## Status Legend

| Status | Meaning |
| --- | --- |
| **Binding** | Still authoritative today. Follow it. |
| **Intent** | The design intent is live and is what the mainline UI implements; its code, path, and build claims are historical. |
| **Partial** | The surface exists in `frontend/src/` but does not yet cover everything the doc describes. |
| **Unbuilt** | Describes a surface that does **not** exist in the mainline. Design reference only. |
| **Historical** | A record of the removed Qt line. Never a source of build or API facts. |

## Index

### 1. Product

| Doc | Describes | Status |
| --- | --- | --- |
| [`01-product/positioning.md`](01-product/positioning.md) | Target users, feature list, explicit non-goals. | **Intent** — non-goals still hold in spirit, but `positioning.md:74` ("v2 is MinGW 13.1.0 + Qt 6.8.0 strictly") is Historical: the mainline has no Qt dependency (WebView2 + Tauri), and MinGW 13.1.0 is now only the *user's compiler toolchain*, downloaded on demand. |

### 2. Design System

| Doc | Describes | Status |
| --- | --- | --- |
| [`02-design-system/tokens.md`](02-design-system/tokens.md) | The CSS-variable contract every page/theme follows. | **Intent**, with one divergence — the mainline counterpart is `frontend/src/index.css` (Tailwind 4 plus plain custom properties on `:root` / `[data-theme="…"]` blocks), and it implements **2 themes**, not the 4 documented here: `ThemeType = 'OneDarkPro' \| 'GitHubLight'` (`frontend/src/types/index.ts:56`), applied via `document.documentElement.setAttribute('data-theme', …)` (`frontend/src/stores/useAppStore.ts:387`). AmberDark / AmberLight were Qt-era only. `tokens.md:173` (`CThemeManager.cpp`, QSS) is Historical. |
| [`10-ui-styleguide.md`](10-ui-styleguide.md) | The prose style guide (philosophy, density, motion). | **Intent** — its "唯一来源" line points at `src/ui/common/OlerTheme.{h,cpp}`, which is Historical; the live token source is `frontend/src/index.css`. |

### 3. Shell Pages

The documented shell had 5 tabs (题库 / 训练 / 错题本 / AI / 设置). The mainline has a
different set — `NavTab = 'editor' | 'problems' | 'ai' | 'settings' | 'stress'`
(`frontend/src/types/index.ts:173`) — so two of these docs describe surfaces that were
never ported, and two live surfaces have no doc at all.

| Doc | Describes | Status |
| --- | --- | --- |
| [`03-shell-pages/problems.md`](03-shell-pages/problems.md) | 题库 — the default landing tab. | **Intent** — implemented in `frontend/src/components/problems/ProblemsPage.tsx` (plus `ProblemDetailModal.tsx`, `ProblemViewerPanel.tsx`). |
| [`03-shell-pages/ai.md`](03-shell-pages/ai.md) | dots.ai chat surface. | **Intent** — implemented in `frontend/src/components/ai/AiCoachPage.tsx`. |
| [`03-shell-pages/settings.md`](03-shell-pages/settings.md) | 设置 — grouped control panel. | **Intent** — implemented in `frontend/src/components/settings/SettingsPage.tsx`; the section list has drifted from the doc. |
| [`03-shell-pages/training.md`](03-shell-pages/training.md) | 训练 — streak + goal + sessions + chart. | **Unbuilt** — `frontend/src/components/training/TrainingPage.tsx` exists but is imported by nothing (dead code); there is no `training` nav tab. |
| [`03-shell-pages/mistakes.md`](03-shell-pages/mistakes.md) | 错题本 — verdict-tagged journal. | **Unbuilt** — no component and no nav tab. `~/.oleride/mistakes.json` exists in the data layer only. |

| Live surface | Where | Doc? |
| --- | --- | --- |
| 压力测试 (stress tester) | `frontend/src/components/stress/StressTesterPage.tsx` | **none — doc gap** |
| 比赛模式 (contest countdown / AI lock) | `frontend/src/components/common/ContestBar.tsx` | **none — doc gap** |

### 4. Editor

| Doc | Describes | Status |
| --- | --- | --- |
| [`04-editor/subpages.md`](04-editor/subpages.md) | The four layout states of the editor. | **Partial** — the mainline editor exists (`frontend/src/components/editor/MonacoCodeEditor.tsx`, `EditorTabBar.tsx`, `frontend/src/components/viewer/ProblemViewerPanel.tsx`) but is a Monaco + resizable-panel layout, not the documented Qt dock-widget states. `OlerEditor.{h,cpp}` references are Historical. |

### 5. Test Results

| Doc | Describes | Status |
| --- | --- | --- |
| [`05-test-results/panel.md`](05-test-results/panel.md) | The post-run verdict surface. | **Intent** — implemented in `frontend/src/components/runner/RunnerPanel.tsx` (AC/WA/TLE/RE/CE colour semantics are the live ones). |

### 6. Welcome

| Doc | Describes | Status |
| --- | --- | --- |
| [`06-welcome/onboarding.md`](06-welcome/onboarding.md) | The first-run experience. | **Intent** — implemented in `frontend/src/components/common/OnboardingWizard.tsx`, now also covering the one-click MinGW 13.1.0 download (`frontend/src-tauri/src/toolchain.rs`). |

### 7. Risks

| Doc | Describes | Status |
| --- | --- | --- |
| [`07-risks/v1-lessons.md`](07-risks/v1-lessons.md) | The 10 pitfalls v1 walked into. | **Binding** — the only doc in this tree whose lessons are still rules. The Qt/CMake-specific entries (§1, §2, §4, §5, §7) apply only if the Qt line is ever resurrected; §5 (ASCII project root) and §10 (PowerShell 5.1 quirks) still bind the Tauri line. |

### 8. Roadmap

| Doc | Describes | Status |
| --- | --- | --- |
| [`08-roadmap/phases.md`](08-roadmap/phases.md) | Phase 0 → 7+ status and acceptance bars. | **Rewritten 2026-09-10** against the actual Tauri code; supersedes the Qt phase table. |

### 9. Glossary

| Doc | Describes | Status |
| --- | --- | --- |
| [`09-glossary/terms.md`](09-glossary/terms.md) | OI terms, verdict codes, OJs, slang. | **Binding** — terminology only; keep it in sync when a new verdict or OJ lands. |

### 10. Design Spec

| Doc | Describes | Status |
| --- | --- | --- |
| [`00-design-spec.md`](00-design-spec.md) | The consolidated v0 → v2 UI spec (sections 0-13). | **Intent**, partly Historical — §1.12/§1.13 (KSyntax theme mapping, `OlerEditor`) and the status table at lines 440-443 (`resources/themes/*.qss`, `CThemeManager.cpp`, `MainWindow.cpp` marked DONE) document the deleted Qt line. The page-level sections remain the best description of the intended UI. |

### 11. Mockups

| Doc | Describes | Status |
| --- | --- | --- |
| [`mockups/shell-preview.html`](mockups/shell-preview.html) | Static shell preview. | **Historical** — `shell-preview.html:589` states it is "基于 Qt 6.8 + KSyntaxHighlighting". Useful only as a visual reference for the 5-tab Qt shell. |
| [`mockups/accent-candidates.html`](mockups/accent-candidates.html) | Accent-colour candidates. | **Intent** — colour choice, not implementation. |

### 12. Plans (`.superpowers` artefact mirror)

| Doc | Describes | Status |
| --- | --- | --- |
| [`superpowers/plans/2026-08-21-oler-ide-v2-foundation.md`](superpowers/plans/2026-08-21-oler-ide-v2-foundation.md) | The Qt foundation implementation plan. | **Historical** |
| [`superpowers/plans/2026-08-21-phase4-editor-and-highlight.md`](superpowers/plans/2026-08-21-phase4-editor-and-highlight.md) | The Qt editor/KSyntax bridge plan. | **Historical** |

## Source Provenance

The design-intent docs are derived from the v0 design artifacts in
`D:\oler\oler-ide-redesign\`:

- `oler-ide-redesign.design` — page nodes, interactions, asset list.
- `orchestration-summary.json` — project metadata, visual north star per page,
  continuity anchors.
- `colors_and_type.css` — design tokens (color, type, spacing, radius, shadow,
  motion, z-index).

Plus internal sources:

- `D:\oler-ide-v2\AGENTS.md` — build/ship contract, v1 lessons, vendored-patch notes.
- `D:\oler-ide-v2\README.md` — top-level project description.
- `.superpowers/sdd/2026-08-21-oler-ide-v2-foundation/progress.md` — per-task review and
  minor findings from the (now historical) Qt foundation phase.

## Document Conventions

- Every doc cites the v0 source it was derived from in a "Source" block at the top.
- Tables use GFM pipe syntax; no HTML.
- Chinese terms appear alongside their English / Pinyin where the UI surface uses the
  Chinese form (verdict codes, OJ names, feature names).
- All paths are **ASCII** (the project root is `D:\oler-ide-v2`). See
  `07-risks/v1-lessons.md` §5 for why.
- **Retired conventions** (do not reintroduce): the "each doc closes with a
  'Phase 5+ 待实装' section" rule, and the "reference the token in the QSS file"
  rule — both belonged to the Qt line. In the mainline, an unbuilt page is marked
  **Unbuilt** in the status table above, and tokens live in `frontend/src/index.css`.

## How to Use This Tree

- **Adding a new page?** Add the design doc under `03-shell-pages/`, mark its status in
  this file, and keep the component under `frontend/src/components/<area>/`.
- **Adding a new colour?** Add the token to `frontend/src/index.css` for both
  `[data-theme]` blocks first, then reference `var(--token)` in components. Never inline
  a hex in page code.
- **Adding a new OI term?** Add it to `09-glossary/terms.md` before it lands in the UI.
- **Recording a phase?** Append to `08-roadmap/phases.md` with a status
  (Done / In progress / Planned) and an acceptance bar that names a command you can
  actually run in `frontend/`.

## Maintenance

- A commit that adds or changes a user-visible surface updates the matching doc (or adds
  one, if the surface has no doc) **and** its status row in this file.
- A new pitfall appends to `AGENTS.md`; add a narrative entry here only when it teaches
  something a doc should carry.
- Doc status lines rot faster than prose: when you touch a doc, re-check its status row
  against `frontend/src/` and fix the row rather than the body.
- Changing `frontend/src/index.css` tokens is a **breaking change** for every themed
  surface; update both `[data-theme]` blocks and the theme-aware editors
  (`frontend/src/services/monacoTheme.ts`, `TerminalPanel.tsx`) in the same commit.
