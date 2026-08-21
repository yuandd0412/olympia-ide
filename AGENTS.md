# Oler IDE v2 �?Project Agent Guide

## 项目一句话
Qt 6.8 + C++17 + MinGW 13.1.0 重写的桌�?OI 编程 IDE, 暗色优先, 信息密集, 内置编译�?OJ 凭据/AI 助手�?
## 路径与文�?- 项目�? D:\oler-ide-v2 (�?ASCII, 不要中文路径, moc/rcc/qmake �?CJK 路径�?broken)
- 构建: D:\oler-ide-v2\build\ (gitignored)
- Vendor: D:\oler-ide-v2\third_party\ (gitignored, 可重�?git clone)
- Qt: C:\Qt\6.8.0\mingw_64\
- MinGW: C:\Qt\Tools\mingw1310_64\bin\ (Qt 自带, ABI 严格匹配 Qt 6.8.0 prebuilt)

## ABI 严格规则
- Qt 6.8.0 prebuilt �?MinGW 13.1.0 编译, 编译器必�?13.1.0
- 系统 D:\OI\mingw64\bin\ �?16.1.0 (UCRT) �?ABI 不兼�? 0xC0000374 heap corruption
- Strawberry C:\Strawberry\c\bin\ �?13.2.0 �?ABI 不兼�?- 任何 CMake 调用必须显式: `-DCMAKE_CXX_COMPILER=C:/Qt/Tools/mingw1310_64/bin/g++.exe`

## v1 留下来的�?1. WIN32_EXECUTABLE �?MinGW 13.1.0 下必�?FALSE (libQt6EntryPoint.a �?__imp___argc)
2. Vendor 路线: add_subdirectory(third_party/...) EXCLUDE_FROM_ALL, 不依�?FetchContent
3. KSyntax 6.x Repository 没有 static instance(), 必须 `new Repository()` (ctor 不接 parent)
4. Q_PROPERTY pointer types 必须 forward declare �?fully include (Qt 6 moc 要求)
5. QMenu::addAction 4-arg overload �?Qt 6 删了, �?2 �?6. addDockWidget 不能�?QTabWidget
7. `stdin` �?stdio.h macro, Qt property 不能�? 改名 `stdinText`
8. Q_GADGET 不能重复 (两个 struct �?Q_GADGET 重定�?staticMetaObject)
9. CJK 路径�?moc.exe (Qt 6.8.0 MinGW) broken, "Cannot create .../moc_xxx.cpp" �?�?ASCII 项目根绕开
10. PS 5.1 Set-Location 不识�?fresh subst drive, 用绝对路径调 cmake
11. PS 5.1 C:\strawberry\c\bin 错用 cmake 路径 (-replace 误删), 用绝对路�?$cmake �?
## 文件删除规则
- assistant 永远不直�?Remove-Item / rm / del / Move-Item to /dev/null
- �?`cmd /c rmdir /s /q <ASCII 绝对路径>` �?user 自己�?- PowerShell Remove-Item 会被 desktop permission gate 拒绝 (Wipe 类别)
- cmd /c rmdir /s /q �?.NET API, gate 不拦

## 每步自检
- 调研/设计/实现每步完成态先汇报, 等拍板再继续
- 不可逆动�?(杀进程 / 删文�?/ �?git) 每次先确�?- 完工必须基于 user 真机确认或自动化测试通过

## Vendored patches (重要)
`third_party/` 整个目录�?.gitignore。KSyntax vendor 后有一处手�?patch 必须在每�?fresh clone 后重新打,否则 build fail �?`katehighlightingindexer` (STATUS_DLL_NOT_FOUND on MinGW PATH):

1. **文件**: `third_party/syntax-highlighting/data/CMakeLists.txt`
2. **原因**: `katehighlightingindexer.exe` 是用 Qt 6.8.0 编译的独立工�? 它找不到 ninja 注入�?PATH 里的 Qt6Core.dll (STATUS_DLL_NOT_FOUND on MinGW PATH; STATUS_HEAP_CORRUPTION on Qt 6.8.0 XML parser 已知 bug)
3. **QRC_SYNTAX=OFF 不解决问�?* �?KSyntax �?CMakeLists 仍然�?`add_custom_command(... katehighlightingindexer ...)` 直接 break configure
4. **正确修法**: �?data/CMakeLists.txt 里的 `add_custom_command(... katehighlightingindexer ...)` 整段换成 `cmake -E touch ${OUT}` stub, �?`add_dependencies(... katesyntax)`, �?wrapper target
5. **重新�?patch 的命�?* (re-clone 后必�?:
   ```powershell
   # 数据 stub 化的 patch, 374 �?XML definition 暂不生成, Task 6+ �?OlerEditor 时再实装
   $f = 'D:\oler-ide-v2\third_party\syntax-highlighting\data\CMakeLists.txt'
   # �?add_custom_command (katehighlightingindexer 那行) 替换�?stub
   # 详见 Task 3 implementer report: .superpowers/sdd/.../task-3-report.md
   ```
6. **Task 6+ 待办**: `kf6syntaxhighlightingdata` �?374 �?XML definition 当前�?stub, OlerEditor 里的 `new Repository()` 没数据。Task 6 必须解决 (要么�?windeployqt 复制 katehighlightingindexer.exe + Qt DLL �?PATH, 要么预先生成 XML �?commit 静态定�?

## License
MIT (LICENSE 文件)

## Smoke test PATH ����
�� `build\oler-ide.exe` ǰ����� `C:\Qt\6.8.0\mingw_64\bin` �ӵ� PATH, ���� 0xC0000135 STATUS_DLL_NOT_FOUND (�Ҳ��� Qt6Core.dll):
```powershell
$env:PATH = 'C:\Qt\6.8.0\mingw_64\bin;' + $env:PATH
```
Task 9 ���� `windeployqt` �� Qt DLLs ���Ƶ� build/ �Ա�, ֮���ʡ�˲��衣