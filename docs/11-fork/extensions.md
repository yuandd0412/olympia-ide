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
  `TLE` per case into the `Olympia 评测` channel. Comparison ignores whitespace like a real judge. The
  time limit is read from the statement and accepts both units the product produces — `1000 ms` from
  the pull chain and hand-written `1.00s`; an unrecognised unit falls back to 1 s rather than guessing.
- **对拍** ([`src/stressTest.ts`](../../oss/extensions/olympia-onboarding/src/stressTest.ts)) asks for
  three files (正解 / 暴力 / 生成器, remembered per workspace and floated to the top of the list),
  compiles all three, then feeds generator output to both solutions round after round. A mismatch stops
  the run and writes that one case into `stress-fail/round-N.{in,sol,brute}` so it can be pasted into a
  test or shown to the coach. Settings: `olympia.stress.rounds` (default 100), `olympia.stress.timeoutMs`
  (default 2000). The progress notification is cancellable.
- **比赛模式** ([`src/contestMode.ts`](../../oss/extensions/olympia-onboarding/src/contestMode.ts)) is a
  countdown in the status bar (left, priority 110 so it sits ahead of the compiler chips). Duration comes
  from a quick pick or a free-form 1–600 minute input; `endsAt` survives reloads in `workspaceState`, the
  item turns warning-coloured once time is up, and the tools panel shows a remaining-time row while a
  contest runs.

Two walkthroughs are contributed: `olympia.gettingStarted` ("三分钟上手 Olympia IDE", five steps —
open a folder, pick the judge compile profile, run the environment check, ask the AI coach, learn
more) and `olympia.compiler` ("内置编译器与环境自检", one step). The coach step exists so the
`@coach` participant is discoverable from the first run; it completes on `olympia.coach.selectModel`.
`contributes.startEntries` puts 新建竞赛工程 and 环境自检 on the empty workbench.

**Persistent entry points** (the reason the palette is no longer the only way in): an `Olympia`
activity-bar container contributing one visible tree view, `olympia.tools` ("竞赛工具"), whose four
sections are 当前环境 / 编译与运行 / 题目与模板 / AI 教练与帮助 — the middle one carries 编译并运行,
只编译, 按评测机编译（-O2）, 提交前体检, 跑样例, 对拍, 比赛模式, each row showing its keybinding — and
the first one shows the live compiler / profile / 体检 counts as clickable state rows. The tree redraws on
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
templates inserted by `olympia.template.insert`.

| Command | Title | Keybinding (`when`) | Also in menus |
| --- | --- | --- | --- |
| `olympia.problem.pull` | 拉取题面... | `Ctrl+Alt+P` | explorer context |
| `olympia.problem.pullFromClipboard` | 从剪贴板题号拉取题面 | `Ctrl+Alt+V` (`editorTextFocus`) | command palette |
| `olympia.template.insert` | 插入赛制模板... | `Ctrl+Alt+T` (`editorTextFocus`) | editor tab context (`resourceLangId == cpp`) |
| `olympia.problem.openStatement` | 打开已缓存的题面 | `Ctrl+Alt+O` (`editorTextFocus`) | command palette |

Settings: `olympia.problem.problemsDir` (default `.olympia/problems`, where pulled statements are
cached), `olympia.problem.templateOnPull` (default `false`), `olympia.problem.requestTimeoutMs`
(default `15000`), `olympia.problem.cfMetadata` (default `false`; when on, also pulls Codeforces
metadata).

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

## The one workbench-side Olympia contribution

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

## How to verify without a device

Four harnesses under `scripts/oneoff/` load the **compiled** extension output (`oss/extensions/*/out`)
with `vscode` stubbed through a `Module._load` hook, so they test the shipped code path rather than a
re-implementation; the fifth, `check-command-wiring.mjs`, reads the manifests and sources instead. Compile first (`npm run gulp -- compile-extension:olympia-onboarding`), then run each
with `node scripts/oneoff/<name>.mjs` from the repository root:

| Harness | What it pins down |
| --- | --- |
| `test-precheck.mjs` | 体检 rules: pragma reporting regardless of the local optimization switch, and nothing reported inside comments or string literals |
| `test-judge-samples.mjs` | `parseSamples` against Markdown shaped exactly like `renderStatement` output, including the `ms` / `s` / `毫秒` / `秒` time-limit units and the 500 ms–10 s clamp |
| `test-judge-pipeline.mjs` | the whole 跑样例 command against the **bundled g++**: AC on a correct file, WA with expected-vs-got printed, a compile failure reported as a failure instead of a pass, and a quick pick when no statement matches by name |
| `test-stress-pipeline.mjs` | the whole 对拍 command: 25 agreeing rounds report 通过, an intentionally wrong solution stops the run and leaves `stress-fail/round-N.*` behind, and a silent generator errors out instead of "passing" zero rounds |
| `check-command-wiring.mjs` | every command the UI points at (palette entry, `editor/title`, keybinding, walkthrough button, start entry) actually has a `registerCommand` behind it, and vice versa — the "button that does nothing" class. Bitten-ness is verified, not assumed: typo'ing one id in `olympia-onboarding/package.json` makes it report three problems and exit 1 |

The bundled compiler is what makes the last two real rather than mocked: both resolve
`VSCode-win32-x64/resources/app/toolchain/mingw64/bin/g++.exe` through the normal
`olympia.compiler.path` config path, so a broken toolchain fails the harness instead of hiding.

## Not built

- The coach has no scoring/verdict integration with an **online** judge: 跑样例 produces a local AC/WA,
  but the coach still cannot read a real submission's verdict, and there is no shared session with the
  Tauri app.
- No language pack is registered for the fork — Chinese comes from the in-place rewrites described
  above, so the workbench locale stays `en`. `product.json`'s `extensionsGallery` points at
  open-vsx.org, and [`oss/build/hygiene.ts`](../../oss/build/hygiene.ts) validates that the gallery host
  is not a Microsoft marketplace rather than banning the key outright.
