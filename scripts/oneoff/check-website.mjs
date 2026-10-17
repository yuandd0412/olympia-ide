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
const productJson = path.join(repoRoot, 'oss/product.json');
/**
 * 版本号只写在 `oss/product.json` 的 olympiaVersion 一处。以前这里写死
 * `dist/olympia-release-v1.0.0`，于是发新版本时"检查通过"只说明页面和上一次
 * 的目录名对得上，不说明它们对得上真正要发的那一版。
 */
const olympiaVersion = JSON.parse(fs.readFileSync(productJson, 'utf8')).olympiaVersion;
assert.ok(typeof olympiaVersion === 'string' && /^[\d][\w.]*$/.test(olympiaVersion),
	`oss/product.json 的 olympiaVersion 不是一个版本号：${JSON.stringify(olympiaVersion)}`);
const releaseTag = `v${olympiaVersion}`;
const releaseDir = path.join(repoRoot, 'dist', `olympia-release-${releaseTag}`);
const extensionsRoot = path.join(repoRoot, 'oss/extensions');

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
// 每一页自己算一份，别汇成一集：2026-10-16 手册漏了 Ctrl+Alt+M（题面进侧栏），
// 而首页有这条，合集照样「全覆盖」——漏检的那一页正是学生照着抄的那一页。
const pageKeys = new Map();
for (const [file, html] of pages) {
	const table = /<section id="keys"[\s\S]*?<\/section>/.exec(html)?.[0];
	if (!table) { continue; }
	const own = new Set();
	pageKeys.set(path.relative(siteRoot, file), own);
	const rowCells = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]).filter(cell => cell.includes('<td>'));
	check(`快捷键表（${path.relative(siteRoot, file)}）每行都绑了`, () => {
		assert.ok(rowCells.length >= 8, `只解析出 ${rowCells.length} 行，页面结构改了吗？`);
		const unknown = [];
		for (const cell of rowCells) {
			const label = /<td>([^<]*)<\/td>/.exec(cell)?.[1] ?? '?';
			const cells = [...cell.matchAll(/<kbd>([^<]*)<\/kbd>/g)].map(m => m[1]);
			if (!cells.length) { continue; }   // 「点状态栏」这类行没有键位
			const key = normalize(cells.join('+'));
			own.add(key);
			if (!productKeys.has(key)) { unknown.push(`${label} → ${cells.join('+')}`); }
		}
		assert.deepEqual(unknown, [], `页面上写了产品里没绑的键：\n        ${unknown.join('\n        ')}`);
	});
}

for (const [name, own] of pageKeys) {
	check(`产品里绑了的键，${name} 的快捷键表都要写到`, () => {
		const missing = [...productKeys.values()]
			.filter(b => !own.has(normalize(b.key)))
			.map(b => `${b.key} (${b.command})`);
		assert.deepEqual(missing, [], `快捷键表漏了：${missing.join(', ')}`);
	});
}

/**
 * ---- 侧栏面板那四行 ----
 * 首页和手册都照着 Olympia 面板写「什么地方点什么」，可这两处是最容易漂的：面板加一行、
 * 改个叫法，页面上的清单不会跟着变（2026-10-16 一查就中了两条——「AI 教练与帮助」少写了
 * 许可证那一行，手册还写着「只编译」这种面板里根本不存在的名字）。
 * 所以清单从 toolsView.ts 现读，页面必须逐条对得上。
 */
const toolsViewPath = path.join(extensionsRoot, 'olympia-onboarding', 'src', 'toolsView.ts');
const toolsView = fs.readFileSync(toolsViewPath, 'utf8');
const panelGroups = [...toolsView.matchAll(/\{\s*kind:\s*'section',\s*id:\s*'(\w+)',\s*label:\s*'([^']+)'\s*\}/g)]
	.map(m => ({ id: m[1], label: m[2] }));
assert.ok(panelGroups.length >= 4, `toolsView.ts 里只解析出 ${panelGroups.length} 组面板分组，读法要改了`);
const stripTags = s => s.replace(/<[^>]*>/g, '');
/** 只有「讲界面在哪」的两页（首页 #workflow、手册 #bars）带这份清单，按 section 界定页面。 */
const panelPages = [...pages].map(([file, html]) => {
	const section = /<section id="(workflow|bars)"[\s\S]*?<\/section>/.exec(html)?.[0];
	return section ? [path.relative(siteRoot, file), section] : null;
}).filter(Boolean);
assert.ok(panelPages.length >= 2, `只有 ${panelPages.length} 页带侧栏清单（首页 #workflow / 手册 #bars），页面结构改了吗？`);
let panelChecks = 0;
for (const g of panelGroups) {
	const block = g.id === 'status' ? toolsView : ((toolsView.split(`case '${g.id}':`)[1] ?? '').split(/case '/)[0]);
	const want = g.id === 'status' ? 'state' : 'action';
	const labels = [...block.matchAll(/kind:\s*'(action|state)'[^{}]*?label:\s*'([^']+)'/g)]
		.filter(m => m[1] === want).map(m => m[2]);
	assert.ok(labels.length > 0, `面板分组「${g.label}」里一条都没解析出来（toolsView.ts 的写法变了？）`);
	for (const [rel, section] of panelPages) {
		const row = [...section.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => stripTags(m[1])).find(t => t.startsWith(`${g.label}：`));
		// 这一页有那一节，就必须有这一行：放过「找不到」等于让整组断言悄悄变成零条（绿色但什么都没查）。
		if (!row) {
			check(`${rel} 里还能找到「${g.label}」那一行`, () => assert.ok(false, `没有以「${g.label}：」开头的 <li>`));
			continue;
		}
		panelChecks++;
		check(`${rel} 的「${g.label}」一行写全了面板里的 ${labels.length} 条`, () => {
			const missing = labels.filter(l => !row.includes(l));
			assert.deepEqual(missing, [], `面板有但页面上没有：${missing.join('、')}`);
		});
	}
}
assert.ok(panelChecks === panelPages.length * panelGroups.length,
	`侧栏分组断言只跑了 ${panelChecks} / ${panelPages.length * panelGroups.length} 条，这条门现在是空的`);

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

check(`页面上写的版本号就是 ${releaseTag}`, () => {
	const shown = [...pages.entries()]
		.flatMap(([file, html]) => [...html.matchAll(/\bv\d[\w.]*(?=\s*·)/g)].map(m => ({ rel: path.relative(siteRoot, file), tag: m[0] })));
	assert.ok(shown.length > 0, '页面里一处 "vX.Y.Z ·" 都没找到，这条检查空转了');
	const wrong = shown.filter(s => s.tag !== releaseTag).map(s => `${s.rel}：写着 ${s.tag}`);
	assert.deepEqual(wrong, [], `这些位置还写着别的版本：${wrong.join('、')}`);
});

// ---- 下载按钮：写着"引导器"就得真的指向引导器 ----
/** releaseTag 在上面从 product.json 推出来：页面、产物目录名、Gitee 标签必须是同一个。 */

/** 页面里所有 Gitee 附件直链（发行版列表页不算）。 */
function directDownloadUrls() {
	return [...new Set([...pages.values()]
		.flatMap(html => [...html.matchAll(/href="(https:\/\/gitee\.com\/[^"]+\/releases\/download\/[^"]+)"/g)].map(m => m[1])))];
}

check('每个 data-download 按钮点下去就是它写的那个文件', () => {
	assert.ok(releaseTag, `读不到发行版标签（${path.basename(releaseDir)}），这条检查就空转了`);
	const anchors = [];
	for (const [file, html] of pages) {
		for (const m of html.matchAll(/<a[^>]*href="([^"]+)"[^>]*data-download="([^"]+)"/g)) {
			anchors.push({ rel: path.relative(siteRoot, file), href: m[1], want: m[2] });
		}
	}
	assert.ok(anchors.length >= 5, `只解析出 ${anchors.length} 条带 data-download 的按钮，结构改了吗？`);
	const wrong = anchors
		.map(a => ({ ...a, file: decodeURIComponent(a.href.split('/').pop()) }))
		.filter(a => a.file !== a.want)
		.map(a => `${a.rel}：写着 ${a.want}，点开是 ${a.file}`);
	assert.deepEqual(wrong, [], wrong.join('\n        '));
	const tags = [...new Set(anchors.map(a => /\/releases\/download\/([^/]+)\//.exec(a.href)?.[1]))];
	assert.deepEqual(tags, [releaseTag], `按钮指向的标签是 ${tags.join(' / ') || '(没有)'}，产物目录是 ${releaseTag}`);
	const stale = [...pages].filter(([, html]) => /_0\.1\.0_x64-setup\.exe/.test(html)).map(([f]) => path.relative(siteRoot, f));
	assert.deepEqual(stale, [], `这些页面还在直接发退役的 Tauri 版：${stale.join('、')}`);
});

check('--online：每条下载直链在 Gitee 上都真的存在（部署前跑一次）', () => {
	// 真正的网络核对在文件末尾异步做，这里只保证"要跑的话有东西可跑"，不空转。
	if (!process.argv.includes('--online')) { return; }
	assert.ok(directDownloadUrls().length > 0, '--online 一条下载直链都没解析出来，等于没查');
});

/** 发布目录里的那些安装器文件（不含清单与说明文本），名字 + 字节数都从磁盘上来。 */
function filesInReleaseDir() {
	if (!fs.existsSync(releaseDir)) { return []; }
	return fs.readdirSync(releaseDir)
		.filter(name => /^OlympiaSetup.*(exe|bin)$/.test(name))
		.map(name => ({ name, bytes: fs.statSync(path.join(releaseDir, name)).size }));
}

// ---- DEPLOY.md 里的字节数：也是抄来的，那就得对着产物核 ----
check('发布文档里的每个字节数都真在产物上存在', () => {
	const deployPath = path.join(siteRoot, 'DEPLOY.md');
	assert.ok(fs.existsSync(deployPath), 'website/DEPLOY.md 不在了，这条检查要跟着删或改写');
	const doc = fs.readFileSync(deployPath, 'utf8');
	const listed = filesInReleaseDir();
	assert.ok(listed.length >= 2, `发布目录里只读到 ${listed.length} 个安装器文件，这条检查没意义`);
	const real = new Map(listed.map(f => [f.bytes.toLocaleString('en-US'), f.name]));
	// 「总计」说的是安装器本体（OlympiaSetup.exe + 各 .bin）；引导器是下载器，不在 payload 里。
	const total = listed.filter(f => !/-web\.exe$/.test(f.name))
		.reduce((sum, f) => sum + f.bytes, 0).toLocaleString('en-US');
	const totalShown = [...doc.matchAll(/总计 ([\d,]+) B/g)].map(m => m[1]);
	assert.deepEqual([...new Set(totalShown)], [total], `DEPLOY.md 的总计应是 ${total} B，写的是 ${totalShown.join(' / ') || '(没写)'}`);
	real.set(total, '全部文件合计');
	// 十进制上限这类"规定的数"不是实测值，单独放行，否则文档里连限制都不能写。
	const NOT_A_MEASUREMENT = new Set(['100,000,000']);
	const figures = [...new Set([...doc.matchAll(/\b\d{1,3}(?:,\d{3}){2,}\b/g)].map(m => m[0]))];
	assert.ok(figures.length >= 4, `只从 DEPLOY.md 里解析出 ${figures.length} 个字节数，格式改了吗？`);
	const wrong = figures.filter(n => !NOT_A_MEASUREMENT.has(n) && !real.has(n))
		.map(n => `${n}（页面写的是这个数，产物里没有）`);
	assert.deepEqual(wrong, [], wrong.join('\n        '));
	const missing = [...real.values()].filter(name => name !== '全部文件合计' && !doc.includes(name));
	assert.deepEqual(missing, [], `DEPLOY.md 没提到这些发布文件：${missing.join('、')}`);
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
	// 页面上这串参数以前写了两处（手画的假终端 + 示例段）。首屏换成真截图以后，假终端没了，
	// 所以下限降到 1；真正要防的是「留下的那一处跟产品算出来的不一致」，那条不降。
	// 别为了凑数再把假终端加回来——那等于让检查台逼着页面上留一块假东西。
	const hits = [...indexHtml.matchAll(/-x c\+\+ -std=[\w=+.-]+(?: -[\w=+.-]+)+/g)].map(m => m[0].split(' -o')[0]);
	assert.ok(hits.length >= 1, `页面上解析不出编译参数串（${hits.length} 处），示例那处没了？`);
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

// 线上核对单独走异步：check() 是同步 try/catch，塞个 async 进去会因为
// Promise 没被 await 而"永远绿"，那正是这条检查要避免的事。
if (process.argv.includes('--online')) {
	const urls = directDownloadUrls();
	const bad = [];
	for (const url of urls) {
		try {
			const res = await fetch(encodeURI(url), { method: 'HEAD', redirect: 'follow' });
			if (!res.ok) { bad.push(`${url} → HTTP ${res.status}`); }
		} catch (error) {
			bad.push(`${url} → ${error.name}`);
		}
	}
	if (bad.length) { failed++; console.log(`FAIL  线上取不到这些下载直链：\n        ${bad.join('\n        ')}`); }
	else { console.log(`ok    ${urls.length} 条下载直链在线上都在`); }
}

console.log(failed ? `\n${failed} 处官网与产品不一致` : '\nall website checks passed');
process.exitCode = failed ? 1 : 0;
