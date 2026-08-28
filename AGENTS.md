# Olympia IDE — Project Agent Guide

> Repo folder `oler-ide-v2` keeps the legacy v2 codename; the product name everywhere user-facing is **Olympia IDE**.

## Project at a Glance
Desktop OI (Olympiad in Informatics) coding IDE: dark-mode-first, information-dense, built-in compile/run pipeline, problem ingest, stress tester, and AI coach. The repo carries TWO codebases:

- `frontend/` — Tauri 2 + React 19 + TypeScript desktop app. **Current development mainline** (all recent work lands here).
- `src/` + `tests/` — Qt 6.8 + C++17 foundation implementation, kept as reference implementation and regression baseline (7 ctest suites).

## Paths and Directories
- Project root: `D:\oler-ide-v2` (ASCII only — never use CJK paths; `moc`/`rcc`/`qmake` are broken on CJK paths in Qt 6.8.0)
- Build: `D:\oler-ide-v2\build\` (gitignored)
- Vendor: `D:\oler-ide-v2\third_party\` (gitignored, re-clonable)
- Qt: `C:\Qt\6.8.0\mingw_64\`
- MinGW: `C:\Qt\Tools\mingw1310_64\bin\` (Qt-bundled, ABI-matched to Qt 6.8.0 prebuilt)

## Frontend (Tauri) Line
- Location: `frontend/`. Stack: Tauri 2.x · React 19 · TypeScript · Vite · Monaco Editor (`@monaco-editor/react`) · xterm.js · Zustand store · Tailwind CSS 4 · framer-motion.
- Dev loop: `cd frontend && npm install && npm run tauri dev` (launches Vite dev server + the Tauri window).
- Frontend-only checks: `npm run build` (tsc typecheck + vite build); `npm run lint` (oxlint).
- Rust backend crate: `frontend/src-tauri` (package `app`, lib target `app_lib`, smoke bin `test_ingest`). Modules mirror the Qt core layout: `ingest.rs` / `runner.rs` / `stress.rs` / `storage.rs` / `models.rs` / `ai.rs`.
- Generated dirs are already gitignored — never commit them: `frontend/node_modules`, `frontend/dist`, `frontend/src-tauri/target`.
- Tests: no Rust unit tests yet; `cargo run --bin test_ingest` (cwd `frontend/src-tauri`) is an ingest smoke test. UI verification is manual for now.
- Pitfall: files parsed by Tauri's config/capability system (e.g. `src-tauri/capabilities/default.json`) must be plain UTF-8 WITHOUT BOM — a stray BOM broke capability parsing once (fix commit `ff23c92`). Same class of bug caused the UTF-8 mojibake sweep across components (commit `20a2267`); the throwaway repair scripts live archived under `scripts/oneoff/`.
- Known lint debt (2026-08-27): 6 residual oxlint warnings are INTENTIONAL — do not "fix" them mechanically.
  - `react(purity)` ×3 (`Date.now()` during render in ActivityBar / AiCoachPage / StatusBar-era gate logic): a pure fix needs a ticking contest-clock source or a store-level expiry sweep; replacing with `contestEndTime !== null` alone would leave the AI lock engaged forever after a restart past an expired persisted deadline.
  - `react(set-state-in-effect)` ×3 (ContestBar countdown and similar timer syncs): existing pattern works; converting to derived state changes render timing of the countdown.

## ABI Strict Rules
- Qt 6.8.0 prebuilt is compiled with MinGW 13.1.0; toolchain MUST be 13.1.0.
- System `D:\OI\mingw64\bin\` is MinGW 16.1.0 (UCRT) — ABI-incompatible. Causes `0xC0000374` heap corruption.
- Strawberry `C:\Strawberry\c\bin\` is MinGW 13.2.0 — ABI-incompatible.
- Every CMake call MUST pass explicitly:
  `-DCMAKE_CXX_COMPILER=C:/Qt/Tools/mingw1310_64/bin/g++.exe`

## Lessons Learned from v1
1. `WIN32_EXECUTABLE` MUST be `FALSE` under MinGW 13.1.0 — `libQt6EntryPoint.a` references `__imp___argc`.
2. Vendor route: `add_subdirectory(third_party/...)` with `EXCLUDE_FROM_ALL`; do NOT depend on `FetchContent`.
3. KSyntax 6.x `Repository` has no static `instance()` — must use `new Repository()` (ctor takes no parent).
4. `Q_PROPERTY` pointer types MUST be forward-declared, not fully included (Qt 6 moc requirement).
5. `QMenu::addAction` 4-arg overload was removed in Qt 6; use the 2-arg form.
6. `addDockWidget` cannot be a child of `QTabWidget`.
7. `stdin` is a `stdio.h` macro; it cannot be a Qt property name — rename to `stdinText`.
8. `Q_GADGET` cannot be repeated; two structs both marked `Q_GADGET` re-define `staticMetaObject`.
9. CJK paths break `moc.exe` (Qt 6.8.0 MinGW): `Cannot create .../moc_xxx.cpp` — keep project root ASCII.
10. PS 5.1 `Set-Location` does not recognize a fresh `subst` drive; call `cmake` with absolute paths.
11. PS 5.1 `C:\strawberry\c\bin` mistakenly rewrites the cmake path (`-replace` misdelete); use the absolute path of `$cmake` directly.

## File Deletion Rules
- The assistant MUST NEVER run `Remove-Item` / `rm` / `del` / `Move-Item to /dev/null` directly.
- For recursive deletes, suggest `cmd /c rmdir /s /q <ASCII-absolute-path>` and let the user run it — PowerShell `Remove-Item` is blocked by the desktop permission gate (Wipe category).
- `cmd /c rmdir /s /q` uses the .NET API and is NOT blocked by the gate.

## Per-Step Self-Check
- Report at the end of every research/design/implementation step, then wait for approval before continuing.
- Irreversible actions (kill process / delete file / rewrite git history) require explicit user confirmation every time.
- "Done" is defined by user confirmation on a real machine OR automated tests passing — never by the assistant's own confidence.

## Vendored Patches (IMPORTANT)
The whole `third_party/` directory is in `.gitignore`. After vendoring KSyntax, one manual patch MUST be re-applied after every fresh `git clone`; otherwise the build fails on `katehighlightingindexer` (`STATUS_DLL_NOT_FOUND` on MinGW PATH).

1. **File**: `third_party/syntax-highlighting/data/CMakeLists.txt`
2. **Reason**: `katehighlightingindexer.exe` is a standalone tool built against Qt 6.8.0. It cannot find `Qt6Core.dll` on a MinGW PATH (`STATUS_DLL_NOT_FOUND`); on Qt 6.8.0's XML parser, it also triggers a known `STATUS_HEAP_CORRUPTION` bug.
3. **`QRC_SYNTAX=OFF` does NOT solve the problem** — the KSyntax `CMakeLists` unconditionally calls `add_custom_command(... katehighlightingindexer ...)`, which directly breaks `cmake --configure`.
4. **Correct fix (current)**: in `data/CMakeLists.txt`, replace the `add_custom_command(... katehighlightingindexer ...)` body with `${CMAKE_COMMAND} -E copy_if_different "${CMAKE_SOURCE_DIR}/resources/ksyntax/index.katesyntax" ${OUT}`. Add the pre-generated file to `DEPENDS` so a regenerated index is re-copied. The downstream wrapper `add_custom_target(ksyntax_index_katesyntax ...)` and `add_dependencies(SyntaxHighlightingData ksyntax_index_katesyntax)` are kept as-is.
5. **Pre-generated artifact**: `resources/ksyntax/index.katesyntax` is committed to the repo. It was produced once by running `katehighlightingindexer.exe` with `PATH` including `C:\Qt\6.8.0\mingw_64\bin`. See `resources/ksyntax/README.md` for the full regeneration procedure (Perl generators → listing XML → indexer invocation).
6. **Re-clone procedure** (required after `git clone` of KSyntax + patching `data/CMakeLists.txt`):
   - The `resources/ksyntax/index.katesyntax` file is already in the repo; no regeneration is needed for routine builds.
   - Only regenerate when KSyntax is upgraded or a new XML definition is added: follow `resources/ksyntax/README.md`, then commit the new `index.katesyntax` binary.
   - The vendored patch is: edit `data/CMakeLists.txt`, replace the `katehighlightingindexer` `COMMAND` line with the `copy_if_different` line shown above, add the pre-generated file to `DEPENDS`. (This is a working-tree-only edit — `third_party/` is gitignored.)
7. **Result**: `OlerEditor::definitionForName("C++")` now returns a valid `Definition` for all 374 languages; visual highlighting actually works. (The earlier `cmake -E touch` stub left `index.katesyntax` as 0 bytes, making highlighting silently a no-op — that was the v1 workaround, superseded by the pre-generated-file approach.)

## License
MIT (see `LICENSE`).

## Smoke Test PATH Override
Before running `build\oler-ide.exe`, prepend `C:\Qt\6.8.0\mingw_64\bin` to `PATH`, otherwise you get `0xC0000135` `STATUS_DLL_NOT_FOUND` (cannot find `Qt6Core.dll`):

```powershell
$env:PATH = 'C:\Qt\6.8.0\mingw_64\bin;' + $env:PATH
```

Task 9 (done, commit `372668b`) added a `windeployqt` POST_BUILD step that copies Qt DLLs into `build/`, so this manual step is no longer required for builds after 2026-08-21.

## QT_QPA_PLATFORM Warning (v1 lesson, 2026-08-22)
On this machine, Qt 6.8.0's `minimal` and `offscreen` platform plugins crash inside the
`QApplication` constructor with `0xC0000602` (STATUS_FAIL_FAST_EXCEPTION) after ~6s.
The old scaffold hard-coded `qputenv("QT_QPA_PLATFORM", "minimal")` in `main()`, which made
every launch die this way; smoke tests that only checked "alive at 2.5s" never caught it.

Rules:
- NEVER hard-code `QT_QPA_PLATFORM` in `main()`. Let Qt pick the real platform (`windows`).
- Smoke tests must run with the default platform (a desktop session exists) and must check
  the exit code, not just liveness. Since the 3s auto-quit timer was removed from `main()`
  (commit after `a332793`), a smoke test should: verify alive at 2.5s, then `Stop-Process`
  the instance it spawned, and confirm no early self-exit.
