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
| C | Compile & run pipeline | Partial — no MLE, fake memory, no child kill |
| D | Terminal | Partial — `run_in_console` unwired |
| E | Stress tester (对拍器) | Implemented |
| F | Problem library, Luogu ingest, PDF import | Partial — search/filter is dead code |
| G | AI coach | Partial — no streaming, no persistence, no context injection |
| H | Settings | Implemented |
| I | Persistence | Implemented |
| J | Contest mode | Partial + **defect** (deadline not rehydrated) |
| K | OJ submission | **Absent** |
| L | Onboarding & toolchain | Partial + **defect** (step 3 renders empty) |

---

## A — Shell & navigation · Partial

`NavTab = 'editor' | 'problems' | 'ai' | 'settings' | 'stress'`
(`frontend/src/types/index.ts:173`); all five render from `frontend/src/App.tsx:124,198,211,224,237`,
driven by `frontend/src/components/common/ActivityBar.tsx:10-13,84-95`.

- Two themes only: `ThemeType = 'OneDarkPro' | 'GitHubLight'`
  (`frontend/src/types/index.ts:56`), applied through `data-theme`
  (`frontend/src/stores/useAppStore.ts:387,400`). The documented AmberDark / AmberLight pair
  was never ported.
- **Dead code:** `frontend/src/components/training/TrainingPage.tsx:10` (zero importers) and
  `frontend/src/components/common/TitleBar.tsx:4` (returns `null`, unimported).

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

`run_code` (`frontend/src-tauri/src/lib.rs:72-81`) → `execute_code`
(`frontend/src-tauri/src/runner.rs:127`), per-case verdicts surfaced by
`frontend/src/components/runner/RunnerPanel.tsx:255-278`.

- Verdicts are bare `String` literals — `"CE"` `:148`, `"RE"` `:179`, `"AC"` `:231`,
  `"WA"` `:237`, `"TLE"` `:273`. There is **no `MLE`** and no enum.
- Timeout is a 1000 ms `tokio::time::timeout` (`frontend/src-tauri/src/runner.rs:155,198`).
- `memory_kb` is hard-coded `1024` (`:215`, `:247`, and `max_mem = max_mem.max(1024)` at `:282`),
  so `max_memory_kb` is always 1024 — memory is never measured.
- On timeout the case is dropped **without killing the child process**: there is no
  `Child::kill` and no job object anywhere in `runner.rs`.
- No computed diff — the panel shows raw expected/actual panes.

**Acceptance:** `cd frontend/src-tauri && cargo test --lib` passes; `Ctrl+R` on a real `main.cpp`
against a problem's samples reports the expected AC / WA / TLE / RE / CE per case.

## D — Terminal · Partial

`frontend/src/components/terminal/TerminalPanel.tsx:54,64,75` keeps a persistent `cmd /K` session
via the shell plugin; `run_terminal_command` is a one-shot PowerShell
(`frontend/src-tauri/src/runner.rs:299-339`).

- **Gap:** `run_in_console` — the Dev-C++ style console window
  (`frontend/src-tauri/src/runner.rs:101-125`, `CREATE_NEW_CONSOLE`) — has **no frontend caller**;
  the typed wrapper `runConsole` (`frontend/src/services/tauriApi.ts:177`) is never invoked, and
  `triggerTerminalRun` (`frontend/src/stores/useAppStore.ts:663`) is missing from the store's
  `AppState` and never called.
- **Gap:** no PTY and no timeout on the one-shot command.

**Acceptance:** type a command in the terminal panel and see its output; a long-running command can
be interrupted.

## E — Stress tester (对拍器) · Implemented

`frontend/src-tauri/src/stress.rs` (solution/brute/generator at `:133,149,165`, rounds loop
`:184`, counterexample capture `:214-221`, reporting `:253-262`), UI at
`frontend/src/components/stress/StressTesterPage.tsx:75-86` (round presets 10/30/50/100/500),
store wiring `frontend/src/stores/useAppStore.ts:638-660`.

- Gap: no free-text rounds field.
- **Note:** stress defaults are `-O2 -std=c++17 -Wall` with a **3000 ms generator** budget vs
  **2000 ms** for solution and brute (`frontend/src-tauri/src/stress.rs:123-130,180-186`), whereas
  the judge allows 1000 ms. A stress verdict is therefore *not* directly comparable to a judge
  verdict — a solution that TLEs under the judge can still "pass" a stress round.

**Acceptance:** feed a wrong solution + a brute force + a generator → the app reports a
counterexample input with both outputs.

## F — Problem library, Luogu ingest, PDF import · Partial

Seed and store in `frontend/src-tauri/src/storage.rs:38-79` (`problems.json`, seeded with P1001);
Luogu fetch in `frontend/src-tauri/src/ingest.rs:28-157` behind `fetch_problem_online`
(`frontend/src-tauri/src/lib.rs:34-37`); favourite toggle at `frontend/src-tauri/src/lib.rs:39-47`;
Markdown + KaTeX rendering and PDF import in
`frontend/src/components/viewer/ProblemViewerPanel.tsx:74,407`; PDF text/`pdfjs-dist` extraction with
contest-style boundary heuristics in `frontend/src/services/pdfExtract.ts:1,19-20`.

- **Search/filter is dead.** `setSearchQuery` / `setSelectedDifficulty`
  (`frontend/src/stores/useAppStore.ts:162-163,759-760`) have zero call sites and no input renders
  them — `ProblemsPage.tsx`'s only text input is the Luogu dialog at `:216`.
- **Favourites are unreachable:** the command exists and `toggleFavorite` lands in the store
  (`frontend/src/stores/useAppStore.ts:739`), but no component calls it.
- Ingest always returns **empty tags**.

**Acceptance:** paste a Luogu URL → the problem is cached and listed offline; drop an OI PDF →
each detected problem becomes a record; restart the app with the network off and both still load.

## G — AI coach · Partial

`chat_with_ai` (`frontend/src-tauri/src/lib.rs:119-131`) → `frontend/src-tauri/src/ai.rs`: an empty
key short-circuits to a hint (`:16-21`), then a single non-streaming
`POST {base}/chat/completions` with `temperature 0.6`, `max_tokens 2048`
(`:23-35`), reading `choices[0]` (`:51-63`). UI in `frontend/src/components/ai/AiCoachPage.tsx`
(contest lock `:44-65`, one `await` `:95-102`, three prompt chips `:122-135`).

- Gaps: no streaming; no conversation persistence (plain component state — nothing is written to
  `~/.oleride`); test/judge results are never injected into the prompt.

**Acceptance:** with a valid key, ask "why is case 3 WA" and get an answer that references the
user's actual code and failing case.

## H — Settings · Implemented

Seven live blocks in `frontend/src/components/settings/SettingsPage.tsx:156` (contest),
`:232` (theme), `:311` (boilerplate), `:374` (compiler), `:422` (Luogu notes), `:442` (AI),
`:499` (typography); compiler path/flags `:396,411-413`, AI base/key/model `:464,477,490`,
contest presets `:189-213`; theme is also toggled from the rail
(`frontend/src/components/common/ActivityBar.tsx:69-82`).

- Gaps: no `preferTerminalRun` and no `autoSave` toggle, although both fields exist in the store.
  The Luogu block (`:437-439`) is static help text and performs no fetch.

**Acceptance:** change theme, font size, compiler flags and AI model, restart → all four survive.

## I — Persistence · Implemented

`frontend/src-tauri/src/storage.rs:4-11` resolves `~/.oleride` from `dirs::home_dir()`, then
`settings.json` `:13-30`, `problems.json` `:62-79`, `solves.json` `:81-96`, `sessions.json`
`:98-113`. Frontend-side state lives under `localStorage` keys `olympia-practice-records`,
`olympia-active-record`, `olympia-saved-theme` (`frontend/src/stores/useAppStore.ts:16,17,169`) and
the panel layout keys `olympia-layout-*` (`frontend/src/App.tsx:35-36`).

- Gap: there is no chats file and no contest file. Nothing writes `mistakes.json` — the data layer
  covers four files only.

**Acceptance:** delete `~/.oleride/settings.json`, restart → defaults are recreated without a crash.

## J — Contest mode · Partial — **verified defect**

`frontend/src/components/common/ContestBar.tsx:11-30` (1 s countdown, auto-clear on expiry; label
`:63`; end-only `:159-162`); store field `frontend/src/stores/useAppStore.ts:176-177`; type
`frontend/src/types/index.ts:147`. It really gates the AI coach
(`frontend/src/components/ai/AiCoachPage.tsx:44`) and a rail button
(`frontend/src/components/common/ActivityBar.tsx:16`).

- **Defect:** the deadline lives in memory only. It is never rehydrated at startup, even though
  `PracticeRecord.contestEndTime` is persisted (`frontend/src/components/viewer/ProblemViewerPanel.tsx:110-114`)
  — so restarting the app mid-contest hides the countdown bar and **unlocks the AI coach**.

**Acceptance:** start a 1.5 h contest → AI locks and the bar counts down; restart the app → the
contest is still running and the AI is still locked.

## K — OJ submission · **Absent**

`frontend/src-tauri/src/lib.rs:166-171` is an explicit placeholder: it ignores `code`
(`let _ = code;`) and returns `Ok(format!("Submitted {} successfully", problem_id))`
unconditionally. There is no frontend call path at all — no wrapper in
`frontend/src/services/tauriApi.ts`.

- The Luogu integration is read-only ingest; there is no credential store and no per-OJ adapter.

**Acceptance (when built):** submit a real solution to Luogu with stored credentials and read the
verdict back.

## L — Onboarding & toolchain · Partial — **verified defect**

`frontend/src/components/common/OnboardingWizard.tsx:37-44` (detect), `:52,229-234` (one-click
install), five steps `:66-99`. Rust side: MinGW 13.1.0 pinned with sha256 and TUNA → download.qt.io
mirrors (`frontend/src-tauri/src/toolchain.rs:11-18`), probe order
bundled → appdata → configured → PATH → none (`:75-94`), extraction to `~/.oleride/mingw64`
(`:199-210`).

- **Defect:** the theme block and the boilerplate block are both gated on `step === 2`
  (`OnboardingWizard.tsx:250,285`), so **step 3 renders empty** on a fresh install.

**Acceptance:** on a machine with no MinGW, the wizard downloads and verifies the toolchain, and all
five steps render content.

## Unwired commands (verified)

| Command | Evidence | State |
| --- | --- | --- |
| `submit_problem` | `frontend/src-tauri/src/lib.rs:166-171` | placeholder |
| `runner::run_in_console` | `frontend/src-tauri/src/runner.rs:101-125` | no caller |
| `toggle_favorite_problem` | `frontend/src-tauri/src/lib.rs:39-47`, store `useAppStore.ts:739` | no UI caller |
| `get_sessions` / `save_sessions_list` | `frontend/src-tauri/src/lib.rs:63-68`, store `useAppStore.ts:88,92` | callerless (`training` tab is unbuilt) |
| `triggerTerminalRun` | `frontend/src/stores/useAppStore.ts:663` | absent from `AppState`, never called |

`grep -r "TODO\|FIXME\|unimplemented!()" frontend/src-tauri/src` returns nothing: the only known
placeholders are the two explicit comments at `frontend/src-tauri/src/lib.rs:168-169` and
`frontend/src-tauri/src/ingest.rs:66`.

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
