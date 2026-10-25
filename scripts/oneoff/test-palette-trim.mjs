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
check('摘掉的名单在调用时取值（写成函数，不是模块级常量——那样初始化顺序会把值变成 undefined）',
	/function hiddenCommandIds\(\): readonly string\[\] \{\s*\n\s*return \[/.test(quickAccess)
	&& !/^const HIDDEN_COMMAND_IDS/m.test(quickAccess));
// 三条都属于智能体插件组：少一条就等于面板里还剩一条英文。
check('智能体插件那组三条都在名单里',
	['RefreshAgentPluginMarketplacesCommandId', 'UpdateAgentPluginsCommandId', 'ForceUpdateAgentPluginsCommandId']
		.every(id => quickAccess.slice(quickAccess.indexOf('function hiddenCommandIds'), quickAccess.indexOf('export class CommandsQuickAccessProvider')).includes(id)));

// 后两条是字面量（上游没导出常量），所以必须和注册处对拍：id 改了而名单没改，
// 过滤会安静地不再命中——正是假绿的一种。反向夹具：把注册处字符串换个字，断言要翻红。
const hiddenBody = quickAccess.slice(quickAccess.indexOf('function hiddenCommandIds'), quickAccess.indexOf('export class CommandsQuickAccessProvider'));
const literalIds = [...hiddenBody.matchAll(/^\t\t'([a-zA-Z.]+)',$/gm)].map(m => m[1]);
check('名单里的字面量 id 都读到了（切片切到、且只有上游没导出的那六条）',
	literalIds.length === 6 && new Set(literalIds).size === 6);
const literalRegistrations = [
	['workbench.action.chat.createPlugin', 'workbench/contrib/chat/browser/actions/createPluginAction.ts', "static readonly ID = 'workbench.action.chat.createPlugin'"],
	['workbench.action.chat.installPluginFromSource', 'workbench/contrib/chat/browser/actions/chatPluginActions.ts', "static readonly ID = 'workbench.action.chat.installPluginFromSource'"],
	['agentsVoice.simulateConnection', 'workbench/contrib/agentsVoice/browser/agentsVoice.contribution.ts', "id: 'agentsVoice.simulateConnection'"],
	['agentsVoice.resetOnboarding', 'workbench/contrib/agentsVoice/browser/agentsVoice.contribution.ts', "id: 'agentsVoice.resetOnboarding'"],
	['agentsVoice.showTranscripts', 'workbench/contrib/agentsVoice/browser/transcriptsView/voiceTranscripts.contribution.ts', "SHOW_VIEW_COMMAND_ID = 'agentsVoice.showTranscripts'"],
	['workbench.action.chat.configure.customagents', 'workbench/contrib/chat/browser/promptSyntax/chatModeActions.ts', "const CONFIGURE_AGENTS_ACTION_ID = 'workbench.action.chat.configure.customagents'"],
];
for (const [id, file, registration] of literalRegistrations) {
	const source = read(file);
	check(`${id} 与 ${file.split('/').pop()} 的注册处一致`,
		hiddenBody.includes(`'${id}'`) && source.includes(registration));
	// 反向夹具：注册处把 id 改了名，这条必须翻红——否则名单里的字面量就是一条死链接，
	// 面板里那行英文字还在，而检查台一片绿。
	check(`夹具：注册处 id 被改动时，${id} 这条会红`,
		!source.replace(registration, registration.replace(/'[A-Za-z.]+'$/, "'renamed'")).includes(registration));
}
check('两条 Voice: Configure … 走的是 chat 那侧导出的常量（没落字面量）',
	/import \{ CONFIGURE_DICTATION_INSTRUCTIONS_ACTION_ID, CONFIGURE_VOICE_INSTRUCTIONS_ACTION_ID \} from '\.\.\/\.\.\/chat\/browser\/actions\/configureVoiceInstructionsAction\.js';/.test(quickAccess)
	&& hiddenBody.includes('CONFIGURE_DICTATION_INSTRUCTIONS_ACTION_ID,')
	&& hiddenBody.includes('CONFIGURE_VOICE_INSTRUCTIONS_ACTION_ID,'));
const filterLine = quickAccess.indexOf('hiddenCommandIds().includes(action.item.id)');
check('过滤真的接在命令循环里，且紧跟 continue',
	filterLine > 0 && /hiddenCommandIds\(\)\.includes\(action\.item\.id\)\) \{\n\t\t\t\tcontinue;\n\t\t\t\}/.test(quickAccess));
// 反向夹具：删掉那三行过滤，断言必须翻红。
check('夹具：删掉过滤分支后，接在循环里这条会红',
	!/hiddenCommandIds\(\)\.includes/.test(quickAccess.replace(/if \(hiddenCommandIds\(\)\.includes\(action\.item\.id\)\) \{\n\t\t\t\tcontinue;\n\t\t\t\}\n/, '')));

// 类目整组仍在：#58 收掉的「开发人员 / MCP / 账户」不能被这次改动带走。
// 2026-10-25 起新增第四组「聊天智能体会话」（用户点名删除智能体功能面）。
check('四条整组类目还在原处（Developer / MCP / Account / 聊天智能体会话）',
	/const HIDDEN_COMMAND_CATEGORIES: readonly string\[\] = \[Categories\.Developer\.value, 'MCP', Categories\.Account\.value, '聊天智能体会话'\];/.test(quickAccess));
// 「聊天智能体会话」类目值取的是字面量（不从 quickaccess 引 agentSessionsActions，
// 那会把整个智能体会话模块拖进早期加载路径）——所以必须和声明处逐字对拍。
const agentSessionsActions = read('workbench/contrib/chat/browser/agentSessions/agentSessionsActions.ts');
const agentSessionsCategoryDecl = 'const AGENT_SESSIONS_CATEGORY = localize2(\'chatSessions\', "聊天智能体会话");';
check('类目字面量「聊天智能体会话」与声明处（AGENT_SESSIONS_CATEGORY）逐字一致',
	agentSessionsActions.includes(agentSessionsCategoryDecl)
	&& quickAccess.includes("'聊天智能体会话'"));
// 反向夹具：上游改了叫法，这条必须翻红——否则过滤收的是一份没人再声明的类目名。
check('夹具：声明处改名后，类目对拍这条会红',
	!agentSessionsActions.replace(agentSessionsCategoryDecl, agentSessionsCategoryDecl.replace('聊天智能体会话', '聊天会话')).includes(agentSessionsCategoryDecl));

// 智能体六条单摘（「聊天」类目下的）都在名单里，且走的是导出常量/调用时求值，
// 不是抄一份字符串。
check('智能体组六条都在名单里（切下一个/打开(智能体)/生成指令/生成智能体/新建/配置）',
	['ToggleAgentModeActionId', 'getOpenChatActionIdForMode(ChatMode.Agent)', 'GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID', 'GENERATE_AGENT_COMMAND_ID', 'NEW_AGENT_COMMAND_ID']
		.every(id => hiddenBody.includes(id + ','))
	&& hiddenBody.includes("'workbench.action.chat.configure.customagents',"));
check('智能体组 id 读的是 chat 侧导出（toggle/生成×2 来自 chatActions·chatExecuteActions·newPromptFileActions）',
	/import \{ CHAT_OPEN_ACTION_ID, GENERATE_AGENT_COMMAND_ID, GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID, getOpenChatActionIdForMode \} from '\.\.\/\.\.\/chat\/browser\/actions\/chatActions\.js';/.test(quickAccess)
	&& /import \{ ToggleAgentModeActionId \} from '\.\.\/\.\.\/chat\/browser\/actions\/chatExecuteActions\.js';/.test(quickAccess)
	&& /import \{ NEW_AGENT_COMMAND_ID \} from '\.\.\/\.\.\/chat\/browser\/promptSyntax\/newPromptFileActions\.js';/.test(quickAccess)
	&& /import \{ ChatMode \} from '\.\.\/\.\.\/chat\/common\/chatModes\.js';/.test(quickAccess));

// 「打开对话（智能体）」的 Ctrl+Shift+I 键绑定必须真的摘了：面板入口藏了但键还在，
// 一按就把会话切进智能体模式，等于没删。
const chatActions = read('workbench/contrib/chat/browser/actions/chatActions.ts');
const agentModeKeybindingGone = !/super\(ChatMode\.Agent, \{[\s\S]{0,400}?KeyI/.test(chatActions);
check('智能体模式的打开动作不再带键绑定（Ctrl+Shift+I 摘除）',
	agentModeKeybindingGone && /\/\/ Olympia（BYOK）：智能体模式不配打开键绑定/.test(chatActions));
// 反向夹具：把键绑定块还原回去，这条必须翻红。
const chatActionsRestored = chatActions.replace('super(ChatMode.Agent);',
	'super(ChatMode.Agent, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyI });');
check('夹具：键绑定块还原后，摘键这条会红',
	/super\(ChatMode\.Agent, \{[\s\S]{0,400}?KeyI/.test(chatActionsRestored));

// 聊天模式选择器不再列内置「智能体」模式（BYOK 判据与 AGENTS_WINDOW_DISABLED 同源）。
const modePicker = read('workbench/contrib/chat/browser/widget/input/modePickerActionItem.ts');
const modePickerGate = 'const agentMode = AGENTS_WINDOW_DISABLED ? undefined : modes.builtin.find(mode => mode.id === ChatMode.Agent.id);';
check('模式选择器在内置智能体上加了 BYOK 判据（AGENTS_WINDOW_DISABLED）',
	modePicker.includes(modePickerGate)
	&& /import \{ AGENTS_WINDOW_DISABLED, ChatAgentLocation, ChatConfiguration, ChatModeKind \} from '\.\.\/\.\.\/\.\.\/common\/constants\.js';/.test(modePicker));
check('夹具：判据拆掉后，选择器这条会红',
	!modePicker.replace(modePickerGate, 'const agentMode = modes.builtin.find(mode => mode.id === ChatMode.Agent.id);').includes(modePickerGate));

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
