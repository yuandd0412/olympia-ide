// 扩展自己声明的组合键，必须是 VS Code 真能解析的写法。
//
// 为什么要有这一条：`olympia.settings` 在 package.json 里写的是 "ctrl+alt+comma"，
// 而 VS Code 的键位解析器认字面量 ","，不认扫描码的名字 "comma"——于是这个快捷键
// 从来没生效过，而它同时被欢迎页向导、面板行提示和官网文案承诺着（"按 Ctrl+Alt+, 打开设置"）。
// 2026-10-18 实测：同一个物理组合键，声明改成 "ctrl+alt+," 之后 1 秒就打开设置页。
// 这类错误不会编译报错、不会激活失败，只有用户按了没反应才知道，所以交给门来拦。
//
//   node scripts/oneoff/check-keybinding-tokens.mjs            # 扫所有内置 Olympia 扩展
//   node scripts/oneoff/check-keybinding-tokens.mjs --self-test # 确认这条规则真的会红
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { discoverOlympiaExtensions } from './lib/olympia-extensions.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const extRoot = path.join(repoRoot, 'oss', 'extensions');
// 名单从磁盘发现，不写死：加了新扩展而忘了改这里，它声明的键位写法就没人查了。
const EXTENSIONS = discoverOlympiaExtensions(extRoot);

/**
 * 有字面写法的可打印键一律不许写扫描码名字：写出来解析不了，且没有任何报错。
 * 这一组全部对应键盘上一个字符键，用户键位里就该出现那个字符本身。
 */
const MUST_BE_LITERAL = new Set([
	'comma', 'period', 'semicolon', 'quote', 'backquote',
	'minus', 'equal', 'slash', 'backslash', 'leftbracket', 'rightbracket',
]);

/** 功能键与导航键的合法字名；其余多字母 token 一律当可疑。 */
const WORD_KEYS = new Set([
	'enter', 'escape', 'tab', 'space', 'backspace', 'delete', 'insert',
	'home', 'end', 'pageup', 'pagedown', 'up', 'down', 'left', 'right',
]);
const MODIFIERS = new Set(['ctrl', 'shift', 'alt', 'cmd', 'win', 'meta', 'option', 'command']);

/** 返回这条键串的问题描述；没问题返回 undefined。 */
function problem(key) {
	const value = String(key ?? '').trim().toLowerCase();
	if (!value) { return '空键串'; }
	const tokens = value.split('+');
	const main = tokens[tokens.length - 1];
	for (const t of tokens.slice(0, -1)) {
		if (!MODIFIERS.has(t)) { return `修饰键名字 ${t} 不是 VS Code 认的字`; }
	}
	if (MUST_BE_LITERAL.has(main)) {
		return `"${main}" 是扫描码名字，用户键位里要写字面字符（comma→","、period→"."、semicolon→";" 等）`;
	}
	if (main.length === 1) { return undefined; }
	if (/^f\d{1,2}$/.test(main)) { return undefined; }
	if (WORD_KEYS.has(main)) { return undefined; }
	return `不认识的多字母键名 "${main}"`;
}

if (process.argv.includes('--self-test')) {
	// 反向对照：把当年那条真出错的声明喂给同一个判断，必须报错，否则这扇门是空的。
	assert.ok(problem('ctrl+alt+comma'), '自检失败：规则抓不住 ctrl+alt+comma，那这条门等于没有');
	assert.strictEqual(problem('ctrl+alt+,'), undefined, '自检失败：把合法写法判成了错的');
	assert.strictEqual(problem('shift+f9'), undefined, '自检失败：功能键被判错');
	console.log('ok    自检：ctrl+alt+comma 会被拦下，ctrl+alt+, 放行');
	process.exit(0);
}

const findings = [];
let scanned = 0;
for (const ext of EXTENSIONS) {
	const pkgPath = path.join(extRoot, ext, 'package.json');
	assert.ok(fs.existsSync(pkgPath), `读不到 ${pkgPath}——这条检查不能空转`);
	const kb = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).contributes?.keybindings ?? [];
	assert.ok(kb.length > 0 || ext !== 'olympia-onboarding', `${ext} 一条键位都没声明，镜像表与文案是怎么对上的？`);
	for (const entry of kb) {
		scanned++;
		for (const field of ['key', 'mac']) {
			if (entry[field] === undefined) { continue; }
			const why = problem(entry[field]);
			if (why) { findings.push(`${ext} → ${entry.command} 的 ${field}="${entry[field]}"：${why}`); }
		}
	}
}
assert.ok(scanned >= 15, `只扫了 ${scanned} 条键位声明，比预期少得多——扩展或字段名改了吗？`);
assert.ok(findings.length === 0, `这些组合键 VS Code 解析不了，用户按下去就是没反应：\n        ${findings.join('\n        ')}`);
console.log(`ok    ${scanned} 条扩展键位声明都能被解析（含 ${EXTENSIONS.length} 个扩展的 key 与 mac）`);
