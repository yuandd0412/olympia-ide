# Oler IDE v2 — Phase 4 Bridge: Wire OlerEditor + Fix Kateindexer Stub

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5 stacked placeholder pages in `MainWindow` with 6 real tabs (the 5 shell tabs + an actual `OlerEditor`), and make KSyntax visual highlighting actually work by replacing the katehighlightingindexer stub with a pre-generated `index.katesyntax` asset.

**Architecture:**
- Tab 1 of 5 is the `OlerEditor` host page (the rest stay as `QLabel` placeholders for Phase 5)
- The vendored katehighlightingindexer call is replaced with a copy of a pre-generated `index.katesyntax` that we check in as a tracked asset (a one-shot manual generation step, then no more indexer at build time)
- The `index.katesyntax` is small (~30-50 KB) and lives at `D:\oler-ide-v2\resources\ksyntax\index.katesyntax`

**Tech Stack:**
- Qt 6.8.0, MinGW 13.1.0, KSyntaxHighlighting 6.8.0 (already vendored)
- C++17
- CMake 4.x + Ninja
- katehighlightingindexer.exe (already built at `D:\oler-ide-v2\build\bin\katehighlightingindexer.exe`)

## Global Constraints

> Same as the foundation plan. The most important ones for this phase:
- Project root: `D:\oler-ide-v2` (ASCII, no CJK)
- Compiler: `C:\Qt\Tools\mingw1310_64\bin\g++.exe` (MinGW 13.1.0) STRICT
- Qt: `C:\Qt\6.8.0\mingw_64`
- WIN32_EXECUTABLE FALSE on MinGW
- vendor route (add_subdirectory third_party/...) EXCLUDE_FROM_ALL
- File deletion gated: use `cmd /c rmdir /s /q <ASCII path>` only
- Every step commit + report
- PATH prepend for katehighlightingindexer manual run: `$env:PATH = 'C:\Qt\6.8.0\mingw_64\bin;' + $env:PATH`
- Post-build DLL copy in `CMakeLists.txt` already handles KSyntax DLL; this phase adds `index.katesyntax` to that copy

## File Structure

Files modified:
- `D:\oler-ide-v2\src\ui\mainwindow\MainWindow.h` — add `OlerEditor *m_editorPage = nullptr;` member (or use 6th tab)
- `D:\oler-ide-v2\src\ui\mainwindow\MainWindow.cpp` — wire 6th tab to `OlerEditor` instance
- `D:\oler-ide-v2\CMakeLists.txt` — add `add_custom_command` to copy `index.katesyntax` into `build/`
- `D:\oler-ide-v2\third_party\syntax-highlighting\data\CMakeLists.txt` — replace `cmake -E touch` stub with `configure_file` copy of pre-generated `index.katesyntax`
- `D:\oler-ide-v2\AGENTS.md` — update "Vendored patches" section

Files created:
- `D:\oler-ide-v2\resources\ksyntax\index.katesyntax` — pre-generated, tracked
- `D:\oler-ide-v2\resources\ksyntax\README.md` — one-paragraph note on how this was generated + how to regenerate

## Background

The vendored KSyntax has 374 XML syntax definition files (real, e.g. `cpp.xml` is 49 KB), but the build currently uses a stub `cmake -E touch` to create an empty `index.katesyntax`. This is because `katehighlightingindexer.exe` (the tool that builds the index) crashes when invoked at build time on MinGW because `Qt6Core.dll` is not in PATH at that point.

The fix: run `katehighlightingindexer.exe` manually once with `PATH` including `C:\Qt\6.8.0\mingw_64\bin` to produce a real `index.katesyntax`, save it as a tracked asset, and have CMake copy it into the build instead of running the indexer at build time.

The OlerEditor side: in the foundation, `OlerEditor` exists as a `QPlainTextEdit` subclass with KSyntax wiring, but `MainWindow` only shows 5 placeholder `QLabel`s. Wire `OlerEditor` as a 6th tab so the user can actually see the editor in the GUI.

---

### Task 1: Generate index.katesyntax manually

**Files:**
- Create: `D:\oler-ide-v2\resources\ksyntax\index.katesyntax` (binary, generated)
- Create: `D:\oler-ide-v2\resources\ksyntax\README.md` (one paragraph)

**Interfaces:**
- Consumes: `D:\oler-ide-v2\build\bin\katehighlightingindexer.exe` (already built)
- Consumes: `D:\oler-ide-v2\third_party\syntax-highlighting\data\syntax\` (374 XML files)
- Produces: `D:\oler-ide-v2\resources\ksyntax\index.katesyntax` (~30-50 KB binary)

- [ ] **Step 1: Locate katehighlightingindexer.exe**

Run:
```powershell
Test-Path 'D:\oler-ide-v2\build\bin\katehighlightingindexer.exe'
```
Expected: `True`. If `False`, the vendored KSyntax build didn't produce it — report BLOCKED.

- [ ] **Step 2: Locate the syntax source directory**

Run:
```powershell
Get-ChildItem 'D:\oler-ide-v2\third_party\syntax-highlighting\data\syntax' | Measure-Object | Select-Object -ExpandProperty Count
```
Expected: `374` (count of XML files). If different, the directory layout changed; report BLOCKED.

- [ ] **Step 3: Run katehighlightingindexer with Qt DLLs in PATH**

Run:
```powershell
$env:PATH = 'C:\Qt\6.8.0\mingw_64\bin;' + $env:PATH
& 'D:\oler-ide-v2\build\bin\katehighlightingindexer.exe' `
  --source 'D:\oler-ide-v2\third_party\syntax-highlighting\data\syntax' `
  --target 'D:\oler-ide-v2\resources\ksyntax\index.katesyntax'
```
Expected: exit 0, no stderr, file produced. If the indexer still crashes (e.g. 0xC0000135), PATH is missing something; check `$env:PATH` includes `C:\Qt\6.8.0\mingw_64\bin` literally. If it exits with a different code, capture stderr and report.

- [ ] **Step 4: Verify the generated file**

Run:
```powershell
if (-not (Test-Path 'D:\oler-ide-v2\resources\ksyntax\index.katesyntax')) { throw 'index.katesyntax not generated' }
$size = (Get-Item 'D:\oler-ide-v2\resources\ksyntax\index.katesyntax').Length
Write-Output "index.katesyntax: $size bytes"
# Sanity check: first line should reference C++ (most common)
Get-Content 'D:\oler-ide-v2\resources\ksyntax\index.katesyntax' -TotalCount 1
```
Expected: file ~30-50 KB, first line contains `C++` (a known definition name). If size is 0 bytes, kateindexer did nothing — report BLOCKED.

- [ ] **Step 5: Write README.md**

Write to `D:\oler-ide-v2\resources\ksyntax\README.md`:
```markdown
# KSyntax index.katesyntax

Pre-generated index for KSyntaxHighlighting 6.8.0. Produced by running
`katehighlightingindexer.exe` once with Qt DLLs in PATH.

## How to regenerate

```powershell
$env:PATH = 'C:\Qt\6.8.0\mingw_64\bin;' + $env:PATH
& D:\oler-ide-v2\build\bin\katehighlightingindexer.exe `
  --source 'D:\oler-ide-v2\third_party\syntax-highlighting\data\syntax' `
  --target 'D:\oler-ide-v2\resources\ksyntax\index.katesyntax'
```

Then commit the new file. CMakeLists.txt copies this file into build/ at configure
time; vendored data/CMakeLists.txt patch consumes it instead of running the indexer.

## Why pre-generated

`katehighlightingindexer.exe` is a Qt 6 app that crashes (STATUS_DLL_NOT_FOUND) when
invoked at build time because Qt DLLs are not in PATH during add_custom_command.
Pre-generating the file once (with PATH set) and copying it at build time avoids
this. The index only changes when KSyntax version changes.
```

- [ ] **Step 6: Commit**

```powershell
git -C D:\oler-ide-v2 add resources/ksyntax/
git -C D:\oler-ide-v2 commit -m "feat(ksyntax): pre-generate index.katesyntax (374 XML definitions)"
```

**Acceptance:** `D:\oler-ide-v2\resources\ksyntax\index.katesyntax` exists, ~30-50 KB, contains `C++` reference. Commit on top of `v2.0.0-foundation` tag.

---

### Task 2: Replace vendored katehighlightingindexer stub with file copy

**Files:**
- Modify: `D:\oler-ide-v2\third_party\syntax-highlighting\data\CMakeLists.txt` (replace stub)
- Modify: `D:\oler-ide-v2\AGENTS.md` (update "Vendored patches" section)

**Interfaces:**
- Consumes: pre-generated `D:\oler-ide-v2\resources\ksyntax\index.katesyntax` (from Task 1)
- Produces: `index.katesyntax` in the KSyntax build dir (real content, not 0-byte stub)

- [ ] **Step 1: Read current patched data/CMakeLists.txt**

The current patch (per AGENTS.md) replaced the katehighlightingindexer invocation with `cmake -E touch`. Read the file and identify the stub command and the wrapper target.

- [ ] **Step 2: Replace stub with configure_file copy**

Replace the `cmake -E touch ${OUT}` line (or equivalent) with a `configure_file` that copies the pre-generated `index.katesyntax`:

```cmake
# Old (stub):
# add_custom_command(OUTPUT ${OUT} COMMAND cmake -E touch ${OUT} ...)

# New (use pre-generated):
configure_file(
    "${CMAKE_SOURCE_DIR}/resources/ksyntax/index.katesyntax"
    "${CMAKE_CURRENT_BINARY_DIR}/index.katesyntax"
    COPYONLY
)
```

Or, if the structure uses `add_custom_command(OUTPUT ${OUT} COMMAND ...)`, replace it with:
```cmake
add_custom_command(OUTPUT ${OUT}
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${CMAKE_SOURCE_DIR}/resources/ksyntax/index.katesyntax"
        ${OUT}
    DEPENDS "${CMAKE_SOURCE_DIR}/resources/ksyntax/index.katesyntax"
    COMMENT "Copying pre-generated index.katesyntax"
)
```

Choose the form that matches the existing patch's structure. The constraint is: no `katehighlightingindexer` invocation; no `cmake -E touch` empty-file stub; the `index.katesyntax` produced must be byte-identical to the pre-generated file.

- [ ] **Step 3: Verify no katehighlightingindexer references remain**

Run:
```powershell
Select-String -Path 'D:\oler-ide-v2\third_party\syntax-highlighting\data\CMakeLists.txt' -Pattern 'katehighlightingindexer'
```
Expected: 0 matches. If any match, the patch is incomplete — fix.

- [ ] **Step 4: Update AGENTS.md "Vendored patches" section**

The current section (in AGENTS.md) describes the `cmake -E touch` stub approach. Replace the explanation with the new approach:

**Old** (summary): "QRC_SYNTAX=OFF doesn't work; patch replaces katehighlightingindexer invocation with cmake -E touch stub; index.katesyntax is 0 bytes; visual highlighting silently no-op until separate task."

**New**: 
- The katehighlightingindexer call has been replaced with a copy of the pre-generated `index.katesyntax` (committed at `resources/ksyntax/index.katesyntax`).
- Re-clone procedure: after `git clone` of KSyntax + patching `data/CMakeLists.txt`, run the regeneration command in `resources/ksyntax/README.md` to refresh `index.katesyntax`, then commit.
- Visual highlighting now actually works for all 374 languages.

- [ ] **Step 5: Build to verify**

Run:
```powershell
& cmd /c 'cd /d "D:\oler-ide-v2" && "D:\OI\mingw64\bin\cmake.exe" -B build -S . -DCMAKE_CXX_COMPILER=C:/Qt/Tools/mingw1310_64/bin/g++.exe -DCMAKE_C_COMPILER=C:/Qt/Tools/mingw1310_64/bin/gcc.exe -DCMAKE_PREFIX_PATH=C:/Qt/6.8.0/mingw_64 -DCMAKE_RC_COMPILER=C:/Qt/Tools/mingw1310_64/bin/windres.exe' 2>&1 | Select-Object -Last 10
```
Expected: configure 0, no katehighlightingindexer invocation. Then:
```powershell
& cmd /c 'cd /d "D:\oler-ide-v2" && "D:\OI\mingw64\bin\cmake.exe" --build build --parallel' 2>&1 | Select-Object -Last 10
```
Expected: build 0. Verify `D:\oler-ide-v2\build\third_party\syntax-highlighting\data\index.katesyntax` is now the pre-generated file (not 0 bytes):
```powershell
$idx = 'D:\oler-ide-v2\build\third_party\syntax-highlighting\data\index.katesyntax'
$size = (Get-Item $idx).Length
Write-Output "build index.katesyntax: $size bytes (expected: ~30000-50000)"
```
Expected: 30,000-50,000 bytes (matches Task 1's pre-generated file size).

- [ ] **Step 6: Commit**

```powershell
git -C D:\oler-ide-v2 add third_party/syntax-highlighting/data/CMakeLists.txt AGENTS.md
git -C D:\oler-ide-v2 commit -m "fix(ksyntax): replace kateindexer stub with pre-generated index.katesyntax copy"
```

**Acceptance:** Build 0. `build/third_party/syntax-highlighting/data/index.katesyntax` is non-zero and matches the pre-generated file (byte-identical via `fc /b`).

---

### Task 3: Smoke test that visual highlighting works

**Files:** (none modified; this task is a verification gate)

- [ ] **Step 1: Write a tiny C++ test program**

Create `D:\oler-ide-v2\tests\test_highlight.cpp`:
```cpp
#include <QApplication>
#include <QPlainTextEdit>
#include <KSyntaxHighlighting/Repository>
#include <KSyntaxHighlighting/SyntaxHighlighter>
#include <KSyntaxHighlighting/Definition>
#include <KSyntaxHighlighting/Theme>
#include <QFile>
#include <QTextStream>
#include <QTimer>
#include <cstdio>

int main(int argc, char *argv[]) {
    qputenv("QT_QPA_PLATFORM", "minimal");
    QApplication app(argc, argv);

    // Verify index.katesyntax can be loaded
    QFile idx(":/org.kde.syntax-highlighting/syntax/index.katesyntax");
    if (!idx.open(QFile::ReadOnly)) {
        std::fprintf(stderr, "FAIL: cannot open qrc index.katesyntax\n");
        return 1;
    }
    idx.close();

    KSyntaxHighlighting::Repository repo;
    auto def = repo.definitionForName("C++");
    if (!def.isValid()) {
        std::fprintf(stderr, "FAIL: C++ definition not valid (index.katesyntax not loaded)\n");
        return 1;
    }
    std::fprintf(stderr, "OK: C++ definition valid: %s\n", def.name().toUtf8().constData());

    auto editor = new QPlainTextEdit;
    auto hl = new KSyntaxHighlighting::SyntaxHighlighter(editor->document());
    hl->setDefinition(def);
    auto theme = repo.theme("breeze-dark");
    if (!theme.isValid()) theme = repo.defaultTheme();
    hl->setTheme(theme);
    editor->setPlainText(
        "#include <iostream>\n"
        "int main() {\n"
        "    std::cout << \"hello\" << std::endl;\n"
        "    return 0;\n"
        "}\n"
    );
    QTimer::singleShot(2500, &app, &QCoreApplication::quit);
    return app.exec();
}
```

- [ ] **Step 2: Add to CMakeLists.txt temporarily**

Add to `add_executable(oler-ide ...)` line — actually create a separate test target so it doesn't interfere. After the `add_executable(oler-ide ...)` block, add:
```cmake
add_executable(test_highlight
    tests/test_highlight.cpp
)
target_include_directories(test_highlight PRIVATE src)
target_link_libraries(test_highlight PRIVATE
    Qt6::Core Qt6::Gui Qt6::Widgets
    KF6SyntaxHighlighting
)
```

- [ ] **Step 3: Build + run the test**

```powershell
& cmd /c 'cd /d "D:\oler-ide-v2" && "D:\OI\mingw64\bin\cmake.exe" -B build -S .' 2>&1 | Out-Null
& cmd /c 'cd /d "D:\oler-ide-v2" && "D:\OI\mingw64\bin\cmake.exe" --build build --target test_highlight' 2>&1 | Select-Object -Last 5
& D:\oler-ide-v2\build\test_highlight.exe 2>&1
$ec = $LASTEXITCODE
```
Expected: stderr shows `OK: C++ definition valid: C++`, exit 0. If `FAIL: C++ definition not valid`, the index.katesyntax isn't being loaded — the qrc is missing or the resource path is wrong. Investigate.

- [ ] **Step 4: Remove the test from CMakeLists.txt**

The test_highlight was a verification gate, not part of the foundation. Remove the `add_executable(test_highlight ...)` and `target_link_libraries(test_highlight ...)` blocks. Keep `tests/test_highlight.cpp` for future regression use.

```powershell
git -C D:\oler-ide-v2 rm --cached tests/test_highlight.cpp 2>&1 | Out-Null  # if accidentally staged
# (Manually edit CMakeLists.txt to remove the test_highlight target)
```

Or just leave the test as a future regression target — `add_executable(test_highlight ...)` doesn't get built unless you explicitly `cmake --build build --target test_highlight`. Either is fine.

- [ ] **Step 5: Commit**

If test_highlight was added to CMakeLists.txt, commit it as a regression test:
```powershell
git -C D:\oler-ide-v2 add tests/ CMakeLists.txt
git -C D:\oler-ide-v2 commit -m "test(ksyntax): regression test verifying C++ definition loads (defends index.katesyntax breakage)"
```

If you removed it, no commit needed.

**Acceptance:** `test_highlight.exe` runs, exits 0, stderr shows `OK: C++ definition valid: C++`. This proves the pre-generated `index.katesyntax` is correctly consumed and visual highlighting will work in `OlerEditor`.

---

### Task 4: Wire OlerEditor into MainWindow as a 6th tab

**Files:**
- Modify: `D:\oler-ide-v2\src\ui\mainwindow\MainWindow.h`
- Modify: `D:\oler-ide-v2\src\ui\mainwindow\MainWindow.cpp`

**Interfaces:**
- Consumes: `OlerEditor` class (from foundation Task 6)
- Consumes: 5 existing tabs (Problems/Training/Mistakes/AI Coach/Settings)
- Produces: A 6th tab "Editor" hosting `OlerEditor` instance, accessible from ActivityBar and TabBar

- [ ] **Step 1: Add OlerEditor to MainWindow.h**

Read the current `MainWindow.h`. Add:
```cpp
// Add to top:
#include "ui/editor/OlerEditor.h"  // OR keep forward-decl + include in .cpp

// Replace the members section:
class OlerEditor;  // forward decl (if not including header)

class MainWindow : public QMainWindow {
    // ...existing members...
private:
    QToolBar *m_activityBar = nullptr;
    QTabBar *m_tabBar = nullptr;
    QStackedWidget *m_pages = nullptr;
    OlerEditor *m_editorPage = nullptr;  // NEW
    // ...existing methods...
};
```

The cleanest design: keep forward-decl in header, include in .cpp. But the `OlerEditor *m_editorPage` member needs full type for the new/delete calls in .cpp. So either:
- Option A: `#include "ui/editor/OlerEditor.h"` in MainWindow.h (simple, slightly heavier header)
- Option B: forward-decl in header, `#include "ui/editor/OlerEditor.h"` in MainWindow.cpp (lighter header)

Go with Option B (matches existing convention for QToolBar/QTabBar/QStackedWidget forward-decls).

- [ ] **Step 2: Add 6th tab in MainWindow.cpp**

In `MainWindow::buildTabBar()`, change:
```cpp
m_tabBar->addTab(tr("Problems"));
m_tabBar->addTab(tr("Training"));
m_tabBar->addTab(tr("Mistakes"));
m_tabBar->addTab(tr("AI Coach"));
m_tabBar->addTab(tr("Settings"));
```
to:
```cpp
m_tabBar->addTab(tr("Editor"));      // NEW: 1st tab
m_tabBar->addTab(tr("Problems"));
m_tabBar->addTab(tr("Training"));
m_tabBar->addTab(tr("Mistakes"));
m_tabBar->addTab(tr("AI Coach"));
m_tabBar->addTab(tr("Settings"));
```

In `MainWindow::buildActivityBar()`, change:
```cpp
auto acts = {
    tr("Problems"), tr("Training"), tr("Mistakes"), tr("AI"), tr("Settings")
};
```
to:
```cpp
auto acts = {
    tr("Editor"), tr("Problems"), tr("Training"), tr("Mistakes"), tr("AI Coach"), tr("Settings")
};
```
(Note: keep ActivityBar "Editor" label consistent with TabBar "Editor", not "Ed".)

In `MainWindow::buildContentPages()`, change:
```cpp
m_pages->addWidget(placeholder("Problems"));
// ... 4 more placeholder() calls ...
```
to:
```cpp
m_pages->addWidget(buildEditorPage());  // NEW
m_pages->addWidget(placeholder("Problems"));
// ... 4 more placeholder() calls ...
```

Add the `buildEditorPage()` method (private helper, before `buildContentPages`):
```cpp
QWidget *MainWindow::buildEditorPage() {
    m_editorPage = new OlerEditor(this);
    m_editorPage->setPlainText(
        "// Oler IDE v2 — sample C++\n"
        "#include <iostream>\n"
        "\n"
        "int main() {\n"
        "    std::cout << \"Hello, OI!\" << std::endl;\n"
        "    return 0;\n"
        "}\n"
    );
    return m_editorPage;
}
```

Update `MainWindow::onTabChanged` index 0 to be Editor instead of Problems — actually the current code uses `m_tabBar->setCurrentIndex(idx)` and `m_pages->setCurrentIndex(index)`. With Editor at index 0, no logic change needed.

- [ ] **Step 3: Update destructor / cleanup**

In `MainWindow::~MainWindow()`, the existing code is `= default;`. Since `m_editorPage` is a child of MainWindow (set via `this` parent in `new OlerEditor(this)`), Qt's parent-child memory management handles cleanup. No explicit delete needed.

- [ ] **Step 4: Build to verify**

```powershell
& cmd /c 'cd /d "D:\oler-ide-v2" && "D:\OI\mingw64\bin\cmake.exe" --build build --parallel' 2>&1 | Select-Object -Last 10
```
Expected: build 0. If moc fails on MainWindow.h, check the Q_OBJECT macro is still present (it should be — adding a member doesn't affect moc).

- [ ] **Step 5: Smoke test**

```powershell
$env:QT_QPA_PLATFORM = 'minimal'
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath 'D:\oler-ide-v2\build\oler-ide.exe' -PassThru
Start-Sleep -Milliseconds 2500
if ($p.HasExited) { throw "FAIL: died early at $($sw.Elapsed.TotalSeconds)s, exit=$($p.ExitCode)" }
Write-Output "[ok] alive at 2.5s"
$p.WaitForExit()
$sw.Stop()
Write-Output "[ok] exit in $($sw.Elapsed.TotalSeconds)s"
```
Expected: alive 2.5s, clean exit. If the editor crashes on construction (e.g. OlerEditor trying to access KSyntax resources that aren't found), the process dies early — investigate.

- [ ] **Step 6: Commit**

```powershell
git -C D:\oler-ide-v2 add src/ui/mainwindow/
git -C D:\oler-ide-v2 commit -m "feat(phase-4): wire OlerEditor into MainWindow as 1st tab (Editor)"
```

**Acceptance:** `MainWindow` has 6 tabs (Editor first, then 5 shell placeholders). `OlerEditor` is constructed with sample C++ code. Visual highlighting actually works (because Task 2 made the index real).

---

### Task 5: Visual verification (user-side)

**Files:** (no code changes)

This task is a manual verification gate. The implementer should NOT run a GUI smoke test (the headless environment can't render Qt windows). Instead, the user runs the app on their machine and confirms.

- [ ] **Step 1: Tell the user to run the app**

Report to the user:
```
D:\oler-ide-v2\build\oler-ide.exe is ready to run. When you launch it, you should see:
- 6 tabs in the top tab bar: Editor / Problems / Training / Mistakes / AI Coach / Settings
- 6 icons in the left ActivityBar: same labels
- 1st tab "Editor" is selected by default
- The Editor tab shows sample C++ code with SYNTAX HIGHLIGHTING (because Task 2 fixed index.katesyntax)
  - Keywords (int, return, #include) should be one color
  - Strings ("Hello, OI!") should be another color
  - Comments (//) should be a third color
- The other 5 tabs are still placeholder QLabels
- The window title is "Oler IDE v2"
```

- [ ] **Step 2: User confirms (or reports issues)**

User runs the app and reports back. If issues:
- Highlighting colors don't appear → index.katesyntax not loaded → check Task 2
- Editor tab is empty → OlerEditor.setPlainText not called → check Task 4
- Tabs are out of order → check MainWindow.cpp ordering
- Crash on launch → run test_highlight.exe to isolate (Task 3)

**Acceptance:** User confirms visual highlighting works in OlerEditor.

---

### Task 6: Tag v2.1.0-editor

**Files:** (no code changes)

- [ ] **Step 1: Verify clean state**

```powershell
git -C D:\oler-ide-v2 status --short
```
Expected: clean working tree. If anything is uncommitted, commit it first.

- [ ] **Step 2: Move v2.0.0-foundation tag (or keep)**

Keep v2.0.0-foundation tag as-is (don't move it). Create a new tag v2.1.0-editor on the current HEAD to mark this phase.

- [ ] **Step 3: Tag**

```powershell
git -C D:\oler-ide-v2 tag -a v2.1.0-editor -m "v2.1.0: OlerEditor wired into MainWindow + katehighlightingindexer stub fixed (visual highlighting works)"
```

- [ ] **Step 4: Verify**

```powershell
git -C D:\oler-ide-v2 tag --list -n5
git -C D:\oler-ide-v2 log v2.1.0-editor --oneline -5
```
Expected: `v2.1.0-editor` listed, commit log shows the 4 task commits (Task 1-4) on top of `v2.0.0-foundation` tag.

**Acceptance:** Tag `v2.1.0-editor` is at HEAD, all 4 task commits in history.

---

## Self-Review Checklist

- [x] 6 tasks cover both deliverables (kateindexer fix + OlerEditor wiring)
- [x] Each task has specific file paths, code, commands
- [x] No "TBD" / "TODO" / "implement later" / "fill in details"
- [x] Type consistency: OlerEditor pointer used consistently; m_editorPage name matches between .h and .cpp
- [x] Global constraints explicitly called out
- [x] TDD-flavored: Task 3 is a verification gate (test_highlight) before Task 4 (wiring) before Task 5 (visual)
- [x] File deletion gated: only `cmd /c rmdir` mentioned, never PowerShell Remove-Item
- [x] ABI strict: MinGW 13.1.0 + Qt 6.8.0 mentioned in every relevant step
- [x] All ASCII paths (D:\oler-ide-v2)
- [x] windeployqt's POST_BUILD already deploys Qt DLLs (no PATH prepend needed in smoke tests)
- [x] Visual verification (Task 5) is user-driven, not implementer

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-21-phase4-editor-and-highlight.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks
2. **Inline Execution** — Execute tasks in this session with checkpoints

**Which approach?**
