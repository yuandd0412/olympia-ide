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
	[WELCOME, 'https://code.visualstudio.com/docs/editor/workspace-trust', false]
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

/** 齿轮菜单里的「任务」：产品说的是不用写 tasks.json，菜单就不该再把人往那领。 */
const TASKS = 'vs/workbench/contrib/tasks/browser/task.contribution.js';
report(/MenuId\.GlobalActivity[\s\S]{0,220}ContextKeyExpr\.false\(\)/.test(text(TASKS)),
	'齿轮菜单不再列「任务」');
report(/MenuId\.MenubarPreferencesMenu[\s\S]{0,220}ContextKeyExpr\.false\(\)/.test(text(TASKS)),
	'菜单栏的偏好子菜单也不再列「任务」');

console.log(failed ? '\nFAILED' : '\nall core-copy checks passed');
process.exitCode = failed ? 1 : 0;
