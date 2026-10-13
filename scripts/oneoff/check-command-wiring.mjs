// 检查三个 Olympia 扩展的命令接线：package.json 里声明的入口（命令面板、菜单、快捷键、
// 起始页、引导步骤）在编译产物里是不是真有 registerCommand 接着。
// 「界面上有按钮、点了没反应」这类问题不该靠人肉记，也不该等用户发现。
// 运行：node scripts/oneoff/check-command-wiring.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const extensionsRoot = path.join(repoRoot, 'oss/extensions');
const OLYMPIA_EXTENSIONS = ['olympia-onboarding', 'olympia-contest', 'olympia-coach'];

/** package.json 里所有引用命令 id 的地方，逐个展开成 { id, where }。 */
function referencedCommands(manifest) {
	const out = [];
	const c = manifest.contributes ?? {};
	for (const cmd of c.commands ?? []) {
		out.push({ id: cmd.command, where: 'contributes.commands' });
	}
	for (const [menu, items] of Object.entries(c.menus ?? {})) {
		for (const item of items) {
			if (typeof item.command === 'string') {
				out.push({ id: item.command, where: `contributes.menus.${menu}` });
			}
		}
	}
	for (const kb of c.keybindings ?? []) {
		out.push({ id: kb.command, where: 'contributes.keybindings' });
	}
	for (const container of Object.values(c.views ?? {})) {
		for (const view of container) {
			if (view.when) { out.push({ id: view.when, where: `contributes.views (${view.id})`, whenClause: true }); }
		}
	}
	for (const welcome of c.viewsWelcome ?? []) {
		// 欢迎页的 Markdown 里是 [文字](command:xxx) 形式，正则抠出来。
		for (const m of String(welcome.contents ?? '').matchAll(/\(command:([^?)\s]+)/g)) {
			out.push({ id: m[1], where: 'contributes.viewsWelcome' });
		}
	}
	for (const walk of c.walkthroughs ?? []) {
		for (const step of walk.steps ?? []) {
			for (const button of step.buttons ?? []) {
				out.push({ id: button.command, where: `walkthrough ${walk.id}` });
			}
		}
	}
	for (const entry of c.startEntries ?? []) {
		out.push({ id: entry.command, where: 'contributes.startEntries' });
	}
	for (const sub of c.submenus ?? []) {
		out.push({ id: sub.id, where: 'contributes.submenus', submenu: true });
	}
	return out;
}

/** 源码里注册了哪些命令：直接字面量，或走 CMD / constants 表。 */
function registeredCommands(srcDir) {
	const found = new Set();
	const literal = /registerCommand\(\s*'([^']+)'/g;
	// CMD.compileAndRun 这种引用要先把表里的值读出来。
	const tableEntries = new Map();
	const tablePattern = /(\w+)\s*:\s*'olympia\.[^']+'/g;
	for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'))) {
		const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
		for (const m of text.matchAll(literal)) {
			found.add(m[1]);
		}
		for (const m of text.matchAll(/export const (CMD|[\w]*COMMAND[\w]*)\s*=\s*\{([\s\S]*?)\n\}/g)) {
			for (const entry of m[2].matchAll(/(\w+)\s*:\s*'([^']+)'/g)) {
				tableEntries.set(`${m[1]}.${entry[1]}`, entry[2]);
			}
		}
		for (const m of text.matchAll(/export const (\w*(?:COMMAND|KEY|SECRET)\w*)\s*=\s*'(olympia\.[^']+)'/g)) {
			tableEntries.set(m[1], m[2]);
		}
	}
	// 再扫一遍：registerCommand(CMD.xxx) / executeCommand(CMD.xxx) 用的也是同一张表。
	for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'))) {
		const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
		for (const m of text.matchAll(/registerCommand\(\s*([A-Za-z_][\w.]*)\s*[,)]/g)) {
			const id = tableEntries.get(m[1]);
			if (id) { found.add(id); }
		}
	}
	return found;
}

/** 任务提供器注册用的类型字符串（字面量或模块里导出的常量）。 */
function taskProviderTypes(srcDir) {
	const types = new Set();
	const consts = new Map();
	const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'));
	for (const file of files) {
		const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
		for (const m of text.matchAll(/export const (\w+)\s*=\s*'([^']+)'/g)) {
			consts.set(m[1], m[2]);
		}
	}
	for (const file of files) {
		const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
		for (const m of text.matchAll(/registerTaskProvider\(\s*(?:'([^']+)'|([\w.]+))\s*,/g)) {
			const value = m[1] ?? (m[2] ? consts.get(m[2]) : undefined);
			if (value) { types.add(value); }
		}
	}
	return types;
}

/** 代码里点掉的命令（面板的行、状态栏的 chip、通知上的按钮），不只是 package.json 声明的那些。 */
function invokedCommands(srcDir) {
	const found = new Map();
	const tableEntries = commandTables(srcDir);
	const patterns = [
		[/command\s*[:=]\s*(CMD\.\w+)/g, '面板/状态栏的行'],
		[/command\s*[:=]\s*'(olympia\.[^']+)'/g, '面板/状态栏的行'],
		[/executeCommand\(\s*(CMD\.\w+|'olympia\.[^']+')/g, '提示框按钮'],
	];
	for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'))) {
		const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
		for (const [pattern, label] of patterns) {
			for (const m of text.matchAll(pattern)) {
				const id = m[1].startsWith('CMD.') ? tableEntries.get(m[1]) : m[1].slice(1, -1);
				// 核心命令（workbench.*）由产品自己注册，不归这里管
				if (id && id.startsWith('olympia.')) {
					found.set(id, `${file} 的${label}`);
				}
			}
		}
	}
	return found;
}

function commandTables(srcDir) {
	const tableEntries = new Map();
	for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'))) {
		const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
		for (const m of text.matchAll(/export const (CMD|[\w]*COMMAND[\w]*)\s*=\s*\{([\s\S]*?)\n\}/g)) {
			for (const entry of m[2].matchAll(/(\w+)\s*:\s*'([^']+)'/g)) {
				tableEntries.set(`${m[1]}.${entry[1]}`, entry[2]);
			}
		}
	}
	return tableEntries;
}

/**
 * 三扩展的命令标题表：面板那一行的文字必须和命令面板里看到的是同一句。
 * 末尾的省略号是命令面板的惯例（选中即打开选择器），面板行不需要重复，所以比对时去掉。
 */
const titlesByCommand = new Map();
for (const id of OLYMPIA_EXTENSIONS) {
	const manifest = JSON.parse(fs.readFileSync(path.join(extensionsRoot, id, 'package.json'), 'utf8'));
	for (const command of manifest.contributes?.commands ?? []) {
		titlesByCommand.set(command.command, command.title);
	}
}
const paletteTitle = title => title.replace(/(\.\.\.|…)$/, '');

/** 面板里每一行的 label 和它点的命令。 */
function panelRows(srcDir) {
	const table = commandTables(srcDir);
	const rows = [];
	for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'))) {
		const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
		for (const m of text.matchAll(/label: '([^']+)', icon: '[^']+', command: CMD\.(\w+)/g)) {
			const id = table.get(`CMD.${m[2]}`);
			if (id) {
				rows.push({ command: id, label: m[1], where: `${file} 的 ${m[2]} 行` });
			}
		}
	}
	return rows;
}

const problems = [];
const summary = [];
// 只给测试台用的内部命令，故意不进命令面板。
/** 没有界面入口的内部命令：被另一个扩展或核心调用，不该要求界面引用。 */
const INTERNAL_COMMANDS = new Set(['olympia.coach.debug.extensionState', 'olympia.contest.isRunning']);
const registrationsByExtension = new Map();
for (const id of OLYMPIA_EXTENSIONS) {
	registrationsByExtension.set(id, registeredCommands(path.join(extensionsRoot, id, 'src')));
}
/** 三个扩展注册的全部命令：面板可以跨扩展点别人的命令，所以判定要放宽到全体。 */
const registeredAnywhere = new Set([...registrationsByExtension.values()].flatMap(set => [...set]));
for (const id of OLYMPIA_EXTENSIONS) {
	const manifestPath = path.join(extensionsRoot, id, 'package.json');
	const srcDir = path.join(extensionsRoot, id, 'src');
	assert.ok(fs.existsSync(manifestPath), `${id} 的 package.json 没找到`);
	assert.ok(fs.existsSync(srcDir), `${id} 的 src 目录没找到`);
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

	const referenced = referencedCommands(manifest);
	const registered = registrationsByExtension.get(id);
	// 1) 界面引用了我们自己的命令，但代码里没注册 → 点了没反应。workbench.* 由核心注册，不归这里管。
	const ours = ref => ref.id.startsWith('olympia.');

	// 1) 界面引用了我们自己的命令，但代码里没注册 → 点了没反应。
	for (const ref of referenced.filter(ours)) {
		if (ref.submenu || ref.whenClause) { continue; }
		if (!registered.has(ref.id)) {
			problems.push(`${id}: ${ref.where} 引用 ${ref.id}，但源码里没有 registerCommand`);
		}
	}
	// 2) 代码注册了却没在 contributes.commands 里出现 → 命令面板找不到（有意隐藏的要走 commandPalette: false）。
	const declared = new Set((manifest.contributes?.commands ?? []).map(c => c.command));
	for (const reg of registered) {
		if (!declared.has(reg) && !INTERNAL_COMMANDS.has(reg)) {
			const paletteHidden = (manifest.contributes?.menus?.commandPalette ?? []).some(m => m.command === reg && m.when === 'false');
			if (!paletteHidden) {
				problems.push(`${id}: 注册了 ${reg}，但 contributes.commands 里没有（命令面板看不到，菜单里也用不了）`);
			}
		}
	}
	// 3) 快捷键必须有对应命令。
	for (const kb of manifest.contributes?.keybindings ?? []) {
		if (!declared.has(kb.command) && !registered.has(kb.command)) {
			problems.push(`${id}: 快捷键 ${kb.key} 指向不存在的 ${kb.command}`);
		}
	}
	// 4) 任务提供器的类型必须在 contributes.taskDefinitions 里声明，
	//    否则产品日志会报「uses an undefined task type. The task will be ignored in the future」。
	const declaredTaskTypes = new Set((manifest.contributes?.taskDefinitions ?? []).map(t => t.type));
	for (const type of taskProviderTypes(srcDir)) {
		if (!declaredTaskTypes.has(type)) {
			problems.push(`${id}: registerTaskProvider('${type}') 但 contributes.taskDefinitions 里没有这个类型`);
		}
	}
	// 5) 代码里点掉的命令（面板行、状态栏 chip、通知按钮）必须真有人注册。
	//    跨扩展点是允许的（面板点竞赛助手的命令），但打错一个字就是「点了没反应」。
	const invoked = invokedCommands(srcDir);
	for (const [cmd, where] of invoked) {
		if (!registeredAnywhere.has(cmd)) {
			problems.push(`${id}: ${where} 点了 ${cmd}，三个扩展里都没注册`);
		}
	}
	// 6) 面板行写的名字要和命令面板的标题是同一句。两处各写各的之后，学生在面板里看到的
	//    「打开题面库」和搜到的「打开题面库（已缓存的题面）」就成了两个功能，找不到第二次。
	for (const row of panelRows(srcDir)) {
		const title = titlesByCommand.get(row.command);
		if (title === undefined) {
			continue;    // 没在清单里声明的由规则 2 报，这里不重复
		}
		if (paletteTitle(title) !== row.label) {
			problems.push(`${id}: ${row.where} 写的是「${row.label}」，命令面板里却是「${paletteTitle(title)}」（${row.command}）`);
		}
	}
	summary.push(`${id}: 声明 ${(manifest.contributes?.commands ?? []).length} 条，注册 ${registered.size} 条，界面引用 ${referenced.length} 处，代码点掉 ${invoked.size} 条，面板行 ${panelRows(srcDir).length} 行`);
}

console.log(summary.join('\n'));
if (problems.length) {
	console.log(`\n发现 ${problems.length} 处接线问题：`);
	for (const p of problems) { console.log(`  - ${p}`); }
	process.exitCode = 1;
} else {
	console.log('\nall command wiring checks passed');
}
