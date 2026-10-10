// Pass 3: apply a settings-UI focused dictionary using the same safe rule as
// pass 1 (only the final string argument of a localize() call).
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = 'D:/oler-ide-v2/oss/src/vs';
const dict = JSON.parse(readFileSync('D:/oler-ide-v2/build/zh-cn-settings-dict.json', 'utf8'));
delete dict._comment;
for (const k of Object.keys(dict)) {
	if (typeof dict[k] !== 'string' || !dict[k].trim()) { delete dict[k]; }
}

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const st = statSync(p);
		if (st.isDirectory()) { out.push(...walk(p)); }
		else if (name.endsWith('.ts') && !name.endsWith('.d.ts') && !/\.test\.ts$/.test(name)) { out.push(p); }
	}
	return out;
}

const RE = /(\blocalize2?\(\s*(?:\{[\s\S]*?\}\s*,\s*)?(?:'[^']*'|"[^"]*")\s*(?:,\s*(?:'[^']*'|"[^"]*"))*\s*,\s*)"((?:[^"\\]|\\.)*)"/g;

const used = new Set();
let total = 0;
const files = [];
for (const file of walk(ROOT)) {
	const before = readFileSync(file, 'utf8');
	let n = 0;
	const after = before.replace(RE, (m, prefix, str) => {
		// Object.hasOwn, not `dict[str] === undefined` -- see the note in apply-zh-cn.mjs
		if (!Object.hasOwn(dict, str)) { return m; }
		const hit = dict[str];
		used.add(str);
		n++;
		return prefix + JSON.stringify(hit);
	});
	if (n > 0) { writeFileSync(file, after, 'utf8'); total += n; files.push([n, file.replace(ROOT, '')]); }
}
files.sort((a, b) => b[0] - a[0]);
console.log(`settings-dict replacements: ${total} across ${files.length} files`);
console.log(`dict used: ${used.size} / ${Object.keys(dict).length}`);
for (const [n, f] of files.slice(0, 18)) { console.log(`  ${String(n).padStart(4)}  ${f}`); }
