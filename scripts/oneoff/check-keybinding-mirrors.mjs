// 文案里写出来的快捷键，必须是产品真的注册过的组合键。
//
// 为什么要有这一条：三个 Olympia 扩展之间不能互相 import，所以「按 Ctrl+Alt+M 读题面」
// 这类提示要么写死在句子里，要么各扩展自己存一份常量。2026-10-17 查出来的是：
// statement.show 的键位注册在 olympia-contest/package.json 里，而 onboarding 那张
// KEYS 镜像表根本没有它 —— 于是文案只能手写一个组合键，将来改键位时没有任何一处会红。
//
// 这个门不要求"每条键位都要有镜像"（很多命令没有对应文案），它守的是反方向：
// **写在源码里的每一个人类可读组合键，都得对得上某条真实注册表**。
//
//   node scripts/oneoff/check-keybinding-mirrors.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const extRoot = path.join(repoRoot, 'oss', 'extensions');
const EXTENSIONS = ['olympia-coach', 'olympia-contest', 'olympia-onboarding'];

/** ctrl+alt+m → Ctrl+Alt+M；逗号、Enter 这类保持可读形状。 */
function normalize(key) {
	return String(key).trim().split('+').map(part => {
		const lower = part.toLowerCase();
		if (lower === 'ctrl') { return 'Ctrl'; }
		if (lower === 'alt') { return 'Alt'; }
		if (lower === 'shift') { return 'Shift'; }
		if (lower === 'cmd') { return 'Cmd'; }
		if (lower === 'enter') { return 'Enter'; }
		if (lower === 'escape') { return 'Esc'; }
		if (/^f\d+$/.test(lower)) { return lower.toUpperCase(); }
		// package.json 里逗号写成 `ctrl+alt+comma`，人读的是 `Ctrl+Alt+,`：不折一下
		// 这条就会报一个根本不存在的错。
		if (lower === 'comma') { return ','; }
		if (lower === 'period') { return '.'; }
		return lower.length === 1 ? lower.toUpperCase() : part;
	}).join('+');
}

const registered = new Set();
let withBindings = 0;
for (const name of EXTENSIONS) {
	const manifest = JSON.parse(fs.readFileSync(path.join(extRoot, name, 'package.json'), 'utf8'));
	const bindings = manifest.contributes?.keybindings ?? [];
	if (!bindings.length) { continue; }   // olympia-coach 不注册键位，它只有命令
	withBindings++;
	for (const b of bindings) {
		if (b?.key) { registered.add(normalize(b.key)); }
		if (b?.mac) { registered.add(normalize(b.mac)); }
	}
}
assert.ok(withBindings >= 2, `只有 ${withBindings} 个扩展带 keybindings，多半是清单形状变了，这个门得跟着改`);
assert.ok(registered.size >= 15, `只收到 ${registered.size} 条注册键位，多半是清单形状变了`);

/**
 * 不是 Olympia 自己注册的组合键：这些是 VS Code 的通用键，出现在文案里是对的
 * （面板提示、文档链接之类），所以白名单列出来并写明是谁的。
 */
const NOT_OLYMPIA = new Set([
	'Ctrl+Shift+P',   // 命令面板
	'Ctrl+Shift+F',   // 全局搜索
	'Ctrl+,',         // 设置
	'Ctrl+K',         // 快捷键向导的前缀
	'Ctrl+Enter',     // 聊天发送
	'Ctrl+S',         // 保存：题面编辑器文案里让本人按保存
	'Ctrl+C',         // 复制 / 终端里中断进程
]);

// 整条组合键一口气吃完：以前按「修饰键 + 单字符」匹配，把 Ctrl+Alt+Enter 截成
// Ctrl+Alt+E、Shift+F9 截成 Shift+F，制造出一堆假 FAIL。
const TOKEN = /\b(?:Ctrl|Alt|Shift|Cmd)(?:\+(?:Ctrl|Alt|Shift|Cmd|[A-Za-z0-9,]+))+/g;
const stale = [];
let checked = 0;
for (const name of EXTENSIONS) {
	const srcDir = path.join(extRoot, name, 'src');
	if (!fs.existsSync(srcDir)) { continue; }
	for (const file of fs.readdirSync(srcDir).filter(n => n.endsWith('.ts'))) {
		const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
		// 只看反引号/引号里的文案：常量定义本身在 registered 里已经对过。
		for (const m of text.matchAll(/(['"`])([^'"`\n]*)\1/g)) {
			for (const token of m[2].match(TOKEN) ?? []) {
				checked++;
				const norm = normalize(token);
				if (registered.has(norm) || NOT_OLYMPIA.has(norm)) { continue; }
				stale.push(`${name}/src/${file}: 文案写了 ${norm}，但三个扩展的 keybindings 里没有这条`);
			}
		}
	}
}
assert.ok(checked >= 10, `只查到 ${checked} 处文案里的组合键，比预期少：正则或读法变了，这个门得跟着改`);
if (stale.length) {
	console.error([...new Set(stale)].map(s => `FAIL  ${s}`).join('\n'));
	process.exit(1);
}
console.log(`ok    源码文案里的 ${checked} 处组合键都能对上真实注册的键位（注册表共 ${registered.size} 条）`);
