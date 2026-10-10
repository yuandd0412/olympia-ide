// Break down the unclassified "other" bucket by directory prefix so the next
// localization pass can be targeted instead of guessing.
//   node build/breakdown-other.mjs [topN]
import { readFileSync } from 'fs';

const lines = readFileSync('D:/oler-ide-v2/build/nls-remaining.txt', 'utf8').split('\n');
const TOP = +(process.argv[2] ?? 40);

const rows = [];
for (const l of lines) {
	const p = l.split('\t');
	if (p.length < 4) { continue; }
	rows.push({ n: +p[0], s: p[2], files: p[3].split(' | ') });
}

// a first-path heuristic: everything already covered by the earlier module map is skipped,
// the rest is grouped by its 3-4 path segments so directories become visible
const agg = new Map();
for (const r of rows) {
	const f = r.files[0] ?? '(none)';
	const segs = f.split('/').filter(Boolean);
	const key = segs.slice(0, 3).join('/');
	agg.set(key, (agg.get(key) ?? 0) + r.n);
}

console.log('remaining English occurrences by directory prefix:\n');
for (const [k, v] of [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP)) {
	console.log(`${String(v).padStart(6)}  ${k}`);
}