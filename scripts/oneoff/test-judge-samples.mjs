// 样例评测的题面解析测试：直接加载扩展编译产物 out/judgeSamples.js。
//
// 原来这里把 Markdown 形状**手抄**了一份，注释写着「与 renderStatement 逐字对齐」——
// 那句对齐是靠人守的，写题面那一边（olympia-contest/templates.ts）改了字段名，
// 这边照样绿，而真机上跑样例一条样例都读不到。所以基准那份现在是**产品自己的写入方**生成的，
// 只有故意试各种写法的用例才继续手写。
// 运行：node scripts/oneoff/test-judge-samples.mjs
import Module from 'node:module';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionOut = path.resolve(here, '../../oss/extensions/olympia-onboarding/out');
const contestOut = path.resolve(here, '../../oss/extensions/olympia-contest/out');

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

/** 写入方是 olympia-contest 的 renderStatement：题面就是这么落到磁盘上的。 */
const templates = await import(pathToFileURL(path.join(contestOut, 'templates.js')).href);

const given = {
	id: 'P1001',
	title: 'A+B Problem',
	url: 'https://www.luogu.com.cn/problem/P1001',
	platform: 'luogu',
	statement: '输入两个整数，输出它们的和。',
	inputFormat: '',
	outputFormat: '',
	hint: '没有提示。',
	tags: ['模拟'],
	difficulty: '入门',
	// 故意不用「读不出来时的那个默认值」当数据：写成 1000 ms 的话，
	// 时限字段改名读不出来也是 1000，检查台会跟着绿。
	timeLimit: '1234 ms',
	memoryLimit: '77 MB',
	samples: [
		{ input: '3 4', output: '7' },
		{ input: '-5 5', output: '0', explain: '第二组用来验证负数。' }
	]
};
const statement = templates.renderStatement(given);

check('跑样例读的题面就是写题面那一边写下来的形状（写的人改了字段名，这边要立刻变红）', () => {
	const parsed = judge.parseSamples(statement);
	assert.equal(parsed.samples.length, given.samples.length, `题面写了 ${given.samples.length} 组，读出来 ${parsed.samples.length} 组`);
	given.samples.forEach((sample, index) => {
		assert.equal(parsed.samples[index].number, index + 1, `第 ${index + 1} 组的编号读错`);
		assert.equal(parsed.samples[index].input.trim(), sample.input, `第 ${index + 1} 组的输入读不回来`);
		assert.equal(parsed.samples[index].expected.trim(), sample.output, `第 ${index + 1} 组的输出读不回来`);
	});
	assert.equal(parsed.timeLimitMs, 1234, '题面上的「时限：1234 ms」读不出来');
	assert.equal(parsed.memoryLimitMb, 77, '题面上的「内存：77 MB」读不出来');

	// 面板/对拍补的那一组走的是 renderSampleBlock，读它的还是上面那套正则：
	// 两处各写一遍形状，迟早对不上。
	const hintAt = statement.indexOf('## 说明 / 提示');
	assert.ok(hintAt > 0, '写入方的小节标题变了，这个检查台要跟着改');
	const appended = statement.slice(0, hintAt) + templates.renderSampleBlock(3, { input: '1 2', output: '3', explain: '自己加的样例' }) + statement.slice(hintAt);
	const after = judge.parseSamples(appended);
	assert.deepEqual(after.samples.map(s => s.number), [1, 2, 3], '补进题面的样例读不回来');
	assert.equal(after.samples[2].input.trim(), '1 2');
	assert.equal(after.samples[2].expected.trim(), '3');
});

check('两组样例都被解析出来', () => {
	const { samples } = judge.parseSamples(statement);
	assert.equal(samples.length, 2, `期望 2 组，实际 ${samples.length}`);
	assert.equal(samples[0].input.trim(), '3 4');
	assert.equal(samples[0].expected.trim(), '7');
	assert.equal(samples[1].input.trim(), '-5 5');
	assert.equal(samples[1].expected.trim(), '0');
});

check('拉题面写出的 ms 时限被正确读出来（不再是默认 1s）', () => {
	assert.equal(judge.parseSamples(statement).timeLimitMs, 1234);
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

check('内存限制：两种写法、单位与「没写」都要有正确结果', () => {
	// 真实题面（洛谷）写的是「内存限制：128.00 MB」，只认「内存：」就一条都读不到。
	assert.equal(judge.parseSamples('> 来源：洛谷 ｜ 时限：1.00s ｜ 内存限制：128.00 MB').memoryLimitMb, 128);
	assert.equal(judge.parseSamples('> 内存：256 MB').memoryLimitMb, 256);
	assert.equal(judge.parseSamples('> 内存：1.00 GB').memoryLimitMb, 1024);
	assert.equal(judge.parseSamples('> 内存：65536 KB').memoryLimitMb, 64);
	assert.equal(judge.parseSamples('> 内存：128').memoryLimitMb, 128);   // 省了单位就按 MB 理解
	assert.equal(judge.parseSamples('# P1001 某题\n\n没有写内存限制。\n').memoryLimitMb, 0);
	assert.equal(judge.parseSamples('> 内存限制：0 MB').memoryLimitMb, 0);
});

check('总体判定取最严的一档，顺序和老版本 worse_verdict 一致', () => {
	assert.equal(typeof judge.verdictOf, 'function', 'out/judgeSamples.js 必须导出 verdictOf');
	// AC < WA < MLE < TLE < RE（frontend/src-tauri/src/runner.rs 的 RANK）
	const caseOf = verdict => ({ index: 1, verdict, got: '', detail: '', ms: 0 });
	const of = verdicts => judge.verdictOf(verdicts.map(caseOf));
	assert.equal(of([]), 'AC', '一组都没跑过不能报失败');
	assert.equal(of(['AC', 'AC']), 'AC');
	assert.equal(of(['AC', 'WA', 'AC']), 'WA');
	assert.equal(of(['WA', 'MLE']), 'MLE', '超内存比答案错误更该先说');
	assert.equal(of(['MLE', 'TLE']), 'TLE', '超时比超内存更该先说');
	assert.equal(of(['TLE', 'RE']), 'RE', '运行出错是最严的一档');
	assert.equal(of(['RE', 'WA', 'MLE', 'TLE']), 'RE', '乱序也要挑出最严的');
});

check('样例带着题面里的编号，跳过没填完的之后不会认错号', () => {
	const parsed = judge.parseSamples([
		'### 样例 1', '', '**输入**', '', '```', '1', '```', '', '**输出**', '', '```', 'A', '```', '',
		'### 样例 2', '', '**输入**', '', '```', '2', '```', '', '**输出**', '', '```', '', '```', '',
		'### 样例 3', '', '**输入**', '', '```', '3', '```', '', '**输出**', '', '```', 'C', '```', ''
	].join('\n'));
	assert.deepEqual(parsed.samples.map(s => s.number), [1, 2, 3], '编号要按题面里写的走');
	assert.equal(parsed.samples.filter(s => s.expected.trim() !== '').length, 2, '没填期望输出的那组要能被识别出来');
});

check('题面真写了「样例 0」时编号就是 0，不会被顺成 1', () => {
	const parsed = judge.parseSamples('### 样例 0\n\n**输入**\n\n```\n1\n```\n\n**输出**\n\n```\n2\n```\n');
	assert.deepEqual(parsed.samples.map(s => s.number), [0], `看到的是 ${JSON.stringify(parsed.samples.map(s => s.number))}`);
});

console.log(failures ? '\nFAILED' : '\nall judge-sample assertions passed');
process.exitCode = failures ? 1 : 0;
