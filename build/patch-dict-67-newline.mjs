// The minimap.markSectionHeaderRegex key must contain a LITERAL backslash-n in the
// source text ("Use \n in the pattern"). In a JS single-quoted string that has to be
// spelled `\\n`; a single `\n` silently becomes a real newline and breaks the file.
// This script normalises whichever form is currently on disk (real newline OR a
// one-character escape) into the correct two-character escape.
import { readFileSync, writeFileSync } from 'fs';

const p = 'D:/oler-ide-v2/build/zh-cn-dict-67.mjs';
let t = readFileSync(p, 'utf8');

const prefix = "named `separator`. Use ";
const tail = " in the pattern";
const i = t.indexOf(prefix);
const j = t.indexOf(tail, i);
if (i < 0 || j < 0) {
	console.error('FAIL: could not locate the markSectionHeaderRegex key');
	process.exit(1);
}
const before = JSON.stringify(t.slice(i, j + tail.length));
t = t.slice(0, i) + prefix + '\\\\n' + tail + t.slice(j + tail.length);
writeFileSync(p, t, 'utf8');
console.log('before:', before);
console.log('after :', JSON.stringify(prefix + '\\\\n' + tail));