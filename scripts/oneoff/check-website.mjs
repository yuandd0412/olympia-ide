// 官网与产品对账：页面上写的键位、文件大小、内部锚点，必须以仓库里的真实清单和产物为准。
// 官网是给人看的承诺，承诺过期比没有更糟：学生按页面上的 Ctrl+Alt+X 去按，结果什么都没发生。
// 运行：node scripts/oneoff/check-website.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const site = path.join(repoRoot, 'website/index.html');
const releaseDir = path.join(repoRoot, 'dist/olympia-release-v1.0.0');
const extensionsRoot = path.join(repoRoot, 'oss/extensions');
const html = fs.readFileSync(site, 'utf8');

let failed = 0;
function check(name, fn) {
	try {
		fn();
		console.log(`ok    ${name}`);
	} catch (error) {
		failures(error);
	}
}
function failures(error) {
	failed++;
	console.log(`FAIL  ${error.message}`);
}

// ---- 产品侧的真实键位 ----
const bindings = [];
for (const id of ['olympia-onboarding', 'olympia-contest', 'olympia-coach']) {
	const manifest = JSON.parse(fs.readFileSync(path.join(extensionsRoot, id, 'package.json'), 'utf8'));
	for (const kb of manifest.contributes?.keybindings ?? []) {
		bindings.push({ id, key: kb.key.toLowerCase(), command: kb.command });
	}
}
const normalize = k => k.toLowerCase().split('+').sort().join('+');
const productKeys = new Map(bindings.map(b => [normalize(b.key), b]));

// ---- 页面上的键位行 ----
const table = /<section id="keys"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
const rowCells = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]).filter(cell => cell.includes('<td>'));
const pageKeys = new Set();
check('页面上每个键位都在扩展清单里真的绑了', () => {
	assert.ok(rowCells.length >= 8, `快捷键表格只解析出 ${rowCells.length} 行，页面结构改了吗？`);
	const unknown = [];
	for (const cell of rowCells) {
		const label = /<td>([^<]*)<\/td>/.exec(cell)?.[1] ?? '?';
		const cells = [...cell.matchAll(/<kbd>([^<]*)<\/kbd>/g)].map(m => m[1]);
		if (!cells.length) { continue; }   // 「点状态栏」这类行没有键位
		const key = normalize(cells.join('+'));
		pageKeys.add(key);
		if (!productKeys.has(key)) { unknown.push(`${label} → ${cells.join('+')}`); }
	}
	assert.deepEqual(unknown, [], `页面上写了产品里没绑的键：\n        ${unknown.join('\n        ')}`);
});

check('产品里绑了的键，页面都要写到', () => {
	const missing = [...productKeys.values()]
		.filter(b => !pageKeys.has(normalize(b.key)))
		.map(b => `${b.key} (${b.command})`);
	assert.deepEqual(missing, [], `快捷键表漏了：${missing.join(', ')}`);
});

// ---- 下载区：文件大小要和产物一致 ----
check('完整版每个文件的标称体积与实际字节一致', () => {
	assert.ok(fs.existsSync(releaseDir), `${releaseDir} 不存在，体积断言只能跳过——先跑分卷打包再检查官网`);
	const rows = [...html.matchAll(/<code>(OlympiaSetup[^<]*\.bin|OlympiaSetup\.exe)<\/code><\/td><td>([\d.]+) MB<\/td>/g)];
	assert.ok(rows.length >= 5, `只解析出 ${rows.length} 行文件体积，下载表结构改了吗？`);
	const wrong = [];
	let total = 0;
	for (const row of rows) {
		const file = path.join(releaseDir, row[1]);
		assert.ok(fs.existsSync(file), `页面列了 ${row[1]}，产物目录里没有`);
		const bytes = fs.statSync(file).size;
		total += bytes;
		const declared = Number(row[2]) * 1e6;
		if (Math.abs(declared - bytes) / bytes > 0.01) { wrong.push(`${row[1]}：页面 ${row[2]} MB，实际 ${bytes} B`); }
	}
	assert.deepEqual(wrong, [], wrong.join('\n        '));
	const sum = /全部文件共 ([\d,]+) 字节/.exec(html);
	assert.ok(sum, '页面没有「全部文件共 N 字节」这句');
	const shown = Number(sum[1].replace(/,/g, ''));
	const withWebExe = total + (fs.existsSync(path.join(releaseDir, 'OlympiaSetup-web.exe')) ? fs.statSync(path.join(releaseDir, 'OlympiaSetup-web.exe')).size : 0);
	assert.ok(shown === total || shown === withWebExe, `总字节数写的是 ${shown}，分卷相加是 ${total}（含引导器 ${withWebExe}）`);
});

// ---- 内部锚点与外链 ----
check('导航指向的锚点都存在', () => {
	const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
	const dangling = [...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1]).filter(target => !ids.has(target));
	assert.deepEqual(dangling, [], `点了不会动的锚点：${dangling.join(', ')}`);
});

check('外链都是 https，且没有占位地址', () => {
	const bad = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1])
		.filter(url => url.startsWith('http://') || /example\.(com|org)|YOUR-|CHANGE_ME|待确认/.test(url));
	assert.deepEqual(bad, [], bad.join('\n        '));
});

console.log(failed ? `\n${failed} 处官网与产品不一致` : '\nall website checks passed');
process.exitCode = failed ? 1 : 0;
