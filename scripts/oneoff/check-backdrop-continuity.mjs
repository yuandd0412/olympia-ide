/**
 * 门禁：证明「鸿蒙式开始引导」的**动态背景**在整段生命周期里
 * 从不重置、从不冻结、从不跳变 —— 也就是「全程没有断点」的背景那一半。
 *
 * ## 为什么必须读 canvas，而不是看 DOM 或看合成截图
 *
 * 「背景没断」是**像素级**命题：
 *   - 背景层被 remove + 重建 → 洞被重新铺满 → 刚露出来的工作台瞬间被盖回去 → 断点；
 *   - 背景时钟被重置 → 极光形态瞬间跳回初始帧 → 断点；
 *   - 背景被冻结（rAF 停了 / 时钟不涨）→ 画面卡住 → 断点。
 * 这三件事在 DOM 上**全都看不出来**（元素一直都在）。
 * 看合成截图也看不出来：工作台从底下透出来，背景区域占比一直在变，
 * 合成帧的亮度变化被「洞在扩大」这件事淹没，测不出「背景自己重置了」。
 *
 * 所以这里直接读**极光画布本身**：
 *   - `.olympia-onboarding-canvas` 是独立的一张 canvas（洞用 destination-out 打在它上面）；
 *   - 每帧把它缩到 16×11 的块网格（最近邻，保留 alpha 硬边）；
 *   - 每块记两个量：
 *       az = 块内「已被洞擦掉（alpha<8）」的像素占比  → 洞的几何
 *       lm = 块内**未被擦掉**像素的平均亮度          → 背景的形态
 *
 * ## 判据
 *
 *   C1 洞单调：az 之和必须非递减。背景层被重建 → 洞被铺回 → az 归零 → 断点。
 *      **而且背景 canvas 这个元素本身不能被换过**（见下面「C1 为什么还要盯元素引用」）。
 *   C2 背景不停流：配置期与进入动画期，块亮度的相邻帧平均绝对差必须 > 0。
 *      差值按**时间归一化**到「每 100ms」—— 极光是时间的平滑函数，逐帧差正比于
 *      帧间隔，不归一化的话门禁在 144Hz 机器上会假红。
 *      （整体在流，不是每帧都在动 —— 极光演化本来就慢。）
 *      **而且参与统计的帧数必须够**（≥8 帧）—— 只看均值的话，
 *      1~2 帧的窗口也能凑出一个「平均值」骗过门禁。
 *   C3 无大面积亮度突变：帧级平均亮度突变必须低于阈值。
 *      背景被清空 / 闪白 / 换成另一张图 → 整幅画布亮度剧变 → 断点。
 *   C4 触发点连续：点「开始做题」前后各若干帧，同样受 C2/C3 约束。
 *   C5 覆盖充分：样本不够 / 触发后帧不够 / **采集没跟到 overlay 消失的那一刻**
 *      → 判红，防止门禁因为「没采到数据」而空跑假绿。
 *      （注意不是「消失后还要几帧」—— overlay 一摘画布就没了，那之后采不到帧。）
 *
 * ## C1 为什么还要额外盯「元素引用」
 *
 * 只盯 az 是不够的：有一种断点是**画面一模一样、内容却整个换掉了** ——
 * 背景层被 remove + 新建一张新的 canvas，再把旧画面的像素原样拷进去。
 *   - 合成画面上完全看不出差别（像素逐个相同）；
 *   - az 也不会倒退（新画布同样带着同样的洞）；
 *   - 但**背景层已经被重建过**了 —— 这是「全程没有断点」要禁止的行为。
 *
 * 而且更糟：如果采样器只在启动时抓一次 canvas 引用，那么
 * 「背景被重建」和「引导正常结束、画布被摘掉」在数据上**完全同形**
 * （都是元素不再 isConnected），判据压根看不见前者。
 * 所以采样器改成**每帧重新 querySelector 并比对元素引用**：
 *   - 元素引用变了 → 记 rebuiltAt → C1 直接判红；
 *   - 元素短暂取不到（比如正好在换）→ 先等 REBUILD_GAP_MS 再判「真的结束了」，
 *     避免把「正在换新」误判成「引导结束」。
 *
 * ## 为什么没有「时钟重置」的像素判据（这是实测结论，不是偷懒）
 *
 * 「背景时钟被重置」听起来该是断点，但实测它**在像素上根本看不出来**：
 * 抓同一张极光画布的全分辨率三帧（A=t、B=t+100ms、C=t+8.5s）逐像素比：
 *
 *   正常演化 100ms：mean |Δ亮度| = 0.383，p99 = 18.7，max = 54.3
 *   相位偏移 8.5s ：mean |Δ亮度| = 0.398，p99 = 18.7，max = 60.5
 *
 * 比值只有 **1.04** —— 跳 8.5 秒和走 100 毫秒在像素上几乎一样。
 * 原因：这个背景的极光缎带演化极慢（肉眼可见的变化主要来自浮尘与星闪，
 * 只占约 2% 的像素），所以「时间跳 8.5 秒」几乎不改变画面。
 *
 * 结论：**时钟重置要么在像素上抓不到，要么只能靠 2.5 倍的弱信号去赌**，
 * 那不是门禁，那是自欺欺人。所以：
 *   - 像素门禁只声明它能证明的事：洞单调且背景没被换过（C1）、背景在流（C2）、
 *     无大面积突变（C3）；
 *   - 「时钟不重置」由**代码断言**精确钉死（check-olympia-start-page.mjs 的
 *     T50：backdropTime 必须严格单调递增、永不归零、且渲染必须真的用它），
 *     并配变异证明会红。
 *
 * ## 门禁必须自己有牙
 *
 *   --selftest           合成用例：正常序列必须绿，重建 / 冻结 / 清空 / 换元素必须红。
 *   --inject-rebuild     在**真实采集数据**上注入「洞被铺回」，必须判红（C1）。
 *   --inject-freeze      注入「背景冻结」，必须判红（C2）。
 *   --inject-blackout    注入「背景被清空」，必须判红（C3）。
 *   --inject-canvas-swap 在**采集层**注入「背景 canvas 元素被换掉（新画布内容逐像素复制）」，
 *                        真实数据必须判红且被 C1 抓住 —— 这是唯一能证明
 *                        「采样器真的看得见重建」的牙。
 *
 * 用法：
 *   node scripts/oneoff/check-backdrop-continuity.mjs --product <产品目录> --port 9241
 *   node scripts/oneoff/check-backdrop-continuity.mjs --product <产品目录> --port 9241 --inject-canvas-swap
 *   node scripts/oneoff/check-backdrop-continuity.mjs --samples <samples.json>
 *   node scripts/oneoff/check-backdrop-continuity.mjs --samples <samples.json> --inject-rebuild
 *   node scripts/oneoff/check-backdrop-continuity.mjs --selftest
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

// ---------------------------------------------------------------- 阈值
//
// 这些阈值不是拍脑袋来的：先跑一次真实采集，看实际分布，再回填。
// 每条阈值的作用点见上面 C1~C5 的说明。

// 下面每个阈值都标了**真实采集**的实测值（2026-10-23，采集机 ~100fps、
// 帧间隔 p50 = 10.0ms、样本 1020 帧）。阈值不是拍脑袋定的：实测值与阈值之间
// 留了 4~8 倍余量，慢机 / 高刷屏 / 别的极光形态都不会假红；而真出问题时
// （背景被重建、背景被冻结、背景被清空）实测差着两个数量级，一抓一个准。
//
// 采集原始数据：samples/backdrop-samples.json（1020 帧）。
//
// 「完整块」口径：az ≤ INTACT_MAX 的块才算数 —— 洞只擦到边角（az 0.02~0.5）的块，
// 它的亮度是拿「只剩几个像素」算出来的，噪声极大（一帧就能跳出 5 块「跳变」）。
// 用完整块之后，正常帧级变化的极值从 1.96 降到 1.14（/100ms）。

/**
 * 「完整块」的判定：洞完全没碰到的块。
 * 实测：洞擦到边角的块（az 在 0.02~0.5 之间）亮度噪声极大，会把判据搅乱；
 * 收紧到 0.02 之后，正常帧级 rate 的最大值从 1.96 降到 1.14（/100ms）。
 */
const INTACT_MAX = 0.02;
/**
 * 洞面积（az 之和）单帧允许的回退量。
 *
 * 注意 az 的量化步长是「一块一个像素」= 1/64 = 0.0156，所以容差必须 ≥ 这个步长，
 * 否则洞边缘一个像素级的抖动就能让 C1 判红（第一版取 0.01 比步长还小，是个定时炸弹）。
 * 取 0.02 —— 容得下 1 像素级抖动，而真实重建的回退是 175.94 量级，两者差三个数量级。
 */
const AZ_TOL = 0.02;
/**
 * 画布「短暂消失」的容忍窗口（ms）。
 *
 * 背景层被重建时，旧 canvas 先被摘掉、新的才插进来，中间会有几帧查不到画布。
 * 这几帧不能当成「引导结束」—— 否则采样一停，后面所有判据都跑在半截数据上。
 * 超过这个窗口仍然找不到，才认定引导真的结束了。
 */
const REBUILD_GAP_MS = 400;
/**
 * 「背景在流动」这条判据**至少要有多少帧参与统计**。
 *
 * 少了这个下限，窗口里只剩一两帧时 flow() 照样能算出一个量级正常的平均值，
 * 于是「没采到几帧」也会给绿灯。窗口本身还受「洞擦满」截断，越晚触发越短，
 * 所以下限必须钉死。
 *
 * 实测：配置期 40 帧、进入期 171~177 帧。下限取 8 —— 离实测最差值还有 5 倍余量，
 * 同时保证「只剩一两帧」这种窗口一定判红。
 */
const MIN_FLOW_FRAMES = 8;
/**
 * 窗口内「相邻帧块亮度平均绝对差」的**下限**，已归一化到「每 100ms 的亮度变化」。
 * 实测（完整块口径）：配置期 avg 0.34、进入期 avg 0.34；单帧最小 0.096。
 * 取 0.04 —— 正常窗口平均的 1/8.5，余量 8 倍以上；而背景一旦冻结就是 0，
 * 一定出局。
 */
const FLOW_MIN = 0.04;
/**
 * 帧级「大面积亮度突变」的上限（每 100ms 的平均亮度变化，0~255 尺度）。
 *
 * 归一化到时间的原因和 FLOW_MIN 一样：逐帧差正比于帧间隔，不归一化就会绑死刷新率。
 * 实测正常帧级 rate：p50 0.333、p99 0.738、p999 1.142、max 1.142。
 * 取 5 —— 离正常最大值还有 4.4 倍余量（浮尘瞬移那种孤立跳变也够不到）。
 * 注入「背景被清空」时实测 rate = 151，超出阈值 30 倍，一抓一个准。
 */
const SURGE_MAX = 5;

/**
 * 覆盖下限。
 *
 * 这里**不是**「overlay 消失后还要再采到几帧」—— overlay 一摘，背景画布就不存在了，
 * 那之后根本采不到帧。要求「消失后 ≥N 帧」物理上不可能满足，等于把「覆盖充分」
 * 写成了永远红的判据（第一版就踩了这个坑）。
 *
 * 真正要证明的是**采集一直跟到了 overlay 消失的那一刻**：最后一个样本与消失时刻
 * 的间隔必须够近，否则说明采样器中途死了，后面的判据都是在半截数据上编结论。
 */
const MIN_SAMPLES = 30;
const MIN_AFTER_TRIGGER = 12;
/** 最后一个样本与 overlay 消失时刻的最大允许间隔（ms）。实测 2.1ms。 */
const MAX_GONE_GAP_MS = 500;

/** 网格：缩放后的画布分辨率，以及每块的像素尺寸。 */
const GRID_W = 128;
const GRID_H = 88;
const BW = 8;
const BH = 8;
const NB_X = Math.floor(GRID_W / BW);   // 16
const NB_Y = Math.floor(GRID_H / BH);   // 11
const NB = NB_X * NB_Y;                 // 176

// ---------------------------------------------------------------- 采样器（注入页面）

/**
 * 页面内采样器。
 *
 * 用离屏 canvas + 最近邻缩放把极光画布降到 16×11 块网格。
 * 最近邻是必须的：双线性会把洞边缘糊成半透明，alpha 掩码就不准了。
 * 每帧的量级是 11264 像素，开销可以忽略。
 */
const SAMPLER = `(() => {
	const GW = ${GRID_W}, GH = ${GRID_H}, BW = ${BW}, BH = ${BH};
	const REBUILD_GAP_MS = ${REBUILD_GAP_MS};
	const off = document.createElement('canvas');
	off.width = GW; off.height = GH;
	const octx = off.getContext('2d', { willReadFrequently: true });
	octx.imageSmoothingEnabled = false;
	const S = { ok: true, samples: [], err: null, triggerAt: -1, goneAt: -1, rebuiltAt: -1, rebuildCount: 0, stopped: false };
	window.__olympiaBg = S;
	S.markTrigger = () => { if (S.triggerAt < 0) { S.triggerAt = performance.now(); } return S.triggerAt; };
	let cur = document.querySelector('.olympia-onboarding-canvas');
	if (!cur) { return { ok: false, reason: 'no-backdrop-canvas' }; }
	let missingSince = -1;
	const grab = () => {
		try {
			octx.clearRect(0, 0, GW, GH);
			octx.drawImage(cur, 0, 0, GW, GH);
			const d = octx.getImageData(0, 0, GW, GH).data;
			const lm = new Array(${NB});
			const az = new Array(${NB});
			for (let by = 0; by < ${NB_Y}; by++) {
				for (let bx = 0; bx < ${NB_X}; bx++) {
					let sum = 0, cnt = 0, hole = 0;
					for (let j = 0; j < BH; j++) {
						for (let i = 0; i < BW; i++) {
							const p = ((by * BH + j) * GW + (bx * BW + i)) * 4;
							if (d[p + 3] < 8) { hole++; continue; }
							sum += d[p] * 0.299 + d[p + 1] * 0.587 + d[p + 2] * 0.114;
							cnt++;
						}
					}
					const k = by * ${NB_X} + bx;
					az[k] = hole / (BW * BH);
					lm[k] = cnt ? sum / cnt : null;
				}
			}
			S.samples.push({ t: performance.now(), lm: lm, az: az });
		} catch (e) { S.err = String(e); }
	};
	const tick = () => {
		if (S.stopped) { return; }
		// 每帧重新找画布，并且比对**元素引用**。
		//
		// 背景层被重建时，旧 canvas 会被摘掉、换上一个新的 —— 画面可能看起来一模一样，
		// 但元素已经不是那一个了。如果只在启动时抓一次引用，这种「换新的」在数据上
		// 跟「引导正常结束」完全同形：C1 看到单调序列判绿，C5 因为 goneAt 落在那一刻也判绿，
		// 于是 C1 想抓的那个故障**根本采不到**。所以这里必须每帧查并比对引用。
		const live = document.querySelector('.olympia-onboarding-canvas');
		if (!live) {
			// 画布可能只是「正被摘掉换新的」，别急着判结束 —— 否则采样一停就只剩半截数据。
			if (missingSince < 0) { missingSince = performance.now(); }
			if (performance.now() - missingSince > REBUILD_GAP_MS) {
				S.goneAt = missingSince;
				S.stopped = true;
				return;
			}
			requestAnimationFrame(tick);
			return;
		}
		missingSince = -1;
		if (live !== cur) {
			// 元素被换掉了 —— 背景层被重建。记下来，让 C1 直接判红。
			S.rebuiltAt = performance.now();
			S.rebuildCount += 1;
			cur = live;
		}
		grab();
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
	return { ok: true, gw: GW, gh: GH, srcW: cur.width, srcH: cur.height };
})()`;

// ---------------------------------------------------------------- 判定

const round2 = (x) => Math.round(x * 100) / 100;

/** az 之和 = 被洞擦掉的块权重总和（洞的几何面积）。 */
function azSum(s) {
	let t = 0;
	for (const v of s.az) { t += v; }
	return t;
}

/** 未被洞擦到的「完整块」数（洞只擦到边角的块不算，它们亮度噪声太大）。 */
function aliveBlocks(s) {
	let n = 0;
	for (const v of s.az) { if (v <= INTACT_MAX) { n++; } }
	return n;
}

/**
 * 两帧之间的**帧级**亮度变化：只看两帧都完整的块，求平均绝对差，
 * 再归一化到「每 100ms 的亮度变化」。
 *
 * 返回 { rate, mean, max, alive }：
 *   rate  = 每 100ms 的平均亮度变化（门禁的比较口径）
 *   mean  = 未归一化的平均绝对差（原始 luma）
 *   max   = 单块最大绝对差
 *   alive = 参与统计的完整块数
 *
 * 变化率必须按时间归一化 —— 极光是时间的平滑函数，逐帧差正比于帧间隔，
 * 拿逐帧差当阈值等于把门禁绑死在某台机器的刷新率上。
 */
function frameDelta(samples, i) {
	const A = samples[i - 1];
	const B = samples[i];
	const dt = B.t - A.t;
	if (!(dt > 0)) { return null; }
	let s = 0, c = 0, mx = 0;
	for (let k = 0; k < A.lm.length; k++) {
		// 两帧都完整才算 —— 洞边缘那些「擦了一半」的块，亮度是拿剩下几个像素
		// 算出来的，噪声极大，一帧就能跳出 5 块「跳变」，把判据搅成一锅粥。
		if (A.az[k] > INTACT_MAX || B.az[k] > INTACT_MAX) { continue; }
		if (A.lm[k] === null || B.lm[k] === null) { continue; }
		const d = Math.abs(B.lm[k] - A.lm[k]);
		s += d; c++;
		if (d > mx) { mx = d; }
	}
	if (c < 8) { return null; }
	const mean = s / c;
	return { rate: mean / dt * 100, mean, max: mx, alive: c };
}

/**
 * 窗口内的「流动度」：相邻帧之间，完整块的亮度平均绝对差。
 * 逐帧取平均再对帧求平均 —— 整体在流即可，不要求每帧都在动。
 */
function flow(samples, from, to) {
	let sum = 0, n = 0, min = Infinity;
	for (let i = Math.max(1, from); i < to && i < samples.length; i++) {
		const d = frameDelta(samples, i);
		if (!d) { continue; }
		sum += d.rate; n++;
		if (d.rate < min) { min = d.rate; }
	}
	return n ? { value: sum / n, min, frames: n } : { value: 0, min: 0, frames: 0 };
}

/**
 * 判定一整段采样。
 * @param {object} data 采样数据
 * @param {object} opts  { injectRebuild, injectFreeze, injectBlackout }
 */
export function judge(data, opts = {}) {
	const checks = [];
	const push = (id, title, ok, detail) => checks.push({ id, title, ok, detail });

	let samples = (data.samples || []).map(s => ({
		t: s.t,
		lm: s.lm.slice(),
		az: s.az.slice(),
	}));

	const triggerAt = data.triggerAt ?? -1;
	const goneAt = data.goneAt ?? -1;

	// ---- 注入：模拟「背景层被重建」（洞被重新铺满）
	//
	// 注入点必须落在**洞已经存在之后**：重建的破坏在于「工作台刚露出来，
	// 背景又被铺回去」。如果在洞还没擦开时注入，洞面积本来就是 0，
	// C1（洞单调）根本无从回退 —— 注入必须模拟真实故障发生的时刻。
	// 所以取「洞面积最大」的那一帧作为重建时刻。
	if (opts.injectRebuild) {
		let at = -1, best = -1;
		for (let i = 0; i < samples.length; i++) {
			const a = azSum(samples[i]);
			if (a > best) { best = a; at = i; }
		}
		if (at < 0) { at = Math.floor(samples.length / 2); }
		for (let i = at; i < samples.length; i++) {
			samples[i].az = samples[i].az.map(() => 0);
		}
	}

	// ---- 注入：模拟「背景被冻结」（时钟不涨，画面卡住）
	if (opts.injectFreeze) {
		const idx = samples.findIndex(s => s.t >= triggerAt);
		const at = idx >= 0 ? idx + 6 : Math.floor(samples.length / 2);
		const frozen = samples[at].lm.slice();
		for (let i = at; i < samples.length; i++) {
			samples[i].lm = frozen.slice();
		}
	}

	// ---- 注入：模拟「背景被清空 / 闪白」（整幅画布亮度剧变）
	//
	// 这是像素层面**唯一**能可靠抓到的「形态突变」：整幅画布的亮度在两帧之间
	// 剧变。实测注入后帧级 rate = 151，而正常帧最大只有 1.14（/100ms）。
	//
	// 注意这里没有「时钟重置」的注入：实测表明时钟重置在像素上与正常演化
	// 几乎无法区分（详见文件头「为什么没有时钟重置的像素判据」），
	// 那种故障由代码断言 T50 精确钉死，不该在像素层假装能抓。
	if (opts.injectBlackout) {
		const idx = samples.findIndex(s => s.t >= triggerAt);
		const at = idx >= 0 ? idx + 6 : Math.floor(samples.length / 2);
		samples[at].lm = samples[at].lm.map(v => (v === null ? null : 0));
	}

	// ---- C5 覆盖充分
	const trigIdx = triggerAt >= 0 ? samples.findIndex(s => s.t >= triggerAt) : -1;
	const afterTrigger = trigIdx >= 0 ? samples.length - trigIdx : 0;
	const lastT = samples.length ? samples[samples.length - 1].t : -1;
	// 采集必须一直跟到 overlay 消失的那一刻。overlay 一摘画布就没了，所以
	// 「消失后还有几帧」不是覆盖指标；「消失前最后一个样本离消失有多近」才是。
	const goneGap = goneAt >= 0 && lastT >= 0 ? Math.max(0, goneAt - lastT) : Infinity;
	const covOk = samples.length >= MIN_SAMPLES
		&& afterTrigger >= MIN_AFTER_TRIGGER
		&& goneGap <= MAX_GONE_GAP_MS;
	push('C5', '覆盖充分',
		covOk,
		`样本 ${samples.length} 帧（需 ≥${MIN_SAMPLES}），触发后 ${afterTrigger} 帧（需 ≥${MIN_AFTER_TRIGGER}），最后样本距 overlay 消失 ${round2(goneGap)}ms（需 ≤${MAX_GONE_GAP_MS}ms）`);
	if (!covOk) {
		// 覆盖不够就没法判后面的 —— 直接返回，别用半截数据编结论。
		return { ok: false, checks, samples: samples.length };
	}

	// ---- C1 洞单调（背景层没被重建 / 洞没被填回）
	let worstDrop = 0, worstIdx = -1;
	for (let i = 1; i < samples.length; i++) {
		const d = azSum(samples[i - 1]) - azSum(samples[i]);
		if (d > worstDrop) { worstDrop = d; worstIdx = i; }
	}
	// 采样器每帧比对画布元素引用：背景层被「重建」（旧 canvas 摘掉、换上新 canvas）
	// 时，画面可能看起来一模一样，但已经不是那一层了 —— 洞面积照样单调。
	// 这一条只能靠「元素被换过」这个事实来抓，洞面积抓不到。
	const rebuiltAt = data.rebuiltAt ?? -1;
	const rebuilt = rebuiltAt >= 0;
	push('C1', '洞单调（背景未被重建）',
		!rebuilt && worstDrop <= AZ_TOL,
		rebuilt
			? `背景画布在 ${round2(rebuiltAt)}ms 被换掉了（重建 ${data.rebuildCount || 1} 次）—— 洞面积可能还是单调的，但背景层已经不是原来那一层了`
			: `洞面积最大单帧回退 ${round2(worstDrop)}（上限 ${AZ_TOL}）@frame ${worstIdx}`);

	// ---- C2 背景不停流
	// 配置期：触发点往前 40 帧。
	const preFrom = Math.max(0, trigIdx - 40);
	const preFlow = flow(samples, preFrom, trigIdx);
	// 进入动画期：从触发点起，直到「完整块数掉到全图 30% 以下」为止
	// （洞擦满之后背景本来就看不见了，那之后没法用像素说话）。
	let aliveLimit = -1;
	for (let i = trigIdx; i < samples.length; i++) {
		if (aliveBlocks(samples[i]) < NB * 0.3) { aliveLimit = i; break; }
	}
	const postTo = aliveLimit >= 0 ? aliveLimit : samples.length;
	const postFlow = flow(samples, trigIdx + 1, postTo);
	// 参与统计的帧数也必须有下限：窗口里只剩一两帧时，flow() 照样能算出一个
	// 量级正常的平均值 —— 那样「没采到几帧」也会给绿灯。
	const c2a = preFlow.value >= FLOW_MIN && preFlow.frames >= MIN_FLOW_FRAMES;
	const c2b = postFlow.value >= FLOW_MIN && postFlow.frames >= MIN_FLOW_FRAMES;
	push('C2a', '配置期背景在流动',
		c2a,
		`平均亮度变化 ${round2(preFlow.value)}/100ms（下限 ${FLOW_MIN}），参与 ${preFlow.frames} 帧（需 ≥${MIN_FLOW_FRAMES}）`);
	push('C2b', '进入动画期间背景仍在流动',
		c2b,
		`平均亮度变化 ${round2(postFlow.value)}/100ms（下限 ${FLOW_MIN}），参与 ${postFlow.frames} 帧（需 ≥${MIN_FLOW_FRAMES}），窗口到 frame ${postTo}`);

	// ---- C3 无大面积亮度突变（背景没有被清空 / 闪白 / 换成别的图）
	//
	// 判据是**帧级**的：整幅画布的平均亮度在两帧之间不能剧变。
	// 正常演化实测：p50 0.333、p99 0.738、max 1.142（每 100ms）。
	// 阈值 5 → 离正常最大值 4.4 倍余量；而「整幅被清空」实测 151，一抓一个准。
	let surge = null, maxRate = 0, maxRateIdx = -1;
	for (let i = 1; i < samples.length; i++) {
		const d = frameDelta(samples, i);
		if (!d) { continue; }
		if (d.rate > maxRate) { maxRate = d.rate; maxRateIdx = i; }
		if (d.rate > SURGE_MAX && (!surge || d.rate > surge.rate)) { surge = { ...d, i }; }
	}
	push('C3', '背景无大面积亮度突变',
		surge === null,
		surge
			? `frame ${surge.i} 平均亮度突变 ${round2(surge.rate)}/100ms（上限 ${SURGE_MAX}，完整块 ${surge.alive} 个，单块最大 ${round2(surge.max)}）`
			: `全程无「平均亮度突变 >${SURGE_MAX}/100ms」的帧；单帧最大 ${round2(maxRate)}/100ms（@frame ${maxRateIdx}）`);

	// ---- C4 触发点连续
	// 触发前后各 3 帧：既不能突变（画面剧变），也不能冻结（时钟停了）。
	let trigSurge = null;
	let trigMinFlow = Infinity;
	for (let i = Math.max(1, trigIdx - 3); i <= Math.min(samples.length - 1, trigIdx + 3); i++) {
		const d = frameDelta(samples, i);
		if (d && d.rate > SURGE_MAX && (!trigSurge || d.rate > trigSurge.rate)) { trigSurge = { ...d, i }; }
		const f = flow(samples, i, i + 1);
		if (f.frames > 0 && f.value < trigMinFlow) { trigMinFlow = f.value; }
	}
	const c4a = trigSurge === null;
	const c4b = trigMinFlow === Infinity || trigMinFlow >= FLOW_MIN * 0.5;
	push('C4', '触发点前后连续（无突变、无冻结）',
		c4a && c4b,
		`触发点附近${trigSurge ? ` frame ${trigSurge.i} 平均亮度突变 ${round2(trigSurge.rate)}/100ms（上限 ${SURGE_MAX}）` : '无大面积突变'}，最小亮度变化 ${trigMinFlow === Infinity ? 'n/a' : round2(trigMinFlow)}/100ms（下限 ${round2(FLOW_MIN * 0.5)}）`);

	return { ok: checks.every(c => c.ok), checks, samples: samples.length };
}

// ---------------------------------------------------------------- 合成自检

/**
 * 合成样本：把背景画布抽象成一个 16×11 的块网格。
 * lm = 每块亮度（缓慢漂移 = 背景在流），az = 洞占比（单调增 = 洞在扩）。
 */
function synth(opts = {}) {
	// amplitude = 极光形态漂移的振幅（luma 单位）；omega = 每帧相位步长。
	// 取值必须让「正常相邻帧差」远小于突变阈值（SURGE_MAX = 5/100ms，
	// 帧间隔 16.7ms → 相当于每帧 0.83 luma），否则自检用例本身是假绿。
	// 取 omega = 0.02 → 正常每帧差 ≤ 0.16 luma（≈ 0.96/100ms），余量 5 倍。
	const { frames = 60, amplitude = 8, omega = 0.02, holeGrow = 0, freeze = false, rebuild = false, blackout = false, jump = 0, rebuiltAt = -1, thinFlow = false } = opts;
	const samples = [];
	for (let i = 0; i < frames; i++) {
		const lm = [];
		const az = [];
		for (let k = 0; k < NB; k++) {
			const base = 20 + (k % 7) * 3;
			const phase = k * 0.3;
			let v = freeze ? base : base + Math.sin(phase + i * omega) * amplitude;
			if (blackout && i === 30) { v = 0; } // 背景被清空
			if (jump && i === 30) { v = base + 60; } // 大面积突变
			lm.push(v);
			// thinFlow：洞擦得极快 → 「完整块掉到 30% 以下」这个窗口被立刻截短，
			// 于是参与统计的帧数不够 10 —— 用来考「样本量不足也得判红」。
			const grow = thinFlow ? Math.max(holeGrow, 8) : holeGrow;
			const holeFrac = grow ? Math.min(1, grow * i / frames) : 0;
			const inHole = (k / NB) < holeFrac;
			az.push(inHole ? 1 : 0);
		}
		if (rebuild && i >= 30) { for (let k = 0; k < NB; k++) { az[k] = 0; } }
		samples.push({ t: i * 16.7, lm, az });
	}
	return {
		grid: [NB_X, NB_Y],
		triggerAt: 10 * 16.7,
		goneAt: (frames - 5) * 16.7,
		rebuiltAt,
		rebuildCount: rebuiltAt >= 0 ? 1 : 0,
		samples,
	};
}

function runSelftest() {
	const cases = [
		{ id: 'S1', title: '正常序列必须绿', data: synth({ holeGrow: 0.9 }), expect: true },
		{ id: 'S2', title: '背景被重建（洞被铺回）必须红', data: synth({ holeGrow: 0.9, rebuild: true }), expect: false },
		{ id: 'S3', title: '背景被冻结必须红', data: synth({ holeGrow: 0.0, freeze: true }), expect: false },
		{ id: 'S4', title: '背景被清空必须红', data: synth({ holeGrow: 0.9, blackout: true }), expect: false },
		{ id: 'S5', title: '大面积突变必须红', data: synth({ holeGrow: 0.9, jump: 1 }), expect: false },
		{ id: 'S6', title: '覆盖不足必须红', data: synth({ holeGrow: 0.9, frames: 12 }), expect: false },
		// 第四颗牙：背景画布被换掉（画面看起来一模一样，只是元素不是那一个了）。
		// 洞面积在这种情况下照样单调 —— 只有「元素被换过」这个事实能抓到它。
		{ id: 'S7', title: '背景画布被换掉必须红', data: synth({ holeGrow: 0.9, rebuiltAt: 500 }), expect: false, expectCheck: 'C1' },
		// 第五颗牙：参与统计的帧数不足（窗口被截得很短）必须红，
		// 不能只靠一两帧的平均值就给绿灯。
		{ id: 'S8', title: '参与帧数不足必须红', data: synth({ holeGrow: 0.9, frames: 60, thinFlow: true }), expect: false, expectCheck: 'C2b' },
	];
	let failed = 0;
	console.log('=== 背景连续性 · 合成自检 ===');
	for (const c of cases) {
		const r = judge(c.data);
		const ok = r.ok === c.expect;
		// 指定了 expectCheck 的用例，还要确认「是被预期的判据抓住」——
		// 靠别的判据偶然变红，等于这条用例没在考它该考的东西。
		const caught = r.checks.filter(x => !x.ok).map(x => x.id).join(',') || '（无判据变红）';
		const byExpected = !c.expectCheck || caught.includes(c.expectCheck);
		const pass = ok && byExpected;
		if (!pass) { failed++; }
		console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${c.id}  ${c.title}`);
		if (!pass) {
			console.log(`        期望 ${c.expect ? '绿' : '红'}，实际 ${r.ok ? '绿' : '红'}${c.expectCheck ? `；期望由 ${c.expectCheck} 抓住，实际 ${caught}` : ''}`);
			for (const ch of r.checks) {
				if (!ch.ok) { console.log(`        未过 ${ch.id} ${ch.title}: ${ch.detail}`); }
			}
		}
	}
	console.log(`\n自检 ${cases.length - failed}/${cases.length} 通过`);
	return failed === 0 ? 0 : 1;
}

// ---------------------------------------------------------------- CDP 客户端

class CDP {
	constructor(ws) {
		this.ws = ws;
		this.id = 0;
		this.pending = new Map();
		this.handlers = new Map();
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

// ---------------------------------------------------------------- 采集

const PORT = Number(arg('--port', 9241));
const PRODUCT_DIR = arg('--product', path.join(repoRoot, 'VSCode-win32-x64'));
const PRODUCT = path.join(PRODUCT_DIR, 'Olympia.exe');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = arg('--out', path.join(os.tmpdir(), 'olympia-backdrop-' + STAMP));

/** Profile 每次必须全新 —— 首启标记写进去就再也不会显示引导了。 */
const PROFILE_EXPLICIT = has('--profile');
const PROFILE = arg('--profile', path.join(OUT, 'profile-' + STAMP));

const ACTIVE_CARD = `(() => {
	const cards = [...document.querySelectorAll('.olympia-onboarding-card')];
	return cards.find(c => c.style.pointerEvents === 'auto') || cards[0] || null;
})()`;

async function collect(opts = {}) {
	const injectCanvasSwap = !!opts.injectCanvasSwap;
	fs.mkdirSync(PROFILE, { recursive: true });
	console.log('=== 启动打包产物（全新 profile）===');
	console.log('  产品   :', PRODUCT);
	console.log('  profile:', PROFILE);
	console.log('  输出   :', OUT);

	const child = spawn(PRODUCT, [
		`--user-data-dir=${PROFILE}`,
		`--remote-debugging-port=${PORT}`
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
		const target = await findPageTarget(PORT);
		const ws = new WebSocket(target.webSocketDebuggerUrl);
		await new Promise((res, rej) => {
			ws.addEventListener('open', res, { once: true });
			ws.addEventListener('error', rej, { once: true });
		});
		cdp = new CDP(ws);
		await cdp.send('Runtime.enable');
		await cdp.send('Page.enable');

		console.log('\n=== 等待引导出现 ===');
		let appeared = false;
		for (let i = 0; i < 200; i++) {
			if (await cdp.eval("!!document.querySelector('.olympia-onboarding')")) { appeared = true; break; }
			await sleep(250);
		}
		if (!appeared) { throw new Error('引导 overlay 从未出现'); }
		console.log('  ✓ overlay 出现');
		await sleep(1500);

		console.log('\n=== 注入背景采样器 ===');
		const boot = await cdp.eval(SAMPLER);
		if (!boot || !boot.ok) {
			throw new Error('采样器注入失败: ' + JSON.stringify(boot));
		}
		console.log('  ✓ 采样器已挂上，网格', boot.gw + '×' + boot.gh, '源画布', boot.srcW + '×' + boot.srcH);

		// 配置期基线：背景要先流一阵，才能证明「进入动画期间没冻结」。
		console.log('\n=== 配置期基线采样（2.5s）===');
		await sleep(2500);

		console.log('\n=== 走完 4 张卡并触发进入动画 ===');
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

		const trig = await cdp.eval(`(() => {
			const card = ${ACTIVE_CARD};
			const b = card ? card.querySelector('.olympia-onboarding-cta') : null;
			if (!b) { return null; }
			b.click();
			const S = window.__olympiaBg;
			return { label: b.innerText.trim(), triggerAt: S ? S.markTrigger() : -1 };
		})()`);
		if (!trig) { throw new Error('点不到最后一张卡的 CTA'); }
		console.log('  已触发:', JSON.stringify(trig.label), 'triggerAt =', trig.triggerAt);

		console.log('\n=== 等待进入动画跑完 ===');
		if (injectCanvasSwap) {
			// 注入「背景层被重建」：把旧的背景 canvas 摘掉，换一个内容**一模一样**的新 canvas 上去。
			//
			// 为什么要一模一样：只有画面完全相同，才能证明门禁抓的是「元素被换过」这件事，
			// 而不是「画面变了」。画面变了的话 C3（亮度突变）就能抓到，根本用不着 C1。
			await sleep(1000);
			const swapped = await cdp.eval(`(() => {
				const old = document.querySelector('.olympia-onboarding-canvas');
				if (!old) { return { ok: false, reason: 'no-canvas' }; }
				const neu = document.createElement('canvas');
				neu.width = old.width; neu.height = old.height;
				neu.className = old.className;
				neu.style.cssText = old.style.cssText;
				const cx = neu.getContext('2d');
				cx.drawImage(old, 0, 0);
				old.parentNode.replaceChild(neu, old);
				return { ok: true, w: neu.width, h: neu.height };
			})()`);
			console.log('  已注入「背景画布被换掉」:', JSON.stringify(swapped));
			await sleep(400);
		}
		let state = null;
		for (let i = 0; i < 400; i++) {
			state = await cdp.eval(`(() => {
				const S = window.__olympiaBg;
				if (!S) { return null; }
				return { n: S.samples.length, goneAt: S.goneAt, stopped: S.stopped, err: S.err };
			})()`);
			if (state && state.stopped) { break; }
			await sleep(250);
		}
		console.log('  采样结束:', JSON.stringify(state));

		const payload = await cdp.eval(`(() => {
			const S = window.__olympiaBg;
			if (!S) { return null; }
			return { grid: S.grid, triggerAt: S.triggerAt, goneAt: S.goneAt,
				rebuiltAt: S.rebuiltAt, rebuildCount: S.rebuildCount, err: S.err, samples: S.samples };
		})()`);
		if (!payload || !payload.samples || !payload.samples.length) {
			throw new Error('没采到样本: ' + JSON.stringify(state));
		}
		await cleanup();

		const outFile = path.join(OUT, 'backdrop-samples.json');
		fs.mkdirSync(OUT, { recursive: true });
		fs.writeFileSync(outFile, JSON.stringify({
			startedAt: new Date().toISOString(),
			product: PRODUCT,
			port: PORT,
			...payload,
		}));
		console.log('\n  样本已落盘:', outFile);
		console.log('  样本帧数   :', payload.samples.length);
		return outFile;
	} finally {
		await cleanup();
	}
}

// ---------------------------------------------------------------- 主流程

let exitCode = 0;
try {
	if (has('--selftest')) {
		exitCode = runSelftest();
	} else if (has('--samples')) {
		const file = arg('--samples');
		const data = JSON.parse(fs.readFileSync(file, 'utf8'));
		const injectRebuild = has('--inject-rebuild');
		const injectFreeze = has('--inject-freeze');
		const injectBlackout = has('--inject-blackout');
		if (injectRebuild || injectFreeze || injectBlackout) {
			console.log('=== 注入模式：门禁必须判红 ===');
			console.log('  注入', injectRebuild ? '背景重建(洞被铺回)' : '', injectFreeze ? '背景冻结' : '', injectBlackout ? '背景被清空' : '');
		}
		const r = judge(data, { injectRebuild, injectFreeze, injectBlackout });
		console.log('=== 背景连续性判定 ===');
		for (const c of r.checks) {
			console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.id} ${c.title} — ${c.detail}`);
		}
		console.log(`\n${r.ok ? '通过' : '未通过'}（样本 ${r.samples} 帧）`);
		if ((injectRebuild || injectFreeze || injectBlackout) && r.ok) {
			console.error('注入模式下门禁竟然放行了 —— 门禁没牙');
			exitCode = 1;
		} else {
			exitCode = r.ok ? 0 : 1;
		}
	} else {
		const injectCanvasSwap = has('--inject-canvas-swap');
		const file = await collect({ injectCanvasSwap });
		const data = JSON.parse(fs.readFileSync(file, 'utf8'));

		console.log('\n=== 判定：真实数据必须绿 ===');
		const r = judge(data);
		for (const c of r.checks) {
			console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.id} ${c.title} — ${c.detail}`);
		}
		console.log(`\n${r.ok ? '通过' : '未通过'}（样本 ${r.samples} 帧）`);
		let ok = r.ok;

		if (injectCanvasSwap) {
			// 采集层注入：这次采到的**就是坏数据**，它必须判红，而且必须被 C1 抓住。
			// 前面三种注入都在判据层改样本，证明的是「判据会红」；
			// 这一种改的是页面本身，证明的是「采集器真能看见背景层被换掉」。
			const red = !r.ok;
			const caught = r.checks.filter(c => !c.ok).map(c => c.id).join(',') || '（无判据变红）';
			const pass = red && caught.includes('C1');
			if (!pass) { ok = false; }
			console.log('\n=== 注入「背景画布被换掉」（采集层）===');
			console.log(`  ${pass ? 'ok  ' : 'FAIL'} 真实数据 → ${red ? '判红' : '判绿'}，被 ${caught} 抓住（预期 C1）`);
			exitCode = pass ? 0 : 1;
		} else {
			// ---- 门禁必须自己有牙：同一份真实数据，注入三种典型故障，每一种都必须判红
			//
			// 这一段是这道门不可分割的一部分：光有判据不算数，
			// 得证明「坏数据进来一定红」，否则这条门就是假绿。
			console.log('\n=== 判定：注入故障必须判红（门禁自证有牙）===');
			const injections = [
				{ flag: 'injectRebuild', label: '背景重建（洞被铺回）', expect: 'C1' },
				{ flag: 'injectFreeze', label: '背景冻结', expect: 'C2' },
				{ flag: 'injectBlackout', label: '背景被清空', expect: 'C3' },
			];
			for (const inj of injections) {
				const ri = judge(data, { [inj.flag]: true });
				const red = !ri.ok;
				const caught = ri.checks.filter(c => !c.ok).map(c => c.id).join(',') || '（无判据变红）';
				// 既要「确实判红」，也要「是被预期的判据抓住」——
				// 靠别的判据偶然变红，等于这条注入没在考它该考的东西。
				const pass = red && caught.includes(inj.expect);
				if (!pass) { ok = false; }
				console.log(`  ${pass ? 'ok  ' : 'FAIL'} 注入「${inj.label}」→ ${red ? '判红' : '判绿'}，被 ${caught} 抓住（预期 ${inj.expect}）`);
			}

			exitCode = ok ? 0 : 1;
		}
	}
} catch (e) {
	console.error('背景连续性检查失败:', e && e.message ? e.message : e);
	exitCode = 2;
}
process.exit(exitCode);
