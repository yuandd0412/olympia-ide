# Olympia IDE — Project Agent Guide

> Repo folder `oler-ide-v2` keeps the legacy v2 codename; the product name everywhere user-facing is **Olympia IDE**.

## Project at a Glance
Desktop OI (Olympiad in Informatics) coding IDE: dark-mode-first, information-dense, built-in compile/run pipeline, problem ingest, stress tester, and AI coach.

- `frontend/` — Tauri 2 + React 19 + TypeScript desktop app. The single mainline (all work lands here).
- The early Qt 6.8/C++17 foundation implementation was removed from the mainline (tag `qt-foundation` preserves it; its build lessons live in `docs/07-risks/`).

## Conventions
- Project root stays ASCII (`D:\oler-ide-v2`) — never introduce CJK paths in build tooling.
- "Done" is defined by user confirmation on a real machine OR automated tests passing — never by the assistant's own confidence.

## Frontend (Tauri) Line
- Location: `frontend/`. Stack: Tauri 2.x · React 19 · TypeScript · Vite · Monaco Editor (`@monaco-editor/react`) · xterm.js · Zustand store · Tailwind CSS 4 · framer-motion.
- Dev loop: `cd frontend && npm install && npm run tauri dev` (launches Vite dev server + the Tauri window).
- Frontend-only checks: `npm run build` (tsc typecheck + vite build); `npm run lint` (oxlint).
- Rust backend crate: `frontend/src-tauri` (package `app`, lib target `app_lib`, smoke bin `test_ingest`). Modules: `ingest.rs` / `runner.rs` / `stress.rs` / `storage.rs` / `models.rs` / `ai.rs` / `toolchain.rs`.
- Generated dirs are gitignored — never commit them: `frontend/node_modules`, `frontend/dist`, `frontend/src-tauri/target`, `frontend/src-tauri/vendor` (vendored toolchain).
- Pitfall: files parsed by Tauri's config/capability system (e.g. `src-tauri/capabilities/default.json`) must be plain UTF-8 WITHOUT BOM — a stray BOM broke capability parsing once (fix commit `ff23c92`). Same class of bug caused the UTF-8 mojibake sweep across components (commit `20a2267`); the throwaway repair scripts live archived under `scripts/oneoff/`.
- Known lint debt (2026-08-27): 6 residual oxlint warnings are INTENTIONAL — do not "fix" them mechanically.
  - `react(purity)` ×3 (`Date.now()` during render in ActivityBar / AiCoachPage gate logic): a pure fix needs a ticking contest-clock source or a store-level expiry sweep; replacing with `contestEndTime !== null` alone would leave the AI lock engaged forever after a restart past an expired persisted deadline.
  - `react(set-state-in-effect)` ×3 (ContestBar countdown and similar timer syncs): existing pattern works; converting to derived state changes render timing of the countdown.

### Toolchain Strategy (Dual Installer)
- **Slim** (`npm run tauri build`, ~6 MB): on first run the onboarding wizard offers a one-click download of pinned MinGW 13.1.0 via `src-tauri/src/toolchain.rs` — TUNA mirror with download.qt.io fallback, sha256-verified, extracted to `~/.oleride/mingw64`. `detect_toolchain` probes bundled resource → appdata → configured path → PATH, in that order.
- **Full** (`npm run tauri:full`, ~49 MB): strips the vendored toolchain first (`python scripts/strip-toolchain.py` — gdb/opt/Fortran/LTO out; `liblto_plugin.dll` must STAY, the linker requires it on every link), then embeds `src-tauri/vendor/mingw64/` as a bundle resource.
- The two NSIS outputs share a filename (same productName); the full build auto-renames via `frontend/scripts/rename-full-installer.mjs` (version read from `tauri.conf.json`). Run slim LAST, or it gets overwritten.
- Publishing: `website/DEPLOY.md` — Pages (site + slim) on `olympia.dpdns.org`, full installer on GitHub Releases.

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
