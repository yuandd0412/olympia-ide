// 三个互不相干的编译超时的不变量检查。
//
// 这里要防的是「同一条策略散在三个文件里各写一个数字」：语法自检随写随报，环境自检是
// 首次探测，编译是真正的长任务 —— 三者的容忍度本来就不一样，凑成一个数就会有人去
// 「统一」它。所以常量收在 oss/extensions/olympia-onboarding/src/timeouts.ts 一处，
// 这条脚本守住三件事：
//
//   1. 三个值两两不同（合并了就说明有人想统一它们）
//   2. 大小顺序 SYNTAX < BUDGET < COMPILE（语法自检必须最快返回）
//   3. 三个原文件里不再出现裸字面量（防止有人绕过常量直接写数字）
//
//   node scripts/oneoff/test-timeouts.mjs
//
// 只读源码，不需要先编译扩展。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const src = path.join(repoRoot, 'oss/extensions/olympia-onboarding/src');

let failed = 0;
function check(label, cond, detail) {
	if (cond) {
		console.log(`  ok   ${label}`);
	} else {
		console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
		failed++;
	}
}

/* ---- 从 timeouts.ts 里把三个值抠出来 ---- */
const timeoutsSrc = readFileSync(path.join(src, 'timeouts.ts'), 'utf8');

function extractValue(name) {
	const m = timeoutsSrc.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*(\\d+)`));
	if (!m) { throw new Error(`cannot find ${name} in timeouts.ts`); }
	return Number(m[1]);
}

const SYNTAX = extractValue('SYNTAX_TIMEOUT_MS');
const COMPILE = extractValue('COMPILE_TIMEOUT_MS');
const BUDGET = extractValue('COMPILE_BUDGET_MS');

console.log(`\n[timeouts.ts] SYNTAX=${SYNTAX}, COMPILE=${COMPILE}, BUDGET=${BUDGET}`);

/* ---- 不变量 1：两两不同 ---- */
check('SYNTAX !== COMPILE', SYNTAX !== COMPILE);
check('SYNTAX !== BUDGET', SYNTAX !== BUDGET);
check('COMPILE !== BUDGET', COMPILE !== BUDGET);

/* ---- 不变量 2：大小顺序 SYNTAX < BUDGET < COMPILE ---- */
check('SYNTAX < BUDGET', SYNTAX < BUDGET, `${SYNTAX} < ${BUDGET}`);
check('BUDGET < COMPILE', BUDGET < COMPILE, `${BUDGET} < ${COMPILE}`);

/* ---- 不变量 3：三个原文件里不再有裸字面量 ---- */
/*
 * 注意：compile.ts 里会有 "export { COMPILE_TIMEOUT_MS } from './timeouts';"
 * 这行不含数字字面量，自然通过。
 * envProbe.ts 里保留了 RUN_BUDGET_MS = 10000 —— 10000 不在本次检查范围。
 */
const filesToScan = [
	{ name: 'syntaxCheck.ts', path: path.join(src, 'syntaxCheck.ts') },
	{ name: 'compile.ts', path: path.join(src, 'compile.ts') },
	{ name: 'envProbe.ts', path: path.join(src, 'envProbe.ts') },
];

const bannedLiterals = ['20000', '120000', '60000'];

for (const f of filesToScan) {
	const text = readFileSync(f.path, 'utf8');
	const lines = text.split(/\r?\n/);
	for (const lit of bannedLiterals) {
		// 找"作为独立 token 出现的数字"：前后是空白、行首行尾、或 = / ( / , 等分隔符
		// 排除字符串字面量里的数字（例如错误消息 "… 20000 ms"）—— 那种出现不会触发误判，
		// 因为我们要求的是：任何位置出现都报出来，由人判断。但本次重构后确实应该一处都没有。
		const re = new RegExp(`(^|[^\\w.])${lit}([^\\w.]|$)`);
		const hits = [];
		for (let i = 0; i < lines.length; i++) {
			if (re.test(lines[i])) { hits.push(i + 1); }
		}
		check(
			`${f.name} 不含裸字面量 ${lit}`,
			hits.length === 0,
			hits.length ? `found on line(s) ${hits.join(', ')}` : '',
		);
	}
}

/* ---- 汇总 ---- */
console.log('');
if (failed > 0) {
	console.error(`✗ ${failed} assertion(s) failed`);
	process.exit(1);
}
console.log('✓ all timeout assertions passed');
