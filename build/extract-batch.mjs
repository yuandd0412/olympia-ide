// Extract remaining English localize() literals from a subtree, with their nls key.
//   node build/extract-batch.mjs <abs-subtree> [<abs-subtree> ...]
// Output (stdout): TSV  relativeFile<TAB>line<TAB>key<TAB>message
// Uses the shared AST collector (build/nls-literals.mjs) so it sees exactly what the
// applier sees: single- and double-quoted messages, and object-literal keys.
import { collectLiterals } from './nls-literals.mjs';
import { relative } from 'path';

const CJK = /[\u3400-\u9fff]/;
const roots = process.argv.slice(2).map(r => r.replace(/\\/g, '/'));

// No upper length cap. An earlier `length <= 200` guard silently dropped long
// strings — the worst kind of bug in this toolchain, because the batch simply
// looked smaller than it was and nothing warned. Theme colour descriptions run
// 200-260 chars because they repeat a shared explanatory sentence.
for (const ROOT of roots) {
	const rows = collectLiterals(ROOT)
		.filter(l => l.text && !CJK.test(l.text) && l.text.length >= 2)
		.sort((a, b) => a.file.localeCompare(b.file) || (a.line - b.line))
		.map(l => `${relative(ROOT, l.file).replace(/\\/g, '/')}\t${l.line}\t${l.key}\t${l.text}`);

	process.stdout.write(rows.join('\n') + (rows.length ? '\n' : ''));
	console.error(`[extract-batch] ${rows.length} literals from ${ROOT}`);
}