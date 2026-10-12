// 扫 localize()/localize2() 调用：消息里用到的 {n} 下标必须落在实际传入的参数个数之内。
// 起因是 permissions.autoApprove.warning.detail —— 链接写的是 [{0}]，而参数顺序是
// (levelLabel, defaultSettingKey)，于是点「去改设置」会拿本地化标签去设置里搜，永远搜不到。
// 这类错位编译不报错、跑起来也不报错，只有用户点下去才发现，所以静态扫一遍。
// 运行：node scripts/oneoff/scan-localize-arity.mjs [相对路径前缀...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const roots = process.argv.slice(2).length
	? process.argv.slice(2).map(p => path.resolve(repoRoot, p))
	: [path.join(repoRoot, 'oss/src/vs'), path.join(repoRoot, 'oss/extensions')];

const SKIP_DIR = /(node_modules|[/\\]test[/\\]|[/\\]out[/\\]|[/\\]\.build[/\\])/;

function walk(dir, out) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!SKIP_DIR.test(full + path.sep)) { walk(full, out); }
		} else if (entry.name.endsWith('.ts')) {
			out.push(full);
		}
	}
	return out;
}

/** 从 `(` 开始做括号配对，返回与之匹配的 `)` 的下标。 */
function matchParen(text, open) {
	let depth = 0;
	for (let i = open; i < text.length; i++) {
		const ch = text[i];
		if (ch === '"' || ch === "'" || ch === '`') { i = skipString(text, i); continue; }
		if (ch === '(') { depth++; } else if (ch === ')') { depth--; if (depth === 0) { return i; } }
	}
	return -1;
}

/** 返回字符串结束引号的下标（跳过转义）。 */
function skipString(text, start) {
	const quote = text[start];
	for (let i = start + 1; i < text.length; i++) {
		if (text[i] === '\\') { i++; continue; }
		if (text[i] === quote) { return i; }
	}
	return text.length - 1;
}

/** 拆出顶层实参（按逗号切，忽略嵌套括号/字符串里的逗号）。 */
function splitArgs(inner) {
	const parts = [];
	let depth = 0;
	let current = '';
	for (let i = 0; i < inner.length; i++) {
		const ch = inner[i];
		if (ch === '"' || ch === "'" || ch === '`') {
			const end = skipString(inner, i);
			current += inner.slice(i, end + 1);
			i = end;
			continue;
		}
		if (ch === '(' || ch === '[' || ch === '{') { depth++; }
		else if (ch === ')' || ch === ']' || ch === '}') { depth--; }
		if (ch === ',' && depth === 0) { parts.push(current); current = ''; } else { current += ch; }
	}
	if (current.trim()) { parts.push(current); }
	return parts.map(p => p.trim());
}

/** 取消息字面量的内容；模板串或非字面量返回 undefined（跳过，别猜）。 */
function messageText(node) {
	const trimmed = node.trim();
	if ((trimmed.startsWith('"') || trimmed.startsWith("'")) && trimmed.length > 1) {
		// 拼接的相邻字面量（上游 nls 常用）合并后再看占位符。
		const pieces = trimmed.split('+').map(s => s.trim());
		let out = '';
		for (const piece of pieces) {
			if (!/^["']/.test(piece)) { return undefined; }
			const end = skipString(piece, 0);
			out += piece.slice(1, end);
		}
		return out;
	}
	return undefined;
}

/**
 * 消息 + 实参个数 → 分类。抽成函数是为了能拿构造的例子自测：否则这工具永远只会吐一个 0，
 * 而 0 既可能代表干净，也可能代表根本没读到东西。
 */
function classify(message, argCount) {
	const used = [...new Set([...message.matchAll(/\{(\d+)\}/g)].map(x => Number(x[1])))].sort((a, b) => a - b);
	if (!used.length) { return undefined; }
	const maxIndex = used[used.length - 1];
	if (argCount === 0) {
		return { bucket: 'format', note: `占位符 {${used.join('}{')} } 没有实参：多半留给外面的 format()，人工确认` };
	}
	if (maxIndex >= argCount) {
		return { bucket: 'definite', note: `用到 {${maxIndex}} 却只传了 ${argCount} 个实参 —— 屏幕上会留下字面的 {${maxIndex}}` };
	}
	for (let i = 0; i <= maxIndex; i++) {
		if (!used.includes(i)) {
			return { bucket: 'unused', note: `用到 {${maxIndex}} 却跳过 {${i}}（${argCount} 个实参）—— 确认本地化时没把文本吃掉` };
		}
	}
	return undefined;
}

// 自测：三个分类各构造一个，再加一个应当完全干净的。
for (const [message, argCount, expected] of [
	['请更改 [{0}](command:x?{1}) 设置。', 2, undefined],
	['理由: {1}', 2, 'unused'],
	['只有一个实参却要 {1}', 1, 'definite'],
	['属性（{0}）', 0, 'format'],
]) {
	const got = classify(message, argCount)?.bucket;
	if (got !== expected) {
		console.log(`自测失败：「${message}」/ ${argCount} 个实参 → ${got ?? '无分类'}，期望 ${expected ?? '无分类'}`);
		process.exitCode = 1;
	}
}
if (process.exitCode) { process.exit(1); }

const definite = [];
const needsFormatCheck = [];
const unusedIndex = [];
let scanned = 0;
for (const root of roots) {
	if (!fs.existsSync(root)) { continue; }
	for (const file of walk(root, [])) {
		const text = fs.readFileSync(file, 'utf8');
		if (!text.includes('localize')) { continue; }
		scanned++;
		for (const m of text.matchAll(/\blocalize2?\s*\(/g)) {
			const open = m.index + m[0].length - 1;
			const close = matchParen(text, open);
			if (close < 0) { continue; }
			const args = splitArgs(text.slice(open + 1, close));
			// localize(key, message, ...values) 与 localize({key, comment}, message, ...values) 的实参个数算法一样
			const messageNode = args[1];
			const argCount = Math.max(0, args.length - 2);
			const message = messageNode === undefined ? undefined : messageText(messageNode);
			if (message === undefined) { continue; }
			// 展开的参数（...labels）个数静态看不出来，别硬猜成「实参不够」。
			if (args.slice(2).some(a => a.trim().startsWith('...'))) { continue; }
			const verdict = classify(message, argCount);
			if (!verdict) { continue; }
			const where = `${path.relative(repoRoot, file)}:${text.slice(0, m.index).split('\n').length}`;
			(verdict.bucket === 'definite' ? definite : verdict.bucket === 'format' ? needsFormatCheck : unusedIndex)
				.push(`${where} ${verdict.note}`);
		}
	}
}

console.log(`scanned ${scanned} files under ${roots.length} root(s)`);
const show = (list, limit) => [...new Set(list)].slice(0, limit).forEach(f => console.log(`  - ${f}`));
console.log(`确定错位（实参不够，屏幕会留下字面 {n}）：${definite.length}`);
show(definite, 40);
console.log(`本地化后跳号（{0} 被丢掉，可能是文本被吃掉，也可能本来就不需要）：${unusedIndex.length}`);
show(unusedIndex, 12);
console.log(`占位符交给外面 format() 填（正常写法，只列数量）：${needsFormatCheck.length}`);
process.exitCode = definite.length ? 1 : 0;
