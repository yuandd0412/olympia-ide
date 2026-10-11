// Residual-English counter that agrees with the applier.
//
// The regex counters in this folder match `localize(...)` anywhere in the file text, including
// inside comments — and comments are exactly what `build/apply-zh-cn-ast.mjs` cannot reach. That
// inflated "remaining English" and, twice, produced dictionary entries aimed at dead code:
// taskTemplates.ts's legacy `/* Version 1.0 templates */` block and the commented-out
// MenuRegistry.addCommand calls in task.contribution.ts.
//
// This script parses with the same bundled TypeScript and applies the same node-selection rules
// as the applier, so its count is the number of strings a translation pass can actually touch.
// It prints the regex number alongside, and the two disagree in BOTH directions, measured on the
// current tree (AST 4626 vs regex 4413):
//   * the regex also matches `localize` calls that sit in comments, which the AST pass cannot
//     reach — real cases: taskTemplates.ts's legacy `/* Version 1.0 templates */` block and the
//     commented-out MenuRegistry.addCommand calls in task.contribution.ts;
//   * but it MISSES more than that, because `[^,]+?` cannot describe an object-literal key
//     (`localize({ key, comment }, 'msg')`), and its {3,200} window drops long messages and
//     template literals — so in aggregate the regex undercounts.
// Use this script's number for anything that has to be true.
//
// Usage: node scripts/oneoff/nls-residual-ast.mjs [--dump] [--top=15]
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FORK = join(HERE, '..', '..', 'oss');
const ROOT = join(FORK, 'src', 'vs');
if (!existsSync(ROOT)) {
	console.error(`scan root missing: ${ROOT}\nThis script must sit in <repo>/scripts/oneoff/.`);
	process.exit(1);
}

const require = createRequire(join(FORK, 'package.json'));
const ts = require('typescript');

const DUMP = process.argv.includes('--dump');
const TOP = Number((process.argv.find(a => a.startsWith('--top=')) || '--top=15').split('=')[1]);

// Mirrors of the applier's selection rules. Keep in sync with build/apply-zh-cn-ast.mjs.
const CALLEES = new Set(['localize', 'localize2', 'localizeWithoutLink']);
const CJK = /[㐀-鿿]/;
const PAIR = /localize2?\s*\(\s*[^,]+?,\s*(['"])((?:(?!\1).){3,200}?)\1/gs;

function calleeName(expr) {
	if (ts.isPropertyAccessExpression(expr)) { return expr.name.text; }
	if (ts.isIdentifier(expr)) { return expr.text; }
	return undefined;
}

function isMessageLiteral(node) {
	return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function pickMessage(args) {
	if (args.length === 0) { return undefined; }
	if (ts.isObjectLiteralExpression(args[0])) { return args[1]; }
	if (args.length >= 2 && isMessageLiteral(args[1])) { return args[1]; }
	return isMessageLiteral(args[0]) ? args[0] : undefined;
}

function* walk(dir) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		let st;
		try { st = statSync(p); } catch { continue; }
		if (st.isDirectory()) { yield* walk(p); }
		else if (name.endsWith('.ts') && !name.endsWith('.d.ts') && !/\.test\.ts$/.test(name)) { yield p; }
	}
}

// "4,6xx English remaining" is not "4,6xx strings a student might see": most of it is
// Copilot-shaped machinery this fork does not run — the Sessions/Agents window (product.json's
// `sessionsWindowAllowedExtensions` is empty), the agent host, MCP/voice/browser-view surfaces,
// and the customization marketplace. Excluded here so the headline number means something; if
// any of these surfaces is ever shipped, drop its prefix and re-measure.
// Deliberately NOT excluded: workbench/contrib/chat and workbench/services/chat (the chat widget
// is what @coach renders into) and workbench/api/common (Settings descriptions).
const PRODUCT_UNREACHABLE = [
	'sessions/',
	'platform/agentHost/',
	'platform/copilotConnectors/',
	'platform/agentFinder/',
	'platform/browserView/',
	'platform/customizationMarketplace/',
	'workbench/contrib/agentsVoice/',
	'workbench/contrib/browserView/',
	'workbench/contrib/remoteTunnel/',
	'workbench/contrib/github/',
	'workbench/services/dataChannel/',
	'workbench/services/policies/',
];

function unreachable(rel) {
	return PRODUCT_UNREACHABLE.some(p => rel.startsWith(p));
}

let files = 0, reachable = 0, translated = 0, english = 0, regexHits = 0, englishShipped = 0;
const byArea = new Map();
const rows = [];

for (const file of walk(ROOT)) {
	files++;
	const text = readFileSync(file, 'utf8');
	for (const m of text.matchAll(PAIR)) {
		const msg = m[2];
		if (!CJK.test(msg) && /[A-Za-z]{3}/.test(msg) && msg.trim().length > 3) { regexHits++; }
	}

	let sf;
	try { sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS); }
	catch { continue; }

	(function visit(node) {
		if (ts.isCallExpression(node) && CALLEES.has(calleeName(node.expression))) {
			const literal = pickMessage(node.arguments);
			if (literal && isMessageLiteral(literal)) {
				reachable++;
				const msg = literal.text;
				if (CJK.test(msg)) {
					translated++;
				} else if (/[A-Za-z]{3}/.test(msg) && msg.trim().length > 3) {
					english++;
					const rel = relative(ROOT, file).replace(/\\/g, '/');
					if (!unreachable(rel)) { englishShipped++; }
					const area = rel.split('/').slice(0, 3).join('/');
					byArea.set(area, (byArea.get(area) || 0) + 1);
					if (DUMP) {
						const key = node.arguments[0] && ts.isStringLiteral(node.arguments[0]) ? node.arguments[0].text : '';
						const line = sf.getLineAndCharacterOfPosition(literal.getStart()).line + 1;
						rows.push(`${rel}:${line}\t${key}\t${msg.replace(/\n/g, '\\n').slice(0, 90)}`);
					}
				}
			}
		}
		ts.forEachChild(node, visit);
	})(sf);
}

if (!files || !reachable) {
	console.error(`parsed ${files} files / ${reachable} localize messages — the scan is broken, not clean`);
	process.exit(1);
}

console.log(`files parsed: ${files}`);
console.log(`localize messages reachable by an AST pass: ${reachable}`);
console.log(`  already zh-cn: ${translated}`);
console.log(`  English left:  ${english}`);
console.log(`  ...and outside the Copilot-only subsystems this fork does not run: ${englishShipped}  <- the number worth acting on`);
console.log(`regex-based counters report: ${regexHits}  (delta ${regexHits - english}; the two disagree in both directions — see the header)`);

console.log(`\ntop ${TOP} areas by reachable English:`);
for (const [area, n] of [...byArea].sort((a, b) => b[1] - a[1]).slice(0, TOP)) {
	console.log(`  ${String(n).padStart(5)}  ${area}`);
}

if (DUMP) {
	console.log(`\n${rows.length} rows (file:line<TAB>nls key<TAB>default message):`);
	for (const r of rows) { console.log('  ' + r); }
}
