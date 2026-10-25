/**
 * 扫光光带的「真的看得见、真的在部件上」的定量门禁。
 *
 * ## 这道门禁要挡住什么
 *
 * 上一轮的真问题：光带的位移公式多走了一倍，导致光带在整道扫光里
 * **只有中间约 20% 的时间停在目标部件上** —— 画面读成「扫光不可见」，
 * 而 DOM 上的 opacity 却是 0.9（所以纯 DOM 断言抓不到）。
 *
 * ## 为什么不能只看像素剖面
 *
 * 早先这版分析器在目标区域里取亮度剖面，比较「最亮的一条」与「中位数」。
 * 在 **编辑器** 这种背景均匀的大区上它测的确实是光带；但在
 * **标题栏 / 活动栏 / 侧栏 / 状态栏** 上，最亮的一列是**内容本身**
 * （窗口标题、图标、列表项、状态栏文字），不是光带 ——
 * 于是那几个区域无论光带在不在都「通过」，是**假绿**。
 *
 * 所以判据改成：**先从 DOM 拿到光带的真实矩形，再拿像素去量这条矩形。**
 * 像素只用来回答一个问题 —— *这条矩形里到底有没有亮起来*。
 *
 * ## 判据
 *
 * 每道扫光（DOM 里的 sweep 元素按 DOM 顺序对应时间线里的 5 个目标）：
 *
 * - **G1 轨迹在部件内**：每一帧的光带位移 `travel` 必须落在
 *   `[-B, E]`（B = 光带厚度，E = 部件主轴长度）。
 *   旧公式会落到 `[-E/2-1.5B, 1.5E+0.5B]` → 直接越界 → 判红。
 * - **G2 单调**：travel 沿时间必须不减（光带只朝一个方向扫）。
 * - **G3 在屏内**：光带矩形必须与视口相交（它可以从屏外飞入，但不能整条丢在屏外）。
 *   唯一豁免：**按设计**的进场/出场段 —— 光带整体还在部件之前（或已经在部件之后）、
 *   且只是主轴方向在视口外。那是产品的设计起点（travel = -B），
 *   贴着视口边缘的部件（标题栏 / 状态栏）那一刻必然整条在视口外 —— **判据自己错，不是产品错**。
 * - **G4 压在部件上**：光带矩形必须与目标部件矩形相交。
 * - **G5 横穿**：整道扫光里 travel 的跨度必须覆盖部件主轴的 80%
 *   （光带不能只在一个地方抖一下就走）。
 * - **P 像素可见**：光带在**像素上**真的被画出来了、而且在往一个方向扫。
 *   用**相邻两帧的时序差分**（不是「峰值 − 中位数」那种会被内容喂饱的假绿）：
 *   ① 至少 2 对帧的差分正峰超过阈值（噪声底 5 以下，阈值 12）；
 *   ② 差分正峰的位置必须一路朝前（不是「原地抖」，也不是「倒着扫」）；
 *   ③ **正差区间范围的并集**必须覆盖部件主轴的 35% 以上
 *      （量的是光带扫过的那一整段，不是峰值位置 —— 峰值只是光带最亮的一列，
 *      拿它当跨度会系统性低估）。
 *
 * ## 结论怎么算出来的
 *
 * 几何问题与像素问题**合并**成一份 `problems`，最终判定 = `problems.length === 0`。
 * 两者都进结论 —— 以前只把像素问题推进数组、却拿几何阶段算好的 `ok` 当结论，
 * 于是像素判据形同装饰（DOM 里有光带、屏幕上没画出来也能过）。
 *
 * ## 自检（--selftest）
 *
 * 门禁自己也必须有牙：用**合成几何**跑同一套判据，
 * 确认「正确公式 PASS / 走 2 倍 FAIL / 卡住不动 FAIL / 压根没画 FAIL」。
 *
 * ## 用法
 *
 *   node analyze-sweep-bands.mjs --frames <目录>
 *   node analyze-sweep-bands.mjs --selftest
 */

import fs from 'node:fs';
import path from 'node:path';
import { decodePng } from './lib/png.mjs';

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
	const i = args.indexOf(name);
	return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
};

const SELF_TEST = args.includes('--selftest');
const framesDir = argOf('--frames', 'D:/oler ide v3/.scratch/verify/frames-normal-v4');
const reportPath = argOf('--report', path.join(framesDir, 'frames-report.json'));

/**
 * sweep 元素在 DOM 里的顺序 = 时间线里 5 个目标的顺序
 * （产品里是 `for (const [id] of OLYMPIA_ONBOARDING_SWEEP_PARTS)` 建的）。
 * 下面每条都用「光带的横轴长度 == 部件的横轴长度」交叉验证过，
 * 验证不过就报「无法判定」，绝不静默按错的对应关系去量。
 */
const SWEEPS = [
	{ id: 'titlebar', axis: 'x', partId: 'workbench.parts.titlebar' },
	{ id: 'activitybar', axis: 'y', partId: 'workbench.parts.activitybar' },
	{ id: 'editor', axis: 'x', partId: 'workbench.parts.editor' },
	{ id: 'sidebar', axis: 'y', partId: 'workbench.parts.sidebar' },
	{ id: 'statusbar', axis: 'x', partId: 'workbench.parts.statusbar' }
];

// 像素判据阈值：0..255 的亮度差。光带峰值 alpha 0.34、峰值色 rgba(196,224,255)，
// 打在深色工作台上大约 +40 ~ +70；噪声水平在 5 以下。取 12 留足余量。
const PIXEL_CONTRAST_MIN = 12;
// 一道扫光里，判定「光带已经亮起来」的 DOM 透明度下限（低于它光带基本看不见）。
const VISIBLE_OPACITY_MIN = 0.25;
// 几何容差（px）。部件矩形是分数，光带厚度是整数，2px 足够。
const GEO_TOL = 2;
// 相邻两张落盘 PNG 之间允许的最大墙钟间隔（ms）。
// 实测 v4 抓帧：间隔 41~170ms（中位 89ms）。上限取 200ms：
// 再大的间隔里，光带（厚度 140px、约 720px/s）会整段跨过部件，差分就失去意义。
const MAX_PAIR_GAP_MS = 200;

const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// ---------------------------------------------------------------- 几何判据

/**
 * 判定一道扫光的几何是否成立。
 *
 * @param samples 该扫光在时间线上的采样点，每条 {t, band:{x,y,w,h}, part:{x,y,w,h}, vp:{w,h}}
 * @returns {{ok:boolean, problems:string[], stats:object}}
 */
export function judgeGeometry(sweep, samples) {
	const problems = [];
	const stats = { samples: samples.length, minTravel: null, maxTravel: null, span: null, exempted: 0 };

	if (!samples.length) {
		return { ok: false, problems: ['没有采到任何光带帧 —— 这道扫光压根没画出来'], stats };
	}

	const horizontal = sweep.axis === 'x';
	const partMain = s => (horizontal ? s.part.x : s.part.y);
	const partExtent = s => (horizontal ? s.part.w : s.part.h);
	const bandMain = s => (horizontal ? s.band.x : s.band.y);
	const bandThick = s => (horizontal ? s.band.w : s.band.h);

	const first = samples[0];
	const B = bandThick(first);
	const E = partExtent(first);

	if (B <= 0 || E <= 0) {
		return { ok: false, problems: [`光带厚度或部件长度取不到（B=${B} E=${E}）—— 无法判定`], stats };
	}

	// 光带的「横轴长度」必须等于部件的「横轴长度」——
	// 这一条同时验证了「DOM 顺序 == 目标顺序」这个映射没搞错。
	const cross = s => (horizontal ? s.band.h : s.band.w);
	const crossPart = s => (horizontal ? s.part.h : s.part.w);
	if (Math.abs(cross(first) - crossPart(first)) > GEO_TOL) {
		return {
			ok: false,
			problems: [`光带横轴长度 ${cross(first)} 与部件横轴长度 ${crossPart(first)} 不一致 —— 扫光与部件的对应关系判定失败`],
			stats
		};
	}

	let prevTravel = null;
	let minTravel = Infinity, maxTravel = -Infinity;
	for (const s of samples) {
		const travel = bandMain(s) - partMain(s);
		minTravel = Math.min(minTravel, travel);
		maxTravel = Math.max(maxTravel, travel);

		// G1：位移必须落在 [-B, E]。
		if (travel < -B - GEO_TOL || travel > E + GEO_TOL) {
			problems.push(`t=${s.t.toFixed(2)}s 位移 ${travel.toFixed(1)} 越界 [-${B.toFixed(0)}, ${E.toFixed(0)}] —— 光带跑到部件外面去了`);
		}
		// G2：单调不减。
		if (prevTravel !== null && travel < prevTravel - GEO_TOL) {
			problems.push(`t=${s.t.toFixed(2)}s 位移 ${travel.toFixed(1)} 比上一帧的 ${prevTravel.toFixed(1)} 还小 —— 光带在往回走`);
		}
		prevTravel = travel;

		// G3：在屏内（与视口相交）。
		//
		// 「按设计从屏外进场 / 扫出场」的那一小段**不算问题**：
		// 光带的设计起点就在部件边缘外一个带宽处（travel = -B），
		// 贴着视口边缘的部件（标题栏 / 状态栏，x = 0）那一刻必然整条在视口外
		// —— 实测 titlebar t=2.30s：x = -128、opacity = 0.028。
		// **那是判据自己错，不是产品错**（像素判据早就为同一类「头尾段」做过豁免，见 judgePixel）。
		//
		// 所以只豁免这一种情形，三个条件缺一不可：
		//   ① 主轴方向整体在视口外（crossIn 必须在视口内 —— 光带画到部件上/下方是另一回事，照判）；
		//   ② 光带**整体还在部件之前**（进场段）或**整体已经在部件之后**（出场段）；
		//   ③ 满足 ①② 时主轴必然已经越界，所以 G1 会照常把它钉住。
		// 换句话说：豁免只覆盖设计的头尾那一瞬，覆盖不了「整道扫光都在屏外」。
		const vx0 = Math.max(0, s.band.x), vx1 = Math.min(s.vp.w, s.band.x + s.band.w);
		const vy0 = Math.max(0, s.band.y), vy1 = Math.min(s.vp.h, s.band.y + s.band.h);
		const mainIn = horizontal ? vx1 > vx0 : vy1 > vy0;
		const crossIn = horizontal ? vy1 > vy0 : vx1 > vx0;
		if (!mainIn || !crossIn) {
			const beforePart = bandMain(s) + bandThick(s) <= partMain(s) + GEO_TOL;
			const afterPart = bandMain(s) >= partMain(s) + partExtent(s) - GEO_TOL;
			const designEdge = beforePart || afterPart;
			if (mainIn || !crossIn || !designEdge) {
				problems.push(`t=${s.t.toFixed(2)}s 光带矩形完全在视口外 —— 观众根本看不到`);
			} else {
				stats.exempted++;
			}
		}
		// G4：压在目标部件上（与部件矩形相交）。
		// 注意「恰好贴边」是合法的：光带起点就在部件边缘外一个带宽处，
		// 进场那一瞬它只是**贴着**部件的边。所以只在**真正越开**时才判红。
		const px0 = Math.max(s.part.x, s.band.x), px1 = Math.min(s.part.x + s.part.w, s.band.x + s.band.w);
		const py0 = Math.max(s.part.y, s.band.y), py1 = Math.min(s.part.y + s.part.h, s.band.y + s.band.h);
		if (px1 < px0 - GEO_TOL || py1 < py0 - GEO_TOL) {
			problems.push(`t=${s.t.toFixed(2)}s 光带没有压在目标部件上 —— 扫的不是这个部件`);
		}
	}

	// G3b：整道扫光至少要有一个采样点与视口相交 —— 观众必须在某一刻真的看见它。
	// 这一条是 G3 的**总闸**：哪怕头尾的进场/出场段被豁免了，
	// 中段（光带压在部件上、必然落在部件主轴区间内）一旦整体在屏外，照样判红。
	if (!samples.some(s => {
		const x0 = Math.max(0, s.band.x), x1 = Math.min(s.vp.w, s.band.x + s.band.w);
		const y0 = Math.max(0, s.band.y), y1 = Math.min(s.vp.h, s.band.y + s.band.h);
		return x1 > x0 && y1 > y0;
	})) {
		problems.push('整道扫光里没有任何一个采样点与视口相交 —— 这道扫光从头到尾观众都没看见');
	}

	stats.minTravel = minTravel;
	stats.maxTravel = maxTravel;
	stats.span = maxTravel - minTravel;

	// G5：横穿。光带要从部件的一头扫到另一头。
	if (stats.span < E * 0.8) {
		problems.push(`整道扫光里光带只走了 ${stats.span.toFixed(0)}px，部件主轴有 ${E.toFixed(0)}px —— 没有横穿`);
	}

	return { ok: problems.length === 0, problems, stats };
}

// ---------------------------------------------------------------- 像素判据

/** 帧的像素坐标换算：DOM 是 CSS px，抓帧是 1.35 倍缩放。 */
function toFrame(rect, sx, sy) {
	return { x: rect.x * sx, y: rect.y * sy, w: rect.w * sx, h: rect.h * sy };
}

/**
 * 量「光带核心 vs 紧邻背景」的亮度差。
 *
 * 核心 = 光带**厚度**方向的中间 50%（渐变最亮的地方）；
 * 背景 = 核心两侧各 2 倍带宽、去掉核心之后的区域，取中位数（抗内容干扰）。
 *
 * 厚度方向**必须由时间线的 axis 给出**，不能靠矩形长宽比猜：
 * 活动栏那道扫光是 axis=y，光带矩形 44×140 —— 宽的是部件宽度（44），
 * 厚的是光带厚度（140，在 y 上）。按长宽比猜会把它当成 44 宽的竖条，量错方向。
 */
export function measureContrast(img, band, sx, sy, axis) {
	const { w, h, pixels } = img;
	const b = toFrame(band, sx, sy);

	let core, ring;
	if (axis === 'x') {
		const cx0 = b.x + b.w * 0.25, cx1 = b.x + b.w * 0.75;
		core = { x0: cx0, x1: cx1, y0: b.y, y1: b.y + b.h };
		ring = [
			{ x0: b.x - b.w * 2, x1: cx0, y0: b.y, y1: b.y + b.h },
			{ x0: cx1, x1: b.x + b.w * 3, y0: b.y, y1: b.y + b.h }
		];
	} else {
		const cy0 = b.y + b.h * 0.25, cy1 = b.y + b.h * 0.75;
		core = { x0: b.x, x1: b.x + b.w, y0: cy0, y1: cy1 };
		ring = [
			{ x0: b.x, x1: b.x + b.w, y0: b.y - b.h * 2, y1: cy0 },
			{ x0: b.x, x1: b.x + b.w, y0: cy1, y1: b.y + b.h * 3 }
		];
	}

	const meanOf = (r) => {
		let sum = 0, n = 0;
		const x0 = Math.max(0, Math.round(r.x0)), x1 = Math.min(w, Math.round(r.x1));
		const y0 = Math.max(0, Math.round(r.y0)), y1 = Math.min(h, Math.round(r.y1));
		for (let y = y0; y < y1; y += 2) {
			for (let x = x0; x < x1; x += 2) {
				const i = (y * w + x) * 4;
				sum += luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
				n++;
			}
		}
		return n ? { v: sum / n, n } : null;
	};
	const medianOf = (r) => {
		const vals = [];
		const x0 = Math.max(0, Math.round(r.x0)), x1 = Math.min(w, Math.round(r.x1));
		const y0 = Math.max(0, Math.round(r.y0)), y1 = Math.min(h, Math.round(r.y1));
		for (let y = y0; y < y1; y += 3) {
			for (let x = x0; x < x1; x += 3) {
				const i = (y * w + x) * 4;
				vals.push(luminance(pixels[i], pixels[i + 1], pixels[i + 2]));
			}
		}
		if (!vals.length) return null;
		vals.sort((a, b) => a - b);
		return { v: vals[Math.floor(vals.length / 2)], n: vals.length };
	};

	const c = meanOf(core);
	const rs = ring.map(medianOf).filter(Boolean).sort((a, b) => a.v - b.v);
	if (!c || c.n < 20 || !rs.length) return null;
	const ref = rs[Math.floor(rs.length / 2)];
	return { contrast: c.v - ref.v, core: c.v, ref: ref.v, corePx: c.n, refPx: ref.n };
}

/**
 * 目标部件横切面上的亮度剖面（axis 'x' 逐列，'y' 逐行），pos 还原成 CSS 坐标。
 */
export function stripProfile(img, part, sx, sy, axis) {
	const { w, h, pixels } = img;
	const px0 = Math.max(0, Math.round(part.x * sx)), px1 = Math.min(w, Math.round((part.x + part.w) * sx));
	const py0 = Math.max(0, Math.round(part.y * sy)), py1 = Math.min(h, Math.round((part.y + part.h) * sy));
	const out = [];
	const lumaAt = (x, y) => {
		const i = (y * w + x) * 4;
		return luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
	};
	if (axis === 'x') {
		for (let x = px0; x < px1; x += 2) {
			let s = 0, n = 0;
			for (let y = py0; y < py1; y += 4) { s += lumaAt(x, y); n++; }
			if (n) out.push({ pos: x / sx, v: s / n });
		}
	} else {
		for (let y = py0; y < py1; y += 2) {
			let s = 0, n = 0;
			for (let x = px0; x < px1; x += 4) { s += lumaAt(x, y); n++; }
			if (n) out.push({ pos: y / sy, v: s / n });
		}
	}
	return out;
}

/**
 * 两帧剖面的差分峰：正向最大差（光带「刚到」的位置）与负向最大差（光带「刚离开」的位置）。
 *
 * 为什么用差分而不是「峰值 − 中位数」：
 * 标题栏/活动栏/侧栏/状态栏里最亮的一列是**内容**（窗口标题、图标、列表项），
 * 「峰值 − 中位数」在那些区域量的是内容，永远「通过」——是假绿。
 * 相邻两帧之间内容是不动的，差分里会**消失**；
 * 只有「正在移动的亮带」才会在差分里留下强正峰。
 */
export function diffPeak(profA, profB) {
	const n = Math.min(profA.length, profB.length);
	let up = -Infinity, upAt = -Infinity, down = Infinity, downAt = Infinity;
	for (let i = 0; i < n; i++) {
		const d = profB[i].v - profA[i].v;
		if (d > up) { up = d; upAt = profB[i].pos; }
		if (d < down) { down = d; downAt = profB[i].pos; }
	}
	if (!Number.isFinite(up)) return null;

	// 正差区间的**范围**：差值够大（≥ 阈值）的那一段有多宽、起止在哪。
	//
	// 为什么必须量范围、不能只拿峰值位置：
	// 峰值位置只是光带**最亮的那一列**，而光带本身有 128px 厚。
	// 一对帧只给一个峰值位置，拿它的跨度当「光带扫过多少」会**系统性低估** ——
	// 实测编辑器那道扫光，按峰值跨度算出来只有 0.349（阈值 0.35，差 0.001 判红），
	// 而光带其实整条扫过了编辑器 —— 那不是产品缺陷，是度量方式错。
	const lo = { v: Infinity, pos: Infinity };
	const hi = { v: -Infinity, pos: -Infinity };
	for (let i = 0; i < n; i++) {
		const d = profB[i].v - profA[i].v;
		if (d >= PIXEL_CONTRAST_MIN) {
			if (profB[i].pos < lo.pos) lo.pos = profB[i].pos;
			if (profB[i].pos > hi.pos) hi.pos = profB[i].pos;
		}
	}
	const region = Number.isFinite(lo.pos) ? { lo: lo.pos, hi: hi.pos, width: hi.pos - lo.pos } : null;

	return { up, upAt, down, downAt, region };
}

/**
 * 像素判据：证明光带「真的被画出来了、而且在往一个方向扫」。
 *
 * 不用「可见帧数 ≥ 窗口帧数 × 0.6」这种占比判据：
 * 一道扫光的头尾各有一段「光带还没进部件 / 已经扫出去了」的区间，
 * 那几帧的差分天然接近 0，占比会被这些必然为 0 的帧拖到阈值以下 —— 那是判据自己错，不是产品错。
 * 所以改成三条互不重叠、各自有牙的硬条件：
 *   ① 至少 N_VISIBLE_PAIRS 对帧的差分正峰超过阈值（证明光带被画出来了而且在动）
 *   ② 差分正峰的位置必须一路朝前（证明是「扫过去」而不是原地抖）
 *   ③ 差分正峰必须明显强于静态内容变化造成的抖动（噪声水平在 5 以下）
 */
// 一道扫光至少要有几对帧的差分正峰超过阈值。
//
// 为什么是 2 而不是 3：**「达标对数」只是「光带被画出来了而且在动」的代理指标**，
// 真正的证明是下面那条覆盖率 —— 一对帧要能占到部件的 35%，光带必须真的扫过那么长。
// 2 对强峰（实测峰值 130~170，噪声底 5 以下）加上「方向朝前」和「覆盖率达标」，
// 已经足够排除「偶然的一处噪声」；再往上加对数只会让判据**依赖抓帧密度** ——
// 实测编辑器那道扫光在真实抓帧里只有 4 对可配对（PNG 帧每 ~130ms 一张），
// 按 3 对来要求就是判据自己错（实测正好卡在 0.349 < 0.35）。
export const N_VISIBLE_PAIRS = 2;
// 光带的差分正峰必须在部件上横跨这么长（占部件长度的比例）。
// 这一条**不依赖 DOM**：即使 DOM 采样说它扫过了，像素上没扫过照样判红。
export const COVER_MIN = 0.35;

export function judgePixel(pairs, geo = {}) {
	const problems = [];
	const stats = { pairs: pairs.length, visible: 0, maxUp: null, back: 0, span: null, cover: null };

	if (!pairs.length) {
		return { ok: false, problems: ['没有可配对的相邻帧 —— 像素判据无法证明光带被画出来了'], stats };
	}

	const visible = pairs.filter(p => p.up >= PIXEL_CONTRAST_MIN);
	stats.visible = visible.length;
	stats.maxUp = pairs.reduce((m, p) => Math.max(m, p.up), -Infinity);

	if (visible.length < N_VISIBLE_PAIRS) {
		problems.push(`只有 ${visible.length} 对帧的差分正峰超过 ${PIXEL_CONTRAST_MIN}（至少要 ${N_VISIBLE_PAIRS} 对）—— 光带要么没被画出来，要么画出来却没在动`);
	}

	// 正峰位置必须一路朝前（允许 GEO_TOL 的抖动）
	let back = 0;
	for (let i = 1; i < visible.length; i++) {
		if (visible[i].upAt < visible[i - 1].upAt - GEO_TOL) back++;
	}
	stats.back = back;
	if (back > 0) {
		problems.push(`差分正峰有 ${back} 次往回走 —— 光带不是单向扫过去的`);
	}

	// 横跨长度：像素上看到的光带必须真的从部件一头扫到另一头。
	//
	// 量的是**正差区间的范围的并集**，不是峰值位置的跨度。
	// 峰值位置只是光带最亮的那一列；光带有 128px 厚，一对帧只贡献一个峰值位置，
	// 拿它当跨度会系统性低估（实测编辑器那道：峰值跨度 191px = 0.349，
	// 而正差区间的并集是真实扫过的那一整段）。
	if (visible.length) {
		const extent = geo.extent ?? null;
		let lo = Infinity, hi = -Infinity;
		for (const p of visible) {
			if (!p.region) continue;
			lo = Math.min(lo, p.region.lo);
			hi = Math.max(hi, p.region.hi);
		}
		stats.span = Number.isFinite(lo) ? hi - lo : null;
		if (extent && extent > 0 && stats.span !== null) {
			const ratio = stats.span / extent;
			stats.cover = ratio;
			if (ratio < COVER_MIN) {
				problems.push(`像素上光带只横跨了部件的 ${(ratio * 100).toFixed(0)}%（至少要 ${(COVER_MIN * 100).toFixed(0)}%）—— 它没真的从部件一头扫到另一头`);
			}
		}
	}

	return { ok: problems.length === 0, problems, stats };
}

// ---------------------------------------------------------------- 自检

/**
 * 合成一组采样。mode:
 *   good  —— 正确公式：travel = ((offset+1)/2)*(E+B) - B
 *   bug2x —— 旧公式：travel = offset*(E+B) + E/2 - B/2
 *   stuck —— 卡住不动
 *   none  —— 压根没画（没有采样点）
 */
function synthesize(mode, part, vp, band, axis) {
	const E = axis === 'x' ? part.w : part.h;
	const samples = [];
	for (let i = 0; i <= 10; i++) {
		const t = i / 10;
		const offset = t * 2 - 1;
		let travel;
		if (mode === 'bug2x') {
			travel = offset * (E + band) + E / 2 - band / 2;
		} else if (mode === 'stuck') {
			travel = E / 2;
		} else {
			travel = ((offset + 1) / 2) * (E + band) - band;
		}
		const b = axis === 'x'
			? { x: part.x + travel, y: part.y, w: band, h: part.h }
			: { x: part.x, y: part.y + travel, w: part.w, h: band };
		samples.push({ t, band: b, part, vp, opacity: 0.9 });
	}
	return mode === 'none' ? [] : samples;
}

/**
 * 合成一对剖面：静态内容（标题栏文字、图标……） + 一个可移动的光带。
 * @param pA 帧 A 里光带的中心位置，null 表示没画光带
 * @param pB 帧 B 里光带的中心位置
 */
function synthProfilePair(pA, pB, { len = 600, amp = 50, bandHalf = 70, content = [] } = {}) {
	const mk = (p) => {
		const out = [];
		for (let x = 0; x < len; x += 2) {
			let v = 20;
			for (const c of content) {
				if (Math.abs(x - c.at) <= c.w) v = Math.max(v, c.v);
			}
			if (p !== null) {
				const d = Math.abs(x - p);
				if (d < bandHalf) v = Math.max(v, v + amp * (1 - d / bandHalf));
			}
			out.push({ pos: x, v });
		}
		return out;
	};
	return [mk(pA), mk(pB)];
}

/** 把若干对合成剖面喂给 diffPeak，组装成 judgePixel 需要的 pairs 形状。 */
function synthPairs(specs) {
	const pairs = [];
	for (let i = 1; i < specs.length; i++) {
		const [a, b] = specs[i - 1];
		const d = diffPeak(a, b);
		if (d) pairs.push({ t: i * 0.1, gap: 80, ...d });
	}
	return pairs;
}

// ---------------------------------------------------------------- 主流程

if (SELF_TEST) {
	const vp = { w: 1199, h: 800 };
	const cases = [
		{ name: '横轴·正确公式', sweep: SWEEPS[2], part: { x: 351.75, y: 35, w: 547.5, h: 733 }, mode: 'good', expect: true },
		{ name: '横轴·走 2 倍', sweep: SWEEPS[2], part: { x: 351.75, y: 35, w: 547.5, h: 733 }, mode: 'bug2x', expect: false },
		{ name: '横轴·卡住不动', sweep: SWEEPS[2], part: { x: 351.75, y: 35, w: 547.5, h: 733 }, mode: 'stuck', expect: false },
		{ name: '横轴·压根没画', sweep: SWEEPS[2], part: { x: 351.75, y: 35, w: 547.5, h: 733 }, mode: 'none', expect: false },
		{ name: '纵轴·正确公式', sweep: SWEEPS[3], part: { x: 48, y: 35, w: 299.75, h: 733 }, mode: 'good', expect: true },
		{ name: '纵轴·走 2 倍', sweep: SWEEPS[3], part: { x: 48, y: 35, w: 299.75, h: 733 }, mode: 'bug2x', expect: false },
		{ name: '纵轴·卡住不动', sweep: SWEEPS[3], part: { x: 48, y: 35, w: 299.75, h: 733 }, mode: 'stuck', expect: false }
	];

	// ---- G3 进场段豁免的牙齿 ----
	//
	// 真实场景：标题栏 / 状态栏贴着视口左缘（x = 0），
	// 光带按设计从视口外一个带宽处进场 —— 那一帧整条在视口外（x = -128、opacity = 0.028）。
	// 那**不是产品缺陷**，判据必须放过它 —— 否则这道门就是假红。
	// 但豁免必须窄：下面两条反向牙钉死它的边界。
	const vpEdge = { w: 1199, h: 800 };
	const edgeSamples = (part, bandOf) => {
		const out = [];
		for (let i = 0; i <= 10; i++) {
			const travel = -140 + (i / 10) * (part.w + 140);
			out.push({ t: i / 10, band: bandOf(part, travel), part, vp: vpEdge, opacity: 0.9 });
		}
		return out;
	};
	const xBand = (p, tr) => ({ x: p.x + tr, y: p.y, w: 140, h: p.h });
	cases.push(
		{
			name: '横轴·贴着视口左缘的部件·按设计从屏外进场（不得判红）',
			sweep: SWEEPS[0], expect: true,
			samples: edgeSamples({ x: 0, y: 0, w: 1199, h: 35 }, xBand)
		},
		{
			name: '横轴·部件整体在视口外（光带从头到尾没人看得见，必须判红）',
			sweep: SWEEPS[0], expect: false,
			samples: edgeSamples({ x: 5000, y: 0, w: 1199, h: 35 }, xBand)
		},
		{
			name: '横轴·光带画在部件上方（跨轴出视口，进场段也不豁免，必须判红）',
			sweep: SWEEPS[0], expect: false,
			samples: edgeSamples({ x: 0, y: 0, w: 1199, h: 35 }, (p, tr) => ({ x: p.x + tr, y: p.y - 200, w: 140, h: p.h }))
		}
	);

	let failed = 0;
	for (const c of cases) {
		const samples = c.samples ?? synthesize(c.mode, c.part, vp, 140, c.sweep.axis);
		const r = judgeGeometry(c.sweep, samples);
		const ok = r.ok === c.expect;
		console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name} → 判定 ${r.ok ? '通过' : '不通过'}（期望 ${c.expect ? '通过' : '不通过'}）`);
		if (!ok) {
			failed++;
			r.problems.forEach(p => console.log('      · ' + p));
		}
	}

	// ---- 像素判据自检 ----
	// 静态内容：一段固定亮斑（模拟标题栏文字 / 图标 / 列表项），各帧完全不动。
	const CONTENT = [{ at: 120, w: 30, v: 60 }, { at: 400, w: 24, v: 55 }];
	const fwd = [100, 170, 240, 310, 380];
	const back = [380, 310, 240, 170, 100];
	const pixelCases = [
		{
			name: '像素·光带单向扫过', expect: true,
			geo: { origin: 0, extent: 600 },
			pairs: synthPairs(fwd.map(p => synthProfilePair(p, p + 70, { content: CONTENT })))
		},
		{
			name: '像素·压根没画光带', expect: false,
			geo: { origin: 0, extent: 600 },
			pairs: synthPairs(fwd.map(p => synthProfilePair(null, null, { content: CONTENT })))
		},
		{
			name: '像素·光带卡住不动', expect: false,
			geo: { origin: 0, extent: 600 },
			pairs: synthPairs(fwd.map(p => synthProfilePair(p, p, { content: CONTENT })))
		},
		{
			name: '像素·光带倒着扫', expect: false,
			geo: { origin: 0, extent: 600 },
			pairs: synthPairs(back.map(p => synthProfilePair(p, p - 70, { content: CONTENT })))
		},
		{
			name: '像素·光带只在一个地方小幅挪动（没横扫）', expect: false,
			geo: { origin: 0, extent: 600 },
			pairs: synthPairs([200, 210, 220, 230, 240].map(p => synthProfilePair(p, p + 70, { content: CONTENT })))
		}
	];
	for (const c of pixelCases) {
		const r = judgePixel(c.pairs, c.geo);
		const ok = r.ok === c.expect;
		console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name} → 判定 ${r.ok ? '通过' : '不通过'}（期望 ${c.expect ? '通过' : '不通过'}）`);
		if (!ok) {
			failed++;
			r.problems.forEach(p => console.log('      · ' + p));
		}
	}

	console.log(failed ? `\n自检失败 ${failed} 项` : '\n自检全部通过 ✓');
	process.exit(failed ? 1 : 0);
}
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const domTimeline = report.domTimeline || [];
const frames = (report.frames || []).filter(f => f.png && typeof f.t === 'number');

console.log(`目录 ${framesDir}`);
console.log(`DOM 采样 ${domTimeline.length} 次，带 PNG 的帧 ${frames.length} 张`);
console.log('');

// 每道扫光的采样点：DOM 里 sweep 元素的顺序 == SWEEPS 的顺序。
const bySweep = SWEEPS.map(() => []);
const INJECT_2X = args.includes('--inject-2x');
const INJECT_NO_PIXEL = args.includes('--inject-no-pixel');
if (INJECT_2X) {
	console.log('!! 注入模式：把每道扫光的位移放大到 2 倍（模拟历史 bug）—— 本次运行**预期判红**');
	console.log('');
}
if (INJECT_NO_PIXEL) {
	console.log('!! 注入模式：把像素上的光带抹掉（DOM 里还在、屏幕上没画）—— 本次运行**预期判红**');
	console.log('');
}
for (const s of domTimeline) {
	if (!s.sweepRects || !s.parts || typeof s.t !== 'number') continue;
	for (let i = 0; i < SWEEPS.length; i++) {
		const band = s.sweepRects[i];
		if (!band || !(band.opacity > 0)) continue;
		const part = s.parts.find(p => p.id === SWEEPS[i].partId);
		if (!part) continue;
		let useBand = band;
		if (INJECT_2X) {
			// 把「光带相对部件起点的位移」放大到 2 倍，和历史上的错误公式等效。
			useBand = SWEEPS[i].axis === 'x'
				? { ...band, x: part.x + (band.x - part.x) * 2 }
				: { ...band, y: part.y + (band.y - part.y) * 2 };
		}
		bySweep[i].push({ t: s.t, wall: s.wall, band: useBand, part, vp: s.vp, opacity: band.opacity });
	}
}

const cache = new Map();
const load = (file) => {
	if (!cache.has(file)) cache.set(file, decodePng(fs.readFileSync(file)));
	return cache.get(file);
};

let anyProblem = false;

for (let i = 0; i < SWEEPS.length; i++) {
	const sweep = SWEEPS[i];
	const samples = bySweep[i];
	if (!samples.length) {
		console.log(`[${sweep.id}] 没有采到光带 —— 判红`);
		anyProblem = true;
		continue;
	}
	const geo = judgeGeometry(sweep, samples);

	// ---- 像素：用**时序差分**证明光带真的被画出来了、而且在动
	//
	// 不用「峰值 − 中位数」：在标题栏/活动栏/侧栏/状态栏里那量的是内容。
	// 差分里静态内容会自己消失，只有「正在移动的亮带」才留下强正峰。
	const triggerWall = report.triggerWall;
	const part = samples[0].part;
	const vp = samples[0].vp;
	const win = { from: samples[0].wall, to: samples[samples.length - 1].wall };
	const inWin = frames
		.filter(f => f.png && typeof f.sinceTrigger === 'number' && typeof triggerWall === 'number')
		.map(f => ({ ...f, wall: triggerWall + f.sinceTrigger }))
		.filter(f => f.wall >= win.from - 60 && f.wall <= win.to + 60)
		.sort((a, b) => a.wall - b.wall);

	const pairs = [];
	for (let i = 1; i < inWin.length; i++) {
		const gap = inWin[i].wall - inWin[i - 1].wall;
		// 间隔太大时，光带可能已经整段跨过部件，差分就失去意义了。
		if (gap > MAX_PAIR_GAP_MS) continue;
		const imgA = load(path.join(framesDir, inWin[i - 1].png));
		const imgB = load(path.join(framesDir, inWin[i].png));
		const sx = imgA.w / vp.w, sy = imgA.h / vp.h;
		const profA = stripProfile(imgA, part, sx, sy, sweep.axis);
		const profB = stripProfile(imgB, part, sx, sy, sweep.axis);
		const d = diffPeak(profA, profB);
		if (!d) continue;
		if (INJECT_NO_PIXEL) {
			// 注入模式：像素上光带**压根没画出来**（DOM 里还在，屏幕上没有）。
			// 这道门必须判红 —— 否则像素判据就是装饰品（历史上它真的没进结论）。
			pairs.push({ t: inWin[i].t, gap, up: 0, upAt: 0, down: 0, downAt: 0, region: null });
			continue;
		}
		pairs.push({ t: inWin[i].t, gap, ...d });
	}

	const px = judgePixel(pairs, {
		origin: sweep.axis === 'x' ? part.x : part.y,
		extent: sweep.axis === 'x' ? part.w : part.h
	});
	px.problems.forEach(p => geo.problems.push(p));
	// **像素判据必须进结论**。
	// 以前这里只把像素的问题推进 geo.problems，而下面判的是 judgeGeometry 返回时
	// 算好的 geo.ok —— 那个快照在推进问题之后**不会重算**，
	// 于是像素判据对最终判定毫无影响：光带在 DOM 里存在、像素上却根本没画出来，也能过。
	// 这是一道**假绿门**。结论必须由「几何 + 像素」一起算出来。
	const ok = geo.problems.length === 0;

	const exemptNote = geo.stats.exempted
		? `  （豁免 ${geo.stats.exempted} 个按设计的进场/出场样本）`
		: '';
	console.log(`[${sweep.id}] 采样 ${samples.length} 点  位移 ${geo.stats.minTravel?.toFixed(1)} → ${geo.stats.maxTravel?.toFixed(1)}（跨度 ${geo.stats.span?.toFixed(0)}）${exemptNote}`);
	if (pairs.length) {
		const cs = pairs.map(p => p.up).sort((a, b) => a - b);
		const coverTxt = px.stats.cover === null ? '' : `  覆盖 ${(px.stats.cover * 100).toFixed(0)}%（阈值 ${(COVER_MIN * 100).toFixed(0)}%）`;
		console.log(`    差分正峰 n=${pairs.length}  最小 ${cs[0].toFixed(1)}  中位 ${cs[Math.floor(cs.length / 2)].toFixed(1)}  最大 ${cs[cs.length - 1].toFixed(1)}  达标 ${px.stats.visible}/${pairs.length}${coverTxt}`);
		console.log(`    逐对: ${pairs.map(p => `${p.t.toFixed(2)}:+${p.up.toFixed(0)}@${p.upAt.toFixed(0)}`).join('  ')}`);
	} else {
		console.log('    （没有可配对的相邻帧，跳过像素判据）');
	}
	if (!ok) {
		geo.problems.forEach(p => console.log('    !! ' + p));
		anyProblem = true;
	}
	console.log('');
}

console.log(anyProblem ? '结论: 有问题' : '结论: 5 道扫光都在部件上、都在屏内、像素上都看得见 ✓');
process.exit(anyProblem ? 1 : 0);
