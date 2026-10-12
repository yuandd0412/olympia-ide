/* Compiles and runs P1001 using ONLY the toolchain found inside a built product directory.
 *
 * This is the end-to-end check that matters: it proves the packaging step copied a *working*
 * compiler into the product, not merely that files exist at the right paths.
 *
 *   node verify-product-toolchain.mjs <productDir>
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

const gpp = path.join(root, 'bin', 'g++.exe');
const binDir = path.join(root, 'bin');

// report what the packaging step may have dropped
for (const dll of ['zlib1.dll', 'libzstd.dll', 'libintl-8.dll', 'libwinpthread-1.dll', 'libstdc++-6.dll']) {
	if (!fs.existsSync(path.join(binDir, dll))) {
		console.log(`  缺失依赖: ${dll}`);
	}
}

const version = spawnSync(gpp, ['--version'], {
	encoding: 'utf8',
	env: { ...process.env, PATH: `${binDir};${process.env.PATH}` },
});
const first = (version.stdout || version.stderr || '').split(/\r?\n/)[0];
console.log(`版本: ${first.trim()}`);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia-prod-'));
const src = path.join(dir, 'main.cpp');
/**
 * The probe has to look like what a student actually writes. `#include <cstdio>` never pulls
 * libstdc++'s `gthr.h`, so the previous version of this check passed on a toolchain whose
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

// the switch set the product ships for Luogu
const args = ['-std=c++23', '-fPIC', '-DONLINE_JUDGE', '-Wall', '-fno-asm', '-lm',
	'-o', path.join(dir, 'main.exe'), src];

const build = spawnSync(gpp, args, {
	cwd: dir,
	encoding: 'utf8',
	env: { ...process.env, PATH: `${binDir};${process.env.PATH}` },
});
console.log(`编译退出码: ${build.status}`);
if (build.status !== 0) {
	console.log((build.stderr || build.stdout || '').split('\n').slice(0, 8).join('\n'));
	process.exit(1);
}

const run = spawnSync(path.join(dir, 'main.exe'), [], { input: '20 30\n', encoding: 'utf8' });
const output = (run.stdout || '').trim();
console.log(`运行输出: ${JSON.stringify(output)}`);
if (output !== '50') {
	console.log('FAIL: 期望 50');
	process.exit(1);
}
console.log('\n产物内置工具链可用。');