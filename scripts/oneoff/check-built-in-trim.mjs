// 内置扩展裁剪表检查：表只写在 product.json 一处，但读它的有两个世界，两个都得对上。
//
// 为什么要有这台检查台：这张表决定装进产品的是哪些内置扩展，而它有两个互不可见的消费者——
// 打包流（`oss/build/lib/extensions.ts`，按 `extensions/` 下的**目录名**过滤）和运行时扫描器
// （`oss/src/vs/platform/extensionManagement/common/extensionsScannerService.ts`，按内置扩展目录里
// 的**文件夹名**过滤；dev 模式只有这一处生效）。以前它在两边各抄了一份手写的 51 项，抄漏/抄错无人发现：
// `prompt` 根本不是目录名（真实目录是 `prompt-basics`），于是两边都写着"已裁剪"、
// 产品里却真装了 Prompt 语法扩展，直到 2026-10-14 才被这台检查台抓出来。
//
// 顺带守住三类会静默变红的东西：表里指不到实物的死项、被保留扩展依赖却被裁掉的扩展（激活直接失败）、
// 以及把表重新抄回代码里（那样这个文件就又开始说谎了）。
//
//   node scripts/oneoff/check-built-in-trim.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const ossRoot = path.join(repoRoot, 'oss');
const extensionsRoot = path.join(ossRoot, 'extensions');
const PRODUCT_KEY = 'olympiaExcludedBuiltInExtensions';

let failed = 0;
function report(ok, label) {
	console.log(`${ok ? 'ok   ' : 'FAIL '} ${label}`);
	if (!ok) { failed++; }
}
function note(label) {
	console.log(`注意  ${label}`);
}

function read(file) { return fs.readFileSync(file, 'utf8'); }

if (!fs.existsSync(extensionsRoot)) {
	throw new Error(`读不到 ${extensionsRoot}：这里没有可检查的内置扩展目录，任何"通过"都不成立。`);
}

const product = JSON.parse(read(path.join(ossRoot, 'product.json')));
const trimmed = product[PRODUCT_KEY];
const buildFile = read(path.join(ossRoot, 'build/lib/extensions.ts'));
const scannerFile = read(path.join(ossRoot, 'src/vs/platform/extensionManagement/common/extensionsScannerService.ts'));
const productTs = read(path.join(ossRoot, 'src/vs/base/common/product.ts'));

report(Array.isArray(trimmed) && trimmed.length > 0,
	`product.json 里有非空的 ${PRODUCT_KEY}（读到 ${Array.isArray(trimmed) ? trimmed.length : typeof trimmed} 项）`);
if (!Array.isArray(trimmed)) {
	throw new Error(`${PRODUCT_KEY} 不是数组，后面的检查没有意义。`);
}

const folders = fs.readdirSync(extensionsRoot).filter(dir => fs.existsSync(path.join(extensionsRoot, dir, 'package.json')));
report(folders.length > 40, `扫到 ${folders.length} 个真实内置扩展目录（少于 40 说明读错了根目录）`);

// 死项：既不是本地目录，也不是 product.builtInExtensions 会下载的包 —— 指不到实物就是抄错。
const downloaded = (product.builtInExtensions ?? []).map(ext => ext.name?.split('.').pop()).filter(Boolean);
const dead = trimmed.filter(id => !folders.includes(id) && !downloaded.includes(id));
report(dead.length === 0, `表里每一项都指得到实物${dead.length ? `，死项：${dead.join('、')}` : ''}`);

report(trimmed.every(id => id === id.toLowerCase()), '表里每一项都是小写目录名（扫描器按小写匹配）');
const dupes = trimmed.filter((id, i) => trimmed.indexOf(id) !== i);
report(dupes.length === 0, `表里没有重复项${dupes.length ? `，重复：${dupes.join('、')}` : ''}`);

// 两个消费者都从这一张表读，且都没有再抄一份。
report(buildFile.includes(PRODUCT_KEY), '打包流从 product.json 读这张表');
report(scannerFile.includes(PRODUCT_KEY), '运行时扫描器从 product.json 读这张表');
report(!/const excludedExtensions = \[/.test(buildFile), '打包流里没有残留的手写副本数组');
report(!scannerFile.includes('OLYMPIA_EXCLUDED_EXTENSION_DIRS'), '扫描器里没有残留的手写副本集合');
report(productTs.includes(PRODUCT_KEY), 'IProductService 声明了这个字段（否则 runtime 读不到，改动会被类型系统放过）');

// 打包流里那个"Copilot 是否被裁剪"的判断必须问这张表：本产品的 builtInExtensions 恒为空，
// 按下载清单判断会在表格失效后继续回答"已裁剪"。
const gulpfile = read(path.join(ossRoot, 'build/gulpfile.vscode.ts'));
const copilotTest = (gulpfile.split('function isCopilotExcludedFromProduct')[1] ?? '').split('\n}')[0];
report(copilotTest.includes(PRODUCT_KEY) && !copilotTest.includes('builtInExtensions'),
	`打包流判断 Copilot 时问的是这张表（函数体读到 ${copilotTest.length} 个字符）`);

// 产品承诺：左栏不放源代码管理、不带订阅制助手、不塞浏览器/笔记本/远程端口这些与竞赛无关的面板。
const MUST_TRIM = [
	'copilot',
	'git', 'git-base', 'github', 'github-authentication', 'merge-conflict',
	'microsoft-authentication',
	'simple-browser', 'media-preview', 'docker',
	'ipynb', 'notebook-renderers', 'tunnel-forwarding',
	'npm', 'jake', 'grunt', 'gulp', 'dotenv',
	'emmet', 'typescript-language-features', 'debug-auto-launch', 'debug-server-ready',
	'prompt-basics',
];
const missing = MUST_TRIM.filter(id => !trimmed.includes(id));
report(missing.length === 0, `产品承诺裁剪的 ${MUST_TRIM.length} 项都在表里${missing.length ? `，缺：${missing.join('、')}` : ''}`);
const selfHarm = trimmed.filter(id => id.startsWith('olympia-'));
report(selfHarm.length === 0, `表里没有自家扩展${selfHarm.length ? `，误伤：${selfHarm.join('、')}` : ''}`);

// 被保留的扩展不能依赖被裁掉的扩展：extensionDependencies 缺一会让宿主直接激活失败。
const kept = folders.filter(dir => !trimmed.includes(dir));
const broken = [];
for (const dir of kept) {
	let manifest;
	try { manifest = JSON.parse(read(path.join(extensionsRoot, dir, 'package.json'))); }
	catch { continue; }
	for (const dep of manifest.extensionDependencies ?? []) {
		const name = String(dep).split('.').pop();
		if (trimmed.includes(name)) { broken.push(`${dir} → ${dep}`); }
	}
}
report(broken.length === 0, `保留下来的扩展都不依赖被裁掉的扩展${broken.length ? `，断链：${broken.join('、')}` : ''}`);

// 装机产物是另一条时间线：这里的差异只说明"还没出厂"，不能当成裁剪失效的证据，也不能当成通过。
const installedRoot = path.join(process.env.LOCALAPPDATA ?? '', 'Programs/Olympia IDE/resources/app/extensions');
if (fs.existsSync(installedRoot)) {
	const stillThere = fs.readdirSync(installedRoot).filter(dir => trimmed.includes(dir));
	if (stillThere.length) {
		note(`装机目录里还有 ${stillThere.length} 个已被裁剪的扩展（${stillThere.join('、')}）：源码已改，等下一次 oss-package 出厂`);
	} else {
		note('装机目录里已经没有表中的任何扩展');
	}
} else {
	note(`读不到装机目录，未做出厂核对：${installedRoot}`);
}

console.log(`\n共裁剪 ${trimmed.length} / ${folders.length} 个内置扩展，保留 ${kept.length} 个：${kept.join(' ')}`);
if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\n全部通过');
