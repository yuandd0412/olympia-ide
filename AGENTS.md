# Oler IDE v2 — Project Agent Guide

## Project at a Glance
Desktop OI (Olympiad in Informatics) coding IDE, rewritten in Qt 6.8 + C++17 + MinGW 13.1.0. Dark-mode-first, information-dense, with built-in compiler chain, OJ account manager, and AI assistant.

## Paths and Directories
- Project root: `D:\oler-ide-v2` (ASCII only — never use CJK paths; `moc`/`rcc`/`qmake` are broken on CJK paths in Qt 6.8.0)
- Build: `D:\oler-ide-v2\build\` (gitignored)
- Vendor: `D:\oler-ide-v2\third_party\` (gitignored, re-clonable)
- Qt: `C:\Qt\6.8.0\mingw_64\`
- MinGW: `C:\Qt\Tools\mingw1310_64\bin\` (Qt-bundled, ABI-matched to Qt 6.8.0 prebuilt)

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
4. **Correct fix**: in `data/CMakeLists.txt`, replace the entire `add_custom_command(... katehighlightingindexer ...)` block with a `cmake -E touch ${OUT}` stub. Drop `add_dependencies(... katesyntax)` and the wrapper target.
5. **Command to re-apply the patch** (required after re-clone):
   ```powershell
   # Stub-out the data patch. The 374 XML definition files are temporarily not generated.
   # Task 6+ will re-attach them when OlerEditor is fully wired up.
   $f = 'D:\oler-ide-v2\third_party\syntax-highlighting\data\CMakeLists.txt'
   # Replace the katehighlightingindexer add_custom_command block with a stub.
   # See Task 3 implementer report: .superpowers/sdd/.../task-3-report.md
   ```
6. **Task 6+ TODO (deferred, non-blocking)**: `kf6syntaxhighlightingdata`'s 374 XML definition files are real (`cpp.xml` = 49KB with a proper DOCTYPE, `php.xml` = 442KB, etc.), but `index.katesyntax` is a 0-byte stub (replaced via the vendored `data/CMakeLists.txt` patch because `katehighlightingindexer` crashes on MinGW PATH). Effect: `new Repository()->definitionForName('C++')` returns an invalid `Definition`; visual highlighting is silently a no-op (the API does not crash, the process runs fine). **Not solved in Task 6** (a defensive `setLanguage` guard prevents crash). Real fix: (a) get `katehighlightingindexer` working (PATH must include Qt DLLs), OR (b) pre-generate `index.katesyntax` and commit it as a static asset. Needs a separate task to evaluate.

## License
MIT (see `LICENSE`).

## Smoke Test PATH Override
Before running `build\oler-ide.exe`, prepend `C:\Qt\6.8.0\mingw_64\bin` to `PATH`, otherwise you get `0xC0000135` `STATUS_DLL_NOT_FOUND` (cannot find `Qt6Core.dll`):

```powershell
$env:PATH = 'C:\Qt\6.8.0\mingw_64\bin;' + $env:PATH
```

Task 9 (done, commit `372668b`) added a `windeployqt` POST_BUILD step that copies Qt DLLs into `build/`, so this manual step is no longer required for builds after 2026-08-21.
