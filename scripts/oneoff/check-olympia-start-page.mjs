#!/usr/bin/env node
/*
 * check-olympia-start-page.mjs
 *
 * 开始页（Olympia Welcome）M1 接线的确定性静态断言。
 *
 * 为什么需要这个脚本：T-018 只落了 olympiaWelcomeInput.ts，剩下的 page / contribution / css
 * 由 mavis 继续写。这一批约束（scheme、配置节点 id、upstream 未被污染、CSS 红线）如果只靠
 * 肉眼看 diff，下一次上游合并或下一次“顺手改一下”就会悄悄破掉。所以把它们钉成可重复的检查。
 *
 * 约定：
 *   - 每条断言输出一行：PASS <编号> <描述>  或  FAIL <编号> <描述> —— <具体原因>
 *   - 依赖的文件缺失：先打印 MISSING <path>，再让相关断言判 FAIL。
 *     不允许因为文件不存在就跳过，也不允许输出绿色空壳。
 *   - exit 0 = 全绿；exit 1 = 至少一条断言失败。
 *   - 只做静态文本断言，不含任何时序判断（没有 Date.now()、没有 sleep、没有 timing）。
 *
 * 本脚本位于外层仓库（不在 oss/ 里）：oss 仓的 husky pre-commit（hygiene）会拒收新增的
 * .mjs/.js/.cjs，放在 oss/ 下会被自己的守卫挡住。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { stripComments, stripTsComments } from './lib/ts-lexer.mjs';

const REPO = process.env.OLYMPIA_CHECK_REPO
	? path.resolve(process.env.OLYMPIA_CHECK_REPO)
	: path.resolve(import.meta.dirname, '..', '..');
const OSS = path.join(REPO, 'oss');

// ---------------------------------------------------------------------------
// 被检查的文件（相对外层仓库根，输出时也用这个相对形式，避免暴露绝对路径）
// ---------------------------------------------------------------------------
const OLYMPIA_BROWSER_DIR = 'oss/src/vs/workbench/contrib/olympia/browser';
const F_INPUT = `${OLYMPIA_BROWSER_DIR}/olympiaWelcomeInput.ts`;
const F_PAGE = `${OLYMPIA_BROWSER_DIR}/olympiaWelcomePage.ts`;
const F_CONTRIB = `${OLYMPIA_BROWSER_DIR}/olympiaWelcome.contribution.ts`;
const F_CSS = `${OLYMPIA_BROWSER_DIR}/media/olympiaWelcome.css`;
const F_MAIN = 'oss/src/vs/workbench/workbench.common.main.ts';
const F_STARTUP = 'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/startupPage.ts';
const F_GS = 'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts';

// ---------------------------------------------------------------------------
// 读取（带 MISSING 报告）
// ---------------------------------------------------------------------------
const missing = new Set();
const cache = new Map();

/**
 * 读文件并**默认剥掉注释**。
 *
 * ## 为什么默认要剥
 *
 * 断言看的是**代码**，不是文档里的散文。否则文件头一句
 * 「这里不用 Date.now()」就能把「禁止 Date.now()」这条断言自己判绿 ——
 * 这个坑本脚本已经踩了两次：
 *
 *   - H2：贡献文件的头部注释里大段解释「为什么是 BlockStartup」，注释命中 → 真代码挪走照样绿。
 *   - H13：`olympiaOnboarding.ts` 里 `LifecyclePhase.Restored` **先出现在注释里**，
 *     注释一改，代码里那个判定被删掉，H13 照样绿。
 *
 * 所以这里在**读取层**就把这件事办掉，而不是指望每条断言都记得剥 ——
 * 指望是守不住的，本脚本已经证明过。
 *
 * 需要看原文的极少数情况（比如要报告「是哪一行注释写了错话」）用 loadRaw()，
 * 并且那一处必须带 `/* raw-ok: 理由 *\/` 标记 —— 见 Z2。
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

/** 读**未经处理**的原文。只在确实要看注释内容时用（见 Z2）。 */
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

function listTsUnder(dirRel) {
	const abs = path.join(REPO, ...dirRel.split('/'));
	const out = [];
	const walk = (a, relFromRepo) => {
		let entries;
		try {
			entries = fs.readdirSync(a, { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			const childAbs = path.join(a, e.name);
			const childRel = `${relFromRepo}/${e.name}`;
			if (e.isDirectory()) walk(childAbs, childRel);
			else if (e.isFile() && e.name.endsWith('.ts')) out.push({ rel: childRel, text: stripTsComments(fs.readFileSync(childAbs, 'utf8')) });
		}
	};
	walk(abs, dirRel);
	return out;
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

/**
 * 检查「时间戳哨兵」用得对不对。
 *
 * ## 为什么这是一类独立的错误
 *
 * rAF 的帧时间戳是**非负**的单调时钟（performance.now() 基准）。
 * 拿 0 当「还没设置过」的哨兵，等于赌「0 永不出现」——
 * 一旦真的取到 0，「等待了多久」恒为 0，硬上限永远不触发，闸门无限等待；
 * 或者「补间起点」落在 0 时刻，进度一步冲到 1，卡片瞬移。
 *
 * 正确的哨兵必须**落在合法域之外**（负数）。
 *
 * ## 判据
 *
 * 1. 变量的初值必须是负数；
 * 2. 使用处的比较必须和这个初值**一致**（同一个哨兵），
 *    否则判定永远不成立；
 * 3. 比较的**方向**必须正确：
 *    - `===` 且右值 === 初值 → 对；
 *    - `<` 且右值 === 0 → 对（负数区间）；
 *    - 其余（`> / >= / <= / !=`）→ 语义反了。
 *
 * @param code 已剥注释的源码
 * @param varName 变量名
 * @param useScope 要检查的比较所在作用域文本（通常是某个函数体）
 * @returns {string|null} 出错原因；通过返回 null
 */
function checkSentinel(code, varName, useScope) {
	const init = new RegExp(`(?:private|public|protected|readonly|\\s)*${varName}\\s*=\\s*(-?\\d+)`).exec(code);
	if (!init) {
		return `找不到 ${varName} 的初值声明`;
	}
	const sentinel = Number(init[1]);
	if (sentinel >= 0) {
		return `${varName} 的初值是 ${sentinel} —— rAF 时间戳是非负的单调时钟，${sentinel} 也是它的合法取值，拿它当「还没设置过」的哨兵等于赌「这个值永不出现」`;
	}
	const cmp = new RegExp(`${varName}\\s*(===|!==|==|!=|<=|>=|<|>)\\s*(-?\\d+)`).exec(useScope);
	if (!cmp) {
		return `${varName} 没有被拿来判断「还没设置过」`;
	}
	const op = cmp[1];
	const right = Number(cmp[2]);
	if (op === '===') {
		if (right !== sentinel) {
			return `${varName} 的比较用的是 ${op} ${right}，而它的初值是 ${sentinel} —— 两者不一致，这个判定永远不成立`;
		}
		return null;
	}
	if (op === '<') {
		if (right !== 0) {
			return `${varName} 的比较用的是 < ${right}，判不了「初值 ${sentinel}」（负数区间）这条状态`;
		}
		return null;
	}
	return `${varName} 的比较用的是 ${op} ${right} —— 对一个初值为 ${sentinel} 的「还没设置过」哨兵来说，这个方向判反了`;
}

/**
 * 逐字符算括号深度（跳过字符串字面量里的括号）。
 *
 * `depths[i]` 是第 i 个字符**之前**的深度。用来区分「对象里的顶层键」和
 * 「嵌套对象里的键」—— 配置属性的定义体是 `{ scope, type, default, description }`，
 * 不看深度的话 `type:` / `default:` 会被当成属性键。
 */
function braceDepths(text) {
	const depths = new Array(text.length);
	let d = 0;
	let i = 0;
	while (i < text.length) {
		const c = text[i];
		depths[i] = d;
		if (c === '"' || c === "'" || c === '`') {
			const quote = c;
			i++;
			while (i < text.length) {
				depths[i] = d;
				if (text[i] === '\\') {
					if (i + 1 < text.length) {
						depths[i + 1] = d;
						i += 2;
						continue;
					}
					i++;
					continue;
				}
				if (text[i] === quote) {
					i++;
					break;
				}
				i++;
			}
			continue;
		}
		if (c === '{' || c === '[' || c === '(') {
			d++;
		} else if (c === '}' || c === ']' || c === ')') {
			d--;
		}
		i++;
	}
	return depths;
}

/**
 * 找出所有对 `this.backdropTime` 的赋值。
 *
 * 返回 [{ op, rhs }]，op ∈ { '+=', '-=', '++', '--', '=' }。
 *
 * 为什么不用「必须写成 `+=`」当判据：那是一种**写法**而不是**语义**。
 * `this.backdropTime = this.backdropTime + delta;` 同样单调，
 * 把它判红只会逼着大家保留一种写法，并不能真的防住「时钟被重置」。
 */
function findBackdropTimeAssignments(code) {
	const out = [];
	const re = /this\.backdropTime\s*(\+\+|--|\+=|-=|(?<![=!<>])=(?!=))\s*([^;]*);/g;
	let m;
	while ((m = re.exec(code))) {
		out.push({ op: m[1], rhs: (m[2] || '').trim() });
	}
	return out;
}

function shorten(s, n = 160) {
	const one = s.replace(/\s+/g, ' ').trim();
	return one.length <= n ? one : `${one.slice(0, n)}…`;
}

// ---------------------------------------------------------------------------
// 辅助：TS 注释剥离 / CSS 规则块 / 配置常量与默认值 / 扩展 schema
// ---------------------------------------------------------------------------

/**
 * 取某个 CSS 选择器对应的规则体（花括号内部，不含大括号）。找不到返回 null。
 *
 * 定位必须是「选择器 + 紧跟的 `{`」：只按选择器字符串 indexOf 会把
 * `.olympia-onboarding` 撞上 `.olympia-onboarding-splash`。
 */
function cssRule(css, selector) {
	let from = 0;
	for (;;) {
		const idx = css.indexOf(selector, from);
		if (idx < 0) {
			return null;
		}
		from = idx + selector.length;
		const m = /^\s*\{/.exec(css.slice(from));
		if (!m) {
			continue;   // 是别的选择器的一部分
		}
		const braceIdx = from + m[0].length - 1;
		const body = balanced(css, braceIdx, '{', '}');
		if (body) {
			return body.slice(1, -1);
		}
	}
}

/** 解析 `export const OLYMPIA_CONFIG_X = 'key'`。 */
function parseConfigConstants(text) {
	const out = new Map();
	const re = /export\s+const\s+(OLYMPIA_CONFIG_\w+)\s*=\s*'([^']+)'/g;
	let m;
	while ((m = re.exec(text))) {
		out.set(m[1], m[2]);
	}
	return out;
}

/** 解析 `OLYMPIA_ONBOARDING_CONFIG_DEFAULTS` 里的字面量默认值。 */
function parseConfigDefaults(text) {
	const out = new Map();
	const anchor = text.indexOf('OLYMPIA_ONBOARDING_CONFIG_DEFAULTS');
	if (anchor < 0) {
		return out;
	}
	const braceIdx = text.indexOf('{', anchor);
	const body = balanced(text, braceIdx, '{', '}');
	if (!body) {
		return out;
	}
	const re = /\[(OLYMPIA_CONFIG_\w+)\]\s*:\s*('(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|true|false)/g;
	let m;
	while ((m = re.exec(body))) {
		const raw = m[2];
		let value;
		if (raw.startsWith("'")) {
			value = raw.slice(1, -1).replace(/\\'/g, "'");
		} else if (raw === 'true') {
			value = true;
		} else if (raw === 'false') {
			value = false;
		} else {
			value = Number(raw);
		}
		out.set(m[1], value);
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

/** 抽出卡片里所有「绑定了配置键的行对象」。 */
function extractConfigRows(text) {
	const rows = [];
	const re = /configurationKey\s*:\s*(OLYMPIA_CONFIG_\w+)/g;
	let m;
	while ((m = re.exec(text))) {
		const braceIdx = text.lastIndexOf('{', m.index);
		if (braceIdx < 0) {
			continue;
		}
		const body = balanced(text, braceIdx, '{', '}');
		if (!body) {
			continue;
		}
		const kindMatch = /kind\s*:\s*'(options|toggle)'/.exec(body);
		rows.push({ constName: m[1], kind: kindMatch ? kindMatch[1] : '<未知>', block: body });
	}
	return rows;
}

/** 取某个配置键常量所在的行对象（用 `configurationKey: <常量名>` 定位）。 */
function rowBlockFor(text, constantName) {
	const idx = text.indexOf(`configurationKey: ${constantName}`);
	if (idx < 0) {
		return null;
	}	const braceIdx = text.lastIndexOf('{', idx);
	if (braceIdx < 0) {
		return null;
	}
	return balanced(text, braceIdx, '{', '}');
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
	{ id: 'A3', rel: F_CONTRIB },
	{ id: 'A4', rel: F_CSS }
];

for (const { id, rel } of NEW_FILES) {
	check(id, `开始页新增文件存在：${rel}`, () => {
		/* raw-ok: 这一条判的是「文件存不存在、有没有内容」，原文才有意义 */
		const t = loadRaw(rel);
		if (t === null) return `文件不存在（见上面的 MISSING ${rel}）`;
		if (t.trim().length === 0) return `文件为空`;
		return null;
	});
}

const TS_FILES_FOR_HEADER = [
	{ id: 'A5', rel: F_INPUT },
	{ id: 'A7', rel: F_PAGE },
	{ id: 'A9', rel: F_CONTRIB }
];
const COPYRIGHT_ID = { [F_INPUT]: 'A6', [F_PAGE]: 'A8', [F_CONTRIB]: 'A10' };

for (const { id, rel } of TS_FILES_FOR_HEADER) {
	check(id, `${rel} 第 1 行是 Microsoft 版权头起始行`, () => {
		/* raw-ok: 版权头本身就是块注释，剥掉注释就看不见头了 */
		const t = loadRaw(rel);
		if (t === null) return `文件不存在（见上面的 MISSING ${rel}）`;
		// 注意：上游真实头文件第 1 行是「一个空格 + /*---…」，必须容忍前导空格，
		// 否则已验收的 olympiaWelcomeInput.ts 会被误判成红色。
		const first = (t.split(/\r?\n/, 1)[0] || '').replace(/^\uFEFF/, '').trimStart();
		if (!first.startsWith('/*---')) return `第 1 行（trim 后）不是以 /*--- 开头，实际为：${shorten(first, 80) || '<空行>'}`;
		return null;
	});
	check(COPYRIGHT_ID[rel], `${rel} 前 4 行包含 Copyright (c) Microsoft Corporation 与 Licensed under the MIT License`, () => {
		/* raw-ok: 版权头本身就是块注释，剥掉注释就看不见头了 */
		const t = loadRaw(rel);
		if (t === null) return `文件不存在（见上面的 MISSING ${rel}）`;
		const head = t.split(/\r?\n/).slice(0, 4).join('\n');
		const lack = [];
		if (!head.includes('Copyright (c) Microsoft Corporation')) lack.push('Copyright (c) Microsoft Corporation');
		if (!head.includes('Licensed under the MIT License')) lack.push('Licensed under the MIT License');
		if (lack.length) return `前 4 行缺少：${lack.join(' / ')}（hygiene 的 copyright 守卫对 src/vs 仍然生效）`;
		return null;
	});
}

// ===========================================================================
// B. scheme 不得复用 walkThrough
//
// 依据：oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/startupPage.ts 里
// StartupPageEditorResolverContribution 用 registerEditor('walkThrough:/**') 加
// canSupportResource: uri => uri.scheme === GettingStartedInput.RESOURCE.scheme 抢页面。
// 那是一个 scheme 级别的认领：只要沿用 walkThrough，上游 GettingStartedInput 就能把开始页抢走。
// 所以新页面必须自带一个 scheme。
// ===========================================================================
check('B1', `olympiaWelcomeInput.ts 使用 URI.from({ scheme: 'olympia-welcome' })`, () => {
	const t = load(F_INPUT);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_INPUT}）`;
	const m = /scheme:\s*['"]([^'"]+)['"]/.exec(t);
	if (!m) return `未找到 scheme: '<...>' 形式的 URI.from 参数`;
	if (m[1] !== 'olympia-welcome') return `scheme 实际为 '${m[1]}'，必须是 'olympia-welcome'`;
	return null;
});

check('B2', `olympiaWelcomeInput.ts 不含 walkThrough / Schemas.walkThrough`, () => {
	const t = load(F_INPUT);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_INPUT}）`;
	const hit = /walkThrough/i.test(t);
	if (hit) {
		const line = t.split(/\r?\n/).find(l => /walkThrough/i.test(l)) || '';
		return `复用上游 scheme 会被 StartupPageEditorResolverContribution 的 scheme 级认领抢走页面；命中行：${shorten(line, 120)}`;
	}
	return null;
});

// ===========================================================================
// C. 上游 welcomeGettingStarted 未被污染
// ===========================================================================
const STARTUP_EDITOR_VALUES = ['none', 'welcomePage', 'readme', 'newUntitledFile', 'welcomePageInEmptyWorkbench', 'terminal', 'agentSessionsWelcomePage'];

check('C1', `gettingStarted.contribution.ts 的 workbench.startupEditor 枚举仍保留原有 7 个值`, () => {
	const t = load(F_GS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_GS}）`;
	// 定位方式必须是**配置 property 的写法** `'workbench.startupEditor': {`（带冒号 + 大括号）。
	// 踩过的坑：不能用「第一次出现 'workbench.startupEditor' + 往后 4000 字符」——
	// 本文件更靠前的 StartupPageEditorResolverContribution 段里就有
	// `getValue<string>('workbench.startupEditor')`，窗口往后扫根本扫不到配置块里的 enum。
	const anchor = t.indexOf(`'workbench.startupEditor': {`);
	if (anchor < 0) return `未找到 'workbench.startupEditor': { 配置项定义`;
	const braceIdx = t.indexOf('{', anchor);
	const block = balanced(t, braceIdx, '{', '}');
	if (!block) return `workbench.startupEditor 配置块的花括号无法配对`;
	// 用 exec 而不是 match：match() 返回的数组没有 index 属性（除非带 /g），
	// 拿 em.index 会得到 undefined，后面配对解析全靠运气。
	const em = /['"]enum['"]\s*:/.exec(block);
	if (!em) return `workbench.startupEditor 配置块内未找到 enum`;
	const ob = block.indexOf('[', em.index);
	const arr = ob >= 0 ? balanced(block, ob, '[', ']') : null;
	if (!arr) return `enum 数组无法配对解析`;
	const lack = STARTUP_EDITOR_VALUES.filter(v => !arr.includes(`'${v}'`) && !arr.includes(`"${v}"`));
	if (lack.length) return `enum 缺少：${lack.join(', ')}`;
	return null;
});

// 本方案另开一个 olympia.* 键，因此这里只断言“原有 7 值仍在”与“没有把 olympia.* 混进上游注册”，
// 不断言枚举不许新增别的字符串。
check('C2', `gettingStarted.contribution.ts 没有把 olympia.* 自定义键混进 workbench.startupEditor 注册`, () => {
	const t = load(F_GS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_GS}）`;
	const m = t.match(/['"]olympia\.[A-Za-z0-9_.]+['"]\s*:/);
	if (m) return `上游注册里混入了自定义键：${shorten(m[0], 120)}`;
	return null;
});

// ===========================================================================
// D. 注册点
// ===========================================================================
check('D1', `olympiaWelcome.contribution.ts 用含 olympia-welcome 的 pattern 调用 registerEditor`, () => {
	const t = load(F_CONTRIB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_CONTRIB}）`;
	const re = /registerEditor\s*\(/g;
	let m;
	const calls = [];
	while ((m = re.exec(t))) {
		const body = balanced(t, t.indexOf('(', m.index), '(', ')');
		if (body) calls.push(body);
	}
	if (!calls.length) return `未找到 registerEditor( ...) 调用`;
	// pattern 必须是**字面量** 'olympia-welcome:/**'。
	// 模板字符串 `${OlympiaWelcomeInput.RESOURCE.scheme}:/**` 运行时完全等价，
	// 但静态断言验不到字面量，也就失去了「scheme 被钉住」的意义 —— 所以这里故意只认字面量。
	const hit = calls.find(c => /['"]olympia-welcome:\/\*\*['"]/.test(c));
	if (!hit) return `registerEditor 的 pattern 里没有字面量 'olympia-welcome:/**'；实际调用：${shorten(calls[0], 200)}`;
	return null;
});

check('D4', `contribution 与 input 的 scheme 字面量一致（改一处不能漏另一处）`, () => {
	const contrib = load(F_CONTRIB);
	const input = load(F_INPUT);
	if (contrib === null) return `文件不存在（见上面的 MISSING ${F_CONTRIB}）`;
	if (input === null) return `文件不存在（见上面的 MISSING ${F_INPUT}）`;
	const m = /scheme:\s*['"]([^'"]+)['"]/.exec(input);
	if (!m) return `olympiaWelcomeInput.ts 里未找到 scheme: '<...>' 形式的参数`;
	const scheme = m[1];
	const expected = new RegExp(`['"]${scheme}:\\/\\*\\*['"]`);
	if (!expected.test(contrib)) {
		return `olympiaWelcomeInput.ts 的 scheme 是 '${scheme}'，但 contribution.ts 的 registerEditor pattern 不是 '${scheme}:/**'`;
	}
	return null;
});

check('D2', `olympiaWelcomePage.ts 含 export class OlympiaWelcomePage extends EditorPane`, () => {
	const t = load(F_PAGE);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_PAGE}）`;
	const m = /export\s+class\s+OlympiaWelcomePage\b[^\n{]*/.exec(t);
	if (!m) return `未找到 export class OlympiaWelcomePage`;
	if (!/\bextends\s+EditorPane\b/.test(m[0])) return `OlympiaWelcomePage 未继承 EditorPane，实际声明：${shorten(m[0], 120)}`;
	return null;
});

check('D3', `workbench.common.main.ts 引入 contrib/olympia/browser/olympiaWelcome.contribution`, () => {
	const t = load(F_MAIN);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_MAIN}）`;
	if (!/olympia\/browser\/olympiaWelcome\.contribution\.js/.test(t)) return `没有指向 contrib/olympia/browser/olympiaWelcome.contribution 的 import 行，页面不会被加载`;
	return null;
});

// ===========================================================================
// E. 启动路由分支
// ===========================================================================
check('E1', `startupPage.ts 读取配置键 olympia.startPage`, () => {
	const t = load(F_STARTUP);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_STARTUP}）`;
	if (!t.includes(`'olympia.startPage'`) && !t.includes(`"olympia.startPage"`)) return `startupPage.ts 里没有 olympia.startPage 的读取，启动路由未接线`;
	return null;
});

check('E2', `startupPage.ts 有 openOlympia* 形式的打开方法`, () => {
	const t = load(F_STARTUP);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_STARTUP}）`;
	const m = /\bopenOlympia\w*\s*\(/.exec(t);
	if (!m) return `未找到 openOlympia* 形式的打开方法`;
	return null;
});

// ===========================================================================
// F. 配置键与配置节点 id
//
// 依据：上游 workbench/common/configuration.ts 的 workbenchConfigurationNodeBase 的 id 是
// 'workbench'，而 registerConfiguration 是按属性键写入的——用同一个键再注册一次会覆盖上游
// 那份定义（gettingStarted.contribution.ts:309 就是 ...workbenchConfigurationNodeBase 的例子）。
// 所以 Olympia 自己的键必须挂在独立的节点 id 'olympia' 下。
// ===========================================================================
const OLYMPIA_KEYS = ['olympia.startPage', 'olympia.startPageIntroAnimation'];
const registrationScope = listTsUnder(OLYMPIA_BROWSER_DIR);
const configBlocks = [];
for (const f of registrationScope) {
	const re = /registerConfiguration\s*\(\s*\{/g;
	let m;
	while ((m = re.exec(f.text))) {
		const ob = f.text.indexOf('{', m.index);
		const body = balanced(f.text, ob, '{', '}');
		if (body) configBlocks.push({ file: f.rel, body, id: (body.match(/\bid:\s*['"]([^'"]+)['"]/) || [])[1] || '<无 id>' });
	}
}
const scopeDesc = `已扫描 ${OLYMPIA_BROWSER_DIR} 下 ${registrationScope.length} 个 .ts、${configBlocks.length} 个 registerConfiguration 块`;

/**
 * 全目录收集 `const NAME = '字面量'` 常量表。
 *
 * ## 为什么需要它
 *
 * 配置属性键用的是**计算属性名**：
 *
 * ```ts
 * properties: {
 *     [OLYMPIA_START_PAGE_CONFIGURATION_KEY]: { type: 'boolean', ... },
 * }
 * ```
 *
 * 如果只扫 `'olympia.xxx'` 字面量，命中的是 `localize('olympia.startPage', ...)` 的
 * **本地化 key** —— 两者碰巧长得一样，于是断言「看起来过了」，实际上它对
 * 「注册的属性键到底是什么」一无所知。键一改（改成子键、拼错、漏注册），断言不会红。
 *
 * 所以这里先把常量表建出来，再把计算属性名还原成真实键名。
 */
const configConstValues = new Map();
for (const f of registrationScope) {
	const code = stripTsComments(f.text);
	const re = /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*'([^']*)'/g;
	let m;
	while ((m = re.exec(code))) {
		if (!configConstValues.has(m[1])) {
			configConstValues.set(m[1], m[2]);
		}
	}
}

/**
 * 解析一个 registerConfiguration 块里 `properties` 的顶层条目。
 *
 * 返回 [{ key, type, constName }]：
 *   - `key`       还原后的真实属性键（计算属性名用常量表还原；还原不了就是 null）
 *   - `type`      声明的 schema 类型（没声明就是 null）
 *   - `constName` 用的是哪个常量（字面量键为 null）
 *
 * 只取**深度 0** 的键 —— 嵌套对象里的 `scope:` / `type:` / `description:` 会被排除。
 * 另外还要求键的值是对象（`{`），因为配置属性的定义体一定是对象。
 */
function parseRegisteredProperties(blockBody) {
	const out = [];
	const m = /(?:^|[,{])\s*properties\s*:\s*\{/.exec(blockBody);
	if (!m) {
		return out;
	}
	const openIdx = blockBody.indexOf('{', m.index + m[0].length - 1);
	const inner = balanced(blockBody, openIdx, '{', '}');
	if (!inner) {
		return out;
	}
	const body = inner.slice(1, -1);
	const depths = braceDepths(body);
	const keyRe = /(?:\[([A-Za-z_$][\w$]*)\s*\]|(['"])((?:[^'"\\]|\\.)*)\2|([A-Za-z_$][\w$]*))\s*:/g;
	let km;
	while ((km = keyRe.exec(body))) {
		if (depths[km.index] !== 0) {
			continue;
		}
		const valueStart = body.indexOf('{', km.index + km[0].length);
		if (valueStart < 0 || !/^\s*\{/.test(body.slice(km.index + km[0].length, valueStart + 1))) {
			continue;
		}
		let key = null;
		let constName = null;
		if (km[1]) {
			constName = km[1];
			key = configConstValues.has(constName) ? configConstValues.get(constName) : null;
		} else if (km[2]) {
			key = km[3];
		} else {
			key = km[4];
		}
		let type = null;
		const obj = balanced(body, valueStart, '{', '}');
		if (obj) {
			const tm = /(?:^|[,{])\s*type\s*:\s*['"]([^'"]+)['"]/.exec(obj);
			if (tm) {
				type = tm[1];
			}
		}
		out.push({ key, type, constName });
	}
	return out;
}

/** 所有 registerConfiguration 块里真实注册的属性条目（附文件与节点 id）。 */
const registeredProps = [];
for (const b of configBlocks) {
	for (const p of parseRegisteredProperties(b.body)) {
		registeredProps.push({ file: b.file, id: b.id, key: p.key, type: p.type, constName: p.constName });
	}
}

for (const key of OLYMPIA_KEYS) {
	check(`F${OLYMPIA_KEYS.indexOf(key) + 1}`, `配置键 '${key}' 已注册为配置属性（${scopeDesc}）`, () => {
		if (!registrationScope.length) return `${OLYMPIA_BROWSER_DIR} 下没有任何 .ts 文件`;
		const hits = registeredProps.filter(p => p.key === key);
		if (!hits.length) {
			const unresolved = [...new Set(registeredProps.filter(p => !p.key && p.constName).map(p => p.constName))];
			const extra = unresolved.length ? `（未解析的计算属性名：${unresolved.join('，')}）` : '';
			return `没有任何 registerConfiguration 块把 '${key}' 注册成属性${extra}`;
		}
		return null;
	});
}

check('F3', `olympia.startPage* 所在配置节点 id 是 'olympia'（不能是 'workbench'）`, () => {
	if (!registrationScope.length) return `${OLYMPIA_BROWSER_DIR} 下没有任何 .ts 文件`;
	const owners = registeredProps.filter(p => p.key && OLYMPIA_KEYS.includes(p.key));
	if (!owners.length) return `没有承载 olympia.startPage* 的属性条目，无法判定节点 id（${scopeDesc}）`;
	const bad = owners.filter(p => p.id !== 'olympia');
	if (bad.length) {
		return `节点 id 应为 'olympia'，实际 ${bad.map(p => `${p.file} → '${p.id}'`).join('，')}；挂在 'workbench' 节点会覆盖上游同名属性定义`;
	}
	return null;
});

check('F4', `注册的属性键必须能被静态解析（计算属性名的常量必须找得到）`, () => {
	// 还原不了的计算属性名 = 这条属性对静态断言完全不可见。
	// 与其假装它不存在，不如直接判红：逼着配置键保持可静态核对。
	const unresolved = registeredProps.filter(p => !p.key && p.constName);
	if (unresolved.length) {
		return `以下属性用了计算属性名，但常量表里找不到对应常量：${[...new Set(unresolved.map(p => `${p.constName}（${p.file}）`))].join('，')} —— 静态断言对这些键无能为力`;
	}
	return null;
});

// ===========================================================================
// G. CSS 红线（见 oss/src/vs/workbench/contrib/modernUI/CSS_PERFORMANCE.md）
//
// 该文件把两条列为硬红线：非 codicon 的 class 属性子串选择子（会让 Blink 放弃按类名做
// 失效判断），以及以 root/workbench 为主语的 :has()（工作台级失效，stylelint
// has-anchor-checker 直接拒绝）。动画属性只允许非布局属性这条来自本次任务约定，
// CSS_PERFORMANCE.md 本身没有写，因此下面按任务规范实现。
// ===========================================================================
const cssTextRaw = load(F_CSS);
const cssText = cssTextRaw === null ? null : stripComments(cssTextRaw);
const cssLines = cssText === null ? [] : cssText.split(/\r?\n/);

check('G1', `olympiaWelcome.css 不含 class 属性子串选择子（[class*=] / [class^=] / [class$=]）`, () => {
	if (cssText === null) return `文件不存在（见上面的 MISSING ${F_CSS}）`;
	const re = /\[\s*class\s*(?:\*=|\^=|\$=)\s*/i;
	const hits = cssLines.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => re.test(l));
	if (hits.length) return `命中 ${hits.length} 处子串选择子，例如第 ${hits[0].n} 行：${shorten(hits[0].l, 140)}`;
	return null;
});

check('G2', `olympiaWelcome.css 不以 root/workbench 为主语使用 :has()`, () => {
	if (cssText === null) return `文件不存在（见上面的 MISSING ${F_CSS}）`;
	const re = /(?::root|\bhtml|\bbody|\.monaco-workbench)\s*:has\s*\(/i;
	const hits = cssLines.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => re.test(l));
	if (hits.length) return `工作台/root 级 :has() 会造成全工作台失效，第 ${hits[0].n} 行：${shorten(hits[0].l, 140)}`;
	return null;
});

check('G3', `olympiaWelcome.css 的动画属性只允许非布局属性（transform/opacity/filter/color/background）`, () => {
	if (cssText === null) return `文件不存在（见上面的 MISSING ${F_CSS}）`;
	const FORBIDDEN = ['all', 'width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding'];
	const offenders = [];
	// 1) transition / animation 声明的属性列表
	const declRe = /(?:^|[{;])\s*(transition|animation|transition-property|animation-property)\s*:\s*([^;{}\n]+)/gi;
	let m;
	while ((m = declRe.exec(cssText))) {
		const value = m[2];
		const hit = FORBIDDEN.filter(p => new RegExp(`(?:^|[\\s,])${p}(?![\\w-])`, 'i').test(value));
		if (hit.length) offenders.push(`${m[1]}: ${shorten(value, 80)} → ${hit.join(', ')}`);
	}
	// 2) @keyframes 里被动的属性
	const kfRe = /@keyframes\s+[\w-]+\s*\{/g;
	while ((m = kfRe.exec(cssText))) {
		const body = balanced(cssText, cssText.indexOf('{', m.index), '{', '}') || '';
		const propRe = /(?:^|[;{\n])\s*([a-z-]+)\s*:/gi;
		let p;
		const seen = new Set();
		while ((p = propRe.exec(body))) {
			const name = p[1].toLowerCase();
			const hit = FORBIDDEN.filter(f => f === name || name.startsWith(`${f}-`));
			for (const h of hit) seen.add(h);
		}
		if (seen.size) offenders.push(`@keyframes ${shorten(m[0].replace(/[{].*/, '').trim(), 60)} → ${[...seen].join(', ')}`);
	}
	if (offenders.length) return `布局属性动画会触发 relayout，违规：${shorten(offenders.join(' | '), 240)}`;
	return null;
});

// ===========================================================================
// H. 鸿蒙式开始引导：无断点结构 + 配置类型一致性
//
// 「全程没有断点」这件事，肉眼看不出来 —— 一次「顺手重构」就能把挂载点改回
// document.body、把擦洞改成隐藏画布、把 5.4 秒改成 3 秒、把枚举开关写成布尔。
// 所以这里把它拆成**可静态断言的结构前提**，逐条钉死。
//
// 断点的定义：画面从 A 跳到 B 的那一瞬间 —— 黑屏、场景重建、欢迎页切工作台。
// 要没有断点，只有一种做法：**让 A 和 B 从第一帧就同时存在**。
// ===========================================================================
const F_ONB = `${OLYMPIA_BROWSER_DIR}/olympiaOnboarding.ts`;
const F_ONB_CONTRIB = `${OLYMPIA_BROWSER_DIR}/olympiaOnboarding.contribution.ts`;
const F_ONB_CARDS = `${OLYMPIA_BROWSER_DIR}/olympiaOnboardingCards.ts`;
const F_ONB_TIMELINE = `${OLYMPIA_BROWSER_DIR}/olympiaOnboardingTimeline.ts`;
const F_ONB_BACKDROP = `${OLYMPIA_BROWSER_DIR}/olympiaOnboardingBackdrop.ts`;
const F_ONB_CONFIG = `${OLYMPIA_BROWSER_DIR}/olympiaOnboardingConfig.ts`;
const F_ONB_JUDGE = `${OLYMPIA_BROWSER_DIR}/olympiaJudgeTargets.ts`;
const F_ONB_CSS = `${OLYMPIA_BROWSER_DIR}/media/olympiaOnboarding.css`;
const F_ONB_READY = `${OLYMPIA_BROWSER_DIR}/olympiaWelcomeReady.ts`;

check('H1', `引导 overlay 挂在 layoutService.getContainer(mainWindow)，不挂 document.body`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	// 只看代码：文件头里那句「不是 document.body」是文档，不是实现。
	const code = stripTsComments(t);
	if (!/layoutService\.getContainer\(\s*mainWindow\s*\)/.test(code)) return `没有 getContainer(mainWindow) 调用`;
	if (/document\.body/.test(code)) {
		return `出现了 document.body —— body 挂载会盖住对话框/快速输入/通知（浮层 z-index 2540~2575，overlay 是 2530），破坏浮层层叠语义`;
	}
	return null;
});

check('H2', `引导贡献注册在 WorkbenchPhase.BlockStartup（首帧即极光）`, () => {
	const t = load(F_ONB_CONTRIB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CONTRIB}）`;
	// 这份文件的头部注释里大段解释「为什么是 BlockStartup」—— 全文 grep 会被注释骗过：
	// 注释里写了 BlockStartup，真代码却挪到 AfterRestored，断言照样绿。
	// 所以必须先剥注释，再锚在**注册调用**的阶段实参上。
	const code = stripTsComments(t);
	const m = /registerWorkbenchContribution2\(\s*OlympiaOnboardingContribution\.ID\s*,\s*OlympiaOnboardingContribution\s*,\s*WorkbenchPhase\.(\w+)\s*\)/.exec(code);
	if (!m) {
		return `没找到引导贡献的注册调用（registerWorkbenchContribution2(..., WorkbenchPhase.?)）`;
	}
	if (m[1] !== 'BlockStartup') {
		return `引导贡献注册在 WorkbenchPhase.${m[1]} —— 必须用 BlockStartup（对应 LifecyclePhase.Starting）；Ready 阶段注册会晚于 renderWorkbench，首帧会闪出工作台`;
	}
	return null;
});

check('H3', `overlay 根规则 .olympia-onboarding 不带背景色（背景只能放在独立 splash 层）`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const body = cssRule(stripComments(raw), '.olympia-onboarding');
	if (body === null) return `未找到 .olympia-onboarding 规则块`;
	if (/background\s*[:(]/.test(body)) {
		return `根规则里有 background —— 洞擦出来之后这块底色会跟着露出来（洞是透明的，根元素不透明）`;
	}
	return null;
});

check('H4', `splash 兜底层有底色，且画布首帧后淡出到 opacity 0`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const css = stripComments(raw);
	const splash = cssRule(css, '.olympia-onboarding-splash');
	if (splash === null) return `未找到 .olympia-onboarding-splash 规则块`;
	if (!/background\s*[:(]/.test(splash)) return `splash 没有背景 —— canvas 画出第一帧前屏幕会是空的`;
	const painted = cssRule(css, '.olympia-onboarding-painted .olympia-onboarding-splash');
	if (painted === null) return `未找到 .olympia-onboarding-painted .olympia-onboarding-splash 规则块`;
	if (!/opacity\s*:\s*0\b/.test(painted)) {
		return `painted 之后 splash 没有 opacity: 0 —— 兜底层会一直挡着工作台，洞擦出来看到的也是它`;
	}
	return null;
});

check('H5', `擦洞用 destination-out（在背景上擦穿），不是隐藏或移除画布`, () => {
	const t = load(F_ONB_BACKDROP);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_BACKDROP}）`;
	if (!/globalCompositeOperation\s*=\s*['"]destination-out['"]/.test(t)) {
		return `没有 destination-out —— 洞必须是「擦穿背景」，而不是把背景换掉`;
	}
	if (/display\s*=\s*['"]none['"]/.test(t) || /\.style\.display\s*=/.test(t)) {
		return `背景被 display:none 掉了 —— 那是一次硬切`;
	}
	return null;
});

check('H6', `背景时钟只增不减（重置会让极光相位跳一下 = 断点）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const assigns = findBackdropTimeAssignments(stripTsComments(t));
	if (!assigns.length) return `没有找到 backdropTime 的赋值`;
	for (const a of assigns) {
		if (a.op === '--' || a.op === '-=') {
			return `backdropTime 被递减（${a.op} ${a.rhs}）—— 背景时钟必须单调`;
		}
		if (a.op === '=' && !a.rhs.includes('this.backdropTime')) {
			return `backdropTime 被重新赋值（= ${shorten(a.rhs, 80)}）—— 极光相位会跳一下`;
		}
	}
	return null;
});

check('H7', `动画时间线不得用 performance.now()（必须与 rAF 帧时间戳同源）`, () => {
	// 宿主与背景：整份文件里都不许出现。
	for (const rel of [F_ONB, F_ONB_BACKDROP]) {
		const t = load(rel);
		if (t === null) return `文件不存在（见上面的 MISSING ${rel}）`;
		// 只看代码：注释里那句「早先版本这里用 performance.now()」是历史说明，不是实现。
		if (stripTsComments(t).includes('performance.now()')) {
			return `${rel} 用了 performance.now() —— 与 rAF 时间戳不同源，阶段守卫会永远不成立，动画挂死`;
		}
	}
	// 卡片层：只允许出现在**拖拽速度测量**里。那是一次真实的物理测量（两次指针事件之间
	// 过了多少毫秒），本来就不该用帧时间戳 —— 帧时间戳在两次事件之间是不动的，
	// 拿来算速度会得到 0 或一个巨大的值。补间起点则必须用 rAF 帧时间戳。
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	const codeLines = code.split(/\r?\n/);
	for (let i = 0; i < codeLines.length; i++) {
		if (!codeLines[i].includes('performance.now()')) {
			continue;
		}
		const ctx = codeLines.slice(Math.max(0, i - 1), i + 2).join(' ');
		const allowed = /this\.lastTime\s*=\s*performance\.now\(\)/.test(ctx)
			|| /const\s+now\s*=\s*performance\.now\(\)/.test(ctx);
		if (!allowed) {
			return `olympiaOnboardingCards.ts 里的 performance.now() 用在了补间或阶段判定上（上下文：${shorten(codeLines.slice(Math.max(0, i - 2), i + 1).join(' '), 160)}）`;
		}
	}
	// 补间起点必须用最近一帧的 rAF 时间戳。
	if (!/start:\s*this\.lastFrameTime/.test(code)) {
		return `卡片补间的起点不是 lastFrameTime —— 补间起点与渲染时钟不同源，跟手度会随帧率抖动`;
	}
	return null;
});

check('H8', `时间线模块是纯函数：不碰 DOM、计时器、随机数、当前时间`, () => {
	const t = load(F_ONB_TIMELINE);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(t);
	const forbidden = [
		['Math.random', /Math\.random/],
		['Date.now', /Date\.now/],
		['document', /\bdocument\b/],
		['window', /\bwindow\b/],
		['setTimeout / setInterval', /\bset(?:Timeout|Interval)\b/],
		['requestAnimationFrame', /requestAnimationFrame/]
	];
	for (const [name, re] of forbidden) {
		if (re.test(code)) return `时间线里出现了 ${name} —— 时间线必须是「相对 t 的纯函数」，否则没法静态断言`;
	}
	return null;
});

check('H9', `星光粒子的随机参数由索引哈希推导（同一 t 永远同一张图）`, () => {
	const t = load(F_ONB_TIMELINE);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(t);
	if (!/olympiaOnboardingHash1\(/.test(code) || !/olympiaOnboardingHash2\(/.test(code)) {
		return `buildParticles 没有用索引哈希 —— 粒子参数必须由 (card, index) 推导`;
	}
	return null;
});

check('H10', `进入动画总时长在「5 秒左右」区间（4.5~6.0 秒）`, () => {
	const t = load(F_ONB_TIMELINE);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const m = /export\s+const\s+OLYMPIA_ONBOARDING_ENTER_DURATION\s*=\s*([0-9.]+)/.exec(t);
	if (!m) return `未找到 OLYMPIA_ONBOARDING_ENTER_DURATION`;
	const v = Number(m[1]);
	if (!(v >= 4.5 && v <= 6.0)) return `总时长 ${v}s 不在 4.5~6.0 秒的「5 秒左右」区间`;
	return null;
});

check('H11', `时间线所有视觉量都在总时长内收尾（洞/卡片/粒子/暗角/扫光）`, () => {
	const t = load(F_ONB_TIMELINE);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const num = name => {
		const m = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*([0-9.]+)`).exec(t);
		return m ? Number(m[1]) : null;
	};
	const duration = num('OLYMPIA_ONBOARDING_ENTER_DURATION');
	if (duration === null) return `未找到 OLYMPIA_ONBOARDING_ENTER_DURATION`;
	for (const [name, desc] of [
		['OLYMPIA_ONBOARDING_REVEAL_END', '擦洞'],
		['OLYMPIA_ONBOARDING_DISSOLVE_END', '卡片消散'],
		['OLYMPIA_ONBOARDING_PARTICLE_WINDOW', '粒子飞行'],
		['OLYMPIA_ONBOARDING_VIGNETTE_FALL_END', '暗角归零']
	]) {
		const v = num(name);
		if (v === null) return `未找到 ${name}`;
		if (v > duration) {
			return `${desc} 的结束时间 ${v}s 超过总时长 ${duration}s —— 收尾时它还没结束，overlay 被删掉就是一次可见的跳变`;
		}
	}
	const sweepsAnchor = t.indexOf('export const OLYMPIA_ONBOARDING_SWEEPS');
	if (sweepsAnchor < 0) return `未找到 OLYMPIA_ONBOARDING_SWEEPS`;
	// 定位必须落在**赋值语句**的数组字面量上：`readonly X[] = [` 里的 `[]` 是类型标注，
	// 扫到它会得到空数组（踩过：数组被读成 `[]`，`end:` 一个都找不到）。
	const assignIdx = t.indexOf('= [', sweepsAnchor);
	if (assignIdx < 0) return `OLYMPIA_ONBOARDING_SWEEPS 不是数组字面量赋值，无法解析`;
	const listBody = balanced(t, t.indexOf('[', assignIdx), '[', ']');
	if (!listBody) return `OLYMPIA_ONBOARDING_SWEEPS 的数组无法配对解析`;
	const ends = [...listBody.matchAll(/end:\s*([0-9.]+)/g)].map(m => Number(m[1]));
	if (!ends.length) return `OLYMPIA_ONBOARDING_SWEEPS 里没有 end 字段`;
	const maxEnd = Math.max(...ends);
	if (maxEnd > duration) return `最后一条扫光结束于 ${maxEnd}s，超过总时长 ${duration}s`;
	return null;
});

check('H12', `揭示几何按 W/√2 算圆空间角距（洞必须盖住画布四角）`, () => {
	const t = load(F_ONB_TIMELINE);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(t);
	if (!/viewportWidth\s*\/\s*Math\.SQRT2/.test(code)) return `没有 viewportWidth / Math.SQRT2`;
	if (/Math\.hypot\s*\(\s*viewportWidth\s*\/\s*2/.test(code)) {
		return `用了 hypot(W/2, H/2) —— 洞盖不住画布四角，收尾那一帧四角会残留一圈极光`;
	}
	return null;
});

check('H13', `进入动画必须等 LifecyclePhase.Restored（否则擦洞时工作台还没渲染完 = 二次断点）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	// 必须落在**起跑闸门函数体**上，而不是「文件里某处出现过」。
	//
	// 踩过的坑：这句判定原先写在文件顶部的文档注释里（说明为什么要等 Restored），
	// 而断言只扫全文 —— 于是把代码里那个判定删掉，断言照样绿。
	// 现在锚在 maybeStartEnter() 的函数体上：注释进不来。
	const m = /private\s+maybeStartEnter\s*\([^)]*\)\s*:\s*void\s*\{/.exec(t);
	if (!m) return `未找到 maybeStartEnter()`;
	const body = balanced(t, t.indexOf('{', m.index), '{', '}');
	if (!body) return `maybeStartEnter() 的函数体无法配对解析`;
	if (!/LifecyclePhase\.Restored/.test(body)) {
		return `起跑闸门里没有 Restored 判定 —— 露出来的会是半成品工作台`;
	}
	return null;
});

check('H14', `等「工作台恢复 + 开始页就位」有硬上限（不会永久卡住）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const m = /ENTER_GATE_WAIT_LIMIT\s*=\s*([0-9.]+)/.exec(t);
	if (!m) return `未找到 ENTER_GATE_WAIT_LIMIT`;
	const v = Number(m[1]);
	// 硬上限的作用是「万一工作台真的卡住了，别把用户永远吊在引导里」。
	// 它不能太短 —— 短了就等于「到点就擦洞」，擦出来的是半成品工作台，那本身就是断点。
	if (!(v >= 5 && v <= 30)) return `硬上限 ${v}s 不合理（应在 5~30 秒之间）`;
	return null;
});

check('H15', `收尾条件用 elapsed >= 总时长，且 finish() 直接删 overlay（没有第二段淡出）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	if (!/elapsed\s*>=\s*OLYMPIA_ONBOARDING_ENTER_DURATION/.test(t)) {
		return `收尾条件不是 elapsed >= OLYMPIA_ONBOARDING_ENTER_DURATION`;
	}
	const fm = /private\s+finish\(\)\s*:\s*void\s*\{/.exec(t);
	if (!fm) return `未找到 finish()`;
	const body = balanced(t, t.indexOf('{', fm.index), '{', '}');
	if (!body) return `finish() 的函数体无法配对解析`;
	if (/opacity|transition|classList/.test(body)) {
		return `finish() 里还有淡出或状态切换 —— overlay 被删的那一刻必须已经完全不可见`;
	}
	return null;
});

check('H16', `首启标记用 StorageScope.PROFILE + StorageTarget.MACHINE（不参与设置同步）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const re = /storageService\.store\(\s*OlympiaOnboarding\.STORAGE_KEY\s*,\s*true\s*,\s*StorageScope\.PROFILE\s*,\s*StorageTarget\.MACHINE\s*\)/;
	if (!re.test(t)) {
		return `写入调用不是 PROFILE + MACHINE —— 同步到别的机器会让那边也弹一次引导`;
	}
	return null;
});

check('H17', `只有一条 rAF 链，且帧体被 try/catch 包住（一帧算错不能掐死整条链）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const rafCount = (t.match(/requestAnimationFrame\(/g) || []).length;
	if (rafCount !== 2) {
		return `requestAnimationFrame 调用点有 ${rafCount} 处（应为 2：启动 1 + 帧内续 1）—— 多于一条链会各自为政`;
	}
	const om = /private\s+readonly\s+onFrame\s*=/.exec(t);
	if (!om) return `未找到 onFrame`;
	const braceIdx = t.indexOf('{', t.indexOf('=>', om.index));
	const body = balanced(t, braceIdx, '{', '}');
	if (!body) return `onFrame 的函数体无法配对解析`;
	if (!/try\s*\{/.test(body) || !/catch/.test(body)) {
		return `onFrame 没有 try/catch —— 一帧算错会把整条 rAF 链掐断，引导僵在最后一帧`;
	}
	return null;
});

check('H18', `进入动画期间不插入任何文案（用户要「不要介绍」）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(t);
	const locals = (code.match(/localize\(/g) || []).length;
	if (locals !== 1) {
		return `olympiaOnboarding.ts 里有 ${locals} 处 localize —— 进入动画期间出现新文案就变成产品介绍了`;
	}
	const texts = (code.match(/\.textContent\s*=/g) || []).length;
	if (texts !== 1) {
		return `有 ${texts} 处 textContent 赋值 —— 只有「正在准备工作台…」这一条状态提示允许存在`;
	}
	return null;
});

check('H19', `overlay 的 z-index 是 2530（盖住标题栏 2500，让开窗口按钮 3000 / 浮层 2540~2575）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const m = /OLYMPIA_ONBOARDING_Z_INDEX\s*=\s*(\d+)/.exec(t);
	if (!m) return `未找到 OLYMPIA_ONBOARDING_Z_INDEX`;
	if (Number(m[1]) !== 2530) return `z-index = ${m[1]}，应为 2530`;
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const body = cssRule(stripComments(raw), '.olympia-onboarding');
	if (body !== null && !/z-index\s*:\s*2530/.test(body)) return `CSS 里没有 z-index: 2530`;
	return null;
});

check('H20', `卡片只通过 OLYMPIA_CONFIG_* 常量引用配置键（不写裸键名）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const literals = [...code.matchAll(/configurationKey\s*:\s*'([^']+)'/g)].map(m => m[1]);
	if (literals.length) return `出现了裸配置键：${literals.join('，')} —— 键名必须走 olympiaOnboardingConfig.ts 的常量`;
	const ids = [...code.matchAll(/configurationKey\s*:\s*([A-Za-z_$][\w$]*)/g)].map(m => m[1]);
	const bad = ids.filter(k => !/^OLYMPIA_CONFIG_/.test(k));
	if (bad.length) return `configurationKey 引用了非 OLYMPIA_CONFIG_* 的标识符：${bad.join('，')}`;
	return null;
});

check('H21', `数字型配置（字号/行高/内存上限/每日题量）必须走 configValue（写字符串会被 schema 拒绝）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	for (const name of [
		'OLYMPIA_CONFIG_EDITOR_FONT_SIZE',
		'OLYMPIA_CONFIG_EDITOR_LINE_HEIGHT',
		'OLYMPIA_CONFIG_JUDGE_MEMORY_LIMIT',
		'OLYMPIA_CONFIG_TRAIN_DAILY_GOAL'
	]) {
		const block = rowBlockFor(t, name);
		if (block === null) return `未找到 ${name} 所在的行对象`;
		if (!/configValue/.test(block)) {
			return `${name} 那一行没有 configValue —— 写字符串进 number 类型的键会被配置校验拒绝，用户的选择永远存不下`;
		}
	}
	return null;
});

check('H22', `枚举型开关（光标动画）必须走 toggleValues 写字符串`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const block = rowBlockFor(t, 'OLYMPIA_CONFIG_EDITOR_SMOOTH_CARET');
	if (block === null) return `未找到光标动画那一行`;
	if (!/toggleValues/.test(block)) {
		return `光标动画行没有 toggleValues —— 该键的 schema 是 off|explicit|on，写布尔会被配置校验拒绝`;
	}
	if (!/on\s*:\s*'on'/.test(block) || !/off\s*:\s*'off'/.test(block)) {
		return `toggleValues 的 on/off 值不对（应为 'on' / 'off'）`;
	}
	return null;
});

check('H23', `core 侧的 olympia.* 默认值与两个扩展的 package.json 完全一致（防漂移）`, () => {
	const cfg = load(F_ONB_CONFIG);
	if (cfg === null) return `文件不存在（见上面的 MISSING ${F_ONB_CONFIG}）`;
	const consts = parseConfigConstants(cfg);
	const defaults = parseConfigDefaults(cfg);
	if (!defaults.size) return `没能从 ${F_ONB_CONFIG} 解析出任何默认值`;
	const schema = loadExtensionSchema();
	for (const [constName, value] of defaults) {
		const key = consts.get(constName);
		if (!key) return `无法解析 ${constName} 对应的配置键`;
		const s = schema.get(key);
		if (!s) return `扩展的 package.json 里没有 ${key}（core 却有一份默认值）`;
		if (JSON.stringify(s.default) !== JSON.stringify(value)) {
			return `${key} 的默认值不一致：core=${JSON.stringify(value)}，扩展（${s.file}）=${JSON.stringify(s.default)}`;
		}
	}
	return null;
});

check('H24', `每个开关/选项写入的值类型必须与扩展 schema 的 type 一致`, () => {
	const cards = load(F_ONB_CARDS);
	const cfg = load(F_ONB_CONFIG);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	if (cfg === null) return `文件不存在（见上面的 MISSING ${F_ONB_CONFIG}）`;
	const consts = parseConfigConstants(cfg);
	const schema = loadExtensionSchema();
	// editor.* 是 core 自己的键，类型由上游 editorOptions.ts 决定（不在扩展的 package.json 里）。
	const editorTypes = {
		'editor.fontSize': 'number',
		'editor.lineHeight': 'number',
		'editor.minimap.enabled': 'boolean',
		'editor.cursorSmoothCaretAnimation': 'string'
	};
	const rows = extractConfigRows(cards);
	if (!rows.length) return `没从 ${F_ONB_CARDS} 里解析出任何绑定了配置键的行`;
	for (const row of rows) {
		const key = consts.get(row.constName);
		if (!key) return `无法解析 ${row.constName} 对应的配置键`;
		let type = null;
		if (key.startsWith('editor.')) {
			type = editorTypes[key];
			if (!type) return `断言脚本不知道 ${key} 的 schema 类型（请补进 editorTypes）`;
		} else {
			const s = schema.get(key);
			if (!s) return `扩展的 package.json 里没有 ${key}`;
			type = s.type;
		}
		if (row.kind === 'toggle') {
			if (type === 'boolean') {
				if (/toggleValues/.test(row.block)) return `${key} 是 boolean 类型的开关，不该带 toggleValues`;
			} else if (type === 'string') {
				if (!/toggleValues/.test(row.block)) {
					return `${key} 的 schema 是 string（枚举），当开关写必须带 toggleValues`;
				}
			} else {
				return `${key} 的 schema 是 ${type}，不该当成开关`;
			}
		} else if (row.kind === 'options') {
			if (type === 'number') {
				if (!/configValue/.test(row.block)) return `${key} 是 number 类型，必须走 configValue 写数字`;
				if (/(?<![A-Za-z0-9_])value\s*:\s*\d/.test(row.block)) {
					return `${key} 的展示值写成了裸数字（应为字符串，数字只出现在 configValue 里）`;
				}
			} else if (type === 'string') {
				const cm = /configValue\s*:\s*([^,}\n]+)/.exec(row.block);
				if (cm && !/^['"]/.test(cm[1].trim())) {
					return `${key} 是 string 类型，configValue 必须是字符串（实际是 ${cm[1].trim()}）`;
				}
			} else {
				return `${key} 的 schema 是 ${type}，不该用选项组`;
			}
		} else {
			return `${row.constName} 的 kind 是 ${row.kind}，不是 options/toggle`;
		}
	}
	return null;
});

check('H25', `core 的评测机表与扩展的 OJ_TARGETS 逐字段一致（卡片显示的是真实编译命令）`, () => {
	const core = load(F_ONB_JUDGE);
	if (core === null) return `文件不存在（见上面的 MISSING ${F_ONB_JUDGE}）`;
	const extPath = 'oss/extensions/olympia-onboarding/src/ojTargets.ts';
	const ext = load(extPath);
	if (ext === null) return `文件不存在（见上面的 MISSING ${extPath}）`;
	const pick = (text, exportName) => {
		// 锚点必须是**数组字面量**，不能是 `export const X` 后面的第一个 `{`——
		// 那是对应数组第一个元素的花括号，用括号配对截出来的只有第 1 个评测机，
		// 第 2 条往后漂移永远看不见（变异测试 M16 实测踩过这个坑）。
		const decl = new RegExp(`export\\s+const\\s+${exportName}\\b[^=]*=\\s*\\[`).exec(text);
		if (!decl) return null;
		const bracketIdx = decl.index + decl[0].length - 1;
		const array = balanced(text, bracketIdx, '[', ']');
		if (!array) return null;
		const entries = [];
		let idx = array.indexOf('{');
		while (idx >= 0) {
			const entry = balanced(array, idx, '{', '}');
			if (!entry) break;
			const field = name => {
				const fm = new RegExp(`(?:^|[{,\\s])${name}\\s*:\\s*'([^']*)'`).exec(entry);
				return fm ? fm[1] : null;
			};
			const bm = /(?:^|[{,\s])baseFlags\s*:\s*([A-Za-z_$][\w$]*)/.exec(entry);
			entries.push({
				id: field('id'),
				label: field('label'),
				gcc: field('gcc'),
				std: field('std'),
				onlineJudgeEnv: field('onlineJudgeEnv'),
				baseFlagsRef: bm ? bm[1] : null
			});
			idx = array.indexOf('{', idx + entry.length);
		}
		return entries;
	};
	const a = pick(core, 'OLYMPIA_JUDGE_TARGETS');
	const b = pick(ext, 'OJ_TARGETS');
	if (!a || !b) return `没能解析出两份评测机表`;
	if (a.length !== b.length) return `评测机数量不一致：core=${a.length}，扩展=${b.length}`;
	for (let i = 0; i < a.length; i++) {
		for (const field of ['id', 'label', 'gcc', 'std', 'onlineJudgeEnv', 'baseFlagsRef']) {
			if (a[i][field] !== b[i][field]) {
				return `第 ${i + 1} 个评测机的 ${field} 不一致：core=${a[i][field]}，扩展=${b[i][field]}`;
			}
		}
	}
	// baseFlags 两边都引用同一个常量名，也要一致。
	const flagsOf = (text, name) => {
		const m = new RegExp(`const\\s+${name}\\s*=\\s*\\[([^\\]]*)\\]`).exec(text);
		return m ? m[1].replace(/\s+/g, ' ').trim() : null;
	};
	const cf = flagsOf(core, 'LUOGU_BASE_FLAGS');
	const ef = flagsOf(ext, 'LUOGU_BASE_FLAGS');
	if (cf !== ef) return `LUOGU_BASE_FLAGS 不一致：core=${cf}，扩展=${ef}`;
	return null;
});

check('H26', `olympiaOnboarding.css 同样不得含 class 子串选择子 / root 级 :has()`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const css = stripComments(raw);
	const lines = css.split(/\r?\n/);
	const sub = lines.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => /\[\s*class\s*(?:\*=|\^=|\$=)\s*/i.test(l));
	if (sub.length) return `命中 ${sub.length} 处 class 子串选择子，例如第 ${sub[0].n} 行：${shorten(sub[0].l, 140)}`;
	const has = lines.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => /(?::root|\bhtml|\bbody|\.monaco-workbench)\s*:has\s*\(/i.test(l));
	if (has.length) return `工作台/root 级 :has() 会造成全工作台失效，第 ${has[0].n} 行：${shorten(has[0].l, 140)}`;
	return null;
});

check('H27', `卡片层的隐藏用 opacity，不许用 display:none / visibility:hidden（那是一次硬切）`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const body = cssRule(stripComments(raw), '.olympia-onboarding-cards.hidden');
	if (body === null) return `未找到 .olympia-onboarding-cards.hidden 规则块`;
	if (/display\s*:\s*none/.test(body)) return `hidden 用 display:none —— 卡片层会瞬间消失，是一次硬切`;
	if (/visibility\s*:\s*hidden/.test(body)) return `hidden 用 visibility:hidden —— 同样是硬切`;
	if (!/opacity\s*:\s*0\b/.test(body)) return `hidden 规则里没有 opacity: 0`;
	return null;
});

check('H28', `卡片拖拽不用 setPointerCapture（会把兼容鼠标事件改派到轨道）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	if (/setPointerCapture/.test(t)) return `出现了 setPointerCapture`;
	return null;
});

check('H29', `卡片层的本地状态要跟着写入走：pendingWrites 是「用户当前选择的真相」`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	if (!/if\s*\(\s*this\.pendingWrites\.has\(key\)\s*\)/.test(code)) {
		return `readConfig 没有优先读 pendingWrites —— 扩展没注册前，卡片会显示扩展默认值，用户点了像「没生效」`;
	}
	if (!/writingKeys/.test(code)) return `没有 in-flight 去重（writingKeys）—— 同一个键会被重复写`;
	return null;
});

// ===========================================================================
// H30~H36：本轮（T-024）新增的「无断点」硬约束
//
// 这一批来自 Qoder 对 core 引导实现的静态审计（T-023）与随后的实机验证：
//   - 配置一变就整片重建卡片行区 → 用户手指下的按钮被换掉（硬切）
//   - 首帧之前切卡 → 补间起点是 0 → 卡片瞬移
//   - 只等 LifecyclePhase.Restored 不够 → 上游 openEditor 不 await，
//     开始页比 Restored 晚到，洞擦开时露出来的是空编辑器区
//   - 配置写入失败被静默吞掉、且重试跟着 overlay 一起消失 → 用户的选择存不下来
//   - `olympia.startPage.showIntroAnimation` 的父键 `olympia.startPage` 是布尔
//     → 子键写不进去，那个开关从来没生效过
// ===========================================================================

check('H30', `配置变化不得整片重建卡片行区（会把用户正按着的按钮换掉 = 硬切）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	// 「刷新路径」= refresh() 以及它调用的 refreshRowStates()。
	// 只盯 refresh() 一个函数是不够的：把重建挪到 refreshRowStates() 里，
	// 每次刷新照样重建行区 —— 那还是硬切（这条断言就是这么被绕开过的）。
	const refreshPath = [];
	for (const sig of [
		/(?:private\s+|public\s+|protected\s+)?refresh\s*\(\s*\)\s*:\s*void\s*\{/,
		/private\s+refreshRowStates\s*\(\s*\)\s*:\s*void\s*\{/
	]) {
		const m = sig.exec(code);
		if (!m) return `未找到 refresh() / refreshRowStates()`;
		const body = balanced(code, code.indexOf('{', m.index), '{', '}');
		if (!body) return `刷新路径上的函数体无法配对解析`;
		refreshPath.push({ name: m[0].trim(), body });
	}
	for (const { name, body } of refreshPath) {
		if (/bodyElements\[[^\]]*\]\s*\.replaceChildren/.test(body)) {
			return `${name} 仍在整片重建行区 —— 配置一变就把 4 张卡的 DOM 全换掉，用户手指下的按钮会被换掉`;
		}
		if (/footerElements\[[^\]]*\]\s*\.replaceChildren/.test(body)) {
			return `${name} 仍在重建页脚 —— 页脚只跟卡片序号有关，重建它只会换掉用户正按着的 CTA`;
		}
	}
	if (!/rowsSignature/.test(code)) return `没有结构签名（rowsSignature）—— 每次刷新都会重建 DOM`;
	if (!/updateRowState/.test(code)) return `没有就地更新状态的路径（updateRowState）—— 选中态/开关状态只能靠重建来刷`;

	// 结构/状态两层分离必须在 updateRows 里真的成立：
	// 先比结构签名，**变了**才重建；没变就地刷状态。
	const um = /private\s+updateRows\s*\([^)]*\)\s*:\s*void\s*\{/.exec(code);
	if (!um) return `未找到 updateRows()`;
	const ubody = balanced(code, code.indexOf('{', um.index), '{', '}');
	if (!ubody) return `updateRows() 的函数体无法配对解析`;
	if (!/rowSignatures\s*\[[^\]]*\]\s*!==\s*signature/.test(ubody)) {
		return `updateRows() 没有比较结构签名 —— 每次刷新都会重建 DOM`;
	}
	if (!/\brebuildRows\s*\(/.test(ubody)) {
		return `updateRows() 里没有重建分支 —— 结构真变了也不会更新`;
	}
	if (!/\bupdateRowState\s*\(/.test(ubody)) {
		return `updateRows() 没有就地更新状态的路径 —— 选中态/开关状态只能靠重建来刷`;
	}

	// **重建行区的入口只有 updateRows 一条**。
	// 早先这里只判「refresh() 的函数体里没有 rebuildRows」—— 把重建挪到
	// refreshRowStates() 里就绕开了，回归照样发生，断言却一直绿。
	const decl = /private\s+rebuildRows\s*\(/.exec(code);
	if (!decl) return `未找到 rebuildRows()`;
	const declToken = code.indexOf('rebuildRows', decl.index);
	const uStart = code.indexOf('{', um.index);
	const uEnd = uStart + ubody.length;
	for (const c of code.matchAll(/\brebuildRows\s*\(/g)) {
		if (c.index === declToken) {
			continue;   // 声明本身
		}
		if (c.index < uStart || c.index > uEnd) {
			return `rebuildRows() 在 updateRows() 之外还有调用点 —— 配置一变就把 4 张卡的 DOM 全换掉，用户手指下的按钮会被换掉`;
		}
	}

	// 「行区只允许在 rebuildRows() 里重建」必须**全文件**成立。
	// 前面 clause ① 只盯 refresh() / refreshRowStates() 这两个**函数名**：
	// 新开一个入口（renderRowsAgain() 之类）照样能绕过去，断言却一直绿。
	// 断言要钉的是**行为**（行区在哪重建），不是名字。
	const rbDecl = /private\s+rebuildRows\s*\(/.exec(code);
	if (!rbDecl) return `未找到 rebuildRows()`;
	const rbOpen = code.indexOf('{', rbDecl.index);
	const rbBody = balanced(code, rbOpen, '{', '}');
	if (!rbBody) return `rebuildRows() 的函数体无法配对解析`;
	const rbEnd = rbOpen + rbBody.length;
	for (const c of code.matchAll(/bodyElements\s*\[[^\]]*\]\s*\.\s*replaceChildren/g)) {
		if (c.index < rbOpen || c.index > rbEnd) {
			return `行区的整片重建出现在 rebuildRows() 之外 —— 配置一变就把 4 张卡的 DOM 全换掉，用户手指下的按钮会被换掉`;
		}
	}
	// 行区只能拿 DOM API 拼：innerHTML 会把整棵子树重新解析一遍，
	// 用户正按着的按钮等于被换掉了 —— 跟整片 replaceChildren 是一个效果。
	if (/\binnerHTML\b/.test(code) || /\bouterHTML\b/.test(code) || /\binsertAdjacentHTML\b/.test(code)) {
		return `行区用了 innerHTML / outerHTML / insertAdjacentHTML —— 整棵子树会被重新解析，用户正按着的按钮等于被换掉`;
	}
	return null;
});

check('H31', `起跑闸门必须同时要求「工作台已恢复」和「开始页已就位」`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const ready = load(F_ONB_READY);
	if (ready === null) return `文件不存在（见上面的 MISSING ${F_ONB_READY}）`;
	const code = stripTsComments(t);
	const m = /private\s+maybeStartEnter\s*\([^)]*\)\s*:\s*void\s*\{/.exec(code);
	if (!m) return `未找到 maybeStartEnter()`;
	const body = balanced(code, code.indexOf('{', m.index), '{', '}');
	if (!body) return `maybeStartEnter() 的函数体无法配对解析`;
	if (!/LifecyclePhase\.Restored/.test(body)) {
		return `maybeStartEnter() 没有要求 LifecyclePhase.Restored —— 洞擦开时工作台可能还没成形`;
	}
	if (!/olympiaWelcomeReady\.isReady/.test(body)) {
		return `maybeStartEnter() 没有要求「开始页已就位」—— 上游 openEditor 不 await，Restored 会先到、开始页后到，洞擦开就是空编辑器区`;
	}
	return null;
});

check('H32', `startupPage 打开开始页必须 await，并把「已就位」信号发出来`, () => {
	const t = load(F_STARTUP);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_STARTUP}）`;
	const code = stripTsComments(t);
	if (!/olympiaWelcomeReady\.markOpening\s*\(\s*\)/.test(code)) {
		return `startupPage 没有发 markOpening() —— 引导侧不知道开始页正在打开`;
	}
	if (!/olympiaWelcomeReady\.markReady\s*\(\s*\)/.test(code)) {
		return `startupPage 没有发 markReady() —— 开始页打开完后，引导侧会一直等`;
	}
	const m = /private\s+async\s+openOlympia\w*\s*\(\s*\)\s*\{/.exec(code);
	if (!m) return `未找到 openOlympia* 的异步打开方法`;
	const body = balanced(code, code.indexOf('{', m.index), '{', '}');
	if (!body) return `openOlympia* 的函数体无法配对解析`;
	if (!/await\s+this\.editorService\.openEditor/.test(body)) {
		return `openEditor 没有被 await —— 信号会早于开始页真正画出来的时刻`;
	}
	return null;
});

check('H33', `配置写入失败不能静默吞掉；重试也不能随 overlay 消失而取消`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const m = /private\s+async\s+flushPendingWrites\s*\([^)]*\)\s*:\s*Promise<void>\s*\{/.exec(code);
	if (!m) return `未找到 flushPendingWrites()`;
	const body = balanced(code, code.indexOf('{', m.index), '{', '}');
	if (!body) return `flushPendingWrites() 的函数体无法配对解析`;
	const catchM = /catch\s*(\([^)]*\))?\s*\{/.exec(body);
	if (!catchM) return `flushPendingWrites() 没有 catch —— 写入失败会把整条链掐断`;
	const catchBody = balanced(body, body.indexOf('{', catchM.index), '{', '}');
	if (!catchBody) return `flushPendingWrites() 的 catch 块无法配对解析`;
	// 判据落在**catch 块**里，而且要求的是 `console.warn`（单次失败的留痕）。
	//
	// 之前这里判的是「函数体里有 warn 或 error 就行」—— 太松了：
	// 额度耗尽分支里的 `console.error` 会把它喂饱，于是把 catch 里的
	// `console.warn` 降级成 `console.log`（等于静默吞掉）它照样绿。
	// 单次失败用 warn、额度耗尽用 error，两条各归各的断言（H33 / T5）。
	//
	// 留痕现在收敛在 `abandonWriteIfExhausted()` 里（两条失败路径共用），
	// 所以这里判的是「catch 块**够得到**留痕」+「留痕用的是 warn」。
	// 只判 catch 块里有没有字面量 console.warn 也不够 ——
	// 把 warn 搬到 catch 外面就绕开了「失败必须留痕」这条约束。
	if (!/abandonWriteIfExhausted/.test(catchBody)) {
		return `写入失败的 catch 块没有走留痕路径 —— 用户点了「开始」发现设置没变，而我们连原因都不知道`;
	}
	const abandonBody = methodBody(code, /abandonWriteIfExhausted\s*\([^)]*\)\s*:\s*boolean\s*\{/);
	if (!abandonBody) return `未找到 abandonWriteIfExhausted()`;
	if (!/console\.warn/.test(abandonBody)) {
		return `写入失败的留痕里没有 console.warn —— 用户点了「开始」发现设置没变，而我们连原因都不知道`;
	}
	if (/console\.error\s*\(/.test(catchBody)) {
		return `catch 块里直接调了 console.error —— 单次失败用 warn、额度耗尽用 error，两者的职责不能混（额度耗尽那一条归 T5 判）`;
	}
	if (!/scheduleFlushRetry/.test(body)) {
		return `写入失败后没有安排重试 —— 内置扩展注册完之前的选择会永远存不下来`;
	}
	if (/disposables\.push\([^)]*flushRetryTimer/.test(code)) {
		return `重试定时器被放进了 disposables —— overlay 一消失重试就停了，用户的选择会丢`;
	}
	return null;
});

check('H34', `同一配置节点下不得出现「标量父键 + 子键」（父节点是标量时子键写不进去）`, () => {
	// 上游 configuration.ts 的 addToValueTree：父节点一旦是标量，子键会被直接忽略，
	// 控制台刷 `Ignoring X as Y is true`，而且那个开关**从来没生效过**。
	//
	// 比的是**真实注册的属性键**（计算属性名已还原成字面量）+ 父键声明的类型，
	// 不是 localize 的 key —— 后者只是碰巧长得一样，扫它等于没查。
	const SCALAR = new Set(['boolean', 'string', 'number', 'integer', 'enum', 'array']);
	const byNode = new Map();
	for (const p of registeredProps) {
		if (!p.key) {
			continue;
		}
		if (!byNode.has(p.id)) {
			byNode.set(p.id, []);
		}
		byNode.get(p.id).push(p);
	}
	for (const [nodeId, props] of byNode) {
		for (const parent of props) {
			if (!parent.type || !SCALAR.has(parent.type)) {
				continue;   // 父节点是对象（或没声明类型）时容得下子键
			}
			for (const child of props) {
				if (child === parent || !child.key) {
					continue;
				}
				if (child.key.startsWith(parent.key + '.')) {
					return `节点 '${nodeId}' 下 '${child.key}' 是 '${parent.key}' 的子键，而 '${parent.key}' 声明的类型是 '${parent.type}'（标量）—— 父节点一旦是标量，子键会被直接忽略（控制台报 Ignoring ... as ... is ...），那个开关等于没有`;
				}
			}
		}
	}
	return null;
});

check('H35', `首帧之前就切卡时不得起补间（起点是 0 会让进度一步冲到 1，卡片瞬移）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const m = /goto\s*\(\s*index\s*:\s*number\s*\)\s*:\s*void\s*\{/.exec(code);
	if (!m) return `未找到 goto(index)`;
	const body = balanced(code, code.indexOf('{', m.index), '{', '}');
	if (!body) return `goto() 的函数体无法配对解析`;
	// 判据是**语义**的：哨兵必须落在 rAF 合法域（非负）之外，且比较方向正确。
	// 写死 `=== 0` 是不行的 —— 那等于把「0 永不出现」这个赌注钉死在代码里。
	const sentinelProblem = checkSentinel(code, 'lastFrameTime', body);
	if (sentinelProblem) {
		return sentinelProblem;
	}
	if (!/tween\s*=\s*null/.test(body)) {
		return `goto() 的首帧分支没有清掉补间 —— 补间仍会从哨兵时刻起算`;
	}
	return null;
});

check('H36', `背景时钟必须单调且永不重置（进入动画期间极光要一直在流动）`, () => {
	// 裁决记录：背景是**连续流动层**，不参与时间线的重放，所以允许由真实时长驱动；
	// 但它一旦被重置，进入动画期间极光会「重新开始」，那是一次肉眼可见的跳变。
	//
	// 判据是**语义**的，不是「必须写成 +=」：
	//   this.backdropTime += delta              → 单调，OK
	//   this.backdropTime = this.backdropTime + delta → 同样单调，OK
	//   this.backdropTime = 0 / = elapsed       → 重置，红
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const assigns = findBackdropTimeAssignments(stripTsComments(t));
	if (!assigns.length) return `没有找到 backdropTime 的赋值`;
	for (const a of assigns) {
		if (a.op === '++') {
			continue;
		}
		if (a.op === '--' || a.op === '-=') {
			return `backdropTime 被递减（${a.op} ${a.rhs}）—— 背景时钟必须单调`;
		}
		if (a.op === '+=') {
			continue;
		}
		if (!a.rhs.includes('this.backdropTime')) {
			return `backdropTime 被重新赋值（= ${shorten(a.rhs, 80)}）—— 背景时钟一旦被重置就是一次肉眼可见的跳变`;
		}
	}
	return null;
});

// ===========================================================================
// T. 本轮（T-024 审计后）新增的不变量
//
// 这一组每一条都对应一个**真实存在的缺陷**，不是「理论上不好」：
//   T1 等待期摘掉退路   —— 用户点了「开始」，闸门没过，期间「跳过」和翻页全被
//                          CSS 关掉，只剩一颗药丸；出了岔子连退路都没有。
//   T2 打开失败报成就位 —— `finally { markReady() }` 不看结果，打开失败也被报成
//                          「已就位」，于是擦开一个洞，洞里是空的。
//   T3 失败态没有退路   —— 开始页永远不会有时，还去擦洞，露出来的是空编辑器区。
//   T4 派生值行滞留     —— 值行由别的配置项派生，只刷预览块的话预览新、卡片旧。
//   T5 静默丢设置       —— 重试额度耗尽直接 return，用户的选择无声消失。
//   T6 时间戳哨兵       —— 拿 rAF 合法域里的 0 当「未设置」，等于赌它永不出现。
//   T7 异步行被打回占位 —— 「最近工程」落地后又被刷成「读取中…」，还重复发一次请求。
//   T8 未注册路径无上限 —— 「扩展还没注册」那条路不计重试额度，于是永远重试下去。
//   T9 放弃写入后界面撒谎 —— chip 高亮还停在用户点的那个选项上，配置里其实没写。
//   T10 额度被点击消耗   —— 额度是「重试轮数」，不是「用户点击次数」。
//   T11 收场路径的死代码 —— abortEnter 重置 enterStart，暗示存在中途取消路径。
// ===========================================================================

/** 取出一个具名函数（或方法）的函数体文本。 */
function methodBody(code, signature) {
	const m = signature.exec(code);
	if (!m) {
		return null;
	}
	return balanced(code, code.indexOf('{', m.index), '{', '}');
}

/**
 * 取「某个正则命中处开始的代码块」的**区间**。
 *
 * 为什么要区间而不只是文本：好几条断言要问的是
 * 「这个赋值**在不在**那个块里」—— 光看文本无法回答，
 * 得知道它在源码里的位置范围。
 *
 * 返回 { start, end, text }：start 指向 `{`，end 指向 `}` 之后一位，
 * text 是包含两端的完整块文本。
 */
function blockRange(code, re) {
	const m = re.exec(code);
	if (!m) {
		return null;
	}
	const open = code.indexOf('{', m.index);
	if (open < 0) {
		return null;
	}
	const text = balanced(code, open, '{', '}');
	if (!text) {
		return null;
	}
	return { start: open, end: open + text.length, text };
}

check('T1', `等待期必须保留退路：chrome 只能在闸门放行的那一帧才让位给星光`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(t);
	const requestBody = methodBody(code, /requestEnter\s*\(\s*\)\s*:\s*void\s*\{/);
	if (!requestBody) return `未找到 requestEnter()`;
	const gateBody = methodBody(code, /maybeStartEnter\s*\(\s*timestamp\s*:\s*number\s*\)\s*:\s*void\s*\{/);
	if (!gateBody) return `未找到 maybeStartEnter()`;
	if (requestBody.includes('olympia-onboarding-entering')) {
		return `requestEnter() 里就摘掉了 chrome —— 闸门还没放行，用户就只剩一颗药丸：「跳过」和翻页全都没了，等待期间连退路都没有`;
	}
	if (!gateBody.includes('olympia-onboarding-entering')) {
		return `闸门放行时没有摘掉 chrome —— 星光起来时品牌/跳过/圆点/翻页/提示还杵在画面上`;
	}
	return null;
});

check('T2', `开始页打开失败必须单独报出来，不能被报成「已就位」`, () => {
	const ready = load(F_ONB_READY);
	if (ready === null) return `文件不存在（见上面的 MISSING ${F_ONB_READY}）`;
	const readyCode = stripTsComments(ready);
	if (!/markFailed\s*\(\s*\)\s*:\s*void/.test(readyCode)) {
		return `olympiaWelcomeReady 没有 markFailed() —— 打开失败无法和「已就位」区分开`;
	}
	if (!/get\s+isFailed\s*\(\s*\)\s*:\s*boolean/.test(readyCode)) {
		return `olympiaWelcomeReady 没有 isFailed —— 引导侧无从知道开始页永远不会出现`;
	}
	const st = load(F_STARTUP);
	if (st === null) return `文件不存在（见上面的 MISSING ${F_STARTUP}）`;
	const stCode = stripTsComments(st);
	const fin = /finally\s*\{/.exec(stCode);
	if (fin) {
		const finBody = balanced(stCode, stCode.indexOf('{', fin.index), '{', '}');
		if (finBody && /markReady\s*\(/.test(finBody)) {
			return `startupPage 在 finally 里调 markReady() —— finally 不看结果，打开失败也会被报成「已就位」`;
		}
	}
	if (!/catch\s*\(/.test(stCode) || !/markFailed\s*\(/.test(stCode)) {
		return `startupPage 没有把打开失败 catch 住并报成 markFailed()`;
	}
	return null;
});

check('T3', `开始页永远不会出现时必须改走「不擦洞」的收场`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(t);
	if (!/olympiaWelcomeReady\.isFailed/.test(code)) {
		return `引导侧没有判 isFailed —— 开始页打不开时仍会擦洞，洞里只能是空的编辑器区`;
	}
	const abortBody = methodBody(code, /abortEnter\s*\(\s*\)\s*:\s*void\s*\{/);
	if (!abortBody) return `未找到 abortEnter() —— 失败时没有「不擦洞」的退路`;
	if (!/olympia-onboarding-fading/.test(abortBody)) {
		return `abortEnter() 没有走淡出收场 —— 直接删掉整层极光是硬切，那也是断点`;
	}
	const css = load(F_ONB_CSS);
	if (css === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	if (!/\.olympia-onboarding-fading\s*\{/.test(stripComments(css))) {
		return `CSS 里没有 .olympia-onboarding-fading 规则 —— 收场淡出没有样式支撑`;
	}
	return null;
});

check('T4', `值行可能由别的配置项派生：点击后必须刷新整卡，不能只刷预览块`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	for (const [label, sig] of [
		['选项 chip', /chip\.addEventListener\(\s*'click'/],
		['开关 toggle', /toggle\.addEventListener\(\s*'click'/],
	]) {
		const body = methodBody(code, sig);
		if (!body) return `未找到 ${label} 的点击处理器`;
		if (!/this\.refresh\s*\(/.test(body)) {
			return `${label} 的点击处理器没有调 refresh() —— 只刷预览块的话，派生出来的值行会停在旧文本上（预览新、卡片旧），直到扩展注册完触发配置事件才跳变`;
		}
	}
	return null;
});

check('T5', `写入重试的额度必须按键独立算，耗尽时必须明确留痕`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	if (/flushRetryCount|flushFailureCount/.test(code)) {
		return `还有全局重试计数（flushRetryCount / flushFailureCount）—— 一个永远写不进去的键会带着别的键一起把额度耗光，而它自己失败多少次全被别的键的成功掩盖`;
	}
	if (!/pendingWriteRounds/.test(code)) {
		return `没有按键计数的重试额度（pendingWriteRounds）`;
	}
	const flushBody = methodBody(code, /flushPendingWrites\s*\([^)]*\)\s*:\s*Promise<void>\s*\{/);
	if (!flushBody) return `未找到 flushPendingWrites()`;
	// 额度耗尽的收场现在收敛在 `abandonWriteIfExhausted()` 里（两条路径共用：
	// 「扩展没注册」和「写入抛异常」）。console.error 必须落在**那个**函数里 ——
	// 落在 flushPendingWrites 里的话，「未注册」那条路径就没有留痕。
	const abandonBody = methodBody(code, /abandonWriteIfExhausted\s*\([^)]*\)\s*:\s*boolean\s*\{/);
	if (!abandonBody) return `未找到 abandonWriteIfExhausted()`;
	if (!/console\.error\s*\(/.test(abandonBody)) {
		return `重试额度耗尽时没有 console.error —— 用户的选择会无声消失，控制台外没有任何痕迹`;
	}
	if (!/pendingWriteRounds/.test(abandonBody)) {
		return `abandonWriteIfExhausted() 没有动 pendingWriteRounds —— 额度不是按键算的`;
	}
	return null;
});

check('T6', `时间戳哨兵必须落在 rAF 合法域（非负）之外`, () => {
	const onb = load(F_ONB);
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const onbCode = stripTsComments(onb);
	const gateBody = methodBody(onbCode, /maybeStartEnter\s*\(\s*timestamp\s*:\s*number\s*\)\s*:\s*void\s*\{/);
	if (!gateBody) return `未找到 maybeStartEnter()`;
	const onbProblem = checkSentinel(onbCode, 'enterRequestedAt', gateBody);
	if (onbProblem) {
		return onbProblem;
	}
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const cardsCode = stripTsComments(cards);
	const gotoBody = methodBody(cardsCode, /goto\s*\(\s*index\s*:\s*number\s*\)\s*:\s*void\s*\{/);
	if (!gotoBody) return `未找到 goto()`;
	const cardsProblem = checkSentinel(cardsCode, 'lastFrameTime', gotoBody);
	if (cardsProblem) {
		return cardsProblem;
	}
	return null;
});

check('T7', `异步取值行落地后不得被状态刷新打回占位，也不得重复发请求`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /updateRowState\s*\([^)]*\)\s*:\s*void\s*\{/);
	if (!body) return `未找到 updateRowState()`;
	// 判据落在**代码**上：异步分支必须先看「值有没有落地」。
	// 少了这个闸门，用户点一下别的选项，眼前这行就闪回「读取中…」，
	// 后台还多跑一次 getRecentlyOpened()。
	//
	// 闸门条件写成 `valueResolved || valueFailed`（一个说「取到了」，一个说「确认取不到」）
	// 也要算数 —— 这里判的是「拿 valueResolved 当早退闸门」这件事本身。
	if (!/binding\.valueResolved/.test(body)) {
		return `updateRowState() 里没有 valueResolved —— 异步取值行每次刷新都被打回占位（用户点一下别的选项，眼前这行就闪回「读取中…」），后台还重复调一次 getRecentlyOpened()`;
	}
	if (!/if\s*\([^)]*binding\.valueResolved[^)]*\)\s*\{?\s*break/.test(body)) {
		return `valueResolved 没有被当成早退闸门 —— 只是读了一下，异步行照样每次刷新都重发请求`;
	}
	// 落地的那一刻必须把标记置上，否则闸门永远打不开。
	if (!/binding\.valueResolved\s*=\s*true/.test(body)) {
		return `异步值落地后没有置 valueResolved —— 闸门永远打不开，请求照旧每次重发`;
	}
	return null;
});

check('T8', `「扩展还没注册」这条路径也必须消耗重试额度（否则永远重试下去）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /flushPendingWrites\s*\([^)]*\)\s*:\s*Promise<void>\s*\{/);
	if (!body) return `未找到 flushPendingWrites()`;
	// 锚在「扩展还没注册」这个分支上：getValue(key) === undefined
	const m = /getValue\s*\(\s*key\s*\)\s*===\s*undefined/.exec(body);
	if (!m) return `flushPendingWrites() 里找不到「getValue(key) === undefined」的分支`;
	const branch = balanced(body, body.indexOf('{', m.index), '{', '}');
	if (!branch) return `「未注册」分支无法配对解析`;
	if (!/abandonWriteIfExhausted/.test(branch)) {
		return `「扩展还没注册」这条路径没有计入重试额度 —— 内置扩展永远不注册时就永远重试下去，注释承诺的「400ms × 60 ≈ 24 秒」在这条路径上不成立`;
	}
	return null;
});

check('T9', `放弃写入后必须把界面拉回真值（chip 高亮不能继续撒谎）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /abandonWriteIfExhausted\s*\([^)]*\)\s*:\s*boolean\s*\{/);
	if (!body) return `未找到 abandonWriteIfExhausted()`;
	if (!/refreshRowStates/.test(body)) {
		return `放弃写入后没有重刷行状态 —— chip 的高亮还停在用户刚点的那个选项上，而配置里其实什么都没写，界面在撒谎`;
	}
	if (!/refreshPreview/.test(body)) {
		return `放弃写入后没有重刷预览 —— 预览区显示的还是用户刚点的那个（其实没写进去的）值`;
	}
	if (/this\.refresh\s*\(/.test(body)) {
		return `放弃写入后走了 refresh() —— 它会再触发一轮 flushPendingWrites，形成递归`;
	}
	return null;
});

check('T10', `重试额度只能由重试定时器消耗（用户多戳两下不该提前放弃）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	// flushPendingWrites 必须能分辨「重试轮」和「随手点一下」——
	// 额度承诺的是「400ms × 60 ≈ 24 秒」，那是**重试轮数**，不是点击次数。
	if (!/flushPendingWrites\s*\(\s*(?:isRetryRound\s*:\s*boolean)\s*[^)]*\)\s*:\s*Promise<void>\s*\{/.test(code)) {
		return `flushPendingWrites() 没有「本轮是不是重试轮」的判据 —— 额度会被用户点击次数消耗，多戳两下就提前放弃，24 秒的承诺变成几秒`;
	}
	const timerBody = methodBody(code, /scheduleFlushRetry\s*\(\s*\)\s*:\s*void\s*\{/);
	if (!timerBody) return `未找到 scheduleFlushRetry()`;
	if (!/flushPendingWrites\s*\(\s*true\s*\)/.test(timerBody)) {
		return `重试定时器没有把这一轮标记成重试轮 —— 额度永远不会被消耗，重试也就没有上限`;
	}
	// **只有**定时器能传 true。
	// 前面只判了「定时器传了 true」，没判「别的地方没传 true」——
	// 把 render() / writeConfig() 改成传 true，定时器那条判据照样成立，
	// 而「用户随手点一下也在消耗额度」的缺陷就回来了。
	// 所以这里扫**全文件**：实参只允许空（默认 false）或 false；
	// 传 true 的只允许出现在 scheduleFlushRetry() 体内。
	const declMatch = /private\s+async\s+flushPendingWrites\s*\(/.exec(code);
	if (!declMatch) return `未找到 flushPendingWrites()`;
	const declTokenIdx = code.indexOf('flushPendingWrites', declMatch.index);
	const timerDecl = /scheduleFlushRetry\s*\(\s*\)\s*:\s*void\s*\{/.exec(code);
	if (!timerDecl) return `未找到 scheduleFlushRetry()`;
	const timerOpen = code.indexOf('{', timerDecl.index);
	const timerText = balanced(code, timerOpen, '{', '}');
	if (!timerText) return `scheduleFlushRetry() 的函数体无法配对解析`;
	const timerEnd = timerOpen + timerText.length;
	for (const c of code.matchAll(/flushPendingWrites\s*\(\s*([^)]*)\)/g)) {
		if (c.index === declTokenIdx) {
			continue;   // 声明本身（带默认实参）
		}
		const arg = c[1].trim();
		const inTimer = c.index > timerOpen && c.index < timerEnd;
		if (arg === 'true') {
			if (!inTimer) {
				return `flushPendingWrites(true) 出现在重试定时器之外 —— 非定时器的调用点也消耗额度，用户多戳两下就提前放弃，24 秒的承诺变成几秒`;
			}
			continue;
		}
		if (arg !== '' && arg !== 'false') {
			return `flushPendingWrites() 的实参只能是空或 false（只有重试定时器那一处传 true）—— 当前是「${arg}」`;
		}
		if (inTimer) {
			return `重试定时器没有把这一轮标记成重试轮 —— 额度永远不会被消耗，重试也就没有上限`;
		}
	}
	return null;
});

check('T11', `收场路径上不存在正在跑的进入动画，不得重置 enterStart`, () => {
	const onb = load(F_ONB);
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(onb);
	const body = methodBody(code, /abortEnter\s*\(\s*\)\s*:\s*void\s*\{/);
	if (!body) return `未找到 abortEnter()`;
	if (/enterStart/.test(body)) {
		return `abortEnter() 里动了 enterStart —— 走到这里的路径上进入动画必然还没起跑（闸门放行那一帧会把 enterRequested 置回 false，maybeStartEnter 再也不会被调用），这里重置它是死代码，而且会让人以为「收场要处理中途取消」`;
	}
	return null;
});

check('T12', `异步取值的请求在途时不得重发（扩展注册配置项会连着触发 refresh）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /updateRowState\s*\([^)]*\)\s*:\s*void\s*\{/);
	if (!body) return `未找到 updateRowState()`;
	// 「已落地就跳过」（T7）只挡得住**落地之后**的重发。
	// 扩展注册 `olympia.*` 配置项时会连着触发一串 `onDidChangeConfiguration` → `refresh()`，
	// 而这些 refresh 往往发生在第一次请求**还没回来**的时候 ——
	// 那段时间里只靠 valueResolved 是挡不住的，getRecentlyOpened() 会被连着发好几次。
	// 所以必须另有一道「在途就跳过」的闸门。
	const issueAt = body.indexOf('row.asyncValue()');
	if (issueAt < 0) {
		return `updateRowState() 里找不到 row.asyncValue() 的调用点`;
	}
	const before = body.slice(0, issueAt);
	const after = body.slice(issueAt);
	if (!/if\s*\(\s*binding\.valuePending\s*\)\s*\{?\s*break/.test(before)) {
		return `valuePending 没有被当成早退闸门 —— 请求在途期间的每次 refresh 都会重发一遍 getRecentlyOpened()`;
	}
	if (!/binding\.valuePending\s*=\s*true/.test(before)) {
		return `发请求之前没有置 valuePending —— 闸门永远打不开，重复请求照旧`;
	}
	// 「在途」标记必须在**核对身份之后**才放掉。
	//
	// 放早了的话，更新的一次请求就失去了保护：它还没回来的时候又来一轮
	// refresh()，闸门已经被自己关掉了，于是又发一次请求；两次请求里
	// 后到的那个会顶掉先到的那个，顺序一乱这一行就可能永远停在「读取中…」。
	//
	// 失败那一侧由 T28 守（失败分支里也得放，而且必须放在「达到上限」
	// 或「重试任务」之内），所以这里只盯成功侧的**顺序**。
	//
	// 为什么不能用「count >= 2」这种计数式判据：代码形态一变它就变松 ——
	// 终态块里多一次「放掉」就足以凑够数，真正的顺序缺陷反而被放过。
	const success = blockRange(after, /row\.asyncValue\(\)\s*\.\s*then\s*\(\s*text\s*=>\s*\{/);
	if (!success) {
		return `updateRowState() 里找不到异步取值的成功处理分支（形如 row.asyncValue().then(text => {）`;
	}
	const identityAt = success.text.search(/binding\.valueToken\s*!==\s*token/);
	const releaseAt = success.text.search(/binding\.valuePending\s*=\s*false\s*;/);
	if (identityAt < 0) {
		return `成功处理分支里没有核对 valueToken —— 旧请求回来时会把新请求的结果顶掉`;
	}
	if (releaseAt < 0) {
		return `成功处理分支里一次都没放掉 valuePending —— 这一行永远停在「请求中」，再也拿不到值`;
	}
	if (releaseAt < identityAt) {
		return `成功处理分支在核对身份之前就放掉了 valuePending —— 更新的一次请求失去保护，会被又一轮 refresh 顶掉`;
	}
	return null;
});

check('T13', `写入在途也必须消耗重试额度（否则配额永远用不完）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /flushPendingWrites\s*\([^)]*\)\s*:\s*Promise<void>\s*\{/);
	if (!body) return `未找到 flushPendingWrites()`;
	// 「这个键正在写」这条分支**也必须**消耗额度。
	// 不消耗的话有两个洞：
	//   ① 一次正常的在途写入就能白嫖掉一轮，「400ms × 60 ≈ 24 秒」的承诺被拖长；
	//   ② 写入的 promise 永不 settle 时，这个键每一轮都被跳过，配额永远用不完 ——
	//      「到点就放弃」的承诺彻底破了（变成无限心跳）。
	const m = /writingKeys\s*\.\s*has\s*\(\s*key\s*\)/.exec(body);
	if (!m) return `flushPendingWrites() 里找不到「这个键正在写」的分支`;
	const branch = balanced(body, body.indexOf('{', m.index), '{', '}');
	if (!branch) return `「在途」分支无法配对解析`;
	if (!/abandonWriteIfExhausted/.test(branch)) {
		return `「写入在途」这条路径没有计入重试额度 —— 一次正常写入就白嫖一轮（24 秒的承诺被拖长）；写入永不 settle 时配额永远用不完，「到点就放弃」变成无限心跳`;
	}
	return null;
});

check('T14', `放弃写入时必须把键从 writingKeys 里摘掉（否则卡死的写入会挡住用户的下一次点击）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /abandonWriteIfExhausted\s*\([^)]*\)\s*:\s*boolean\s*\{/);
	if (!body) return `未找到 abandonWriteIfExhausted()`;
	// 放弃写入时如果只把键从 pendingWrites 摘掉，writingKeys 里的它还占着 ——
	// 用户后来再点同一个选项，会被「正在写」挡掉，选择白点。
	if (!/writingKeys\s*\.\s*delete\s*\(\s*key\s*\)/.test(body)) {
		return `放弃写入时没有把键从 writingKeys 里摘掉 —— 卡死的写入会永久占着这个键，用户后来再点同一个选项会被「正在写」挡掉，选择白点`;
	}
	return null;
});

check('T15', `异步取值的失败必须真的失败：不能被吞成「还没有」，也不能把整行冻住`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	// ① 取值函数不许吞异常。
	//    吞了的话一次失败会被伪装成「还没有」—— 那是一次**成功的 resolve**，
	//    于是 valueResolved 被置上，这一行整个 overlay 生命周期都冻在假值上，
	//    而「失败不标记 resolved、下轮重试」那条分支永远走不到。
	const label = methodBody(code, /recentWorkspaceLabel\s*\(\s*\)\s*:\s*Promise<string>\s*\{/);
	if (!label) return `未找到 recentWorkspaceLabel()`;
	const catchM = /catch\s*(\([^)]*\))?\s*\{/.exec(label);
	if (catchM) {
		const catchBody = balanced(label, label.indexOf('{', catchM.index), '{', '}');
		if (!catchBody) return `recentWorkspaceLabel() 的 catch 块无法配对解析`;
		if (!/\bthrow\b/.test(catchBody)) {
			return `recentWorkspaceLabel() 的 catch 块没有把失败抛出去 —— 一次失败被伪装成「还没有」，而这一行就此冻在假值上`;
		}
	}
	// ② 失败分支必须留痕。
	const state = methodBody(code, /updateRowState\s*\([^)]*\)\s*:\s*void\s*\{/);
	if (!state) return `未找到 updateRowState()`;
	const issueAt = state.indexOf('row.asyncValue()');
	if (issueAt < 0) return `updateRowState() 里找不到 row.asyncValue() 的调用点`;
	const after = state.slice(issueAt);
	// `.then(成功分支, 失败分支)` —— 用「} , 参数 => {」来切，不依赖参数名。
	const rejectM = /\}\s*,\s*(\w+)\s*=>\s*\{/.exec(after);
	if (!rejectM) return `updateRowState() 里找不到异步取值的失败分支`;
	const rejectBody = balanced(after, after.indexOf('{', rejectM.index), '{', '}');
	if (!rejectBody) return `异步取值的失败分支无法配对解析`;
	if (!/console\.warn/.test(rejectBody)) {
		return `异步取值失败没有留痕 —— 用户点完卡片发现「最近工程」空着，而我们连原因都不知道`;
	}
	// ③ 失败不能被当成「取到了值」—— 那才是冻住整行的元凶。
	if (/binding\.valueResolved\s*=\s*true/.test(rejectBody)) {
		return `异步取值的失败分支置了 valueResolved —— 一次被吞掉的失败会被当成「取到了『还没有』」，这一行整个生命周期都冻在假值上`;
	}
	return null;
});

check('T16', `异步取值失败必须有界重试，到上限后如实报错（不能永远停在「读取中…」）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const state = methodBody(code, /updateRowState\s*\([^)]*\)\s*:\s*void\s*\{/);
	if (!state) return `未找到 updateRowState()`;
	const issueAt = state.indexOf('row.asyncValue()');
	if (issueAt < 0) return `updateRowState() 里找不到 row.asyncValue() 的调用点`;
	const after = state.slice(issueAt);
	const rejectM = /\}\s*,\s*(\w+)\s*=>\s*\{/.exec(after);
	if (!rejectM) return `updateRowState() 里找不到异步取值的失败分支`;
	const rejectBody = balanced(after, after.indexOf('{', rejectM.index), '{', '}');
	if (!rejectBody) return `异步取值的失败分支无法配对解析`;
	// ① 必须有界重试：失败要再试，但不能无限试。
	//    存储服务在启动早期偶尔会抽风，一次失败就宣判「没有工程」是冤枉用户；
	//    但无限重试又是一个永远停不下来的 IO 心跳。
	if (!/scheduleValueRetry/.test(rejectBody)) {
		return `异步取值失败后没有安排重试 —— 存储服务在启动早期偶尔会抽风，一次失败就宣判「没有工程」是冤枉用户`;
	}
	if (!/valueAttempts/.test(rejectBody)) {
		return `异步取值失败没有计数 —— 重试没有上限，一个永远失败的取值会变成无限 IO`;
	}
	if (!/VALUE_RETRY_LIMIT/.test(rejectBody)) {
		return `异步取值重试没有上限判定（VALUE_RETRY_LIMIT）—— 重试会一直试下去`;
	}
	// ② 到上限必须如实报错，不能永远停在「读取中…」。
	if (!/valueFailed\s*=\s*true/.test(rejectBody)) {
		return `重试到上限后没有标记终态 —— 这一行会永远停在「读取中…」，骗用户`;
	}
	if (!/olympia\.onboarding\.practice\.recent\.failed/.test(rejectBody)) {
		return `重试到上限后没有显示失败文案 —— 这一行会永远停在「读取中…」，骗用户`;
	}
	// ③ 重试要有间隔，不能 busy loop。
	//    注意签名正则不能写成 `\(\s*[^)]*\s*\)`：参数类型是 `() => void`，
	//    里面自带一个右括号，`[^)]*` 会在那里截断，匹配不到声明。
	const retry = methodBody(code, /private\s+scheduleValueRetry\s*\(/);
	if (!retry) return `未找到 scheduleValueRetry()`;
	if (!/VALUE_RETRY_INTERVAL/.test(retry)) {
		return `scheduleValueRetry() 没有间隔（VALUE_RETRY_INTERVAL）—— 失败一次就立刻再试，等于 busy loop`;
	}
	return null;
});

// ===========================================================================
// T17~T19. 写入状态机的代际安全
//
// 这三条钉的是同一个竞态的三个面：「放弃写入」把键从在途表里摘掉之后，
// 那一次写入的 promise 之后还可能才回来。它回来时的 finally 若无脑删键，
// 就会把**新一轮**写入的标记一起摘掉 —— 于是同一个配置键上跑起两个并发写，
// 配置最终落在谁手里全看完成顺序，慢的那次会盖掉用户后来选的那个值。
//
// 这不是「理论上」：只要写入慢过 24 秒（额度）就会进入这个状态，
// 而 24 秒在配置服务抽风时并不罕见。
// ===========================================================================
check('T17', `在途标记必须带代号：旧写入迟到时不能摘掉新一轮的标记（否则同一键并发写）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	// ① 在途表必须是带代号的 Map，不能是光秃秃的 Set。
	if (!/writingKeys\s*=\s*new\s+Map\s*<\s*string\s*,\s*symbol\s*>/.test(code)) {
		return `writingKeys 不是 Map<string, symbol> —— 没有代号，旧写入的 finally 会无脑删掉新一轮写入的标记，同一个键上跑起两个并发写，配置最终落在谁手里全看完成顺序`;
	}
	// ② 发起写入时必须发一个唯一代号并记进表里。
	if (!/const\s+writeToken\s*=\s*Symbol\s*\(/.test(code)) {
		return `发起写入时没有生成唯一代号 —— 分辨不出「这一次写入」和「后来那一次写入」`;
	}
	if (!/writingKeys\s*\.\s*set\s*\(\s*key\s*,\s*writeToken\s*\)/.test(code)) {
		return `发起写入时没有把代号记进 writingKeys —— finally 里无从判断自己是不是当前那一次`;
	}
	// ③ finally 里的删除必须带代号守卫。
	const body = methodBody(code, /flushPendingWrites\s*\([^)]*\)\s*:\s*Promise<void>\s*\{/);
	if (!body) return `未找到 flushPendingWrites()`;
	const guardM = /if\s*\(\s*this\.writingKeys\s*\.\s*get\s*\(\s*key\s*\)\s*===\s*writeToken\s*\)/.exec(body);
	if (!guardM) return `finally 里的 writingKeys.delete(key) 没有代号守卫 —— 旧写入迟到时会摘掉新一轮写入的标记`;
	const guardOpen = body.indexOf('{', guardM.index);
	const guardBlock = balanced(body, guardOpen, '{', '}');
	if (!guardBlock) return `代号守卫块无法配对解析`;
	if (!/writingKeys\s*\.\s*delete\s*\(\s*key\s*\)/.test(guardBlock)) {
		return `代号守卫块里没有写作键的删除 —— 守卫形同虚设`;
	}
	// ④ 未经守卫的裸删除（在 flushPendingWrites 体内）不许出现。
	const guardEnd = guardOpen + guardBlock.length;
	for (const m of body.matchAll(/writingKeys\s*\.\s*delete\s*\(\s*key\s*\)/g)) {
		if (m.index < guardOpen || m.index > guardEnd) {
			return `flushPendingWrites() 里有不在代号守卫内的 writingKeys.delete(key) —— 旧写入迟到会摘掉新一轮写入的标记，同一个键并发写`;
		}
	}
	return null;
});

check('T18', `放弃写入时不得摘掉用户后来改的新值（用户刚点的选择不能白点）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /abandonWriteIfExhausted\s*\([^)]*\)\s*:\s*boolean\s*\{/);
	if (!body) return `未找到 abandonWriteIfExhausted()`;
	// ① 得先收下「本轮看到的待写值」，才谈得上判断用户有没有改过。
	if (!/attemptedValue/.test(body)) {
		return `abandonWriteIfExhausted() 没收下「本轮看到的待写值」 —— 无从判断用户是不是又改过`;
	}
	// ② 删除待写值之前必须比一比。
	const guardM = /if\s*\(\s*this\.pendingWrites\s*\.\s*get\s*\(\s*key\s*\)\s*===\s*attemptedValue\s*\)/.exec(body);
	if (!guardM) return `放弃写入时没有比较「用户是不是又改过这个值」 —— 旧值被放弃时会把用户后来点的那个新值一起摘掉，选择白点`;
	const guardOpen = body.indexOf('{', guardM.index);
	const guardBlock = balanced(body, guardOpen, '{', '}');
	if (!guardBlock) return `守卫块无法配对解析`;
	if (!/pendingWrites\s*\.\s*delete\s*\(\s*key\s*\)/.test(guardBlock)) {
		return `守卫块里没有摘掉待写值 —— 比较了却什么都没做`;
	}
	// ③ 未经守卫的裸删除不许出现。
	const guardEnd = guardOpen + guardBlock.length;
	for (const m of body.matchAll(/pendingWrites\s*\.\s*delete\s*\(\s*key\s*\)/g)) {
		if (m.index < guardOpen || m.index > guardEnd) {
			return `abandonWriteIfExhausted() 里有未经「用户没改过」守卫的 pendingWrites.delete(key) —— 用户后来点的那个新值会被一起摘掉`;
		}
	}
	return null;
});

check('T19', `被放弃的写入若迟到落地，必须把用户的选择补写回去（不能停在旧值上）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	// ① 用户意图要单独记一份：待写值会被消费掉，答不出「用户还想要什么」。
	const write = methodBody(code, /writeConfig\s*\([^)]*\)\s*:\s*Promise<void>\s*\{/);
	if (!write) return `未找到 writeConfig()`;
	if (!/lastIntended\s*\.\s*set\s*\(\s*key\s*,\s*value\s*\)/.test(write)) {
		return `writeConfig() 没有记下用户最后表达的意图 —— 待写值被消费掉之后，就再也答不出「用户还想要什么」`;
	}
	// ② finally 里代号对不上的那条路必须补偿。
	const body = methodBody(code, /flushPendingWrites\s*\([^)]*\)\s*:\s*Promise<void>\s*\{/);
	if (!body) return `未找到 flushPendingWrites()`;
	const guardM = /if\s*\(\s*this\.writingKeys\s*\.\s*get\s*\(\s*key\s*\)\s*===\s*writeToken\s*\)/.exec(body);
	if (!guardM) return `未找到 finally 里的代号守卫`;
	const guardOpen = body.indexOf('{', guardM.index);
	const guardBlock = balanced(body, guardOpen, '{', '}');
	if (!guardBlock) return `代号守卫块无法配对解析`;
	// `balanced()` 配的是**一对**花括号 —— if 的 `{` 配到 else 之前那个 `}`，
	// 所以 else 块不在 guardBlock 里，得从 if 块的收尾处往后找。
	const ifEnd = guardOpen + guardBlock.length - 1;
	const elseM = /else\s*\{/.exec(body.slice(ifEnd));
	if (!elseM) return `代号守卫没有 else 分支 —— 被放弃的写入迟到时没人管`;
	const elseOpen = ifEnd + elseM.index + elseM[0].lastIndexOf('{');
	const elseBlock = balanced(body, elseOpen, '{', '}');
	if (!elseBlock) return `else 分支无法配对解析`;
	if (!/rewriteIfStale/.test(elseBlock)) {
		return `被放弃的写入迟到落地时没有补写用户的选择 —— 配置会停在旧值上，用户选了 B 却看到 A`;
	}
	// ③ 补偿本身要真的比对 + 真的重排。
	const rw = methodBody(code, /rewriteIfStale\s*\([^)]*\)\s*:\s*void\s*\{/);
	if (!rw) return `未找到 rewriteIfStale()`;
	if (!/lastIntended\s*\.\s*get\s*\(\s*key\s*\)/.test(rw)) {
		return `rewriteIfStale() 没有读用户意图 —— 无从判断现在这个值是不是过时的`;
	}
	if (!/configurationService\s*\.\s*getValue\s*\(\s*key\s*\)/.test(rw)) {
		return `rewriteIfStale() 没有读配置真值 —— 不比对就不知道该不该补写`;
	}
	if (!/pendingWrites\s*\.\s*set\s*\(\s*key\s*,\s*intended\s*\)/.test(rw)) {
		return `rewriteIfStale() 没有把用户的选择重新排队`;
	}
	if (!/scheduleFlushRetry\s*\(/.test(rw)) {
		return `rewriteIfStale() 没有安排补写 —— 重新排队了却没人去写`;
	}
	return null;
});

// ===========================================================================
// T20~T25. 进入动画的「通电扫光」与暗角时机
//
// 这一批钉的是真机逐帧抓出来的两条**真问题**，不是审美偏好：
//
//   1. 第五道扫光从来没有亮过。时间线把最后一道指向底部面板（panel），
//      而底部面板默认是收着的 → 取不到矩形 → 那道扫光被整条跳过 →
//      时间线上留下一段「什么都没发生」的死区。
//   2. 暗角退场太晚（3.50s→5.30s）。暗角那层 DOM 盖在画布**之上**，
//      所以它压的不只是极光，还把已经露出来的真实工作台一起压暗 ——
//      最高 35% 的黑一直挂到 5.30s，最重要的「揭示工作台」那一拍整个发闷。
//
// 这两条都属于「功能没发生 / 效果反效果」，所以必须钉成断言，
// 不能指望下一次目视复核还记得。
// ===========================================================================

/** 从时间线源文件里解析扫光列表（必须落在**赋值语句**的数组字面量上）。 */
function parseSweepList(code) {
	const anchor = code.indexOf('export const OLYMPIA_ONBOARDING_SWEEPS');
	if (anchor < 0) return null;
	const assignIdx = code.indexOf('= [', anchor);
	if (assignIdx < 0) return null;
	const body = balanced(code, code.indexOf('[', assignIdx), '[', ']');
	if (!body) return null;
	const out = [];
	for (const m of body.matchAll(/id:\s*'([a-z]+)'\s*,\s*start:\s*([0-9.]+)\s*,\s*end:\s*([0-9.]+)\s*,\s*axis:\s*'([xy])'/g)) {
		out.push({ id: m[1], start: Number(m[2]), end: Number(m[3]), axis: m[4] });
	}
	return out;
}

check('T20', `扫光目标不得包含默认不存在的部件（底部面板默认收起，那道扫光永远不会亮）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(t);
	const anchor = code.indexOf('OLYMPIA_ONBOARDING_SWEEP_PARTS');
	if (anchor < 0) return `未找到 OLYMPIA_ONBOARDING_SWEEP_PARTS`;
	const assignIdx = code.indexOf('= [', anchor);
	if (assignIdx < 0) return `OLYMPIA_ONBOARDING_SWEEP_PARTS 不是数组字面量赋值，无法解析`;
	const body = balanced(code, code.indexOf('[', assignIdx), '[', ']');
	if (!body) return `OLYMPIA_ONBOARDING_SWEEP_PARTS 的数组无法配对解析`;
	const entries = [...body.matchAll(/\[\s*'([a-z]+)'\s*,\s*Parts\.([A-Z_]+)\s*\]/g)].map(m => ({ id: m[1], part: m[2] }));
	if (!entries.length) return `OLYMPIA_ONBOARDING_SWEEP_PARTS 里没有解析出任何条目`;
	for (const e of entries) {
		if (e.part === 'PANEL_PART') {
			return `「${e.id}」这道扫光指向 Parts.PANEL_PART —— 底部面板默认收起，取不到矩形，那道扫光永远不会亮，时间线上留下一段死区`;
		}
	}
	if (!entries.some(e => e.id === 'statusbar' && e.part === 'STATUSBAR_PART')) {
		return `没有指向 Parts.STATUSBAR_PART 的扫光 —— 状态栏是常驻部件，最后一道「通电」必须落在它身上`;
	}
	return null;
});

check('T21', `时间线的扫光列表与渲染层的部件映射必须一一对应（时间线加了目标但没建 DOM 元素 = 又一段死区）`, () => {
	const tl = load(F_ONB_TIMELINE);
	const onb = load(F_ONB);
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const tlCode = stripTsComments(tl);
	const onbCode = stripTsComments(onb);
	const tlIds = (parseSweepList(tlCode) || []).map(s => s.id);
	if (!tlIds.length) return `没能从 OLYMPIA_ONBOARDING_SWEEPS 里解析出任何一道扫光`;
	const onbAnchor = onbCode.indexOf('OLYMPIA_ONBOARDING_SWEEP_PARTS');
	if (onbAnchor < 0) return `未找到 OLYMPIA_ONBOARDING_SWEEP_PARTS`;
	const onbAssign = onbCode.indexOf('= [', onbAnchor);
	if (onbAssign < 0) return `OLYMPIA_ONBOARDING_SWEEP_PARTS 不是数组字面量赋值，无法解析`;
	const onbBody = balanced(onbCode, onbCode.indexOf('[', onbAssign), '[', ']');
	if (!onbBody) return `OLYMPIA_ONBOARDING_SWEEP_PARTS 的数组无法配对解析`;
	const onbIds = [...onbBody.matchAll(/\[\s*'([a-z]+)'\s*,/g)].map(m => m[1]);
	if (tlIds.length !== onbIds.length) {
		return `时间线有 ${tlIds.length} 道扫光（${tlIds.join('/')}），渲染层只建了 ${onbIds.length} 个（${onbIds.join('/')}）—— 时间线上多出来的那道永远没有 DOM 元素`;
	}
	const missing = tlIds.filter(id => !onbIds.includes(id));
	if (missing.length) return `时间线里的「${missing.join('/')}」在渲染层没有对应部件`;
	return null;
});

check('T22', `扫光方向必须来自时间线的 axis 字段（写死「只有标题栏是横向」会让 axis 形同虚设）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /renderSweeps\s*\([^)]*\)\s*:\s*void\s*\{/);
	if (!body) return `未找到 renderSweeps()`;
	if (!/state\.axis/.test(body)) {
		return `renderSweeps() 没有读 state.axis —— 扫光方向被写死了，时间线上的 axis 字段改了也不会生效`;
	}
	if (/state\.id\s*(?:===|!==)/.test(body)) {
		return `renderSweeps() 里在拿 state.id 判断方向 —— 方向必须来自时间线的 axis，而不是「是哪个部件」`;
	}
	const tl = load(F_ONB_TIMELINE);
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const tlCode = stripTsComments(tl);
	if (!/readonly\s+axis\s*:\s*'x'\s*\|\s*'y'\s*;/.test(tlCode)) {
		return `时间线的扫光状态里没有 axis 字段`;
	}
	const mapM = /OLYMPIA_ONBOARDING_SWEEPS\.map\(/.exec(tlCode);
	if (!mapM) return `时间线里找不到扫光状态的计算`;
	const mapBody = balanced(tlCode, tlCode.indexOf('{', mapM.index), '{', '}');
	if (!mapBody) return `扫光状态的 map 回调无法配对解析`;
	const axisCount = [...mapBody.matchAll(/axis\s*:\s*sweep\.axis/g)].length;
	if (axisCount < 2) {
		return `扫光状态里只有 ${axisCount} 处透传 axis —— 「不激活」和「激活」两条路径都得带上 axis，否则不激活的那一帧方向是未定义的`;
	}
	return null;
});

check('T23', `暗角必须在洞完全打开时归零（工作台一露面就不能再被压暗）`, () => {
	const t = load(F_ONB_TIMELINE);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(t);
	const num = name => {
		const m = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*([0-9.]+)`).exec(code);
		return m ? Number(m[1]) : null;
	};
	const revealEnd = num('OLYMPIA_ONBOARDING_REVEAL_END');
	const riseStart = num('OLYMPIA_ONBOARDING_VIGNETTE_RISE_START');
	const riseEnd = num('OLYMPIA_ONBOARDING_VIGNETTE_RISE_END');
	const fallStart = num('OLYMPIA_ONBOARDING_VIGNETTE_FALL_START');
	const fallEnd = num('OLYMPIA_ONBOARDING_VIGNETTE_FALL_END');
	const peak = num('OLYMPIA_ONBOARDING_VIGNETTE_PEAK');
	for (const [n, v] of [['REVEAL_END', revealEnd], ['VIGNETTE_RISE_START', riseStart], ['VIGNETTE_RISE_END', riseEnd], ['VIGNETTE_FALL_START', fallStart], ['VIGNETTE_FALL_END', fallEnd]]) {
		if (v === null) return `未找到 ${n}`;
	}
	if (fallEnd > revealEnd) {
		return `暗角在 ${fallEnd}s 才归零，而洞在 ${revealEnd}s 就完全打开了 —— 中间这 ${(fallEnd - revealEnd).toFixed(2)}s 里真实工作台被压着最高 ${peak} 的黑，最重要的「揭示工作台」那一拍整个发闷`;
	}
	if (riseStart >= revealEnd || fallStart < riseStart || fallEnd < fallStart) {
		return `暗角的时间窗不对（升起 ${riseStart}s→${riseEnd}s，退场 ${fallStart}s→${fallEnd}s）—— 暗角必须整个活在极光阶段内`;
	}
	if (riseEnd > revealEnd) {
		return `暗角在 ${riseEnd}s 才升到峰值，而洞 ${revealEnd}s 就开了 —— 峰值那一刻工作台正从洞里冒出来，会被压暗`;
	}
	return null;
});

check('T24', `扫光必须从洞打开之后开始、并在总时长前收尾（中间不能留一段「什么都没发生」的死区）`, () => {
	const t = load(F_ONB_TIMELINE);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(t);
	const num = name => {
		const m = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*([0-9.]+)`).exec(code);
		return m ? Number(m[1]) : null;
	};
	const duration = num('OLYMPIA_ONBOARDING_ENTER_DURATION');
	const revealEnd = num('OLYMPIA_ONBOARDING_REVEAL_END');
	if (duration === null) return `未找到 OLYMPIA_ONBOARDING_ENTER_DURATION`;
	if (revealEnd === null) return `未找到 OLYMPIA_ONBOARDING_REVEAL_END`;
	const sweeps = parseSweepList(code);
	if (!sweeps || !sweeps.length) return `没能从 OLYMPIA_ONBOARDING_SWEEPS 里解析出任何一道扫光`;
	const first = Math.min(...sweeps.map(s => s.start));
	const last = Math.max(...sweeps.map(s => s.end));
	if (first < revealEnd) {
		return `第一道扫光在 ${first}s 就开始了，而洞 ${revealEnd}s 才完全打开 —— 扫光打在还没露出来的极光上`;
	}
	if (last < duration - 0.5) {
		return `最后一道扫光在 ${last}s 就结束了，总时长 ${duration}s —— 尾巴上有 ${(duration - last).toFixed(2)}s 什么也不发生，整段动画少了半个句号`;
	}
	return null;
});

check('T25', `相邻扫光必须重叠（不重叠就读成「一个亮了停一下下一个亮了」，那是一串提示音不是一次通电）`, () => {
	const t = load(F_ONB_TIMELINE);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(t);
	const sweeps = parseSweepList(code);
	if (!sweeps || sweeps.length < 2) return `没能从 OLYMPIA_ONBOARDING_SWEEPS 里解析出足够的扫光`;
	for (let i = 0; i + 1 < sweeps.length; i++) {
		const a = sweeps[i];
		const b = sweeps[i + 1];
		if (b.start >= a.end) {
			return `「${a.id}」(到 ${a.end}s) 和「${b.id}」(从 ${b.start}s) 之间空了 ${(b.start - a.end).toFixed(2)}s —— 中间那段什么也不发生`;
		}
	}
	return null;
});

check('T26', `取不到部件矩形时必须兜底，不得直接跳过（跳过 = 时间线上留下一段死区）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /updateSweepRects\s*\(\s*\)\s*:\s*void\s*\{/);
	if (!body) return `未找到 updateSweepRects()`;
	if (!/rect\s*=\s*viewport/.test(body)) {
		return `updateSweepRects() 里没有兜底矩形 —— 部件在这个窗口形状下不存在时（底部面板收起、侧栏折叠、状态栏被关掉），那道扫光会被整条跳过，时间线上留下一段「什么都没发生」的死区`;
	}
	return null;
});

check('T27', `扫光光带必须始终在屏内（不得多走一倍 —— 多走一倍就只有中间 20% 的时间看得见光带）`, () => {
	const tl = load(F_ONB_TIMELINE);
	const onb = load(F_ONB);
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const tlCode = stripTsComments(tl);
	const onbCode = stripTsComments(onb);
	const compact = s => s.replace(/\s+/g, '');
	const fn = methodBody(tlCode, /olympiaOnboardingSweepTravel\s*\(\s*offset\s*:\s*number\s*,\s*extent\s*:\s*number\s*,\s*band\s*:\s*number\s*\)\s*:\s*number\s*\{/);
	if (!fn) return `时间线里找不到 olympiaOnboardingSweepTravel()`;
	const canonical = compact('((offset + 1) / 2) * (extent + band) - band');
	if (!compact(fn).includes(canonical)) {
		return `olympiaOnboardingSweepTravel() 的走法不对 —— 光带必须从「刚好在区域外 -带宽」走到「刚好在区域外 +区域」，中点落在区域正中；走过头一倍的话，整道扫光里只有中间约 20% 的时间光带在屏上（真机表现为「扫光不可见」而 DOM 上 opacity 却是 0.9）`;
	}
	const calls = [...onbCode.matchAll(/olympiaOnboardingSweepTravel\s*\(/g)].length;
	if (calls < 2) {
		return `渲染层只调用了 ${calls} 次 olympiaOnboardingSweepTravel() —— 横向和纵向两条分支都得用它，否则其中一条还在走老的多走一倍公式`;
	}
	return null;
});

// ===========================================================================
// T28~T36：Q5（异步取值失败后的「在途」标记）与 Q9（进入动画期间的结构冻结）
//            的守卫，以及 T-027 九问里指出「代码对、但没人断言」的那几条。
//
// 这几条全部锚在**代码**上（load() 已经剥掉注释），并且逐条配了变异
// M69~M79：把代码改坏，对应的断言必须变红。
// ===========================================================================

/** 取 updateRowState() 里异步取值分支的三个关键块。 */
function asyncValueBlocks(code) {
	const body = methodBody(code, /private\s+updateRowState\s*\(/);
	if (!body) {
		return { error: `未找到 updateRowState()` };
	}
	const failHandler = blockRange(body, /\},\s*error\s*=>\s*\{/);
	if (!failHandler) {
		return { error: `updateRowState() 里找不到异步取值的失败处理分支（形如 \`}, error => {\`）` };
	}
	const terminal = blockRange(failHandler.text, /if\s*\(\s*attempts\s*>=\s*OlympiaOnboardingCards\.VALUE_RETRY_LIMIT\s*\)\s*\{/);
	if (!terminal) {
		return { error: `失败处理分支里找不到「达到重试上限」的终态判定` };
	}
	const retry = blockRange(failHandler.text, /this\.scheduleValueRetry\s*\(\s*\(\s*\)\s*=>\s*\{/);
	if (!retry) {
		return { error: `失败处理分支里找不到 scheduleValueRetry() 的重试任务` };
	}
	return { body, failHandler, terminal, retry };
}

check('T28', `异步取值失败后不得提前放掉「在途」标记（800ms 窗口里任何一次 refresh 都会重发请求并提前烧光重试预算）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const b = asyncValueBlocks(code);
	if (b.error) return b.error;
	const releases = [...b.failHandler.text.matchAll(/binding\.valuePending\s*=\s*false\s*;/g)];
	if (!releases.length) {
		return `失败处理分支里一次都没放掉 valuePending —— 重试链再也起不了跑`;
	}
	for (const r of releases) {
		const at = r.index;
		const inTerminal = at >= b.terminal.start && at < b.terminal.end;
		const inRetry = at >= b.retry.start && at < b.retry.end;
		if (!inTerminal && !inRetry) {
			return `失败处理分支在「达到上限」和「重试任务」之外还放了一次 valuePending（位置 ${at}）—— 放早了的话，从失败到重试真的起跑之间的 800ms 里，任何一次 refresh() 都会重发请求并把失败预算 +1；用户在 800ms 窗口里点一下别的选项，这一行就永久停在「读取失败」，而可存储服务其实早就好了`;
		}
	}
	// 终态块里必须**两个标记一起收口**：放掉「在途」+ 置上「确认取不到」。
	//
	// 只断言「不许在这两块之外放」是不够的 —— 把终态块里那一次删掉，
	// 重试块里那一次仍然落在允许范围内，T28 照样绿：那是**真空通过**。
	// （这条是 T-029 复核 Q7 点出来的。）
	if (!/binding\.valuePending\s*=\s*false\s*;/.test(b.terminal.text)) {
		return `终态块里没有放掉 valuePending —— 账面上这一行永远「在途」；今天靠 valueFailed 短路兜着，那个短路哪天没了就露馅`;
	}
	if (!/binding\.valueFailed\s*=\s*true\s*;/.test(b.terminal.text)) {
		return `终态块里没有置上 valueFailed —— 这一行会永远停在「读取中…」骗用户`;
	}
	const retryBody = b.retry.text;
	const relAt = retryBody.search(/binding\.valuePending\s*=\s*false\s*;/);
	const updAt = retryBody.search(/this\.updateRowState\s*\(/);
	if (relAt < 0) {
		return `重试任务里没有放掉 valuePending —— 上面第 ③ 道闸门会把它自己挡住，重试永远起不了跑`;
	}
	if (updAt < 0) {
		return `重试任务里没有重新调用 updateRowState() —— 重试排上了也刷不出值`;
	}
	if (relAt > updAt) {
		return `重试任务里放掉 valuePending 的时机排在 updateRowState() 之后 —— 闸门会先把自己挡住`;
	}
	return null;
});

check('T29', `重试任务必须核对代号（更新的请求接管之后，旧的重试不得再动这一行）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const b = asyncValueBlocks(code);
	if (b.error) return b.error;
	// 结构化比对：两个操作数**任意顺序**都算。
	// 只认 `binding.valueToken !== token` 这个字面的话，
	// 把等价写法 `token !== binding.valueToken` 判红就是在管写法不管行为。
	// （T-029 复核 Q7 点的第二处。）
	const cmp = /(?:binding\.valueToken\s*!==\s*token|token\s*!==\s*binding\.valueToken)/;
	if (!cmp.test(b.retry.text)) {
		return `重试任务里没有核对 valueToken（两个操作数任意顺序都算）—— 更新的请求已经接管这一行时，旧的重试会把这一行一起刷掉`;
	}
	return null;
});

check('T30', `进入动画期间卡片区结构必须冻结（行区与预览区都不得整片重建）`, () => {
	const cards = load(F_ONB_CARDS);
	const onb = load(F_ONB);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(cards);
	const onbCode = stripTsComments(onb);
	if (!/private\s+entering\s*=\s*false\s*;/.test(code)) {
		return `卡片层没有「进入动画中」的标志 —— 没有它就没法冻结卡片区`;
	}
	const begin = methodBody(code, /beginEnterAnimation\s*\(\s*\)\s*:\s*void\s*\{/);
	if (!begin) {
		return `卡片层没有 beginEnterAnimation()`;
	}
	if (!/this\.entering\s*=\s*true\s*;/.test(begin)) {
		return `beginEnterAnimation() 没有把 entering 置为 true`;
	}
	for (const [label, sig] of [['refreshPreview', /private\s+refreshPreview\s*\(/], ['rebuildRows', /private\s+rebuildRows\s*\(/]]) {
		const body = methodBody(code, sig);
		if (!body) return `未找到 ${label}()`;
		const guardAt = body.search(/if\s*\(\s*this\.entering\s*\)/);
		const replaceAt = body.search(/replaceChildren\s*\(/);
		if (guardAt < 0) {
			return `${label}() 里没有「进入动画中」的早退闸门 —— 动画期间它会整片重建 DOM，那一帧就是硬切`;
		}
		if (replaceAt < 0) {
			return `${label}() 里找不到 replaceChildren()`;
		}
		if (guardAt > replaceAt) {
			return `${label}() 的冻结闸门排在 replaceChildren 之后 —— 等于没有`;
		}
		const guardBody = blockRange(body, /if\s*\(\s*this\.entering\s*\)/);
		if (!guardBody || !/\breturn\b/.test(guardBody.text)) {
			return `${label}() 的冻结闸门里没有 return —— 闸门形同虚设`;
		}
	}
	if (!onbCode.includes('this.cards.beginEnterAnimation()')) {
		return `父层没有调用 beginEnterAnimation() —— 冻结永远不会被打开`;
	}
	return null;
});

check('T31', `放弃写入的收场路径不得递归触发写入（只刷状态，不重跑整轮写入）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /private\s+abandonWriteIfExhausted\s*\(/);
	if (!body) return `未找到 abandonWriteIfExhausted()`;
	// 黑名单是「**整片重建**」的语义并集，不是某几个 API 名字。
	// 只列 replaceChildren/innerHTML 这几个固定名字的话，
	// 将来有人改用 appendChild / replaceWith / insertAdjacentHTML 就漏掉了。
	// （T-029 复核 Q7 点的第三处。）
	const REBUILD_PATTERNS = [
		{ re: /\bthis\.refresh\s*\(/, name: 'this.refresh()' },
		{ re: /\brebuildRows\s*\(/, name: 'rebuildRows()' },
		{ re: /\bupdateRows\s*\(/, name: 'updateRows()' },
		{ re: /\.replaceChildren\s*\(/, name: 'replaceChildren()' },
		{ re: /\.innerHTML\s*=/, name: 'innerHTML =' },
		{ re: /\.outerHTML\s*=/, name: 'outerHTML =' },
		{ re: /\.insertAdjacentHTML\s*\(/, name: 'insertAdjacentHTML()' },
		{ re: /\.appendChild\s*\(/, name: 'appendChild()' },
		{ re: /\.insertBefore\s*\(/, name: 'insertBefore()' },
		{ re: /\.removeChild\s*\(/, name: 'removeChild()' },
		{ re: /\.replaceWith\s*\(/, name: 'replaceWith()' },
		{ re: /\.append\s*\(/, name: 'append()' },
		{ re: /\.prepend\s*\(/, name: 'prepend()' },
		{ re: /\.after\s*\(/, name: 'after()' },
		{ re: /\.before\s*\(/, name: 'before()' }
	];
	for (const p of REBUILD_PATTERNS) {
		if (p.re.test(body)) {
			return `放弃写入的路径里出现了 ${p.name} —— 它会再触发一轮写入/整片重建，形成递归`;
		}
	}
	if (!body.includes('this.refreshRowStates(')) {
		return `放弃写入后没有刷行状态 —— chip 的高亮会继续停在用户点的那个选项上，界面在撒谎`;
	}
	if (!body.includes('this.refreshPreview(')) {
		return `放弃写入后没有刷预览区 —— 预览会继续显示没生效的选择`;
	}
	return null;
});

check('T32', `重试额度必须按「还没用光」比较（方向反了会第一轮就放弃）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /private\s+abandonWriteIfExhausted\s*\(/);
	if (!body) return `未找到 abandonWriteIfExhausted()`;
	if (!/rounds\s*<\s*OlympiaOnboardingCards\.FLUSH_RETRY_LIMIT/.test(body)) {
		return `额度判定不是「rounds < FLUSH_RETRY_LIMIT」—— 额度是「还能等几轮」，用光之前都该继续`;
	}
	if (/rounds\s*(>=|>)\s*OlympiaOnboardingCards\.FLUSH_RETRY_LIMIT/.test(body)) {
		return `额度判定用了 >= 或 > —— 比较方向反了`;
	}
	return null;
});

check('T33', `被放弃的写入若迟到落地，必须先过两道早退再补写（并给新尝试一份完整预算）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /private\s+rewriteIfStale\s*\(/);
	if (!body) return `未找到 rewriteIfStale()`;
	const setAt = body.search(/this\.pendingWrites\.set\s*\(\s*key\s*,\s*intended\s*\)/);
	if (setAt < 0) {
		return `rewriteIfStale() 没有把用户的选择补写回待写队列`;
	}
	const guards = [
		[/if\s*\(\s*intended\s*===\s*undefined\s*\|\|\s*intended\s*===\s*writtenValue\s*\)\s*\{/, '「用户没有新意图，或意图与已写值相同」'],
		[/if\s*\(\s*this\.configurationService\.getValue\s*\(\s*key\s*\)\s*===\s*intended\s*\)\s*\{/, '「配置里已经是用户想要的值」']
	];
	for (const [re, label] of guards) {
		const blk = blockRange(body, re);
		if (!blk) {
			return `rewriteIfStale() 里找不到${label}这道早退`;
		}
		if (!/\breturn\b/.test(blk.text)) {
			return `rewriteIfStale() 的${label}早退里没有 return —— 会把一个不需要补写的值也排进队列`;
		}
		if (blk.start > setAt) {
			return `rewriteIfStale() 的${label}早退排在补写之后 —— 顺序反了`;
		}
	}
	if (!/this\.pendingWriteRounds\.delete\s*\(\s*key\s*\)/.test(body)) {
		return `rewriteIfStale() 没有清掉这个键的轮次计数 —— 补写回去的值一出生就只剩最后一轮额度`;
	}
	if (!body.includes('this.scheduleFlushRetry()')) {
		return `rewriteIfStale() 没有安排下一次补写 —— 补写回队列也没人写`;
	}
	return null;
});

check('T34', `放弃写入时必须同时摘掉「用户意图」（否则迟到的旧写入会把用户已经不想要的值又补写回去）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /private\s+abandonWriteIfExhausted\s*\(/);
	if (!body) return `未找到 abandonWriteIfExhausted()`;
	const blk = blockRange(body, /if\s*\(\s*this\.pendingWrites\.get\s*\(\s*key\s*\)\s*===\s*attemptedValue\s*\)\s*\{/);
	if (!blk) {
		return `放弃写入的路径里找不到「用户还没改过这个值」的守卫`;
	}
	if (!blk.text.includes('this.pendingWrites.delete(key)')) {
		return `守卫块里没有摘掉待写值 —— 被放弃的值会留在队列里，下一轮又被写一次`;
	}
	if (!blk.text.includes('this.lastIntended.delete(key)')) {
		return `守卫块里没有摘掉用户意图 —— 迟到的写入会拿这个意图当「用户还想要」，把一个用户已经不想要的旧值补写回去`;
	}
	return null;
});

check('T35', `三条清理路径的职责必须分清（待写值 / 轮次 / 用户意图各自成套，不能顺手多删）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /private\s+async\s+flushPendingWrites\s*\(/);
	if (!body) return `未找到 flushPendingWrites()`;
	const undef = blockRange(body, /if\s*\(\s*value\s*===\s*undefined\s*\)\s*\{/);
	if (!undef) return `flushPendingWrites() 里找不到「没有值可写」的分支`;
	if (!undef.text.includes('this.pendingWrites.delete(key)')) {
		return `「没有值可写」的分支里没有摘掉待写值 —— 重试定时器永远停不下来`;
	}
	if (!undef.text.includes('this.pendingWriteRounds.delete(key)')) {
		return `「没有值可写」的分支里没有摘掉轮次计数 —— 这个键会带着上一轮的账继续算`;
	}
	if (undef.text.includes('this.lastIntended.delete(')) {
		return `「没有值可写」的分支里把用户意图也删了 —— 意图是「用户还想要什么」的记录，删了它，迟到的写入就再也补写不回去`;
	}
	const guard = blockRange(body, /if\s*\(\s*this\.pendingWrites\.get\s*\(\s*key\s*\)\s*===\s*value\s*\)\s*\{/);
	if (!guard) {
		return `flushPendingWrites() 里找不到「这次写的还是不是用户当前那个值」的守卫`;
	}
	if (!guard.text.includes('this.pendingWrites.delete(key)')) {
		return `守卫块里没有摘掉待写值`;
	}
	const writeAt = body.search(/await\s+this\.configurationService\.updateValue\s*\(/);
	if (writeAt < 0) {
		return `flushPendingWrites() 里找不到真正的写入`;
	}
	const roundsAt = body.indexOf('this.pendingWriteRounds.delete(key)', writeAt);
	if (roundsAt < 0) {
		return `写入成功之后没有清掉轮次计数`;
	}
	if (roundsAt < guard.end) {
		return `轮次计数在守卫块里面被清 —— 用户在写入期间又改了值的话，新值一出生就继承了旧值剩下的额度`;
	}
	return null;
});

check('T36', `异步取值的重试队列必须先入队再判定时器，且定时器必须先清空句柄再取队列（否则新排上的重试没人触发）`, () => {
	const t = load(F_ONB_CARDS);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(t);
	const body = methodBody(code, /private\s+scheduleValueRetry\s*\(/);
	if (!body) return `未找到 scheduleValueRetry()`;
	const pushAt = body.search(/this\.valueRetryQueue\.push\s*\(/);
	const guardAt = body.search(/this\.valueRetryTimer\s*!==\s*null/);
	if (pushAt < 0) return `scheduleValueRetry() 没有把任务放进队列`;
	if (guardAt < 0) return `scheduleValueRetry() 没有判断定时器是否已经在跑`;
	if (pushAt > guardAt) {
		return `scheduleValueRetry() 先判定时器再入队 —— 定时器已经在跑的时候，任务会被挂进队列却没人触发`;
	}
	const clearAt = body.search(/this\.valueRetryTimer\s*=\s*null\s*;/);
	const spliceAt = body.search(/this\.valueRetryQueue\.splice\s*\(/);
	if (clearAt < 0) return `scheduleValueRetry() 里没有清掉定时器句柄 —— 之后排上的重试永远不会触发`;
	if (spliceAt < 0) return `scheduleValueRetry() 里没有取走队列`;
	if (clearAt > spliceAt) {
		return `定时器句柄在取队列之后才清空 —— 队列里的任务想再排一次重试时会看到一个还活着的句柄，从而不再新建定时器，那条重试链就断了`;
	}
	const callAt = body.search(/\bitem\s*\(\s*\)/);
	if (callAt < 0) return `scheduleValueRetry() 里没有执行队列里的任务`;
	if (clearAt > callAt) {
		return `定时器句柄在执行任务之后才清空 —— 任务里再排一次重试时看不到空句柄，那条链就断了`;
	}
	return null;
});

// ===========================================================================
// Z. 断言编号唯一
//
// 踩过的坑：新增一条断言时顺手用了已被占用的编号（D3），输出里出现两条 D3，
// 看着像两条不同的断言，其实是同一条 —— 汇总数还会照实 +1，掩盖了重复。
// 所以编号唯一性本身要被断言，不能靠眼睛。
// ===========================================================================
check('Z1', `断言编号唯一`, () => {
	const seen = new Set();
	const dup = [];
	for (const r of results) {
		if (seen.has(r.id)) dup.push(r.id);
		else seen.add(r.id);
	}
	if (dup.length) return `编号重复：${[...new Set(dup)].join(', ')}`;
	return null;
});

// ===========================================================================
// Z2. 断言脚本的自我约束
//
// 「拿含注释的原文做模式测试」是本脚本最大的假绿来源，已经咬过两次
// （H2、H13）。做法是把这件事**在读取层**堵死：`load()` 默认剥注释，
// 只有极少数地方需要原文，走 `loadRaw()`。
//
// 那条路不能封死 —— 版权头检查就必须看原文（版权头本身就是块注释）。
// 所以要求：每次用 loadRaw 都得在旁边写清楚为什么。
//
// 这条断言就是来盯这个标记的 —— 免得「大家都这么写」变成「谁都不写」。
// ===========================================================================
check('Z2', `断言里用到 loadRaw 的地方必须带 raw-ok 理由标记`, () => {
	// 找**代码里**的调用点：先剥掉本脚本自己的注释，再找。
	// 注释里提到 loadRaw（比如「需要原文时用 loadRaw()」）不算调用点。
	let self = '';
	try {
		self = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
	} catch {
		return `读不到本脚本自身源码 —— 无法自检`;
	}
	const rawLines = self.split(/\r?\n/);
	const codeLines = stripTsComments(self).split(/\r?\n/);
	if (codeLines.length !== rawLines.length) {
		return `剥注释后行数对不上（${codeLines.length} vs ${rawLines.length}）—— 自检本身不可靠`;
	}
	const bad = [];
	for (let i = 0; i < codeLines.length; i++) {
		if (!/\bloadRaw\s*\(/.test(codeLines[i])) {
			continue;
		}
		if (/^\s*(?:async\s+)?function\s+loadRaw\b/.test(codeLines[i])) {
			continue;   // 函数定义本身
		}
		const ctx = rawLines.slice(Math.max(0, i - 8), i + 1).join('\n');
		if (!/raw-ok\s*:/.test(ctx)) {
			bad.push(`第 ${i + 1} 行：${shorten(codeLines[i].trim(), 100)}`);
		}
	}
	if (bad.length) {
		return `以下 loadRaw 调用没有登记理由：${bad.join('；')} —— 拿含注释的原文做模式测试很容易被文档注释骗过（H13 就是这么假绿的）`;
	}
	return null;
});

// ===========================================================================
// Z3. 词法器自检
//
// stripTsComments 是所有断言的地基。它一旦飘移，后面每一条断言都会「扫不到
// 任何东西」—— 那不是断言通过，是断言瞎了。
//
// 已知它咬过两次：
//   - 被字符串字面量里的斜杠星号骗（吃掉 7578 字符真实代码）；
//   - 被正则字面量里的引号骗（`(['"])` 里的单引号被当成字符串开头，后面几百行
//     全被当成字符串，断言扫了个空）。
//
// 所以这里把这两类坑各钉成一条自检 —— 词法器自己坏了要立刻红，而不是让别的
// 断言替它背锅。
// ===========================================================================
check('Z3', `stripTsComments 的词法器自检（字符串 / 正则 / 注释三类都不能带偏它）`, () => {
	const cases = [
		{
			name: '正则字面量里的引号不能被当成字符串开头',
			in: "const keyRe = /(?:['\"])(x)\\2/g;\n// 行注释\nconst y = 1;",
			mustKeep: ["const keyRe = /(?:['\"])(x)\\2/g;", 'const y = 1;'],
			mustDrop: ['行注释'],
		},
		{
			name: '字符串字面量里的斜杠星号不是注释',
			in: "const s = '/*';\nconst t = 1;",
			mustKeep: ["const s = '/*';", 'const t = 1;'],
			mustDrop: [],
		},
		{
			name: '除法不是正则字面量',
			in: 'const v = a / b / c;\nconst w = 2;',
			mustKeep: ['const v = a / b / c;', 'const w = 2;'],
			mustDrop: [],
		},
		{
			name: '块注释被剥掉但行号保留',
			in: 'const a = 1;\n/* 块\n注释 */\nconst b = 2;',
			mustKeep: ['const a = 1;', 'const b = 2;'],
			mustDrop: ['块'],
			mustKeepLines: 4,
		},
		{
			name: '模板字符串里的反引号不闭合词法器',
			in: 'const m = `a ${1 + 2} b`;\nconst n = 3;',
			mustKeep: ['const m = `a ${1 + 2} b`;', 'const n = 3;'],
			mustDrop: [],
		},
	];
	for (const c of cases) {
		const out = stripTsComments(c.in);
		for (const keep of c.mustKeep) {
			if (!out.includes(keep)) {
				return `用例「${c.name}」：剥完之后丢了「${shorten(keep, 80)}」`;
			}
		}
		for (const drop of c.mustDrop) {
			if (out.includes(drop)) {
				return `用例「${c.name}」：剥完之后仍然留着「${shorten(drop, 80)}」`;
			}
		}
		if (typeof c.mustKeepLines === 'number' && out.split('\n').length !== c.mustKeepLines) {
			return `用例「${c.name}」：行数从 ${c.in.split('\n').length} 变成了 ${out.split('\n').length} —— 行号对不上源码，报错会指错地方`;
		}
	}
	return null;
});

// ===========================================================================
// T37~T49 —— 「进入动画」的时间序接缝
//
// 这一批来自 T-030 的六问复核（Qoder 只读审计）。逐条核实后落地，
// 钉的是**行为不变式**，不是写法：
//
//   Q3 粒子起飞必须晚于卡片消散结束 —— 两者重叠就是重影：
//       卡片半透明地漂着，星光又从同一个位置冒出来。
//   Q2 粒子窗口必须盖住最晚粒子，且必须早于 overlay 被移除。
//   Q1 洞必须晚于首帧兜底层淡出结束才能开始擦；配置阶段极光必须不透明。
//   Q5 rAF 链只能有一条，句柄必须写回；收场必须先撤销定时器再摘 DOM。
//   Q6 进入动画起跑后卡片一律不再吃指针事件，轨道也不再许动。
// ===========================================================================

/** 解析一个（可能引用另一个常量的）数值常量。解析不出来返回 null。 */
function constValue(code, name, depth = 0) {
	if (depth > 8) {
		return null;
	}
	const m = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*([^;]+);`).exec(code);
	if (!m) {
		return null;
	}
	const rhs = m[1].trim();
	if (rhs === '') {
		return null;
	}
	const num = Number(rhs);
	if (Number.isFinite(num)) {
		return num;
	}
	const ref = /^([A-Z][A-Z0-9_]*)$/.exec(rhs);
	return ref ? constValue(code, ref[1], depth + 1) : null;
}

/** 取一行里最后一个 / 第一个数字字面量。 */
function lastNumber(line) {
	const m = [...line.matchAll(/([0-9]*\.?[0-9]+)/g)];
	return m.length ? Number(m[m.length - 1][1]) : null;
}
function firstNumber(line) {
	const m = [...line.matchAll(/([0-9]*\.?[0-9]+)/g)];
	return m.length ? Number(m[0][1]) : null;
}

check('T37', `星光粒子的起飞时刻必须晚于卡片消散结束（两者重叠就是重影：卡片半透明地漂着，星光又从同一位置冒出来）`, () => {
	const tl = load(F_ONB_TIMELINE);
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(tl);
	const start = constValue(code, 'OLYMPIA_ONBOARDING_PARTICLE_START');
	const dissolve = constValue(code, 'OLYMPIA_ONBOARDING_DISSOLVE_END');
	if (start === null) return `时间线里找不到 OLYMPIA_ONBOARDING_PARTICLE_START`;
	if (dissolve === null) return `时间线里找不到 OLYMPIA_ONBOARDING_DISSOLVE_END`;
	if (start < dissolve) {
		return `粒子起飞时刻 ${start}s 早于卡片消散结束时刻 ${dissolve}s —— 这段时间里卡片还看得见，粒子又从同一个位置飞出来，两层叠在一起就是重影`;
	}
	const delayLine = code.split('\n').find(l => /^\s*delay\s*:/.test(l));
	if (!delayLine) return `找不到粒子的 delay 赋值`;
	if (!/OLYMPIA_ONBOARDING_PARTICLE_START/.test(delayLine)) {
		return `粒子的 delay 是「${shorten(delayLine.trim(), 90)}」—— 没带上 OLYMPIA_ONBOARDING_PARTICLE_START，改常量并不会真的推迟起飞`;
	}
	return null;
});

check('T38', `星光粒子的飞行窗口必须盖住最晚一颗粒子的结束时刻（盖不住的话尾部粒子会在半空中被时间轴掐断，像凭空消失）`, () => {
	const tl = load(F_ONB_TIMELINE);
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(tl);
	const win = constValue(code, 'OLYMPIA_ONBOARDING_PARTICLE_WINDOW');
	const start = constValue(code, 'OLYMPIA_ONBOARDING_PARTICLE_START');
	if (win === null) return `时间线里找不到 OLYMPIA_ONBOARDING_PARTICLE_WINDOW`;
	if (start === null) return `时间线里找不到 OLYMPIA_ONBOARDING_PARTICLE_START`;
	const delayLine = code.split('\n').find(l => /^\s*delay\s*:/.test(l));
	const durLine = code.split('\n').find(l => /^\s*duration\s*:/.test(l));
	if (!delayLine || !durLine) return `找不到粒子的 delay / duration 赋值`;
	const delaySpread = lastNumber(delayLine);
	const durBase = firstNumber(durLine);
	const durSpread = lastNumber(durLine);
	if (delaySpread === null || durBase === null || durSpread === null) {
		return `解析不出粒子的时间参数（delay 行 / duration 行）`;
	}
	// 粒子分两批：晚的那一批必须算进「最晚结束时刻」，否则这条断言只管早批，
	// 晚批被掐在半空它照样绿。
	const late = constValue(code, 'OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET');
	if (late === null) return `时间线里找不到 OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET`;
	if (!/OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET/.test(delayLine)) {
		return `粒子的 delay 是「${shorten(delayLine.trim(), 110)}」—— 没带上 OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET，晚批根本没被推迟`;
	}
	const last = start + late + delaySpread + durBase + durSpread;
	if (!(win > last)) {
		return `飞行窗口 ${win}s 盖不住最晚粒子（起飞 ${start}s + 晚批推迟 ${late}s + 延迟抖动 ${delaySpread}s + 时长 ${durBase}~${(durBase + durSpread).toFixed(2)}s = ${last.toFixed(2)}s）—— 尾部粒子会在半空中被时间轴掐掉`;
	}
	return null;
});

check('T39', `星光粒子的飞行窗口必须早于进入动画总时长（晚于的话粒子还在飞，overlay 就已经被摘了）`, () => {
	const tl = load(F_ONB_TIMELINE);
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(tl);
	const win = constValue(code, 'OLYMPIA_ONBOARDING_PARTICLE_WINDOW');
	const dur = constValue(code, 'OLYMPIA_ONBOARDING_ENTER_DURATION');
	if (win === null) return `时间线里找不到 OLYMPIA_ONBOARDING_PARTICLE_WINDOW`;
	if (dur === null) return `时间线里找不到 OLYMPIA_ONBOARDING_ENTER_DURATION`;
	if (!(win < dur)) {
		return `粒子窗口 ${win}s 不早于进入动画时长 ${dur}s —— overlay 被移除时粒子还在半空`;
	}
	return null;
});

check('T40', `进入动画起跑的那一刻就必须断掉卡片的指针事件（起跑那一帧 dissolve 还是 1，卡片是看得见、点得动的）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	const begin = methodBody(code, /beginEnterAnimation\s*\(\s*\)\s*:\s*void\s*\{/);
	if (!begin) return `卡片层没有 beginEnterAnimation()`;
	const setAt = begin.search(/this\.entering\s*=\s*true\s*;/);
	if (setAt < 0) return `beginEnterAnimation() 没有把 entering 置为 true`;
	const peAt = begin.search(/pointerEvents\s*=\s*'none'/);
	if (peAt < 0) {
		return `beginEnterAnimation() 里没有立刻把卡片的 pointerEvents 置为 none —— 起跑那一帧 dissolve 还是 1、interactive 还是 true，用户正好按住卡片的话，拖拽（挂在 window 上）会跟着手指继续跑，把正在化掉的卡片拖偏`;
	}
	if (peAt < setAt) {
		return `beginEnterAnimation() 里断指针排在「entering = true」之前 —— 顺序反了`;
	}
	return null;
});

check('T41', `逐帧写回卡片 pointerEvents 时必须考虑「进入动画中」（只看 interactive 不够：起跑那一帧 interactive 还是 true）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	const body = methodBody(code, /render\s*\(\s*now\s*:\s*number\s*,\s*dissolve\s*:\s*number\s*\)\s*:\s*void\s*\{/);
	if (!body) return `卡片层没有 render(now, dissolve)`;
	const assign = /pointerEvents\s*=\s*([^;]+);/.exec(body);
	if (!assign) return `render() 里没有写 pointerEvents`;
	const rhs = assign[1];
	// 判据是**语义**的，不是拼写的：写回 pointerEvents 的那个值，必须建立在
	// 「entering 为假」这个前提上。只看赋值表达式本身不够 —— 实现允许把条件
	// 拆到局部变量里（`const clickable = !this.entering && layout.interactive`），
	// 所以这里顺着局部变量的定义链追一层。
	const negatesEntering = (expr) => /!\s*(?:this\.)?entering\b/.test(expr) || /entering\s*===\s*false/.test(expr);
	if (negatesEntering(rhs)) return null;
	for (const ref of rhs.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []) {
		const decl = new RegExp(`(?:const|let|var)\\s+${ref}\\s*=\\s*([^;]+);`).exec(body);
		if (decl && negatesEntering(decl[1])) return null;
	}
	return `render() 写回 pointerEvents 的值是「${shorten(rhs, 90)}」—— 追不到「entering 为假」这个前提，起跑那一帧 interactive 还是 true，卡片照样吃点击`;
});

check('T42', `进入动画期间轨道不许再动（正在化掉的卡片突然跳位就是断点）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	const body = methodBody(code, /goto\s*\(\s*index\s*:\s*number\s*\)\s*:\s*void\s*\{/);
	if (!body) return `卡片层没有 goto()`;
	const guardAt = body.search(/if\s*\(\s*this\.entering\s*\)/);
	if (guardAt < 0) {
		return `goto() 里没有「进入动画中」的早退闸门 —— 滚轮、翻页按钮、拖拽惯性都会把正在化掉的卡片拖走`;
	}
	const guardBody = blockRange(body, /if\s*\(\s*this\.entering\s*\)/);
	if (!guardBody || !/\breturn\b/.test(guardBody.text)) {
		return `goto() 的闸门里没有 return —— 闸门形同虚设`;
	}
	return null;
});

check('T43', `进入动画起跑后不得再接受按压与拖拽（pointerdown 挂在轨道上，pointermove 挂在 window 上）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	const handlers = [
		['pointerdown', /addDisposableListener\(\s*track\s*,\s*'pointerdown'/],
		['pointermove', /addDisposableListener\(\s*mainWindow\s*,\s*'pointermove'/],
	];
	for (const [label, sig] of handlers) {
		const m = sig.exec(code);
		if (!m) return `找不到 ${label} 监听`;
		const start = code.indexOf('{', m.index);
		const body = balanced(code, start, '{', '}');
		if (!body) return `解析不出 ${label} 处理器的函数体`;
		if (!/this\.entering/.test(body)) {
			return `${label} 处理器里没有「进入动画中」的早退 —— 起跑后按下轨道会重新置上 dragging，拖拽跟着 window 级 pointermove 继续跑`;
		}
	}
	return null;
});

check('T44', `动画只能有一条 rAF 链，且句柄必须写回（漏一次写回，链就静默分裂成两条，旧句柄再也撤不掉）`, () => {
	const onb = load(F_ONB);
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(onb);
	const rafAll = [...code.matchAll(/requestAnimationFrame\s*\(/g)];
	const rafWrite = [...code.matchAll(/this\.animationFrame\s*=\s*mainWindow\.requestAnimationFrame\s*\(/g)];
	if (rafAll.length !== rafWrite.length) {
		return `requestAnimationFrame 出现 ${rafAll.length} 次，但只有 ${rafWrite.length} 次写回了 this.animationFrame —— 有一处没写回，那条链就撤不掉了`;
	}
	if (rafWrite.length !== 2) {
		return `rAF 链的起点与续接应当恰好两处，实际 ${rafWrite.length} 处`;
	}
	const frame = methodBody(code, /private\s+readonly\s+onFrame\s*=\s*\(\s*timestamp\s*:\s*number\s*\)\s*:\s*void\s*=>\s*\{/);
	if (!frame) return `找不到 onFrame`;
	const first = frame.slice(frame.indexOf('{') + 1).trimStart();
	if (!/^this\.animationFrame\s*=\s*null\s*;/.test(first)) {
		return `onFrame 的第一条语句不是「句柄作废」—— 句柄生命周期必须是「帧首作废 → 帧尾重发」`;
	}
	return null;
});

check('T45', `收场必须先撤销所有定时器再摘 DOM（反过来就留下一条还在跑的链）`, () => {
	const onb = load(F_ONB);
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(onb);
	const body = methodBody(code, /dispose\s*\(\s*\)\s*:\s*void\s*\{/);
	if (!body) return `找不到 dispose()`;
	const cancelAt = body.search(/cancelAnimationFrame\s*\(/);
	const clearAt = body.search(/clearTimeout\s*\(/);
	const removeAt = body.search(/rootElement\.remove\s*\(\s*\)/);
	if (cancelAt < 0) return `dispose() 里没有 cancelAnimationFrame`;
	if (clearAt < 0) return `dispose() 里没有 clearTimeout`;
	if (removeAt < 0) return `dispose() 里没有 rootElement.remove()`;
	if (!(cancelAt < removeAt && clearAt < removeAt)) {
		return `dispose() 里的撤销排在 rootElement.remove() 之后 —— DOM 已经摘了，链还在跑`;
	}
	const intervals = [...code.matchAll(/setInterval\s*\(/g)];
	if (intervals.length) {
		return `文件里有 ${intervals.length} 处 setInterval —— 每一条 setInterval 都是一条独立时钟，不可能随 overlay 一起消失`;
	}
	return null;
});

check('T46', `洞必须晚于首帧兜底层淡出结束才能开始擦（兜底层淡出期间，底下必须已经是不透明的极光，不能露出未开洞的工作台）`, () => {
	const tl = load(F_ONB_TIMELINE);
	const css = load(F_ONB_CSS);
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	if (css === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const tlCode = stripTsComments(tl);
	const cssCode = stripTsComments(css);
	const revealStart = constValue(tlCode, 'OLYMPIA_ONBOARDING_REVEAL_START');
	if (revealStart === null) return `时间线里找不到 OLYMPIA_ONBOARDING_REVEAL_START`;
	const splash = cssRule(cssCode, '.olympia-onboarding-splash');
	if (!splash) return `CSS 里找不到 .olympia-onboarding-splash 规则`;
	const tr = /transition\s*:\s*opacity\s+([0-9.]+)ms/.exec(splash);
	if (!tr) return `首帧兜底层没有可解析的 opacity 过渡时长`;
	const fade = Number(tr[1]) / 1000;
	if (!(revealStart >= fade)) {
		return `洞在 ${revealStart}s 就开始擦，而兜底层 ${(fade * 1000)}ms 就淡完了 —— 中间有一段「兜底没了、洞还没开」的窗口，极光那时若不是不透明的，工作台就裸奔出来了`;
	}
	return null;
});

check('T47', `配置阶段极光必须完全不透明（洞没开的时候，挡住工作台的只能是极光本身）`, () => {
	const tl = load(F_ONB_TIMELINE);
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(tl);
	const geom = methodBody(code, /olympiaOnboardingRevealGeometry\s*\(\s*enterTime\s*:\s*number\s*,\s*viewportWidth\s*:\s*number\s*\)\s*:\s*[^)]*\{/);
	if (!geom) return `时间线里找不到 olympiaOnboardingRevealGeometry()`;
	if (!/OLYMPIA_ONBOARDING_REVEAL_START/.test(geom)) {
		return `洞的起点没有绑定 OLYMPIA_ONBOARDING_REVEAL_START —— 改常量不会推迟开洞`;
	}
	if (!/return\s+undefined\s*;/.test(geom)) {
		return `洞的几何函数没有「还没到开洞时刻就不擦」的早退 —— 配置阶段就开始擦的话，用户还没点开始，工作台就露出来了`;
	}
	return null;
});

check('T48', `越界粒子必须跳过，不能夹到 [0,1]（夹住的话窗口一关，粒子就永远停在起点）`, () => {
	const onb = load(F_ONB);
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(onb);
	const body = methodBody(code, /renderParticles\s*\(\s*progress\s*:\s*number\s*\)\s*:\s*void\s*\{/);
	if (!body) return `找不到 renderParticles()`;
	const guard = blockRange(body, /if\s*\(\s*local\s*<=\s*0\s*\|\|\s*local\s*>=\s*1\s*\)/);
	if (!guard) return `renderParticles() 里找不到「越界」判定（local <= 0 || local >= 1）`;
	if (!/\bcontinue\b/.test(guard.text)) {
		return `越界分支里没有 continue —— 越界粒子会被继续画出来，窗口结束后留下一帧永不消亡的尾影`;
	}
	if (/olympiaOnboardingClamp\s*\(\s*local\s*,/.test(body)) {
		return `renderParticles() 把 local 夹进了 [0,1] —— 那是把「飞完了」伪装成「刚开始」，窗口一关粒子就永远停在起点`;
	}
	return null;
});

check('T49', `overlay 只能被摘一次，且必须等到进入动画走完（提前摘 = 硬切）`, () => {
	const onb = load(F_ONB);
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(onb);
	const removes = [...code.matchAll(/rootElement\.remove\s*\(\s*\)/g)];
	if (removes.length !== 1) {
		return `rootElement.remove() 出现了 ${removes.length} 次 —— 必须恰好一处，多一处就有一处提前摘层`;
	}
	const frame = methodBody(code, /renderFrame\s*\(\s*timestamp\s*:\s*number\s*\)\s*:\s*void\s*\{/);
	if (!frame) return `找不到 renderFrame()`;
	if (!/elapsed\s*>=\s*OLYMPIA_ONBOARDING_ENTER_DURATION/.test(frame)) {
		return `renderFrame() 里没有「elapsed 到达总时长才收场」的判定 —— 提前收场就是硬切`;
	}
	return null;
});

check('T50', `背景时钟必须单调递增、永不归零（时钟一重置，极光形态瞬间跳回初始帧 —— 这在像素上几乎看不出来，只能靠代码钉死）`, () => {
	const onb = load(F_ONB);
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const code = stripTsComments(onb);

	// ① backdropTime 的声明恰好一处，初值为 0
	//    允许显式标注类型（private backdropTime: number = 0;）—— 判据钉行为，不钉写法。
	const decl = [...code.matchAll(/private\s+backdropTime\s*(?::\s*number\s*)?=\s*0\s*;/g)];
	if (decl.length !== 1) {
		return `backdropTime 的声明应恰好一处（private backdropTime = 0; 或 private backdropTime: number = 0;），实际 ${decl.length} 处`;
	}

	// ② 除声明外，对 backdropTime 的写入必须是单调的
	//    += 可以；等价的 `= this.backdropTime + delta` 也可以（delta 已由 ③ 证明非负）。
	//    其余任何直接赋值都可能把时钟拽回 0。
	const writes = [...code.matchAll(/backdropTime\s*(\+?=)(?!=)/g)];
	for (const w of writes) {
		const before = code.slice(Math.max(0, w.index - 40), w.index);
		if (/private\s+$/.test(before)) { continue; }
		if (w[1] === '+=') { continue; }
		const lineEnd = code.indexOf(';', w.index);
		const stmt = code.slice(w.index, lineEnd >= 0 ? lineEnd + 1 : w.index + 60).trim();
		// stmt 是从标识符本身切出来的，不含 `this.` 前缀 —— 等价式也要按这个口径比。
		const equiv = /^backdropTime\s*=\s*this\.backdropTime\s*\+\s*(\S+?)\s*;$/.exec(stmt);
		if (equiv && (equiv[1] === 'delta' || /Math\.max\s*\(\s*0\s*,/.test(equiv[1]))) { continue; }
		return `backdropTime 存在直接赋值（"${stmt}"）—— 时钟一旦被赋值就可能归零，极光形态瞬间跳回初始帧`;
	}

	// ③ delta 必须有非负下限：rAF 时间戳一旦倒退，背景时钟就会往回走
	const frame = methodBody(code, /renderFrame\s*\(\s*timestamp\s*:\s*number\s*\)\s*:\s*void\s*\{/);
	if (!frame) return `找不到 renderFrame()`;
	//    允许 const / let / 显式标注类型 —— 判据钉「算出来的 delta 必须非负」，不钉写法。
	const deltaDecl = /(?:const|let)\s+delta\s*(?::\s*number\s*)?=\s*([^;]+);/.exec(frame);
	if (!deltaDecl) return `renderFrame() 里找不到 delta 的定义`;
	if (!/Math\.max\s*\(\s*0\s*,/.test(deltaDecl[1])) {
		return `delta 的计算没有非负下限（"${deltaDecl[1].trim()}"）—— rAF 时间戳一旦倒退，背景时钟就会往回走`;
	}

	// ③b delta 只能被赋值一次：中途改写的话，前面算好的非负下限形同虚设
	const deltaWrites = [...frame.matchAll(/\bdelta\b\s*(\+\+|--|[+\-*/]?=(?!=))/g)];
	if (deltaWrites.length !== 1) {
		return `renderFrame() 里 delta 被赋值 ${deltaWrites.length} 次（应恰好 1 次：定义处）—— delta 一旦被中途改写，前面算好的非负下限就失效了`;
	}

	// ③c delta 必须真的由 rAF 时间戳差算出来。
	//     光有「单调」不够：写成写死的步长（比如每帧固定 0.016），时钟照样单调递增，
	//     却不跟随真实时间 —— 60fps 与 144fps 机器上的极光流速会不一样，
	//     弱机上时间线与背景就对不上了。
	//     允许等价写法：中间变量承接、* 0.001 代替 / 1000。
	const localDefs = new Map();
	for (const m of frame.matchAll(/(?:^|[^.\w$])(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);/g)) {
		localDefs.set(m[1], m[2]);
	}
	const expandLocals = (expr) => {
		let cur = expr;
		for (let round = 0; round < 4; round++) {
			let changed = false;
			for (const [name, def] of localDefs) {
				if (name === 'delta') { continue; }
				const re = new RegExp('(?<![.\\w$])' + name + '(?![\\w$])');
				if (re.test(cur)) {
					cur = cur.replace(re, '(' + def + ')');
					changed = true;
				}
			}
			if (!changed) { break; }
		}
		return cur;
	};
	const deltaFull = expandLocals(deltaDecl[1]);
	// 方向也钉住：必须是「当前时间戳 减 上一次时间戳」，反过来恒为负会被夹成 0，时钟根本不走。
	if (!/(?:^|[^\w$])timestamp\s*-\s*(?:this\s*\.\s*)?lastTimestamp/.test(deltaFull)) {
		return `delta 不是由 rAF 时间戳差算出来的（"${deltaDecl[1].trim()}"）—— 时钟虽然单调，却不再跟随真实时间`;
	}
	if (!/\/\s*1000\b/.test(deltaFull) && !/\*\s*0\.001\b/.test(deltaFull)) {
		return `delta 没有把毫秒换算成秒（"${deltaDecl[1].trim()}"）—— 背景时钟会快 1000 倍`;
	}

	// ④ 累加必须发生在 renderFrame 里，且用的是 delta
	//    允许 `+= delta`，也允许等价的 `= this.backdropTime + delta`（M27 记录的等价写法）。
	const accumulated =
		/this\.backdropTime\s*\+=\s*delta\s*;/.test(frame) ||
		/this\.backdropTime\s*=\s*this\.backdropTime\s*\+\s*delta\s*;/.test(frame);
	if (!accumulated) {
		return `renderFrame() 里没有用 delta 累加背景时钟（this.backdropTime += delta;）—— 背景时钟不是靠累加推进的`;
	}

	// ⑤ 渲染必须真的用这个时钟：累加了却不交给背景，等于时钟白加
	if (!/this\.backdrop\.render\s*\(\s*this\.backdropTime\s*,/.test(frame)) {
		return `renderFrame() 里没有把 this.backdropTime 交给背景渲染（this.backdrop.render(this.backdropTime, ...)）—— 时钟累加了却不用，背景仍被别的时间源驱动`;
	}
	return null;
});

check('T51', `星光必须压住开洞：晚批粒子的起飞时刻要落在开洞窗口里（否则工作台透出来时星尘早已散尽，前后两段接不上）`, () => {
	const tl = load(F_ONB_TIMELINE);
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(tl);
	const start = constValue(code, 'OLYMPIA_ONBOARDING_PARTICLE_START');
	const late = constValue(code, 'OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET');
	const revealStart = constValue(code, 'OLYMPIA_ONBOARDING_REVEAL_START');
	const revealEnd = constValue(code, 'OLYMPIA_ONBOARDING_REVEAL_END');
	if (start === null) return `时间线里找不到 OLYMPIA_ONBOARDING_PARTICLE_START`;
	if (late === null) return `时间线里找不到 OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET`;
	if (revealStart === null) return `时间线里找不到 OLYMPIA_ONBOARDING_REVEAL_START`;
	if (revealEnd === null) return `时间线里找不到 OLYMPIA_ONBOARDING_REVEAL_END`;

	// ① 晚批必须真的晚于早批
	if (!(late > 0)) {
		return `第二批推迟量 ${late}s 不大于 0 —— 晚批和早批同时起飞，等于只有一批，开洞时依旧没有星尘`;
	}

	// ② 晚批的起飞时刻必须早于「洞完全打开」
	const lateStart = start + late;
	if (!(lateStart < revealEnd)) {
		return `第二批粒子 ${lateStart}s 才起飞，而洞 ${revealEnd}s 就完全打开了 —— 洞打开时一颗星尘都没有`;
	}

	// ③ 晚批里最早起飞的那颗必须活到开洞开始
	const durLine = code.split('\n').find(l => /^\s*duration\s*:/.test(l));
	if (!durLine) return `找不到粒子的 duration 赋值`;
	const durBase = firstNumber(durLine);
	if (durBase === null) return `解析不出粒子的时长`;
	if (!((lateStart + durBase) > revealStart)) {
		return `第二批最早起飞的那颗粒子 ${(lateStart + durBase).toFixed(2)}s 就结束了，而洞 ${revealStart}s 才开始擦 —— 开洞前半段仍然没有星尘`;
	}

	// ④ delay 里必须真的有批次判定（三元），常量写在旁边没人用等于没分批
	const delayLine = code.split('\n').find(l => /^\s*delay\s*:/.test(l));
	if (!delayLine) return `找不到粒子的 delay 赋值`;
	if (!/\?/.test(delayLine)) {
		return `粒子的 delay 是「${shorten(delayLine.trim(), 110)}」—— 没有批次判定（看不到三元），晚批推迟量根本没用上`;
	}
	return null;
});

// ===========================================================================
// T52~T60：卡片布局
//
// 这一批钉的是「卡片为什么对不上」。真机量出来的五处缺陷：
//   F1 卡片不居中   —— content-box 让外框比轨道大 50×42，视觉中心右偏 25px、下偏 21px。
//   F2 相邻卡贴死   —— TS 的 CARD_WIDTH 与 CSS 的轨道宽度上限必须一致（间隙 = 两者之差）。
//   F3 最小窗裁切   —— 轨道必须用 min() 夹在视口内，且必须有矮窗口紧凑模式。
//   F4 代码样例被裁 —— 代码盒子自己裁切 + 底部渐隐，光标落在还看得见的最后一行。
//   F5 预览空盒     —— 预览面板是 flex 纵向列，内容撑满或在剩余空间里居中，不顶对齐。
//
// 静态断言只钉**结构**；像素级结论由真机门 verify-onboarding-geometry.mjs 量。
// ===========================================================================

/** 取出 CSS 里所有 `@media (max-height: Npx)` 块。 */
function cssMaxHeightMediaBlocks(css) {
	const out = [];
	const re = /@media\s*\(\s*max-height\s*:\s*(\d+(?:\.\d+)?)px\s*\)/g;
	let m;
	while ((m = re.exec(css))) {
		const braceIdx = css.indexOf('{', m.index + m[0].length);
		if (braceIdx < 0) {
			continue;
		}
		const body = balanced(css, braceIdx, '{', '}');
		if (body === null) {
			continue;
		}
		out.push({ maxHeight: Number(m[1]), body });
	}
	return out;
}

/**
	* 取某个属性上的 min(...) 参数，按**顶层逗号**切分。
	*
	* 为什么不能直接正则 `min\(([\)]*)\)`：那个写法会在 calc() 的右括号处截断 ——
	* `min(calc(100vw - 16px), 402px)` 会被读成「只有一个参数 calc(100vw - 16px」，
	* 于是「上限是不是 402px」永远读不出来，参数顺序一换断言就误判。
	* 参数顺序本来就不该影响语义（min(a, b) === min(b, a)）。
	*
	* 返回 null = 该属性不是 min() 形式。
	*/
function cssMinArgs(body, prop) {
	const m = new RegExp(`(?:\|[;\\s])${prop}\\s*:\\s*min\\s*\\(`).exec(body);
	if (!m) {
		return null;
	}
	const openIdx = body.indexOf('(', m.index + m[0].length - 1);
	const call = balanced(body, openIdx, '(', ')');
	if (!call) {
		return null;
	}
	const inner = call.slice(1, -1);
	const args = [];
	let depth = 0;
	let cur = '';
	for (const ch of inner) {
		if (ch === '(') {
			depth++;
		} else if (ch === ')') {
			depth--;
		}
		if (ch === ',' && depth === 0) {
			args.push(cur);
			cur = '';
			continue;
		}
		cur += ch;
	}
	args.push(cur);
	return args;
}

/**
	* 取 min() 参数里「像固定像素上限」的那些值。
	* calc() 里的数字不是上限（calc(100vw - 16px) 里的 16 是边距，不是卡宽）。
	*/
function cssMinPixelCaps(args) {
	const caps = [];
	for (const arg of args) {
		if (/calc\s*\(/i.test(arg)) {
			continue;
		}
		for (const mm of arg.matchAll(/(\d+(?:\\.\d+)?)px/g)) {
			caps.push(Number(mm[1]));
		}
	}
	return caps;
}

check('T52', `卡片必须用 border-box（否则外框比轨道大 50×42，视觉中心就偏了）`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const body = cssRule(stripComments(raw), '.olympia-onboarding-card');
	if (body === null) return `未找到 .olympia-onboarding-card 规则块`;
	if (!/box-sizing\s*:\s*border-box/.test(body)) {
		return `卡片规则里没有 box-sizing: border-box —— 默认的 content-box 会把 24px 左右内边距和 1px 边框算到轨道外面（内容 352×430 实际渲染成 402×472），卡片比轨道大 50×42，视觉中心右偏 25px、下偏 21px（圆点、品牌、跳过按钮都按视口居中，卡片却偏了，整张构图就散了）`;
	}
	return null;
});

check('T53', `轨道宽度上限必须等于 TS 的卡片外框宽度（不一致的话相邻卡就会贴死）`, () => {
	const raw = load(F_ONB_CSS);
	const tl = load(F_ONB_TIMELINE);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const body = cssRule(stripComments(raw), '.olympia-onboarding-track');
	if (body === null) return `未找到 .olympia-onboarding-track 规则块`;
	const width = constValue(stripTsComments(tl), 'OLYMPIA_ONBOARDING_CARD_WIDTH');
	const gap = constValue(stripTsComments(tl), 'OLYMPIA_ONBOARDING_CARD_GAP');
	if (width === null) return `时间线里找不到 OLYMPIA_ONBOARDING_CARD_WIDTH`;
	if (gap === null) return `时间线里找不到 OLYMPIA_ONBOARDING_CARD_GAP`;
	const args = cssMinArgs(body, 'width');
	if (!args) {
		return `轨道宽度不是 min(...) 形式 —— 窗口再窄卡片就顶出视口了（400px 宽的窗口里，402px 的卡右侧直接被裁 26px，「下一步」按钮点不到）`;
	}
	// 参数顺序不重要（min(a, b) 与 min(b, a) 等价），calc() 里的数字也不算「上限」。
	const literals = cssMinPixelCaps(args);
	if (!literals.includes(width)) {
		return `轨道宽度的 min() 里没有 ${width}px（实际是 ${literals.join(' / ') || '一个都没有'}）—— 轨道步距是按 TS 那个值算的，两边不一致时相邻卡的实际间隙就不是设计的 ${gap}px（曾经 352 对 402，差 50px，两张卡直接贴死）`;
	}
	if (!(gap > 0)) {
		return `卡片间隙 ${gap}px 不大于 0 —— 相邻卡会重叠`;
	}
	return null;
});

check('T54', `卡片不许写死宽高（必须跟着轨道走，否则窗口一小就顶出视口）`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const body = cssRule(stripComments(raw), '.olympia-onboarding-card');
	if (body === null) return `未找到 .olympia-onboarding-card 规则块`;
	const w = /width\s*:\s*(\d+(?:\.\d+)?px)/.exec(body);
	if (w) {
		return `卡片写死了宽度 ${w[1]} —— 卡片必须跟着轨道走（轨道被 min() 夹小之后卡片还是原尺寸，又会顶出视口）`;
	}
	const h = /height\s*:\s*(\d+(?:\.\d+)?px)/.exec(body);
	if (h) {
		return `卡片写死了高度 ${h[1]} —— 轨道在矮窗口里被压扁了，卡片却还按固定高度渲染，上下都会被裁`;
	}
	return null;
});

check('T55', `轨道居中必须靠 transform（min() 生效后负 margin 会算错）`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const body = cssRule(stripComments(raw), '.olympia-onboarding-track');
	if (body === null) return `未找到 .olympia-onboarding-track 规则块`;
	if (!/transform\s*:\s*translate\(\s*-50%\s*,\s*-50%\s*\)/.test(body)) {
		return `轨道没有 transform: translate(-50%, -50%) —— 用负 margin 居中的话，轨道尺寸一变（min() 生效后就是会变）居中值就错，卡片会偏`;
	}
	if (/margin-(left|top)\s*:/.test(body)) {
		return `轨道里还有 margin-left / margin-top —— 和 transform 居中同时用会叠加偏移`;
	}
	return null;
});

check('T56', `轨道高度也必须用 min() 夹在视口内（最小窗口 400×270 比卡片矮）`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const body = cssRule(stripComments(raw), '.olympia-onboarding-track');
	if (body === null) return `未找到 .olympia-onboarding-track 规则块`;
	const args = cssMinArgs(body, 'height');
	if (!args) {
		return `轨道高度不是 min(...) 形式 —— 窗口一矮卡片就顶出视口（300px 高的窗口里，472px 的卡上下各被裁 65px / 107px，标题和主按钮全没了）`;
	}
	if (!args.some(a => /100vh/.test(a))) {
		return `轨道高度的 min() 里没有 100vh —— 那就不是「按视口夹住」，卡片会直接顶出矮窗口`;
	}
	if (!cssMinPixelCaps(args).length) {
		return `轨道高度的 min() 里没有 px 上限 —— 卡片高度不受约束`;
	}
	return null;
});

check('T57', `必须有矮窗口紧凑模式（预览让位 + 主按钮贴底，且必须覆盖产品最小窗高 270px）`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const blocks = cssMaxHeightMediaBlocks(stripComments(raw));
	if (!blocks.length) {
		return `CSS 里没有任何 @media (max-height: ...) 规则 —— 窗口一矮卡片就装不下（产品允许的最小窗口是 400×270）`;
	}
	const hit = blocks.find(b => b.maxHeight >= 270 && /display\s*:\s*none/.test(b.body) && /margin-top\s*:\s*auto/.test(b.body));
	if (!hit) {
		return `没有一档覆盖到产品最小窗高（270px）的矮窗口规则同时做到「预览块 display:none」+「页脚 margin-top:auto」—— 预览块在极矮窗口里必须整块让位（主按钮被裁掉比预览没了严重得多）；断点必须 ≥ 270px，否则 270px 高的窗口里主按钮直接被裁掉`;
	}
	return null;
});

check('T58', `代码样例必须自己裁切并做底部渐隐（硬切会像代码断在一半）`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const body = cssRule(stripComments(raw), '.olympia-onboarding-code');
	if (body === null) return `未找到 .olympia-onboarding-code 规则块`;
	if (!/overflow\s*:\s*hidden/.test(body)) {
		return `代码盒子没有 overflow: hidden —— 溢出的代码会直接压到面板外面`;
	}
	if (!/min-height\s*:\s*0/.test(body)) {
		return `代码盒子没有 min-height: 0 —— 它不肯收缩，flex 也压不下它，超出的部分还是会被硬切`;
	}
	if (!/mask-image\s*:\s*linear-gradient/.test(body)) {
		return `代码盒子没有底部渐隐（mask-image: linear-gradient）—— 样例比可视高度长，硬切看着像代码断在一半`;
	}
	return null;
});

check('T59', `光标必须落在还看得见的最后一行（否则用户根本看不见光标）`, () => {
	const cards = load(F_ONB_CARDS);
	const onb = load(F_ONB);
	const tl = load(F_ONB_TIMELINE);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	if (onb === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	if (tl === null) return `文件不存在（见上面的 MISSING ${F_ONB_TIMELINE}）`;
	const code = stripTsComments(cards);
	const body = methodBody(code, /private\s+placeCodeCarets\s*\(\s*\)/);
	if (body === null) {
		return `卡片层里没有 placeCodeCarets() —— 光标永远挂在样例最后一行，而那行在底部渐隐区里，用户看不见光标，「编辑器手感」这张卡就白做了`;
	}
	if (!/clientHeight/.test(code)) {
		return `卡片层没有量可视高度（clientHeight）—— 不知道哪一行还看得见，光标就无处安放`;
	}
	if (!/scrollHeight/.test(code)) {
		return `卡片层没有量内容总高（scrollHeight）—— 分不清「整体放得下」和「被裁了」，光标会落在一条早就看不见的行上`;
	}
	const zone = constValue(stripTsComments(tl), 'OLYMPIA_ONBOARDING_CODE_CARET_ZONE');
	if (zone === null) {
		return `时间线里找不到 OLYMPIA_ONBOARDING_CODE_CARET_ZONE —— 光标能停的范围必须是常量（它跟 CSS 里渐隐区的起点是一对，代码里写死就必然对不上）`;
	}
	if (!(zone > 0 && zone <= 1)) {
		return `OLYMPIA_ONBOARDING_CODE_CARET_ZONE = ${zone} 不在 (0, 1] 内`;
	}
	const onbCode = stripTsComments(onb);
	if (!/this\.cards\.handleViewportResize\s*\(\s*\)/.test(onbCode)) {
		return `窗口尺寸变化时没有调用 cards.handleViewportResize() —— 窗口一变，预览块变矮，能显示的代码行数变了，光标却还停在那儿`;
	}
	return null;
});

check('T60', `预览面板必须能分配空间（flex 纵向列 + 三块内容各自撑开居中）`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const css = stripComments(raw);
	const preview = cssRule(css, '.olympia-onboarding-card-preview');
	if (preview === null) return `未找到 .olympia-onboarding-card-preview 规则块`;
	if (!/display\s*:\s*flex/.test(preview) || !/flex-direction\s*:\s*column/.test(preview)) {
		return `预览面板不是 flex 纵向列 —— 面板里的内容没法分配剩余空间，内容短的那几张卡底部会空出小半个面板，看着像没画完`;
	}
	for (const selector of ['.olympia-onboarding-pipe', '.olympia-onboarding-flow', '.olympia-onboarding-directory']) {
		const body = cssRule(css, selector);
		if (body === null) return `未找到 ${selector} 规则块`;
		if (!/flex\s*:\s*1\b/.test(body)) {
			return `${selector} 没有 flex: 1 —— 它不撑开剩余空间，内容就还是吊在面板顶部，底部留白照旧`;
		}
	}
	return null;
});

// ===========================================================================
// T61~T68：Qoder T-032 复审的三条成立结论 + 一条仓库规矩
//
//   Q4   写入失败在界面上完全静默 —— 用户以为配置生效了
//   Q7-2 handleViewportResize() 不看 this.entering —— 进入动画期间还在动布局
//   Q3   「跳过引导」的中文语义与「点行即写盘」冲突
//   规矩 卡片层不许用选择器取元素（hygiene 的 no-restricted-syntax）
//
// 这几条全钉**行为**：写进 map 不算（没人看得见），写在 switch 之后不算
// （有提前 return 的行刷不到），光标挪对了但光标看不见也不算。
// ===========================================================================

check('T61', `写入失败必须有一条「说给用户听」的路径（只写 console 等于没告诉用户）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	const body = methodBody(code, /private\s+abandonWriteIfExhausted\s*\(/);
	if (body === null) {
		return `卡片层里没有 abandonWriteIfExhausted —— 写入放弃的收场路径没了`;
	}
	const iSet = body.indexOf('unsavedKeys.set(');
	if (iSet < 0) {
		return `放弃写入时没有记录「没保存上」—— 写入失败只往 console 写一句，界面上看不出任何区别，用户以为自己的选择生效了`;
	}
	const iDel = body.indexOf('this.pendingWrites.delete(key)');
	const iLast = body.indexOf('this.lastIntended.delete(key)');
	if (iDel < 0 || iLast < 0 || !(iDel < iSet && iSet < iLast)) {
		return `「没保存上」的记录不在「用户还没改过」那个分支里 —— 用户后来又点了一次的话，新值还在写，旧值的失败不该算到新值头上`;
	}
	const unsaved = methodBody(code, /private\s+updateRowUnsavedState\s*\(/);
	if (unsaved === null) {
		return `没有把「没保存上」写到界面上的方法`;
	}
	const visible = /status\.textContent\s*=\s*localize\(\s*'olympia\.onboarding\.row\.unsaved'\s*,\s*"([^"]*)"\s*\)/.exec(unsaved);
	if (!visible) {
		return `「没保存上」没有写成行内可见文本 —— 光记在 map 里没人看得见`;
	}
	if (!visible[1].trim()) {
		return `「未保存」的文案是空的 —— 界面上一个字都不显示，等于没告诉用户`;
	}
	return null;
});

check('T62', `未保存标记必须在 switch 之前刷（三个分支都有提前 return，放在后面就刷不到）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	const body = methodBody(code, /private\s+updateRowState\s*\(/);
	if (body === null) return `没有 updateRowState`;
	const iMark = body.indexOf('updateRowUnsavedState(');
	const iSwitch = body.indexOf('switch (row.kind)');
	if (iMark < 0) return `updateRowState 里没有刷「没保存上」的标记`;
	if (iSwitch < 0) return `updateRowState 里找不到 switch (row.kind)`;
	if (iMark > iSwitch) {
		return `「没保存上」的标记刷在 switch 之后 —— 三个分支里都有提前 return 的写法，那些行就永远刷不到标记`;
	}
	return null;
});

check('T63', `进入动画期间不许再动布局（handleViewportResize 必须先看 this.entering）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	const body = methodBody(code, /handleViewportResize\s*\(\s*\)\s*:/);
	if (body === null) return `没有 handleViewportResize`;
	const iEnter = body.indexOf('this.entering');
	const iPlace = body.indexOf('placeCodeCarets(');
	if (iEnter < 0) {
		return `handleViewportResize 不看 this.entering —— 进入动画正在把卡片化成粒子的时候去量高度、挪光标，就是「全程没有断点」要防的那一帧硬切`;
	}
	if (iPlace < 0) return `handleViewportResize 里没有 placeCodeCarets()`;
	if (iEnter > iPlace) {
		return `this.entering 的判断排在 placeCodeCarets 之后 —— 守卫等于没有`;
	}
	return null;
});

check('T64', `跳过按钮的文案必须说清是「跳过剩下的」（点行就已经写盘了）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	const m = /localize\(\s*'olympia\.onboarding\.skip'\s*,\s*"([^"]*)"\s*\)/.exec(code);
	if (!m) return `找不到跳过按钮的 localize 调用`;
	if (!m[1].includes('剩余')) {
		return `跳过按钮的默认文案是「${m[1]}」—— 点行就已经把选择写进配置了，这个按钮只是不再往下走流程，说「跳过引导」会让人以为自己的选择被丢了`;
	}
	return null;
});

check('T65', `卡片层不许用选择器取元素（元素要直接持有引用）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	if (/querySelector(All)?\s*\(/.test(code)) {
		return `卡片层用选择器取元素 —— 预览区是整片重建的，回头找很容易找到 detached 的旧元素；仓库规矩也不允许`;
	}
	return null;
});

check('T66', `未保存的行必须在界面上看得出来（标签变红 + 状态位只在有内容时占位）`, () => {
	const raw = load(F_ONB_CSS);
	if (raw === null) return `文件不存在（见上面的 MISSING ${F_ONB_CSS}）`;
	const css = stripComments(raw);
	const unsaved = cssRule(css, '.olympia-onboarding-row-unsaved .olympia-onboarding-row-label');
	if (unsaved === null) return `CSS 里没有「未保存的行把标签变红」的规则`;
	if (!/color\s*:\s*var\(--vscode-errorForeground\)/.test(unsaved)) {
		return `未保存的标签没有用 errorForeground 着色 —— 只有一个不显眼的标记等于没告诉用户`;
	}
	const status = cssRule(css, '.olympia-onboarding-row-status');
	if (status === null) return `CSS 里没有状态位的规则`;
	if (!/font-style\s*:\s*normal/.test(status)) {
		return `状态位是 <i> 元素，不把斜体关掉，字形跟正文不一致`;
	}
	const notEmpty = cssRule(css, '.olympia-onboarding-row-status:not(:empty)');
	if (notEmpty === null) return `状态位没有「非空才占位」的规则 —— 空的时候也留间距，所有行标签右边都会多一截`;
	if (!/margin-left\s*:/.test(notEmpty)) {
		return `状态位非空时没有左间距 —— 「未保存」会紧贴标签文字`;
	}
	return null;
});

check('T67', `未保存的状态位必须挂在行标签里（三种行类型没有共同的「值元素」）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	// 构造顺序必须是「造状态位 → 挂到行标签 → 行标签挂到行容器」。
	// 挂到行容器上的话，选项组会被挤开一截（行容器是 flex + space-between）。
	// 这里不用 methodBody 取 buildRows 的方法体 —— 它的返回类型里带 {},
	// methodBody 从第一个 { 开始配对，会把返回类型当成方法体。
	if (!/status\.className\s*=\s*'olympia-onboarding-row-status';[\s\S]{0,200}?label\.appendChild\(\s*status\s*\);[\s\S]{0,200}?container\.appendChild\(\s*label\s*\);/.test(code)) {
		return `状态位没有挂在行标签上（或者行标签没挂到行容器上）—— 挂到行容器里的话，选项组会被挤开一截`;
	}
	return null;
});

check('T68', `标记必须能被撤掉（重新点一次 / 写成功了都不该再显示「未保存」）`, () => {
	const cards = load(F_ONB_CARDS);
	if (cards === null) return `文件不存在（见上面的 MISSING ${F_ONB_CARDS}）`;
	const code = stripTsComments(cards);
	const write = methodBody(code, /private\s+async\s+writeConfig\s*\(/);
	if (write === null) return `没有 writeConfig`;
	if (!/unsavedKeys\.delete\(/.test(write)) {
		return `用户重新点一次时没有撤掉旧标记 —— 上一轮的「未保存」会一直挂在那一行上`;
	}
	const flush = methodBody(code, /private\s+async\s+flushPendingWrites\s*\(/);
	if (flush === null) return `没有 flushPendingWrites`;
	if (!/unsavedKeys\.delete\(/.test(flush)) {
		return `写入成功时没有撤掉标记 —— 明明存上了，行上还写着「未保存」`;
	}
	return null;
});

// ===========================================================================
// 汇总
// ===========================================================================

const failed = results.filter(r => !r.ok);
const passed = results.filter(r => r.ok);
if (missing.size) console.log(`MISSING 合计 ${missing.size} 个文件：${[...missing].join('，')}`);
console.log(`OK ${passed.length}`);
console.log(`FAILED ${failed.length}`);
process.exit(failed.length ? 1 : 0);
