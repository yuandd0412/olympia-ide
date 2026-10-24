#!/usr/bin/env node
/*
 * final-verify.mjs —— 收尾验证编排（只编排，不新增判据）
 *
 * 目的：收尾要连着跑两件重活，顺序固定、不能漏：
 *   ① 进入动画逐帧抓帧（供目视审阅 + 给扫光门当数据）  capture-onboarding-frames.mjs
 *   ② 全量体检门（含产物一致性 + 全部真机门）          check-all.mjs --with-build
 *
 * ## 为什么只列两步，但收尾覆盖的东西比三步还多
 *
 * check-all.mjs 的登记表里**已经包含**这些真机门：
 *   · verify-onboarding-no-break.mjs（双路径无断点，--path 默认 both）
 *   · verify-onboarding-geometry.mjs（窗口几何真机门，9 个窗口形状）
 *   · check-backdrop-continuity.mjs（背景连续性真机门 + 两道注入自证）
 *   · analyze-sweep-bands.mjs（扫光几何门 + 自检 + 注入自证）
 * 所以另起一个「双路径无断点」独立步骤只会把同一条门跑两遍。
 *
 * ## ① 的产出必须喂给 ②（这是本脚本存在的核心理由）
 *
 * analyze-sweep-bands 是 check-all 里唯一**靠环境变量指路**的门
 * （requiresEnv: 'OLYMPIA_FRAMES_DIR'）。它读的是 ① 抓出来的 frames-report.json。
 * 抓帧是一次性产物，抓完就没了 —— 不把目录传过去，check-all 会打印
 * 「跳过 scripts/oneoff/analyze-sweep-bands.mjs（要跑请设 OLYMPIA_FRAMES_DIR=<目录>）」
 * 然后**照样 exit 0**。于是「扫光几何门没跑过」会被读成「全绿」。
 * 本脚本负责把 ① 的产出目录接上，并且在 ② 结束后**核对哪些门真的跑了**。
 *
 * ## 「最后一道闸」必须证明该跑的都跑了
 *
 * check-all 自己会把 needsBuild / requiresEnv 的门**跳过**并 exit 0。
 * 跳过 ≠ 通过。所以 ② 结束后本脚本逐条核对：
 *   · 关键真机门在日志里有对应的 ok 行（证明它真跑了，不是被跳过的）；
 *   · 日志里**一条「跳过」都不许有**。
 * 任何一条不满足 → 整轮判失败（退出码 1），哪怕 check-all 自己退的是 0。
 *
 * ## 为什么要有「独占机器」前置检查
 *
 * 这些门都要启产品、走 CDP、采像素。机器上同时跑着别的重活时，
 * CDP 采样的时间间隔会从 ~60ms 涨到 500ms+，
 * 于是「闪点窗口宽度」「洞面积单调性」这类**时序/像素判据**会假红。
 * 假红比不跑更坏 —— 它会把真问题埋掉，还会让人去改本来正确的代码。
 *
 * 所以这里**不硬跑**：检测到冲突就打印清楚原因、退出码 2，
 * 由人决定什么时候跑。
 *
 * ## 前置检查的判据（每条都有理由，别随手改）
 *
 *   · Olympia：按 **Name 字段**判（进程名就是 Olympia.exe），**不**按命令行里
 *     出现 "Olympia.exe" 字样 —— 那样 `rg Olympia.exe`、`grep` 这类命令会被误判成占用者。
 *   · 自排除：凡在**本进程祖先链**上的 PID 一律不算占用者。
 *     这一条是必须的：官方派发器是 .collab/scripts/qcli-run.mjs，
 *     它自己的命令行就含 "qcli-run.mjs"，没有自排除的话按文档方式派发
 *     必然「有 Qoder 进程在跑」→ 前置不过 → 退出 2 → 永远跑不起来。
 *     祖先链之外的真·别的 qcli 派单，仍然会被命中。
 *   · ZCode：只判**在推理的执行体**（zcode-run.mjs / zcode-appserver-run.mjs，
 *     或 zcode.cjs 带 --print）。用户的常驻 GUI（zcode.exe / app-server）不算 ——
 *     它空闲时不推理，不该把收尾堵死。
 *   · 快照拿不到 → **直接判前置不满足**（退出 2）。降级成「无法确认」然后照跑，
 *     是另一种假绿。
 *   · 命令行读不到的进程（别的用户 / 受保护进程）对判据不可见 → 记为提示。
 *     但如果这种进程里有一个叫 Olympia.exe 的，它仍会被算成占用者（见上）。
 *
 * ## 语义边界（写在前面，免得被当成保证）
 *
 * 「独占」只保证**起跑瞬间**没有冲突（TOCTOU：快照到 spawn 之间别人起跑，
 * 本脚本看不见）。它不保证运行期独占。
 *
 * ## 用法
 *
 *   node scripts/oneoff/final-verify.mjs [--skip-preflight] [--product <产品目录>]
 *                              [--only frames|check-all] [--out <日志目录>]
 *                              [--dry-run]
 *
 *   --dry-run：只跑前置检查 + 打印步骤表，不启动任何门（用来验证编排本身）。
 *   --only：选某一步时**自动补跑它前面的步骤**（顺序语义不能被绕开）。
 *
 * 退出码：0 = 全过；1 = 有步骤失败或有门被跳过；2 = 前置条件不满足（没跑）。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const PRODUCT = arg('--product', path.join(repoRoot, 'VSCode-win32-x64'));
const OUTDIR = arg('--out', path.join(repoRoot, '.scratch', 'final-verify'));
const ONLY = arg('--only', 'all');
const MIN_FREE_GB = Number(arg('--min-free-gb', '6'));
const DRY_RUN = has('--dry-run');

const FRAMES_DIR = path.join(OUTDIR, 'frames');

const STEPS = [
	{
		id: 'frames',
		title: '进入动画逐帧抓帧',
		script: path.join(repoRoot, 'scripts', 'oneoff', 'capture-onboarding-frames.mjs'),
		args: ['--product', PRODUCT, '--out', FRAMES_DIR],
		timeoutMs: 20 * 60 * 1000,
	},
	{
		id: 'check-all',
		title: '全量体检门（产物一致性 + 全部真机门 + 扫光几何门）',
		script: path.join(repoRoot, 'scripts', 'oneoff', 'check-all.mjs'),
		args: ['--with-build'],
		// 里面含几何门 / 双路径无断点 / 背景连续性 / 扫光几何门，全是真机重活。
		timeoutMs: 90 * 60 * 1000,
	},
];

/**
 * 收尾必须证明「这些门真跑过」。
 *
 * 判据是 check-all 日志里的 ok 行 + 门名 + 场景名：
 *   check-all 打印格式是 `${ok ? 'ok  ' : 'FAIL'} ${label} —— ${保证}`
 *   其中 label = `文件（场景名）`，没写场景名的门就只有文件名。
 * name 写上，是为了区分同一文件的多个登记（例如背景连续性有自检/真机/注入三条，
 * 只认「真机」那条；自检不算覆盖率）。
 */
const MUST_RUN = [
	{ file: 'scripts/oneoff/verify-onboarding-no-break.mjs', what: '双路径无断点真机门' },
	{ file: 'scripts/oneoff/verify-onboarding-geometry.mjs', name: '窗口几何真机门', what: '窗口几何真机门' },
	{ file: 'scripts/oneoff/check-backdrop-continuity.mjs', name: '背景连续性真机门', what: '背景连续性真机门' },
	{ file: 'scripts/oneoff/analyze-sweep-bands.mjs', what: '扫光几何门（读本次抓帧）' },
];

// ---------- 进程快照 ----------
const SELF_PID = process.pid;

/**
 * 取一次进程快照。
 *
 * 返回 null = **拿不到**（PowerShell 查询失败 / JSON 解析失败）。
 * 调用方必须把 null 当成「无法确认独占」→ 前置不满足，不能当成「没人」。
 */
function processSnapshot() {
	let raw = '';
	try {
		raw = execFileSync(
			'powershell.exe',
			['-NoProfile', '-NonInteractive', '-Command',
				'Get-CimInstance Win32_Process | Select-Object Name,ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress -Depth 3'],
			{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true, timeout: 30000 }
		);
	} catch (e) {
		return null;
	}
	let j;
	try { j = JSON.parse(raw); } catch { return null; }
	if (!j) return [];
	return Array.isArray(j) ? j : [j];
}

/**
 * 本进程的祖先链（PID 集合）。
 *
 * 用来把「我自己这条派发链路上的进程」排除掉 —— 尤其是 qcli-run.mjs：
 * 官方派发器自己的命令行就含 "qcli-run.mjs"，不排除的话前置检查永远不过。
 * 链在某个 PID 读不到 ParentProcessId 时断掉（跨权限时会断），断掉之后
 * 剩下的进程就当占用者处理 —— 宁可挡住运行，也不能放进一个干扰源。
 */
function ancestorChain(procs) {
	const byPid = new Map();
	for (const p of procs) {
		const pid = Number(p && p.ProcessId);
		if (Number.isFinite(pid) && pid > 0) { byPid.set(pid, p); }
	}
	const chain = new Set([SELF_PID]);
	let cur = byPid.get(SELF_PID);
	let guard = 0;
	while (cur && guard++ < 64) {
		const ppid = Number(cur.ParentProcessId);
		if (!Number.isFinite(ppid) || ppid <= 0 || chain.has(ppid)) { break; }
		chain.add(ppid);
		cur = byPid.get(ppid);
	}
	return chain;
}

function preflight(procs) {
	const problems = [];
	const notes = [];

	if (procs === null) {
		// 拿不到快照 = 无法确认独占 = 前置不满足。降级成「提示」然后照跑是另一种假绿。
		problems.push('拿不到进程快照（PowerShell 查询失败）—— 无法确认机器空闲，本次不跑。'
			+ '确实要硬跑加 --skip-preflight。');
		return { problems, notes, freeGb: os.freemem() / 1073741824 };
	}

	const chain = ancestorChain(procs);
	const isOurs = (p) => chain.has(Number(p && p.ProcessId));
	const cmdOf = (p) => (p && typeof p.CommandLine === 'string') ? p.CommandLine : '';
	const nameOf = (p) => (p && typeof p.Name === 'string') ? p.Name.toLowerCase() : '';
	// 命令行可读 + 不在自己链上的进程，才拿来当占用者看
	const hit = (pred) => procs.filter(p => p && !isOurs(p) && typeof p.CommandLine === 'string' && pred(p.CommandLine, p));

	// Olympia 按进程名判 —— 命令行里出现 "Olympia.exe" 字样的搜索/grep 命令不算占用者。
	const olympia = procs.filter(p => nameOf(p) === 'olympia.exe' && !isOurs(p));

	// ZCode：只判在推理的执行体；用户的常驻 GUI（zcode.exe / app-server）不算。
	const zcode = hit(c => /zcode-run\.mjs|zcode-appserver-run\.mjs/i.test(c)
		|| (/zcode\.cjs/i.test(c) && /--print\b/i.test(c)));

	// Qoder 派单执行体。**不写命令行自排除** —— 靠祖先链排除自己那条链路，
	// 这样别的 terminal 里真起的 qcli 仍然会被命中（真阳性保留）。
	const qcli = hit(c => /qcli-run\.mjs/i.test(c));

	const heavy = hit(c => /gulpless|oss-package|compile-extensions|\btsc\b/i.test(c));

	if (olympia.length) {
		problems.push('已有 ' + olympia.length + ' 个 Olympia 进程在跑（PID '
			+ olympia.map(p => p.ProcessId).join(',') + '）—— 真机门会互相抢 CDP。');
	}
	if (zcode.length) {
		problems.push('有 ' + zcode.length + ' 个 ZCode 推理进程在跑（PID '
			+ zcode.map(p => p.ProcessId).join(',') + '）—— 模型推理是重活，会拖慢 CDP 采样造成假红。');
	}
	if (qcli.length) {
		problems.push('有 ' + qcli.length + ' 个 Qoder 派单进程在跑（PID '
			+ qcli.map(p => p.ProcessId).join(',') + '）—— 同上。');
	}
	if (heavy.length) {
		problems.push('有 ' + heavy.length + ' 个疑似编译/打包进程在跑（PID '
			+ heavy.map(p => p.ProcessId).join(',') + '）。');
	}

	const blind = procs.filter(p => p && !isOurs(p) && typeof p.CommandLine !== 'string').length;
	if (blind > 0) {
		notes.push('有 ' + blind + ' 个进程读不到命令行（别的用户 / 受保护进程）—— 它们对本次判定不可见；'
			+ '若其中有 Olympia 进程，上面的 Olympia 检查仍会算成占用者。');
	}

	const freeGb = os.freemem() / 1073741824;
	if (freeGb < MIN_FREE_GB) {
		problems.push('可用内存只有 ' + freeGb.toFixed(1) + ' GB（要求 ≥ ' + MIN_FREE_GB +
			' GB）—— CDP 采帧会因换页而抖动。');
	}

	const exe = path.join(PRODUCT, 'Olympia.exe');
	if (!fs.existsSync(exe)) {
		problems.push('产品不存在：' + exe + ' —— 先出包（build/oss-package.ps1 + gulp vscode-win32-x64-user-setup）。');
	}

	// check-all.mjs 把产品目录写死成 repoRoot/VSCode-win32-x64，**不吃 --product**。
	// 两者不一致时 check-all 会去检另一个目录 —— 整条链路就在「根本没检查产品」上绿了。
	const defaultProduct = path.join(repoRoot, 'VSCode-win32-x64');
	if (path.resolve(PRODUCT) !== path.resolve(defaultProduct)) {
		problems.push('产品目录与 check-all.mjs 写死的默认值不一致：本次指定 ' + PRODUCT
			+ '，check-all 只会查 ' + defaultProduct + ' —— 会检错产品。要么用默认目录，'
			+ '要么先给 check-all.mjs 加上 --product。');
	}

	return { problems, notes, freeGb };
}

// ---------- 跑步骤 ----------
let currentChild = null;

/** 杀掉一整棵进程树。子脚本起的 Olympia 在它的后代里，必须一起带走。 */
function killTree(pid) {
	if (!pid) { return; }
	try {
		execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, timeout: 30000 });
		console.error('  已杀掉进程树 PID=' + pid);
	} catch (e) {
		console.error('  杀进程树 PID=' + pid + ' 失败：' + (e && e.message ? e.message : e));
	}
}

/**
 * 杀掉「本次运行期间新起的」Olympia 进程。
 *
 * 归属判据用**跑之前的 PID 差集**，不是按命令行特征猜：
 * 跑之前就已经存在的 Olympia 是用户的，不该动；本次新起的才是我们的产物
 * （子脚本被强杀时来不及跑自己的 cleanup）。
 */
function killNewOlympia(beforePids) {
	const procs = processSnapshot();
	if (!procs) { return; }
	const now = procs
		.filter(p => p && typeof p.Name === 'string' && p.Name.toLowerCase() === 'olympia.exe')
		.map(p => Number(p.ProcessId))
		.filter(n => Number.isFinite(n) && n > 0 && !beforePids.has(n));
	for (const pid of now) {
		try { process.kill(pid); } catch { /* 已退出 */ }
	}
	if (now.length) { console.error('  清理本次新起的 Olympia 进程 ' + now.length + ' 个：' + now.join(',')); }
}

/** 跑之前记一份 Olympia PID 集合，作为归属基线。 */
function olympiaPidsNow() {
	const procs = processSnapshot();
	if (!procs) { return new Set(); }
	const s = new Set();
	for (const p of procs) {
		if (p && typeof p.Name === 'string' && p.Name.toLowerCase() === 'olympia.exe') {
			const pid = Number(p.ProcessId);
			if (Number.isFinite(pid) && pid > 0) { s.add(pid); }
		}
	}
	return s;
}

const LOG_MAX_BYTES = 64 * 1024 * 1024;

/**
 * 跑一个步骤：流式透传输出 + 心跳 + 墙钟上限 + 超时杀树。
 *
 * 为什么不用 spawnSync：
 *   · spawnSync + pipe = 全量缓冲，子进程跑完之前一行都不吐 —— 看着像卡死；
 *   · spawnSync 没有 timeout，卡住就是永远卡住；
 *   · spawnSync 被杀时不会带走子进程起的 Olympia，留下孤儿继续占屏占端口，
 *     把下一次运行一起毒化（这正是前置检查要避免的局面）。
 */
async function runStep(step, env) {
	const log = path.join(OUTDIR, step.id + '.log');
	fs.mkdirSync(OUTDIR, { recursive: true });
	console.log('\n---------- [' + step.id + '] ' + step.title + ' ----------');
	console.log('  命令：node ' + step.script + ' ' + step.args.join(' '));
	if (env && Object.keys(env).length) {
		console.log('  环境：' + Object.entries(env).map(([k, v]) => k + '=' + v).join(' '));
	}
	const t0 = Date.now();
	const r = spawn(process.execPath, [step.script, ...step.args], {
		cwd: repoRoot,
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
		env: { ...process.env, ...(env || {}) },
	});
	currentChild = r;

	let out = '';
	const cap = (s) => {
		out += s;
		if (out.length > LOG_MAX_BYTES) { out = out.slice(out.length - LOG_MAX_BYTES); }
	};
	r.stdout.on('data', (d) => { const s = d.toString(); cap(s); process.stdout.write(s); });
	r.stderr.on('data', (d) => { const s = d.toString(); cap(s); process.stderr.write(s); });

	// 心跳：每 30 秒打一行，别让人以为卡死
	const beat = setInterval(() => {
		console.log('  … 仍在跑，已用时 ' + ((Date.now() - t0) / 1000).toFixed(0) + 's（' + step.id + '）');
	}, 30000);

	const outcome = await new Promise((resolve) => {
		let settled = false;
		const finish = (o) => { if (!settled) { settled = true; resolve(o); } };
		const timer = setTimeout(() => finish({ timedOut: true, code: null, signal: null, error: null }), step.timeoutMs);
		r.on('close', (code, signal) => { clearTimeout(timer); finish({ timedOut: false, code, signal, error: null }); });
		r.on('error', (e) => { clearTimeout(timer); finish({ timedOut: false, code: null, signal: null, error: e }); });
	});
	clearInterval(beat);
	currentChild = null;

	const dur = ((Date.now() - t0) / 1000).toFixed(1);
	fs.writeFileSync(log, out, 'utf8');

	let code;
	if (outcome.timedOut) {
		console.error('  ✗ 超时（上限 ' + Math.round(step.timeoutMs / 60000) + ' 分钟）');
		code = -1;
		killTree(r.pid);
	} else if (outcome.error) {
		console.error('  ✗ 起不来：' + (outcome.error.message || outcome.error));
		code = -1;
	} else {
		code = outcome.code === null ? -1 : outcome.code;
	}
	const signalTxt = outcome.signal ? (' signal=' + outcome.signal) : '';
	console.log('  exit=' + code + signalTxt + '  用时 ' + dur + 's  日志：' + log);
	return { id: step.id, code, dur, log, out, timedOut: !!outcome.timedOut };
}

/**
 * 核对 check-all 的日志：关键真机门真跑过 + 一条「跳过」都没有。
 *
 * 「跳过」也算失败 —— check-all 把被跳过的门算成 skipped 然后 exit 0，
 * 「没跑」被读成「没问题」正是这道闸要挡的事。
 */
function checkCoverage(logText) {
	const problems = [];
	const lines = logText.split(/\r?\n/);
	for (const m of MUST_RUN) {
		const hit = lines.some(l => {
			if (!/^ok\s+/.test(l)) { return false; }
			if (!l.includes(m.file)) { return false; }
			if (m.name && !l.includes('（' + m.name + '）')) { return false; }
			return true;
		});
		if (!hit) {
			problems.push('收尾没有证明「' + m.what + '」真跑过（check-all 日志里没有对应的 ok 行）');
		}
	}
	for (const l of lines) {
		if (/^跳过\s/.test(l)) { problems.push('有门被跳过了：' + l.trim()); }
	}
	return problems;
}

// ---------- 主流程 ----------
const order = STEPS.map(s => s.id);
const wanted = ONLY === 'all' ? order.slice() : (order.includes(ONLY) ? order.slice(0, order.indexOf(ONLY) + 1) : []);
if (!wanted.length) {
	console.error('未知 --only：' + ONLY + '（可选 ' + order.join('|') + '|all）');
	process.exit(2);
}
const steps = STEPS.filter(s => wanted.includes(s.id));

console.log('=== 收尾验证编排 ===');
console.log('产品目录：' + PRODUCT);
console.log('日志目录：' + OUTDIR);
console.log('步骤：' + steps.map(s => s.id).join(' → '));
if (ONLY !== 'all') {
	console.log('（--only ' + ONLY + '：按顺序语义已补跑前置步骤 ' + steps.slice(0, -1).map(s => s.id).join('、') + '）');
}

const olympiaBefore = olympiaPidsNow();

if (!has('--skip-preflight')) {
	const pf = preflight(processSnapshot());
	for (const n of pf.notes) console.log('  [提示] ' + n);
	if (pf.problems.length) {
		console.error('\n✗ 前置条件不满足，本次不跑（避免采样抖动造成假红）：');
		for (const p of pf.problems) console.error('  · ' + p);
		console.error('\n处理完上面的冲突再跑；确实要硬跑加 --skip-preflight。');
		process.exit(2);
	}
	console.log('  [前置] 通过（可用内存 ' + pf.freeGb.toFixed(1) + ' GB）');
} else {
	console.log('  [前置] 已跳过（--skip-preflight）');
}

if (DRY_RUN) {
	console.log('\n[dry-run] 不启动任何门。到此为止。');
	process.exit(0);
}

const results = [];
const extraProblems = [];

for (const s of steps) {
	// 只有 check-all 需要喂帧目录；frames 步骤自己产目录。
	const env = (s.id === 'check-all') ? { OLYMPIA_FRAMES_DIR: FRAMES_DIR } : {};
	const r = await runStep(s, env);
	results.push(r);

	if (s.id === 'frames') {
		const report = path.join(FRAMES_DIR, 'frames-report.json');
		if (!fs.existsSync(report)) {
			extraProblems.push('抓帧没有产出 frames-report.json（' + report + '）—— 扫光几何门会因此被跳过。');
		} else {
			try {
				const rep = JSON.parse(fs.readFileSync(report, 'utf8'));
				const n = Array.isArray(rep.frames) ? rep.frames.length : 0;
				const d = Array.isArray(rep.domTimeline) ? rep.domTimeline.length : 0;
				console.log('  抓帧产出：' + n + ' 张帧 / ' + d + ' 次 DOM 采样 → ' + report);
				if (n === 0) { extraProblems.push('抓帧一张都没抓到 —— 扫光几何门没有数据可判。'); }
			} catch (e) {
				extraProblems.push('frames-report.json 读不出来：' + (e && e.message ? e.message : e));
			}
		}
	}

	if (s.id === 'check-all') {
		const cov = checkCoverage(r.out);
		for (const c of cov) { extraProblems.push(c); }
		if (!cov.length) { console.log('  覆盖核对：关键真机门都真跑过，且没有门被跳过。'); }
	}

	if (r.code !== 0) {
		console.error('\n✗ [' + s.id + '] 失败（exit=' + r.code + '），后续步骤不跑了。');
		break;
	}
}

console.log('\n=== 汇总 ===');
for (const r of results) {
	console.log('  ' + (r.code === 0 ? '✓' : '✗') + ' ' + r.id.padEnd(10) + ' exit=' + r.code + '  ' + r.dur + 's  ' + r.log);
}
const skipped = steps.length - results.length;
if (skipped > 0) { console.log('  （未执行 ' + skipped + ' 步）'); }
if (extraProblems.length) {
	console.log('\n✗ 收尾覆盖核对没过：');
	for (const p of extraProblems) { console.error('  · ' + p); }
}
const failed = results.filter(r => r.code !== 0);
console.log(failed.length || extraProblems.length ? '结果：失败' : '结果：全过');
process.exit(failed.length || extraProblems.length ? 1 : 0);
