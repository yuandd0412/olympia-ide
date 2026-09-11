# Olympia IDE — Project Agent Guide

> Repo folder `oler-ide-v2` keeps the legacy v2 codename; the product name everywhere user-facing is **Olympia IDE**.

## Project at a Glance
Desktop OI (Olympiad in Informatics) coding IDE: dark-mode-first, information-dense, built-in compile/run pipeline, problem ingest, stress tester, and AI coach.

- `frontend/` — Tauri 2 + React 19 + TypeScript desktop app. The single mainline (all work lands here).
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
- Location: `frontend/`. Stack: Tauri 2.x · React 19 · TypeScript · Vite · Monaco Editor (`@monaco-editor/react`) · xterm.js · Zustand store · Tailwind CSS 4 · framer-motion.
- Dev loop: `cd frontend && npm install && npm run tauri dev` (launches Vite dev server + the Tauri window).
- Frontend-only checks: `npm run build` (tsc typecheck + vite build); `npm run lint` (oxlint).
- Rust backend checks: `cd frontend/src-tauri && cargo check --all-targets` and `cargo test --lib` (the `storage::tests::seed_text_is_intact` guard runs here).
- Rust backend crate: `frontend/src-tauri` (package `app`, lib target `app_lib`, smoke bin `test_ingest`). Modules: `ingest.rs` / `runner.rs` / `stress.rs` / `storage.rs` / `models.rs` / `ai.rs` / `toolchain.rs`.
- Generated dirs are gitignored — never commit them: `frontend/node_modules`, `frontend/dist`, `frontend/src-tauri/target`, `frontend/src-tauri/vendor` (vendored toolchain).
- Pitfall: files parsed by Tauri's config/capability system (e.g. `src-tauri/capabilities/default.json`) must be plain UTF-8 WITHOUT BOM — a stray BOM broke capability parsing once (fix commit `ff23c92`). Same class of bug caused the UTF-8 mojibake sweep across components (commit `20a2267`); the throwaway repair scripts live archived under `scripts/oneoff/`.
- Encoding pitfall (root cause, 2026-09-10): the damaged text was **GBK bytes that got read as UTF-8**, which is lossy — every affected character froze into `U+FFFD` and cannot be recovered from git (verified: both historical blobs of `storage.rs` already carry the damage). Commit `20a2267` missed `src-tauri/src/`; `storage.rs` (the fresh-install P1001 seed) and one comment in `lib.rs` were repaired by hand, and `storage::tests::seed_text_is_intact` now guards the seed. To detect a recurrence, grep for `\x{FFFD}` — a plain-text console read will NOT show it (this shell is Windows PowerShell 5.1, whose `Get-Content` defaults to cp936 and renders any UTF-8 Chinese as mojibake). Rust sources in this repo are commented in English.
- Known lint debt (2026-09-10): 7 residual oxlint warnings are INTENTIONAL — do not "fix" them mechanically.
  - `react(purity)` ×3 (`Date.now()` during render): `activityBar` gate logic in `ActivityBar.tsx:16`, `AiCoachPage.tsx:44`, `RunnerPanel.tsx:34`. A pure fix needs a ticking contest-clock source or a store-level expiry sweep; replacing with `contestEndTime !== null` alone would leave the AI lock engaged forever after a restart past an expired persisted deadline.
  - `react(set-state-in-effect)` ×4: `ContestBar.tsx:13` (countdown and similar timer syncs — existing pattern works; converting to derived state changes render timing), `OnboardingWizard.tsx:39`, `SettingsPage.tsx:96`, `SettingsPage.tsx:134`.

### Toolchain Strategy (Dual Installer)
- **Slim** (`npm run tauri build`, ~6 MB): on first run the onboarding wizard offers a one-click download of pinned MinGW 13.1.0 via `src-tauri/src/toolchain.rs` — TUNA mirror with download.qt.io fallback, sha256-verified, extracted to `~/.oleride/mingw64`. `detect_toolchain` probes bundled resource → appdata → configured path → PATH, in that order.
- **Full** (`npm run tauri:full`, ~49 MB): strips the vendored toolchain first (`python scripts/strip-toolchain.py` — gdb/opt/Fortran/LTO out; `liblto_plugin.dll` must STAY, the linker requires it on every link), then embeds `src-tauri/vendor/mingw64/` as a bundle resource.
- The two NSIS outputs share a filename (same productName); the full build auto-renames via `frontend/scripts/rename-full-installer.mjs` (version read from `tauri.conf.json`). Run slim LAST, or it gets overwritten.
- Publishing: `website/DEPLOY.md` — Pages (site + slim) on `olympia.dpdns.org`, full installer on GitHub Releases.
- Third-party notices: `frontend/src-tauri/THIRD-PARTY-NOTICES.md` ships as a bundle resource in BOTH installers (`bundle.resources` array in `tauri.conf.json`, object form in `tauri.full.conf.json` — the full config must re-list the notices because its object replaces the base array). Its appendix is generated from `package-lock.json`: run `cd frontend && npm run notices` after any dependency change, `npm run notices:check` to detect staleness. Never hand-edit the appendix.
- The notices appendix deliberately over-lists (dev-only and foreign-platform binaries such as `@oxlint/binding-*` are included); under-listing is the compliance risk, noise is not.

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
