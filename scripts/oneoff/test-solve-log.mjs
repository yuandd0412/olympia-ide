// 解题记录与连续打卡的检查台。
// 这一份的坑都不在「算错」上，而在「文件读不到 / 读坏了 / 日期边界」上：面板那一行只剩一个数字，
// 学生看不出记录其实早就没在写了。所以断言都落在磁盘上的文件和边界日期，不落在提示文案。
//
//   node scripts/oneoff/test-solve-log.mjs
//
// Requires:
//   npm run gulp -- compile-extension:olympia-onboarding
import Module from 'module';
import assert from 'assert';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const outDir = new URL('../../oss/extensions/olympia-onboarding/out/', import.meta.url);
const SOLVE_COMMAND = 'olympia.train.solveLog';

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia solves '));
let settings = {};
let messages = [];
let pickItems = null;
let picked;
let opened = [];
const registered = {};

function uri(fsPath) {
	return { fsPath, scheme: 'file', path: fsPath, toString: () => `file:///${fsPath.replace(/\\/g, '/')}` };
}

const vscodeStub = {
	Uri: {
		file: p => uri(p),
		joinPath: (base, ...parts) => uri(path.join(base.fsPath, ...parts))
	},
	Disposable: { from: (...items) => ({ dispose() { for (const i of items) { i?.dispose?.(); } } }) },
	EventEmitter: class {
		constructor() {
			this.listeners = [];
			// 真实的 EventEmitter 把 event 绑在实例上：扩展里是 `export const onX = emitter.event`，
			// 取走的就是这个函数本身，没绑定的话 this 是 undefined。
			this.event = listener => {
				this.listeners.push(listener);
				return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
			};
		}
		fire(value) { for (const listener of [...this.listeners]) { listener(value); } }
		dispose() { }
	},
	workspace: {
		workspaceFolders: [{ uri: uri(workspace), name: path.basename(workspace), index: 0 }],
		getConfiguration: () => ({
			get: (key, fallback) => settings[`olympia.${key}`] ?? fallback
		}),
		findFiles: async () => [],
		applyEdit: async () => ({ applied: true })
	},
	window: {
		showInformationMessage: async (...a) => { messages.push(['info', a[0]]); return undefined; },
		showWarningMessage: async (...a) => { messages.push(['warning', a[0]]); return undefined; },
		showErrorMessage: async (...a) => { messages.push(['error', a[0]]); return undefined; },
		showQuickPick: async items => { pickItems = items; return picked ?? items[0]; },
		// showTextDocument 既收 TextDocument 也收 Uri，这里产品传的是 Uri。
		showTextDocument: async docOrUri => { opened.push(docOrUri?.fsPath ?? docOrUri?.uri?.fsPath ?? docOrUri); return { document: docOrUri }; },
	},
	commands: {
		registerCommand: (id, handler) => { registered[id] = handler; return { dispose() { delete registered[id]; } }; },
		executeCommand: async (id, ...args) => registered[id]?.(...args)
	},
	ProgressLocation: { Notification: 15 },
	ConfigurationTarget: { Global: 1 }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};

const requireOnboarding = createRequire(new URL('solveLog.js', outDir));
const solveLog = requireOnboarding('./solveLog.js');
Module._load = originalLoad;

const context = { subscriptions: [], workspaceState: { get: () => undefined, update: async () => { } } };
solveLog.registerSolveLog(context);

const solvesFile = path.join(workspace, '.olympia', 'solves.json');

function record(problem, at, ms = 10, peakBytes = 5 * 1024 * 1024) {
	return { problem, title: `${problem} A+B Problem`, at, ms, peakBytes };
}
/** 本地时间，避免时区把「今天」挪到昨天。 */
function localAt(daysAgo, hour = 10) {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	d.setHours(hour, 5, 0, 0);
	return d.toISOString();
}
function onDisk() {
	return JSON.parse(fs.readFileSync(solvesFile, 'utf8'));
}

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

/** 每条检查都从干净的记录文件开始。 */
async function fresh(...records) {
	fs.rmSync(solvesFile, { force: true });
	settings = {};
	for (const r of records) {
		await solveLog.recordSolve(r);
	}
}

await check('判成 AC 记一条：真的落到 .olympia/solves.json，最新在前', async () => {
	await fresh();
	await solveLog.recordSolve(record('P1001', localAt(0)));
	await solveLog.recordSolve(record('P1002', localAt(0)));
	const stored = onDisk();
	assert.equal(stored.length, 2, `磁盘上是 ${stored.length} 条`);
	assert.equal(stored[0].problem, 'P1002', '最新的没排在最前');
	assert.equal(stored[0].title, 'P1002 A+B Problem', '标题没记下来');
	assert.equal(stored[0].ms, 10);
	assert.equal(stored[0].peakBytes, 5 * 1024 * 1024, '峰值内存没记下来');
});

await check('设置关掉就不再写，已有的记录不动', async () => {
	await fresh(record('P1001', localAt(0)));
	settings['olympia.train.recordSolves'] = false;
	const written = await solveLog.recordSolve(record('P9999', localAt(0)));
	assert.equal(written, undefined, '设置关了却还返回新列表');
	assert.deepEqual(onDisk().map(r => r.problem), ['P1001'], '关掉记录把已有记录改了');
});

await check('最多留 200 条：再多也不能把文件越写越大', async () => {
	await fresh();
	for (let i = 0; i < 205; i++) {
		await solveLog.recordSolve(record(`P${i}`, localAt(0)));
	}
	const stored = onDisk();
	assert.equal(stored.length, 200, `磁盘上是 ${stored.length} 条`);
	assert.equal(stored[0].problem, 'P204', '裁掉的是旧的还是新的？');
});

await check('文件读坏了就当没有：不能把面板那一行带崩', async () => {
	fs.mkdirSync(path.dirname(solvesFile), { recursive: true });
	fs.writeFileSync(solvesFile, '这不是 JSON', 'utf8');
	assert.deepEqual(await solveLog.readSolves(), [], '坏文件没退回空列表');
	fs.writeFileSync(solvesFile, JSON.stringify([{ nope: 1 }, record('P1001', localAt(0)), '字符串']), 'utf8');
	const clean = await solveLog.readSolves();
	assert.deepEqual(clean.map(r => r.problem), ['P1001'], '缺字段的条目没被丢掉');
});

await check('连续打卡按天算：连着三天就是 3，断了就从今天重新数', async () => {
	const records = [record('A', localAt(0)), record('B', localAt(1)), record('C', localAt(2)), record('D', localAt(5))];
	assert.equal(solveLog.streakDays(records), 3, '连着三天没算对');
	assert.equal(solveLog.streakDays([record('A', localAt(1)), record('B', localAt(2))]), 2, '今天还没打，昨天连着的不该算断');
	assert.equal(solveLog.streakDays([record('A', localAt(4))]), 0, '断了几天还给出连续天数');
	assert.equal(solveLog.streakDays([record('A', localAt(0)), record('B', localAt(0)), record('C', localAt(0))]), 1, '同一天刷三题只能算一天');
	assert.equal(solveLog.streakDays([]), 0);
});

await check('今天和上个月的同一天不算同一天（跨年也一样）', async () => {
	const december = '2025-12-31T10:00:00';
	const january = '2026-01-01T09:00:00';
	const now = new Date(january);
	assert.equal(solveLog.solvesToday([{ ...record('A', december) }, { ...record('B', january) }], now), 1, '跨年把两天的量并成一天了');
	assert.equal(solveLog.streakDays([{ ...record('A', december) }, { ...record('B', january) }], now), 2, '跨年不该断签');
});

await check('面板那一行：没记过时说「还没 AC 过题」', async () => {
	assert.match(solveLog.solveSummary([]), /还没 AC 过题/);
	const summary = solveLog.solveSummary([record('A', localAt(0)), record('B', localAt(1))]);
	assert.match(summary, /2 题/, `题目数没出现在这一行：${summary}`);
	assert.match(summary, /连续 2 天/, `连续天数没出现在这一行：${summary}`);
	assert.match(summary, /今日 1\/3/, `今日进度没出现在这一行：${summary}`);
});

await check('每日目标只认合理值：0、负数、乱码都回到 3', async () => {
	for (const bad of [0, -4, 'x']) {
		settings['olympia.train.dailyGoal'] = bad;
		assert.equal(solveLog.dailyGoal(), 3, `${JSON.stringify(bad)} 应该退回 3`);
	}
	settings['olympia.train.dailyGoal'] = 7;
	assert.equal(solveLog.dailyGoal(), 7);
	settings['olympia.train.dailyGoal'] = 4.8;
	assert.equal(solveLog.dailyGoal(), 4, '小数要向下取整');
});

await check('题面标题取第一行标题，没有就空着', () => {
	assert.equal(solveLog.titleOf('# P1001 A+B Problem\n\n时限 1s'), 'P1001 A+B Problem');
	assert.equal(solveLog.titleOf('  # 带空格的标题  '), '带空格的标题');
	assert.equal(solveLog.titleOf('没有标题行'), '');
});

await check('一行新记录要叫醒面板刷新：不然数字停在旧值上', async () => {
	await fresh();
	let fired = 0;
	solveLog.onSolveLogChange(() => fired++);
	await solveLog.recordSolve(record('P1001', localAt(0)));
	assert.equal(fired, 1, `写完记录面板没收到通知（fired=${fired}）`);
	settings['olympia.train.recordSolves'] = false;
	await solveLog.recordSolve(record('P1002', localAt(0)));
	assert.equal(fired, 1, '没写文件却通知了面板');
});

await check('没有记录时点面板那一行：说清楚去哪拿记录', async () => {
	await fresh();
	messages = [];
	await registered[SOLVE_COMMAND]();
	assert.match(messages.map(m => m[1]).join('\n'), /Ctrl\+Alt\+J/, '提示没告诉学生这条记录是怎么来的');
	assert.equal(pickItems, null, '没记录还弹了清单');
});

await check('有记录时列出清单，选中就打开那道题的题面', async () => {
	await fresh(record('P1001', localAt(0), 12, 3 * 1024 * 1024));
	pickItems = null;
	opened = [];
	const statement = path.join(workspace, '.olympia', 'problems', 'P1001.md');
	fs.mkdirSync(path.dirname(statement), { recursive: true });
	fs.writeFileSync(statement, '# P1001 A+B Problem\n', 'utf8');
	await registered[SOLVE_COMMAND]();
	assert.equal(pickItems.length, 1, '清单条数和记录不一致');
	assert.match(pickItems[0].detail, /P1001 A\+B Problem/, `详情里没写标题：${pickItems[0].detail}`);
	assert.match(pickItems[0].description, /12 ms/, `描述里没写耗时：${pickItems[0].description}`);
	assert.match(pickItems[0].description, /3\.0 MB/, `描述里没写峰值内存：${pickItems[0].description}`);
	assert.deepEqual(opened, [statement], `选中后打开的不是这份题面：${JSON.stringify(opened)}`);
});

await check('题面存在自己配置的目录里也要打得开：不能写死 .olympia/problems', async () => {
	await fresh(record('P1001', localAt(0)));
	opened = [];
	fs.rmSync(path.join(workspace, '.olympia', 'problems'), { recursive: true, force: true });
	const custom = path.join(workspace, 'statements');
	fs.mkdirSync(custom, { recursive: true });
	fs.writeFileSync(path.join(custom, 'P1001.md'), '# P1001\n', 'utf8');
	settings['olympia.problem.problemsDir'] = 'statements';
	await registered[SOLVE_COMMAND]();
	settings = {};
	assert.deepEqual(opened.map(p => path.basename(p)), ['P1001.md'], `按配置目录没找到题面：${JSON.stringify(opened)}`);
});

await check('题面已经不缓存了就别说「打开」：给一条重新拉取的路', async () => {
	await fresh(record('P1001', localAt(0)));
	messages = [];
	opened = [];
	fs.rmSync(path.join(workspace, '.olympia', 'problems'), { recursive: true, force: true });
	await registered[SOLVE_COMMAND]();
	assert.equal(opened.length, 0, '题面没了还去打开一个不存在的文件');
	assert.match(messages.map(m => m[1]).join('\n'), /Ctrl\+Alt\+P|拉/, '没告诉学生重新拉一次');
});

fs.rmSync(workspace, { recursive: true, force: true });
console.log(failed ? '\nFAILED' : '\nall solve-log assertions passed');
process.exitCode = failed ? 1 : 0;
