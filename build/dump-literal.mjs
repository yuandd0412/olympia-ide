// Dump the exact bytes of a localize() message from a source file.
//   node build/dump-literal.mjs <file> <nls-key-substring>
import { readFileSync } from 'fs';
import { collectLiterals } from './nls-literals.mjs';

const [file, key] = process.argv.slice(2);
for (const l of collectLiterals(file)) {
	if (!l.key.includes(key)) { continue; }
	console.log('--- key:', l.key, `@ line ${l.line}`);
	console.log('--- text (JSON):', JSON.stringify(l.text));
	console.log('--- text (raw):');
	console.log(l.text);
}