// Locate Chinese needles in the compiled out/ tree.
//
//   node build/probe-out.mjs "资源管理器(&&E)" ["另一条" ...]
//
// Two traps this script exists to work around:
//   1. build/next transpile escapes every non-ASCII char as \uXXXX, so out/ contains
//      ZERO literal CJK characters. Reading raw text reports "not found" for strings
//      that are actually present. decode() is mandatory.
//   2. Do NOT assert on a guessed file path. A failed assertion means either the
//      translation never landed (check src) or the assertion points at the wrong
//      module (locate the needle tree-wide first).
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';

const OUT = 'D:/oler-ide-v2/oss/out/';
const decode = t => t.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

const needles = process.argv.slice(2);
if (needles.length === 0) {
	console.log('usage: node build/probe-out.mjs <needle> [<needle> ...]');
	process.exit(2);
}

const walk = (d, out) => {
	for (const e of readdirSync(d)) {
		const p = d + '/' + e;
		if (statSync(p).isDirectory()) { walk(p, out); continue; }
		if (e.endsWith('.js')) { out.push(p); }
	}
	return out;
};
const all = walk(OUT, []);

for (const needle of needles) {
	const hits = [];
	for (const p of all) {
		if (decode(readFileSync(p, 'utf8')).includes(needle)) { hits.push(p.replace(OUT, '')); }
	}
	console.log(`\n${JSON.stringify(needle)}`);
	console.log(hits.length ? hits.map(h => `    ${h}`).join('\n') : '    (NOT FOUND anywhere in out/)');
}
console.log(`\nscanned ${all.length} files in out/`);