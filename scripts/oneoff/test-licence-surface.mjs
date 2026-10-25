// check-licence-surface.mjs 的负测台：把每条规则故意弄坏一次，确认只有该红的那条红。
//
// 为什么要单独一个台子：许可证面全是「看起来有、其实没有」的坑——glob 匹配不到东西被 allowEmpty 咽掉、
// 宏定义了却没被引用、清单里写了一个不存在的目录名。这种检查本身也很容易写成永远绿的空话
//（正则没命中就当通过），所以每条断言都要真的破坏一次才知道它在做什么。
// 每个用例：备份字节 → 改坏 → 跑闸门 → 还原 → 逐字节比对，还原不一致立刻停。
//
//   node scripts/oneoff/test-licence-surface.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const ISS = path.join(repo, 'oss/build/win32/code.iss');
const NOTICE = path.join(repo, 'oss/NOTICE.olympia.txt');
const PRODUCT = path.join(repo, 'oss/product.json');
const GATE = path.join(here, 'check-licence-surface.mjs');

const CASES = [
	{ name: 'Setup 行改成写死的文件名', file: ISS, from: 'LicenseFile={#RepoDir}\\{#RootLicenseFileName}', to: 'LicenseFile={#RepoDir}\\NOTICE.olympia.txt', expect: ['那一行引用 RootLicenseFileName'] },
	{ name: 'Setup 行整行注释掉', file: ISS, from: 'LicenseFile={#RepoDir}\\{#RootLicenseFileName}', to: '; LicenseFile={#RepoDir}\\{#RootLicenseFileName}', expect: ['恰好一行 LicenseFile', '注释掉的 LicenseFile'] },
	{ name: '许可页指回上游 LICENSE.txt', file: ISS, from: "FileExists(RepoDir + '\\' + OlympiaNoticeFileName) ? OlympiaNoticeFileName", to: "FileExists(RepoDir + '\\nope.txt') ? 'nope.txt'", expect: ['优先选中文清单'] },
	// 这里的原文必须逐字对得上 NOTICE.olympia.txt 里那两行目录清单。
	// 之前写的是 'libwinpthread  winpthreads  zlib  zstd'，而文件里实际是
	// 'libwinpthread  mpc  mpfr  winpthreads  zlib  zstd'（中间还有 mpc、mpfr）
	// → 破坏压根没落到文件里，这条用例天天报「找不到要改的原文」，却从没证明过什么。
	{ name: '清单少列一个工具链目录', file: NOTICE, from: 'libwinpthread  mpc  mpfr  winpthreads  zlib  zstd', to: 'libwinpthread  mpc  mpfr  zlib  zstd', expect: ['NOTICE 列的目录与实际发出的'] },
	{ name: '清单多列一个不存在的目录', file: NOTICE, from: 'binutils  crt  gcc-libs', to: 'binutils  crt  gcc  gcc-libs', expect: ['NOTICE 列的目录与实际发出的'] },
	{ name: 'MIT 扩展数写错', file: NOTICE, from: '其余 39 个是 MIT', to: '其余 38 个是 MIT', expect: ['MIT 扩展数'] },
	{ name: '不写 GPL-3.0-or-later', file: NOTICE, from: 'GPL-3.0-or-later', to: 'GPLv3', expect: ['每一种许可证', '第一节按 product.json'] },
	{ name: 'product.json 换成另一种许可证', file: PRODUCT, from: '"licenseName": "GPL-3.0-or-later"', to: '"licenseName": "Apache-2.0"', expect: ['第一节按 product.json', '官网页脚'] },
	{ name: '不带 BOM', file: NOTICE, bomOnly: true, expect: ['UTF-8 BOM'] },
	{ name: 'licenseFileName 指回不存在的 LICENSE', file: PRODUCT, from: '"licenseFileName": "LICENSE.txt"', to: '"licenseFileName": "LICENSE"', expect: ['licenseFileName'] }
];

function run() {
	try {
		execFileSync(process.execPath, [GATE], { encoding: 'utf8', cwd: repo });
		return [];
	} catch (e) {
		const out = (e.stdout ?? '') + (e.stderr ?? '');
		return out.split(/\r?\n/).filter(l => l.startsWith('FAIL')).map(l => l.replace(/^FAIL\s+/, '').replace(/（[^）]*）/g, '').trim());
	}
}

const baseline = run();
console.log(`基线：${baseline.length ? '红的=' + baseline.join(' || ') : '全绿'}`);
if (baseline.length) { console.log('基线不干净，先修闸门本身'); process.exit(1); }

let bad = 0;
for (const c of CASES) {
	const before = fs.readFileSync(c.file);
	let mutated;
	if (c.bomOnly) {
		mutated = before.length > 3 && before[0] === 0xEF && before[1] === 0xBB && before[2] === 0xBF ? before.subarray(3) : null;
		if (!mutated) { console.log(`FAIL ${c.name}：文件当前没有 BOM，构造不出这个破坏`); bad++; continue; }
	} else {
		const text = before.toString('utf8');
		if (!text.includes(c.from)) { console.log(`FAIL ${c.name}：找不到要改的原文，这个破坏根本没落到文件里`); bad++; continue; }
		mutated = Buffer.from(text.split(c.from).join(c.to), 'utf8');
	}
	fs.writeFileSync(c.file, mutated);
	const reds = run();
	fs.writeFileSync(c.file, before);
	if (!fs.readFileSync(c.file).equals(before)) { console.log(`FAIL ${c.name}：还原后字节不一致，立刻人工检查 ${c.file}`); process.exit(1); }
	const missing = c.expect.filter(want => !reds.some(r => r.includes(want)));
	const extra = reds.filter(r => !c.expect.some(want => r.includes(want)));
	if (missing.length || extra.length) {
		bad++;
		console.log(`FAIL ${c.name}：该红没红=[${missing.join(', ')}] 顺带红了=[${extra.join(', ')}]`);
	} else {
		console.log(`ok   ${c.name} → 只红了：${reds.join(' || ')}`);
	}
}
console.log(bad ? `\n${bad} 个用例有问题` : '\n每条规则都被真的弄坏过一次');
process.exit(bad ? 1 : 0);
