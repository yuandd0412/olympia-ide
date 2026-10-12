// One-off harness for the C++ contest completion list ("竞赛常用写法补全").
//
// Two things go wrong when a snippet table like this is copied from the old Tauri app: an alias
// stops matching, or a body does not actually compile. The old app shipped exactly that bug —
// its Dijkstra entry was an unbalanced `priority_queue<...> pq;` — and a student only finds out
// when the completion silently breaks their file. So this loads the real build output
// (`extensions/olympia-contest/out/snippets.js`) with `vscode` stubbed, checks the searchable
// fields, and feeds every body through the bundled g++ with its placeholders stripped.
//
//   node scripts/oneoff/test-cpp-snippets.mjs
//
// Requires `npm run gulp compile-extension:olympia-contest` to have run first.
import Module from 'module';
import assert from 'assert';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GPP = path.join(repoRoot, 'VSCode-win32-x64/resources/app/toolchain/mingw64/bin/g++.exe');
const outDir = new URL('../../oss/extensions/olympia-contest/out/', import.meta.url);
try {
	readFileSync(new URL('snippets.js', outDir));
} catch {
	console.error('out/snippets.js is missing — run: npm run gulp compile-extension:olympia-contest (in oss/)');
	process.exit(1);
}

const require = createRequire(new URL('snippets.js', outDir));

class Position { constructor(line, character) { this.line = line; this.character = character; } }
class Range {
	constructor(a, b, c, d) {
		if (a instanceof Position) { this.start = a; this.end = b; return; }
		this.start = new Position(a, b);
		this.end = new Position(c, d);
	}
}
class MarkdownString { constructor(value) { this.value = value; } }
class SnippetString { constructor(value) { this.value = value; } }
class CompletionItem { constructor(label, kind) { this.label = label; this.kind = kind; } }

let provider = undefined;
let snippetsEnabled = true;

const vscodeStub = {
	CompletionItem,
	CompletionItemKind: { Snippet: 19 },
	MarkdownString,
	SnippetString,
	Range,
	workspace: {
		getConfiguration: section => ({
			get: (key, fallback) => section === 'olympia.templates' && key === 'cppSnippets' ? snippetsEnabled : fallback
		})
	},
	languages: {
		registerCompletionItemProvider: (selector, hooks) => {
			assert.strictEqual(selector.language, 'cpp', '补全只应该挂在 cpp 语言上');
			provider = hooks;
			return { dispose() { provider = undefined; } };
		}
	}
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};

const { CONTEST_SNIPPETS, registerCppSnippets } = require('./snippets.js');
const plainBody = body => body.replace(/\$\{\d+:([^}]*)\}/g, '$1').replace(/\$\{\d+\}/g, '');

let failed = 0;
function check(name, fn) {
	try {
		fn();
		console.log(`ok    ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}: ${error.message}`);
	}
}

const document = { getWordRangeAtPosition: () => undefined };

check('注册后能拿到 provider', () => {
	const disposable = registerCppSnippets();
	assert.ok(provider, 'registerCompletionItemProvider 没被调用');
	disposable.dispose();
	assert.ok(!provider, 'dispose 之后 provider 还在');
	registerCppSnippets();
});

const items = provider.provideCompletionItems(document, new Position(0, 0));

check('条目数与数据表一致', () => {
	assert.strictEqual(items.length, CONTEST_SNIPPETS.length);
	assert.ok(CONTEST_SNIPPETS.length >= 20, `只有 ${CONTEST_SNIPPETS.length} 条，老版本有 20 条`);
});

check('每条都是 snippet 插入、说明与提示都是中文', () => {
	for (const item of items) {
		assert.ok(item.insertText instanceof SnippetString, `${item.label} 不是 SnippetString`);
		assert.ok(/[一-龥]/.test(item.detail), `${item.label} 的 detail 里没有中文：${item.detail}`);
		assert.ok(/[一-龥]/.test(item.documentation.value), `${item.label} 的提示里没有中文`);
	}
});

check('英文 id 与中文都说得通：filterText 覆盖别名', () => {
	const byId = new Map(CONTEST_SNIPPETS.map(s => [s.id, s]));
	const aliases = { ios: ['fast', 'sync'], freopen: 'file', lb: 'bound', qpow: 'pow', dsu: 'union', sieve: 'prime', dijkstra: 'shortest', bfs: 'queue' };
	for (const [id, wanted] of Object.entries(aliases)) {
		const snippet = byId.get(id);
		assert.ok(snippet, `数据表里没有 ${id}`);
		const haystack = `${snippet.id} ${snippet.label} ${snippet.detail} ${snippet.keys.join(' ')}`.toLowerCase();
		for (const needle of [wanted].flat()) {
			assert.ok(haystack.includes(needle.toLowerCase()), `${id} 搜不到「${needle}」：${haystack}`);
		}
	}
});

check('占位符语法合法：每个 ${ 都能闭合', () => {
	for (const snippet of CONTEST_SNIPPETS) {
		const stray = snippet.body.replace(/\$\{\d+(:[^{}]*)?\}/g, '').includes('${');
		assert.ok(!stray, `${snippet.id} 有没闭合的占位符`);
	}
});

check('设置关掉之后一条都不给', () => {
	snippetsEnabled = false;
	assert.deepStrictEqual(provider.provideCompletionItems(document, new Position(0, 0)), []);
	snippetsEnabled = true;
});

// ---- 真正的验收：把占位符填好之后，g++ 认不认这段代码 ----
const PRELUDE = [
	'#include <bits/stdc++.h>',
	'using namespace std;',
	'',
	'int n = 10;',
	'int s = 1;',
	'int x = 1;',
	'vector<int> v;',
].join('\n');

/** 函数定义和 struct 定义不能塞在 main 里，这几条放文件作用域。 */
const FILE_SCOPE = new Set(['qpow', 'dsu']);
/** 图上跑的两条各自需要什么形状的邻接表。 */
const EXTRA_DECLS = new Map([
	['dijkstra', 'vector<vector<pair<int, int>>> adj;'],
	['bfs', 'vector<vector<int>> adj;']
]);
/** lower_bound / upper_bound 是表达式，得挂进一条语句里才谈得上编译。 */
const AS_EXPRESSION = new Set(['lb', 'ub']);

function sourceOf(snippet, body) {
	const decls = EXTRA_DECLS.get(snippet.id) ?? '';
	if (FILE_SCOPE.has(snippet.id)) {
		return `${PRELUDE}\n${decls}\n${body}\nint main() { return 0; }\n`;
	}
	const statement = AS_EXPRESSION.has(snippet.id) ? `auto found = ${body};` : body;
	return `${PRELUDE}\n${decls}\nint main() {\n${statement}\n    return 0;\n}\n`;
}

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'olympia-snippets-'));
const compileErrors = [];
try {
	for (const snippet of CONTEST_SNIPPETS) {
		const body = plainBody(snippet.body);
		const file = path.join(tmpDir, `${snippet.id}.cpp`);
		writeFileSync(file, sourceOf(snippet, body), 'utf8');
		const result = spawnSync(GPP, ['-fsyntax-only', '-std=c++17', file], { encoding: 'utf8' });
		if (result.error) { throw new Error(`跑不动 ${GPP}：${result.error.message}`); }
		if (result.status !== 0) {
			compileErrors.push(`${snippet.id}: ${(result.stderr || '').split('\n').filter(l => l.includes('error')).slice(0, 2).join(' | ')}`);
		}
	}
	check('每条正文填好占位符之后都能编译（g++ -std=c++17 -fsyntax-only）', () => {
		assert.ok(existsSync(GPP), `内置 g++ 不在 ${GPP}`);
		assert.deepStrictEqual(compileErrors, [], `\n        ${compileErrors.join('\n        ')}`);
	});
} finally {
	rmSync(tmpDir, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} 处补全表与预期不符` : `\nall ${CONTEST_SNIPPETS.length} snippet checks passed`);
process.exitCode = failed ? 1 : 0;
