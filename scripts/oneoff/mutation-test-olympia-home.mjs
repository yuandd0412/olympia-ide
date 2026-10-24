#!/usr/bin/env node
// 变异测试：验证 check-olympia-home.mjs 的断言**真的能抓住回归**。
//
// 一套断言全绿，只说明「当前代码符合当前断言」。如果断言本身写错了
// （锚点落在定义处而不是使用处、扫描范围把被测对象自己算进去、规则太松、
//  命中文档注释而不是代码），它照样全绿，却一点用都没有。
//
// 唯一能回答「这条断言有没有用」的，是**变异测试**：故意把代码改坏，
// 看对应的那条断言是否变红。
//
// 做法：
//   1. 把体检脚本需要的文件复制到临时目录，做成一个最小可运行的假仓库；
//   2. 跑一次体检 → 必须全绿（证明基线是干净的）；
//   3. 逐个施加变异（把正确实现改坏）→ 对应的那条断言必须变红；
//   4. 任何一条变异没被抓住，就是一条假断言，报出来；
//   5. 收尾时校验临时树里每个文件的 sha256 与基线逐字节一致。
//
// ## 副本为什么是「精简的」而不是整个 oss/src
//
// E5 断言要扫 oss/src/vs/workbench 下**全部** .ts（4448 个文件）。整树复制每条变异
// 都要复制一遍，代价不可接受。所以这里复制的是：
//
//   - 体检脚本显式点名的 11 个文件；
//   - oss/extensions/*/package.json（E4 要读，每个都很小）；
//   - oss/src/vs/workbench 的**子集**：含任一「首页引用的内核命令 id」字面量的文件
//     ∪ 体检脚本显式点名的文件（E5 要扫）。
//
// 这个子集必须让基线**真的绿**（本脚本会验证）—— 否则说明子集不够，
// 基线红了就分不清是「代码有问题」还是「副本缺东西」。
//
// ## 它已经抓到过什么
//
// 2026-10-24 首跑：
//   - B3 是**假断言**。`OLYMPIA_HOME_COMMAND_ID` 定义在 olympiaHomeView.ts，
//     而原实现去 olympiaHome.contribution.ts 里找它 —— 永远找不到，恒红。
//     上游侧又用「文件里第一个 executeCommand('...')」取值，可能取到别的分支。
//     已修：定义、注册、拦截三处分别取，并锚定在拦截分支内部。
//   - D7 是**假断言**。上游用的是 h() 的选择器形态 `h('.olympia-home-slot@homeSlot')`，
//     class 名带点号、没有独立引号；原实现找带引号的裸字面量，永远找不到。
//     已修：改成「class 选择器 + 边界 + 必须是 h() 用法」。
//   - E5 是**假断言**。扫描范围包含 contrib/olympia/ —— 而首页自己的
//     olympiaHomeView.ts 里就写着那些命令 id，于是这条断言在拿我们的声明跟它自己比，
//     恒绿。已修：排除 contrib/olympia/（与设置页那边 D4 同一个坑）。
//
// 2026-10-24 第二轮（空编辑区改成「内核扩展点」之后）：
//   - D 组整体重写。原实现是「内核直接 import contrib」，但上游 eslint 的
//     `code-import-patterns` 对 `src/vs/workbench/~` 只放行 services 层，
//     contrib 只有测试文件才放行 —— core→contrib 那一版根本过不了 lint。
//     现在的契约是：内核在 `services/editor/browser/editorEmptyStateService.ts`
//     暴露扩展点，contrib 注册渲染器，内核按需渲染。
//   - 门禁的 D7 与 F2 **完全重复**（都查「olympiaHomeEmptyState.ts 里有没有
//     createOlympiaHomeView( 的调用」）。已删掉 D7，F2 保留，D8/D9 顺延为 D7/D8。
//   - 原 M21（改上游的槽位 class）作废：槽位 class 现在是内核自己的内部约定，
//     contrib 拿到的是容器节点本身，两边不再需要对齐字符串 —— 改成 M44
//     「内核直接 import contrib」，这条守住分层红线。
//
// 用法：node scripts/oneoff/mutation-test-olympia-home.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { stripComments, stripTsComments } from './lib/ts-lexer.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..', '..');
const CHECK_SCRIPT = path.join(REPO, 'scripts', 'oneoff', 'check-olympia-home.mjs');

const OL = 'oss/src/vs/workbench/contrib/olympia/browser/';

/** 体检脚本显式点名的文件。 */
const EXPLICIT = [
	OL + 'olympiaHomeView.ts',
	OL + 'olympiaHomeEmptyState.ts',
	OL + 'olympiaHome.contribution.ts',
	OL + 'olympiaHomeInterceptor.ts',
	OL + 'media/olympiaHome.css',
	OL + 'olympiaWelcomePage.ts',
	OL + 'olympiaWelcome.contribution.ts',
	'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts',
	'oss/src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts',
	'oss/src/vs/workbench/browser/parts/editor/media/editorgroupview.css',
	'oss/src/vs/workbench/services/editor/browser/editorEmptyStateService.ts',
	'oss/src/vs/workbench/workbench.common.main.ts',
	'oss/src/vs/base/common/codiconsLibrary.ts',
	'oss/build/lib/stylelint/vscode-known-variables.json'
];

const WB_ROOT = path.join(REPO, 'oss', 'src', 'vs', 'workbench');

/**
 * 首页引用的内核命令 id（与体检脚本 E5 同一份口径）。
 *
 * 这几个 id 必须在上游（排除 contrib/olympia/）能找到注册点，
 * 否则首页上的入口点了没反应。
 */
const CORE_COMMAND_IDS = [
	'workbench.action.files.newUntitledFile',
	'workbench.action.files.openFolder',
	'workbench.action.showCommands',
	'workbench.action.openSettings'
];

/**
 * 挑出 oss/src/vs/workbench 里需要复制进副本的子集。
 *
 * 规则：含任一「首页引用的内核命令 id」字面量的文件。
 *
 * **必须排除 contrib/olympia/**：那是我们自己的代码；体检脚本的 E5 也把它排除在外，
 * 把它算进来会让 E5 在副本里走另一条路径（拿我们的声明跟它自己对）。
 */
function pickWorkbenchSubset(coreIds) {
	const out = new Set();
	const stack = [WB_ROOT];
	while (stack.length) {
		const dir = stack.pop();
		let entries = [];
		try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
		for (const e of entries) {
			const abs = path.join(dir, e.name);
			if (e.isDirectory()) { stack.push(abs); continue; }
			if (!e.isFile() || !e.name.endsWith('.ts')) { continue; }
			const rel = path.relative(REPO, abs).split(path.sep).join('/');
			if (rel.includes('/contrib/olympia/')) { continue; }
			let text = '';
			try { text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
			if (coreIds.some(k => text.includes(`'${k}'`))) {
				out.add(rel);
			}
		}
	}
	return [...out].sort();
}

/** 所有内置扩展的 package.json（E4 要读）。 */
function extensionPackageFiles() {
	const dir = path.join(REPO, 'oss', 'extensions');
	const out = [];
	let entries = [];
	try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
	for (const e of entries) {
		if (!e.isDirectory()) { continue; }
		const f = path.join(dir, e.name, 'package.json');
		if (fs.existsSync(f)) { out.push(`oss/extensions/${e.name}/package.json`); }
	}
	return out.sort();
}

function sha256(abs) {
	return createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

/**
 * 变异清单：每条说明「把什么改坏」+「哪条断言必须因此变红」。
 * mutate 返回值必须与入参不同，否则判「锚点没命中」。
 *
 * 锚点要落在**代码**上，不能落在文档注释上。注释里同样会出现
 * `olympia.openHome` 这种字符串，先匹配到注释等于这一条变异白做。
 */
const MUTATIONS = [
	// --- A：文件存在 + 版权头 ---------------------------------------------
	{
		id: 'M1', expect: 'A1',
		desc: '把首页视图清空',
		file: OL + 'olympiaHomeView.ts',
		mutate: t => ''
	},
	{
		id: 'M2', expect: 'A9', rawText: true,
		desc: '把判据模块的版权头起始行改掉（**rawText**：版权头本身就是块注释，剥注释后看不见 —— 守卫会误拦）',
		file: OL + 'olympiaHomeInterceptor.ts',
		// 注意：不能只少一个 `-` —— `startsWith('/*---')` 仍然成立，A9 不会红。
		// 要把块注释起始 `/*` 换成行注释 `//`，第 1 行才真的不再是「Microsoft 版权头起始行」。
		mutate: t => t.replace('/*---------------------------------------------------------------------------------------------',
			'//--------------------------------------------------------------------------------------------')
	},

	// --- B：「帮助 > 欢迎」劫持点 -----------------------------------------
	{
		id: 'M3', expect: 'B1',
		desc: '删掉上游文件里的劫持调用',
		file: 'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts',
		mutate: t => t.replace(
			`if (olympiaShouldInterceptWelcome({ walkthroughID, optionsOrToSide })) {
			commandService.executeCommand('olympia.openHome');
			return;
		}`,
			`if (false) {
			return;
		}`)
	},
	{
		id: 'M4', expect: 'B2',
		desc: '劫持分支执行错命令',
		file: 'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts',
		mutate: t => t.replace("executeCommand('olympia.openHome')", "executeCommand('olympia.openHomeTypo')")
	},
	{
		id: 'M5', expect: 'B3',
		desc: '命令 id 在视图侧与上游侧不一致（改了一处忘了另一处 —— 静默的行为漂移）',
		file: OL + 'olympiaHomeView.ts',
		mutate: t => t.replace("export const OLYMPIA_HOME_COMMAND_ID = 'olympia.openHome';",
			"export const OLYMPIA_HOME_COMMAND_ID = 'olympia.openHomeV2';")
	},
	{
		id: 'M6', expect: 'B4',
		desc: '拆掉原生逃生口（GettingStartedInput.RESOURCE 引用不见了 —— 用户再也打不开上游那套演练）',
		file: 'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts',
		// 注意：GettingStartedInput.RESOURCE 在上游文件里出现**两次**（两个 EditorResolver 注册点），
		// 只改第一处的话第二处还在，B4 照样绿 —— 必须全改。
		mutate: t => t.replace(/GettingStartedInput\.RESOURCE/g, 'GettingStartedInput.BROKEN')
	},
	{
		id: 'M7', expect: 'B5',
		desc: '劫持分支执行完没有 return（会继续往下走进原生分支，两处都开）',
		file: 'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts',
		mutate: t => t.replace(
			`			commandService.executeCommand('olympia.openHome');
			return;`,
			`			commandService.executeCommand('olympia.openHome');`)
	},
	{
		id: 'M8', expect: 'B6',
		desc: '上游不再 import 判据模块（判据被换掉了）',
		file: 'oss/src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.contribution.ts',
		mutate: t => t.replace(
			"import { olympiaShouldInterceptWelcome } from '../../olympia/browser/olympiaHomeInterceptor.js';",
			'')
	},
	{
		id: 'M9', expect: 'B7',
		desc: '给零 import 的判据模块加一条 import（可能形成依赖环）',
		file: OL + 'olympiaHomeInterceptor.ts',
		mutate: t => t.replace('export interface IOlympiaWelcomeArgs {',
			"import { something } from '../../../../base/common/doesNotMatter.js';\n\nexport interface IOlympiaWelcomeArgs {")
	},

	// --- C：真跑判据的真值表 ----------------------------------------------
	{
		id: 'M10', expect: 'C1',
		desc: '判据函数的参数名改了（抠取正则抠不出来）',
		file: OL + 'olympiaHomeInterceptor.ts',
		mutate: t => t.replace(
			'export function olympiaShouldInterceptWelcome(args: IOlympiaWelcomeArgs): boolean {',
			'export function olympiaShouldInterceptWelcome(opts: IOlympiaWelcomeArgs): boolean {')
	},
	{
		id: 'M11', expect: 'C2',
		desc: '判据永远返回 false（无参也不接管 —— 用户点「帮助 > 欢迎」毫无反应）',
		file: OL + 'olympiaHomeInterceptor.ts',
		mutate: t => t.replace(
			'return args.walkthroughID === undefined && args.optionsOrToSide === undefined;',
			'return false;')
	},
	{
		id: 'M12', expect: 'C3',
		desc: '判据忽略 walkthroughID（点某一步的演练也被改道 —— 用户被丢在首页上）',
		file: OL + 'olympiaHomeInterceptor.ts',
		mutate: t => t.replace(
			'return args.walkthroughID === undefined && args.optionsOrToSide === undefined;',
			'return args.optionsOrToSide === undefined;')
	},
	{
		id: 'M13', expect: 'C5',
		desc: '判据忽略 optionsOrToSide（调用方说「开在侧边」也被悄悄改掉）',
		file: OL + 'olympiaHomeInterceptor.ts',
		mutate: t => t.replace(
			'return args.walkthroughID === undefined && args.optionsOrToSide === undefined;',
			'return args.walkthroughID === undefined;')
	},
	{
		id: 'M14', expect: 'C4',
		desc: '判据只检查第一个参数（带 walkthrough id+step 的对象形态也被接管）',
		file: OL + 'olympiaHomeInterceptor.ts',
		// 注意：`||` 会让「两个参数都带」这一组仍然返回 false（C8 保持绿），
		// 真正变红的是「只带 walkthrough id」和「只带对象形态」那几组。
		// 这里挑 C4（id+step 对象形态）作为期望 —— 它是最容易被漏判的一组。
		mutate: t => t.replace(
			'return args.walkthroughID === undefined && args.optionsOrToSide === undefined;',
			'return args.walkthroughID === undefined || args.optionsOrToSide === undefined;')
	},

	// --- D：空编辑区接管 ---------------------------------------------------
	{
		id: 'M15', expect: 'D1',
		desc: '内核不再查询扩展点（空编辑区永远不会用上自定义渲染器）',
		file: 'oss/src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts',
		mutate: t => t.replace(
			'const renderer = getEditorEmptyStateRenderer();',
			'const renderer = undefined as IEditorEmptyStateRenderer | undefined;')
	},
	{
		id: 'M16', expect: 'D2',
		desc: '内核不再从 services 层 import 扩展点（契约被拆了）',
		file: 'oss/src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts',
		mutate: t => t.replace(
			"import { getEditorEmptyStateRenderer, IEditorEmptyStateRenderer, onDidChangeEditorEmptyStateRenderer } from '../../../services/editor/browser/editorEmptyStateService.js';",
			'')
	},
	{
		id: 'M17', expect: 'D3',
		desc: '上游 watermark 节点没被藏起来（VS Code 大 logo 会和首页同时出现）',
		file: 'oss/src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts',
		mutate: t => t.replace("this.watermark.style.display = 'none';", "this.watermark.style.display = '';")
	},
	{
		id: 'M18', expect: 'D4',
		desc: '内核不监听渲染器变化事件（渲染器注册晚了就永远不生效）',
		file: 'oss/src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts',
		mutate: t => t.replace(
			'this._register(onDidChangeEditorEmptyStateRenderer(() => this.render()));',
			'/* removed */')
	},
	{
		id: 'M42', expect: 'D7',
		desc: '空编辑区开关的默认值改成 false（默认不显示首页 —— 这次改完用户看不到任何变化）',
		file: OL + 'olympiaWelcome.contribution.ts',
		mutate: t => t.replace(
			`[OLYMPIA_HOME_EMPTY_STATE_CONFIGURATION_KEY]: {
			scope: ConfigurationScope.RESOURCE,
			type: 'boolean',
			default: true,`,
			`[OLYMPIA_HOME_EMPTY_STATE_CONFIGURATION_KEY]: {
			scope: ConfigurationScope.RESOURCE,
			type: 'boolean',
			default: false,`)
	},
	{
		id: 'M19', expect: 'D5',
		desc: '上游原生 watermark 的渲染路径没有调用点了（关掉开关退不回去 —— 逃生口是死的）',
		file: 'oss/src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts',
		mutate: t => t.replace('this.renderUpstreamWatermark();', '/* removed */')
	},
	{
		id: 'M20', expect: 'D6',
		desc: 'contrib 侧 import 的扩展点路径写错了（内核与 contrib 指向两个不同的扩展点）',
		file: OL + 'olympiaHomeEmptyState.ts',
		mutate: t => t.replace(
			"'../../../services/editor/browser/editorEmptyStateService.js'",
			"'../../../services/editor/browser/editorEmptyStateServiceTypo.js'")
	},
	{
		id: 'M41', expect: 'D7',
		desc: '配置键的字面量写错了（设置里改不到这个开关 —— 永远只有默认值）',
		file: OL + 'olympiaHomeEmptyState.ts',
		mutate: t => t.replace(
			"export const OLYMPIA_HOME_EMPTY_STATE_CONFIGURATION_KEY = 'olympia.home.emptyState';",
			"export const OLYMPIA_HOME_EMPTY_STATE_CONFIGURATION_KEY = 'olympia.home.emptyStateTypo';")
	},
	{
		id: 'M43', expect: 'D8',
		desc: '内核 CSS 里槽位规则没了绝对定位（首页在编辑区里会被上游 watermark 顶到下面去）',
		file: 'oss/src/vs/workbench/browser/parts/editor/media/editorgroupview.css',
		mutate: t => t.replace(
			`> .editor-group-empty-state {
	position: absolute;`,
			`> .editor-group-empty-state {`)
	},
	{
		id: 'M44', expect: 'D2',
		desc: '内核直接 import contrib（违反上游分层规则 —— eslint 会拦下来）',
		file: 'oss/src/vs/workbench/browser/parts/editor/editorGroupWatermark.ts',
		mutate: t => t.replace(
			"import { getEditorEmptyStateRenderer, IEditorEmptyStateRenderer, onDidChangeEditorEmptyStateRenderer } from '../../../services/editor/browser/editorEmptyStateService.js';",
			"import { getEditorEmptyStateRenderer, IEditorEmptyStateRenderer, onDidChangeEditorEmptyStateRenderer } from '../../../services/editor/browser/editorEmptyStateService.js';\nimport { createOlympiaEmptyStateRenderer } from '../../../contrib/olympia/browser/olympiaHomeEmptyState.js';")
	},

	// --- E：首页入口 -------------------------------------------------------
	{
		id: 'M22', expect: 'E2',
		desc: '首页少一个入口（砍到 7 个）',
		file: OL + 'olympiaHomeView.ts',
		mutate: t => t.replace(
			`	{
		id: 'practice-list',
		label: localize('olympia.home.action.practiceList', "集训清单"),
		description: localize('olympia.home.action.practiceList.desc', "管理自己的练习清单"),
		command: 'olympia.practice.open',
		icon: Codicon.listUnordered,
	},
`, '')
	},
	{
		id: 'M23', expect: 'E3',
		desc: '某个入口没有图标了（界面上是个空格子）',
		file: OL + 'olympiaHomeView.ts',
		mutate: t => t.replace('\t\ticon: Codicon.listUnordered,\n', '')
	},
	{
		id: 'M24', expect: 'E4',
		desc: '首页指向一个内置扩展里没有声明的命令（点这个入口没反应）',
		file: OL + 'olympiaHomeView.ts',
		mutate: t => t.replace("command: 'olympia.practice.open',", "command: 'olympia.practice.openTypo',")
	},
	{
		id: 'M25', expect: 'E5',
		desc: '首页指向一个上游没有注册点的内核命令（点这个入口没反应）',
		file: OL + 'olympiaHomeView.ts',
		mutate: t => t.replace("command: 'workbench.action.showCommands',", "command: 'workbench.action.showCommandsTypo',")
	},
	{
		id: 'M26', expect: 'E6',
		desc: '首页页脚的「完整设置」不指向原生设置页了（用户从首页找不到完整设置）',
		file: OL + 'olympiaHomeView.ts',
		mutate: t => t.replace("options.runCommand('workbench.action.openSettings2')", "options.runCommand('workbench.action.openSettings')")
	},
	{
		id: 'M27', expect: 'E7',
		desc: '首页用了一个不存在的 codicon（图标显示成空格子）',
		file: OL + 'olympiaHomeView.ts',
		mutate: t => t.replace('icon: Codicon.listUnordered,', 'icon: Codicon.listUnorderedTypo,')
	},
	{
		id: 'M28', expect: 'E8',
		desc: '首页视图用了 querySelector（上游 eslint 的 no-restricted-syntax 会把它判红）',
		file: OL + 'olympiaHomeView.ts',
		mutate: t => t.replace(
			'const root = document.createElement(\'div\');',
			'const root = document.querySelector(\'.olympia-home\');')
	},

	// --- F：三处落点共用同一份视图 -----------------------------------------
	{
		id: 'M29', expect: 'F1',
		desc: '开始页不再用共享首页视图（内容和空编辑区长成两套 UI）',
		file: OL + 'olympiaWelcomePage.ts',
		mutate: t => t.replace(
			`this.container.appendChild(createOlympiaHomeView({
			runCommand: command => runOlympiaHomeCommand(this.commandService, this.notificationService, command)
		}));`,
			'this.container.textContent = \'Olympia\';')
	},
	{
		id: 'M30', expect: 'F2',
		desc: '空编辑区不再用共享首页视图（内容和开始页长成两套 UI）',
		file: OL + 'olympiaHomeEmptyState.ts',
		// 注意：判据查的是「这个文件里有没有 createOlympiaHomeView( 的调用」，
		// 所以这里改的必须是**调用处**。改 import 语句没用 —— 调用还在。
		mutate: t => t.replace(
			'createOlympiaHomeView({',
			'createOlympiaHomeViewTypo({')
	},
	{
		id: 'M31', expect: 'F3',
		desc: '「打开 Olympia 首页」命令不再打开开始页那个 EditorInput（首页和开始页变成两个页面）',
		file: OL + 'olympiaHome.contribution.ts',
		// 注意：OlympiaWelcomeInput 在这个文件里出现**两次**（import + createInstance），
		// 只改第一处的话第二处还在，F3 照样绿 —— 必须全改。
		mutate: t => t.replace(/OlympiaWelcomeInput/g, 'SomeOtherInput')
	},
	{
		id: 'M32', expect: 'F4',
		desc: 'workbench.common.main.ts 里不再 import 首页贡献（命令根本不会被注册）',
		file: 'oss/src/vs/workbench/workbench.common.main.ts',
		mutate: t => t.replace("import './contrib/olympia/browser/olympiaHome.contribution.js';", '')
	},
	{
		id: 'M33', expect: 'F5',
		desc: '首页贡献的注册排到了欢迎贡献之前（启动时首页先于开始页就绪，会闪一下）',
		file: 'oss/src/vs/workbench/workbench.common.main.ts',
		// 注意：这两个 import **不相邻**（中间夹着 settings / onboarding 的），
		// 所以不能按「连续两行」去匹配 —— 得分别取出两行再换位置。
		mutate: t => {
			const welcomeLine = "import './contrib/olympia/browser/olympiaWelcome.contribution.js';";
			const homeLine = "import './contrib/olympia/browser/olympiaHome.contribution.js';";
			if (!t.includes(welcomeLine) || !t.includes(homeLine)) { return t; }
			// 把 home 那行删掉，再插到 welcome 那行**前面**。
			const withoutHome = t.replace(homeLine + '\n', '');
			return withoutHome.replace(welcomeLine, homeLine + '\n' + welcomeLine);
		}
	},

	// --- G：CSS 红线 -------------------------------------------------------
	{
		id: 'M34', expect: 'G1',
		desc: 'CSS 里出现 class substring 选择器（workbench CSS 红线）',
		file: OL + 'media/olympiaHome.css',
		mutate: t => t.replace('.olympia-home-card {', '.olympia-home [class*="card"] {')
	},
	{
		id: 'M35', expect: 'G2',
		desc: 'CSS 里出现 :has()（workbench CSS 红线）',
		file: OL + 'media/olympiaHome.css',
		mutate: t => t.replace('.olympia-home-card {', '.olympia-home:has(.olympia-home-card) {')
	},
	{
		id: 'M36', expect: 'G3',
		desc: 'CSS 里出现硬编码颜色（主题切换时颜色对不上）',
		file: OL + 'media/olympiaHome.css',
		mutate: t => t.replace('color: var(--vscode-foreground);', 'color: #cccccc;')
	},
	{
		id: 'M37', expect: 'G4',
		desc: 'CSS 里用一个不在 stylelint 名单里的变量（上游 stylelint 会把它判成硬错误）',
		file: OL + 'media/olympiaHome.css',
		mutate: t => t.replace('var(--vscode-foreground)', 'var(--vscode-notARealVariableName)')
	},
	{
		id: 'M38', expect: 'G5',
		desc: 'CSS 里出现 transition（workbench 动画只允许 transform / opacity）',
		file: OL + 'media/olympiaHome.css',
		mutate: t => t.replace('.olympia-home-card {', '.olympia-home-card {\n\ttransition: all 0.2s ease;')
	},

	// --- 元变异 --------------------------------------------------------------
	{
		id: 'M39', expectGreen: ['C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'],
		desc: '判据换成等价写法（=== undefined 改成 typeof 判断）—— 语义没变，C 组必须保持绿（证明它判的是行为不是写法）',
		file: OL + 'olympiaHomeInterceptor.ts',
		mutate: t => t.replace(
			'return args.walkthroughID === undefined && args.optionsOrToSide === undefined;',
			"return typeof args.walkthroughID === 'undefined' && typeof args.optionsOrToSide === 'undefined';")
	},
	{
		id: 'M40', expectGuardHit: true,
		desc: '元变异：锚点故意落在文档注释上 —— 必须被「只打到注释」守卫拦住',
		file: OL + 'olympiaHomeInterceptor.ts',
		// 注释里提到了 `walkthroughID`；改它只会动到注释，代码一行没变。
		mutate: t => t.replace('`walkthroughID !== undefined`', '`walkthroughID !== undefinedX`')
	}
];

// ---------------------------------------------------------------------------
// 建副本
// ---------------------------------------------------------------------------
const NEEDED = [
	...EXPLICIT,
	...extensionPackageFiles(),
	...pickWorkbenchSubset(CORE_COMMAND_IDS)
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
	if (rel.endsWith('.mjs')) {
		return stripTsComments(text);
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia-home-mutation-'));
let failures = 0;

try {
	buildTree(tmp);

	const base = runCheck(tmp);
	if (base.exit !== 0) {
		console.log('基线不干净 —— 体检脚本在未变异的树上就红了：');
		console.log(base.out.split(/\r?\n/).filter(l => /^(FAIL|MISSING)/.test(l)).join('\n'));
		console.log('（如果是 E5 红了，说明副本里的 workbench 子集不够 —— 补 pickWorkbenchSubset 的规则）');
		process.exit(1);
	}
	const total = base.out.match(/合计 (\d+) 条断言/)?.[1] ?? '?';
	console.log(`基线 OK：${total} 条断言全绿（副本 ${NEEDED.length} 个文件）`);

	// 基线哈希：收尾时要逐字节核对。
	const baselineHashes = new Map();
	for (const rel of NEEDED) {
		baselineHashes.set(rel, sha256(path.join(tmp, ...rel.split('/'))));
	}

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
		// 剥掉注释后完全相同 ⇒ 只打到了注释 ⇒ 直接判 FAIL，
		// 不再往下跑（跑下去只会得到一条误导性的「断言抓不住」的结论）。
		//
		// 例外：`rawText: true` 的变异**故意**改的是原始文本（版权头之类）。
		// 版权头断言（A6~A9）判的就是注释本身，走的是 loadRaw 而不是剥注释后的文本，
		// 所以对这类变异来说「只打到注释」正是**预期结果**，不能拿守卫去拦。
		if (!mut.rawText) {
			const codeBefore = stripForFile(mut.file, text);
			const codeAfter = stripForFile(mut.file, changed);
			if (codeBefore === codeAfter) {
				if (mut.expectGuardHit) {
					console.log(`PASS ${mut.id} ${mut.desc} → 如期被「只打到注释」守卫拦下`);
					continue;
				}
				console.log(`FAIL ${mut.id} 变异只打到了注释、没改到代码 —— ${mut.desc}`);
				failures++;
				continue;
			}
			if (mut.expectGuardHit) {
				console.log(`FAIL ${mut.id} 元变异竟然改到了代码 —— 「只打到注释」守卫失效了`);
				failures++;
				continue;
			}
		} else if (mut.expectGuardHit) {
			console.log(`FAIL ${mut.id} 元变异不该标 rawText —— 守卫自检失效`);
			failures++;
			continue;
		}
		fs.writeFileSync(abs, changed);
		const res = runCheck(tmp);
		fs.writeFileSync(abs, text);   // 还原

		// 「不该变红」型变异：证明断言判的是**语义**，而不是某种写法。
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

	// 收尾：副本里每个文件都必须和基线逐字节一致。
	const drifted = [];
	for (const [rel, hash] of baselineHashes) {
		const abs = path.join(tmp, ...rel.split('/'));
		let now = null;
		try { now = sha256(abs); } catch { now = null; }
		if (now !== hash) {
			drifted.push(rel);
		}
	}
	if (drifted.length > 0) {
		console.log(`FAIL 收尾校验：${drifted.length} 个文件还原后与基线不一致：${drifted.slice(0, 5).join(', ')}`);
		failures++;
	} else {
		console.log(`PASS 收尾校验：${baselineHashes.size} 个文件还原后 sha256 与基线逐字节一致`);
	}
} finally {
	fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(failures ? `\n变异测试失败 ${failures} 条` : '\n变异测试全部通过');
process.exit(failures ? 1 : 0);
