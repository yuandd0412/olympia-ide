/**
 * 进入动画抓帧：把 5.4 秒的「无介绍进入动画」逐帧抓下来，拼成联系表供目视审阅。
 *
 * ## 为什么需要这个脚本
 *
 * 现有的真机门（verify-onboarding-no-break.mjs）只抓**两张**全屏图：
 * 卡片阶段一张、结束阶段一张。两张图之间的 5.4 秒**没有任何人看过** ——
 * 闪点、暗角、波前剥离、五道通电扫光的中间帧，全是盲区。
 * 而这 5.4 秒恰恰是用户第一眼会盯着看的部分（「不要介绍，但要好看」）。
 *
 * 所以这里补上第三种证据：**逐帧**。
 *
 * ## 帧时序从哪来
 *
 * 不用「按固定间隔轮询截图」—— 那会把每帧的时间戳染上截图延迟（~100ms），
 * 对着一个只有 480ms 宽的闪点窗口来说，误差比窗口本身还大。
 *
 * 用 CDP 的 `Page.startScreencast`：浏览器**自己**在每次 paint 时推一帧过来，
 * `metadata.timestamp` 是浏览器的帧时间戳，误差在帧间隔量级。
 * （截不出来时退化成轮询 `Page.captureScreenshot`，并在报告里标出来。）
 *
 * ## 每帧的动画时间 t 从哪来
 *
 * 时间线（olympiaOnboardingTimeline.ts）是纯函数，所以「某个 t 下各元素应该长什么样」
 * 是可以算出来的。反过来，看一眼 DOM 里那些**内联样式**（暗角 opacity、五道扫光的 opacity、
 * 光核的 scale/opacity、闪点的 opacity），就能反解出 t。
 *
 * 内联样式而不是 computed style：这些元素上如果挂了 CSS transition，
 * computed style 会是被过渡插值过的中间值，反解出来的 t 会偏。
 *
 * 这个脚本**从时间线源文件里解析常量**（不复制数字），时间线改了这里跟着改，
 * 不会出现「脚本按旧常量算、页面按新常量画」的对不上。
 *
 * 用法：
 *   node scripts/oneoff/capture-onboarding-frames.mjs \
 *     --product <产品目录> --port 9225 --path normal --out <输出目录>
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, downscale, contactSheet } from './lib/png.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

const PRODUCT_DIR = arg('--product', path.join(repoRoot, 'VSCode-win32-x64'));
const PRODUCT = path.join(PRODUCT_DIR, 'Olympia.exe');
const CDP_PORT = Number(arg('--port', 9225));
const PATH_KIND = arg('--path', 'normal');
const DURATION_MS = Number(arg('--duration', 6800));
const SHEET_COLS = Number(arg('--cols', 6));
const SHEET_INTERVAL_MS = Number(arg('--interval', 220));
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = arg('--out', path.join(os.tmpdir(), 'olympia-frames-' + STAMP));
const PROFILE = path.join(OUT, 'profile');

if (!['normal', 'skip'].includes(PATH_KIND)) {
	console.error('用法：node capture-onboarding-frames.mjs [--product <目录>] [--port N] [--path normal|skip] [--out <目录>]');
	process.exit(2);
}

// ---------------------------------------------------------------- 时间线常量（从源文件解析）

const TIMELINE_SRC = path.join(repoRoot, 'oss', 'src', 'vs', 'workbench', 'contrib', 'olympia', 'browser', 'olympiaOnboardingTimeline.ts');

function readTimeline() {
	const src = fs.readFileSync(TIMELINE_SRC, 'utf8');
	const num = (name) => {
		const m = new RegExp('export\\s+const\\s+' + name + '\\s*=\\s*([0-9.]+)').exec(src);
		if (!m) { throw new Error('时间线里找不到常量 ' + name); }
		return Number(m[1]);
	};
	/** 取某个 `const xxx = ` 之后第一次出现的字面量区间。 */
	const lit = (marker, fn) => {
		const i = src.indexOf(marker);
		if (i < 0) { throw new Error('时间线里找不到 ' + marker); }
		const m = new RegExp(fn + '\\(t,\\s*([0-9.]+),\\s*([0-9.]+)\\)').exec(src.slice(i));
		if (!m) { throw new Error('时间线里 ' + marker + ' 之后的字面量区间解析失败'); }
		return { a: Number(m[1]), b: Number(m[2]) };
	};
	const sweepBlock = /export const OLYMPIA_ONBOARDING_SWEEPS[\s\S]*?\[([\s\S]*?)\];/.exec(src);
	if (!sweepBlock) { throw new Error('时间线里找不到 OLYMPIA_ONBOARDING_SWEEPS'); }
	const sweeps = [...sweepBlock[1].matchAll(/id:\s*'([a-z]+)',\s*start:\s*([0-9.]+),\s*end:\s*([0-9.]+)/g)]
		.map(m => ({ id: m[1], start: Number(m[2]), end: Number(m[3]) }));
	if (sweeps.length !== 5) { throw new Error('扫光的数量不是 5，实际 ' + sweeps.length); }
	return {
		vignetteRiseStart: num('OLYMPIA_ONBOARDING_VIGNETTE_RISE_START'),
		vignetteRiseEnd: num('OLYMPIA_ONBOARDING_VIGNETTE_RISE_END'),
		vignetteFallStart: num('OLYMPIA_ONBOARDING_VIGNETTE_FALL_START'),
		vignetteFallEnd: num('OLYMPIA_ONBOARDING_VIGNETTE_FALL_END'),
		vignettePeak: num('OLYMPIA_ONBOARDING_VIGNETTE_PEAK'),
		revealStart: num('OLYMPIA_ONBOARDING_REVEAL_START'),
		revealEnd: num('OLYMPIA_ONBOARDING_REVEAL_END'),
		duration: num('OLYMPIA_ONBOARDING_ENTER_DURATION'),
		grow: lit('const grow = ', 'olympiaOnboardingSegment'),
		coreFade: lit('const coreFade = ', 'olympiaOnboardingSegment'),
		flashProgress: lit('const flashProgress = ', 'olympiaOnboardingSegment'),
		flashEnvelope: lit('const flash = ', 'olympiaOnboardingEnvelope'),
		sweeps
	};
}

const TL = readTimeline();

const seg = (x, from, to) => Math.min(1, Math.max(0, (x - from) / (to - from)));
const env = (x, from, to) => Math.sin(seg(x, from, to) * Math.PI);

/** 复刻时间线在 t 时刻的**可观测量**（就是 DOM 里那些内联样式）。 */
function observables(t) {
	const grow = seg(t, TL.grow.a, TL.grow.b);
	const flash = env(t, TL.flashEnvelope.a, TL.flashEnvelope.b);
	const coreFade = 1 - seg(t, TL.coreFade.a, TL.coreFade.b);
	const coreScale = (1 - Math.pow(1 - grow, 3)) * (1 + flash * 1.35) * 5.5;
	const coreOpacity = Math.min(1, Math.max(0, grow * 1.25)) * coreFade;
	const fp = seg(t, TL.flashProgress.a, TL.flashProgress.b);
	const flashOpacity = (fp > 0 && fp < 1) ? Math.sin(fp * Math.PI) * 0.32 : 0;
	const vignette = seg(t, TL.vignetteRiseStart, TL.vignetteRiseEnd) * TL.vignettePeak
		* (1 - seg(t, TL.vignetteFallStart, TL.vignetteFallEnd));
	const sweepOps = TL.sweeps.map(s => {
		const active = t >= s.start && t <= s.end;
		return active ? Math.sin(seg(t, s.start, s.end) * Math.PI) * 0.95 : 0;
	});
	return [vignette, coreOpacity, coreScale, flashOpacity, ...sweepOps];
}

/**
 * 从可观测量反解 t（最小二乘，暴力扫描）。
 *
 * 时间线是纯函数 ⇒ 可观测量是 t 的函数 ⇒ 可以反解。
 * 暴力扫描而不是解析求解：时间线将来会加可观测量，加解析解就意味着要重写求解器。
 */
function solveT(observed) {
	if (!observed || observed.some(v => !Number.isFinite(v))) { return null; }
	const allZero = observed.every(v => Math.abs(v) < 1e-9);
	if (allZero) { return { t: null, err: 0, ambiguous: true }; }
	let best = null;
	for (let t = -0.20; t <= TL.duration + 0.80; t += 0.002) {
		const pred = observables(t);
		let sse = 0;
		for (let i = 0; i < observed.length; i++) {
			const d = observed[i] - pred[i];
			sse += d * d;
		}
		if (!best || sse < best.sse) { best = { t, sse }; }
	}
	return { t: best.t, err: Math.sqrt(best.sse / observed.length), ambiguous: false };
}

// ---------------------------------------------------------------- PNG 度量

const lumaOf = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b);

/** 把画面切块，返回每块平均亮度。 */
function blockLuma(img, gridX = 8, gridY = 5) {
	const { w, h, pixels } = img;
	const out = [];
	for (let gy = 0; gy < gridY; gy++) {
		for (let gx = 0; gx < gridX; gx++) {
			const x0 = Math.floor(gx * w / gridX), x1 = Math.floor((gx + 1) * w / gridX);
			const y0 = Math.floor(gy * h / gridY), y1 = Math.floor((gy + 1) * h / gridY);
			let sum = 0, n = 0;
			for (let y = y0; y < y1; y += 2) {
				for (let x = x0; x < x1; x += 2) {
					const d = (y * w + x) * 4;
					sum += lumaOf(pixels[d], pixels[d + 1], pixels[d + 2]);
					n++;
				}
			}
			out.push(sum / n);
		}
	}
	return out;
}

// ---------------------------------------------------------------- CDP 客户端

class CDP {
	constructor(ws) {
		this.ws = ws;
		this.id = 0;
		this.pending = new Map();
		this.handlers = new Map();
		this.consoleErrors = [];
		ws.addEventListener('message', (ev) => {
			const msg = JSON.parse(ev.data);
			if (msg.id !== undefined) {
				const p = this.pending.get(msg.id);
				if (p) {
					this.pending.delete(msg.id);
					msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
				}
				return;
			}
			const h = this.handlers.get(msg.method);
			if (h) { h(msg.params); }
			if (msg.method === 'Runtime.exceptionThrown') {
				this.consoleErrors.push('exception: ' + (msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text));
			} else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
				this.consoleErrors.push('console.error: ' + msg.params.args.map(a => a.value ?? a.description ?? '').join(' '));
			}
		});
	}
	on(method, fn) { this.handlers.set(method, fn); }
	send(method, params = {}) {
		const id = ++this.id;
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.ws.send(JSON.stringify({ id, method, params }));
			setTimeout(() => {
				if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(method + ' 超时')); }
			}, 30000);
		});
	}
	async eval(expression) {
		const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
		if (r.exceptionDetails) {
			throw new Error('eval 抛错: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
		}
		return r.result.value;
	}
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function httpJson(url) { return (await fetch(url)).json(); }

async function findPageTarget(port) {
	for (let i = 0; i < 160; i++) {
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

// ---------------------------------------------------------------- DOM 探针

/**
 * 一次取齐所有可观测量 + 画布 alpha。
 *
 * 用内联样式（el.style.xxx）而不是 getComputedStyle：
 * 这些元素上如果挂了 CSS transition，computed style 是被插值过的中间值，
 * 拿它反解 t 会偏。
 */
const PROBE = `(() => {
	const num = (el, prop) => {
		if (!el) { return null; }
		const v = parseFloat(el.style[prop]);
		return Number.isFinite(v) ? v : null;
	};
	const canvas = document.querySelector('.olympia-onboarding-canvas');
	let centerAlpha = null, cornerAlpha = null;
	if (canvas) {
		try {
			const ctx = canvas.getContext('2d');
			centerAlpha = ctx.getImageData(Math.floor(canvas.width/2), Math.floor(canvas.height/2), 1, 1).data[3];
			cornerAlpha = ctx.getImageData(2, 2, 1, 1).data[3];
		} catch (e) { centerAlpha = 'err'; }
	}
	const core = document.querySelector('.olympia-onboarding-core');
	const flash = document.querySelector('.olympia-onboarding-flash');
	const vig = document.querySelector('.olympia-onboarding-vignette');
	const sweeps = [...document.querySelectorAll('.olympia-onboarding-sweep')];
	let coreScale = null;
	if (core) {
		const m = /scale\\(([0-9.]+)\\)/.exec(core.style.transform || '');
		coreScale = m ? Number(m[1]) : null;
	}
	const cards = [...document.querySelectorAll('.olympia-onboarding-card')];
	// 光带的**真实几何**。像素分析必须知道光带此刻到底在哪一段，
	// 否则「区域里最亮的一列」测的是内容（标题栏文字、图标、列表项）而不是光带。
	const sweepRects = sweeps.map(s => {
		const r = s.getBoundingClientRect();
		return {
			x: r.left, y: r.top, w: r.width, h: r.height,
			opacity: num(s, 'opacity'),
			horizontal: s.classList.contains('horizontal')
		};
	});
	// 真实部件矩形（workbench.ts 的 createPart 给的是 class="part" + id）。
	const parts = [...document.querySelectorAll('.part')].map(el => {
		const r = el.getBoundingClientRect();
		return { id: el.id || '', cls: el.className || '', x: r.left, y: r.top, w: r.width, h: r.height };
	});
	const titlebar = document.querySelector('.titlebar');
	if (titlebar) {
		const r = titlebar.getBoundingClientRect();
		parts.push({ id: 'titlebar', cls: 'titlebar', x: r.left, y: r.top, w: r.width, h: r.height });
	}
	return {
		centerAlpha, cornerAlpha,
		vignette: num(vig, 'opacity'),
		coreOpacity: num(core, 'opacity'),
		coreScale,
		flashOpacity: num(flash, 'opacity'),
		sweepOps: sweeps.map(s => num(s, 'opacity')),
		sweepRects,
		parts,
		vp: { w: window.innerWidth, h: window.innerHeight },
		entering: !!document.querySelector('.olympia-onboarding-entering'),
		overlay: !!document.querySelector('.olympia-onboarding'),
		workbench: !!document.querySelector('.monaco-workbench'),
		cardOpacities: cards.map(c => parseFloat(c.style.opacity || '1'))
	};
})()`;

// ---------------------------------------------------------------- 主流程

const report = { startedAt: new Date().toISOString(), product: PRODUCT, path: PATH_KIND, out: OUT };
const problems = [];

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PROFILE, { recursive: true });

console.log('=== 启动打包产物（全新 profile）===');
console.log('  产品   :', PRODUCT);
console.log('  profile:', PROFILE);
console.log('  输出   :', OUT);

const child = spawn(PRODUCT, [
	`--user-data-dir=${PROFILE}`,
	`--remote-debugging-port=${CDP_PORT}`
], { stdio: 'ignore' });
console.log('  进程 PID:', child.pid);

let cdp;
let closed = false;
const cleanup = async () => {
	if (closed) { return; }
	closed = true;
	try { await cdp?.send('Browser.close'); } catch { /* ignore */ }
	try { child.kill(); } catch { /* ignore */ }
	await sleep(1500);
	try {
		const ps = execFileSync('powershell.exe', ['-NoProfile', '-Command',
			`Get-CimInstance Win32_Process -Filter "Name='Olympia.exe'" | Where-Object { $_.CommandLine -like '*${PROFILE}*' } | ForEach-Object { $_.ProcessId }`],
			{ encoding: 'utf8' });
		const pids = ps.split(/\r?\n/).map(s => parseInt(s.trim(), 10)).filter(n => n > 0);
		for (const pid of pids) { try { process.kill(pid); } catch { /* ignore */ } }
		if (pids.length) { console.log(`  清理了 ${pids.length} 个残留进程`); }
	} catch { /* ignore */ }
};

try {
	const target = await findPageTarget(CDP_PORT);
	const ws = new WebSocket(target.webSocketDebuggerUrl);
	await new Promise((res, rej) => {
		ws.addEventListener('open', res, { once: true });
		ws.addEventListener('error', rej, { once: true });
	});
	cdp = new CDP(ws);
	await cdp.send('Runtime.enable');
	await cdp.send('Page.enable');
	const vp = await cdp.eval('({ w: window.innerWidth, h: window.innerHeight })');
	console.log('  视口:', JSON.stringify(vp));

	console.log('\n=== 等待引导出现 ===');
	let appeared = false;
	for (let i = 0; i < 200; i++) {
		if (await cdp.eval("!!document.querySelector('.olympia-onboarding')")) { appeared = true; break; }
		await sleep(250);
	}
	if (!appeared) { throw new Error('引导 overlay 从未出现'); }
	console.log('  ✓ overlay 出现');
	await sleep(3000);

	// ---- 抓帧方式探测：screencast 优先，截不出来就退化成轮询
	const frames = [];
	let mode = 'screencast';
	cdp.on('Page.screencastFrame', (p) => {
		frames.push({ ts: p.metadata.timestamp, data: p.data });
		cdp.send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => { });
	});
	try {
		await cdp.send('Page.startScreencast', {
			format: 'png',
			maxWidth: Math.min(2000, Math.round(vp.w * 1.35)),
			maxHeight: Math.min(1400, Math.round(vp.h * 1.35)),
			everyNthFrame: 1
		});
	} catch (e) {
		mode = 'poll';
		console.log('  screencast 启动失败，退化为轮询截图:', e.message);
	}
	await sleep(900);
	if (frames.length === 0) {
		mode = 'poll';
		try { await cdp.send('Page.stopScreencast'); } catch { /* ignore */ }
		console.log('  screencast 截不到帧，退化为轮询截图');
	} else {
		console.log(`  screencast 可用（探测到 ${frames.length} 帧）`);
	}
	report.captureMode = mode;

	// ---- 触发进入动画
	console.log('\n=== 触发进入动画 ===');
	if (PATH_KIND === 'skip') {
		const ok = await cdp.eval(`(() => {
			const b = document.querySelector('.olympia-onboarding-skip');
			if (!b) { return false; }
			b.click();
			return true;
		})()`);
		if (!ok) { throw new Error('点不到「跳过引导」按钮'); }
		console.log('  已点击「跳过引导」');
	} else {
		const ACTIVE_CARD = `(() => {
			const cards = [...document.querySelectorAll('.olympia-onboarding-card')];
			return cards.find(c => c.style.pointerEvents === 'auto') || cards[0] || null;
		})()`;
		for (let step = 0; step < 3; step++) {
			const ok = await cdp.eval(`(() => {
				const card = ${ACTIVE_CARD};
				if (!card) { return false; }
				const b = card.querySelector('.olympia-onboarding-cta');
				if (!b) { return false; }
				b.click();
				return true;
			})()`);
			if (!ok) { throw new Error('点不到当前卡的 CTA'); }
			await sleep(900);
		}
		const label = await cdp.eval(`(() => {
			const card = ${ACTIVE_CARD};
			const b = card ? card.querySelector('.olympia-onboarding-cta') : null;
			return b ? b.innerText.trim() : null;
		})()`);
		console.log('  最后一张卡 CTA:', JSON.stringify(label));
		if (label !== '开始做题') { problems.push('第 4 张卡 CTA 不是「开始做题」，实际 ' + JSON.stringify(label)); }
		const started = await cdp.eval(`(() => {
			const card = ${ACTIVE_CARD};
			const b = card ? card.querySelector('.olympia-onboarding-cta') : null;
			if (!b) { return null; }
			b.click();
			return b.innerText.trim();
		})()`);
		console.log('  已点击:', JSON.stringify(started));
	}
	const triggerWall = Date.now();
	report.triggeredAt = new Date().toISOString();

	// ---- 采样窗口：帧 + DOM 时间线
	console.log('\n=== 采样进入动画 ===');
	const domTimeline = [];
	let polling = false;
	const poll = async () => {
		if (polling) { return; }
		polling = true;
		try {
			const s = await cdp.eval(PROBE);
			domTimeline.push({ wall: Date.now(), ...s });
		} catch { /* ignore */ }
		polling = false;
	};
	await poll();

	const t0 = Date.now();
	while (Date.now() - t0 < DURATION_MS) {
		if (mode === 'poll') {
			try {
				const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
				frames.push({ ts: Date.now() / 1000, wall: Date.now(), data: shot.data, polled: true });
			} catch { /* ignore */ }
		}
		await poll();
		await sleep(mode === 'poll' ? 0 : 40);
	}
	try { await cdp.send('Page.stopScreencast'); } catch { /* ignore */ }
	await poll();
	console.log(`  抓到 ${frames.length} 帧，DOM 采样 ${domTimeline.length} 次`);

	// ---- 反解每帧的动画时间 t
	//
	// 先用「能解出 t 的帧」估计动画原点（wall - t 的中位数），
	// 再用原点补上「观测量全 0、解不出 t」的那几帧（t < 0.18 的卡片消散段）。
	const observationsOf = (s) => s && [s.vignette, s.coreOpacity, s.coreScale, s.flashOpacity, ...(s.sweepOps || [])];
	const solved = domTimeline.map(s => {
		const obs = observationsOf(s);
		const r = solveT(obs);
		return { wall: s.wall, t: r ? r.t : null, err: r ? r.err : null, ambiguous: r ? r.ambiguous : true, state: s };
	});
	const anchored = solved.filter(x => x.t !== null && !x.ambiguous);
	let origin = null;
	if (anchored.length >= 3) {
		const diffs = anchored.map(x => x.wall - x.t * 1000).sort((a, b) => a - b);
		origin = diffs[Math.floor(diffs.length / 2)];
	}
	report.originMs = origin;
	report.triggerWall = triggerWall;
	console.log('  触发时刻（epoch ms）:', triggerWall);
	console.log('  动画 t=0 时刻（epoch ms）:', origin === null ? '解不出' : Math.round(origin));
	console.log('  触发 → 动画 t=0 的延迟:', origin === null ? '解不出' : Math.round(origin - triggerWall) + 'ms');
	console.log('  反解样本（t / 残差）：', anchored.slice(0, 8).map(x => `${x.t.toFixed(3)}/${x.err === null ? '?' : x.err.toFixed(4)}`).join('  '));

	// 帧时间戳：screencast 的 metadata.timestamp **就是 epoch 秒**（Chromium 的
	// ScreencastFrameMetadata.timestamp 是 Network.TimeSinceEpoch），所以可以直接
	// 和 DOM 采样的 Date.now() 对齐。
	//
	// 早先这里把 frames[0].ts 当成「相对起点」再和 origin 相加，等于把时间轴整体
	// 平移了 —— 帧标签全错，看起来像「动画比设计慢 4 秒」。踩过，别再改回去。
	const framesInWindow = frames.filter(f => (f.ts * 1000) >= triggerWall - 120);
	console.log(`  触发后帧数: ${framesInWindow.length} / ${frames.length}`);
	const frameTimes = framesInWindow.map(f => f.ts * 1000);
	const triggerRelative = framesInWindow.map(f => f.ts * 1000 - triggerWall);

	// 每帧的 t：优先用「帧时刻对应的 DOM 采样」解出来的 t
	const nearestState = (wall) => {
		let best = null, bestD = Infinity;
		for (const s of solved) {
			const d = Math.abs(s.wall - wall);
			if (d < bestD) { bestD = d; best = s; }
		}
		return best;
	};

	const annotated = framesInWindow.map((f, i) => {
		const wall = mode === 'screencast' ? f.ts * 1000 : (f.wall ?? Date.now());
		const near = nearestState(wall);
		return {
			index: i,
			wall,
			sinceTrigger: triggerRelative[i],
			t: near ? near.t : null,
			err: near ? near.err : null,
			data: f.data
		};
	});

	// ---- 落盘：逐帧 PNG + 联系表
	console.log('\n=== 落盘 ===');
	const sheetTiles = [];
	const saved = [];
	const SAVE_EVERY = Number(arg('--save-every', 120));
	let nextSheetAt = -1;
	let lastSavedAt = -1e9;
	for (const fr of annotated) {
		let img;
		try { img = decodePng(Buffer.from(fr.data, 'base64')); } catch { continue; }
		const t = fr.t !== null ? fr.t : (origin === null ? null : (fr.wall - origin) / 1000);
		const luma = blockLuma(img);
		const entry = {
			index: fr.index,
			t: t === null ? null : Math.round(t * 1000) / 1000,
			sinceTrigger: Math.round(fr.sinceTrigger),
			solveErr: fr.err === null ? null : Math.round(fr.err * 10000) / 10000,
			minBlockLuma: Math.round(Math.min(...luma)),
			meanBlockLuma: Math.round(luma.reduce((a, b) => a + b, 0) / luma.length),
			w: img.w, h: img.h,
			png: null
		};
		// 全屏 PNG 落盘按最小间隔抽稀：6.8 秒 85fps 会落 577 张、几百 MB，
		// 而真正要人看的只是几十张。联系表用的格子另外单独存。
		if (fr.sinceTrigger - lastSavedAt >= SAVE_EVERY) {
			lastSavedAt = fr.sinceTrigger;
			const name = `frame-${String(fr.index).padStart(3, '0')}-t${entry.t === null ? '----' : String(Math.round(entry.t * 1000)).padStart(5, '0')}.png`;
			fs.writeFileSync(path.join(OUT, name), Buffer.from(fr.data, 'base64'));
			entry.png = name;
		}
		saved.push(entry);
		const tMs = entry.t === null ? null : entry.t * 1000;
		if (tMs !== null && tMs >= nextSheetAt) {
			nextSheetAt = tMs + SHEET_INTERVAL_MS;
			const small = downscale(img, 460, Math.round(460 * img.h / img.w));
			sheetTiles.push({ rgb: small.rgb, w: small.w, h: small.h, label: entry.t === null ? '?' : entry.t.toFixed(2) + 's' });
		}
	}
	console.log(`  帧总数: ${saved.length}，落盘 PNG: ${saved.filter(s => s.png).length} 张`);

	if (sheetTiles.length) {
		const sheet = contactSheet(sheetTiles, SHEET_COLS);
		const sheetPath = path.join(OUT, 'contact-sheet.png');
		fs.writeFileSync(sheetPath, encodePng(sheet.w, sheet.h, sheet.rgb));
		console.log(`  联系表: ${sheetPath}  (${sheet.w}x${sheet.h}, ${sheetTiles.length} 格)`);
		report.contactSheet = sheetPath;
	}

	// ---- 量化结论
	//
	// 洞擦开之后，整幅画面**任何一块**都不能是近黑的 —— 那就是黑帧断点。
	// 现有真机门只看中心裁剪区；这里看整幅 8x5 分块，能抓到「边角发黑」这类问题。
	const afterHole = saved.filter(s => s.t !== null && s.t > TL.revealEnd);
	const dark = afterHole.filter(s => s.minBlockLuma < 18);
	console.log('\n=== 量化 ===');
	console.log(`  洞擦净（t>${TL.revealEnd}s）之后的帧: ${afterHole.length}`);
	if (afterHole.length) {
		console.log(`  最小分块亮度: ${Math.min(...afterHole.map(s => s.minBlockLuma))}`);
	}
	if (dark.length) {
		problems.push(`洞擦净后有 ${dark.length} 帧存在近黑分块（最小 ${Math.min(...dark.map(s => s.minBlockLuma))}）—— 断点`);
		dark.slice(0, 12).forEach(d => console.log(`    ✗ t=${d.t}s 最小分块亮度 ${d.minBlockLuma}`));
	} else {
		console.log('  ✓ 没有近黑分块');
	}

	// 洞的单调性：t 增大时中心 alpha 不得回升（洞只会变大）
	const alphaSeries = domTimeline.filter(s => typeof s.centerAlpha === 'number');
	let alphaUp = 0;
	for (let i = 1; i < alphaSeries.length; i++) {
		if (alphaSeries[i].centerAlpha > alphaSeries[i - 1].centerAlpha + 2) { alphaUp++; }
	}
	console.log('  洞 alpha 回升次数:', alphaUp);
	if (alphaUp > 0) { problems.push(`洞的 alpha 回升 ${alphaUp} 次 —— 洞在缩小，画面会闪`); }

	report.frames = saved;
	report.domTimeline = domTimeline.map(s => ({
		wall: s.wall,
		t: (origin === null ? null : Math.round((s.wall - origin) / 10) / 100),
		centerAlpha: s.centerAlpha,
		cornerAlpha: s.cornerAlpha,
		vignette: s.vignette,
		coreOpacity: s.coreOpacity,
		flashOpacity: s.flashOpacity,
		sweepOps: s.sweepOps,
		sweepRects: s.sweepRects,
		parts: s.parts,
		vp: s.vp,
		entering: s.entering,
		workbench: s.workbench
	}));
	report.consoleErrors = cdp.consoleErrors;
	console.log('\n=== 控制台错误 ===');
	if (cdp.consoleErrors.length) {
		cdp.consoleErrors.forEach(e => console.log('  ✗ ' + String(e).slice(0, 300)));
		problems.push('控制台有 ' + cdp.consoleErrors.length + ' 条 error');
	} else {
		console.log('  （无）');
	}
} catch (e) {
	problems.push('抓帧过程异常: ' + e.message);
	console.error('  异常:', e.message);
} finally {
	await cleanup();
	report.problems = problems;
	report.ok = problems.length === 0;
	fs.writeFileSync(path.join(OUT, 'frames-report.json'), JSON.stringify(report, null, 2));
	console.log('\n================ 结论 ================');
	if (problems.length === 0) {
		console.log('全过 ✓');
	} else {
		console.log('问题 ' + problems.length + ' 条：');
		problems.forEach(p => console.log('  ✗ ' + p));
	}
	console.log('输出目录:', OUT);
	process.exit(problems.length ? 1 : 0);
}
