// 真机之外还需要的这一层：教练发给模型的最后一句里，到底有没有那道题的题面正文。
//
//   node scripts/oneoff/test-coach-statement.mjs
// 要先编过扩展：node node_modules/typescript/lib/tsc.js -p oss/extensions/olympia-coach/tsconfig.json
//
// 为什么拿编译产物跑而不是重述一遍逻辑：`statementContext()` 里三件事只能验代码本身——
// 题面文件名和源文件名大小写不一致时配不配得上、读的是共享目录 `.olympia/problems`、
// 以及**读不到题面时那两句话说的是不是实话**（它不能假装看过题面）。
// 断言的正例必须从桩文件里的那句标记来：代码没读文件，标记就不会出现，这条就红。
import Module from 'module';
import assert from 'assert';
import { createRequire } from 'module';

const require = createRequire(new URL('../../oss/extensions/olympia-coach/out/coach.js', import.meta.url));

const MARKER = 'A+B Problem（题面视图真机核对）';
const STATEMENT = `# P53 ${MARKER}\n\n> 来源：洛谷 ｜ 难度：入门\n\n## 题目描述\n给两个整数，输出它们的和。\n`;

const uri = (fsPath) => ({ path: fsPath, fsPath, scheme: 'file', toString: () => `file:///${fsPath}` });

/** 每次换一个场景：桩里的 workspaceFolders / 活动文件 / 题面库内容都由下面赋值。 */
const scene = { folder: uri('/ws-term'), active: uri('/ws-term/P53.cpp'), files: [], text: STATEMENT };

const vscodeStub = {
	Uri: { joinPath: (base, ...parts) => uri(`${base.path}/${parts.join('/')}`), file: p => uri(p) },
	RelativePattern: class { constructor(base, pattern) { this.base = base; this.pattern = pattern; } },
	EventEmitter: class {
		constructor() { this.event = () => ({ dispose() { } }); }
		fire() { }
		dispose() { }
	},
	workspace: {
		get workspaceFolders() { return scene.folder ? [scene.folder] : undefined; },
		findFiles: async () => scene.files,
		fs: { readFile: async () => new TextEncoder().encode(scene.text) },
		getConfiguration: () => ({ get: () => undefined }),
		onDidChangeConfiguration: () => ({ dispose() { } }),
	},
	window: {
		get activeTextEditor() {
			return scene.active ? { document: { uri: scene.active, fileName: scene.active.fsPath, languageId: 'cpp', getText: () => 'int main(){}' } } : undefined;
		},
		showInputBox: async () => undefined,
		showInformationMessage: async () => undefined,
		showWarningMessage: async () => undefined,
		showErrorMessage: async () => undefined,
		createOutputChannel: () => ({ appendLine() { }, show() { }, dispose() { } }),
	},
	commands: { registerCommand: () => ({ dispose() { } }), executeCommand: async () => false },
	lm: { registerLanguageModelChatProvider: () => ({ dispose() { } }), selectChatModels: async () => [] },
	chat: { createChatParticipant: () => ({ dispose() { } }) },
	LanguageModelChatMessage: class {
		static User(content) { return { role: 'user', content }; }
		static Assistant(content) { return { role: 'assistant', content }; }
	},
	ChatRequestTurn: class { },
	ChatResponseTurn: class { },
	ChatResponseMarkdownPart: class { },
	ConfigurationTarget: { Global: 1 },
	Memento: class { },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};

const { statementContext } = require('./coach.js');
assert.equal(typeof statementContext, 'function', 'coach.js 要导出 statementContext，否则这里测的是个 undefined');

const results = [];
const check = (ok, name, detail = '') => results.push({ ok: !!ok, name, detail });

// —— 题面缓存过：正文要进去，并且说清它是从哪来的
scene.files = [uri('/ws-term/.olympia/problems/P53.md')];
const withStatement = await statementContext();
check(withStatement.includes(MARKER), '缓存过题面时，题面正文真的进了上下文', `${withStatement.length} 字符`);
check(/这道题的题面（来自本地题面库/.test(withStatement), '并且抬头说清了它是从本地题面库来的');

// —— 大小写不一致也要配上：源文件 P53.cpp、题面 p53.md
scene.files = [uri('/ws-term/.olympia/problems/p53.md')];
check((await statementContext()).includes(MARKER), '题面文件名大小写不同也配得上（p53.md ↔ P53.cpp）');

// —— 过长要截断，而且话要说「已截断」
scene.text = 'x'.repeat(9000);
const truncated = await statementContext();
check(truncated.length < 7000 && /过长已截断/.test(truncated), '题面过长会截断，并且明说截断了', `${truncated.length} 字符`);

// —— 对照组：桩文件是空的，那句标记就不该出现。
// 没有这一条，正例可能只是"标记被写死在代码里"，测不出它到底来自读文件。
scene.files = [uri('/ws-term/.olympia/problems/P53.md')];
scene.text = '';
const emptyBody = await statementContext();
check(!emptyBody.includes(MARKER) && /这道题的题面（来自本地题面库/.test(emptyBody),
	'对照：桩文件为空时标记不出现（证明那句话只能来自读文件）');
scene.text = STATEMENT;

// —— 读不到题面时必须说实话，不能留下一个看起来像"看过了"的空串
scene.files = [];
scene.text = STATEMENT;
const missing = await statementContext();
check(/本轮没有题面/.test(missing) && /Ctrl\+Alt\+P/.test(missing), '题面库里没这道题：直说没有，并给出拉题面的键');

scene.folder = undefined;
check(/本轮没有题面/.test(await statementContext()), '没打开工程：也说没有，不装作看过');

scene.folder = uri('/ws-term');
scene.active = undefined;
check(/本轮没有题面/.test(await statementContext()), '没打开源文件：也说没有');

// —— 人格里不能再写「你看不见题面」：那句话现在是不成立的承诺
const compiled = require('fs').readFileSync(new URL('../../oss/extensions/olympia-coach/out/coach.js', import.meta.url), 'utf8');
check(!/你看不到的东西/.test(compiled), '人格不再说"你看不见题面"');
check(/本轮没给就是没缓存/.test(compiled), '人格改成说清"没给就是没缓存"');

let failed = 0;
for (const item of results) {
	if (!item.ok) { failed++; }
	console.log(`${item.ok ? 'ok  ' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
console.log(failed ? `教练带题面：${failed} 项没通过` : `教练带题面：${results.length} 项全过`);
process.exitCode = failed ? 1 : 0;
