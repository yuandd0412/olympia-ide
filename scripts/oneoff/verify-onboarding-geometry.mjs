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
 *
 * 每个场景：独立 profile + 独立 CDP 端口 + 独立产品进程，收尾按 --user-data-dir
 * 特征反查进程并确认归零。
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
const BASE_PORT = Number(arg('--port', 9251));
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = arg('--out', path.join(os.tmpdir(), 'olympia-geometry-' + STAMP));
const ONLY_SCENARIO = arg('--scenario', '');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function httpJson(url) { return (await fetch(url)).json(); }

// ---------------------------------------------------------------------------
// 判据阈值（集中在这里，方便对着上面的推导改）
// ---------------------------------------------------------------------------
const TH = {
	coverageFull: 0.985,   // 收尾时洞要覆盖整个画布
	cornerClear: 0.99,     // 四角透明比
	monoTolerance: 0.02,   // 覆盖率允许的微小回退（采样噪声量级）
	maxRate: 30,           // 单步覆盖率变化率上限（/s），自然峰值 ~10.4/s
	firstRiseMin: 1.2,     // 洞第一次透出的时刻下界（秒，相对点击）
	firstRiseMax: 2.4      // 上界
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

async function findPageTarget(port) {
	for (let i = 0; i < 240; i++) {
		try {
			const list = await httpJson(`http://127.0.0.1:${port}/json/list`);
			const pages = list.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
			if (pages.length) {
				return pages.find(p => !/devtools|about:blank/i.test(p.url)) || pages[0];
			}
		} catch { /* 还没起来 */ }
		await sleep(500);
	}
	throw new Error('等不到 CDP 页面目标');
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
// 触发进入动画：走完 4 张卡（3 次「下一步」+ 1 次「开始做题」）
// ---------------------------------------------------------------------------
async function triggerEnter(cdp) {
	for (let i = 0; i < 3; i++) {
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

function judge(id, desc, ok, detail) {
	results.push({ id, desc, ok, detail });
	if (ok) { console.log(`  ✓ ${id} ${desc}`); }
	else { console.log(`  ✗ ${id} ${desc} —— ${detail}`); problems.push(`${id}: ${detail}`); }
}

async function runScenario(name, opts) {
	console.log(`\n################ 场景 ${name} ################`);
	const outDir = path.join(OUT, name);
	fs.mkdirSync(outDir, { recursive: true });
	const profile = path.join(outDir, 'profile');
	const port = BASE_PORT + (opts.portOffset || 0);
	const args = [`--user-data-dir=${profile}`, `--remote-debugging-port=${port}`];
	if (opts.forceDpr) { args.push(`--force-device-scale-factor=${opts.forceDpr}`); }
	const child = spawn(PRODUCT, args, { stdio: 'ignore' });
	console.log('  进程 PID:', child.pid, '| 端口', port);

	let closed = false;
	const cleanup = async () => {
		if (closed) { return; }
		closed = true;
		try { child.kill(); } catch { /* 已退出 */ }
		await sleep(2000);
		try {
			const ps = execFileSync('powershell.exe', ['-NoProfile', '-Command',
				`Get-CimInstance Win32_Process -Filter "Name='Olympia.exe'" | Where-Object { $_.CommandLine -like '*${profile}*' } | ForEach-Object { $_.ProcessId }`],
				{ encoding: 'utf8' });
			const pids = ps.split(/\r?\n/).map(s => parseInt(s.trim(), 10)).filter(n => n > 0);
			for (const pid of pids) { try { process.kill(pid); } catch { /* ignore */ } }
			console.log(`  清理了 ${pids.length} 个残留进程（按 --user-data-dir 特征反查）`);
		} catch { /* ignore */ }
	};

	let cdp; let ws;
	try {
		const target = await findPageTarget(port);
		ws = new WebSocket(target.webSocketDebuggerUrl);
		await new Promise((res, rej) => {
			ws.addEventListener('open', res, { once: true });
			ws.addEventListener('error', rej, { once: true });
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

if (!fs.existsSync(PRODUCT)) {
	console.error('产品不存在：' + PRODUCT);
	console.error('先跑 build/oss-package.ps1 出包。');
	process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const SCENARIOS = [
	{ name: 'narrow', viewport: [480, 900], dpr: 1, portOffset: 0 },
	{ name: 'flat', viewport: [1400, 300], dpr: 1, portOffset: 1 },
	{ name: 'hidpi', viewport: [900, 900], dpr: 2, forceDpr: 2, portOffset: 2 },
	{ name: 'resize-mid', viewport: [1100, 800], dpr: 1, portOffset: 3, resizeAtMs: 1700, resizeTo: [900, 640] },
	{ name: 'resize-late', viewport: [1100, 800], dpr: 1, portOffset: 4, resizeAtMs: 3200, resizeTo: [820, 900] }
];

for (const sc of SCENARIOS) {
	if (ONLY_SCENARIO && sc.name !== ONLY_SCENARIO) { continue; }
	try {
		await runScenario(sc.name, sc);
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
	console.log(`  ${r.ok ? '✓' : '✗'} ${r.id} ${r.desc}${r.ok ? '' : ' —— ' + r.detail}`);
}
console.log(problems.length ? `\n有 ${problems.length} 条几何判据没过` : '\n窗口几何全过 ✓');
console.log('报告:', path.join(OUT, 'geometry-report.json'));
process.exit(problems.length ? 1 : 0);
