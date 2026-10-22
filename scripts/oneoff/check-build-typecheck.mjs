// build/ 目录不在 compile-client 的覆盖范围里，所以里面坏掉的类型要等到打包才炸——
// 2026-10-15 那次就是：许可证存在性检查读了后面才声明的 const root，第 3 阶段跑在
// clean-vscode-win32-x64 之后，8 分钟的 bundle 白做，还留下一个被清空的产物目录。
// 这条检查实测 1.1 秒，接在 build/oss-package.ps1 最前面当预检。
// 运行：node scripts/oneoff/check-build-typecheck.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const oss = path.join(repoRoot, 'oss');
// .bin/tsc 是个 sh 壳，Windows 上直接 spawn 不到；指向它真正 exec 的那个入口。
const tsc = path.join(oss, 'node_modules', '@typescript', 'native', 'bin', 'tsc');

/** 上游自带的类型错误条数。只许降不许升：升了说明是我们往 build/ 里塞的新毛病。 */
const UPSTREAM_CEILING = 17;
/** 2448 = 块级变量在声明前使用，2454 = 在赋值前使用。今晚崩打包的那一条就是 2448。 */
const USE_BEFORE_DECLARE = ['2448', '2454'];
/** 我们自己也改的 build 文件。它们必须真的在检查范围内，否则下面的断言全是空的。 */
const OURS = ['build/gulpfile.vscode.ts', 'build/filters.ts', 'build/lib/extensions.ts'];

let failed = 0;
function report(ok, msg) {
	if (ok) { console.log(`ok    ${msg}`); }
	else { failed++; console.log(`FAIL  ${msg}`); }
}

const norm = p => p.replace(/\\/g, '/').toLowerCase();

// build/ 的类型检查依赖一个**生成文件**：build/lib/policies/policyDto.ts 由
// build/lib/policies/copyPolicyDto.ts 生成（build/package.json 的 pretypecheck 跑的就是它）。
// 干净 checkout 下这个文件不存在，typecheck 会凭空多出 16 条 TS2307 —— 那是生成步骤
// 没跑，不是代码坏了。基线数字要可比，预检就必须先跑生成，不然每次 clean 后都误判。
const gen = spawnSync(process.execPath,
	[path.join(oss, 'build', 'lib', 'policies', 'copyPolicyDto.ts')],
	{ cwd: oss, encoding: 'utf8' });
if (gen.status !== 0) {
	console.error(`policyDto.ts 生成失败（退出码 ${gen.status}）：\n${gen.error ?? gen.stderr}`);
	process.exit(1);
}

const run = spawnSync(process.execPath,
	[tsc, '--project', 'build/tsconfig.json', '--noEmit', '--skipLibCheck', '--listFiles'],
	{ cwd: oss, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// tsc 的退出码只有 0（干净）和 1（有类型错误）算"跑完了"。其余（配置读不到、
// 自己崩了）如果当成通过，这条检查就成了绿色的空壳。
if (run.status !== 0 && run.status !== 1) {
	console.error(`tsc 没能跑起来（退出码 ${run.status}）：\n${run.error ?? run.stderr}`);
	process.exit(1);
}

const out = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
const errors = [...out.matchAll(/^(.+?)\((\d+),(\d+)\): error TS(\d+): (.*)$/gm)]
	.map(m => ({ file: norm(m[1]), code: m[4], line: m[2], message: m[5] }));
report(errors.length > 0 || run.status === 0,
	`解析出 ${errors.length} 条类型错误（tsc 退出码 ${run.status}）`);

const listed = new Set(out.split('\n').map(line => norm(line.trim())));
for (const rel of OURS) {
	report(listed.has(`${norm(oss)}/${norm(rel)}`), `${rel} 在类型检查的扫面范围内`);
}

const offenders = errors.filter(e => USE_BEFORE_DECLARE.includes(e.code));
report(offenders.length === 0,
	offenders.length === 0
		? `没有「声明前使用」一类的错误（${USE_BEFORE_DECLARE.join('/')}）`
		: `声明前就读了变量：${offenders.map(e => `TS${e.code} ${path.basename(e.file)}:${e.line} —— ${e.message}`).join('；')}`);

report(errors.length <= UPSTREAM_CEILING,
	`build/ 的类型错误 ${errors.length} 条，不超过记录的 ${UPSTREAM_CEILING} 条（只降不升）`);

const byFile = new Map();
for (const e of errors) { byFile.set(e.file, (byFile.get(e.file) ?? 0) + 1); }
const heaviest = [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 5)
	.map(([file, n]) => `${n} ${file.replace(`${norm(oss)}/`, '')}`);
console.log(`剩下的集中在：${heaviest.join(' | ')}`);

console.log(failed ? '\nFAILED' : '\nall build typecheck gates passed');
process.exitCode = failed ? 1 : 0;
