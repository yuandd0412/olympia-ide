# Fork-side Olympia extensions

> **Status: Implemented.** These three extensions are written for the **VS Code fork** in `oss/`
> (product `Olympia`, base 1.140.0) and ship inside it as built-ins. None of them runs in the
> Tauri app in `frontend/` — that product has its own AI coach, problem library and contest bar.
> Paths below are relative to `oss/extensions/`.

They are compiled by the packaging pipeline, not by `npm`: each one must be listed in the
**hardcoded** `compilations` array of [`oss/build/gulpfile.extensions.ts`](../../oss/build/gulpfile.extensions.ts)
(upstream's glob discovery there is commented out — an unlisted extension still compiles cleanly and
then silently misses the installer). Chinese source text in `extensions/olympia-*/**` is exempt from
the unicode hygiene guard, and `olympia-contest/src/templates.ts` from the indentation guard, both in
[`oss/build/filters.ts`](../../oss/build/filters.ts).

## `olympia-onboarding` — first run, environment, compile entry points

[`src/toolchain.ts`](../../oss/extensions/olympia-onboarding/src/toolchain.ts) resolves the bundled
compiler, [`src/compile.ts`](../../oss/extensions/olympia-onboarding/src/compile.ts) runs it, and
[`src/precheck.ts`](../../oss/extensions/olympia-onboarding/src/precheck.ts) implements the pre-submit
check's **pattern** half — the three write-patterns a judge's compiler rejects but MSVC accepts — and
[`src/syntaxCheck.ts`](../../oss/extensions/olympia-onboarding/src/syntaxCheck.ts) its **syntax** half, which
actually runs the compiler: `-fsyntax-only`, no output binary, on a temp file written from the *editor buffer*,
so unsaved edits and `Untitled-1.cpp` are covered (the flags come from the same `planCompile` as `F9`, which is
what keeps 「体检说没问题」 from ever disagreeing with 「F9 编不过」). Until 2026-10-16 the feature only had the
first half while the panel row said 「无问题」 and the status bar 「体检通过」 — the trigger was the user's own
code, `cout <<` ending mid-line, and a false all-clear is worse than no check because it teaches him to trust
the row before submitting. A missing compiler, a failed spawn, a timeout, or a non-zero exit that produced no
locatable error line all become findings of their own for the same reason: a tool that read nothing does not get
to report 无问题. Both halves write into the one diagnostic collection, so the panel row and the chip needed no
new state. Commands and keybindings as declared in its `package.json`:

| Command | Title | Keybinding (`when`) |
| --- | --- | --- |
| `olympia.compileAndRun` | 编译并运行 | `F9` (`editorTextFocus`) |
| `olympia.compile` | 编译当前文件 | `Shift+F9` (`editorTextFocus`) |
| `olympia.compileJudgeAccurate` | 按评测机编译（-O2） | `Ctrl+Shift+F9` (`editorTextFocus`) |
| `olympia.preSubmitCheck` | 提交前体检 | `Ctrl+Alt+Enter` (`editorTextFocus`) |
| `olympia.judgeSamples` | 跑样例（本地评测） | `Ctrl+Alt+J` (`editorTextFocus`) |
| `olympia.judge.compareOutput` | 对比期望输出 | `Ctrl+Alt+K` |
| `olympia.stressTest` | 对拍（正解 vs 暴力） | `Ctrl+Alt+S` |
| `olympia.contestMode` | 比赛模式（倒计时） | `Ctrl+Alt+C` |
| `olympia.checkEnvironment` | 环境自检 | `Ctrl+Alt+D` |
| `olympia.pickCompileProfile` | 选择评测机编译配置 | — |
| `olympia.tools.refresh` | 刷新 Olympia 工具面板 | — (hidden from the palette) |
| `olympia.settings` | 全部设置（编译 / 评测 / 对拍 / 题面） | `Ctrl+Alt+,` |
| `olympia.openWebsite` | 打开官网与文档 | — |

The three commands after 体检 are the judge-shaped loop the Tauri app had and the fork did not:

- **跑样例** ([`src/judgeSamples.ts`](../../oss/extensions/olympia-onboarding/src/judgeSamples.ts))
  reads the cached statement Markdown for the current file (`.olympia/problems/<题号>.md`, same
  directory `olympia-contest` writes, falling back to a quick pick when no file matches by name),
  compiles with the active judge profile, runs every sample through it and prints `AC` / `WA` / `RE` /
  `TLE` / `MLE` per case into the `Olympia 评测` channel. A hand-picked statement is remembered per
  source file (`olympia.judge.statements` in `workspaceState`), because the real loop is 改代码 →
  `Ctrl+Alt+J` → 改代码 and asking which problem every time makes the feature unusable; the log says the
  choice was reused, a remembered statement that has since been deleted falls back to the picker rather
  than being read anyway, and the result notification carries 换一道题 as the way out. What gets stored is
  two *names*, never paths — the key is `asRelativePath(source, false)` and the value is the statement's
  file name — because the same project is opened from a different drive letter in the 机房, and a
  drive-letter key silently turns every memory into a miss. A same-name
  statement always wins over the remembered one. Comparison ignores whitespace like a real judge, and the
  same function that decides AC also writes the diagnosis (`compareCase`): a WA case now prints *where*
  it went wrong — 第 N 行第 M 个数不同 / 第 N 行第 M 个词不同 / 词数不同 / 只输出了前 N 行 / 多了 N 行 /
  每行都有只是顺序不同 / 程序没有任何输出 — because 「期望：7 得到：-1」 (the old behaviour: both strings
  whitespace-flattened and cut at 200 characters) told a student nothing about a 20-line output. The
  verdict and the diagnosis read **one** comparison on purpose; computing AC in one place and the diff in
  another is how 「通知说 AC、对照里全是差异」 would appear. Whole-side-by-side comparison is
  `olympia.judge.compareOutput` (`Ctrl+Alt+K`, also the 对比期望输出 notification button and a panel row):
  it feeds the two texts to `vscode.diff` through an in-memory `TextDocumentContentProvider` under the
  `olympiaSample` scheme, so nothing is written into the student's project (the 机房 folder is often not
  writable and a stray `expected.txt` is noise), and several failing cases come out as a picker in judge
  order. Cases are recorded per run and cleared at the start of the next one, so the command can never
  hand back a diff from a different problem. The
  time limit is read from the statement and accepts both units the product produces — `1000 ms` from
  the pull chain and hand-written `1.00s`; an unrecognised unit falls back to 1 s rather than guessing.
  The memory limit is read the same way (`内存限制：128.00 MB`, `内存：128M`, `内存：1GB`) and comes from
  [`src/memoryProbe.ts`](../../oss/extensions/olympia-onboarding/src/memoryProbe.ts), which samples the
  child's working set every 30 ms through `tasklist.exe` and reports the maximum. Sampling can only
  *under*-report — a spike shorter than the interval is missed — so a reported MLE is real, and the
  verdict additionally requires an explicit limit: `olympia.judge.memoryLimitMb` (0 = use the
  statement, which is the default) or a limit written in the statement. With no limit at all the case
  still prints its peak memory but can never be judged MLE.
- **对拍** ([`src/stressTest.ts`](../../oss/extensions/olympia-onboarding/src/stressTest.ts)) asks for
  three files (正解 / 暴力 / 生成器, remembered per workspace and floated to the top of the list),
  compiles all three — each compile bounded by `COMPILE_TIMEOUT_MS`, so a hung g++ ends the run instead
  of hanging it — then feeds generator output to both solutions round after round. A mismatch stops
  the run and writes that one case into `stress-fail/round-N.{in,sol,brute}` so it can be pasted into a
  test or shown to the coach; a name already taken by an earlier run gets `round-N-2.*`, because the
  counter-example someone found at 1 a.m. is not today's run's scratch space. The notification names the
  file it wrote and also offers 补进题面样例, which calls
  `olympia.problem.appendSample` over in `olympia-contest` and appends the case to the statement as a
  permanent 样例 — offered only when both programs ran to completion, because a timeout or a crash has no
  trustworthy "expected output" to write down. That cross-extension call is wrapped: when
  `olympia-contest` is disabled the button says why instead of throwing a rejection at the user.
  Settings: `olympia.stress.rounds` (default 100), `olympia.stress.timeoutMs`
  (default 2000). The progress notification is cancellable.
- **比赛模式** ([`src/contestMode.ts`](../../oss/extensions/olympia-onboarding/src/contestMode.ts)) is a
  countdown in the status bar (left, priority 110 so it sits ahead of the compiler chips). Duration comes
  from a quick pick or a free-form integer 1–600 minute input — the input box's hint and the value it
  finally accepts come from the same `minutesInRange`, so the two can't drift. `endsAt` survives reloads
  in `workspaceState`: a contest still running when the window reloads resumes and still announces 时间到
  exactly once when it crosses zero, while one that expired while the app was closed is cleared on the
  spot rather than being restored and re-judged on every start. Disposing the registration resets the
  module state, so 禁用再启用 cannot leave a phantom contest that locks `@coach` forever with no chip to
  click. The item turns warning-coloured once time is up, and the tools panel shows a remaining-time row
  while a contest runs.

Two walkthroughs are contributed: `olympia.gettingStarted` ("十分钟上手 Olympia IDE", ten steps —
open a folder, pick the judge compile profile, `F9` 编译并运行, 拉题面并跑样例（AC / WA / TLE / MLE）,
对拍, 比赛模式, the environment check, the one-page 设置, ask the AI coach, learn more) and
`olympia.compiler` ("内置编译器与环境自检", one step). The five middle steps exist because those are the
features a student cannot guess from a VS Code-shaped UI: before them the walkthrough described an editor
with a compiler, and 跑样例 / 对拍 / 比赛模式 were reachable only if someone told you they existed. Each
step's button invokes the same command the panel row and the keybinding do (`check-command-wiring.mjs`
walks `contributes.walkthroughs` for exactly this), so a renamed command cannot leave a dead button in the
welcome page; its `completionEvents` are the same command, which is what makes the tick appear when the
student actually does it. The coach step exists so the `@coach` participant is discoverable from the first
run; it completes on `olympia.coach.selectModel`.

The compile task provider (`compile.ts:168`, type `olympia-compile`) must stay declared in
`contributes.taskDefinitions`: while it was missing, the packaged app logged
`The task [olympia-compile, …] uses an undefined task type. The task will be ignored in the future.`,
i.e. a saved build task silently stops working later. The provider's task definition only carries
`source` (an absolute path, because `TaskDefinition` must be serialisable — `resolveTask` re-wraps it
with `Uri.file`).

`F9` 编译并运行 asks *how* to run, because the three ways answer different questions and only one of
them has a keyboard. [`compileAndRun`](../../oss/extensions/olympia-onboarding/src/compile.ts) offers
在终端里运行（可以手敲输入）/ 直接运行（空 stdin）/ 选择测试数据文件, terminal first: the output-panel
path runs through a pipe, so a program that reaches `cin >>` reads EOF and walks on with garbage
values — which looks exactly like "the program printed nothing". The integrated terminal is the only
place in the product with real stdin, and it is the parity item the old Tauri app's 交互控制台运行
served. Two traps there are documented in the code because both were hit on a real window: a quoted
path is a *string* in PowerShell (it echoes the path and runs nothing — hence `& "…"` for
`powershell|pwsh`, plain quoting for cmd), and a program still waiting for input keeps its own `.exe`
locked, so the next `F9` dies with `ld.exe: cannot open output file …: Permission denied`. That error
is now recognised, the owning process is looked up by executable path, and the notification offers
结束它并重试; when the lookup finds nothing the message says so instead of claiming the file is free.

Pre-submit check on save is a fire-and-forget `onWillSaveTextDocument` listener with **no**
`event.waitUntil(...)`: 体检 must never delay the write itself, and a participant that returns an
unresolved promise gets its save killed after 1750 ms by the workbench.

**Persistent entry points** (the reason the palette is no longer the only way in): an `Olympia`
activity-bar container contributing one visible tree view, `olympia.tools` ("竞赛工具"), whose four
sections are 当前环境 / 编译与运行 / 题目与模板 / AI 教练与帮助 — the middle one carries 编译并运行,
编译当前文件, 按评测机编译（-O2）, 提交前体检, 跑样例, 对拍, 比赛模式, each row showing its keybinding — and
the first one shows the live compiler / profile / 体检 / 题面库 counts as clickable state rows. The
题面库 row reads `.olympia/problems` through [`src/problemFiles.ts`](../../oss/extensions/olympia-onboarding/src/problemFiles.ts)
— the one place this extension lists that directory, shared with 跑样例 so the two cannot disagree —
and it follows the watcher: with nothing cached it reads 还没拉过题面 and points at 拉取题面 instead of
opening an empty list. 题目与模板 gained the 打开题面库 row (`Ctrl+Alt+O`), so the bank is reachable
without the palette, and the 编辑我的模板 row, so wanting your own template does not require knowing that
`Ctrl+Alt+T`'s picker hides a 新建 entry at the bottom. The tree redraws on
active-editor, configuration and diagnostic changes; the countdown repaints through a narrower path that
does not re-probe the toolchain. Four `editor/title` navigation buttons (编译并运行 / 编译 / 按评测机编译 /
体检) appear only for `resourceLangId == cpp || c`, and three status-bar chips (compiler profile,
编译运行 `F9`, 体检) stay visible all the time. `olympia.debug.showEntryPoints` switches the extra debug
rows in the panel off.

The welcome page was trimmed in core (`gettingStartedContent.ts`) in two passes. Start entries
`topLevelGitClone` / `topLevelGitOpen` / `topLevelRemoteOpen` / `topLevelOpenTunnel` /
`topLevelNewWorkspaceChat` → `when: 'false'`: 克隆仓库、打开仓库、连接到…、打开隧道… and 新建工作区
ask a student to do remote development, Git or Copilot work that the product deliberately removed
from the activity bar (and that ships no extension for, so two of them lead to a picker with nothing
in it). Open file / open folder stay. In the 从零开始 category, `debugging`, `scmClone`, `scmSetup`,
`scm`, `installGit` and `tasks` are off for the same reason (Olympia's own promise is 不用写 tasks.json,
so a step teaching 运行自动检测到的任务 contradicts the product), the `notebooks` walkthrough category
is off too — `ipynb` ships, but no OI student opens one — and `createCopilotSetupStep` now returns
`when: 'false'` — one place, so all four Copilot sign-in/plan steps go with it instead of relying on
`chatSetupHidden` contexts we cannot observe in a BYOK-only build. Two of the remaining steps shipped
a false claim: the 观看视频教程 step's copy said "Olympia IDE 核心功能系列短视频教程" while its button
opened `aka.ms/vscode-getting-started-video`, and 工作区信任 linked `code.visualstudio.com`; the first
now links `https://olympia.dpdns.org/docs/`, the second explains trust in one sentence and keeps only
the in-product 启用信任 button. `src/vs` carries no fork-specific comments, so the reason lives here
rather than in the diff, and `scripts/oneoff/check-core-copy.mjs` asserts the sentences and the
`when: 'false'` values in `oss/out` — built JS escapes non-ASCII as `\uXXXX`, so grepping the
built tree for Chinese text silently reads nothing.

Two more core surfaces said something false about this build. `extensions.autoCheckUpdates` and
`extensions.autoUpdate` both promised updates "从 Microsoft 联机服务" / "来自微软的在线服务", but the
gallery configured in `product.json` is open-vsx, and 复制扩展信息 labelled the extension's market URL
"VS Marketplace 链接" — all three now say 扩展市场. The ⚙ gear menu also listed 任务 under
`2_configuration`, which the product copy itself tells students they do not need (不用写 tasks.json);
both of its registrations (`MenuId.GlobalActivity` and `MenuId.MenubarPreferencesMenu`) now carry
`ContextKeyExpr.false()`, so the commands stay reachable from the palette for anyone who wants them
while the menu stops advertising them.

The 远程隧道 commands were the last reachable dead end: six of them sat in the command palette
(打开远程隧道访问…, 关闭…, 显示日志, 配置…, 复制链接, Rename), and starting one needs a `github`
authentication provider — `VSCode-win32-x64/resources/app/extensions` ships 42 extensions (measured 2026-10-15, count the directories) and none of
them is `github-authentication` or any remote/resolver extension, so the flow can only end in an error
toast. All six palette registrations now point at one constant, `REMOTE_TUNNEL_COMMANDS_AVAILABLE =
ContextKeyExpr.false()`, so the entries cannot creep back one at a time, and the commands themselves
stay registered for anyone who adds a provider later. `check-core-copy.mjs` counts the palette
registrations and requires every one of them to be gated by that constant.

[`src/solveLog.ts`](../../oss/extensions/olympia-onboarding/src/solveLog.ts) is the parity item the fork
was missing: the Tauri app had `record_solve_entry` / `get_solves` (a row per AC with time and memory,
feeding 连续打卡 and the daily goal) and nothing in the new product persisted a result at all. Now the
sample judge writes one when the *overall* verdict is AC — 题号 (the statement's file name), the
statement's first-heading title, timestamp, the slowest case's `ms`, the run's highest peak — into
`<workspace>/.olympia/solves.json`, newest first, capped at 200 entries, and the panel's
当前环境 gains a 解题记录 row (`N 题 · 连续 D 天 · 今日 x/N`) that opens the list as a searchable quick
pick and jumps to that problem's cached statement. Storage choices that matter here: it lives in the
project next to the statements (so it travels to the 机房 machine, and `olympia.judge.statements`'
drive-letter lesson is why the record keys on the problem *name*), it is plain JSON a student can open
and delete, a file that fails to parse reads as empty rather than taking the tree view down, and
`onSolveLogChange` fires only after an actual write so the row's number cannot drift from the file.
Streak is counted in *local days* (`getMonth`/`getDate`), so 今天没打但昨天连着 算 未断, three ACs on
one day count as one day, and `2025-12-31` / `2026-01-01` are two days — the harness pins both edges.

**Trap when fixing settings copy:** a registered setting's sentence often exists **twice** — once in
the property and once in its `policy.localization` block (3× for `update.mode`, 2× for
`extensions.autoUpdate`). Editing only the property leaves the policy copy as the one that ships; the
check that greps `oss/out` for the old sentence is what catches it.

Settings: everything under `olympia.*` — `olympia.compiler.*` (`path`, `profile` default `luogu`,
`customFlags`, `optimization` default `none`, `showCompileCommand` default `true`),
`olympia.check.enabled` / `olympia.check.onSave` and the rule toggles that still exist
(`olympia.check.rules.pragmaOptimize`, `.reservedWord`, `.removedCpp`), `olympia.judge.memoryLimitMb`,
`olympia.train.*` (`recordSolves` default `true`, `dailyGoal` default `3`),
`olympia.stress.*`, `olympia.debug.showEntryPoints`, plus the contest extension's `olympia.problem.*`
and `olympia.templates.cppSnippets` and the coach's `olympia.ai.*`.

[`src/settingsPanel.ts`](../../oss/extensions/olympia-onboarding/src/settingsPanel.ts) is the answer to
「Olympia 设置不好找」. `olympia.settings` (`Ctrl+Alt+,`, and a 全部设置 row in the panel) opens one webview
listing **every** `olympia.*` property, read out of the three manifests through `vscode.extensions.all`:
groups come from the key's second segment (`olympia.stress.rounds` → 对拍, with an unknown segment
landing in 其他 instead of vanishing), the row title is the manifest's first sentence, the hint is the
rest of it, enums show their `enumDescriptions` (洛谷默认 / NOI 官方 …) rather than the raw id, a value
that differs from the default gets an 已改 badge and a 恢复默认 button, `.path` settings get 浏览…, and
the two `olympia.ai.*` rows delegate to `olympia.ai.settings` because the key itself lives in
SecretStorage. Nothing on the page is a second copy of the settings list, so adding a property to a
manifest is enough to make it appear — and `test-settings-panel.mjs` asserts the rendered row count
against the manifests, which is what turns that claim into something a build can check. Writes go to
`ConfigurationTarget.Global` through the same `workspace.getConfiguration()` the features read from, and
the page re-sends its values on configuration changes so editing `settings.json` by hand doesn't leave a
stale form behind.

Labels are single-sourced too: a panel row's text must equal the palette title of the command it invokes
(rule 6 in `check-command-wiring.mjs`, with the palette's trailing ellipsis ignored), which closed eight
places where the panel said 打开题面库 while the palette called the same command 打开题面库（已缓存的题面）. The
contest extension's commands also moved from the `Olympia 竞赛` category to plain `Olympia`, so typing
`Olympia` in the palette lists all 26 palette-visible entries (28 commands, 2 hidden with `when: "false"`) in one place instead of splitting them across two prefixes.

## `olympia-contest` — statement pull and contest templates

[`src/sources.ts`](../../oss/extensions/olympia-contest/src/sources.ts) fetches statements from
**Luogu**, **Codeforces** and **AtCoder**; [`src/net.ts`](../../oss/extensions/olympia-contest/src/net.ts)
is the shared HTTP helper (browser-like headers, `Accept-Encoding: identity` so no manual inflate, a
wall-clock deadline in addition to socket idleness, optional cookie);
[`src/html2md.ts`](../../oss/extensions/olympia-contest/src/html2md.ts) converts the page to Markdown;
[`src/templates.ts`](../../oss/extensions/olympia-contest/src/templates.ts) holds the C++ contest
templates inserted by `olympia.template.insert`, and
[`src/snippets.ts`](../../oss/extensions/olympia-contest/src/snippets.ts) registers the contest
completion list — 20 entries of the shape a student types every day (快速 IO, `freopen`,
`lower_bound`, 小根堆, 快速幂, 并查集, 埃氏筛, Dijkstra, BFS). `CONTEST_SNIPPETS` is pure data; the
provider only maps it to `CompletionItem`s whose `filterText` holds the English id, the Chinese label,
the detail and the alias list, so `ios`, `fast` and `快速` all hit the same row. Bodies are
VS Code snippet syntax, and they are written as ordinary strings — inside a template literal the
`${1:x}` placeholder is a JS expression and silently ships a broken body.

[`src/problemLibrary.ts`](../../oss/extensions/olympia-contest/src/problemLibrary.ts) is the local
problem bank — the old app kept one page of JSON; here it is the directory the extension already
writes. `olympia.problem.openStatement` lists every `.olympia/problems/*.md` as
`P1001 A+B Problem` + `洛谷 · 入门 · 时限 1000 ms · 内存 128 MB · 样例 2 组` + relative path + "今天",
most recently pulled first, with `matchOnDescription`/`matchOnDetail` on so a Chinese title finds the
row. The metadata is read back from the statement itself, so nothing needs the network: `FIELD` in
`templates.ts` is shared by the writer (`renderStatement`) and the reader (`metaOf`), which is the
only reason a renamed field cannot make the bank silently lose its titles. `来源：` is written as the
platform's Chinese name, and `summaryOf` still maps the older `来源：luogu` files back to 洛谷. A file
whose heading is not a problem id keeps its whole heading as the title and takes the filename as the
id; a file that cannot be read at all still gets listed instead of taking the list down with it.

A statement the student has already solved is marked — `✓ P1001 A+B Problem` plus `已 AC 2 次` in the
description, and the picker's title counts them (「缓存 12 道，已 AC 5 道」). The data is the
解题记录 that 跑样例 writes (`olympia-onboarding/src/solveLog.ts`), read here through
[`src/solvedMarks.ts`](../../oss/extensions/olympia-contest/src/solvedMarks.ts): cross-extension
*code* cannot be imported, so the two extensions share the **file**, and the key rule lives in one
function (`markOf`) so lowercasing cannot drift between counting and labelling. Duplicated parsing of
one JSON is exactly the drift the repo normally guards with a harness rather than a comment:
`test-problem-library.mjs` writes records with the writer (`recordSolve`) and asserts the reader counts
the same ids and times — renaming the field the reader looks at turns four checks red. If the file is
missing (a new workspace) the picker says nothing about AC and adds no tick; if it is corrupt, the bank
still opens unmarked rather than refusing to open. Typing `AC` filters to the solved ones because
`matchOnDescription` is already on, so no second filter UI was needed — and no new store: 「哪道我做过了」
is answered by data the product already has, which is also why the old app's manual 收藏 toggle is
still the one parity item deliberately not rebuilt (see below).

**我的模板** is the old app's user-editable default template, and it is a *file* rather than a setting:
`TEMPLATE_FOLDER` / `TEMPLATE_FILE` in `templates.ts` put it at `<workspace>/.olympia/template.cpp`, which a
student opens in the language they are already typing, edits with real syntax highlighting, and carries to
the lab machine along with the folder — a `settings.json` string full of `\n` is none of those.
`olympia.template.editMy` (a permanent 面板 row under 题目与模板; it deliberately has no keybinding of its
own, `Ctrl+Alt+T` reaches it through the picker) seeds it from `templateFor('acm')` when missing and opens
it, so nobody starts from a blank file. When 我的模板 has content, `insertTemplate` lists it *first* —
pressing enter is "use mine" — and `templateOnPull` seeds the new `<题号>.cpp` from it instead of the
built-in ACM text.

Two guards exist because both failure modes would look like the feature being broken rather than a bug:
`readMyTemplate` trims before deciding, so a file the student created and has not filled in yet is not a
template (the picker then offers 新建/编辑 rather than listing an empty 我的模板, and a forced empty pick
warns 我的模板是空的 instead of inserting blank lines); and 拉题面 never overwrites an existing `.cpp`, so
re-pulling a statement cannot delete a solution that is half written.

**集训清单** is the other thing the old app had and this one did not: a *named* list of problems with a
duration, used to start a session. It lives at `<workspace>/.olympia/practice.json`
([`src/practiceList.ts`](../../oss/extensions/olympia-contest/src/practiceList.ts)) for the same reason
我的模板 does — it walks to the lab machine with the folder, and the alternative (a `Memento` key) would
tie a training plan to one window. `parseProblemIds` accepts whatever a student pastes from an OJ page
(spaces, commas, `、`, newlines), dedupes case-insensitively because statement files are matched that way
already, and caps at `MAX_PRACTICE_PROBLEMS` — a list of 500 ids is a problem set, not a 清单.
`normalizeProblemId` folds the Codeforces spellings `1660/C` and `1660-C` onto the name the statement file
actually has (`1660C.md`); without it the same problem is three names in one list, the ✓ never lands and
one click re-pulls a page the student already has. `isSafeProblemId` rejects ids containing a slash, `..`,
or a trailing dot, because a 题号 is used to build a path. Minutes are
validated against the same `5–600` range 比赛模式 uses, and an empty field is 「不设时限」 rather than 0.

The list itself never re-implements the timer: 「开始这一场」 executes `olympia.contestMode` **with the
minutes as an argument**, and `contestMode.ts` starts straight away when the number is in range, falling
back to asking when it is missing or nonsense — so the countdown, the reload restore, the one-shot
时间到 notice and the AI-coach lock all stay in the one place that already owns them
(`test-contest-gate.mjs`), and the list only contributes the seed. The 欢迎页 walkthrough's 比赛模式 step
carries a second button (「打开集训清单」) for the same reason the bars do: a student who has never heard
of the feature cannot guess it from a VS Code-shaped UI, and the link is a
`[text](command:olympia.practice.open)` markdown button that `check-command-wiring.mjs` resolves like
any other, so renaming the command cannot leave a dead button on the start page. Per-problem ✓ is the solve log again,
read through `solvedMarks`, so 「这道我做过」 is answered by data the product already writes rather than a
second checkbox store. Picking a row opens the cached statement when there is one and pulls it when there
is not — one click, no "先去看那个命令". Opening a row goes through `cachedStatements`, which maps a
lowercased 题号 to the filename that is *actually* on disk, instead of rebuilding `<题号>.md` from what the
list typed: a list that says `P1002` and a file called `p1002.md` are the same problem, and on Windows the
rebuilt path happens to resolve while elsewhere it re-pulls a statement the student already has. The menu edits in place (加一道题 / 移掉一道题 / 改时长 / 删掉这份清单, each
writing the file and returning to the same menu so the change is visible immediately), and removing the
*last* problem is refused with a pointer to 删掉这份清单: `normalizeList` drops an empty list on read, so
the literal reading of "remove this problem" would make the whole plan vanish — the worst outcome a click
can have is the thing disappearing without saying so. 删掉这份清单 asks first, and 加一道题 separates
「已经在了」 from 「这张单子满了」 from 「没认出题号」, because a student who gets one of those three wrong
will otherwise retry the same typo forever.

The file is the student's training plan, so the write path is written as if losing it were the worst
possible bug (it is): `readPractice` returns `{lists, unknown, unreadable}` and accepts both a root array
and a `{lists: [...]}` object, strips a UTF-8 BOM (PowerShell redirects and hand-saved files on Windows
produce one, and `JSON.parse` fails on it outright), keeps entries and fields it does not recognise, and
`writeLists` re-emits them verbatim. An `unreadable` file is never overwritten — 存不下去 returns a Chinese
sentence that reaches the user instead of a half-JSON file. The write itself is tmp + `rename`, because
`writeFile` truncates first and another window reading in that 10 ms window would see a broken file and
take the `unreadable` path: a coincidence turning into permanent loss. `olympia.contestMode` lives in
another extension, so 「开始这一场」 wraps the `executeCommand` in a try/catch and says 比赛模式没能开始 —
a Node error in the notification area is not an explanation. Out-of-range minutes come back as `undefined`
from `requestedMinutes` and the command falls back to asking; a 清单 whose stored session has already
expired, but whose 收尾 never ran, starts a new session instead of only clearing the old one, since the
click meant "another round".

**打开原题网页** (`olympia.problem.openSource`, `Ctrl+Alt+U`) is the old app's submit affordance: the student
finishes a `.cpp` and has to get back to the OJ page to submit, read the data range, or look at the samples
again. The URL was already in the product — `renderStatement` writes it into the statement footer — so this
command adds no new storage and no second copy of that line: `FIELD.sourceLink` is now the one constant both
the writer and `metaOf` read, and `LibraryEntry` carries the parsed `url`. Resolving *which* problem reuses
`pickTarget`, i.e. the same file-stem-then-quick-pick path 加一组自定义样例 uses, so `P1001.cpp` and
`P1001.md` both resolve to 题号 `P1001` and a student with no file open gets the library list rather than a
complaint. Only `http`/`https` is handed to `vscode.env.openExternal`: a statement is a plain text file the
student edits, and a hand-typed `原文链接：file:///…` must not become something the product asks the OS to
open. A statement with no link (handwritten, half-pulled) says so and points at 拉题面 instead of opening a
blank tab.

The three platform origins and every non-empty `*Url` in `product.json` are required to appear in
`product.json`'s `linkProtectionTrustedDomains`; `check-config-defaults.mjs` reads both sides and fails when
they drift, because 打开原题网页 that stops on 「是否要打开外部网站?」 reads as a broken feature. What is
verified in code: `trustedDomainsValidator.ts:42` registers a validator on `IOpenerService` for every http(s)
URI, and `readStaticTrustedDomains` seeds that list from `linkProtectionTrustedDomains`
(`trustedDomains.ts:186`). The same validator also short-circuits for links opened *from a trusted
workspace* when `workbench.trustedDomains.promptInTrustedWorkspace` is off (`trustedDomainsValidator.ts:50`),
so the shipped list is the second layer rather than the only one — and it stays limited to hosts the product
itself ships links to, not whatever host appears in a statement. The gate compares whole origins on purpose:
`platform/url/common/trustedDomains.ts:15` documents that **there is no subdomain matching**, so
`https://codeforces.com` would not cover a `https://www.codeforces.com` link, and the list has to carry the
exact authority each `*_ORIGIN` builds its statement URL from. Whether an `env.openExternal` call from an
extension sets `fromWorkspace` was not checked, and neither was the dialog's real behaviour: that needs a
launched product.

**题面 is read, not diffed** ([`src/statementView.ts`](../../oss/extensions/olympia-contest/src/statementView.ts)).
Until 2026-10-16 the end of 拉题面 was `workspace.openTextDocument` + a new `.md` tab, which is two wrong things
at once: the student sees Markdown *source* (`$O(n\log n)$` is a run of backslashes there), and the statement —
a read-only reference he consults while writing — steals the tab he is typing in. So 题面 now has **its own
activity-bar container** (`olympiaStatement`, `Ctrl+Alt+M`) rather than a view inside the Olympia one: the user
asked for it by weight (「题面的重要性比较高，单独开一个左栏」), and a container is what the sidebar exposes as a
top-level affordance.

Rendering is reuse, not a second implementation: Markdown → HTML goes through the shipped `markdown.api.render`
(markdown-language-features), and math styling through the KaTeX that already ships with `vscode.markdown-math`
(`notebook-out/katex.min.css` plus its `fonts/`), both resolved at runtime by extension id so nothing copies an
upstream hashed filename or hardcodes a path. `localResourceRoots` and `font-src ${webview.cspSource}` are what
let those woff2 files load inside the webview. Verified in the **installed** product against a math-heavy
statement: 20 `.katex` nodes, the five `h2` section headings, 2 code blocks, 1 table, and a screenshot showing
typeset formulas — which is the only kind of evidence a webview change gets (a green compile says nothing about
a rendered page).

Three degradations, each chosen so the failure is visible rather than blank. `show()` runs `<viewId>.focus`
first, because painting into a view that has not been created yet is exactly the "command ran and nothing
happened" bug; when focus throws (contribution removed, or the student unchecked the row in the gear menu) it
returns `false` and the caller opens the editor instead — the statement is never lost, only shown the older way.
If `markdown.api.render` is missing or returns nothing, the page shows the raw Markdown under a line saying the
renderer was not found (`.body.raw` is `white-space: pre-wrap`, so it stays readable). A file deleted on disk
clears the view back to its empty state, which offers 拉取题面 / 从题面库选 as buttons carrying real command ids
— a webview button with no command behind it is worse than no button, since clicking it teaches the student that
this UI does nothing. Re-pulling overwrites the same file in place, so the view watches that one path and
repaints.

The header (`P9999 区间和与公式`, chips 来源 / 难度 / 时限 / 内存 / 样例数, 原题页面 link) is built from `metaOf`,
i.e. the **same** `FIELD` constants that write the file, and `bodyOf` strips only the first `# ` line and the `>`
metadata quotes — matched by position and prefix, so a `## 输入格式` heading and a student's own `>` quote both
survive. That is why `META_SEPARATOR` and `FIELD.sourceLink` became exported: a renamed field cannot silently
blank the header any more. `olympia.statement.openRaw` is the deliberate escape hatch for *editing* a statement;
`editStatement` (renamed from `showStatement` in `problemLibrary.ts`) is the fallback path, not the reading path.

One VS Code contribution rule cost an hour and belongs here: `viewsContainers.activitybar[].icon` accepts
**only a path to an SVG file** — `"$(book)"` does not fall back to a default icon, it makes the whole container
vanish (no icon, no 打开视图 entry, no error anywhere). `media/olympia-statement.svg` is a 24×24 `currentColor`
page-with-lines glyph drawn to match the other Olympia icons, and `check-view-containers.mjs` is the ratchet that
keeps a codicon id out of that field — while `test-statement-view.mjs` is the one that checks what actually gets
painted into the webview.

| Command | Title | Keybinding (`when`) | Also in menus |
| --- | --- | --- | --- |
| `olympia.problem.pull` | 拉取题面... | `Ctrl+Alt+P` | explorer context |
| `olympia.problem.pullFromClipboard` | 从剪贴板拉取题号 | `Ctrl+Alt+V` (`editorTextFocus`) | command palette |
| `olympia.template.insert` | 插入赛制模板... | `Ctrl+Alt+T` (`editorTextFocus`) | editor tab context (`resourceLangId == cpp`) |
| `olympia.template.editMy` | 编辑我的模板 | — (via `Ctrl+Alt+T`) | Olympia 面板 → 题目与模板 |
| `olympia.problem.openStatement` | 打开题面库 | `Ctrl+Alt+O` (`editorTextFocus`) | command palette |
| `olympia.problem.openSource` | 打开原题网页 | `Ctrl+Alt+U` (`editorTextFocus`) | editor context (`cpp`/`c`/`markdown`), Olympia 面板 → 题目与模板, command palette |
| `olympia.problem.appendSample` | 给这道题加一组自定义样例 | — | also called by 对拍 with `{hint, input, output}` |
| `olympia.statement.show` | 显示题面（侧栏） | `Ctrl+Alt+M` | view/title |
| `olympia.statement.refresh` | 题面：重新读一次文件 | — | view/title (icon button) |
| `olympia.statement.openRaw` | 题面：以文本方式打开（改题面用） | — | view/title, command palette |
| `olympia.practice.open` | 集训清单 | `Ctrl+Alt+L` | Olympia 面板 → 题目与模板 |
| `olympia.practice.new` | 新建集训清单 | — (via `Ctrl+Alt+L`) | command palette |

[`src/statementSamples.ts`](../../oss/extensions/olympia-contest/src/statementSamples.ts) appends one
case to a statement's `## 样例数据` section (or starts the section before the pull footer when the
statement has no samples yet) and numbers it from the largest existing 样例. The block comes from
`renderSampleBlock` — the same function `renderSamples` uses when the statement is first written — so
what 对拍 appends is byte-for-byte the shape `parseSamples` reads back; a second copy of that layout is
how a hand-added case would silently stop being judged. Which statement to write into is resolved by
file stem first (对拍 passes the 正解's filename), falling back to the problem bank's quick pick.

The command has two modes on purpose. With arguments it is 对拍's "keep this case"; with none it is the
palette entry, which appends an empty `### 样例 N` scaffold with a 说明 line and opens the statement so
the student fills it in — the statement *is* the editable, persisted test-case file, so there is no
second case format to keep in sync. A case whose `**输出**` block is still empty cannot be judged
against anything, so 跑样例 skips it, says which numbers were skipped, and counts only the filled ones
(`通过 1/1`, not a false WA). Sample numbers are carried from the heading rather than derived from the
array index, because the list is no longer dense once something is skipped.

Settings: `olympia.problem.problemsDir` (default `.olympia/problems`, where pulled statements are
cached), `olympia.problem.templateOnPull` (default `false`; when on, 拉题面 also creates `<题号>.cpp` next
to the statement, seeded from 我的模板 and never overwriting a file that already exists — the manifest's
own sentence says this, so the settings page cannot promise 一个写死的 `main.cpp`),
`olympia.problem.requestTimeoutMs`
(default `15000`), `olympia.problem.cfMetadata` (default `false`; when on, also pulls Codeforces
metadata), `olympia.templates.cppSnippets` (default `true`; when off the C++ completion list is
empty and only word-based suggestions remain).

## `olympia-coach` — the `@coach` chat participant

A chat participant **and** the BYOK model provider: it registers `olympia.coach` (display name
`coach`, slash commands `/wa`, `/hint`, `/check`), contributes `olympia.coach.selectModel`,
`olympia.coach.setApiKey`, the settings `olympia.ai.baseUrl` / `olympia.ai.models`, and contributes
`languageModelChatProviders` with `vendor: "olympia"`, registering it through
`vscode.lm.registerLanguageModelChatProvider` (stable API,
[`vscode.d.ts:20851`](../../oss/src/vscode-dts/vscode.d.ts)). It activates on `onStartupFinished`.

The provider half is new (oss `9a2bb6da`) and exists because nothing else in the build can supply
models: the only other `languageModelChatProviders` contributor in the tree is `extensions/copilot`,
which is not in the `compilations` array in `oss/build/gulpfile.extensions.ts`, so before this
`selectModels()` was always empty and `@coach` could not answer. `provideLanguageModelChatResponse`
POSTs to `${baseUrl}/chat/completions` with `stream: true`, parses SSE lines and reports each delta as
a `LanguageModelTextPart`; `olympia.ai.models` decides which ids are offered. The API key lives only
in `SecretStorage`, entered through a password `InputBox` (empty clears it) — never in
`settings.json` or `globalState`. Text-only, no tool calling.

`settingsPanel.ts` there had a bug worth keeping on record, because it looked like a storage failure
rather than a race: the handler that saves or clears the key `await`ed its own
`showInformationMessage`, and the caller (the 设置 page's `onDidReceiveMessage`) refreshed only after
that promise resolved. When the window is not focused the notification does not become a popup — it
sits in the bell, so the promise never resolves and the page keeps saying 「未设置」 over a key that
was stored several seconds earlier. Measured directly: the bell held both 「已保存」 and 「已清除」 while
the row underneath still read 未设置, which is exactly what sends a student to type the key a second
time. Both sites now fire the notification and do not wait for it (`void`), so the confirmation stays
available and the refresh is not gated on whether the user dismissed a toast.

Contest lock: `handleRequest` starts by asking `olympia.contest.isRunning` (a command registered by
`olympia-onboarding`, since extensions cannot read each other's state or context keys) and, while a
contest is running, streams only a refusal that tells the student how to end it — no model request is
made. A missing answer is treated as "no contest", so a broken link between the two extensions can
lock the coach out permanently. The same state is published as the context key
`olympia.contest.running` for `when` clauses; `publishRunning()` writes it only when the boolean
flips, so the one-second ticker does not hammer `setContext`.

How to exercise it without a device: `scripts/oneoff/test-coach-provider.mjs` loads the compiled
`out/provider.js` with `vscode` stubbed and asserts model listing, the no-key early return, URL
normalisation, the bearer header, abort wiring, role/part mapping, SSE frame handling (malformed,
keepalive, `[DONE]`), the two token weights and HTTP-error surfacing. Run
`npm run gulp compile-extension:olympia-coach` first, then `node scripts/oneoff/test-coach-provider.mjs`.

Why the mismatch above is harmless, traced rather than assumed: the only consumer of
`defaultChatAgent.provider.providerExtensionId` is `maybeEnableAuthExtension`
([`chatSetup.ts:155-187`](../../oss/src/vs/workbench/contrib/chat/browser/chatSetup/chatSetup.ts)),
which is called from just two places — `ChatSetupController.signIn` (`chatSetupController.ts:168`) and
`chatSetupProviders.ts:324` — i.e. the Copilot chat-setup sign-in flow, which this product never
enters. It is doubly inert: with the phantom id, `extensionsWorkbenchService.local.find(...)` matches
nothing and the function returns at `:167` before it can re-enable anything or show the leftover
「正在启用 GitHub 身份验证」 progress label. Nothing in the LM provider registry keys off
`providerExtensionId`; registration is by the contributing extension plus the `vendor` string, so the
coach's models reach `selectModels()` regardless. Changing that product.json field is therefore neither
required nor useful — and pointing it at `olympia.coach` would only matter if the setup flow existed.
Remaining device check is simply whether `@coach` answers; the settings panel is not on that path.

**It deliberately does not occupy the `defaultChatAgent` slot.** `oss/product.json` still names the
legacy `olympia.olympia-coach` in `defaultChatAgent.extensionId` / `.chatExtensionId` /
`.providerExtensionId`; that is intentional, because core's
`ensureChatExtensionInitialDisabledState`
([`extensionEnablementService.ts:155-190`](../../oss/src/vs/workbench/services/extensionManagement/browser/extensionEnablementService.ts))
silently and persistently disables any built-in whose id equals `chatExtensionId` until chat setup is
completed, and `_isDisabledByUnification` (`:663`) disables `extensionId` while
`chat.extensionUnification.enabled` is on. Claiming either field would ship the coach switched off on
every fresh profile.

The dangling ids were **not** as inert as they looked. `chatSetupContributions.ts:699-700` computes
`ChatContextKeys.Setup.installed` by matching `chatExtensionId` against locally installed extensions,
so the phantom id pinned it to `false`, and every `!installed` gate in the chat setup UI treated the
product as "Copilot not installed yet" — the sign-in banner, the title-bar login item and the
plan/upgrade surface were all live. Rather than match the ids (which would trip the disable trap
above), `oss/product.json` now sets `defaultChatAgent.byokOnly: true`: `ChatEntitlementService` marks
`Setup.hidden/installed/completed` and returns before constructing `ChatEntitlementContext` /
`ChatEntitlementRequests`, so no entitlement or quota request is made at startup either, and
`DefaultAccountProviderContribution` does not register an account provider whose auth id has no
extension behind it. See [`AGENTS.md`](../../AGENTS.md) for the same rule in one line.

Model access is bring-your-own-key only
([`src/model.ts`](../../oss/extensions/olympia-coach/src/model.ts)): `listModels()` goes through the
`LanguageModelChat` API and treats a permission denial as an empty list, and `resolveModel()` uses the
stored pick, or the single available model, and **never guesses** between several — the coach then
tells the student to run `olympia.coach.selectModel`.
[`src/coach.ts`](../../oss/extensions/olympia-coach/src/coach.ts) sets the persona: it must say what it
cannot see (no statement, no judge output), it must not hand over a complete AC program unasked, and
it attaches the active document capped at 12k characters. Diagnostics land in the
`Olympia AI Coach` log output channel (the id `product.json` refers to as
`chatExtensionOutputId`) plus `olympia.coach.debug.extensionState`.

## The workbench-side Olympia contributions

`byokOnly` removes the hosted-assistant *flows*, but two chrome items are gated by other checks and
survive it: the chat status-bar entry (`chat.statusBarEntry`) and the accounts management button, whose
visibility comes from the PROFILE storage key `workbench.activity.showAccounts` rather than from the
product flag. [`oss/src/vs/workbench/contrib/olympia/browser/olympiaChrome.ts`](../../oss/src/vs/workbench/contrib/olympia/browser/olympiaChrome.ts)
is a `WorkbenchPhase.BlockRestore` contribution registered from `workbench.common.main.ts`; when
`defaultChatAgent.byokOnly` is set it calls `IStatusbarService.updateEntryVisibility('chat.statusBarEntry',
false)` and seeds `showAccounts` to `false` **only when the user has never set it**, so a student who
turns it back on stays turned on. The file is the place to add further product-level chrome trims —
`product.defaultSettings` does not exist in this codebase, so defaults have to be changed either here or
at the registration site (as `chat.titleBar.openInAgentsWindow.enabled` now does, defaulting to
`!byokOnly`).

Two more chrome items were left by `byokOnly` because neither reads the product flag, and both are now
trimmed at their registration site rather than in `olympiaChrome.ts`, since neither is conditional:
`chat.agentsControl.enabled` shipped `default: 'compact'`, which replaces the command-center search box with
an agent-status pill and a unified-chat widget — in a build with no hosted assistant that pill is a dead
button on the first screen, so the default is now `'hidden'`; and
`githubLinkPresentation.contribution.ts` is no longer imported from `workbench.common.main.ts`, because it
registers a 「Sign in to GitHub」 affordance for github.com links whose authority comes from
`defaultAccount.ts`, which still returns `https://github.com/` under `byokOnly` — clicking it throws
`No default account provider configured`, and the coach's answers can contain GitHub links. Both are pinned
in `check-core-copy.mjs`: a `copy` entry asserts `githubLinkPresentation` never appears in the built
`workbench.common.main.js`, and the pill's default is read from the slice between
`[ChatConfiguration.AgentStatusEnabled]` and `[ChatConfiguration.UnifiedAgentsBar]` — the built file leaves
that key unquoted (`default: "hidden"`) where other registration sites quote it, so the first version of the
assertion, written from the source's shape, reported 「没找到」 on a correct product. What is *not* verified:
whether the pill actually disappears and whether the sign-in prompt is really gone — that needs the product
launched, and it is on the 真机核对 list.

**Three more surfaces `byokOnly` never reached** (fork `cb54a760`), each trimmed at the one place that decides
it rather than at each call site. The 关于 box printed `productService.version`, which the packaging pipeline
injects from `oss/package.json` — i.e. the VS Code base number 1.140.0 — while the website, the release tag and
the installer all say Olympia v1.0.0; a student comparing the two could only conclude he had installed the
wrong file. `olympiaVersion` in `product.json` used to be a field nothing read; it is now the single source
(everything else derives from it, see `AGENTS.md` 发布), and 关于 reads it first: `1.0.0（VS Code 1.140.0）`.
`tip.init` joined `TIPS_HIDDEN_IN_OLYMPIA` because that rotating hint was the one sitting under
「没有可用模型」 on the first screen, telling students to generate an AGENTS.md — an engineering-convention file
for coding agents, which is not what this product's chat is for. And the agents window is now gated by
`AGENTS_WINDOW_DISABLED` in `common/constants.ts`, because `OPEN_AGENTS_WINDOW_PRECONDITION` alone was not
enough: a keybinding's `when` does not include the command's precondition, so hiding the palette entry left
`Ctrl+Shift+A` opening the window. All four are pinned in `check-core-copy.mjs` against the **built** files,
and each was broken once on its own occurrence before being trusted — the first draft of the tip assertion used
`[\s\S]*?` and happily matched past the array's closing bracket, so deleting `tip.init` did not turn it red.
What is *not* device-verified: what 关于 actually renders.

**The empty model list is a first screen, not an error** (fork `56cbc549`). With `byokOnly` and nothing
configured, `buildNoModelsItem` returned a row that was `disabled: true` and read 「没有可用模型」 — the only
advice on screen was a conclusion, and the row that actually goes to configuration sat one entry below it.
The row now carries that action itself when `manageModelsAction` exists: `enabled: goToSettings`, and its
`run` forwards to the same action, so the sentence and the way out are one click. Its label is short
(「没有可用模型 · 去配置」) on purpose — the label column truncates, and the first draft
「没有可用模型：点这里去填服务地址与密钥」 lost its tail in a real dropdown; the explanation moved to the
description line, which has room. `tip.createPrompt` joined the hidden hints for the same reason `tip.init`
did: it rotated into the screenshot while the model list was still empty. Device-checked in a dev window:
the dropdown reads 「没有可用模型 · 去配置 | 点这里填服务地址与密钥，填好后模型会自动出现在这里 | 管理模型…」.
Getting that screenshot is now cheap — `node build/next/index.ts bundle --out out` (≈10 s) is the only `out/`
shape that boots, because the per-module builds leave raw `import './media/x.css'` statements that Chromium
rejects as ES modules; the gates read the per-module tree, so `npm run transpile-client` (≈76 s) restores it
afterwards.

**A judge verdict now hands itself to the coach** (same fork commit). 跑样例 used to end at a notification
with 「对比期望输出」; the student then retyped the problem, the expected output and his output into the chat
box. `judgeSamples.ts` adds a 问教练 button (shown for every non-AC verdict) that opens the chat panel with
`workbench.action.chat.open` in `ask` mode and pre-fills the problem id and title, the verdict, the pass
count, and up to two failed cases as `期望`/`我的输出` pairs, each clipped to `COACH_SAMPLE_LINES` (12) lines
with a 「…（还有 N 行）」 tail so a 200-line output does not eat the context window. Verified end to end on
P99: the WA notification's 问教练 produced 「@coach P99「P99 A+B Problem（题面视图真机核对）」 判成 答案错误
（WA），0/1 组通过。… 样例 1：第 1 行第 1 个数不同：期望 7，得到 12。」 with the input still to be sent,
which is deliberate — the student reads the question before spending a request.

**Until 2026-10-16 the chat panel could not answer at all** (fork `5ea14508`), and no static check could have
told us: the trim that emptied `extensions/copilot/package.json`'s `chatAgents` removed the tree's only
default-agent contribution, and `olympia-coach`'s own `chatParticipants` entry never set
`isDefault`/`locations`/`modes`. `getDefaultAgent` (`chatAgents.ts:459`) requires all three, so the panel
logged `sendRequest No default agent for location panel`, the mode chip never rendered, the draft never
cleared, and no request left the machine — a local fake OpenAI server saw `GET /v1/models` and zero
`POST /chat/completions`. Setting those three fields needs `defaultChatParticipant` (plus
`chatParticipantAdditions` for `locations`) in the extension's `enabledApiProposals`, because
`chatParticipant.contribution.ts:268-276` skips the *entire* entry without them. With that in place the coach
answered end to end against the fake server, streaming through the panel. `check-chat-product-ids.mjs` now
pins all of it — the three manifest fields, both proposals, and the participant id matching the string given
to `createChatParticipant` — and each of the five was broken once to prove it turns red alone.
Two follow-ups are still open: the panel's mode chip reads `Ask` because it resolves a different mode object
than `ChatMode.Ask` (see `modePickerActionItem.ts:350`), and no answer has yet come from a *real* provider
with his key.

**No Microsoft hop survives in a surface a student can click.** Seven setting descriptions in
[`files.contribution.ts`](../../oss/src/vs/workbench/contrib/files/browser/files.contribution.ts)
linked out to Microsoft documentation — six *glob 模式* links to `https://aka.ms/vscode-glob-patterns`
and one *自动保存* link to `code.visualstudio.com/docs/editor/codebasics`. Neither host is in
`linkProtectionTrustedDomains`, so the click first raises 「是否信任此链接」 and then lands on English
documentation; the link markup is gone and the terms are inline code (`glob 模式`, `自动保存`), because
the setting text already explains what they are. The two notification/button actions that opened
`go.microsoft.com` fwlinks are routed to `product.documentationUrl` instead —
`workspaceWatcher.ts`'s ENOSPC 「指令」 (the upstream target is Linux inotify limits, and this product
only ships Windows) and `textFileSaveErrorHandler.ts`'s 了解更多 for save conflicts, whose upstream page
describes the merge-conflict editor we no longer bundle. Both read the product field rather than a new
hardcoded URL; `IProductService.documentationUrl` is optional, so each site narrows with an `if` instead
of asserting. What is *not* verified: whether those two buttons now open the docs tab cleanly — device
list again.

`check-core-copy.mjs` grew a **source-side ratchet** alongside its built-output entries for this: it walks
`oss/src/vs/**/*.ts` (excluding tests; 6,902 files today) and counts `aka.ms` / `go.microsoft.com` /
`code.visualstudio.com` occurrences, asserting the total never exceeds the recorded `CEILING` (191 as
measured 2026-10-14) and that the three files above hold zero — read by path, so a renamed file reports
「文件不存在」 instead of passing as "no links found". It is a ratchet, not an inventory: the residue is
dominated by surfaces this product does not run (`platform/request/common/request.ts` 13,
`tasks/common/taskTemplates.ts` 13 behind the always-false task switch, `extensionsActions.ts` 11 — the
extension view is the real next target), and the point of the number is that nobody adds a new hardcoded
Microsoft URL to core without lowering it. The run prints the five heaviest files so the roadmap is the
checker's own output rather than a list that rots.
The same run also asserts the settings tree no longer navigates to 更新 or 设置同步
(`application/update`, `application/settingsSync` — `update.*` and `settingsSync.*` stay searchable, and
遥测 stays in the tree precisely so a student can confirm telemetry is off) while still containing
`application/telemetry` and `application/network`, which is the anti-vacuity half of that assertion:
a settingsLayout.ts the checker failed to read would pass a "these two ids are absent" claim alone.

**Settings are grouped in core, not in the extension manifests' `configuration.title`.**
`resolveSettingsTree` is handed `coreSettingsGroups` only
([`settingsEditor2.ts:1512`](../../oss/src/vs/workbench/contrib/preferences/browser/settingsEditor2.ts)),
so a category added to `tocData` in `settingsLayout.ts` can never show a setting an extension
contributed — the `olympia` category that used to sit there was inert decoration (removed; the comment
left in its place says where the real hook is). Extension settings become tree entries in
`createTocTreeForExtensionSettings` (`settingsTree.ts:480`), which keys one section per extension id and
labels it with the extension's display name — so Olympia's three built-ins showed up as three unrelated
sections, each needing its own expand. The fork now folds every `olympia.*` extension id into a single
`Olympia` root, and the three `configuration.title`s became the sub-headings 编译器与评测 / 题面与模板 /
AI 教练. Note the interaction that makes the sub-headings matter: a child whose label equals the root's
label is flattened into the root's ungrouped settings (`settingsTree.ts:539`), which is why no title may
be plain "Olympia" any more. `getCommonlyUsedData(groups)` *does* see extension settings
(`:1626`), so `olympia.compiler.profile` now occupies the "常用" row that used to name
`GitHub.copilot-chat.manageExtension` — an extension this product does not ship.

**The 帮助 menu and the issue reporter speak for Olympia now.** `MenuId.MenubarHelpMenu` used to carry
「使用英文报告问题」, 「编辑器操场」, 「打开进程资源管理器」 and 「询问 @vscode」. The fork relabels the first to
「报告问题」 and rewrites both reporters' guidance line: the issue tracker is our own repo
(`product.reportIssueUrl`), so sending a Chinese middle-schooler to the Microsoft wiki and telling them
to write English was simply wrong — the classic reporter even had a permanent
「请使用英文进行填写」 banner, because it showed whenever `document.documentElement.lang !== 'en'`.
The playground and process-explorer rows are gone from the menu (the commands stay reachable from the
palette), and `询问 @vscode` was deleted outright: its precondition depends on `chatSetupHidden`, which
`byokOnly` forces on, so it could only ever render greyed out.
`product.json` now sets `documentationUrl`, `keyboardShortcutsUrlWin`, `releaseNotesUrl` and
`enableTelemetry: false` (the last one explicitly — `telemetryUtils.ts:101` disables telemetry whenever
the flag is falsy, and it was falsy only by omission), and the `defaultChatAgent` links that pointed at
`/docs/ai`, `/terms`, `/privacy`, `/download` — none of which existed — now point at real pages under
`website/`. `scripts/oneoff/check-website.mjs` fails if any product link stops resolving.

**Removing a whole upstream surface is one constant, not twenty edits.** Three places now carry that
shape, and each is asserted against the built tree by `check-core-copy.mjs`:

* [`olympiaActivityBar.ts`](../../oss/src/vs/workbench/contrib/olympia/browser/olympiaActivityBar.ts)
  holds `HIDDEN_VIEWLETS` — 运行与调试, 源代码管理, and now 测试 (`workbench.view.extension.test`) plus
  测试结果 (`workbench.panel.testResults`). Deregistering the container also removes its
  `openCommandActionDescriptor`, so 「测试」 disappears from the 打开视图 list and from the title-bar
  视图 menu instead of opening an empty panel. **The module imports each contribution before it
  deregisters anything**: registration happens at that module's top level, so a missing import means the
  loop runs against an empty registry and the icon stays — with no error anywhere. That is why the file
  imports `debug.contribution`, `scm.contribution` and `testing.contribution` itself rather than relying
  on `workbench.common.main.ts` ordering.
* [`task.contribution.ts`](../../oss/src/vs/workbench/contrib/tasks/browser/task.contribution.ts) now
  gates every task surface on one `TASKS_UI_AVAILABLE = ContextKeyExpr.false()` (23 references: the
  command-palette entries that used to read `when: TaskExecutionSupportedContext`, the composite
  `WorkbenchStateContext` one, and the two gear / menubar rows from the previous batch). Restoring
  upstream behaviour is one line, and the check asserts both halves: the constant is a literal false, and
  *no* `when: TaskExecutionSupportedContext` survived. The commands themselves stay registered —
  `TaskCommandsRegistered` is untouched — because other code paths invoke them; only the «go write
  tasks.json» invitations are gone, which is what a 初中生 needs.
* `workbench.action.manageAccounts` dropped to `f1: false`
  ([`manageAccountsAction.ts`](../../oss/src/vs/workbench/contrib/authentication/browser/actions/manageAccountsAction.ts)).
  With `showAccounts` seeded off, the palette entry opened a provider list that can only ever be empty
  in a BYOK product; the command still exists so an account surface that *is* opened can still use it.

Two candidates were **left alone on purpose**, because the evidence said they are not reachable rather
than because nobody looked: the settings-sync viewlet is registered from inside a workbench contribution
(`userDataSync.ts:1196`, i.e. *after* module import, so a top-level `deregisterViewContainer` could not
catch it) but its container is `hideIfEmpty` and its views are gated on sync enablement, which cannot
come true without an authentication provider; and `welcome.showAllWalkthroughs` stays, because grepping
the 50 shipped manifests for a `walkthroughs` contribution returns exactly one file —
`olympia-onboarding`'s own ten-step wizard, which is the thing that menu row is for.

None of this is device-verified: 9 Olympia processes belong to the user and are never killed from here,
so the evidence for these four surfaces is the built-tree assertions plus the registration sites read
above, not a screenshot.

## Which built-in extensions ship: one product table, two readers

`product.json`'s `olympiaExcludedBuiltInExtensions` is the only place the built-in trim list is
written. Two consumers read it, and neither may keep a private copy:
[`oss/build/lib/extensions.ts`](../../oss/build/lib/extensions.ts) filters the packaging stream by
the *folder names* under `oss/extensions/`, and
[`oss/src/vs/platform/extensionManagement/common/extensionsScannerService.ts`](../../oss/src/vs/platform/extensionManagement/common/extensionsScannerService.ts)
skips *directory names* while walking the built-in extensions folder — in dev mode that scanner is
the only thing that keeps a trimmed extension from loading, which is why the list can not live only
in the build script.

It used to live in both, hand-copied, and that is exactly how it rotted: both copies listed `prompt`
while the folder is `prompt-basics`, so a "trimmed" extension shipped in every build until
2026-10-14, and five more entries (`ms-vscode.js-debug`, `ms-vscode.js-debug-companion`,
`ms-vscode.vscode-js-profile-table`, `ms-vscode.node-debug`, `ms-vscode.node-debug2`) named nothing
at all because `builtInExtensions` is empty in this product and no marketplace extension is ever
downloaded. The same drift also made `isCopilotExcludedFromProduct()` in `gulpfile.vscode.ts` a
tautology — it asked `builtInExtensions`, which is `[]`, so it answered "excluded" no matter what the
trim list said; it now asks the table.

`node scripts/oneoff/check-built-in-trim.mjs` is the gate: every entry must resolve to a real folder
(or a `builtInExtensions` download), the table must stay lower-cased and duplicate-free, the product
promises (no `copilot`, no git family, no browser/notebook/ports/emmet/TS-intelligence chrome) must
all still be in it, no `olympia-*` id may ever appear, no *kept* extension may declare an
`extensionDependencies` on a trimmed one (activation fails outright when such a dependency is
missing), and both readers plus the `IProductService` declaration must still reference the key — so
re-copying the list back into code turns this checker red rather than silently reintroducing drift.
It prints the installed tree's leftovers as a note, never as a pass: the packaged product is a
separate timeline from the source.

Measured 2026-10-14 (source, before repackaging): 59 ids trimmed out of 100 real extension folders,
41 kept — `configuration-editing cpp css css-language-features diff extension-editing html
html-language-features javascript json json-language-features make markdown-basics
markdown-language-features markdown-math mermaid-markdown-features` + the three `olympia-*` +
`powershell references-view search-result shellscript terminal-suggest` + 12 themes +
`typescript-basics vb xml yaml`. The pure grammars stay because they contribute no UI, no activation
and no palette entries; the eight trims added on 2026-10-14 (`emmet`,
`typescript-language-features`, `ipynb`, `notebook-renderers`, `tunnel-forwarding`,
`debug-auto-launch`, `debug-server-ready`, `prompt-basics`) all either contribute a sidebar view, a
command, a setting or an extension host activation that no C++ contest workflow reaches.

## What licence text ships, and where a student can read it

Three texts travel with the product, and the packaging step now fails loudly if any of them is
missing: `LICENSE.txt` (Microsoft's MIT, named by `product.json.licenseFileName`),
`NOTICE.olympia.txt` (the Chinese component notice, authored here) and
`resources/app/ThirdPartyNotices.txt` (upstream's ~166 npm/git components).
`LICENSES.chromium.html` stays at the product root — it is the only place Electron/Chromium/V8/Node
are itemised, and `ThirdPartyNotices.txt` does *not* mention them, so the Chinese notice points at the
HTML for those and at the TXT for the app layer, never the other way round.
`oss/build/gulpfile.vscode.ts` builds that list from `product.licenseFileName` plus the two named
files and `fs.existsSync`-checks each non-glob entry before `gulp.src`, because the upstream form was
`gulp.src([product.licenseFileName, …], { allowEmpty: true })` with `licenseFileName: "LICENSE"` —
a name no file has in this tree, matched by nothing, swallowed by `allowEmpty`, so no MIT text ever
reached an install directory.

The installer's licence page is decided by exactly one macro, `RootLicenseFileName` in
`oss/build/win32/code.iss`, which now prefers `NOTICE.olympia.txt` and only falls back to
`LICENSE.rtf` / `LICENSE.txt`; the `Setup` section re-uses `{#RootLicenseFileName}` instead of naming
a file, so the two paths can not drift apart. Worth recording because the premise behind it was wrong
twice over: `LicenseFile` **is** a valid `[Languages]` parameter — proven by compiling a toy script
with `ISCC.exe` (an unknown parameter name there fails with `Unrecognized parameter name`, the real
one compiles) — so the `LocalizedLanguageFile` macro appended to all 13 language lines was never dead
code; the wizard did show a licence page, it just showed Microsoft's English MIT text as though it
were the product's own. The other half of the earlier claim ("no licence page at all") came from
reading only the `Setup` section. `LicenseFile` there is now present anyway, as a belt-and-braces
second pointer at the same macro.

Inside the product, `olympia.about.openLicences` ([`src/licences.ts`](../../oss/extensions/olympia-onboarding/src/licences.ts),
last row of the tools view) opens those texts as tabs by resolving `vscode.env.appRoot`, with the
parent directory as a fallback so it works in dev too. It deliberately does not open a GitHub page:
the 机房 machines usually have no network, and "read the licence" that requires a download is not a
licence surface.

`NOTICE.olympia.txt` is written for a 13-year-old reader and is UTF-8 **with BOM** — BOM-less UTF-8
renders as GBK mojibake on a zh-CN Windows, which is the only encoding mistake that is invisible in
the editor and glaring in the wizard. Its content is data-checked rather than reread:
`node scripts/oneoff/check-licence-surface.mjs` compares every number and directory name it claims
against the tree (41 shipped folders, 39 MIT + 2 `GPL-3.0-or-later` — `olympia-onboarding` and
`olympia-contest` declare GPL-3.0 themselves, which is why the notice must not say "everything we
wrote is MIT"; 59 trimmed ids; 13 themes; the 9 real
`toolchain/mingw64/share/licenses/` directories — `gcc` is *not* one of them, its drivers are covered
by `gcc-libs`), names each extension folder that ships its own `ThirdPartyNotices.txt`
(`mermaid-markdown-features` → elkjs under EPL-2.0, `terminal-suggest`, `theme-seti`), and refuses the
author-facing TODOs that used to live in shipped text.
`node scripts/oneoff/test-licence-surface.mjs` breaks each of those rules on purpose — rewrites the
`.iss` line to a hardcoded name, comments it out, drops a licence directory, changes a count, strips
the BOM, points `licenseFileName` back at `LICENSE` — and requires exactly the intended check to turn
red and the file to come back byte-identical.

`product.json.licenseName` is the single source for what *our own* parts are licensed under, and the
checker demands both public statements match it: the first section of `NOTICE.olympia.txt` and the
footer of `website/index.html`. That rule exists because they disagreed — the notice described the
self-written parts as MIT while the site had said GPL-3.0-or-later all along and two of the three
`olympia-*` manifests declare GPL-3.0-or-later, so the shipped text was the wrong one. What is still
open (author's call, printed as a note and never as a pass): the outer repository's `LICENSE` says
MIT. `oss/LICENSE.txt` is *not* part of that question — it is upstream VS Code's own MIT text and
must stay.

Two hygiene facts worth keeping: `build/filters.ts` now lists `NOTICE.olympia.txt` beside
`LICENSE.{txt,rtf}` / `ThirdPartyNotices.txt` in both `unicodeFilter` and `indentationFilter` (its
indentation is prose layout, and 90 Chinese lines are not going to be silenced one comment at a
time), and comments inside `build/**` must stay English — `build/win32/**` is exempt from the unicode
guard but `build/` itself is not, so the OLYMPIA-TRIM note in `gulpfile.vscode.ts` is written in
English while the file it ships into the wizard is Chinese.

## Brand residue a student can still reach

An audit on 2026-10-15 walked the first-run surfaces (not the whole tree) and asked one question per
hit: can a student actually reach this? 349 lines in `src/vs` contain a Microsoft URL; ~172 of them
are JSDoc, `monaco.d.ts`, unregistered contributions, or files whose extension is trimmed, and the
Help menu is already safe because `privacyStatementUrl`, `introductoryVideosUrl`, `tipsAndTricksUrl`,
`newsletterSignupUrl`, `youTubeUrl`, `requestFeatureUrl` and `npsSurveyUrl` are all absent from
`product.json`, so `helpActions.ts` skips registering them and `nps.contribution.ts` returns early.
What was reachable, and what happened to it:

- **Our own strings.** The Olympia settings page footer said 「在 VS Code 设置里搜索 olympia」 and
  the debug group was labelled 「VS Code 自带入口」 ([`src/settingsPanel.ts`](../../oss/extensions/olympia-onboarding/src/settingsPanel.ts));
  the `olympia.debug.showEntryPoints` description promised 「VS Code 自带的『运行或调试』按钮」. Both
  now say 设置页 / 编辑器自带, and the setting description tells the truth about what it restores
  (menu items only — the activity-bar container is deregistered unconditionally in
  [`olympiaActivityBar.ts`](../../oss/src/vs/workbench/contrib/olympia/browser/olympiaActivityBar.ts),
  and no js-debug ships).
- **Theme picker.** `theme-defaults` labelled two themes 「深色(Visual Studio)」/「浅色(Visual Studio)」
  and described itself as the default Visual Studio themes; they are 深色（经典）/ 浅色（经典） now,
  because that list is one welcome-page step away from a first-run student.
- **Workspace trust.** Four dialog messages linked `aka.ms/vscode-workspace-trust` and the
  restricted-mode banner had a 了解更多 button on the same URL; the links are gone (the sentence
  points at our own docs page instead) and the banner keeps only 管理.
- **The interactive editor playground** (`帮助: 交互式编辑器操场`) is a full English upstream page
  with Microsoft links at the end, reachable from the palette and translated nowhere. Its command
  registration was dropped from
  [`walkThrough.contribution.ts`](../../oss/src/vs/workbench/contrib/welcomeWalkthrough/browser/walkThrough.contribution.ts)
  — the walk-through *editor* and its serializer stay, because other welcome cards use that editor,
  and nothing else in the tree references `workbench.action.showInteractivePlayground`.
- **Setting descriptions** still carrying `aka.ms` / `code.visualstudio.com` links (`http.proxy*`,
  `search.exclude`, `editor.multiCursorModifier`, glob-pattern hints in the editor/file-watcher/
  snippet registrations, `extensions.allowed`, the terminal shell-integration hint) were swept the
  same way `files.contribution.ts` was: link markup removed, the term kept as inline code, and any
  sentence still in English translated while touching it. 25 sites in 10 files:
  `scripts/oneoff/check-core-copy.mjs` records the residue as 191 (down from 221) and pins 9 of those
  files at zero. Two deliberate leftovers, neither listed as clean so a future reader can not mistake
  them for already-trimmed surfaces: `extensionManagement.ts:752` is the `extensions.allowed` *policy*
  value read only by the ADMX/ADML export, and `userDataSync.ts`'s two aka.ms strings are unreachable
  because `product.json` has no settings-sync store at all.

A second pass took the chat/MCP surfaces, where the problem was not a link but the whole sentence:
the MCP welcome view said 「直接从 VS Code 浏览并安装[模型上下文协议(MCP)服务器](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)」
(`mcpServersView.ts:277`) — brand plus an untrusted link inside our own view — and two settings in
`chat.shared.contribution.ts` were still entire English paragraphs naming Microsoft: the dictation
model (`dictation.model`, plus the on-device enum item's description) and
`chat.microsoftAuthentication.enabled`, whose English text describes a 「Continue with Microsoft」
sign-in that this product cannot perform. Those three are Chinese now; the Microsoft-auth one says
outright that Olympia uses its own base URL and key (BYOK) and that the option should stay off here.
That same setting nearly got hidden by mistake: I first read it as a dead control (nothing in the
settings tree references the key) and added `included: false`, but `chatSetupRunner.ts` does read it
— when deciding which buttons a sign-in dialog offers — so the honest fix is the Chinese sentence
that says Olympia is BYOK-only and this stays off, not a hidden toggle. Recorded here because the
wrong version was in this file for about ten minutes.
The technology names that are actually load-bearing stayed (Microsoft Foundry Local is the runtime
the on-device dictation model really runs through — renaming it would make the description false).
Left alone on purpose: the five 「受 Microsoft 信任」 labels in
`manageTrustedExtensionsForAccountAction.ts` / `manageTrustedMcpServersForAccountAction.ts` /
`chatLanguageModelActions.ts` and the terminal-voice 「从 "Microsoft" 安装 "Olympia Speech"」 prompt —
each is behind an account that BYOK-only prevents from existing, so changing them would rename a
publisher-verification concept without any student reaching it.

`node scripts/oneoff/check-website.mjs` gained the matching two site-side rules: no page may claim
Git commands are available or that `olympia.debug.showEntryPoints` brings the debug *sidebar* back,
and every mention of that setting must say 不会回来 within the same block; the checker reads
`olympiaActivityBar.ts` to make sure the doc claim still matches the code (if the sidebar ever
becomes setting-driven, that assertion fails first). Both rules were negative-tested by re-inserting
the old sentences into `website/docs/index.html` and restoring the file byte-exactly.

## What the old Tauri app still has that this fork does not

Inventory taken from the old app's own command list (`frontend/src-tauri/src/lib.rs`
`generate_handler![…]`, 29 commands) against the three manifests. The 解题记录 half of that gap closed
with `solveLog.ts`; what is left, most-noticeable first, with the old-app evidence so nobody has to
re-derive it:

| Old feature (what it did) | Where | Status here |
| --- | --- | --- |
| **PDF 题单导入**：选一份比赛 PDF，内嵌渲染、按题切成页码范围，之后在阅读器里逐题跳 | `pdf_extract.rs:115`, `ProblemViewerPanel.tsx:75` | the *page-range* half is not ported — this product has no PDF reader, and statements come from web OJs as Markdown instead. The list itself (the other row) is ported |
| **集训清单（practice records）**：命名的一份题单 + 时长，开一场时用它做倒计时种子 | `useAppStore.ts:186`, `ProblemViewerPanel.tsx:60` | ported as [`src/practiceList.ts`](../../oss/extensions/olympia-contest/src/practiceList.ts): `<workspace>/.olympia/practice.json` holds named lists of OJ problem ids + minutes, `Ctrl+Alt+L` opens them, 「开始这一场」 hands the minutes to 比赛模式, and per-problem ✓ comes from the solve log. What changed: the old app's rows were PDF page ranges, these are 题号 — because the fork's 题面 is a file it can open, pull, and judge |
| **训练中心统计**：连续打卡、今日目标、总题数、30 天趋势柱状图 | `TrainingPage.tsx:26,39,53` | the data (solve log) now exists; the page does not, and in the old app the page was never mounted in `App.tsx` either — so this is a *new* surface, not a parity item |
| **收藏题目**：给题打星、按星筛选 | `lib.rs:54`, `models.rs:27` | not ported **as a second store** — the question it answered (「哪道我已经做过了」) is now answered from the solve log: 题面库 ticks solved problems and `AC` filters them. A manual star that must be remembered to be switched on is worse than free state the product already has; and in the old app the toggle had no UI at all (dormant) |
| **交互控制台运行**：编译后开一个新控制台窗口带 `& pause`，能现场喂 stdin（Dev-C++ 那种） | `runner.rs:212`, `models.rs:69` | ported as the first `F9` option, 在终端里运行（可以手敲输入）— the integrated terminal instead of a separate console window, because a window we spawn has no scrollback, no copy, and no way to read what the program printed (see 编译并运行 above) |
| **自定义代码模板**：用户自己写一段模板，新建文件时自动注入 | `models.rs:64` | ported — `.olympia/template.cpp` + `olympia.template.editMy`; 插模板把它排第一，`templateOnPull` 从它打底 (see 我的模板 above) |

Window chrome, the practice-folder root with auto file resolution, `pick_practice_folder` / `open_url`
/ `write_temp_code`, and the old app's chat persistence are **not** parity items: VS Code's own chrome,
open-folder, save, external links and chat history replace them.

## How to verify without a device

Twelve harnesses under `scripts/oneoff/` load the **compiled** extension output (`oss/extensions/*/out`)
with `vscode` stubbed through a `Module._load` hook (the memory probe needs no stub — it only talks to
`child_process` and `tasklist.exe`), so they test the shipped code path rather than a
re-implementation; five more read *declarations* instead of behaviour — `check-command-wiring.mjs`
(manifests ↔ registrations ↔ UI rows), `check-core-copy.mjs` (the **built core**, `oss/out`),
`check-config-defaults.mjs` (manifest defaults ↔ code fallbacks), `check-extension-copy.mjs`
(the 50 shipped manifests, their `package.nls.json`, and the C/C++/Markdown snippets) and
`check-built-in-trim.mjs` (the built-in extension trim table in `product.json`) and
`check-view-containers.mjs` (the three Olympia contributions' sidebar containers and views). Compile first
(`npm run gulp -- compile-extension:olympia-onboarding`, and `npm run compile-client` for the core
check), then run each with `node scripts/oneoff/<name>.mjs` from the repository root. Every one of them
resolves its paths from `import.meta.url`, not from the working directory, so a harness run from `oss/`
checks the same files instead of crashing on a made-up `oss/oss/…` path — `test-settings-panel.mjs` used
to be the exception, and its failure looked exactly like a broken manifest:

| Harness | What it pins down |
| --- | --- |
| `test-precheck.mjs` | 体检 rules: pragma reporting regardless of the local optimization switch, and nothing reported inside comments or string literals |
| `test-syntax-check.mjs` | 体检's second half — the one that actually compiles. It loads `out/syntaxCheck.js` with `vscode` stubbed and runs the **bundled g++**, so the assertion is about a real compiler, not a regex: the exact code from the user's screenshot (`cout <<` cut off mid-line) must produce a finding near that line, a compilable file must produce none *and* no `blocked`, and a "compiler" that is really `node.exe` (non-zero exit, nothing locatable) must report 没检查完 rather than 无问题 — the false-all-clear is the bug being guarded. `compiler.path` is fed through the same config path the product uses, and the temp-file input is what makes unsaved and Untitled buffers checkable at all. Breaking `parseErrors` into `[]` turns three checks red; deleting the non-zero-exit guard turns exactly the last one red. The 20 s timeout branch has **no** assertion, and the harness says so: no stock Windows executable hangs when invoked as `<exe> <judge flags> <file>`, and making the timeout injectable would bend the product around the test |
| `test-judge-samples.mjs` | `parseSamples` against Markdown shaped exactly like `renderStatement` output, including the `ms` / `s` / `毫秒` / `秒` time-limit units, the 500 ms–10 s clamp, and the memory-limit spellings (`内存限制：128.00 MB` / `内存：128M` / `内存：1GB`) plus the "no limit written" case; sample numbers are the ones written in the statement, so a hand-written 样例 0 stays 0 instead of being coerced to 1 |
| `test-judge-pipeline.mjs` | the whole 跑样例 command against the **bundled g++**: AC on a correct file, WA with expected-vs-got printed, a compile failure reported as a failure instead of a pass, a quick pick when no statement matches by name, the pick being **remembered per source file** (a second run asks nothing and says in the log it is reusing the last choice; 换一道题 re-asks and re-members; a deleted statement falls back to the picker instead of being read anyway), a memory hog judged MLE with its peak reported when the statement writes a limit — and never judged MLE when it does not; the AC run additionally asserts a 解题记录 row **on disk** in `.olympia/solves.json`; the WA runs assert the diagnosis (第 1 行第 1 个数不同, and the `Ctrl+Alt+K` hint in the log), that 对比期望输出 opens exactly one `vscode.diff` with two `olympiaSample` documents whose text comes from the content provider (left = 期望, right = 得到), that the picker never lists the same case twice, that an all-AC run offers no 对比 button and calling the command then says so instead of opening a diff, and a table over `compareCase` for 没有输出 / 少了尾巴 / 多了尾巴 / 顺序不同 / 数不同 / 词不同 / 词数不同 / 只差空白 plus 尾部换行 与 CRLF 不算差异. Breaking the WA recording, duplicating it, emptying the right-hand document, genericising the diagnosis or dropping the tail-newline handling each turn only the covering checks red |
| `test-solve-log.mjs` | the 解题记录 data layer against a real file in a temp workspace — and the path it asserts on is taken from the code's own `SOLVES_PATH_LABEL` instead of a copy, so a label that drifts from what `recordSolve` writes fails seven checks rather than none: an AC writes newest-first with title / 耗时 / 峰值内存, `olympia.train.recordSolves` off stops the write but leaves the existing file untouched, 205 entries are clipped to 200 **from the old end**, a file that is not JSON (or entries missing fields) reads as empty instead of crashing the panel row, streak counts **local days** with the two edges pinned (three ACs today = 1 day; a gap returns 0; today-not-yet but yesterday-still-counts), `2025-12-31` vs `2026-01-01` are two days and still streak 2, `dailyGoal` rejects 0 / negative / non-numeric and floors a decimal, and `onSolveLogChange` fires exactly once per real write (stubbing its `EventEmitter.event` unbound reproduces how the extension actually takes the function reference) |
| `test-memory-probe.mjs` | the probe itself: the memory column parsed **by position** (labels are localized on zh Windows) with thousands separators, a program whose path contains spaces, a run too fast to sample (no peak, still not a failure), a 120 MB allocation actually seen, the timeout kill, a non-zero exit counted as failure while stdout is still collected, and the fallback to a plain run when the probe reads nothing |
| `test-stress-pipeline.mjs` | the whole 对拍 command: 25 agreeing rounds report 通过, an intentionally wrong solution stops the run and leaves `stress-fail/round-N.*` behind, running it a second time must add a file rather than overwrite the one the previous run caught, a silent generator errors out instead of "passing" zero rounds — and clicking 补进题面样例 writes that case into the statement, where the product's own `parseSamples` reads it back as a second case without eating the neighbouring section (stubbing `appendSample` to a no-op fails this check) |
| `test-cpp-snippets.mjs` | the 20-row C++ completion table: registration and `dispose`, every `detail`/hint line carries Chinese, aliases actually resolve (敲 `fast`/`sync`/`pow`/`union` 命中对应条目), placeholders close, the switch silences the list — and each body, with its placeholders filled, passes `g++ -std=c++17 -fsyntax-only` inside a generated translation unit |
| `test-contest-gate.mjs` | the 比赛模式 → AI 教练 lock across both extensions: `setContext('olympia.contest.running')` flips exactly on start and stop (not every tick), `olympia.contest.isRunning` answers accordingly, and while it is set `@coach` writes only the refusal and never asks for the model list. The rest drives a fake clock (`Date.now` offset) through the reload paths: a restored contest announces 时间到 once and only once as it crosses zero, one that expired while the window was closed clears `endsAt` instead of restoring, the custom-duration input accepts only integers in range, and dispose-then-activate leaves no phantom contest to lock the coach (this last one is what caught the module state that `release()` now resets) |
| `test-problem-library.mjs` | the local problem bank end to end: statements written by the real `renderStatement` are read back with title / 来源 / 时限 / 内存 / 样例数 intact (writer and reader share `FIELD`, so this is the drift guard), ordering by pull time, a heading that is not a problem id falling back to the filename, an unreadable file still listed instead of taking the list down, the quick-pick rows showing title + limits + relative path + 「今天」, `Ctrl+Alt+O` opening exactly the picked file and refusing to open an empty list, 补样例 refusing to write over a statement that is open with unsaved edits (and writing once it is saved), and the panel's 题面库 row (份数, and 还没拉过题面 → points at 拉取题面). Breaking the written field label in `out/templates.js` makes two checks fail — the assertions discriminate. It also covers the 已 AC tick, **written by the other extension**: records are produced by `solveLog.recordSolve` and read back by `contest/solvedMarks`, and the check asserts the tick, the `已 AC 2 次` count, the title count, case-insensitive ids, "no file → no tick and no claim", "corrupt file → bank still opens", and that the writer's distinct-problem count equals the reader's mark count — renaming the field the reader reads turns four checks red |
| `test-my-template.mjs` | 我的模板 against files on disk: the ACM header carries no leftover `$`, a created-but-unfilled `.olympia/template.cpp` is **not** a template (the picker offers 新建, and a forced empty pick warns instead of writing blank lines into the student's code), 我的模板 is listed first only once it has content, `新建我的模板` seeds from `templateFor('acm')` and opens the file **without** touching the current editor, inserting then writes exactly the bytes on disk, and `templateOnPull` seeds `<题号>.cpp` from 我的模板 — from ACM when there is none, and never over a half-written solution. 拉题面 runs with `./net` swapped through the same `Module._load` hook, so a canned Luogu page still goes through the product's real parser. Breaking any one of the three guards (blank-means-template, seed-ignores-mine, drop-the-existsSync) fails exactly the check that covers it. It also holds the **cross-extension** string together: `olympia-onboarding` cannot import contest's constants, so the path its panel row shows (`TEMPLATE_PATH_LABEL`) is asserted equal to `TEMPLATE_FOLDER`/`TEMPLATE_FILE` read out of contest's *compiled* output, and `toolsView.ts` is scanned to make sure the row didn't fall back to typing the path by hand |
| `test-settings-panel.mjs` | the Olympia 设置 page against the manifests on disk: every `olympia.*` property in the three `package.json` files must be a row (row count is compared to the schema count, so adding a setting without the page listing it fails), grouping comes from the key, enum options show `enumDescriptions`, an unknown segment still shows up under 其他, `.path` rows get 浏览… and write what was picked to Global, a 改过的 row is marked 已改 and 恢复默认 deletes the key so the default comes back, a rejected `update` is shown instead of swallowed, the AI rows delegate, reopening reveals the same panel instead of stacking a second one, and a setting key or default containing `<script>` / `<img onerror>` comes out escaped (disabling `escapeHtml`, limiting the scan to one manifest, emptying the AI delegate list and removing the path-picker condition each make exactly the check that covers them fail) |
| `test-practice-list.mjs` | 集训清单 against files on disk plus the command argument it hands over: the separators a student actually pastes (`P1001, P1002、P1001\np1002`) collapse to the right ids in the right order, `MAX_PRACTICE_PROBLEMS` caps the list, minutes accept only `5–600` integers (empty means 不设时限, never 0), a file that is not JSON reads as no lists, a half-broken array keeps the good entries, and same-name (case- and space-insensitive) means *replace* so editing a list cannot fork it into two. 「开始这一场」 is asserted on `executeCommand('olympia.contestMode', 60)` — dropping the argument turns exactly the two checks that cover the seed red — and a row with no cached statement ends with a real statement file written by the real parser (network stubbed at `./net`). The ✓ count on each row comes from records the **other** extension's `recordSolve` wrote, and the first check pins the path the panel promises (`.olympia/practice.json`) against the one contest writes. The menu's in-place editing is covered in the same harness: 加一道题 / 改时长 / 移掉一道题 each assert that the **file** changed *and* that the re-shown menu already says the new number (an item count or a `N 分钟` that lags the data is how a student ends up starting a 90-minute session he thought he had changed to 30), an Esc at any step leaves the file byte-identical and returns to the same menu, an input that adds nothing distinguishes 没认出来 from 已经在清单里, blanking the minutes makes 「开始这一场」 pass `undefined` rather than 0, and removing the **last** problem is refused because an empty list is dropped on read — switching that guard off turns exactly that check red |
| `test-statement-view.mjs` | the sidebar 题面 view against the compiled provider, with a fake webview that records what was painted and a fake `markdown.api.render` that echoes its input — so 正文 is asserted on *what was handed to the renderer*, not on a guessed HTML shape. Fifteen checks: the header and the five chips come out of the writer's own `FIELD` table (`renderStatement` writes the fixture, so a renamed field fails here rather than blanking the header in the product); the body handed to the renderer has lost exactly the `# ` title line and the two metadata quotes and still contains `## ` section headings and the student's own `>` quote; a missing renderer **and** a renderer that returns `''` both degrade to the raw text with a sentence saying why, and that raw text is escaped, which is the check that makes `<img src=x onerror=…>` inside a statement a string instead of an executed tag; a rendered body is *not* escaped again; `show()` returns `false` when `<viewId>.focus` does not exist — the contract that lets the caller fall back to the editor instead of losing the statement; every `data-cmd` button in the empty state resolves to a registered command and the message handler executes it; `localResourceRoots` and the KaTeX `<link>` are one decision, so no 404 stylesheet; the CSP carries `font-src ${cspSource}` and a 32-char script nonce; `openExternal` sees `https:` and nothing else (`file:///…/cmd.exe` and `javascript:` are asserted absent); the watcher repaints on a change to *this* file, ignores a sibling, and returns to the empty state on delete; and re-showing after `onDidChangeVisibility` repaints — asserted by content, because every paint carries a fresh nonce. Each check was broken on its own occurrence in `out/statementView.js` and turned exactly one red: empty-renderer treated as success, `return false` → `true`, `escapeHtml` neutered, the metadata filter widened to all `>` lines, the watcher guard dropped, `font-src` removed, the scheme test widened to `/./`, and `this.katexRoot` swapped back to a live `katexRoot()` (that last one is the reason the field exists) |
| `check-core-copy.mjs` | the sentences and switches we changed in `src/vs`, read back out of `oss/out`: 更新方式 / 发行说明 / 扩展自动检查更新 say what this build actually does, 自然语言搜索 and 实验 are **default `false`** (a service we never configured should not look enabled), and every welcome-page entry we turned off really carries `when: "false"` — 4 remote/Git start entries, 新建工作区 chat, the 调试 和 4 Git steps, and all four Copilot setup steps at once through `createCopilotSetupStep`. The "one constant gates the whole surface" claims are checked **per entry, by position** (`MenuId.CommandPalette` … `when: THE_CONST` within 520 chars), not by counting: counting passes when a leak and a spare gate cancel out, and that is exactly how the first version of this check missed one of the 15 task entries. It also asserts `HIDDEN_VIEWLETS` carries all four deregistered containers *and* imports each contribution module (a missing import fails silently at runtime — the loop just finds nothing to remove), and that 管理帐户 left the palette. It decodes `\uXXXX` before matching, because grepping the built tree for Chinese text reads nothing and reports a clean pass. It has a second, **source-side** half that needs no compile: the Microsoft-link ratchet over `oss/src/vs` (counted ≤ `CEILING` = 191, zero in the three files whose links were removed) and the settings-tree assertion that `application/update` / `application/settingsSync` are gone while `application/telemetry` / `application/network` are still there (the paired "still there" is the anti-vacuity half) |
| `check-command-wiring.mjs` | every command the UI points at (palette entry, `editor/title`, keybinding, walkthrough button, start entry) actually has a `registerCommand` behind it, and vice versa — the "button that does nothing" class. It also resolves the ids the **code** clicks (tree rows, status chips, notification buttons) and requires them to be registered by one of the three extensions, which is what makes a typo in a cross-extension row (`olympia.problem.openStatement`) a build failure instead of a dead button. Bitten-ness is verified, not assumed: typo'ing one id in `olympia-onboarding/package.json` makes it report three problems and exit 1, and so does typo'ing the panel's library command. Rule 6 is the label-drift guard: every panel row must carry the same wording as the command's palette title (the trailing `...` aside), which is what keeps 「打开题面库」 from being two different strings in two different places |
| `check-config-defaults.mjs` | every `get('key', 兜底)` in the three extensions against the `default` the manifest declares for that key — 18 of them today. The fallback is usually a **named constant**, so the checker resolves names through three steps: the declaring file's `const`/`export const` table, then the same extension's other files (a fallback imported from `templates.ts` is still a fixed value), then `${FOLDER}/problems`-style template strings expanded from that same table. Making onboarding's `OLYMPIA_FOLDER` say `.olympiax` turns exactly the `problemsDir` line red, and so does renaming contest's `TEMPLATE_FOLDER` — which is the cross-file case, since the `.get()` sits in `extension.ts`. Before the `export` prefix was accepted, every fallback written as an exported constant was invisible to this check (it printed `n/a`); that silently-blind class is what the composed-path refactor exposed. Memento/`SecretStorage` `.get(key)` calls are excluded on purpose (`olympia.contest.endsAt` is state, not a setting), and a fallback that is a real expression is printed as `n/a` rather than guessed, so the coverage boundary is visible instead of implied (one left: `OJ_TARGETS[0].id`) |
| `check-built-in-trim.mjs` | the built-in extension trim table as *product data*: every id in `product.json:olympiaExcludedBuiltInExtensions` must resolve to a real folder under `oss/extensions/` (or to a `builtInExtensions` download), stay lower-cased and duplicate-free, keep the product promises trimmed (no `copilot`, no git family, no browser/notebook/ports/emmet/TS-intelligence), never contain an `olympia-*` id, and — the one that would break the product rather than the count — no **kept** extension may declare an `extensionDependencies` on a trimmed one, because a missing dependency fails activation, not just a menu entry. It also asserts both readers (`build/lib/extensions.ts`, the runtime scanner) and the `IProductService` declaration still reference the key, so re-copying the list back into code fails here instead of quietly reintroducing the drift that shipped `prompt-basics` while two hand-written lists both said `prompt`. Every rule was broken once on purpose and restored byte-for-byte: adding `"prompt"` back fails only the dead-entry line, dropping `emmet` only the promise line, a `['git']` literal in the build script only the private-copy line, deleting the field declaration only the `IProductService` line, and an `extensionDependencies: ["vscode.emmet"]` in `cpp/package.json` only the dependency line. Leftovers in the *installed* tree are printed as a note, never as a pass |
| `check-extension-copy.mjs` | the English that a student can still reach: it walks the 50 shipped extensions' `package.json` + `package.nls.json` visible keys (`title`/`label`/`description`/`displayName`/`placeholder`…) and the C/C++/Markdown `*.code-snippets`, and reports values with no CJK that read like a **sentence** (three words+). That scoping is the point: `Emmet`, `JSON`, `TypeScript Go` and theme names stay (they are names, not sentences), notebook-renderer / language-model-tool / debug-schema strings are out of a product where notebooks are switched off, and js/ts snippet descriptions are completions for languages this product does not teach — translating those would buy nothing and cost upstream merges. It found 16 reachable English sentences (all in the Markdown completions a student uses while editing a 题面) and now exits clean; putting one back reports exactly that one line |
| `check-view-containers.mjs` | the two ways a sidebar view is contributed but **invisible**, both of which look like a successful registration while you read the code. A container's `icon` that is a codicon reference (`$(book)`) — the workbench draws nothing and says nothing, and the whole container drops out of the activity bar (this is literally how 题面 disappeared on 2026-10-16) — and a contributed view whose id no `registerWebviewViewProvider` / `registerTreeDataProvider` / `createTreeView` backs, since a container only paints when every view under it has a provider. Ids written as constants are resolved through the same extension's `export const` table (in-file, then sibling-file), because `registerWebviewViewProvider(STATEMENT_VIEW_ID, …)` is the shape the code actually uses; `createTreeView` had to be added after the first version false-red-ed `olympia.tools`, which registers that way. Icons are checked against the **filesystem**, twice: once in `oss/extensions/…` and once in `VSCode-win32-x64/resources/app/extensions/…`, because a media file that exists only in source ships an empty icon. Breaking each rule turns exactly that line red (codicon in the manifest → the vanishing-container message; deleting the shipped SVG → the artifact message) and both restorations return it to `all view-container checks passed` |

The bundled compiler is what makes the pipeline harnesses real rather than mocked: they resolve
`VSCode-win32-x64/resources/app/toolchain/mingw64/bin/g++.exe` through the normal
`olympia.compiler.path` config path, so a broken toolchain fails the harness instead of hiding.

A stubbed API the production code reads is a silent failure mode, and it bit twice in one batch:
`appendSample`'s unsaved-edits guard called `workspace.textDocuments.some(…)`, which the stub never
provided (a `TypeError` that one harness surfaced as a crash and the other swallowed into its own
「补进题面样例失败」 path), and the 对拍 no-overwrite guard first asked `workspace.fs.stat` — a stub that
rejects everything, so every filename looked unused and the guard "passed" while still clobbering the
previous run's evidence. Both now go through the real shape (`workspace.textDocuments` in the stub, node's
`fs.stat` in the code, which is what `olympia-contest` already uses for statements), and the lesson is the
same one the writer/reader drift guard teaches: assert the effect on disk, not the notification text.

**A hand-copied fixture is a comment, not a check.** `test-judge-samples.mjs` used to open with a
Markdown statement written out by hand next to a comment claiming it was "逐字对齐 `renderStatement`".
Nothing enforced that: rename `SAMPLE_HEADING` or `CASE_INPUT` in `olympia-contest/src/templates.ts` and
the harness keeps passing while 跑样例 finds zero samples on a real statement. Its base fixture is now
produced by the writer itself (`contest/out/templates.js`), so the two sides can no longer drift apart
silently — and the fixture had to stop using `1000 ms` / `128 MB`: **a fixture value equal to the
reader's fallback can never fail**. With `timeLimit: 1000 ms` the first drift test (renaming
`FIELD.timeLimit`) came back green, because the read simply fell through to the same 1000 the file
says; `1234 ms` / `77 MB` are neither the default nor a clamped edge, so a lost field is now a red
line. Renaming `FIELD.memoryLimit` *stays* green — deliberately reported rather than papered over:
`内存限制：` is matched by a pattern that also matches `占用内存：`, so that particular rename is
harmless and the harness would be lying if it claimed otherwise. Same batch, same discipline applied
to the duplication the audit found: `时限`/`内存` in the bank's own rows now come from `FIELD`
(one extension, real import), `.md` from the exported `STATEMENT_EXTENSION` (with
`stripStatementExtension` for the three places that were regexing it off — note the *boundary*: inside
`olympia-contest` that constant lives in `templates.ts` and inside `olympia-onboarding` in
`problemFiles.ts`, because two extensions cannot import each other's source without a bundler, so what
holds the two definitions together is `test-problem-library.mjs` reading a file one extension wrote, not
an `import`), `stress-fail` from
`EVIDENCE_FOLDER` *inside the message that names it*, and the 解题记录's peak-memory text from
`memoryProbe.formatMb` so the panel and the record list cannot print different numbers for the same run.
The same treatment then reached the *user-visible* paths, which is where a wrong copy is something the
student reads: onboarding has one `OLYMPIA_FOLDER` and composes the statements dir, the 解题记录 path and
the template label from it, contest composes `DEFAULT_PROBLEMS_DIR` from its `TEMPLATE_FOLDER`, and the
two panel tooltips that used to spell `.olympia/template.cpp` / `.olympia/solves.json` interpolate those
labels instead — so renaming the folder in code renames it on screen, and the check above is what stops
either side from lying.

Two things the audit suggested and were **not** done: coach and onboarding repeat cross-extension
command ids as string literals (`olympia.contest.isRunning`, `olympia.ai.settings`) — those pairs are
already guarded, because `check-command-wiring.mjs` requires every id a file clicks to be registered by
one of the three extensions, so a one-sided rename is a build failure, not a silent `catch → false`;
and keybinding text typed into messages (`Ctrl+Alt+J` in a notification, `Ctrl+S` in 对拍's hint)
duplicates `KEYS` and the manifests. Instead of moving every sentence behind a table, the durable guard
won: `check-command-wiring.mjs` rule 7 collects the normalized `contributes.keybindings` of all three
extensions (`ctrl+alt+comma` → `Ctrl+Alt+,`, mac forms included) and requires every `Ctrl+…`/`Alt+…`
sequence written anywhere in the sources to be in that set. A standard VS Code key is allowed through an
explicit named set (`STANDARD_EDITOR_KEYS`: 保存, the palette) rather than by loosening the match, so a
message that promises a key nobody configured is a build failure. Rewriting one message to
`Ctrl+Alt+K` reports exactly that line.

Why the memory probe drives the child itself instead of asking PowerShell: `Start-Process -PassThru`
returns an object whose `ExitCode` is frequently empty under PowerShell 5.1, so a crashing program
would have been reported as a clean run — a missed RE is worse than no memory number. The probe keeps
Node's own `spawn` (exit code, stdin and the timeout kill all stay in our hands) and only borrows
`tasklist.exe` for the reading. One call costs 200–800 ms, so the sampler must never queue up behind
itself, and the value is read from column 5 by position because the header labels follow the OS
language.

`check-website.mjs` is the same idea applied to the promises made on the site: every key in the
keyboard table must be bound in one of the three manifests, every manifest binding must be listed on the
site (it caught the undocumented `Ctrl+Alt+O` 打开已缓存的题面), the per-file download sizes must match
the bytes in `dist/olympia-release-v1.0.0`, internal anchors must exist, and no link may be `http://` or
a placeholder. It compares against `dist/olympia-release-v1.0.0` byte-for-byte (±1 %), so re-cutting the
spanned set without updating the page fails the check — but it cannot tell a *stale* set from a current
one; that is still the bundle-mtime rule in `AGENTS.md`.

## Copilot wording still in the tree (inventory, not yet device-checked)

`byokOnly` closes the hosted-assistant *flows*, but it does not rewrite wording. Two labels were fixed
directly because they sit in surfaces the coach actually uses:

- [`buildModelPickerDestinations`](../../oss/src/vs/workbench/contrib/chat/browser/widget/input/modelPicker/modelPickerTabs.ts)
  fell back to the literal `GitHub Copilot` whenever no vendor is marked default. `isDefault` is
  hardcoded upstream to `vendor === 'copilot'`
  ([`languageModels.ts:1218`](../../oss/src/vs/workbench/contrib/chat/common/languageModels.ts)), so with
  only our `olympia` vendor registered there *is* no default vendor and the fallback was the string on
  screen. It now falls back to `product.nameShort` when `byokOnly`.
- the permission picker's default-level subtext said 「Copilot 使用你配置的设置」
  ([`permissionPickerActionItem.ts:140`](../../oss/src/vs/workbench/contrib/chat/browser/widget/input/permissionPickerActionItem.ts))
  → Olympia.

Still standing, in rough order of how likely a student is to hit them. Each line is *located*, not
*proved reachable* — proving most of them needs the app open with a configured key, so they are left as a
checklist instead of being rewritten on a guess:

| Where | Wording | Why it may still show |
| --- | --- | --- |
| [`modelPickerItemSections.ts:71-80`](../../oss/src/vs/workbench/contrib/chat/browser/widget/input/modelPicker/modelPickerItemSections.ts) | `Sign in to use Copilot` (three strings, **not even translated**) | shown when `modelPickerRequiresSetup()` is true, i.e. entitlement `Available`, or `Unknown` **and** not anonymous **and** no BYOK models. With an unconfigured coach the third clause holds, so this hinges on what `anonymous` resolves to under `byokOnly` — check with no key set |
| [`chatErrorMessages.ts:157-235`](../../oss/src/vs/workbench/contrib/chat/common/chatErrorMessages.ts) | 十几条「升级到 Copilot Pro / 联系组织的 Copilot 管理员」配额文案 | quota + rate-limit branches; a 429 from a BYOK gateway can route into the rate-limit message, which promises a Copilot plan |
| [`chatPermissionWarnings.ts:100`](../../oss/src/vs/workbench/contrib/chat/common/chatPermissionWarnings.ts) | English `Copilot will still ask when the model requires approval…` | assisted-permission warning, shown from the permission picker |
| [`promptTypes.ts:182,184`](../../oss/src/vs/workbench/contrib/chat/common/promptSyntax/promptTypes.ts) | 「工作区(仅由 Copilot 智能体使用)」/「全局(仅由 Copilot 智能体使用)」 | customizations / prompt-file management UI |
| [`languageModelStats.ts:49`](../../oss/src/vs/workbench/contrib/chat/common/languageModelStats.ts) | label `Copilot` | the model-usage breakdown entry |
| [`gettingStartedContent.ts`](../../oss/src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts) | 「免费使用 Copilot 的 AI 功能」 walkthrough step | **ruled out**: `createCopilotSetupStep` returns `when: 'false'`, so all four steps are off by construction rather than by a `chatSetupHidden` context, and `check-core-copy.mjs` asserts that in `oss/out` |
| [`agentSessionsWelcome.ts:746`](../../oss/src/vs/workbench/contrib/welcomeAgentSessions/browser/agentSessionsWelcome.ts) | 「免费试用 GitHub Copilot，无需登录!」 | the agent-sessions welcome page; the banner in that view *is* gated by `sentiment.hidden` (confirmed), this heading is in the same view but was not traced to its own gate |
| [`onboardingVariationA.ts:460,495,530`](../../oss/src/vs/workbench/contrib/welcomeOnboarding/browser/onboardingVariationA.ts) | 登录以使用 GitHub Copilot / Copilot 免责声明 | **ruled out**: with `byokOnly` the sign-in step is filtered out of `steps` (`:121`) and rendering switches on step *identity*, not index (`:407-410`), so `_renderSignInStep` is never called |

Unrelated but same cleanup: the Settings editor logs a ~200-key
`Settings not included in settingsLayout.ts` warning
([`settingsEditor2.ts:1522`](../../oss/src/vs/workbench/contrib/preferences/browser/settingsEditor2.ts))
the first time the Settings UI opens. `leftoverSettings` means "not in the table of contents", and the
chat keys are overwhelmingly `tags: ['experimental']`, which `canShowAdvancedSettings()`
(`:421-426`) already excludes by default — so this is upstream log noise, not a leaked Copilot settings
page. Nothing to fix unless the device check shows those keys searchable.

## Not built

- The coach has no scoring/verdict integration with an **online** judge: 跑样例 produces a local AC/WA,
  but the coach still cannot read a real submission's verdict, and there is no shared session with the
  Tauri app.
- No language pack is registered for the fork — Chinese comes from the in-place rewrites described
  above, so the workbench locale stays `en`. `product.json`'s `extensionsGallery` points at
  open-vsx.org, and [`oss/build/hygiene.ts`](../../oss/build/hygiene.ts) validates that the gallery host
  is not a Microsoft marketplace rather than banning the key outright.


## Shipped-tree audit (2026-10-15)

Everything below was measured against the finished product directory
(`D:\oler-ide-v2\VSCode-win32-x64`, 1,544.5 MB) rather than the source, because a source-only
gate had just spent the previous night proving it could not see these things:

- **Licence texts do land, but in `resources/app/`, not at the product root** — `LICENSE.txt`,
  `NOTICE.olympia.txt`, `GPL-3.0.txt`, `ThirdPartyNotices.txt`; only `LICENSES.chromium.html`
  sits at the root. gulp **strips the UTF-8 BOM** on the way in (7,878 B → 7,875 B), which is
  harmless for the wizard because `code.iss` reads the notice from the repo. The `'licenses/**'`
  entry copied from upstream matches nothing here (there is no `oss/licenses/`), and
  `allowEmpty: true` hides that — do not read the list entry as "shipped".
- **`build/verify-product-licence.mjs`** now runs at the end of `build/oss-package.ps1`. Its very
  first run against a real tree caught three wrong expectations of the author's own (the notice
  says MSYS2 rather than "MinGW"; the component file opens with `NOTICES`, not "THIRD-PARTY
  SOFTWARE NOTICES"; the BOM assertion belonged in the source gate) — which is the point of
  running it instead of reasoning about it.
- **GPL-3.0.txt ships.** The product declares GPL-3.0-or-later in four places while the package
  carried only Microsoft's MIT text; GPL §4 wants a copy of the licence with every copy, and a
  sentence on a webpage is not that. `olympia-onboarding` opens it from the
  「许可证与第三方组件」 entry (`LICENCE_DOCS` is now 5 documents).
- **Two dead chat surfaces actually reached students.** `byokOnly` writes the setup context keys
  but left `ChatEntitlementService.sentiment.hidden` false, so `activateDefaultAgent` still threw
  `No default agent contributed` on every session (visible in the shipped build's `renderer.log`);
  and because that branch also forces `installed` true, the chat title-bar 「配置内联建议…」 item
  rendered and executed `olympia.coach.toggleStatusMenu` — a command no extension registers.
  Both fixed in oss `39f39862`. `scripts/oneoff/check-chat-product-ids.mjs` keeps the remaining
  phantom ids registered **together with the source line that makes each one unreachable**, so
  deleting a guard turns the gate red instead of letting "temporarily unreachable" rot into
  "nobody remembers why".
- **Distribution state, measured rather than assumed.** Gitee's only release is tag `v0.1.0` (a
  prerelease whose body still describes the Tauri app) and the fork's slices hang off it;
  `.../download/v1.0.0/OlympiaSetup-web.exe` answers 404 until the new release is uploaded. The
  *deployed* website was an older page whose single download link pointed at the retired
  `Olympia%20IDE_0.1.0_x64-setup.exe`. Hence `build/make-release.mjs --tag v1.0.0` (collects
  slices, checks each is under Gitee's 100 MB and that no stale slice from an earlier compile
  slipped in, regenerates SHA256SUMS.txt, compiles the bootstrapper with the same tag, rewrites
  `说明.txt` and the byte figures in `website/index.html`) followed by
  `node scripts/oneoff/check-website.mjs --online` before anything is deployed.
- **Packaging pre-flight.** `scripts/oneoff/check-build-typecheck.mjs` (1.1 s) runs as STAGE 0 of
  `oss-package.ps1`. `build/` is not inside `compile-client`'s scope, and a `TS2448`
  (block-scoped variable used before its declaration) in `gulpfile.vscode.ts` reached stage 3,
  died after 6 seconds — i.e. *after* `clean-vscode-win32-x64` — leaving an empty product tree
  and 8 wasted minutes. The gate also proves with `--listFiles` that the files it guards are
  actually inside the sweep, because "zero errors" and "looked at nothing" look identical.
