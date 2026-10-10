// Frequency-rank the literal English nls strings. Translating the head of this
// list once and applying it across src/vs covers most UI surfaces, because the
// same short word (Cancel, Save, Close...) is re-declared in dozens of files.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = 'D:/oler-ide-v2/oss/src/vs';

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

const RE = /\blocalize2?\(\s*(?:\{[^}]*\}\s*,\s*)?(?:'[^']*'|"[^"]*")\s*(?:,\s*(?:'[^']*'|"[^"]*"))*\s*,\s*"((?:[^"\\]|\\.)*)"/g;

const freq = new Map();
let total = 0;
for (const file of walk(ROOT)) {
	const text = readFileSync(file, 'utf8');
	let m;
	while ((m = RE.exec(text)) !== null) {
		const s = m[1].replace(/\\"/g, '"');
		if (!s.trim()) { continue; }
		total++;
		freq.set(s, (freq.get(s) ?? 0) + 1);
	}
}

const rows = [...freq.entries()].sort((a, b) => b[1] - a[1]);
const head = rows.filter(r => r[1] >= 2);
const headCount = head.reduce((s, r) => s + r[1], 0);
console.log(`total literal occurrences: ${total}`);
console.log(`distinct strings: ${rows.length}`);
console.log(`strings seen >=2 times: ${head.length}, covering ${headCount} occurrences (${Math.round(headCount / total * 100)}%)\n`);

const out = rows.map(([s, n]) => `${n}\t${s.replace(/\n/g, '\\n')}`).join('\n');
writeFileSync('D:/oler-ide-v2/build/nls-freq.txt', out, 'utf8');
console.log('wrote D:/oler-ide-v2/build/nls-freq.txt');

console.log('\nTOP 220 (this is the translation worklist head):');
for (const [s, n] of rows.slice(0, 220)) {
	console.log(`  ${String(n).padStart(4)}  ${s.replace(/\n/g, '\\n').slice(0, 96)}`);
}
