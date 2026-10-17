// 部件级语法检查的体检。跑法：node scripts/oneoff/test-block-check.mjs
//
// 为什么这些断言必须真跑：这条链路上已经有三处只能靠跑才知道的东西——
//   ① 随扩展发的那三个文件（运行时 JS + 两个 wasm）在不在、能不能按扩展里那套调用顺序加载
//      （`init` 挂在 `Parser` 类上，不在模块本身；写成 `module.init` 在界面上只会落一条
//      「语法解析器没能加载」，源码看着却完全对——2026-10-17 真机踩过）。
//   ② 解析器到底报不报得出来：少分号、`cout <<` 断链、括号不配；而注释和字符串里的括号不能误报。
//   ③ 「一个部件刚写完」的判定：顶层花括号闭合才算，没闭合（还在往里写）不算。
// 再加几条源码位置的断言：那三处界面文案的分支一旦写反，绿色勾就会替一个没启编译器的工具说话。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(\w:\/)/, '$1').replace(/\//g, path.sep));
const EXT = path.join(ROOT, 'oss', 'extensions', 'olympia-onboarding');
const SYNTAX = path.join(EXT, 'syntax');
const src = file => fs.readFileSync(path.join(EXT, 'src', file), 'utf8');

const results = [];
const report = (ok, name, detail = '') => {
	results.push({ ok: !!ok, name, detail });
};

// —— ① 三个文件在不在（不在就别往下跑：随包发的东西少了，界面上只会静默降级）
for (const file of ['tree-sitter.js', 'tree-sitter.wasm', 'tree-sitter-cpp.wasm']) {
	const full = path.join(SYNTAX, file);
	const size = fs.existsSync(full) ? fs.statSync(full).size : 0;
	report(size > 1000, `随扩展发的 ${file} 在（不是空文件）`, `${size} 字节`);
}

const { Parser, Language } = require(path.join(SYNTAX, 'tree-sitter.js'));
assert.equal(typeof Parser.init, 'function', 'Parser.init 必须是函数：扩展里就是按这个顺序调的');
await Parser.init({ locateFile: name => `${SYNTAX}/${name}` });
const language = await Language.load(`${SYNTAX}/tree-sitter-cpp.wasm`);
const parser = new Parser();
parser.setLanguage(language);
report(typeof parser.parse === 'function', '按扩展里那套调用顺序能加载并使用解析器');

const errorsIn = source => {
	const tree = parser.parse(source);
	const out = [];
	const walk = node => {
		if (node.isError || node.isMissing) {
			out.push(`${node.isMissing ? 'MISSING' : 'ERROR'}:${node.type}`);
			return;
		}
		for (const child of node.children) { walk(child); }
	};
	walk(tree.rootNode);
	tree.delete();
	return out;
};

const GOOD = `#include <bits/stdc++.h>
using namespace std;
int solve(int n) {
	int best = 0;
	for (int i = 1; i <= n; i++) { best = max(best, i); }
	return best;
}
`;
report(errorsIn(GOOD).length === 0, '好代码一条都不报（基准，不成立时后面几条都不可信）', errorsIn(GOOD).join(','));
/** 改不动就直接报错：replace 没命中会留下一份"好代码"，那条断言就永远绿（假绿见过太多次了）。 */
const cut = (from, to) => {
	const next = GOOD.replace(from, to);
	assert.notEqual(next, GOOD, `夹具没命中：${from}`);
	return next;
};
report(errorsIn(cut('return best;', 'return best')).length > 0, '少一个分号报得出来');
report(errorsIn(cut('\treturn best;\n}', '\treturn best;\n\tcout <<\n}')).length > 0, '`cout <<` 断在一行中间报得出来');
report(errorsIn(cut('int solve(int n) {', 'int solve(int n) {{')).length > 0, '花括号多一个报得出来');
report(errorsIn(cut('\tint best = 0;', '\t// 括号 ( ) { } 在注释里\n\tint best = 0;')).length === 0, '注释里的括号不误报');
report(errorsIn(cut('\treturn best;', '\tprintf("} (\\n");\n\treturn best;')).length === 0, '字符串里的括号不误报');

// —— ③ 「部件写完了」的判定
const { scanStructure } = require(path.join(EXT, 'out', 'blockDone.js'));
const structure = [
	['顶层两个函数', 'int f(){ return 1; }\nint main(){ return 0; }', 2, 0],
	['字符串里有花括号', 'int main(){ printf("}"); return 0; }', 1, 0],
	['行注释里有花括号', '// {\nint main(){ return 0; } // }', 1, 0],
	['块注释里有花括号', '/* { } */\nint main(){ return 0; }', 1, 0],
	['还在往里写：没闭合', 'int main(){ int a=1;', 0, 1],
	['部件没写完就报分号缺失', 'int main(){ printf("(");\n', 0, 1],
];
for (const [name, source, blocks, depth] of structure) {
	const got = scanStructure(source);
	report(got.blocks === blocks && got.depth === depth, `scanStructure：${name}`, `得到 ${got.blocks}/${got.depth}，期望 ${blocks}/${depth}`);
}

// —— ④ 界面文案的分支：没启编译器那一层，永远不能写「体检通过」
const statusBar = src('statusBar.ts');
const toolsView = src('toolsView.ts');
const extension = src('extension.ts');
const packageJson = JSON.parse(fs.readFileSync(path.join(EXT, 'package.json'), 'utf8'));
report(/checkLevel\(editor\.document\) === 'structure'/.test(statusBar) && /findings\.length === 0 && checkLevel/.test(statusBar),
	'状态栏：结构那一层要先看有没有 findings，再决定写不写勾');
report(!/else if \(checkLevel\(editor\.document\) === 'structure'\) \{\s*\n\s*checkItem\.text = \$\(check\)/.test(statusBar),
	'状态栏：不能一看到 structure 层就写「结构没报错」（真机错过一次）');
report(/STRUCTURE_LABEL_STATUS/.test(statusBar) && /structural \? '结构错误' : '编译错误'/.test(statusBar),
	'状态栏：措辞取自 precheckState，且分得开结构与编译');
report(/STRUCTURE_LABEL_PANEL/.test(toolsView) && /处结构错误/.test(toolsView) && /处编译错误/.test(toolsView),
	'工具面板分得开结构错误与编译错误');
report(/STRUCTURE_LABEL_PANEL = '结构没报错/.test(src('precheckState.ts')) && /STRUCTURE_LABEL_STATUS = '结构没报错/.test(src('precheckState.ts')),
	'两处界面的「结构」字样出自 precheckState 一处');
report(/depth === 0 && blocks > before/.test(extension), '触发条件：顶层闭合且部件数变大');
report(/BLOCK_DEBOUNCE_MS/.test(extension), '防抖时间是个具名常量，不是写在调用点的一个数');
report(packageJson.contributes?.configuration?.properties?.['olympia.check.onBlockDone']?.default === true,
	'清单里 olympia.check.onBlockDone 默认开（设置页读的就是这张表）');
report(/语法解析器没能加载/.test(src('parserCheck.ts')) && /blocked/.test(src('parserCheck.ts')),
	'解析器加载失败要落一条 blocked，不能变成「没错误」');

let failed = 0;
for (const item of results) {
	if (!item.ok) { failed++; }
	console.log(`${item.ok ? 'ok  ' : 'FAIL'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
console.log(failed ? `部件级语法检查：${failed} 项没通过` : `部件级语法检查：${results.length} 项全过`);
// 不用 process.exit：wasm 还挂在事件循环上，Windows 的 libuv 会在退出时甩一句
// `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`，看着像崩了其实不是。
process.exitCode = failed ? 1 : 0;
