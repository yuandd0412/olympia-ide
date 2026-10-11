// v2 zh-cn applier -- AST driven, targets ONLY the message argument of
// localize()/localize2()/nls.localize()/localizeWithoutLink() calls.
//
// Why AST instead of regex: the v1 regex was close enough, but it cannot tell a
// real localize() message from a coincidentally shaped string, and it silently
// skips template literals. Parsing with the bundled TypeScript gives exact node
// ranges, so the nls key, the comment object and format arguments can never be
// touched, and no byte outside the literal is ever rewritten.
//
// Usage:
//   node build/apply-zh-cn-ast.mjs --dict=build/zh-cn-dict.json --dict=build/zh-cn-dict-4.mjs
//   node build/apply-zh-cn-ast.mjs --dry          # report only
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, relative, basename } from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const require = createRequire('D:/oler-ide-v2/oss/');
const ts = require('typescript');

const ROOT = 'D:/oler-ide-v2/oss/src/vs';
const ARGS = process.argv.slice(2);
const DRY = ARGS.includes('--dry');
const DICT_FILES = ARGS.filter(a => a.startsWith('--dict=')).map(a => a.slice('--dict='.length));

// ---------- load dictionaries ----------
const dict = new Map();
// Entries skipped at load time never reach the matcher, so they cannot appear in
// `unmatched` either. Batch 58 authored 129 keys, 5 were filtered here, and the run
// still printed "124 / 124" -- a perfect-looking ratio that hid them. Report them.
const dropped = [];
for (const f of DICT_FILES) {
	const abs = f.includes(':') ? f : 'D:/oler-ide-v2/' + f;
	let obj;
	if (abs.endsWith('.json')) {
		obj = JSON.parse(readFileSync(abs, 'utf8'));
	} else {
		const mod = await import(pathToFileURL(abs).href);
		obj = mod.default ?? mod;
	}
	for (const [k, v] of Object.entries(obj)) {
		if (k.startsWith('_')) { dropped.push([f, k, '_prefix']); continue; }
		if (typeof v !== 'string' || !v.trim()) { dropped.push([f, k, 'empty value']); continue; }
		if (k === v) { dropped.push([f, k, 'no-op (key === value)']); continue; }
		if (!/[A-Za-z]/.test(k)) { dropped.push([f, k, 'key has no latin letters']); continue; }
		dict.set(k, v);
	}
}
console.log(`dictionary: ${dict.size} entries from ${DICT_FILES.length} file(s), dry=${DRY}`);
if (dropped.length) {
	console.log(`\n!! ${dropped.length} dictionary entries DROPPED at load (never matched):`);
	for (const [f, k, why] of dropped.slice(0, 40)) {
		console.log(`  ${why}  ${JSON.stringify(k)}   (${f.split(/[\\/]/).pop()})`);
	}
	if (dropped.length > 40) { console.log(`  ... and ${dropped.length - 40} more`); }
}
console.log('');

// ---------- walk ----------
function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		let st;
		try { st = statSync(p); } catch { continue; }
		if (st.isDirectory()) { out.push(...walk(p)); }
		else if (name.endsWith('.ts') && !name.endsWith('.d.ts') && !/\.test\.ts$/.test(name)) { out.push(p); }
	}
	return out;
}

const CALLEES = new Set(['localize', 'localize2', 'localizeWithoutLink']);
const CJK = /[\u3400-\u9fff]/;

function calleeName(expr) {
	if (ts.isPropertyAccessExpression(expr)) { return expr.name.text; }   // nls.localize
	if (ts.isIdentifier(expr)) { return expr.text; }
	return undefined;
}

function isMessageLiteral(node) {
	return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

// localize("msg")
// localize("key", "msg", ...formatArgs)      <- the common shape
// localize({ key, comment }, "msg", ...)
//
// The message is NOT always the last argument: format arguments (Button(...),
// values, {0} substitutions) may follow it. v1 of this script picked args.at(-1)
// and silently skipped every call that had a format argument -- which is most
// of the walkthrough / settings / notification copy.
function pickMessage(args) {
	if (args.length === 0) { return undefined; }
	if (ts.isObjectLiteralExpression(args[0])) { return args[1]; }
	if (args.length >= 2 && isMessageLiteral(args[1])) { return args[1]; }
	return isMessageLiteral(args[0]) ? args[0] : undefined;
}

let total = 0;
let fileCount = 0;
const used = new Set();
const touched = [];
// "unmatched" used to be one flat list, and it is actively misleading: the applier rewrites
// files in place, so a key that has ALREADY been applied disappears from the source and comes
// back looking like a failure — while a key aimed at text that only exists inside a comment
// (taskTemplates.ts's legacy `/* Version 1.0 templates */` block, the commented-out
// MenuRegistry.addCommand pair, tokenClassificationRegistry.ts's `//errorMessage`) can never
// match no matter what. Those are different problems with different fixes; telling them apart
// needs the message texts we saw and the comment text we skipped.
const seenMessages = new Set();
const commentChunks = [];

for (const file of walk(ROOT)) {
	const text = readFileSync(file, 'utf8');
	if (!/[A-Za-z]/.test(text)) { continue; }

	const comments = text.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g);
	if (comments) { commentChunks.push(...comments); }

	let sf;
	try { sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS); }
	catch { continue; }

	const edits = [];

	function visit(node) {
		if (ts.isCallExpression(node) && CALLEES.has(calleeName(node.expression))) {
			const literal = pickMessage(node.arguments);
			if (literal) {
				const start = literal.getStart(sf);
				const end = literal.getEnd();
				const cooked = literal.text;
				seenMessages.add(cooked);
				// VS Code registers many color descriptions with a LEADING SPACE, e.g.
				// nls.localize('editorStickyScrollShadow', " Shadow color of sticky scroll ...").
				// A dictionary key written without that space never matches, and the English
				// ships silently. Prefer an exact hit, then fall back to the trimmed key, and
				// preserve the source's own padding when emitting the replacement.
				let hit = dict.get(cooked);
				if (hit === undefined) {
					const trimmed = cooked.trim();
					if (trimmed !== cooked) { hit = dict.get(trimmed); }
				}
				if (!CJK.test(cooked) && hit !== undefined) {
					used.add(dict.has(cooked) ? cooked : cooked.trim());
					// keep whatever leading/trailing whitespace the source literal had
					const lead = cooked.match(/^\s*/)[0];
					const tail = cooked.match(/\s*$/)[0];
					edits.push({ start, end, text: JSON.stringify(lead + hit + tail), raw: text.slice(start, end) });
				}
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(sf);

	if (edits.length === 0) { continue; }

	edits.sort((a, b) => b.start - a.start);
	let out = text;
	for (const e of edits) {
		out = out.slice(0, e.start) + e.text + out.slice(e.end);
	}
	if (out !== text && !DRY) { writeFileSync(file, out, 'utf8'); }
	total += edits.length;
	fileCount++;
	touched.push([edits.length, relative(ROOT, file).replace(/\\/g, '/')]);
}

touched.sort((a, b) => b[0] - a[0]);
console.log(`${DRY ? 'DRY-RUN' : 'APPLIED'}: ${total} message literals across ${fileCount} files`);
console.log('\nTOP 25 touched files:');
for (const [n, f] of touched.slice(0, 25)) { console.log(`  ${String(n).padStart(4)}  ${f}`); }

const unused = [...dict.keys()].filter(k => !used.has(k));
console.log(`\ndict entries matched: ${used.size} / ${dict.size}`);
if (unused.length) {
	const blob = commentChunks.join('\n');
	const applied = [];   // its Chinese output is live in the tree: the English left by design
	const commented = []; // the text exists only inside comments: unreachable by any dictionary
	const missing = [];   // the text is nowhere: the key itself is wrong, stale or renamed
	for (const k of unused) {
		const value = dict.get(k);
		if (seenMessages.has(value) || seenMessages.has(value.trim())) { applied.push(k); }
		else if (blob.includes(k)) { commented.push(k); }
		else { missing.push(k); }
	}
	console.log(`unmatched (${unused.length}), split by cause:`);
	const show = (label, list, note) => {
		console.log(`  ${label} (${list.length})${note}`);
		for (const k of list.slice(0, 20)) { console.log('    ' + JSON.stringify(k)); }
	};
	show('already applied in place', applied, ' — NOT a defect; re-runs always report these');
	show('only inside comments', commented, ' — unreachable, delete the key or translate the live copy');
	show('matches nothing anywhere', missing, ' — wrong or stale key, fix the text');
}