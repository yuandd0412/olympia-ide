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
	}
	cache.set(rel, text);
	return text;
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
			else if (e.isFile() && e.name.endsWith('.ts')) out.push({ rel: childRel, text: fs.readFileSync(childAbs, 'utf8') });
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

function stripComments(css) {
	return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function shorten(s, n = 160) {
	const one = s.replace(/\s+/g, ' ').trim();
	return one.length <= n ? one : `${one.slice(0, n)}…`;
}

// ---------------------------------------------------------------------------
// 辅助：TS 注释剥离 / CSS 规则块 / 配置常量与默认值 / 扩展 schema
// ---------------------------------------------------------------------------

/**
 * 剥掉 TS 的块注释与行注释。
 *
 * 断言要看的是**代码**，不是文档里的散文 —— 否则文件头里一句
 * 「这里不使用 Date.now()」就会把「禁止 Date.now()」这条断言自己判红。
 */
function stripTsComments(text) {
	return text
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, p1) => p1);
}

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
	}
	const braceIdx = text.lastIndexOf('{', idx);
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
		const t = load(rel);
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
		const t = load(rel);
		if (t === null) return `文件不存在（见上面的 MISSING ${rel}）`;
		// 注意：上游真实头文件第 1 行是「一个空格 + /*---…」，必须容忍前导空格，
		// 否则已验收的 olympiaWelcomeInput.ts 会被误判成红色。
		const first = (t.split(/\r?\n/, 1)[0] || '').replace(/^\uFEFF/, '').trimStart();
		if (!first.startsWith('/*---')) return `第 1 行（trim 后）不是以 /*--- 开头，实际为：${shorten(first, 80) || '<空行>'}`;
		return null;
	});
	check(COPYRIGHT_ID[rel], `${rel} 前 4 行包含 Copyright (c) Microsoft Corporation 与 Licensed under the MIT License`, () => {
		const t = load(rel);
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
const OLYMPIA_KEYS = ['olympia.startPage', 'olympia.startPage.showIntroAnimation'];
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

for (const key of OLYMPIA_KEYS) {
	check(`F${OLYMPIA_KEYS.indexOf(key) + 1}`, `配置键 '${key}' 已注册（${scopeDesc}）`, () => {
		if (!registrationScope.length) return `${OLYMPIA_BROWSER_DIR} 下没有任何 .ts 文件`;
		const hit = configBlocks.some(b => b.body.includes(`'${key}'`) || b.body.includes(`"${key}"`));
		if (!hit) return `没有任何 registerConfiguration 块注册 '${key}'`;
		return null;
	});
}

check('F3', `olympia.startPage* 所在配置节点 id 是 'olympia'（不能是 'workbench'）`, () => {
	if (!registrationScope.length) return `${OLYMPIA_BROWSER_DIR} 下没有任何 .ts 文件`;
	const owners = configBlocks.filter(b => OLYMPIA_KEYS.some(k => b.body.includes(`'${k}'`) || b.body.includes(`"${k}"`)));
	if (!owners.length) return `没有承载 olympia.startPage* 的 registerConfiguration 块，无法判定节点 id（${scopeDesc}）`;
	const bad = owners.filter(b => b.id !== 'olympia');
	if (bad.length) {
		return `节点 id 应为 'olympia'，实际 ${bad.map(b => `${b.file} → '${b.id}'`).join('，')}；挂在 'workbench' 节点会覆盖上游同名属性定义`;
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

check('H6', `背景时钟只累加、永不重置（重置会让极光相位跳一下 = 断点）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	if (!/this\.backdropTime\s*\+=/.test(t)) return `没有 backdropTime += ...`;
	if (/this\.backdropTime\s*=\s*0\b/.test(t)) {
		return `backdropTime 被重置为 0 —— 极光相位会跳一下`;
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
	if (!/LifecyclePhase\.Restored/.test(t)) {
		return `没有 Restored 判定 —— 露出来的会是半成品工作台`;
	}
	return null;
});

check('H14', `等恢复有上限（不会永久卡住）`, () => {
	const t = load(F_ONB);
	if (t === null) return `文件不存在（见上面的 MISSING ${F_ONB}）`;
	const m = /RESTORE_WAIT_LIMIT\s*=\s*([0-9.]+)/.exec(t);
	if (!m) return `未找到 RESTORE_WAIT_LIMIT`;
	const v = Number(m[1]);
	if (!(v > 0 && v <= 5)) return `兜底 ${v}s 不合理（应在 0~5 秒之间）`;
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
// 汇总
// ===========================================================================
const failed = results.filter(r => !r.ok);
const passed = results.filter(r => r.ok);
if (missing.size) console.log(`MISSING 合计 ${missing.size} 个文件：${[...missing].join('，')}`);
console.log(`OK ${passed.length}`);
console.log(`FAILED ${failed.length}`);
process.exit(failed.length ? 1 : 0);
