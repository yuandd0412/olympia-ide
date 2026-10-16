// 集训清单检查台：一份命名题单 + 时长，存在工程的 .olympia/practice.json 里。
//
// 要防的三件很实在的事：
//   1. 清单写进去了却和面板说的不是同一个文件（两个扩展不能互相 import，只能靠检查台拴住）。
//   2. 「开始这一场」把时长弄丢了：清单上写 120 分钟，结果又弹一次问时长，或者变成 0 分钟。
//   3. 勾没打：做过的题在清单里看不出来，等于让学生重新想哪道还没 AC。
// 所以断言读的是磁盘上的文件和 executeCommand 真正带过去的参数，不看提示文字。
//
//   node scripts/oneoff/test-practice-list.mjs
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
const onboardingSrc = path.join(repoRoot, 'oss/extensions/olympia-onboarding/src');

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia-practice-'));
let noWorkspace = false;
let settings = {};
let registered = {};
const executed = [];
const shown = [];
const picks = [];
const messages = [];
/**
 * AI 补空那条命令（`olympia.ai.extract`）由 olympia-coach 注册，两个扩展之间只有命令，
 * 所以这里自己挂一个假的：叫没叫、叫了几次、交回去什么，全在这几张表上。
 */
const extractCalls = [];
let extractReply;
let extractThrows = false;
let activations = 0;
/** coach 这个扩展装没装：没装的时候拉题面照样得走完，只是没有 AI 那一趟。 */
let coachHandle;
/** showInputBox 按队列给值：用完就是「取消」（undefined），这样每一步的取消都能单独测。 */
let inputs = [];
/** showQuickPick 按队列给值：数字是下标，函数是 find。 */
let choices = [];
let warnReply;

/** 扩展注册的 webview 视图提供方（题面侧栏），按视图 id 存着。 */
const webviewProviders = new Map();
function uri(fsPath) {
	return { fsPath, scheme: 'file', path: fsPath, toString: () => `file:///${fsPath.replace(/\\/g, '/')}` };
}

const vscodeStub = {
	ProgressLocation: { Notification: 15 },
	// 题库列表行末那颗 ★ 是 problemLibrary.js 模块级 new vscode.ThemeIcon(...) 建出来的：
	// 桩里没有这个类，import 就炸，整份检查台一道也跑不了。
	ThemeIcon: class { constructor(id) { this.id = id; } },
	ThemeColor: class { constructor(id) { this.id = id; } },
	RelativePattern: class { constructor(base, pattern) { this.base = base; this.pattern = pattern; } },
	Uri: {
		file: p => uri(p),
		joinPath: (base, ...parts) => uri(path.join(base.fsPath, ...parts)),
		parse: text => uri(text)
	},
	Disposable: { from: (...items) => ({ dispose() { for (const item of items) { item?.dispose?.(); } } }) },
	EventEmitter: class {
		constructor() { this.listeners = []; this.event = listener => { this.listeners.push(listener); return { dispose() { } }; }; }
		fire(value) { for (const listener of this.listeners) { listener(value); } }
		dispose() { }
	},
	workspace: {
		get workspaceFolders() { return noWorkspace ? undefined : [{ uri: uri(workspace), name: path.basename(workspace), index: 0 }]; },
		textDocuments: [],
		getConfiguration: section => ({ get: (key, fallback) => settings[`${section}.${key}`] ?? fallback }),
		asRelativePath: u => path.basename(u.fsPath),
		openTextDocument: async u => ({ fileName: u.fsPath, uri: u, getText: () => fs.readFileSync(u.fsPath, 'utf8') }),
		// 题面侧栏 show() 之前会先盯住那一份文件（statementView.watch），桩不给一个 watcher 就半路崩。
		createFileSystemWatcher: () => ({
			onDidCreate: () => ({ dispose() { } }),
			onDidDelete: () => ({ dispose() { } }),
			onDidChange: () => ({ dispose() { } }),
			dispose() { }
		}),
		onDidChangeConfiguration: () => ({ dispose() { } }),
		onDidSaveTextDocument: () => ({ dispose() { } })
	},
	window: {
		get activeTextEditor() { return undefined; },
		showWarningMessage: async (...a) => { messages.push(['warning', a[0]]); return warnReply; },
		showInformationMessage: async (...a) => { messages.push(['info', a[0]]); return undefined; },
		showErrorMessage: async (...a) => { messages.push(['error', a[0]]); return undefined; },
		showQuickPick: async items => {
			const list = Array.isArray(items) ? items : await items;
			picks.push(list);
			const choice = choices.shift();
			if (choice === null) { return undefined; }   // 学生按 Esc：菜单关了
			if (choice === undefined) { return list[0]; }
			return typeof choice === 'function' ? list.find(choice) : list[choice];
		},
		showInputBox: async () => inputs.shift(),
		showTextDocument: async doc => { shown.push(doc.fileName ?? doc.uri?.fsPath); return {}; },
		withProgress: async (_options, task) => task({ report() { } }, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() { } }) }),
		createOutputChannel: title => ({ title, appendLine() { }, append() { }, show() { }, dispose() { } }),
		// 题面侧栏（statementView）在 activate 时注册；这里不需要它渲染，但没有这个替身，
		// olympia-contest 根本 activate 不起来，整份检查台一道也跑不了。
		registerWebviewViewProvider: (id, provider) => {
			webviewProviders.set(id, provider);
			return { dispose() { } };
		},
		onDidChangeActiveTextEditor: () => ({ dispose() { } })
	},
	commands: {
		registerCommand: (id, handler) => { registered[id] = handler; return { dispose() { } }; },
		// 真的 VS Code 执行没注册的命令是 reject，不是返回 undefined：题面侧栏那条
		// `olympia.statement.focus` 在这儿没人注册，就该走「退回编辑器」那条路，检查台才看得见
		// 到底打开了哪一份文件。这里照实 reject，只是顺手把参数记下来，让「叫过几次」可断言。
		// focus 属于视图自己（真 IDE 里由核心注册），不是跨扩展的一次调用，不进 executed，
		// 免得把「本地有题面就不该去拉」那类断言弄脏。
		executeCommand: async (id, ...args) => {
			if (registered[id]) { return registered[id](...args); }
			if (!id.endsWith('.focus')) { executed.push({ id, args }); }
			throw new Error(`command '${id}' not found`);
		}
	},
	languages: { registerCompletionItemProvider: () => ({ dispose() { } }) },
	env: { openExternal: async () => true, clipboard: { readText: async () => '' } },
	extensions: {
		all: [],
		getExtension: id => (id === 'olympia.olympia-coach' ? coachHandle : undefined),
	},
};

/** 拉题面不能联网：把 './net' 换成假页面，产品自己的解析器读假页面写出真题面。 */
const fakeNet = {
	async fetchText(url) {
		// 一道「除了说明以外全都齐」的洛谷题：题面够长、格式与样例都在。
		// 空说明不该触发一次 AI 改写，这条正是旧版 enrich.rs 里那条用例。
		if (/\/problem\/P8888\b/.test(url)) {
			const ctx = {
				data: {
					problem: {
						pid: 'P8888',
						name: '完整题面',
						contenu: {
							description: '给定两个整数 a 和 b，请你输出它们的和。这道题的题面、输入格式、输出格式和样例都已经从洛谷页面里的结构化数据取全了，只有说明那一栏是空的——而这种题本来就没有说明。',
							formatI: '一行两个整数，以空格分隔。',
							formatO: '一行一个整数。',
							hint: '',
						},
						samples: [['3 4', '7']],
						limits: { time: [1000], memory: [131072] },
						difficulty: 2
					}
				}
			};
			return { status: 200, finalUrl: url, body: `<script id="lentille-context" type="application/json">${JSON.stringify(ctx)}</script>` };
		}
		// AtCoder：题面、输入格式、输出格式都抓到了，只有样例输出那一格空着——
		// 就是爬虫碰上线路不对时会漏掉、值得补一次的那种。
		if (/atcoder\.jp/.test(url)) {
			return {
				status: 200, finalUrl: url, body: `<html><head><title>ABC300 A - Duplicate</title></head><body>
<div class="part"><section><h3>Problem Statement</h3><p>You are given a sequence of N integers A1, A2, AN. Find the value that appears more than once in the sequence, and print it in the order the values appear from first to last.</p></section></div>
<div class="part"><section><h3>Input</h3><pre>N
A1 A2 AN</pre></section></div>
<div class="part"><section><h3>Output</h3><pre>Print the answer in one line.</pre></section></div>
<div class="part"><section><h3>Sample Input 1</h3><pre>4
3 1 4 1</pre></section></div>
<div class="part"><section><h3>Sample Output 1</h3><pre></pre></section></div>
</body></html>`
			};
		}
		// Codeforces：题面网页挡着人机校验，只有元信息，正文压根没抓回来。
		if (/codeforces\.com/.test(url)) {
			return { status: 503, finalUrl: url, body: '<html><head><title>Just a moment...</title></head><body><div class="cf-browser-verification">请稍候</div></body></html>' };
		}
		const pid = /\/problem\/(P\d+)/.exec(url)?.[1] ?? 'P1001';
		const ctx = {
			data: {
				problem: {
					pid,
					name: 'A+B Problem',
					contenu: { description: '输入两个整数，输出它们的和。', formatI: '一行两个整数。', formatO: '一行一个整数。', hint: '' },
					samples: [['3 4', '7']],
					limits: { time: [1000], memory: [131072] },
					difficulty: 2
				}
			}
		};
		return { status: 200, finalUrl: url, body: `<script id="lentille-context" type="application/json">${JSON.stringify(ctx)}</script>` };
	}
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	if (request === './net') { return fakeNet; }
	return originalLoad.call(this, request, parent, isMain);
};

const templates = await import(pathToFileURL(path.join(contestOut, 'templates.js')).href);
const contest = await import(pathToFileURL(path.join(contestOut, 'extension.js')).href);
const practice = await import(pathToFileURL(path.join(contestOut, 'practiceList.js')).href);
const enrich = await import(pathToFileURL(path.join(contestOut, 'enrich.js')).href);
const onboardingFiles = await import(pathToFileURL(path.join(onboardingOut, 'problemFiles.js')).href);
const solveLog = await import(pathToFileURL(path.join(onboardingOut, 'solveLog.js')).href);
Module._load = originalLoad;

const listFile = () => path.join(workspace, templates.TEMPLATE_FOLDER, practice.PRACTICE_FILE);
const statementFile = id => path.join(workspace, templates.TEMPLATE_FOLDER, 'problems', `${id}${templates.STATEMENT_EXTENSION}`);
const readDisk = () => JSON.parse(fs.readFileSync(listFile(), 'utf8'));
function reset(overrides = {}) {
	inputs = [];
	choices = [];
	executed.length = 0;
	shown.length = 0;
	picks.length = 0;
	messages.length = 0;
	warnReply = undefined;
	extractCalls.length = 0;
	extractReply = undefined;
	extractThrows = false;
	activations = 0;
	coachHandle = undefined;
	settings = { ...overrides };
}
const said = () => messages.map(m => m[1]).join('\n');
/** 每个改清单的检查都用这份起点，免得上一条检查留下的状态把下一条带偏。 */
async function seedFirstDay(problems = ['P1001', 'P1002'], minutes = 60) {
	await practice.writeLists([minutes === undefined ? { name: '第一天', problems, createdAt: '' } : { name: '第一天', problems, minutes, createdAt: '' }]);
}

let failed = 0;
async function check(name, body) {
	try {
		await body();
		console.log(`ok    ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}\n      ${error.message}`);
	}
}

const context = () => ({ subscriptions: [], workspaceState: { get: (_k, d) => d, update: async () => { } } });
contest.activate(context());

/** 假的 `olympia.ai.extract`：只记被叫了几次、交回什么，别真去联网。 */
const extractHandler = async request => {
	extractCalls.push(request);
	if (extractThrows) { throw new Error('模型离线：连不上'); }
	return extractReply;
};
registered[enrich.EXTRACT_COMMAND] = extractHandler;

/**
 * 假的 `olympia.contestMode`：计时和锁 AI 都归 olympia-onboarding（那边另有检查台
 * test-contest-gate），这里只把清单交出去的分钟数记下来——「点了真的叫了命令」全靠这张表。
 * 桩对没注册的命令是 reject（和真 VS Code 一样），所以这条得真的注册上，
 * 否则「开始这一场」走的是「入门扩展没在运行」那条退路，测的就不是清单了。
 */
registered['olympia.contestMode'] = async (...args) => { executed.push({ id: 'olympia.contestMode', args }); };

await check('两个扩展说的是同一个文件：面板标签 = contest 真的写的那个路径', () => {
	assert.equal(onboardingFiles.PRACTICE_PATH_LABEL, `${templates.TEMPLATE_FOLDER}/${practice.PRACTICE_FILE}`);
	const view = fs.readFileSync(path.join(onboardingSrc, 'toolsView.ts'), 'utf8');
	assert.ok(view.includes('PRACTICE_PATH_LABEL'), '面板那一行应该用常量，不要手写路径');
	assert.ok(!view.includes(onboardingFiles.PRACTICE_PATH_LABEL), '面板里又把路径写成了字面量');
});

await check('题号怎么隔开都认：空格、逗号、顿号、换行，重复的只留第一次', () => {
	assert.deepEqual(practice.parseProblemIds('P1001, P1002、P1001\np1002  1660C'), ['P1001', 'P1002', '1660C']);
	assert.deepEqual(practice.parseProblemIds('   '), []);
});

await check('清单不是习题册：题号再多也只留前 100 个', () => {
	const many = Array.from({ length: practice.MAX_PRACTICE_PROBLEMS + 30 }, (_v, i) => `P${i}`).join(' ');
	assert.equal(practice.parseProblemIds(many).length, practice.MAX_PRACTICE_PROBLEMS);
});

await check('时长只认范围内的整数：空着算「不设时限」，4 分钟和 601 分钟都不收', () => {
	assert.equal(practice.parseMinutes(''), undefined);
	assert.equal(practice.parseMinutes('  '), undefined);
	assert.equal(practice.parseMinutes('120'), 120);
	assert.equal(practice.parseMinutes(String(practice.PRACTICE_MINUTES_MIN)), practice.PRACTICE_MINUTES_MIN);
	assert.equal(practice.parseMinutes(String(practice.PRACTICE_MINUTES_MAX)), practice.PRACTICE_MINUTES_MAX);
	assert.equal(practice.parseMinutes('4'), undefined);
	assert.equal(practice.parseMinutes('601'), undefined);
	assert.equal(practice.parseMinutes('2.5'), undefined);
	assert.equal(practice.parseMinutes('abc'), undefined);
});

await check('写进去再读回来：名字、题号、时长一个不丢', async () => {
	const list = { name: 'CSP-J 模拟 3', problems: ['P1001', 'P1002'], minutes: 90, createdAt: new Date().toISOString() };
	assert.equal(await practice.writeLists([list]), undefined, '写成时返回 undefined，返回的不是失败原因');
	assert.equal(fs.existsSync(listFile()), true, `清单没落在 ${onboardingFiles.PRACTICE_PATH_LABEL}`);
	const back = await practice.readLists();
	assert.equal(back.length, 1);
	assert.deepEqual(back[0].problems, ['P1001', 'P1002']);
	assert.equal(back[0].minutes, 90);
});

await check('文件坏了或条目缺字段：丢掉那一条，别让面板打不开', async () => {
	fs.writeFileSync(listFile(), '{这不是 JSON', 'utf8');
	assert.deepEqual(await practice.readLists(), []);
	fs.writeFileSync(listFile(), JSON.stringify({ lists: [{ name: '  ' }, { name: '没题的' }, { name: '好的', problems: ['P1'] }] }), 'utf8');
	const back = await practice.readLists();
	assert.deepEqual(back.map(item => item.name), ['好的']);
});

await check('同名清单顶掉旧的：改题目不用先删', async () => {
	const a = { name: ' Week 1', problems: ['P1'], createdAt: '' };
	const b = { name: 'week 1 ', problems: ['P2', 'P3'], createdAt: '' };
	const merged = practice.mergeLists(await practice.readLists(), a);
	assert.deepEqual(merged.map(item => item.name), ['好的', ' Week 1']);
	const replaced = practice.mergeLists(merged, b);
	const week = replaced.filter(item => item.name.trim().toLowerCase() === 'week 1');
	assert.equal(week.length, 1, '同名清单应该只剩一份');
	assert.deepEqual(week[0].problems, ['P2', 'P3']);
});

await check('新建走完三步：文件里就是那三样东西，紧接着弹出这份清单', async () => {
	fs.rmSync(path.dirname(listFile()), { recursive: true, force: true });
	reset();
	inputs = ['NOIP 2026 模拟', 'P1001 P1002 P7076', '120'];
	await registered['olympia.practice.new']();
	const disk = readDisk();
	assert.equal(disk.lists.length, 1);
	assert.deepEqual(disk.lists[0], { name: 'NOIP 2026 模拟', problems: ['P1001', 'P1002', 'P7076'], minutes: 120, createdAt: disk.lists[0].createdAt });
	// 建完直接进这份清单的菜单，省一次「再点一次集训清单」
	assert.equal(picks.length, 1, '建完应该立刻打开这份清单的菜单');
	assert.equal(picks[0][0].label, '开始这一场');
	assert.equal(picks[0].filter(item => item.problemId).length, 3);
});

await check('第二步取消：什么都不写，不留半份清单', async () => {
	fs.rmSync(path.dirname(listFile()), { recursive: true, force: true });
	reset();
	inputs = ['半份清单'];
	await registered['olympia.practice.new']();
	assert.equal(fs.existsSync(listFile()), false, '取消之后不该留下清单文件');
});

await check('题号一个都没填：说清楚怎么填，不建空清单', async () => {
	reset();
	inputs = ['空的', '   ', undefined];
	await registered['olympia.practice.new']();
	assert.match(said(), /一道题都没有/);
	assert.equal(fs.existsSync(listFile()), false);
});

await check('没打开文件夹：说出清单要存在哪，不硬建文件', async () => {
	reset();
	noWorkspace = true;
	inputs = ['哪里都存不了', 'P1', ''];
	await registered['olympia.practice.new']();
	assert.match(said(), new RegExp(onboardingFiles.PRACTICE_PATH_LABEL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
	noWorkspace = false;
});

await check('清单列表：标题报份数，行上写「N 题 · 已 AC x」，勾由另一个扩展写的那条记录来', async () => {
	fs.rmSync(path.dirname(listFile()), { recursive: true, force: true });
	await practice.writeLists([
		{ name: '第一天', problems: ['P1001', 'P1002'], minutes: 60, createdAt: '' },
		{ name: '图论专题', problems: ['P3371', 'P3366'], createdAt: '' }
	]);
	// AC 记录由产品自己的写入方产生（不手抄），清单这边只是读回来
	await solveLog.recordSolve({ problem: 'P1001', title: 'A+B Problem', at: new Date().toISOString(), ms: 10 });
	await solveLog.recordSolve({ problem: 'P1002', title: 'A+B Problem', at: new Date().toISOString(), ms: 12 });
	reset();
	choices = [0];
	await registered['olympia.practice.open']();
	assert.equal(picks.length, 2, '先选清单，再进这份清单的菜单');
	assert.match(picks[0][0].description, /^2 题 · 已 AC 2$/);
	assert.match(picks[0][1].description, /^2 题 · 已 AC 0$/);
	assert.equal(picks[0][0].detail, '一场 60 分钟');
	assert.equal(picks[0][1].detail, '不设时限');
	// 进了「第一天」：两道都做过的题该带勾
	assert.match(picks[1].find(item => item.problemId === 'P1001').label, /^✓ P1001$/);
	assert.match(picks[1].find(item => item.problemId === 'P1001').description, /已 AC 1 次/);
});

await check('开始这一场：清单上的分钟数真的交给比赛模式，不是一次「点了没反应」', async () => {
	reset();
	choices = [0, item => item.action === 'start'];
	await registered['olympia.practice.open']();
	assert.deepEqual(executed, [{ id: 'olympia.contestMode', args: [60] }]);
});

await check('清单没设时长：把 undefined 交出去，让比赛模式照旧问', async () => {
	reset();
	choices = [item => item.label === '图论专题', item => item.action === 'start'];
	await registered['olympia.practice.open']();
	assert.deepEqual(executed, [{ id: 'olympia.contestMode', args: [undefined] }]);
});

await check('题面已经缓存：点一道题就是打开那个文件', async () => {
	fs.mkdirSync(path.dirname(statementFile('P1001')), { recursive: true });
	fs.writeFileSync(statementFile('P1001'), '# P1001 A+B Problem\n', 'utf8');
	reset();
	choices = [0, item => item.problemId === 'P1001'];
	await registered['olympia.practice.open']();
	assert.deepEqual(shown, [statementFile('P1001')]);
	assert.equal(executed.length, 0, '本地有题面就不该去拉');
});

await check('还没拉过的题：点一下就走去拉，写出来的题面下次直接是「题面在本地」', async () => {
	reset();
	choices = [item => item.label === '图论专题', item => item.problemId === 'P3371'];
	await registered['olympia.practice.open']();
	assert.equal(fs.existsSync(statementFile('P3371')), true, '没缓存的题应该被拉下来');
	reset();
	choices = [item => item.label === '图论专题', item => item.problemId === 'P3371'];
	await registered['olympia.practice.open']();
	assert.equal(picks[1].find(item => item.problemId === 'P3371').description, '题面在本地');
	assert.deepEqual(shown, [statementFile('P3371')]);
});

await check('删掉这份清单：确认才真删，取消就原样留着', async () => {
	reset();
	warnReply = undefined;
	choices = [0, item => item.action === 'delete'];
	await registered['olympia.practice.open']();
	assert.equal((await practice.readLists()).length, 2, '没点确认就不该删');

	reset();
	warnReply = '删除';
	choices = [item => item.label === '图论专题', item => item.action === 'delete'];
	await registered['olympia.practice.open']();
	const left = await practice.readLists();
	assert.deepEqual(left.map(item => item.name), ['第一天']);
	assert.match(said(), /图论专题.*删掉/);
});

await check('清单写 P1002、文件叫 p1002.md：认得是同一道题，不该又去拉一遍', async () => {
	fs.mkdirSync(path.dirname(statementFile('p1002')), { recursive: true });
	fs.writeFileSync(statementFile('p1002'), '# p1002 某题\n', 'utf8');
	reset();
	choices = [item => item.label === '第一天', item => item.problemId === 'P1002'];
	await registered['olympia.practice.open']();
	assert.match(picks[1].find(item => item.problemId === 'P1002').description, /题面在本地/);
	assert.deepEqual(shown, [statementFile('p1002')], '点开该是那个真存在的文件');
	assert.equal(executed.length, 0, '认不出大小写就再去拉一次，等于白跑一趟网络');
});

await check('清单一个都没有：列表里只剩「新建」，不会弹一个空菜单', async () => {
	fs.rmSync(path.dirname(listFile()), { recursive: true, force: true });
	reset();
	inputs = [];
	await registered['olympia.practice.open']();
	assert.equal(picks.length, 1);
	assert.equal(picks[0].length, 1);
	assert.match(picks[0][0].label, /新建/);
	assert.equal(fs.existsSync(listFile()), false);
});

await check('菜单里就能改：加题、改时长、移题、删清单，不用退出去重建', async () => {
	await practice.writeLists([{ name: '第一天', problems: ['P1001', 'P1002'], minutes: 60, createdAt: '' }]);
	reset();
	choices = [0, null];
	await registered['olympia.practice.open']();
	const menu = picks[1].map(item => item.label);
	assert.deepEqual(menu.slice(0, 3), ['开始这一场', '加一道题…', '改时长…']);
	assert.ok(menu.includes('移掉一道题…'), '菜单里没有移题这一项');
	assert.ok(menu.includes('删掉这份清单'));
});

await check('加一道题：立刻落盘、回到同一份菜单，重复的题号不加第二次', async () => {
	await seedFirstDay();
	reset();
	choices = [0, item => item.action === 'add', null];
	inputs = ['P1002 P3367'];
	await registered['olympia.practice.open']();
	assert.deepEqual(readDisk().lists[0].problems, ['P1001', 'P1002', 'P3367'], 'P1002 已经在清单里，不该再加一次');
	assert.match(picks[2].find(item => item.action === 'add').description, /3\/100/, '加完之后题数要马上写在菜单上');
});

await check('加题那一步按 Esc：回到菜单而不是退出，文件一个字节没动', async () => {
	await seedFirstDay();
	const before = fs.readFileSync(listFile(), 'utf8');
	reset();
	choices = [0, item => item.action === 'add', null];
	inputs = [undefined];
	await registered['olympia.practice.open']();
	assert.equal(picks.length, 3, '取消加题应该回到这份清单的菜单');
	assert.equal(fs.readFileSync(listFile(), 'utf8'), before);
});

await check('一道题都没加进去：说清楚是没认出来还是已经有了', async () => {
	await seedFirstDay();
	reset();
	choices = [0, item => item.action === 'add', item => item.action === 'add', null];
	inputs = ['  ', 'P1001'];
	await registered['olympia.practice.open']();
	assert.match(said(), /没认出/);
	assert.match(said(), /已经在清单里/);
});

await check('改时长：写进文件，菜单上那句「N 分钟」跟着改，开场用的就是新值', async () => {
	await seedFirstDay();
	reset();
	choices = [0, item => item.action === 'minutes', item => item.action === 'start'];
	inputs = ['30'];
	await registered['olympia.practice.open']();
	assert.equal(readDisk().lists[0].minutes, 30);
	assert.match(picks[2].find(item => item.action === 'start').description, /^30 分钟/);
	assert.deepEqual(executed.at(-1), { id: 'olympia.contestMode', args: [30] });
});

await check('时长留空：变成不设时限，开场把 undefined 交出去而不是 0 分钟', async () => {
	await seedFirstDay();
	reset();
	choices = [0, item => item.action === 'minutes', item => item.action === 'start'];
	inputs = [''];
	await registered['olympia.practice.open']();
	assert.equal(readDisk().lists[0].minutes, undefined);
	assert.match(picks[2].find(item => item.action === 'start').description, /现在问时长/);
	assert.deepEqual(executed.at(-1), { id: 'olympia.contestMode', args: [undefined] });
});

await check('移掉一道题：只改单子，题面文件留着', async () => {
	await practice.writeLists([{ name: '第一天', problems: ['P1001', 'P1002'], minutes: 60, createdAt: '' }]);
	fs.mkdirSync(path.dirname(statementFile('P1002')), { recursive: true });
	fs.writeFileSync(statementFile('P1002'), '# P1002 A+B Problem\n', 'utf8');
	reset();
	choices = [0, item => item.action === 'remove', item => item.label === 'P1002', null];
	await registered['olympia.practice.open']();
	assert.deepEqual(readDisk().lists[0].problems, ['P1001']);
	assert.equal(fs.existsSync(statementFile('P1002')), true, '从清单里移掉不该删题面');
});

await check('最后一题不许移掉：空清单会被读丢，那等于清单悄悄消失', async () => {
	await practice.writeLists([{ name: '只剩一道', problems: ['P1001'], createdAt: '' }]);
	reset();
	choices = [0, item => item.action === 'remove', null];
	await registered['olympia.practice.open']();
	assert.match(said(), /删掉这份清单/);
	assert.equal((await practice.readLists()).length, 1, '清单不该被移成空');
});

await check('题号收口：1660/C 与 1660-c 都写成 1660C，AtCoder 的 ABC123_A 不动，题单编号不当题', () => {
	assert.equal(practice.normalizeProblemId('1660/C'), '1660C');
	assert.equal(practice.normalizeProblemId('1660-c'), '1660C');
	assert.equal(practice.normalizeProblemId('1660C'), '1660C');
	assert.equal(practice.normalizeProblemId('ABC123_A'), 'ABC123_A');
	assert.equal(practice.normalizeProblemId('P1001'), 'P1001');
	assert.deepEqual(practice.parseProblemIds('1. P1001 2. P1002。P3367'), ['P1001', 'P1002', 'P3367']);
});

await check('清单里混进路径样的条目（../template、a/b）：不当题号收，也就不会被当文件名去打开', () => {
	assert.deepEqual(practice.parseProblemIds('../template  a/b  P1001'), ['P1001']);
	assert.equal(practice.isSafeProblemId('1660/C'), false);
	assert.equal(practice.isSafeProblemId('P1001.'), false);
});

await check('别的版本写的清单不能被顺手删掉：认不出的条目和字段原样写回去', async () => {
	fs.writeFileSync(listFile(), JSON.stringify({
		lists: [
			{ name: '旧版清单', problems: ['P7'], note: '老师批的', schemaVersion: 3 },
			{ title: '更早的版本导的', entries: ['P5'] },
			'一句说明',
		]
	}), 'utf8');
	reset();
	inputs = ['新的', 'P8', '60'];
	choices = [null];
	await registered['olympia.practice.new']();
	const names = readDisk().lists.map(item => item.name ?? item.title ?? String(item));
	assert.ok(names.includes('旧版清单'), `旧条目没了：${names.join('、')}`);
	const kept = readDisk().lists.find(item => item.name === '旧版清单');
	assert.equal(kept.note, '老师批的', '这一版看不懂的字段要留在文件里');
	assert.equal(kept.schemaVersion, 3);
	// 结构都不认识的条目走的是 unknown 那条路：它不存在"认得出但用不上"的借口。
	assert.ok(readDisk().lists.some(item => item.title === '更早的版本导的'), '看不懂结构的条目也要留在文件里');
	assert.ok(readDisk().lists.includes('一句说明'), '连对象都不是的条目一样要留着');
});

await check('时长只认十进制整数：0x78、1e2、带小数的都不作数，免得开个 0 分钟的比赛', () => {
	assert.equal(practice.parseMinutes('0x78'), undefined);
	assert.equal(practice.parseMinutes('1e2'), undefined);
	assert.equal(practice.parseMinutes('120.5'), undefined);
	assert.equal(practice.parseMinutes(' 120 '), 120);
	assert.equal(practice.parseMinutes('4'), undefined, '低于下限');
	assert.equal(practice.parseMinutes('601'), undefined, '高于上限');
	assert.equal(practice.parseMinutes(''), undefined, '留空是「不设时限」，不是 0 分钟');
});

await check('带 BOM 的文件（Windows 上很常见）也认，不是「清单一条都没有」', async () => {
	fs.writeFileSync(listFile(), `\uFEFF${JSON.stringify({ lists: [{ name: '带 BOM 的清单', problems: ['P7'], createdAt: '' }] })}`, 'utf8');
	assert.deepEqual((await practice.readLists()).map(item => item.name), ['带 BOM 的清单']);
});

await check('整个文件读不懂：明说并且一个字都不改，别让一次点击等于清空清单', async () => {
	const junk = '{这不是 JSON';
	fs.writeFileSync(listFile(), junk, 'utf8');
	reset();
	inputs = ['想新建', 'P9', ''];
	await registered['olympia.practice.new']();
	assert.equal(fs.readFileSync(listFile(), 'utf8'), junk, '读不懂的时候不许重写文件');
	assert.match(said(), /没有改动它/);
});

await check('存不下去（被占、只读、盘满）：说要紧话，不把 Node 的英文错误丢给学生', async () => {
	fs.rmSync(path.dirname(listFile()), { recursive: true, force: true });
	fs.mkdirSync(path.dirname(listFile()), { recursive: true });
	fs.mkdirSync(listFile());   // practice.json 是个目录：任何写法都存不下去
	reset();
	inputs = ['存不了的', 'P1', ''];
	await registered['olympia.practice.new']();
	assert.match(said(), /清单没能保存/);
	fs.rmSync(listFile(), { recursive: true, force: true });
});

await check('清单满了就说满了，不能骗学生「题号已经在清单里」', async () => {
	await practice.writeLists([{
		name: '满了',
		problems: Array.from({ length: practice.MAX_PRACTICE_PROBLEMS }, (_v, i) => `P9${i}`),
		createdAt: ''
	}]);
	reset();
	inputs = ['P7777'];
	choices = [0, item => item.action === 'add', null];
	await registered['olympia.practice.open']();
	assert.match(said(), new RegExp(`已经 ${practice.MAX_PRACTICE_PROBLEMS} 题满了`));
});

await check('加三道只进去一道：要报「只加进去 1 道」，不能安静地把题号丢掉', async () => {
	await practice.writeLists([{
		name: '快满',
		problems: Array.from({ length: practice.MAX_PRACTICE_PROBLEMS - 1 }, (_v, i) => `P8${i}`),
		createdAt: ''
	}]);
	reset();
	inputs = ['P7777 P7778 P7779'];
	choices = [0, item => item.action === 'add', null];
	await registered['olympia.practice.open']();
	assert.match(said(), /只加进去 1 道/);
	assert.equal(readDisk().lists[0].problems.length, practice.MAX_PRACTICE_PROBLEMS);
});

// ==================== AI 补空（旧版 enrich.rs 的那条路）====================
// 抓取之后觉得题面残缺，就叫一次用户自己配的模型补空字段。这里要钉住的是三条：
//   * 只往空着的字段里填，抓回来有内容的地方一个字不动；
//   * 完整的洛谷题（只剩一个空提示）连一次都不该叫；
//   * 模型离线/回散文/命令没人接，都只是「没有 AI 这一趟」，题面照样写得出、不报错。
// needsEnrichment / mergeExtracted 不碰 vscode，所以可以直接驱动；另外几条走真的拉题面那条路。

/** 一道字段齐全的题面：需要哪种残缺就改哪一个键。 */
const problem = (overrides = {}) => ({
	platform: 'atcoder', id: 'ABC300_A', title: 'Duplicate', url: 'https://atcoder.jp/contests/ABC300/tasks/ABC300_A',
	statement: 'x'.repeat(200), inputFormat: '抓到过的输入格式', outputFormat: '抓到过的输出格式',
	samples: [{ input: '3 1 4 1', output: '1' }], hint: '抓到过的提示', tags: [], ...overrides,
});
const readStatement = id => fs.readFileSync(statementFile(id), 'utf8');
/** 假 AtCoder 页面里 Sample Input 1 就是两行：读回来也该是两行。 */
const SAMPLE_INPUT = '4\n3 1 4 1';
const coachInstalled = () => { coachHandle = { activate: async () => { activations++; } }; };
/** 模型那次交回的东西：空着的地方都给了，抓到的那一份它也想顺带改一改——那一处不许顶掉。 */
const aiFields = () => ({
	ok: true,
	model: 'ds-chosen',
	fields: {
		statement: 'AI 重写的题面：读入一个数组，输出第一个重复的数。',
		hint: 'AI 补的提示：同一个数可能出现多次，取最早出现两次的那个。',
		samples: [{ input: '9 9 9', output: '1' }],
	},
});

await check('needsEnrichment 认得出该不该问：齐的不问、缺的问、只有元信息和没正文的都不问', () => {
	assert.equal(enrich.needsEnrichment(problem()), false, '字段齐全还去问模型，等于让 AI 改写一份好题面');
	assert.equal(enrich.needsEnrichment(problem({ hint: '' })), true, '非洛谷缺提示该补一次');
	assert.equal(enrich.needsEnrichment(problem({ platform: 'luogu', hint: '' })), false, '完整的洛谷题只剩一个空提示：一次都不该叫');
	assert.equal(enrich.needsEnrichment(problem({ platform: '洛谷', hint: '' })), false, '老存档里写的中文平台名同样算洛谷');
	assert.equal(enrich.needsEnrichment(problem({ platform: 'luogu', samples: [] })), true, '洛谷缺样例照样是抓漏了，该问');
	assert.equal(enrich.needsEnrichment(problem({ metadataOnly: true, hint: '', samples: [] })), false, '只有元信息：没有正文可抽，缺什么都不该问');
	assert.equal(enrich.needsEnrichment(problem({ statement: '   ', hint: '', samples: [] })), false, '正文都没抓到：无从抽起，别去问');
	assert.equal(enrich.needsEnrichment(problem({ samples: [] })), true);
	assert.equal(enrich.needsEnrichment(problem({ samples: [{ input: '3 1 4 1', output: '' }] })), true, '样例只有一半也是残缺');
	assert.equal(enrich.needsEnrichment(problem({ outputFormat: '' })), true);
	assert.equal(enrich.needsEnrichment(problem({ statement: '只有两句话', hint: '有提示' })), true, '短得像是抓漏了的正文该问');
});

await check('mergeExtracted 只往空着的字段里填：抓回来有内容的地方一个字不动', () => {
	const p = problem({ inputFormat: '', hint: '', samples: [{ input: '3 1 4 1', output: '' }] });
	const filled = enrich.mergeExtracted(p, {
		statement: 'AI 重写的题面', inputFormat: '一行 N 个整数。', outputFormat: 'AI 的输出格式', hint: 'AI 的提示',
		samples: [{ input: '9 9 9', output: '1' }],
	});
	assert.deepEqual(filled, ['输入格式', '提示', '样例'], `该说补了这三块：${filled.join('、')}`);
	assert.equal(p.inputFormat, '一行 N 个整数。', '空字段没补上');
	assert.equal(p.outputFormat, '抓到过的输出格式', 'AI 把抓到的输出格式盖掉了');
	assert.equal(p.statement, 'x'.repeat(200), '完整的题面不该被 AI 那份重写');
	assert.equal(p.hint, 'AI 的提示');
	assert.equal(p.samples[0].input, '3 1 4 1', '已经有内容的那半格不能被换掉');
	assert.equal(p.samples[0].output, '1', '空着的那半格该补上');
	assert.equal(enrich.mergeExtracted(problem(), {}).length, 0, '什么都没给就不该说补了东西');
});

await check('样例：整组都空着就整组换掉，已有成型的只补空格，模型多给的那几组不要', () => {
	const blanked = problem({ samples: [{ input: '', output: '' }] });
	assert.deepEqual(enrich.mergeExtracted(blanked, { samples: [{ input: '1', output: '2' }, { input: '3', output: '4' }] }), ['样例']);
	assert.deepEqual(blanked.samples.map(s => [s.input, s.output]), [['1', '2'], ['3', '4']]);

	const shaped = problem({ samples: [{ input: '3 1 4 1', output: '' }] });
	enrich.mergeExtracted(shaped, { samples: [{ input: '3 1 4 1', output: '1', explain: '第一个重复的数是 1。' }, { input: '9', output: '9' }] });
	assert.equal(shaped.samples.length, 1, '模型多说的那一组不该塞进已经成型的样例里');
	assert.equal(shaped.samples[0].output, '1');
	assert.equal(shaped.samples[0].explain, '第一个重复的数是 1。', '说明空着也可以补');

	const short = problem({ statement: '只有两句' });
	assert.deepEqual(enrich.mergeExtracted(short, { statement: '长'.repeat(200) }), ['题面'], '明显残缺的正文才让 AI 那份顶上来');
	assert.equal(short.statement, '长'.repeat(200));
});

await check('完整的洛谷题 + 空提示：连一次都不叫模型，文件里也不该有 AI 写的东西', async () => {
	reset();
	inputs = ['P8888'];
	coachInstalled();
	extractReply = aiFields();
	await registered['olympia.problem.pull']();
	assert.equal(extractCalls.length, 0, '题面已经抓全了还叫模型，就是让 AI 往完整题面里塞东西');
	assert.equal(activations, 0, '没打算问模型，就别先把 coach 叫起来');
	const text = readStatement('P8888');
	assert.ok(text.includes('给定两个整数 a 和 b'), `抓到的题面没了：${text.slice(0, 60)}`);
	assert.ok(!text.includes('AI 重写的题面') && !text.includes('AI 补的提示'), 'AI 的内容不该出现在一份完整题面里');
	assert.ok(!said().includes('AI'), `什么都没补却在通知里提 AI：${said()}`);
});

await check('残缺的非洛谷题面：先激活 coach，再叫一次命令，请求里带题号和原文', async () => {
	reset();
	inputs = ['ABC300_A'];
	coachInstalled();
	extractReply = aiFields();
	await registered['olympia.problem.pull']();
	assert.equal(activations, 1, '命令是 coach 注册的：冷启动时不先激活就没人接');
	assert.equal(extractCalls.length, 1, '一道题只该问一次');
	assert.equal(extractCalls[0].id, 'ABC300_A');
	assert.equal(extractCalls[0].platform, 'atcoder');
	assert.ok(extractCalls[0].text.includes('You are given'), '请求里要带上抓到的正文，不然模型抽什么');
});

await check('AI 补的字段写进文件：抓到的那份照旧，通知里要写明补了哪几块', async () => {
	reset();
	inputs = ['ABC300_A'];
	coachInstalled();
	extractReply = aiFields();
	await registered['olympia.problem.pull']();
	const text = readStatement('ABC300_A');
	assert.ok(text.includes('You are given a sequence'), '抓到的题面被 AI 那份盖掉了');
	assert.ok(!text.includes('AI 重写的题面'));
	assert.ok(!text.includes('9 9 9'), '模型另外编的那组样例不该进来');
	assert.ok(text.includes('AI 补的提示'), '空着的提示没补上');
	assert.deepEqual(templates.parseSampleBlocks(text).map(s => [s.input, s.output]), [[SAMPLE_INPUT, '1']], '只补空着的那半格');
	assert.match(said(), /AI 补全了 提示、样例/, `通知没说要紧的事：${said()}`);
});

await check('只抓回元信息（人机校验那一页）：没有正文可抽，不去问模型', async () => {
	reset();
	inputs = ['1660C'];
	coachInstalled();
	extractReply = aiFields();
	await registered['olympia.problem.pull']();
	assert.equal(extractCalls.length, 0, '只有元信息时也去问模型，抽出来的只会是编的');
	assert.equal(activations, 0);
	assert.match(readStatement('1660C'), /题面需在浏览器中打开/, '这条路本来就该是「附原文链接」');
	assert.ok(!said().includes('AI'));
});

await check('命令抛异常：写出去的就是抓到的那一份，导入不报错也不卡住', async () => {
	reset();
	inputs = ['ABC300_A'];
	coachInstalled();
	extractReply = aiFields();
	extractThrows = true;
	await registered['olympia.problem.pull']();
	assert.equal(extractCalls.length, 1, '这条用例得真的走到那一步');
	const text = readStatement('ABC300_A');
	assert.ok(text.includes('You are given a sequence'));
	assert.ok(!text.includes('AI 补的提示') && !text.includes('AI 重写的题面'), '模型挂了还往里填东西');
	assert.deepEqual(templates.parseSampleBlocks(text).map(s => [s.input, s.output]), [[SAMPLE_INPUT, '']], '空着的那格保持空着，等下次再补');
	assert.ok(!messages.some(([kind]) => kind === 'error'), `模型离线不该让拉题面报错：${said()}`);
	assert.ok(!said().includes('AI'), `没补东西却提了 AI：${said()}`);
});

await check('coach 没装、命令没人接：也只是安静地没有 AI 这一趟', async () => {
	delete registered[enrich.EXTRACT_COMMAND];
	try {
		reset();
		inputs = ['ABC300_A'];
		await registered['olympia.problem.pull']();       // coachHandle 也没装：getExtension 回 undefined
		assert.equal(extractCalls.length, 0);
		assert.ok(executed.some(call => call.id === enrich.EXTRACT_COMMAND), '至少真的去叫过一次，才知道没人接');
		const text = readStatement('ABC300_A');
		assert.ok(text.includes('You are given a sequence'), '没人接这条命令也该把抓到的题面写出来');
		assert.ok(!messages.some(([kind]) => kind === 'error'), `命令没人接不该报错：${said()}`);
	} finally {
		registered[enrich.EXTRACT_COMMAND] = extractHandler;
	}
});

await check('模型回散文/服务没配：{ok:false} 就当没这回事，题面照旧、通知不提 AI', async () => {
	reset();
	inputs = ['ABC300_A'];
	coachInstalled();
	extractReply = { ok: false, reason: '模型回的不是 JSON' };
	await registered['olympia.problem.pull']();
	assert.equal(extractCalls.length, 1, '这条用例得真的走到那一步');
	assert.deepEqual(templates.parseSampleBlocks(readStatement('ABC300_A')).map(s => [s.input, s.output]), [[SAMPLE_INPUT, '']]);
	assert.ok(!said().includes('AI'), `什么都没补还提 AI：${said()}`);
});

console.log(failed ? '\nFAILED' : '\nall practice-list assertions passed');
process.exitCode = failed ? 1 : 0;
