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
| `olympia.checkEnvironment` | 环境自检：检测内置编译器 | `Ctrl+Alt+D` |
| `olympia.pickCompileProfile` | 选择评测机编译配置 | — |
| `olympia.openWebsite` | 打开 Olympia 官网 | — |

Two walkthroughs are contributed: `olympia.gettingStarted` ("三分钟上手 Olympia IDE", five steps —
open a folder, pick the judge compile profile, run the environment check, ask the AI coach, learn
more) and `olympia.compiler` ("内置编译器与环境自检", one step). The coach step exists so the
`@coach` participant is discoverable from the first run; it completes on `olympia.coach.selectModel`.
`contributes.startEntries` puts 新建竞赛工程 and 环境自检 on the empty workbench.

Settings: `olympia.compiler.*` (`path`, `profile` default `luogu`, `customFlags`, `optimization`
default `none`, `showCompileCommand` default `true`), `olympia.check.*` (`enabled`, `onSave`, and the
individual `rules.*` toggles `crlf`, `pragmaOptimize`, `onlineJudge`, `memoryLeak`, `reservedWord`,
`freopen`), and `olympia.startPage.*` (`enabled`, `recentContest`).

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
every fresh profile. The dangling ids are provably inert: each core consumer of the remaining
`defaultChatAgent` fields either catches the missing command (e.g. `chatSetup.ts:126`) or is gated on
`ChatContextKeys.Setup.installed`, which the phantom id keeps false.

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

## Not built

- The coach has no scoring/verdict integration: it cannot read the judge output of the Tauri app, and
  there is no shared session between the two products.
- No language pack is registered for the fork — Chinese comes from the in-place rewrites described
  above, so the workbench locale stays `en`. `product.json`'s `extensionsGallery` points at
  open-vsx.org, and [`oss/build/hygiene.ts`](../../oss/build/hygiene.ts) validates that the gallery host
  is not a Microsoft marketplace rather than banning the key outright.
