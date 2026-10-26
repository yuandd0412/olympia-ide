// Olympia chrome 门禁的变异配对（牙齿证明）。
//
//   node scripts/oneoff/mutation-test-olympia-chrome.mjs
//
// 每个 M：改坏目标文件 → 跑 check-olympia-chrome.mjs，必须红，且红在 expect 指定的
// 断言 id 上 → 用 SHA-256 逐字节还原。还原不一致直接 fail（「看起来还原了」不算还原）。
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, utimesSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OSS = path.resolve(HERE, '../../oss');
const CHECK = path.join(HERE, 'check-olympia-chrome.mjs');

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

/** 每个 M 显式列出它会动的文件（收尾逐一校验字节还原）。 */
const MUTATIONS = [
	{ id: 'M1', expect: 'C1', file: 'src/vs/workbench/contrib/olympia/browser/olympiaChrome.ts',
		from: "import './media/olympiaChrome.css';\n", to: '', why: '挂载 import 被删 → 整层视觉消失' },
	{ id: 'M2', expect: 'C2', file: 'src/vs/workbench/contrib/olympia/browser/media/olympiaChrome.css',
		from: '\t--olympia-radius: 6px;\n', to: '', why: 'token 定义被删 → 全部 var() 静默回退' },
	{ id: 'M3', expect: 'C2', file: 'build/lib/stylelint/vscode-known-variables.json',
		from: '"--olympia-radius",', to: '', why: '白名单登记被删 → stylelint 拒收' },
	{ id: 'M4', expect: 'C3', file: 'src/vs/workbench/contrib/olympia/browser/media/olympiaChrome.css',
		from: 'border-radius: var(--olympia-radius) var(--olympia-radius) 0 0;', to: 'border-radius: 0;', why: 'tab 顶部圆角被抹平' },
	{ id: 'M5', expect: 'C3', file: 'src/vs/workbench/contrib/olympia/browser/media/olympiaChrome.css',
		from: 'background: var(--vscode-tab-activeBorderTop, var(--vscode-focusBorder));', to: 'background: #61afef;', why: '强调线颜色脱离主题（硬编码）' },
	{ id: 'M6', expect: 'C4', file: 'src/vs/workbench/contrib/olympia/browser/media/olympiaChrome.css',
		from: '.monaco-workbench.modern-ui .monaco-list .monaco-list-row:not(.separator) {\n\tborder-radius: var(--olympia-radius);\n}', to: '.monaco-workbench.modern-ui .monaco-list .monaco-list-row:not(.separator) {\n\tborder-radius: var(--vscode-cornerRadius-small);\n}', why: 'modern-ui 复合规则退回上游 token —— 真机行上圆角会停回 4px' },
	{ id: 'M7', expect: 'C5', alsoRed: [], file: 'src/vs/workbench/contrib/olympia/browser/media/olympiaChrome.css',
		from: '.notification-toast .monaco-list-row {\n\tborder-radius: var(--olympia-radius);\n}', to: '.notification-toast .monaco-list-row {\n\tborder-radius: 4px;\n}', why: '通知圆角回退上游 4px（token 被绕开）；锚点带 .notification-toast 上下文，防止 replace 第一处命中列表行规则' },
	{ id: 'M8', expect: 'C6', alsoRed: ['C4'], file: 'src/vs/workbench/contrib/olympia/browser/media/olympiaChrome.css',
		from: '.monaco-workbench .monaco-list-row {', to: '.monaco-workbench [class*="tab"] .monaco-list-row {', why: '引入属性子串选择器（stylelint 红线）；同一条规则被 C4 逐字断言，连带红是预期，显式声明' },
];

	let failures = 0;
for (const m of MUTATIONS) {
	const abs = path.join(OSS, m.file);
	const before = sha256(abs);
	// mtime 也要原样还原：check-core-copy 按「产物比源码旧」判新鲜度，
	// 只还字节不还时间戳的话，本轮变异（以及随后任何一次全量跑批）都会假红 ——
	// 这是第 15 轮 3 条红里 core-copy 那条的根因。
	const mtimeBefore = statSync(abs).mtime;
	const text = readFileSync(abs, 'utf8');
	if (!text.includes(m.from)) {
		console.log(`FAIL ${m.id} 锚点在 ${m.file} 里不存在（变异没生效，报出来的红是假的）: ${m.from.slice(0, 60)}`);
		failures++;
		continue;
	}
	writeFileSync(abs, text.replace(m.from, m.to), 'utf8');
	let ran;
	try {
		execFileSync(process.execPath, [CHECK], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
		ran = { code: 0, out: '' };
	} catch (e) {
		ran = { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
	}
	const redOnExpect = ran.code !== 0 && ran.out.includes(`FAIL ${m.expect} `);
	const redIds = ran.out.split('\n').filter(l => /^FAIL /.test(l)).map(l => /^FAIL (C\d+) /.exec(l)?.[1]).filter(Boolean);
	const allowed = new Set([m.expect, ...(m.alsoRed || [])]);
	const redOnlyOnExpect = redOnExpect && redIds.every(id => allowed.has(id));
	// 还原 + 字节校验（mtime 一起还原）
	writeFileSync(abs, text, 'utf8');
	utimesSync(abs, mtimeBefore, mtimeBefore);
	const after = sha256(abs);
	const restored = after === before && statSync(abs).mtime.getTime() === mtimeBefore.getTime();
	if (!redOnExpect) {
		console.log(`FAIL ${m.id} 变异后门禁没有红在 ${m.expect} 上（exit=${ran.code}）—— ${m.why}`);
		failures++;
	} else if (!redOnlyOnExpect) {
		console.log(`FAIL ${m.id} 变异后红在了别的断言上（ expect=${m.expect}）:\n` + ran.out.split('\n').filter(l => /^FAIL /.test(l)).join('\n'));
		failures++;
	} else if (!restored) {
		console.log(`FAIL ${m.id} 还原后 SHA-256 或 mtime 不一致（${before.slice(0, 8)} → ${after.slice(0, 8)}）`);
		failures++;
	} else {
		console.log(`ok   ${m.id} → ${m.expect} 红，且逐字节还原（${after.slice(0, 12)}）`);
	}
}

console.log(`\n${MUTATIONS.length - failures}/${MUTATIONS.length} 变异通过`);
process.exitCode = failures === 0 ? 0 : 1;
