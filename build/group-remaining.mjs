import { readFileSync } from 'fs';

const lines = readFileSync('D:/oler-ide-v2/build/nls-remaining.txt', 'utf8').split('\n');
const rows = [];
for (const l of lines) {
	const p = l.split('\t');
	if (p.length < 4) { continue; }
	rows.push({ n: +p[0], s: p[2], files: p[3].split(' | ') });
}

const RULES = [
	[/^workbench\/contrib\/(welcomeGettingStarted|gettingStarted|welcomePage)/, '起始页'],
	[/^workbench\/contrib\/preferences/, '设置页'],
	[/^workbench\/browser\/(parts|actions)/, '菜单/命令注册'],
	[/^workbench\/contrib\/(quickaccess|commands)/, '命令面板/快速打开'],
	[/^workbench\/contrib\/(files|explorer)/, '文件树/资源管理器'],
	[/^workbench\/contrib\/.*dialog|^vs\/workbench\/common\/dialogs/, '对话框'],
	[/^workbench\/services\/(notification|statusbar|keybinding|configuration|quickinput)/, '通知/状态栏/快捷键'],
	[/^workbench\/contrib\/(terminal|debug)/, '终端/调试'],
	[/^workbench\/contrib\/(chat|inlineChat|chatEditing|chatBrowser)/, 'AI 对话'],
	[/^workbench\/contrib\/(extensions|extension)/, '扩展面板'],
	[/^workbench\/contrib\/(outline|timeline|search|scm|notebook|testing|comments)/, '大纲/搜索/Git/测试'],
	[/^workbench\/contrib\/mcp/, 'MCP'],
	[/^editor\//, '编辑器'],
	[/^platform\/(quickinput|quickpick|dialogs|contextkey|telemetry)/, 'QuickPick/平台层'],
	[/^base\/common\//, '平台层'],
	[/^workbench\/contrib\/(codeEditor|fontInfo|zoom|theme|accessibility|list|symbols|filesConfiguration)/, '编辑器通用/视图'],
];

function group(f) {
	for (const [re, name] of RULES) { if (re.test(f)) { return name; } }
	return 'other';
}

const agg = new Map();
const stringsByGroup = new Map();
for (const r of rows) {
	// attribute each string to the group of its FIRST file only, to avoid double counting
	const g = group(r.files[0] ?? '');
	agg.set(g, (agg.get(g) ?? 0) + r.n);
	if (!stringsByGroup.has(g)) { stringsByGroup.set(g, []); }
	stringsByGroup.get(g).push(r);
}

console.log('remaining English localize() occurrences by module:\n');
for (const [g, n] of [...agg.entries()].sort((a, b) => b[1] - a[1])) {
	console.log(`  ${String(n).padStart(7)}  ${g}`);
}

const want = process.argv[2];
if (want && stringsByGroup.has(want)) {
	console.log(`\n=== top 60 in [${want}] ===`);
	for (const r of stringsByGroup.get(want).slice(0, 60)) {
		console.log(`${String(r.n).padStart(3)}  ${r.s}   <- ${r.files[0]}`);
	}
}