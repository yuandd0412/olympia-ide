// 拦一类汉化事故：词典里的“量词碎片”（只适合跟在数字后面的译文）被当成整句灌进 localize 默认文本。
// 后果有两种，都能机器判定：
//   1) 占位符被吃掉：调用方仍传 count，但默认文本里已经没有 {0} 了 —— 数字在界面上凭空消失。
//   2) 碎片当整句：分隔线/标签直接渲染成「个相似命令」这种没头没尾的量词短语（2026-10-21 命令面板实拍）。
// 碎片集合不写死，直接从 build/zh-cn-dict-*.mjs 的译文里推：以量词开头且不含占位符的那些值。
// 用法：node scripts/oneoff/check-l10n-fragments.mjs [--self-test]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.PROJECT_ROOT || 'D:/oler-ide-v2';
const SRC = path.join(ROOT, 'oss', 'src', 'vs');
const DICT_GLOB = path.join(ROOT, 'build');

// 只保留“永远不会作为一个词的开头”的量词。行/列/件/座会组成真词（行号、列出、条件），
// 用它们当判据第一版就误伤了 3 处正常文案。
const MEASURE_LEAD = /^[个条次张根块]/;
const CALL = /localize2?\(\s*(['"])([^'"]+)\1\s*,\s*"((?:[^"\\]|\\.)*)"([\s\S]{0,200}?)\)\s*[;,)]/g;

/** 词典里“必须跟在数字后面”的译文碎片。 */
function loadFragments(dir) {
	const frags = new Set();
	for (const f of fs.readdirSync(dir)) {
		if (!/^zh-cn-dict-.*\.mjs$/.test(f)) continue;
		const text = fs.readFileSync(path.join(dir, f), 'utf8');
		for (const m of text.matchAll(/'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g)) {
			const val = m[2];
			// 碎片 = 量词开头 + 英文键是复数名词（“similar commands”）+ 译文里没有占位符。
			// 少了复数这一条，'condition': '条件' 这种正常词会被误收进来。
			const en = m[1].trim().toLowerCase().split(/\s+/).pop() || '';
			if (MEASURE_LEAD.test(val) && !/\{\d\}/.test(val) && val.length <= 14 && /s$/.test(en) && en.length > 3) frags.add(val);
		}
	}
	return frags;
}

/** 一个 localize 调用是否被碎片污染。返回原因字符串或 null。
 *  只在默认文本“整句就是一团量词碎片”时报。
 *  注意：不要拿“传的参数比占位符多”当判据——上游大量存在 localize(key,"{0} / {1}",a,b,c) 这种
 *  故意多传参数的写法（2026-10-21 第一版就这么误报了 101 处，其中绝大多数是正常的）。 */
export function judge(defaultText, argsAfterDefault, fragments) {
	if (!fragments.has(defaultText)) return null;
	return argsAfterDefault > 0
		? `整句是量词碎片却还在传 ${argsAfterDefault} 个参数，数字被吃掉了：“${defaultText}”`
		: `整句直接用了量词碎片：“${defaultText}”`;
}

function countArgs(tail) {
	// 参数表里数逗号，忽略字符串内部的
	let depth = 0, commas = 0, inStr = null;
	for (let i = 0; i < tail.length; i++) {
		const c = tail[i];
		if (inStr) { if (c === '\\') i++; else if (c === inStr) inStr = null; continue; }
		if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
		if (c === '(' || c === '[' || c === '{') depth++;
		else if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; }
		else if (c === ',' && depth === 0) commas++;
	}
	return commas;
}

/* 自证：两类事故都要真被抓到，正常文案不许误伤。没跑成功就不算“没找到问题”。 */
const frags = loadFragments(DICT_GLOB);
const FIXTURES = [
	['个相似命令', 1, true, '传了参数却没有占位符（数字被吃掉）'],
	['个相似命令', 0, true, '碎片直接当整句'],
	['{0} 个相似命令', 1, false, '占位符健在就不该报'],
	['条件', 0, false, '“条件”是正常词，不是量词碎片'],
	['行号', 0, false, '“行”能当词头，第一版就是它误伤了 notebook 的“行号”'],
	['列出语音提示', 0, false, '“列”能当词头，第一版误伤了欢迎页这条'],
	['个文件和符号结果', 0, true, '搜索面板分隔线：本轮真抓到并修掉的样本'],
	['相似命令', 0, false, '整词不报'],
	['打开用户设置', 0, false, '正常文案不报'],
];
const selfErr = [];
for (const [text, args, shouldFlag, why] of FIXTURES) {
	const got = judge(text, args, frags);
	if (!!got !== shouldFlag) selfErr.push(` fixture「${text}」判成 ${got ? '报' : '不报'}，本该 ${shouldFlag ? '报' : '不报'}（${why}）`);
}
if (!frags.has('个相似命令')) selfErr.push(`词典碎片集合里没有「个相似命令」——说明碎片根本没被读出来，规则是空转`);
if (selfErr.length) { console.error('自检失败，规则本身不可信：\n  ' + selfErr.join('\n  ')); process.exit(1); }
if (process.argv.includes('--self-test')) {
	console.log(`自检通过：碎片集合 ${frags.size} 条（来自 ${fs.readdirSync(DICT_GLOB).filter(f => /^zh-cn-dict-.*\.mjs$/.test(f)).length} 个词典文件），${FIXTURES.length} 个 fixture 判定全对`);
	process.exit(0);
}

function walk(dir, out) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) walk(p, out);
		else if (e.name.endsWith('.ts')) out.push(p);
	}
	return out;
}

const files = walk(SRC, []);
const found = [];
let unreadable = 0, calls = 0;
for (const f of files) {
	let text;
	try { text = fs.readFileSync(f, 'utf8'); } catch { unreadable++; continue; }
	if (!text.includes('localize')) continue;
	const rel = path.relative(SRC, f).replace(/\\/g, '/');
	const lines = text.split('\n');
	for (const m of text.matchAll(CALL)) {
		calls++;
		const why = judge(m[3], countArgs(m[4]), frags);
		if (!why) continue;
		const lineNo = lines.slice(0, (text.slice(0, m.index).match(/\n/g) || []).length + 1).join('\n').length;
		found.push(`${rel}:${(text.slice(0, m.index).match(/\n/g) || []).length + 1}  key=${m[2]}  ${why}`);
	}
}

if (unreadable) { console.error(`有 ${unreadable} 个源文件没读到，这个结果不可信`); process.exit(1); }
if (calls === 0) { console.error('一个 localize 调用都没解析到，工具空转'); process.exit(1); }
console.log(`扫了 ${files.length} 个源文件、${calls} 个 localize 调用，碎片集合 ${frags.size} 条，命中 ${found.length} 处`);
if (found.length) {
	fs.writeFileSync(path.join(ROOT, '.scratch', 'l10n-fragments.txt'), found.join('\n'), 'utf8');
	console.error(found.slice(0, 25).join('\n'));
	if (found.length > 25) console.error(`…其余 ${found.length - 25} 条写在 .scratch/l10n-fragments.txt`);
	process.exit(1);
}
console.log('no measure-word fragments or lost placeholders in localize defaults');
