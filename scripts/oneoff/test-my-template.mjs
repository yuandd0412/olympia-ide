// 「我的模板」检查台（老版本 Tauri 有的自定义代码模板）。
//
// 这里要防的是两件很实在的事：
//   1. 学生建了模板却没填，空文件被当成一份模板插进代码里——他看到的是空白。
//   2. 拉题面自动建的 .cpp 把他写到一半的代码盖掉。
// 两条都只能在真实磁盘上验：断言读的是写出来的文件，不看内存里的字符串。
//
//   node scripts/oneoff/test-my-template.mjs
//
// 需要先编译扩展：npm run gulp -- compile-extension:olympia-contest
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

const messages = [];
const picks = [];
const shown = [];
const inserted = [];
let registered = {};

/** 扩展注册的 webview 视图提供方（题面侧栏），按视图 id 存着。 */
const webviewProviders = new Map();

function uri(fsPath) {
	return { fsPath, scheme: 'file', path: fsPath, toString: () => `file:///${fsPath.replace(/\\/g, '/')}` };
}

let workspaceRoot = '';
/** 测试之间改设置用的开关表；不在表里就走清单默认值。 */
let settings = {};
/** 弹出来的 QuickPick 选第几项；没设就选第一项。 */
let pickWith;
/** 强行让 QuickPick 返回某一项（用来试「列表里没有的选项」这种非预期输入）。 */
let forced;
let inputId;
/** 有没有打开工作区文件夹：不打开的时候所有落盘的入口都该给指引而不是报错。 */
let noWorkspace = false;

/** 编辑器桩：只记下插到光标处的文本，插入本身由断言查。 */
let editor = undefined;

const vscodeStub = {
	ProgressLocation: { Notification: 15 },
	// 题库列表行末那颗 ★ 是模块级 new vscode.ThemeIcon(...) 建出来的；桩里没有这个类，
	// olympia-contest 的 problemLibrary 连 import 都过不去，整份检查台一道也跑不了。
	ThemeIcon: class { constructor(id) { this.id = id; } },
	ThemeColor: class { constructor(id) { this.id = id; } },
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
		get workspaceFolders() { return noWorkspace ? undefined : [{ uri: uri(workspaceRoot), name: path.basename(workspaceRoot), index: 0 }]; },
		textDocuments: [],
		getConfiguration: section => ({
			get: (key, fallback) => settings[`${section}.${key}`] ?? fallback
		}),
		asRelativePath: u => path.basename(u.fsPath),
		openTextDocument: async u => ({ fileName: u.fsPath, uri: u, getText: () => fs.readFileSync(u.fsPath, 'utf8') }),
		onDidChangeConfiguration: () => ({ dispose() { } }),
		onDidSaveTextDocument: () => ({ dispose() { } })
	},
	window: {
		get activeTextEditor() { return editor; },
		showWarningMessage: async (...a) => { messages.push(['warning', a[0]]); return undefined; },
		showInformationMessage: async (...a) => { messages.push(['info', a[0]]); return undefined; },
		showErrorMessage: async (...a) => { messages.push(['error', a[0]]); return undefined; },
		showQuickPick: async items => {
			const list = Array.isArray(items) ? items : await items;
			picks.push(list);
			// forced 用来塞一个「列表里根本没有」的选项：模拟旧版界面或非预期的返回值
			if (forced !== undefined) { return forced; }
			if (pickWith === undefined) { return list[0]; }
			const found = typeof pickWith === 'function' ? list.find(pickWith) : list[pickWith];
			return found;
		},
		showInputBox: async () => inputId,
		showTextDocument: async doc => { shown.push(doc.fileName ?? doc.uri?.fsPath); return {}; },
		withProgress: async (_options, task) => task({ report() { } }, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() { } }) }),
		createOutputChannel: title => ({ title, appendLine() { }, append() { }, show() { }, dispose() { } }),
		// 题面侧栏（statementView）在 activate 时注册：没有这个替身，olympia-contest 根本
		// activate 不起来，整份检查台一道也跑不了。这里不需要它渲染，只把提供方收着。
		registerWebviewViewProvider: (id, provider) => {
			webviewProviders.set(id, provider);
			return { dispose() { } };
		},
		onDidChangeActiveTextEditor: () => ({ dispose() { } })
	},
	commands: {
		registerCommand: (id, handler) => { registered[id] = handler; return { dispose() { } }; },
		// 和真 VS Code 一样：没注册的命令是 reject，不是回 undefined。
		// （题面侧栏 `olympia.statement.focus` 就靠这个失败退回编辑器。）
		executeCommand: async (id, ...args) => {
			if (!Object.hasOwn(registered, id)) { throw new Error(`command '${id}' not found`); }
			return registered[id](...args);
		}
	},
	languages: {
		registerCompletionItemProvider: () => ({ dispose() { } })
	},
	env: { openExternal: async () => true, clipboard: { readText: async () => '' } },
	extensions: { all: [], getExtension: () => undefined }
};

/**
 * 拉题面走的是真网络，检查台不能联网。sources.js 编译后是 `require("./net")`，
 * 所以在这里把 './net' 换成假页面包：产品自己的解析器读假页面，写出来的题面就是真的。
 */
const fakeNet = {
	async fetchText(url) {
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
const onboardingFiles = await import(pathToFileURL(path.join(onboardingOut, 'problemFiles.js')).href);

const context = () => ({ subscriptions: [], workspaceState: { get: (_k, d) => d, update: async () => { } } });
contest.activate(context());
assert.ok(registered['olympia.template.insert'], 'olympia.template.insert 必须由 olympia-contest 注册');
assert.ok(registered['olympia.template.editMy'], '「编辑我的模板」要有直达命令，面板才有点得动的入口');

let failed = 0;
async function check(name, fn) {
	messages.length = 0;
	picks.length = 0;
	shown.length = 0;
	inserted.length = 0;
	pickWith = undefined;
	forced = undefined;
	inputId = undefined;
	noWorkspace = false;
	settings = {};
	editor = {
		selection: { active: { line: 0, character: 0 } },
		edit: cb => cb({ insert: (_pos, text) => inserted.push(text) })
	};
	workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia tmpl '));
	try {
		await fn();
		console.log(`ok    ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}\n      ${error.message}`);
	}
}

const templateFile = () => path.join(workspaceRoot, templates.TEMPLATE_FOLDER, templates.TEMPLATE_FILE);
const myTemplatePath = () => {
	fs.mkdirSync(path.dirname(templateFile()), { recursive: true });
	return templateFile();
};
/** 面板上那一行文字（消息 + 选择器标题合起来看）。 */
const said = () => messages.map(m => m[1]).join('\n');
const labels = () => picks.map(list => list.map(item => item.label).join(' ｜ ')).join('\n');
/**
 * 「我的模板」这一项在不在。
 * 只能按 `mine` 认：列表里那句「新建我的模板…」也含「我的模板」四个字，按文字找会一直误报。
 */
const mineItem = () => picks.flat().find(item => item.mine);

await check('ACM 模板第一行不该带那个多余的 $', () => {
	const first = templates.ACM_TEMPLATE.split(/\r?\n/)[0];
	assert.equal(first, '// Olympia ACM 赛制模板 — C++17', `模板抬头不对：${first}`);
	assert.ok(!first.includes('$'), '$ 是转义时留下的残渣，学生看到的应该是干净的抬头');
});

await check('还没有模板时：列表里只有赛制模板和「新建」，不吹自己有模板', async () => {
	pickWith = () => false;			// 看了一眼就取消，别真插
	await registered['olympia.template.insert']();
	assert.equal(picks.length, 1, '没弹出模板选择');
	assert.equal(mineItem(), undefined, '一份模板都没有的时候不该列出「我的模板」');
	const last = picks[0][picks[0].length - 1];
	assert.match(last.label, /新建我的模板/, `最后一项应该是新建：${last.label}`);
	assert.equal(last.mine, undefined);
	assert.match(picks[0][0].label, /ACM 赛制/);
	assert.match(picks[0][1].label, /IOI 赛制/);
	assert.equal(inserted.length, 0, '取消选择也往编辑器写了东西');
});

await check('点「新建我的模板」：拿 ACM 模板打底建文件，不往编辑器插东西', async () => {
	pickWith = item => item.edit;
	await registered['olympia.template.insert']();
	const file = templateFile();
	assert.ok(fs.existsSync(file), '没有建出 .olympia/template.cpp');
	const text = fs.readFileSync(file, 'utf8');
	assert.equal(text, templates.ACM_TEMPLATE, '打底内容应该就是 ACM 模板');
	assert.equal(inserted.length, 0, '建模板不是插模板，不该往当前文件里写东西');
	assert.deepEqual(shown, [file], '建完应该直接把文件打开让人改');
});

await check('填好之后：「我的模板」排第一，选中插的就是我写的那几行', async () => {
	const mine = '// 我的模板\n#include <bits/stdc++.h>\nusing namespace std;\nint main() { puts(\"ok\"); }\n';
	fs.writeFileSync(myTemplatePath(), mine, 'utf8');
	pickWith = () => false;			// 这次只看列表长什么样
	await registered['olympia.template.insert']();
	assert.equal(picks[0][0].label, templates.MY_TEMPLATE_LABEL, '自己的那份该排在最前面');
	assert.match(picks[0][0].description, /\.olympia\/template\.cpp/, `描述要说出文件在哪：${picks[0][0].description}`);
	assert.match(picks[0].find(item => item.edit).label, /编辑我的模板/, '有了模板就该说「编辑」而不是「新建」');
	assert.equal(inserted.length, 0, '只是看了一眼列表就写了代码');

	pickWith = item => item.mine;
	await registered['olympia.template.insert']();
	assert.deepEqual(inserted, [mine], `插进编辑器的不是我那份模板：${inserted.length} 条`);
	assert.match(said(), /已插入你的模板/, '插完要确认用的是自己的模板');
});

await check('空文件不算模板：新建了还没填，不该被当成一份模板插进代码', async () => {
	fs.writeFileSync(myTemplatePath(), '\n  \n\t\n', 'utf8');
	pickWith = () => false;
	await registered['olympia.template.insert']();
	assert.equal(mineItem(), undefined, `空文件被当成模板列出来了：${labels()}`);
	// 就算被硬塞进来（比如旧版界面），也不能往编辑器写空白
	forced = { label: templates.MY_TEMPLATE_LABEL, mine: true };
	await registered['olympia.template.insert']();
	assert.equal(inserted.length, 0, '往编辑器插了空白模板');
	assert.match(said(), /我的模板是空的/, '要说明为什么没插');
});

await check('没打开 C++ 文件时点模板：给指引，不写盘也不报错', async () => {
	fs.writeFileSync(myTemplatePath(), '// mine\n', 'utf8');
	editor = undefined;
	pickWith = item => item.mine;
	await registered['olympia.template.insert']();
	assert.match(said(), /请先打开一个 C\+\+ 文件/);
	assert.equal(inserted.length, 0);
});

await check('没打开文件夹时：「编辑我的模板」说清模板存在哪，不硬建文件', async () => {
	noWorkspace = true;
	await registered['olympia.template.editMy']();
	assert.match(said(), /先打开一个文件夹/);
	assert.match(said(), /\.olympia\/template\.cpp/, '要说出路径，学生才知道去哪找');
});

await check('「编辑我的模板」命令：没有就先建一份再打开，改完保存就是下一次插的', async () => {
	await registered['olympia.template.editMy']();
	assert.ok(fs.existsSync(templateFile()), '命令没建出模板文件');
	assert.deepEqual(shown, [templateFile()], '建完没把模板打开');
	// 学生在打开的文件里改了几行、保存 —— 下一次插模板就该是这几行
	fs.writeFileSync(templateFile(), '// 改过的一份\n', 'utf8');
	pickWith = item => item.mine;
	await registered['olympia.template.insert']();
	assert.deepEqual(inserted, ['// 改过的一份\n'], '改过的模板没被下一次插入用上');
});

await check('拉题面建 .cpp：默认不开这个开关，产品不能偷偷建文件', async () => {
	fs.writeFileSync(myTemplatePath(), '// mine\n', 'utf8');
	inputId = 'P1001';
	await registered['olympia.problem.pull']();
	assert.ok(fs.existsSync(path.join(workspaceRoot, '.olympia', 'problems', 'P1001.md')), '题面没写出来');
	assert.equal(fs.existsSync(path.join(workspaceRoot, '.olympia', 'problems', 'P1001.cpp')), false, '开关没开就建了 .cpp');
});

await check('开关打开 + 有我的模板：新建的 .cpp 用的就是自己那份', async () => {
	settings['olympia.problem.templateOnPull'] = true;
	const mine = '#include <bits/stdc++.h>\n// 我的起手式\n';
	fs.writeFileSync(myTemplatePath(), mine, 'utf8');
	inputId = 'P1001';
	await registered['olympia.problem.pull']();
	const seed = path.join(workspaceRoot, '.olympia', 'problems', 'P1001.cpp');
	assert.ok(fs.existsSync(seed), '拉完题面没建出配套的 .cpp');
	assert.equal(fs.readFileSync(seed, 'utf8'), mine, '建的文件没用我的模板');
});

await check('开关打开 + 没有模板：退回 ACM 模板打底', async () => {
	settings['olympia.problem.templateOnPull'] = true;
	inputId = 'P1002';
	await registered['olympia.problem.pull']();
	const seed = path.join(workspaceRoot, '.olympia', 'problems', 'P1002.cpp');
	assert.equal(fs.readFileSync(seed, 'utf8'), templates.ACM_TEMPLATE, '没模板时应该拿 ACM 模板打底');
});

await check('重拉题面不能盖掉我写到一半的代码', async () => {
	settings['olympia.problem.templateOnPull'] = true;
	fs.writeFileSync(myTemplatePath(), '// mine\n', 'utf8');
	inputId = 'P1001';
	await registered['olympia.problem.pull']();
	const seed = path.join(workspaceRoot, '.olympia', 'problems', 'P1001.cpp');
	fs.writeFileSync(seed, '#include <bits/stdc++.h>\nint main(){ /* 写了一半 */ }\n', 'utf8');
	await registered['olympia.problem.pull']();
	assert.match(fs.readFileSync(seed, 'utf8'), /写了一半/, '重新拉题面把学生的代码清了');
	assert.match(fs.readFileSync(path.join(workspaceRoot, '.olympia', 'problems', 'P1001.md'), 'utf8'), /A\+B Problem/, '题面本身还是该重写的');
});

await check('赛制模板那两条路照旧：IOI 插的是函数版，没有 main', async () => {
	pickWith = item => item.format === 'ioi';
	await registered['olympia.template.insert']();
	assert.equal(inserted.length, 1, 'IOI 模板没插进编辑器');
	assert.match(inserted[0], /ll solve\(/);
	assert.ok(!inserted[0].includes('int main'), 'IOI 模板里不该有 main');
	assert.match(said(), /IOI/);

	inserted.length = 0;
	pickWith = item => item.format === 'acm';
	await registered['olympia.template.insert']();
	assert.equal(inserted[0], templates.ACM_TEMPLATE);
});

await check('模板清单里就两个赛制，加赛制只改表不改逻辑', () => {
	assert.deepEqual(Object.keys(templates.FORMAT_LABEL), ['acm', 'ioi']);
	assert.deepEqual(Object.keys(templates.PLATFORM_TEXT), ['luogu', 'codeforces', 'atcoder']);
});

await check('面板说的模板路径就是 contest 真正写的那个文件（两个扩展各说各的算 bug）', () => {
	// onboarding 不能 import contest 的源码，所以它那份标签只能靠这条断言拴在真实路径上。
	assert.equal(onboardingFiles.TEMPLATE_PATH_LABEL, `${templates.TEMPLATE_FOLDER}/${templates.TEMPLATE_FILE}`);
	const view = fs.readFileSync(path.join(onboardingSrc, 'toolsView.ts'), 'utf8');
	assert.ok(!view.includes(onboardingFiles.TEMPLATE_PATH_LABEL), '面板里又把路径写成了字面量，应该用 TEMPLATE_PATH_LABEL');
});

console.log(failed ? '\nFAILED' : '\nall my-template assertions passed');
process.exitCode = failed ? 1 : 0;
