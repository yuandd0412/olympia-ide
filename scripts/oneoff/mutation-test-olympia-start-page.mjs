#!/usr/bin/env node
// 变异测试：验证 check-olympia-start-page.mjs 的断言**真的能抓住回归**。
//
// 一套断言全绿，只说明「当前代码符合当前断言」。如果断言本身写错了
// （锚点落在使用处而不是定义处、规则太松、命中文档注释而不是代码），
// 它照样全绿，却一点用都没有。
//
// 唯一能回答「这条断言有没有用」的，是**变异测试**：故意把代码改坏，
// 看对应的那条断言是否变红。
//
// 做法：
//   1. 把体检脚本需要的文件复制到临时目录，做成一个最小可运行的假仓库；
//   2. 跑一次体检 → 必须全绿（证明基线是干净的）；
//   3. 逐个施加变异（把正确实现改坏）→ 对应的那条断言必须变红；
//   4. 任何一条变异没被抓住，就是一条假断言，报出来。
//
// ## 它已经抓到过什么
//
// 2026-10-22 首跑时 20 条变异有 2 条没被抓住，两条都是**断言自己的错**，不是代码错：
//
//   - H2  全文 grep `WorkbenchPhase.BlockStartup`。但贡献文件的头部注释里大段解释
//         「为什么是 BlockStartup」，注释命中 → 真代码挪到 AfterRestored 它照样绿。
//         已改成：先剥 TS 注释，再锚在注册调用的阶段实参上。
//   - H25 锚在 `export const OLYMPIA_JUDGE_TARGETS` 之后取**第一个 `{`**——
//         那是对应数组第一个元素（洛谷）的花括号，括号配对只截得出第 1 条，
//         第 2 条（NOI）漂移永远看不见。已改成：锚数组字面量 `[`，逐条配对比对。
//
// 用法：node scripts/oneoff/mutation-test-olympia-start-page.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..', '..');
const CHECK_SCRIPT = path.join(REPO, 'scripts', 'oneoff', 'check-olympia-start-page.mjs');

/** 体检脚本读到的所有文件（相对仓库根）。少一个就会 MISSING。 */
const NEEDED = [
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaWelcomeInput.ts',
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaWelcomePage.ts',
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaWelcome.contribution.ts',
	'oss/src/vs/workbench/contrib/olympia/browser/media/olympiaWelcome.css',
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaOnboarding.ts',
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaOnboarding.contribution.ts',
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaOnboardingCards.ts',
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaOnboardingTimeline.ts',
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaOnboardingBackdrop.ts',
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaOnboardingConfig.ts',
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaJudgeTargets.ts',
	'oss/src/vs/workbench/contrib/olympia/browser/media/olympiaOnboarding.css',
	'oss/src/vs/workbench/workbench.common.main.ts',
	'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/startupPage.ts',
	'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts',
	'oss/extensions/olympia-onboarding/package.json',
	'oss/extensions/olympia-contest/package.json',
	'oss/extensions/olympia-coach/package.json',
	'oss/extensions/olympia-onboarding/src/ojTargets.ts'
];

const OL = 'oss/src/vs/workbench/contrib/olympia/browser/';

/**
 * 变异清单：每条说明「把什么改坏」+「哪条断言必须因此变红」。
 * mutate 返回值必须与入参不同，否则判「锚点没命中」。
 *
 * 注意：锚点要落在**代码**上，不能落在文档注释上。注释里同样会出现
 * `WorkbenchPhase.BlockStartup` 这种字符串，先匹配到注释等于这一条变异白做。
 */
const MUTATIONS = [
	{
		id: 'M1', expect: 'H1',
		desc: 'overlay 改挂 document.body',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('const container = this.layoutService.getContainer(mainWindow);',
			'const container = document.body;')
	},
	{
		id: 'M2', expect: 'H2',
		desc: '贡献从 BlockStartup 挪到 AfterRestored',
		file: OL + 'olympiaOnboarding.contribution.ts',
		mutate: t => t.replace('OlympiaOnboardingContribution, WorkbenchPhase.BlockStartup)',
			'OlympiaOnboardingContribution, WorkbenchPhase.AfterRestored)')
	},
	{
		id: 'M3', expect: 'H3',
		desc: 'overlay 根元素加上背景色',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('.olympia-onboarding {\n\tposition: fixed;',
			'.olympia-onboarding {\n\tbackground: #123456;\n\tposition: fixed;')
	},
	{
		id: 'M4', expect: 'H4',
		desc: 'splash 首帧后不淡出',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('.olympia-onboarding-painted .olympia-onboarding-splash {\n\topacity: 0;',
			'.olympia-onboarding-painted .olympia-onboarding-splash {\n\topacity: 1;')
	},
	{
		id: 'M5', expect: 'H5',
		desc: '擦洞不用 destination-out',
		file: OL + 'olympiaOnboardingBackdrop.ts',
		mutate: t => t.replace(`ctx.globalCompositeOperation = 'destination-out';`,
			`ctx.globalCompositeOperation = 'source-over';`)
	},
	{
		id: 'M6', expect: 'H6',
		desc: '背景时钟被重置',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('this.backdropTime += delta;', 'this.backdropTime = 0;')
	},
	{
		id: 'M7', expect: 'H10',
		desc: '进入动画时长改成 3 秒',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace('OLYMPIA_ONBOARDING_ENTER_DURATION = 5.40', 'OLYMPIA_ONBOARDING_ENTER_DURATION = 3.00')
	},
	{
		id: 'M8', expect: 'H12',
		desc: '洞的角距改成 W/2（盖不住四角）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace('viewportWidth / Math.SQRT2', 'viewportWidth / 2')
	},
	{
		id: 'M9', expect: 'H13',
		desc: '不等 Restored 就起跑',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('LifecyclePhase.Restored', 'LifecyclePhase.Ready')
	},
	{
		id: 'M10', expect: 'H16',
		desc: '首启标记改成参与设置同步',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('StorageScope.PROFILE, StorageTarget.MACHINE', 'StorageScope.PROFILE, StorageTarget.USER')
	},
	{
		id: 'M11', expect: 'H17',
		desc: '帧体去掉 try-catch',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('try {\n\t\t\tthis.renderFrame(timestamp);\n\t\t} catch (error) {',
			'if (true) {\n\t\t\tthis.renderFrame(timestamp);\n\t\t} else {')
	},
	{
		id: 'M12', expect: 'H19',
		desc: 'z-index 改成 2531',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('OLYMPIA_ONBOARDING_Z_INDEX = 2530', 'OLYMPIA_ONBOARDING_Z_INDEX = 2531')
	},
	{
		id: 'M13', expect: 'H21',
		desc: '字号行不再用 configValue',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('options: [12, 13, 14, 16].map(value => ({ label: String(value), value: String(value), configValue: value }))',
			'options: [12, 13, 14, 16].map(value => ({ label: String(value), value: String(value) }))')
	},
	{
		id: 'M14', expect: 'H22',
		desc: '光标动画开关不再用 toggleValues',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace("toggleValues: { on: 'on', off: 'off' }", 'toggleValues: undefined')
	},
	{
		id: 'M15', expect: 'H23',
		desc: 'core 默认值与扩展不一致',
		file: OL + 'olympiaOnboardingConfig.ts',
		mutate: t => t.replace('[OLYMPIA_CONFIG_TRAIN_DAILY_GOAL]: 3', '[OLYMPIA_CONFIG_TRAIN_DAILY_GOAL]: 5')
	},
	{
		id: 'M16', expect: 'H25',
		desc: 'core 的评测机表与扩展漂移（第 2 条）',
		file: OL + 'olympiaJudgeTargets.ts',
		mutate: t => t.replace(`gcc: '9.3.0'`, `gcc: '9.4.0'`)
	},
	{
		id: 'M17', expect: 'H27',
		desc: '隐藏卡片层改用 display:none',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('.olympia-onboarding-cards.hidden {\n\topacity: 0;',
			'.olympia-onboarding-cards.hidden {\n\tdisplay: none;\n\topacity: 0;')
	},
	{
		id: 'M18', expect: 'H28',
		desc: '卡片拖拽改用 setPointerCapture',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('this.dragging = true;', 'this.dragging = true;\n\t\t\ttrack.setPointerCapture(event.pointerId);')
	},
	{
		id: 'M19', expect: 'H29',
		desc: 'readConfig 不再优先读 pendingWrites',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('if (this.pendingWrites.has(key)) {', 'if (false) {')
	},
	{
		id: 'M20', expect: 'H11',
		desc: '暗角退场时间超过总时长',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace('OLYMPIA_ONBOARDING_VIGNETTE_FALL_END = 5.30', 'OLYMPIA_ONBOARDING_VIGNETTE_FALL_END = 5.90')
	}
];

function buildTree(dest) {
	for (const rel of NEEDED) {
		const src = path.join(REPO, ...rel.split('/'));
		const dst = path.join(dest, ...rel.split('/'));
		fs.mkdirSync(path.dirname(dst), { recursive: true });
		fs.copyFileSync(src, dst);
	}
}

function runCheck(treeRoot) {
	const res = spawnSync(process.execPath, [CHECK_SCRIPT], {
		env: { ...process.env, OLYMPIA_CHECK_REPO: treeRoot },
		encoding: 'utf8'
	});
	const out = `${res.stdout || ''}${res.stderr || ''}`;
	const failedIds = [...out.matchAll(/^FAIL (\S+)/gm)].map(m => m[1]);
	return { exit: res.status, out, failedIds };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia-mutation-'));
let failures = 0;

try {
	buildTree(tmp);

	const base = runCheck(tmp);
	if (base.exit !== 0) {
		console.log('基线不干净 —— 体检脚本在未变异的树上就红了：');
		console.log(base.out.split(/\r?\n/).filter(l => /^(FAIL|MISSING)/.test(l)).join('\n'));
		process.exit(1);
	}
	console.log(`基线 OK：${base.out.match(/^OK (\d+)/m)?.[1]} 条断言全绿`);

	for (const mut of MUTATIONS) {
		const abs = path.join(tmp, ...mut.file.split('/'));
		const text = fs.readFileSync(abs, 'utf8');
		const changed = mut.mutate(text);
		if (changed === text) {
			console.log(`FAIL ${mut.id} 变异没生效（锚点没匹配上）—— ${mut.desc}`);
			failures++;
			continue;
		}
		fs.writeFileSync(abs, changed);
		const res = runCheck(tmp);
		fs.writeFileSync(abs, text);   // 还原

		const caught = res.failedIds.includes(mut.expect);
		if (caught) {
			console.log(`PASS ${mut.id} ${mut.desc} → ${mut.expect} 如期变红`);
		} else {
			console.log(`FAIL ${mut.id} ${mut.desc} → 期望 ${mut.expect} 变红，实际红了：${res.failedIds.join(', ') || '（一条都没红）'}`);
			failures++;
		}
	}
} finally {
	fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(failures ? `\n变异测试失败 ${failures} 条` : '\n变异测试全部通过');
process.exit(failures ? 1 : 0);
