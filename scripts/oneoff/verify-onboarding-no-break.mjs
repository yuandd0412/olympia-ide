/**
 * 真机验证脚本：Olympia 打包产物的「鸿蒙式开始引导」是否真的全程无断点。
 *
 * ## 为什么解 PNG 而不是读 DOM
 *
 * 「无断点」是**像素级**的命题：任何一帧出现黑屏/半成品工作台/闪烁，用户都看得见。
 * 读 DOM 只能证明元素在，不能证明画面没断。
 * 所以这里用 CDP 抓真实合成画面，自己解 PNG、逐块量亮度。
 *
 * ## 判据
 *
 * 揭示洞是 `destination-out` 擦出来的椭圆洞，只会**变大**。
 * 于是「洞覆盖的亮块数」在时间轴上必须单调不减。
 * 一旦出现回退（亮块变少 / 中心块重新变暗），就是画面断了一帧 —— 断点。
 *
 * 另外：
 *   - 卡片上显示的必须是**真值**（洛谷 / GCC 15.1.0 / C++23 / 真实编译命令）
 *   - 卡片导航要能走通（下一步 → 还有 N 张 → 准备好了就开始）
 *   - 引导结束后必须能看见真实工作台
 *   - 控制台不能有 error
 *
 * 用法：node scripts/oneoff/verify-onboarding-no-break.mjs [--product <产品目录>] [--port 9223] [--path normal|skip|both]
 *
 * 默认跑两条路径（normal / skip），每条用各自全新的 profile 和各自的 CDP 端口，
 * 产物落 os.tmpdir()（仓库根有一堆未跟踪的用户文件，别再往里扔临时物）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

const PORT = Number(arg('--port', 9223));
const PRODUCT_DIR = arg('--product', path.join(repoRoot, 'VSCode-win32-x64'));
const PRODUCT = path.join(PRODUCT_DIR, 'Olympia.exe');
// 产物目录不落在仓库里 —— 仓库根有一堆未跟踪的用户文件，别再往里扔临时物。
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = arg('--out', path.join(os.tmpdir(), 'olympia-verify-' + STAMP));
const CDP_PORT = PORT;

// 验证路径：normal = 走完 4 张卡再开始；skip = 直接点「跳过引导」。
// 两条路径都要跑到同一套像素判据上 —— 用户最先按的很可能就是「跳过」，
// 而「等待期跳过按钮还能不能按」正是这轮修的东西，只测 normal 等于没测。
//
// 'both' 是**编排模式**：本脚本把自己再跑两遍（normal / skip），
// 每遍用各自全新的 profile 和各自的 CDP 端口，最后汇总两条路径的结论。
// 之所以不把两条路径塞进同一个进程：单路径的逻辑（起进程 / 连 CDP / 逐帧采样 /
// 清理残留）已经跑通过好几轮，拆开重排只会把已验证的东西重新弄坏。
const PATH_KIND = arg('--path', 'both');
if (!['normal', 'skip', 'both'].includes(PATH_KIND)) {
	console.error('用法：node verify-onboarding-no-break.mjs [--product <产品目录>] [--port 9223] [--path normal|skip|both]');
	process.exit(2);
}

/**
 * Profile 目录：**每次跑都必须是全新的**。
 *
 * 踩过的坑：早先这里写死 `profile-a`，只是 mkdir 不清内容。首启标记
 * （`olympia.onboarding.completed.v1`）一旦写进这个目录，第二次跑就
 * **不会再显示引导** —— 阶段 A 找不到 overlay，脚本直接判失败，
 * 而真实原因只是「profile 被上一轮污染了」。
 *
 * 所以：
 *   - 默认路径带时间戳 → 天然每次全新；
 *   - 显式 `--profile` 时先把旧目录**整个删掉**再重建 → 也不残留。
 */
const PROFILE_EXPLICIT = has('--profile');
const PROFILE = arg('--profile', path.join(OUT, 'profile-' + new Date().toISOString().replace(/[:.]/g, '-')));

// ---------------------------------------------------------------- PNG 解码

/** 解 8 位真彩 PNG（colorType 2 = RGB，6 = RGBA）。 */
function decodePng(buf) {
	if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('不是 PNG');
	let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
	const idat = [];
	while (off < buf.length) {
		const len = buf.readUInt32BE(off);
		const type = buf.toString('ascii', off + 4, off + 8);
		const data = buf.subarray(off + 8, off + 8 + len);
		if (type === 'IHDR') {
			w = data.readUInt32BE(0); h = data.readUInt32BE(4);
			bitDepth = data[8]; colorType = data[9];
			if (bitDepth !== 8) throw new Error('只支持 8 位色深，实际 ' + bitDepth);
			if (colorType !== 2 && colorType !== 6) throw new Error('只支持 RGB/RGBA，实际 colorType=' + colorType);
		} else if (type === 'IDAT') idat.push(data);
		else if (type === 'IEND') break;
		off += 12 + len;
	}
	const raw = zlib.inflateSync(Buffer.concat(idat));
	const channels = colorType === 6 ? 4 : 3;
	const stride = w * channels;
	const out = Buffer.alloc(w * h * 4);
	let prev = Buffer.alloc(stride);
	let p = 0;
	for (let y = 0; y < h; y++) {
		const filter = raw[p++];
		const line = Buffer.from(raw.subarray(p, p + stride));
		p += stride;
		for (let x = 0; x < stride; x++) {
			const a = x >= channels ? line[x - channels] : 0;
			const b = prev[x];
			const c = x >= channels ? prev[x - channels] : 0;
			let v = line[x];
			if (filter === 1) v += a;
			else if (filter === 2) v += b;
			else if (filter === 3) v += (a + b) >> 1;
			else if (filter === 4) {
				const pp = a + b - c;
				const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
				v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
			}
			line[x] = v & 0xff;
		}
		for (let x = 0; x < w; x++) {
			const s = x * channels, d = (y * w + x) * 4;
			out[d] = line[s]; out[d + 1] = line[s + 1]; out[d + 2] = line[s + 2];
			out[d + 3] = channels === 4 ? line[s + 3] : 255;
		}
		prev = line;
	}
	return { w, h, pixels: out };
}

const luma = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b);

/** 把画面切成 gridX×gridY 块，每块平均亮度。 */
function blocks(img, gridX = 8, gridY = 5) {
	const { w, h, pixels } = img;
	const res = [];
	for (let gy = 0; gy < gridY; gy++) {
		for (let gx = 0; gx < gridX; gx++) {
			const x0 = Math.floor(gx * w / gridX), x1 = Math.floor((gx + 1) * w / gridX);
			const y0 = Math.floor(gy * h / gridY), y1 = Math.floor((gy + 1) * h / gridY);
			let sum = 0, n = 0;
			for (let y = y0; y < y1; y += 2) {
				for (let x = x0; x < x1; x += 2) {
					const d = (y * w + x) * 4;
					sum += luma(pixels[d], pixels[d + 1], pixels[d + 2]);
					n++;
				}
			}
			res.push(sum / n);
		}
	}
	return res;
}

// ---------------------------------------------------------------- CDP 客户端

class CDP {
	constructor(ws) {
		this.ws = ws; this.id = 0; this.pending = new Map();
		this.consoleErrors = [];
		ws.addEventListener('message', (ev) => {
			const msg = JSON.parse(ev.data);
			if (msg.id !== undefined) {
				const p = this.pending.get(msg.id);
				if (p) {
					this.pending.delete(msg.id);
					msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
				}
			} else if (msg.method === 'Runtime.exceptionThrown') {
				this.consoleErrors.push('exception: ' + (msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text));
			} else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
				this.consoleErrors.push('console.error: ' + msg.params.args.map(a => a.value ?? a.description ?? '').join(' '));
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
	async eval(expression) {
		const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
		if (r.exceptionDetails) throw new Error('eval 抛错: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
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

// ---------------------------------------------------------------- 主流程

// 编排模式：把两条路径各跑一遍，再汇总。
//
// 每条路径必须有自己的 profile —— 首启标记（`olympia.onboarding.completed.v1`）
// 一旦写进去，同一个目录第二次跑就**不会再显示引导**，阶段 A 直接判失败。
// 所以 profile 由父进程按路径分配，**不**接受外部指定（外部指定的会被当成
// 两条路径共用，第二条必然是「profile 被污染」的假失败）。
if (PATH_KIND === 'both') {
	if (has('--keep-open')) {
		console.error('「--keep-open」在两条路径的编排模式下没有意义（第二条路径会被第一条留下的进程挡住），已忽略。');
	}
	const kinds = ['normal', 'skip'];
	const summary = [];
	for (let i = 0; i < kinds.length; i++) {
		const kind = kinds[i];
		const childOut = path.join(OUT, kind);
		const childPort = CDP_PORT + i;
		fs.mkdirSync(childOut, { recursive: true });
		console.log(`\n################ 路径 ${kind}（CDP 端口 ${childPort}）################`);
		const res = spawnSync(process.execPath, [
			fileURLToPath(import.meta.url),
			'--path', kind,
			'--port', String(childPort),
			'--product', PRODUCT_DIR,
			'--out', childOut,
			'--profile', path.join(childOut, 'profile')
		], { stdio: 'inherit' });
		const code = res.status === null ? 1 : res.status;
		summary.push({ kind, code, out: childOut });
	}
	console.log('\n================ 两条路径汇总 ================');
	let bad = 0;
	for (const s of summary) {
		const ok = s.code === 0;
		if (!ok) { bad++; }
		console.log(`  ${ok ? '✓' : '✗'} ${s.kind}  退出码 ${s.code}  报告 ${path.join(s.out, 'verify-report.json')}`);
	}
	fs.writeFileSync(path.join(OUT, 'verify-report-summary.json'), JSON.stringify({
		startedAt: new Date().toISOString(),
		product: PRODUCT,
		paths: summary,
		ok: bad === 0
	}, null, 2));
	console.log(bad ? `\n有 ${bad} 条路径没过` : '\n两条路径全过 ✓');
	process.exit(bad ? 1 : 0);
}

const report = { startedAt: new Date().toISOString(), product: PRODUCT, profile: PROFILE };
const problems = [];

console.log('=== 启动打包产物（全新 profile）===');
console.log('  产品  :', PRODUCT);
console.log('  profile:', PROFILE);
if (PROFILE_EXPLICIT && fs.existsSync(PROFILE)) {
	// 显式指定了 profile 还要沿用旧的 ⇒ 首启标记可能已写进去 ⇒ 引导不会再出现。
	// 这里直接清空，宁可多花几秒，也不能让「profile 污染」伪装成「引导没出现」。
	try {
		fs.rmSync(PROFILE, { recursive: true, force: true });
		console.log('  （已清空旧 profile 目录）');
	} catch (e) {
		console.error('  清空 profile 失败:', e.message);
		console.error('  可能有残留的 Olympia 进程占着这个目录 —— 先按 --user-data-dir 特征反查并结束它。');
		process.exit(2);
	}
}
fs.mkdirSync(PROFILE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const tLaunch = Date.now();
const child = spawn(PRODUCT, [
	`--user-data-dir=${PROFILE}`,
	`--remote-debugging-port=${CDP_PORT}`
], { stdio: 'ignore' });
console.log('  进程 PID:', child.pid);

let cdp;
let closed = false;
const cleanup = async () => {
	if (closed) return;
	closed = true;
	try { await cdp?.send('Browser.close'); } catch { /* ignore */ }
	try { child.kill(); } catch { /* ignore */ }
	await sleep(2000);
	try {
		const ps = execFileSync('powershell.exe', ['-NoProfile', '-Command',
			`Get-CimInstance Win32_Process -Filter "Name='Olympia.exe'" | Where-Object { $_.CommandLine -like '*${PROFILE}*' } | ForEach-Object { $_.ProcessId }`],
			{ encoding: 'utf8' });
		const pids = ps.split(/\r?\n/).map(s => parseInt(s.trim(), 10)).filter(n => n > 0);
		for (const pid of pids) { try { process.kill(pid); } catch { /* ignore */ } }
		if (pids.length) console.log(`  清理了 ${pids.length} 个残留进程（按 --user-data-dir 特征反查）`);
	} catch { /* ignore */ }
};

try {
	const target = await findPageTarget(CDP_PORT);
	console.log('  页面目标:', target.title, '|', target.url);

	const ws = new WebSocket(target.webSocketDebuggerUrl);
	await new Promise((res, rej) => {
		ws.addEventListener('open', res, { once: true });
		ws.addEventListener('error', rej, { once: true });
	});
	cdp = new CDP(ws);
	await cdp.send('Runtime.enable');
	await cdp.send('Page.enable');
	console.log('  CDP 已连上');

	const vp = await cdp.eval(`({ w: window.innerWidth, h: window.innerHeight })`);
	console.log('  视口:', JSON.stringify(vp));

	// ---- 阶段 A：引导 overlay 出现
	console.log('\n=== 阶段 A：等待引导出现 ===');
	let appeared = false;
	for (let i = 0; i < 200; i++) {
		if (await cdp.eval(`!!document.querySelector('.olympia-onboarding')`)) { appeared = true; break; }
		await sleep(250);
	}
	report.overlayAppeared = appeared;
	if (!appeared) problems.push('引导 overlay 从未出现（.olympia-onboarding 不存在）');
	else console.log(`  ✓ overlay 出现（启动后约 ${Date.now() - tLaunch}ms）`);

	await sleep(3000);   // 让卡片稳定、异步值（如最近工程）落位

	// ---- 卡片真值
	const cardText = await cdp.eval(`(() => {
		const el = document.querySelector('.olympia-onboarding-cards');
		return el ? el.innerText : null;
	})()`);
	report.cardText = cardText;
	console.log('\n=== 第一张卡上的文字 ===');
	console.log(cardText ? cardText.split('\n').filter(s => s.trim()).map(s => '  ' + s).join('\n') : '  (拿不到)');

	const wants = [
		['评测机名 洛谷', /洛谷/],
		['GCC 版本 15.1.0', /15\.1\.0/],
		['C++ 标准 C++23', /C\+\+23/],
		['编译命令 -x c++', /-x c\+\+/],
		['编译命令 -std=c++23', /-std=c\+\+23/],
		['编译命令 -DONLINE_JUDGE', /-DONLINE_JUDGE/],
		['跳过引导 按钮', /跳过引导/],
		['下一步 CTA', /下一步/]
	];
	console.log('\n=== 真值检查 ===');
	for (const [label, re] of wants) {
		const ok = cardText ? re.test(cardText) : false;
		console.log(`  ${ok ? '✓' : '✗'} ${label}`);
		if (!ok) problems.push(`卡片上找不到「${label}」`);
	}

	const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
	const cardPng = path.join(OUT, 'verify-1-card-stage-' + PATH_KIND + '.png');
	fs.writeFileSync(cardPng, Buffer.from(shot1.data, 'base64'));
	console.log('  截图:', cardPng);

	// ---- 阶段 B：卡片导航（真实用户路径：下一步 ×3 → 开始做题）
	//
	// 注意：4 张卡同时在 DOM 里（轨道式排布），当前卡没有专属 class，
	// 只有当前卡是 pointerEvents:auto（见 olympiaOnboardingCards.ts 的 render()）。
	// 所以定位「当前卡」必须按这个特征，不能用 querySelector 取第一个。
	const ACTIVE_CARD = `(() => {
		const cards = [...document.querySelectorAll('.olympia-onboarding-card')];
		return cards.find(c => c.style.pointerEvents === 'auto') || cards[0] || null;
	})()`;
	const ACTIVE_INDEX = `(() => {
		const dots = [...document.querySelectorAll('.olympia-onboarding-dots > *')];
		return dots.findIndex(d => d.classList.contains('on'));
	})()`;

	console.log('\n=== 阶段 B：' + (PATH_KIND === 'skip' ? '跳过引导' : '卡片导航') + ' ===');
	const footers = [];
	if (PATH_KIND === 'skip') {
		// 「跳过引导」是用户最先可能按的按钮，也是「等待期还有没有退路」的真机证据。
		// 2026-10-22 的独立审计发现：闸门放行之前就加了 entering 类，CSS 据此把
		// skip / nav / dots / hint 一起 opacity:0 + pointer-events:none ——
		// 用户在等待期按不动任何东西。
		// 所以这里先断言「按钮可点」，再点。
		const skipProbe = await cdp.eval(`(() => {
			const b = document.querySelector('.olympia-onboarding-skip');
			if (!b) { return { present: false }; }
			const cs = getComputedStyle(b);
			const r = b.getBoundingClientRect();
			return {
				present: true,
				text: b.innerText.trim(),
				pointerEvents: cs.pointerEvents,
				opacity: cs.opacity,
				disabled: !!b.disabled,
				visible: r.width > 0 && r.height > 0
			};
		})()`);
		console.log('  跳过按钮:', JSON.stringify(skipProbe));
		report.skipProbe = skipProbe;
		if (!skipProbe.present) {
			problems.push('找不到「跳过引导」按钮');
		} else {
			if (skipProbe.pointerEvents === 'none') problems.push('「跳过引导」按钮 pointer-events:none —— 等待期没有退路（用户按不动）');
			if (skipProbe.disabled) problems.push('「跳过引导」按钮是 disabled');
			if (Number(skipProbe.opacity) < 0.5) problems.push('「跳过引导」按钮几乎不可见，opacity=' + skipProbe.opacity);
			if (!skipProbe.visible) problems.push('「跳过引导」按钮尺寸为 0 —— 点不到');
		}
		const clicked = await cdp.eval(`(() => {
			const b = document.querySelector('.olympia-onboarding-skip');
			if (!b) { return false; }
			b.click();
			return true;
		})()`);
		if (!clicked) problems.push('点不到「跳过引导」按钮');
		report.skipClickedAt = Date.now();
		console.log('  已点击「跳过引导」');
	} else {
		for (let step = 0; step < 3; step++) {
			const idxBefore = await cdp.eval(ACTIVE_INDEX);
			const ok = await cdp.eval(`(() => {
				const card = ${ACTIVE_CARD};
				if (!card) return false;
				const b = card.querySelector('.olympia-onboarding-cta');
				if (!b) return false;
				b.click();
				return true;
			})()`);
			await sleep(1000);
			const idxAfter = await cdp.eval(ACTIVE_INDEX);
			const foot = await cdp.eval(`(() => {
				const card = ${ACTIVE_CARD};
				const f = card ? card.querySelector('.olympia-onboarding-card-footer') : null;
				return f ? f.innerText.replace(/\\s+/g, ' ').trim() : null;
			})()`);
			footers.push({ idxBefore, idxAfter, foot });
			console.log(`  第 ${step + 1} 次「下一步」→ 圆点索引 ${idxBefore} → ${idxAfter}，footer: ${JSON.stringify(foot)}`);
			if (!ok) { problems.push('找不到当前卡的「下一步」按钮'); break; }
			if (idxAfter === idxBefore) problems.push(`点了「下一步」但当前卡没变（索引仍是 ${idxAfter}）`);
		}
		report.footers = footers;

		const ctaText = await cdp.eval(`(() => {
			const card = ${ACTIVE_CARD};
			const b = card ? card.querySelector('.olympia-onboarding-cta') : null;
			return b ? b.innerText.trim() : null;
		})()`);
		console.log('  最后一张卡 CTA:', JSON.stringify(ctaText));
		if (ctaText !== '开始做题') problems.push(`第 4 张卡 CTA 应为「开始做题」，实际 ${JSON.stringify(ctaText)}`);
	}

	// ---- 阶段 C：进入动画，逐帧抓像素
	console.log('\n=== 阶段 C：进入动画逐帧抓像素 ===');
	if (PATH_KIND === 'skip') {
		// 跳过路径的触发动作在阶段 B 已经做完了，这里直接采样。
		console.log('  触发: 跳过引导（阶段 B 已点击）');
	} else {
		const started = await cdp.eval(`(() => {
			const card = ${ACTIVE_CARD};
			const b = card ? card.querySelector('.olympia-onboarding-cta') : null;
			if (!b) return null;
			const label = b.innerText.trim();
			b.click();
			return label;
		})()`);
		console.log('  触发:', started);
		if (started !== '开始做题') problems.push(`触发的不是「开始做题」而是 ${JSON.stringify(started)} —— 进入动画可能没启动`);
	}

	// 采样区取视口中心：揭示洞就开在正中，露出的应该是真实工作台
	const clipW = Math.max(160, Math.round(vp.w * 0.34));
	const clipH = Math.max(160, Math.round(vp.h * 0.34));
	const clip = { x: Math.round((vp.w - clipW) / 2), y: Math.round((vp.h - clipH) / 2), width: clipW, height: clipH, scale: 1 };
	console.log(`  采样区: ${clip.width}×${clip.height} @ (${clip.x},${clip.y})`);

	// 每帧同时取两样：
	//   alpha = 背景画布中心像素的 alpha —— 洞开了就会从 255 掉到 0
	//   luma  = 合成画面中心的平均亮度 —— 洞开了却还是黑的，就是断点
	const frames = [];
	const t0 = Date.now();
	while (Date.now() - t0 < 9500) {
		const t = Date.now() - t0;
		let alpha = null, luma = null, err = null;
		try {
			alpha = await cdp.eval(`(() => {
				const c = document.querySelector('.olympia-onboarding-canvas');
				if (!c) return null;
				try {
					const ctx = c.getContext('2d');
					const d = ctx.getImageData(Math.floor(c.width/2), Math.floor(c.height/2), 1, 1).data;
					return d[3];
				} catch (e) { return 'err'; }
			})()`);
		} catch (e) { err = String(e.message); }
		try {
			const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false });
			const bl = blocks(decodePng(Buffer.from(shot.data, 'base64')), 4, 3);
			luma = bl.reduce((a, b) => a + b, 0) / bl.length;
		} catch (e) { err = err || String(e.message); }
		frames.push({ t, alpha, luma, err });
		await sleep(45);
	}
	console.log(`  抓到 ${frames.length} 帧`);

	// 判据 1：洞的 alpha 单调不增（洞只会变大）
	// 判据 2：洞开了（alpha < 240）之后，合成画面亮度不得掉到近黑（< 20）→ 那就是黑帧 = 断点
	const series = [];
	let prevAlpha = null, alphaUp = 0, blackouts = [];
	let holeOpenedAt = null;
	for (const f of frames) {
		const a = typeof f.alpha === 'number' ? f.alpha : null;
		if (a !== null) {
			if (prevAlpha !== null && a > prevAlpha + 2) alphaUp++;
			if (holeOpenedAt === null && a < 240) holeOpenedAt = f.t;
			prevAlpha = a;
		}
		if (holeOpenedAt !== null && f.luma !== null && f.luma < 20) {
			blackouts.push({ t: f.t, luma: Math.round(f.luma), alpha: a });
		}
		series.push({ t: f.t, alpha: a, luma: f.luma === null ? null : Math.round(f.luma), err: f.err });
	}
	report.frameSeries = series;
	report.holeOpenedAtMs = holeOpenedAt;
	report.alphaIncreases = alphaUp;
	report.blackouts = blackouts;

	console.log('  逐帧（alpha = 背景画布中心 alpha，luma = 合成画面中心亮度）：');
	for (const s of series) {
		if (s.err) { console.log(`    ${String(s.t).padStart(5)}ms  出错 ${s.err}`); continue; }
		const black = (holeOpenedAt !== null && s.luma !== null && s.luma < 20) ? '  ← 黑帧！' : '';
		console.log(`    ${String(s.t).padStart(5)}ms  alpha=${String(s.alpha).padStart(4)}  luma=${String(s.luma).padStart(4)}${black}`);
	}
	if (alphaUp > 0) problems.push(`洞的 alpha 回升 ${alphaUp} 次 —— 洞在缩小，画面会闪`);
	if (blackouts.length) problems.push(`洞开了但画面有 ${blackouts.length} 帧近黑 —— 黑帧断点`);
	if (holeOpenedAt === null) problems.push('整个采样期洞都没开（alpha 始终 ≥240）—— 进入动画没启动');

	// 结束状态：洞应已完全打开（alpha≈0），且工作台可见
	const endState = await cdp.eval(`(() => {
		const wb = document.querySelector('.monaco-workbench');
		const ov = document.querySelector('.olympia-onboarding');
		const canvas = document.querySelector('.olympia-onboarding-canvas');
		let alpha = null;
		if (canvas) {
			try {
				const ctx = canvas.getContext('2d');
				alpha = ctx.getImageData(Math.floor(canvas.width/2), Math.floor(canvas.height/2), 1, 1).data[3];
			} catch (e) { alpha = 'err'; }
		}
		return {
			workbench: !!wb,
			overlayPresent: !!ov,
			overlayOpacity: ov ? getComputedStyle(ov).opacity : null,
			canvasCenterAlpha: alpha,
			// 编辑器区的真实 class 是 part.editor 下的 content 再下 editor-group-container。
			// （见 oss/src/vs/workbench/browser/parts/editor/multiEditorTabsControl.ts 的结构。）
			// 早先这里查的是 editor-instance-container —— 本 fork 里根本没有这个 class，
			// 于是永远查到 false，把「选择器写错」误报成了「编辑器区没渲染」。
			// 注意：本段整体是一个反引号模板字符串，注释里不能出现反引号。
			editorArea: !!document.querySelector('.monaco-workbench .part.editor .editor-group-container'),
			activityBar: !!document.querySelector('.monaco-workbench .activitybar'),
			titleBar: !!document.querySelector('.monaco-workbench .titlebar')
		};
	})()`);
	report.endState = endState;
	console.log('\n=== 结束状态 ===');
	console.log(' ', JSON.stringify(endState));
	if (!endState.workbench) problems.push('结束状态里没有 .monaco-workbench');
	if (typeof endState.canvasCenterAlpha === 'number' && endState.canvasCenterAlpha > 8) {
		problems.push('结束时洞还没完全打开：alpha=' + endState.canvasCenterAlpha);
	}

	report.consoleErrors = cdp.consoleErrors;
	console.log('\n=== 控制台错误 ===');
	if (cdp.consoleErrors.length) {
		cdp.consoleErrors.forEach(e => console.log('  ✗ ' + String(e).slice(0, 400)));
		problems.push('控制台有 ' + cdp.consoleErrors.length + ' 条 error');
	} else console.log('  （无）');

	const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
	const endPng = path.join(OUT, 'verify-2-end-stage-' + PATH_KIND + '.png');
	fs.writeFileSync(endPng, Buffer.from(shot2.data, 'base64'));
	console.log('  结束截图:', endPng);
} catch (e) {
	problems.push('验证过程异常: ' + e.message);
	console.error('  异常:', e.message);
} finally {
	if (!has('--keep-open')) await cleanup();
	report.problems = problems;
	report.ok = problems.length === 0;
	fs.writeFileSync(path.join(OUT, 'verify-report.json'), JSON.stringify(report, null, 2));
	console.log('\n================ 结论 ================');
	if (problems.length === 0) console.log('全部通过 ✓');
	else {
		console.log('问题 ' + problems.length + ' 条：');
		problems.forEach(p => console.log('  ✗ ' + p));
	}
	console.log('报告:', path.join(OUT, 'verify-report.json'));
	process.exit(problems.length ? 1 : 0);
}
