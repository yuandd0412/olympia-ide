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

import { stripComments, stripTsComments } from './lib/ts-lexer.mjs';

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
	'oss/src/vs/workbench/contrib/olympia/browser/olympiaWelcomeReady.ts',
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
		// 锚点必须是**代码级**的完整表达式。
		//
		// 踩过的坑：早先这里写的是 `t.replace('LifecyclePhase.Restored', ...)`，
		// 命中的是文件里**第一处**出现 —— 而那处是文档注释（在代码前面）。
		// 结果变异只改掉了注释，代码一行没动，H13 自然不红 → 这条变异白做，
		// 还会给人「H13 抓不住回归」的错觉。
		mutate: t => t.replace('this.lifecycleService.phase >= LifecyclePhase.Restored',
			'this.lifecycleService.phase >= LifecyclePhase.Ready')
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
	},
	{
		id: 'M21', expect: 'H30',
		desc: 'refresh 改回「每次都重建行区」',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('this.updateRows(index, descriptor.rows);', "this.rebuildRows(index, descriptor.rows, '');")
	},
	{
		id: 'M22', expect: 'H31',
		desc: '起跑闸门不再要求「开始页已就位」',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('const welcomeReady = olympiaWelcomeReady.isReady;', 'const welcomeReady = true;')
	},
	{
		id: 'M23', expect: 'H32',
		desc: 'openEditor 不再 await（信号早于开始页画出来）',
		file: 'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/startupPage.ts',
		mutate: t => t.replace('await this.editorService.openEditor({', 'this.editorService.openEditor({')
	},
	{
		id: 'M24', expect: 'H33',
		desc: '写入失败不留痕（console.warn 降级成 console.log）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('console.warn(', 'console.log(')
	},
	{
		id: 'M25', expect: 'H34',
		desc: '把配置键改回标量父键的子键（olympia.startPage.showIntroAnimation）',
		file: OL + 'olympiaWelcome.contribution.ts',
		mutate: t => t.replace("'olympia.startPageIntroAnimation'", "'olympia.startPage.showIntroAnimation'")
	},
	{
		id: 'M26', expect: 'H35',
		desc: '首帧前的切卡保护被去掉（补间起点是 0 → 卡片瞬移）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('if (this.lastFrameTime < 0) {', 'if (false) {')
	},
	{
		id: 'M27', expectGreen: ['H6', 'H36'],
		desc: '背景时钟换成等价的 `= this.backdropTime + delta` 写法（同样单调，不该被判红）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('this.backdropTime += delta;', 'this.backdropTime = this.backdropTime + delta;')
	},
	{
		id: 'M28', expectGuardHit: true,
		desc: '元变异：锚点故意落在文档注释上（复刻 M9 当年的错法）—— 必须被「只打到注释」守卫拦住',
		file: OL + 'olympiaOnboarding.ts',
		// 这条复刻的是 M9 当年的写法：锚点 `LifecyclePhase.Restored` 在文件里
		// **第一处**出现是在文档注释（在代码前面），替换只会改到注释。
		mutate: t => t.replace('LifecyclePhase.Restored', 'LifecyclePhase.Ready')
	},
	// ---------------------------------------------------------------------------
	// T-024 审计之后新增的变异。
	//
	// 每一���都对应那轮修的一个**真实缺陷**。新加的断言（T1~T6）如果抓不住
	// 自己的变异，那就是假断言 —— 和当初 M9 打在注释上导致 H13 假绿是同一类错误。
	// ---------------------------------------------------------------------------
	{
		id: 'M29', expect: 'T1',
		desc: 'chrome 让位提前到 requestEnter()（等待期就摘掉「跳过」和翻页，用户只剩一颗药丸）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t
			.replace("this.cards.element.classList.add('olympia-onboarding-entering');", '')
			.replace('this.enterRequestedAt = -1;',
				"this.enterRequestedAt = -1;\n\t\tthis.cards.element.classList.add('olympia-onboarding-entering');")
	},
	{
		id: 'M30', expect: 'T2',
		desc: '开始页打开失败被报成「已就位」（恢复成 finally { markReady() } 的老写法）',
		file: 'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/startupPage.ts',
		mutate: t => t.replace(
			/await this\.openOlympiaWelcome\(\);[\s\S]*?\} catch \(error\) \{/,
			'await this.openOlympiaWelcome();\n\t\t\t} finally {\n\t\t\t\tolympiaWelcomeReady.markReady();\n\t\t\t} catch (error) {')
	},
	{
		id: 'M31', expect: 'T3',
		desc: '引导侧不再判 isFailed（开始页永远不会有时仍去擦洞，洞里是空的）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('olympiaWelcomeReady.isFailed', 'olympiaWelcomeReady.isReady')
	},
	{
		id: 'M32', expect: 'T4',
		desc: '点击后只刷预览块（派生值行停在旧文本上：预览新、卡片旧）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('\n\t\t\t\t\t\t\tthis.refresh();', '\n\t\t\t\t\t\t\tthis.refreshPreview();')
	},
	{
		id: 'M33', expect: 'T5',
		desc: '重试额度退回全局计数（一个写不进去的键带着别的键一起耗光额度）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('private readonly pendingWriteAttempts = new Map<string, number>();', 'private flushRetryCount = 0;')
	},
	{
		id: 'M34', expect: 'T6',
		desc: 'enterRequestedAt 的哨兵退回 0（rAF 合法域内 → 等待时长恒为 0，硬上限永不触发）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('private enterRequestedAt = -1;', 'private enterRequestedAt = 0;')
	},
	{
		id: 'M35', expect: 'H35',
		desc: '卡片侧 lastFrameTime 的哨兵退回 0（赌「0 永不出现」）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('private lastFrameTime = -1;', 'private lastFrameTime = 0;')
	},
	// ---------------------------------------------------------------------------
	// T-025 审计之后新增的变异。
	//
	// 每一���都对应那轮修的一个**真实缺陷**。新加的断言（T7~T11）如果抓不住
	// 自己的变异，那就是假断言 —— 和当初 M9 打在注释上导致 H13 假绿是同一类错误。
	// ---------------------------------------------------------------------------
	{
		id: 'M36', expect: 'T7',
		desc: '异步取值行的「已落地就跳过」闸门被去掉（每次刷新都打回占位 + 重发请求）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('if (binding.valueResolved) {', 'if (false) {')
	},
	{
		id: 'M37', expect: 'T8',
		desc: '「扩展还没注册」那条路径不再消耗重试额度（永远重试下去）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'abandonWriteIfExhausted(key, `配置 ${key} 尚未注册',
			'abandonWrite(key, `配置 ${key} 尚未注册')
	},
	{
		id: 'M38', expect: 'T9',
		desc: '放弃写入后不再刷新界面（chip 高亮继续撒谎：显示用户点的，配置里其实没写）',
		file: OL + 'olympiaOnboardingCards.ts',
		// 锚点带上 `return true;` 才唯一 —— `refresh()` 里也有同样两行。
		mutate: t => t.replace(
			'\t\tthis.refreshRowStates();\n\t\tthis.refreshPreview();\n\t\treturn true;',
			'\t\treturn true;')
	},
	{
		id: 'M39', expect: 'T10',
		desc: '重试定时器不再把这一轮标记成重试轮（额度永远不被消耗 = 没有上限）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('void this.flushPendingWrites(true);', 'void this.flushPendingWrites();')
	},
	{
		id: 'M40', expect: 'T11',
		desc: '收场路径里把死代码 enterStart = null 加回来（暗示存在中途取消路径）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			"this.rootElement.classList.add('olympia-onboarding-fading');",
			"this.enterStart = null;\n\t\tthis.rootElement.classList.add('olympia-onboarding-fading');")
	},
	{
		id: 'M41', expect: 'T12',
		desc: '去掉「请求在途就跳过」的闸门（扩展注册配置项的那段时间里 getRecentlyOpened() 被连着发好几次）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\t\t\t\tif (binding.valuePending) {\n\t\t\t\t\t\tbreak;\n\t\t\t\t\t}',
			'\t\t\t\t\t// (gate removed)')
	},
	{
		id: 'M42', expect: 'T12',
		desc: '取值失败时不放掉「在途」标记（这一行永远停在「请求中」，再也拿不到值）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'}, () => {\n\t\t\t\t\t\tbinding.valuePending = false;',
			'}, () => {')
	},
	{
		id: 'M43', expect: 'T12',
		desc: '发请求之前不置「在途」标记（闸门永远打不开，重复请求照旧）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('binding.valuePending = true;', '// (not set)')
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

/**
 * 剥掉注释（按文件类型），用来判断「变异是不是只打到了注释」。
 *
 * 跟体检脚本的 load() 用的是同一份实现 —— 两边算法不一致的话，
 * 这个守卫自己就不可信了。
 */
function stripForFile(rel, text) {
	if (rel.endsWith('.ts')) {
		return stripTsComments(text);
	}
	if (rel.endsWith('.css')) {
		return stripComments(text);
	}
	return text;
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
		// 守卫：变异必须真的改到**代码**。
		//
		// 踩过的坑：M9 的锚点是 `LifecyclePhase.Restored`，文件里第一处出现是在
		// 文档注释里（在代码前面）。变异把注释改了、代码一行没动 → 对应断言当然不红。
		// 但那次的输出是「期望 H13 变红，实际红了：（一条都没红）」，
		// 看上去像断言没用，其实是**变异没打中代码**。
		//
		// 所以这里在剥掉注释之后再比对：剥注释后完全相同 ⇒ 只打到了注释 ⇒ 直接判 FAIL，
		// 不再往下跑（跑下去只会得到一条误导性的「断言抓不住」的结论）。
		const codeBefore = stripForFile(mut.file, text);
		const codeAfter = stripForFile(mut.file, changed);
		if (codeBefore === codeAfter) {
			// 元变异（expectGuardHit）：它**就该**被守卫拦住 —— 拦住了说明守卫是活的。
			// 这类变异不是「失败」，而是「守卫自检通过」。
			if (mut.expectGuardHit) {
				console.log(`PASS ${mut.id} ${mut.desc} → 如期被「只打到注释」守卫拦下`);
				continue;
			}
			console.log(`FAIL ${mut.id} 变异只打到了注释、没改到代码 —— ${mut.desc}`);
			failures++;
			continue;
		}
		if (mut.expectGuardHit) {
			// 元变异本该只打到注释，却打到了代码 —— 说明守卫的判据失效了。
			console.log(`FAIL ${mut.id} 元变异竟然改到了代码 —— 「只打到注释」守卫失效了`);
			failures++;
			continue;
		}
		fs.writeFileSync(abs, changed);
		const res = runCheck(tmp);
		fs.writeFileSync(abs, text);   // 还原

		// 「不该变红」型变异：证明断言判的是**语义**，而不是某种写法。
		// 比如 H6/H36 如果写成「必须出现 `this.backdropTime +=`」，那把等价的
		// `= this.backdropTime + delta` 判红就说明它们在管写法而不管行为。
		if (mut.expectGreen) {
			const wronglyRed = mut.expectGreen.filter(id => res.failedIds.includes(id));
			if (wronglyRed.length) {
				console.log(`FAIL ${mut.id} ${mut.desc} → 期望 ${mut.expectGreen.join(', ')} 保持绿，实际红了：${wronglyRed.join(', ')}`);
				failures++;
			} else {
				const others = res.failedIds.filter(id => !mut.expectGreen.includes(id));
				console.log(`PASS ${mut.id} ${mut.desc} → ${mut.expectGreen.join(', ')} 如期保持绿${others.length ? `（另有 ${others.join(', ')} 变红，不影响本条判定）` : ''}`);
			}
			continue;
		}

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
