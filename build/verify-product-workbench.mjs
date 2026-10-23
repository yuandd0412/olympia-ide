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
 *    1. CSS 选择器：源码 CSS 里每个 `.olympia-onboarding-*` 类名，必须出现在产物 CSS 里。
 *    2. TS 字面量：源码 TS 里每个 `'olympia-onboarding-*'` 字符串，必须出现在产物 JS 里。
 *    3. 本地化文案：源码 TS 里每个 `localize(key, "默认文案")` 的默认文案，
 *       必须出现在产物的 NLS 消息表里。
 *
 *  第 3 条抓的是最阴的那一类：文案改了但 NLS 没重新抽取 → 界面显示的还是旧字，
 *  而源码、类型检查、打包全部报成功。
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

const tsFiles = collectFiles(srcDir, '.ts').filter(f => !f.endsWith('.d.ts'));
const cssFiles = collectFiles(path.join(srcDir, 'media'), '.css');

const cssClasses = new Map();   // class -> 出处
const jsLiterals = new Map();   // literal -> 出处
const l10nDefaults = new Map(); // 默认文案 -> 出处

for (const file of cssFiles) {
	const text = fs.readFileSync(file, 'utf8');
	for (const m of text.matchAll(/\.(olympia-onboarding-[a-z0-9-]+)/g)) {
		if (!cssClasses.has(m[1])) {
			cssClasses.set(m[1], path.relative(repoRoot, file));
		}
	}
}

for (const file of tsFiles) {
	const text = fs.readFileSync(file, 'utf8');
	for (const m of text.matchAll(/['"`](olympia-onboarding-[a-z0-9-]+)['"`]/g)) {
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
