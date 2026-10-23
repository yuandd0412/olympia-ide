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
	if (!/pendingWriteAttempts/.test(code)) {
		return `没有按键计数的重试额度（pendingWriteAttempts）`;
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
	if (!/pendingWriteAttempts/.test(abandonBody)) {
		return `abandonWriteIfExhausted() 没有动 pendingWriteAttempts —— 额度不是按键算的`;
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
	if (!/binding\.valueResolved/.test(body)) {
		return `updateRowState() 里没有 valueResolved —— 异步取值行每次刷新都被打回占位（用户点一下别的选项，眼前这行就闪回「读取中…」），后台还重复调一次 getRecentlyOpened()`;
	}
	if (!/if\s*\(\s*binding\.valueResolved\s*\)\s*\{?\s*break/.test(body)) {
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
	// 两个收尾分支（成功 / 失败）都得把「在途」放掉。
	// 只放成功分支的话，取值一旦失败，这一行就永远停在「请求中」，再也拿不到值。
	const cleared = (after.match(/binding\.valuePending\s*=\s*false/g) || []).length;
	if (cleared < 2) {
		return `valuePending 只被放掉 ${cleared} 次（成功 / 失败两个收尾分支都得放）—— 取值失败时这一行会永远停在「请求中」，再也拿不到值`;
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
// 汇总
// ===========================================================================
const failed = results.filter(r => !r.ok);
const passed = results.filter(r => r.ok);
if (missing.size) console.log(`MISSING 合计 ${missing.size} 个文件：${[...missing].join('，')}`);
console.log(`OK ${passed.length}`);
console.log(`FAILED ${failed.length}`);
process.exit(failed.length ? 1 : 0);
