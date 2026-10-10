// Collision audit for a dictionary file.
//
// The applier rewrites EVERY localize() call in src/vs whose message matches a
// dictionary key, so a key that also occurs in an unrelated module silently
// translates code the batch author never looked at. Single-word keys (Class,
// Fold, Suggest, ...) and shared strings are the risky ones.
//
// Heuristic: most VS Code messages live in exactly one file. A key whose call sites
// span more than one file is reported for review; a key with N sites in ONE file is
// treated as safe (same message, same module, same intent).
//
//   node build/audit-key-collisions.mjs build/zh-cn-dict-56.mjs [...]
import { collectLiterals } from './nls-literals.mjs';
import { pathToFileURL } from 'url';
import { relative } from 'path';

const SRC = 'D:/oler-ide-v2/oss/src/vs';

// index every literal in the tree once, by raw text AND by trimmed text.
// The applier falls back to a trimmed lookup when padding differs, so an exact
// index alone reports false ABSENTs for keys like "{0} replies," (source " {0} replies,").
const byText = new Map();
const byTrimmedText = new Map();
for (const l of collectLiterals(SRC)) {
	const rel = relative(SRC, l.file).replace(/\\/g, '/');
	if (!byText.has(l.text)) { byText.set(l.text, []); }
	byText.get(l.text).push(rel);
	const t = l.text.trim();
	if (!byTrimmedText.has(t)) { byTrimmedText.set(t, []); }
	byTrimmedText.get(t).push(rel);
}

let risky = 0, absent = 0, checked = 0;
for (const dictPath of process.argv.slice(2)) {
	const mod = await import(pathToFileURL(dictPath).href);
	const obj = mod.default ?? mod;
	console.log(`\n--- ${dictPath} ---`);
	for (const k of Object.keys(obj)) {
		if (typeof obj[k] !== 'string' || !/[A-Za-z]/.test(k)) { continue; }
		checked++;
		const sites = byText.get(k) ?? byTrimmedText.get(k.trim());
		if (!sites) { absent++; console.log(`  ABSENT   "${k}"`); continue; }
		const files = [...new Set(sites)];
		if (files.length > 1) {
			risky++;
			console.log(`  MULTI(${files.length}) "${k}"`);
			for (const f of files.sort()) { console.log(`            ${f}`); }
		}
	}
}
console.log(`\nchecked: ${checked}   multi-file (review): ${risky}   absent: ${absent}`);