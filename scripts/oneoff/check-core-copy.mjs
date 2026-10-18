// 核心（src/vs）改的是「产品对用户说了什么」：文案、开关默认值、欢迎页留下哪些入口。
// 这些改动只有编译进 oss/out 才算生效，而构建产物把非 ASCII 写成 \uXXXX，
// 所以必须还原之后再断言，否则任何中文检查都会假报「没有」。
// 运行：node scripts/oneoff/check-core-copy.mjs   （需要先 npm run compile-client）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? path.resolve(here, '../../oss/out');

function read(rel) {
	return fs.readFileSync(path.join(out, rel), 'utf8')
		.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

const UPDATE = 'vs/platform/update/common/update.config.contribution.js';
const PREFS = 'vs/workbench/contrib/preferences/common/preferencesContribution.js';
const ASSIGN = 'vs/workbench/services/assignment/common/assignmentService.js';
const EXTENSIONS = 'vs/workbench/contrib/extensions/browser/extensions.contribution.js';
const WELCOME = 'vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.js';
const CHAT = 'vs/workbench/contrib/chat/browser/chat.shared.contribution.js';
const COMMON_MAIN = 'vs/workbench/workbench.common.main.js';
const FILES = 'vs/workbench/contrib/files/browser/files.contribution.js';
const WATCHER = 'vs/workbench/contrib/files/browser/workspaceWatcher.js';
const SAVEERR = 'vs/workbench/contrib/files/browser/editors/textFileSaveErrorHandler.js';
const LAYOUT = 'vs/workbench/contrib/preferences/browser/settingsLayout.js';
const CHAT_TIPS = 'vs/workbench/contrib/chat/browser/chatTipCatalog.js';
const CHAT_CONSTANTS = 'vs/workbench/contrib/chat/common/constants.js';
const SESSION_TYPES = 'vs/workbench/contrib/chat/browser/agentSessions/sessionTypeAvailability.js';
const OLYMPIA_CHROME = 'vs/workbench/contrib/olympia/browser/olympiaChrome.js';
const QUICKACCESS = 'vs/workbench/contrib/quickaccess/browser/commandsQuickAccess.js';
const DEVELOPER_ACTIONS = 'vs/workbench/electron-browser/actions/developerActions.js';
const WINDOW_ACTIONS = 'vs/workbench/electron-browser/actions/windowActions.js';
const HELP_ACTIONS = 'vs/workbench/browser/actions/helpActions.js';
const WORKBENCH_CONTRIB = 'vs/workbench/browser/workbench.contribution.js';
const AGENTS_ACTIONS = 'vs/workbench/contrib/chat/electron-browser/agentSessions/agentSessionsActions.js';
const ABOUT_DIALOG = 'vs/platform/dialogs/electron-browser/dialog.js';
const MODEL_PICKER = 'vs/workbench/contrib/chat/browser/widget/input/modelPicker/modelPickerItemSections.js';

/** [文件, 文案, 应该出现吗] */
const copy = [
	[UPDATE, '配置是否接收自动更新。Olympia 的安装包发布在官网；本构建没有配置更新服务时，这项不起作用。', true],
	[UPDATE, '在更新后显示发行说明。发行说明从官网获取。', true],
	[UPDATE, 'Configure whether you receive automatic updates. The updates are fetched from a Microsoft online service.', false],
	[PREFS, '该功能要把搜索词发给 Microsoft 的联机服务，Olympia 没有配置这项服务，默认关闭；关键词搜索不受影响。', true],
	[PREFS, '控制是否在设置搜索里启用自然语言匹配。', true],
	[ASSIGN, 'Olympia 没有配置这项服务，保持关闭可以避免无意义的联网请求。', true],
	[EXTENSIONS, '更新从扩展市场获取。', true],
	[EXTENSIONS, '更新将从 Microsoft 联机服务中获取。', false],
	[EXTENSIONS, '控制扩展的自动更新行为。更新包从扩展市场获取。', true],
	[EXTENSIONS, '更新包来自微软的在线服务', false],
	[EXTENSIONS, '扩展市场链接', true],
	[EXTENSIONS, 'VS Marketplace 链接', false],
	[WELCOME, 'https://olympia.dpdns.org/docs/', true],
	// 演练页的标签页标题：上游这三条是 "Setup Olympia" 一类，直译成「安装程序 Olympia」后，
	// 学生会以为点开了一个装软件的东西。三条都收成产品名本身，和同级的「基本功能」「笔记本」对齐。
	[WELCOME, '安装程序 Olympia', false],
	[WELCOME, 'vscode-getting-started-video', false],
	[WELCOME, 'https://code.visualstudio.com/docs/editor/workspace-trust', false],
	// 「聚焦窗口」是打包版真机截图里唯一整句英文的一行：它没有类目，夹在中文行中间最扎眼。
	// 上游这条命令本身要留着（辅助窗口之间切换要用），改的只是叫法。
	[WINDOW_ACTIONS, 'Focus Window', false],
	[WINDOW_ACTIONS, '聚焦当前窗口', true],
	// GitHub 链接呈现没注册，就不该在 workbench 入口里被带进来（它注册的「登录 GitHub」在这个构建里只会报错）
	[COMMON_MAIN, 'githubLinkPresentation', false],
	// 文件设置这几条描述学生真会点开：链接指向微软短链只会撞「是否信任此链接」，就地讲清即可
	[FILES, 'https://aka.ms/vscode-glob-patterns', false],
	[FILES, 'code.visualstudio.com', false],
	[FILES, '`glob 模式`', true],
	[WATCHER, 'go.microsoft.com', false],
	[WATCHER, 'documentationUrl', true],
	[SAVEERR, 'go.microsoft.com', false],
	// 更新走官网、没有同步服务：这两节留在设置树里只是多两个能点进去的空页面（遥测保留，学生要能确认它是关的）
	[LAYOUT, 'application/update', false],
	[LAYOUT, 'application/settingsSync', false],
	[LAYOUT, 'application/telemetry', true],
	[LAYOUT, 'application/network', true]
];

/** 没有配置这些服务，就不该默认开着让用户以为在用。 */
const defaults = [
	[PREFS, /enableNaturalLanguageSettingsSearch[\s\S]{0,300}\n\s*['"]default['"]:\s*false/, '自然语言搜索默认关闭'],
	[ASSIGN, /workbench\.enableExperiments[\s\S]{0,260}\n\s*['"]default['"]:\s*false/, '实验默认关闭'],
	[CHAT_TIPS, /TIPS_HIDDEN_IN_OLYMPIA\s*=\s*\[[^\]]*['"]tip\.init['"][^\]]*\]/, '聊天提示位不轮播 /init（AGENTS.md 是给编码智能体看的工程约定）'],
	[CHAT_TIPS, /TIPS_HIDDEN_IN_OLYMPIA\s*=\s*\[[^\]]*['"]tip\.createPrompt['"][^\]]*\]/, '聊天提示位不轮播 /create-prompt（学生不会去写可复用提示文件）'],
	[CHAT_TIPS, /TIPS_HIDDEN_IN_OLYMPIA\s*=\s*\[[^\]]*['"]tip\.troubleshoot['"][^\]]*\]/, '聊天提示位不轮播 /troubleshoot：那句「从调试日志诊断问题」要的是上游智能体的工具，BYOK 教练做不到'],
	[MODEL_PICKER, /enabled: goToSettings/, 'BYOK 空列表时「没有可用模型」这一行点得动——屏幕上那句结论必须连着下一步'],
	[CHAT_CONSTANTS, /AGENTS_WINDOW_DISABLED = !!product\.defaultChatAgent\?\.byokOnly/, '智能体窗口那扇门读 byokOnly 这一个判断'],
	[CHAT_CONSTANTS, /HOSTED_ACCOUNT_FLOWS_DISABLED = !!product\.defaultChatAgent\?\.byokOnly/, '「登录」和「升级」这两条出路读同一个产品开关（一个判断，不是四处 byokOnly）'],
	[SESSION_TYPES, /if \(!HOSTED_ACCOUNT_FLOWS_DISABLED && entitlement === ChatEntitlement\.Unknown/, '会话类型不提示「登录」：本产品没有可登录的账号'],
	[SESSION_TYPES, /canUpgrade = !HOSTED_ACCOUNT_FLOWS_DISABLED/, '会话类型不提示「升级到 Copilot Pro」：没有可买的套餐'],
	[OLYMPIA_CHROME, /['"]status\.host['"]/, '状态栏左下角那枚远程图标按掉（点开是一个空的远程选择器）'],
	[OLYMPIA_CHROME, /['"]status\.debug['"]/, '调试 chip 也不留在状态栏：调试视图整栏已经摘掉，点它只能进空的调试环境列表'],
	[QUICKACCESS, /HIDDEN_COMMAND_CATEGORIES = \[[^\]]*Categories\.Developer\.value/, '「开发人员」整组不进命令面板（类目名读同一个常量，汉化改叫法也跟着走）'],
	[QUICKACCESS, /HIDDEN_COMMAND_CATEGORIES = \[[^\]]*['"]MCP['"]/, '「MCP」整组不进命令面板：BYOK 产品里没有要给智能体挂外部工具的人'],
	[QUICKACCESS, /HIDDEN_COMMAND_CATEGORIES = \[[^\]]*Categories\.Account\.value/, '「账户」整组不进命令面板：本产品没有托管账号，那几条点开只有空列表'],
	[HELP_ACTIONS, /getStartedWithAccessibilityFeatures[\s\S]{0,1400}?when: ContextKeyExpr\.and\(IsSessionsWindowContext\.negate\(\), CONTEXT_ACCESSIBILITY_MODE_ENABLED\)/, '「无障碍功能入门」菜单项的条件跟着那份演练自己的 when 走：看得见就得点得开，不能把人带到空页面'],
	[QUICKACCESS, /KEPT_COMMANDS_IN_HIDDEN_CATEGORIES = \[[^\]]*workbench\.action\.reloadWindow/, '放行名单里留着「重新加载窗口」——整组关掉不能把说明书里让学生按的那条一起带走'],
	[WORKBENCH_CONTRIB, /workbench\.editor\.languageDetection['"]?:\s*\{[^}]*default: false/, '自动语言检测出厂关闭：点一下检测 chip 会改掉正在写的那份代码的语言模式'],
	[WELCOME, /gettingStarted\.setup\.walkthroughPageTitle['"],\s*['"]Olympia['"]/, '演练页标题读作「演练: Olympia」，不是「安装程序 Olympia」'],
	[AGENTS_ACTIONS, /keybinding: AGENTS_WINDOW_DISABLED \? void 0/, 'Ctrl+Shift+A 在 BYOK 产品里不注册——只关 precondition 会留下一个还能按响的快捷键'],
	[ABOUT_DIALOG, /VS Code \$\{productService\.version\}/, '「关于」第一行是 Olympia 的版本号，VS Code 基线号在括号里']
];

/** OI 用不上的欢迎页入口：源码管理、调试、远程、Copilot 开的对话。 */
const welcomeOff = [
	'topLevelGitClone', 'topLevelGitOpen', 'topLevelRemoteOpen', 'topLevelOpenTunnel',
	'topLevelNewWorkspaceChat', 'debugging', 'scmClone', 'scmSetup', 'scm', 'installGit',
	'tasks', 'notebooks'
];

let failed = 0;
function report(ok, line) {
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${line}`);
	if (!ok) { failed++; }
}

const cache = new Map();
function text(file) {
	if (!cache.has(file)) { cache.set(file, read(file)); }
	return cache.get(file);
}

for (const [file, needle, want] of copy) {
	report(text(file).includes(needle) === want, `${path.basename(file)} ${want ? '写着' : '不写着'} ${JSON.stringify(needle)}`);
}
for (const [file, pattern, label] of defaults) {
	report(pattern.test(text(file)), label);
}

/**
 * 标题栏命令中心那枚「智能体」pill：这个构建没有托管助手，pill 点了没东西可看。
 * 按两个注册点之间那一段读它自己的 default（产物是双引号），失败时把看到的值打出来。
 */
const agentSlice = (text(CHAT).split('[ChatConfiguration.AgentStatusEnabled]')[1] ?? '').split('[ChatConfiguration.UnifiedAgentsBar]')[0];
// 这一处产物写的是不带引号的 default:（另一处 settings 注册表里是 "default":），两种形状都要认。
const agentDefault = /['"]?default['"]?:\s*(['"][^'"]*['"])/.exec(agentSlice)?.[1];
report(agentDefault === '"hidden"' || agentDefault === "'hidden'",
	`标题栏「智能体」pill 出厂为 hidden（构建里这一段的 default 是 ${agentDefault ?? '没找到'}）`);
for (const id of welcomeOff) {
	// 源码用单引号，产物用双引号，所以按 id 找再读它自己的 when。
	const at = text(WELCOME).search(new RegExp(`id:\\s*["']${id}["']`));
	if (at < 0) {
		report(false, `欢迎页里找不到 ${id}`);
		continue;
	}
	const when = /when:\s*"([^"]*)"/.exec(text(WELCOME).slice(at, at + 520))?.[1];
	report(when === 'false', `欢迎页 ${id} 的 when = ${JSON.stringify(when)}（要 'false'）`);
}
report(/function createCopilotSetupStep[\s\S]{0,420}when:\s*"false"/.test(text(WELCOME)),
	'Copilot 那四步向导在同一个地方关掉');
report(!text(WELCOME).includes('chatSetupCompleted && !chatSetupDisabled'),
	'Copilot 的登录态/套餐条件不再决定欢迎页显示什么');

/**
 * 任务系统：产品说的是「不用写 tasks.json」，那命令面板里那二十来条「任务: …」
 * 就不该继续把学生往那儿领。整组入口现在挂在**一个**恒假常量上，
 * 所以这里查的是「有没有漏网的还挂在上游那个 key 上」。
 */
const TASKS = 'vs/workbench/contrib/tasks/browser/task.contribution.js';
report(/TASKS_UI_AVAILABLE = (?:\w+\.)?ContextKeyExpr\.false\(\)/.test(text(TASKS)),
	'任务入口整组挂在一个恒假开关上');/**
 * 「运行任务」曾经是整组任务入口里唯一没挂 `when` 的那条：别的都在 TASKS_UI_AVAILABLE 上，
 * 它继续出现在命令面板，按下去是一个空的选择器。按 id 找到它自己那一段再读 when，
 * 这样把 guard 删掉会红，而不是被同文件里另一条任务的 when 顶替掉。
 */
const runTaskSlice = text(TASKS).split('workbench.action.tasks.runTask')[1] ?? '';
report(/when:\s*(?:\w+\.)?TASKS_UI_AVAILABLE/.test(runTaskSlice.slice(0, 400)),
	'「运行任务」也挂在同一个恒假开关上（面板里不再有按下去是空选择器的一条）');
/** 「切换开发人员工具」：快捷键本来有 when，帮助菜单那一项以前谁都看得见。 */
const devToolsAt = text(DEVELOPER_ACTIONS).indexOf('workbench.action.toggleDevTools');
const devToolsMenu = (text(DEVELOPER_ACTIONS).slice(devToolsAt, devToolsAt + 1200).split('MenubarHelpMenu')[1] ?? '').slice(0, 200);
report(/when:\s*IsDevelopmentContext/.test(devToolsMenu),
	`帮助菜单里的「切换开发人员工具」和它的快捷键用同一个 when（菜单那一段读到：${JSON.stringify(devToolsMenu.slice(0, 60))}）`);
report(!/when: TaskExecutionSupportedContext/.test(text(TASKS)),
	'没有任何任务入口还留在 TaskExecutionSupportedContext 上');
const taskPalette = [...text(TASKS).matchAll(/MenuId\.CommandPalette/g)];
/**
 * 按位置逐条查，不是数个数：数个数只问「门够不够多」，
 * 漏掉一条又同时多写一条没用的门，它就照样绿。
 * 窗口取 520 个字符：编译后那条入口的 `command` 对象里夹着 localize2 的注释数组，门写在更后面。
 */
const taskLeaks = taskPalette.filter(m => !/when: TASKS_UI_AVAILABLE/.test(text(TASKS).slice(m.index, m.index + 520))).length;
report(taskPalette.length > 0 && taskLeaks === 0,
	`命令面板的 ${taskPalette.length} 条任务入口每条都挂着那一个常量（漏 ${taskLeaks} 条）`);
report(/MenuId\.GlobalActivity[\s\S]{0,220}when: TASKS_UI_AVAILABLE/.test(text(TASKS)),
	'齿轮菜单不再列「任务」');
report(/MenuId\.MenubarPreferencesMenu[\s\S]{0,220}when: TASKS_UI_AVAILABLE/.test(text(TASKS)),
	'菜单栏的偏好子菜单也不再列「任务」');
/**
 * 「账户」类目：上游原本在五个工作区命令里各写一遍 localize2('accounts', "账户")，
 * 命令面板要整组关掉就没有一个共同的值可读——所以先把它收进 Categories.Account，五处一起改读。
 * 这里逐文件按位置查，少改一处就红：改了一半正是最难看出来的那种。
 */
const ACCOUNT_ACTIONS = [
	'manageAccountsAction', 'manageAccountPreferencesForExtensionAction', 'manageAccountPreferencesForMcpServerAction',
	'manageTrustedExtensionsForAccountAction', 'manageTrustedMcpServersForAccountAction'
].map(n => `vs/workbench/contrib/authentication/browser/actions/${n}.js`);
const inlineAccounts = ACCOUNT_ACTIONS.filter(f => !/category:\s*Categories\.Account\b/.test(text(f)) || /localize2\(["']accounts["']/.test(text(f)));
report(ACCOUNT_ACTIONS.length === 5 && inlineAccounts.length === 0,
	`「账户」类目只剩 actionCommonCategories 那一处定义（还在自己写的：${inlineAccounts.map(f => f.split('/').pop()).join(' ') || '无'}）`);

/** 远程隧道：这个构建里没有 github 认证提供方，命令点了只能走到死路。 */
const TUNNEL = 'vs/workbench/contrib/remoteTunnel/electron-browser/remoteTunnel.contribution.js';
const paletteEntries = [...text(TUNNEL).matchAll(/MenuId\.CommandPalette/g)];
const tunnelLeaks = paletteEntries.filter(m => !/when: REMOTE_TUNNEL_COMMANDS_AVAILABLE/.test(text(TUNNEL).slice(m.index, m.index + 520))).length;
report(paletteEntries.length > 0 && tunnelLeaks === 0,
	`远程隧道的 ${paletteEntries.length} 条命令面板入口每条都挂着那一个常量（漏 ${tunnelLeaks} 条）`);
report(/REMOTE_TUNNEL_COMMANDS_AVAILABLE = (?:\w+\.)?ContextKeyExpr\.false\(\)/.test(text(TUNNEL)),
	'远程隧道的开关就是一个恒假表达式');

/**
 * 活动栏裁剪：不改上游注册代码，而是在 Olympia 自己的模块里把容器摘掉。
 * 加一条少一个图标，所以查的是「该摘的都在那张表上」，以及「先 import 那个贡献再摘它」
 * —— 少一个 import 的话摘除会跑在注册之前，图标照旧亮着，而且没有任何报错。
 */
const ACTIVITY = 'vs/workbench/contrib/olympia/browser/olympiaActivityBar.js';
const activity = text(ACTIVITY);
const hiddenList = /HIDDEN_VIEWLETS = \[([\s\S]*?)\];/.exec(activity)?.[1] ?? '';
for (const [needle, label] of [
	['DEBUG_VIEWLET_ID', '运行与调试'],
	['SCM_VIEWLET_ID', '源代码管理'],
	['Testing.ViewletId', '测试'],
	['Testing.ResultsPanelId', '测试结果']
]) {
	report(hiddenList.includes(needle), `${label}在 HIDDEN_VIEWLETS 里`);
}
for (const module of ['debug/browser/debug.contribution', 'scm/browser/scm.contribution', 'testing/browser/testing.contribution']) {
	report(activity.includes(module), `先注册再摘：${module}`);
}

/** 「管理帐户」：本产品没有托管账号，账户按钮出厂就是关的，命令面板不该再留一条死路。 */
const MANAGE = 'vs/workbench/contrib/authentication/browser/actions/manageAccountsAction.js';
const manageAt = text(MANAGE).search(/workbench\.action\.manageAccounts/);
report(manageAt >= 0 && /f1: false/.test(text(MANAGE).slice(manageAt, manageAt + 320)),
	'「管理帐户」不再出现在命令面板');

/**
 * 源码侧（不需要编译）：整棵 `src/vs` 里指向微软的跳转链接只许降不许升。
 * 这是棘轮而不是清单：计数把注释里的也算进去（就是上面那几条 `[X, 'go.microsoft.com', false]`
 * 只能盯住个别文件的原因——剩下的两百来条散在 Copilot / chat / 远程这些本产品不跑的面上）。
 * 收掉一批之后把 CEILING 改小，任何新写死的微软链接都会在这里变红。
 */
const CEILING = 191;
const HOSTS = /https:\/\/(?:aka\.ms|go\.microsoft\.com|code\.visualstudio\.com)/g;
const SRC_ROOT = path.resolve(here, '../../oss/src/vs');
const MUST_STAY_CLEAN = [
	'vs/workbench/contrib/files/browser/files.contribution.ts',
	'vs/workbench/contrib/files/browser/workspaceWatcher.ts',
	'vs/workbench/contrib/files/browser/editors/textFileSaveErrorHandler.ts',
	// 这一批是设置页/弹窗里学生真会读到的描述：链接已经就地去掉，别让它长回来
	'vs/workbench/contrib/search/browser/search.common.contribution.ts',
	'vs/editor/browser/widget/codeEditor/codeEditorWidget.ts',
	'vs/editor/common/config/editorOptions.ts',
	'vs/platform/request/common/request.ts',
	'vs/workbench/contrib/terminal/common/terminalConfiguration.ts',
	'vs/workbench/browser/parts/editor/editorConfiguration.ts',
	'vs/workbench/services/editor/common/editorResolverService.ts',
	'vs/workbench/browser/workbench.contribution.ts',
	'vs/workbench/contrib/snippets/browser/snippets.contribution.ts',
	'vs/workbench/contrib/mcp/browser/mcpServersView.ts'
];

function walkTs(dir, acc) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) { walkTs(full, acc); }
		else if (entry.name.endsWith('.ts')) { acc.push(full.replace(/\\/g, '/')); }
	}
	return acc;
}

const allTs = fs.existsSync(SRC_ROOT) ? walkTs(SRC_ROOT, []) : [];
const scannable = allTs.filter(f => !f.includes('/test/') && !f.endsWith('.test.ts'));
report(scannable.length > 5000, `扫了 ${scannable.length} 个核心源码文件（少于 5000 说明根目录读错了，计数不作数）`);
const counted = scannable.map(f => [f, (fs.readFileSync(f, 'utf8').match(HOSTS) ?? []).length]).filter(([, n]) => n > 0);
const total = counted.reduce((sum, [, n]) => sum + n, 0);
report(total > 0 && total <= CEILING, `核心源码里的微软跳转链接 ${total} 条，不超过记录的 ${CEILING} 条（只降不升）`);
for (const rel of MUST_STAY_CLEAN) {
	// 逐文件按路径直接读：写错路径 / 文件被改名时必须报错而不是"没找到=没有"地蒙过去。
	const abs = path.resolve(SRC_ROOT, rel.replace(/^vs\//, ''));
	const exists = fs.existsSync(abs);
	const n = exists ? (fs.readFileSync(abs, 'utf8').match(HOSTS) ?? []).length : -1;
	report(exists && n === 0, `${rel.split('/').pop()} 里一条微软链接都没有${exists ? `（读到 ${n} 条）` : '（文件不存在）'}`);
}
// 学生读到的地方不许再长出上游品牌名，也不许把没有任何代码读它的开关留在设置界面里。
// 逐文件逐正则查；文件读不到就直接报错，绝不写成"没找到就算通过"。
const EXT_ROOT = path.resolve(SRC_ROOT, '../../extensions');
const NO_BRAND = [
	{ label: '交互式编辑器操场的命令注册已去掉', abs: path.resolve(SRC_ROOT, 'workbench/contrib/welcomeWalkthrough/browser/walkThrough.contribution.ts'), re: /registerAction2\(EditorWalkThroughAction\)/, want: false },
	{ label: 'Microsoft 账户那条设置说明不再是英文的“Continue with Microsoft”', abs: path.resolve(SRC_ROOT, 'workbench/contrib/chat/browser/chat.shared.contribution.ts'), re: /Continue with Microsoft/, want: false },
	{ label: '同一条说明改口成我们自己的 BYOK 事实', abs: path.resolve(SRC_ROOT, 'workbench/contrib/chat/browser/chat.shared.contribution.ts'), re: /Olympia 走自己的服务地址与密钥（BYOK）/, want: true },
	{ label: 'MCP 欢迎页不再自称 VS Code', abs: path.resolve(SRC_ROOT, 'workbench/contrib/mcp/browser/mcpServersView.ts'), re: /VS Code/, want: false },
	{ label: '主题列表里不再有 Visual Studio 字样', abs: path.join(EXT_ROOT, 'theme-defaults/package.nls.json'), re: /Visual Studio/, want: false },
	{ label: '我们自己的设置页不再把用户称作 VS Code 用户', abs: path.join(EXT_ROOT, 'olympia-onboarding/src/settingsPanel.ts'), re: /VS Code/, want: false },
	{ label: '设置项说明里不再出现 VS Code', abs: path.join(EXT_ROOT, 'olympia-onboarding/package.json'), re: /VS Code/, want: false },
	{ label: '首启自动展开的那一节先剔掉隐藏分区：全新装机第一眼是我们自己的十步演练，不是上游「选主题 + 看视频」那两步', abs: path.resolve(SRC_ROOT, 'workbench/contrib/welcomeGettingStarted/browser/gettingStarted.ts'), re: /openToFirstCategory[\s\S]{0,900}?getHiddenCategories\(\)[\s\S]{0,300}?hidden\.has\(c\.id\)/, want: true }
];
for (const { label, abs, re, want } of NO_BRAND) {
	if (!fs.existsSync(abs)) { report(false, `${label}：读不到文件 ${abs}`); continue; }
	const hit = re.test(fs.readFileSync(abs, 'utf8'));
	report(hit === want, `${label}（读到 ${hit ? '有' : '无'}，期望 ${want ? '有' : '无'}）`);
}
const heaviest = [...counted].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, n]) => `${n} ${f.split('/').slice(-2).join('/')}`);
console.log(`剩下的集中在：${heaviest.join(' | ')}`);

console.log(failed ? '\nFAILED' : '\nall core-copy checks passed');
process.exitCode = failed ? 1 : 0;
