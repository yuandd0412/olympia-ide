// One-off harness for the 比赛模式 → AI 教练 gate (老版本比赛时教练置灰，fork 里必须一样)。
//
// Two halves have to agree across two extensions: olympia-onboarding publishes the contest state,
// and olympia-coach refuses to answer while it is set. Getting this wrong is invisible in review —
// the coach still looks healthy, it just keeps answering during a contest (or is permanently locked).
// Both compiled outputs are loaded with `vscode` stubbed, so this checks the shipped path.
//
//   node scripts/oneoff/test-contest-gate.mjs
//
// Requires:
//   npm run gulp -- compile-extension:olympia-onboarding compile-extension:olympia-coach
import Module from 'module';
import assert from 'assert';
import { createRequire } from 'module';
import { readFileSync } from 'fs';

const onboardingOut = new URL('../../oss/extensions/olympia-onboarding/out/', import.meta.url);
const coachOut = new URL('../../oss/extensions/olympia-coach/out/', import.meta.url);
for (const [dir, file] of [[onboardingOut, 'contestMode.js'], [coachOut, 'coach.js']]) {
	try {
		readFileSync(new URL(file, dir));
	} catch {
		console.error(`${file} 还没编译——先在 oss/ 跑：npm run gulp -- compile-extension:olympia-onboarding compile-extension:olympia-coach`);
		process.exit(1);
	}
}

const requireOnboarding = createRequire(new URL('contestMode.js', onboardingOut));
const requireCoach = createRequire(new URL('coach.js', coachOut));

const CONTEST_COMMAND = 'olympia.contestMode';
const IS_RUNNING_COMMAND = 'olympia.contest.isRunning';
const RUNNING_CONTEXT = 'olympia.contest.running';

const contexts = [];
const registered = new Map();
let modelListCalls = 0;

class Disposable {
	constructor(fn) { this.fn = fn; }
	dispose() { this.fn?.(); }
	static from(...items) { return new Disposable(() => items.forEach(item => item?.dispose?.())); }
}

const vscodeStub = {
	Disposable,
	ThemeColor: class { constructor(id) { this.id = id; } },
	StatusBarAlignment: { Left: 1, Right: 2 },
	window: {
		createStatusBarItem: () => ({
			command: undefined, text: '', tooltip: '', backgroundColor: undefined, shown: false,
			show() { this.shown = true; }, hide() { this.shown = false; }, dispose() { this.shown = false; }
		}),
		showInformationMessage: async () => undefined,
		showWarningMessage: async () => vscodeStub.__endContest ?? '结束比赛模式',
		showQuickPick: async () => ({ minutes: 120 }),
		showInputBox: async () => undefined,
	},
	commands: {
		registerCommand: (id, handler) => {
			registered.set(id, handler);
			return new Disposable(() => registered.delete(id));
		},
		executeCommand: async (id, ...args) => {
			if (id === 'setContext') { contexts.push({ key: args[0], value: args[1] }); return undefined; }
			const handler = registered.get(id);
			return handler ? handler(...args) : undefined;
		}
	},
	Uri: { joinPath: (...parts) => parts[parts.length - 1], file: p => p },
	ChatRequestTurn: class { },
	ChatResponseTurn: class { },
	ChatResponseMarkdownPart: class { constructor(value) { this.value = value; } },
	LanguageModelChatMessage: { User: t => ({ role: 'user', text: t }), Assistant: t => ({ role: 'assistant', text: t }) },
	chat: { createChatParticipant: (id, handler) => ({ id, handler, iconPath: undefined, dispose() { } }) },
	workspace: { getConfiguration: () => ({ get: (_key, fallback) => fallback }) }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	// coach.js 只通过 ./model 碰网络，这里换成一个会计数的假实现。
	if (request === './model' && parent?.filename?.endsWith('coach.js')) {
		return {
			listModels: async () => { modelListCalls++; return []; },
			resolveModel: () => undefined
		};
	}
	return originalLoad.call(this, request, parent, isMain);
};

const contest = requireOnboarding('./contestMode.js');
const coach = requireCoach('./coach.js');

function fakeContext() {
	const store = new Map();
	return {
		subscriptions: [],
		extensionUri: 'file:///ext',
		globalState: { get: k => store.get(k), update: async (k, v) => { v === undefined ? store.delete(k) : store.set(k, v); } },
		workspaceState: { get: k => store.get(k), update: async (k, v) => { v === undefined ? store.delete(k) : store.set(k, v); } }
	};
}

/** 跑一次 @coach，把写进 stream 的文字收下来。 */
async function askCoach() {
	const coachContext = fakeContext();
	coach.registerCoachParticipant(coachContext);
	const participant = coachContext.subscriptions[0];
	const written = [];
	const stream = { markdown: text => written.push(typeof text === 'string' ? text : text?.value ?? '') };
	await participant.handler({ prompt: '这段代码为什么 WA？', command: 'wa' }, { history: [] }, stream, { isCancellationRequested: false });
	return written.join('\n');
}

const publishedRunning = () => contexts.filter(c => c.key === RUNNING_CONTEXT).map(c => c.value);

let failed = 0;
async function check(name, fn) {
	try {
		await fn();
		console.log(`ok    ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}: ${error.message}`);
	}
}

const disposables = contest.registerContestMode(fakeContext());

await check('没在比赛时：上下文键是 false，教练正常去取模型', async () => {
	contexts.length = 0;
	modelListCalls = 0;
	const text = await askCoach();
	assert.ok(!text.includes('比赛模式进行中'), `没在比赛却被锁：${text}`);
	assert.strictEqual(modelListCalls, 1, '教练应该去取模型列表');
});

await check('开始比赛：setContext 写 true，isRunning 回答 true', async () => {
	contexts.length = 0;
	await registered.get(CONTEST_COMMAND)();
	assert.deepStrictEqual(publishedRunning(), [true], `只看到：${JSON.stringify(publishedRunning())}`);
	assert.strictEqual(await registered.get(IS_RUNNING_COMMAND)(), true);
});

await check('比赛进行中：教练只回禁用提示，不碰模型列表', async () => {
	modelListCalls = 0;
	const text = await askCoach();
	assert.ok(text.includes('比赛模式进行中'), `没有禁用提示：${text}`);
	assert.ok(text.includes('Ctrl+Alt+C'), '禁用提示要告诉学生怎么退出');
	assert.strictEqual(modelListCalls, 0, '比赛进行中不该去取模型');
});

await check('退出比赛：上下文回到 false，教练恢复', async () => {
	contexts.length = 0;
	await registered.get(CONTEST_COMMAND)();          // 第二次调用走「结束比赛模式」
	assert.deepStrictEqual(publishedRunning(), [false], `只看到：${JSON.stringify(publishedRunning())}`);
	assert.strictEqual(await registered.get(IS_RUNNING_COMMAND)(), false);
	modelListCalls = 0;
	const text = await askCoach();
	assert.ok(!text.includes('比赛模式进行中'), `退出后还被锁：${text}`);
});

disposables.dispose();
console.log(failed ? `\n${failed} 处比赛模式联动不符合预期` : '\ncontest gate checks passed');
process.exitCode = failed ? 1 : 0;
