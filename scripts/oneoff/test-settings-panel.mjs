// Olympia 设置页的检查台：这一页整个是从三个扩展的清单里读出来的，所以它最大的风险不是崩，
// 而是「清单里加了一项设置，页面上没有」——那种漂移在真机上看不出来，只能对着清单断言。
//
// 加载的是编译产物 out/settingsPanel.js，vscode 用桩顶掉；清单是真读磁盘上的 package.json，
// 所以改清单不用改这个检查台。
//
//   node scripts/oneoff/test-settings-panel.mjs
//
// Requires:
//   npm run gulp -- compile-extension:olympia-onboarding
import Module from 'module';
import assert from 'assert';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';

const outDir = new URL('../../oss/extensions/olympia-onboarding/out/', import.meta.url);
const requireOnboarding = createRequire(new URL('settingsPanel.js', outDir));
const SETTINGS_COMMAND = 'olympia.settings';
const REAL_EXTENSIONS = ['olympia-onboarding', 'olympia-contest', 'olympia-coach'];

function manifest(name) {
	const file = path.join(process.cwd(), 'oss', 'extensions', name, 'package.json');
	return JSON.parse(readFileSync(file, 'utf8'));
}

/** 清单里的全部 olympia.* 设置项——页面上的行数要和这个数一致。 */
function schemaKeys(list = REAL_EXTENSIONS) {
	const keys = new Set();
	for (const name of list) {
		const contribution = manifest(name).contributes.configuration;
		for (const block of Array.isArray(contribution) ? contribution : [contribution]) {
			for (const key of Object.keys(block.properties ?? {})) {
				if (key.startsWith('olympia.')) {
					keys.add(key);
				}
			}
		}
	}
	return [...keys];
}

/** 临时塞进清单的一项设置：用来证明页面是跟着清单长的，而不是抄了一份表。 */
function fakeExtension(id, properties) {
	return { id, packageJSON: { contributes: { configuration: { properties } } } };
}

const values = new Map();
const updates = [];
let updateFails = false;
const registered = new Map();
const panels = [];
const warnings = [];
let extensions = REAL_EXTENSIONS.map(name => fakeExtension(`olympia.${name}`, mergeProperties(name)));

function mergeProperties(name) {
	const contribution = manifest(name).contributes.configuration;
	const properties = {};
	for (const block of Array.isArray(contribution) ? contribution : [contribution]) {
		Object.assign(properties, block.properties ?? {});
	}
	return properties;
}

class Disposable {
	constructor(fn) { this.fn = fn; }
	dispose() { this.fn?.(); }
	static from(...items) { return new Disposable(() => items.forEach(item => item?.dispose?.())); }
}

function uriStub(fsPath) {
	return { fsPath, scheme: 'file', toString: () => `file:///${fsPath.replace(/\\/g, '/')}` };
}

const vscodeStub = {
	Disposable,
	ViewColumn: { One: 1 },
	ConfigurationTarget: { Global: 1, Workspace: 2 },
	extensions: { get all() { return extensions; } },
	window: {
		createWebviewPanel: (viewType, title, column, options) => {
			const panel = {
				viewType, title, column, options, html: '', messages: [], listeners: [], disposeListeners: [], revealed: 0,
				webview: {
					cspSource: 'vscode-webview:',
					get html() { return panel.html; },
					set html(text) { panel.html = text; },
					asWebviewUri: uri => uri,
					postMessage: async message => { panel.messages.push(message); return true; },
					onDidReceiveMessage: listener => { panel.listeners.push(listener); return new Disposable(); }
				},
				reveal() { panel.revealed++; },
				onDidDispose: listener => { panel.disposeListeners.push(listener); return new Disposable(); },
				dispose() { for (const listener of panel.disposeListeners) { listener(); } }
			};
			panels.push(panel);
			return panel;
		},
		showOpenDialog: async () => [uriStub('D:\\toolchain\\mingw64\\bin\\g++.exe')],
		showErrorMessage: async text => { warnings.push(text); },
		showWarningMessage: async text => { warnings.push(text); },
		showInformationMessage: async text => { warnings.push(text); }
	},
	commands: {
		registerCommand: (id, handler) => { registered.set(id, handler); return new Disposable(() => registered.delete(id)); },
		executeCommand: async (id, ...args) => {
			if (id === SETTINGS_COMMAND || id === 'workbench.action.openSettings') {
				return undefined;
			}
			if (!registered.has(id)) {
				throw new Error(`command not found: ${id}`);
			}
			return registered.get(id)(...args);
		}
	},
	workspace: {
		getConfiguration: () => ({
			inspect: key => ({ key, defaultValue: defaultOf(key), globalValue: values.has(key) ? values.get(key) : undefined }),
			update: async (key, value, target) => {
				updates.push({ key, value, target });
				if (updateFails) {
					throw new Error('settings.json 是只读的（模拟）');
				}
				value === undefined ? values.delete(key) : values.set(key, value);
			}
		}),
		onDidChangeConfiguration: () => new Disposable()
	}
};

function defaultOf(key) {
	for (const extension of extensions) {
		if (key in extension.packageJSON.contributes.configuration.properties) {
			return extension.packageJSON.contributes.configuration.properties[key].default;
		}
	}
	return undefined;
}

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};

const settingsModule = requireOnboarding('./settingsPanel.js');
const subscription = settingsModule.registerSettingsPanel();

const open = () => registered.get(SETTINGS_COMMAND)();
const current = () => panels[panels.length - 1];
/** 关掉再开，让页面按当前 extensions 列表重新渲染。 */
async function reopen() {
	current()?.dispose();
	await open();
	return current().html;
}
/** 页面里那一行的行号：从内嵌的 rows 数组找，不和渲染顺序耦合。 */
function rowIndex(html, key) {
	const rows = JSON.parse(html.match(/const rows = (\[.*?\]);/s)[1]);
	const index = rows.findIndex(row => row.key === key);
	assert.ok(index >= 0, `页面上没有 ${key} 这一行`);
	return index;
}
const sent = type => current().messages.filter(message => message.type === type).at(-1);

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

await check('打开设置页：清单里每一项 olympia.* 设置都出现，行数一一对上', async () => {
	await open();
	const html = current().html;
	const keys = schemaKeys();
	assert.ok(keys.length >= 20, `清单里只有 ${keys.length} 项设置，检查台假定了 20 项以上`);
	for (const key of keys) {
		assert.ok(html.includes(`>${key}<`), `页面上没有 ${key} 这一行`);
	}
	const rows = (html.match(/class="row"/g) ?? []).length;
	assert.equal(rows, keys.length, `页面列了 ${rows} 行，清单里有 ${keys.length} 项——清单加了设置而页面没跟着长`);
});

await check('分组和说明都来自清单：标题取第一句，枚举显示中文名', async () => {
	const html = current().html;
	for (const group of ['编译器与评测档位', '跑样例', '对拍', '题面与题库', 'AI 教练']) {
		assert.ok(html.includes(`<h2>${group}</h2>`), `少了「${group}」这一组`);
	}
	assert.ok(html.includes('对拍轮数'), '说明文字要从清单的 markdownDescription 来，不能在扩展里再抄一份');
	assert.ok(html.includes('<option value="luogu">洛谷默认'), '枚举要显示 enumDescriptions 的中文名，不是 luogu');
});

await check('清单里新加一项设置，页面自动列出来（包括没人认识的新分组）', async () => {
	extensions = [...REAL_EXTENSIONS.map(name => fakeExtension(`olympia.${name}`, mergeProperties(name))),
		fakeExtension('olympia.brandnew', { 'olympia.brandnew.thing': { type: 'boolean', default: false, markdownDescription: '一件新事。说明写在这里。' } })];
	const html = await reopen();
	assert.ok(html.includes('>olympia.brandnew.thing<'), '新增一项设置，页面却把它丢了');
	assert.match(html, /<h2>其他<\/h2>/, '不认识的设计算到「其他」，不然就凭空少一行');
	assert.match(html, /说明写在这里/, '新项的说明也要显示出来');
});

await check('AI 那两项不在这里编辑，只给一个跳到 AI 设置的按钮', async () => {
	const html = await reopen();
	for (const key of ['olympia.ai.baseUrl', 'olympia.ai.models']) {
		assert.ok(html.includes(`data-ai="${rowIndex(html, key)}"`), `${key} 应该是「到 AI 设置里改」，不是输入框`);
	}
});

await check('编译器路径给「浏览…」，选了文件就写进全局设置', async () => {
	const html = await reopen();
	const key = 'olympia.compiler.path';
	assert.ok(html.includes(`data-browse="${rowIndex(html, key)}"`), '路径类设置要有「浏览…」按钮');
	updates.length = 0;
	await current().listeners[0]({ type: 'browse', key });
	const written = updates.at(-1);
	assert.deepEqual({ key: written.key, target: written.target }, { key, target: 1 }, '浏览结果要写到全局设置');
	assert.match(written.value, /g\+\+\.exe$/, `浏览到的路径没写进去：${written.value}`);
});

await check('改一项的值就立刻写 settings.json，并回一行「已保存」', async () => {
	updates.length = 0;
	await current().listeners[0]({ type: 'set', key: 'olympia.stress.rounds', value: 250 });
	assert.deepEqual(updates[0], { key: 'olympia.stress.rounds', value: 250, target: 1 });
	assert.match(sent('note').text, /已保存 olympia\.stress\.rounds/);
	assert.equal(values.get('olympia.stress.rounds'), 250);
});

await check('改完的下一份值要重新发给页面：「已改」标记跟着亮', async () => {
	const round = sent('values').values.find(item => item.key === 'olympia.stress.rounds');
	assert.equal(round.value, 250);
	assert.equal(round.overridden, true, '改过的项要标出来，不然看不出这不是默认值');
});

await check('写不进去时把原因显示出来，不静默失败', async () => {
	updateFails = true;
	await current().listeners[0]({ type: 'set', key: 'olympia.stress.rounds', value: 5 });
	const note = sent('note');
	assert.equal(note.kind, 'err');
	assert.match(note.text, /只读/);
	updateFails = false;
});

await check('恢复默认就是删掉这一项，页面退回清单里的默认值', async () => {
	values.set('olympia.check.enabled', false);
	await current().listeners[0]({ type: 'reset', key: 'olympia.check.enabled' });
	assert.ok(!values.has('olympia.check.enabled'), '没有退回默认值');
	const item = sent('values').values.find(row => row.key === 'olympia.check.enabled');
	assert.equal(item.overridden, false, '页面还在标「已改」');
	assert.equal(item.value, true, '回的是清单里的默认值');
});

await check('AI 设置那个扩展没注册时，按钮要说清楚为什么没反应', async () => {
	warnings.length = 0;
	await current().listeners[0]({ type: 'aiSettings' });
	assert.match(warnings.join('\n'), /olympia-coach|没启用/, '跳不过去时要给原因');
});

await check('再按一次命令是回到同一页，不会开第二个面板', async () => {
	const before = panels.length;
	await open();
	assert.equal(panels.length, before, `多开了一个面板（共 ${panels.length} 个）`);
	assert.ok(current().revealed >= 1, '已经打开时应该 reveal 而不是新建');
});

await check('设置键名和默认值里的尖括号都要转义，不能变成脚本', async () => {
	extensions = [...REAL_EXTENSIONS.map(name => fakeExtension(`olympia.${name}`, mergeProperties(name))),
		fakeExtension('olympia.evil', {
			'olympia.evil.<img src=x onerror=alert(1)>': { type: 'string', default: '</script><b>坏</b>', markdownDescription: '恶意标题。<script>坏东西</script>' }
		})];
	const html = await reopen();
	assert.ok(!html.includes('<img src=x'), '设置键名被当成 HTML 注入了');
	assert.ok(!html.includes('<script>坏东西</script>'), '说明文字被当成 HTML 注入了');
	assert.ok(!html.includes('</script><b>坏</b>'), '占位符里的默认值被当成 HTML 注入了');
	assert.match(html, /&#60;img src=x/, '转义用的是数字实体，原文仍然要看得见');
});

subscription.dispose();
console.log(failed ? '\nFAILED' : '\nsettings panel checks passed');
process.exitCode = failed ? 1 : 0;
