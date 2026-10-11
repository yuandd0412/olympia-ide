// Did the in-place localisation actually reach the shipped artifact?
//
// Every other l10n gate in this repo is source-level (applier hit rate, hygiene, compile-client),
// so none of them proves the packaged app carries the Chinese defaults. This checks the shipped
// artifact directly. All patterns are extracted from the source files at run time, because passing
// CJK through Windows argv is not reliable here — a Chinese grep pattern typed at the shell can
// arrive mangled and then reports "0 matches" for a string that is present. A 0 from a tool that
// read nothing is the exact failure mode this script exists to avoid, so it fails loudly when it
// cannot extract a pattern.
//
// WHICH FILE, and this matters: searching `out/vs/workbench/workbench.desktop.main.js` proves
// nothing in either direction. Upstream's build runs an NLS extraction step that rewrites
// `localize('key', 'default message')` down to a key/index reference and moves the default
// messages into `out/nls.messages.json` (+ `out/nls.metadata.json`). So that bundle contains
// ~21,500 `localize(` calls and NOT ONE message — neither English ("Reload Window" → 0) nor
// Chinese. The message text lives in the NLS data file, which is the real default-locale surface
// the workbench reads, so that is what this script checks. It also checks the source maps, which
// embed the compiled original text and catch the case where the bundle was built from a stale
// `out/`.
//
// Usage: node scripts/oneoff/verify-shipped-nls.mjs [path-to-nls.messages.json]
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TARGET = process.argv[2]
	? path.resolve(process.argv[2])
	: path.join(ROOT, 'VSCode-win32-x64', 'resources', 'app', 'out', 'nls.messages.json');
const MAPS = [
	'VSCode-win32-x64/resources/app/out/vs/workbench/workbench.desktop.main.js.map',
	'VSCode-win32-x64/resources/app/out/vs/sessions/sessions.desktop.main.js.map',
];

// localize key -> the source file it lives in. Keys with a `*` suffix are matched as a prefix.
const WATCH = [
	['chat.responseCompletedOneStep', 'oss/src/vs/workbench/contrib/chat/browser/widget/chatListRenderer.ts'],
	['chat.responseTokenStats.title', 'oss/src/vs/workbench/contrib/chat/browser/widget/chatListRenderer.ts'],
	['chatTerminalFullOutputLabel', 'oss/src/vs/workbench/contrib/chat/browser/widget/chatContentParts/toolInvocationParts/chatTerminalToolProgressPart.ts'],
	['pastedTextArtifact', 'oss/src/vs/workbench/contrib/chat/browser/widget/input/editor/chatPasteProviders.ts'],
	['diff.hiddenLines.collapse', 'oss/src/vs/editor/browser/widget/diffEditor/features/hideUnchangedRegionsFeature.ts'],
	['binaryFileChanged', 'oss/src/vs/editor/browser/widget/multiDiffEditor/diffEditorItemTemplate.ts'],
];

if (!existsSync(TARGET)) {
	console.error(`nls messages file not found: ${TARGET} — the app has not been packaged yet`);
	process.exit(2);
}
const data = readFileSync(TARGET, 'utf8');
// The maps are a second, independent witness: they embed the compiled original text, so a bundle
// built from a stale out/ shows English here even if the message file looks plausible.
let maps = '';
for (const rel of MAPS) {
	const p = path.join(ROOT, rel);
	if (existsSync(p)) { maps += readFileSync(p, 'utf8'); }
	else { console.error(`WARNING: missing source map ${rel} — the map half of this check is vacuous`); }
}
const BS = String.fromCharCode(92);
const escapeAll = s => [...s].map(c => BS + 'u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join('');
const count = (haystack, needle) => haystack.split(needle).length - 1;

let shipped = 0;
let stale = 0;
let missing = 0;

for (const [key, rel] of WATCH) {
	const src = readFileSync(path.join(ROOT, rel), 'utf8');
	// The applier rewrites only the default-message argument, in either quote style.
	const re = new RegExp(`localize\\(['"]${key}['"],\\s*['"]([^'"]+)['"]\\s*[,)]`);
	const found = src.match(re);
	if (!found) {
		console.log(`CANNOT EXTRACT  ${key}  (${rel}) — the source moved or the key changed; this row proves nothing`);
		missing++;
		continue;
	}
	const value = found[1];
	const cjk = /[^\x00-\x7F]/.test(value);
	const inData = count(data, value);
	const inMaps = count(maps, value) + count(maps, escapeAll(value)) + count(maps, escapeAll(value).toLowerCase());
	const total = inData + inMaps;
	const verdict = total > 0 ? (cjk ? 'SHIPPED (zh-cn)' : 'SHIPPED (en, expected)') : (cjk ? 'NOT IN ARTIFACT' : 'STALE English');
	console.log(`${String(verdict).padEnd(22)} ${key.padEnd(28)} "${value}"  nls.messages=${inData} map=${inMaps}`);
	if (total > 0) { shipped++; } else if (cjk) { stale++; }
}

// Whole-artifact CJK volume, independent of the watched keys, so a green table above cannot be an
// artifact of checking only strings that happen to be listed.
const cjkRuns = data.match(/[\u4E00-\u9FFF][\u4E00-\u9FFF]{2,}/g) || [];
console.log(`\nartifact: ${path.relative(ROOT, TARGET)}  ${data.length} utf-16 units`);
console.log(`watched keys present in artifact: ${shipped} / ${WATCH.length}   chinese keys absent: ${stale}   unextractable: ${missing}`);
console.log(`distinct multi-char CJK runs in nls.messages.json: ${cjkRuns.length} (e.g. ${cjkRuns.slice(0, 3).join(' | ')})`);
if (cjkRuns.length === 0) {
	console.error('\nFAIL: the shipped message file contains no Chinese at all — the localisation did not reach the artifact.');
	process.exit(1);
}
if (stale > 0) {
	console.error(`\nFAIL: ${stale} watched chinese string(s) are missing from the artifact — packaged from a stale out/.`);
	process.exit(1);
}
if (missing > 0) {
	console.error(`\nFAIL: ${missing} watched key(s) could not be extracted from the source — this run did not verify them.`);
	process.exit(1);
}
console.log('\nOK: the packaged app carries the in-place localisation.');
