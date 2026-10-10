// OLYMPIA-TRIM: drop the marketplace-delivered built-ins. Competition students have
// no use for the JavaScript debug pipeline, and leaving them in makes the workbench
// hit the marketplace on every launch.
//
// Edits product.json in place, preserving UTF-8 without BOM and the original
// indentation. Prints the removed ids so the change is auditable in the build log.
import { readFileSync, writeFileSync } from 'fs';

const P = 'D:/oler-ide-v2/oss/product.json';
const raw = readFileSync(P, 'utf8');
const p = JSON.parse(raw);

const DROP = new Set([
	'ms-vscode.js-debug',
	'ms-vscode.js-debug-companion',
	'ms-vscode.vscode-js-profile-table',
]);

const before = (p.builtInExtensions ?? []).map(e => e.name);
p.builtInExtensions = (p.builtInExtensions ?? []).filter(e => !DROP.has(e.name));
for (const k of Object.keys(p)) {
	if (Array.isArray(p[k])) {
		const filtered = p[k].filter(e => e && typeof e === 'object' && e.name && DROP.has(e.name));
		if (filtered.length) { p[k] = p[k].filter(e => !(e && typeof e === 'object' && e.name && DROP.has(e.name))); }
	}
}

writeFileSync(P, JSON.stringify(p, null, '\t') + '\n', 'utf8');
console.log('builtInExtensions before:', before.join(', '));
console.log('builtInExtensions after :', (p.builtInExtensions ?? []).map(e => e.name).join(', ') || '(none)');
