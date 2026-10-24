// 标签漂移自检：证明 test-solve-log.mjs 真的有牙。
//
// 背景：`SOLVES_PATH_LABEL` 是「文案里说的那条路径」，写文件那一边用的是
// OLYMPIA_FOLDER / SOLVES_FILE 两个常量。今天两者是推导关系，漂不了；
// 但哪天有人把标签改成手写字面量（很常见：想改个显示名）而没改写文件那一边，
// 面板就会说「记录在 X」而文件其实在 Y——学生按提示去找会找不到。
//
// 这个门把那种改歪了之后的产物复制一份，让检查台对着它跑一遍，
// 必须正好红掉下面那几条：红了 = 标签漂移有人管；一条不红 = 检查台没牙。
// 反过来红成一片（红得比该红的还多）也要判红：那说明检查台自己坏了，误报比不报更坏。
//
//   node scripts/oneoff/test-solve-log-drift.mjs
//
// 需要先编译扩展：
//   npm run gulp -- compile-extension:olympia-onboarding
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const srcOut = path.join(repoRoot, 'oss/extensions/olympia-onboarding/out');
const testFile = path.join(here, 'test-solve-log.mjs');

/** 标签一歪就必须变红的那几条：它们要么直接读磁盘上的文件，要么依赖「刚写完的记录能被读回来」。 */
const MUST_FAIL = [
	'判成 AC 记一条：真的落到 .olympia/solves.json，最新在前',
	'设置关掉就不再写，已有的记录不动',
	'最多留 200 条：再多也不能把文件越写越大',
	'文件读坏了就当没有：不能把面板那一行带崩',
	'没有记录时点面板那一行：说清楚去哪拿记录',
	'有记录时列出清单，选中就打开那道题的题面'
];

if (!fs.existsSync(path.join(srcOut, 'solveLog.js'))) {
	console.log(`FAIL 缺编译产物：${path.join(srcOut, 'solveLog.js')}\n     先跑：npm run gulp -- compile-extension:olympia-onboarding`);
	process.exit(1);
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia solve-log drift '));
const driftOut = path.join(work, 'out');
try {
	fs.cpSync(srcOut, driftOut, { recursive: true });
	const solveJs = path.join(driftOut, 'solveLog.js');
	const before = fs.readFileSync(solveJs, 'utf8');
	// 把「由 OLYMPIA_FOLDER 推导」换成手写字面量：写文件那一边照旧，标签开始说谎。
	const after = before.replace(
		/exports\.SOLVES_PATH_LABEL = `\$\{problemFiles_1\.OLYMPIA_FOLDER\}\/\$\{SOLVES_FILE\}`;/,
		'exports.SOLVES_PATH_LABEL = `.olympia/solve-history.json`;'
	);
	if (after === before) {
		console.log('FAIL 没找到 SOLVES_PATH_LABEL 那行 —— 编译产物的形状变了，这个门自己该更新了');
		process.exit(1);
	}
	fs.writeFileSync(solveJs, after, 'utf8');

	const r = spawnSync(process.execPath, [testFile], {
		encoding: 'utf8',
		cwd: repoRoot,
		env: { ...process.env, OLYMPIA_SOLVE_LOG_OUT: driftOut }
	});
	const lines = (r.stdout || '').split(/\r?\n/);
	// 末尾那行「FAILED」是汇总，不算一条断言。
	const failedTitles = lines.filter(l => l.startsWith('FAIL ') && !l.trim().endsWith('FAILED')).map(l => l.slice(5).trim());

	if (r.status === 0) {
		console.log('FAIL 标签漂移了，检查台却一条没红 —— 检查台没牙了，标签漂移没人管');
		process.exit(1);
	}
	const missing = MUST_FAIL.filter(t => !failedTitles.includes(t));
	if (missing.length) {
		console.log(`FAIL 标签漂移后这几条该红却没红：\n     ${missing.join('\n     ')}\n     实际变红：${failedTitles.length} 条`);
		process.exit(1);
	}
	if (failedTitles.length > MUST_FAIL.length) {
		console.log(`FAIL 标签漂移后红了 ${failedTitles.length} 条，比该红的 ${MUST_FAIL.length} 条还多 —— 检查台自己坏了（误报比不报更坏）：\n     ${failedTitles.join('\n     ')}`);
		process.exit(1);
	}
	console.log(`ok    标签漂移被抓住：正好 ${failedTitles.length} 条断言变红（该红的都在，不该红的没红）`);
} finally {
	fs.rmSync(work, { recursive: true, force: true });
}
