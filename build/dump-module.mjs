import { readFileSync, writeFileSync } from 'fs';

const lines = readFileSync('D:/oler-ide-v2/build/nls-remaining.txt', 'utf8').split('\n');
const rows = [];
for (const l of lines) {
	const p = l.split('\t');
	if (p.length < 4) { continue; }
	rows.push({ n: +p[0], s: p[2], files: p[3].split(' | ') });
}

const RULES = [
	[/^workbench\/contrib\/(welcomeGettingStarted|gettingStarted|welcomePage)/, 'welcome'],
	[/^workbench\/contrib\/preferences/, 'settings'],
	[/^workbench\/browser\/(parts|actions)/, 'menus'],
	[/^workbench\/contrib\/(quickaccess|commands)/, 'palette'],
	[/^workbench\/contrib\/(files|explorer)/, 'explorer'],
	[/^workbench\/contrib\/.*dialog|^workbench\/common\/dialogs/, 'dialogs'],
	[/^workbench\/services\/(notification|statusbar|keybinding|configuration|quickinput)/, 'statusbar'],
	[/^workbench\/contrib\/(terminal|debug)/, 'terminal'],
	[/^workbench\/contrib\/(extensions|extension)/, 'extensions'],
	[/^workbench\/contrib\/(outline|timeline|search|scm|notebook|testing|comments)/, 'outline'],
	[/^workbench\/contrib\/(codeEditor|fontInfo|zoom|theme|accessibility|list|symbols|filesConfiguration)/, 'editor'],
	[/^editor\//, 'editor'],
	[/^platform\/(quickinput|quickpick|dialogs|contextkey)/, 'platform'],
	[/^workbench\/contrib\/(chat|inlineChat|chatEditing|chatBrowser)/, 'chat'],
	[/^workbench\/contrib\/mcp/, 'mcp'],
];

function group(f) {
	for (const [re, name] of RULES) { if (re.test(f)) { return name; } }
	return 'other';
}

const wanted = process.argv.slice(2);
const seen = new Set();
for (const r of rows) {
	if (!wanted.includes(group(r.files[0] ?? ''))) { continue; }
	if (seen.has(r.s)) { continue; }
	seen.add(r.s);
}
const out = [];
for (const r of rows) {
	if (!wanted.includes(group(r.files[0] ?? ''))) { continue; }
	out.push(`${String(r.n).padStart(3)}|${r.files[0]}|${r.s}`);
}
const uniq = [];
const s2 = new Set();
for (const r of rows) {
	if (!wanted.includes(group(r.files[0] ?? ''))) { continue; }
	if (s2.has(r.s)) { continue; }
	s2.add(r.s);
	uniq.push(`${String(r.n).padStart(3)}  ${r.s}`);
}
const target = 'D:/oler-ide-v2/build/todo-' + wanted.join('-') + '.txt';
writeFileSync(target, uniq.join('\n'), 'utf8');
console.log(`${wanted.join(',')}: ${uniq.length} distinct strings -> ${target}`);