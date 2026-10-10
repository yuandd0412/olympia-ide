// Apply the zh-cn source-string map across src/vs.
//
// Safety: the regex only matches the FINAL string argument of a
// localize()/localize2()/nls.localize() call, so the nls key, comment object
// and format arguments are never touched. Idempotent: already-translated
// strings are not in the dict, so a second run is a no-op.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = 'D:/oler-ide-v2/oss/src/vs';
const dict = JSON.parse(readFileSync('D:/oler-ide-v2/build/zh-cn-dict.json', 'utf8'));
delete dict._comment;

// dedupe (the dict above intentionally repeats a few labels; last wins)
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
const touched = [];
let totalReplaced = 0;

for (const file of walk(ROOT)) {
	const before = readFileSync(file, 'utf8');
	let n = 0;
	const after = before.replace(RE, (m, prefix, str) => {
		// Object.hasOwn, NOT `dict[str] === undefined`: a JSON.parse() dict inherits
		// from Object.prototype, so dict['constructor'] returns the Object function and
		// JSON.stringify(Object) yields undefined -- which silently rewrote
		// localize('Constructor', "constructor") into localize('Constructor', undefined).
		if (!Object.hasOwn(dict, str)) { return m; }
		const hit = dict[str];
		used.add(str);
		n++;
		return prefix + JSON.stringify(hit);
	});
	if (n > 0) {
		writeFileSync(file, after, 'utf8');
		totalReplaced += n;
		touched.push([n, file.replace(ROOT, '')]);
	}
}

touched.sort((a, b) => b[0] - a[0]);
console.log(`replacements: ${totalReplaced} across ${touched.length} files`);
console.log(`dict entries used: ${used.size} / ${Object.keys(dict).length}\n`);
console.log('TOP 25 touched files:');
for (const [n, f] of touched.slice(0, 25)) { console.log(`  ${String(n).padStart(5)}  ${f}`); }

const unused = Object.keys(dict).filter(k => !used.has(k));
if (unused.length) {
	console.log(`\nunused dict entries (${unused.length}) - string not found in this exact form:`);
	console.log('  ' + unused.slice(0, 60).map(s => JSON.stringify(s)).join(', '));
}
