#!/usr/bin/env node
/*
 * measure-card-geometry.mjs —— 真机实测「开始引导卡片」的内部竖向几何
 *
 * 用途：给「矮窗口下选择列表几何可行域」的推导提供**真实数字**。
 *   它只测量、只打印，**不做任何判定**（判定归 verify-onboarding-geometry.mjs）。
 *
 * 用法：
 *   node scripts/oneoff/measure-card-geometry.mjs [--product <产品目录>] [--port 9271]
 *                                                    [--out <文件.json>]
 *                                                    [--widths 1280,1000,900,480,400]
 *                                                    [--heights 270,320,340,...]
 *                                                    [--dprs 1,2]
 *
 * 退出码契约（**没有「部分成功」这条路**）：
 *   0 = 每一个档位（宽 × 高 × dpr）都测到了；
 *   2 = 前置条件不满足（连不上 / 引导没出现 / 找不到产品），
 *       **或** 有任何一个档位没测成（视口没生效、页面里没卡片、求值异常）。
 *   1 本脚本不用 —— 它不判定，所以不存在「判出来是红」。
 *   为什么「有档位失败」也算 2：调用方（final-verify.mjs / 人）看 exit 0 就会以为
 *   数据是全的，缺几档不会报错，推导就会拿残缺样本当全量 —— 这是假绿。
 *   失败清单同时进 JSON 的 failedHeights 字段，便于补跑。
 *
 * ---------------------------------------------------------------------------
 * ## 为什么单独写一个，而不是改 verify-onboarding-geometry.mjs
 *
 * 那个文件是真机门禁，它的判据有严格契约（selftest 钉死），
 * 改它等于改门禁语义。这里要的是**原始测量值**，所以另起一个只读脚本，
 * 两边互不干扰。
 *
 * ## 测什么
 *
 * 卡片竖向排布（flex column）：
 *   轨道高 = min(432px, 100vh - 16px)
 *   卡片内容盒 = 轨道高 - paddingTop - paddingBottom - borderTop - borderBottom
 *   卡片内依次是：标题+描述 header / 未保存标记 / 选择列表 choices（margin-top） / 页脚 footer（margin-top:auto）
 *
 * 选择列表是 `flex: 0 0 auto`（不可伸不可缩）—— 空间不够时它不会被压扁，
 * 而是**整个溢出卡片**，被卡片的 overflow:hidden 裁掉。
 * 所以要同时量到「列表内容自然高」和「实际拿到的高」，两者的差就是溢出量。
 *
 * ## 2026-10-23 三屏改造：预览块与行区退役
 *
 * 旧卡片里有「预览面板（管道图 / 目录树）」和「配置行区」两套块，
 * 量具是「预览内区高 vs 内容高」这一对。两者在新卡片里整块退役，
 * 量具跟着退役 —— 不是改成「必须保持绿」，那等于给一条没人守的事实盖章。
 * 新的量具对象是**选择列表**：容器可见高 / 内容高 / 逐项高度。
 *
 * ## 坐标系：溢出量一律用**屏幕像素（getBoundingClientRect）**算
 *
 *   内区高 = rect(列表) 高 - (paddingTop + paddingBottom + borderTop + borderBottom) × k
 *   内容高 = rect 意义上全部直接子元素的 top 并集到 bottom 并集
 *   溢出   = 内容高 - 内区高
 *
 *   其中 k = rect(列表).height / 列表.offsetHeight，即卡片那层 CSS scale 的实测倍率。
 *   必须乘 k：computed style 给的 padding/border 是**布局像素**，rect 是**变换后的屏幕像素**，
 *   直接相减会把两种单位混在一条式子里（这是旧版的错，T042 复审 Major-6）。
 *   注意 `deviceScaleFactor` 取消不了 CSS scale，所以 k ≠ 1 是常态，不是异常。
 *
 *   offsetHeight / clientHeight / scrollHeight 这些**布局像素**照旧全部保留输出
 *   （它们是核对用的原始事实），但**不参与差值运算**。
 *
 * ## 覆盖范围（以及不覆盖什么）
 *
 *   本脚本只做**静态视口矩阵**：每个 (宽 × 高 × dpr) 组合设一次视口、测一次。
 *   **resize 态不在这里**——引导卡随窗口尺寸变化重排的动态过程（中途 resize、
 *   晚到 resize）由几何门 verify-onboarding-geometry.mjs 的 SCENARIOS 覆盖。
 *   别把本脚本的矩阵当成「resize 也测过了」。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const listArg = (n, d) => {
	const raw = arg(n, d);
	return String(raw).split(',').map(s => parseInt(s.trim(), 10)).filter(x => Number.isFinite(x) && x > 0);
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const PRODUCT_DIR = arg('--product', path.join(repoRoot, 'VSCode-win32-x64'));
const PRODUCT = path.join(PRODUCT_DIR, 'Olympia.exe');
const PORT = Number(arg('--port', 9271));
const OUT = arg('--out', path.join(os.tmpdir(), 'olympia-card-geometry.json'));
// 宽度默认与几何门 SCENARIOS 对表：narrow 480 / flat 1000×(1400) / hidpi 900 / tiny & min-width 400，
// 再加 1280 这个日常宽。少了哪一档，那个档的结论就没人量过。
const WIDTHS = listArg('--widths', arg('--width', '') ? String(arg('--width', '')) : '1280,1400,1000,900,480,400');
const HEIGHTS = listArg('--heights', '270,300,320,340,360,380,385,386,390,400,420,421,440,460,472,500,560,640,720,900,1200');
const DPRS = listArg('--dprs', '1,2');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function httpJson(url, timeoutMs = 5000) {
	// 每次网络交互都必须自带超时：无超时的 fetch 遇到「连上但不回数据」的孤儿套接字时
	// 不是 reject，而是永远不 settle —— 整个脚本就此挂住，什么都不打印。
	return (await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })).json();
}

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
				if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(method + ' 超时')); }
			}, 30000);
		});
	}
	async eval(expr) {
		const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
		if (r.exceptionDetails) {
			throw new Error('页面内求值异常：' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
		}
		return r.result?.value;
	}
}

/**
 * 端口交给 Chromium 自选（--remote-debugging-port=0）。
 *
 * 固定端口段一旦被孤儿套接字占住，Chromium 会**静默拿不到 DevTools 端口**
 * （DevToolsActivePort 文件根本不生成），而脚本还拿着写死的端口去连 →
 * 连上那个「连上但不回数据」的孤儿 → fetch 永远不 settle → 整轮空转。
 * 交给它自己挑就绕开了「端口被占」这个前提。
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

/**
 * 卡片内部几何测量（页面内执行）。
 *
 * 输出里两套数字都留着，但**分工不同**：
 *   - 布局像素（offsetHeight / clientHeight / scrollHeight / computed margin）→ 只作原始事实输出；
 *   - 屏幕像素（getBoundingClientRect）→ 参与溢出差值。
 * 所有可能拿不到数的地方都返回 null，不返回 0：
 *   「测到 0」和「没测到」必须是两个值，否则下游把没测到读成 0 高的窗口。
 */
const MEASURE_EXPR = `(() => {
	const cards = [...document.querySelectorAll('.olympia-onboarding-card')];
	if (!cards.length) { return { missing: true }; }
	// 活动卡 = pointerEvents 为 auto 的那张（配置期只有它可交互）
	const card = cards.find(c => c.style.pointerEvents === 'auto') || cards[0];

	const fin = (v) => { const n = Number.parseFloat(v); return Number.isFinite(n) ? n : null; };
	const num = (el, prop) => fin(getComputedStyle(el)[prop]);
	const pad = (el) => {
		const cs = getComputedStyle(el);
		return { top: fin(cs.paddingTop), bottom: fin(cs.paddingBottom),
			left: fin(cs.paddingLeft), right: fin(cs.paddingRight) };
	};
	const border = (el) => {
		const cs = getComputedStyle(el);
		return { top: fin(cs.borderTopWidth), bottom: fin(cs.borderBottomWidth) };
	};
	// 任一分量拿不到 → 整体 null（绝不拿 0 凑一个看起来像数的值）
	const sum = (...xs) => xs.some(x => x === null || x === undefined || !Number.isFinite(x)) ? null : xs.reduce((a, b) => a + b, 0);
	const sub = (a, ...xs) => {
		if (!Number.isFinite(a) || xs.some(x => x === null || x === undefined || !Number.isFinite(x))) { return null; }
		return a - xs.reduce((acc, b) => acc + b, 0);
	};
	const rect = (el) => { const r = el.getBoundingClientRect(); return { h: fin(r.height), t: fin(r.top), b: fin(r.bottom), w: fin(r.width) }; };

	const track = card.parentElement;
	const csCard = getComputedStyle(card);
	const cardPad = pad(card);
	const cardBorder = border(card);
	const cardBox = rect(card);
	// CSS scale 的实测倍率：屏幕像素 / 布局像素。padding/border 要换算到屏幕像素才可与 rect 相减。
	const scaleK = (card.offsetHeight > 0 && Number.isFinite(cardBox.h)) ? (cardBox.h / card.offsetHeight) : null;

	const list = card.querySelector('.olympia-onboarding-choices');
	const footer = card.querySelector('.olympia-onboarding-card-footer');

	const items = list ? [...list.querySelectorAll('.olympia-onboarding-choice')] : [];

	// 选择列表：可见高与内容高**一律在屏幕像素里**算（见文件头「坐标系」）
	let listInnerLayout = null, listInnerRect = null, listContentRect = null, overflowRect = null;
	let listDisplay = null, listHidden = false;
	const listKids = [];
	if (list) {
		const pPad = pad(list);
		const pBorder = border(list);
		const pRect = rect(list);
		// 列表整块不可见时，它没有「内区」可言：
		// rect.h = 0 但 padding/border 仍是布局值，硬减会得到**负的内区高**，
		// 再拿 0 去减就成了「溢出 N px」的假信号。
		// 这种情况下三个量一律 null —— 不可测 ≠ 测到 0。
		listDisplay = getComputedStyle(list).display;
		listHidden = listDisplay === 'none' || list.offsetHeight === 0;
		listInnerLayout = sub(list.clientHeight, pPad.top, pPad.bottom);
		const inset = sum(pPad.top, pPad.bottom, pBorder.top, pBorder.bottom);
		// pRect.h 已含 border；减掉换算后的 padding+border 即屏幕像素意义的内容盒高
		listInnerRect = (listHidden || inset === null || scaleK === null || !Number.isFinite(pRect.h))
			? null : pRect.h - inset * scaleK;
		const kids = [...list.children].filter(el => {
			const st = getComputedStyle(el);
			if (st.display === 'none' || st.visibility === 'hidden') { return false; }
			const r = el.getBoundingClientRect();
			return Number.isFinite(r.height) && r.height > 0.5;
		});
		for (const el of kids) {
			const r = rect(el);
			listKids.push({ cls: el.className, h: r.h, t: r.t, b: r.b });
		}
		if (listKids.length) {
			const top = Math.min(...listKids.map(k => k.t).filter(v => Number.isFinite(v)));
			const bottom = Math.max(...listKids.map(k => k.b).filter(v => Number.isFinite(v)));
			listContentRect = (Number.isFinite(top) && Number.isFinite(bottom)) ? (bottom - top) : null;
		} else {
			// 可见但没有直接子元素 → 内容高确实是 0；
			// 整块被隐藏 → 不可测，null（别把「看不见」读成「高 0」）。
			listContentRect = listHidden ? null : 0;
		}
		overflowRect = (listContentRect === null || listInnerRect === null) ? null : (listContentRect - listInnerRect);
	}

	const listRect = list ? rect(list) : null;
	const footerRect = footer ? rect(footer) : null;

	return {
		missing: false,
		viewport: { w: fin(window.innerWidth), h: fin(window.innerHeight), dpr: fin(window.devicePixelRatio) },
		track: track ? { h: rect(track).h, layoutH: Number.isFinite(track.offsetHeight) ? track.offsetHeight : null, cssHeight: getComputedStyle(track).height } : null,
		card: {
			offsetH: card.offsetHeight,
			clientH: card.clientHeight,
			scrollH: card.scrollHeight,
			offsetW: card.offsetWidth,
			rectH: cardBox.h,
			scaleK: Number.isFinite(scaleK) ? scaleK : null,
			padding: cardPad,
			border: cardBorder,
			boxSizing: csCard.boxSizing,
			overflow: csCard.overflow,
			// 内容盒高（布局像素，border-box → offsetHeight - padding - border）；任一分量缺失即 null
			contentBoxH: sub(card.offsetHeight, cardPad.top, cardPad.bottom, cardBorder.top, cardBorder.bottom)
		},
		choices: list ? {
			display: listDisplay,
			hidden: listHidden,
			offsetH: list.offsetHeight,
			clientH: list.clientHeight,
			scrollH: list.scrollHeight,
			rectH: Number.isFinite(listRect?.h) ? listRect.h : null,
			marginTop: num(list, 'marginTop'),
			flex: getComputedStyle(list).flex,
			minHeight: getComputedStyle(list).minHeight,
			overflow: getComputedStyle(list).overflow,
			itemCount: items.length,
			itemHeights: items.map(r => Number.isFinite(r.offsetHeight) ? r.offsetHeight : null),
			// 布局像素内区高：仅原始输出，不参与差值
			innerLayoutH: listInnerLayout,
			// 屏幕像素：内区高 / 内容自然高 / 溢出量（同一坐标系相减）
			innerRectH: listInnerRect,
			contentRectH: listContentRect,
			overflowPx: overflowRect,
			kidsCount: listKids.length,
			kids: listKids
		} : null,
		footer: footer ? {
			offsetH: footer.offsetHeight,
			rectH: Number.isFinite(footerRect?.h) ? footerRect.h : null,
			marginTop: num(footer, 'marginTop'),
			flex: getComputedStyle(footer).flex
		} : null
	};
})()`;

/** 视口回读与目标是否在 1px 容差内一致（容差是给亚像素取整留的，不是给「差很多」留的） */
const VP_TOL = 1;
const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= VP_TOL;

async function readViewport(cdp) {
	return await cdp.eval('({ innerWidth: window.innerWidth, innerHeight: window.innerHeight, dpr: window.devicePixelRatio })');
}

/**
 * 设视口，并且**回读确认它真的生效**。
 *
 * 为什么必须回读：Emulation.setDeviceMetricsOverride 在窗口被最小化 / 尺寸超出物理屏 /
 * 窗口约束（最小宽高）拦截时，会「命令成功但视口没变」。不回读就照着「请求的高度」记录数据，
 * 等于把 270 高的样本挂在 900 高的实测上 —— 这是假绿（T042 复审 Blocker-2）。
 *
 * 生效路径：
 *   1) Emulation.setDeviceMetricsOverride，最多试 EMU_RETRY 次；
 *   2) 还不行 → Browser.setWindowBounds 把窗口外框按缺口补一次，再试一轮；
 *   3) 仍不符 → 返回 applied:false，调用方把该档记入 failed（reason: viewport-not-applied），
 *      **不写进 rows**，也不拿近似值凑数。
 */
const EMU_RETRY = 3;
async function setViewport(cdp, w, h, dpr) {
	let last = null;
	for (let attempt = 1; attempt <= EMU_RETRY; attempt++) {
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			width: w, height: h, deviceScaleFactor: dpr, mobile: false
		});
		await sleep(attempt === 1 ? 350 : 600);
		last = await readViewport(cdp);
		if (near(last?.innerWidth, w) && near(last?.innerHeight, h)) {
			return { applied: true, actual: last, attempts: attempt, via: 'emulation' };
		}
	}
	// 兜底：改真实窗口尺寸。窗口外框 ≠ 视口，所以按「缺口」平移补一次，再回读。
	let via = 'window-bounds';
	try {
		const info = await cdp.send('Browser.getWindowForTarget');
		if (info && info.windowId !== undefined && info.bounds) {
			const b = info.bounds;
			const deficitW = (near(last?.innerWidth, w) ? 0 : w - (last?.innerWidth ?? w));
			const deficitH = (near(last?.innerHeight, h) ? 0 : h - (last?.innerHeight ?? h));
			const bounds = {
				left: Number.isFinite(b.left) ? b.left : undefined,
				top: Number.isFinite(b.top) ? b.top : undefined,
				width: Math.max(120, Math.round((Number.isFinite(b.width) ? b.width : 1280) + deficitW)),
				height: Math.max(80, Math.round((Number.isFinite(b.height) ? b.height : 720) + deficitH)),
				windowState: b.windowState && b.windowState !== 'normal' ? 'normal' : undefined
			};
			await cdp.send('Browser.setWindowBounds', { windowId: info.windowId, bounds });
			await sleep(700);
			for (let attempt = 1; attempt <= 2; attempt++) {
				await cdp.send('Emulation.setDeviceMetricsOverride', {
					width: w, height: h, deviceScaleFactor: dpr, mobile: false
				});
				await sleep(500);
				last = await readViewport(cdp);
				if (near(last?.innerWidth, w) && near(last?.innerHeight, h)) {
					return { applied: true, actual: last, attempts: EMU_RETRY + attempt, via };
				}
			}
		}
	} catch (e) {
		via = 'window-bounds-failed:' + (e && e.message ? e.message : String(e));
	}
	return { applied: false, actual: last, attempts: EMU_RETRY, via };
}

/** 打印用的「没测到就是 —」，与几何门的 judge() 口径一致 */
const px = (v) => (typeof v === 'number' && Number.isFinite(v)) ? v.toFixed(0) : '—';
const px1 = (v) => (typeof v === 'number' && Number.isFinite(v)) ? v.toFixed(1) : '—';

(async function main() {
	if (!fs.existsSync(PRODUCT)) {
		console.error('找不到产品：' + PRODUCT);
		process.exit(2);
	}
	const profile = path.join(os.tmpdir(), 'olympia-measure-' + Date.now());
	const child = spawn(PRODUCT, [`--user-data-dir=${profile}`, '--remote-debugging-port=0'], { stdio: 'ignore' });
	console.log('产品 PID=' + child.pid + '  profile=' + profile);

	const cleanup = () => {
		try { child.kill(); } catch { /* 已退出 */ }
		try {
			const ps = execFileSync('powershell.exe', ['-NoProfile', '-Command',
				`$p = $env:OLYMPIA_PROFILE_MARK; Get-CimInstance Win32_Process -Filter "Name='Olympia.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($p) } | ForEach-Object { $_.ProcessId }`],
				{ encoding: 'utf8', env: { ...process.env, OLYMPIA_PROFILE_MARK: profile } });
			const pids = ps.split(/\r?\n/).map(s => parseInt(s.trim(), 10)).filter(n => n > 0);
			for (const pid of pids) { try { process.kill(pid); } catch { /* ignore */ } }
			if (pids.length) { console.log('清理残留进程 ' + pids.length + ' 个'); }
		} catch { /* ignore */ }
		try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
	};
	// Ctrl+C / 任务管理器结束也走同一份清理：不然产品进程留在机器上，
	// 下一次跑会撞上「已有 Olympia 在跑」，或被它干扰采样。
	process.on('exit', cleanup);
	for (const sig of ['SIGINT', 'SIGTERM']) {
		process.on(sig, () => { console.log('\n收到 ' + sig + '，清理后退出'); cleanup(); process.exit(2); });
	}

	let ws;
	const rows = [];
	const failed = [];   // { width, height, dpr, requestedH, actual, reason, detail }
	try {
		const cdpPort = await resolveDevToolsPort(profile);
		console.log('CDP 端口=' + cdpPort + '（Chromium 自选）');
		const target = await findPageTarget(cdpPort);
		ws = new WebSocket(target.webSocketDebuggerUrl);
		await new Promise((res, rej) => {
			const timer = setTimeout(() => rej(new Error('CDP WebSocket 15s 内没连上')), 15000);
			const once = (fn) => (ev) => { clearTimeout(timer); fn(ev); };
			ws.addEventListener('open', once(res), { once: true });
			ws.addEventListener('error', once(rej), { once: true });
		});
		const cdp = new Cdp(ws);
		await cdp.send('Runtime.enable');

		let appeared = false;
		for (let i = 0; i < 180; i++) {
			const has = await cdp.eval(`!!document.querySelector('.olympia-onboarding-canvas')`);
			if (has) { appeared = true; break; }
			await sleep(500);
		}
		if (!appeared) { throw new Error('引导 overlay 没出现'); }

		const total = WIDTHS.length * DPRS.length * HEIGHTS.length;
		console.log('引导已出现，开始测量：宽 ' + WIDTHS.join('/') + ' × dpr ' + DPRS.join('/')
			+ ' × 高 ' + HEIGHTS.length + ' 档 = ' + total + ' 次\n');

		for (const dpr of DPRS) {
			for (const w of WIDTHS) {
				for (const h of HEIGHTS) {
					const tag = 'W=' + String(w).padStart(4) + ' H=' + String(h).padStart(4) + ' dpr=' + dpr;
					// 1) 视口必须回读确认；没生效的档位进 failed，不污染 rows
					let vp;
					try {
						vp = await setViewport(cdp, w, h, dpr);
					} catch (e) {
						failed.push({ width: w, height: h, dpr, reason: 'viewport-set-failed', detail: e && e.message ? e.message : String(e) });
						console.log(tag + ' → 视口设置异常：' + (e && e.message ? e.message : e));
						continue;
					}
					if (!vp.applied) {
						const detail = '请求 ' + w + '×' + h + '，回读 '
							+ (vp.actual ? (vp.actual.innerWidth + '×' + vp.actual.innerHeight) : '读不到')
							+ '（路径 ' + vp.via + '）';
						failed.push({ width: w, height: h, dpr, reason: 'viewport-not-applied', detail, actual: vp.actual });
						console.log(tag + ' → 视口没生效，跳过本档：' + detail);
						continue;
					}
					await sleep(500);
					// 2) 测量本身失败只丢这一档，不丢整轮
					let g;
					try { g = await cdp.eval(MEASURE_EXPR); } catch (e) { g = { missing: true, error: e.message }; }
					if (!g || g.missing) {
						const detail = (g && g.error) || '页面里没有卡片';
						failed.push({ width: w, height: h, dpr, reason: 'measure-failed', detail, actual: vp.actual });
						console.log(tag + ' → 测量失败：' + detail);
						continue;
					}
					// rows 存的是**实测回读到的视口**，不是请求值
					rows.push({ width: w, requestedH: h, dpr, actualW: vp.actual.innerWidth, actualH: vp.actual.innerHeight, via: vp.via, attempts: vp.attempts, g });
					// 3) 打印：任何一格没测到只打 —，不能因为格式化成不了就抛出去
					try {
						const c = g.choices || {};
						const f = g.footer || {};
						const vh = g.viewport.h;
						const band = !Number.isFinite(vh) ? '—' : vh <= 320 ? '≤320' : vh <= 385 ? '≤385' : vh <= 420 ? '≤420' : '默认';
						console.log(
							tag
							+ ' 档=' + String(band).padEnd(4)
							+ ' 轨道=' + px(g.track ? g.track.h : null).padStart(4)
							+ ' k=' + px1(g.card.scaleK).padStart(5)
							+ ' 卡片内容盒=' + px(g.card.contentBoxH).padStart(4)
							+ ' 列表=' + px(c.offsetH).padStart(4) + '(mt' + px(c.marginTop) + ')'
							+ ' 内区屏幕=' + px(c.innerRectH).padStart(4)
							+ ' 内容屏幕=' + px(c.contentRectH).padStart(4)
							+ ' 溢出=' + px1(c.overflowPx).padStart(6)
							+ ' 选项数=' + (Number.isFinite(c.itemCount) ? c.itemCount : '—')
							+ ' 页脚=' + px(f.offsetH).padStart(3) + '(mt' + px(f.marginTop) + ')'
						);
					} catch (e) {
						console.log(tag + ' → 已测到，但控制台行渲染失败（数据仍在 JSON 里）：' + (e && e.message ? e.message : e));
					}
				}
			}
		}

		fs.writeFileSync(OUT, JSON.stringify({
			measuredAt: new Date().toISOString(),
			widths: WIDTHS,
			heights: HEIGHTS,
			dprs: DPRS,
			viewportTolerancePx: VP_TOL,
			rows,
			failedHeights: failed,
			notes: '溢出量 overflowPx 用屏幕像素（rect）单坐标系算；offsetHeight/clientHeight 为布局像素，仅作原始输出。resize 态不在本脚本覆盖范围。三屏改造后量具对象是选择列表（.olympia-onboarding-choices），预览块与行区的量具已退役。'
		}, null, 2), 'utf8');
		console.log('\n原始数据已存：' + OUT + '（成功 ' + rows.length + ' 档，失败 ' + failed.length + ' 档）');

		// 自然高度：取「dpr=1 且最高的那一档」的选择列表内容高（那时空间充足，不会被压缩）。
		// 找不到就不报，绝不拿 null/0 凑一个数出来。
		const tallCandidates = rows.filter(r => r.dpr === 1 && r.g && r.g.choices
			&& Number.isFinite(r.g.choices.contentRectH));
		if (tallCandidates.length) {
			const tall = tallCandidates.reduce((a, b) => (b.actualH > a.actualH ? b : a));
			console.log('\n选择列表内容自然高 ≈ ' + tall.g.choices.contentRectH.toFixed(1)
				+ 'px（取自 W=' + tall.width + ' H=' + tall.actualH + '）');
		} else {
			console.log('\n选择列表内容自然高：没测到（dpr=1 的档位里没有一个拿到内容高）');
		}
		const anyList = rows.find(r => r.g && r.g.choices && Number.isFinite(r.g.choices.itemCount) && r.g.choices.itemCount > 0);
		if (anyList) {
			console.log('选项数 = ' + anyList.g.choices.itemCount + '，选项高 = '
				+ anyList.g.choices.itemHeights.map(v => px(v)).join('/'));
		} else {
			console.log('选项数：没测到');
		}

		// ---- 终局判定：缺档就不是绿 ----
		if (rows.length === 0) {
			console.error('\n没有任何档位测量成功（失败 ' + failed.length + ' 档）');
			process.exitCode = 2;
		} else if (failed.length) {
			console.error('\n有 ' + failed.length + ' 个档位没测成，数据不完整：'
				+ failed.map(f => f.width + '×' + f.height + '@' + f.dpr + '(' + f.reason + ')').join(' '));
			process.exitCode = 2;
		} else {
			process.exitCode = 0;
		}
	} catch (e) {
		console.error('失败：' + (e && e.message ? e.message : e));
		process.exitCode = 2;
	} finally {
		try { if (ws) ws.close(); } catch { /* ignore */ }
		cleanup();
	}
})();
