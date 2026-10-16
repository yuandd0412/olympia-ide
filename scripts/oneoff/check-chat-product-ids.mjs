// product.json 的 defaultChatAgent 里写着一串命令 id 和设置 id。这些字段是上游 Copilot 链路留下的，
// fork 把提供方换成自己的扩展后，有几个 id 就悬在了半空：菜单项照旧显示，点下去执行一条不存在的
// 命令，学生只看到"什么都没发生"。2026-10-15 出厂审计在产物里抓到三条这样的 id。
// 2026-10-16 又抓到一条更狠的：摘 Copilot 把全树唯一的默认智能体贡献也摘掉了，聊天面板回车没反应。
// 这条门不是把它们"改对"，而是把现在的状态钉住：新增悬空 id 要红，把挡住它的那个条件删掉也要红。
// 运行：node scripts/oneoff/check-chat-product-ids.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const oss = path.join(repoRoot, 'oss');
const product = JSON.parse(fs.readFileSync(path.join(oss, 'product.json'), 'utf8'));
const agent = product.defaultChatAgent;
assert.ok(agent && typeof agent === 'object', 'product.json 没有 defaultChatAgent，这条门要重写');

let failed = 0;
function report(ok, msg) {
	if (ok) { console.log(`ok    ${msg}`); }
	else { failed++; console.log(`FAIL  ${msg}`); }
}

// ---- 三个自研扩展真的贡献了什么 ----
const contributedCommands = new Set();
const extensionIds = new Set();
for (const dir of fs.readdirSync(path.join(oss, 'extensions'))) {
	const manifestPath = path.join(oss, 'extensions', dir, 'package.json');
	if (!fs.existsSync(manifestPath)) { continue; }
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	if (manifest.publisher && manifest.name) { extensionIds.add(`${manifest.publisher}.${manifest.name}`); }
	for (const cmd of manifest.contributes?.commands ?? []) { contributedCommands.add(cmd.command); }
}
report(extensionIds.has('olympia.coach'), `扩展 id 由 package.json 的 publisher.name 决定（读到 olympia.coach：${extensionIds.has('olympia.coach')}）`);

/** 内核里以字面量出现过的命令也算"有人实现"（workbench.action.* 这些）。 */
const coreSources = [];
function gather(dir) {
	if (!fs.existsSync(dir)) { return; }
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) { gather(full); }
		else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) { coreSources.push(full); }
	}
}
// 读的人分散在聊天、扩展启用服务和产品声明三处；范围窄是故意的，全仓库读一遍这条门就没人跑了。
gather(path.join(oss, 'src/vs/workbench/contrib/chat'));
gather(path.join(oss, 'src/vs/workbench/contrib/olympia'));
gather(path.join(oss, 'src/vs/workbench/services/chat'));
gather(path.join(oss, 'src/vs/workbench/services/extensionManagement'));
coreSources.push(path.join(oss, 'src/vs/base/common/product.ts'));
for (const id of ['olympia-onboarding', 'olympia-contest', 'olympia-coach']) {
	gather(path.join(oss, 'extensions', id, 'src'));
}
const coreText = coreSources.map(f => fs.readFileSync(f, 'utf8')).join('\n');

/**
 * 明知没人实现、但已经被界面条件挡住的 id。每一条都必须同时给出"是谁挡住它"的证据，
 * 证据没了这条就红——这样"暂时不修"不会慢慢变成"没人记得为什么不修"。
 */
const DEAD_BUT_GATED = [
	{
		field: 'completionsMenuCommand',
		because: '「配置内联建议…」在 BYOK 产品里点不出来：chatActions 的那条 precondition 排掉了 chatSetupHidden',
		guard: /ContextKeyExpr\.equals\(\s*'chatSetupHidden',\s*false\s*\)/,
		guardFile: 'src/vs/workbench/contrib/chat/browser/actions/chatActions.ts',
	},
	{
		field: 'chatRefreshTokenCommand',
		because: '调用点自带 .catch(noop)，本产品没有令牌可刷',
		guard: /chatRefreshTokenCommand\)\.catch\(/,
		guardFile: 'src/vs/workbench/contrib/chat/browser/chatSetup/chatSetup.ts',
	},
	{
		field: 'walkthroughCommand',
		because: '内核里没有读者（只有 IDefaultChatAgent 的类型声明提到它）',
		guard: /readonly walkthroughCommand: string;/,
		guardFile: 'src/vs/base/common/product.ts',
	},
];

/**
 * 设置 id：读的人拿不到值只会当"未开启"，但 id 本身确实是悬空的，所以也要登记原因，
 * 将来有人加了内联补全 / NES，就得回来把这里改成真声明的 id。
 */
const ACCEPTED_DEAD_SETTINGS = [
	{ field: 'completionsEnablementSetting', because: '本产品没有内联补全提供方，读到 undefined 就是"未开启"' },
	{ field: 'nextEditSuggestionsSetting', because: 'NES 属于托管助手；聊天状态面板里那一格在 byokOnly 下不显示' },
	{ field: 'completionsAdvancedSetting', because: '内联补全的高级设置页只有托管助手有；本产品那条入口在 byokOnly 下不出现' },
];

const commandFields = Object.entries(agent).filter(([field, v]) => typeof v === 'string' && field.endsWith('Command'));
const settingFields = Object.entries(agent).filter(([field, v]) => typeof v === 'string' && /Settings?$/.test(field));
const allManifests = fs.readdirSync(path.join(oss, 'extensions'))
	.map(dir => path.join(oss, 'extensions', dir, 'package.json'))
	.filter(f => fs.existsSync(f))
	.map(f => fs.readFileSync(f, 'utf8'));
const dead = [];
for (const [field, value] of commandFields) {
	if (contributedCommands.has(value) || coreText.includes(value)) { continue; }
	const gate = DEAD_BUT_GATED.find(g => g.field === field);
	if (!gate) { dead.push(`${field} = ${value}（既没实现，也没登记为"已挡住"）`); continue; }
	const src = fs.readFileSync(path.join(oss, gate.guardFile), 'utf8');
	report(gate.guard.test(src), `${field} = ${value} 没实现，靠守卫挡住：${gate.because}${gate.guard.test(src) ? '' : ' —— 守卫在 ' + gate.guardFile + ' 里读不到了，这一项又会显示出来'}`);
}
for (const [field, value] of settingFields) {
	if (allManifests.some(text => text.includes(`"${value}"`)) || coreText.includes(value)) { continue; }
	const accepted = ACCEPTED_DEAD_SETTINGS.find(a => a.field === field);
	if (!accepted) { dead.push(`${field} = ${value}（没有任何扩展或内核声明这个设置项，也没登记原因）`); continue; }
	report(true, `${field} 没实现，按登记忽略：${accepted.because}`);
}
report(dead.length === 0, dead.length ? `悬空的 chat id：\n        ${dead.join('\n        ')}` : 'defaultChatAgent 里没有未登记的悬空 id');

// ---- provider/chatExtensionId 是"故意对不上"的，理由必须还在 ----
const chatExtId = agent.chatExtensionId;
const reason = 'ensureChatExtensionInitialDisabledState 会把等于 chatExtensionId 的内置扩展在引导完成前持久停用，改成 olympia.coach 等于每次开新配置都把教练关掉';
report(typeof chatExtId === 'string' && !extensionIds.has(chatExtId),
	`chatExtensionId = ${chatExtId} 依旧不等于任何真实扩展 id（故意）：${reason}`);
report(coreText.includes('ensureChatExtensionInitialDisabledState'),
	'上面那条理由的函数还在；它要是被上游删了，这条断言就该提醒重新评估 chatExtensionId 的取值');

// ---- 教练必须是聊天面板的默认智能体 ----
// 摘 Copilot 时它的 chatAgents 被清成空数组，而 getDefaultAgent 要同时满足
// isDefault && locations 含 panel && modes 含 ask —— 三条都不满足就永远选不出来，
// 表现是"回车没反应"，日志里只有 sendRequest No default agent for location panel。
const coachDir = path.join(oss, 'extensions', 'olympia-coach');
const coachManifest = JSON.parse(fs.readFileSync(path.join(coachDir, 'package.json'), 'utf8'));
const participant = (coachManifest.contributes?.chatParticipants ?? [])[0];
const proposals = coachManifest.enabledApiProposals ?? [];
report(!!participant && participant.isDefault === true,
	`教练在清单里是默认智能体（isDefault=${participant?.isDefault}）`);
report(!!participant && (participant.locations ?? []).includes('panel'),
	`教练注册进聊天面板这个位置（locations=${JSON.stringify(participant?.locations)}）`);
report(!!participant && (participant.modes ?? []).includes('ask'),
	`教练能接住面板默认那个模式（modes=${JSON.stringify(participant?.modes)}）`);
// 内核在 chatParticipant.contribution.ts:268-276 按 proposal 把关：缺了就把整条贡献跳过，
// 上面三条仍然全绿——所以这条门必须连着 proposal 一起钉住。
for (const needed of ['defaultChatParticipant', 'chatParticipantAdditions']) {
	report(proposals.includes(needed), `清单声明了 ${needed}，否则上面三条会被内核整条跳过`);
}
const coachSrc = fs.readFileSync(path.join(coachDir, 'src', 'coach.ts'), 'utf8');
const calledId = /createChatParticipant\(\s*['"]([^'"]+)['"]/.exec(coachSrc)?.[1];
report(!!participant && calledId === participant.id,
	`清单里的 id 和 createChatParticipant 用的 id 是同一个（${calledId} = ${participant?.id}）；不一致就没有实现，选不出来`);

console.log(failed ? '\nFAILED' : '\nall chat product-id checks passed');
process.exitCode = failed ? 1 : 0;
