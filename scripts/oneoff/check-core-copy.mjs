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
	[WELCOME, 'vscode-getting-started-video', false],
	[WELCOME, 'https://code.visualstudio.com/docs/editor/workspace-trust', false],
	// GitHub 链接呈现没注册，就不该在 workbench 入口里被带进来（它注册的「登录 GitHub」在这个构建里只会报错）
	[COMMON_MAIN, 'githubLinkPresentation', false]
];

/** 没有配置这些服务，就不该默认开着让用户以为在用。 */
const defaults = [
	[PREFS, /enableNaturalLanguageSettingsSearch[\s\S]{0,300}\n\s*['"]default['"]:\s*false/, '自然语言搜索默认关闭'],
	[ASSIGN, /workbench\.enableExperiments[\s\S]{0,260}\n\s*['"]default['"]:\s*false/, '实验默认关闭']
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
	'任务入口整组挂在一个恒假开关上');
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

console.log(failed ? '\nFAILED' : '\nall core-copy checks passed');
process.exitCode = failed ? 1 : 0;
