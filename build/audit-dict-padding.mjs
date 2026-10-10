// Find dictionary keys whose source literal differs only by leading/trailing whitespace.
// VS Code registers many strings as nls.localize('id', " text with leading space") and
// some as localize('id', "text with trailing dash "), so a dictionary key written without
// that padding never matches and the English ships silently.
//
// Source literals come from the AST collector (build/nls-literals.mjs), the same one the
// applier uses. An earlier regex-based collector could not see single-quoted messages or
// object-literal keys and reported 32 false "genuinely-absent" keys for batch 53.
import { collectLiterals } from './nls-literals.mjs';
import { pathToFileURL } from 'url';

const SRC = 'D:/oler-ide-v2/oss/src/vs';

// trimmed text -> Set(raw texts seen in source)
const byTrimmed = new Map();
for (const lit of collectLiterals(SRC)) {
	if (!lit.text.trim()) { continue; }
	const key = lit.text.trim();
	if (!byTrimmed.has(key)) { byTrimmed.set(key, new Set()); }
	byTrimmed.get(key).add(lit.text);
}

console.log(`source literals (trimmed keys): ${byTrimmed.size}\n`);

let paddingFixed = 0, realMiss = 0;
for (const dictPath of process.argv.slice(2)) {
	const mod = await import(pathToFileURL(dictPath).href);
	const obj = mod.default ?? mod;
	console.log(`--- ${dictPath} ---`);
	for (const k of Object.keys(obj)) {
		if (typeof obj[k] !== 'string' || !/[A-Za-z]/.test(k)) { continue; }
		const raws = byTrimmed.get(k.trim());
		if (!raws) {
			realMiss++;
			console.log(`  ABSENT   key="${k}"`);
			console.log(`           value="${obj[k]}"`);
			continue;
		}
		if (!raws.has(k)) {
			paddingFixed++;
			console.log(`  PADDING  key="${k}"`);
			for (const r of raws) { console.log(`           source="${r}"`); }
		}
	}
}
console.log(`\nPADDING mismatches: ${paddingFixed}   genuinely-absent keys: ${realMiss}`);