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

const REPO = path.resolve(import.meta.dirname, '..', '..');
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
