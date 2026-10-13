// 设置默认值对齐检查：清单里写的 default 和代码里 get(key, 兜底) 的那个兜底必须是同一个值。
//
// 为什么要有这台检查台：一个键的默认值实际上可能写在三个地方——扩展清单的 default、
// 读它的代码里的兜底、以及**另一个**扩展里同样的兜底（跑样例读 olympia.problem.problemsDir）。
// 改了清单没改兜底，界面说的是 A、代码干的是 B，而且只在「用户没动过这项设置」时出现，
// 最难发现的正是这种平时看不见的分裂。
//
// 键名和兜底都允许写常量名（`GOAL_SETTING`、`DEFAULT_PROBLEMS_DIR`）：先按本文件的
// `const X = 字面量` 解，解不到再到同一个扩展的其它文件里找（兜底经常是 import 进来的那个常量），
// `${文件夹}/problems` 这种模板串按表展开。解不出来的（函数调用、动态表达式）跳过而不是假装通过。
//
//   node scripts/oneoff/check-config-defaults.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const extensionsRoot = path.join(repoRoot, 'oss/extensions');
const EXTENSIONS = ['olympia-onboarding', 'olympia-contest', 'olympia-coach'];

let failed = 0;
function report(ok, label) {
	console.log(`${ok ? 'ok   ' : 'FAIL '} ${label}`);
	if (!ok) { failed++; }
}

function parseLiteral(raw) {
	const value = (raw ?? '').trim();
	if (value.startsWith("'") || value.startsWith('"')) {
		const quote = value[0];
		const end = value.indexOf(quote, 1);
		return end > 0 ? value.slice(1, end) : undefined;
	}
	if (/^-?\d+(\.\d+)?$/.test(value)) { return Number(value); }
	if (value === 'true' || value === 'false') { return value === 'true'; }
	return undefined;
}

/**
 * 模板字符串也算字面量：`${OLYMPIA_FOLDER}/problems` 就是路径该写的方式（文件夹名只有一个，
 * 不是一处一个字符串），只要里面每个 `${}` 都能在同一张表里查到，值就是确定的。
 * 只认 `${IDENT}` 这种最简单的写法；认不出来的返回 undefined，由调用方报 n/a，不猜。
 */
function parseTemplate(raw, table) {
	const body = /^`([\s\S]*)`$/.exec((raw ?? '').trim())?.[1];
	if (body === undefined || body.includes('`')) { return undefined; }
	let out = '';
	body.split(/\$\{|\}/).forEach((part, index) => {
		if (index % 2 === 0) { out += part; return; }
		const value = table.get(part.trim());
		if (value === undefined) { throw new Error('unresolvable'); }
		out += value;
	});
	return out;
}

function parseValue(raw, table) {
	const literal = parseLiteral(raw);
	if (literal !== undefined) { return literal; }
	try {
		return parseTemplate(raw, table);
	} catch {
		return undefined;
	}
}

/** 清单声明的默认值：id → 值（只比标量，对象/数组不是这类 bug 的现场）。 */
const declared = new Map();
for (const id of EXTENSIONS) {
	const manifest = JSON.parse(fs.readFileSync(path.join(extensionsRoot, id, 'package.json'), 'utf8'));
	for (const [key, schema] of Object.entries(manifest.contributes?.configuration?.properties ?? {})) {
		if (schema && Object.prototype.hasOwnProperty.call(schema, 'default') && typeof schema.default !== 'object') {
			declared.set(key, schema.default);
		}
	}
}
report(declared.size > 0, `三个清单里读到 ${declared.size} 个带默认值的设置项`);

function sourceFiles(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) { return sourceFiles(full); }
		return entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [full] : [];
	});
}

/** 文件内的字符串/数字常量：键名和兜底经常写成它们，模板串里的 `${}` 也查这张表。 */
function constTable(text) {
	const table = new Map();
	for (const match of text.matchAll(/^(?:export\s+)?const\s+(\w+)(?:\s*:\s*[^=\n]+?)?\s*=\s*([^;]+);/gm)) {
		const value = parseValue(match[2], table);
		if (value !== undefined) { table.set(match[1], value); }
	}
	return table;
}

/** 同一个扩展里的常量表并起来：兜底常常写的是从别的文件 import 进来的那个常量。 */
function mergeTables(tables) {
	const merged = new Map();
	for (const table of tables) {
		for (const [name, value] of table) {
			if (!merged.has(name)) { merged.set(name, value); }
		}
	}
	return merged;
}

function resolve(raw, ...tables) {
	const literal = parseValue(raw, tables[0]);
	if (literal !== undefined) { return literal; }
	const name = (raw ?? '').trim();
	if (!/^[A-Za-z_$][\w$]*$/.test(name)) { return undefined; }
	for (const table of tables) {
		if (table.has(name)) { return table.get(name); }
	}
	return undefined;
}

const GET = /\.get(?:<[^(>]*>)?\(\s*('[^']+'|[A-Za-z_$][\w$]*)\s*(?:,\s*([^)]+?))?\s*\)/g;
const SECTION = /getConfiguration\(\s*('[^']+'|[A-Za-z_$][\w$]*)\s*\)/g;
let checked = 0;
const skipped = [];

for (const id of EXTENSIONS) {
	const src = path.join(extensionsRoot, id, 'src');
	if (!fs.existsSync(src)) { continue; }
	const files = sourceFiles(src).map(file => ({ file, text: fs.readFileSync(file, 'utf8') }));
	const shared = mergeTables(files.map(({ text }) => constTable(text)));
	for (const { file, text } of files) {
		const table = constTable(text);
		const sections = [...new Set([...text.matchAll(SECTION)].map(m => resolve(m[1], table, shared)).filter(v => typeof v === 'string'))];
		const prefixes = [...sections, 'olympia'];
		for (const match of text.matchAll(GET)) {
			// Memento / SecretStorage 也有 .get(key)，那些不是设置，没有清单默认值可比。
			const before = text.slice(Math.max(0, match.index - 40), match.index);
			if (/(workspaceState|globalState|secrets)\s*(?:<[^>]*>)?$/.test(before)) { continue; }
			const key = resolve(match[1], table, shared);
			if (typeof key !== 'string') { continue; }          // 动态键：这层看不住，明说
			const full = prefixes.map(section => `${section}.${key}`).find(candidate => declared.has(candidate));
			if (!full) {
				if (key.includes('.')) { report(false, `${path.relative(extensionsRoot, file)} 读的设置「${prefixes.join('|')}」里没有 ${key}`); }
				continue;
			}
			if (match[2] === undefined) { continue; }           // 没写兜底，交给 VS Code 的清单默认值
			const fallback = resolve(match[2], table, shared);
			if (fallback === undefined) { skipped.push(`${path.relative(extensionsRoot, file)}：${full} 的兜底 ${match[2].trim()}`); continue; }
			checked++;
			const want = declared.get(full);
			report(fallback === want,
				`${path.relative(extensionsRoot, file)}：${full} 代码兜底 ${JSON.stringify(fallback)}，清单默认 ${JSON.stringify(want)}`);
		}
	}
}
report(checked > 0, `比对了 ${checked} 处兜底值`);
// 覆盖面说清楚：兜底写成表达式的那些这里不猜，别让人以为都查过了。
for (const note of skipped) { console.log(`n/a   ${note}（表达式，未比对）`); }

console.log(failed ? '\nFAILED' : '\nall config-default checks passed');
process.exitCode = failed ? 1 : 0;
