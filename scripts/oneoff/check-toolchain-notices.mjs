/*---------------------------------------------------------------------------------------------
 * 随包 MinGW 工具链的第三方声明对账：打出来的工具链里真的有每一个运行库 DLL，
 * oss/ThirdPartyNotices.txt 里就必须有它自己的一条声明。
 *
 * 为什么要有这道门：工具链是脚本从 MSYS2 的包拼出来的，谁也不会记得 cc1plus 今年又
 * import 了一个 DLL。2026-10 那次审计就是这么漏的——gmp / isl / mpc / mpfr / iconv
 * 五个运行库没进包，机器上没有第二套 MinGW 时每一次编译都静默失败。同一次漏法在法务上
 * 也要钱：LGPL 的组件少写一条声明，就是随包分发的合规缺陷，不是「文档没写全」。
 * 所以这里不写死名单，期望值一律从产物目录数出来：下次多一个 DLL，这道门自己就红了。
 *
 * 取样塌了必须是红的，绝不打印「0 个问题」——AGENTS.md 记着本项目被这种假绿骗过两次。
 *
 *   node scripts/oneoff/check-toolchain-notices.mjs [产品目录]
 *   node scripts/oneoff/check-toolchain-notices.mjs --toolchain=<dir> --notices=<file>
 *   （两个开关是给负测用的：删掉一条声明、或指着一个少 DLL 的目录，看它红不红，
 *     不用动真产物。）
 *--------------------------------------------------------------------------------------------*/

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

function flag(name) {
	const hit = process.argv.find(a => a.startsWith(`--${name}=`));
	return hit ? path.resolve(repoRoot, hit.slice(name.length + 3)) : '';
}

// check-all 给读产物的门传的是产品目录（VSCode-win32-x64），跟着这条约定走。
const productDir = process.argv.slice(2).find(a => !a.startsWith('--'));
const toolchain = flag('toolchain')
	|| path.join(productDir || path.join(repoRoot, 'VSCode-win32-x64'), 'resources/app/toolchain/mingw64');
const noticesFile = flag('notices') || path.join(repoRoot, 'oss/ThirdPartyNotices.txt');

// 产物没打出来时给的是「跑不了」，不是「没问题」：这道门读的就是打出来的包。
assert.ok(fs.existsSync(toolchain),
	`工具链产物目录不在：${toolchain} —— 先跑 build/oss-package.ps1（其中的工具链一步）。`
	+ '这道门没有产物就没有结论，绝不返回「0 个问题」。');
assert.ok(fs.existsSync(noticesFile), `第三方声明文件不在：${noticesFile}`);

/**
 * 会在装载时被拉起来的目录：顶层 bin（编译器与运行库DLL）、目标三元组的 bin
 * （as/ld 的另一份）、以及每个 gcc 版本目录（cc1plus、liblto_plugin 住在这里）。
 */
function scanDirs() {
	const dirs = [];
	for (const rel of ['bin', 'x86_64-w64-mingw32/bin']) {
		const abs = path.join(toolchain, rel.replace(/\//g, path.sep));
		if (fs.existsSync(abs)) { dirs.push(abs); }
	}
	const gccRoot = path.join(toolchain, 'lib', 'gcc', 'x86_64-w64-mingw32');
	if (fs.existsSync(gccRoot)) {
		for (const v of fs.readdirSync(gccRoot)) {
			const abs = path.join(gccRoot, v);
			if (fs.statSync(abs).isDirectory()) { dirs.push(abs); }
		}
	}
	return dirs;
}

const dirs = scanDirs();
assert.ok(dirs.length >= 2,
	`只扫到 ${dirs.length} 个目录（要的是 bin 加每个 gcc 版本目录）：工具链换了布局，这道门得跟着改，不能装作没有 DLL`);

const dlls = new Set();
const exes = new Set();
for (const dir of dirs) {
	for (const f of fs.readdirSync(dir)) {
		if (/\.dll$/i.test(f)) { dlls.add(f.toLowerCase()); }
		else if (/\.exe$/i.test(f)) { exes.add(f.toLowerCase()); }
	}
}
// 少到这个数就是取样塌了：光 gcc-libs 就带 5 个运行库，binutils 那批 exe 有三十几个。
assert.ok(dlls.size >= 10, `只扫到 ${dlls.size} 个运行库 DLL，取样塌了：检查 ${dirs.join(' | ')} 还在不在`);
assert.ok(exes.size >= 30, `只扫到 ${exes.size} 个 exe，取样塌了：编译驱动（gcc/g++/cc1plus）应该都在这个数里`);
for (const probe of ['cc1plus.exe', 'ld.exe', 'as.exe']) {
	assert.ok(exes.has(probe), `扫不到 ${probe}——就是它 import 了那几个新运行库，扫描路径八成变了`);
}

const notices = fs.readFileSync(noticesFile, 'utf8');
assert.ok(notices.includes('This repository incorporates material'), `${noticesFile} 读到了但不是那份声明文件`);

// 声明文件里一条声明 = 一对分隔线包住的块；分隔线数量再核对一遍，别让半截块冒充条目。
const lines = notices.split(/\r?\n/);
const seps = [];
lines.forEach((l, i) => { if (/^-{20,}$/.test(l)) { seps.push(i); } });
assert.ok(seps.length >= 160 && seps.length % 2 === 0,
	`分隔线读到 ${seps.length} 行（要成对且不少于一百六），取样塌了：检查条目布局还认不认`);
const entries = [];
for (let k = 0; k + 1 < seps.length; k += 2) {
	entries.push(lines.slice(seps[k] + 1, seps[k + 1]).join('\n'));
}
assert.ok(entries.length >= 80, `只切出 ${entries.length} 条声明，取样塌了`);

/** 许可证这条声明要齐四样：包名、正文在哪、上游地址、许可证本身。少一样就不算声明。 */
const NEEDED = [
	[/mingw-w64-x86_64-/, 'MSYS2 包名（mingw-w64-x86_64-*）'],
	[/https?:\/\//, '上游项目地址'],
	[/LGPL|GPL-3|MIT|zlib License|BSD-3/, '许可证'],
	[/share\/licenses|COPYING|LICENSE/, '许可证正文的位置'],
];

/** 条目第一行就是组件名（这份清单的写法如此）：只认这一行，否则别处顺口提到一个 DLL 名字也算声明过了。 */
const named = entries.map(e => ({ heading: (e.split(/\r?\n/).find(l => l.trim()) || ''), body: e }));

const bad = [];
for (const dll of [...dlls].sort()) {
	const hit = named.find(n => n.heading.toLowerCase().includes(dll));
	if (!hit) {
		bad.push(`${dll} —— 随包工具链里有这个运行库 DLL，${path.relative(repoRoot, noticesFile).replace(/\\/g, '/')} 里没有它自己的声明`);
		continue;
	}
	const thin = NEEDED.filter(([re]) => !re.test(hit.body)).map(([, label]) => label);
	if (thin.length) {
		bad.push(`${dll} —— 有条目但不齐，缺：${thin.join('、')}`);
	}
}

// 反向只提醒不判红：声明写了、产物里却没有，说明打包那一步还没落地（或者被裁掉了）。
const declared = new Set(named.flatMap(n => (n.heading.match(/[a-z0-9_.+-]+\.dll/gi) || []).map(s => s.toLowerCase())));
const notShipped = [...declared].filter(d => d.startsWith('lib') || d === 'zlib1.dll').filter(d => !dlls.has(d));

const missing = bad.length;
console.log(`扫了 ${dirs.length} 个目录里的 ${dlls.size} 个运行库 DLL 与 ${exes.size} 个 exe，`
	+ `对着 ${entries.length} 条声明核了 ${dlls.size} 个组件，缺声明 ${missing} 个`);
for (const b of bad) { console.log(`FAIL ${b}`); }
if (notShipped.length) {
	console.log(`注意  声明里写了、这次产物里却没有的 DLL：${notShipped.join('、')}`
		+ '（要么打包那一步还没落地，要么它被裁掉了——两种都得有人看一眼，但门按产物清点，不为此判红）');
}
assert.deepStrictEqual(bad, []);
console.log('\n随包工具链的每一个运行库 DLL 都在第三方声明里有一条自己的名字');
