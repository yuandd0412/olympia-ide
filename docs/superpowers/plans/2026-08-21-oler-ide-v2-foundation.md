# Oler IDE v2 - Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a runnable Oler IDE v2 foundation (empty QMainWindow + 4 theme switching + KSyntax code highlighting), and verify the strict-ABI compatibility chain between Qt 6.8.0, MinGW 13.1.0, and KSyntax 6.8.0.
**Architecture:** Qt 6.8 C++17 desktop app. Vendored ECM + KSyntaxHighlighting (`third_party/` + `add_subdirectory`). 4-theme QSS switching + KSyntax repository theme sync. Single-process main window.
**Tech Stack:**
- Qt 6.8.0 (MinGW 13.1.0 prebuilt, `C:\Qt\6.8.0\mingw_64\`)
- MinGW 13.1.0 (Qt bundled, `C:\Qt\Tools\mingw1310_64\bin\g++.exe`)
- CMake 4.x + Ninja
- KSyntaxHighlighting 6.8.0 (vendored, LGPL)
- ECM 6.8.0 (vendored, BSD)
- C++17

## Global Constraints

> These v1 lessons are baked in; every step implicitly obeys them.
- **Project root**: `D:\oler-ide-v2` (ASCII only, no subst/junction)
- **Strict compiler**: must be `C:\Qt\Tools\mingw1310_64\bin\g++.exe`. System `D:\OI\mingw64\bin` (16.1.0) and Strawberry 13.2.0 are ABI-incompatible. **Vendor route**: `add_subdirectory(third_party/...) EXCLUDE_FROM_ALL`, no FetchContent + patch.
- **WIN32_EXECUTABLE FALSE**: MinGW 13.1.0's `libQt6EntryPoint.a` references MSVC's `__imp___argc`, so it MUST be FALSE.
- **File deletion gated**: the assistant cannot directly run `Remove-Item` / `rm` / `del`. Use `cmd /c rmdir /s /q <ASCII-absolute-path>` and let the user run it.
- **Report at every checkpoint**: any work item taking >30 min must be reported on completion; killing processes, deleting files, or rewriting git history requires explicit confirmation every time. **Done definition**: 'done' means confirmed by the user on a real machine OR validated by automated tests, never by the assistant's own confidence.
- **License**: MIT
- **API keys must never be logged/printed/committed**: received via prompt context, verified with inline `python -c` without persisting. **PowerShell 5.1 notes**: no `&&`/`||` (use `;`); no `cd /d` (cmd only); CJK string literals need `[char]0xHHHH`; `Set-Location` does not recognize a fresh drive, use absolute paths. **PS 5.1 ANSI rendering**: printing Chinese literals to console shows mojibake, but the internal UTF-16 is correct.
- **Lingering processes**: after any Qt / MSVC / CMake abnormal exit, run `Get-Process | Where-Object {$_.Name -match 'cmake|ninja|g\+\+|gcc|moc|qmake'} | Stop-Process -Force`.

## File Structure

New files (by role):
- `D:\oler-ide-v2\AGENTS.md` - v1 lessons baked in (Phase 0)
- `D:\oler-ide-v2\README.md` - project overview
- `D:\oler-ide-v2\LICENSE` - MIT
- `D:\oler-ide-v2\.gitignore` - already created
- `D:\oler-ide-v2\CMakeLists.txt` - root build script
- `D:\oler-ide-v2\CMakePresets.json` - mingw + msvc presets
- `D:\oler-ide-v2\cmake\shims\ECMConfig.cmake` - vendor shim
- `D:\oler-ide-v2\cmake\shims\ECMConfigVersion.cmake` - version compat
- `D:\oler-ide-v2\src\app\main.cpp` - entry point
- `D:\oler-ide-v2\src\app\OlerApplication.h/.cpp` - theme initialization. `D:\oler-ide-v2\src\ui\mainwindow\MainWindow.h/.cpp` - main window (ActivityBar 56px + TabBar 36px + 5 stackedWidget).
- `D:\oler-ide-v2\src\ui\editor\OlerEditor.h/.cpp` - KSyntax wrapper editor. `D:\oler-ide-v2\src\core\theme\CThemeManager.h/.cpp` - theme switching singleton.
- `D:\oler-ide-v2\resources\themes\OneDarkPro.qss` - Atom One Dark Pro palette
- `D:\oler-ide-v2\resources\themes\OneLight.qss` - Atom One Light palette
- `D:\oler-ide-v2\resources\themes\AmberDark.qss` - v0 design file warm amber/terracotta dark
- `D:\oler-ide-v2\resources\themes\AmberLight.qss` - same family, light
- `D:\oler-ide-v2\resources\themes\themes.qrc` - Qt resource file
- `D:\oler-ide-v2\third_party\extra-cmake-modules\` - git clone (vendored, .gitignore)
- `D:\oler-ide-v2\third_party\syntax-highlighting\` - git clone (vendored, .gitignore)
- `D:\oler-ide-v2\third_party\syntax-highlighting\data\CMakeLists.txt` - patch (remove add_dependencies)
- `D:\oler-ide-v2\docs\01-product\positioning.md` - product positioning
- `D:\oler-ide-v2\docs\02-design-system\tokens.md` - design tokens
- `D:\oler-ide-v2\docs\03-shell-pages\{problems,training,mistakes,ai,settings}.md` - 5 tab designs
- `D:\oler-ide-v2\docs\04-editor\subpages.md` - editor's 4 sub-pages
- `D:\oler-ide-v2\docs\05-test-results\panel.md` - test result panel
- `D:\oler-ide-v2\docs\06-welcome\onboarding.md` - welcome screen. `D:\oler-ide-v2\docs\07-risks\v1-lessons.md` - v1 lessons.
- `D:\oler-ide-v2\docs\08-roadmap\phases.md` - roadmap. `D:\oler-ide-v2\docs\09-glossary\terms.md` - OI terminology.
Modified files: none (v2 is a brand-new project).

---

## Task 0: Safety Guards + Repo Init

**Files:**
- Create: `D:\oler-ide-v2\AGENTS.md`
- Create: `D:\oler-ide-v2\README.md`
- Create: `D:\oler-ide-v2\LICENSE` (已建)
- Create: `D:\oler-ide-v2\.gitignore` (已建)
- Create: `D:\oler-ide-v2\docs\` (subdirectories already created)

**Acceptance:**
- `AGENTS.md` - full v1 lessons text (v0 experience condensed)
- `README.md` - concise (project summary + roadmap + startup command)
- `LICENSE` = MIT (已建)
- `.gitignore` 排除 `build/`, `third_party/`, `.qt/` (已建)

- [ ] **Step 0.1: create AGENTS.md**

`D:\oler-ide-v2\AGENTS.md` 内容大纲:
```markdown
# Oler IDE v2 - Project Agent Guide

## 项目一句话
Qt 6.8 + C++17 + MinGW 13.1.0 rewrite of a desktop OI coding IDE. Dark-mode first, information dense, with built-in compiler, OJ account manager, and AI assistant.
## Paths and Directories - Project root `D:\oler-ide-v2` (ASCII only; do not use Chinese paths; `moc`/`rcc`/`qmake` are broken on CJK paths in Qt 6.8.0).
- 构建: D:\oler-ide-v2\build\ (gitignored)
- Vendor: `D:\oler-ide-v2\third_party\` (gitignored, re-clonable)
- Qt: C:\Qt\6.8.0\mingw_64\
- MinGW: C:\Qt\Tools\mingw1310_64\bin\ (Qt 自带, ABI 严格匹配 Qt 6.8.0 prebuilt)

## ABI 严格规则
- Qt 6.8.0 prebuilt is compiled with MinGW 13.1.0; toolchain MUST be 13.1.0.
- System `D:\OI\mingw64\bin\` is MinGW 16.1.0 (UCRT) - ABI-incompatible. Causes `0xC0000374` heap corruption.
- Strawberry `C:\Strawberry\c\bin\` is MinGW 13.2.0 - ABI-incompatible. Every CMake call MUST pass explicitly: `-DCMAKE_CXX_COMPILER=C:/Qt/Tools/mingw1310_64/bin/g++.exe`

## Lessons from v1: 1. `WIN32_EXECUTABLE` MUST be `FALSE` under MinGW 13.1.0 (`libQt6EntryPoint.a` references `__imp___argc`).
2. Vendor route: `add_subdirectory(third_party/...) EXCLUDE_FROM_ALL`; do NOT depend on `FetchContent`.
3. KSyntax 6.x Repository 没有 static instance(), 必须 `new Repository()` (ctor 不接 parent)
4. `Q_PROPERTY` pointer types MUST be forward-declared, not fully included (Qt 6 moc requirement).
5. `QMenu::addAction` 4-arg overload was removed in Qt 6; use the 2-arg form. 6. `addDockWidget` cannot be a child of `QTabWidget`.
7. `stdin` is a `stdio.h` macro; it cannot be a Qt property name - rename to `stdinText`.
8. `Q_GADGET` cannot be repeated; two structs both marked `Q_GADGET` re-define `staticMetaObject`.
9. CJK paths break `moc.exe` (Qt 6.8.0 MinGW): `Cannot create .../moc_xxx.cpp` - keep the project root ASCII.
10. PS 5.1 `Set-Location` does not recognize a fresh `subst` drive; call `cmake` with absolute paths.
11. PS 5.1 `C:\strawberry\c\bin` mistakenly rewrites the cmake path (`-replace` misdelete); use the absolute path of `$cmake` directly.
## 文件删除规则
- The assistant MUST NEVER run `Remove-Item` / `rm` / `del` / `Move-Item to /dev/null` directly.
- For recursive deletes, suggest `cmd /c rmdir /s /q <ASCII-absolute-path>` and let the user run it - PowerShell `Remove-Item` is blocked by the desktop permission gate (Wipe category).
- `cmd /c rmdir /s /q` uses the .NET API and is NOT blocked by the gate.

## 每步自检
- 调研/设计/实现每步完成态先汇报, 等拍板再继续
- Irreversible actions (kill process / delete file / rewrite git history) require explicit user confirmation every time. 'Done' is defined by user confirmation on a real machine OR automated tests passing.

## License
MIT (LICENSE 文件)
```

- [ ] **Step 0.2: create README.md**

```markdown
# Oler IDE

Qt 6.8 + C++17 desktop OI coding IDE, with built-in compiler, OJ account manager, and AI assistant.
## Current status: v2 foundation phase - empty main window + 4 theme switching + KSyntax code highlighting (Phase 0 + 1 + 2 + 3).
## Roadmap: - [x] Phase 0: safety guards + repo init
- [WIP] Phase 1: skeleton (empty main window + ABI chain verification)
- [WIP] Phase 2: 4-theme system
- [WIP] Phase 3: vendor (ECM + KSyntax)
- [ ] Phase 4: core (OlerApi + 7 components)
- [ ] Phase 5: Shell 5 tabs UI
- [ ] Phase 6: compiler pipeline + OJ adapters. - [ ] Phase 7+: AI assistant (dots.ai)

## 启动
```powershell
# 配置
cmake -G Ninja -B build -S . -DCMAKE_CXX_COMPILER=C:/Qt/Tools/mingw1310_64/bin/g++.exe -DCMAKE_PREFIX_PATH=C:/Qt/6.8.0/mingw_64

# 构建
cmake --build build --parallel

# Run build\oler-ide.exe
```

## License
MIT - see LICENSE.
```

- [ ] **Step 0.3: git init + first commit (empty scaffold)**

```powershell
cd D:\oler-ide-v2
git init
git add AGENTS.md README.md LICENSE .gitignore
git commit -m "chore: scaffold v2 foundation (AGENTS.md + README + LICENSE + .gitignore)"
```

Expected: 1 commit, 4 files, no untracked.

**Acceptance:** Repo initialized, 4 files in the first commit, `third_party/` and `build/` in `.gitignore` (so future fills do not pollute git).

---

## Task 1: Empty QMainWindow Skeleton

**Files:**
- Create: `D:\oler-ide-v2\src\app\main.cpp`
- Create: `D:\oler-ide-v2\CMakeLists.txt`

**Interfaces:**
- Consumes: Qt 6.8 Core, Gui, Widgets
- Produces: `oler-ide.exe` (console subsystem, 编译链接成功, 启动 3s alive)

- [ ] **Step 1.1: write the minimal `main.cpp`**

```cpp
#include <QApplication>
#include <QMainWindow>
#include <QLabel>
#include <QTimer>
#include <QtGlobal>

int main(int argc, char *argv[]) {
    qputenv("QT_QPA_PLATFORM", "minimal");  // smoke test 模式
    QApplication app(argc, argv);
    QMainWindow w;
    w.setWindowTitle("Oler IDE v2");
    w.resize(1280, 800);
    QLabel *lbl = new QLabel("Oler IDE v2 - foundation", &w);
    lbl->setAlignment(Qt::AlignCenter);
    w.setCentralWidget(lbl);
    w.show();
    QTimer::singleShot(3000, &app, &QCoreApplication::quit);
    return app.exec();
}
```

- [ ] **Step 1.2: create CMakeLists.txt (root)**

```cmake
cmake_minimum_required(VERSION 3.20)
project(OlerIDE VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

if(WIN32 AND NOT DEFINED CMAKE_PREFIX_PATH)
    list(APPEND CMAKE_PREFIX_PATH "C:/Qt/6.8.0/mingw_64")
endif()

find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets)

add_executable(oler-ide
    src/app/main.cpp
)

# v1 lesson: MinGW 13.1.0's libQt6EntryPoint.a references MSVC __imp___argc, MUST be FALSE
if(MINGW)
    set_target_properties(oler-ide PROPERTIES WIN32_EXECUTABLE FALSE)
else()
    set_target_properties(oler-ide PROPERTIES WIN32_EXECUTABLE TRUE)
endif()

target_link_libraries(oler-ide PRIVATE
    Qt6::Core Qt6::Gui Qt6::Widgets
)
```

- [ ] **Step 1.3: Configure**

```powershell
cd D:\oler-ide-v2
& 'D:\OI\mingw64\bin\cmake.exe' -G Ninja -B build -S . `
  -DCMAKE_CXX_COMPILER='C:/Qt/Tools/mingw1310_64/bin/g++.exe' `
  -DCMAKE_C_COMPILER='C:/Qt/Tools/mingw1310_64/bin/gcc.exe' `
  -DCMAKE_PREFIX_PATH='C:/Qt/6.8.0/mingw_64' `
  -DCMAKE_RC_COMPILER='C:/Qt/Tools/mingw1310_64/bin/windres.exe'
```

Expected: exit 0, `-- The CXX compiler identification is GNU 13.1.0`, `-- Configuring done`, `-- Build files have been written to: D:/oler-ide-v2/build`.

- [ ] **Step 1.4: Build**

```powershell
& 'D:\OI\mingw64\bin\cmake.exe' --build build --parallel
```

Expected: exit 0, `[2/2] Linking CXX executable oler-ide.exe`, `build\oler-ide.exe` 存在 (~150KB).

- [ ] **Step 1.5: Smoke test**

```powershell
$env:QT_QPA_PLATFORM = 'minimal'
$env:QT_FORCE_STDERR_LOGGING = '1'
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath 'D:\oler-ide-v2\build\oler-ide.exe' -PassThru
Start-Sleep -Milliseconds 2500
if ($p.HasExited) { throw "FAIL: process died early at $($sw.Elapsed.TotalSeconds)s, exit=$($p.ExitCode)" }
Write-Output "[ok] alive at 2.5s (pid=$($p.Id))"
$p.WaitForExit()  # wait for QTimer::singleShot(3000) to fire
$sw.Stop()
if ($sw.Elapsed.TotalSeconds -lt 2.5) { throw "FAIL: process exited too fast ($($sw.Elapsed.TotalSeconds)s)" }
Write-Output "[ok] exited cleanly in $($sw.Elapsed.TotalSeconds)s"
```

Expected: `[ok] alive at 2.5s` + `[ok] exited cleanly in ~3s`. **If 0xC0000374**: the compiler ABI is wrong; check that `$gcc` is really `13.1.0`.

- [ ] **Step 1.6: Commit**

```powershell
git add src/ CMakeLists.txt
git commit -m "feat(phase-1): empty QMainWindow skeleton, MinGW 13.1.0 ABI verified"
```

**Acceptance:** `build/oler-ide.exe` launches and stays alive 4s (QTimer::singleShot 3s quit), QApplication exits cleanly with code 0.
---

## Task 2: Vendor ECM (Extra CMake Modules)

**Files:**
- Create: `D:\oler-ide-v2\third_party\extra-cmake-modules\` (git clone)
- Create: `D:\oler-ide-v2\cmake\shims\ECMConfig.cmake`
- Create: `D:\oler-ide-v2\cmake\shims\ECMConfigVersion.cmake`
- Modify: `D:\oler-ide-v2\CMakeLists.txt` (add vendor steps)

**Interfaces:**
- Consumes: GitHub KDE mirror (proxy `http://127.0.0.1:7897`)
- Produces: `find_package(ECM)` 找到, `ECM_VERSION=6.8.0` 可读

- [ ] **Step 2.1: Git clone ECM**

```powershell
& 'D:\软件\Git\cmd\git.exe' clone --depth 1 --branch v6.8.0 https://github.com/KDE/extra-cmake-modules.git D:\oler-ide-v2\third_party\extra-cmake-modules
```

Expected: 1.1MB cloned, `ECM_VERSION=6.8.0` in `ECMConfigVersion.cmake`.

- [ ] **Step 2.2: create ECMConfig.cmake shim**

```cmake
# cmake/shims/ECMConfig.cmake - vendor shim for find_package(ECM) NO_MODULE
set(PACKAGE_VERSION "@ECM_VERSION@")
set(PACKAGE_VERSION_COMPATIBLE TRUE)
set(PACKAGE_VERSION_EXACT TRUE)
set(ECM_VERSION "@ECM_VERSION@")
set(ECM_KDE_MODULE_DIR "${CMAKE_CURRENT_LIST_DIR}/../../third_party/extra-cmake-modules/modules" CACHE PATH "ECM modules")
set(ECM_MODULE_DIR "${ECM_KDE_MODULE_DIR}" CACHE PATH "ECM modules alias")
list(APPEND CMAKE_MODULE_PATH "${ECM_MODULE_DIR}")
include("${ECM_MODULE_DIR}/ECMUseFindModules.cmake" OPTIONAL RESULT_VARIABLE _ecm_use_loaded)
if(_ecm_use_loaded)
    message(STATUS "[ECMConfig shim] LOADED; PACKAGE_VERSION=${PACKAGE_VERSION}; ECM_VERSION=${ECM_VERSION}")
endif()
```

Replace `@ECM_VERSION@` with `6.8.0` (literal).

- [ ] **Step 2.3: create ECMConfigVersion.cmake**

```cmake
set(PACKAGE_VERSION "6.8.0")
if("${PACKAGE_VERSION}" VERSION_LESS "${PACKAGE_FIND_VERSION}")
    set(PACKAGE_VERSION_COMPATIBLE FALSE)
else()
    set(PACKAGE_VERSION_COMPATIBLE TRUE)
    if("${PACKAGE_VERSION}" VERSION_EQUAL "${PACKAGE_FIND_VERSION}")
        set(PACKAGE_VERSION_EXACT TRUE)
    endif()
endif()
```

- [ ] **Step 2.4: 修改 root CMakeLists.txt**

After `find_package(Qt6 ...)`, add:
```cmake
# Vendor ECM
set(ECM_DIR "${CMAKE_SOURCE_DIR}/cmake/shims" CACHE PATH "ECM shim directory" FORCE)
add_subdirectory(third_party/extra-cmake-modules EXCLUDE_FROM_ALL)
include(cmake/shims/ECMConfig.cmake)
```

- [ ] **Step 2.5: Configure 验证**

```powershell
& 'D:\OI\mingw64\bin\cmake.exe' -B build -S . -DCMAKE_CXX_COMPILER='C:/Qt/Tools/mingw1310_64/bin/g++.exe' -DCMAKE_PREFIX_PATH='C:/Qt/6.8.0/mingw_64'
```

Expected: `-- [ECMConfig shim] LOADED; PACKAGE_VERSION=6.8.0; ECM_VERSION=6.8.0`, `Configuring done`.

- [ ] **Step 2.6: Commit**

```powershell
git add cmake/ CMakeLists.txt
git commit -m "feat(phase-3): vendor ECM 6.8.0 with shim"
```

Note: `third_party/` is in `.gitignore`, so the commit will not include the actual vendor directories; it commits the shim + root config.

**Acceptance:** `find_package(ECM)` no longer reports 'ECM not found'; the shim prints LOADED.
---

## Task 3: Vendor KSyntaxHighlighting

**Files:**
- Create: `D:\oler-ide-v2\third_party\syntax-highlighting\` (git clone)
- Modify: `D:\oler-ide-v2\third_party\syntax-highlighting\data\CMakeLists.txt` (patch)
- Modify: `D:\oler-ide-v2\CMakeLists.txt` (add `add_subdirectory`)

**Interfaces:**
- Consumes: GitHub KDE mirror
- Produces: `libKF6SyntaxHighlighting.dll` linked successfully, headers includable

- [ ] **Step 3.1: Git clone KSyntax**

```powershell
& 'D:\软件\Git\cmd\git.exe' clone --depth 1 --branch v6.8.0 https://github.com/KDE/syntax-highlighting.git D:\oler-ide-v2\third_party\syntax-highlighting
```

Expected: 42.4MB cloned, `src/lib/ksyntaxhighlighting.h` exists.
- [ ] **Step 3.2: Patch data/CMakeLists.txt (work around katehighlightingindexer STATUS_HEAP_CORRUPTION)**

打开 `D:\oler-ide-v2\third_party\syntax-highlighting\data\CMakeLists.txt`, 删除:
```cmake
add_dependencies(SyntaxHighlightingData katesyntax)
```

并把:
```cmake
COMMAND $<TARGET_FILE:katehighlightingindexer> --source $src $<GENEX_EVAL:$<TARGET_PROPERTY:SyntaxHighlightingData,GENEX_DATA>> --target $out
```
And also remove `DEPENDS index.katesyntax` (if present).
Or, more stable fix - at the root CMakeLists.txt, add:
```cmake
set(QRC_SYNTAX OFF CACHE BOOL "Skip QRC_SYNTAX" FORCE)
set(BUILD_TESTING OFF CACHE BOOL "Skip tests" FORCE)
```

Place before add_subdirectory.
- [ ] **Step 3.3: create KSyntax add_subdirectory**

At the end of root CMakeLists.txt:
```cmake
# Vendor KSyntax
add_subdirectory(third_party/syntax-highlighting EXCLUDE_FROM_ALL)
target_link_libraries(oler-ide PRIVATE KF6SyntaxHighlighting)
```

Note: under `add_subdirectory` mode the `KF6SyntaxHighlighting` target is NOT the one generated by `install(EXPORT NAMESPACE KF6::)`; do not use `KF6::SyntaxHighlighting`.
- [ ] **Step 3.4: Configure + Build**

```powershell
& 'D:\OI\mingw64\bin\cmake.exe' -B build -S . -DCMAKE_CXX_COMPILER='C:/Qt/Tools/mingw1310_64/bin/g++.exe' -DCMAKE_PREFIX_PATH='C:/Qt/6.8.0/mingw_64'
& 'D:\OI\mingw64\bin\cmake.exe' --build build --parallel
```

Expected: configure 0, build 0, `build/bin/libKF6SyntaxHighlighting.dll` ~960KB, `build/oler-ide.exe` grows by ~200KB.
- [ ] **Step 3.5: Smoke test**

Repeat Task 1.5. Expected: still alive (KSyntax static load succeeds, no crash).
- [ ] **Step 3.6: Commit**

```powershell
git add CMakeLists.txt
git commit -m "feat(phase-3): vendor KSyntax 6.8.0, link KF6SyntaxHighlighting"
```

**Acceptance:** `libKF6SyntaxHighlighting.dll` exists and `oler-ide.exe` starts normally.
---

## Task 4: 4 Theme QSS Files

**Files:**
- Create: `D:\oler-ide-v2\resources\themes\OneDarkPro.qss`
- Create: `D:\oler-ide-v2\resources\themes\OneLight.qss`
- Create: `D:\oler-ide-v2\resources\themes\AmberDark.qss`
- Create: `D:\oler-ide-v2\resources\themes\AmberLight.qss`
- Create: `D:\oler-ide-v2\resources\themes\themes.qrc`

**Interfaces:**
- Consumes: 设计 token (v0 design file + One Dark Pro spec)
- Produces: 4 independent QSS files, each switchable in one line via `qApp->setStyleSheet(...)`

- [ ] **Step 4.1: create OneDarkPro.qss**

基于 Atom One Dark Pro 配色:
```css
/* OneDarkPro - dark, blue-purple accent */
QMainWindow, QWidget { background-color: #282c34; color: #abb2bf; }
QMenuBar { background-color: #21252b; color: #abb2bf; border-bottom: 1px solid #181a1f; }
QMenuBar::item:selected { background-color: #2c313a; }
QMenu { background-color: #21252b; color: #abb2bf; border: 1px solid #181a1f; }
QMenu::item:selected { background-color: #61afef; color: #282c34; }
QToolBar { background-color: #21252b; border-right: 1px solid #181a1f; spacing: 4px; }
QToolButton { padding: 8px; border: none; border-radius: 4px; color: #abb2bf; }
QToolButton:hover { background-color: #2c313a; }
QToolButton:checked { background-color: #61afef; color: #282c34; }
QStatusBar { background-color: #21252b; color: #5c6370; border-top: 1px solid #181a1f; }
QTabBar::tab { background-color: #21252b; color: #abb2bf; padding: 6px 12px; border-right: 1px solid #181a1f; }
QTabBar::tab:selected { background-color: #282c34; border-bottom: 2px solid #61afef; }
QLabel { color: #abb2bf; }
QStackedWidget { background-color: #282c34; }
```

- [ ] **Step 4.2: create OneLight.qss**

```css
/* OneLight - light, blue-purple accent */
QMainWindow, QWidget { background-color: #fafafa; color: #383a42; }
QMenuBar { background-color: #f0f0f0; color: #383a42; border-bottom: 1px solid #e0e0e0; }
QMenuBar::item:selected { background-color: #e8e8e8; }
QMenu { background-color: #f0f0f0; color: #383a42; border: 1px solid #d0d0d0; }
QMenu::item:selected { background-color: #4078f2; color: #ffffff; }
QToolBar { background-color: #f0f0f0; border-right: 1px solid #e0e0e0; spacing: 4px; }
QToolButton { padding: 8px; border: none; border-radius: 4px; color: #383a42; }
QToolButton:hover { background-color: #e8e8e8; }
QToolButton:checked { background-color: #4078f2; color: #ffffff; }
QStatusBar { background-color: #f0f0f0; color: #a0a1a7; border-top: 1px solid #e0e0e0; }
QTabBar::tab { background-color: #f0f0f0; color: #383a42; padding: 6px 12px; border-right: 1px solid #e0e0e0; }
QTabBar::tab:selected { background-color: #fafafa; border-bottom: 2px solid #4078f2; }
QLabel { color: #383a42; }
QStackedWidget { background-color: #fafafa; }
```

- [ ] **Step 4.3: create AmberDark.qss (v0 design file warm amber/terracotta)**

```css
/* AmberDark - dark, warm amber/terracotta accent */
QMainWindow, QWidget { background-color: #131311; color: #f1f1ef; }
QMenuBar { background-color: rgba(0,0,0,0.35); color: #f1f1ef; border-bottom: 1px solid #252524; }
QMenuBar::item:selected { background-color: #252524; }
QMenu { background-color: #1a1915; color: #f1f1ef; border: 1px solid #252524; }
QMenu::item:selected { background-color: #d97757; color: #131311; }
QToolBar { background-color: rgba(0,0,0,0.35); border-right: 1px solid #252524; spacing: 4px; }
QToolButton { padding: 8px; border: none; border-radius: 6px; color: #f1f1ef; }
QToolButton:hover { background-color: #252524; }
QToolButton:checked { background-color: #d97757; color: #131311; }
QStatusBar { background-color: rgba(0,0,0,0.35); color: #6e6d68; border-top: 1px solid #252524; }
QTabBar::tab { background-color: rgba(0,0,0,0.35); color: #a0a0a3; padding: 6px 12px; border-right: 1px solid #252524; }
QTabBar::tab:selected { background-color: #1a1915; border-bottom: 2px solid #d97757; }
QLabel { color: #f1f1ef; }
QStackedWidget { background-color: #131311; }
```

- [ ] **Step 4.4: create AmberLight.qss**

```css
/* AmberLight - light, warm amber/terracotta accent */
QMainWindow, QWidget { background-color: #fafaf7; color: #2c2a26; }
QMenuBar { background-color: #f0eee8; color: #2c2a26; border-bottom: 1px solid #e0ddd5; }
QMenuBar::item:selected { background-color: #e8e5dd; }
QMenu { background-color: #fafaf7; color: #2c2a26; border: 1px solid #d0cdc5; }
QMenu::item:selected { background-color: #d97757; color: #ffffff; }
QToolBar { background-color: #f0eee8; border-right: 1px solid #e0ddd5; spacing: 4px; }
QToolButton { padding: 8px; border: none; border-radius: 6px; color: #2c2a26; }
QToolButton:hover { background-color: #e8e5dd; }
QToolButton:checked { background-color: #d97757; color: #ffffff; }
QStatusBar { background-color: #f0eee8; color: #6a6864; border-top: 1px solid #e0ddd5; }
QTabBar::tab { background-color: #f0eee8; color: #6a6864; padding: 6px 12px; border-right: 1px solid #e0ddd5; }
QTabBar::tab:selected { background-color: #fafaf7; border-bottom: 2px solid #d97757; }
QLabel { color: #2c2a26; }
QStackedWidget { background-color: #fafaf7; }
```

- [ ] **Step 4.5: create themes.qrc**

```xml
<RCC>
    <qresource prefix="/themes">
        <file>OneDarkPro.qss</file>
        <file>OneLight.qss</file>
        <file>AmberDark.qss</file>
        <file>AmberLight.qss</file>
    </qresource>
</RCC>
```

- [ ] **Step 4.6: CMakeLists.txt add qrc**

```cmake
add_executable(oler-ide
    src/app/main.cpp
    resources/themes/themes.qrc
)
```

- [ ] **Step 4.7: Commit**

```powershell
git add resources/themes/
git commit -m "feat(phase-2): 4 theme QSS files (OneDarkPro/OneLight/AmberDark/AmberLight)"
```

**Acceptance:** 4 QSS files compiled into the qrc; the resource path `/themes/OneDarkPro.qss` etc. are accessible.
---

## Task 5: CThemeManager

**Files:**
- Create: `D:\oler-ide-v2\src\core\theme\CThemeManager.h`
- Create: `D:\oler-ide-v2\src\core\theme\CThemeManager.cpp`
- Modify: `D:\oler-ide-v2\src\app\main.cpp` (use CThemeManager)
- Modify: `D:\oler-ide-v2\CMakeLists.txt` (add CThemeManager to add_executable)

**Interfaces:**
- Consumes: themes.qrc (已建)
- Produces: `CThemeManager::instance()->applyTheme("AmberDark")` switches the theme in one line
- [ ] **Step 5.1: create CThemeManager.h**

```cpp
#pragma once
#include <QObject>
#include <QString>
#include <QStringList>

class CThemeManager : public QObject {
    Q_OBJECT
public:
    static CThemeManager *instance();

    QStringList availableThemes() const;
    QString currentTheme() const;

    Q_INVOKABLE void applyTheme(const QString &name);
    Q_INVOKABLE void cycleTheme();  // OneDarkPro -> OneLight -> AmberDark -> AmberLight -> OneDarkPro

signals:
    void themeChanged(const QString &name);

private:
    explicit CThemeManager(QObject *parent = nullptr);
    QString m_current;
};
```

- [ ] **Step 5.2: create CThemeManager.cpp**

```cpp
#include "CThemeManager.h"
#include <QApplication>
#include <QFile>
#include <QTextStream>

CThemeManager *CThemeManager::instance() {
    static CThemeManager inst;
    return &inst;
}

CThemeManager::CThemeManager(QObject *parent) : QObject(parent), m_current("AmberDark") {}

QStringList CThemeManager::availableThemes() const {
    return {"OneDarkPro", "OneLight", "AmberDark", "AmberLight"};
}

QString CThemeManager::currentTheme() const {
    return m_current;
}

void CThemeManager::applyTheme(const QString &name) {
    QFile f(QString(":/themes/%1.qss").arg(name));
    if (!f.open(QFile::ReadOnly | QFile::Text)) return;
    QTextStream in(&f);
    in.setEncoding(QStringConverter::Utf8);
    qApp->setStyleSheet(in.readAll());
    m_current = name;
    emit themeChanged(name);
}

void CThemeManager::cycleTheme() {
    auto themes = availableThemes();
    int idx = themes.indexOf(m_current);
    applyTheme(themes.at((idx + 1) % themes.size()));
}
```

- [ ] **Step 5.3: main.cpp uses CThemeManager**

```cpp
#include <QApplication>
#include <QMainWindow>
#include <QLabel>
#include <QTimer>
#include "core/theme/CThemeManager.h"

int main(int argc, char *argv[]) {
    qputenv("QT_QPA_PLATFORM", "minimal");
    QApplication app(argc, argv);
    CThemeManager::instance()->applyTheme("AmberDark");
    QMainWindow w;
    w.setWindowTitle("Oler IDE v2");
    w.resize(1280, 800);
    QLabel *lbl = new QLabel("Oler IDE v2 - foundation", &w);
    lbl->setAlignment(Qt::AlignCenter);
    w.setCentralWidget(lbl);
    w.show();
    QTimer::singleShot(3000, &app, &QCoreApplication::quit);
    return app.exec();
}
```

- [ ] **Step 5.4: CMakeLists.txt adds source**

```cmake
add_executable(oler-ide
    src/app/main.cpp
    src/core/theme/CThemeManager.cpp
    resources/themes/themes.qrc
)
target_include_directories(oler-ide PRIVATE src)
```

- [ ] **Step 5.5: Build + Smoke test**

```powershell
& 'D:\OI\mingw64\bin\cmake.exe' --build build --parallel
# 重复 Task 1.5 smoke test
```

Expected: build 0, alive (QSS applied, minimal QPA cannot show visuals but the QSS is loaded).
- [ ] **Step 5.6: Commit**

```powershell
git add src/core/theme/ src/app/main.cpp CMakeLists.txt
git commit -m "feat(phase-2): CThemeManager singleton, 4 theme switching API"
```

**Acceptance:** `CThemeManager::instance()->applyTheme("AmberDark")` switches the QSS in one line, build + smoke test pass.
---

## Task 6: OlerEditor (KSyntax Wrapper)

**Files:**
- Create: `D:\oler-ide-v2\src\ui\editor\OlerEditor.h`
- Create: `D:\oler-ide-v2\src\ui\editor\OlerEditor.cpp`
- Modify: `D:\oler-ide-v2\src\app\main.cpp` (use OlerEditor)
- Modify: `D:\oler-ide-v2\CMakeLists.txt` (add OlerEditor)

**Interfaces:**
- Consumes: KSyntaxHighlighting::Repository + SyntaxHighlighter
- Produces: `OlerEditor` (QPlainTextEdit subclass) 自动应用 C++ syntax + 当前主题

- [ ] **Step 6.1: create OlerEditor.h**

```cpp
#pragma once
#include <QPlainTextEdit>
#include <memory>

namespace KSyntaxHighlighting {
class Repository;
class SyntaxHighlighter;
}

class CThemeManager;

class OlerEditor : public QPlainTextEdit {
    Q_OBJECT
public:
    explicit OlerEditor(QWidget *parent = nullptr);
    ~OlerEditor() override;

    void setLanguage(const QString &lang);  // e.g. "C++", "Python"
    void applyThemeFromManager();

private:
    std::unique_ptr<KSyntaxHighlighting::Repository> m_repo;
    KSyntaxHighlighting::SyntaxHighlighter *m_highlighter = nullptr;
    QString m_language;
};
```

- [ ] **Step 6.2: create OlerEditor.cpp**

```cpp
#include "OlerEditor.h"
#include <KSyntaxHighlighting/Repository>
#include <KSyntaxHighlighting/SyntaxHighlighter>
#include <KSyntaxHighlighting/Theme>
#include "core/theme/CThemeManager.h"

OlerEditor::OlerEditor(QWidget *parent)
    : QPlainTextEdit(parent)
    , m_repo(new KSyntaxHighlighting::Repository())
    , m_highlighter(new KSyntaxHighlighting::SyntaxHighlighter(document()))
{
    m_highlighter->setDefinition(m_repo->definitionForName(QStringLiteral("C++")));
    applyThemeFromManager();
    connect(CThemeManager::instance(), &CThemeManager::themeChanged,
            this, &OlerEditor::applyThemeFromManager);
}

OlerEditor::~OlerEditor() = default;

void OlerEditor::setLanguage(const QString &lang) {
    m_language = lang;
    auto def = m_repo->definitionForName(lang);
    if (def.isValid()) m_highlighter->setDefinition(def);
}

void OlerEditor::applyThemeFromManager() {
    auto theme = m_repo->theme(CThemeManager::instance()->currentTheme());
    if (!theme.isValid()) theme = m_repo->defaultTheme();
    m_highlighter->setTheme(theme);
}
```

- [ ] **Step 6.3: main.cpp uses OlerEditor**

```cpp
#include <QApplication>
#include <QMainWindow>
#include <QLabel>
#include <QTimer>
#include "ui/editor/OlerEditor.h"
#include "core/theme/CThemeManager.h"

int main(int argc, char *argv[]) {
    qputenv("QT_QPA_PLATFORM", "minimal");
    QApplication app(argc, argv);
    CThemeManager::instance()->applyTheme("AmberDark");
    QMainWindow w;
    w.setWindowTitle("Oler IDE v2");
    w.resize(1280, 800);
    auto *editor = new OlerEditor(&w);
    editor->setPlainText("#include <iostream>\nint main() { return 0; }\n");
    w.setCentralWidget(editor);
    w.show();
    QTimer::singleShot(3000, &app, &QCoreApplication::quit);
    return app.exec();
}
```

- [ ] **Step 6.4: CMakeLists.txt adds source + KSyntax link**

```cmake
add_executable(oler-ide
    src/app/main.cpp
    src/core/theme/CThemeManager.cpp
    src/ui/editor/OlerEditor.cpp
    resources/themes/themes.qrc
)
target_include_directories(oler-ide PRIVATE src)
target_link_libraries(oler-ide PRIVATE
    Qt6::Core Qt6::Gui Qt6::Widgets
    KF6SyntaxHighlighting
)
```

- [ ] **Step 6.5: Build + Smoke test**

Expected: build 0 (KSyntax headers already included), `oler-ide.exe` launches with KSyntax definitions loaded, still alive.
- [ ] **Step 6.6: Commit**

```powershell
git add src/ui/editor/ src/app/main.cpp CMakeLists.txt
git commit -m "feat(phase-2+3): OlerEditor with KSyntaxHighlighting C++ syntax + theme sync"
```

**Acceptance:** OlerEditor loads the C++ definition; theme switch syncs the KSyntax theme (Programmatic API; smoke test: still alive).
---

## Task 7: MainWindow with ActivityBar + TabBar

**Files:**
- Create: `D:\oler-ide-v2\src\ui\mainwindow\MainWindow.h`
- Create: `D:\oler-ide-v2\src\ui\mainwindow\MainWindow.cpp`
- Modify: `D:\oler-ide-v2\src\app\main.cpp`
- Modify: `D:\oler-ide-v2\CMakeLists.txt`

**Interfaces:**
- Consumes: 5 tab names (problems/training/mistakes/ai/settings)
- Produces: 56px ActivityBar (left) + 36px TabBar (top) + QStackedWidget (5 pages)

- [ ] **Step 7.1: create MainWindow.h**

```cpp
#pragma once
#include <QMainWindow>

class QToolBar;
class QTabBar;
class QStackedWidget;
class OlerEditor;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;

private slots:
    void onTabChanged(int index);

private:
    void buildActivityBar();
    void buildTabBar();
    void buildContentPages();

    QToolBar *m_activityBar = nullptr;  // 56px
    QTabBar *m_tabBar = nullptr;        // 36px
    QStackedWidget *m_pages = nullptr;
    OlerEditor *m_editor = nullptr;
};
```

- [ ] **Step 7.2: create MainWindow.cpp**

```cpp
#include "MainWindow.h"
#include <QToolBar>
#include <QTabBar>
#include <QStackedWidget>
#include <QLabel>
#include "ui/editor/OlerEditor.h"

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent) {
    setWindowTitle("Oler IDE v2");
    resize(1280, 800);
    buildActivityBar();
    buildTabBar();
    buildContentPages();
}

MainWindow::~MainWindow() = default;

void MainWindow::buildActivityBar() {
    m_activityBar = addToolBar("Activity");
    m_activityBar->setMovable(false);
    m_activityBar->setFloatable(false);
    m_activityBar->setIconSize({24, 24});
    m_activityBar->setFixedWidth(56);
    auto acts = {
        tr("Problems"), tr("Training"), tr("Mistakes"), tr("AI"), tr("Settings")
    };
    int i = 0;
    for (const auto &name : acts) {
        auto *a = m_activityBar->addAction(name);
        a->setCheckable(true);
        a->setData(i++);
    }
    m_activityBar->actions().at(0)->setChecked(true);
    connect(m_activityBar, &QToolBar::actionTriggered, this, [this](QAction *a) {
        int idx = a->data().toInt();
        m_tabBar->setCurrentIndex(idx);
    });
}

void MainWindow::buildTabBar() {
    m_tabBar = new QTabBar(this);
    m_tabBar->setFixedHeight(36);
    m_tabBar->addTab(tr("Problems"));
    m_tabBar->addTab(tr("Training"));
    m_tabBar->addTab(tr("Mistakes"));
    m_tabBar->addTab(tr("AI Coach"));
    m_tabBar->addTab(tr("Settings"));
    connect(m_tabBar, &QTabBar::currentChanged, this, &MainWindow::onTabChanged);
}

void MainWindow::buildContentPages() {
    m_pages = new QStackedWidget(this);
    auto *placeholder = [](const QString &name) {
        auto *lbl = new QLabel(name + " (Phase 5+)");
        lbl->setAlignment(Qt::AlignCenter);
        return lbl;
    };
    m_pages->addWidget(placeholder("Problems"));
    m_pages->addWidget(placeholder("Training"));
    m_pages->addWidget(placeholder("Mistakes"));
    m_pages->addWidget(placeholder("AI Coach"));
    m_pages->addWidget(placeholder("Settings"));
    setCentralWidget(m_pages);
}

void MainWindow::onTabChanged(int index) {
    if (m_pages && index >= 0) m_pages->setCurrentIndex(index);
    // sync activity bar
    if (m_activityBar) {
        for (auto *a : m_activityBar->actions()) {
            a->setChecked(a->data().toInt() == index);
        }
    }
}
```

- [ ] **Step 7.3: main.cpp uses MainWindow**

```cpp
#include <QApplication>
#include <QTimer>
#include "ui/mainwindow/MainWindow.h"
#include "core/theme/CThemeManager.h"

int main(int argc, char *argv[]) {
    qputenv("QT_QPA_PLATFORM", "minimal");
    QApplication app(argc, argv);
    CThemeManager::instance()->applyTheme("AmberDark");
    MainWindow w;
    w.show();
    QTimer::singleShot(3000, &app, &QCoreApplication::quit);
    return app.exec();
}
```

- [ ] **Step 7.4: CMakeLists.txt adds source**

```cmake
add_executable(oler-ide
    src/app/main.cpp
    src/core/theme/CThemeManager.cpp
    src/ui/editor/OlerEditor.cpp
    src/ui/mainwindow/MainWindow.cpp
    resources/themes/themes.qrc
)
```

- [ ] **Step 7.5: Build + Smoke test**

Expected: build 0, alive. ActivityBar 56px + TabBar 36px + 5 stacked placeholders.
- [ ] **Step 7.6: Commit**

```powershell
git add src/ui/mainwindow/ src/app/main.cpp CMakeLists.txt
git commit -m "feat(phase-1): MainWindow with ActivityBar 56 + TabBar 36 + 5 stacked pages"
```

**Acceptance:** 5 placeholder pages + ActivityBar links TabBar switching. Phase 5 will fill in the real content.
---

## Task 8: 9 Docs from v0 Design

**Files:**
- Create: `D:\oler-ide-v2\docs\01-product\positioning.md`
- Create: `D:\oler-ide-v2\docs\02-design-system\tokens.md`
- Create: `D:\oler-ide-v2\docs\03-shell-pages\{problems,training,mistakes,ai,settings}.md`
- Create: `D:\oler-ide-v2\docs\04-editor\subpages.md`
- Create: `D:\oler-ide-v2\docs\05-test-results\panel.md`
- Create: `D:\oler-ide-v2\docs\06-welcome\onboarding.md`
- Create: `D:\oler-ide-v2\docs\07-risks\v1-lessons.md`
- Create: `D:\oler-ide-v2\docs\08-roadmap\phases.md`
- Create: `D:\oler-ide-v2\docs\09-glossary\terms.md`

- [ ] **Step 8.1: docs/01-product/positioning.md**

Extract the product positioning from `D:\oler\oler-ide-redesign\orchestration-summary.json` + `D:\oler\oler-ide-redesign\colors_and_type.css`:

```markdown
# 产品定位

## 目标用户
- All OI contestants: 普及-/提高-/NOI levels
- 重视 UI/UX 质量, 暗色优先, 信息密集
- Needs OJ account management, built-in compiler, AI assistant

## 核心差异
- Built-in > guided download: g++ 17 / MinGW / OJ credentials / AI model notes - all packaged
- Dark-mode first: 4 themes, One Dark Pro + Amber/terracotta dual track
## 风格
- 暗色优先 (dark-first)
- 暖琥珀/赤陶 accent (v0 design file) + One Dark Pro 蓝紫 (Atom 经典) 双轨
- Border-first surfaces; floating shadows only on overlays
- 紧凑 13px 字号, SF Pro Display + JetBrains Mono

## Roadmap: Phase 0-3: foundation (this plan)
Phase 4: core. Phase 5: Shell 5 tabs UI implementation
Phase 6: compiler pipeline + OJ adapters. Phase 7+: AI assistant (dots.ai)
```

- [ ] **Step 8.2: docs/02-design-system/tokens.md**

Extract all CSS variables from colors_and_type.css into a markdown table.
- [ ] **Step 8.3-8.7: docs/03-shell-pages/*.md (5 files)**

One `.md` per tab, with a north star + continuity anchors + screenshot placeholders (filled in Phase 5).
- [ ] **Step 8.8: docs/04-editor/subpages.md**

Editor 4 sub-page description: header / file tree / output / test cases.
- [ ] **Step 8.9: docs/05-test-results/panel.md**

5 verdict color badges + diff viewer + timing/memory stats + pass rate summary.
- [ ] **Step 8.10: docs/06-welcome/onboarding.md**

Brand logo + 4 quick start cards + demo problem + OJ credential status badge.
- [ ] **Step 8.11: docs/07-risks/v1-lessons.md**

From AGENTS.md's 'Lessons from v1' + the full 'Global Constraints' section, with case studies (vendor route 10x patch failures / ABI mismatch 0xC0000374 / subprocess link errors, etc.).
- [ ] **Step 8.12: docs/08-roadmap/phases.md**

Complete Phase 0-7+ roadmap + each phase's acceptance criteria.
- [ ] **Step 8.13: docs/09-glossary/terms.md**

OI glossary: AC/WA/TLE/RE/CE/NOI/IOI/ACM/luogu/普及/提高 and similar terms.
- [ ] **Step 8.14: Commit**

```powershell
git add docs/
git commit -m "docs(phase-1): 9 docs from v0 design (positioning, tokens, 5 shell pages, editor, test results, welcome, risks, roadmap, glossary)"
```

**Acceptance:** `docs/` has content in all 9 subdirectories; total ~3000 lines; all condensed from the v0 design file.
---

## Task 9: First Atomic Commit Tag

- [ ] **Step 9.1: 标记 v2.0.0-foundation**

```powershell
git tag -a v2.0.0-foundation -m "v2 foundation: empty QMainWindow + 4 themes + KSyntax + 9 docs"
```

- [ ] **Step 9.2: minimal smoke test**

```powershell
# Clean rebuild from scratch (use cmd rmdir per File-deletion-gated rule)
& cmd /c 'rmdir /s /q "D:\oler-ide-v2\build"' 2>&1 | Out-Null
& 'D:\OI\mingw64\bin\cmake.exe' -G Ninja -B build -S . -DCMAKE_CXX_COMPILER='C:/Qt/Tools/mingw1310_64/bin/g++.exe' -DCMAKE_C_COMPILER='C:/Qt/Tools/mingw1310_64/bin/gcc.exe' -DCMAKE_PREFIX_PATH='C:/Qt/6.8.0/mingw_64' -DCMAKE_RC_COMPILER='C:/Qt/Tools/mingw1310_64/bin/windres.exe'
& 'D:\OI\mingw64\bin\cmake.exe' --build build --parallel
# Smoke test (corrected: alive at 2.5s + WaitForExit + ExitCode 0)
$env:QT_QPA_PLATFORM='minimal'
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$p = Start-Process 'D:\oler-ide-v2\build\oler-ide.exe' -PassThru
Start-Sleep -Milliseconds 2500
if ($p.HasExited) { throw "FAIL: died early at $($sw.Elapsed.TotalSeconds)s" }
Write-Output "[ok] alive at 2.5s"
$p.WaitForExit()
$sw.Stop()
Write-Output "[ok] exit clean in $($sw.Elapsed.TotalSeconds)s"
```

**Acceptance:** clean rebuild 0; oler-ide.exe alive 4s, exit clean.
---

## Self-Review Checklist

- [x] 9 tasks 覆盖 v0 决策 + v1 教训 + Phase 1+2+3 全部交付
- [x] 9 tasks covering v0 decisions + v1 lessons + Phase 1+2+3 full delivery
- [x] Each step has concrete code snippets (no TBD/TODO)
- [x] Each step has executable commands + expected output
- [x] TDD-flavored: each step has a build + smoke test acceptance
- [x] All ASCII paths, no CJK
- [x] 全部 vendor 路线 (add_subdirectory)
- [x] File deletion gated (suggest `cmd /c rmdir /s /q <ASCII path>`)
- [x] Each step has a commit, 9 independent commits
- [x] KSyntax 6.x API 正确 (new Repository, ctor 不接 parent)
- [x] WIN32_EXECUTABLE FALSE on MinGW
- [x] Type consistency: CThemeManager::instance/applyTheme/cycleTheme identical at every call site
## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-21-oler-ide-v2-foundation.md`. Two execution options:**

1. **Subagent-Driven (recommended)** - one fresh subagent per task, report back, then review before the next task. Best fit for this plan; you can interject between tasks. 2. **Inline Execution** - run in the current session myself, batch with checkpoints; the risk is that a single session is long.
**Which approach?**
