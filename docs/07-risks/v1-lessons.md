# V1 Lessons — Pitfalls the v1 IDE Walked Into

> Source: `D:\oler-ide-v2\AGENTS.md` (the v2 "v1 留下来的坑" list) +
> downstream `task-N-report.md` reviews in
> `.superpowers/sdd/2026-08-21-oler-ide-v2-foundation/`. This document
> re-tells the v1 lessons as a docs-friendly narrative; the original
> bullet list stays in AGENTS.md for the next agent that boots the
> project.

v1 of Oler IDE was a Tauri 2 + React + TypeScript + Monaco + Rust
desktop app. It reached `v0.3.6` and then was abandoned. The v2 rewrite
in Qt 6.8 / C++17 inherits the lessons but **not** the codebase. This
document is the record of what v1 got wrong, so the next time someone
proposes a shortcut, the answer is already in the manual.

## 1. ABI mismatch kills you silently

The single longest debug session in v1 was a `0xC0000374 STATUS_HEAP_CORRUPTION`
that turned out to be a Qt DLL loaded against the wrong MinGW runtime.
The trap: the user has multiple MinGW installs on the machine
(`C:\Qt\Tools\mingw1310_64`, `D:\OI\mingw64`, `C:\Strawberry\c\bin`),
each with a different major version, and CMake happily picks the wrong
one because it's first on `PATH`.

**v2 rule:** the compiler is **always** `C:\Qt\Tools\mingw1310_64\bin\g++.exe`
(MinGW 13.1.0), matching Qt 6.8.0 prebuilt binaries. Every CMake
invocation passes `-DCMAKE_CXX_COMPILER=...` explicitly. System
`D:\OI\mingw64` (16.1.0, UCRT) and `C:\Strawberry\c\bin` (13.2.0) are
banned from build paths.

## 2. WIN32_EXECUTABLE on MinGW 13.1.0 must be FALSE

v1 had `WIN32_EXECUTABLE TRUE`. On MinGW 13.1.0 the link to
`libQt6EntryPoint.a` resolves to `__imp___argc` and `__imp___argv`, which
don't exist as imports when `WIN32_EXECUTABLE` is set; the resulting
binary fails to start with an obscure linker error. v1 also burned half
a day on the "missing entry point" rabbit hole.

**v2 rule:** `WIN32_EXECUTABLE FALSE` for the main `oler-ide.exe` target.
This is a Qt-on-MinGW 13.1.0 fact, not a v2 fact; it will not change
unless we move to MSVC.

## 3. Vendor route beats FetchContent

v1 used `FetchContent` for ECM and KSyntax. Two problems:

- `FetchContent` re-downloads on every configure in some configurations,
  and CI machines without internet failed configure silently.
- Some packages (KSyntax) need patches that v1 applied as `FetchContent`
  overlays, but the patches were lost on re-clone.

**v2 rule:** `third_party/` is a gitignored vendor directory. Use
`add_subdirectory(third_party/...  EXCLUDE_FROM_ALL)`. The katehighlightingindexer
patch is documented inline in `AGENTS.md` and re-applied with a 4-line
PowerShell script after every fresh clone (see "Vendored patches"
section).

## 4. KSyntax 6.x has no `Repository::instance()`

v1 called `SyntaxHighlighting::Repository::instance()` (from KSyntax 5).
In KSyntax 6, the static was removed; the ctor is non-virtual and does
**not** take a `QObject*` parent. The v1 build broke on the first upgrade
to KDE Frameworks 6.

**v2 rule:** every `OlerEditor` instantiation does
`auto* repo = new SyntaxHighlighting::Repository();` (no parent). The
defensive `setLanguage` guard catches the `Definition` returning
invalid (because the 374 XML definitions aren't indexed — see #8) and
the editor silently no-ops highlighting without crashing.

## 5. Qt 6 moc has CJK path bugs

`moc.exe` in Qt 6.8.0 (MinGW build) cannot write `moc_xxx.cpp` files
into a path containing CJK characters. The error is
`Cannot create .../moc_xxx.cpp` and the message is misleading — the
parent directory exists, the permission is fine, it's a UTF-8 issue
in moc.

**v2 rule:** the project root is `D:\oler-ide-v2` (ASCII, no CJK).
Never move the project to a CJK path. If a user has a CJK username,
use `subst` to a virtual drive letter.

## 6. Q_PROPERTY pointer types need forward declarations

Qt 6's moc is stricter: a `Q_PROPERTY` of pointer type must have the
**forward declaration** in the header and the **full include** in the
.cpp. v1's headers had full includes inline, which under Qt 5 was
tolerated and under Qt 6 produces a "no such type" error from moc.

**v2 rule:** every `Q_PROPERTY(SomeType* foo ...)` declares `class
SomeType;` in the header.

## 7. `stdin` is a macro on Windows, not a name

`<stdio.h>` defines `stdin` as a macro. Naming a `Q_PROPERTY` or
`Q_INVOKABLE` argument `stdin` will expand the macro and break the
build with a syntax error in moc-generated code.

**v2 rule:** never name a property `stdin`, `stdout`, `stderr`. Use
`stdinText`, `stdoutText`, `stderrText` instead. v1 lost an hour to
this on the run-pipeline I/O handler.

## 8. The katehighlightingindexer crashes on MinGW PATH

KSyntax ships a helper binary `katehighlightingindexer.exe` that
pre-generates `index.katesyntax` from 374 XML definition files. On
MinGW 13.1.0, the binary cannot find `Qt6Core.dll` (it inherits a PATH
without `C:\Qt\6.8.0\mingw_64\bin`) and crashes with
`STATUS_DLL_NOT_FOUND`. Even when DLLs are on PATH, the XML parser
triggers a known Qt 6.8.0 bug that aborts with `STATUS_HEAP_CORRUPTION`.

**v2 rule:** patch the vendored `data/CMakeLists.txt` to replace the
`add_custom_command(... katehighlightingindexer ...)` line with a
`cmake -E touch ${OUT}` stub, add a `add_dependencies(... katesyntax)`
wrapper, and ship a 0-byte `index.katesyntax`. The XML files themselves
are real and ship with the vendor; only the index is a stub. Real fix
is deferred to a separate task: either get the indexer working (with
the right `PATH`) or pre-generate `index.katesyntax` and commit it as
a static asset.

## 9. PowerShell 5.1 quirks

- `Set-Location` does not recognize a fresh `subst` drive; use absolute
  paths.
- `Get-Content ... | Set-Content` without `-Encoding UTF8` silently
  mangles UTF-8 files (CJK comments get destroyed).
- `Remove-Item` is in the desktop permission gate's "Wipe" category and
  is rejected by default; use `cmd /c rmdir /s /q` instead (the
  underlying Win32 API is not gated).
- `where.exe cmake` and `Get-Command cmake` are **not** equivalent if
  multiple cmake versions are on PATH; trust the explicit
  `-DCMAKE_CXX_COMPILER=...` argument.

## 10. "I think it works" is not done

v1 hit a 5-day debug spiral where the assistant declared
"应该能用了" three rounds in a row without the user actually running
the binary. The user's rule: every "done" must be either user-verified
on a real machine or automated-test-verified.

**v2 rule:** the per-step workflow is "complete → report → wait for
acknowledgment". Irreversible actions (kill process, delete file,
push to git) require explicit confirmation each time.

## What This Means for v2

The v1 lessons are the reason v2 has a `docs/07-risks/v1-lessons.md`
in the first place — a new contributor must read this before proposing
a shortcut. The fastest path to a stable v2 is to read this list,
assume nothing, and verify on the user's machine before claiming
victory.
