#!/usr/bin/env node
// Preflight every zh-cn dictionary batch before applying it.
// Catches the two defects that ship silently: a U+FFFD replacement character in a
// translation, and a JS syntax error (which aborts the applier mid-run).
//   node build/preflight-dicts.mjs build/zh-cn-dict-*.mjs
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';

const files = process.argv.slice(2);
if (files.length === 0) {
	console.error('usage: node build/preflight-dicts.mjs <dict files...>');
	process.exit(2);
}

let bad = 0;
for (const f of files) {
	const text = readFileSync(f, 'utf8');
	const problems = [];

	// U+FFFD means the translation itself is already corrupted
	const idx = text.indexOf('\uFFFD');
	if (idx >= 0) {
		const line = text.slice(0, idx).split('\n').length;
		problems.push(`U+FFFD replacement char at line ${line}`);
	}

	// a CJK value must not keep a trailing ASCII period -- looks like a typo.
	// "..." (ellipsis) and "。" are legitimate endings, so exclude them.
	for (const m of text.matchAll(/:\s*'([^']*[。；，、][^']*[^.。])'\s*$/gm)) {
		const v = m[1];
		if (v.endsWith('...') || v.endsWith('…')) { continue; }
		problems.push(`value mixes CJK punctuation with a trailing ASCII char: "${v}"`);
	}

	// must actually parse as an ES module
	try {
		await import(pathToFileURL(f).href);
	} catch (err) {
		problems.push(`module load failed: ${err.message}`);
	}

	if (problems.length) {
		bad++;
		console.log(`FAIL  ${f}`);
		for (const p of problems) { console.log(`        ${p}`); }
	} else {
		console.log(`OK    ${f}`);
	}
}

console.log(bad === 0 ? `\nAll ${files.length} dictionary file(s) clean.` : `\n${bad} file(s) need fixing.`);
process.exitCode = bad === 0 ? 0 : 1;