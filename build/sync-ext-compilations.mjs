// OLYMPIA-TRIM / OLYMPIA-CONTEST: keep `compilations` in build/gulpfile.extensions.ts in
// sync with `excludedExtensions` in build/lib/extensions.ts, and register the new
// olympia-contest extension.
//
// Leaving a removed extension in this list costs a tsgo project per build for an
// extension that is never shipped, which is why the exclusion list is mirrored here.

import { readFileSync, writeFileSync } from 'fs';

const F = 'D:/oler-ide-v2/oss/build/gulpfile.extensions.ts';
let t = readFileSync(F, 'utf8');

// --- removed: these are in excludedExtensions and are no longer compiled -----------
const REMOVE = [
	'extensions/git/tsconfig.json',
	'extensions/git-base/tsconfig.json',
	'extensions/github/tsconfig.json',
	'extensions/github-authentication/tsconfig.json',
	'extensions/grunt/tsconfig.json',
	'extensions/gulp/tsconfig.json',
	'extensions/jake/tsconfig.json',
	'extensions/media-preview/tsconfig.json',
	'extensions/merge-conflict/tsconfig.json',
	'extensions/microsoft-authentication/tsconfig.json',
	'extensions/npm/tsconfig.json',
	'extensions/php-language-features/tsconfig.json',
	'extensions/simple-browser/tsconfig.json',
];
let removed = 0;
for (const entry of REMOVE) {
	const needle = `\t'${entry}',\n`;
	if (t.includes(needle)) { t = t.replace(needle, ''); removed++; }
}

// --- added: the contest helper ------------------------------------------------------
const ADD = 'extensions/olympia-contest/tsconfig.json';
let added = false;
if (!t.includes(ADD)) {
	const anchor = "\t'extensions/olympia-onboarding/tsconfig.json',\n";
	if (!t.includes(anchor)) { throw new Error('anchor entry not found'); }
	t = t.replace(anchor, anchor + `\t'${ADD}',\n`);
	added = true;
}

writeFileSync(F, t, 'utf8');
console.log(`removed ${removed}/${REMOVE.length} compile entries, added olympia-contest: ${added}`);
