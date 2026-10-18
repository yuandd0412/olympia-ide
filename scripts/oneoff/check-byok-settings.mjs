/*---------------------------------------------------------------------------------------------
 * BYOK 产品的设置页对账：说明文字里提到 Copilot 的设置，必须要么被 included 挡掉（产品里
 * 根本没有那套东西），要么在 ALLOW 里写清「它讲的是第三方工具本身，不是我们的功能」。
 *
 * 为什么盯设置页而不是全文 grep：全文扫会命中一大片永远渲染不出来的字符串（agent host 的
 * 企业策略文本、需要 Copilot 令牌的错误分支），改它们只是让数字好看。设置页是学生真会翻的
 * 地方，而且上游每次同步都会往这里加新条目——没有这道门，下次同步就又回来了。
 *--------------------------------------------------------------------------------------------*/

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const srcRoot = path.join(repoRoot, 'oss', 'src', 'vs');

const FILES = [
	'workbench/contrib/chat/browser/chat.shared.contribution.ts',
	'workbench/contrib/chat/browser/agentSessionsConfiguration.ts',
	'workbench/contrib/terminal/common/terminalConfiguration.ts',
	'workbench/contrib/inlineChat/browser/inlineChat.contribution.ts',
	// 2026-10-19 扫出来的：这一文件里三条设置既没 included 也没汉化，全在设置页里能翻到。
	'platform/agentHost/common/agentHostStarter.config.contribution.ts',
];

/** 每条都要写理由；理由不成立就别放这里，去把设置挡掉。 */
const ALLOW = {
	'workbench/contrib/terminal/common/terminalConfiguration.ts': {
		// 这条讲的是终端标签页标题：任何第三方智能体 CLI 都能在终端里跑，列出的名字是事实，
		// 不是「我们的产品有 Copilot」。
		'TabsAllowAgentCliTitle': '列举能在终端里改标题的第三方 CLI，属于事实描述',
	},
	'workbench/contrib/chat/browser/chat.shared.contribution.ts': {
		// 命中在 default 值 'copilot-utility-small' 上，不是说明文字（说明已经是中文且没提 Copilot）。
		// 改默认值属于行为改动，要单独决定，不该混在一次文案清理里顺手改——所以登记成待办：
		// 见任务「工具风险评估的默认模型 id 在 BYOK 下不存在」。
		'ToolRiskAssessmentModel': '命中在默认值上而非文案；默认值怎么改要单独决定，已登记任务',
		// 下面四条的共同点：出厂默认不是"关"。included:false 会把这条从注册表里摘掉，
		// 读它的代码就拿到 undefined 而不是原来的真值/1，那是行为改动而不是文案清理。
		// 想挡之前先确认消费方对 undefined 的处理，别再拿"默认本来就是关"当理由。
		'ExperimentalModePermissionsPicker': '默认 product.quality!==\'stable\'，本产品 quality 未定义即真，挡掉等于改默认行为',
		'AgentHostToolSearchEnabledSettingId': '默认 true，挡掉会把智能体主机的工具检索默认关掉',
		'AgentHostToolSearchDeferThresholdSettingId': '默认 1，同上',
		'extensionUnification': '默认 true，且 extensionEnablementService 读它决定统一扩展的启停；文案只讲 GitHub Copilot，去留要单独决定',
		// BYOK 产品里这条是真在用的：主模型是自带密钥时，内置工具流程用哪个模型。
		'BYOKUtilityModelDefault': '功能在用；文案里的 GitHub Copilot 是枚举项之一，枚举项去留要单独决定',
		// 指令文件位置是产品在用功能，列举的是第三方工具自己的文件名（事实描述）。
		'AGENTS_LOCATION_KEY': '在用功能，列的是第三方文件名',
		'HOOKS_LOCATION_KEY': '在用功能，列的是第三方文件名',
		// 这一条有活的读者：chatSetupRunner.ts 开登录对话框时读它决定给哪几个按钮。本产品 byokOnly，
		// 出厂 false 就是终态，说明里已写明「Olympia 走自己的服务地址与密钥，不接 Microsoft / GitHub 账户」。
		// 挡掉等于把一个有读者的开关从注册表里摘走，留在设置页讲清楚更诚实。
		'ChatMicrosoftAuthenticationEnabledSettingId': '有活读者（登录对话框给哪几个按钮）；默认 false 即终态，文案已讲清',
		// 命中在出厂默认的 URL 模式上（github.com/microsoft/vscode/wiki/*），不是文案。这一条是真在用的
		// 功能：聊天工具抓网页时哪些地址免确认。要不要把 github.com 那条默认去掉是「改默认值」，
		// 得单独决定——别混进文案清理里顺手改。
		'AutoApprovedUrls': '命中在默认 URL 模式上而非文案；去掉默认属于行为改动，已单独登记',
		// 说明已汉化，命中在 .github/agents 这个目录名上（自定义 agent 文件真实所在的路径，事实描述）。
		// 里面的 {0} 链接是产品内命令，本产品的 Agent 定制编辑器可达性另有一项在核。
		'MODE_LOCATION_KEY': '文案已汉化；命中在 .github/agents 这个目录名（事实），迁移链接可达性另记',
	},
};

/** 从 `key: {` 处开始做括号配对，取回这段设置对象的正文。 */
function objectBody(text, openIdx) {
	let depth = 0;
	for (let i = openIdx; i < text.length; i++) {
		const c = text[i];
		if (c === '{') { depth++; }
		else if (c === '}') { depth--; if (depth === 0) { return text.slice(openIdx + 1, i); } }
		else if (c === "'" || c === '"' || c === '`') {
			const q = c; i++;
			while (i < text.length && text[i] !== q) { if (text[i] === '\\') { i++; } i++; }
		}
	}
	return '';
}

/**
 * 只保留这条设置自己的属性文本。
 *
 * 两个坑：
 * 1. 说明文字包在 localize('key', "文字") 里，括号不能算嵌套——早先按 () 也降深度，结果把
 *    每一条说明都剪没了，这道门只看得见「没有 Copilot 文案」，扫得再干净也是假的。
 * 2. 嵌套的对象（policyDefinition 之类）属于策略层，不属于这条设置，得整块剔掉，否则又是一片误报。
 * 数组要留着：enumDescriptions 的分支文案全在 [ ] 里。字符串按字面跳过，里面的括号不参与配对。
 */
function ownProperties(body) {
	let depth = 0;
	let out = '';
	for (let i = 0; i < body.length; i++) {
		const c = body[i];
		if (c === "'" || c === '"' || c === '`') {
			out += c;
			i++;
			while (i < body.length && body[i] !== c) {
				if (body[i] === '\\') { out += body[i]; i++; }
				out += body[i];
				i++;
			}
			if (i < body.length) { out += body[i]; }
			continue;
		}
		if (c === '{') { depth++; }
		if (depth === 0) { out += c; }
		if (c === '}') { depth--; }
	}
	return out;
}

const bad = [];
let scanned = 0;
let gated = 0;

/**
 * 挡一条设置不一定要把 `!product.defaultChatAgent?.byokOnly` 抄十遍：本仓库更常用的写法是
 * 起一个有名字的常量。所以这里先认出"值就是 byokOnly 取反"的那些常量名，再按名字认 included。
 * 门查的是定义本身，不是变量名——谁把常量改成别的表达式，这条门就红。
 */
function byokFlagNames(text) {
	const names = new Set();
	for (const m of text.matchAll(/\bconst\s+(\w+)\s*=\s*!product\.defaultChatAgent\?\.byokOnly\b/g)) {
		names.add(m[1]);
	}
	return names;
}

for (const rel of FILES) {
	const abs = path.join(srcRoot, rel);
	assert.ok(fs.existsSync(abs), `登记的文件不见了：${rel}（改名或挪走要把这条门一起处理）`);
	const text = fs.readFileSync(abs, 'utf8');
	const flags = byokFlagNames(text);
	const allow = ALLOW[rel] ?? {};
	const usedAllow = new Set();

	// 设置项的写法有两种：`[XxxSettingId.Foo]: {` 和 `"chat.foo.bar": {`
	const blocks = /\n\s*(?:\[([\w.]+)\]|'([\w.]+)'|"([\w.]+)")\s*:\s*\{/g;
	let m;
	while ((m = blocks.exec(text))) {
		const id = m[1] ?? m[2] ?? m[3];
		const body = objectBody(text, m.index + m[0].length - 1);
		const own = ownProperties(body);
		// 「description」在这里有三种写法：description / markdownDescription / enumDescriptions。
		// 以前这条判据是大小写敏感的 /description/，markdownDescription 里那个大写 D 让它
		// 永远不匹配——于是只写 markdownDescription 的设置项全被跳过，这道门一直在少报。
		if (!/description/i.test(own)) { continue; }
		scanned++;
		// 光提 Copilot 不够：这个产品里同样不存在的是 GitHub 登录/托管账号那一整套。
		const mentions = /copilot|github/i.test(own);
		// 只认「行首就是 included:」那一行。注释里恰好写上 included: false 也曾把这里骗过去，
		// 于是门把一条没挡的设置当成挡过了。
		const included = /^[ \t]+included:\s*([^,\n]+)/m.exec(own)?.[1]?.trim();
		const gatedHere = !!included && (
			included === 'false'
			|| /!product\.defaultChatAgent\?\.byokOnly/.test(included)
			|| flags.has(included));
		if (gatedHere) { gated++; }
		if (!mentions || gatedHere) { continue; }
		const key = Object.keys(allow).find(k => id.includes(k) || id.toLowerCase().endsWith(k.toLowerCase()));
		if (key) { usedAllow.add(key); continue; }
		const line = text.slice(0, m.index).split(/\r?\n/).length;
		bad.push(`${rel}:${line} ${id} —— 说明里提到 Copilot，但没被 included 挡掉，也没有理由`);
	}
	for (const k of Object.keys(allow)) {
		if (!usedAllow.has(k)) { bad.push(`${rel} 的 ALLOW 条目「${k}」没命中：那条设置大概已经没了或被挡掉了，把 ALLOW 一起删`); }
	}
}

/**
 * 第二路：设置页渲染的说明里有一批不写在注册块里，而是从别的模块取常量拼进去的
 * （properties 的 description: discoverySourceSettingsLabel[k] 就是这种）。第一路只看注册块
 * 文本，这类句子根本不在它眼前——那句整段英文的 "GitHub Copilot CLI configuration…" 就是这么
 * 漏掉的。这里不问挡没挡（挡的是整条设置），只问句子翻过没有：提到 Copilot/GitHub 的必须是
 * 一句中文，允许保留工具名这类事实词。
 * name 是那个导出常量的名字，usedBy 是引用它的注册文件；两边任一边不再引用就说明结构变了，
 * 宁可报错也不许把空转当成通过。
 */
const TEXT_SOURCES = [
	{ rel: 'workbench/contrib/mcp/common/mcpConfiguration.ts', name: 'discoverySourceSettingsLabel', usedBy: 'workbench/contrib/chat/browser/chat.shared.contribution.ts' },
];
let textChecked = 0;
for (const src of TEXT_SOURCES) {
	const abs = path.join(srcRoot, src.rel);
	assert.ok(fs.existsSync(abs), `文案常量来源不见了：${src.rel}`);
	const text = fs.readFileSync(abs, 'utf8');
	const usesIt = fs.readFileSync(path.join(srcRoot, src.usedBy), 'utf8').includes(src.name);
	assert.ok(usesIt, `${src.usedBy} 已经不引用 ${src.name} 了：这一路的取样范围要重新对，别留着当摆设`);
	const from = text.indexOf(src.name);
	assert.ok(from >= 0, `${src.rel} 里找不到 ${src.name}：改名或挪走了，先修这一路`);
	const to = text.indexOf('};', from);
	assert.ok(to > from, `${src.name} 的块尾没找到，取样范围会失控`);
	const region = text.slice(from, to);
	for (const m of region.matchAll(/localize\(\s*'([^']+)'\s*,\s*["']([^"']*)["']/g)) {
		const str = m[2];
		if (!/copilot|github/i.test(str)) { continue; }
		textChecked++;
		if (!/[\u4e00-\u9fff]/.test(str)) {
			const line = text.slice(0, from + m.index).split(/\r?\n/).length;
			bad.push(`${src.rel}:${line} 设置页用的常量文案还是整句英文：${str.slice(0, 60)}`);
		}
	}
}
assert.ok(textChecked >= 1, `这一路只核对到 ${textChecked} 条提到 Copilot/GitHub 的常量文案：多半是正则不认现在的引号写法，别把空转当成通过`);

console.log(`扫了 ${scanned} 条设置，其中 ${gated} 条带 included 开关；另核对 ${textChecked} 条借常量渲染的设置页文案`);
for (const b of bad) { console.log(`FAIL ${b}`); }
assert.ok(scanned >= 120, `只扫到 ${scanned} 条设置，取样塌了：检查 blocks 正则还认不认现在的写法`);
assert.ok(gated >= 3, `只有 ${gated} 条被挡掉，要么是真被上游同步冲掉了，要么是正则不认新的挡法`);

/**
 * 待处理清单是棘轮，不是遮羞布。2026-10-19 把检测面从「只认 description」扩到
 * 「也认 markdownDescription，并且 GitHub 一起算」之后，一次性多出来二十来条真该处理的设置项
 * ——它们以前全被那个大小写敏感的判据跳过了。要么逐条挡掉/写理由，要么登记在
 * byok-settings-known.txt 里：新增一条就红，处理掉一条却忘了删登记也红。
 * 清单文件必须跟着仓库走，缺文件直接失败，免得有人靠"没有基线"蒙过去。
 */
const knownFile = path.join(here, 'byok-settings-known.txt');
assert.ok(fs.existsSync(knownFile), `缺待处理清单 ${knownFile}：这一门的基线必须进仓库`);
const known = new Set(fs.readFileSync(knownFile, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')));
const keyOf = b => b.replace(/:\d+ /, '#').replace(/ ——[\s\S]*$/, '');
const now = new Set(bad.map(keyOf));
const fresh = [...now].filter(k => !known.has(k));
const stale = [...known].filter(k => !now.has(k));
console.log(`待处理 ${now.size} 条（登记 ${known.size} 条）`);
for (const f of fresh) { console.log(`NEW  ${f}`); }
for (const s of stale) { console.log(`DONE ${s} —— 已经不违规了，把清单里这行删掉`); }
assert.deepStrictEqual(fresh, [], '有新增的、说明里提 Copilot/GitHub 却没挡掉也没写理由的设置（见上面 NEW 行）');
assert.deepStrictEqual(stale, [], '有登记但已不再违规的条目（见上面 DONE 行）');
console.log('\nall Copilot-mentioning settings are gated or explained');
