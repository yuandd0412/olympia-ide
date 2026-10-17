/*---------------------------------------------------------------------------------------------
 * 已核实「在 BYOK 产品里用户真能看到」的那些面，默认文案里不许再出现 Copilot。
 *
 * 为什么按文件列而不是全仓库扫：全仓库扫会命中一大片 agent host / 遥测字符串，它们要么
 * 需要 Copilot 令牌才走到、要么只在企业策略下显示，改它们等于自欺。所以这里只登记
 * 「读过消费代码、确认渲染路径存在」的文件，一个文件一条理由。
 *--------------------------------------------------------------------------------------------*/

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const srcRoot = path.join(repoRoot, 'oss', 'src', 'vs');

/** 每条都是「这个文件哪一面会渲染出来」。没有理由就不许往这里加。 */
const SURFACES = {
	'workbench/contrib/welcomeAgentSessions/browser/agentSessionsWelcome.ts': '首启欢迎页的条款卡（anonymous 用户必看）',
	'workbench/contrib/inlineChat/browser/inlineChatWidget.ts': '内联聊天输入框下方的免责行',
	'workbench/contrib/chat/browser/promptSyntax/hookActions.ts': '「钩子」选择器的分组标题（F1 可达）',
	'workbench/contrib/chat/browser/aiCustomization/toolsListWidget.ts': 'AI 设置里「工具」那一节的说明',
	'workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts': '起始页 walkthrough 正文',
	'workbench/contrib/welcomeGettingStarted/browser/startupPage.ts': '启动时到底开哪个欢迎页',
	'workbench/contrib/extensions/browser/extensionsActions.ts': '扩展签名失败对话框的按钮',
};

/**
 * 白名单：出现在上面那些文件里、但「说的就是 Copilot 自己的事」或「渲染路径被关掉了」的文案。
 * 每条都必须真的命中一次——上游把原文删了还留着豁免，这道门会红，逼着回来删条目。
 */
const EXEMPT = {
	'workbench/contrib/chat/browser/aiCustomization/toolsListWidget.ts': {
		'Copilot CLI 智能体在其自身运行时内运行的内置工具。': '_createStaticReadOnlySets 在 byokOnly 下直接 return []，整组不注册',
		'Copilot': '同上，那组的标题',
	},
	'workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts': {
		'免费使用 Copilot 的 AI 功能': 'createCopilotSetupStep 整个步骤 when: \'false\'，起始页不渲染',
		'可以使用 [Copilot]': '同上，属于那一步的描述',
		'继续使用 {0} Copilot': '同上，属于那一步的条款行',
	},
	'workbench/contrib/extensions/browser/extensionsActions.ts': {
		'所有 GitHub Copilot 功能现在均通过': '只在扩展被「统一」机制禁用时显示，讲的就是 Copilot 扩展本身',
	},
};

const LOCALIZE = /localize2?(?:\.\w+)?\(\s*(?:\{[^}]*\}\s*,\s*)?'[^']+'\s*,\s*(?:comment[^)]*\)\s*,\s*)?/;

function stripComments(text) {
	return text
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.split(/\r?\n/)
		.filter(l => !l.trim().startsWith('//'))
		.join('\n');
}

/**
 * 从 localize(...) / localize2(...) 调用里取默认文案字面量。
 * 不能按「key 后面那段就是文案」来切：localize({ key, comment: ['{Locked="]({0})"}'] }, "文案")
 * 里，comment 数组自己就带括号和双引号，任何跳过 comment 的正则都会在这里断掉，结果是那几条
 * 最该看的文案从来没被扫到（门照样绿）。也不能「取第一个双引号」—— 单引号串里同样有双引号。
 * 所以老老实实走字符：从 localize( 起维护嵌套深度，深度 1 上遇到的第一个双引号串才是文案。
 */
function defaultTexts(text) {
	const out = [];
	const calls = /\blocalize2?(?:\.\w+)?\(/g;
	let m;
	while ((m = calls.exec(text))) {
		let i = m.index + m[0].length;
		let depth = 1;
		while (i < text.length && depth > 0) {
			const c = text[i];
			if (c === '"' || c === "'" || c === '`') {
				const quote = c;
				let j = i + 1;
				let body = '';
				while (j < text.length) {
					if (text[j] === '\\') { body += text[j + 1]; j += 2; continue; }
					if (text[j] === quote) { break; }
					body += text[j];
					j++;
				}
				if (quote === '"' && depth === 1) { out.push(body); break; }
				i = j + 1;
				continue;
			}
			if (c === '(' || c === '[' || c === '{') { depth++; }
			else if (c === ')' || c === ']' || c === '}') { depth--; }
			i++;
		}
	}
	return out;
}

const fails = [];
const staleExemptions = [];
let scanned = 0;
let exempted = 0;
for (const [rel, why] of Object.entries(SURFACES)) {
	const file = path.join(srcRoot, rel);
	assert.ok(fs.existsSync(file), `登记的面不存在了：${rel}（文件被上游挪走或改名，这道门就白名单失效了）`);
	const strings = defaultTexts(stripComments(fs.readFileSync(file, 'utf8')));
	scanned += strings.length;
	const exempt = EXEMPT[rel] ?? {};
	const used = new Set();
	const hits = [];
	for (const s of strings) {
		if (!/copilot/i.test(s)) { continue; }
		const key = Object.keys(exempt).find(k => s.includes(k));
		if (key) { used.add(key); continue; }
		hits.push(s);
	}
	for (const k of Object.keys(exempt)) {
		if (!used.has(k)) { staleExemptions.push(`${rel} → 「${k}」已不再命中（上游大概删了这条文案，把 EXEMPT 里对应条目一起删）`); }
	}
	exempted += used.size;
	for (const h of hits) {
		fails.push(`${rel}: ${h.slice(0, 90)}`);
	}
	console.log(`${hits.length ? 'FAIL' : 'ok  '}  ${String(strings.length).padStart(3)} 条文案  ${rel}  —— ${why}`);
}

if (fails.length) {
	console.log('');
	for (const f of fails) { console.log(`  用户可见文案里还有 Copilot：${f}`); }
}
assert.ok(scanned >= 50, `只扫到 ${scanned} 条文案，这个门的取样塌了：检查 LOCALIZE 正则还认不认现在的写法`);
assert.deepStrictEqual(staleExemptions, []);
assert.deepStrictEqual(fails, []);
console.log(`\nall ${Object.keys(SURFACES).length} surfaces clean (${scanned} strings scanned, ${exempted} 条带理由豁免)`);
