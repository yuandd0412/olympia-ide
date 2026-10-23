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
/**
	* 在指定 `@media (max-height: Npx)` 档里替换第一处匹配。
	*
	* 为什么不能直接 t.replace(...)：
	* `flex: 0 0 auto;` 在默认档和 ≤420 档里都有，裸 replace 只改第一处（默认档），
	* 改不到目标档 —— 断言当然不会红，而结论会变成「断言没用」，其实是被变异绕开了。
	* 所以这里先把目标档的正文切出来，只在正文里找。
	*/
	function replaceInMaxHeightBlock(text, maxHeight, find, replace) {
		// String.raw 只保证反斜杠不被吃掉，出来的还是**字符串** —— 必须再包一层 new RegExp。
	const re = new RegExp(String.raw`@media\s*\(max-height:\s*${maxHeight}px\)`);
		const m = re.exec(text);
		if (!m) {
			return text;
		}
		const braceIdx = text.indexOf('{', m.index + m[0].length);
		if (braceIdx < 0) {
			return text;
		}
		let depth = 1;
		let j = braceIdx + 1;
		while (j < text.length && depth > 0) {
			const ch = text[j];
			if (ch === '{') {
				depth++;
			} else if (ch === '}') {
				depth--;
			}
			j++;
		}
		const body = text.slice(braceIdx + 1, j - 1);
		const idx = body.indexOf(find);
		if (idx < 0) {
			return text;
		}
		const newBody = body.slice(0, idx) + replace + body.slice(idx + find.length);
		return text.slice(0, braceIdx + 1) + newBody + text.slice(j - 1);
	}

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
		mutate: t => t.replace('OLYMPIA_ONBOARDING_VIGNETTE_FALL_END = 2.25', 'OLYMPIA_ONBOARDING_VIGNETTE_FALL_END = 5.90')
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
		// 锚**写入那条**的 warn，不锚裸的 `console.warn(` ——
		// 文件里现在有两条 warn（写入失败 / 取值失败），裸锚会打到先出现的那条，
		// 期望的断言根本不会红。锚点带上 `${reason}` 才唯一。
		mutate: t => t.replace(
			'console.warn(`[Olympia] ${reason}（第 ${rounds} 轮）`);',
			'console.log(`[Olympia] ${reason}（第 ${rounds} 轮）`);')
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
		id: 'M27', expectGreen: ['H6', 'H36', 'T50'],
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
		mutate: t => t.replace('private readonly pendingWriteRounds = new Map<string, number>();', 'private flushRetryCount = 0;')
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
		mutate: t => t.replace('if (binding.valueResolved || binding.valueFailed) {', 'if (false) {')
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
		desc: '取值成功后先放掉「在途」标记再核对身份（更新的那次请求失去保护，会被又一轮 refresh 顶掉）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\t\t\t\t\tif (binding.valueToken !== token || binding.valueElement !== value) {\n\t\t\t\t\t\t\treturn;\n\t\t\t\t\t\t}\n\t\t\t\t\t\tbinding.valuePending = false;',
			'\t\t\t\t\t\tbinding.valuePending = false;\n\t\t\t\t\t\tif (binding.valueToken !== token || binding.valueElement !== value) {\n\t\t\t\t\t\t\treturn;\n\t\t\t\t\t\t}')
	},
	{
		id: 'M43', expect: 'T12',
		desc: '发请求之前不置「在途」标记（闸门永远打不开，重复请求照旧）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('binding.valuePending = true;', '// (not set)')
	},
	// ---------------------------------------------------------------------------
	// T-026 复核之后新增的变异。
	//
	// 上一轮 Qoder 复核指出：断言光「写对」不够，还得**看得见**自己防的回归。
	// 这批变异对应本轮加固的四处：H30（行区重建的全文件约束）、
	// T10（只有定时器能消耗额度）、T13/T14（写入在途也消耗额度、放弃时摘键）、
	// T15/T16（异步取值的失败必须真失败、必须有界重试）。
	// ---------------------------------------------------------------------------
	{
		id: 'M44', expect: 'H30',
		desc: '在 rebuildRows() 之外再加一处行区整片重建（旧断言只盯 refresh/refreshRowStates 两个函数名，看不见新入口）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\t\tthis.previewElements[index].replaceChildren(...descriptor.preview());',
			'\t\t\tthis.previewElements[index].replaceChildren(...descriptor.preview());\n\t\t\tthis.bodyElements[index].replaceChildren();')
	},
	{
		id: 'M45', expect: 'H30',
		desc: '行区改用 innerHTML 重建（整棵子树重新解析 = 用户按着的按钮被换掉）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\tthis.bodyElements[index].replaceChildren(...built.elements);',
			'\t\tthis.bodyElements[index].innerHTML = \'\';')
	},
	{
		id: 'M46', expect: 'T10',
		desc: '用户点一下也消耗重试额度（writeConfig 传 true）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('\t\tawait this.flushPendingWrites();', '\t\tawait this.flushPendingWrites(true);')
	},
	{
		id: 'M47', expect: 'T10',
		desc: '帧轮次也消耗重试额度（render 传 true）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('\t\t\tvoid this.flushPendingWrites();', '\t\t\tvoid this.flushPendingWrites(true);')
	},
	{
		id: 'M48', expect: 'T13',
		desc: '写入在途时不消耗重试额度（一次正常写入白嫖一轮；写入永不 settle 时配额永远用不完）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'this.abandonWriteIfExhausted(key, `配置 ${key} 的写入还没回来`, undefined, pendingValue);',
			'// (在途不消耗额度)')
	},
	{
		id: 'M49', expect: 'T14',
		desc: '放弃写入时不把键从 writingKeys 里摘掉（卡死的写入永久挡住用户后来的点击）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('\n\t\tthis.writingKeys.delete(key);', '\n\t\t// (不摘键)')
	},
	{
		id: 'M50', expect: 'T15',
		desc: '把「取不到」重新吞成「还没有」（失败被伪装成成功，这一行整个生命周期冻在假值上）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\tconst recent = await this.workspacesService.getRecentlyOpened();',
			'\t\tlet recent;\n\t\ttry {\n\t\t\trecent = await this.workspacesService.getRecentlyOpened();\n\t\t} catch {\n\t\t\treturn empty;\n\t\t}')
	},
	{
		id: 'M51', expect: 'T15',
		desc: '取值失败时置 valueResolved（把失败当成「取到了值」= 冻住整行的元凶）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('\t\t\t\t\t\t\tbinding.valueFailed = true;', '\t\t\t\t\t\t\tbinding.valueResolved = true;')
	},
	{
		id: 'M52', expect: 'T16',
		desc: '取值失败后不再重试（存储服务启动早期抽风一次就宣判「没有工程」）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			/\t\t\t\t\t\tthis\.scheduleValueRetry\(\(\) => \{[\s\S]*?\t\t\t\t\t\t\}\);/,
			'\t\t\t\t\t\t// (不重试)')
	},
	{
		id: 'M53', expect: 'T16',
		desc: '重试上限判定改成永假（永远到不了上限 = 永远停在「读取中…」骗用户）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'if (attempts >= OlympiaOnboardingCards.VALUE_RETRY_LIMIT) {',
			'if (attempts >= 999999) {')
	},
	{
		id: 'M54', expect: 'T15',
		desc: '异步取值失败不留痕（console.warn 降级成 console.log）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'console.warn(`[Olympia] 取「最近工程」失败（第 ${attempts} 次）：${error}`);',
			'console.log(`[Olympia] 取「最近工程」失败（第 ${attempts} 次）：${error}`);')
	},
	{
		id: 'M55', expect: 'T17',
		desc: '在途表退回成 Set（没有代号，旧写入迟到会摘掉新一轮的标记 → 同一键并发写）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'private readonly writingKeys = new Map<string, symbol>();',
			'private readonly writingKeys = new Set<string>();')
	},
	{
		id: 'M56', expect: 'T17',
		desc: '发起写入时不记代号（finally 里无从分辨自己是不是当前那一次）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'this.writingKeys.set(key, writeToken);',
			'this.writingKeys.set(key, key as unknown as symbol);')
	},
	{
		id: 'M57', expect: 'T17',
		desc: 'finally 里的删除去掉代号守卫（旧写入迟到时误删新一轮写入的标记）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'if (this.writingKeys.get(key) === writeToken) {',
			'if (this.writingKeys.get(key) === undefined) {')
	},
	{
		id: 'M58', expect: 'T18',
		desc: '放弃写入时无条件摘掉待写值（用户后来点的那个新值被一起摘掉 → 选择白点）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'if (this.pendingWrites.get(key) === attemptedValue) {',
			'if (true) {')
	},
	{
		id: 'M59', expect: 'T19',
		desc: '被放弃的写入迟到落地时不补写用户的选择（配置停在旧值上）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'this.rewriteIfStale(key, value);',
			'// (不补偿)')
	},
	{
		id: 'M60', expect: 'T19',
		desc: 'writeConfig 不记用户意图（待写值被消费后答不出「用户还想要什么」）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'this.lastIntended.set(key, value);',
			'// (不记意图)')
	},
	{
		id: 'M61', expect: 'T20',
		desc: '最后一道扫光改回底部面板（默认收起 → 取不到矩形 → 那道扫光永远不亮）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			"['statusbar', Parts.STATUSBAR_PART],",
			"['panel', Parts.PANEL_PART],")
	},
	{
		id: 'M62', expect: 'T21',
		desc: '时间线里的扫光目标与渲染层的部件映射对不上（时间线多出来的那道没有 DOM 元素）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			"{ id: 'statusbar', start: 4.30, end: 5.25, axis: 'x' },",
			"{ id: 'auxbar', start: 4.30, end: 5.25, axis: 'x' },")
	},
	{
		id: 'M63', expect: 'T22',
		desc: '扫光方向改回写死「只有标题栏是横向」（时间线的 axis 字段形同虚设）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			"const horizontal = state.axis === 'x';",
			"const horizontal = state.id === 'titlebar';")
	},
	{
		id: 'M64', expect: 'T23',
		desc: '暗角退场改回 3.50s→5.30s（真实工作台被压暗到动画最后）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'export const OLYMPIA_ONBOARDING_VIGNETTE_FALL_END = 2.25;',
			'export const OLYMPIA_ONBOARDING_VIGNETTE_FALL_END = 5.30;')
	},
	{
		id: 'M65', expect: 'T24',
		desc: '最后一道扫光提前收尾（尾巴上留一段什么也不发生的死区）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			"{ id: 'statusbar', start: 4.30, end: 5.25, axis: 'x' },",
			"{ id: 'statusbar', start: 4.30, end: 4.60, axis: 'x' },")
	},
	{
		id: 'M66', expect: 'T25',
		desc: '相邻扫光之间留一段空隙（读成「一个亮了停一下下一个亮了」）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			"{ id: 'sidebar', start: 3.80, end: 4.75, axis: 'y' },",
			"{ id: 'sidebar', start: 4.30, end: 4.75, axis: 'y' },")
	},
	{
		id: 'M67', expect: 'T26',
		desc: '取不到部件矩形时直接跳过、不留兜底（那道扫光永远不亮 → 死区）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'rect = viewport;',
			'rect = undefined;')
	},
	{
		id: 'M68', expect: 'T27',
		desc: '光带位移改回「多走一倍」的旧公式（整道扫光里只有中间 20% 的时间光带在屏上）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'return ((offset + 1) / 2) * (extent + band) - band;',
			'return offset * (extent + band) + extent / 2 - band / 2;')
	},
	{
		id: 'M69', expect: 'T28',
		desc: '异步取值失败后立刻放掉「在途」标记（800ms 窗口里任何一次 refresh 都会重发请求并提前烧光重试预算）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'if (attempts >= OlympiaOnboardingCards.VALUE_RETRY_LIMIT) {',
			'binding.valuePending = false;\n\t\t\t\t\t\tif (attempts >= OlympiaOnboardingCards.VALUE_RETRY_LIMIT) {')
	},
	{
		id: 'M70', expect: 'T28',
		desc: '重试任务里不放掉「在途」标记（第 ③ 道闸门把自己挡住，重试永远起不了跑）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'binding.valuePending = false;\n\t\t\t\t\t\t\tthis.updateRowState(row, binding);',
			'this.updateRowState(row, binding);')
	},
	{
		id: 'M71', expect: 'T29',
		desc: '重试任务不再核对代号（更新的请求接管之后，旧的重试会把这一行一起刷掉）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'if (binding.valueToken !== token) {',
			'if (false) {')
	},
	{
		id: 'M72', expect: 'T30',
		desc: '预览区在进入动画期间不再冻结（动画中整片 replaceChildren = 一帧硬切）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'private refreshPreview(): void {\n\t\tif (this.entering) {',
			'private refreshPreview(): void {\n\t\tif (false) {')
	},
	{
		id: 'M73', expect: 'T30',
		desc: '父层不再通知卡片层「进入动画开始」（冻结闸门永远不会被打开）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'\n\t\tthis.cards.beginEnterAnimation();\n',
			'')
	},
	{
		id: 'M74', expect: 'T31',
		desc: '放弃写入时改成重建行区（触发递归写入，动画期还是一帧硬切）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'this.writingKeys.delete(key);\n\t\tthis.refreshRowStates();',
			'this.writingKeys.delete(key);\n\t\tthis.rebuildRows(0, [], "");')
	},
	{
		id: 'M75', expect: 'T32',
		desc: '重试额度的比较方向反了（第一轮就放弃写入）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'if (rounds < OlympiaOnboardingCards.FLUSH_RETRY_LIMIT) {',
			'if (rounds > OlympiaOnboardingCards.FLUSH_RETRY_LIMIT) {')
	},
	{
		id: 'M76', expect: 'T33',
		desc: 'rewriteIfStale 的第一道早退不 return（不需要补写的值也被排进队列）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'if (intended === undefined || intended === writtenValue) {\n\t\t\treturn;\n\t\t}',
			'if (intended === undefined || intended === writtenValue) {\n\t\t}')
	},
	{
		id: 'M77', expect: 'T34',
		desc: '放弃写入时不摘用户意图（迟到的旧写入会把用户已经不想要的值补写回去）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'this.lastIntended.delete(key);',
			'// (意图留着)')
	},
	{
		id: 'M78', expect: 'T35',
		desc: '「没有值可写」的分支顺手把用户意图也删了（迟到的写入再也补写不回去）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'this.pendingWrites.delete(key);\n\t\t\t\tthis.pendingWriteRounds.delete(key);',
			'this.pendingWrites.delete(key);\n\t\t\t\tthis.lastIntended.delete(key);\n\t\t\t\tthis.pendingWriteRounds.delete(key);')
	},
	{
		id: 'M79', expect: 'T36',
		desc: '定时器句柄在执行队列任务之后才清空（任务里再排一次重试时没人触发，那条链断了）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'this.valueRetryTimer = null;\n\t\t\tconst queue = this.valueRetryQueue.splice(0, this.valueRetryQueue.length);\n\t\t\tfor (const item of queue) {\n\t\t\t\titem();\n\t\t\t}',
			'const queue = this.valueRetryQueue.splice(0, this.valueRetryQueue.length);\n\t\t\tfor (const item of queue) {\n\t\t\t\titem();\n\t\t\t}\n\t\t\tthis.valueRetryTimer = null;')
	},
	{
		// T-029 Q7：T28 原来只断言「不许在终态/重试之外放标记」，
		// 把终态里那一次删掉它照样绿 —— 真空通过。这条补上那个缺口。
		id: 'M80', expect: 'T28',
		desc: '终态只置上 valueFailed 却没放掉「在途」标记（账面上这一行永远是在途；今天靠 valueFailed 短路兜着，那个短路哪天没了就露馅）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\t\t\t\t\t\tbinding.valuePending = false;\n\t\t\t\t\t\t\tbinding.valueFailed = true;',
			'\t\t\t\t\t\t\tbinding.valueFailed = true;')
	},
	{
		// 「不该变红」型变异：证明 T29 判的是**语义**（有没有核对代号），
		// 而不是某一种写法（两个操作数的顺序）。
		id: 'M81', expectGreen: ['T29'],
		desc: '重试任务的代号核对换成等价写法 token !== binding.valueToken —— T29 不该判红',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\t\t\t\t\t\tif (binding.valueToken !== token) {\n\t\t\t\t\t\t\t\t// 已经有更新的一次请求接管了这一行',
			'\t\t\t\t\t\t\tif (token !== binding.valueToken) {\n\t\t\t\t\t\t\t\t// 已经有更新的一次请求接管了这一行')
	},
	{
		id: 'M82', expect: 'T29',
		desc: '重试任务的代号核对把「不等」写成「相等」（更新的请求接管之后，旧的重试照样会动这一行）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\t\t\t\t\t\tif (binding.valueToken !== token) {\n\t\t\t\t\t\t\t\t// 已经有更新的一次请求接管了这一行',
			'\t\t\t\t\t\t\tif (binding.valueToken === token) {\n\t\t\t\t\t\t\t\t// 已经有更新的一次请求接管了这一行')
	},
	{
		// T-029 Q7：T31 原来只黑名单几个固定 API 名，
		// 换用别的整片重建 API 就漏掉了。这条用 innerHTML 赋值来证明扩表有牙。
		id: 'M83', expect: 'T31',
		desc: '放弃写入的收场路径改成整片清空行区（innerHTML 赋值也是整片重建 —— 只列固定 API 名的黑名单会漏掉它）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			"\t\tthis.writingKeys.delete(key);\n\t\tthis.refreshRowStates();",
			"\t\tthis.writingKeys.delete(key);\n\t\tthis.rowArea.innerHTML = '';\n\t\tthis.refreshRowStates();")
	},
	{
		// T-030 Q3：粒子起飞必须晚于卡片消散结束 —— 两者重叠就是重影。
		id: 'M84', expect: 'T37',
		desc: '粒子起飞时刻被拉到卡片消散结束之前（0.60s 之前）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'export const OLYMPIA_ONBOARDING_PARTICLE_START = OLYMPIA_ONBOARDING_DISSOLVE_END;',
			'export const OLYMPIA_ONBOARDING_PARTICLE_START = 0.10;')
	},
	{
		// T-030 Q2：粒子窗口必须盖住最晚一颗粒子的结束时刻。
		id: 'M85', expect: 'T38',
		desc: '粒子飞行窗口缩到盖不住最晚一颗粒子',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'export const OLYMPIA_ONBOARDING_PARTICLE_WINDOW = 2.75;',
			'export const OLYMPIA_ONBOARDING_PARTICLE_WINDOW = 2.00;')
	},
	{
		id: 'M86', expect: 'T39',
		desc: '粒子飞行窗口拖到进入动画结束之后（overlay 摘了粒子还在半空）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'export const OLYMPIA_ONBOARDING_PARTICLE_WINDOW = 2.75;',
			'export const OLYMPIA_ONBOARDING_PARTICLE_WINDOW = 5.50;')
	},
	{
		// T-030 Q6：起跑那一帧 dissolve 还是 1，卡片看得见也点得动。
		id: 'M87', expect: 'T40',
		desc: 'beginEnterAnimation() 不再当场掐断卡片的指针事件',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			"\t\tfor (const element of this.cardElements) {\n\t\t\telement.style.pointerEvents = 'none';\n\t\t}",
			'')
	},
	{
		id: 'M88', expect: 'T41',
		desc: '逐帧写回 pointerEvents 时不再看「进入动画中」',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'const clickable = !this.entering && layout.interactive;',
			'const clickable = layout.interactive;')
	},
	{
		id: 'M89', expect: 'T42',
		desc: 'goto() 的「进入动画中」闸门被拆掉（滚轮/翻页/惯性会拖走正在化掉的卡片）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			"\t\tif (this.entering) {\n\t\t\treturn;\n\t\t}\n\t\tconst target = olympiaOnboardingClamp(index, 0, this.cardElements.length - 1);",
			'\t\tconst target = olympiaOnboardingClamp(index, 0, this.cardElements.length - 1);')
	},
	{
		id: 'M90', expect: 'T43',
		desc: 'window 级 pointermove 不再检查「进入动画中」（拖拽会跟着手指继续跑）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\t\tif (!this.dragging || this.entering) {',
			'\t\t\tif (!this.dragging) {')
	},
	{
		// T-030 Q5：rAF 链只能有一条，句柄必须帧首作废。
		id: 'M91', expect: 'T44',
		desc: 'onFrame 的第一条语句不再是「句柄作废」',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			"\t\tthis.animationFrame = null;\n\t\tif (this.disposed) {",
			'\t\tif (this.disposed) {')
	},
	{
		id: 'M92', expect: 'T45',
		desc: 'dispose() 先摘 DOM 再撤销定时器（链还在跑）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t
			.replace(
				"\tdispose(): void {\n\t\tthis.disposed = true;\n\t\tif (this.animationFrame !== null) {",
				"\tdispose(): void {\n\t\tthis.disposed = true;\n\t\tthis.rootElement.remove();\n\t\tif (this.animationFrame !== null) {")
			.replace(
				"\t\tthis.cards.dispose();\n\t\tthis.backdrop.dispose();\n\t\tthis.rootElement.remove();",
				"\t\tthis.cards.dispose();\n\t\tthis.backdrop.dispose();")
	},
	{
		// T-030 Q1：洞必须晚于首帧兜底层淡出结束。
		id: 'M93', expect: 'T46',
		desc: '首帧兜底层淡出拖长到 1.4s（洞在 1.35s 就开，中间那段工作台裸奔）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace(
			'transition: opacity 240ms ease-out;',
			'transition: opacity 1400ms ease-out;')
	},
	{
		id: 'M94', expect: 'T47',
		desc: '洞的起点不再绑定 OLYMPIA_ONBOARDING_REVEAL_START（配置阶段就开始擦）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'olympiaOnboardingSegment(enterTime, OLYMPIA_ONBOARDING_REVEAL_START, OLYMPIA_ONBOARDING_REVEAL_END)',
			'olympiaOnboardingSegment(enterTime, 0, OLYMPIA_ONBOARDING_REVEAL_END)')
	},
	{
		id: 'M95', expect: 'T48',
		desc: '越界粒子的 local 被夹进 [0,1]（窗口一关粒子永远停在起点）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'\t\t\tconst eased = olympiaOnboardingEaseOutCubic(local);',
			'\t\t\tconst clamped = olympiaOnboardingClamp(local, 0, 1);\n\t\t\tconst eased = olympiaOnboardingEaseOutCubic(clamped);')
	},
	{
		id: 'M96', expect: 'T49',
		desc: '收场不再等进入动画走完（提前摘层 = 硬切）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			"\t\tif (elapsed >= OLYMPIA_ONBOARDING_ENTER_DURATION) {\n\t\t\tthis.finish();\n\t\t}",
			'\t\tthis.finish();')
	},
	{
		// 补两条：钉住 T37 的第二个子判据（delay 必须真的引用起飞常量），
		// 以及 T41 的「取反」写法（写 `entering` 而不是 `!entering` 同样不算数）。
		id: 'M97', expect: 'T37',
		desc: '粒子的 delay 不再引用 OLYMPIA_ONBOARDING_PARTICLE_START（改常量不推迟起飞）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'delay: OLYMPIA_ONBOARDING_PARTICLE_START + (index % 2 === 0 ? 0 : OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET) + olympiaOnboardingHash2(k * 4.7) * 0.42,',
			'delay: olympiaOnboardingHash2(k * 4.7) * 0.42,')
	},
	{
		id: 'M98', expect: 'T41',
		desc: '写回 pointerEvents 的条件把 entering 取反了（进入动画中反而可点）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'const clickable = !this.entering && layout.interactive;',
			'const clickable = this.entering && layout.interactive;')
	},
	{
		id: 'M99', expect: 'T50',
		desc: 'delta 去掉了非负下限（rAF 时间戳倒退时背景时钟会往回走）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000))',
			'Math.min(0.05, (timestamp - this.lastTimestamp) / 1000)')
	},
	{
		id: 'M100', expect: 'T50',
		desc: '背景时钟被直接赋值成 0（时钟归零 → 极光形态瞬间跳回初始帧）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'this.backdropTime += delta;',
			'this.backdropTime = 0;')
	},
	{
		id: 'M101', expect: 'T38',
		desc: '粒子不再分批（delay 去掉晚批推迟 → 开洞时星尘散尽，且窗口判据不再覆盖晚批）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'delay: OLYMPIA_ONBOARDING_PARTICLE_START + (index % 2 === 0 ? 0 : OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET) + olympiaOnboardingHash2(k * 4.7) * 0.42,',
			'delay: OLYMPIA_ONBOARDING_PARTICLE_START + olympiaOnboardingHash2(k * 4.7) * 0.42,')
	},
	{
		id: 'M102', expect: 'T51',
		desc: '第二批推迟量归零（晚批和早批同时起飞 → 等于只有一批，开洞时没有星尘）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'export const OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET = 0.45;',
			'export const OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET = 0.00;')
	},
	{
		id: 'M103', expect: 'T51',
		desc: '第二批推迟量过大（晚批在洞完全打开之后才起飞 → 洞开时一颗星尘都没有）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'export const OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET = 0.45;',
			'export const OLYMPIA_ONBOARDING_PARTICLE_LATE_OFFSET = 2.00;')
	},
	{
		id: 'M104', expect: 'T51',
		desc: '粒子时长基准被压短（晚批最早起飞的那颗活不到开洞开始 → 开洞前半段没星尘）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace(
			'duration: 0.62 + olympiaOnboardingHash2(k * 5.3) * 0.55,',
			'duration: 0.10 + olympiaOnboardingHash2(k * 5.3) * 0.55,')
	},
	{
		id: 'M105', expect: 'T50',
		desc: '背景渲染不用累加出来的时钟（this.backdrop.render(0, ...)）—— 时钟白加，背景仍被别的时间源驱动',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'this.backdrop.render(this.backdropTime, frame.reveal);',
			'this.backdrop.render(0, frame.reveal);')
	},
	{
		id: 'M106', expectGreen: ['T50'],
		desc: 'delta 从 const 改成 let（写法变了，行为一样）—— T50 不该判红',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'const delta = this.lastTimestamp === 0 ? 0 :',
			'let delta = this.lastTimestamp === 0 ? 0 :')
	},
	{
		id: 'M107', expectGreen: ['T50'],
		desc: 'backdropTime 显式标注类型（private backdropTime: number = 0;）—— 写法变了，行为一样，T50 不该判红',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'private backdropTime = 0;',
			'private backdropTime: number = 0;')
	},
	{
		id: 'M108', expect: 'T50',
		desc: 'delta 在定义之后被改写成负数（非负下限被绕过 → rAF 时间戳倒退时背景时钟真的会往回走）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'this.lastTimestamp = timestamp;',
			'this.lastTimestamp = timestamp;\n\t\tdelta = -0.5;')
	},
	{
		// T-031 复审判出的漏网之鱼：T50 只证明「时钟单调」，没证明「时钟跟着真实时间走」。
		// 这三条分别证明：delta 写成固定步长会红、delta 不做毫秒→秒换算会红、
		// 而「用中间变量承接 + * 0.001」这种等价写法不该被误判红。
		id: 'M109', expect: 'T50',
		desc: 'delta 写成固定步长（时钟仍单调，却不再跟随真实时间 —— 60fps 与 144fps 机器流速不同）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'const delta = this.lastTimestamp === 0 ? 0 : Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));',
			'const delta = this.lastTimestamp === 0 ? 0 : Math.min(0.05, Math.max(0, 0.016));')
	},
	{
		id: 'M110', expect: 'T50',
		desc: 'delta 不做毫秒→秒换算（直接用毫秒当秒 → 背景时钟快 1000 倍）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'const delta = this.lastTimestamp === 0 ? 0 : Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));',
			'const delta = this.lastTimestamp === 0 ? 0 : Math.min(0.05, Math.max(0, timestamp - this.lastTimestamp));')
	},
	{
		id: 'M111', expectGreen: ['T50'],
		desc: 'delta 改用中间变量承接 + `* 0.001`（语义等价，不该被判红）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace(
			'const delta = this.lastTimestamp === 0 ? 0 : Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));',
			'const elapsedMs = timestamp - this.lastTimestamp;\n\t\tconst delta = this.lastTimestamp === 0 ? 0 : Math.min(0.05, Math.max(0, elapsedMs * 0.001));')
	},
	{
		id: 'M128', expect: 'T62',
		desc: '把「未保存」标记的刷新挪到 switch 之后（有提前 return 的行就刷不到）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\tthis.updateRowUnsavedState(row, binding);\n\t\tswitch (row.kind) {',
			'\t\tswitch (row.kind) {')
	},
	{
		id: 'M129', expect: 'T63',
		desc: '删掉 handleViewportResize 里的 entering 守卫（进入动画期间还在动布局）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			/\t\tif \(this\.entering\) \{\n\t\t\treturn;\n\t\t\}\n(\t\tthis\.placeCodeCarets\(\);)/,
			'$1')
	},
	{
		id: 'M130', expect: 'T64',
		desc: '跳过按钮文案改回「跳过引导」（点行就写盘了，这个说法会让人以为选择被丢了）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('"跳过剩余引导"', '"跳过引导"')
	},
	{
		id: 'M131', expect: 'T65',
		desc: '卡片层又用选择器取元素了（预览区整片重建，回头找会找到 detached 的旧元素）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\tprivate placeCodeCarets(): void {',
			'\tprivate placeCodeCarets(): void {\n\t\tconst stale = document.querySelector(\'.olympia-onboarding-code\');')
	},
	{
		id: 'M132', expect: 'T61',
		desc: '放弃写入时不再记录「没保存上」（界面回到完全静默）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\t\tthis.unsavedKeys.set(key, reason);\n',
			'')
	},
	{
		id: 'M133', expect: 'T66',
		desc: 'CSS 里删掉「未保存的行把标签变红」的规则（只剩一个不显眼的标记）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace(
			/\.olympia-onboarding-row-unsaved \.olympia-onboarding-row-label \{[^}]*\}/,
			'.olympia-onboarding-row-unsaved .olympia-onboarding-row-label { }')
	},
	{
		id: 'M134', expect: 'T61',
		desc: '「未保存」写成空字符串（记在 map 里但界面上什么都不显示）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			/ localize\('olympia\.onboarding\.row\.unsaved', "未保存"\)/,
			' localize(\'olympia.onboarding.row.unsaved\', "")')
	},
	{
		id: 'M135', expect: 'T67',
		desc: '状态位挂到行容器上而不是行标签里（选项组会被挤开一截）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\t\tlabel.appendChild(status);',
			'\t\t\tcontainer.appendChild(status);')
	},
	{
		id: 'M136', expect: 'T68',
		desc: '写入成功时不撤标记（明明存上了，行上还写着「未保存」）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace(
			'\t\t\t\t// 写进去了，之前那句「没保存上」就不成立了。\n\t\t\t\tthis.unsavedKeys.delete(key);\n',
			'')
	},
	{
		id: 'M112', expect: 'T52',
		desc: '卡片改回 content-box（外框比轨道大 50×42，视觉中心就偏了）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('box-sizing: border-box;', 'box-sizing: content-box;')
	},
	{
		id: 'M113', expect: 'T53',
		desc: '轨道宽度上限改回 352px（与 TS 的外框宽度对不上，相邻两张卡贴死）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('width: min(402px, calc(100vw - 16px));', 'width: min(352px, calc(100vw - 16px));')
	},
	{
		id: 'M114', expect: 'T53',
		desc: 'TS 的卡片外框宽度改回 352（CSS 上限还是 402，间隙算错）',
		file: OL + 'olympiaOnboardingTimeline.ts',
		mutate: t => t.replace('export const OLYMPIA_ONBOARDING_CARD_WIDTH = 402;', 'export const OLYMPIA_ONBOARDING_CARD_WIDTH = 352;')
	},
	{
		id: 'M115', expect: 'T54',
		desc: '卡片写死 352×430（窗口一小就顶出视口）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace(/box-sizing:\s*border-box;\s*width:\s*100%;\s*height:\s*100%;/, 'box-sizing: border-box; width: 352px; height: 430px;')
	},
	{
		id: 'M116', expect: 'T55',
		desc: '轨道改回负 margin 居中（min() 生效后居中值会算错）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace(/transform:\s*translate\(-50%,\s*-50%\s*\);/, 'margin-left: -176px; margin-top: -215px;')
	},
	{
		id: 'M117', expect: 'T56',
		desc: '轨道高度写死 472px（矮窗口里上下都被裁）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace(/height:\s*min\(472px,\s*calc\(100vh\s*-\s*16px\)\s*\);/, 'height: 472px;')
	},
	{
		id: 'M118', expect: 'T57',
		desc: '紧凑模式整体不再隐藏预览块（所有档的 display:none 都删掉）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace(/\.olympia-onboarding-card-preview\s*\{[^}]*?display:\s*none;/g, '.olympia-onboarding-card-preview { display: block;')
	},
	{
		id: 'M119', expect: 'T58',
		desc: '代码盒去掉底部渐隐（裁切处变成硬边，像代码断在一半）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace(/mask-image:\s*linear-gradient\(180deg,[^;]*\)/, '')
	},
	{
		id: 'M120', expect: 'T59',
		desc: '窗口尺寸变化时不再重算光标位置（窗口一变光标就停在看不见的行上）',
		file: OL + 'olympiaOnboarding.ts',
		mutate: t => t.replace('this.cards.handleViewportResize();', '')
	},
	{
		id: 'M121', expect: 'T59',
		desc: '量可视高度改成 offsetHeight（含边框，判不准哪一行看得见）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('code.clientHeight', 'code.offsetHeight')
	},
	{
		id: 'M122', expect: 'T59',
		desc: '量内容总高改成 offsetHeight（分不清「放得下」和「被裁了」）',
		file: OL + 'olympiaOnboardingCards.ts',
		mutate: t => t.replace('code.scrollHeight', 'code.offsetHeight')
	},
	{
		id: 'M123', expect: 'T60',
		desc: '预览里的编译管道图不撑开剩余空间（内容又吊在面板顶部）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace(/\.olympia-onboarding-pipe\s*(\{[^}]*?)flex:\s*1 1 auto;/, '.olympia-onboarding-pipe $1')
	},
	{
		id: 'M124', expectGreen: ['T53'],
		desc: 'min() 两个参数换个顺序（语义等价，T53 不该判红）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('width: min(402px, calc(100vw - 16px));', 'width: min(calc(100vw - 16px), 402px);')
	},
	{
		id: 'M125', expectGreen: ['T52'],
		desc: 'box-sizing 挪到规则末尾（语义等价，T52 不该判红）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace(/box-sizing:\s*border-box;\s*width:\s*100%;\s*height:\s*100%;/, 'width: 100%; height: 100%; box-sizing: border-box;')
	},
	{
		id: 'M126', expect: 'T75',
		desc: '最紧档的断点改成 200px（够不着产品最小窗高 270px，那档等于白写）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('@media (max-height: 320px)', '@media (max-height: 200px)')
	},

	{
		id: 'M127', expect: 'T56',
		desc: '轨道高度按视口宽度夹而不是视口高度（vh 写成 vw，矮窗口里卡片照样顶出去）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('height: min(472px, calc(100vh - 16px));', 'height: min(472px, calc(100vw - 16px));')
	},
	{
		id: 'M137', expect: 'T69',
		desc: '矮窗口档的行区改回可压缩（flex: 0 1 auto）—— 行区被压扁后被 overflow:hidden 静默裁掉',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => replaceInMaxHeightBlock(t, 420, 'flex: 0 0 auto;', 'flex: 0 1 auto;')
	},
	{
		id: 'M138', expect: 'T70',
		desc: '矮窗口档给行区加 min-height: 0（等于允许 flex 把行区压到内容高度以下）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => replaceInMaxHeightBlock(t, 420, 'flex: 0 0 auto;', 'flex: 0 0 auto;\n\t\tmin-height: 0;')
	},
	{
		id: 'M139', expect: 'T71',
		desc: '预览让位档的断点从 385px 改成 200px（断点乱跑，预览在 386~420px 区间又被切成一半）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('@media (max-height: 385px)', '@media (max-height: 200px)')
	},
	{
		id: 'M140', expect: 'T72',
		desc: '预览让位档不再把页脚钉底（margin-top: auto 删掉，中间空一大段）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => replaceInMaxHeightBlock(t, 385, 'margin-top: auto;', '')
	},
	{
		id: 'M141', expect: 'T73',
		desc: '预览让位档把配置行拉开（给行区加 justify-content: space-between）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => replaceInMaxHeightBlock(t, 385, '.olympia-onboarding-card-preview {', '.olympia-onboarding-card-body {\n\t\tjustify-content: space-between;\n\t}\n\n\t.olympia-onboarding-card-preview {')
	},
	{
		id: 'M142', expect: 'T74',
		desc: '最窄档的断点从 320px 改成 500px（档位顺序乱掉，宽断点盖掉窄断点）',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('@media (max-height: 320px)', '@media (max-height: 500px)')
	},
	{
		// 有牙：加一档**提取器认不出来**的紧凑模式。
		//
		// 用 rem 而不是「400 px」是有讲究的：
		//   · `max-height: 400 px`（数字和单位之间有空格）在 CSS 里是**非法**的 ——
		//     浏览器会直接丢掉这条声明，等于这个块根本不存在，模拟不出真实风险；
		//   · `max-height: 26rem` 是**合法**的（媒体查询支持 em/rem 长度），
		//     浏览器会照常应用它 —— 于是这一档在真机上真的生效，
		//     而只认 px 的提取器对它**完全失明**：T57/T69~T75 照样全绿。
		// 这正是 T82 要堵的洞：紧凑档必须用 px，否则它对断言隐形。
		//
		// 判定只看 T82 变红 —— T74/T75 仍绿（提取器看不到这一档，所以档位序列没变），
		// 正好说明「别的断言看不出来，只有 T82 看出来了」。
		id: 'M143', expect: 'T82',
		desc: '新增一档用 rem 单位的紧凑模式（@media (max-height: 26rem)）—— 提取器只认 px，于是这一档对 T57/T69~T75 完全隐形',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace(
			'@media (max-height: 320px) {',
			'@media (max-height: 26rem) {\n\t.olympia-onboarding-card-body {\n\t\tpadding: 0;\n\t}\n}\n\n@media (max-height: 320px) {')
	},
	{
		// 不误伤：把窄档换成**语义等价**的写法（多了 `screen and`），
		// 提取器必须照样认出来 —— 否则「换个写法」就会让整套紧凑档断言集体失效。
		//
		// 这条同时是加固提取器的存在理由：老提取器只认 `@media (` 紧跟 max-height，
		// 遇到 `@media screen and (...)` 会漏检 → T82 会红 → 逼着人把提取器修好。
		id: 'M144',
		expectGreen: ['T57', 'T69', 'T70', 'T71', 'T72', 'T73', 'T74', 'T75', 'T82'],
		desc: '最窄档换成等价写法 @media screen and (max-height: 320px) —— 紧凑档断言判的是语义，不该因为换个写法就变红',
		file: OL + 'media/olympiaOnboarding.css',
		mutate: t => t.replace('@media (max-height: 320px) {', '@media screen and (max-height: 320px) {')
	},
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
