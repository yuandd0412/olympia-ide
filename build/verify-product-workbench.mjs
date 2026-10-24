/*---------------------------------------------------------------------------------------------
 *  产物一致性门禁：workbench bundle / NLS / CSS 必须是**当前源码**的。
 *
 *  为什么需要这道门
 *  ----------------
 *  打包脚本 `build/oss-package.ps1` 有 `-SkipBundle`：跳过 STAGE 1（bundle + NLS 抽取），
 *  直接复用 `out-vscode/`。这在「只改了打包脚本」时是省时间的好事，在「改了产品源码」时
 *  是**静默出货旧代码**的手段 —— 2026-10-23 实测踩中：源码里已经把「跳过引导」改成
 *  「跳过剩余引导」、给配置行加了「未保存」状态位，但产物里搜到的还是旧文案，
 *  而打包脚本一路 EXITCODE=0，看起来完全正常。
 *
 *  仓库里已经有一道同类的门（`verify-product-extensions.mjs`：三个 Olympia 扩展不许是旧编译），
 *  但它只管扩展，管不到 workbench 自己 —— 扩展那次的教训在同一个坑上又踩了一遍。
 *  这道门把同一类判据补到 workbench 上。
 *
 *  判据从源码自动派生（不是手写清单）
 *  ----------------------------------
 *  手写清单会腐烂：清单里没列的新类名 / 新文案照样能漏打包。这里从源码现推：
 *
 *    1. CSS 选择器：源码 CSS 里每个 `.olympia*` 类名，必须出现在产物 CSS 里。
 *    2. TS 字面量：源码 TS 里每个 `olympia.` / `olympia-` 字符串，必须出现在产物 JS 里
 *       （localize / localize2 的 key 除外 —— 它们在构建时被替换成 NLS 索引，不留在 JS 里）。
 *    3. 本地化文案：源码 TS 里每个 `localize(key, "默认文案")` 的默认文案，
 *       必须出现在产物的 NLS 消息表里。
 *
 *  第 3 条抓的是最阴的那一类：文案改了但 NLS 没重新抽取 → 界面显示的还是旧字，
 *  而源码、类型检查、打包全部报成功。
 *
 *  ## 为什么先剥注释再派生标记
 *
 *  2026-10-25 实测踩中：规则一开始只认 `olympia-onboarding-*`，后来扩到设置页 / 首页，
 *  结果派生出一堆**只存在于注释里**的字符串，当成「产物缺东西」误报：
 *
 *    - `olympia.startPage.showIntroAnimation` —— 只在一段块注释里（解释为什么改了这个键名）
 *    - `olympia-contest` —— 只在一行行注释里（说明首页快捷入口的命令 id 来自哪个扩展）
 *
 *  注释里的字面量不进产物，所以直接拿去比对必然误判。派生前先剥注释，
 *  派生出来的就全是**真实代码里用到的**标记。
 *
 *  ## 为什么设置页 / 首页必须进这道门
 *
 *  这道门原本只管 `olympia-onboarding-*`，设置页（Phase 1）和首页（Phase 2）完全在门外。
 *  2026-10-25 因此差点出事：`oss-compile.ps1` 报 ALL CHECKS PASSED，但那只刷新 `oss/out`，
 *  产物 bundle 是打包阶段才生成的 —— 于是「源码改了、编译过了、产物还是旧的」，
 *  而打包一路 EXITCODE=0。靠人眼比对 bundle 才发现 `.olympiaSettings-input` 不见了。
 *  把设置页 / 首页的类名纳入这道门之后，同类问题会在打包阶段自己变红。
 *
 *  用法：node build/verify-product-workbench.mjs [产物目录]
 *--------------------------------------------------------------------------------------------*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.argv[2] ?? path.join(repoRoot, 'VSCode-win32-x64');
const srcDir = path.join(repoRoot, 'oss', 'src', 'vs', 'workbench', 'contrib', 'olympia', 'browser');

function fail(message) {
	process.stderr.write(`✗ ${message}\n`);
	process.exitCode = 1;
}

function readIfExists(p) {
	try {
		return fs.readFileSync(p, 'utf8');
	} catch {
		return null;
	}
}

function collectFiles(dir, ext, out = []) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			collectFiles(full, ext, out);
		} else if (entry.name.endsWith(ext)) {
			out.push(full);
		}
	}
	return out;
}

/** 从 `globalThis._VSCODE_NLS_MESSAGES=[...]` 里把数组抠出来 JSON.parse。 */
function parseNlsMessages(text) {
	const marker = '_VSCODE_NLS_MESSAGES=';
	const at = text.indexOf(marker);
	if (at < 0) {
		return null;
	}
	let i = at + marker.length;
	while (i < text.length && /\s/.test(text[i])) {
		i++;
	}
	if (text[i] !== '[') {
		return null;
	}
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let j = i; j < text.length; j++) {
		const ch = text[j];
		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (ch === '\\') {
				escaped = true;
			} else if (ch === '"') {
				inString = false;
			}
			continue;
		}
		if (ch === '"') {
			inString = true;
		} else if (ch === '[') {
			depth++;
		} else if (ch === ']') {
			depth--;
			if (depth === 0) {
				try {
					return JSON.parse(text.slice(i, j + 1));
				} catch {
					return null;
				}
			}
		}
	}
	return null;
}

// ---------------------------------------------------------------- 源码侧派生标记

/**
 * 剥掉注释，但不动字符串字面量里的内容。
 *
 * 注释里的 `.olympia*` 类名 / `olympia.*` 字面量**不进产物**，
 * 拿它们当判据必然误报「产物缺东西」（2026-10-25 实测，见文件头）。
 * 所以派生前先剥。剥的时候必须认字符串状态，否则 `'http://x'` 里的 `//`
 * 会被当成行注释，把后半截源码整段吃掉。
 */
function stripComments(text) {
	let out = '';
	let i = 0;
	const n = text.length;
	let quote = null;
	while (i < n) {
		const c = text[i];
		const c2 = text[i + 1];
		if (quote) {
			out += c;
			if (c === '\\') {
				out += text[i + 1] ?? '';
				i += 2;
				continue;
			}
			if (c === quote) {
				quote = null;
			}
			i++;
			continue;
		}
		if (c === '"' || c === "'" || c === '`') {
			quote = c;
			out += c;
			i++;
			continue;
		}
		if (c === '/' && c2 === '/') {
			while (i < n && text[i] !== '\n') {
				i++;
			}
			continue;
		}
		if (c === '/' && c2 === '*') {
			i += 2;
			while (i < n && !(text[i] === '*' && text[i + 1] === '/')) {
				i++;
			}
			i += 2;
			continue;
		}
		out += c;
		i++;
	}
	return out;
}

const tsFiles = collectFiles(srcDir, '.ts').filter(f => !f.endsWith('.d.ts'));
const cssFiles = collectFiles(path.join(srcDir, 'media'), '.css');

const cssClasses = new Map();   // class -> 出处
const jsLiterals = new Map();   // literal -> 出处
const l10nDefaults = new Map(); // 默认文案 -> 出处

for (const file of cssFiles) {
	const text = stripComments(fs.readFileSync(file, 'utf8'));
	for (const m of text.matchAll(/\.(olympia[A-Za-z][A-Za-z0-9_-]*)/g)) {
		if (!cssClasses.has(m[1])) {
			cssClasses.set(m[1], path.relative(repoRoot, file));
		}
	}
}

for (const file of tsFiles) {
	const text = stripComments(fs.readFileSync(file, 'utf8'));
	// localize / localize2 的 key 在构建时被替换成 NLS 索引，不留在 JS 里 —— 不能当判据。
	const localizeKeys = new Set();
	for (const m of text.matchAll(/\blocalize2?\(\s*['"`]([^'"`]+)['"`]/g)) {
		localizeKeys.add(m[1]);
	}
	for (const m of text.matchAll(/['"`](olympia[.-][A-Za-z0-9._-]*)['"`]/g)) {
		if (localizeKeys.has(m[1])) {
			continue;
		}
		if (!jsLiterals.has(m[1])) {
			jsLiterals.set(m[1], path.relative(repoRoot, file));
		}
	}
	// localize(key, "默认文案") —— 第二参数是双引号字符串常量。
	for (const m of text.matchAll(/localize\(\s*'[^']*'\s*,\s*"((?:[^"\\]|\\.)*)"/g)) {
		const value = JSON.parse(`"${m[1]}"`);
		if (!l10nDefaults.has(value)) {
			l10nDefaults.set(value, path.relative(repoRoot, file));
		}
	}
}

if (!cssClasses.size || !jsLiterals.size || !l10nDefaults.size) {
	fail(`源码侧标记派生异常：css=${cssClasses.size} js=${jsLiterals.size} l10n=${l10nDefaults.size}`);
}

// ---------------------------------------------------------------- 产物侧

const outDir = path.join(dist, 'resources', 'app', 'out');
if (!fs.existsSync(outDir)) {
	fail(`产物里找不到 ${outDir}`);
	process.exit(1);
}

const productCss = collectFiles(outDir, '.css').map(f => readIfExists(f) ?? '').join('\n');
const productJs = collectFiles(outDir, '.js')
	.filter(f => !f.endsWith('nls.messages.js'))
	.map(f => readIfExists(f) ?? '').join('\n');
const nlsText = readIfExists(path.join(outDir, 'nls.messages.js')) ?? '';
const nlsMessages = parseNlsMessages(nlsText);
if (!nlsMessages) {
	fail('产物里的 nls.messages.js 读不出 _VSCODE_NLS_MESSAGES 数组');
	process.exit(1);
}

const nlsSet = new Set(nlsMessages);

let missing = 0;

for (const [cls, from] of cssClasses) {
	if (!productCss.includes(cls)) {
		fail(`产物 CSS 里没有类名 .${cls}（源码：${from}）`);
		missing++;
	}
}

for (const [literal, from] of jsLiterals) {
	if (!productJs.includes(literal)) {
		fail(`产物 JS 里没有字面量 '${literal}'（源码：${from}）`);
		missing++;
	}
}

for (const [value, from] of l10nDefaults) {
	if (!nlsSet.has(value)) {
		fail(`产物 NLS 里没有文案「${value}」（源码：${from}）`);
		missing++;
	}
}

if (missing) {
	process.stderr.write(`\n共 ${missing} 处产物与源码不一致 —— 产物不是当前源码编出来的。\n`);
	process.stderr.write('如果是刚改了产品源码却用了 `-SkipBundle`，重跑一次不带 -SkipBundle 的打包。\n');
	process.exit(1);
}

process.stdout.write(
	`ok    workbench 产物与源码一致：${cssClasses.size} 个类名 / ${jsLiterals.size} 个字面量 / ${l10nDefaults.size} 条文案\n`
);
