// Fix the \n mismatch in the zh-cn dictionaries.
//
// In a .ts source file, "a\\nb" is an ESCAPE: TypeScript parses it to a string
// containing a real newline. The AST applier matches on `literal.text`, i.e. the
// cooked value -- which has a real newline. The dictionaries were written with a
// literal backslash+n, so every message containing \n silently failed to match.
//
// In the .mjs dict sources a real newline must be written as \n (2 chars).
// So: replace the 3-char sequence \\n with the 2-char sequence \n.
import { readFileSync, writeFileSync } from 'fs';

const FILES = [
	'D:/oler-ide-v2/build/zh-cn-dict-4.mjs',
	'D:/oler-ide-v2/build/zh-cn-dict-5.mjs',
	'D:/oler-ide-v2/build/zh-cn-dict-6.mjs',
];

for (const f of FILES) {
	const before = readFileSync(f, 'utf8');
	const after = before.replaceAll('\\\\n', '\\n');
	const n = (before.match(/\\\\n/g) ?? []).length;
	writeFileSync(f, after, 'utf8');
	console.log(`${f.split('/').pop()}: replaced ${n} occurrence(s)`);
}