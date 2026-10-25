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
	{
		file: 'scripts/oneoff/check-olympia-home.mjs',
		保证: '「首页完全替换」钉死：三处落点（开始页 / 空编辑区 / 帮助>欢迎）共用同一份视图 / 8 个入口全部指向真实存在的命令 / 劫持只接管完全无参的欢迎调用（原生路径仍是逃生口）/ 首页 CSS 红线（无 substring 选择器、无 :has()、无硬编码色、无动画）',
	},
	{
		file: 'scripts/oneoff/mutation-test-olympia-home.mjs',
		保证: '上面那条门的断言真能抓住回归（逐条变异，看对应断言会不会变红；收尾逐字节校验临时树已还原）',
	},
	{
		file: 'scripts/oneoff/check-olympia-settings-page.mjs',
		保证: '「设置页完全替换」钉死：原生设置入口被拦（原生页仍是逃生口）/ 不自建原生 select（下拉强制 useCustomDrawn，配色走主题变量）/ 输入框挂自有 class、禁止 input[type=...] 属性选择器（白底白字红线）/ 窄容器响应式与底栏贴底',
	},
	{
		file: 'scripts/oneoff/mutation-test-olympia-settings-page.mjs',
		保证: '上面那条门的断言真能抓住回归（逐条变异，看对应断言会不会变红；收尾逐字节校验临时树已还原）',
	},
	{ file: 'scripts/oneoff/test-timeouts.mjs', 保证: '三个编译超时各不相干（语法自检最快、编译最慢），且没有裸字面量绕过常量' },
	{ file: 'scripts/oneoff/test-reveal-once.mjs', 保证: '首启只把竞赛工具面板带出来一次（标记读写同一个 key、失败不炸启动、不依赖文件夹）' },
	{ file: 'scripts/oneoff/check-keybinding-mirrors.mjs', 保证: '文案里写的组合键与真实注册表一致' },
	{ file: 'scripts/oneoff/check-keybinding-tokens.mjs', 保证: '扩展声明的键位 VS Code 真能解析（ctrl+alt+comma 那种写法按了没反应）' },
	{ file: 'scripts/oneoff/check-problems-dir.mjs', 保证: '题面目录只有一个真源' },
	{ file: 'scripts/oneoff/check-toolchain-notices.mjs', 保证: '随包工具链里每个运行库 DLL 都在第三方声明里有一条' },
	{ file: 'scripts/oneoff/test-palette-trim.mjs', 保证: '命令面板裁剪（OI 用不到的条目不在）' },
	{ file: 'scripts/oneoff/test-noise-trim.mjs', 保证: '首屏噪声裁剪' },
	{ file: 'scripts/oneoff/test-practice-list.mjs', 保证: '集训清单：写盘/读回/时长/勾题/开始这一场（要扩展已编译）' },
	{ file: 'scripts/oneoff/test-solve-log.mjs', 保证: '解题记录与连续打卡：写盘/读回/200 上限/坏文件退回空/本地日连续/跨年/面板那一行不出现分母（要扩展已编译）' },
	{ file: 'scripts/oneoff/test-solve-log-drift.mjs', 保证: '上面那条门自己有牙：标签漂移后正好那几条断言变红（要扩展已编译）' },
	{ file: 'scripts/oneoff/check-website-keys.mjs', 保证: '官网键表 = 出厂键位（双向，写了没绑和绑了没写都算错）' },
	{ file: 'build/verify-product-extensions.mjs', 保证: '出厂的三个扩展是最新编译的', needsBuild: true },
	{ file: 'build/verify-product-workbench.mjs', 保证: '出厂的 workbench bundle / NLS / CSS 就是当前源码（防 -SkipBundle 静默出货旧代码）', needsBuild: true },
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
		file: 'scripts/oneoff/verify-onboarding-no-break.mjs',
		name: '控制台来源分流判据自检',
		保证: '控制台 error 按来源分流这条判据自己有牙：Electron 自带沙箱启动噪声必须判成「内部」不判红，产品来源 / 认不出来源必须判红',
		args: () => ['--selftest']
	},
	{
		file: 'scripts/oneoff/verify-onboarding-no-break.mjs',
		name: '控制台来源分流在真机上的牙（注入自证）',
		保证: '真机上故意从产品页面打一条 console.error（来源是产品自己的 URL），分流判据必须把它判红 —— 判不红，上面那条分流判据就只是装饰',
		needsBuild: true,
		// 注意：这一条**不是** expectFailure。
		// --inject-console-error 的语义是「脚本自己注入一条产品侧 error，再验证判据抓住了它」，
		// 自证通过时脚本自己 exit 0 —— 它自己也会把那条注入的 error 判红（那正是它要证明的）。
		args: (productDir) => ['--product', productDir, '--inject-console-error']
	},
	{
		file: 'scripts/oneoff/analyze-sweep-bands.mjs',
		name: '扫光几何+像素门禁',
		保证: '五道扫光真的扫在目标部件上（DOM 真几何：位移在 [-B,E]、单调、横穿；按设计从屏外进场/出场的那一瞬豁免），并且像素上真的看得见、正差区间并集盖过部件的 35%、在往一个方向动（时序差分，不是「峰值−中位数」那种会被内容喂饱的假绿）；几何与像素的结论合并成一条，不许只判几何',
		// 这条门读的是「抓帧目录」，不是产品目录树。抓帧是一次性的
		// （抓完就没了），所以它靠环境变量指路；没给就跳过，
		// 但必须打印跳过原因 —— 不许塌进「没问题」。
		requiresEnv: 'OLYMPIA_FRAMES_DIR',
		args: () => ['--frames', process.env.OLYMPIA_FRAMES_DIR]
	},
	{
		file: 'scripts/oneoff/analyze-sweep-bands.mjs',
		name: '扫光判据自检',
		保证: '扫光判据自己有牙：正确几何/光带扫过必须通过，走 2 倍/卡住不动/压根没画/倒着扫/只在小范围挪动必须判红；按设计的进场豁免不得放过「整体在屏外」「跨轴出屏」',
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
		file: 'scripts/oneoff/analyze-sweep-bands.mjs',
		name: '扫光门禁在真实数据上的牙（像素没画出来）',
		保证: '把真实抓帧里的像素光带抹掉（DOM 里还在、屏幕上根本没画）后，这条门必须判红 —— 否则像素判据不进结论，上面那条门对「光带压根没被画出来」就是假绿',
		requiresEnv: 'OLYMPIA_FRAMES_DIR',
		expectFailure: true,
		args: () => ['--frames', process.env.OLYMPIA_FRAMES_DIR, '--inject-no-pixel']
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
		保证: '真机证明揭示洞在各种窗口形状下都开得满：窄窗 480×900 / 扁窗 1400×300 / dpr=2 / 洞开一半时改尺寸 / 洞开满后改尺寸 / 最小窗 400×270 / 400×760 —— 四角必须全透明、覆盖率不许回退、不许跳变；顺带把配置期四张卡的布局钉住（居中 / 不裁切 / 不重叠 / 按钮可见 / 代码可见 / 预览不留白）',
		needsBuild: true,
		// 这个门自己认 --product；它会起 5 个真窗口（每个独立 profile + 独立 CDP 端口），
		// 端口从 9251 连号排开（9251~9255），不能和 9223 / 9241 / 9225 撞。
		args: (productDir) => ['--product', productDir, '--port', '9251']
	},
	// build/verify-product-keybindings.mjs 先不登记：全新 profile 下首启界面会吃掉键盘输入，
	// 命令面板一次都打不开（2026-10-18 实测 0/17），而它必须"每次都能跑"才有意义。
	// 结论目前靠 .scratch/ui/kb-sweep.mjs 在已走完首启的 profile 上手工跑（17/17 一致）。
	// 要接进门里得先解决首启阻塞：要么复用已首启的 profile，要么把那个界面 dismiss 掉。

	// ─────────────────────────────────────────────────────────────────────────
	// 2026-10-25 审计补登的 27 条（之前写了一堆门，却没人跑 —— 等于没有门）。
	//
	// 分诊结论：审计把 scripts/oneoff/ + build/ 下 221 个 .mjs 全枚举了一遍，
	// 筛出 30 个真门禁候选逐个实跑（绿 23 / 红 6 / 超时 1）。那 6 条红**全是门禁侧缺陷，
	// 产品是对的**，已逐条修门禁（桩缺 API / 夹具不自足 / 变异字面量过期 / 断言的是
	// 已退役机制），修完每条都做了「改坏→红在指定断言上→产物逐字节还原」的牙齿证明。
	//
	// 登记规则：
	//   · 读**编译产物**的（oss/extensions/*/out、oss/out、产品目录）→ needsBuild: true。
	//     否则拿上一次的旧产物跑，结论是假绿 —— 这比不跑更坏。
	//   · 只读**源码**的 → 普通登记。
	//   · 工具与报表故意不登记：installer-manifest.mjs（生成 DEPLOY.md 表格）、
	//     measure-card-geometry.mjs（起真机测几何）、nls-residual-ast.mjs（汉化进度报表，
	//     没有阈值判据，登记进来等于把「翻译进度」当成门禁）。
	//   · argv 陷阱：check-all 会把产品目录当**位置参数**递给 needsBuild 的门。
	//     有两条门把 argv[2] 当成别的东西（check-core-copy 当扫描根、verify-shipped-nls
	//     当目标文件），必须显式给 args: () => []，否则会被喂错参数。
	// ─────────────────────────────────────────────────────────────────────────

	// 产品与出厂：读产品目录 / 编译产物，必须跟着出包一起跑。
	{
		file: 'build/verify-out.mjs',
		保证: '中文与 Olympia 命令真的编进了 out/ 树：界面文案是中英文原文已消失、product.json 品牌对、copilot 已裁剪、内置工具链没被剪枝误删',
		needsBuild: true
	},
	{
		file: 'scripts/oneoff/check-extension-copy.mjs',
		保证: '随包扩展里给用户看的文案都是中文（清单、界面文案、代码片段）',
		needsBuild: true
	},
	{
		file: 'scripts/oneoff/check-view-containers.mjs',
		保证: '视图容器的图标文件真实存在，视图在源码里有 provider 注册，出厂产物里带着图标',
		needsBuild: true
	},
	{
		file: 'scripts/oneoff/verify-shipped-nls.mjs',
		保证: '出厂产物里带着就地汉化（nls.messages.json 里有中文默认值，source map 里没有旧英文）',
		needsBuild: true,
		// argv[2] 在这里是「nls.messages.json 的路径」，不能被产品目录顶掉。
		args: () => []
	},
	{
		file: 'scripts/oneoff/check-licence-surface.mjs',
		保证: '许可面：装机的第三方声明文件与实际发出的运行库一一对应（含 NOTICE 目录清单）',
		needsBuild: true
	},
	{
		file: 'scripts/oneoff/check-core-copy.mjs',
		保证: '内核改动真的编进了产物并对用户说了中文（文案、开关默认值、欢迎页入口）',
		needsBuild: true,
		// argv[2] 在这里是「oss/out 的扫描根」，不能被产品目录顶掉。
		args: () => []
	},
	{ file: 'scripts/oneoff/test-block-check.mjs', 保证: '部件级语法检查：解析器加载失败要落 blocked，不能变成「没错误」', needsBuild: true },
	{ file: 'scripts/oneoff/test-coach-provider.mjs', 保证: '教练取模型的凭据纪律：没密钥时一个请求都不发；抽取/清洗白名单', needsBuild: true },
	{ file: 'scripts/oneoff/test-coach-statement.mjs', 保证: '教练带题面：题面正文真的进上下文，抬头说清来源', needsBuild: true },
	{ file: 'scripts/oneoff/test-judge-samples.mjs', 保证: '跑样例读的题面形状 = 写题面那一边写下来的形状', needsBuild: true },
	{ file: 'scripts/oneoff/test-my-template.mjs', 保证: '我的模板：清单、面板路径与实际写盘一致', needsBuild: true },
	{ file: 'scripts/oneoff/test-precheck.mjs', 保证: '提交前体检：正确提交不报、CRLF 不报、关掉的规则不报', needsBuild: true },
	{ file: 'scripts/oneoff/test-statement-view.mjs', 保证: '题面视图：页眉/chips/正文同页，正文不重复页眉', needsBuild: true },
	{ file: 'scripts/oneoff/test-syntax-check.mjs', 保证: '语法检查：编译错误报得出来，能编过的不报东西', needsBuild: true },
	{ file: 'scripts/oneoff/test-cpp-snippets.mjs', 保证: '代码片段：条目数与数据表一致、每条都能编译（关掉的设置一条都不给）', needsBuild: true },
	{ file: 'scripts/oneoff/test-stress-pipeline.mjs', 保证: '对拍流水线：正解与暴力一致、故意写错能报不一致并留下数据', needsBuild: true },
	{ file: 'scripts/oneoff/test-settings-panel.mjs', 保证: '设置面板：清单项一一对上、枚举显示中文名、回读的是生效值不是默认值', needsBuild: true },
	{ file: 'scripts/oneoff/test-problem-library.mjs', 保证: '题面库：面板那一行的名字/命令/键位与命令面板一致，面板说的份数和题库列表不打架', needsBuild: true },
	{ file: 'scripts/oneoff/test-judge-pipeline.mjs', 保证: '判题流水线：AC/WA 判得对、diff 的诊断表覆盖常见错（夹具自造，不依赖手工目录）', needsBuild: true },
	{ file: 'scripts/oneoff/test-memory-probe.mjs', 保证: '内存探针：列按位置解析、采样跟得住、祖进程超时要收尾', needsBuild: true },
	{ file: 'scripts/oneoff/test-contest-gate.mjs', 保证: '比赛模式联动：教练问的是比赛状态命令（isRunning），没在比赛不会被锁', needsBuild: true },
	{
		file: 'scripts/oneoff/test-licence-surface.mjs',
		保证: '上面那条许可面的门自己有牙：逐条变异（写死文件名 / BOM / 指错 LICENSE / NOTICE 目录清单），每条都只红在对应断言上',
		needsBuild: true
	},

	// 源码级：只读 oss 源码与清单，不需要出包就能跑。
	{ file: 'scripts/oneoff/check-build-typecheck.mjs', 保证: 'build/ 的类型错误条数只降不升（不许悄悄涨）' },
	{ file: 'scripts/oneoff/check-built-in-trim.mjs', 保证: '内置扩展裁剪：表里的每一项都指得到实物，保留下来的不依赖被裁掉的，自家扩展不误伤' },
	{ file: 'scripts/oneoff/check-chat-product-ids.mjs', 保证: '聊天侧的产品 id：走 walkthrough 命令的那些 id 在内核里真有读者' },
	{ file: 'scripts/oneoff/check-command-wiring.mjs', 保证: '命令接线：界面点到的每个命令都真有人注册，且面板行文案与命令面板标题同一句（label 漂移守卫）' },
	{ file: 'scripts/oneoff/check-config-defaults.mjs', 保证: '配置默认值：清单里的默认与代码兜底一致（两处口径不能分家）' },
	{ file: 'scripts/oneoff/scan-localize-arity.mjs', 保证: '汉化占位符：实参不够会让屏幕留下字面 {n} 的地方必须是 0' },
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

// 跳过的门分两种：要么要出包（needsBuild），要么要一个一次性产物（requiresEnv）。
// 汇总行只写「需要 --with-build」会把后者说错，所以这里只给个数 + 指路，理由看上面每条。
console.log(`\n${GATES.length - skipped - failed}/${GATES.length - skipped} 通过` + (skipped ? `，${skipped} 条按设计跳过（原因见上方每条：要出包的加 --with-build，要一次性产物的设对应环境变量）` : ''));
// 不用 process.exit()：Windows 上它会跟未关闭的 libuv 句柄竞争，崩成
// 0xC0000409 并把退出码换成 3221226505 —— 门禁失败反而看不出来。
// process.exitCode 让进程自然退出，失败语义才稳定、可被门禁判读。
process.exitCode = failed ? 1 : 0;
