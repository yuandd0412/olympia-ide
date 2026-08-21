# Roadmap — Phases 0 through 7+

> Source: `D:\oler-ide-v2\README.md` (top-level phase list) +
> `.superpowers/sdd/2026-08-21-oler-ide-v2-foundation/progress.md`
> (per-task status) + the foundation plan at
> `.superpowers/sdd/2026-08-21-oler-ide-v2-foundation/plans/`.

The v2 rewrite is split into 8 phases (0 through 7) plus an open-ended
7+ for AI / polish. Each phase has a clear acceptance bar; the v0
design files at `D:\oler\oler-ide-redesign\` are the visual north
star from Phase 5 onward.

## Status Legend

- **Done** — code merged, reviewed, smoke-tested on user's machine.
- **In progress** — code merged but additional sub-tasks open.
- **Pending** — not started, blocked on a prior phase.
- **Open** — not planned; will be added once a phase ships.

## Phase 0 — Safety Rails + Repo Init

**Status:** Done (Task 0).

- ASCII-only project root at `D:\oler-ide-v2`.
- `.gitignore` covers `build/`, `third_party/`, IDE files.
- Initial `AGENTS.md`, `README.md`, `LICENSE` (MIT).
- File-deletion rule documented (use `cmd /c rmdir /s /q` only).
- Per-step reporting workflow ("complete → report → wait for ack").

**Acceptance:** `cmake -G Ninja -B build -S .` runs without CJK path
errors. `git log --oneline` shows the foundation commit.

## Phase 1 — Skeleton (Empty Main Window)

**Status:** Done (Tasks 1-2).

- `MainWindow` (QMainWindow) with a 56px ActivityBar (left rail) and
  a 36px TabBar (top).
- 5 stacked pages: Problems / Training / Mistakes / AI / Settings.
- ABI chain verified: built with MinGW 13.1.0, runs without
  `0xC0000374` for >3s, exits 0 on close.
- Windres path corrected to `C:/Qt/Tools/mingw1310_64/bin/windres.exe`
  (Qt's own `windres` is wrong ABI).

**Acceptance:** `build/oler-ide.exe` starts, shows the empty shell,
switches between the 5 tab buttons, and closes cleanly.

## Phase 2 — 4-Theme System

**Status:** Done (Tasks 4-5).

- 4 QSS files in `resources/themes/`:
  `OneDarkPro.qss`, `OneLight.qss`, `AmberDark.qss`, `AmberLight.qss`.
- `CThemeManager` singleton (Phase 5 also uses it).
- 4 Q_INVOKABLE methods to switch at runtime.
- Token contract: every QSS rule uses the variables from
  `02-design-system/tokens.md`.

**Acceptance:** `CThemeManager::instance().applyTheme("OneLight")` flips
the entire shell without restart; no leaked style on a tab switch.

## Phase 3 — Vendor ECM + KSyntax

**Status:** Done (Task 3, with one open sub-task from Task 6).

- `third_party/extra-cmake-modules` and `third_party/syntax-highlighting`
  cloned and built via `add_subdirectory(...  EXCLUDE_FROM_ALL)`.
- KSyntax 6.x `Repository` is `new`-only (no static `instance()`).
- `katehighlightingindexer` patch documented in `AGENTS.md` (data
  CMakeLists.txt stub).
- **Open (deferred):** `index.katesyntax` is a 0-byte stub; the
  374 XML definitions are present but the editor cannot look them up.
  Real fix needs a separate task (PATH-with-Qt-DLLs indexer run, or
  pre-generate and commit). Phase 5+ will land the fix.

**Acceptance:** `find_package(KF6SyntaxHighlighting)` succeeds; the
editor compiles a `.cpp` file with at least keyword color (via the
fallback `.syn-keyword` rule) when the index is bypassed.

## Phase 4 — Core Classes (OlerApi + 7 Building Blocks)

**Status:** Pending.

The 7 building blocks are still being defined; the foundation plan
names "OlerApi" as the single entry point that all shell tabs and the
editor call into. Phase 4 is where the API surface stabilizes.

Likely modules (subject to plan amendment):

- `OlerApi` — singleton, ties together all 7 blocks.
- `OlerProblems` — problem list + recent + search.
- `OlerTraining` — streak / goal / session planner.
- `OlerMistakes` — mistake journal with verdict tags.
- `OlerAI` — dots.ai adapter (stub in Phase 4, real in Phase 7+).
- `OlerSettings` — settings store + change events.
- `OlerRunner` — g++ pipeline + sample I/O + verdict evaluation.

**Acceptance:** the shell tabs can call `OlerApi::problems()->list()`
etc. and get non-placeholder data. Smoke test runs and exits cleanly.

## Phase 5 — Shell 5-Tab UI (Real Implementation)

**Status:** Pending. This is where the v0 design lands.

The 5 shell pages documented in `03-shell-pages/` get real
implementations, replacing the current stubs in `MainWindow`'s
stacked widget.

- Problems tab: search, problem cards, recent grid, quick actions.
- Training tab: streak, goal, planned sessions, chart.
- Mistakes tab: verdict tags, filter, heatmap hint, review actions.
- AI tab: chat surface, code block rendering, prompt chips, model
  selector. Mocked assistant until Phase 7+.
- Settings tab: 5 grouped sections, OJ receiver list, shortcuts.

**Acceptance:** the v0 visual north star in
`D:\oler\oler-ide-redesign\orchestration-summary.json` matches the
running app for all 5 pages, in all 4 themes. Each page has at least
one interaction wired to real data (not a stub).

## Phase 6 — Compiler Pipeline + OJ Adapters

**Status:** Pending.

- `OlerRunner` (Phase 4) gets the g++ invocation wired: real compile,
  real run on sample I/O, real verdict evaluation.
- OJ adapter layer: Luogu, Codeforces, AtCoder. Each adapter owns its
  credential store and submit dialog.
- Time / memory budgets become per-problem settings.
- Test-results panel (`05-test-results/panel.md`) is the primary
  surface; the test-cases dock in the editor (`04-editor/subpages.md`)
  is the secondary surface.

**Acceptance:** `Ctrl+R` evaluates a real `main.cpp` against bundled
sample I/O and shows correct AC / WA / TLE / RE / CE verdicts.
Submitting to one OJ receiver round-trips a credentialed request.

## Phase 7+ — AI Coach (dots.ai)

**Status:** Open.

- Real model integration: `dots.ai` models, user-managed model
  directory.
- Conversation persistence (`~/.oleride/conversations/{uuid}.json`).
- Problem context injection: failing test + diff + last code into
  the prompt.
- Suggested-prompts learning: prompt list adapts to recent verdict
  type and topic.
- Optional: prompt style preset, token-count display, model cost
  hints.

**Acceptance:** the AI tab answers "why is case 3 WA" with a
substantive explanation that references the user's actual code and
the failing test.

## Cross-Cutting Concerns

- **Test surface** — every phase's acceptance includes a smoke test
  the user can re-run.
- **Theme parity** — every UI surface must work in all 4 themes
  before the phase is "done".
- **Docs parity** — any new public API in a phase updates
  `docs/` in the same commit.
- **AGENTS.md** — every new pitfall is appended to the v1 lessons
  (see `07-risks/v1-lessons.md`).
