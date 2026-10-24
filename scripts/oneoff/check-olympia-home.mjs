#!/usr/bin/env node
/*
 * check-olympia-home.mjs
 *
 * 「首页完全替换」的确定性静态断言。
 *
 * ## 为什么要有这个脚本
 *
 * T-065 要把「首页」整体换成 Olympia 自己的：开始页的内容、「帮助 > 欢迎」的落点、
 * 以及空编辑区的那一屏（三处共用一份视图）。这件事一旦被静默破坏，用户看到的
 * 表现是「点欢迎没反应」「空编辑区还是 VS Code 那套大 logo」——都不报错，
 * 只会被当成「这个 IDE 就是这样」。
 *
 * 所以这批约束必须钉成可重复的检查：
 *
 *   1. 劫持点真的存在，且只劫持「完全无参」的调用；
 *   2. 判据本身的行为正确 —— 这里**真的把源码里的函数跑起来**，喂真值表；
 *   3. 首页上的每一个入口都指向**真实存在**的命令（扩展命令查 package.json，
 *      内核命令回上游源码里找注册点）；
 *   4. 三处落点共用同一份视图（不会各自长成三套 UI）；
 *   5. CSS 红线没破（class substring 选择器 / :has() / 硬编码色值 / 越权动画）。
 *
 * ## 关键设计：真跑判据，而不是匹配写法
 *
 * 判据函数 `olympiaShouldInterceptWelcome` 住在 TypeScript 源里。门禁**不**去匹配
 * 「源码里有没有 `walkthroughID === undefined`」这种写法 —— 那种判据换个等价的写法
 * 就会假绿，而且它管的是形式不是行为。
 *
 * 这里做的是：把那个函数从源码里抠出来，剥掉参数与返回值的类型标注，
 * 用 `new Function` 构造出来**真的调用**，喂 7 组输入，断言返回的真值表。
 * 改判据 → 真值表立刻红。这才有牙。
 *
 * 约定：
 *   - 每条断言输出一行：PASS <编号> <描述>  或  FAIL <编号> <描述> —— <具体原因>
 *   - 依赖的文件缺失：先打印 MISSING <path>，再让相关断言判 FAIL。
 *   - exit 0 = 全绿；exit 1 = 至少一条断言失败。
 *
 * 本脚本位于外层仓库（不在 oss/ 里）：oss 仓的 husky pre-commit（hygiene）会拒收新增的
 * .mjs/.js/.cjs，放在 oss/ 下会被自己的守卫挡住。
 */

import fs from 'node:fs';
import path from 'node:path';

import { stripComments, stripTsComments } from './lib/ts-lexer.mjs';

const REPO = process.env.OLYMPIA_CHECK_REPO
	? path.resolve(process.env.OLYMPIA_CHECK_REPO)
	: path.resolve(import.meta.dirname, '..', '..');
const OSS = path.join(REPO, 'oss');

// ---------------------------------------------------------------------------
// 被检查的文件（相对外层仓库根，输出时也用这个相对形式，避免暴露绝对路径）
// ---------------------------------------------------------------------------
const OLYMPIA_BROWSER_DIR = 'oss/src/vs/workbench/contrib/olympia/browser';
const F_VIEW = `${OLYMPIA_BROWSER_DIR}/olympiaHomeView.ts`;
const F_EMPTY = `${OLYMPIA_BROWSER_DIR}/olympiaHomeEmptyState.ts`;
const F_CONTRIB = `${OLYMPIA_BROWSER_DIR}/olympiaHome.contribution.ts`;
const F_INTERCEPTOR = `${OLYMPIA_BROWSER_DIR}/olympiaHomeInterceptor.ts`;
const F_CSS = `${OLYMPIA_BROWSER_DIR}/media/olympiaHome.css`;
const F_WELCOME_PAGE = `${OLYMPIA_BROWSER_DIR}/olympiaWelcomePage.ts`;
const F_WELCOME_CONTRIB = `${OLYMPIA_BROWSER_DIR}/olympiaWelcome.contribution.ts`;
const F_GS = 'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts';
const F_WATERMARK = 'oss/src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts';
const F_CORE_CSS = 'oss/src/vs/workbench/browser/parts/editor/media/editorgroupview.css';
const F_EMPTY_STATE_SERVICE = 'oss/src/vs/workbench/services/editor/browser/editorEmptyStateService.ts';
const F_MAIN = 'oss/src/vs/workbench/workbench.common.main.ts';
const F_CODICONS = 'oss/src/vs/base/common/codiconsLibrary.ts';
const F_VARS = 'oss/build/lib/stylelint/vscode-known-variables.json';

// ---------------------------------------------------------------------------
// 读取（带 MISSING 报告）
// ---------------------------------------------------------------------------
const missing = new Set();
const cache = new Map();

/**
 * 读文件并**默认剥掉注释**。
 *
 * 断言看的是**代码**，不是文档里的散文。否则文件头一句「这里要判断 walkthroughID」
 * 就能把「必须判断 walkthroughID」这条断言自己判绿。所以注释在**读取层**就剥掉。
 */
function load(rel) {
	if (cache.has(rel)) return cache.get(rel);
	const abs = path.join(REPO, ...rel.split('/'));
	let text = null;
	try {
		const st = fs.statSync(abs);
		if (st.isFile()) text = fs.readFileSync(abs, 'utf8');
	} catch {
		text = null;
	}
	if (text === null) {
		if (!missing.has(rel)) {
			missing.add(rel);
			console.log(`MISSING ${rel}`);
		}
	} else if (rel.endsWith('.ts')) {
		text = stripTsComments(text);
	} else if (rel.endsWith('.css')) {
		text = stripComments(text);
	}
	cache.set(rel, text);
	return text;
}

/** 读**未经处理**的原文。只在确实要看注释内容时用。 */
function loadRaw(rel) {
	const abs = path.join(REPO, ...rel.split('/'));
	try {
		const st = fs.statSync(abs);
		if (st.isFile()) return fs.readFileSync(abs, 'utf8');
	} catch {
		return null;
	}
	return null;
}

// ---------------------------------------------------------------------------
// 文本工具
// ---------------------------------------------------------------------------

/** 从 openIdx（指向 open 字符）起做括号配对，返回包含两端括号的子串；失败返回 null。 */
function balanced(text, openIdx, open, close) {
	if (text[openIdx] !== open) return null;
	let depth = 0;
	for (let i = openIdx; i < text.length; i++) {
		const c = text[i];
		if (c === open) depth++;
		else if (c === close) {
			depth--;
			if (depth === 0) return text.slice(openIdx, i + 1);
		}
	}
	return null;
}

function shorten(s, n = 160) {
	const one = String(s).replace(/\s+/g, ' ').trim();
	return one.length <= n ? one : `${one.slice(0, n)}…`;
}

// ---------------------------------------------------------------------------
// 断言框架
// ---------------------------------------------------------------------------
const results = [];
function check(id, desc, fn) {
	let reason = null;
	try {
		reason = fn();
	} catch (e) {
		reason = `断言执行异常：${e && e.message ? e.message : String(e)}`;
	}
	const ok = reason === null || reason === undefined || reason === false;
	results.push({ id, desc, ok, reason: ok ? null : String(reason) });
	console.log(ok ? `PASS ${id} ${desc}` : `FAIL ${id} ${desc} —— ${String(reason)}`);
}

// ===========================================================================
// A. 新建文件存在 + 版权头
// ===========================================================================
const NEW_FILES = [
	{ id: 'A1', rel: F_VIEW },
	{ id: 'A2', rel: F_EMPTY },
	{ id: 'A3', rel: F_CONTRIB },
	{ id: 'A4', rel: F_INTERCEPTOR },
	{ id: 'A5', rel: F_CSS }
];

for (const { id, rel } of NEW_FILES) {
	check(id, `新增文件存在且非空：${rel}`, () => {
		/* raw-ok: 这一条判的是「文件存不存在、有没有内容」 */
		const t = loadRaw(rel);
		if (t === null) return `文件不存在（见上面的 MISSING ${rel}）`;
		if (t.trim().length === 0) return `文件为空`;
		return null;
	});
}

const COPYRIGHT_ID = { [F_VIEW]: 'A6', [F_EMPTY]: 'A7', [F_CONTRIB]: 'A8', [F_INTERCEPTOR]: 'A9' };
for (const [rel, id] of Object.entries(COPYRIGHT_ID)) {
	check(id, `${rel} 第 1 行是 Microsoft 版权头起始行`, () => {
		/* raw-ok: 版权头本身就是块注释，剥掉注释就看不见头了 */
		const t = loadRaw(rel);
		if (t === null) return `文件不存在（见上面的 MISSING ${rel}）`;
		const first = (t.split(/\r?\n/, 1)[0] || '').replace(/^\uFEFF/, '').trimStart();
		if (!first.startsWith('/*---')) return `第 1 行（trim 后）不是以 /*--- 开头，实际为：${shorten(first, 80) || '<空行>'}`;
		return null;
	});
}

// ===========================================================================
// B. 「帮助 > 欢迎」劫持点真的存在
// ===========================================================================
const gs = load(F_GS);

check('B1', 'gettingStarted.contribution.ts 里存在「无参→Olympia 首页」的劫持调用', () => {
	if (gs === null) return `文件不存在（见上面的 MISSING ${F_GS}）`;
	// 必须带**左括号**，也就是「调用点」而不是「这个名字出现过」。
	// 只查裸名字的话，import 语句就能把这条断言喂绿 —— 真正的调用点被删掉、
	// 用户点「帮助 > 欢迎」毫无反应，它照样绿。
	if (!gs.includes('olympiaShouldInterceptWelcome(')) {
		return '没有找到 olympiaShouldInterceptWelcome 的调用点 —— 劫持点被删了（只有 import 也算失效）';
	}
	return null;
});

check('B2', '劫持分支真的执行 olympia.openHome', () => {
	if (gs === null) return `文件不存在（见上面的 MISSING ${F_GS}）`;
	if (!gs.includes("'olympia.openHome'")) {
		return "劫持分支里没有 'olympia.openHome' —— 点欢迎会走到别的地方去";
	}
	return null;
});

check('B3', 'olympia.openHome 字面量在 contrib 侧与上游侧一致', () => {
	// 常量定义在 olympiaHomeView.ts（视图侧），命令注册在 olympiaHome.contribution.ts，
	// 上游拦截点在 gettingStarted.contribution.ts —— 三处必须指向同一个 id。
	const view = load(F_VIEW);
	if (view === null) return `文件不存在（见上面的 MISSING ${F_VIEW}）`;
	const m = /OLYMPIA_HOME_COMMAND_ID\s*=\s*'([^']+)'/.exec(view);
	if (!m) return 'olympiaHomeView.ts 里找不到 OLYMPIA_HOME_COMMAND_ID 的定义';
	const contribId = m[1];

	// 注册侧必须**引用这个常量**，而不是另写一个字面量 —— 否则改了一处就静默漂移。
	const contrib = load(F_CONTRIB);
	if (contrib === null) return `文件不存在（见上面的 MISSING ${F_CONTRIB}）`;
	if (!/import\s*\{[^}]*OLYMPIA_HOME_COMMAND_ID[^}]*\}\s*from\s*'\.\/olympiaHomeView\.js'/.test(contrib)) {
		return 'olympiaHome.contribution.ts 没有 import OLYMPIA_HOME_COMMAND_ID —— 注册侧可能自己写了个字面量';
	}
	if (!/id:\s*OLYMPIA_HOME_COMMAND_ID/.test(contrib)) {
		return 'olympiaHome.contribution.ts 的注册没有用 id: OLYMPIA_HOME_COMMAND_ID';
	}

	// 上游侧：必须是「拦截分支里的」executeCommand('...')，不能是文件里随便哪个命令。
	if (gs === null) return `文件不存在（见上面的 MISSING ${F_GS}）`;
	const branchIdx = gs.indexOf('olympiaShouldInterceptWelcome(');
	if (branchIdx < 0) return '上游侧找不到 olympiaShouldInterceptWelcome 的调用点';
	const upMatch = new RegExp(`executeCommand\\(\\s*'${contribId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\s*\\)`).exec(gs.slice(branchIdx));
	if (!upMatch) {
		return `上游拦截分支里没有 executeCommand('${contribId}')`;
	}
	return null;
});

check('B4', '上游的原生欢迎路径仍然可达（逃生口没被拆掉）', () => {
	if (gs === null) return `文件不存在（见上面的 MISSING ${F_GS}）`;
	// 原生分支靠的是 GettingStartedInput.RESOURCE；它被移除的话，
	// 用户就再也打不开上游那套演练了。
	if (!gs.includes('GettingStartedInput.RESOURCE')) {
		return '上游的 GettingStartedInput.RESOURCE 引用不见了 —— 原生欢迎路径被拆掉了';
	}
	return null;
});

check('B5', '劫持分支有 return，不会继续往下走进原生分支', () => {
	if (gs === null) return `文件不存在（见上面的 MISSING ${F_GS}）`;
	const idx = gs.indexOf("executeCommand('olympia.openHome')");
	if (idx < 0) return "找不到 executeCommand('olympia.openHome')";
	const after = gs.slice(idx, idx + 200);
	if (!/\breturn\b/.test(after)) {
		return '劫持分支执行完没有 return —— 会继续往下走进原生分支，两处都开';
	}
	return null;
});

check('B6', 'gettingStarted.contribution.ts import 了 olympiaHomeInterceptor', () => {
	if (gs === null) return `文件不存在（见上面的 MISSING ${F_GS}）`;
	if (!/import\s*\{[^}]*olympiaShouldInterceptWelcome[^}]*\}\s*from\s*'[^']*olympiaHomeInterceptor\.js'/.test(gs)) {
		return '没有从 olympiaHomeInterceptor.js import 判据 —— 判据模块被换掉了';
	}
	return null;
});

check('B7', '判据模块零 import（避免上游 import 它时形成依赖环）', () => {
	const t = load(F_INTERCEPTOR);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_INTERCEPTOR}）`;
	const found = t.match(/^\s*import\s/gm);
	if (found && found.length > 0) {
		return `判据模块里出现了 ${found.length} 条 import —— 它被上游文件 import 时可能形成依赖环`;
	}
	return null;
});

// ===========================================================================
// C. 真跑判据：把源码里的函数抠出来执行，喂真值表
// ===========================================================================

/**
 * 从 `olympiaHomeInterceptor.ts` 里抠出 `olympiaShouldInterceptWelcome` 的可执行形式。
 *
 * 做法：定位 `export function olympiaShouldInterceptWelcome(args: ...): boolean {`，
 * 用一条**窄**正则把参数标注与返回值标注去掉（这个函数的签名形状由我们自己控制，
 * 窄正则足够；正则一旦匹配不上就返回 null，让调用方判 FAIL —— 宁可红也不要静默放过）。
 */
function extractInterceptorFn() {
	const t = load(F_INTERCEPTOR);
	if (t === null) return null;
	const sigRe = /export function olympiaShouldInterceptWelcome\(\s*args\s*:[^)]*\)\s*:\s*boolean\s*\{/;
	const m = sigRe.exec(t);
	if (!m) return null;
	const openIdx = m.index + m[0].length - 1;
	const body = balanced(t, openIdx, '{', '}');
	if (!body) return null;
	const executable = `function olympiaShouldInterceptWelcome(args) ${body}`;
	try {
		// eslint-disable-next-line no-new-func
		return new Function(`${executable}; return olympiaShouldInterceptWelcome;`)();
	} catch {
		return null;
	}
}

const interceptorFn = extractInterceptorFn();

check('C1', '能从源码里抠出并执行 olympiaShouldInterceptWelcome', () => {
	if (!interceptorFn) {
		return '抠取或构造失败 —— 函数签名形状变了，或函数体语法有问题';
	}
	return null;
});

const TRUTH_TABLE = [
	{ id: 'C2', desc: '完全无参 → 接管（打开 Olympia 首页）', args: { walkthroughID: undefined, optionsOrToSide: undefined }, expected: true },
	{ id: 'C3', desc: '带 walkthrough id → 不接管（走上游那一套）', args: { walkthroughID: 'SetupAccessibility', optionsOrToSide: undefined }, expected: false },
	{ id: 'C4', desc: '带 walkthrough id+step → 不接管', args: { walkthroughID: { category: 'notebooks', step: 'notebookProfile' }, optionsOrToSide: undefined }, expected: false },
	{ id: 'C5', desc: '带 toSide 对象 → 不接管（调用方表达了意图）', args: { walkthroughID: undefined, optionsOrToSide: { toSide: true } }, expected: false },
	{ id: 'C6', desc: '带 inactive 对象 → 不接管', args: { walkthroughID: undefined, optionsOrToSide: { inactive: true } }, expected: false },
	{ id: 'C7', desc: '带布尔参数 → 不接管', args: { walkthroughID: undefined, optionsOrToSide: true }, expected: false },
	{ id: 'C8', desc: '两个参数都带 → 不接管', args: { walkthroughID: 'x', optionsOrToSide: { toSide: true } }, expected: false }
];

for (const { id, desc, args, expected } of TRUTH_TABLE) {
	check(id, `判据真值表：${desc}`, () => {
		if (!interceptorFn) return '判据函数抠不出来，无法验证';
		const got = interceptorFn(args);
		if (got !== expected) {
			return `期望 ${expected}，实际 ${got}（入参：${JSON.stringify(args)}）`;
		}
		return null;
	});
}

// ===========================================================================
// D. 空编辑区接管（内核扩展点）
// ===========================================================================
//
// ## 为什么是「内核扩展点」而不是「内核直接 import contrib」
//
// `src/vs/workbench/browser/**` 不允许 import `src/vs/workbench/contrib/**`
// （`eslint.config.js` 里 `src/vs/workbench/~` 的 `code-import-patterns` restrictions：
// contrib 只在测试文件里才放行）。所以扩展点住在 `services/editor/browser/` ——
// 内核和 contrib 都 import 得到，分层规则也不破。
//
// ## 契约
//
//   内核：问「当前有没有渲染器」→ 有就把空容器交给它 → 没有就渲染上游那套。
//   contrib：注册渲染器 → 往容器里填 Olympia 首页；开关关掉就注销渲染器。
// ===========================================================================
const wm = load(F_WATERMARK);

check('D1', 'editorGroupWatermark.ts 查询了空编辑区扩展点（内核会问「有没有自定义渲染器」）', () => {
	if (wm === null) return `文件不存在（见上面的 MISSING ${F_WATERMARK}）`;
	if (!/getEditorEmptyStateRenderer\s*\(\s*\)/.test(wm)) {
		return '没有找到 getEditorEmptyStateRenderer() 的调用点 —— 内核永远不会用上自定义渲染器';
	}
	return null;
});

check('D2', '内核从 services 层 import 扩展点，且没有 import contrib（分层不破）', () => {
	if (wm === null) return `文件不存在（见上面的 MISSING ${F_WATERMARK}）`;
	if (!/from\s*'[^']*services\/editor\/browser\/editorEmptyStateService\.js'/.test(wm)) {
		return '内核没有从 services/editor/browser/editorEmptyStateService.js import 扩展点';
	}
	// eslint 的 code-import-patterns 对 src/vs/workbench/~ 只放行 services 层，
	// contrib 只有测试文件才放行 —— 内核一旦 import contrib，eslint 直接失败。
	if (/from\s*'[^']*contrib\//.test(wm)) {
		return '内核 import 了 contrib —— 违反上游分层规则（eslint 会拦下来）';
	}
	return null;
});

check('D3', '上游 watermark 节点在自定义模式下被藏起来了', () => {
	if (wm === null) return `文件不存在（见上面的 MISSING ${F_WATERMARK}）`;
	// 必须用行内 style：上游那条 CSS 选择器带了四层前缀，特异性远高于 contrib 里的样式。
	if (!/this\.watermark\.style\.display\s*=\s*'none'/.test(wm)) {
		return "没有找到 this.watermark.style.display = 'none' —— 上游的 VS Code 大 logo 会和首页同时出现";
	}
	return null;
});

check('D4', '内核监听了渲染器变化事件（渲染器后注册也能生效）', () => {
	if (wm === null) return `文件不存在（见上面的 MISSING ${F_WATERMARK}）`;
	if (!/onDidChangeEditorEmptyStateRenderer\s*\(/.test(wm)) {
		return '没有订阅 onDidChangeEditorEmptyStateRenderer —— 渲染器注册晚了就永远不生效';
	}
	return null;
});

check('D5', '上游原生 watermark 的渲染路径仍然可达（关掉开关能原样退回去）', () => {
	if (wm === null) return `文件不存在（见上面的 MISSING ${F_WATERMARK}）`;
	// renderUpstreamWatermark 必须**被调用过**，不能只是定义在那儿。
	const defs = (wm.match(/renderUpstreamWatermark\s*\(/g) || []).length;
	if (defs < 2) {
		return `renderUpstreamWatermark 只出现了 ${defs} 次 —— 它只是定义、没有调用点，回退路径是死的`;
	}
	return null;
});

check('D6', 'contrib 侧与内核指向同一个扩展点文件', () => {
	const svc = load(F_EMPTY_STATE_SERVICE);
	if (svc === null) return `文件不存在（见上面的 MISSING ${F_EMPTY_STATE_SERVICE}）`;
	const empty = load(F_EMPTY);
	if (empty === null) return `文件不存在（见上面的 MISSING ${F_EMPTY}）`;
	const contrib = load(F_CONTRIB);
	if (contrib === null) return `文件不存在（见上面的 MISSING ${F_CONTRIB}）`;
	const want = 'services/editor/browser/editorEmptyStateService.js';
	if (!empty.includes(want)) {
		return `olympiaHomeEmptyState.ts 没有 import ${want}`;
	}
	if (!contrib.includes(want)) {
		return `olympiaHome.contribution.ts 没有 import ${want}`;
	}
	return null;
});

check('D7', 'olympia.home.emptyState 定义在 contrib 侧且注册为 boolean / 默认 true', () => {
	const empty = load(F_EMPTY);
	if (empty === null) return `文件不存在（见上面的 MISSING ${F_EMPTY}）`;
	const m = /OLYMPIA_HOME_EMPTY_STATE_CONFIGURATION_KEY\s*=\s*'([^']+)'/.exec(empty);
	if (!m) return 'contrib 侧找不到 OLYMPIA_HOME_EMPTY_STATE_CONFIGURATION_KEY 的定义';
	if (m[1] !== 'olympia.home.emptyState') {
		return `配置键写成了 '${m[1]}'，应为 'olympia.home.emptyState'`;
	}
	const welcome = load(F_WELCOME_CONTRIB);
	if (welcome === null) return `文件不存在（见上面的 MISSING ${F_WELCOME_CONTRIB}）`;
	const anchor = welcome.indexOf('OLYMPIA_HOME_EMPTY_STATE_CONFIGURATION_KEY]:');
	if (anchor < 0) return '配置节点里没有 olympia.home.emptyState 这一项';
	const body = balanced(welcome, welcome.indexOf('{', anchor), '{', '}');
	if (!body) return '取不到该配置项的定义体';
	if (!/type:\s*'boolean'/.test(body)) return 'olympia.home.emptyState 不是 boolean';
	if (!/default:\s*true/.test(body)) return 'olympia.home.emptyState 的默认值不是 true —— 空编辑区默认不会显示首页';
	return null;
});

check('D8', '槽位的几何规则在内核 CSS 里（否则首页在编辑区里尺寸塌成 0）', () => {
	const coreCss = load(F_CORE_CSS);
	if (coreCss === null) return `文件不存在（见上面的 MISSING ${F_CORE_CSS}）`;
	const idx = coreCss.indexOf('.editor-group-empty-state');
	if (idx < 0) return '内核 CSS 里没有 .editor-group-empty-state 的规则';
	const body = balanced(coreCss, coreCss.indexOf('{', idx), '{', '}');
	if (!body) return '取不到该规则体';
	if (!/position:\s*absolute/.test(body)) {
		return '槽位没有绝对定位 —— 它会把上游 watermark 顶到下面去';
	}
	if (!/top:\s*0/.test(body) || !/left:\s*0/.test(body)) {
		return '槽位没有铺满整个编辑区';
	}
	return null;
});

// ===========================================================================
// E. 首页入口：命令必须真的存在
// ===========================================================================

/**
 * 从 `olympiaHomeView.ts` 里解析出 `OLYMPIA_HOME_ACTIONS` 的每一项。
 *
 * 解析的是**数据**（id / command / icon / 是否有文案），不是写法。
 */
function extractHomeActions() {
	const t = load(F_VIEW);
	if (t === null) return null;
	const anchor = t.indexOf('export const OLYMPIA_HOME_ACTIONS');
	if (anchor < 0) return null;
	const eq = t.indexOf('=', anchor);
	const open = t.indexOf('[', eq);
	if (open < 0) return null;
	let depth = 0;
	let end = -1;
	for (let i = open; i < t.length; i++) {
		const c = t[i];
		if (c === '[') depth++;
		else if (c === ']') {
			depth--;
			if (depth === 0) { end = i; break; }
		}
	}
	if (end < 0) return null;
	const body = t.slice(open + 1, end);
	const objs = [];
	let d = 0;
	let start = -1;
	for (let i = 0; i < body.length; i++) {
		const c = body[i];
		if (c === '{') {
			if (d === 0) start = i;
			d++;
		} else if (c === '}') {
			d--;
			if (d === 0 && start >= 0) {
				objs.push(body.slice(start, i + 1));
				start = -1;
			}
		}
	}
	return objs.map(o => ({
		id: /id:\s*'([^']+)'/.exec(o)?.[1] ?? null,
		command: /command:\s*'([^']+)'/.exec(o)?.[1] ?? null,
		icon: /icon:\s*Codicon\.(\w+)/.exec(o)?.[1] ?? null,
		hasLabel: /label:\s*localize\(/.test(o),
		hasDescription: /description:\s*localize\(/.test(o),
	}));
}

const homeActions = extractHomeActions();

check('E1', '能从源码里解析出首页入口清单', () => {
	if (!homeActions) return '解析 OLYMPIA_HOME_ACTIONS 失败 —— 数组结构变了';
	if (homeActions.length === 0) return '首页一个入口都没有';
	return null;
});

check('E2', '首页入口数量是 8', () => {
	if (!homeActions) return '解析 OLYMPIA_HOME_ACTIONS 失败';
	if (homeActions.length !== 8) return `期望 8 个入口，实际 ${homeActions.length} 个`;
	return null;
});

check('E3', '每个入口都有 id / command / 图标 / 中文文案', () => {
	if (!homeActions) return '解析 OLYMPIA_HOME_ACTIONS 失败';
	for (const a of homeActions) {
		if (!a.id) return '有一个入口没有 id';
		if (!a.command) return `入口 ${a.id} 没有 command`;
		if (!a.icon) return `入口 ${a.id} 没有图标`;
		if (!a.hasLabel) return `入口 ${a.id} 没有 label 文案`;
		if (!a.hasDescription) return `入口 ${a.id} 没有 description 文案`;
	}
	return null;
});

/** 读内置扩展 package.json 里 contributes.commands 声明的命令 id。 */
function loadExtensionCommandIds() {
	const out = new Set();
	const extDir = path.join(OSS, 'extensions');
	let dirs = [];
	try {
		dirs = fs.readdirSync(extDir, { withFileTypes: true })
			.filter(e => e.isDirectory())
			.map(e => e.name);
	} catch {
		return out;
	}
	for (const d of dirs) {
		const f = path.join(extDir, d, 'package.json');
		let j = null;
		try {
			j = JSON.parse(fs.readFileSync(f, 'utf8'));
		} catch {
			continue;
		}
		const cmds = j && j.contributes && j.contributes.commands;
		if (!Array.isArray(cmds)) {
			continue;
		}
		for (const c of cmds) {
			if (c && typeof c.command === 'string') {
				out.add(c.command);
			}
		}
	}
	return out;
}

/**
 * 在上游源码里找这些命令 id 的注册点。
 *
 * 口径：命令 id 以**单引号字面量**的形式出现在 `oss/src/vs/workbench` 下的 .ts 里。
 * Action2 的 `id:`、`static readonly ID = '...'`、`CommandsRegistry.registerCommand({ id: '...' })`
 * 三种注册写法都能命中。
 *
 * ## 必须排除 contrib/olympia/
 *
 * 我们自己的 `olympiaHomeView.ts` 里就写着这些命令 id（首页要指向它们）。
 * 不排除的话，这条断言就变成「拿我们的声明跟它自己比」—— 恒绿。
 * 这跟设置页那边 D4 踩过的是同一个坑。
 */
function findUpstreamCommandIds(ids) {
	const found = new Set();
	const root = path.join(OSS, 'src', 'vs', 'workbench');
	const stack = [root];
	while (stack.length) {
		const dir = stack.pop();
		let entries = [];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const e of entries) {
			const p = path.join(dir, e.name);
			if (e.isDirectory()) {
				stack.push(p);
				continue;
			}
			if (!e.isFile() || !e.name.endsWith('.ts')) {
				continue;
			}
			// 排除我们自己写的 contrib —— 否则断言在拿我们的声明跟它自己对。
			const rel = path.relative(OSS, p).split(path.sep).join('/');
			if (rel.includes('/contrib/olympia/')) {
				continue;
			}
			let text = '';
			try {
				text = fs.readFileSync(p, 'utf8');
			} catch {
				continue;
			}
			for (const id of ids) {
				if (!found.has(id) && text.includes(`'${id}'`)) {
					found.add(id);
				}
			}
		}
	}
	return found;
}

const extCommandIds = loadExtensionCommandIds();

check('E4', '首页指向的扩展命令都在内置扩展里真实声明过', () => {
	if (!homeActions) return '解析 OLYMPIA_HOME_ACTIONS 失败';
	const extCmds = homeActions.map(a => a.command).filter(c => c && c.startsWith('olympia.'));
	if (extCmds.length === 0) return '首页里没有任何扩展命令入口 —— 解析可能失真';
	for (const c of extCmds) {
		if (!extCommandIds.has(c)) {
			return `命令 '${c}' 在内置扩展的 package.json 里没有声明 —— 点这个入口会没反应`;
		}
	}
	return null;
});

check('E5', '首页指向的内核命令在上游源码里都有注册点', () => {
	if (!homeActions) return '解析 OLYMPIA_HOME_ACTIONS 失败';
	const coreCmds = [...new Set(homeActions.map(a => a.command).filter(c => c && c.startsWith('workbench.action.')))];
	if (coreCmds.length === 0) return '首页里没有任何内核命令入口 —— 解析可能失真';
	const found = findUpstreamCommandIds(coreCmds);
	for (const c of coreCmds) {
		if (!found.has(c)) {
			return `命令 '${c}' 在上游源码里找不到注册点 —— 点这个入口会没反应`;
		}
	}
	return null;
});

check('E6', '首页页脚的「完整设置」指向原生设置页（workbench.action.openSettings2）', () => {
	const t = load(F_VIEW);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_VIEW}）`;
	if (!t.includes("'workbench.action.openSettings2'")) {
		return "首页页脚没有指向 'workbench.action.openSettings2' —— 用户从首页找不到完整设置页";
	}
	return null;
});

check('E7', '首页里的图标都是 codiconsLibrary 里真实存在的 codicon', () => {
	if (!homeActions) return '解析 OLYMPIA_HOME_ACTIONS 失败';
	const raw = loadRaw(F_CODICONS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_CODICONS}）`;
	const names = new Set();
	const re = /^\s*(\w+):\s*register\(/gm;
	let m;
	while ((m = re.exec(raw))) {
		names.add(m[1]);
	}
	for (const a of homeActions) {
		if (a.icon && !names.has(a.icon)) {
			return `图标 Codicon.${a.icon} 在 codiconsLibrary 里不存在 —— 这个入口会显示成一个空格子`;
		}
	}
	return null;
});

check('E8', '首页视图没有用 querySelector / querySelectorAll（上游 eslint 禁止）', () => {
	for (const rel of [F_VIEW, F_EMPTY, F_CONTRIB, F_WELCOME_PAGE]) {
		const t = load(rel);
		if (t === null) return `文件不存在（见上面的 MISSING ${rel}）`;
		if (/querySelector(All)?\s*\(/.test(t)) {
			return `${rel} 用了 querySelector —— 上游 eslint 的 no-restricted-syntax 会把它判红（warning 也算失败）`;
		}
	}
	return null;
});

// ===========================================================================
// F. 三处落点共用同一份视图
// ===========================================================================

check('F1', '开始页（OlympiaWelcomePage）用的是共享首页视图', () => {
	const t = load(F_WELCOME_PAGE);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_WELCOME_PAGE}）`;
	if (!t.includes('createOlympiaHomeView(')) {
		return '开始页没有调用 createOlympiaHomeView —— 内容和空编辑区会长成两套 UI';
	}
	return null;
});

check('F2', '空编辑区用的是共享首页视图', () => {
	const t = load(F_EMPTY);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_EMPTY}）`;
	if (!t.includes('createOlympiaHomeView(')) {
		return '空编辑区没有调用 createOlympiaHomeView —— 内容和开始页会长成两套 UI';
	}
	return null;
});

check('F3', '「打开 Olympia 首页」命令打开的是开始页那个 EditorInput', () => {
	const t = load(F_CONTRIB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_CONTRIB}）`;
	if (!t.includes('OlympiaWelcomeInput')) {
		return 'olympia.openHome 没有打开 OlympiaWelcomeInput —— 首页和开始页会变成两个页面';
	}
	return null;
});

check('F4', 'workbench.common.main.ts 引入了首页贡献', () => {
	const t = load(F_MAIN);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_MAIN}）`;
	if (!t.includes("import './contrib/olympia/browser/olympiaHome.contribution.js';")) {
		return 'workbench.common.main.ts 没有 import olympiaHome.contribution.js —— 命令根本不会被注册';
	}
	return null;
});

check('F5', '首页贡献的注册在欢迎贡献之后（注册顺序靠后 → 启动期不闪）', () => {
	const t = load(F_MAIN);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_MAIN}）`;
	const welcomeIdx = t.indexOf("import './contrib/olympia/browser/olympiaWelcome.contribution.js';");
	const homeIdx = t.indexOf("import './contrib/olympia/browser/olympiaHome.contribution.js';");
	if (welcomeIdx < 0) return '找不到欢迎贡献的 import';
	if (homeIdx < 0) return '找不到首页贡献的 import';
	if (homeIdx < welcomeIdx) {
		return '首页贡献排在欢迎贡献之前 —— 启动时首页先于开始页就绪，会闪一下';
	}
	return null;
});

// ===========================================================================
// G. CSS 红线
// ===========================================================================

check('G1', '首页 CSS 没有 class substring 选择器', () => {
	const css = load(F_CSS);
	if (css === null) return `文件不存在（见上面的 MISSING ${F_CSS}）`;
	if (/\[class\s*[~^$*|]?=/.test(css)) {
		return '出现了 [class*=...] 之类的 substring 选择器 —— workbench CSS 红线';
	}
	return null;
});

check('G2', '首页 CSS 没有 :has()', () => {
	const css = load(F_CSS);
	if (css === null) return `文件不存在（见上面的 MISSING ${F_CSS}）`;
	if (css.includes(':has(')) {
		return '出现了 :has() —— workbench CSS 红线（root 作用域禁用）';
	}
	return null;
});

check('G3', '首页 CSS 没有硬编码颜色（只用 --vscode-* 主题变量）', () => {
	const css = load(F_CSS);
	if (css === null) return `文件不存在（见上面的 MISSING ${F_CSS}）`;
	const bad = css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g);
	if (bad) {
		return `出现了硬编码颜色：${bad.slice(0, 5).join('、')}`;
	}
	return null;
});

check('G4', '首页 CSS 用到的 --vscode-* 变量都在 stylelint 已知名单里', () => {
	const css = load(F_CSS);
	if (css === null) return `文件不存在（见上面的 MISSING ${F_CSS}）`;
	let known = null;
	try {
		known = JSON.parse(loadRaw(F_VARS) ?? 'null');
	} catch {
		known = null;
	}
	if (!known) return `读不到 ${F_VARS} —— 无法核验变量名`;
	const pool = new Set([...(known.colors || []), ...(known.others || []), ...(known.sizes || [])]);
	const used = [...new Set((css.match(/var\((--[a-zA-Z0-9-]+)/g) || []).map(s => s.slice(4)))];
	for (const v of used) {
		if (!pool.has(v)) {
			return `变量 ${v} 不在 stylelint 的已知名单里 —— 上游 stylelint 会把它判成硬错误`;
		}
	}
	return null;
});

check('G5', '首页 CSS 没有 transition / animation（workbench 动画红线）', () => {
	const css = load(F_CSS);
	if (css === null) return `文件不存在（见上面的 MISSING ${F_CSS}）`;
	if (/\b(transition|animation)\s*:/.test(css)) {
		return '出现了 transition / animation —— workbench 动画只允许 transform / opacity';
	}
	return null;
});

// ===========================================================================
// 汇总
// ===========================================================================
const failed = results.filter(r => !r.ok);
console.log('');
console.log(`合计 ${results.length} 条断言，通过 ${results.length - failed.length} 条，失败 ${failed.length} 条。`);
if (failed.length) {
	console.log('失败清单：');
	for (const f of failed) {
		console.log(`  ${f.id} ${f.desc} —— ${f.reason}`);
	}
}
process.exit(failed.length === 0 ? 0 : 1);
