// 官网键表与出厂键位不许各说各话：站点写了产品没绑 = 空头承诺；产品绑了站点没写 = 学生找不到。
// 两边的形状差很多（站点是 <kbd> 标签、产品是 package.json 的 "ctrl+alt+," ），所以两边都归一到
// 同一套规范串再比。单键（F9）和多键一样要进比对——2026-10-19 就是因为只数了带「+」的行，
// 差点把「F9 没写进站点」报成缺陷。
//
//   node scripts/oneoff/check-website-keys.mjs            比对
//   node scripts/oneoff/check-website-keys.mjs --self-test 确认这一门真的会咬
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const EXT = ['olympia-onboarding', 'olympia-contest', 'olympia-coach'];
const SITE = path.join(root, 'website/index.html');

/** ctrl+alt+， / Control+Alt+, / F9 都归到同一条：排序后的小写 token 串。 */
function canon(raw) {
	const parts = String(raw).toLowerCase().split('+').map(p => p.trim())
		.map(p => p === 'control' ? 'ctrl' : p)
		.map(p => p === '⌘' || p === 'cmd' || p === 'command' ? 'meta' : p)
		.filter(p => p && p !== 'meta')
		.map(p => p === 'enter' ? 'return' : p === 'escape' ? 'esc' : p);
	return [...new Set(parts)].sort().join('+');
}

function shippedBindings() {
	const out = new Map();
	for (const ext of EXT) {
		const file = path.join(root, 'oss/extensions', ext, 'package.json');
		if (!fs.existsSync(file)) { throw new Error(`读不到 ${file}`); }
		const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
		for (const kb of manifest.contributes?.keybindings ?? []) {
			const key = canon(kb.key);
			if (!key) { continue; }
			if (!out.has(key)) { out.set(key, kb.command); }
		}
	}
	return out;
}

/** 只读「快捷键」那一节的表格：每行的键位列里所有 <kbd> 拼起来。 */
function siteRows(html) {
	const section = /<section id="keys"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
	if (!section) { throw new Error('站点里找不到 <section id="keys">，这一门就无从比对——去把选择器改对，别让它空转'); }
	const rows = [];
	for (const tr of section.match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
		const cells = tr.match(/<td>[\s\S]*?<\/td>/g) ?? [];
		if (cells.length < 2) { continue; }
		const label = cells[0].replace(/<[^>]+>/g, '').trim();
		for (const cell of cells.slice(1)) {
			const keys = [...cell.matchAll(/<kbd>([^<]*)<\/kbd>/g)].map(m => m[1]);
			if (keys.length) { rows.push({ label, key: canon(keys.join('+')) }); }
		}
	}
	return rows;
}

let failed = 0;
function report(ok, line) {
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${line}`);
	if (!ok) { failed++; }
}

function run(html) {
	const shipped = shippedBindings();
	const rows = siteRows(html);
	const claimed = new Set(rows.map(r => r.key));
	for (const [key, command] of shipped) {
		report(claimed.has(key), `产品绑了 ${key}（${command}），站点键表里有这一行`);
	}
	for (const row of rows) {
		report(shipped.has(row.key), `站点键表「${row.label}」写的 ${row.key} 确实在出厂绑定里`);
	}
	report(rows.length >= shipped.size, `键表行数 ${rows.length} 不少于出厂绑定 ${shipped.size} 条`);
	return failed;
}

/**
 * 方向 B 铺到全站：任何一个页面里出现的组合键都必须真的被绑定。
 * docs 那一页不要求列全（它按主题分组），但也不许写一个产品里不存在的键。
 */
function checkAllPages(shipped) {
	const dir = path.join(root, 'website');
	for (const rel of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
		const html = fs.readFileSync(path.join(dir, rel), 'utf8');
		const seen = new Set();
		for (const m of html.matchAll(/<kbd>[^<]*<\/kbd>(?:\s*\+\s*<kbd>[^<]*<\/kbd>)+/g)) {
			const keys = [...m[0].matchAll(/<kbd>([^<]*)<\/kbd>/g)].map(x => x[1]);
			const combo = canon(keys.join('+'));
			if (combo.includes('+')) { seen.add(combo); }
		}
		for (const combo of seen) {
			report(shipped.has(combo), `${rel} 写的 ${combo} 在出厂绑定里（全站方向 B）`);
		}
	}
}

if (process.argv.includes('--self-test')) {
	const real = fs.readFileSync(SITE, 'utf8');
	const before = failed;
	// 咬法一：把 F9 那一行删掉 → 「产品绑了、站点没写」必须变红。
	const missing = real.replace(/<tr><td>编译并运行<\/td><td><kbd>F9<\/kbd><\/td>[\s\S]*?<\/tr>/, '');
	report(missing !== real, 'self-test 的删行确实动到了内容');
	failed = 0;
	run(missing);
	report(failed > 0, `删掉 F9 那一行之后这一门变红（抓到 ${failed} 条）`);
	// 咬法二：站点多写一个产品没绑的键 → 必须变红。
	const extra = real.replace('<tr><td>跑样例</td>', '<tr><td>假条目</td><td><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Y</kbd></td>');
	failed = 0;
	run(extra);
	report(failed > 0, `站点凭空多一条键位时这一门变红（抓到 ${failed} 条）`);
	failed = before;
	console.log(failed ? '' : '');
	process.exitCode = 0;
} else {
	console.log(`出厂绑定 ${shippedBindings().size} 条，站点键表 ${siteRows(fs.readFileSync(SITE, 'utf8')).length} 行`);
	run(fs.readFileSync(SITE, 'utf8'));
	checkAllPages(shippedBindings());
	console.log(failed ? `\nFAILED ${failed} 条` : '\n官网键表与出厂键位一致');
	process.exitCode = failed ? 1 : 0;
}
