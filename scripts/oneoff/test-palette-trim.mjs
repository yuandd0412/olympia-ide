// 命令面板瘦身检查台：#62 的两处改动必须在源码里成对存在，缺一处都不算摘掉。
//
//   node scripts/oneoff/test-palette-trim.mjs
//
// 为什么要断言「取到的那一段里真的有 default」：这类文本断言最容易假装通过——
// 切片切错了、键名打错了，`!/default: true/` 永远为真，绿灯什么也没说。
// 所以每条都要跑一遍反向夹具：把改动还原成上游形状，断言必须翻红。
import assert from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const ROOT = new URL('../../oss/src/vs/', import.meta.url);
const read = rel => readFileSync(new URL(rel, ROOT), 'utf8');

const results = [];
const check = (name, pass) => results.push([name, pass]);

// ---- 1. 听写整套功能出厂关掉：dictation.enabled 的默认值 ----
const shared = read('workbench/contrib/chat/browser/chat.shared.contribution.ts');

/** 取 `'dictation.enabled': {` 到下一个同级设置键为止的那一段。 */
function settingBlock(source, key) {
	const start = source.indexOf(`'${key}': {`);
	if (start < 0) { return undefined; }
	const rest = source.slice(start);
	const end = rest.indexOf('\n\t\t\'', 1);
	return end < 0 ? rest : rest.slice(0, end);
}

const dictationBlock = settingBlock(shared, 'dictation.enabled');
// 反向夹具先自证：这一条若取空段，下面所有断言都会假绿。
check('取到了 dictation.enabled 的设置块，且块里确实写着 default',
	dictationBlock !== undefined && /default: (true|false)/.test(dictationBlock));
check('dictation.enabled 出厂默认 false', /default: false/.test(dictationBlock ?? ''));
check('dictation.enabled 的说明已是中文（设置界面里那行不再是英文）',
	/dictation\.enabled', "[^\n]*[一-龥]/.test(dictationBlock ?? ''));
// 反向夹具：把默认值改回上游的 true，断言必须翻红。
const upstreamDictation = (dictationBlock ?? '').replace('default: false', 'default: true');
check('夹具：默认值改回 true 后，默认-false 这条会红',
	!/default: false/.test(upstreamDictation));
// 别处不能再把同一个键设回 true（上游只在设置里写一次，但 fork 会长）。
const otherTrueDefault = [...shared.matchAll(/'dictation\.enabled':\s*\{[\s\S]{0,900}?\n\t\t'/g)]
	.filter(m => !m[0].includes('default: false'));
check('整个文件里没有第二处把 dictation.enabled 设回 true', otherTrueDefault.length === 0);

// ---- 2. 麦克风按钮的开关必须真的被聊天输入框读 ----
// 关掉一个没人读的默认值等于什么都没做，所以按现成的引用点确认这条设置真的接在线上。
const sttService = read('workbench/contrib/chat/browser/speechToText/chatSpeechToTextService.ts');
check('转写服务读的就是 dictation.enabled 这一条（常量 ENABLED_SETTING）',
	/const ENABLED_SETTING = 'dictation\.enabled';/.test(sttService));

// ---- 3. 「刷新插件市场」从面板摘掉，而不是汉化 ----
const quickAccess = read('workbench/contrib/quickaccess/browser/commandsQuickAccess.ts');
check('面板过滤读的是 chat 那一侧导出的命令 id（不另抄一份字符串）',
	/import \{ ForceUpdateAgentPluginsCommandId, RefreshAgentPluginMarketplacesCommandId, UpdateAgentPluginsCommandId \} from '\.\.\/\.\.\/chat\/browser\/chat\.js';/.test(quickAccess));
check('摘掉的名单在调用时取值（避免模块初始化顺序把它变成 undefined）',
	/function hiddenCommandIds\(\): readonly string\[\] \{\s*\n\s*return \[\s*\n\s*RefreshAgentPluginMarketplacesCommandId,\s*\n\s*UpdateAgentPluginsCommandId,\s*\n\s*ForceUpdateAgentPluginsCommandId,\s*\n\s*\];/.test(quickAccess));
// 三条都属于智能体插件组：少一条就等于面板里还剩一条英文。
check('智能体插件那组三条都在名单里',
	['RefreshAgentPluginMarketplacesCommandId', 'UpdateAgentPluginsCommandId', 'ForceUpdateAgentPluginsCommandId']
		.every(id => quickAccess.slice(quickAccess.indexOf('function hiddenCommandIds'), quickAccess.indexOf('export class CommandsQuickAccessProvider')).includes(id)));
const filterLine = quickAccess.indexOf('hiddenCommandIds().includes(action.item.id)');
check('过滤真的接在命令循环里，且紧跟 continue',
	filterLine > 0 && /hiddenCommandIds\(\)\.includes\(action\.item\.id\)\) \{\n\t\t\t\tcontinue;\n\t\t\t\}/.test(quickAccess));
// 反向夹具：删掉那三行过滤，断言必须翻红。
check('夹具：删掉过滤分支后，接在循环里这条会红',
	!/hiddenCommandIds\(\)\.includes/.test(quickAccess.replace(/if \(hiddenCommandIds\(\)\.includes\(action\.item\.id\)\) \{\n\t\t\t\tcontinue;\n\t\t\t\}\n/, '')));

// 类目整组仍在：#58 收掉的「开发人员 / MCP / 账户」不能被这次改动带走。
check('三条整组类目还在原处（Developer / MCP / Account）',
	/const HIDDEN_COMMAND_CATEGORIES: readonly string\[\] = \[Categories\.Developer\.value, 'MCP', Categories\.Account\.value\];/.test(quickAccess));
check('放行名单仍保住「重新加载窗口」与「打开日志文件夹」',
	quickAccess.includes("'workbench.action.reloadWindow'") && quickAccess.includes("'workbench.action.openLogsFolder'"));

// 命令本体不能被删掉：只摘面板入口，配了清单时命令照旧可用。
const agentPlugins = read('workbench/contrib/chat/browser/agentPluginsView.ts');
check('命令仍在注册（只是不进面板），没有把功能整套拆了',
	/registerAction2\(RefreshPluginMarketplacesCommand\)/.test(agentPlugins));

let failed = 0;
for (const [name, pass] of results) {
	if (!pass) { failed++; }
	console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
}
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exitCode = failed === 0 ? 0 : 1;
