// 端到端跑通「对拍」这条链：加载扩展编译产物 out/stressTest.js，用打包进产品的 g++
// 真编译真运行，验证「两边一致 → 通过」「两边不一致 → 停下来并把数据写进 stress-fail」
// 「生成器没输出 → 明确报错」三种结果。
// 运行：node scripts/oneoff/test-stress-pipeline.mjs   （需要先 compile-extension:olympia-onboarding）
import Module from 'node:module';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const extensionOut = path.join(repoRoot, 'oss/extensions/olympia-onboarding/out');
// 用独立的目录：这里会往 .olympia/problems 里写题面，和跑样例那套测试共用一个工作区的话，
// 跑样例的「没有同名题面就从候选里选」会多出一个候选，选到别的题上。
const fixture = path.join(repoRoot, '.scratch/stresstest');
const GPP = path.join(repoRoot, 'VSCode-win32-x64/resources/app/toolchain/mingw64/bin/g++.exe');

fs.mkdirSync(fixture, { recursive: true });

const GEN = `#include <bits/stdc++.h>
using namespace std;
int main(int argc, char** argv) {
\tmt19937 rng((unsigned)(argc > 1 ? atoi(argv[1]) : 1));
\tint n = 3 + rng() % 6;
\tprintf("%d\\n", n);
\tfor (int i = 0; i < n; i++) printf("%d ", (int)(rng() % 101) - 50);
\tprintf("\\n");
\treturn 0;
}
`;
const FAST = `#include <bits/stdc++.h>
using namespace std;
int main() { int n; if (!(cin >> n)) return 0; long long s = 0; for (int i = 0, x; i < n; i++) { cin >> x; s += x; } cout << s << endl; return 0; }
`;
const SLOW = `#include <bits/stdc++.h>
using namespace std;
int main() { int n; if (!(cin >> n)) return 0; vector<int> v(n); for (int i = 0; i < n; i++) cin >> v[i]; long long s = 0; for (int i = 0; i < n; i++) s += v[i]; printf("%lld\\n", s); return 0; }
`;
const WRONG = `#include <bits/stdc++.h>
using namespace std;
int main() { int n; if (!(cin >> n)) return 0; long long s = 0; for (int i = 0, x; i < n; i++) { cin >> x; if (x > 0) s += x; } cout << s << endl; return 0; }
`;
const SILENT_GEN = `#include <cstdio>
int main() { return 0; }
`;

fs.writeFileSync(path.join(fixture, 'gen.cpp'), GEN, 'utf8');
fs.writeFileSync(path.join(fixture, 'fast.cpp'), FAST, 'utf8');
fs.writeFileSync(path.join(fixture, 'slow.cpp'), SLOW, 'utf8');
fs.writeFileSync(path.join(fixture, 'wrong.cpp'), WRONG, 'utf8');
fs.writeFileSync(path.join(fixture, 'silent_gen.cpp'), SILENT_GEN, 'utf8');
fs.rmSync(path.join(fixture, 'stress-fail'), { recursive: true, force: true });

const messages = [];
const channels = [];
const registered = {};
/** 扩展注册的 webview 视图提供方（题面侧栏），按视图 id 存着。 */
const webviewProviders = new Map();
/** 点错误提示里的哪个按钮；undefined 等于按 Esc。 */
let errorAction;
/** 每个角色该选哪个文件：按 quick pick 的 placeHolder 关键字匹配。 */
const pickFor = { solution: 'fast.cpp', brute: 'slow.cpp', generator: 'gen.cpp' };

function uri(fsPath) {
	return { fsPath, scheme: 'file', path: fsPath, toString: () => `file:///${fsPath.replace(/\\/g, '/')}` };
}

function roleOf(placeHolder) {
	if (/正解/.test(placeHolder)) { return 'solution'; }
	if (/暴力/.test(placeHolder)) { return 'brute'; }
	if (/生成器/.test(placeHolder)) { return 'generator'; }
	return '';
}

const vscodeStub = {
	FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 65 },
	StatusBarAlignment: { Left: 1, Right: 2 },
	TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
	DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
	ThemeIcon: class { constructor(id) { this.id = id; } },
	ThemeColor: class { constructor(id) { this.id = id; } },
	ProgressLocation: { Notification: 15 },
	Uri: { file: p => uri(p), joinPath: (base, ...parts) => uri(path.join(base.fsPath, ...parts)) },
	Disposable: { from: (...items) => ({ dispose() { for (const i of items) { i?.dispose?.(); } } }) },
	// .event 注册监听并返回 disposable，.fire 逐个通知——和真实 vscode 一样，哑火会让「文件变了就重画」这类联动悄悄失效。
	EventEmitter: class {
		constructor() { this.listeners = []; this.event = listener => { this.listeners.push(listener); return { dispose() { } }; }; }
		fire(value) { for (const listener of [...this.listeners]) { listener(value); } }
		dispose() { this.listeners.length = 0; }
	},
	workspace: {
		workspaceFolders: [{ uri: uri(fixture), name: path.basename(fixture), index: 0 }],
		// appendSample 会看编辑器里有没有没保存的改动；这里当作都保存过。
		textDocuments: [],
		getConfiguration: () => ({
			// stressTest 用 getConfiguration('olympia.stress').get('rounds')，
			// compile 用 getConfiguration().get('olympia.compiler.path')，两种写法都要认。
			get: (key, fallback) => {
				if (key === 'compiler.path') { return GPP; }
				if (key === 'olympia.compiler.path') { return GPP; }
				if (key === 'stress.rounds' || key === 'rounds') { return process.env.OLYMPIA_TEST_ROUNDS ? Number(process.env.OLYMPIA_TEST_ROUNDS) : 25; }
				if (key === 'stress.timeoutMs' || key === 'timeoutMs') { return 2000; }
				return fallback;
			}
		}),
		asRelativePath: u => path.basename(u.fsPath),
		findFiles: async () => Object.keys(pickFor).length ? fs.readdirSync(fixture).filter(f => /\.cpp$/.test(f)).map(f => uri(path.join(fixture, f))) : [],
		fs: {
			async readFile(u) { return fs.readFileSync(u.fsPath); },
			async writeFile(u, content) { fs.writeFileSync(u.fsPath, content); },
			async createDirectory(u) { fs.mkdirSync(u.fsPath, { recursive: true }); }
		}
	},
	window: {
		showWarningMessage: async (...a) => { messages.push(['warning', a[0]]); return undefined; },
		showInformationMessage: async (...a) => { messages.push(['info', a[0]]); return undefined; },
		showErrorMessage: async (...a) => { messages.push(['error', a[0]]); return errorAction; },
		showQuickPick: async (items, options) => {
			const wanted = pickFor[roleOf(options?.placeHolder ?? '')] ?? 'fast.cpp';
			return items.find(item => item.label === wanted) ?? items[0];
		},
		withProgress: async (_options, task) => task({ report() { } }, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() { } }) }),
		createOutputChannel: title => {
			const lines = [];
			const channel = { title, lines, appendLine: t => lines.push(String(t)), clear: () => { lines.length = 0; }, show: () => { }, hide: () => { }, dispose: () => { } };
			channels.push(channel);
			return channel;
		},
		createStatusBarItem: () => ({ text: '', tooltip: '', command: undefined, show() { }, hide() { }, dispose() { } }),
		// 题面侧栏（statementView）在 olympia-contest 的 activate 里注册：没有这个替身，
		// 扩展根本 activate 不起来，下面那条「appendSample 必须被注册」的前置检查都到不了。
		registerWebviewViewProvider: (id, provider) => {
			webviewProviders.set(id, provider);
			return { dispose() { } };
		}
	},
	commands: {
		registerCommand: (id, handler) => { registered[id] = handler; return { dispose() { } }; },
		// 命令可以带参数：对拍把抓到的那组数据交给 olympia.problem.appendSample。
		// 没注册的命令照真的 VS Code 那样 reject，不是回 undefined：题面侧栏那条
		// `olympia.statement.focus` 就是靠这个失败退回编辑器的，替它圆过去就看不见降级这条路了。
		executeCommand: async (...args) => {
			const [id, ...rest] = args;
			if (!Object.hasOwn(registered, id)) { throw new Error(`command '${id}' not found`); }
			return registered[id](...rest);
		}
	},
	languages: { getDiagnostics: () => [], registerCompletionItemProvider: () => ({ dispose() { } }) },
	env: { openExternal: async () => true }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};

const stress = await import(pathToFileURL(path.join(extensionOut, 'stressTest.js')).href);
const store = {};
const context = { subscriptions: [], workspaceState: { get: (_k, d) => store[_k] ?? d, update: async (k, v) => { store[k] = v; } } };
stress.registerStressTest(context);
assert.ok(registered['olympia.stressTest'], 'olympia.stressTest 必须被注册');

// 「补进题面样例」是竞赛助手实现的命令：两个扩展在同一个 stub 上注册，才能测出这一条跨扩展的路
const contestOut = path.join(repoRoot, 'oss/extensions/olympia-contest/out');
const contest = await import(pathToFileURL(path.join(contestOut, 'extension.js')).href);
contest.activate({ subscriptions: [], workspaceState: { get: (_k, d) => d, update: async () => { } } });
assert.ok(registered['olympia.problem.appendSample'], 'olympia.problem.appendSample 必须被注册');

// 用产品自己的解析器读回题面：写回去的形状不对，跑样例会少一组数据
const judge = await import(pathToFileURL(path.join(extensionOut, 'judgeSamples.js')).href);
const judgeParse = markdown => judge.parseSamples(markdown);
const normalizeText = text => text.split(/\s+/).filter(Boolean).join(' ');

let failed = 0;
async function check(name, fn) {
	try {
		await fn();
		console.log(`ok    ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}\n      ${error.message}\n      --- 面板日志 ---\n${log().split('\n').map(l => '      ' + l).join('\n')}`);
	}
}
const allMessages = () => messages.map(m => m[1]).join('\n');
const log = () => channels.find(c => c.title === 'Olympia 对拍')?.lines.join('\n') ?? '';

await check('正解 vs 暴力：25 轮一致，报通过', async () => {
	messages.length = 0;
	await registered['olympia.stressTest']();
	assert.match(allMessages(), /对拍通过/, `没有通过提示：${allMessages()}`);
	assert.match(allMessages(), /25/, `提示里没有轮数：${allMessages()}`);
	assert.ok(!fs.existsSync(path.join(fixture, 'stress-fail')), '一致却写了 stress-fail');
});

await check('正解 vs 故意写错的解：报不一致并留下那组数据', async () => {
	pickFor.brute = 'wrong.cpp';
	messages.length = 0;
	fs.rmSync(path.join(fixture, 'stress-fail'), { recursive: true, force: true });
	// 正解叫 fast.cpp，题面就叫 fast.md：命令按文件名找题面，找到了就直接写
	const problems = path.join(fixture, '.olympia', 'problems');
	fs.mkdirSync(problems, { recursive: true });
	fs.writeFileSync(path.join(problems, 'fast.md'), [
		'# P1001 求和', '',
		'> 来源：洛谷 ｜ 时限：1000 ms', '',
		'## 样例数据', '',
		'### 样例 1', '',
		'**输入**', '', '```', '3', '1 2 3', '```', '',
		'**输出**', '', '```', '6', '```', '',
		'## 说明 / 提示', '', '别把这段当输出读走。', '',
		'---', '', '页脚。', ''
	].join('\n'), 'utf8');
	errorAction = '补进题面样例';
	await registered['olympia.stressTest']();
	errorAction = undefined;
	assert.match(allMessages(), /不一致|超时|出错/, `没有报出问题：${allMessages()}`);
	const folder = path.join(fixture, 'stress-fail');
	assert.ok(fs.existsSync(folder), '没有写出 stress-fail 目录');
	const files = fs.readdirSync(folder);
	assert.ok(files.some(f => /\.in$/.test(f)), `目录里没有 .in 数据文件：${files.join(', ')}`);
	const data = fs.readFileSync(path.join(folder, files.find(f => /\.in$/.test(f))), 'utf8');
	assert.match(data.trim(), /^-?\d+\s/, '数据文件不像一组合法输入');
	assert.match(log(), /第 \d+ 轮/, '日志里没有轮数');

	// 点「补进题面样例」以后，这组数据应该变成题面里的第二组样例
	const statement = fs.readFileSync(path.join(problems, 'fast.md'), 'utf8');
	assert.match(statement, /### 样例 2/, `题面里没有补上第二组样例：\n${statement}`);
	assert.match(statement, /对拍第 \d+ 轮/, '补上的样例要写明它是哪来的');
	assert.match(allMessages(), /写进 P1001/, `没有告诉学生写进了哪道题：${allMessages()}`);
	const parsed = judgeParse(statement);
	assert.equal(parsed.samples.length, 2, `补完样例后跑样例只读得出 ${parsed.samples.length} 组，写回去的形状不对`);
	assert.equal(normalizeText(parsed.samples[0].expected), '6', '原有的样例被改坏了');
	assert.ok(!parsed.samples[1].expected.includes('别把这段当输出读走'), '下一节的正文漏进了新样例的输出里');
	assert.match(statement, /别把这段当输出读走/, '说明小节被挤掉了');
	assert.match(statement, /页脚。/, '页脚被挤掉了');

	// 再跑一场对拍：上一场抓到的反例是学生的成果，不能被这一场覆盖掉
	const firstIn = files.find(f => /\.in$/.test(f));
	const firstText = fs.readFileSync(path.join(folder, firstIn), 'utf8');
	messages.length = 0;
	await registered['olympia.stressTest']();
	const evidence = fs.readdirSync(folder).filter(f => /\.in$/.test(f));
	assert.ok(evidence.length >= 2, `第二场对拍没留下新的数据文件，目录里只有：${evidence.join(', ')}`);
	assert.equal(fs.readFileSync(path.join(folder, firstIn), 'utf8'), firstText, `${firstIn} 被下一场对拍覆盖了`);
	assert.doesNotMatch(allMessages(), /stress-fail 文件夹/, '提示要说到具体的文件名，而不是一个文件夹');

	pickFor.brute = 'slow.cpp';
});

await check('生成器不输出数据时明确报错，而不是空跑一轮', async () => {
	pickFor.generator = 'silent_gen.cpp';
	messages.length = 0;
	await registered['olympia.stressTest']();
	assert.match(allMessages(), /生成器/, `没有指向生成器：${allMessages()}`);
	pickFor.generator = 'gen.cpp';
});

console.log(failed ? '\nFAILED' : '\nall stress-pipeline assertions passed');
process.exitCode = failed ? 1 : 0;
