/* Compiles and runs P1001 using ONLY the toolchain found inside a built product directory.
 *
 * This is the end-to-end check that matters: it proves the packaging step copied a *working*
 * compiler into the product, not merely that files exist at the right paths.
 *
 *   node verify-product-toolchain.mjs <productDir>
 *
 * The child environment is built here, never inherited. This gate used to spawn with
 * `{ ...process.env, PATH: binDir + ';' + process.env.PATH }`, which meant a build machine that
 * happens to have its own MinGW installed let a broken toolchain pass: `cc1plus` loaded
 * `libgmp-10.dll` from that unrelated install and the shipped tree — 41 unloadable executables —
 * reported "可用". A check that borrows the answer from the environment is not a check.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanPES } from './pe-imports.mjs';

const productDir = process.argv[2] || 'D:/oler-ide-v2/VSCode-win32-x64';
const roots = [
	path.join(productDir, 'resources', 'app', 'toolchain', 'mingw64'),
	path.join(productDir, 'toolchain', 'mingw64'),
	path.join(productDir, '.build', 'toolchain', 'mingw64'),
];

const root = roots.find(r => fs.existsSync(path.join(r, 'bin', 'g++.exe')));
if (!root) {
	console.log('FAIL: product does not contain a toolchain at any expected path');
	for (const r of roots) { console.log(`  tried: ${r}`); }
	process.exit(1);
}
console.log(`工具链位置: ${root}`);

const sys = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32');
const binDir = path.join(root, 'bin');
/** 子进程环境：System32 加上工具链自己的 bin，别的什么都不给。 */
const env = { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR, TEMP: process.env.TEMP, TMP: process.env.TMP, PATH: `${binDir};${sys}` };
const bare = { ...env, PATH: sys };

const fail = [];

// 导入表逐个镜像核一遍。Windows 只在映像自己所在目录和 PATH 里找 DLL，兄弟目录不算，
// 所以这条查的是"三个宿主目录各自齐不齐"，不是"bin 里齐不齐"。
const images = scanPES(root);
if (images.length < 30) {
	fail.push(`只扫到 ${images.length} 个 PE，取样塌了：检查 scanPES 还认不认现在的目录布局`);
}
for (const image of images) {
	for (const name of image.missing) {
		fail.push(`${path.relative(root, image.file)} 的导入 ${name} 在它自己那个目录里找不到`);
	}
}
console.log(`导入表: ${images.length} 个 PE，未满足 ${images.filter(i => i.missing.length).length} 个`);

// 能不能真加载：导入表是静态证据，起进程是动态证据，两个都要。
const exes = [];
const walk = dir => {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entry.name);
		if (entry.isDirectory()) { walk(p); } else if (/\.exe$/i.test(entry.name)) { exes.push(p); }
	}
};
walk(root);
let unloadable = 0;
for (const exe of exes) {
	const r = spawnSync(exe, ['--version'], { cwd: path.dirname(exe), encoding: 'utf8', env: bare, timeout: 15000 });
	const code = (r.status ?? 0) >>> 0;
	// 只给 System32：这就是学生机器的处境，借不到任何别的 MinGW
	if (code >= 0xC0000000 && code <= 0xC00002FF) {
		unloadable++;
		fail.push(`${path.relative(root, exe)} 在裸 PATH 下起不来（0x${code.toString(16)}）`);
	}
}
console.log(`裸 PATH 加载: ${exes.length} 个 exe，${unloadable} 个起不来`);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia-prod-'));
const src = path.join(dir, 'main.cpp');
/**
 * The probe has to look like what a student actually writes. `#include <cstdio>` never pulls
 * libstdc++'s `gthr.h`, so an earlier version of this check passed on a toolchain whose
 * `pthread.h` was missing — every real `<iostream>` / `<bits/stdc++.h>` program still failed.
 */
fs.writeFileSync(src, [
	'#include <bits/stdc++.h>',
	'using namespace std;',
	'int main() {',
	'  int a, b;',
	'  if (!(cin >> a >> b)) { return 1; }',
	'  vector<int> v{ a, b };',
	'  cout << accumulate(v.begin(), v.end(), 0) << endl;',
	'  return 0;',
	'}',
	'',
].join('\n'));

// 出厂的两套标准：c++23 是洛谷档，c++14 是 NOI Linux 档。开关集按洛谷那份。
const flags = ['-fPIC', '-DONLINE_JUDGE', '-Wall', '-fno-asm', '-lm'];
const gpp = path.join(binDir, 'g++.exe');
for (const std of ['c++23', 'c++14']) {
	const exe = path.join(dir, `main-${std}.exe`);
	const build = spawnSync(gpp, [`-std=${std}`, ...flags, '-o', exe, src], { cwd: dir, encoding: 'utf8', env });
	if (build.status !== 0) {
		const detail = (build.stderr || build.stdout || '').trim();
		fail.push(`-std=${std} 编译失败（退出码 ${build.status}）：${detail.split('\n')[0] || '编译器零输出，可能是它自身起不来'}`);
		continue;
	}
	const run = spawnSync(exe, [], { cwd: dir, input: '20 30\n', encoding: 'utf8', env });
	const output = (run.stdout || '').trim();
	console.log(`  -std=${std}: 输入 20 30 -> ${JSON.stringify(output)}`);
	if (run.status !== 0 || output !== '50') {
		fail.push(`-std=${std} 的产物没跑对（退出码 ${run.status}，输出 ${JSON.stringify(output)}）`);
	}
}

// 元数据与二进制同源：编译器自报版本要等于装配时记下的那个。
const provenancePath = path.join(root, '.olympia-toolchain.json');
if (!fs.existsSync(provenancePath)) {
	fail.push('缺 .olympia-toolchain.json：这份工具链是谁、哪个版本装的没有记录');
} else {
	const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
	const selfReported = (spawnSync(gpp, ['--version'], { encoding: 'utf8', env }).stdout || '').split('\n')[0].trim();
	console.log(`版本: ${selfReported}（自报） / ${provenance.compilerVersion}（装配时记录）`);
	if (provenance.compilerVersion !== selfReported) {
		fail.push(`元数据与二进制不同源：记录写的是 ${provenance.compilerVersion}`);
	}
}

for (const problem of fail) { console.log(`FAIL ${problem}`); }
if (fail.length) { process.exit(1); }
console.log('\n产物内置工具链可用。');
