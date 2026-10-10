# Olympia IDE — Project Agent Guide

> Repo folder `oler-ide-v2` keeps the legacy v2 codename; the product name everywhere user-facing is **Olympia IDE**.

## Project at a Glance
Desktop OI (Olympiad in Informatics) coding IDE: dark-mode-first, information-dense, built-in compile/run pipeline, problem ingest, stress tester, and AI coach.

- `frontend/` — Tauri 2 + React 19 + TypeScript desktop app. The single mainline for the desktop product.
- `oss/` — the **Olympia IDE** VS Code fork (product `Olympia`, base 1.140.0). It is a second shipping product, not a vendored dependency: it carries three self-written built-in extensions (`olympia-onboarding`, `olympia-contest`, `olympia-coach`) and the whole Chinese-localized workbench.
- The early Qt 6.8/C++17 foundation implementation was removed from the mainline (tag `qt-foundation` preserves it; its build lessons live in `docs/07-risks/`).

## Conventions
- Project root stays ASCII (`D:\oler-ide-v2`) — never introduce CJK paths in build tooling.
- "Done" is defined by user confirmation on a real machine OR automated tests passing — never by the assistant's own confidence.

## Documentation Map
- `AGENTS.md` (this file) + repo-root `README.md` are the contract for how the Tauri mainline is built and shipped. `docs/` is **partially historical**.
- `docs/` was written for the removed Qt 6.8 / C++17 line (tag `qt-foundation`, deleted in commit `b3292ee`). Read it for **design intent only** — never for build commands, class names, or file paths. `docs/README.md` carries a per-doc status table (Binding / Intent / Partial / Unbuilt / Historical); trust that table over any "Status: DONE" line inside a doc body.
- `docs/08-roadmap/phases.md` is the live, code-verified status of the Tauri app (rewritten 2026-09-10) — read it before planning feature work; it lists the known defects and unwired commands.
- `docs/07-risks/v1-lessons.md` is the one still-binding doc (ASCII project root, PowerShell 5.1 quirks).

## Frontend (Tauri) Line
- Location: `frontend/`. Stack: Tauri 2.x · React 19 · TypeScript · Vite · Monaco Editor (`@monaco-editor/react`) · Zustand store · Tailwind CSS 4 · framer-motion. (xterm.js and the integrated terminal were removed in v0.1.0.)
- Dev loop: `cd frontend && npm install && npm run tauri dev` (launches Vite dev server + the Tauri window).
- Frontend-only checks: `npm run build` (tsc typecheck + vite build); `npm run lint` (oxlint).
- Rust backend checks: `cd frontend/src-tauri && cargo check --all-targets` and `cargo test --lib`.
- Rust backend crate: `frontend/src-tauri` (package `app`, lib target `app_lib`, smoke bin `test_ingest`). Modules: `ai.rs` / `enrich.rs` / `ingest.rs` / `models.rs` / `multi_oj.rs` / `pdf_extract.rs` / `practice.rs` / `runner.rs` / `storage.rs` / `stress.rs` / `toolchain.rs`.
- Judge memory: peak working set is sampled through `runner::ProcessHandle`, an `OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ)` handle taken while the child is still alive. `tokio::process::Child` closes its own handle as soon as `wait()` reaps the process, so sampling afterwards returns nothing — a measured 0 KB means "not measured" (rendered `未测得` via `memoryLabel`) and must never escalate to MLE.
- External UI capabilities go through ports: `src/ports/{editor,layout,document,motion}` are the stable interfaces; `src/adapters/**` holds the third-party implementations (Monaco, react-resizable-panels, react-markdown+KaTeX, PDF extraction). Code under `components/**` must NOT import `@monaco-editor/react`, `monaco-editor`, `react-resizable-panels`, `react-markdown`, `remark-math`, `rehype-katex`, `katex` or `pdfjs-dist` directly, must not leak third-party types into props, and must reuse `ports/motion` tokens instead of ad-hoc easing curves. Grep acceptance: `grep -rn "@monaco-editor/react\|monaco-editor\|react-resizable-panels\|react-markdown\|remark-math\|rehype-katex\|katex\|pdfjs-dist" frontend/src/components` returns no import lines.
- Generated dirs are gitignored — never commit them: `frontend/node_modules`, `frontend/dist`, `frontend/src-tauri/target`, `frontend/src-tauri/vendor` (vendored toolchain).
- Fresh installs start with an EMPTY problem library (the old P1001 seed was removed); `problems.json` is created on first save.
- Pitfall: files parsed by Tauri's config/capability system (e.g. `src-tauri/capabilities/default.json`) must be plain UTF-8 WITHOUT BOM — a stray BOM broke capability parsing once (fix commit `ff23c92`). Same class of bug caused the UTF-8 mojibake sweep across components (commit `20a2267`); the throwaway repair scripts live archived under `scripts/oneoff/`.
- Encoding pitfall (root cause, 2026-09-10): the damaged text was **GBK bytes that got read as UTF-8**, which is lossy — every affected character froze into `U+FFFD` and cannot be recovered from git. To detect a recurrence, grep for `\x{FFFD}` — a plain-text console read will NOT show it (this shell is Windows PowerShell 5.1, whose `Get-Content` defaults to cp936 and renders any UTF-8 Chinese as mojibake). Rust sources in this repo are commented in English.
- Known lint debt (updated 2026-10-10): 4 residual oxlint warnings are INTENTIONAL — do not "fix" them mechanically.
  - `react(purity)` ×2 (`Date.now()` during render): `ActivityBar.tsx:17`, `AiCoachPage.tsx:59`. A pure fix needs a ticking contest-clock source or a store-level expiry sweep; replacing with `contestEndTime !== null` alone would leave the AI lock engaged forever after a restart past an expired persisted deadline.
  - `react(set-state-in-effect)` ×2: `ContestBar.tsx:17` (countdown and similar timer syncs — existing pattern works; converting to derived state changes render timing), `OnboardingWizard.tsx:50` (toolchain detection).
  - The two former `SettingsPage` warnings (purity + form sync) were eliminated by the settings-form refactor, not by mechanical fixes, and the wizard's `exhaustive-deps` warning on the Escape handler went away by memoising `handleSkip` rather than by ignoring the rule.

### Toolchain Strategy (Single Full Installer)
- **Single distribution** (`npm run tauri build`, ~49 MB): every installer embeds the stripped `src-tauri/vendor/mingw64/` as a bundle resource next to the exe (`bundle.resources` map form — the mixed string+object array form silently drops the map entry). The slim variant and `tauri.full.conf.json` / rename script were removed.
- **Vendor preparation**: after re-vendoring a fresh 7z, run `python scripts/strip-toolchain.py` FIRST — gdb/opt/Fortran/LTO out; `liblto_plugin.dll` must STAY (the linker requires it on every link). Unstripped, the installer exceeds Gitee's 100 MB attachment limit.
- `detect_toolchain` in `src-tauri/src/toolchain.rs` probes bundled resource → `~/.oleride/mingw64` → configured path → PATH, in that order; the onboarding wizard offers a one-click pinned MinGW 13.1.0 download (TUNA mirror, sha256-verified) when nothing is found.
- Publishing: `website/DEPLOY.md` — Pages (site + installer) on `olympia.dpdns.org`, installer mirrored on Gitee/GitHub Releases.
- Legal: `THIRD-PARTY-NOTICES.md` ships next to the exe (GPL-3 source links for the toolchain included); regenerate its npm appendix with `npm run notices` after any dependency change, `npm run notices:check` to detect staleness. Never hand-edit the appendix.

## VS Code Fork (`oss/`) Line
- Build: `build/oss-package.ps1` runs the four stages (bundle → toolchain → package → node-compile-cache) that produce the unpacked product in `VSCode-win32-x64/` and the installer. `build/oss-compile.ps1` / `build/oss-ci.ps1` are the shorter compile and verify paths.
- **`oss/` is an embedded git repository.** The outer repo cannot track anything inside it and `.gitignore` negations do not help; fork-side history is committed inside `oss/` itself. No identity is configured there, so pass it inline (`git -C oss -c user.name=… -c user.email=… commit …`) and never write to any git config.
- Localisation rewrites files in place; no language pack is registered, so the workbench locale stays `en`. `build/apply-zh-cn-ast.mjs` translates NLS literals in `oss/src` from the dictionaries `build/zh-cn-dict-*.mjs`; `build/gen-ext-nls-from-langpack.mjs` rewrites each bundled extension's `package.nls*.json` from the official zh-hans donor pack; `build/audit-*.mjs` verify the result (brand leftovers, placeholder damage, key collisions). Re-run the generators after an upstream merge — `node build/audit-brand-leftovers.mjs` must report zero hits in the shipped tree.
- A new built-in extension must be added to the **hardcoded** `compilations` array in `oss/build/gulpfile.extensions.ts`: upstream's glob discovery there is commented out, so an unlisted extension compiles correctly and still ships absent.
- Upstream `hygiene` (the husky pre-commit hook inside `oss/`) enforces the Microsoft 4-line copyright header, a non-ASCII guard, an indentation guard and TS-language-service formatting. Fork-authored exceptions belong in `oss/build/filters.ts` (already exempts `extensions/olympia-*/**` for unicode and the contest template file for indentation) — extend that list instead of silencing guards line by line.
- The residual translation gap is measurable rather than folklore: run `python ../scripts/oneoff/nls-gap-scan.py` from `oss/` to count `localize*` default messages that still contain no CJK. As of 2026-10-10 it reports 4,457, and `scripts/oneoff/nls-gap-split.py` classifies them: **4,175 sit in the AI subsystems** (`vs/workbench/contrib/chat` 1,847, `vs/sessions` 1,473, `vs/platform/agentHost` 657, plus `agentsVoice`, `mcp`, `browserView`, `agentFinder`, `customizationMarketplace`), leaving **282 outside them** — the largest groups being `contrib/github` 38 (that extension is not shipped, so unreachable), `contrib/onboarding` 36, `workbench/services/policies` 21, `platform/theme` 14. Prioritise by area and by whether the surface is reachable in this product, never by the total count.
- Pitfall: never point `product.json`'s `defaultChatAgent.chatExtensionId` or `.extensionId` at `olympia.coach`. `ensureChatExtensionInitialDisabledState` (`oss/src/vs/workbench/services/extensionManagement/browser/extensionEnablementService.ts:155-190`) silently and *persistently* disables any built-in whose id equals `chatExtensionId` until chat setup is completed, and `_isDisabledByUnification` (`:663`, reached from `:504`) disables `extensionId` while `chat.extensionUnification.enabled` is on. `olympia-coach` therefore ships as an ordinary built-in that registers a chat participant, and the leftover `olympia.olympia-coach` ids are deliberate: every core consumer of the remaining `defaultChatAgent` fields either catches the missing command (e.g. `chatSetup.ts:126`) or is gated on `ChatContextKeys.Setup.installed`, which the phantom id keeps false.

## Release & Publishing
- Site: <https://olympia.dpdns.org> (Cloudflare Pages, project `olympia-ide`); repo: <https://github.com/yuandd0412/olympia-ide>.
- Portable `gh` CLI lives at `build/tools/bin/gh.exe` (gitignored); auth via `gh auth login`.

## File Deletion Rules
- The assistant MUST NEVER run `Remove-Item` / `rm` / `del` / `Move-Item to /dev/null` directly.
- For recursive deletes, suggest `cmd /c rmdir /s /q <ASCII-absolute-path>` and let the user run it — PowerShell `Remove-Item` is blocked by the desktop permission gate (Wipe category).
- `cmd /c rmdir /s /q` uses the .NET API and is NOT blocked by the gate.

## Per-Step Self-Check
- Report at the end of every research/design/implementation step, then wait for approval before continuing.
- Irreversible actions (kill process / delete file / rewrite git history) require explicit user confirmation every time.

## License
MIT (see `LICENSE`).
