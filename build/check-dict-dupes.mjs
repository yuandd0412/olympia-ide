// Report duplicate keys together with BOTH values, so a differing pair is visible.
// A duplicate with two different translations means one was silently dropped by the
// object literal (later entry wins) -- the apply count cannot reveal this.
//   node build/check-dict-dupes.mjs <files...>
import { readFileSync } from 'fs';

let bad = 0;
for (const p of process.argv.slice(2)) {
	const src = readFileSync(p, 'utf8');
	const lines = src.split('\n');
	const seen = new Map();
	for (let i = 0; i < lines.length; i++) {
		const m = /^(\t)(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*:\s*([\s\S]*)$/.exec(lines[i]);
		if (!m) { continue; }
		const key = m[2] !== undefined ? `'${m[2]}'` : `"${m[3]}"`;
		const rest = m[4].replace(/,\s*$/, '');
		// continuation lines belong to the previous entry; skip them
		if (!seen.has(key)) { seen.set(key, { line: i + 1, value: rest }); continue; }
		const prev = seen.get(key);
		bad++;
		console.log(`\nDUPE ${p}: ${key}`);
		console.log(`  line ${prev.line}: ${prev.value}`);
		console.log(`  line ${i + 1}: ${rest}`);
		console.log(`  ${prev.value.trim() === rest.trim() ? 'same value (harmless)' : '*** DIFFERENT VALUE ***'}`);
	}
}
console.log(`\nduplicate keys: ${bad}`);