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
	{ file: 'scripts/oneoff/check-l10n-fragments.mjs', 保证: '汉化没把“个相似命令”这类量词碎片当整句灌进 localize，数字不被吃掉' },
	{ file: 'scripts/oneoff/check-version-mirrors.mjs', 保证: '抄来的版本字面量等于真源' },
	{ file: 'scripts/oneoff/check-olympia-command-ids.mjs', 保证: '三个扩展的命令 id 引用=声明=注册' },
	{ file: 'scripts/oneoff/check-olympia-start-page.mjs', 保证: '开始页接线钉死：独立 scheme（不与上游 walkThrough 抢）/ 配置节点 id 是 olympia / upstream startupEditor 枚举未被污染 / CSS 红线' },
	{ file: 'scripts/oneoff/mutation-test-olympia-start-page.mjs', 保证: '上面那条门的断言真能抓住回归（逐条变异，看对应断言会不会变红）' },
	{ file: 'scripts/oneoff/test-timeouts.mjs', 保证: '三个编译超时各不相干（语法自检最快、编译最慢），且没有裸字面量绕过常量' },
	{ file: 'scripts/oneoff/test-reveal-once.mjs', 保证: '首启只把竞赛工具面板带出来一次（标记读写同一个 key、失败不炸启动、不依赖文件夹）' },
	{ file: 'scripts/oneoff/check-keybinding-mirrors.mjs', 保证: '文案里写的组合键与真实注册表一致' },
	{ file: 'scripts/oneoff/check-keybinding-tokens.mjs', 保证: '扩展声明的键位 VS Code 真能解析（ctrl+alt+comma 那种写法按了没反应）' },
	{ file: 'scripts/oneoff/check-problems-dir.mjs', 保证: '题面目录只有一个真源' },
	{ file: 'scripts/oneoff/check-toolchain-notices.mjs', 保证: '随包工具链里每个运行库 DLL 都在第三方声明里有一条' },
	{ file: 'scripts/oneoff/test-palette-trim.mjs', 保证: '命令面板裁剪（OI 用不到的条目不在）' },
	{ file: 'scripts/oneoff/test-noise-trim.mjs', 保证: '首屏噪声裁剪' },
	{ file: 'scripts/oneoff/test-practice-list.mjs', 保证: '集训清单：写盘/读回/时长/勾题/开始这一场（要扩展已编译）' },
	{ file: 'scripts/oneoff/check-website-keys.mjs', 保证: '官网键表 = 出厂键位（双向，写了没绑和绑了没写都算错）' },
	{ file: 'build/verify-product-extensions.mjs', 保证: '出厂的三个扩展是最新编译的', needsBuild: true },
	{ file: 'build/verify-product-licence.mjs', 保证: '出厂目录带 GPL 文本', needsBuild: true },
	{ file: 'build/verify-product-toolchain.mjs', 保证: '出厂目录带能用的 MinGW', needsBuild: true },
	{
		file: 'scripts/oneoff/verify-onboarding-no-break.mjs',
		保证: '真机跑通「鸿蒙式开始引导」：逐帧像素证明全程无断点（正常路径 + 跳过路径两条都跑）',
		needsBuild: true,
		// 这个门自己认 --product，不吃位置参数；而且它会起真窗口、要独占 CDP 端口。
		args: (productDir) => ['--product', productDir]
	},
	{
		file: 'scripts/oneoff/analyze-sweep-bands.mjs',
		name: '扫光几何+像素门禁',
		保证: '五道扫光真的扫在目标部件上（DOM 真几何：位移在 [-B,E]、单调、不出屏、横穿），并且像素上真的看得见、在往一个方向动（时序差分，不是「峰值−中位数」那种会被内容喂饱的假绿）',
		// 这条门读的是「抓帧目录」，不是产品目录树。抓帧是一次性的
		// （抓完就没了），所以它靠环境变量指路；没给就跳过，
		// 但必须打印跳过原因 —— 不许塌进「没问题」。
		requiresEnv: 'OLYMPIA_FRAMES_DIR',
		args: () => ['--frames', process.env.OLYMPIA_FRAMES_DIR]
	},
	{
		file: 'scripts/oneoff/analyze-sweep-bands.mjs',
		name: '扫光判据自检',
		保证: '扫光判据自己有牙：正确几何/光带扫过必须通过，走 2 倍/卡住不动/压根没画/倒着扫/只在小范围挪动必须判红',
		args: () => ['--selftest']
	},
	{
		file: 'scripts/oneoff/analyze-sweep-bands.mjs',
		name: '扫光门禁在真实数据上的牙',
		保证: '把真实抓帧里的位移注入成 2 倍（等价于历史 bug）后，这条门必须判红 —— 否则上面那条门是假绿',
		requiresEnv: 'OLYMPIA_FRAMES_DIR',
		expectFailure: true,
		args: () => ['--frames', process.env.OLYMPIA_FRAMES_DIR, '--inject-2x']
	},
	{
		file: 'scripts/oneoff/check-backdrop-continuity.mjs',
		name: '背景连续性判据自检',
		保证: '背景连续性判据自己有牙：正常序列必须绿，重建 / 冻结 / 清空 / 换元素必须红',
		args: () => ['--selftest']
	},
	{
		file: 'scripts/oneoff/check-backdrop-continuity.mjs',
		name: '背景连续性真机门',
		保证: '真机证明动态背景全程没断：洞单调（背景没被重建）、背景在流（没冻结）、无大面积亮度突变；并在同一份真实数据上注入三种故障自证有牙',
		needsBuild: true,
		// 这个门自己认 --product；它会起真窗口、要独占 CDP 端口（9241，不能和
		// verify-onboarding-no-break 的 9223、capture-onboarding-frames 的 9225 撞）。
		args: (productDir) => ['--product', productDir, '--port', '9241']
	},
	{
		file: 'scripts/oneoff/check-backdrop-continuity.mjs',
		name: '背景画布被换掉必须判红（采集层注入）',
		保证: '真机采集时把背景 canvas 换成一张内容逐像素复制的新画布 —— 画面看不出差别，但背景层已经被重建过；脚本必须证明真实数据被判红且被 C1 抓住（这是唯一能证明采样器真看得见重建的牙）',
		needsBuild: true,
		// 注意：这一条**不是** expectFailure。
		// --inject-canvas-swap 模式的语义是「脚本自己注入故障，再验证判据抓住了它」，
		// 注入自证通过时脚本自己 exit 0 —— 它自己也会把真实数据判红（那正是它要证明的）。
		// 门禁自己打印「真实数据 → 判红，被 C1 抓住」才算数，退出码仍是 0。
		args: (productDir) => ['--product', productDir, '--port', '9241', '--inject-canvas-swap']
	},
	{
		file: 'scripts/oneoff/verify-onboarding-geometry.mjs',
		name: '窗口几何判据自检',
		保证: '几何判据自己有牙：正常曲线必须绿，没开满 / 四角没盖住 / 改尺寸后回退 / 一步跳到位 / 透出太晚 必须分别判红',
		args: () => ['--selftest']
	},
	{
		file: 'scripts/oneoff/verify-onboarding-geometry.mjs',
		name: '窗口几何真机门',
		保证: '真机证明揭示洞在各种窗口形状下都开得满：窄窗 480×900 / 扁窗 1400×300 / dpr=2 / 洞开一半时改尺寸 / 洞开满后改尺寸 —— 四角必须全透明、覆盖率不许回退、不许跳变',
		needsBuild: true,
		// 这个门自己认 --product；它会起 5 个真窗口（每个独立 profile + 独立 CDP 端口），
		// 端口从 9251 连号排开（9251~9255），不能和 9223 / 9241 / 9225 撞。
		args: (productDir) => ['--product', productDir, '--port', '9251']
	},
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
	// 靠环境变量指路的门（一次性产物，比如抓帧目录）：
	// 没给就跳过，但必须说清为什么跳过 —— 「没跑」不能读成「没问题」。
	if (g.requiresEnv && !process.env[g.requiresEnv]) {
		console.log(`跳过 ${g.file} —— ${g.保证}（要跑请设 ${g.requiresEnv}=<目录>）`);
		skipped++;
		continue;
	}
	// 脚本路径永远在最前面：`args` 只负责追加脚本自己的参数。
	// （写成 `g.args ? g.args(productDir) : [abs]` 会把脚本路径整个丢掉，
	//   那样 spawn 出去的是 `node --product <dir>` —— node 会把 `--product`
	//   当成脚本名，门永远红，而且报错信息完全指不到真正的原因。）
	const args = [abs];
	if (g.args) {
		args.push(...g.args(productDir));
	} else if (g.needsBuild) {
		args.push(productDir);
	}
	const r = spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8' });
	// expectFailure 的门：它要证明「坏数据会被判红」，所以**退出码非 0 才是通过**。
	// （以前没有这一类门，于是「门自己有牙」这件事谁都没验证过。）
	const ok = g.expectFailure ? r.status !== 0 : r.status === 0;
	if (!ok) { failed++; }
	const label = g.name ? `${g.file}（${g.name}）` : g.file;
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} —— ${g.保证}`);
	if (!ok) {
		const tail = ((r.stderr || '') + (r.stdout || '')).trim().split(/\r?\n/).slice(-6).join('\n     ');
		console.log(`     ${tail}`);
	}
}

console.log(`\n${GATES.length - skipped - failed}/${GATES.length - skipped} 通过` + (skipped ? `，${skipped} 条按设计跳过（需要 --with-build）` : ''));
process.exit(failed ? 1 : 0);
