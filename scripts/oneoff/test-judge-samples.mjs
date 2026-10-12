// 样例评测的题面解析测试：直接加载扩展编译产物 out/judgeSamples.js，
// 用和 renderStatement 完全一致的 Markdown 形状做断言。
// 运行：node scripts/oneoff/test-judge-samples.mjs
import Module from 'node:module';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionOut = path.resolve(here, '../../oss/extensions/olympia-onboarding/out');

// 扩展源码 import 'vscode'，在 node 里只能靠打桩。这里只用到枚举与配置读取，
// 解析函数本身不碰 vscode，所以桩保持最小。
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') {
		return {
			FileType: { File: 1, Directory: 2, SymbolicLink: 65 },
			StatusBarAlignment: { Left: 1, Right: 2 },
			TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
			DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
			ThemeIcon: class { constructor(id) { this.id = id; } },
			workspace: { getConfiguration: () => ({ get: (_k, d) => d }) },
			window: {},
			commands: {},
			EventEmitter: class { constructor() { this.event = () => ({ dispose() { } }); } fire() { } dispose() { } },
			Disposable: { from: () => ({ dispose() { } }) },
			Uri: { file: p => ({ fsPath: p, toString: () => p }) },
		};
	}
	return originalLoad.call(this, request, parent, isMain);
};

const judge = await import(pathToFileURL(path.join(extensionOut, 'judgeSamples.js')).href);
assert.equal(typeof judge.parseSamples, 'function', 'out/judgeSamples.js 必须导出 parseSamples');

let failures = 0;
function check(name, fn) {
	try {
		fn();
		console.log(`ok    ${name}`);
	} catch (error) {
		failures++;
		console.log(`FAIL  ${name}\n      ${error.message}`);
	}
}

/** 与 olympia-contest 的 renderStatement 逐字对齐：它写的是「时限：1000 ms」「内存：128 MB」。 */
const statement = [
	'# P1001 A+B Problem',
	'',
	'> 来源：洛谷 ｜ 难度：入门 ｜ 时限：1000 ms ｜ 内存：128 MB',
	'> 原文链接：https://www.luogu.com.cn/problem/P1001',
	'',
	'## 题目描述',
	'',
	'输入两个整数，输出它们的和。',
	'',
	'## 样例数据',
	'',
	'### 样例 1',
	'',
	'**输入**',
	'',
	'```',
	'3 4',
	'```',
	'',
	'**输出**',
	'',
	'```',
	'7',
	'```',
	'',
	'### 样例 2',
	'',
	'**输入**',
	'',
	'```',
	'-5 5',
	'',
	'```',
	'',
	'**输出**',
	'',
	'```',
	'0',
	'```',
	'',
	'**说明**：第二组用来验证负数。',
	'',
	'## 说明 / 提示',
	'',
	'没有提示。',
	'',
].join('\n');

check('两组样例都被解析出来', () => {
	const { samples } = judge.parseSamples(statement);
	assert.equal(samples.length, 2, `期望 2 组，实际 ${samples.length}`);
	assert.equal(samples[0].input.trim(), '3 4');
	assert.equal(samples[0].expected.trim(), '7');
	assert.equal(samples[1].input.trim(), '-5 5');
	assert.equal(samples[1].expected.trim(), '0');
});

check('拉题面写出的 ms 时限被正确读出来（不再是默认 1s）', () => {
	assert.equal(judge.parseSamples(statement).timeLimitMs, 1000);
	assert.equal(judge.parseSamples('> 时限：2000 ms').timeLimitMs, 2000);
});

check('手写题面的秒也认，两种单位不混', () => {
	assert.equal(judge.parseSamples('> 时限：1.00s').timeLimitMs, 1000);
	assert.equal(judge.parseSamples('> 时限：2s').timeLimitMs, 2000);
	assert.equal(judge.parseSamples('> 时限：1500毫秒').timeLimitMs, 1500);
	assert.equal(judge.parseSamples('> 时限：3 秒').timeLimitMs, 3000);
	// 认不出单位时回到默认值，而不是把 1000 当 1000 秒
	assert.equal(judge.parseSamples('> 时限：1000').timeLimitMs, 1000);
});

check('时限被夹在 500ms 到 10s 之间', () => {
	assert.equal(judge.parseSamples('> 时限：0.01s\n\n### 样例 1\n\n**输入**\n\n```\n1\n```\n\n**输出**\n\n```\n1\n```\n').timeLimitMs, 500);
	assert.equal(judge.parseSamples('> 时限：99s\n\n### 样例 1\n\n**输入**\n\n```\n1\n```\n\n**输出**\n\n```\n1\n```\n').timeLimitMs, 10000);
	assert.equal(judge.parseSamples('> 时限：60000 ms').timeLimitMs, 10000);
});

check('没有时限也不炸', () => {
	const parsed = judge.parseSamples('## 样例数据\n\n### 样例 1\n\n**输入**\n\n```\n1\n```\n\n**输出**\n\n```\n2\n```\n');
	assert.equal(parsed.timeLimitMs, 1000);
	assert.equal(parsed.samples.length, 1);
});

check('题面里没有样例时返回空数组', () => {
	const parsed = judge.parseSamples('# P1001 某题\n\n## 题目描述\n\n只有一句话。\n');
	assert.equal(parsed.samples.length, 0);
});

check('样例后面的正文不会被吞进最后一组', () => {
	const { samples } = judge.parseSamples(statement);
	assert.ok(!samples[1].expected.includes('没有提示'), '下一节的文字漏进了输出里');
});

check('代码块里带语言的围栏也能解析', () => {
	const parsed = judge.parseSamples('### 样例 1\n\n**输入**\n\n```text\n3 4\n```\n\n**输出**\n\n```text\n7\n```\n');
	assert.equal(parsed.samples.length, 1);
	assert.equal(parsed.samples[0].input.trim(), '3 4');
	assert.equal(parsed.samples[0].expected.trim(), '7');
});

console.log(failures ? '\nFAILED' : '\nall judge-sample assertions passed');
process.exitCode = failures ? 1 : 0;
