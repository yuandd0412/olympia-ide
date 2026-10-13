// 随包扩展的界面英文检查：产品对外说的是全中文，那**学生够得着**的地方就不能剩英文句子。
//
// 范围是刻意收窄的，不是扫得越狠越好：
//   * 只查会显示出来的键（title / label / description / displayName / placeholder…），
//     并且只报三个词以上的纯英文——Emmet、JSON、TypeScript Go 这类专有名词本来就该留着。
//   * 不查笔记本呈现器、语言模型工具、调试器 schema 的默认值：这些要么在产品里进不去
//     （笔记本已经整类关掉），要么根本不给用户看。
//   * 代码片段只查 C/C++ 与 Markdown：学生写题解和题面会敲这些补全；
//     js / ts / php 那些是本产品不教的语言的补全说明，翻成中文只是给自己找上游冲突。
// 运行：node scripts/oneoff/check-extension-copy.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const extensionsRoot = path.join(repoRoot, 'oss/extensions');
const shippedRoot = path.join(repoRoot, 'VSCode-win32-x64/resources/app/extensions');

const VISIBLE_KEYS = /^(displayName|description|title|label|name|category|markdownDescription|markdownDeprecationMessage|tooltip|placeholder|prompt)$/i;
const CJK = /[㐀-鿿぀-ヿ]/;
const SENTENCE = /[A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*){2,}/;
/** 这条路学生进不去，或者压根不是给人看的。 */
const OUT_OF_SCOPE = /\.(notebookRenderer|languageModelTools|debuggers|configurationAttributes|submenus\[\d+\]\.label\[)/;
const SNIPPET_LANGS = new Set(['c.code-snippets', 'cpp.code-snippets', 'markdown.code-snippets']);

const shipped = fs.existsSync(shippedRoot)
	? new Set(fs.readdirSync(shippedRoot).filter(name => fs.statSync(path.join(shippedRoot, name)).isDirectory()))
	: null;

const found = [];
function walk(node, trail, file) {
	if (Array.isArray(node)) {
		node.forEach((item, index) => walk(item, `${trail}[${index}]`, file));
		return;
	}
	if (node && typeof node === 'object') {
		for (const [key, value] of Object.entries(node)) {
			const here = `${trail}.${key}`;
			if (typeof value === 'string') {
				if (VISIBLE_KEYS.test(key) && !CJK.test(value) && SENTENCE.test(value) && !OUT_OF_SCOPE.test(here)) {
					found.push(`${path.relative(repoRoot, file)} ${here} → ${JSON.stringify(value.slice(0, 100))}`);
				}
			} else if (value && typeof value === 'object') {
				walk(value, here, file);
			}
		}
		return;
	}
	if (typeof node === 'string') {
		try { walk(JSON.parse(node), '', file); } catch { /* 带注释的 JSONC：上面已单独处理 */ }
	}
}

function snippetsOf(dir) {
	const candidates = [path.join(dir, 'snippets')];
	for (const folder of candidates) {
		if (!fs.existsSync(folder)) { continue; }
		for (const file of fs.readdirSync(folder).filter(name => SNIPPET_LANGS.has(name))) {
			const full = path.join(folder, file);
			walk(stripComments(fs.readFileSync(full, 'utf8')), '', full);
		}
	}
}

/** 片段文件是 JSONC：注释去掉再解析。 */
function stripComments(text) {
	return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/,\s*([}\]])/g, '$1');
}

const dirs = fs.readdirSync(extensionsRoot).filter(name => {
	const full = path.join(extensionsRoot, name);
	return fs.statSync(full).isDirectory() && (!shipped || shipped.has(name));
});

for (const name of dirs) {
	const dir = path.join(extensionsRoot, name);
	for (const file of fs.readdirSync(dir)) {
		if (file !== 'package.json' && !/^package\.nls.*\.json$/.test(file)) { continue; }
		if (file !== 'package.json' && file !== 'package.nls.json') { continue; }
		const full = path.join(dir, file);
		try { walk(fs.readFileSync(full, 'utf8'), '', full); } catch (error) { console.log(`skip ${name}/${file}: ${error.message}`); }
	}
	snippetsOf(dir);
}

console.log(`扫了 ${dirs.length} 个随包扩展：清单、界面文案与 C/C++/Markdown 代码片段`);
for (const line of found) { console.log(`EN    ${line}`); }
console.log(found.length ? `\nFAILED：还有 ${found.length} 句英文会显示给学生` : '\nall reachable shipped-extension copy is Chinese');
process.exitCode = found.length ? 1 : 0;
