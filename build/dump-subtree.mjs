// Dump still-English localize() strings from one subtree (read-only).
//   node build/dump-subtree.mjs <abs-subtree> [limit]
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.argv[2];
const LIMIT = +(process.argv[3] ?? 200);
const CJK = /[\u3400-\u9fff]/;

function walk(d) {
	const o = [];
	for (const n of readdirSync(d)) {
		const p = join(d, n);
		const s = statSync(p);
		if (s.isDirectory()) { o.push(...walk(p)); }
		else if (n.endsWith('.ts') && !n.endsWith('.d.ts')) { o.push(p); }
	}
	return o;
}

const RE = /(?:\b(?:nls\.)?localize|localize2?)\(\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")?\s*,\s*"((?:[^"\\]|\\.)*)"/g;

const cnt = new Map();
for (const f of walk(ROOT)) {
	let t;
	try { t = readFileSync(f, 'utf8'); } catch { continue; }
	RE.lastIndex = 0;
	let m;
	while ((m = RE.exec(t))) {
		const s = m[1];
		if (!s || CJK.test(s) || s.length < 2 || s.length > 160) { continue; }
		cnt.set(s, (cnt.get(s) ?? 0) + 1);
	}
}

const rows = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
console.log(`${relative('D:/oler-ide-v2/oss', ROOT)}: occurrences=${rows.reduce((a, r) => a + r[1], 0)} distinct=${rows.length}\n`);
for (const [s, n] of rows.slice(0, LIMIT)) { console.log(`${String(n).padStart(3)}  ${s}`); }