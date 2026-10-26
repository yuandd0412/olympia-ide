// Olympia chrome 视觉层门禁（T-082）。
//
//   node scripts/oneoff/check-olympia-chrome.mjs
//
// 钉什么：olympiaChrome.css 这层「加法覆盖」的三块事实与它的约束——
//   C1 挂载点：olympiaChrome.ts import 了 ./media/olympiaChrome.css（不挂 = 整层不存在）。
//   C2 token：--olympia-radius 在 .monaco-workbench 上定义且只此一处；stylelint 白名单
//      （sizes 表）里有它 —— 少任何一半，css 里所有 var() 引用都会静默回退成初始值。
//   C3 tab：顶部两角圆 + 活动组活动 tab 的 ::after 顶部强调线（用 tab-activeBorderTop
//      带 focusBorder 回退）。这层是「Olympia 观感」最直接的一条。
//   C4 列表行：.monaco-list-row 圆角（行背景自己绘制，圆角即圆角选中态）。
//   C5 通知：toast 圆角统一到 token，选择器逐字对齐上游 notificationsToasts.css
//      （同特异性靠加载顺序取胜 —— 写得不完全一致就压不过上游）。
//   C6 自律：本文件不许出现根锚定 :has()、[class*=] 属性子串选择器（stylelint 的红线
//      也在门里钉一遍，防止绕过 stylelint 直接改坏）。
// 读不到文件一律红（不许假绿）。变异配对：mutation-test-olympia-chrome.mjs。
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OSS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../oss');
const F_TS = 'src/vs/workbench/contrib/olympia/browser/olympiaChrome.ts';
const F_CSS = 'src/vs/workbench/contrib/olympia/browser/media/olympiaChrome.css';
const F_JSON = 'build/lib/stylelint/vscode-known-variables.json';

const results = [];
const check = (id, desc, fn) => {
	let err = null;
	try { err = fn(); } catch (e) { err = '断言抛错: ' + (e && e.message); }
	results.push({ id, desc, ok: err === null, reason: err });
};

const read = (rel) => {
	const p = path.join(OSS, rel);
	if (!existsSync(p)) return null;
	return readFileSync(p, 'utf8');
};

const tsText = read(F_TS);
const cssText = read(F_CSS);
const jsonText = read(F_JSON);

check('C1', '挂载点存在：olympiaChrome.ts 静态 import ./media/olympiaChrome.css', () => {
	if (tsText === null) return `读不到 ${F_TS}`;
	if (!/^import '\.\/media\/olympiaChrome\.css';$/m.test(tsText)) {
		return "olympiaChrome.ts 里没有静态 import './media/olympiaChrome.css'（整层视觉不会被打包）";
	}
	return null;
});

check('C2', 'token 双半：css 定义 --olympia-radius 且白名单 sizes 表登记了它', () => {
	if (cssText === null) return `读不到 ${F_CSS}`;
	// 锚「定义处」：\t 缩进的声明行。裸找字符串会命中头注释里的提法。
	const defs = [...cssText.matchAll(/^\t--olympia-radius: [^;]+;$/gm)];
	if (defs.length !== 1) return `--olympia-radius 应在 .monaco-workbench 上定义恰好 1 次，实际 ${defs.length}`;
	const block = cssText.slice(0, defs[0].index);
	if (!/\.monaco-workbench \{[^}]*$/.test(block)) return '--olympia-radius 没有定义在 .monaco-workbench 上';
	if (jsonText === null) return `读不到 ${F_JSON}`;
	let sizes;
	try { sizes = JSON.parse(jsonText).sizes; } catch (e) { return '白名单 JSON 解析失败: ' + e.message; }
	if (!Array.isArray(sizes) || !sizes.includes('--olympia-radius')) {
		return '白名单 sizes 表里没有 --olympia-radius —— var() 引用会被 stylelint 拒收（Unknown variable）';
	}
	return null;
});

check('C3', 'tab：顶部两角圆 + 活动 tab ::after 顶部强调线（tab-activeBorderTop 带 focusBorder 回退）', () => {
	if (cssText === null) return `读不到 ${F_CSS}`;
	const tabRule = /\.tabs-container > \.tab \{\n\tborder-radius: var\(--olympia-radius\) var\(--olympia-radius\) 0 0;\n\}/.test(cssText);
	if (!tabRule) return '找不到 tab 顶部圆角规则（--olympia-radius --olympia-radius 0 0）';
	const accentRule = cssText.includes('.editor-group-container.active > .title .tabs-container > .tab.active::after');
	if (!accentRule) return '找不到活动 tab 的 ::after 顶部强调线规则';
	const accentBlock = cssText.slice(cssText.indexOf('.tab.active::after'));
	if (!/background: var\(--vscode-tab-activeBorderTop, var\(--vscode-focusBorder\)\);/.test(accentBlock)) {
		return '强调线没有用 var(--vscode-tab-activeBorderTop, var(--vscode-focusBorder)) —— 颜色脱离主题就是硬编码';
	}
	if (!/pointer-events: none;/.test(accentBlock)) return '强调线缺 pointer-events: none —— 会挡住 tab 的点击';
	return null;
});

check('C4', '列表行：两条圆角规则（通配 + modern-ui 同形状高特异性），且不动 padding/height', () => {
	if (cssText === null) return `读不到 ${F_CSS}`;
	// 通配那条（0,2,0）：非 modern-ui 作用域的行。
	if (!/\.monaco-workbench \.monaco-list-row \{\n\tborder-radius: var\(--olympia-radius\);\n\}/.test(cssText)) {
		return '找不到 .monaco-list-row 的圆角规则（逐字：border-radius: var(--olympia-radius)）';
	}
	// modern-ui 那条：上游 workbench.desktop.main.css 里 .modern-ui .monaco-list
	// .monaco-list-row:not(.separator) 写死了 var(--vscode-cornerRadius-small)（特异性 0,4,0），
	// 通配那条压不过它（真机实测行上是 4px）。modern-ui 由 layout.ts 挂在 .monaco-workbench
	// **同一节点**上，所以复合选择器 .monaco-workbench.modern-ui（0,5,0）才匹配 ——
	// 写成后代组合器 .monaco-workbench .modern-ui 会在真机上永远不命中（第一版踩过）。
	if (!/\.monaco-workbench\.modern-ui \.monaco-list \.monaco-list-row:not\(\.separator\) \{\n\tborder-radius: var\(--olympia-radius\);\n\}/.test(cssText)) {
		return '缺 modern-ui 作用域的复合选择器圆角规则（.monaco-workbench.modern-ui 同节点）—— 真机行上会停在 4px';
	}
	const rowBlock = cssText.slice(cssText.indexOf('.monaco-list-row'));
	if (/height|padding|margin/.test(rowBlock.slice(0, rowBlock.indexOf('}')))) {
		return '列表行规则里出现了 height/padding/margin —— 这层只准改观感不准动布局';
	}
	return null;
});

check('C5', '通知：toast 圆角统一到 token，选择器与上游逐字对齐（靠加载顺序压过 4px）', () => {
	if (cssText === null) return `读不到 ${F_CSS}`;
	const upstreamSel = '.monaco-workbench > .notifications-toasts .notification-toast-container > .notification-toast';
	if (!cssText.includes(upstreamSel + ',')) {
		return `通知规则没有逐字复用上游选择器开头（${upstreamSel}）—— 同特异性下压不过 notificationsToasts.css 的 4px`;
	}
	const idx = cssText.indexOf(upstreamSel);
	const block = cssText.slice(idx, cssText.indexOf('}', idx));
	if (!/border-radius: var\(--olympia-radius\);/.test(block)) return '通知块没有把圆角统一到 var(--olympia-radius)';
	return null;
});

check('C6', '自律：本层没有根锚定 :has()、没有 [class*=] 属性子串选择器', () => {
	if (cssText === null) return `读不到 ${F_CSS}`;
	// 先剥块注释再判：头注释里的「:has()」是写给人看的约束说明，不是选择器。
	const code = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
	const badHas = code.match(/^[^{\n]*:has\(/gm) || [];
	if (badHas.length) return '出现 :has()（stylelint 红线，别在门外面绕）: ' + badHas[0].trim();
	const badAttr = code.match(/^[^{\n]*\[class\*=/gm) || [];
	if (badAttr.length) return '出现 [class*=] 属性子串选择器（stylelint 红线）: ' + badAttr[0].trim();
	return null;
});

const failed = results.filter(r => !r.ok);
for (const r of results) {
	console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id} ${r.desc}${r.ok ? '' : ' —— ' + r.reason}`);
}
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
process.exitCode = failed.length === 0 ? 0 : 1;
