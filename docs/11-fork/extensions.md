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
check. Commands and keybindings as declared in its `package.json`:

| Command | Title | Keybinding (`when`) |
| --- | --- | --- |
| `olympia.compileAndRun` | 编译并运行（本地样例测试） | `F9` (`editorTextFocus`) |
| `olympia.compile` | 编译当前文件（按评测机参数） | `Shift+F9` (`editorTextFocus`) |
| `olympia.compileJudgeAccurate` | 按评测机编译（强制 `-O2`） | `Ctrl+Shift+F9` (`editorTextFocus`) |
| `olympia.preSubmitCheck` | 提交前体检 | `Ctrl+Alt+Enter` (`editorTextFocus`) |
| `olympia.judgeSamples` | 跑样例（本地评测） | `Ctrl+Alt+J` (`editorTextFocus`) |
| `olympia.stressTest` | 对拍（正解 vs 暴力） | `Ctrl+Alt+S` |
| `olympia.contestMode` | 比赛模式（倒计时） | `Ctrl+Alt+C` |
| `olympia.checkEnvironment` | 环境自检：检测内置编译器 | `Ctrl+Alt+D` |
| `olympia.pickCompileProfile` | 选择评测机编译配置 | — |
| `olympia.tools.refresh` | 刷新 Olympia 工具面板 | — (hidden from the palette) |
| `olympia.openWebsite` | 打开 Olympia 官网 | — |

The three commands after 体检 are the judge-shaped loop the Tauri app had and the fork did not:

- **跑样例** ([`src/judgeSamples.ts`](../../oss/extensions/olympia-onboarding/src/judgeSamples.ts))
  reads the cached statement Markdown for the current file (`.olympia/problems/<题号>.md`, same
  directory `olympia-contest` writes, falling back to a quick pick when no file matches by name),
  compiles with the active judge profile, runs every sample through it and prints `AC` / `WA` / `RE` /
  `TLE` / `MLE` per case into the `Olympia 评测` channel. Comparison ignores whitespace like a real judge. The
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

Two walkthroughs are contributed: `olympia.gettingStarted` ("三分钟上手 Olympia IDE", five steps —
open a folder, pick the judge compile profile, run the environment check, ask the AI coach, learn
more) and `olympia.compiler` ("内置编译器与环境自检", one step). The coach step exists so the
`@coach` participant is discoverable from the first run; it completes on `olympia.coach.selectModel`.

The compile task provider (`compile.ts:168`, type `olympia-compile`) must stay declared in
`contributes.taskDefinitions`: while it was missing, the packaged app logged
`The task [olympia-compile, …] uses an undefined task type. The task will be ignored in the future.`,
i.e. a saved build task silently stops working later. The provider's task definition only carries
`source` (an absolute path, because `TaskDefinition` must be serialisable — `resolveTask` re-wraps it
with `Uri.file`).

Pre-submit check on save is a fire-and-forget `onWillSaveTextDocument` listener with **no**
`event.waitUntil(...)`: 体检 must never delay the write itself, and a participant that returns an
unresolved promise gets its save killed after 1750 ms by the workbench.

**Persistent entry points** (the reason the palette is no longer the only way in): an `Olympia`
activity-bar container contributing one visible tree view, `olympia.tools` ("竞赛工具"), whose four
sections are 当前环境 / 编译与运行 / 题目与模板 / AI 教练与帮助 — the middle one carries 编译并运行,
只编译, 按评测机编译（-O2）, 提交前体检, 跑样例, 对拍, 比赛模式, each row showing its keybinding — and
the first one shows the live compiler / profile / 体检 / 题面库 counts as clickable state rows. The
题面库 row reads `.olympia/problems` through [`src/problemFiles.ts`](../../oss/extensions/olympia-onboarding/src/problemFiles.ts)
— the one place this extension lists that directory, shared with 跑样例 so the two cannot disagree —
and it follows the watcher: with nothing cached it reads 还没拉过题面 and points at 拉取题面 instead of
opening an empty list. 题目与模板 gained the 打开题面库 row (`Ctrl+Alt+O`), so the bank is reachable
without the palette. The tree redraws on
active-editor, configuration and diagnostic changes; the countdown repaints through a narrower path that
does not re-probe the toolchain. Four `editor/title` navigation buttons (编译并运行 / 编译 / 按评测机编译 /
体检) appear only for `resourceLangId == cpp || c`, and three status-bar chips (compiler profile,
编译运行 `F9`, 体检) stay visible all the time. `olympia.debug.showEntryPoints` switches the extra debug
rows in the panel off.

Settings: `olympia.compiler.*` (`path`, `profile` default `luogu`, `customFlags`, `optimization`
default `none`, `showCompileCommand` default `true`), `olympia.check.enabled` / `olympia.check.onSave`
and the rule toggles that still exist — `olympia.check.rules.pragmaOptimize`, `.reservedWord`,
`.removedCpp` — plus `olympia.stress.*` and `olympia.debug.showEntryPoints`.

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

| Command | Title | Keybinding (`when`) | Also in menus |
| --- | --- | --- | --- |
| `olympia.problem.pull` | 拉取题面... | `Ctrl+Alt+P` | explorer context |
| `olympia.problem.pullFromClipboard` | 从剪贴板题号拉取题面 | `Ctrl+Alt+V` (`editorTextFocus`) | command palette |
| `olympia.template.insert` | 插入赛制模板... | `Ctrl+Alt+T` (`editorTextFocus`) | editor tab context (`resourceLangId == cpp`) |
| `olympia.problem.openStatement` | 打开题面库（已缓存的题面） | `Ctrl+Alt+O` (`editorTextFocus`) | command palette |
| `olympia.problem.appendSample` | 给这道题加一组自定义样例 | — | also called by 对拍 with `{hint, input, output}` |

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
cached), `olympia.problem.templateOnPull` (default `false`), `olympia.problem.requestTimeoutMs`
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

## How to verify without a device

Eight harnesses under `scripts/oneoff/` load the **compiled** extension output (`oss/extensions/*/out`)
with `vscode` stubbed through a `Module._load` hook (the memory probe needs no stub — it only talks to
`child_process` and `tasklist.exe`), so they test the shipped code path rather than a
re-implementation; the ninth, `check-command-wiring.mjs`, reads the manifests and sources instead. Compile first (`npm run gulp -- compile-extension:olympia-onboarding`), then run each
with `node scripts/oneoff/<name>.mjs` from the repository root:

| Harness | What it pins down |
| --- | --- |
| `test-precheck.mjs` | 体检 rules: pragma reporting regardless of the local optimization switch, and nothing reported inside comments or string literals |
| `test-judge-samples.mjs` | `parseSamples` against Markdown shaped exactly like `renderStatement` output, including the `ms` / `s` / `毫秒` / `秒` time-limit units, the 500 ms–10 s clamp, and the memory-limit spellings (`内存限制：128.00 MB` / `内存：128M` / `内存：1GB`) plus the "no limit written" case; sample numbers are the ones written in the statement, so a hand-written 样例 0 stays 0 instead of being coerced to 1 |
| `test-judge-pipeline.mjs` | the whole 跑样例 command against the **bundled g++**: AC on a correct file, WA with expected-vs-got printed, a compile failure reported as a failure instead of a pass, a quick pick when no statement matches by name, a memory hog judged MLE with its peak reported when the statement writes a limit — and never judged MLE when it does not |
| `test-memory-probe.mjs` | the probe itself: the memory column parsed **by position** (labels are localized on zh Windows) with thousands separators, a program whose path contains spaces, a run too fast to sample (no peak, still not a failure), a 120 MB allocation actually seen, the timeout kill, a non-zero exit counted as failure while stdout is still collected, and the fallback to a plain run when the probe reads nothing |
| `test-stress-pipeline.mjs` | the whole 对拍 command: 25 agreeing rounds report 通过, an intentionally wrong solution stops the run and leaves `stress-fail/round-N.*` behind, running it a second time must add a file rather than overwrite the one the previous run caught, a silent generator errors out instead of "passing" zero rounds — and clicking 补进题面样例 writes that case into the statement, where the product's own `parseSamples` reads it back as a second case without eating the neighbouring section (stubbing `appendSample` to a no-op fails this check) |
| `test-cpp-snippets.mjs` | the 20-row C++ completion table: registration and `dispose`, every `detail`/hint line carries Chinese, aliases actually resolve (敲 `fast`/`sync`/`pow`/`union` 命中对应条目), placeholders close, the switch silences the list — and each body, with its placeholders filled, passes `g++ -std=c++17 -fsyntax-only` inside a generated translation unit |
| `test-contest-gate.mjs` | the 比赛模式 → AI 教练 lock across both extensions: `setContext('olympia.contest.running')` flips exactly on start and stop (not every tick), `olympia.contest.isRunning` answers accordingly, and while it is set `@coach` writes only the refusal and never asks for the model list. The rest drives a fake clock (`Date.now` offset) through the reload paths: a restored contest announces 时间到 once and only once as it crosses zero, one that expired while the window was closed clears `endsAt` instead of restoring, the custom-duration input accepts only integers in range, and dispose-then-activate leaves no phantom contest to lock the coach (this last one is what caught the module state that `release()` now resets) |
| `test-problem-library.mjs` | the local problem bank end to end: statements written by the real `renderStatement` are read back with title / 来源 / 时限 / 内存 / 样例数 intact (writer and reader share `FIELD`, so this is the drift guard), ordering by pull time, a heading that is not a problem id falling back to the filename, an unreadable file still listed instead of taking the list down, the quick-pick rows showing title + limits + relative path + 「今天」, `Ctrl+Alt+O` opening exactly the picked file and refusing to open an empty list, 补样例 refusing to write over a statement that is open with unsaved edits (and writing once it is saved), and the panel's 题面库 row (份数, and 还没拉过题面 → points at 拉取题面). Breaking the written field label in `out/templates.js` makes two checks fail — the assertions discriminate |
| `check-command-wiring.mjs` | every command the UI points at (palette entry, `editor/title`, keybinding, walkthrough button, start entry) actually has a `registerCommand` behind it, and vice versa — the "button that does nothing" class. It also resolves the ids the **code** clicks (tree rows, status chips, notification buttons) and requires them to be registered by one of the three extensions, which is what makes a typo in a cross-extension row (`olympia.problem.openStatement`) a build failure instead of a dead button. Bitten-ness is verified, not assumed: typo'ing one id in `olympia-onboarding/package.json` makes it report three problems and exit 1, and so does typo'ing the panel's library command |

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
| [`gettingStartedContent.ts:228`](../../oss/src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts) | 「免费使用 Copilot 的 AI 功能」 walkthrough step | gated by the getting-started `when` clauses; must be confirmed hidden on a fresh profile |
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
