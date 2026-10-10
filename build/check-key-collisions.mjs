// Before adding a risky short/single-word dictionary key, check which OTHER
// localize() call sites in the tree carry the exact same message. A key like
// 'Method' or 'Class' is not inherently safe: the applier replaces every match
// in src/vs, so an unrelated call site can be rewritten by accident.
//   node build\check-key-collisions.mjs Method Class ...
import { collectLiterals } from './nls-literals.mjs';
import { relative } from 'path';

const SRC = 'D:/oler-ide-v2/oss/src/vs';
const wanted = new Set(process.argv.slice(2));

const hits = new Map();
for (const l of collectLiterals(SRC)) {
	if (!wanted.has(l.text)) { continue; }
	if (!hits.has(l.text)) { hits.set(l.text, []); }
	hits.get(l.text).push(l);
}

for (const w of wanted) {
	const list = hits.get(w) ?? [];
	const files = new Set(list.map(l => relative(SRC, l.file).replace(/\\/g, '/')));
	console.log(`\n=== "${w}" : ${list.length} call site(s) in ${files.size} file(s)`);
	for (const f of [...files].sort()) { console.log(`    ${f}`); }
}