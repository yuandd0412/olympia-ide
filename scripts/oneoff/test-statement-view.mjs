// 侧栏题面视图的检查台。
//
// 这里防的是「视图注册成功了但学生看不见题面」这一整类：图标没了、provider 没接上、
// 渲染器不在就白屏、正文把页眉重复一遍、按钮后面没命令。静态门（check-view-containers.mjs）
// 只查贡献点形状，查不到这些，所以这里加载编译好的 out/statementView.js 真跑一遍渲染。
//
//   node scripts/oneoff/test-statement-view.mjs
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

function uri(fsPath) {
	return { fsPath, scheme: 'file', path: fsPath, toString: () => `file://${fsPath}` };
}

/** 当前这份「假工作bench」的状态：每个场景自己重置。 */
const registered = {};
const externalLinks = [];
const executed = [];
/** markdown.api.render 收到的正文——正文被剥成什么样，这里看得见。 */
const rendererInput = [];
let rendererMode = 'ok';
let katexAvailable = true;
const watcher = { pattern: undefined, change: undefined, delete: undefined };
let viewHtml = '';
let viewOptions = undefined;
let messageHandler = undefined;
let visibilityHandler = undefined;

const vscodeStub = {
	RelativePattern: class { constructor(base, pattern) { this.base = base; this.pattern = pattern; } },
	Uri: {
		file: p => uri(p),
		joinPath: (base, ...parts) => uri(path.join(base.fsPath, ...parts)),
		parse: text => uri(text)
	},
	Disposable: { from: (...items) => ({ dispose() { for (const i of items) { i?.dispose?.(); } } }) },
	workspace: {
		asRelativePath: u => u.fsPath,
		fs: { async readFile(u) { return fs.readFileSync(u.fsPath); } },
		createFileSystemWatcher(pattern) {
			watcher.pattern = pattern;
			return {
				onDidChange: cb => { watcher.change = cb; return { dispose() { } }; },
				onDidDelete: cb => { watcher.delete = cb; return { dispose() { } }; },
				onDidCreate: () => ({ dispose() { } }),
				dispose() { }
			};
		}
	},
	window: {
		showInformationMessage: async () => undefined,
		showErrorMessage: async () => undefined
	},
	commands: {
		registerCommand: (id, handler) => { registered[id] = handler; return { dispose() { } }; },
		async executeCommand(id, ...args) {
			executed.push(id);
			if (id === 'markdown.api.render') {
				rendererInput.push(args[0]);
				if (rendererMode === 'missing') { throw new Error('not registered'); }
				if (rendererMode === 'empty') { return ''; }
				return `<p>${String(args[0]).replace(/\n/g, ' ')}</p>`;
			}
			const handler = registered[id];
			// 真 VS Code 对不存在的命令就是抛错，题面视图的退路全靠这个行为。
			if (!handler) { throw new Error(`command not found: ${id}`); }
			return handler(...args);
		}
	},
	env: { openExternal: async u => { externalLinks.push(String(u)); return true; } },
	extensions: {
		getExtension: id => (id === 'vscode.markdown-math' && katexAvailable)
			? { extensionUri: uri(path.join(repoRoot, 'katex')) }
			: undefined
	}
};

const fakeView = {
	webview: {
		get options() { return viewOptions; },
		set options(v) { viewOptions = v; },
		get html() { return viewHtml; },
		set html(v) { viewHtml = v; },
		asWebviewUri: u => `webview-resource://${u.fsPath}`,
		cspSource: 'https://csp.source',
		onDidReceiveMessage: cb => { messageHandler = cb; return { dispose() { } }; }
	},
	onDidChangeVisibility: cb => { visibilityHandler = cb; return { dispose() { } }; },
	visible: true
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	return request === 'vscode' ? vscodeStub : originalLoad.call(this, request, parent, isMain);
};

const templates = await import(pathToFileURL(path.join(contestOut, 'templates.js')).href);
const statementView = await import(pathToFileURL(path.join(contestOut, 'statementView.js')).href);
const { STATEMENT_VIEW_ID, CMD, StatementViewProvider } = statementView;

let failed = 0;
async function check(name, fn) {
	viewHtml = '';
	viewOptions = undefined;
	messageHandler = undefined;
	visibilityHandler = undefined;
	rendererInput.length = 0;
	executed.length = 0;
	externalLinks.length = 0;
	rendererMode = 'ok';
	katexAvailable = true;
	registered[`${STATEMENT_VIEW_ID}.focus`] = async () => undefined;
	try {
		await fn();
		console.log(`ok    ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}\n      ${error.message}`);
	}
}

function makeProvider() {
	const provider = new StatementViewProvider(uri(path.join(repoRoot, 'olympia-contest')));
	provider.resolveWebviewView(fakeView);
	return provider;
}

/** 用产品自己的 writer 写题面：读不出页眉就是两边格式对不上，不是测试手搓的锅。 */
function writeStatement(extraStatement = '') {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia statement test '));
	const file = path.join(dir, 'P9999.md');
	fs.writeFileSync(file, templates.renderStatement({
		id: 'P9999',
		title: '区间和与公式',
		url: 'https://www.luogu.com.cn/problem/P9999',
		platform: 'luogu',
		statement: `给定 $n$ 个整数，复杂度 $O(n\\log n)$。${extraStatement}`,
		inputFormat: '第一行两个整数。\n\n> 我自己写的批注不能一起被剥掉',
		outputFormat: '每行一个答案。\n\n危险字符：<img src=x onerror=alert(1)>',
		hint: '',
		tags: ['前缀和'],
		difficulty: '普及/提高-',
		timeLimit: '1.00s',
		memoryLimit: '125.00 MB',
		samples: [{ input: '5 2', output: '8' }, { input: '1 1', output: '1' }]
	}), 'utf8');
	return { dir, file, uri: uri(file) };
}

function chipsIn(html) {
	return [...html.matchAll(/<span class="chip"><b>([^<]*)<\/b>([^<]*)<\/span>/g)].map(m => `${m[1]}${m[2]}`);
}

/** 事件回调里那一发是 `void this.paint()`（真 VS Code 不等），所以断言前要让它跑完。 */
const settle = () => new Promise(resolve => setTimeout(resolve, 25));

await check('页眉、chips、正文都在一条页面上，且正文不重复页眉已经承担的部分', async () => {
	const { file, uri: u } = writeStatement();
	const provider = makeProvider();
	assert.strictEqual(await provider.show(u), true);
	const html = viewHtml;
	assert.ok(html.includes('P9999 区间和与公式'), '页眉缺标题');
	const chips = chipsIn(html);
	assert.deepStrictEqual(chips, [
		`${templates.FIELD.source}${templates.platformText('luogu')}`,
		`${templates.FIELD.difficulty}普及/提高-`,
		`${templates.FIELD.timeLimit}1.00s`,
		`${templates.FIELD.memoryLimit}125.00 MB`,
		'样例2 组',
	]);
	assert.ok(html.includes('webview-resource://'), '没挂 KaTeX 样式表');
	// 交给渲染器的正文：首行标题和 `> 来源…` / `> 原文链接…` 已经变成页眉了
	const body = rendererInput[rendererInput.length - 1];
	assert.ok(!body.startsWith('# '), '正文还带着标题行');
	assert.ok(!body.includes('原文链接'), '正文还带着链接那行引用');
	assert.ok(!body.includes(templates.META_SEPARATOR), '正文还带着元信息那行引用');
});

await check('学生自己写的引用与正文里的小节标题不被剥掉', async () => {
	const { uri: u } = writeStatement();
	const provider = makeProvider();
	await provider.show(u);
	const body = rendererInput[rendererInput.length - 1];
	assert.ok(body.includes('> 我自己写的批注不能一起被剥掉'), '把所有 `>` 行都删了');
	assert.match(body, /^## /m, '把正文里的小节标题一起删了');
});

await check('chip 的标签取自 FIELD：改字段名不会让页眉静默变空', async () => {
	const { uri: u } = writeStatement();
	const provider = makeProvider();
	await provider.show(u);
	for (const label of [templates.FIELD.source, templates.FIELD.difficulty, templates.FIELD.timeLimit, templates.FIELD.memoryLimit]) {
		assert.ok(viewHtml.includes(`<b>${label}</b>`), `页眉里没有 ${label} 这个 chip`);
	}
});

await check('渲染器不在 → 显示原文并说明原因，不是一块白屏', async () => {
	const { uri: u } = writeStatement();
	rendererMode = 'missing';
	const provider = makeProvider();
	await provider.show(u);
	assert.ok(viewHtml.includes('没有找到 Markdown 渲染器'), '降级了却没告诉学生');
	assert.ok(viewHtml.includes('class="body raw"'), '原文没有按纯文本排版');
});

await check('渲染器返回空 → 同样降级（空字符串不能被当成渲染结果）', async () => {
	const { uri: u } = writeStatement();
	rendererMode = 'empty';
	const provider = makeProvider();
	await provider.show(u);
	assert.ok(viewHtml.includes('没有找到 Markdown 渲染器'));
});

await check('原文按文本转义：题面里的 <img onerror> 不会变成标签', async () => {
	const { uri: u } = writeStatement();
	rendererMode = 'missing';
	const provider = makeProvider();
	await provider.show(u);
	assert.ok(viewHtml.includes('&lt;img src=x onerror=alert(1)&gt;'), '危险字符没有被转义');
	assert.ok(!viewHtml.includes('<img src=x'), '题面里的 HTML 被当成标签插进了页面');
});

await check('渲染过的 HTML 不被二次转义', async () => {
	const { uri: u } = writeStatement();
	const provider = makeProvider();
	await provider.show(u);
	assert.ok(viewHtml.includes('<p>'), '渲染结果被 escape 了一遍，学生看到满屏 &lt;p&gt;');
	assert.ok(viewHtml.includes('O(n\\log n)'), '公式源码在正文里丢了');
});

await check('视图拿不到（focus 命令不存在）→ show() 返回 false，让调用方退回编辑器', async () => {
	const { uri: u } = writeStatement();
	delete registered[`${STATEMENT_VIEW_ID}.focus`];
	const provider = new StatementViewProvider(uri(repoRoot));
	provider.resolveWebviewView(fakeView);   // 贡献点被改坏：视图在，focus 命令没人注册
	viewHtml = '';
	assert.strictEqual(await provider.show(u), false, '视图不存在却说成功了——题面会凭空消失');
	assert.strictEqual(viewHtml, '', '视图没现身还往 webview 上画');
});

await check('空视图给的两条路背后都有真命令', async () => {
	const provider = makeProvider();
	for (const id of [CMD.pull, CMD.pick]) { registered[id] = async () => undefined; }
	// 直接进空状态：不 show 任何文件
	await provider.refresh();
	const buttons = [...viewHtml.matchAll(/<button data-cmd="([^"]+)">/g)].map(m => m[1]);
	assert.ok(buttons.length >= 2, '空状态一个按钮都没有');
	for (const id of buttons) {
		assert.ok(registered[id], `按钮 ${id} 后面没有命令`);
	}
	await messageHandler({ type: 'command', id: buttons[0] });
	assert.ok(executed.includes(buttons[0]), '点按钮没有真的执行命令');
});

await check('KaTeX 样式表与 localResourceRoots 是同一次决定，不会挂出一个 404 链接', async () => {
	const { uri: u } = writeStatement();
	const provider = makeProvider();
	await provider.show(u);
	assert.ok(viewHtml.includes(`href="webview-resource://${path.join(repoRoot, 'katex')}`), '样式表链接不对');
	assert.strictEqual(viewOptions.localResourceRoots.length, 2, '没把 KaTeX 目录放进 localResourceRoots');
	// 反过来：视图创建时才找不到 markdown-math，之后就算出现了也不能挂链接——roots 里没有它
	katexAvailable = false;
	const late = makeProvider();
	katexAvailable = true;
	await late.show(u);
	assert.ok(!viewHtml.includes('<link rel="stylesheet"'), 'roots 里没有它，链接挂上去只是一个 404');
	assert.strictEqual(viewOptions.localResourceRoots.length, 1, '不该塞一个当时不存在的根目录');
	assert.ok(viewHtml.includes('P9999 区间和与公式'), '没样式表就不画题面了');
});

await check('CSP 允许 webview 内的 KaTeX 字体与脚本 nonce', async () => {
	const { uri: u } = writeStatement();
	const provider = makeProvider();
	await provider.show(u);
	assert.ok(viewHtml.includes('font-src https://csp.source'), '字体被 CSP 拦了——公式只剩一堆乱码字符');
	assert.match(viewHtml, /script-src 'nonce-[A-Za-z0-9]{32}'/);
	assert.match(viewHtml, /<script nonce="[A-Za-z0-9]{32}">/);
});

await check('页面上的 https 链接交给系统浏览器，其他协议不交', async () => {
	const { uri: u } = writeStatement();
	const provider = makeProvider();
	await provider.show(u);
	await messageHandler({ type: 'open', href: 'https://www.luogu.com.cn/problem/P9999' });
	assert.deepStrictEqual(externalLinks, ['file://https://www.luogu.com.cn/problem/P9999']);
	await messageHandler({ type: 'open', href: 'file:///C:/Windows/system32/cmd.exe' });
	await messageHandler({ type: 'open', href: 'javascript:alert(1)' });
	assert.strictEqual(externalLinks.length, 1, '把非 http(s) 链接交给了系统');
});

await check('重新拉题面就地覆盖同一个文件 → 侧栏跟着重画', async () => {
	const { file, uri: u } = writeStatement();
	const provider = makeProvider();
	await provider.show(u);
	const before = viewHtml;
	fs.writeFileSync(file, templates.renderStatement({
		id: 'P9999', title: '区间和与公式', url: 'https://www.luogu.com.cn/problem/P9999', platform: 'luogu',
		statement: '改过的题面', inputFormat: '', outputFormat: '', hint: '', tags: [],
		difficulty: '入门', timeLimit: '2.00s', memoryLimit: '64 MB', samples: []
	}), 'utf8');
	await watcher.change(uri(file));
	await settle();
	assert.notStrictEqual(viewHtml, before, '文件变了，侧栏还是旧的');
	assert.ok(viewHtml.includes('改过的题面'));
	await watcher.change(uri(path.join(path.dirname(file), 'OTHER.md')));
	await settle();
	const snapshot = viewHtml;
	await watcher.change(uri(path.join(path.dirname(file), 'OTHER.md')));
	await settle();
	assert.strictEqual(viewHtml, snapshot, '别的文件改动也跟着重画');
});

await check('题面被删 → 回到空状态而不是留着读不到的内容', async () => {
	const { file, uri: u } = writeStatement();
	const provider = makeProvider();
	await provider.show(u);
	await watcher.delete(uri(file));
	await settle();
	assert.ok(viewHtml.includes('侧栏里还没有题面'), '删掉后还挂着上一份');
});

await check('切走再切回来仍然画得出来（retainContextWhenHidden 挡不住重画需求）', async () => {
	const { uri: u } = writeStatement();
	const provider = makeProvider();
	await provider.show(u);
	viewHtml = '';
	fakeView.visible = true;
	await visibilityHandler();
	await settle();
	// 每次画都换一个 nonce，所以这里只问「画没画、画的是不是这一道」
	assert.ok(viewHtml.includes('P9999 区间和与公式'), '视图重新可见时没重画');
});

console.log(failed ? `\n${failed} 处题面视图不成立` : '\nall statement-view checks passed');
process.exit(failed ? 1 : 0);
