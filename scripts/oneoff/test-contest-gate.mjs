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
for (const [dir, file] of [[onboardingOut, 'contestMode.js'], [coachOut, 'coach.js'], [coachOut, 'model.js']]) {
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
const ENDS_AT_KEY = 'olympia.contest.endsAt';

// 比赛模式的两条时间线只能靠假时钟演：跨零点提醒一次、关窗期间结束的要把状态清掉。
const realNow = Date.now.bind(Date);
let clockOffset = 0;
Date.now = () => realNow() + clockOffset;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const contexts = [];
const registered = new Map();
const warnings = [];
let modelListCalls = 0;
/** 教练那一轮能看到的模型；空表 = 这台机器还没配模型，走 NO_MODEL 那条文案。 */
let listedModels = [];
let lastStatusBar;

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
		createStatusBarItem: () => {
			lastStatusBar = {
				command: undefined, text: '', tooltip: '', backgroundColor: undefined, shown: false,
				show() { this.shown = true; }, hide() { this.shown = false; }, dispose() { this.shown = false; }
			};
			return lastStatusBar;
		},
		showInformationMessage: async () => undefined,
		// 默认当成「点了结束比赛模式」；__warningAction 显式给 null 时是「没点」，用来单独看提醒。
		showWarningMessage: async (message) => {
			warnings.push(message);
			return vscodeStub.__warningAction === undefined ? '结束比赛模式' : vscodeStub.__warningAction;
		},
		showQuickPick: async () => vscodeStub.__pick ?? { minutes: 120 },
		showInputBox: async () => vscodeStub.__input,
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
	workspace: { getConfiguration: () => ({ get: (_key, fallback) => fallback }) },
	// 教练取模型的唯一出口：产品自己的 model.js → listModels() → vscode.lm.selectChatModels()。
	// 计数放在这一层，检查台才能跑真的 model.js（含 resolveOrAskModel），而不是替它写好的一份假实现。
	lm: { selectChatModels: async () => { modelListCalls++; return listedModels; } },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};

const contest = requireOnboarding('./contestMode.js');
const coach = requireCoach('./coach.js');

function fakeContext(seed) {
	const store = new Map(seed);
	const update = async (key, value) => { value === undefined ? store.delete(key) : store.set(key, value); };
	const state = { get: key => store.get(key), update };
	// store 露出来是给断言看的：恢复/清理这条路径全靠 workspaceState 里那个键。
	return { subscriptions: [], extensionUri: 'file:///ext', globalState: state, workspaceState: state, store };
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

// 比赛状态是模块级的，所以「重载窗口」在这里就是「先停用再激活一次」。
let activation;
function activate(seed) {
	activation?.disposable.dispose();
	const context = fakeContext(seed);
	activation = { context, disposable: contest.registerContestMode(context) };
	return context;
}

await check('重载后接着走的比赛跨过零点会提醒「比赛时间到」，并且只提醒一次', async () => {
	activate([[ENDS_AT_KEY, Date.now() + 1500]]);
	warnings.length = 0;
	vscodeStub.__warningAction = null;          // 没人点那条通知
	assert.strictEqual(await registered.get(IS_RUNNING_COMMAND)(), true, '恢复出来的比赛该在进行中');
	clockOffset += 3000;                        // 时间跳到结束之后
	await sleep(1300);
	await sleep(1300);                          // 第二个 tick 再确认一次没有重复提醒
	assert.deepStrictEqual(warnings, ['比赛时间到。'], `两次 tick 里看到的是：${JSON.stringify(warnings)}`);
	assert.ok(lastStatusBar.text.includes('时间到'), `状态栏还写着：${lastStatusBar.text}`);
	assert.strictEqual(activation.context.store.get(ENDS_AT_KEY) !== undefined, true, '时间到但没点结束，状态不该被偷偷清掉');
});

await check('关窗期间比赛已结束：重载后不恢复，并把 endsAt 清掉', async () => {
	const context = activate([[ENDS_AT_KEY, Date.now() - 1000]]);
	warnings.length = 0;
	assert.strictEqual(await registered.get(IS_RUNNING_COMMAND)(), false, '已经结束的比赛不该算在进行中');
	assert.ok(!context.store.has(ENDS_AT_KEY), `endsAt 没清掉，还留着 ${context.store.get(ENDS_AT_KEY)}`);
	assert.strictEqual(lastStatusBar.shown, false, '没有进行中的比赛时不该显示计时 chip');
});

await check('自定义时长：只有区间内的整数分钟才作数', async () => {
	vscodeStub.__pick = { minutes: 0 };         // 走「自定义…」输入框
	for (const [raw, starts] of [['999', false], ['0', false], ['1.5', false], ['', false], ['600', true]]) {
		activate();                             // 每次重新激活，回到「没在比赛」
		vscodeStub.__input = raw;
		await registered.get(CONTEST_COMMAND)();
		assert.strictEqual(
			await registered.get(IS_RUNNING_COMMAND)(), starts,
			`输入 ${JSON.stringify(raw)} 之后 running 应该是 ${starts ? 'true' : 'false'}`
		);
	}
	vscodeStub.__pick = undefined;
	vscodeStub.__input = undefined;
});

// 集训清单的「开始这一场」是跨扩展调用 olympia.contestMode 并带上分钟数，
// 上面三条演的是它落进比赛模式后的三种已有状态：时间已过、还在进行、以及人不确认。
await check('上一场时间已过但没收尾：清单上点「开始这一场」直接开新的一场', async () => {
	activate([[ENDS_AT_KEY, Date.now() + 1500]]);   // 先恢复出一场还在进行的比赛
	clockOffset += 3000;                          // 时间跳到结束之后：模块里的 endsAt 还留着
	assert.strictEqual(await registered.get(IS_RUNNING_COMMAND)(), false, '先确认这一场已经过期');
	const started = Date.now();
	await registered.get(CONTEST_COMMAND)(45);
	assert.strictEqual(await registered.get(IS_RUNNING_COMMAND)(), true, '过期后点「开始这一场」该开新的一场，而不是只把上一场清掉');
	const endsAt = activation.context.store.get(ENDS_AT_KEY);
	assert.ok(Math.abs(endsAt - (started + 45 * 60_000)) < 5_000, `新的结束时间算错了：${endsAt}`);
	vscodeStub.__warningAction = undefined;
});

await check('比赛进行中带着时长再来一场：确认结束之后就按新的分钟数开', async () => {
	activate();
	await registered.get(CONTEST_COMMAND)();      // 默认 120 分钟
	const first = activation.context.store.get(ENDS_AT_KEY);
	const started = Date.now();
	await registered.get(CONTEST_COMMAND)(45);
	assert.strictEqual(await registered.get(IS_RUNNING_COMMAND)(), true, '停了旧的一场就没开新的一场');
	const endsAt = activation.context.store.get(ENDS_AT_KEY);
	assert.ok(Math.abs(endsAt - (started + 45 * 60_000)) < 5_000, `旧的时长还在用：${endsAt} vs ${first}`);
});

await check('那条「先结束比赛模式」没点：计时原样不动，也不会偷偷开第二场', async () => {
	activate();
	await registered.get(CONTEST_COMMAND)();
	const before = activation.context.store.get(ENDS_AT_KEY);
	vscodeStub.__warningAction = null;            // 弹窗出现了但没人点
	await registered.get(CONTEST_COMMAND)(45);
	assert.strictEqual(activation.context.store.get(ENDS_AT_KEY), before, '没确认结束就不该改动计时');
	vscodeStub.__warningAction = undefined;
});

await check('停用再激活不会把比赛状态留下：教练不会因为陈旧的 endsAt 被锁住', async () => {
	activate();
	await registered.get(CONTEST_COMMAND)();     // 默认 120 分钟，开一场比赛
	assert.strictEqual(await registered.get(IS_RUNNING_COMMAND)(), true);
	activation.disposable.dispose();
	activate();
	assert.strictEqual(await registered.get(IS_RUNNING_COMMAND)(), false, '停用后还留着上一场比赛的 endsAt');
	modelListCalls = 0;
	const text = await askCoach();
	assert.ok(!text.includes('比赛模式进行中'), `激活的新窗口被旧比赛锁住了：${text}`);
});

activation?.disposable.dispose();
console.log(failed ? `\n${failed} 处比赛模式联动不符合预期` : '\ncontest gate checks passed');
process.exitCode = failed ? 1 : 0;
