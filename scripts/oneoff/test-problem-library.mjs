// 题面库检查台。
//
// 这里要防的是「写题面的人和读题面的人对不上」：题面由 olympia-contest 写下，题库和跑样例都去读它，
// 字段名一旦改了而另一边走神，页面上只会剩下一个题号，学生看不出是哪里坏了。
// 所以断言全部从**真实写出的那份 Markdown**出发，不用手搓的样例串。
//
//   node scripts/oneoff/test-problem-library.mjs
//
// 需要先编译两个扩展：
//   npm run gulp -- compile-extension:olympia-contest compile-extension:olympia-onboarding
import Module from 'node:module';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const contestOut = path.join(repoRoot, 'oss/extensions/olympia-contest/out');
const onboardingOut = path.join(repoRoot, 'oss/extensions/olympia-onboarding/out');
const GPP = path.join(repoRoot, 'VSCode-win32-x64/resources/app/toolchain/mingw64/bin/g++.exe');

const messages = [];
const picks = [];
const opened = [];
let registered = {};
let treeProvider;

function uri(fsPath) {
	return { fsPath, scheme: 'file', path: fsPath, toString: () => `file:///${fsPath.replace(/\\/g, '/')}` };
}

/** 每次测试换一个工作区：题库读的是 workspaceFolders[0]，共用一个目录会互相污染。 */
let workspaceRoot = '';
let problemsDir = '';

const vscodeStub = {
	FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 65 },
	StatusBarAlignment: { Left: 1, Right: 2 },
	TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
	DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
	ProgressLocation: { Notification: 15 },
	ThemeIcon: class { constructor(id) { this.id = id; } },
	ThemeColor: class { constructor(id) { this.id = id; } },
	MarkdownString: class { constructor(value) { this.value = value; } },
	TreeItem: class {
		constructor(label, state) { this.label = label; this.collapsibleState = state; }
	},
	RelativePattern: class { constructor(base, pattern) { this.base = base; this.pattern = pattern; } },
	Uri: {
		file: p => uri(p),
		joinPath: (base, ...parts) => uri(path.join(base.fsPath, ...parts)),
		parse: text => uri(text)
	},
	Disposable: {
		from: (...items) => ({ dispose() { for (const item of items) { item?.dispose?.(); } } })
	},
	EventEmitter: class {
		constructor() { this.listeners = []; this.event = listener => { this.listeners.push(listener); return { dispose() { } }; }; }
		fire(value) { for (const listener of this.listeners) { listener(value); } }
		dispose() { }
	},
	workspace: {
		get workspaceFolders() { return [{ uri: uri(workspaceRoot), name: path.basename(workspaceRoot), index: 0 }]; },
		getConfiguration: section => ({
			get: (key, fallback) => {
				const id = `${section}.${key}`;
				if (id === 'olympia.compiler.path') { return GPP; }
				return fallback;
			}
		}),
		asRelativePath: (u, keepDrive = true) => (keepDrive ? u.fsPath : path.basename(u.fsPath)),
		openTextDocument: async u => { opened.push(u.fsPath); return { fileName: u.fsPath, uri: u, getText: () => '' }; },
		createFileSystemWatcher: () => ({
			onDidCreate: () => ({ dispose() { } }),
			onDidDelete: () => ({ dispose() { } }),
			onDidChange: () => ({ dispose() { } }),
			dispose() { }
		}),
		fs: {
			async readFile(u) { return fs.readFileSync(u.fsPath); },
			async writeFile() { },
			async createDirectory() { },
			async delete() { },
			async stat(u) { return { type: fs.statSync(u.fsPath).isDirectory() ? 2 : 1 }; },
			async readDirectory(dir) {
				return fs.readdirSync(dir.fsPath, { withFileTypes: true })
					.map(entry => [entry.name, entry.isDirectory() ? 2 : 1]);
			}
		},
		onDidChangeConfiguration: () => ({ dispose() { } }),
		onDidSaveTextDocument: () => ({ dispose() { } }),
		onDidChangeWorkspaceFolders: () => ({ dispose() { } })
	},
	window: {
		activeTextEditor: undefined,
		showWarningMessage: async (...a) => { messages.push(['warning', a[0]]); return undefined; },
		showInformationMessage: async (...a) => { messages.push(['info', a[0]]); return undefined; },
		showErrorMessage: async (...a) => { messages.push(['error', a[0]]); return undefined; },
		showQuickPick: async (items, options) => {
			const list = Array.isArray(items) ? items : await items;
			picks.push({ items: list, options });
			// 题库的选中逻辑：默认选第一项，测试里要别的自己改 picks 前的 pickIndex
			return pickIndex === undefined ? list[0] : list[pickIndex()];
		},
		showInputBox: async () => undefined,
		showOpenDialog: async () => undefined,
		showTextDocument: async doc => { shown.push(doc.fileName ?? doc.uri?.fsPath); return {}; },
		withProgress: async (_options, task) => task({ report() { } }, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() { } }) }),
		createOutputChannel: title => ({
			title, appendLine() { }, append() { }, clear() { }, show() { }, hide() { }, dispose() { }
		}),
		createStatusBarItem: () => ({ text: '', tooltip: '', command: undefined, show() { }, hide() { }, dispose() { } }),
		createTreeView: (_id, options) => {
			treeProvider = options.treeDataProvider;
			return { dispose() { } };
		},
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
		registerCompletionItemProvider: () => ({ dispose() { } }),
		createDiagnosticCollection: () => ({ set() { }, delete() { }, clear() { }, dispose() { } })
	},
	env: { openExternal: async () => true, clipboard: { readText: async () => '' } },
	extensions: { all: [], getExtension: () => undefined }
};

let pickIndex;
const shown = [];

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') {
		return vscodeStub;
	}
	return originalLoad.call(this, request, parent, isMain);
};

const templates = await import(pathToFileURL(path.join(contestOut, 'templates.js')).href);
const library = await import(pathToFileURL(path.join(contestOut, 'problemLibrary.js')).href);
const contest = await import(pathToFileURL(path.join(contestOut, 'extension.js')).href);
const toolsView = await import(pathToFileURL(path.join(onboardingOut, 'toolsView.js')).href);
const problemFiles = await import(pathToFileURL(path.join(onboardingOut, 'problemFiles.js')).href);

const context = () => ({ subscriptions: [], workspaceState: { get: (_k, d) => d, update: async () => { } } });

let failed = 0;
async function check(name, fn) {
	messages.length = 0;
	picks.length = 0;
	opened.length = 0;
	shown.length = 0;
	pickIndex = undefined;
	try {
		await fn();
		console.log(`ok    ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}\n      ${error.message}`);
	}
}

/** 换一个新的工作区，题面目录按需创建。 */
function freshWorkspace() {
	workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia lib test '));
	problemsDir = path.join(workspaceRoot, '.olympia', 'problems');
	fs.mkdirSync(problemsDir, { recursive: true });
	return problemsDir;
}

/** 用产品自己的 writer 写题面，读不出来就是两边格式对不上，不是测试的锅。 */
function writeStatement(id, title, extra = {}) {
	const file = path.join(problemsDir, `${id}.md`);
	fs.writeFileSync(file, templates.renderStatement({
		id,
		title,
		url: `https://www.luogu.com.cn/problem/${id}`,
		platform: 'luogu',
		statement: '输入两个整数，输出它们的和。',
		inputFormat: '',
		outputFormat: '',
		hint: '',
		tags: extra.tags ?? ['模拟'],
		difficulty: extra.difficulty ?? '入门',
		timeLimit: extra.timeLimit ?? '1000 ms',
		memoryLimit: extra.memoryLimit ?? '128 MB',
		samples: extra.samples ?? [{ input: '3 4', output: '7' }, { input: '1 2', output: '3' }]
	}), 'utf8');
	return file;
}

function touch(file, daysAgo) {
	const when = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
	fs.utimesSync(file, when, when);
}

contest.activate(context());
assert.ok(registered['olympia.problem.openStatement'], '题面库命令必须由 olympia-contest 注册');
toolsView.registerToolsView(context());
assert.ok(treeProvider, 'Olympia 面板必须把 tree provider 交出来');

await check('写出来的题面能被题库原样读回：标题、来源、限时、内存、样例数', async () => {
	freshWorkspace();
	const file = writeStatement('P1001', 'A+B Problem');
	const entries = await library.readLibrary(problemsDir);
	assert.equal(entries.length, 1);
	const entry = entries[0];
	assert.equal(entry.id, 'P1001');
	assert.equal(entry.title, 'A+B Problem');
	assert.equal(entry.source, '洛谷');
	assert.equal(entry.difficulty, '入门');
	assert.equal(entry.timeLimit, '1000 ms');
	assert.equal(entry.memoryLimit, '128 MB');
	assert.equal(entry.sampleCount, 2, '样例数读错，跑样例的题面选择也会跟着错');
	assert.equal(entry.file, file);
});

await check('最近拉的排前面，时间戳一样按题号', async () => {
	freshWorkspace();
	const old = writeStatement('P9999', '老题');
	const mid = writeStatement('P2000', '中间');
	writeStatement('P1001', '最新');
	touch(old, 9);
	touch(mid, 3);
	const entries = await library.readLibrary(problemsDir);
	assert.deepEqual(entries.map(e => e.id), ['P1001', 'P2000', 'P9999']);
	assert.equal(await library.countLibrary(problemsDir), 3, '面板那一行的数字要对得上');
	// 时间戳全一样时也要有稳定顺序，别让列表每次刷新都跳
	const flat = entries.map(e => ({ ...e, mtimeMs: 0 }));
	assert.deepEqual(library.sortByRecent(flat).map(e => e.id), ['P1001', 'P2000', 'P9999']);
});

await check('手写的、只抓了一半的题面也进库，用文件名当题号', async () => {
	freshWorkspace();
	writeStatement('P1001', '正常题面');
	fs.writeFileSync(path.join(problemsDir, 'CF1660C.md'), '# 只有标题没有元信息\n\n正文\n', 'utf8');
	fs.writeFileSync(path.join(problemsDir, 'readme.txt'), '不是题面\n', 'utf8');
	const entries = await library.readLibrary(problemsDir);
	assert.equal(entries.length, 2, '非 .md 文件不该混进题库');
	const hand = entries.find(e => e.id === 'CF1660C');
	assert.ok(hand, '标题行不像题号时，应该退回文件名当题号');
	assert.equal(hand.title, '只有标题没有元信息', '整行都是标题，不该被当成题号');
	assert.equal(hand.sampleCount, 0);
	assert.equal(hand.source, undefined);
});

await check('读不了的文件不让整个题库崩掉', async () => {
	freshWorkspace();
	writeStatement('P1001', '正常题面');
	fs.mkdirSync(path.join(problemsDir, 'broken.md'));    // 同名目录：stat 过得去，readFile 必炸
	const entries = await library.readLibrary(problemsDir);
	assert.equal(entries.length, 2);
	const broken = entries.find(e => e.id === 'broken');
	assert.ok(broken, '读不出来的文件仍然要列出来');
	assert.equal(broken.title, '');
});

await check('题库列表把标题、时限、相对路径都摆出来，中文标题也能搜', async () => {
	freshWorkspace();
	writeStatement('P3371', '【模板】单源最短路径', { timeLimit: '1000 ms' });
	const picksOf = library.toPicks(await library.readLibrary(problemsDir), workspaceRoot);
	assert.equal(picksOf.length, 1);
	const item = picksOf[0];
	assert.equal(item.label, 'P3371 【模板】单源最短路径');
	assert.match(item.description, /洛谷/);
	assert.match(item.description, /时限 1000 ms/);
	assert.match(item.description, /内存 128 MB/);
	assert.match(item.description, /样例 2 组/);
	assert.match(item.detail, /\.olympia/, `detail 应该是相对路径：${item.detail}`);
	assert.match(item.detail, /今天/, `刚拉的题面应该写「今天」：${item.detail}`);
	assert.ok(!path.isAbsolute(item.detail), 'detail 里不该出现整条绝对路径');
});

await check('命令跑起来：列出来的就是题面，选中就打开那一份', async () => {
	freshWorkspace();
	const older = writeStatement('P1001', 'A+B Problem');
	const newer = writeStatement('P1002', '第二季');
	touch(older, 1);
	// 第一项是最近拉的（P1002），这里验证「选中的那份就是打开的那份」
	await registered['olympia.problem.openStatement']();
	assert.equal(picks.length, 1, '没弹出题库列表');
	assert.match(picks[0].options.title, /题面库/);
	assert.equal(picks[0].items.length, 2);
	assert.equal(picks[0].items[0].label, 'P1002 第二季');
	assert.equal(picks[0].options.matchOnDescription, true, '只按 label 搜的话，中文标题搜不到');
	assert.deepEqual(shown, [newer]);
	void newer;
});

await check('一道题都没缓存时给的是指引，不是空列表', async () => {
	freshWorkspace();
	await registered['olympia.problem.openStatement']();
	assert.equal(picks.length, 0, '空库不该弹一个什么都没有的列表');
	assert.match(messages.map(m => m[1]).join('\n'), /拉取题面/, '空库要告诉学生下一步做什么');
});

function sectionOf(id) {
	return { kind: 'section', id, label: id };
}

async function statusRows() {
	await treeProvider.refreshLibrary();
	return treeProvider.getChildren(sectionOf('status'));
}

await check('面板那一行：有题面报份数，没题面就变成「去拉题面」', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	writeStatement('P1002', 'B');
	const rows = await statusRows();
	const text = rows.map(e => `${e.label}：${e.value}`).join('\n');
	assert.match(text, /题面库：2 份/, `面板没报出题面数量：${text}`);
	assert.equal(rows.find(e => e.id === 'library').command, 'olympia.problem.openStatement');

	// 空的缓存目录：数字换成行动指引，点的命令也换成拉题面
	workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia lib empty '));
	const empty = await statusRows();
	assert.match(empty.map(e => `${e.label}：${e.value}`).join('\n'), /题面库：还没拉过题面/);
	assert.equal(empty.find(e => e.id === 'library').command, 'olympia.problem.pull');
});

await check('面板的「题目与模板」里有打开题面库这一行，且写着 Ctrl+Alt+O', () => {
	const actions = treeProvider.getChildren(sectionOf('problems'));
	const row = actions.find(a => a.command === 'olympia.problem.openStatement');
	assert.ok(row, '面板里没有打开题面库的入口');
	assert.equal(row.key, 'Ctrl+Alt+O', '界面写了按钮却不写键位，学生就只能猜');
});

await check('onboarding 自己数的题面数和 contest 数的一致（两处目录口径不能分家）', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	writeStatement('P5000', '另一道');
	const viaPanel = await problemFiles.statementFiles();
	const viaLibrary = await library.readLibrary(problemsDir);
	assert.equal(viaPanel.length, viaLibrary.length, '面板说的份数和题库列表的数量不一样');
});

console.log(failed ? '\nFAILED' : '\nall problem-library assertions passed');
process.exitCode = failed ? 1 : 0;
