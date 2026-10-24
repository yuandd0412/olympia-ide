#!/usr/bin/env node
/*
 * verify-onboarding-geometry.mjs —— 真机验证「揭示洞在各种窗口形状 / 设备像素比下都开得满」
 *
 * 用法：
 *   node scripts/oneoff/verify-onboarding-geometry.mjs [--product <产品目录>] [--out <目录>]
 *                                                        [--port 9251] [--scenario <名字>] [--selftest]
 *
 * 退出码：0 = 全绿；1 = 至少一条几何判据没过；2 = 环境/前置条件不满足（连不上、找不到按钮等）。
 *
 * ---------------------------------------------------------------------------
 * ## 为什么要这个门禁
 *
 * 进入动画是用 `destination-out` 在极光画布上擦出一个洞，洞开满的瞬间工作台透出来。
 * 洞的几何由 `olympiaOnboardingRevealGeometry(enterTime, viewportWidth)` 给出：
 *
 *     corner = viewportWidth / √2
 *     band   = corner * 0.30
 *     radius = (corner + band) * easeInOut(progress)
 *     inner  = max(0, radius - band)
 *
 * 画布里先做了 `ctx.scale(1, height / width)` 的纵向压缩，所以在**圆空间**里画出的
 * 半径 R 覆盖的是 x∈[-R, R]、y∈[-R·H/W, R·H/W]（CSS 空间是个椭圆）。
 *
 * 不变式：**角点到中心的圆空间距离恒等于 W/√2**（角点 CSS 坐标 (W/2, H/2) 换算回
 * 圆空间是 (W/2, (H/2)·W/H) = (W/2, W/2)）—— 与窗口高度无关。所以 progress=1 时
 * inner = corner = W/√2 恰好盖住四角，窄窗、扁窗都该开满。
 *
 * 更强的不变式：**洞覆盖画布的比例与窗口大小无关**。
 *   洞的「过半透明」半径 r = W·k(k 随 progress 变)，椭圆面积 = π·r²·H/W，
 *   画布面积 = W·H  ⇒  coverage = π·k²，只跟 progress 有关。
 *   ⇒ 动画中途改窗口大小，coverage 曲线**不应该有任何台阶**。
 *   ⇒ 这条正好能抓住「改尺寸后洞的几何没跟着重算」的真缺陷。
 *
 * 这些都是**推演**。推演不等于实测 —— 本脚本用真机把它们验掉。
 *
 * ---------------------------------------------------------------------------
 * ## 怎么验「洞盖满」
 *
 * 直接读极光画布（`.olympia-onboarding-canvas`）的像素 alpha：
 *   - 洞内（被 destination-out 擦过）→ alpha = 0
 *   - 洞外（还留着不透明天空渐变）→ alpha = 255
 * 每帧极光画布都会先铺一层**不透明**天空渐变再画极光，所以画布 alpha 只反映
 * 「洞有没有擦到这一块」，不会被底色污染。
 *
 * 两个量：
 *   - cornerClear：四角各 10×10 CSS 像素区域里 alpha<128 的比例（精确裁剪读，四个小块）
 *   - coverage   ：整张画布里 alpha<128 的比例（缩到 160×100 再统计，省掉全画布读回）
 *
 * ---------------------------------------------------------------------------
 * ## 判据
 *
 *   G-view    视口真的变成了目标尺寸（**前提**）—— 视口没生效就不算测过，必须判红，
 *             绝不能「在原尺寸下测了一遍然后报绿」。
 *   G-dpr     （hidpi 场景）devicePixelRatio 确实是 2 —— 否则 HiDPI 分支根本没被测到。
 *   G-cov     收尾时洞覆盖整个画布（coverage > 0.985）。
 *   G-corner  收尾时洞盖住四角（四角透明比都 > 0.99）。
 *   G-mono    整个采样序列里 coverage **不许回退**（回退量 ≤ 0.02）——
 *             洞只会变大；一旦回退，说明改尺寸后几何没重算 / 画布被重建。
 *   G-rate    单步覆盖率变化率 < 30/s。自然的 easeInOut 峰值约 10.4/s
 *             （见下方推导），30/s 是 3 倍余量，用来抓「洞一步跳到位」。
 *   G-timing  洞第一次开始透出工作台的时刻落在 [1.2s, 2.4s]（相对点击时刻）——
 *             钉住「改尺寸没有把揭示时机搞乱」。
 *
 * ### G-rate 阈值是怎么算出来的（别拍脑袋）
 *
 *   clear 半径 k(p) = 0.9192·e(p) − 0.106      （e = easeInOut，p = progress）
 *   coverage = π·k²                              （到 1 为止）
 *   coverage 从 0 涨到 1 需要 e: 0.115 → 0.729，对应 p: 0.24 → 0.632，
 *   即 REVEAL_START(1.35s) + 0.353s 内涨满  ⇒ 平均 2.83/s
 *   峰值：dc/dp = 2π·k·0.9192·de/dp，e'=2（p=0.5），p'=1/0.9 ⇒ 峰值 ≈ 10.4/s
 *   ⇒ 阈值取 30/s（≈3× 峰值）。**早先版本写的 3.0/s 是错的** —— 会把正确实现判红。
 *
 * ---------------------------------------------------------------------------
 * ## 场景
 *
 *   narrow   窄窗 480×900（竖长）—— 最容易出现「洞盖不到上下边」的比例
 *   flat     扁窗 1400×300（横宽）—— 同理，验证椭圆按画布比例拉伸
 *   hidpi    dpr=2（用 --force-device-scale-factor=2 起进程）—— 验证画布 backing
 *            store 与绘制变换的比例没搞反（CSS 尺寸 vs 设备像素）
 *   resize-mid   动画**中途**（洞正在开）改窗口大小 —— 几何必须跟着重算，不能有台阶
 *   resize-late  洞**开满之后**改窗口大小 —— 新尺寸的四角仍然必须被盖住
 *   tiny       最小窗 400×270（产品允许拖到的下限）—— 卡片必须完整放得下
 *   min-width  400×760（最窄可用宽度）—— 窄窗下预览与代码块都得站得住
 *
 * 每个场景：独立 profile + 独立 CDP 端口 + 独立产品进程，收尾按 --user-data-dir
 * 特征反查进程并确认归零。

 * ---------------------------------------------------------------------------
 * ## 卡片布局判据（L-*）
 *
 * 三屏卡片（评测环境 / 代码字号 / 练习目录）在真机上量出来过五个缺陷，这个门禁把它们一条条钉住：
 *
 *   L-center   卡片视觉中心与视口中心重合（≤ 2px）—— 曾经偏 25×21px。
 *   L-bounds   整张卡完整落在视口里（越出 ≤ 1px）—— 400×270 里曾经上下各裁 65/107px。
 *   L-gap      相邻两张卡之间留得出间隙（≥ 8px）—— 曾经重叠 4.9px。
 *   L-cta      主按钮完整可见可点 —— 被裁就等于点不到。
 *   L-choices  选择列表不许被静默裁掉（每一项都要看得见）—— 三路信号，见下。
 *   L-card-fit 卡片必须装得下：主按钮下沿不许越过卡片 padding box 下沿，
 *                   卡片 scrollHeight 不许超过 clientHeight（超 > 2px 判红）。
 *
 * ### 2026-10-23 三屏改造：L-code / L-preview / L-preview-overflow 退役
 *
 * 旧卡片里有代码样例和预览面板（管道图 / 目录树），那三条判据都挂在它们身上。
 * 新卡片是「标题 + 描述 + 一个竖排单选列表」—— 那两块整块退役，
 * 判据**跟着被测对象一起退役**，不是「改成必须保持绿」
 * （那等于给一条已经没人守的事实盖章）。
 *
 * ### L-choices 钉的是「选择列表不许被压没」
 *
 * 旧结构里 .olympia-onboarding-card-body 在矮窗口档被写成可压缩（flex: 0 1 auto + min-height: 0），
 * 窗口高落到 321~420 之间时行区被压扁 —— 330px 高的窗口里行区只剩 50px（内容 120px），
 * 整行看不见，而且 overflow:hidden 连滚动条都不给：用户根本不知道自己还有一项没选。
 *
 * 新结构里这一块是 .olympia-onboarding-choices（列表容器）+ .olympia-onboarding-choice（每个选项），
 * 判据量三件事（各自独立成立）：
 *   ① 列表内容高度不许超过可见高度（scrollHeight ≤ clientHeight）——
 *      装不下就意味着被切了。
 *   ② 每一个选项的下沿不许越过列表盒子的下沿 —— 逐项核对，
 *      免得「整体装得下、但某一项被切掉半截」这种半吊子状态蒙混过关。
 *   ③ 列表可见高度不许低到等于没有（低于 32px = 连一个选项行都放不下）。
 *
 * scrollHeight / clientHeight 是布局像素（不含卡片的缩放），
 * 选项的下沿与盒子的下沿是屏幕像素（都含缩放）—— 两组量各自内部同坐标系，不混用。
 *
 * ### L-card-fit：卡片装不装得下
 *
 * 两个互相独立的信号，都说明「卡片被自己的 overflow:hidden 裁了」：
 *   ① 主按钮下沿越过卡片的 **padding box** 下沿（可见下沿）——
 *      越过去 = 按钮被卡片裁掉 = 点不到。
 *      卡片有 transform:scale，主按钮与卡片边界都是**屏幕像素**，
 *      比较前先 ÷ 卡片 scale 换算回布局像素再比容差。
 *   ② 卡片 scrollHeight − clientHeight > 容差 —— 内容装不下。
 *      这两个量本来就是布局像素，直接比。
 *
 * 「卡片内容盒（content box）高多少」只作诊断输出，**不参与判红**：
 * 内容盒比 padding box 小是正常的（padding + border 本来就占地方），
 * 拿它当判据会把所有正常卡片都判红。
 *
 * ### 「不适用」不等于「通过」
 *
 * 每条卡片判据都返回 { ok, detail }，ok === null 表示「这条在这个视口下不适用」。
 * 不适用**不算失败**，但也**不许当成通过**：每个场景必须有一条 L-applicable 判据，
 * 钉死「本场景的不适用条数 == 0」。少了它，「什么都没测到」和「全都测过了」
 * 在报告里长得一模一样。
 *
 * ---------------------------------------------------------------------------
 * ## 门禁自证有牙
 *
 * `--selftest` 用合成数据把每条判据的正反两面都跑一遍：正确的曲线必须全绿，
 * 「跳变 / 回退 / 没开满 / 四角没盖住 / 时机不对」五种坏数据必须分别被对应判据抓住。
 * 门禁自己有牙这件事本身也要能验 —— 否则它可能只是一盏永远绿的灯。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const PRODUCT_DIR = arg('--product', path.join(repoRoot, 'VSCode-win32-x64'));
const PRODUCT = path.join(PRODUCT_DIR, 'Olympia.exe');
// --port 只是为了兼容旧调用保留（check-all.mjs 还在传 9251）。
// 端口不再由脚本写死连号排开 —— 交给 Chromium 自选，理由见 resolveDevToolsPort 的注释。
const LEGACY_BASE_PORT = Number(arg('--port', 9251));
// 单个场景的墙钟上限。超了 = 这个场景判失败并继续下一个，绝不让整轮空转。
const SCENARIO_DEADLINE_MS = Number(arg('--scenario-timeout', 240000));
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = arg('--out', path.join(os.tmpdir(), 'olympia-geometry-' + STAMP));
const ONLY_SCENARIO = arg('--scenario', '');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * 带超时的 JSON 抓取。
 *
 * 为什么必须有超时（2026-10-23 实测踩出来的坑）：
 * Windows 上被强杀的进程会留下「属主 PID 已经不在、但内核仍然 LISTENING」的孤儿套接字。
 * 连上它，TCP 握手会成功、但永远不吐一个字节 —— 于是 `await fetch(url)` **永久挂起**，
 * 连 try/catch 都进不去（它不是 reject，它是永远不 settle）。
 * 后果：几何门在 resize-mid 场景上静默空转 28 分钟，后面 6 个场景一个都没跑到，
 * 机器还被占着，别的门禁全排不上队。
 * 所以每一次网络交互都必须自带超时：超时 = 抛错 = 被 catch = 这一轮不白跑。
 */
async function httpJson(url, timeoutMs = 5000) {
	return (await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })).json();
}

/**
 * 从 profile 目录里读 Chromium **自选**的调试端口。
 *
 * 为什么不能写死端口段（2026-10-23 实测踩出来的坑）：
 * Windows 上被强杀的进程会留下「属主 PID 已经不在、但内核仍然 LISTENING」的孤儿套接字。
 * 固定端口段（9251~9260）一旦被孤儿占住，Chromium 会**静默拿不到 DevTools 端口**
 * （DevToolsActivePort 文件根本不生成），而门禁脚本还拿着写死的端口去连 →
 * 连上那个「连上但不回数据」的孤儿 → fetch 永远不 settle → 整轮空转 28 分钟。
 * 交给 Chromium 自选（--remote-debugging-port=0）就绕开了「端口被占」这个前提：
 * 它自己挑一个没人占的端口，并把真实端口写进 <profile>/DevToolsActivePort。
 */
async function resolveDevToolsPort(profile, timeoutMs = 60000) {
	const portFile = path.join(profile, 'DevToolsActivePort');
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const txt = fs.readFileSync(portFile, 'utf8');
			const first = String(txt).split(/\r?\n/)[0].trim();
			if (/^\d+$/.test(first)) { return Number(first); }
		} catch { /* 还没写出来 */ }
		await sleep(200);
	}
	throw new Error('等不到 DevToolsActivePort（' + portFile + '）');
}

/**
 * 按 --user-data-dir 特征反查并杀掉这个 profile 的残留产品进程，返回杀掉的个数。
 *
 * 归属判据用「命令行里含这个 profile 路径」，不用 PID：
 * spawn 出来的 child.pid 是启动器 PID，真正的主进程 PID 可能不是它；
 * 反查特征还能顺带清掉上一次崩掉留下的孤儿。
 * 路径通过环境变量传进 PowerShell，避免路径里的空格/引号被命令行拆坏。
 */
function killProfileProcesses(profile) {
	if (!profile) { return 0; }
	let pids = [];
	try {
		const out = execFileSync('powershell.exe', ['-NoProfile', '-Command',
			'$p = $env:OLYMPIA_PROFILE_MARK; Get-CimInstance Win32_Process -Filter "Name=\'Olympia.exe\'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($p) } | ForEach-Object { $_.ProcessId }'],
			{ encoding: 'utf8', env: { ...process.env, OLYMPIA_PROFILE_MARK: profile } });
		pids = String(out).split(/\r?\n/).map(s => parseInt(s.trim(), 10)).filter(n => n > 0);
	} catch {
		return 0;
	}
	for (const pid of pids) { try { process.kill(pid); } catch { /* ignore */ } }
	return pids.length;
}

// ---------------------------------------------------------------------------
// 判据阈值（集中在这里，方便对着上面的推导改）
// ---------------------------------------------------------------------------
const TH = {
	coverageFull: 0.985,   // 收尾时洞要覆盖整个画布
	cornerClear: 0.99,     // 四角透明比
	monoTolerance: 0.02,   // 覆盖率允许的微小回退（采样噪声量级）
	maxRate: 30,           // 单步覆盖率变化率上限（/s），自然峰值 ~10.4/s
	firstRiseMin: 1.2,     // 洞第一次透出的时刻下界（秒，相对点击）
	firstRiseMax: 2.4,      // 上界
	// 卡片布局判据（针对真机量出来的五处缺陷：F1 不居中 / F2 相邻卡贴死 /
	// F3 最小窗裁切 / F4 代码样例被硬裁 / F5 预览框底部大片空白）
	card: {
		centerTol: 2,          // 卡片视觉中心与视口中心的偏差上限（px）
		boundsTol: 1,          // 卡片越出视口的上限（px）
		minGap: 8,             // 相邻两张卡之间的最小水平间隙（px）
		choicesClipTol: 1,     // 选择列表被裁掉的量上限（px）—— 1px 以内当亚像素误差
		choicesMinHeight: 32,  // 选择列表可见高度下限（px）—— 最矮档里一个选项行是 32px，
		                        // 低于这个 = 连一个选项都放不下（整块列表被压没了）
		cardFitTol: 2          // 卡片装填误差上限（px）—— 主按钮越界 / scrollHeight 超出共用
	},
};

// ---------------------------------------------------------------------------
// 纯函数判据（可被 selftest 直接调用）
// ---------------------------------------------------------------------------
function judgeCoverage(value) {
	return typeof value === 'number' && Number.isFinite(value) && value > TH.coverageFull;
}
function judgeCorners(arr) {
	return Array.isArray(arr) && arr.length === 4
		&& arr.every(v => typeof v === 'number' && Number.isFinite(v) && v > TH.cornerClear);
}
function judgeMonotonic(series) {
	let worst = 0, at = -1;
	for (let i = 1; i < series.length; i++) {
		const prev = series[i - 1].coverage ?? 0;
		const cur = series[i].coverage ?? 0;
		const drop = prev - cur;
		if (drop > worst) { worst = drop; at = series[i].t; }
	}
	return { ok: worst <= TH.monoTolerance, worst, at };
}
function judgeRate(series) {
	let worst = 0, at = -1;
	for (let i = 1; i < series.length; i++) {
		const dt = (series[i].t - series[i - 1].t) / 1000;
		if (dt <= 0) { continue; }
		const r = Math.abs((series[i].coverage ?? 0) - (series[i - 1].coverage ?? 0)) / dt;
		if (r > worst) { worst = r; at = series[i].t; }
	}
	return { ok: worst < TH.maxRate, worst, at };
}
function judgeFirstRise(series) {
	const hit = series.find(s => (s.coverage ?? 0) > 0.01);
	if (!hit) { return { ok: false, at: -1 }; }
	return { ok: hit.t >= TH.firstRiseMin * 1000 && hit.t <= TH.firstRiseMax * 1000, at: hit.t };
}

// ---------------------------------------------------------------------------
// 门禁自检：每条判据的正反两面
// ---------------------------------------------------------------------------
/**
	* 卡片布局判据。
	*
	* 每条都返回 { ok, detail }；ok === null 表示「这条在这个视口下不适用」
	* （比如极矮窗口里预览块整块 display:none，或者这张卡根本没有代码样例）。
	* 不适用不算失败 —— 但也不能因此跳过其它判据。
	*/

/** F1：卡片视觉中心必须与视口中心重合。 */
function judgeCardCenter(m) {
	const ok = Math.abs(m.centerDx) <= TH.card.centerTol && Math.abs(m.centerDy) <= TH.card.centerTol;
	return {
		ok: ok,
		detail: `中心偏移 dx=${m.centerDx.toFixed(1)} dy=${m.centerDy.toFixed(1)}（应 ≤ ${TH.card.centerTol}px）`
	};
}

/** F3：整张卡必须完整落在视口里。 */
function judgeCardBounds(m) {
	const c = m.card, v = m.viewport, t = TH.card.boundsTol;
	const over = Math.max(-c.l, -c.t, c.r - v.w, c.b - v.h);
	const ok = over <= t;
	return {
		ok: ok,
		detail: `卡片 ${c.w.toFixed(0)}×${c.h.toFixed(0)} 位于 [${c.l.toFixed(0)},${c.t.toFixed(0)}]→[${c.r.toFixed(0)},${c.b.toFixed(0)}]，视口 ${v.w}×${v.h}，越出 ${over.toFixed(1)}px（应 ≤ ${t}px）`
	};
}

/** F2：相邻两张卡不许重叠。 */
function judgeCardGap(m) {
	if (m.gap === null) {
		return { ok: null, detail: '视口里只看得见一张卡，没有相邻关系可判' };
	}
	const ok = m.gap >= TH.card.minGap;
	return {
		ok: ok,
		detail: `相邻卡最小水平间隙 ${m.gap.toFixed(1)}px（应 ≥ ${TH.card.minGap}px；重叠时是负数）`
	};
}

/** 主按钮必须真的露在外面（点得到）。 */
function judgeCardCta(m) {
	const c = m.cta;
	const ok = !!m.ctaVisible && !!c && c.w > 1 && c.h > 1
		&& c.l >= -TH.card.boundsTol && c.t >= -TH.card.boundsTol
		&& c.r <= m.viewport.w + TH.card.boundsTol && c.b <= m.viewport.h + TH.card.boundsTol;
	return {
		ok: ok,
		detail: c
			? `主按钮 ${c.w.toFixed(0)}×${c.h.toFixed(0)} @ [${c.l.toFixed(0)},${c.t.toFixed(0)}]，可见=${m.ctaVisible}`
			: '没找到主按钮'
	};
}

/**
 * L-choices：选择列表不许被静默裁掉。
 *
 * 这是 T-032 复审 Q6 在真机上坐实的缺陷（旧结构）：矮窗口档把行区写成可压缩，
 * 窗口一矮行区就被压扁 —— 内容装不下，还不给滚动条：用户根本不知道自己还有一项没选。
 *
 * 判据钉三件事（各自独立成立）：
 *   ① 列表内容高度不许超过可见高度（scrollHeight ≤ clientHeight）—— 装不下就意味着被切了。
 *   ② 每一个选项的下沿不许越过列表盒子的下沿 —— 逐项核对，
 *      免得「整体装得下、但某一项被切掉半截」这种半吊子状态蒙混过关。
 *   ③ 列表可见高度不许低到等于没有（低于 32px = 连一个选项行都放不下）。
 *
 * scrollHeight / clientHeight 是布局像素（不含卡片的缩放），
 * 选项的下沿与盒子的下沿是屏幕像素（都含缩放）—— 两组量各自内部同坐标系，不混用。
 */
function judgeCardChoices(m) {
	const cs = (m.choices || []).filter(c => c.choiceCount > 0);
	if (!cs.length) {
		return { ok: null, detail: '没有可判的选择列表' };
	}
	let worst = null;
	for (const c of cs) {
		const clipped = c.scrollH - c.clientH;
		const score = Math.max(clipped, c.choicesBottomExcess);
		if (!worst || score > worst.score) {
			worst = {
				score: score,
				clipped: clipped,
				overflowChoices: c.choicesBottomExcess,
				clientH: c.clientH,
				scrollH: c.scrollH,
				choiceCount: c.choiceCount,
				card: c.cardIndex
			};
		}
	}
	if (worst.clientH < TH.card.choicesMinHeight) {
		return {
			ok: false,
			detail: `第 ${worst.card + 1} 张卡的选择列表只剩 ${worst.clientH.toFixed(0)}px 高（内容 ${worst.scrollH.toFixed(0)}px）—— 整块列表被压没了`
		};
	}
	if (worst.clipped > TH.card.choicesClipTol) {
		return {
			ok: false,
			detail: `第 ${worst.card + 1} 张卡的选择列表内容 ${worst.scrollH.toFixed(0)}px 装不进 ${worst.clientH.toFixed(0)}px，被裁掉 ${worst.clipped.toFixed(0)}px`
		};
	}
	if (worst.overflowChoices > TH.card.choicesClipTol) {
		return {
			ok: false,
			detail: `第 ${worst.card + 1} 张卡有选项的下沿越过列表盒子 ${worst.overflowChoices.toFixed(0)}px（那一项看不见了）`
		};
	}
	return {
		ok: true,
		detail: `选择列表可见 ${worst.clientH.toFixed(0)}px / 内容 ${worst.scrollH.toFixed(0)}px，${worst.choiceCount} 项全露着`
	};
}

/**
 * L-card-fit：卡片必须装得下。
 *
 * 两个独立信号：
 *   ① 主按钮下沿越过卡片的 padding box 下沿（可见下沿）—— 越过去就是被裁 = 点不到。
 *      按钮与卡片边界都是屏幕像素（卡片有 transform:scale），
 *      先 ÷ 卡片 scale 换算回布局像素再比容差。
 *   ② 卡片 scrollHeight − clientHeight > 容差 —— 内容装不下（布局像素，直接比）。
 *
 * 「内容盒高多少」只作诊断，不参与判红。
 */
function judgeCardFit(m) {
	const f = m.fit;
	if (!f) {
		return { ok: null, detail: '没有可判的卡片装填信息' };
	}
	const t = TH.card.cardFitTol;
	if (f.ctaBelowPadBox > t) {
		return {
			ok: false,
			detail: `主按钮下沿越过卡片可见下沿 ${f.ctaBelowPadBox.toFixed(1)}px（已换算回布局像素；容差 ${t}px）`
		};
	}
	if (f.overflow > t) {
		return {
			ok: false,
			detail: `卡片内容 ${f.scrollH}px 装不进 ${f.clientH}px（差 ${f.overflow}px；容差 ${t}px）`
		};
	}
	return {
		ok: true,
		detail: `主按钮离可见下沿 ${f.ctaBelowPadBox.toFixed(1)}px，卡片 ${f.scrollH}/${f.clientH}px 装得下`
			+ `（诊断：scale=${(f.scale ?? 1).toFixed(3)}，内容盒 ${f.contentH ?? '?'}px）`
	};
}

function selftest() {
	/** 一套判据整体是否全绿。 */
	const allGreen = (lastCoverage, corners, series) =>
		judgeCoverage(lastCoverage) && judgeCorners(corners)
		&& judgeMonotonic(series).ok && judgeRate(series).ok && judgeFirstRise(series).ok;

	const cases = [];
	const smooth = [];
	for (let t = 0; t <= 5600; t += 120) {
		let c = 0;
		if (t >= 1560 && t < 1920) {
			const p = (t - 1560) / 360;
			const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
			const k = Math.max(0, 0.9192 * e - 0.106);
			c = Math.min(1, Math.PI * k * k);
		} else if (t >= 1920) {
			c = 1;
		}
		smooth.push({ t, coverage: c });
	}
	const lastSmooth = smooth[smooth.length - 1].coverage;

	cases.push({ name: '正常曲线：全部判据通过', got: allGreen(lastSmooth, [1, 1, 1, 1], smooth), expectGreen: true });
	cases.push({ name: '洞没开满（收尾覆盖率 0.5）→ G-cov 判红', got: allGreen(0.5, [1, 1, 1, 1], smooth), expectGreen: false });
	cases.push({ name: '右下角没盖住（0.5）→ G-corner 判红', got: allGreen(1, [1, 1, 0.5, 1], smooth), expectGreen: false });

	const back = smooth.map((s, i) => (i > 30 ? { t: s.t, coverage: s.coverage - 0.5 } : s));
	cases.push({ name: '改尺寸后洞回退 0.5 → G-mono 判红', got: allGreen(lastSmooth, [1, 1, 1, 1], back), expectGreen: false });

	// 跳变必须是**真正的台阶**：相邻两个样本只隔 10ms，覆盖率一步从 0 跳到 1
	// ⇒ 速率 1/0.01 = 100/s，远超 30/s 上限。（用 120ms 步长造不出跳变 ——
	// 那只是采样稀疏，不是跳。）
	const jump = [];
	for (let t = 0; t <= 5600; t += 120) { jump.push({ t, coverage: 0 }); }
	jump.push({ t: 1600, coverage: 0 });
	jump.push({ t: 1610, coverage: 1 });
	for (let t = 1730; t <= 5600; t += 120) { jump.push({ t, coverage: 1 }); }
	jump.sort((a, b) => a.t - b.t);
	cases.push({ name: '洞一步跳到位（10ms 内 0→1）→ G-rate 判红', got: allGreen(1, [1, 1, 1, 1], jump), expectGreen: false });

	const late = smooth.map(s => ({ t: s.t + 3000, coverage: s.coverage }));
	cases.push({ name: '洞 3 秒后才开始透出 → G-timing 判红', got: allGreen(lastSmooth, [1, 1, 1, 1], late), expectGreen: false });

	const never = smooth.map(s => ({ t: s.t, coverage: 0 }));
	cases.push({ name: '洞从头到尾没透出 → 判红', got: allGreen(0, [0, 0, 0, 0], never), expectGreen: false });

	// 卡片布局判据的自检：每条的正反两面都要跑一遍。
	{
	const good = {
	viewport: { w: 1200, h: 800 },
	card: { l: 399, t: 184, r: 801, b: 616, w: 402, h: 432, cx: 600, cy: 400 },
	centerDx: 0, centerDy: 0,
	gap: 45,
	ctaVisible: true,
	cta: { l: 520, t: 566, r: 680, b: 600, w: 160, h: 34 },
	choices: [{ cardIndex: 0, clientH: 138, scrollH: 138, choiceCount: 3, choicesBottomExcess: 0 }],
	fit: { scale: 1, ctaBelowPadBox: 0, ctaBelowPadBoxScreen: 0, scrollH: 432, clientH: 432, overflow: 0, contentH: 384, padBoxBottom: 616 }
	};
	const clone = (o) => JSON.parse(JSON.stringify(o));
	const allCardGreen = (m) => {
	const r = [judgeCardCenter(m), judgeCardBounds(m), judgeCardGap(m), judgeCardCta(m), judgeCardChoices(m), judgeCardFit(m)];
	return r.every(x => x.ok !== false);
	};
	cases.push({ name: '卡片布局全套判据：正常数据全绿', got: allCardGreen(good), expectGreen: true });

	const offCenter = clone(good);
	offCenter.centerDx = 25; offCenter.centerDy = 21;
	cases.push({ name: '卡片中心偏了 25×21px → L-center 判红', got: allCardGreen(offCenter), expectGreen: false });

	const cropped = clone(good);
	cropped.viewport = { w: 400, h: 270 };
	cropped.card = { l: 24, t: -100, r: 426, b: 372, w: 402, h: 472, cx: 225, cy: 136 };
	cropped.centerDx = 25; cropped.centerDy = 1;
	cases.push({ name: '400×270 里卡片上下都被裁 → L-bounds 判红', got: allCardGreen(cropped), expectGreen: false });

	const overlap = clone(good);
	overlap.gap = -4.9;
	cases.push({ name: '相邻卡重叠 4.9px → L-gap 判红', got: allCardGreen(overlap), expectGreen: false });

	const noCta = clone(good);
	noCta.ctaVisible = false;
	cases.push({ name: '主按钮被裁掉 → L-cta 判红', got: allCardGreen(noCta), expectGreen: false });

	// L-choices 的三条反例：列表被压扁 / 被压没 / 某一项被切半截。
	const clippedChoices = clone(good);
	clippedChoices.choices = [{ cardIndex: 0, clientH: 50, scrollH: 138, choiceCount: 3, choicesBottomExcess: 0 }];
	cases.push({ name: '选择列表被压到 50px、内容 138px → L-choices 判红', got: allCardGreen(clippedChoices), expectGreen: false });

	const goneChoices = clone(good);
	goneChoices.choices = [{ cardIndex: 0, clientH: 12, scrollH: 138, choiceCount: 3, choicesBottomExcess: 0 }];
	cases.push({ name: '选择列表只剩 12px → L-choices 判红', got: allCardGreen(goneChoices), expectGreen: false });

	const cutChoice = clone(good);
	cutChoice.choices = [{ cardIndex: 0, clientH: 138, scrollH: 138, choiceCount: 3, choicesBottomExcess: 9 }];
	cases.push({ name: '某一个选项的下沿越过列表盒子 9px → L-choices 判红', got: allCardGreen(cutChoice), expectGreen: false });

	// ---- L-card-fit：卡片装不装得下 ----
	const ctaBelow = clone(good);
	ctaBelow.fit = Object.assign({}, good.fit, { ctaBelowPadBox: 12, ctaBelowPadBoxScreen: 12 });
	cases.push({ name: '主按钮下沿越过卡片可见下沿 12px → L-card-fit 判红', got: allCardGreen(ctaBelow), expectGreen: false });

	const notFit = clone(good);
	notFit.fit = Object.assign({}, good.fit, { scrollH: 447, clientH: 432, overflow: 15 });
	cases.push({ name: '卡片内容 447px 装不进 432px（差 15px）→ L-card-fit 判红', got: allCardGreen(notFit), expectGreen: false });

	const fitEdge = clone(good);
	fitEdge.fit = Object.assign({}, good.fit, { scrollH: 434, clientH: 432, overflow: 2 });
	cases.push({ name: '卡片内容溢出 2px（正好等于容差）→ L-card-fit 不判红', got: allCardGreen(fitEdge), expectGreen: true });

	// 两个新判据的**直接**返回值断言：证明是它们自己判红的，不是别条误伤。
	cases.push({
		name: 'L-choices 直接判据：正常绿 / 被压扁红 / 某一项越界红',
		got: judgeCardChoices(good).ok === true
			&& judgeCardChoices(clippedChoices).ok === false
			&& judgeCardChoices(cutChoice).ok === false,
		expectGreen: true
	});
	cases.push({
		name: 'L-card-fit 直接判据：正常绿 / 按钮越过下沿 12px 红 / 装不下 15px 红',
		got: judgeCardFit(good).ok === true
			&& judgeCardFit(ctaBelow).ok === false
			&& judgeCardFit(notFit).ok === false,
		expectGreen: true
	});
	}

	let bad = 0;
	console.log('=== 几何门禁自检（判据必须有牙）===');
	for (const c of cases) {
		const ok = c.got === c.expectGreen;
		console.log(`  ${ok ? '✓' : '✗'} ${c.name}（实际${c.got ? '全绿' : '判红'}，期望${c.expectGreen ? '全绿' : '判红'}）`);
		if (!ok) { bad++; }
	}
	console.log(bad ? `\n自检失败 ${bad} 条` : '\n自检全过 ✓');
	return bad === 0;
}

// ---------------------------------------------------------------------------
// 极简 CDP 客户端
// ---------------------------------------------------------------------------
class Cdp {
	constructor(ws) {
		this.ws = ws;
		this.id = 0;
		this.pending = new Map();
		ws.addEventListener('message', (ev) => {
			let m; try { m = JSON.parse(ev.data); } catch { return; }
			if (m.id && this.pending.has(m.id)) {
				const { resolve, reject } = this.pending.get(m.id);
				this.pending.delete(m.id);
				if (m.error) { reject(new Error(m.error.message)); } else { resolve(m.result); }
			}
		});
	}
	send(method, params = {}) {
		const id = ++this.id;
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.ws.send(JSON.stringify({ id, method, params }));
			setTimeout(() => {
				if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`${method} 超时`)); }
			}, 30000);
		});
	}
	async eval(expr) {
		const r = await this.send('Runtime.evaluate', {
			expression: expr,
			returnByValue: true,
			awaitPromise: true
		});
		if (r.exceptionDetails) {
			throw new Error('页面内求值异常：' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
		}
		return r.result?.value;
	}
}

async function findPageTarget(port, timeoutMs = 90000) {
	// 墙钟上限，不是「次数上限」：httpJson 自带 5s 超时，按次数算最坏会拖到 20 分钟。
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const list = await httpJson(`http://127.0.0.1:${port}/json/list`, 3000);
			const pages = list.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
			if (pages.length) {
				return pages.find(p => !/devtools|about:blank/i.test(p.url)) || pages[0];
			}
		} catch { /* 还没起来 */ }
		await sleep(300);
	}
	throw new Error('等不到 CDP 页面目标（端口 ' + port + '）');
}

// ---------------------------------------------------------------------------
// 采样表达式（页面内执行）
// ---------------------------------------------------------------------------
const SAMPLE_EXPR = `(() => {
	const c = document.querySelector('.olympia-onboarding-canvas');
	if (!c) { return { missing: true }; }
	if (!c.width || !c.height) { return { missing: true, zero: true }; }
	const ctx = c.getContext('2d');
	const w = c.width, h = c.height;
	const dpr = c.clientWidth ? (w / c.clientWidth) : 1;
	const side = Math.max(1, Math.round(10 * dpr));
	const regions = [[0, 0], [w - side, 0], [0, h - side], [w - side, h - side]];
	const cornerClear = regions.map(function (r) {
		const d = ctx.getImageData(r[0], r[1], side, side).data;
		let clear = 0, n = 0;
		for (let i = 3; i < d.length; i += 4) { n++; if (d[i] < 128) { clear++; } }
		return n ? clear / n : 0;
	});
	let off = window.__olyGeomOff;
	if (!off) {
		off = document.createElement('canvas');
		off.width = 160; off.height = 100;
		window.__olyGeomOff = off;
	}
	const octx = off.getContext('2d', { willReadFrequently: true });
	octx.clearRect(0, 0, 160, 100);
	octx.drawImage(c, 0, 0, 160, 100);
	const od = octx.getImageData(0, 0, 160, 100).data;
	let clear = 0, n = 0;
	for (let i = 3; i < od.length; i += 4) { n++; if (od[i] < 128) { clear++; } }
	return {
		missing: false,
		w: w, h: h, dpr: dpr,
		cornerClear: cornerClear,
		cornerAllClear: cornerClear.length === 4 && cornerClear.every(function (v) { return v > 0.99; }),
		coverage: n ? clear / n : 0,
		metrics: {
			innerWidth: window.innerWidth,
			innerHeight: window.innerHeight,
			canvasCssWidth: c.clientWidth,
			canvasCssHeight: c.clientHeight,
			devicePixelRatio: window.devicePixelRatio
		}
	};
})()`;

/**
	* 卡片布局测量（页面内执行）。
	*
	* 量的是**用户眼睛看到的位置**（getBoundingClientRect，含 transform 的 scale），
	* 不是布局位置 —— 卡片有缩放和位移，按布局位置量会算出假的间隙。
	*/
	const CARD_LAYOUT_EXPR = `(() => {
	const vw = window.innerWidth, vh = window.innerHeight;
	const cards = [...document.querySelectorAll('.olympia-onboarding-card')];
	if (!cards.length) { return { missing: true }; }
	const R = function (el) {
	const r = el.getBoundingClientRect();
	return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
	};
	const active = cards.find(function (c) { return c.style.pointerEvents === 'auto'; }) || cards[0];
	const card = R(active);

	// 相邻卡之间的水平间隙：只看还看得见的卡，按屏幕上的左右顺序排。
	const vis = [];
	for (const c of cards) {
	const op = Number(getComputedStyle(c).opacity);
	if (op > 0.05) { vis.push(R(c)); }
	}
	vis.sort(function (a, b) { return a.l - b.l; });
	let gap = null;
	const gaps = [];
	for (let i = 0; i + 1 < vis.length; i++) {
	const g = vis[i + 1].l - vis[i].r;
	gaps.push(g);
	if (gap === null || g < gap) { gap = g; }
	}

	// 主按钮
	const ctaEl = active.querySelector('.olympia-onboarding-cta');
	const cta = ctaEl ? R(ctaEl) : null;
	let ctaVisible = false;
	if (ctaEl && cta) {
	const cs = getComputedStyle(ctaEl);
	ctaVisible = cta.w > 0 && cta.h > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
	}

	// 选择列表有没有被静默裁掉。
		//
		// 量两件事，各自内部同坐标系：
		//   ① scrollHeight vs clientHeight（布局像素，不含卡片的缩放）——
		//      内容装不下就是被切了。
		//   ② 每一个选项的下沿 vs 列表盒子的下沿（屏幕像素，两边都含缩放）——
		//      逐项核对，防止「整体装得下但某一项被切半截」。
		const choices = [];
		for (let ci = 0; ci < cards.length; ci++) {
				const c = cards[ci];
				const list = c.querySelector('.olympia-onboarding-choices');
				if (!list) { continue; }
				const lr = R(list);
				const choiceEls = [...list.querySelectorAll('.olympia-onboarding-choice')];
				let excess = 0;
				for (const el of choiceEls) {
						const rr = el.getBoundingClientRect();
						excess = Math.max(excess, rr.bottom - lr.bottom);
				}
				choices.push({
						cardIndex: ci,
						clientH: list.clientHeight,
						scrollH: list.scrollHeight,
						choiceCount: choiceEls.length,
						choicesBottomExcess: excess
				});
		}

	// 卡片装填（Q2 / Q8）：卡片自己 overflow:hidden，内容装不下就会被它切掉。
	//   ① 主按钮下沿越过卡片的 padding box 下沿（可见下沿）
	//   ② 卡片 scrollHeight − clientHeight
	// 屏幕像素（含卡片 transform 的 scale）先 ÷ scale 换算回布局像素再比容差。
	const fit = (function () {
		const el = active;
		if (!el) { return null; }
		const cr = el.getBoundingClientRect();
		const cs = getComputedStyle(el);
		const scale = el.offsetWidth > 0 ? (cr.width / el.offsetWidth) : 1;
		const borderBottom = parseFloat(cs.borderBottomWidth) || 0;
		const padBoxBottom = cr.bottom - borderBottom * scale;
		let ctaScreen = 0;
		const ctaEl = el.querySelector('.olympia-onboarding-cta');
		if (ctaEl) {
			ctaScreen = ctaEl.getBoundingClientRect().bottom - padBoxBottom;
		}
		const padTop = parseFloat(cs.paddingTop) || 0;
		const padBottom = parseFloat(cs.paddingBottom) || 0;
		return {
			scale: scale,
			ctaBelowPadBox: ctaScreen / (scale || 1),
			ctaBelowPadBoxScreen: ctaScreen,
			scrollH: el.scrollHeight,
			clientH: el.clientHeight,
			overflow: el.scrollHeight - el.clientHeight,
			contentH: el.clientHeight - padTop - padBottom,
			padBoxBottom: padBoxBottom
		};
	})();

	return {
	missing: false,
	viewport: { w: vw, h: vh },
	card: card,
	centerDx: card.cx - vw / 2,
	centerDy: card.cy - vh / 2,
	gap: gap,
	gaps: gaps,
	cta: cta,
	ctaVisible: ctaVisible,
	choices: choices,
	fit: fit
	};
	})()`;

const ACTIVE_CARD = `(() => {
	const cards = [...document.querySelectorAll('.olympia-onboarding-card')];
	return cards.find(c => c.style.pointerEvents === 'auto') || cards[0] || null;
})()`;

// ---------------------------------------------------------------------------
// 视口设置：先试 CDP 设备覆盖，失败再退到真实窗口尺寸
// ---------------------------------------------------------------------------
async function readMetrics(cdp) {
	return await cdp.eval(`({
		innerWidth: window.innerWidth,
		innerHeight: window.innerHeight,
		devicePixelRatio: window.devicePixelRatio,
		canvasCssWidth: (document.querySelector('.olympia-onboarding-canvas') || {}).clientWidth || 0,
		canvasCssHeight: (document.querySelector('.olympia-onboarding-canvas') || {}).clientHeight || 0
	})`);
}

async function setViewport(cdp, w, h, dpr) {
	let via = 'none';
	try {
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: w, height: h, deviceScaleFactor: dpr, mobile: false
		});
		via = 'Emulation.setDeviceMetricsOverride';
	} catch { /* Electron 主窗口可能不支持 */ }
	await sleep(1000);
	let m = await readMetrics(cdp);
	if (Math.abs((m.innerWidth || 0) - w) > 8 || Math.abs((m.innerHeight || 0) - h) > 8) {
		// CDP 覆盖没生效 → 改真实窗口尺寸（用户拖窗口也是这条路）
		try {
			const win = await cdp.send('Browser.getWindowForTarget', {});
			await cdp.send('Browser.setWindowBounds', {
				windowId: win.windowId,
				bounds: { left: 0, top: 0, width: w, height: h, windowState: 'normal' }
			});
			via = 'Browser.setWindowBounds';
		} catch { /* 两条都不行 */ }
		await sleep(1400);
		m = await readMetrics(cdp);
	}
	return { via, metrics: m };
}

// ---------------------------------------------------------------------------
// 触发进入动画：走完 3 张卡（2 次「下一步」+ 1 次「开始做题」）
// ---------------------------------------------------------------------------
async function triggerEnter(cdp) {
	for (let i = 0; i < 2; i++) {
		const ok = await cdp.eval(`(() => {
			const card = ${ACTIVE_CARD};
			if (!card) { return false; }
			const b = card.querySelector('.olympia-onboarding-cta');
			if (!b || b.disabled) { return false; }
			b.click();
			return true;
		})()`);
		if (!ok) { return { ok: false, stage: `next-${i}` }; }
		await sleep(800);
	}
	const label = await cdp.eval(`(() => {
		const card = ${ACTIVE_CARD};
		const b = card ? card.querySelector('.olympia-onboarding-cta') : null;
		return b ? b.innerText.trim() : null;
	})()`);
	if (label !== '开始做题') { return { ok: false, stage: 'label', label }; }
	await cdp.eval(`(() => {
		const card = ${ACTIVE_CARD};
		const b = card ? card.querySelector('.olympia-onboarding-cta') : null;
		if (b) { b.click(); }
		return true;
	})()`);
	return { ok: true, label };
}

// ---------------------------------------------------------------------------
// 场景执行
// ---------------------------------------------------------------------------
const results = [];
const problems = [];
// 所有 ok === null（不适用）的判据。「不适用」不算失败，但绝不许当成通过 ——
// 每个场景都要有一条 L-applicable 判据钉死「本场景不适用条数 == 0」。
const notApplicable = [];
// 当前场景的 profile（超时兜底反查进程用）
let activeProfile = '';
// 场景超时后置 true：此后这个场景里产生的判据结果一律作废，
// 免得「超时那一刻顺手算出来的半个结果」混进最终报告里冒充结论。
let scenarioAborted = false;

/**
 * 每个场景的墙钟上限。
 *
 * 场景内部有大量 await（等 overlay、等动画帧、等 CDP 回包），其中任何一个
 * 「永不 settle」的 await 都会让整个场景无限期挂着 —— 而脚本外面还有 9 个场景在排队，
 * 结果就是「一轮空转几十分钟，后面什么都没测」（2026-10-23 实测：卡在 resize-mid 空转 28 分钟）。
 * 所以：超时就判失败 + 反查杀掉这个 profile 的进程 + 继续下一个场景。
 * 宁可少测一个场景，也不能让整轮卡死。
 */
function withScenarioDeadline(name, fn) {
	scenarioAborted = false;
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			scenarioAborted = true;
			const killed = killProfileProcesses(activeProfile);
			reject(new Error(`场景 ${name} 超过墙钟上限 ${Math.round(SCENARIO_DEADLINE_MS / 1000)}s，已杀 ${killed} 个残留进程并判失败`));
		}, SCENARIO_DEADLINE_MS);
		Promise.resolve().then(fn).then(
			(v) => { clearTimeout(timer); resolve(v); },
			(e) => { clearTimeout(timer); reject(e); }
		);
	});
}

/**
	* 记一条判据。
	*
	* ok === null 表示「这条在这个视口下不适用」—— 不算失败，但也不许当成通过
	* （汇总里显示为「—」，一眼能看出它没被测到，而不是被漏掉了）。
	*/
function judge(id, desc, ok, detail) {
	if (scenarioAborted) {
		console.log(`  ⊘ ${id} ${desc} —— 场景已超时，此项结果作废`);
		return;
	}
	results.push({ id, desc, ok, detail });
	if (ok === null) {
		notApplicable.push({ id, desc, detail });
		console.log(`  — ${id} ${desc} —— ${detail}（不适用）`);
		return;
	}
	if (ok) { console.log(`  ✓ ${id} ${desc}`); }
	else { console.log(`  ✗ ${id} ${desc} —— ${detail}`); problems.push(`${id}: ${detail}`); }
}

async function runScenario(name, opts) {
	console.log(`\n################ 场景 ${name} ################`);
	const outDir = path.join(OUT, name);
	fs.mkdirSync(outDir, { recursive: true });
	const profile = path.join(outDir, 'profile');
	activeProfile = profile;
	// 端口交给 Chromium 自选（0 = 让它挑一个没人占的端口）。
	// 写死端口段会被「属主已死但内核仍 LISTENING」的孤儿套接字占住，
	// 那样 Chromium 根本拿不到 DevTools 端口，脚本却还拿着旧端口去连 → 永久挂起。
	const args = [`--user-data-dir=${profile}`, '--remote-debugging-port=0'];
	if (opts.forceDpr) { args.push(`--force-device-scale-factor=${opts.forceDpr}`); }
	const child = spawn(PRODUCT, args, { stdio: 'ignore' });

	let closed = false;
	const cleanup = async () => {
		if (closed) { return; }
		closed = true;
		try { child.kill(); } catch { /* 已退出 */ }
		await sleep(2000);
		const killed = killProfileProcesses(profile);
		if (killed) { console.log(`  清理了 ${killed} 个残留进程（按 --user-data-dir 特征反查）`); }
	};

	let cdp; let ws;
	try {
		const port = await resolveDevToolsPort(profile);
		console.log('  进程 PID:', child.pid, '| 端口', port, '（Chromium 自选）');
		const target = await findPageTarget(port);
		ws = new WebSocket(target.webSocketDebuggerUrl);
		await new Promise((res, rej) => {
			// WS 握手也必须带超时：连上但握手不完成 = 同样是「永不 settle」。
			const timer = setTimeout(() => rej(new Error('CDP WebSocket 15s 内没连上')), 15000);
			const once = (fn) => (ev) => { clearTimeout(timer); fn(ev); };
			ws.addEventListener('open', once(res), { once: true });
			ws.addEventListener('error', once(rej), { once: true });
		});
		cdp = new Cdp(ws);
		await cdp.send('Runtime.enable');

		// 等引导出现（闸门放行前卡片不可点，最多等 90s）
		let appeared = false;
		for (let i = 0; i < 180; i++) {
			const has = await cdp.eval(`!!document.querySelector('.olympia-onboarding-canvas')`);
			if (has) { appeared = true; break; }
			await sleep(500);
		}
		if (!appeared) { throw new Error('引导 overlay 没出现'); }
		console.log('  引导已出现');

		// 场景前置：改视口
		let vpInfo = null;
		if (opts.viewport) {
			vpInfo = await setViewport(cdp, opts.viewport[0], opts.viewport[1], opts.dpr || 1);
			const m = vpInfo.metrics;
			console.log(`  视口设置方式=${vpInfo.via} → innerWidth=${m.innerWidth} innerHeight=${m.innerHeight} dpr=${m.devicePixelRatio}`);
			const sizeOk = Math.abs((m.innerWidth || 0) - opts.viewport[0]) <= 8
				&& Math.abs((m.innerHeight || 0) - opts.viewport[1]) <= 8;
			judge(`${name}-G-view`, `视口真的变成 ${opts.viewport[0]}×${opts.viewport[1]}`,
				sizeOk, `实际 innerWidth=${m.innerWidth} innerHeight=${m.innerHeight}（视口没生效 ⇒ 这个场景不算测过）`);
			if (opts.forceDpr) {
				judge(`${name}-G-dpr`, `devicePixelRatio 确实是 ${opts.forceDpr}`,
					Math.abs((m.devicePixelRatio || 0) - opts.forceDpr) < 0.01,
					`实际 dpr=${m.devicePixelRatio}`);
			}
		}

		// 卡片布局测量：必须在触发进入动画**之前**做 ——
		// 一旦点下「开始做题」，卡片就散了，再也量不到配置期的布局。
		await sleep(700);
		let cardLayout = null;
		try {
			cardLayout = await cdp.eval(CARD_LAYOUT_EXPR);
		} catch (e) {
			cardLayout = { missing: true, error: e.message };
		}
		fs.writeFileSync(path.join(outDir, 'card-layout.json'), JSON.stringify(cardLayout, null, 2));
		if (!cardLayout || cardLayout.missing) {
			judge(`${name}-L-present`, '卡片布局可测（页面上找得到卡片）', false,
				`页面上没有可测的 .olympia-onboarding-card${cardLayout && cardLayout.error ? '（' + cardLayout.error + '）' : ''}`);
		} else {
			const c = cardLayout.card;
			console.log(`  卡片 ${c.w.toFixed(0)}×${c.h.toFixed(0)} @ [${c.l.toFixed(0)},${c.t.toFixed(0)}]→[${c.r.toFixed(0)},${c.b.toFixed(0)}]`
				+ ` | 视口 ${cardLayout.viewport.w}×${cardLayout.viewport.h}`
				+ ` | 中心偏移 ${cardLayout.centerDx.toFixed(1)}×${cardLayout.centerDy.toFixed(1)}`
				+ ` | 相邻间隙 ${cardLayout.gap === null ? '（只有一张可见）' : cardLayout.gap.toFixed(1) + 'px'}`);
			const cardJudges = [
				['L-center', '卡片视觉中心与视口中心重合', judgeCardCenter],
				['L-bounds', '整张卡完整落在视口里（不被裁切）', judgeCardBounds],
				['L-gap', '相邻两张卡之间留得出间隙（不重叠）', judgeCardGap],
				['L-cta', '主按钮完整可见可点', judgeCardCta],
				['L-choices', '选择列表不许被静默裁掉（每一项都要看得见）', judgeCardChoices],
				['L-card-fit', '卡片内容必须装得下（主按钮不许被卡片裁掉）', judgeCardFit],
			];
			for (const [id, desc, fn] of cardJudges) {
				const r = fn(cardLayout);
				judge(`${name}-${id}`, desc, r.ok, r.detail);
			}
			// 「不适用」不等于「通过」：本场景里凡是没被测到的判据都要被点名。
			const naHere = notApplicable.filter(x => x.id.startsWith(name + '-'));
			judge(`${name}-L-applicable`, '所有卡片判据都必须适用（不适用条数必须为 0）',
				naHere.length === 0,
				naHere.length === 0
					? '本场景没有「不适用」的判据'
					: `本场景有 ${naHere.length} 条判据没被测到：${naHere.map(x => x.id).join('、')}`);
		}

		// 触发进入动画
		const trig = await triggerEnter(cdp);
		console.log('  触发:', JSON.stringify(trig));
		if (!trig.ok) { throw new Error('触发进入动画失败：' + JSON.stringify(trig)); }

		// 逐帧采样
		const series = [];
		const t0 = Date.now();
		let resized = false;
		for (let i = 0; i < 260; i++) {
			const alive = await cdp.eval(`!!document.querySelector('.olympia-onboarding-canvas')`);
			const s = alive ? await cdp.eval(SAMPLE_EXPR) : null;
			const elapsed = Date.now() - t0;
			series.push({ t: elapsed, coverage: s && !s.missing ? s.coverage : 0, s, alive });
			if (opts.resizeAtMs && !resized && elapsed >= opts.resizeAtMs) {
				resized = true;
				const vi = await setViewport(cdp, opts.resizeTo[0], opts.resizeTo[1], opts.dpr || 1);
				console.log(`  已在 ${elapsed}ms 把视口改成 ${opts.resizeTo[0]}×${opts.resizeTo[1]}（方式=${vi.via}）`);
			}
			if (!alive) { break; }
			await sleep(110);
		}

		fs.writeFileSync(path.join(outDir, 'geometry-samples.json'),
			JSON.stringify({ name, viewport: opts.viewport, resizeAtMs: opts.resizeAtMs, series }, null, 2));

		const aliveSeries = series.filter(x => x.alive && x.s && !x.s.missing);
		const last = aliveSeries[aliveSeries.length - 1];
		if (!last) {
			judge(`${name}-G-cov`, '洞必须开满', false, '没采到任何有效样本');
			return;
		}
		console.log(`  采到 ${aliveSeries.length} 个样本，收尾覆盖率 ${last.s.coverage.toFixed(4)}`);

		judge(`${name}-G-cov`, '洞覆盖整个画布（收尾时）',
			judgeCoverage(last.s.coverage),
			`收尾覆盖率 ${last.s.coverage.toFixed(4)}（应 > ${TH.coverageFull}）`);
		judge(`${name}-G-corner`, '洞盖住四角（四角像素全透明）',
			judgeCorners(last.s.cornerClear),
			`四角透明比 ${JSON.stringify(last.s.cornerClear.map(v => Number(v.toFixed(3))))}`);

		const mono = judgeMonotonic(aliveSeries);
		judge(`${name}-G-mono`, '洞只变大不变小（改尺寸也不能让它回退）',
			mono.ok, `最大回退 ${mono.worst.toFixed(4)} @${mono.at}ms（应 ≤ ${TH.monoTolerance}）`);

		const rate = judgeRate(aliveSeries);
		judge(`${name}-G-rate`, '洞不能一步跳到位',
			rate.ok, `最大覆盖率变化率 ${rate.worst.toFixed(2)}/s @${rate.at}ms（应 < ${TH.maxRate}/s）`);

		const rise = judgeFirstRise(aliveSeries);
		judge(`${name}-G-timing`, '洞第一次透出工作台的时刻在合理窗口',
			rise.ok, rise.at < 0
				? '洞从头到尾没透出'
				: `首次透出 @${rise.at}ms（应在 ${TH.firstRiseMin * 1000}~${TH.firstRiseMax * 1000}ms）`);

		try { ws.close(); } catch { /* ignore */ }
	} finally {
		await cleanup();
		await sleep(1200);
	}
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
if (has('--selftest')) {
	process.exit(selftest() ? 0 : 1);
}

console.log('=== 窗口几何真机门禁 ===');
console.log('  产品 :', PRODUCT);
console.log('  输出 :', OUT);
console.log('  端口 : Chromium 自选（--port ' + LEGACY_BASE_PORT + ' 仅作兼容保留，已不生效）');
console.log('  单场景墙钟上限 :', Math.round(SCENARIO_DEADLINE_MS / 1000) + 's');

if (!fs.existsSync(PRODUCT)) {
	console.error('产品不存在：' + PRODUCT);
	console.error('先跑 build/oss-package.ps1 出包。');
	process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

// 端口不再连号排开：每个场景用独立 profile + Chromium 自选端口。
// 原来的写法（--port 9251 连号）会被 Windows 上的孤儿监听套接字占死，
// 而 Chromium 拿不到端口时是**静默**的 —— 门禁脚本拿着旧端口去连一个不回话的孤儿，
// 于是永久挂起。端口自选把这个前提彻底去掉。
const SCENARIOS = [
	{ name: 'narrow', viewport: [480, 900], dpr: 1 },
	{ name: 'flat', viewport: [1400, 300], dpr: 1 },
	{ name: 'hidpi', viewport: [900, 900], dpr: 2, forceDpr: 2 },
	{ name: 'resize-mid', viewport: [1100, 800], dpr: 1, resizeAtMs: 1700, resizeTo: [900, 640] },
	{ name: 'resize-late', viewport: [1100, 800], dpr: 1, resizeAtMs: 3200, resizeTo: [820, 900] },
	{ name: 'tiny', viewport: [400, 270], dpr: 1 },
	{ name: 'min-width', viewport: [400, 760], dpr: 1 },
	{ name: 'short', viewport: [1000, 400], dpr: 1 },
	{ name: 'veryshort', viewport: [1000, 330], dpr: 1 },
	{ name: 'midshort', viewport: [900, 460], dpr: 1 },];

for (const sc of SCENARIOS) {
	if (ONLY_SCENARIO && sc.name !== ONLY_SCENARIO) { continue; }
	try {
		await withScenarioDeadline(sc.name, () => runScenario(sc.name, sc));
	} catch (e) {
		console.error(`  ✗ 场景 ${sc.name} 异常：${e.message}`);
		problems.push(`${sc.name}-crash: ${e.message}`);
		results.push({ id: `${sc.name}-crash`, desc: '场景执行未抛异常', ok: false, detail: e.message });
	}
}

const report = {
	startedAt: new Date().toISOString(),
	product: PRODUCT,
	out: OUT,
	thresholds: TH,
	results,
	problems
};
fs.writeFileSync(path.join(OUT, 'geometry-report.json'), JSON.stringify(report, null, 2));

console.log('\n================ 汇总 ================');
for (const r of results) {
	console.log(`  ${r.ok === null ? '—' : (r.ok ? '✓' : '✗')} ${r.id} ${r.desc}${r.ok === null || r.ok ? '' : ' —— ' + r.detail}`);
}
console.log(notApplicable.length
	? `\n注意：有 ${notApplicable.length} 条判据「不适用」—— 不适用不等于通过`
	: '\n没有「不适用」的判据（全部真的测到了）');
console.log(problems.length ? `\n有 ${problems.length} 条几何判据没过` : '\n窗口几何全过 ✓');
console.log('报告:', path.join(OUT, 'geometry-report.json'));
process.exit(problems.length ? 1 : 0);
