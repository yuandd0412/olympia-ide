// One-off harness for the 跑样例 memory probe (老版本的 MLE 靠峰值内存，fork 里新加的那条链)。
//
// The probe spawns the target itself and samples its working set through `tasklist.exe`, so the
// failure modes are all integration ones: the CSV column position (labels are localized), the
// thousands separator, a path that contains spaces, the timeout kill, the non-zero exit code, and
// the fallback when the probe can't read anything. Those cannot be checked by reading the code,
// so this compiles four real programs with the **bundled g++** into a directory whose name contains
// spaces and runs them through the compiled probe module.
//
//   node scripts/oneoff/test-memory-probe.mjs
//
// Requires `npm run gulp -- compile-extension:olympia-onboarding` to have run first.
import Module from 'module';
import assert from 'assert';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GPP = path.join(repoRoot, 'VSCode-win32-x64/resources/app/toolchain/mingw64/bin/g++.exe');
const outDir = new URL('../../oss/extensions/olympia-onboarding/out/', import.meta.url);
try {
	readFileSync(new URL('memoryProbe.js', outDir));
} catch {
	console.error('out/memoryProbe.js 还没编译——先在 oss/ 跑：npm run gulp -- compile-extension:olympia-onboarding');
	process.exit(1);
}
assert.ok(spawnSync(GPP, ['--version'], { encoding: 'utf8' }).status === 0, `内置 g++ 不能用：${GPP}`);

const MB = 1024 * 1024;
// 故意让目录名带空格：安装目录 `Olympia IDE` 也带，转义错了就在这里炸。
const workDir = mkdtempSync(path.join(os.tmpdir(), 'olympia probe space '));

const SOURCES = {
	small: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){int a,b;cin>>a>>b;cout<<a+b<<endl;}\n',
	big: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  const size_t n = 120ull * 1024 * 1024;\n  char* p = (char*)malloc(n);\n  for (size_t i = 0; i < n; i += 4096) { p[i] = 1; }\n  this_thread::sleep_for(chrono::milliseconds(2500));\n  cout << "touched " << (n / 1024 / 1024) << " MB" << endl;\n  return 0;\n}\n',
	sleep: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){this_thread::sleep_for(chrono::seconds(3));cout<<"done"<<endl;}\n',
	fail: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){cout<<"boom"<<endl;return 3;}\n'
};

const exes = {};
for (const [name, source] of Object.entries(SOURCES)) {
	const cpp = path.join(workDir, `${name}.cpp`);
	writeFileSync(cpp, source, 'utf8');
	const exe = path.join(workDir, `${name}.exe`);
	const built = spawnSync(GPP, ['-std=c++17', '-O0', '-o', exe, cpp], { encoding: 'utf8' });
	assert.ok(built.status === 0, `${name}.cpp 编译失败：${built.stderr}`);
	exes[name] = exe;
}

const requireProbe = createRequire(new URL('memoryProbe.js', outDir));
const vscodeStub = new Proxy({}, {
	get: (_target, key) => (key === 'workspace' || key === 'window' || key === 'commands'
		? { getConfiguration: () => ({ get: (_k, fallback) => fallback }), showInformationMessage: async () => undefined, onDidChangeActiveTextEditor: () => ({ dispose() { } }) }
		: undefined)
});
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};
const { runSampled, formatMb, parseMemoryKb } = requireProbe('./memoryProbe.js');

let failed = 0;
async function check(name, fn) {
	try {
		await fn();
		console.log(`ok    ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}: ${error.message}`);
	}
}

await check('内存列按位置解析：千分位、语言、查无此进程都不炸', () => {
	assert.strictEqual(parseMemoryKb('"a.exe","12","Console","0","8 K"'), 8);
	assert.strictEqual(parseMemoryKb('"a.exe","12","Console","0","4,716 K"'), 4716);
	assert.strictEqual(parseMemoryKb('"a.exe","12","Console","0","110,676 K"'), 110676);
	assert.strictEqual(parseMemoryKb('"a.exe","12","控制台","0","1.234 K"'), 1234);
	assert.strictEqual(parseMemoryKb('信息: 没有运行的任务匹配指定标准。'), undefined);
	assert.strictEqual(parseMemoryKb(''), undefined);
});

await check('路径带空格也能跑；快得来不及采样的程序只是没有峰值数字', async () => {
	const ran = await runSampled(exes.small, [], workDir, '3 4\n', 5000);
	assert.strictEqual(ran.stdout.trim(), '7', `stdout=${JSON.stringify(ran.stdout)} stderr=${ran.stderr}`);
	assert.ok(!ran.failed && !ran.timedOut, '正常程序被判失败');
	if (ran.peakBytes !== undefined) {
		assert.ok(ran.peakBytes < 64 * MB, `${formatMb(ran.peakBytes)} 不合理：这么小的程序不该占这么多`);
	}
});

await check('真的分配了 120 MB 的程序，采样能看到（这是 MLE 判定的前提）', async () => {
	const ran = await runSampled(exes.big, [], workDir, '', 15000);
	assert.ok(!ran.failed, `大内存程序被判失败：${ran.stderr}`);
	assert.ok(ran.peakBytes > 100 * MB, `峰值内存报的是 ${ran.peakBytes === undefined ? '（没测到，探针退回了）' : formatMb(ran.peakBytes)}，采样没跟住内存；stderr=${ran.stderr.slice(0, 200)}`);
});

await check('超时会杀掉被测程序并标 timedOut', async () => {
	const started = Date.now();
	const ran = await runSampled(exes.sleep, [], workDir, '', 600);
	assert.ok(ran.timedOut, '睡 3 秒的程序在 600 ms 预算下应该算超时');
	assert.ok(!ran.failed, '超时不该同时算运行失败');
	assert.ok(Date.now() - started < 8000, `超时没收回进程，等了 ${Date.now() - started} ms`);
});

await check('非零退出码算运行失败，stdout 仍然收得到', async () => {
	const ran = await runSampled(exes.fail, [], workDir, '', 5000);
	assert.strictEqual(ran.failed, true, 'exit 3 应该判 RE');
	assert.strictEqual(ran.stdout.trim(), 'boom');
});

await check('探针出问题时退回普通运行，不丢结果', async () => {
	const ran = await runSampled(path.join(workDir, 'no-such-program.exe'), [], workDir, '', 3000);
	assert.strictEqual(ran.failed, true, '不存在的程序必须报失败，而不是悄悄成功');
	assert.strictEqual(ran.peakBytes, undefined, '退回应是不带峰值内存的');
});

rmSync(workDir, { recursive: true, force: true });
console.log(failed ? `\n${failed} 处内存采样不符合预期` : '\nmemory probe checks passed');
process.exitCode = failed ? 1 : 0;
