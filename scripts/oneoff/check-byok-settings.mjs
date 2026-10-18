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
		const included = /\bincluded:\s*([^,\n]+)/.exec(own)?.[1]?.trim();
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

console.log(`扫了 ${scanned} 条设置，其中 ${gated} 条带 included 开关`);
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
