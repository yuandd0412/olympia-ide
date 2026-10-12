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

const problems = [];
const summary = [];
// 只给测试台用的内部命令，故意不进命令面板。
const INTERNAL_COMMANDS = new Set(['olympia.coach.debug.extensionState']);
for (const id of OLYMPIA_EXTENSIONS) {
	const manifestPath = path.join(extensionsRoot, id, 'package.json');
	const srcDir = path.join(extensionsRoot, id, 'src');
	assert.ok(fs.existsSync(manifestPath), `${id} 的 package.json 没找到`);
	assert.ok(fs.existsSync(srcDir), `${id} 的 src 目录没找到`);
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

	const referenced = referencedCommands(manifest);
	const registered = registeredCommands(srcDir);
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
	summary.push(`${id}: 声明 ${(manifest.contributes?.commands ?? []).length} 条，注册 ${registered.size} 条，界面引用 ${referenced.length} 处`);
}

console.log(summary.join('\n'));
if (problems.length) {
	console.log(`\n发现 ${problems.length} 处接线问题：`);
	for (const p of problems) { console.log(`  - ${p}`); }
	process.exitCode = 1;
} else {
	console.log('\nall command wiring checks passed');
}
