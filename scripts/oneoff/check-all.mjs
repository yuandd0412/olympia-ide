// 一条命令跑完所有产品体检门。
// 用法：node scripts/oneoff/check-all.mjs [--with-build]   （后者要 dist/ 里有本次产物）
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

/**
 * 登记表：每条门写清楚它保证什么、要不要额外条件。
 * needsBuild 的门读的是发布产物，没出包时跑它只会得到假绿——所以默认跳过，
 * 而且要打印跳过原因，不许塌进「没问题」。
 */
const GATES = [
	{ file: 'scripts/oneoff/check-website.mjs', 保证: '官网链接、数字、承诺与代码一致' },
	{ file: 'scripts/oneoff/check-no-copilot-claim.mjs', 保证: '已核实可达的用户可见文案里没有 Copilot' },
	{ file: 'scripts/oneoff/check-byok-settings.mjs', 保证: '设置页里提到 Copilot 的条目要么挡掉要么有理由' },
	{ file: 'scripts/oneoff/check-version-mirrors.mjs', 保证: '抄来的版本字面量等于真源' },
	{ file: 'scripts/oneoff/check-olympia-command-ids.mjs', 保证: '三个扩展的命令 id 引用=声明=注册' },
	{ file: 'scripts/oneoff/check-keybinding-mirrors.mjs', 保证: '文案里写的组合键与真实注册表一致' },
	{ file: 'scripts/oneoff/check-keybinding-tokens.mjs', 保证: '扩展声明的键位 VS Code 真能解析（ctrl+alt+comma 那种写法按了没反应）' },
	{ file: 'scripts/oneoff/check-problems-dir.mjs', 保证: '题面目录只有一个真源' },
	{ file: 'scripts/oneoff/check-toolchain-notices.mjs', 保证: '随包工具链里每个运行库 DLL 都在第三方声明里有一条' },
	{ file: 'scripts/oneoff/test-palette-trim.mjs', 保证: '命令面板裁剪（OI 用不到的条目不在）' },
	{ file: 'scripts/oneoff/test-noise-trim.mjs', 保证: '首屏噪声裁剪' },
	{ file: 'build/verify-product-extensions.mjs', 保证: '出厂的三个扩展是最新编译的', needsBuild: true },
	{ file: 'build/verify-product-licence.mjs', 保证: '出厂目录带 GPL 文本', needsBuild: true },
	{ file: 'build/verify-product-toolchain.mjs', 保证: '出厂目录带能用的 MinGW', needsBuild: true },
	// build/verify-product-keybindings.mjs 先不登记：全新 profile 下首启界面会吃掉键盘输入，
	// 命令面板一次都打不开（2026-10-18 实测 0/17），而它必须"每次都能跑"才有意义。
	// 结论目前靠 .scratch/ui/kb-sweep.mjs 在已走完首启的 profile 上手工跑（17/17 一致）。
	// 要接进门里得先解决首启阻塞：要么复用已首启的 profile，要么把那个界面 dismiss 掉。
];

const wantBuild = process.argv.includes('--with-build');
// 三条 verify-product-* 读的是「产品目录树」，不是 dist/ 里的发布分卷
const productDir = path.join(repoRoot, 'VSCode-win32-x64');
let failed = 0;
let skipped = 0;

for (const g of GATES) {
	const abs = path.join(repoRoot, g.file);
	if (!fs.existsSync(abs)) {
		console.log(`FAIL ${g.file} —— 门本身不见了（改名或删掉要把这条登记一起处理）`);
		failed++;
		continue;
	}
	if (g.needsBuild && !wantBuild) {
		console.log(`跳过 ${g.file} —— ${g.保证}（要跑请加 --with-build，且 dist/ 里得是本次产物）`);
		skipped++;
		continue;
	}
	if (g.needsBuild && !fs.existsSync(productDir)) {
		console.log(`FAIL ${g.file} —— 要求 --with-build 但产品目录不在：${productDir}`);
		failed++;
		continue;
	}
	const args = [abs];
	if (g.needsBuild) { args.push(productDir); }
	const r = spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8' });
	const ok = r.status === 0;
	if (!ok) { failed++; }
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${g.file} —— ${g.保证}`);
	if (!ok) {
		const tail = ((r.stderr || '') + (r.stdout || '')).trim().split(/\r?\n/).slice(-6).join('\n     ');
		console.log(`     ${tail}`);
	}
}

console.log(`\n${GATES.length - skipped - failed}/${GATES.length - skipped} 通过` + (skipped ? `，${skipped} 条按设计跳过（需要 --with-build）` : ''));
process.exit(failed ? 1 : 0);
