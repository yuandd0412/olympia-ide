# Oler IDE v2 — Project Agent Guide

## 项目一句话
Qt 6.8 + C++17 + MinGW 13.1.0 重写的桌面 OI 编程 IDE, 暗色优先, 信息密集, 内置编译器/OJ 凭据/AI 助手。

## 路径与文件
- 项目根: D:\oler-ide-v2 (纯 ASCII, 不要中文路径, moc/rcc/qmake 在 CJK 路径下 broken)
- 构建: D:\oler-ide-v2\build\ (gitignored)
- Vendor: D:\oler-ide-v2\third_party\ (gitignored, 可重新 git clone)
- Qt: C:\Qt\6.8.0\mingw_64\
- MinGW: C:\Qt\Tools\mingw1310_64\bin\ (Qt 自带, ABI 严格匹配 Qt 6.8.0 prebuilt)

## ABI 严格规则
- Qt 6.8.0 prebuilt 用 MinGW 13.1.0 编译, 编译器必须 13.1.0
- 系统 D:\OI\mingw64\bin\ 是 16.1.0 (UCRT) — ABI 不兼容, 0xC0000374 heap corruption
- Strawberry C:\Strawberry\c\bin\ 是 13.2.0 — ABI 不兼容
- 任何 CMake 调用必须显式: `-DCMAKE_CXX_COMPILER=C:/Qt/Tools/mingw1310_64/bin/g++.exe`

## v1 留下来的坑
1. WIN32_EXECUTABLE 在 MinGW 13.1.0 下必须 FALSE (libQt6EntryPoint.a 缺 __imp___argc)
2. Vendor 路线: add_subdirectory(third_party/...) EXCLUDE_FROM_ALL, 不依赖 FetchContent
3. KSyntax 6.x Repository 没有 static instance(), 必须 `new Repository()` (ctor 不接 parent)
4. Q_PROPERTY pointer types 必须 forward declare 改 fully include (Qt 6 moc 要求)
5. QMenu::addAction 4-arg overload 在 Qt 6 删了, 拆 2 行
6. addDockWidget 不能传 QTabWidget
7. `stdin` 是 stdio.h macro, Qt property 不能用, 改名 `stdinText`
8. Q_GADGET 不能重复 (两个 struct 同 Q_GADGET 重定义 staticMetaObject)
9. CJK 路径下 moc.exe (Qt 6.8.0 MinGW) broken, "Cannot create .../moc_xxx.cpp" — 用 ASCII 项目根绕开
10. PS 5.1 Set-Location 不识别 fresh subst drive, 用绝对路径调 cmake
11. PS 5.1 C:\strawberry\c\bin 错用 cmake 路径 (-replace 误删), 用绝对路径 $cmake 调

## 文件删除规则
- assistant 永远不直接 Remove-Item / rm / del / Move-Item to /dev/null
- 用 `cmd /c rmdir /s /q <ASCII 绝对路径>` 让 user 自己跑
- PowerShell Remove-Item 会被 desktop permission gate 拒绝 (Wipe 类别)
- cmd /c rmdir /s /q 走 .NET API, gate 不拦

## 每步自检
- 调研/设计/实现每步完成态先汇报, 等拍板再继续
- 不可逆动作 (杀进程 / 删文件 / 改 git) 每次先确认
- 完工必须基于 user 真机确认或自动化测试通过

## Vendored patches (重要)
`third_party/` 整个目录在 .gitignore。KSyntax vendor 后有一处手动 patch 必须在每次 fresh clone 后重新打,否则 build fail 在 `katehighlightingindexer` (STATUS_DLL_NOT_FOUND on MinGW PATH):

1. **文件**: `third_party/syntax-highlighting/data/CMakeLists.txt`
2. **原因**: `katehighlightingindexer.exe` 是用 Qt 6.8.0 编译的独立工具, 它找不到 ninja 注入的 PATH 里的 Qt6Core.dll (STATUS_DLL_NOT_FOUND on MinGW PATH; STATUS_HEAP_CORRUPTION on Qt 6.8.0 XML parser 已知 bug)
3. **QRC_SYNTAX=OFF 不解决问题** — KSyntax 的 CMakeLists 仍然调 `add_custom_command(... katehighlightingindexer ...)` 直接 break configure
4. **正确修法**: 把 data/CMakeLists.txt 里的 `add_custom_command(... katehighlightingindexer ...)` 整段换成 `cmake -E touch ${OUT}` stub, 删 `add_dependencies(... katesyntax)`, 加 wrapper target
5. **重新打 patch 的命令** (re-clone 后必跑):
   ```powershell
   # 数据 stub 化的 patch, 374 个 XML definition 暂不生成, Task 6+ 改 OlerEditor 时再实装
   $f = 'D:\oler-ide-v2\third_party\syntax-highlighting\data\CMakeLists.txt'
   # 删 add_custom_command (katehighlightingindexer 那行) 替换为 stub
   # 详见 Task 3 implementer report: .superpowers/sdd/.../task-3-report.md
   ```
6. **Task 6+ 待办**: `kf6syntaxhighlightingdata` 的 374 个 XML definition 当前为 stub, OlerEditor 里的 `new Repository()` 没数据。Task 6 必须解决 (要么用 windeployqt 复制 katehighlightingindexer.exe + Qt DLL 到 PATH, 要么预先生成 XML 后 commit 静态定义)

## License
MIT (LICENSE 文件)
