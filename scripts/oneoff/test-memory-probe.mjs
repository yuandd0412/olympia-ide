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
	// 内存是过一会儿才吃的：采样必须是「查完一次再约下一次」，中间任何一次读不到都得继续
	late: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  this_thread::sleep_for(chrono::milliseconds(400));\n  const size_t n = 120ull * 1024 * 1024;\n  char* p = (char*)malloc(n);\n  for (size_t i = 0; i < n; i += 4096) { p[i] = 1; }\n  this_thread::sleep_for(chrono::milliseconds(1500));\n  cout << (n / 1024 / 1024) << endl;\n  return 0;\n}\n',
	// shell 出去调别的程序：我们杀掉父进程之后 cmd.exe 还攥着 stdout，close 不会来
	holder: '#include <bits/stdc++.h>\nusing namespace std;\nint main(){system("ping -n 6 127.0.0.1 > nul");cout<<"back"<<endl;return 0;}\n',
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
const { runSampled, formatMb, parseMemoryKb, sampleOnce } = requireProbe('./memoryProbe.js');

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

await check('查不到也要回调一次：不回调的话采样链就停在那次，MLE 从此测不到', async () => {
	// 一个不存在的 PID：tasklist 返回「没有正在运行的任务」，解析出来是 undefined
	let calls = 0;
	let seen = 'no callback';
	let patience;
	await new Promise(resolve => {
		// 超时只是「别再等了」，断言留到外面写：在定时器里抛异常会把整个检查台炸掉
		patience = setTimeout(resolve, 1500);
		sampleOnce(0x7FFFFFE0, bytes => { calls++; seen = bytes; clearTimeout(patience); resolve(); });
	});
	clearTimeout(patience);
	assert.strictEqual(calls, 1, `回调了 ${calls} 次，应该是恰好一次——读不到也必须回调，不然采样链停在这一次`);
	assert.strictEqual(seen, undefined, '读不到内存时必须报 undefined，而不是报 0');
});

await check('内存是过一会儿才吃的，采样也要跟得到（链不能断）', async () => {
	const ran = await runSampled(exes.late, [], workDir, '', 15000);
	assert.ok(!ran.failed, `晚分配的程序被判失败：${ran.stderr}`);
	assert.ok(ran.peakBytes > 100 * MB,
		`400 ms 后才分配 120 MB，峰值只报 ${ran.peakBytes === undefined ? '（没测到）' : formatMb(ran.peakBytes)}——中间某次读不到就把后面的采样全跳了`);
});

await check('被测程序留下攥着 stdout 的孙子进程时，超时也要收尾', async () => {
	const started = Date.now();
	const ran = await runSampled(exes.holder, [], workDir, '', 400);
	const waited = Date.now() - started;
	assert.ok(ran.timedOut, `400 ms 预算下应该算超时，实际 stdout=${ran.stdout}`);
	assert.ok(waited < 8000, `kill 之后 close 没来，探针一直挂着（等了 ${waited} ms）`);
});

// holder 那条留下的孙子进程还可能攥着这个目录一会儿：清不掉就留着，别把断言结果盖掉
try {
	rmSync(workDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
} catch {
	console.log(`note  临时目录没删掉（还有进程占着）：${workDir}`);
}
console.log(failed ? `\n${failed} 处内存采样不符合预期` : '\nmemory probe checks passed');
process.exitCode = failed ? 1 : 0;
