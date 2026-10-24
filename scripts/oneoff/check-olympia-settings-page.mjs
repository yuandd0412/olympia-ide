#!/usr/bin/env node
/*
 * check-olympia-settings-page.mjs
 *
 * 「设置完全替换」的确定性静态断言。
 *
 * ## 为什么要有这个脚本
 *
 * T-065 要把 `workbench.action.openSettings` 劫持到 Olympia 自绘的简化设置页。
 * 这件事一旦被静默破坏，用户看到的表现是「点齿轮没反应」或「设置页里的项改了不生效」——
 * 两者都不会报错，只会被当成「这个 IDE 就是这样」。
 * 所以这批约束必须钉成可重复的检查：
 *
 *   1. 劫持点真的存在，且只劫持「无参」调用；
 *   2. 原生设置页的逃生口**没有被移除**（移除了就再也找不回完整设置页）；
 *   3. 判据本身的行为正确 —— 这里**真的把源码里的函数跑起来**，喂真值表；
 *   4. 页面上每一个 configuration key 都有**真实定义**（否则改了没生效，且不报错）。
 *
 * ## 关键设计：真跑判据，而不是匹配写法
 *
 * 判据函数 `olympiaShouldInterceptSettings` 住在 TypeScript 源里。门禁**不**去匹配
 * 「源码里有没有 `query !== undefined`」这种写法 —— 那种判据换个等价的写法就会假绿，
 * 而且它管的是形式不是行为。
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
const F_INPUT = `${OLYMPIA_BROWSER_DIR}/olympiaSettingsInput.ts`;
const F_PAGE = `${OLYMPIA_BROWSER_DIR}/olympiaSettingsPage.ts`;
const F_SCHEMA = `${OLYMPIA_BROWSER_DIR}/olympiaSettingsSchema.ts`;
const F_CONTRIB = `${OLYMPIA_BROWSER_DIR}/olympiaSettings.contribution.ts`;
const F_INTERCEPTOR = `${OLYMPIA_BROWSER_DIR}/olympiaSettingsInterceptor.ts`;
const F_CSS = `${OLYMPIA_BROWSER_DIR}/media/olympiaSettings.css`;
const F_PREFERENCES = 'oss/src/vs/workbench/contrib/preferences/browser/preferences.contribution.ts';
const F_MAIN = 'oss/src/vs/workbench/workbench.common.main.ts';

// ---------------------------------------------------------------------------
// 读取（带 MISSING 报告）
// ---------------------------------------------------------------------------
const missing = new Set();
const cache = new Map();

/**
 * 读文件并**默认剥掉注释**。
 *
 * 断言看的是**代码**，不是文档里的散文。否则文件头一句「这里要判断 query」就能把
 * 「必须判断 query」这条断言自己判绿。所以注释在**读取层**就剥掉。
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
	{ id: 'A1', rel: F_INPUT },
	{ id: 'A2', rel: F_PAGE },
	{ id: 'A3', rel: F_SCHEMA },
	{ id: 'A4', rel: F_CONTRIB },
	{ id: 'A5', rel: F_INTERCEPTOR },
	{ id: 'A6', rel: F_CSS }
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

const COPYRIGHT_ID = { [F_INPUT]: 'A7', [F_PAGE]: 'A8', [F_SCHEMA]: 'A9', [F_CONTRIB]: 'A10', [F_INTERCEPTOR]: 'A11' };
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
// B. 劫持点真的存在，且原生逃生口还在
// ===========================================================================
const prefs = load(F_PREFERENCES);

check('B1', 'preferences.contribution.ts 里存在「无参→Olympia 设置页」的劫持调用', () => {
	if (prefs === null) return `文件不存在（见上面的 MISSING ${F_PREFERENCES}）`;
	// 必须带**左括号**，也就是「调用点」而不是「这个名字出现过」。
	//
	// 2026-10-24 变异测试 M3 抓到：只查裸名字的话，import 语句
	// （`import { olympiaShouldInterceptSettings } from '...'`）就能把这条断言喂绿 ——
	// 真正的调用点被删掉、用户点齿轮毫无反应，它照样绿。
	if (!prefs.includes('olympiaShouldInterceptSettings(')) {
		return '没有找到 olympiaShouldInterceptSettings 的调用点 —— 劫持点被删了（只有 import 也算失效）';
	}
	return null;
});

check('B2', '劫持调用发生在 workbench.action.openSettings 的动作里（不是别处）', () => {
	if (prefs === null) return `文件不存在（见上面的 MISSING ${F_PREFERENCES}）`;
	// SETTINGS_COMMAND_OPEN_SETTINGS 在上游文件里出现**两次**：
	//   ① 顶部 `const SETTINGS_COMMAND_OPEN_SETTINGS = 'workbench.action.openSettings';`（声明）
	//   ② 动作注册里的 `id: SETTINGS_COMMAND_OPEN_SETTINGS,`（使用）
	// 早先这里用 indexOf 取到的是 ①，于是切片在 `registerAction2` 处就结束，
	// 根本没覆盖到 run() 体 → 永远假红。必须锚定 ②。
	const idUse = /\bid\s*:\s*SETTINGS_COMMAND_OPEN_SETTINGS\b/.exec(prefs);
	if (!idUse) {
		return '找不到 `id: SETTINGS_COMMAND_OPEN_SETTINGS` —— 上游动作结构变了，锚点失效';
	}
	const anchor = idUse.index;
	// 从动作 id 往后到**下一个 registerAction2**（即下一个动作的注册起点），
	// 这段区间包含本动作的 run() 体 —— 劫持必须落在这里。
	const nextAction = prefs.indexOf('registerAction2', anchor + idUse[0].length);
	const scope = prefs.slice(anchor, nextAction < 0 ? prefs.length : nextAction);
	if (!scope.includes('olympiaShouldInterceptSettings')) {
		return 'openSettings 的动作体里没有劫持调用 —— 劫持被挪走或删了';
	}
	return null;
});

check('B3', '劫持分支执行的是 olympia.openSettings 命令', () => {
	if (prefs === null) return `文件不存在（见上面的 MISSING ${F_PREFERENCES}）`;
	if (!prefs.includes("executeCommand('olympia.openSettings')")) {
		return "没有找到 executeCommand('olympia.openSettings')";
	}
	return null;
});

check('B4', '原生设置页逃生口 workbench.action.openSettings2 仍然存在', () => {
	if (prefs === null) return `文件不存在（见上面的 MISSING ${F_PREFERENCES}）`;
	if (!prefs.includes("id: 'workbench.action.openSettings2'")) {
		return "上游的 workbench.action.openSettings2 动作被删了 —— 原生设置页将无法到达";
	}
	return null;
});

check('B5', '原生逃生口动作体内没有被劫持（openSettings2 仍直接开原生页）', () => {
	if (prefs === null) return `文件不存在（见上面的 MISSING ${F_PREFERENCES}）`;
	const idx = prefs.indexOf("id: 'workbench.action.openSettings2'");
	if (idx < 0) return '找不到 workbench.action.openSettings2 的定义';
	// 区间 = 从它的 id 到**下一个 registerAction2**（下一个动作的注册起点）。
	// 不用固定字数窗口 —— 上游改行数时窗口会悄悄失效。
	const nextAction = prefs.indexOf('registerAction2', idx + 20);
	const scope = prefs.slice(idx, nextAction < 0 ? prefs.length : nextAction);
	if (scope.includes('olympiaShouldInterceptSettings')) {
		return 'openSettings2 的动作体里也出现了劫持调用 —— 逃生口被封死了';
	}
	if (!scope.includes('openSettings(')) {
		return 'openSettings2 的动作体里没有调用 openSettings —— 它不再打开原生页';
	}
	return null;
});

check('B6', '拦截判据模块是零 import 的（避免上游文件 import 它时形成依赖环）', () => {
	const t = load(F_INTERCEPTOR);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_INTERCEPTOR}）`;
	const importRe = /^\s*import\s[^\n]*from\s/gm;
	const found = t.match(importRe);
	if (found && found.length > 0) {
		return `判据模块里出现了 ${found.length} 条 import —— 它被上游文件 import 时可能形成依赖环`;
	}
	return null;
});

// ===========================================================================
// C. 真跑判据：把源码里的函数抠出来执行，喂真值表
// ===========================================================================

/**
 * 从 `olympiaSettingsInterceptor.ts` 里抠出 `olympiaShouldInterceptSettings` 的可执行形式。
 *
 * 做法：定位 `export function olympiaShouldInterceptSettings(args: ...): boolean {`，
 * 用一条**窄**正则把参数标注与返回值标注去掉（这个函数的签名形状由我们自己控制，
 * 窄正则足够；正则一旦匹配不上就返回 null，让调用方判 FAIL —— 宁可红也不要静默放过）。
 */
function extractInterceptorFn() {
	const t = load(F_INTERCEPTOR);
	if (t === null) return null;
	const sigRe = /export function olympiaShouldInterceptSettings\(\s*args\s*:[^)]*\)\s*:\s*boolean\s*\{/;
	const m = sigRe.exec(t);
	if (!m) return null;
	const openIdx = m.index + m[0].length - 1;
	const body = balanced(t, openIdx, '{', '}');
	if (!body) return null;
	const executable = `function olympiaShouldInterceptSettings(args) ${body}`;
	try {
		// eslint-disable-next-line no-new-func
		return new Function(`${executable}; return olympiaShouldInterceptSettings;`)();
	} catch (e) {
		return null;
	}
}

const interceptorFn = extractInterceptorFn();

check('C1', '能从源码里抠出并执行 olympiaShouldInterceptSettings', () => {
	if (!interceptorFn) {
		return '抠取或构造失败 —— 函数签名形状变了，或函数体语法有问题';
	}
	return null;
});

const TRUTH_TABLE = [
	{ id: 'C2', desc: '无参调用 → 接管（打开 Olympia 简化设置页）', args: undefined, expected: true },
	{ id: 'C3', desc: '空对象调用 → 接管', args: {}, expected: true },
	{ id: 'C4', desc: '带 query → 不接管（走原生页）', args: { query: 'editor.fontSize' }, expected: false },
	{ id: 'C5', desc: '带空串 query → 不接管（存在即放行）', args: { query: '' }, expected: false },
	{ id: 'C6', desc: '带 focusSearch → 不接管', args: { focusSearch: true }, expected: false },
	{ id: 'C7', desc: '带 openToSide → 不接管', args: { openToSide: true }, expected: false },
	{ id: 'C8', desc: '带 revealSetting → 不接管', args: { revealSetting: { key: 'editor.fontSize' } }, expected: false }
];

for (const { id, desc, args, expected } of TRUTH_TABLE) {
	check(id, `判据真值表：${desc}`, () => {
		if (!interceptorFn) return '判据函数抠不出来，无法验证';
		const got = interceptorFn(args);
		if (got !== expected) {
			return `期望 ${expected}，实际 ${got}（入参：${JSON.stringify(args) ?? 'undefined'}）`;
		}
		return null;
	});
}

// ===========================================================================
// D. schema 里的每个 key 都有真实定义
// ===========================================================================

/** 从 schema 里抠出全部 `key: '...'`。 */
function schemaKeys() {
	const t = load(F_SCHEMA);
	if (t === null) return [];
	const out = [];
	const re = /\bkey\s*:\s*'([^']+)'/g;
	let m;
	while ((m = re.exec(t))) {
		out.push(m[1]);
	}
	return out;
}

/** 读内置扩展 package.json 里 `contributes.configuration.properties` 的 olympia.* 键。 */
function loadExtensionSchema() {
	const out = new Map();
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
		const props = j && j.contributes && j.contributes.configuration && j.contributes.configuration.properties;
		if (!props) {
			continue;
		}
		for (const [k, v] of Object.entries(props)) {
			if (!k.startsWith('olympia.')) {
				continue;
			}
			out.set(k, { type: v.type, enum: v.enum, default: v.default, file: d });
		}
	}
	return out;
}

const schemaKeyList = schemaKeys();
const extSchema = loadExtensionSchema();

check('D1', 'schema 里至少声明了 20 个控件', () => {
	if (schemaKeyList.length < 20) {
		return `只有 ${schemaKeyList.length} 个控件 —— 简化设置页太空了`;
	}
	return null;
});

check('D2', 'schema 里的 key 全局唯一（同一个 key 不能出现在两个分组）', () => {
	const seen = new Set();
	for (const k of schemaKeyList) {
		if (seen.has(k)) return `key 重复出现：${k}`;
		seen.add(k);
	}
	return null;
});

const olympiaKeys = schemaKeyList.filter(k => k.startsWith('olympia.'));
check('D3', '每个 olympia.* key 都在内置扩展 package.json 里有真实定义', () => {
	const bad = [];
	for (const k of olympiaKeys) {
		if (!extSchema.has(k)) {
			bad.push(k);
		}
	}
	if (bad.length > 0) {
		return `这些 key 在任何内置扩展里都没有定义（改了不会生效且不报错）：${bad.join(', ')}`;
	}
	return null;
});

check('D4', '每个上游 key（workbench./editor./files.）在 oss/src 里都有真实引用', () => {
	const upstreamKeys = schemaKeyList.filter(k => !k.startsWith('olympia.'));
	const bad = [];
	const srcRoot = path.join(OSS, 'src', 'vs');
	const files = [];
	const walk = dir => {
		let entries = [];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			const abs = path.join(dir, e.name);
			if (e.isDirectory()) {
				walk(abs);
			} else if (e.isFile() && e.name.endsWith('.ts')) {
				files.push(abs);
			}
		}
	};
	walk(srcRoot);
	if (files.length === 0) return `扫描不到 oss/src/vs 下的 .ts 文件（源目录不对？${srcRoot}）`;
	for (const key of upstreamKeys) {
		const needle = `'${key}'`;
		let found = false;
		for (const abs of files) {
			// **必须排除我们自己写的代码。**
			//
			// 2026-10-24：这条断言最初是假绿 —— 扫描范围是整个 oss/src/vs，
			// 而我们自己的 schema 文件（contrib/olympia/browser/olympiaSettingsSchema.ts）
			// 就在这个范围里，并且每个 key 都以 `key: 'xxx'` 的形式写在里面。
			// 于是「在 oss/src 里找得到这个字面量」永远成立 —— 断言在拿我们的声明
			// 跟它自己比，写错键名也不会红。
			//
			// 这条断言真正的意图是「这个键名在上游代码里真的存在」，
			// 所以扫描范围必须**排除 contrib/olympia/**（我们唯一的自研 contrib 目录）。
			const rel = path.relative(srcRoot, abs).split(path.sep).join('/');
			if (rel.includes('/contrib/olympia/')) {
				continue;
			}
			let text = '';
			try {
				text = fs.readFileSync(abs, 'utf8');
			} catch {
				continue;
			}
			if (text.includes(needle)) {
				found = true;
				break;
			}
		}
		if (!found) {
			bad.push(key);
		}
	}
	if (bad.length > 0) {
		return `这些上游 key 在上游代码（不含 contrib/olympia/）里找不到任何字面量引用（很可能写错了键名）：${bad.join(', ')}`;
	}
	return null;
});

// ===========================================================================
// E. 页面接线完整
// ===========================================================================

check('E1', 'workbench.common.main.ts 里 import 了 olympiaSettings.contribution.js', () => {
	const t = load(F_MAIN);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_MAIN}）`;
	if (!t.includes("import './contrib/olympia/browser/olympiaSettings.contribution.js'")) {
		return '没有 import olympiaSettings.contribution.js —— 页面永远不会被注册';
	}
	return null;
});

check('E2', 'contribution 注册了 olympia.openSettings 命令', () => {
	const t = load(F_CONTRIB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_CONTRIB}）`;
	if (!t.includes('OLYMPIA_SETTINGS_COMMAND_ID')) {
		return '没有引用 OLYMPIA_SETTINGS_COMMAND_ID';
	}
	return null;
});

check('E3', '命令 id 在 schema 与上游劫持点两处一致', () => {
	const schema = load(F_SCHEMA);
	if (schema === null) return `文件不存在（见上面的 MISSING ${F_SCHEMA}）`;
	const m = /OLYMPIA_SETTINGS_COMMAND_ID\s*=\s*'([^']+)'/.exec(schema);
	if (!m) return 'schema 里找不到 OLYMPIA_SETTINGS_COMMAND_ID 的定义';
	const id = m[1];
	if (id !== 'olympia.openSettings') return `命令 id 是 ${id}，与上游劫持点用的 olympia.openSettings 不一致`;
	if (prefs === null) return `文件不存在（见上面的 MISSING ${F_PREFERENCES}）`;
	if (!prefs.includes(`executeCommand('${id}')`)) {
		return `上游劫持点执行的不是 ${id}`;
	}
	return null;
});

check('E4', 'EditorResolver 的 pattern 与 EditorInput 的 scheme 字面量一致', () => {
	const contrib = load(F_CONTRIB);
	const input = load(F_INPUT);
	if (contrib === null) return `文件不存在（见上面的 MISSING ${F_CONTRIB}）`;
	if (input === null) return `文件不存在（见上面的 MISSING ${F_INPUT}）`;
	if (!contrib.includes("'olympia-settings:/**'")) {
		return "contribution 里没有注册 'olympia-settings:/**' 的 pattern";
	}
	if (!input.includes("scheme: 'olympia-settings'")) {
		return "EditorInput 里没有声明 scheme: 'olympia-settings'";
	}
	return null;
});

check('E5', '设置页提供「高级设置」按钮并指向原生设置页', () => {
	const page = load(F_PAGE);
	if (page === null) return `文件不存在（见上面的 MISSING ${F_PAGE}）`;
	if (!page.includes('workbench.action.openSettings2')) {
		return '页面里没有 workbench.action.openSettings2 —— 原生设置页的逃生口没了';
	}
	if (!page.includes('olympiaSettings-advanced')) {
		return '页面里没有「高级设置」按钮';
	}
	return null;
});

check('E6', '页面按分组渲染（引用了 OLYMPIA_SETTINGS_GROUPS）', () => {
	const page = load(F_PAGE);
	if (page === null) return `文件不存在（见上面的 MISSING ${F_PAGE}）`;
	if (!page.includes('OLYMPIA_SETTINGS_GROUPS')) {
		return '页面没有引用 OLYMPIA_SETTINGS_GROUPS —— 页面不会渲染任何分组';
	}
	return null;
});

check('E7', '页面用的配置读写 API 存在（IConfigurationService 的 getValue/updateValue）', () => {
	const page = load(F_PAGE);
	if (page === null) return `文件不存在（见上面的 MISSING ${F_PAGE}）`;
	if (!page.includes('IConfigurationService')) {
		return '页面没有注入 IConfigurationService';
	}
	if (!page.includes('.updateValue(')) {
		return '页面没有调用 updateValue —— 改了设置也写不进去';
	}
	return null;
});

// ===========================================================================
// F. CSS
// ===========================================================================

check('F1', 'CSS 里定义了 .olympiaSettings 根选择器', () => {
	const css = load(F_CSS);
	if (css === null) return `文件不存在（见上面的 MISSING ${F_CSS}）`;
	if (!css.includes('.olympiaSettings')) {
		return 'CSS 里没有 .olympiaSettings 选择器';
	}
	return null;
});

check('F2', 'CSS 里没有使用非 --vscode- 前缀的自定义变量', () => {
	const css = loadRaw(F_CSS);
	if (css === null) return `文件不存在（见上面的 MISSING ${F_CSS}）`;
	// 只看 var(--xxx) 的引用：找出所有既不是 --vscode-* 也不是 --olympia-* 的。
	const bad = new Set();
	const re = /var\(\s*(--[a-zA-Z0-9-]+)/g;
	let m;
	while ((m = re.exec(css))) {
		const v = m[1];
		if (!v.startsWith('--vscode-') && !v.startsWith('--olympia-')) {
			bad.add(v);
		}
	}
	if (bad.size > 0) {
		return `这些变量不是 --vscode-* / --olympia-* 前缀：${[...bad].join(', ')}`;
	}
	return null;
});

// ===========================================================================
// 汇总
// ===========================================================================
const failed = results.filter(r => !r.ok);
console.log('');
console.log(`检查项：${results.length}　通过：${results.length - failed.length}　失败：${failed.length}`);
if (failed.length > 0) {
	console.log('失败项：');
	for (const f of failed) {
		console.log(`  ${f.id} ${f.desc} —— ${f.reason}`);
	}
	process.exit(1);
}
process.exit(0);
