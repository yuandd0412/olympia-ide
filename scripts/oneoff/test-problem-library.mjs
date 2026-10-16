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
/** createQuickPick 造出来的替身，按创建顺序排着；测试要点行末的 ★ 就从这里拿。 */
const quickPicks = [];
/** 扩展注册的 webview 视图提供方（题面侧栏），按视图 id 存着。 */
const webviewProviders = new Map();
const opened = [];
/** 编辑器里开着的文档：appendSample 用它判断题面有没有没保存的改动。 */
const textDocuments = [];
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
		textDocuments,
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
		registerWebviewViewProvider: (id, provider) => {
			// 题面侧栏（statementView）在 activate 时注册；这里不需要它渲染，
			// 但没有这个替身，扩展根本 activate 不起来，整份检查台一道题都测不了。
			webviewProviders.set(id, provider);
			return { dispose() { } };
		},
		showQuickPick: async (items, options) => {
			const list = Array.isArray(items) ? items : await items;
			picks.push({ items: list, options });
			// 题库的选中逻辑：默认选第一项，测试里要别的自己改 picks 前的 pickIndex
			return pickIndex === undefined ? list[0] : list[pickIndex()];
		},
		/**
		 * createQuickPick 的替身：题面库用它是因为行末的 ★ 要能点（showQuickPick 给不了 item button）。
		 * show() 之后立刻「选中第一项」，命令才能往下走；想看面板长什么样的测试读 quickPicks 最后一项。
		 */
		createQuickPick: () => {
			const qp = {
				items: [], value: '', title: '', placeholder: '',
				matchOnDescription: false, matchOnDetail: false, ignoreFocusOut: false,
				activeItems: [], _listeners: {},
				onDidAccept: fn => { qp._listeners.accept = fn; return { dispose() { } }; },
				onDidHide: fn => { qp._listeners.hide = fn; return { dispose() { } }; },
				onDidTriggerItemButton: fn => { qp._listeners.itemButton = fn; return { dispose() { } }; },
				show: () => {
					picks.push({
						items: qp.items,
						options: {
							title: qp.title, placeHolder: qp.placeholder,
							matchOnDescription: qp.matchOnDescription, matchOnDetail: qp.matchOnDetail,
							ignoreFocusOut: qp.ignoreFocusOut
						}
					});
					quickPicks.push(qp);
					qp.activeItems = qp.items.slice(0, 1);
					qp._listeners.accept?.();
				},
				/** 假装学生点了某一行行末那颗 ★。 */
				clickStar: async (index = 0) => {
					await qp._listeners.itemButton?.({ item: qp.items[index], button: qp.items[index].buttons[0], index });
				},
				dispose: () => { }
			};
			return qp;
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
		executeCommand: async (id, ...args) => {
			// 真的 VS Code 对没注册的命令是 reject，不是返回 undefined。检查台要照这个脾气来：
			// 题面那条 `${视图 id}.focus` 在这儿没人注册，就该走「退回编辑器」那条路，
			// 否则测试看不见到底打开的是哪一份文件（题面视图本身另有真机核对）。
			if (!Object.hasOwn(registered, id)) { throw new Error(`command '${id}' not found`); }
			return registered[id](...args);
		},
		getDiagnostics: () => []
	},
	languages: {
		getDiagnostics: () => [],
		onDidChangeDiagnostics: () => ({ dispose() { } }),
		registerCompletionItemProvider: () => ({ dispose() { } }),
		createDiagnosticCollection: () => ({ set() { }, delete() { }, clear() { }, dispose() { } })
	},
	env: { openExternal: async u => { externals.push(u?.fsPath ?? String(u)); return externalOk === undefined ? true : externalOk; }, clipboard: { readText: async () => '' } },
	extensions: { all: [], getExtension: () => undefined }
};

let pickIndex;
const shown = [];
/** 交给系统浏览器的链接：打开原题网页那条命令的唯一可见结果。 */
const externals = [];
let externalOk;

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
// 补进题面的样例最终要被跑样例读出来，所以这里用产品自己的解析器验收
const judge = await import(pathToFileURL(path.join(onboardingOut, 'judgeSamples.js')).href);
const judgeParse = markdown => judge.parseSamples(markdown);

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
	textDocuments.length = 0;
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
assert.ok(registered['olympia.problem.openSource'], '打开原题网页命令必须由 olympia-contest 注册');
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

await check('从面板加自定义样例：挑一道题，末尾多一组空的占位样例并把题面打开', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	const append = registered['olympia.problem.appendSample'];
	assert.ok(append, 'olympia.problem.appendSample 必须由 olympia-contest 注册');
	const before = fs.readFileSync(path.join(problemsDir, 'P1001.md'), 'utf8');
	await append();
	assert.equal(picks.length, 1, '没弹出让学生选题面的列表');
	assert.match(picks[0].options.title, /哪道题/);
	const after = fs.readFileSync(path.join(problemsDir, 'P1001.md'), 'utf8');
	assert.ok(after.startsWith(before.slice(0, 200)), '加样例不该重写整份题面');
	assert.match(after, /### 样例 3/, `题面里两组样例，新加的应该叫样例 3：\n${after}`);
	assert.match(after, /自己加的样例/, '要留一句提示，告诉学生往哪填');
	assert.match(shown.join('\n'), /P1001\.md$/, '加完应该直接把题面打开让人填');
	// 空的期望输出不能被当成答案：跑样例那边按「没填完」跳过
	const parsed = judgeParse(after);
	assert.equal(parsed.samples.length, 3);
	assert.equal(parsed.samples[2].expected.trim(), '');
});

await check('只给了一半数据就不写，别留一组判不了的样例在题面里', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	const before = fs.readFileSync(path.join(problemsDir, 'P1001.md'), 'utf8');
	const ok = await registered['olympia.problem.appendSample']({ hint: 'P1001', input: '1 2' });
	assert.equal(ok, false, '少了期望输出却继续写了');
	assert.match(messages.map(m => m[1]).join('\n'), /同时给出/);
	assert.equal(fs.readFileSync(path.join(problemsDir, 'P1001.md'), 'utf8'), before, '题面被动过了');
});

await check('题面在编辑器里有没保存的改动时先停手，别把人的改动盖掉', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	const file = path.join(problemsDir, 'P1001.md');
	const before = fs.readFileSync(file, 'utf8');
	textDocuments.push({ isDirty: true, uri: uri(file) });
	const ok = await registered['olympia.problem.appendSample']({ hint: 'P1001', input: '1 2', output: '3' });
	assert.equal(ok, false, '题面还没保存就把样例写进去了');
	assert.equal(fs.readFileSync(file, 'utf8'), before, '编辑器里没保存的改动被盖掉了');
	assert.match(messages.map(m => m[1]).join('\n'), /没保存的改动/, '要让学生知道先去保存');
	// 保存之后（不再 dirty）同一次补样例就该写进去
	textDocuments.length = 0;
	assert.equal(await registered['olympia.problem.appendSample']({ hint: 'P1001', input: '1 2', output: '3' }), true, '保存以后还是不肯写');
	assert.match(fs.readFileSync(file, 'utf8'), /### 样例 3/, '补的样例没进题面');
});

// 「做过的题」是 olympia-onboarding 写的解题记录，题库这边只读——两边共用一个文件，
// 字段名对不上就是一道道看不出勾的题，所以这里坚持用**写入方**造数据。
const favorites = await import(pathToFileURL(path.join(contestOut, 'favorites.js')).href);

await check('题面库的 ★ 点得动：写进工程的 .olympia/favorites.json，重读回来排在最前', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	writeStatement('P2001', '并查集');
	await registered['olympia.problem.openStatement']();
	const qp = quickPicks.at(-1);
	assert.ok(qp, '题库没有用 createQuickPick 打开（行末按钮需要它）');
	assert.equal(qp.items.length, 2, `题库列出了 ${qp.items.length} 道`);
	assert.ok(qp.items.every(item => item.buttons?.length === 1), '每一行都要有一颗能点的收藏按钮');
	assert.equal(qp.items[0].buttons[0].iconPath.id, 'star-empty', '没收藏的行应该是空心星');

	const clicked = qp.items.at(-1).entry.id;
	// 点的必须是「最近拉取」排在最后的那一道：两道题里点第一道，收藏不排前也看不出差别，
	// 那条断言就成了空的（反向验证时把 sort 删掉它照样绿——真发生过）。
	await qp.clickStar(qp.items.length - 1);

	const file = path.join(workspaceRoot, '.olympia', 'favorites.json');
	assert.ok(fs.existsSync(file), `点了 ★ 却没写出 ${file}`);
	assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), [clicked.toLowerCase()], '写进去的不是被点的那道题');

	// 图标翻转 + 排序：收藏的那道带着 ★ 排到最前，另一道不带。
	assert.equal(qp.items[0].entry.id, clicked, `点完 ★ 它没跳到第一行：${qp.items.map(i => i.entry.id).join(', ')}`);
	assert.equal(qp.items.find(i => i.entry.id === clicked).buttons[0].iconPath.id, 'star-full', '已收藏的行还是空心星');
	const again = await favorites.readFavorites();
	assert.equal(again.size, 1, '读回来的收藏数不对');
	const entries = await library.readLibrary(problemsDir);
	const ps = library.toPicks(entries, workspaceRoot, new Map(), again);
	assert.equal(ps[0].entry.id, clicked, `收藏的题没排在最前：${ps.map(p => p.entry.id).join(', ')}`);
	assert.ok(ps[0].label.startsWith('★ '), `星标要写在 label 里，搜「★」才只剩收藏的题：${ps[0].label}`);
	assert.ok(!ps[1].label.includes('★'));
	assert.match(ps[0].description, /已收藏/, `摘要里也要说清这道收藏了：${ps[0].description}`);

	// 再点一次取消——留着「只能加不能减」的收藏等于没有收藏。
	await qp.clickStar(0);
	assert.equal((await favorites.readFavorites()).size, 0, '再点一次没有取消收藏');

	// 按钮是题库这条调用方自己挂的：别的清单（打开原题网页）没有处理按钮的逻辑。
	const plain = library.toPicks(entries, workspaceRoot);
	assert.ok(plain.every(p => p.buttons === undefined), 'toPicks 不该自带按钮，否则点了没反应的地方就多一个假图标');
});

await check('收藏文件坏了或没有，题库照常打开（不能让一个 json 卡住整个清单）', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	fs.mkdirSync(path.join(workspaceRoot, '.olympia'), { recursive: true });
	fs.writeFileSync(path.join(workspaceRoot, '.olympia', 'favorites.json'), '{不是数组]');
	assert.equal((await favorites.readFavorites()).size, 0, '坏文件应该当没有，而不是抛出来');
	await registered['olympia.problem.openStatement']();
	assert.equal(quickPicks.at(-1).items.length, 1, '收藏文件坏了，题库干脆不列了');
});

const solveLog = await import(pathToFileURL(path.join(onboardingOut, 'solveLog.js')).href);
const marks = await import(pathToFileURL(path.join(contestOut, 'solvedMarks.js')).href);

/** 用产品自己的写入方记 N 次 AC（不是手写 JSON：手写就等于绕过那两个扩展）。 */
async function acOf(problem, times = 1) {
	for (let i = 0; i < times; i++) {
		await solveLog.recordSolve({ problem, title: `${problem} 的标题`, at: new Date().toISOString(), ms: 12 });
	}
}
const solvesFileOf = () => path.join(workspaceRoot, '.olympia', 'solves.json');
const pickOf = id => picks[0].items.find(item => item.entry.id === id);

await check('做过一次的题在题库里带勾，没做过的不带；标题说清做了几道', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	writeStatement('P1002', '第二季');
	await acOf('P1001');
	await registered['olympia.problem.openStatement']();
	const done = pickOf('P1001');
	assert.match(done.label, /^✓ P1001 /, `做出来的题该带勾：${done.label}`);
	assert.match(done.description, /已 AC/, `描述要写出做没做过：${done.description}`);
	assert.equal(done.solvedTimes, 1);
	const todo = pickOf('P1002');
	assert.ok(!todo.label.startsWith('✓'), `没做过的题被标成做过了：${todo.label}`);
	assert.equal(todo.solvedTimes, 0);
	assert.match(picks[0].options.title, /缓存 2 道，已 AC 1 道/, picks[0].options.title);
	assert.match(picks[0].options.placeHolder, /敲 AC/, '要告诉学生怎么只看做出来的');
	// 打勾不能把「选中就是打开那一份」弄坏（第一项按 mtime/题号排，不假设是哪道）
	assert.deepEqual(shown, [picks[0].items[0].entry.file], '题库打开的不是选中的那一行');
});

await check('两次 AC 同一道题就写「已 AC 2 次」', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	await acOf('P1001', 2);
	await registered['olympia.problem.openStatement']();
	assert.match(pickOf('P1001').description, /已 AC 2 次/, pickOf('P1001').description);
	assert.equal(pickOf('P1001').solvedTimes, 2);
});

await check('题号大小写不一样也算同一道题', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	await acOf('p1001');
	const found = await marks.solvedMarks();
	assert.ok(marks.markOf(found, 'P1001'), '记录里写 p1001，题面文件叫 P1001，就该认出来');
});

await check('没有解题记录时题库照旧：不吹「已 AC 0 道」，也不打勾', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	writeStatement('P1002', 'B');
	await registered['olympia.problem.openStatement']();
	assert.equal(fs.existsSync(solvesFileOf()), false, '这个检查台不该凭空写出记录文件');
	assert.match(picks[0].options.title, /缓存了 2 道题/, picks[0].options.title);
	assert.ok(!picks[0].options.title.includes('已 AC'));
	assert.ok(!picks[0].items.some(item => item.label.startsWith('✓')));
});

await check('记录文件坏了不能把题库带崩', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	fs.mkdirSync(path.dirname(solvesFileOf()), { recursive: true });
	fs.writeFileSync(solvesFileOf(), '{ 这不是 JSON', 'utf8');
	await registered['olympia.problem.openStatement']();
	assert.equal(picks.length, 1, '记录读不出来，题库干脆不弹了');
	assert.ok(!pickOf('P1001').label.startsWith('✓'));
});

await check('写入方数的道数和读取方一致（两个扩展对同一份文件的理解不能分家）', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	writeStatement('P1002', 'B');
	await acOf('P1001', 3);
	await acOf('P1002');
	const written = new Set((await solveLog.readSolves()).map(r => r.problem.toLowerCase()));
	const read = await marks.solvedMarks();
	assert.equal(read.size, written.size, `题面库认出的题数（${read.size}）和解题记录写的（${written.size}）不一样`);
	assert.equal(read.get('p1001').times, 3, '次数没跟着记录走');
	assert.ok(JSON.parse(fs.readFileSync(solvesFileOf(), 'utf8')).length === 4, '写入方自己数的条数也对不上');
});

await check('打开原题网页：当前是 P1001.cpp，就把题面里那条链接交给浏览器', async () => {
	freshWorkspace();
	const first = writeStatement('P1001', 'A+B Problem');
	writeStatement('P2001', '另一道');
	touch(first, 1);          // 让 P2001 成为最近拉的那道：认错题就会打开另一道，断言才不会空转
	const solution = path.join(workspaceRoot, 'P1001.cpp');
	fs.writeFileSync(solution, '#include <bits/stdc++.h>\n', 'utf8');
	vscodeStub.window.activeTextEditor = { document: { uri: uri(solution), fileName: solution } };
	externals.length = 0;
	picks.length = 0;
	await registered['olympia.problem.openSource']();
	assert.deepEqual(externals, ['https://www.luogu.com.cn/problem/P1001'], `看到的是：${externals.join(', ')}`);
	assert.equal(picks.length, 0, '当前文件已经认出题号，不该再多问一次选哪道');
	// 题面文件自己开着时也要能用：认的是文件名，不是当前那个文件的内容。
	vscodeStub.window.activeTextEditor = { document: { uri: uri(first), fileName: first } };
	externals.length = 0;
	await registered['olympia.problem.openSource']();
	assert.deepEqual(externals, ['https://www.luogu.com.cn/problem/P1001'], '题面文件自己打不开原页就等于这条命令少一半场合');
	vscodeStub.window.activeTextEditor = undefined;
});

await check('没打开文件时去题面库里挑一道，而不是抱怨一句就收场', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	writeStatement('P2001', '剪贴板那道');
	externals.length = 0;
	picks.length = 0;
	pickIndex = () => 1;
	await registered['olympia.problem.openSource']();
	assert.equal(picks.length, 1, '没打开文件时没给出题库清单');
	assert.deepEqual(picks[0].items.map(item => item.entry.id).sort(), ['P1001', 'P2001'], '清单里就是缓存的那两道');
	// 开的是选中的那一道，不是列表第一项：按 pick 的结果断言，不猜题库的排序。
	assert.deepEqual(externals, [picks[0].items[1].entry.url], `选中的那道没打开：${externals.join(', ')}`);
	pickIndex = undefined;
});

await check('手写的题面没有链接：说明白，别开一个空白页', async () => {
	freshWorkspace();
	const file = path.join(problemsDir, '我的题面.md');
	fs.writeFileSync(file, '# 我的题面\n\n输入两个整数。\n', 'utf8');
	const solution = path.join(workspaceRoot, '我的题面.cpp');
	fs.writeFileSync(solution, 'int main(){}\n', 'utf8');
	vscodeStub.window.activeTextEditor = { document: { uri: uri(solution), fileName: solution } };
	const before = messages.length;
	externals.length = 0;
	await registered['olympia.problem.openSource']();
	assert.equal(externals.length, 0, '没有链接还是叫了浏览器');
	assert.match(messages.slice(before).map(m => m[1]).join('\n'), /没有可用的原文链接/);
	vscodeStub.window.activeTextEditor = undefined;
});

await check('题面被人手改成 file:/// 之类的地址：不交给系统', async () => {
	freshWorkspace();
	const file = path.join(problemsDir, 'P1001.md');
	fs.writeFileSync(file, '# P1001 A+B Problem\n\n> 原文链接：file:///C:/Windows/win.ini\n', 'utf8');
	const solution = path.join(workspaceRoot, 'P1001.cpp');
	fs.writeFileSync(solution, 'int main(){}\n', 'utf8');
	vscodeStub.window.activeTextEditor = { document: { uri: uri(solution), fileName: solution } };
	externals.length = 0;
	await registered['olympia.problem.openSource']();
	assert.equal(externals.length, 0, `题面是能改的文本，非 http 的地址不该被打开：${externals.join(', ')}`);
	vscodeStub.window.activeTextEditor = undefined;
});

await check('浏览器没接手这个链接时说一句，不让学生对着没反应的界面猜', async () => {
	freshWorkspace();
	writeStatement('P1001', 'A+B Problem');
	const solution = path.join(workspaceRoot, 'P1001.cpp');
	fs.writeFileSync(solution, 'int main(){}\n', 'utf8');
	vscodeStub.window.activeTextEditor = { document: { uri: uri(solution), fileName: solution } };
	externalOk = false;
	const before = messages.length;
	await registered['olympia.problem.openSource']();
	assert.match(messages.slice(before).map(m => m[1]).join('\n'), /系统没有接手这个链接/);
	externalOk = undefined;
	vscodeStub.window.activeTextEditor = undefined;
});

await check('面板的「题目与模板」里有打开原题网页这一行，且写着 Ctrl+Alt+U', () => {
	const actions = treeProvider.getChildren(sectionOf('problems'));
	const row = actions.find(a => a.command === 'olympia.problem.openSource');
	assert.ok(row, '面板里没有打开原题网页的入口');
	assert.equal(row.label, '打开原题网页', '面板写的名字要和命令面板的标题是同一句');
	assert.equal(row.key, 'Ctrl+Alt+U', '界面写了按钮却不写键位，学生就只能猜');
});

console.log(failed ? '\nFAILED' : '\nall problem-library assertions passed');
process.exitCode = failed ? 1 : 0;
