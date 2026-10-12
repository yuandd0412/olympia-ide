// 端到端跑通「跑样例」这条链：加载扩展编译产物 out/judgeSamples.js，
// 用打包进产品的 g++ 真编译真运行，验证 AC 与 WA 两种判定。
// 运行：node scripts/oneoff/test-judge-pipeline.mjs   （需要先 compile-extension:olympia-onboarding）
import Module from 'node:module';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const extensionOut = path.join(repoRoot, 'oss/extensions/olympia-onboarding/out');
const fixture = path.join(repoRoot, '.scratch/judgetest');
const GPP = path.join(repoRoot, 'VSCode-win32-x64/resources/app/toolchain/mingw64/bin/g++.exe');

const messages = [];
const channels = [];
let registered = {};

function uri(fsPath) {
	return { fsPath, scheme: 'file', path: fsPath, toString: () => `file:///${fsPath.replace(/\\/g, '/')}` };
}

const vscodeStub = {
	FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 65 },
	StatusBarAlignment: { Left: 1, Right: 2 },
	TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
	DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
	ThemeIcon: class { constructor(id) { this.id = id; } },
	ThemeColor: class { constructor(id) { this.id = id; } },
	ProgressLocation: { Notification: 15 },
	Uri: {
		file: p => uri(p),
		joinPath: (base, ...parts) => uri(path.join(base.fsPath, ...parts))
	},
	Disposable: { from: (...items) => ({ dispose() { for (const i of items) { i?.dispose?.(); } } }) },
	EventEmitter: class { constructor() { this.event = () => ({ dispose() { } }); } fire() { } dispose() { } },
	workspace: {
		workspaceFolders: [{ uri: uri(fixture), name: path.basename(fixture), index: 0 }],
		getConfiguration: () => ({
			get: (key, fallback) => key === 'compiler.path' ? GPP : fallback
		}),
		asRelativePath: (u, keepDrive = true) => (keepDrive ? u.fsPath : path.basename(u.fsPath)),
		findFiles: async () => [],
		openTextDocument: async u => ({ fileName: u.fsPath, uri: u, getText: () => '' }),
		fs: {
			async readFile(u) { return fs.readFileSync(u.fsPath); },
			async writeFile() { },
			async createDirectory() { },
			async stat(u) { return { type: fs.statSync(u.fsPath).isDirectory() ? 2 : 1 }; },
			async readDirectory(dir) {
				return fs.readdirSync(dir.fsPath, { withFileTypes: true })
					.map(entry => [entry.name, entry.isDirectory() ? 2 : 1]);
			}
		},
		onDidChangeConfiguration: () => ({ dispose() { } }),
		onDidSaveTextDocument: () => ({ dispose() { } })
	},
	window: {
		activeTextEditor: undefined,
		showWarningMessage: async (...a) => { messages.push(['warning', a[0]]); return undefined; },
		showInformationMessage: async (...a) => { messages.push(['info', a[0]]); return undefined; },
		showErrorMessage: async (...a) => { messages.push(['error', a[0]]); return undefined; },
		showQuickPick: async items => (Array.isArray(items) ? items[0] : undefined),
		showOpenDialog: async () => undefined,
		showTextDocument: async () => ({}),
		withProgress: async (_options, task) => task({ report() { } }, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() { } }) }),
		createOutputChannel: title => {
			const lines = [];
			const channel = {
				title,
				lines,
				appendLine: text => lines.push(String(text)),
				append: text => lines.push(String(text)),
				clear: () => { lines.length = 0; },
				show: () => { },
				hide: () => { },
				dispose: () => { }
			};
			channels.push(channel);
			return channel;
		},
		createStatusBarItem: () => ({ text: '', tooltip: '', command: undefined, show() { }, hide() { }, dispose() { } }),
		onDidChangeActiveTextEditor: () => ({ dispose() { } }),
		onDidCloseTextDocument: () => ({ dispose() { } })
	},
	commands: {
		registerCommand: (id, handler) => { registered[id] = handler; return { dispose() { } }; },
		executeCommand: async (id, ...args) => registered[id]?.(...args),
		getDiagnostics: () => []
	},
	languages: {
		getDiagnostics: () => [],
		onDidChangeDiagnostics: () => ({ dispose() { } }),
		createDiagnosticCollection: () => ({ set() { }, delete() { }, clear() { }, dispose() { } })
	},
	env: { openExternal: async () => true },
	extensions: { all: [], getExtension: () => undefined }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') {
		return vscodeStub;
	}
	return originalLoad.call(this, request, parent, isMain);
};

const judge = await import(pathToFileURL(path.join(extensionOut, 'judgeSamples.js')).href);
const context = { subscriptions: [], workspaceState: { get: (_k, d) => d, update: async () => { } } };
judge.registerSampleJudge(context);
assert.ok(registered['olympia.judgeSamples'], 'olympia.judgeSamples 必须被注册');

let failed = 0;
async function check(name, fn) {
	try {
		await fn();
		console.log(`ok    ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}\n      ${error.message}`);
	}
}

function openFile(name) {
	const file = uri(path.join(fixture, name));
	vscodeStub.window.activeTextEditor = { document: { uri: file, fileName: file.fsPath } };
	return file;
}

function judgeChannel() {
	return channels.find(channel => channel.title === 'Olympia 评测');
}

await check('P1001.cpp 判成 AC，两组样例都过', async () => {
	openFile('P1001.cpp');
	messages.length = 0;
	await registered['olympia.judgeSamples']();
	const summary = messages.map(m => m[1]).join('\n');
	assert.match(summary, /AC/, `提示里没有 AC：${summary}`);
	assert.match(summary, /2\/2/, `提示里没有 2/2：${summary}`);
	assert.match(judgeChannel().lines.join('\n'), /样例 1：AC/, '日志里第一组不是 AC');
});

await check('P1001_wrong.cpp 判成 WA，并打出期望与得到', async () => {
	openFile('P1001_wrong.cpp');
	messages.length = 0;
	await registered['olympia.judgeSamples']();
	const summary = messages.map(m => m[1]).join('\n');
	assert.match(summary, /WA/, `提示里没有 WA：${summary}`);
	const log = judgeChannel().lines.join('\n');
	assert.match(log, /期望：7/, '日志里缺少期望输出');
	assert.match(log, /得到：-1/, '日志里缺少实际输出');
});

await check('编译不过时报错而不是假装通过', async () => {
	const broken = path.join(fixture, 'P1001_broken.cpp');
	fs.writeFileSync(broken, 'int main() { this is not c++ }\n', 'utf8');
	openFile('P1001_broken.cpp');
	messages.length = 0;
	await registered['olympia.judgeSamples']();
	const kinds = messages.map(m => m[0]);
	assert.ok(kinds.includes('error'), `应该弹错误提示，实际是 ${JSON.stringify(messages)}`);
	assert.ok(!messages.some(m => /AC/.test(m[1])), '编译失败却报了 AC');
});

await check('没有同名题面时从候选里选，而不是直接失败', async () => {
	const renamed = path.join(fixture, 'solution.cpp');
	fs.copyFileSync(path.join(fixture, 'P1001.cpp'), renamed);
	openFile('solution.cpp');
	messages.length = 0;
	await registered['olympia.judgeSamples']();
	assert.match(messages.map(m => m[1]).join('\n'), /AC/, '选完题面后没有判成 AC');
});

// ---- MLE：只有题面写了内存限制才判，采样只报峰值不猜 ----
const problemsDir = path.join(fixture, '.olympia', 'problems');

/** 答得对，但一口吃掉 24 MB 并抱着 1.2 秒——足够被采样看到。 */
const MEMORY_HOG = [
	'#include <bits/stdc++.h>',
	'using namespace std;',
	'int main() {',
	'    int a, b;',
	'    cin >> a >> b;',
	'    const size_t n = 24ull * 1024 * 1024;',
	'    char* p = (char*)malloc(n);',
	'    for (size_t i = 0; i < n; i += 4096) { p[i] = 1; }',
	'    this_thread::sleep_for(chrono::milliseconds(1200));',
	'    cout << a + b << endl;',
	'    return 0;',
	'}',
	''
].join('\n');

function writeHogCase(stem, metaLine) {
	fs.writeFileSync(path.join(fixture, `${stem}.cpp`), MEMORY_HOG, 'utf8');
	fs.mkdirSync(problemsDir, { recursive: true });
	fs.writeFileSync(path.join(problemsDir, `${stem}.md`), [
		`# ${stem} A+B Problem`,
		'',
		metaLine,
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
		''
	].join('\n'), 'utf8');
}

await check('题面写了内存限制、程序超了 → 判 MLE 并给出峰值', async () => {
	writeHogCase('P1001_mem', '> 来源：洛谷 ｜ 时限：1.00s ｜ 内存限制：8.00 MB');
	openFile('P1001_mem.cpp');
	messages.length = 0;
	await registered['olympia.judgeSamples']();
	const summary = messages.map(m => m[1]).join('\n');
	assert.match(summary, /MLE|超内存/, `提示里没有 MLE：${summary}`);
	const log = judgeChannel().lines.join('\n');
	assert.match(log, /峰值内存 \d+(\.\d+)? MB/, `日志里没有峰值内存：${log}`);
});

await check('题面没写内存限制 → 只报峰值，绝不判 MLE', async () => {
	writeHogCase('P1001_nomem', '> 来源：洛谷 ｜ 时限：1.00s');
	openFile('P1001_nomem.cpp');
	messages.length = 0;
	await registered['olympia.judgeSamples']();
	const summary = messages.map(m => m[1]).join('\n');
	assert.ok(!/MLE|超内存/.test(summary), `题面没写限制却判了 MLE：${summary}`);
	assert.match(summary, /AC/, `应该按输出判 AC：${summary}`);
	assert.match(judgeChannel().lines.join('\n'), /峰值内存/, '题面没写限制时也应当把测到的峰值告诉学生');
});

await check('没填完的自定义样例：跳过并说明，不报成 WA', async () => {
	fs.writeFileSync(path.join(fixture, 'P1001_partial.cpp'), fs.readFileSync(path.join(fixture, 'P1001.cpp'), 'utf8'), 'utf8');
	fs.writeFileSync(path.join(problemsDir, 'P1001_partial.md'), [
		'# P1001_partial A+B Problem', '',
		'> 来源：洛谷 ｜ 时限：1000 ms', '',
		'## 样例数据', '',
		'### 样例 1', '',
		'**输入**', '', '```', '3 4', '```', '',
		'**输出**', '', '```', '7', '```', '',
		'### 样例 2', '',
		'**输入**', '', '```', '', '```', '',
		'**输出**', '', '```', '', '```', '',
		'**说明**：自己加的样例：把数据填进上面两个代码块再跑样例，期望输出空着的那组会被跳过。', ''
	].join('\n'), 'utf8');
	openFile('P1001_partial.cpp');
	messages.length = 0;
	await registered['olympia.judgeSamples']();
	const summary = messages.map(m => m[1]).join('\n');
	assert.match(summary, /AC/, `填完的那组应该判 AC：${summary}`);
	assert.match(summary, /1\/1/, `只该判一组：${summary}`);
	const log = judgeChannel().lines.join('\n');
	assert.match(log, /没填期望输出/, `日志要说清楚为什么少了一组：${log}`);
	assert.match(log, /样例 2/, '跳过的那组要按题面里的编号说，别让人以为是判了样例 1');
	assert.ok(!/WA/.test(log), `没填完的样例被判成了 WA：${log}`);
});

console.log(failed ? '\nFAILED' : '\nall judge-pipeline assertions passed');
process.exitCode = failed ? 1 : 0;
