/*---------------------------------------------------------------------------------------------
 * Olympia 内置扩展之间的命令 id 对拍。
 *
 * 为什么需要：扩展各自打包，跨扩展 import 不了常量，所以 olympia-coach / olympia-contest /
 * olympia-onboarding 各自留了一份 id 表（constants.ts、statementView 的 CMD、commands.ts）。
 * 一旦某处拼错、或者 package.json 的菜单/键位指向一条没人注册的命令，表现就是「按钮点了没反应」
 * 「快捷键按了没反应」，而且不报错——这个 fork 已经真踩过一次（defaultChatAgent.completionsMenuCommand
 * 指向一条不存在的命令，是个看不见的死菜单项）。所以这里把三类来源对到一起：
 *   声明（package.json contributes.commands） / 注册（代码里的 registerCommand） /
 *   引用（package.json 的菜单、键位，以及各扩展自己那份 id 表）。
 * 被引用但既没注册也没声明 = 死链；声明了但没人注册 = 同样死链。
 *
 * 注册调用几乎都写成 registerCommand(CMD.show, …) 而不是裸字面量，所以必须先把常量解析成 id；
 * 只认字面量的版本会把 31 条声明里的 20 多条误报成死链（第一版就是这么错的）。
 *--------------------------------------------------------------------------------------------*/

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverOlympiaExtensions } from './lib/olympia-extensions.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const extRoot = path.join(repoRoot, 'oss', 'extensions');
// 名单从磁盘发现，不写死：加了新扩展而忘了改这里，它的命令 id 就没人对拍了。
const EXTENSIONS = discoverOlympiaExtensions(extRoot);

/** VS Code 自己的命令前缀：这些不归我们注册。 */
const BUILTIN_PREFIXES = ['workbench.', 'editor.', 'vscode.', 'extension.', 'terminal.', 'notebook.', 'chat.', 'setContext', 'executeCommand', 'runCommands'];
const isBuiltin = id => BUILTIN_PREFIXES.some(p => id.startsWith(p));
const ID_SHAPE = /^(olympia|vscode|workbench)\.[\w.]+$/;

const declared = new Set();
const registered = new Set();
const refs = new Map();       // id -> Set(位置)
const unresolved = [];        // 常量解析不到的注册调用
const alias = new Map();      // 'CMD.show' / 'SETTINGS_COMMAND' -> id

function noteRef(id, where) {
	if (!refs.has(id)) { refs.set(id, new Set()); }
	refs.get(id).add(where);
}

function setEquals(a, b) {
	if (a.size !== b.size) { return false; }
	for (const v of a) { if (!b.has(v)) { return false; } }
	return true;
}

/** 取 `{` 起始的对象字面量文本（自己做括号配对，正则不认嵌套）。 */
function objectBody(text, openIdx) {
	let depth = 0;
	for (let i = openIdx; i < text.length; i++) {
		const c = text[i];
		if (c === '{') { depth++; }
		else if (c === '}') { depth--; if (depth === 0) { return text.slice(openIdx + 1, i); } }
	}
	return '';
}

function collectAliases(text, where) {
	for (const m of text.matchAll(/\bconst\s+([A-Za-z0-9_]+)\s*(?::[^=]*?)?=\s*'([^']+)'/g)) {
		if (!ID_SHAPE.test(m[2])) { continue; }
		if (alias.has(m[1]) && alias.get(m[1]) !== m[2]) { unresolved.push(`${where}: 常量 ${m[1]} 在两个文件里指向不同 id`); continue; }
		alias.set(m[1], m[2]);
	}
	for (const m of text.matchAll(/\bconst\s+([A-Za-z0-9_]+)\s*(?::[^=]*?)?=\s*\{/g)) {
		const body = objectBody(text, m.index + m[0].length - 1);
		for (const e of body.matchAll(/^\s*([A-Za-z0-9_]+)\s*:\s*'([^']+)'/gm)) {
			if (!ID_SHAPE.test(e[2])) { continue; }
			alias.set(`${m[1]}.${e[1]}`, e[2]);
		}
	}
}

function walkJson(node, file, keyName) {
	if (typeof node === 'string') {
		if ((keyName === 'command' || keyName.endsWith('Command')) && ID_SHAPE.test(node)) { noteRef(node, `${file} (${keyName})`); }
		return;
	}
	if (Array.isArray(node)) { for (const v of node) { walkJson(v, file, keyName); } return; }
	if (node && typeof node === 'object') {
		for (const [k, v] of Object.entries(node)) { walkJson(v, file, k); }
	}
}

const sources = [];
for (const ext of EXTENSIONS) {
	const pkgPath = path.join(extRoot, ext, 'package.json');
	assert.ok(fs.existsSync(pkgPath), `少了扩展：${pkgPath}`);
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
	const rel = `${ext}/package.json`;
	for (const c of pkg?.contributes?.commands ?? []) {
		if (typeof c?.command === 'string') { declared.add(c.command); }
	}
	walkJson(pkg.contributes?.menus ?? {}, rel, '');
	walkJson(pkg.contributes?.keybindings ?? [], rel, '');

	const srcDir = path.join(extRoot, ext, 'src');
	for (const f of fs.existsSync(srcDir) ? fs.readdirSync(srcDir) : []) {
		if (!f.endsWith('.ts') || f.endsWith('.d.ts')) { continue; }
		sources.push({ ext, f, text: fs.readFileSync(path.join(srcDir, f), 'utf8') });
	}
}

// 常量表要先建全，才能解析注册调用。
for (const s of sources) { collectAliases(s.text, `${s.ext}/src/${s.f}`); }

for (const s of sources) {
	const where = `${s.ext}/src/${s.f}`;
	for (const m of s.text.matchAll(/registerCommand\(\s*(?:'([^']+)'|([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?))/g)) {
		if (m[1]) { registered.add(m[1]); continue; }
		const id = alias.get(m[2]);
		if (!id) { unresolved.push(`${where}: registerCommand(${m[2]}) 解析不到 id`); continue; }
		registered.add(id);
	}
	// id 表：`key: 'olympia.…'` 形式的条目，作者意图就是「这是条要用的命令 id」
	for (const m of s.text.matchAll(/^\s*([A-Za-z0-9_]+)\s*:\s*'(olympia\.[\w.]+)'/gm)) {
		noteRef(m[2], `${where}:${m[1]}`);
	}
	for (const m of s.text.matchAll(/executeCommand\(\s*'(olympia\.[\w.]+)'/g)) {
		noteRef(m[1], `${where} executeCommand`);
	}
}

const missing = [];
for (const [id, where] of refs) {
	if (isBuiltin(id) || registered.has(id) || declared.has(id)) { continue; }
	missing.push(`${id}  ←  ${[...where].join('、')}`);
}
const orphan = [];
for (const id of declared) {
	if (!registered.has(id) && !isBuiltin(id)) { orphan.push(`${id}  ←  在 contributes.commands 里声明了，但没有任何扩展注册它`); }
}

console.log(`常量 ${alias.size} 个 / 声明 ${declared.size} 条 / 注册 ${registered.size} 条 / 引用 ${refs.size} 处`);
for (const line of unresolved) { console.log(`FAIL 常量解析失败：${line}`); }
for (const line of missing) { console.log(`FAIL 没人注册这条命令：${line}`); }
for (const line of orphan) { console.log(`FAIL ${line}`); }

assert.ok(refs.size >= 25, `只收集到 ${refs.size} 处引用，取样塌了：检查 package.json 遍历或 id 表正则`);
assert.ok(registered.size >= 25, `只解析出 ${registered.size} 条注册，常量表大概没建全`);
assert.ok(setEquals(declared, registered) || [...declared].every(d => registered.has(d) || isBuiltin(d)), '声明集与注册集不一致');
assert.deepStrictEqual(unresolved, []);
assert.deepStrictEqual(missing, []);
assert.deepStrictEqual(orphan, []);
console.log('\nall olympia command ids resolve');
