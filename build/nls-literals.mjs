// Shared nls literal collector -- AST based, single source of truth for the
// translation toolchain (applier, padding audit, batch extraction).
//
// Why AST instead of regex: VS Code writes the same localize() message in three
// different shapes, and a regex only sees one of them. A regex-based audit
// reported 32 false "genuinely-absent" keys for batch 53 because it required a
// double-quoted message and a string-literal key:
//   localize('k', 'double vs single')            <- single-quoted message
//   localize({ key: 'k', comment: [...] }, "m")  <- object-literal key
// A regex that cannot see a literal must never be allowed to claim it is absent.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire('D:/oler-ide-v2/oss/');
const ts = require('typescript');

export const CALLEES = new Set([
	'localize', 'localize2', 'localizeWithoutLink',
	'localizeAndFormat', 'nlsDotLocalize', 'localizeWithPath',
]);

export function calleeName(expr) {
	if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) { return expr.name.text; } // nls.localize
	if (ts.isIdentifier(expr)) { return expr.text; }
	return undefined;
}

/**
 * Collect the message literal of every localize() call under one directory,
 * or inside a single .ts file when `root` points at a file.
 * @returns {Array<{file:string, line:number, key:string, text:string}>}
 */
export function collectLiterals(root) {
	const out = [];

	const scan = (p) => {
		let text; try { text = readFileSync(p, 'utf8'); } catch { return; }
		const sf = ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

		const visit = (node) => {
			if (ts.isCallExpression(node) && node.expression && CALLEES.has(calleeName(node.expression))) {
				const args = node.arguments;
				const first = args[0];
				let key = '';
				if (first && ts.isStringLiteralLike(first)) { key = first.text; }
				else if (first && ts.isObjectLiteralExpression(first)) {
					for (const prop of first.properties) {
						if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'key'
							&& ts.isStringLiteralLike(prop.initializer)) { key = prop.initializer.text; }
					}
				}
				// The message is NOT always the last argument: format arguments may
				// follow it. Prefer args[1] when it is a string literal, else args[0].
				let msg = null;
				if (args.length >= 2 && ts.isStringLiteralLike(args[1])) { msg = args[1]; }
				else if (args.length >= 1 && ts.isStringLiteralLike(args[0])) { msg = args[0]; }
				if (msg && msg.text) {
					const { line } = sf.getLineAndCharacterOfPosition(msg.getStart(sf));
					out.push({ file: p, line: line + 1, key, text: msg.text });
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(sf);
	};

	let st; try { st = statSync(root); } catch { return out; }
	if (st.isFile()) { scan(root); return out; }

	const walk = (d) => {
		for (const e of readdirSync(d)) {
			const p = join(d, e);
			let s; try { s = statSync(p); } catch { continue; }
			if (s.isDirectory()) { walk(p); continue; }
			if (!e.endsWith('.ts') || e.endsWith('.d.ts')) { continue; }
			scan(p);
		}
	};
	walk(root);
	return out;
}