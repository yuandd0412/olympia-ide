// 官网与产品对账：页面上写的键位、文件大小、内部锚点，必须以仓库里的真实清单和产物为准。
// 官网是给人看的承诺，承诺过期比没有更糟：学生按页面上的 Ctrl+Alt+X 去按，结果什么都没发生。
// 运行：node scripts/oneoff/check-website.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const siteRoot = path.join(repoRoot, 'website');
const releaseDir = path.join(repoRoot, 'dist/olympia-release-v1.0.0');
const extensionsRoot = path.join(repoRoot, 'oss/extensions');
const productJson = path.join(repoRoot, 'oss/product.json');

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

/** 站内所有 HTML：官网 + 使用手册 + 隐私 + 条款。漏掉任何一页，断言就只覆盖了一半。 */
function* htmlFiles(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) { yield* htmlFiles(full); }
		else if (entry.name.endsWith('.html')) { yield full; }
	}
}
const pages = new Map([...htmlFiles(siteRoot)].map(file => [file, fs.readFileSync(file, 'utf8')]));
const indexHtml = pages.get(path.join(siteRoot, 'index.html'));
if (!indexHtml) { console.error('website/index.html 不存在'); process.exit(1); }


// ---- 产品侧的真实键位 ----
const bindings = [];
for (const id of ['olympia-onboarding', 'olympia-contest', 'olympia-coach']) {
	const manifest = JSON.parse(fs.readFileSync(path.join(extensionsRoot, id, 'package.json'), 'utf8'));
	for (const kb of manifest.contributes?.keybindings ?? []) {
		bindings.push({ id, key: kb.key.toLowerCase(), command: kb.command });
	}
}
/** 清单里写 `comma`，页面上写 `,`：两边指的是同一个键，比对前先归一。 */
const KEY_ALIASES = { comma: ',', period: '.', semicolon: ';', quote: "'", backslash: '\\', minus: '-', equal: '=', space: ' ' };
const normalize = k => k.toLowerCase().split('+').map(part => KEY_ALIASES[part] ?? part).sort().join('+');
const productKeys = new Map(bindings.map(b => [normalize(b.key), b]));

// ---- 页面上的键位行 ----
const pageKeys = new Set();
for (const [file, html] of pages) {
	const table = /<section id="keys"[\s\S]*?<\/section>/.exec(html)?.[0];
	if (!table) { continue; }
	const rowCells = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]).filter(cell => cell.includes('<td>'));
	check(`快捷键表（${path.relative(siteRoot, file)}）每行都绑了`, () => {
		assert.ok(rowCells.length >= 8, `只解析出 ${rowCells.length} 行，页面结构改了吗？`);
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
}

check('产品里绑了的键，快捷键表都要写到', () => {
	const missing = [...productKeys.values()]
		.filter(b => !pageKeys.has(normalize(b.key)))
		.map(b => `${b.key} (${b.command})`);
	assert.deepEqual(missing, [], `快捷键表漏了：${missing.join(', ')}`);
});

// ---- 下载区：文件大小要和产物一致 ----
check('完整版每个文件的标称体积与实际字节一致', () => {
	assert.ok(fs.existsSync(releaseDir), `${releaseDir} 不存在，体积断言只能跳过——先跑分卷打包再检查官网`);
	const rows = [...indexHtml.matchAll(/<code>(OlympiaSetup[^<]*\.bin|OlympiaSetup\.exe)<\/code><\/td><td>([\d.]+) MB<\/td>/g)];
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
	const sum = /全部文件共 ([\d,]+) 字节/.exec(indexHtml);
	assert.ok(sum, '页面没有「全部文件共 N 字节」这句');
	const shown = Number(sum[1].replace(/,/g, ''));
	const withWebExe = total + (fs.existsSync(path.join(releaseDir, 'OlympiaSetup-web.exe')) ? fs.statSync(path.join(releaseDir, 'OlympiaSetup-web.exe')).size : 0);
	assert.ok(shown === total || shown === withWebExe, `总字节数写的是 ${shown}，分卷相加是 ${total}（含引导器 ${withWebExe}）`);
});

// ---- 内部锚点、跨页链接与外链 ----
const siteHost = 'olympia.dpdns.org';
const anchorsOf = html => new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));

/** 站内相对链接 → 磁盘上的页面；目录按 Cloudflare Pages 的规则补 index.html。 */
function resolveSiteLink(fromFile, href) {
	const clean = href.replace(/[?#].*$/, '');
	if (!clean) { return fromFile; }
	const target = path.resolve(path.dirname(fromFile), decodeURIComponent(clean));
	return fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, 'index.html') : target;
}

for (const [file, html] of pages) {
	const from = path.relative(siteRoot, file);
	check(`站内链接都落得到页、锚点都不悬空（${from}）`, () => {
		const broken = [];
		for (const m of html.matchAll(/href="(?!https?:|mailto:|data:)([^"]+)"/g)) {
			const [pathPart, hash] = m[1].split('#');
			if (!pathPart) {
				if (hash && !anchorsOf(html).has(hash)) { broken.push(`${m[1]} → 本页没有 #${hash}`); }
				continue;
			}
			const targetFile = resolveSiteLink(file, pathPart);
			if (!pages.has(targetFile)) {
				// 样式、脚本、图片这类资源不在 pages 里，不是断链
				if (/\.(css|js|mjs|png|jpe?g|svg|ico|webp|txt|json|xml|woff2?)$/i.test(pathPart)) { continue; }
				broken.push(`${m[1]} → 站内没有 ${path.relative(siteRoot, targetFile)}`);
				continue;
			}
			if (hash && !anchorsOf(pages.get(targetFile)).has(hash)) { broken.push(`${m[1]} → 锚点 #${hash} 不存在`); }
		}
		assert.deepEqual(broken, [], broken.join('\n        '));
	});
}

check('外链都是 https，且没有占位地址', () => {
	const bad = [];
	for (const html of pages.values()) {
		for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
			if (m[1].startsWith('http://') || /example\.(com|org)|YOUR-|CHANGE_ME|待确认/.test(m[1])) { bad.push(m[1]); }
		}
	}
	assert.deepEqual([...new Set(bad)], [], [...new Set(bad)].join('\n        '));
});

// ---- 产品里写的自家链接，必须真的对应站内页面 ----
check('product.json 指向官网的每个链接都有对应页面', () => {
	const product = JSON.parse(fs.readFileSync(productJson, 'utf8'));
	const urls = [];
	const walk = value => {
		if (typeof value === 'string') { if (value.startsWith(`https://${siteHost}`)) { urls.push(value); } return; }
		if (Array.isArray(value)) { value.forEach(walk); return; }
		if (value && typeof value === 'object') { Object.values(value).forEach(walk); }
	};
	walk(product);
	assert.ok(urls.length >= 3, `只从 product.json 里找到 ${urls.length} 条自家链接，解析方式过期了吗？`);
	const missing = [];
	for (const url of urls) {
		const rest = url.slice(`https://${siteHost}`.length);
		const [pathname, hash] = rest.split('#');
		const file = resolveSiteLink(path.join(siteRoot, 'index.html'), pathname.replace(/^\//, ''));
		if (!pages.has(file)) { missing.push(`${url} → 站内没有 ${path.relative(siteRoot, file) || 'index.html'}`); continue; }
		if (hash && !anchorsOf(pages.get(file)).has(hash)) { missing.push(`${url} → 锚点 #${hash} 不存在`); }
	}
	assert.deepEqual(missing, [], missing.join('\n        '));
});

// ---- 手册的设置表要和扩展清单对得上 ----
check('手册里的设置表和三个扩展清单一条不差', () => {
	const docs = pages.get(path.join(siteRoot, 'docs', 'index.html'));
	assert.ok(docs, 'website/docs/index.html 不存在');
	const declared = new Set();
	for (const id of ['olympia-onboarding', 'olympia-contest', 'olympia-coach']) {
		const manifest = JSON.parse(fs.readFileSync(path.join(extensionsRoot, id, 'package.json'), 'utf8'));
		const configuration = manifest.contributes?.configuration;
		for (const section of Array.isArray(configuration) ? configuration : [configuration]) {
			for (const key of Object.keys(section?.properties ?? {})) { declared.add(key); }
		}
	}
	const documented = new Set(
		[...docs.matchAll(/<code>(olympia\.[a-z][a-zA-Z.]*)/g)].map(m => m[1]).filter(key => !key.endsWith('.'))
	);
	const undocumented = [...declared].filter(key => !documented.has(key));
	const madeUp = [...documented].filter(key => !declared.has(key));
	assert.deepEqual(undocumented, [], `手册漏了这些设置项：${undocumented.join(', ')}`);
	assert.deepEqual(madeUp, [], `手册写了产品里没有的设置项：${madeUp.join(', ')}`);
});

// ---- 页面上的数字与参数承诺：以扩展里的源码为准 ----
/** 只读源码文本，不读编译产物：改了 .ts 没重新编译，也不该让官网"证明"自己过期了。 */
const onboardingSrc = path.join(extensionsRoot, 'olympia-onboarding', 'src');
const contestSrc = path.join(extensionsRoot, 'olympia-contest', 'src');
const docsHtml = pages.get(path.join(siteRoot, 'docs', 'index.html'));

check('手册列的每档评测机参数，和 ojTargets.ts 里的 label / GCC / -std 一字不差', () => {
	const src = fs.readFileSync(path.join(onboardingSrc, 'ojTargets.ts'), 'utf8');
	const targets = [...src.matchAll(/\{\s*id: '(\w+)',\s*label: '([^']+)',\s*gcc: '([^']+)',\s*std: '([^']+)'/g)]
		.map(m => ({ label: m[2], gcc: m[3], std: m[4] }));
	assert.ok(targets.length >= 2, `只解析出 ${targets.length} 个档位，OJ_TARGETS 的形状改了吗？`);
	const missing = targets.filter(t => !docsHtml.includes(`<b>${t.label}</b>：GCC ${t.gcc} 口径，<code>-std=${t.std}</code>`));
	assert.deepEqual(missing, [], `手册的三档预设和产品对不上：${missing.map(t => t.label).join('、')}`);
});

check('官网每一处出现的编译参数串，都和 renderFlags 现在算出来的一致', () => {
	const src = fs.readFileSync(path.join(onboardingSrc, 'ojTargets.ts'), 'utf8');
	const flags = /const LUOGU_BASE_FLAGS = \[([^\]]+)\]/.exec(src);
	assert.ok(flags, '读不到 LUOGU_BASE_FLAGS');
	const first = /\{\s*id: '\w+',\s*label: '[^']+',\s*gcc: '[^']+',\s*std: '([^']+)'/.exec(src);
	assert.ok(first, '读不到第一个档位');
	const expected = `-x c++ -std=${first[1]} ${[...flags[1].matchAll(/'([^']+)'/g)].map(m => m[1]).join(' ')}`;
	// 页面上这串参数写了不止一处（示例输出、tagline），只查一处等于放过另一处过期的。
	const hits = [...indexHtml.matchAll(/-x c\+\+ -std=[\w=+.-]+(?: -[\w=+.-]+)+/g)].map(m => m[0].split(' -o')[0]);
	assert.ok(hits.length >= 2, `页面上只解析出 ${hits.length} 串编译参数，示例那处改了吗？`);
	const wrong = [...new Set(hits)].filter(line => line !== expected);
	assert.deepEqual(wrong, [], `页面的参数串和产品不一致，产品现在是：${expected}\n        过期的是：${wrong.join('\n        ')}`);
});

check('官网写的比赛时长就是 contestMode 里那几个选项', () => {
	const src = fs.readFileSync(path.join(onboardingSrc, 'contestMode.ts'), 'utf8');
	const durations = /const DURATIONS: readonly number\[\] = \[([\d,\s]+)\]/.exec(src);
	assert.ok(durations, '读不到 DURATIONS，页面上的时长没人对账');
	const claimed = /选一段时长（([\d /]+)分钟/.exec(indexHtml);
	assert.ok(claimed, '官网比赛模式那张卡片没有列出时长选项，检查就空转了');
	const page = claimed[1].split('/').map(v => v.trim()).filter(Boolean);
	assert.deepEqual(page, durations[1].split(',').map(v => v.trim()).filter(Boolean), '页面列的时长和产品里的选项不是一份');
});

check('官网说的补全条数等于 CONTEST_SNIPPETS 的条目数', () => {
	const src = fs.readFileSync(path.join(contestSrc, 'snippets.ts'), 'utf8');
	const start = src.indexOf('export const CONTEST_SNIPPETS');
	assert.ok(start >= 0, '读不到 CONTEST_SNIPPETS');
	const real = (src.slice(start, src.indexOf('\n];', start)).match(/\n\t\{/g) ?? []).length;
	assert.ok(real > 0, '一条补全都没解析出来，这条检查就是空的');
	const wrong = [];
	for (const [file, html] of pages) {
		for (const m of html.matchAll(/(\d+) 条[^<]{0,12}的补全/g)) {
			if (Number(m[1]) !== real) {
				wrong.push(`${path.relative(siteRoot, file)}：页面说 ${m[1]} 条，产品里是 ${real} 条`);
			}
		}
	}
	assert.ok(wrong.length === 0, wrong.join('\n        '));
});

check('官网不许承诺产品里没有的东西：Git 命令、把调试侧栏放回来', () => {
	// 这两句先前都写在 FAQ 里，而产品里：git 扩展整族没进包（命令面板搜不到 Git 命令），
	// olympia.debug.showEntryPoints 只控制菜单项的 when 子句，活动栏容器是无条件注销的。
	const bar = fs.readFileSync(path.join(repoRoot, 'oss/src/vs/workbench/contrib/olympia/browser/olympiaActivityBar.ts'), 'utf8');
	assert.ok(bar.includes('deregisterViewContainer'), '读不到注销调用——这条检查就空转了');
	assert.ok(!bar.includes('showEntryPoints'), '如果哪天侧栏改为按设置恢复，就得回来重写官网这段说明（现在页面写的是"不会回来"）');
	const offenders = [];
	for (const [file, html] of pages) {
		const rel = path.relative(siteRoot, file);
		if (/版本管理可以用\s*命令面板里的\s*Git 命令|可以用 Git 命令|命令面板里的 Git 命令/.test(html)) { offenders.push(`${rel}：说版本管理能用 Git 命令，但 git 扩展没进包`); }
		if (/恢复\s*VS Code 自带的|入口就回来了/.test(html)) { offenders.push(`${rel}：说调试入口能整个恢复回来，侧栏其实不会回来`); }
		for (const m of html.matchAll(/olympia\.debug\.showEntryPoints/g)) {
			const block = html.slice(Math.max(0, m.index - 400), m.index + 400);
			if (!/不会回来/.test(block)) { offenders.push(`${rel}：提到这个设置却没说清它只放菜单项`); }
			void m;
		}
	}
	assert.ok(offenders.length === 0, offenders.join('\n        '));
});

check('产品自己的许可证：官网页脚与 product.json 同一条', () => {
	const lic = JSON.parse(fs.readFileSync(productJson, 'utf8')).licenseName;
	assert.ok(typeof lic === 'string' && lic.length > 0, 'product.json 没写 licenseName');
	const missing = [...pages].filter(([, html]) => /基于 Microsoft Visual Studio Code|Visual Studio Code（MIT/.test(html))
		.filter(([file, html]) => !html.includes(lic))
		.map(([file]) => path.relative(siteRoot, file));
	assert.ok(missing.length === 0, `这些页面提到上游 MIT 却没写产品自己的 ${lic}：${missing.join('、')}`);
});

console.log(failed ? `\n${failed} 处官网与产品不一致` : '\nall website checks passed');process.exitCode = failed ? 1 : 0;
