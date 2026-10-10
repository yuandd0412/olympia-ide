# 任务：练习文件夹 — 有文件则直接打开，不再强制另存为

仓库：`D:\oler-ide-v2`。不 git commit。

## 问题
当前打开题目只查 `problemFiles[problemId]` 映射；首次保存必弹「另存为」。
应：**选定练习根目录后**，若目录里已有对应题号的文件 → **直接读入**；保存时默认写回该目录。

## 产品规则

### 1. 练习根目录
- 持久化到设置：`AppSettings.practiceRoot?: string`（serde camelCase `practiceRoot`）
- 同时可写 `~/.oleride/practice_root.txt` 作后端兜底
- 命令：
  - `pick_practice_folder() -> Option<String>`：`tauri_plugin_dialog` 目录选择，取消返回 null
  - `get_practice_folder() -> Option<String>`
  - `set_practice_folder(path: String) -> Result<(), String>`

### 2. 解析已有文件（核心）
命令：
```rust
resolve_problem_file(problem_id: String) -> Option<String>
```
逻辑（同步 std::fs 即可）：
1. 若 `problemFiles` 绑定路径仍存在 → 返回它（后端不读前端 map；前端先查 map，未命中再调本命令）
2. 在 `practice_root` 下**递归**找匹配（忽略大小写），命中任一即返回绝对路径：
   - `{id}.cpp` / `{id}.cc` / `{id}.cxx`（id 如 `P1001`、`CF1900A`、`ABC300A`）
   - `{id}_*.cpp`、`{id}-*.cpp`
   - `{oj}/{id}.cpp` 子目录
   - `{id}.cpp` 出现在任意深度子目录
3. 无 root 或无匹配 → `None`

辅助纯函数 + 单测：`fn matches_problem_file(file_name: &str, problem_id: &str) -> bool`

### 3. 保存默认路径
```rust
default_save_path(problem_id: String, title: String) -> String
```
- 有 `practice_root` → `{root}/{problem_id}.cpp`（文件名清洗非法字符）
- 无 root → 仍返回空或由前端弹对话框

### 4. 前端契约（**允许改** `useAppStore.ts` / `tauriApi.ts` / `SettingsPage` 极小入口）
- `setActiveProblem`：`problemFiles` 未命中 → `resolve_problem_file(id)`；有则 `readFile` 开 tab
- `saveActiveTab`：无 `filePath` 时先 `default_save_path`；非空则直接写该路径，**不弹 save dialog**；仅无 practice root 才弹框
- 设置页增加一行「练习文件夹」：显示当前路径 +「选择…」调用 `pick_practice_folder` 并 `set_practice_folder` + 刷进 settings
- `AppSettings` 增加 `practiceRoot?: string`（optional，兼容旧 settings.json）

**不要**改 OJ 抓取 / runner / 引导大改。

## 验收
```
cd D:\oler-ide-v2\frontend\src-tauri && cargo check --all-targets && cargo test --lib
cd D:\oler-ide-v2\frontend && npm run build && npm run lint
```
`matches_problem_file` 至少 4 个单测（P1001.cpp、CF1900A.cpp、子目录、大小写）。

输出：改动文件列表 + 测试摘要 + 手测步骤（选文件夹→放 P1001.cpp→打开 P1001 应直接加载）。
