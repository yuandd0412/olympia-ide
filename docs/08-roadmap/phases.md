# Roadmap — Mainline Status (Tauri)

> **Rewritten 2026-09-10 against the code.** This file used to track the Qt 6.8 / C++17
> foundation (Phases 0-3 "Done", Phase 4-7+ "Pending", acceptance bars running
> `cmake -G Ninja` and `build/oler-ide.exe`). That implementation was removed from the
> mainline in commit `b3292ee`; its plan survives in tag `qt-foundation` and in
> `docs/superpowers/plans/`. The table below describes **the app that exists today**, and
> every acceptance bar is a command that actually runs.

## Status Legend

| Status | Meaning |
| --- | --- |
| **Implemented** | Ships and works end-to-end; the acceptance bar passes. Gaps listed are real but non-blocking. |
| **Partial** | Usable, with a named hole that a user can hit. |
| **Absent** | Named in the product docs; no implementation in the mainline. |

## Summary

| # | Area | Status |
| --- | --- | --- |
| A | Shell & navigation | Partial — two dead components |
| B | Code editor | Implemented |
| C | Compile & run pipeline | Partial — verdicts are still bare strings, no computed diff, no job object |
| D | Terminal | Absent — no terminal UI; the Rust-only `run_in_console` has no frontend caller |
| E | Stress tester (对拍器) | Implemented |
| F | Problem library, Luogu ingest, PDF import | Partial — favourites unreachable; ingest returns no tags |
| G | AI coach | Partial — no streaming; one flat transcript, not per-problem |
| H | Settings | Implemented |
| I | Persistence | Implemented |
| J | Contest mode | Partial — deadline rehydration **fixed 2026-09-13** (pending manual acceptance) |
| K | OJ submission | **Absent** |
| L | Onboarding & toolchain | Partial — step 3 empty-render **fixed 2026-09-13** (pending manual acceptance) |

---

## A — Shell & navigation · Partial

`NavTab = 'editor' | 'problems' | 'ai' | 'settings' | 'stress'` (the `NavTab` union in
`frontend/src/types/index.ts`) — there is **no `training`** member, which is what makes
`TrainingPage.tsx` unreachable. All five render from
the `activeNav === …` branches in `frontend/src/App.tsx`, driven by the `navItems` list plus the
separate settings button in `frontend/src/components/common/ActivityBar.tsx`.

- Two themes only: `ThemeType = 'OneDarkPro' | 'GitHubLight'`
  (`frontend/src/types/index.ts`), applied through `data-theme`
  (the `document.documentElement.setAttribute('data-theme', …)` calls in
  `frontend/src/stores/useAppStore.ts`). The documented AmberDark / AmberLight pair
  was never ported.
- **Dead code:** `frontend/src/components/training/TrainingPage.tsx` (zero importers — the file
  exists but no module reaches it, and there is no `training` tab to reach it through) and
  `frontend/src/components/common/TitleBar.tsx` (returns `null`, unimported).

**Acceptance:** `cd frontend && npm run build` exits 0; `npm run tauri dev` opens a window whose
five rail buttons switch pages, and both `[data-theme]` values restyle every surface.

## B — Code editor · Implemented

Multi-tab editing with rename/close-all (`frontend/src/components/editor/EditorTabBar.tsx:49-129`),
Monaco with per-theme definitions (`frontend/src/services/monacoTheme.ts:5,29`), and live
diagnostics — `check_syntax` on an 800 ms debounce feeding `setModelMarkers`
(`frontend/src/components/editor/MonacoCodeEditor.tsx:44,55`; command at
`frontend/src-tauri/src/lib.rs:157`). Saving goes through the Tauri dialog/fs plugins
(`frontend/src/stores/useAppStore.ts:459,462`).

- Gap: `settings.autoSave` is never read, there is no Rust-side save command, and no save
  button in the tab bar.

**Acceptance:** open a `.cpp`, introduce a syntax error → markers appear within ~1s; save writes
the file to disk.

## C — Compile & run pipeline · Partial

`run_code` (`frontend/src-tauri/src/lib.rs`) → `execute_code`
(`frontend/src-tauri/src/runner.rs`), per-case verdicts surfaced by
`frontend/src/components/runner/RunnerPanel.tsx`.

- Verdicts are still bare `String` literals, not an enum: `"CE"`, `"RE"`, `"AC"`, `"WA"`, `"TLE"`
  **and now `"MLE"`**. The overall verdict is folded with `worse_verdict` (`runner.rs`), which ranks
  them `AC < WA < MLE < TLE < RE`; any string outside that list ranks as `AC`, so an unknown code can
  never escalate the run (a `"CE"` from the compile path is returned directly with an empty case
  list, not folded).
- `MLE` is a real per-case verdict: a case that exits cleanly but whose measured peak working set
  exceeds `memory_limit_kb` is judged `MLE` in preference to `AC`/`WA`. `run_code` takes
  `memory_limit_kb: Option<u64>` and passes it through; absent, the judge defaults to 262144 KB —
  the same figure `useAppStore` uses when no problem is bound. Time limit works the same way
  (`time_limit_ms`, default 1000 ms).
- Memory is now a measurement, not a placeholder. `peak_memory_kb_from_handle` (`runner.rs`) reads
  `PeakWorkingSetSize`, and it is reached through `ProcessHandle` (`runner.rs`), which takes its own
  duplicate of the child's OS handle *while the child is still alive*. That indirection is the fix:
  tokio closes the child's own handle as soon as `wait()` reaps it, so sampling after `wait()`
  returned `None` and every run reported the hard-coded `1024` KB. A failed sample reports `0`, which
  means "not measured" — it never escalates to `MLE`, and the UI prints `未测得` rather than "0 KB"
  (`memoryLabel`, with `verdictColor` alongside it, in `frontend/src/lib/design/tokens.ts`).
- Timeout is a `tokio::time::timeout` around `child.wait()`. It kills the case's child:
  `kill_on_drop(true)` on every run plus an explicit `child.kill()` in the TLE branch. There is
  still no job object, so a program that spawns its own children can leave those behind.
- No computed diff — the panel shows raw expected/actual panes.

**Acceptance:** `cd frontend/src-tauri && cargo test --lib` passes — that run covers
`samples_current_process_peak_memory`, `samples_peak_memory_of_a_child_that_already_exited` (the
regression this section depends on), `overall_verdict_prefers_the_stricter_failure` and
`unknown_verdict_never_escalates`. The end-to-end MLE case is `#[ignore]`d because it needs a working
g++ (`cargo test --lib -- --ignored` runs `a_memory_greedy_run_is_judged_mle`). `Ctrl+R` on a real
`main.cpp` against a problem's samples reports the expected AC / WA / MLE / TLE / RE per case, and CE
when the build fails.

## D — Terminal · Absent

**There is no terminal surface in the mainline.** None of these exist:
`frontend/src/components/terminal/TerminalPanel.tsx`, the `src/components/terminal/` directory,
a `run_terminal_command` Rust command, or `triggerTerminalRun` in
`frontend/src/stores/useAppStore.ts`. The earlier version of this section described an embedded
`cmd /K` panel with a one-shot PowerShell command; that was never ported, and an earlier doc pass
described it as if it shipped. Treat "type a command into the IDE and see its output" as **intent**.

What does exist is one Rust command: `run_in_console` (`frontend/src-tauri/src/runner.rs`,
registered in `lib.rs`) compiles headlessly and then spawns `cmd /C <exe> & pause` in a fresh
`CREATE_NEW_CONSOLE` window — the Dev-C++ style interactive run.

- **Gap:** it has **no frontend caller**. The typed wrapper `runConsole`
  (`frontend/src/services/tauriApi.ts`) is never invoked, and `runCodeAction`
  (`frontend/src/stores/useAppStore.ts`) always goes through the built-in judge — an in-code comment
  parks terminal-first mode until its focus/interaction defects are fixed.
- **Gap:** no PTY, no embedded panel, no timeout on the spawned console window.

**Acceptance (when built):** a terminal panel exists, shows command output, and a long-running
command can be interrupted. Today the only reachable behaviour is an external console window.

## E — Stress tester (对拍器) · Implemented

`execute_stress_test` (`frontend/src-tauri/src/stress.rs`) compiles the three programs (solution /
brute / generator), loops the rounds, captures the first counterexample into
`StressTestResult.failed_round` (`Option<StressRoundResult>`, `frontend/src-tauri/src/models.rs`) and
reports the tally. UI:
`frontend/src/components/stress/StressTesterPage.tsx` (the rounds control is a `<select>` with
presets 10/30/50/100/500); store wiring: the `setStress*` fields and `runStressAction` in
`frontend/src/stores/useAppStore.ts`, calling `tauriApi.runStressTest`.

- Each round also carries `solMemoryKb`, and the result carries `maxSolMemoryKb`
  (`max_sol_memory_kb: Option<u64>` in `StressTestResult`, `frontend/src-tauri/src/models.rs`) — the
  highest peak the solution reached in any round, sampled through the same
  `runner::ProcessHandle` as the judge. `StressTesterPage.tsx` renders that peak and warns when it
  exceeds the active problem's `memoryLimitKb`. `None`/absent means "not measured", not 0.
- Gap: no free-text rounds field.
- **Note:** stress defaults are `-O2 -std=c++17 -Wall` with a **3000 ms generator** budget vs
  **2000 ms** for solution and brute (`stress.rs`: `comp_flags` default, the per-round
  `t_limit`, and the generator's `Duration::from_millis(3000)`), whereas the judge allows 1000 ms.
  A stress verdict is therefore *not* directly comparable to a judge
  verdict — a solution that TLEs under the judge can still "pass" a stress round.

**Acceptance:** feed a wrong solution + a brute force + a generator → the app reports a
counterexample input with both outputs.

## F — Problem library, Luogu ingest, PDF import · Partial

Seed and store in `frontend/src-tauri/src/storage.rs` (`load_problems` / `save_problems` —
`problems.json` starts empty; the editor opens an unbound `main.cpp` tab rather than faking a P1001
binding); Luogu fetch in `frontend/src-tauri/src/ingest.rs` behind the `fetch_problem_online` command
(`frontend/src-tauri/src/lib.rs`); favourite toggle at `toggle_favorite_problem` (same file);
Markdown + KaTeX rendering and the PDF import dialog in
`frontend/src/components/viewer/ProblemViewerPanel.tsx`, whose `Markdown` comes from
`frontend/src/ports/document.ts` (adapter: `MarkdownMathAdapter`, react-markdown + katex).
PDF **extraction is Rust-side**: `frontend/src-tauri/src/pdf_extract.rs` behind the
`extract_pdf_problems` command, applying the contest-style page-boundary heuristics;
`frontend/src/services/pdfExtract.ts` is only a thin wrapper — the `pdfjs-dist` runtime path it used
to carry has been removed.

- **Search/filter shipped on 2026-10-11** (commit `03a38bd`). `frontend/src/components/problems/ProblemsPage.tsx`
  renders a `type="search"` input bound to `setSearchQuery` (matches id / title / tag) and difficulty
  chips (全部 · 入门 · 普及 · 提高 · 省选 · NOI) bound to `setSelectedDifficulty`; both feed
  `filteredProblems`. The two store fields existed long before anything rendered them. Tag matching
  is inert in practice, because ingest returns `tags: []` (see the next bullet).
- **Favourites are unreachable:** the command exists and `toggleFavorite` lands in the store
  (`frontend/src/stores/useAppStore.ts`), but no component calls it and none renders `isFavorite`.
- Ingest always returns **empty tags**.

**Acceptance:** paste a Luogu URL → the problem is cached and listed offline; drop an OI PDF →
each detected problem becomes a record; restart the app with the network off and both still load.

## G — AI coach · Partial

`chat_with_ai` (`frontend/src-tauri/src/lib.rs`) → `ask_ai_coach`
(`frontend/src-tauri/src/ai.rs`): an empty key short-circuits to a hint, then a single
non-streaming `POST {base}/chat/completions` with `temperature 0.6`, `max_tokens 2048`, reading
`choices[0]`. The command also takes an optional `context` string, and the UI in
`frontend/src/components/ai/AiCoachPage.tsx` builds it: the bound problem's id / title / OJ /
difficulty with its `timeLimitMs` and `memoryLimitKb`, the current code (truncated), the last run's
`overallVerdict` / `totalTimeMs` / `maxMemoryKb`, the compiler output, and up to three non-AC cases —
an `MLE` case contributes its measured `memoryKb` instead of an output comparison, because its stdout
never took part in the judgement. Contest lock, the single `await`, and three prompt chips live in
the same component.

- **Persistence is implemented:** `load_chats` / `save_chats` (`lib.rs`) over
  `~/.oleride/chats.json` (`storage.rs`, length-capped and content-clamped); `AiCoachPage.tsx` loads
  on mount and saves after every reply, system messages excluded.
- Gaps: no streaming; the transcript is one flat list, not per-problem or per-session.

**Acceptance:** with a valid key, ask "why is case 3 WA" and get an answer that references the
user's actual code and failing case; restart the app and the conversation is still there.

## H — Settings · Implemented

Seven live `<Section>` blocks in `frontend/src/components/settings/SettingsPage.tsx`: 外观 (theme +
font size), 编译器 (compiler path / flags), 缺省源 (boilerplate), 比赛模式 (contest), AI 助手 (base /
key / model), 快捷键 (shortcuts) and 关于 (version, links, and the static Luogu privacy note). Theme
is also toggled from the rail (`frontend/src/components/common/ActivityBar.tsx`).

- Gaps: no `preferTerminalRun` and no `autoSave` toggle, although both fields exist in the store's
  settings defaults. The Luogu text in 关于 is static help and performs no fetch.

**Acceptance:** change theme, font size, compiler flags and AI model, restart → all four survive.

## I — Persistence · Implemented

`data_dir` (`frontend/src-tauri/src/storage.rs`) resolves `~/.oleride` from `dirs::home_dir()`, and
five files live there: `settings.json`, `problems.json`, `solves.json`, `sessions.json` and
`chats.json` (the AI transcript, length-capped and content-clamped on load). Frontend-side state
lives under the `localStorage` keys `olympia-practice-records`, `olympia-problem-files`,
`olympia-active-record`, `olympia-contest-end-time` and `olympia-saved-theme`
(`frontend/src/stores/useAppStore.ts`), plus the panel split keys `olympia-layout-horizontal` /
`olympia-layout-vertical` (`frontend/src/App.tsx`).

- Gap: there is no contest file and no mistakes file — nothing under `frontend/src-tauri/src` even
  names `mistakes.json`, so 错题本 still has no data layer.

**Acceptance:** delete `~/.oleride/settings.json`, restart → defaults are recreated without a crash.

## J — Contest mode · Partial — defect fixed 2026-09-13, pending manual acceptance

`frontend/src/components/common/ContestBar.tsx:11-30` (1 s countdown, auto-clear on expiry; label
`:63`; end-only `:159-162`); store field `frontend/src/stores/useAppStore.ts` (`contestEndTime`);
type `frontend/src/types/index.ts:147`. It really gates the AI coach
(`frontend/src/components/ai/AiCoachPage.tsx:44`) and a rail button
(`frontend/src/components/common/ActivityBar.tsx:16`).

- **Was a defect:** the deadline lived in memory only, so restarting mid-contest hid the
  countdown bar and unlocked the AI coach. **Fixed:** `setContestEndTime` now persists to the
  `olympia-contest-end-time` localStorage key; store init rehydrates it (falling back to a
  still-running `PracticeRecord.contestEndTime` for contests created before the key existed);
  clearing the deadline also nulls `contestEndTime` on every persisted practice record so a
  voluntary early exit cannot resurrect the contest on next launch.

**Acceptance:** start a 1.5 h contest → AI locks and the bar counts down; restart the app → the
contest is still running and the AI is still locked.

## K — OJ submission · **Absent**

`frontend/src-tauri/src/lib.rs` has no submit command at all: the `submit_problem` placeholder was
removed (it ignored `code` via `let _ = code;` and returned
`Ok(format!("Submitted {} successfully", problem_id))` unconditionally), and there is still no
wrapper in `frontend/src/services/tauriApi.ts`.

- The Luogu integration is read-only ingest; there is no credential store and no per-OJ adapter.

**Acceptance (when built):** submit a real solution to Luogu with stored credentials and read the
verdict back.

## L — Onboarding & toolchain · Partial — defect fixed 2026-09-13, pending manual acceptance

`frontend/src/components/common/OnboardingWizard.tsx:37-44` (detect), `:52,229-234` (one-click
install), six steps `:66-99`. Rust side: MinGW 13.1.0 pinned with sha256 and TUNA → download.qt.io
mirrors (`frontend/src-tauri/src/toolchain.rs:11-18`), one shared probe order in `first_compiler`:
explicit configured path → bundled → appdata → PATH → none, extraction to `~/.oleride/mingw64`
(`:199-210`).

- **Was a defect:** the theme block and the boilerplate block were both gated on `step === 2`,
  so step 3 rendered empty (and step 2 stacked both blocks). **Fixed:** the boilerplate block is
  now gated on `step === 3` (`OnboardingWizard.tsx:285`).

**Acceptance:** on a machine with no MinGW, the wizard downloads and verifies the toolchain, and all
six steps render content.

## Unwired commands (verified)

| Command | Evidence | State |
| --- | --- | --- |
| ~~`submit_problem`~~ | was in `frontend/src-tauri/src/lib.rs` | removed: the placeholder always reported success and had no caller |
| `runner::run_in_console` | `frontend/src-tauri/src/runner.rs`; registered in the `invoke_handler` list in `lib.rs` | parked on purpose: `runCodeAction` (`frontend/src/stores/useAppStore.ts`) keeps terminal mode hidden until the focus/interaction defects are fixed, and `tauriApi.runConsole` is never called |
| `toggle_favorite_problem` | `frontend/src-tauri/src/lib.rs` (`fn toggle_favorite_problem`), store `toggleFavorite` in `useAppStore.ts` | store action exists, no component calls it. `Problem` **does** have the field on both sides (`is_favorite` in `models.rs`, `isFavorite` in `frontend/src/types/index.ts`), so favourites round-trip as soon as something renders a star |
| `get_sessions` / `save_sessions_list` | `frontend/src-tauri/src/lib.rs`, wrappers `getSessions` / `saveSessionsList` in `services/tauriApi.ts` | callerless (`training` tab is unbuilt) |

`grep -r "TODO\|FIXME\|unimplemented!()" frontend/src-tauri/src` returns nothing. The one
explicitly-unsupported path left is the legacy `_feInjection` fallback in
`frontend/src-tauri/src/ingest.rs`, which returns a "not supported" error instead of parsing.

## Cross-Cutting Rules

- **Acceptance bars must be runnable.** A bar that names a command has to pass as the machine is
  configured; a bar that names a deleted path is a bug in this document.
- **Docs parity:** a new user-visible surface adds or updates its doc, plus its status row in
  `docs/README.md`.
- **Theme parity:** every surface must work under both `[data-theme]` values before it is called
  Implemented.
- **Verification suite** (the full-app bar):
  - `cd frontend && npm run build && npm run lint && npm run notices:check`
  - `cd frontend/src-tauri && cargo check --all-targets && cargo test --lib`
