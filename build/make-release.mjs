// 把一次打包的产物变成"可以直接拖进 Gitee 发行版"的那一组文件，顺手把官网写的数字改成真的。
//
// 为什么要有这个脚本：官网下载表里的体积、总字节、引导器大小以前都是人手抄上一次构建的结果，
// 于是新包出来后页面还在描述旧包（2026-10-15 查出来时，线上页面甚至还在发退役的 Tauri 版）。
// 体积、清单、引导器 tag 现在是这里从产物反推出来的，抄错的机会没了。
//
// 用法（在仓库根）：
//   node build/make-release.mjs --tag v1.0.0
//   node build/make-release.mjs --tag v1.0.0 --skip-bootstrap   # 只收文件，不重编引导器
import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const oss = path.join(repoRoot, 'oss');

const argv = process.argv.slice(2);
const arg = name => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : undefined;
};
/** 版本号只写在 oss/product.json 的 olympiaVersion 一处；--tag 不给就从这里推，给了就必须一致。 */
const productJson = JSON.parse(fs.readFileSync(path.join(oss, 'product.json'), 'utf8'));
const olympiaVersion = productJson.olympiaVersion;
/** 产品版本（1.140.0 那一套）在 fork 的 package.json，不在 product.json——写在这儿的数字也不该手抄。 */
const productVersion = JSON.parse(fs.readFileSync(path.join(oss, 'package.json'), 'utf8')).version;
const tag = arg('tag') ?? (olympiaVersion ? `v${olympiaVersion}` : undefined);
const skipBootstrap = argv.includes('--skip-bootstrap');
const slicesDir = arg('slices') ?? path.join(oss, '.build', 'win32-x64', 'user-setup');
const outDir = path.join(repoRoot, 'dist', `olympia-release-${tag}`);
const indexHtmlPath = path.join(repoRoot, 'website', 'index.html');

assert.ok(tag && /^v[\d][\w.]*$/.test(tag), `--tag 要给形如 v1.0.0 的标签，或者在 oss/product.json 写好 olympiaVersion，现在给的是 ${JSON.stringify(tag)}`);
assert.ok(tag === `v${olympiaVersion}`, `--tag ${tag} 与 oss/product.json 的 olympiaVersion（${olympiaVersion}）不一致。版本号只写在 product.json 一处：要改版本就改那里，别加 --tag。`);
assert.ok(fs.existsSync(slicesDir), `分卷目录不存在：${slicesDir}（先跑 oss 的 vscode-win32-x64-user-setup）`);
assert.ok(productVersion, 'oss/package.json 没有 version 字段：分卷表那段话里的「产品版本」就没来源了');

const GITEE_ATTACH_LIMIT = 100_000_000;   // Gitee 附件按十进制 100 MB 卡，一片都不能超
const MB = 1e6, MIB = 1024 * 1024;

function step(msg) { console.log(`— ${msg}`); }
function sha256(file) {
	return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

// ---- 1. 收分卷 ----
const present = fs.readdirSync(slicesDir).filter(n => /^OlympiaSetup.*(exe|bin)$/i.test(n));
const setupExe = 'OlympiaSetup.exe';
assert.ok(present.includes(setupExe), `${slicesDir} 里没有 ${setupExe}`);
const bins = present.filter(n => /^OlympiaSetup-(\d+)\.bin$/.test(n))
	.sort((a, b) => Number(/(\d+)/.exec(a)[1]) - Number(/(\d+)/.exec(b)[1]));
assert.ok(bins.length > 0, '一个 .bin 都没找到：这一版没开分卷？');
bins.forEach((name, i) => assert.equal(name, `OlympiaSetup-${i + 1}.bin`,
	`分卷不连续：第 ${i + 1} 片是 ${name}。用户漏下载一片时向导只会说"需要下一张磁盘"，查不到是没编出来`));

const files = [setupExe, ...bins].map(name => ({
	name,
	bytes: fs.statSync(path.join(slicesDir, name)).size,
	mtime: fs.statSync(path.join(slicesDir, name)).mtimeMs,
}));
for (const f of files) {
	assert.ok(f.bytes < GITEE_ATTACH_LIMIT, `${f.name} 有 ${f.bytes} B，超过 Gitee 单附件 100 MB，传不上去`);
}
// 上一次构建留下的 .bin 不会被这次覆盖（切片数变少时尤其容易踩），混进去就是一份
// 对不上任何安装器的 94 MB。用时间戳卡一下：同一批产物的落盘时间差不到一小时。
const newest = Math.max(...files.map(f => f.mtime));
const stale = files.filter(f => newest - f.mtime > 6 * 3600 * 1000).map(f => f.name);
assert.deepEqual(stale, [], `这些文件比同目录里最新的产物旧一个小时以上，多半是上一次编译留下的：${stale.join('、')}`);
const total = files.reduce((sum, f) => sum + f.bytes, 0);
// 改官网之前先确认这真的是一个安装器：脚本会直接重写页面上的体积，
// 拿一次测试用的假分卷跑它，线上文案就变成几个字节（我踩过自己这一刀）。
if (!argv.includes('--allow-tiny')) {
	assert.ok(total > 50 * MIB, `这一组文件总共只有 ${total} B，不像一次真实编译的产物；确实要这样跑就加 --allow-tiny`);
}
const maxBytes = Math.max(...files.map(f => f.bytes));
step(`${files.length} 个文件，共 ${total} B（${(total / MIB).toFixed(1)} MiB），最大一片 ${maxBytes} B`);

// ---- 2. 落进发布目录 + 校验清单 ----
// 旧目录整份挪走而不是就地覆盖：这一版如果切片数变了，留下上一次多出来的 .bin
// 会被一起拖上传，用户那边就是"下一张磁盘"永远点不完。也不删，那是上一次真正
// 发出去的那组字节，还得留给已经装上的学生对照。
if (fs.existsSync(outDir)) {
	const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
	const backup = `${outDir}.bak-${stamp}`;
	assert.ok(!fs.existsSync(backup), `${backup} 已经在了，脚本不敢再挪一次`);
	fs.renameSync(outDir, backup);
	step(`上一次的发布目录挪到 ${path.basename(backup)}`);
}
fs.mkdirSync(outDir, { recursive: true });
for (const f of files) {
	fs.copyFileSync(path.join(slicesDir, f.name), path.join(outDir, f.name));
}
// 引导器按这份清单逐个下载并校验，格式必须是 coreutils 的 "<hex>  *<name>"，行尾 CRLF。
const manifest = files.map(f => `${sha256(path.join(outDir, f.name))}  *${f.name}`).join('\r\n') + '\r\n';
fs.writeFileSync(path.join(outDir, 'SHA256SUMS.txt'), manifest, 'utf8');
step(`发布目录：${outDir}`);

// ---- 3. 引导器：标签是编译进去的，必须和这里用的一致 ----
let bootstrap = null;
if (!skipBootstrap) {
	const iscc = path.join(oss, 'node_modules', 'innosetup', 'bin', 'ISCC.exe');
	assert.ok(fs.existsSync(iscc), `找不到 ISCC：${iscc}`);
	const run = spawnSync(iscc, [`/dReleaseTag=${tag}`, path.join(oss, 'build', 'win32', 'code-web.iss')],
		{ cwd: oss, encoding: 'utf8' });
	const out = `${run.stdout ?? ''}${run.stderr ?? ''}`;
	assert.ok(run.status === 0, `引导器编译失败（退出码 ${run.status}）：\n${out.slice(-800)}`);
	const built = path.join(oss, 'build', 'win32', 'web-out', 'OlympiaSetup-web.exe');
	assert.ok(fs.existsSync(built), `ISCC 说编译过了，但产物不在 ${built}`);
	fs.copyFileSync(built, path.join(outDir, 'OlympiaSetup-web.exe'));
	bootstrap = fs.statSync(path.join(outDir, 'OlympiaSetup-web.exe')).size;
	step(`引导器 ${bootstrap} B，ReleaseTag=${tag}`);
}

// ---- 3.5 随包说明：数字全部来自上面量出来的东西 ----
// 要上传的附件 = 分卷那一组 + 校验清单 +（编出来的话）引导器，两处说同一件事就一个来源。
const attachments = files.length + 1 + (bootstrap ? 1 : 0);
const lines = [
	`Olympia IDE ${tag} — 发布文件包说明`,
	'==================================',
	'',
	`这个目录里除本说明外的 ${attachments} 个文件就是这一版要上传到 Gitee 发行版的全部附件。`,
	`标签必须是 ${tag}：引导器把它编译进了二进制，换标签要重跑 build/make-release.mjs。`,
	'',
	'文件与字节数',
	'------------',
];
for (const f of files) {
	lines.push(`  ${f.name.padEnd(22)} ${f.bytes.toLocaleString('en-US').padStart(13)}${f.name === setupExe ? '   ← 离线时双击它' : ''}`);
}
lines.push(`  ${'SHA256SUMS.txt'.padEnd(22)} ${fs.statSync(path.join(outDir, 'SHA256SUMS.txt')).size.toLocaleString('en-US').padStart(13)}   ← 引导器靠它认文件，一个都不能少`);
if (bootstrap) {
	lines.push(`  ${'OlympiaSetup-web.exe'.padEnd(22)} ${bootstrap.toLocaleString('en-US').padStart(13)}   ← 官网按钮指向这个，只有它会下载`);
}
lines.push('',
	'怎么装',
	'------',
	bootstrap ? '联网机器：只下 OlympiaSetup-web.exe，双击。它先取同标签的 SHA256SUMS.txt，'
		+ '逐个下载并校验分卷（Gitee 失败自动换 GitHub，可续传），再进中文安装向导。' : '',
	`断网机房：把 ${setupExe} 和各 .bin 放进同一个目录，双击 ${setupExe}。缺任何一片，`
	+ '向导会说「安装程序需要下一张磁盘」。',
	'文件名一个都不能改：Inno 按原始名找下一片，引导器按清单里的名字下载。',
	'',
	'装完位置 %LOCALAPPDATA%\\Programs\\Olympia IDE，不需要管理员权限，不改系统 PATH。',
	'Windows 可能弹「已保护你的电脑」（没有代码签名），点「更多信息」→「仍要运行」。',
	'',
	'本目录由 build/make-release.mjs 生成，数字来自这次编译出来的文件本身。',
	'');
fs.writeFileSync(path.join(outDir, '说明.txt'), lines.join('\r\n'), 'utf8');
step('说明.txt 按本次产物重写');

// ---- 4. 官网数字跟着产物走 ----
let html = fs.readFileSync(indexHtmlPath, 'utf8');
function replaceOnce(label, pattern, make) {
	// 数出现次数要开 g：不带 g 的 String.match 返回的是 [整段, 各捕获组]，
	// 三组就是长度 4 —— 拿它当"匹配到几处"会一直误判（第一次跑就在这条上炸的）。
	const counter = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
	const hits = [...html.matchAll(counter)];
	assert.ok(hits.length === 1, `官网里「${label}」匹配到 ${hits.length} 处，脚本不敢猜：${pattern}`);
	html = html.replace(pattern, make);
}

// 表格里只列手动下载分卷要用的那组：引导器是下载器，离线带它没用。
const INDENT = '\t'.repeat(6);
const CLOSING = '\t'.repeat(5);   // 和 <tbody> 开标签同一层，比行少一级
const rows = files.map(f => `${INDENT}<tr><td><code>${f.name}</code></td><td>${(f.bytes / MB).toFixed(1)} MB</td>`
	+ `<td><button class="copy" data-copy="${f.name}">复制文件名</button></td></tr>`).join('\n');
replaceOnce('分卷表格', /(<table class="files">\s*<thead>[\s\S]*?<\/thead>\s*<tbody>)([\s\S]*?)(<\/tbody>)/,
	(_m, head, _old, tail) => `${head}\n${rows}\n${CLOSING}${tail}`);
replaceOnce('总字节', /全部文件共 [\d,]+ 字节/, `全部文件共 ${total.toLocaleString('en-US')} 字节`);
replaceOnce('完整版体积', /<p class="edition-size">[\d.]+ MiB<\/p>/, `<p class="edition-size">${(total / MIB).toFixed(0)} MiB</p>`);
replaceOnce('首屏那一行', /完整包 \d+ MiB/, `完整包 ${(total / MIB).toFixed(0)} MiB`);
if (bootstrap) {
	replaceOnce('引导器（首屏）', /\d+\.\d MB 引导器/, `${(bootstrap / MB).toFixed(1)} MB 引导器`);
	replaceOnce('引导器（下载卡）', /\d+\.\d MB，自动下载全部分卷/, `${(bootstrap / MB).toFixed(1)} MB，自动下载全部分卷`);
}
fs.writeFileSync(indexHtmlPath, html, 'utf8');
step('website/index.html 的体积、总字节、引导器大小已按本次产物改写');

// ---- 4b. DEPLOY.md 里那些抄来的字节数：同一批产物，别让第二个地方靠手抄 ----
// 这一版之前漂了三次：check-website 每次都得把它逮出来，然后人手改四个地方。
const deployPath = path.join(repoRoot, 'website', 'DEPLOY.md');
if (fs.existsSync(deployPath)) {
	// 分卷的 mtime 就是这一批编译完成的时刻；toLocaleString('sv-SE') 给的是本地时区的
	// 「YYYY-MM-DD HH:mm」——用 toISOString 会写成 UTC，和文档里其它时间差八小时。
	const stamp = new Date(Math.max(...files.map(f => f.mtime))).toLocaleString('sv-SE').slice(0, 16);
	let doc = fs.readFileSync(deployPath, 'utf8');
	const docTotal = total.toLocaleString('en-US');
	const rewrote = [];
	// 每一处声明要改写的地方都必须真的命中。以前命不中就悄悄跳过，于是 2026-10-17 那次
	// 「总计」那句早就换了写法、脚本一句没改，check-website 又在发版前一把逮住——
	// 这条脚本存在的意义就是不再靠人手抄，跳过等于回到手抄。
	const missed = [];
	const swap = (label, re, to) => {
		if (!re.test(doc)) { missed.push(label); return; }
		doc = doc.replace(re, to);
		rewrote.push(label);
	};
	swap('开头的实测总量', /安装器实测 [\d,]+ B（[\d.]+ MiB，[^）]* 编译）/, `安装器实测 ${docTotal} B（${(total / MIB).toFixed(1)} MiB，${stamp} 编译）`);
	// 分卷表前面那段话：出分卷时刻、产品版本、总字节、文件数、最大一片、分卷编号全是脚本
	// 已知的事实。原文里还写过「跑了 9.4 分钟」和「13:49 收发布目录」——前者只有 gulp 知道，
	// 留着它就等于留一个必然过期又没人核对的数字，所以整段按已知事实重生成。
	swap('分卷表那一段', /最近一次：[\s\S]*?连续成套：/,
		`最近一次：${stamp} 出分卷（\`vscode-win32-x64-user-setup\`），${new Date().toLocaleString('sv-SE').slice(0, 16)} 收发布目录，发行标签 ${tag}。\n`
		+ `产品版本 ${productVersion}。安装器本体（\`OlympiaSetup.exe\` + 各分卷）总计 ${docTotal} B，共 ${files.length} 个文件，\n`
		+ `最大一片 ${maxBytes.toLocaleString('en-US')} B（十进制口径也在 100 MB 以内），分卷编号 1–${files.length - 1} 连续成套：`);
	for (const f of files) {
		// 行形状是「| `文件名` | 12,345」；这里不用模板字符串，反引号嵌在里面会把字面量截断。
		const rowRe = new RegExp('(\\| ' + '`' + f.name.replace(/\./g, '\\.') + '` \\| )[\\d,]+');
		swap(`分卷表 ${f.name}`, rowRe, `$1${f.bytes.toLocaleString('en-US')}`);
	}
	if (bootstrap) {
		// 引导器的体积现在是正文里的一句「（1,807,471 B，官网按钮指向的引导器）」，不是表格行。
		// 反引号在模板字符串里要转义，所以这条用拼接。
		swap('引导器行', /(`OlympiaSetup-web\.exe`（)[\d,]+( B)/, '$1' + bootstrap.toLocaleString('en-US') + '$2');
		// 同一句后面还写着「本次 ReleaseTag=v1.0.0」。那是这一版引导器里编译进去的标签，
		// 脚本刚把它编出来，没有理由让文档抄第二次——抄第二次就会在换标签时留在原地。
		swap('引导器里的标签', /(本次 ReleaseTag=)v[\d][\w.]*/, '$1' + tag);
	}
	assert.deepEqual(missed, [], `DEPLOY.md 里有 ${missed.length} 处声明要改写的位置没命中（${missed.join('、')}）：文档写法变了，脚本的正则得跟着改，跳过等于让人手抄`);
	fs.writeFileSync(deployPath, doc, 'utf8');
	step(`website/DEPLOY.md 的 ${rewrote.length} 处字节数已按本次产物改写（${rewrote.join('、')}）`);
}

// ---- 5. 人要做的那两步 ----
console.log(`
下一步（这两步只有你能做，顺序不能反）：
  1) Gitee → yuanddMSK/olympia-ide → 新建发行版，标签必须是 ${tag}，把 ${outDir} 里的
     ${attachments} 个文件全部作为附件上传（含 SHA256SUMS.txt，文件名不能改）。
  2) 传完先自查线上链接是不是真的在：
       node scripts/oneoff/check-website.mjs --online
     绿了再部署官网：
       cd website && npx wrangler pages deploy . --project-name olympia-ide --branch main
引导器把 ${tag} 编译进了二进制，所以换标签就得重跑本脚本，否则它去旧标签找文件。`);
