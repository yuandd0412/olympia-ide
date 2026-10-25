#!/usr/bin/env node
// 变异测试：验证 check-olympia-settings-page.mjs 的断言**真的能抓住回归**。
//
// 一套断言全绿，只说明「当前代码符合当前断言」。如果断言本身写错了
// （锚点落在使用处而不是定义处、扫描范围把被测对象自己算进去、规则太松、
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
// D4 断言要扫 oss/src/vs 下**全部** .ts（9455 个文件 / 126 MB）。整树复制每条变异
// 都要复制一遍，代价不可接受。所以这里复制的是：
//
//   - 体检脚本显式点名的 8 个文件；
//   - oss/extensions/*/package.json（D3 要读，每个都很小）；
//   - oss/src/vs 的**子集**：含任一「上游 key 字面量」的文件 ∪ 路径含 config 的文件
//     （137 个 / 2.65 MB）。
//
// 这个子集必须让基线**真的绿**（本脚本会验证）—— 否则说明子集不够，
// 基线红了就分不清是「代码有问题」还是「副本缺东西」。
//
// ## 它已经抓到过什么
//
// 2026-10-24 首跑：
//   - D4 是**假断言**。它扫 oss/src/vs，而我们自己写的 schema 文件
//     （contrib/olympia/browser/olympiaSettingsSchema.ts）就在这个范围里，
//     且每个 key 都以 `key: 'xxx'` 写在里面 —— 于是「在 oss/src 里找得到这个字面量」
//     永远成立，断言在拿我们的声明跟它自己比。已修：扫描范围排除 contrib/olympia/。
//     变异 M19 就是这条修复的守门人。
//   - B2 是**假红**。`SETTINGS_COMMAND_OPEN_SETTINGS` 在上游文件里出现两次
//     （常量声明 + 动作 id 使用），原实现用 indexOf 取到的是声明那处，
//     切片在 registerAction2 处就结束，根本没覆盖到 run() 体。已修：锚定 `id:` 使用处。
//
// 用法：node scripts/oneoff/mutation-test-olympia-settings-page.mjs
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
const CHECK_SCRIPT = path.join(REPO, 'scripts', 'oneoff', 'check-olympia-settings-page.mjs');

const OL = 'oss/src/vs/workbench/contrib/olympia/browser/';

/** 体检脚本显式点名的文件。 */
const EXPLICIT = [
	OL + 'olympiaSettingsInput.ts',
	OL + 'olympiaSettingsPage.ts',
	OL + 'olympiaSettingsSchema.ts',
	OL + 'olympiaSettings.contribution.ts',
	OL + 'olympiaSettingsInterceptor.ts',
	OL + 'media/olympiaSettings.css',
	'oss/src/vs/workbench/contrib/preferences/browser/preferences.contribution.ts',
	'oss/src/vs/workbench/workbench.common.main.ts',
	// 字体枚举住在扩展宿主：体检脚本要读这三处（命令 id 的单一真源 / 命令注册 / 枚举实现）。
	// oss/extensions/*/package.json 由 extensionPackageFiles() 自动带上。
	'oss/extensions/olympia-onboarding/src/commands.ts',
	'oss/extensions/olympia-onboarding/src/extension.ts',
	'oss/extensions/olympia-onboarding/src/systemFonts.ts'
];

const SRC_ROOT = path.join(REPO, 'oss', 'src', 'vs');

/**
 * 在 CSS 里替换某个选择器的规则块内容。
 *
 * 与体检脚本的 cssRule() 同一口径：选择器必须在**行首**（可带缩进），
 * 于是文件头「说明为什么这么写」的注释行（行首是 ` * `）天然不会被误伤。
 *
 * 只处理不含嵌套花括号的规则块 —— 本文件的 CSS 没有 @media 之类的嵌套。
 */
function cssRuleMutate(t, selector, replacer) {
	const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp('((?:^|[}\\n])[ \\t]*' + esc + '[ \\t]*\\{)([^}]*)(\\})');
	return t.replace(re, (m, head, body, tail) => head + replacer(body) + tail);
}

/**
 * 在某个 at-rule（如 `@container (max-width: 520px)`）块内的**指定选择器规则**里换字面量。
 *
 * 为什么要限定作用域：同一个字面量在文件里会出现多次 ——
 * `flex-wrap: wrap` 同时存在于 `.olympiaSettings-row`（基础规则）和
 * @container 里的 `.olympiaSettings-nav`。不限定就打到了错误的规则上，
 * 变异变红的原因和这条断言要守的东西对不上，判定就失去意义了。
 */
function cssAtRuleMutate(t, atRule, selector, from, to) {
	const at = t.indexOf(atRule);
	if (at < 0) return t;
	const head = t.slice(0, at);
	const tail = t.slice(at);
	const changed = cssRuleMutate(tail, selector, b => b.replace(from, to));
	return changed === tail ? t : head + changed;
}

/**
 * 在某个方法的函数体范围内换字面量（第二次及以后出现的那处）。
 *
 * 例：`input.type = 'text';` 在 renderString 和 renderArray 里各有一处，
 * 只靠 `String.replace` 只能改到第一处 —— 必须限定到方法体里才能改到第二处。
 */
function inMethodMutate(t, signature, from, to) {
	const idx = t.indexOf(signature);
	if (idx < 0) return t;
	const head = t.slice(0, idx);
	const tail = t.slice(idx);
	const changed = tail.replace(from, to);
	return changed === tail ? t : head + changed;
}

/**
 * 在 schema 里某个控件的**声明块内**换字面量。
 *
 * 必须限定到控件块：schema 里每个控件都有一行 `type:`，
 * 换个等价的写法（拿另一个控件的 type）会被整文件替换误伤到别处。
 */
function inControlBlockMutate(t, key, from, to) {
	const idx = t.indexOf(`key: '${key}'`);
	if (idx < 0) return t;
	const head = t.slice(0, idx);
	const tail = t.slice(idx);
	const changed = tail.replace(from, to);
	return changed === tail ? t : head + changed;
}

/**
 * 从 schema 里抠出全部 `key: '...'`（与体检脚本 schemaKeys() 同一口径）。
 */
function schemaKeysOfSchemaText(text) {
	const out = [];
	const re = /\bkey\s*:\s*'([^']+)'/g;
	let m;
	while ((m = re.exec(text))) {
		out.push(m[1]);
	}
	return out;
}

/**
 * 挑出 oss/src/vs 里需要复制进副本的子集。
 *
 * 两条规则（与体检脚本 D4 的扫描范围对齐）：
 *   ① 含任一「上游 key 字面量」的文件 —— 保证 D4 在副本里能复现真实仓库的结论；
 *   ② 路径含 config/configuration 的文件 —— 兜住「配置注册表所在的地方」。
 *
 * 注意 ① 里**必须排除 contrib/olympia/**：那是我们自己的代码，
 * 体检脚本的 D4 也把它排除在外；把它算进来会让 D4 在副本里走另一条路径。
 */
function pickSrcSubset(upstreamKeys) {
	const out = new Set();
	const walk = dir => {
		let entries = [];
		try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
		for (const e of entries) {
			const abs = path.join(dir, e.name);
			if (e.isDirectory()) { walk(abs); continue; }
			if (!e.isFile() || !e.name.endsWith('.ts')) { continue; }
			const rel = path.relative(SRC_ROOT, abs).split(path.sep).join('/');
			if (rel.includes('/contrib/olympia/')) { continue; }
			if (/(^|\/)(config|configuration)(\/|\.)/i.test(rel) || /Configuration\.ts$/i.test(rel)) {
				out.add(rel);
				continue;
			}
			let text = '';
			try { text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
			if (upstreamKeys.some(k => text.includes(`'${k}'`))) {
				out.add(rel);
			}
		}
	};
	walk(SRC_ROOT);
	return [...out].sort();
}

/** 所有内置扩展的 package.json（D3 要读）。 */
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

/** 只保留前 n 个控件块（用来把控件数砍到阈值以下）。 */
function keepFirstControls(text, n) {
	const re = /\t\t\t\{\n\t\t\t\tkey: '[^']*',[\s\S]*?\n\t\t\t\},/g;
	let count = 0;
	return text.replace(re, m => {
		count++;
		return count <= n ? m : '';
	});
}

/**
 * 变异清单：每条说明「把什么改坏」+「哪条断言必须因此变红」。
 * mutate 返回值必须与入参不同，否则判「锚点没命中」。
 *
 * 锚点要落在**代码**上，不能落在文档注释上。注释里同样会出现
 * `workbench.action.openSettings2` 这种字符串，先匹配到注释等于这一条变异白做。
 */
const MUTATIONS = [
	// --- A：文件存在 + 版权头 ---------------------------------------------
	{
		id: 'M1', expect: 'A2',
		desc: '把设置页文件清空',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => ''
	},
	{
		id: 'M2', expect: 'A9', rawText: true,
		desc: '把 schema 的版权头起始行改掉（**rawText**：版权头本身就是块注释，剥注释后看不见 —— 守卫会误拦）',
		file: OL + 'olympiaSettingsSchema.ts',
		// 注意：不能只少一个 `-` —— `startsWith('/*---')` 仍然成立，A9 不会红。
		// 要把块注释起始 `/*` 换成行注释 `//`，第 1 行才真的不再是「Microsoft 版权头起始行」。
		mutate: t => t.replace('/*---------------------------------------------------------------------------------------------',
			'//--------------------------------------------------------------------------------------------')
	},

	// --- B：劫持点 + 原生逃生口 --------------------------------------------
	{
		id: 'M3', expect: 'B1',
		desc: '删掉上游文件里的劫持调用',
		file: 'oss/src/vs/workbench/contrib/preferences/browser/preferences.contribution.ts',
		mutate: t => t.replace(
			`if (olympiaShouldInterceptSettings(opts)) {
					accessor.get(ICommandService).executeCommand('olympia.openSettings');
					return undefined;
				}`,
			`if (false) {
					return undefined;
				}`)
	},
	{
		id: 'M4', expect: 'B2',
		desc: '把劫持调用从 openSettings 挪到 openSettings2 里（劫持还在，但接管错了入口）',
		file: 'oss/src/vs/workbench/contrib/preferences/browser/preferences.contribution.ts',
		mutate: t => t
			.replace(
				`if (olympiaShouldInterceptSettings(opts)) {
					accessor.get(ICommandService).executeCommand('olympia.openSettings');
					return undefined;
				}`,
				'')
			.replace(
				`return accessor.get(IPreferencesService).openSettings({ jsonEditor: false, ...args });`,
				`if (olympiaShouldInterceptSettings(args)) {
					return accessor.get(ICommandService).executeCommand('olympia.openSettings');
				}
				return accessor.get(IPreferencesService).openSettings({ jsonEditor: false, ...args });`)
	},
	{
		id: 'M5', expect: 'B3',
		desc: '劫持分支执行错命令（olympia.openSettings2）',
		file: 'oss/src/vs/workbench/contrib/preferences/browser/preferences.contribution.ts',
		mutate: t => t.replace("executeCommand('olympia.openSettings')", "executeCommand('olympia.openSettings2')")
	},
	{
		id: 'M6', expect: 'B4',
		desc: '删掉原生逃生口 workbench.action.openSettings2 的动作注册',
		file: 'oss/src/vs/workbench/contrib/preferences/browser/preferences.contribution.ts',
		mutate: t => t.replace("id: 'workbench.action.openSettings2',", "id: 'workbench.action.openSettingsRemoved',")
	},
	{
		id: 'M7', expect: 'B5',
		desc: '把逃生口也劫持掉（openSettings2 里也接管）',
		file: 'oss/src/vs/workbench/contrib/preferences/browser/preferences.contribution.ts',
		mutate: t => t.replace(
			`return accessor.get(IPreferencesService).openSettings({ jsonEditor: false, ...args });`,
			`if (olympiaShouldInterceptSettings(args)) {
					return accessor.get(ICommandService).executeCommand('olympia.openSettings');
				}
				return accessor.get(IPreferencesService).openSettings({ jsonEditor: false, ...args });`)
	},
	{
		id: 'M8', expect: 'B6',
		desc: '给零 import 的判据模块加一条 import（可能形成依赖环）',
		file: OL + 'olympiaSettingsInterceptor.ts',
		mutate: t => t.replace('export interface IOlympiaOpenSettingsArgs {',
			"import { something } from '../../../../base/common/doesNotMatter.js';\n\nexport interface IOlympiaOpenSettingsArgs {")
	},

	// --- C：真跑判据的真值表 ----------------------------------------------
	{
		id: 'M9', expect: 'C1',
		desc: '判据函数的参数名改了（抠取正则抠不出来）',
		file: OL + 'olympiaSettingsInterceptor.ts',
		mutate: t => t.replace(
			'export function olympiaShouldInterceptSettings(args: IOlympiaOpenSettingsArgs | undefined): boolean {',
			'export function olympiaShouldInterceptSettings(opts: IOlympiaOpenSettingsArgs | undefined): boolean {')
	},
	{
		id: 'M10', expect: 'C2',
		desc: '判据永远返回 false（无参也不接管 —— 用户点齿轮毫无反应）',
		file: OL + 'olympiaSettingsInterceptor.ts',
		mutate: t => t.replace(
			`if (!args) {
		return true;
	}`,
			`if (!args) {
		return false;
	}`)
	},
	{
		id: 'M11', expect: 'C4',
		desc: '判据忽略 query（带搜索词的深层跳转也被接管 —— 用户被丢在一屏无关内容上）',
		file: OL + 'olympiaSettingsInterceptor.ts',
		mutate: t => t.replace(
			`if (args.query !== undefined) {
		return false;
	}`,
			'')
	},
	{
		id: 'M12', expect: 'C5',
		desc: 'query 用「非空」而不是「存在」判断（query: \'\' 被接管）',
		file: OL + 'olympiaSettingsInterceptor.ts',
		mutate: t => t.replace('if (args.query !== undefined) {', "if (args.query !== undefined && args.query !== '') {")
	},
	{
		id: 'M13', expect: 'C6',
		desc: '判据忽略 focusSearch',
		file: OL + 'olympiaSettingsInterceptor.ts',
		mutate: t => t.replace(
			`if (args.focusSearch === true) {
		return false;
	}`,
			'')
	},
	{
		id: 'M14', expect: 'C7',
		desc: '判据忽略 openToSide',
		file: OL + 'olympiaSettingsInterceptor.ts',
		mutate: t => t.replace(
			`if (args.openToSide === true) {
		return false;
	}`,
			'')
	},
	{
		id: 'M15', expect: 'C8',
		desc: '判据忽略 revealSetting（@id: 定位丢失）',
		file: OL + 'olympiaSettingsInterceptor.ts',
		mutate: t => t.replace(
			`if (args.revealSetting !== undefined) {
		return false;
	}`,
			'')
	},

	// --- D：schema 里每个 key 都有真实定义 ---------------------------------
	{
		id: 'M16', expect: 'D1',
		desc: '控件数砍到 9 个（简化页太空；D1 的阈值是 < 20）',
		file: OL + 'olympiaSettingsSchema.ts',
		mutate: t => keepFirstControls(t, 9)
	},
	{
		id: 'M17', expect: 'D2',
		desc: '两个控件用了同一个 key',
		file: OL + 'olympiaSettingsSchema.ts',
		mutate: t => t.replace("key: 'olympia.judge.memoryLimitMb'", "key: 'olympia.train.recordSolves'")
	},
	{
		id: 'M18', expect: 'D3',
		desc: '引入一个内置扩展里没有定义的 olympia.* key（改了不会生效且不报错）',
		file: OL + 'olympiaSettingsSchema.ts',
		mutate: t => t.replace("key: 'olympia.judge.memoryLimitMb'", "key: 'olympia.judge.memoryLimitMbTypo'")
	},
	{
		id: 'M19', expect: 'D4',
		desc: '上游 key 写成不存在的键名（**这条守的是 D4 排除 contrib/olympia/ 那个修复**：不排除的话 D4 会拿我们自己的 schema 去对，恒绿）',
		file: OL + 'olympiaSettingsSchema.ts',
		mutate: t => t.replace("key: 'editor.fontSize'", "key: 'editor.fontSizeTypo'")
	},

	// --- E：页面接线 --------------------------------------------------------
	{
		id: 'M20', expect: 'E1',
		desc: 'workbench.common.main.ts 里不再 import 设置页 contribution',
		file: 'oss/src/vs/workbench/workbench.common.main.ts',
		mutate: t => t.replace("import './contrib/olympia/browser/olympiaSettings.contribution.js';", '')
	},
	{
		id: 'M21', expect: 'E2',
		desc: 'contribution 不再引用 OLYMPIA_SETTINGS_COMMAND_ID 常量',
		file: OL + 'olympiaSettings.contribution.ts',
		mutate: t => t.replace(/OLYMPIA_SETTINGS_COMMAND_ID/g, 'CMD_ID')
	},
	{
		id: 'M22', expect: 'E3',
		desc: '命令 id 在 schema 与上游劫持点两处不一致',
		file: OL + 'olympiaSettingsSchema.ts',
		mutate: t => t.replace("export const OLYMPIA_SETTINGS_COMMAND_ID = 'olympia.openSettings';",
			"export const OLYMPIA_SETTINGS_COMMAND_ID = 'olympia.openSettingsV2';")
	},
	{
		id: 'M23', expect: 'E4',
		desc: 'EditorResolver 的 pattern 与 EditorInput 的 scheme 不一致',
		file: OL + 'olympiaSettings.contribution.ts',
		mutate: t => t.replace("'olympia-settings:/**'", "'olympia-settings-v2:/**'")
	},
	{
		id: 'M24', expect: 'E5',
		desc: '页面里的「高级设置」逃生口指向错了命令',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace(
			"static readonly OPEN_NATIVE_SETTINGS_COMMAND_ID = 'workbench.action.openSettings2';",
			"static readonly OPEN_NATIVE_SETTINGS_COMMAND_ID = 'workbench.action.openSettings';")
	},
	{
		id: 'M25', expect: 'E6',
		desc: '页面不再按分组渲染（拿不到 OLYMPIA_SETTINGS_GROUPS）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace(/OLYMPIA_SETTINGS_GROUPS/g, 'GROUPS_REF')
	},
	{
		id: 'M26', expect: 'E7',
		desc: '页面不再调用 updateValue（改了设置写不进去）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace(
			'this.configurationService.updateValue(control.key, value).catch(() => undefined);',
			'this.configurationService.writeValue(control.key, value);')
	},

	// --- F：CSS -------------------------------------------------------------
	{
		id: 'M27', expect: 'F1',
		desc: 'CSS 里 .olympiaSettings 根选择器被改名（整棵子树的类名一起改）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => t.replace(/\.olympiaSettings/g, '.osSettings')
	},
	{
		id: 'M28', expect: 'F2',
		desc: 'CSS 里用了非 --vscode- 前缀的变量（stylelint 会拒收）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => t.replace('color: var(--vscode-foreground);', 'color: var(--foreground);')
	},

	// --- 元变异 --------------------------------------------------------------
	{
		id: 'M29', expectGreen: ['C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'],
		desc: '判据换成等价写法（typeof 判断）—— 语义没变，C 组必须保持绿（证明它判的是行为不是写法）',
		file: OL + 'olympiaSettingsInterceptor.ts',
		mutate: t => t.replace('if (args.query !== undefined) {', "if (typeof args.query !== 'undefined') {")
	},
	{
		id: 'M30', expectGuardHit: true,
		desc: '元变异：锚点故意落在文档注释上 —— 必须被「只打到注释」守卫拦住',
		file: OL + 'olympiaSettingsInterceptor.ts',
		// 注释里的表格提到了 `revealSetting`；改它只会动到注释，代码一行没变。
		mutate: t => t.replace('`revealSetting`', '`revealSettingX`')
	},

	// --- G：布局不变式 + 禁用原生下拉 -------------------------------------
	// 这一组的来历：2026-10-24 真机验收在默认工作台宽度下抓到两个真实缺陷
	// （标签被压成 0 宽竖排 + 横向溢出 + footer 停在半空；原生 <select> 弹系统菜单）。
	{
		id: 'M31', expect: 'G1',
		desc: '把 grid 的右列写回 1fr（min 是 auto → 不收缩 → 横向溢出复发）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings',
			b => b.replace('grid-template-columns: 180px minmax(0, 1fr);', 'grid-template-columns: 180px 1fr;'))
	},
	{
		id: 'M32', expect: 'G2',
		desc: '把 grid 砍成两行（没有独立的底栏行 → footer 跟着内容滚；窄容器三行结构也塌了）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings',
			b => b.replace('grid-template-rows: auto minmax(0, 1fr) auto;', 'grid-template-rows: auto minmax(0, 1fr);'))
	},
	{
		id: 'M33', expect: 'G3',
		desc: '删掉内容区的 min-width: 0（右列不缩 → 横向滚动条复发）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-body', b => b.replace('min-width: 0;', ''))
	},
	{
		id: 'M34', expect: 'G4',
		desc: '把设置行改回不换行（窄宽度下标签被压成 0 宽竖排）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-row', b => b.replace('flex-wrap: wrap;', 'flex-wrap: nowrap;'))
	},
	{
		id: 'M35', expect: 'G5',
		desc: '把标签列的 min-width 改回 0（中文标签一字一行竖排）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-rowLabel', b => b.replace('min-width: 180px;', 'min-width: 0;'))
	},
	{
		id: 'M36', expect: 'G6',
		desc: '把控件列改回 flex: 0 0（不许缩 → 把标签挤成 0 宽）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-rowControl', b => b.replace('flex: 0 1 320px;', 'flex: 0 0 320px;'))
	},
	{
		id: 'M37', expect: 'G7',
		desc: '给 footer 加回 position: sticky（祖先 overflow:hidden → 停在半空）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-footer',
			b => b.replace('grid-row: 3;', 'grid-row: 3;\n\tposition: sticky;'))
	},
	{
		id: 'M38', expect: 'G8',
		desc: '把 footer 挪回第一行（不再贴底）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-footer', b => b.replace('grid-row: 3;', 'grid-row: 1;'))
	},
	{
		id: 'M39', expect: 'G9',
		desc: '把 footer 挂回滚动区 body（它会跟着内容一起滚）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace('append(container, this.renderFooter());', 'append(body, this.renderFooter());')
	},
	{
		id: 'M40', expect: 'G10',
		desc: '重新自建原生 <select>（系统弹窗 = 白底白字红线）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace(
			'const options: { value: string; label: string }[] = values.map',
			"const nativeSelect = $<HTMLSelectElement>('select');\n\t\tconst options: { value: string; label: string }[] = values.map")
	},
	{
		id: 'M41', expect: 'G11',
		desc: '去掉 useCustomDrawn: true（macOS 上退回原生 <select>）',
		file: OL + 'olympiaSettingsPage.ts',
		// 锚点带尾逗号：文档注释里写的是 `useCustomDrawn: true`（没有逗号），
		// 只按字面量替换会先打到注释上，被「只打到注释」守卫拦下 —— 那是变异没打中代码。
		mutate: t => t.replace('useCustomDrawn: true,', 'useCustomDrawn: false,')
	},
	{
		id: 'M42', expect: 'G12',
		desc: '下拉不再用主题样式（defaultSelectBoxStyles → unthemed）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace(/defaultSelectBoxStyles/g, 'unthemedSelectBoxStyles')
	},
	{
		id: 'M43', expect: 'G13',
		desc: '把 .monaco-select-box 的高度改掉（和原生设置页不再一致）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-rowControl .monaco-select-box',
			b => b.replace('height: 26px;', 'height: 18px;'))
	},
	{
		id: 'M44', expect: 'G14',
		desc: '把下拉的样式改回原生 select 选择器',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => t.replace('.olympiaSettings-rowControl .monaco-select-box {', '.olympiaSettings-rowControl select {')
	},
	{
		id: 'M45', expect: 'G15',
		desc: '重画前不释放上一轮的下拉框（监听器一次次叠加）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace('this.renderDisposables.clear();', '')
	},

	// --- H：窄容器响应式 + 控件类型正确性 -----------------------------------
	// 这一组的来历：2026-10-24 第二轮真机验收在窄宽度（编辑器组只剩 214px）下
	// 抓到的三个真缺陷：grid 第一列写死不缩、输入框白底浅字、16 个开关变文本框。
	// 后两个只有真机能看出来 —— 静态断言必须把它们钉住。

	{
		id: 'M46', expect: 'G16',
		desc: '删掉 container-type: inline-size（@container 查询失去容器 → 窄宽度响应式整个失效）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings', b => b.replace('container-type: inline-size;', ''))
	},
	{
		id: 'M47', expect: 'G17',
		desc: '把窄容器断点改成一个不存在的阈值（响应式断点消失）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => t.replace('@container (max-width: 520px) {', '@container (max-width: 519px) {')
	},
	{
		id: 'M48', expect: 'G18',
		desc: '窄容器下导航不换行（9 个分组里 6 个落在可视区外，得横向拖才看得见）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssAtRuleMutate(t, '@container (max-width: 520px)', '.olympiaSettings-nav',
			'flex-wrap: wrap;', 'flex-wrap: nowrap;')
	},
	{
		id: 'M49', expect: 'G19',
		desc: '窄容器下内容区不占整行（被挤成一条缝）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssAtRuleMutate(t, '@container (max-width: 520px)', '.olympiaSettings-body',
			'grid-column: 1 / -1;', 'grid-column: 2;')
	},
	{
		id: 'M50', expect: 'G20',
		desc: '导航只跨两行（三行 grid 的落位不自洽 → 宽布局下导航不再满高）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-nav', b => b.replace('grid-row: 1 / span 3;', 'grid-row: 1 / span 2;'))
	},
	{
		id: 'M51', expect: 'G21',
		desc: '把输入框样式改回 input[type="text"] 属性选择器（匹配不到任何元素 → 白底浅字复发）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => t.replace('.olympiaSettings-rowControl .olympiaSettings-input {', '.olympiaSettings-rowControl input[type="text"] {')
	},
	{
		id: 'M52', expect: 'G22',
		desc: '输入框不取主题背景色（退回浏览器默认白底）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-rowControl .olympiaSettings-input',
			b => b.replace('background-color: var(--vscode-input-background);', ''))
	},
	{
		id: 'M53', expect: 'G23',
		desc: '重新用 $(...input[type=text]) 创建输入框（属性段被静默丢弃 → 元素没有 type 属性）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace("$<HTMLInputElement>('input');", "$<HTMLInputElement>('input[type=text]');")
	},
	{
		id: 'M54', expect: 'G24',
		desc: 'renderString 不再显式设 type（字符串框没有 type 属性 → 退回浏览器默认外观）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private renderString(', "input.type = 'text';", '')
	},
	{
		id: 'M55', expect: 'G25',
		desc: 'renderArray 不再显式设 type',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private renderArray(', "input.type = 'text';", '')
	},
	{
		id: 'M56', expect: 'G26',
		desc: '数字框被改成 type = text（min/max 约束随之失效）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace("input.type = 'number';", "input.type = 'text';")
	},
	{
		id: 'M57', expect: 'G27',
		desc: '布尔开关不走上游 Toggle（actionClassName 对不上 → 外观与原生设置页脱节）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace("actionClassName: 'olympiaSettings-checkbox',", "actionClassName: 'olympiaSettings-checkboxX',")
	},
	{
		id: 'M58', expect: 'G28',
		desc: 'Toggle 不挂进 renderDisposables（每次重画叠加一份监听器）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace('this.renderDisposables.add(toggle);', '')
	},
	{
		id: 'M59', expect: 'G29',
		desc: '开关高度改成 22px（与原生设置页的 18px 不一致）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-rowControl .olympiaSettings-checkbox',
			b => b.replace('height: 18px;', 'height: 22px;'))
	},
	{
		id: 'M60', expect: 'G30',
		desc: '未勾选时不再隐藏勾号字形（opacity: 0 被删掉）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-rowControl .olympiaSettings-checkbox.codicon:not(.checked)::before',
			b => b.replace('opacity: 0;', ''))
	},
	{
		id: 'M61', expect: 'G31',
		desc: 'boolean 分支不再调 renderBoolean（16 个开关会走错分支）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace("case 'boolean':", "case 'booleanX':")
	},
	{
		id: 'M62', expectGuardHit: true,
		desc: '元变异：锚点故意落在文档注释上 —— 必须被「只打到注释」守卫拦住',
		file: OL + 'olympiaSettingsPage.ts',
		// 注释里写的是 `$('input[type=text]')`（没有 <HTMLInputElement> 泛型）；
		// 改它只会动到注释，代码一行没变。
		mutate: t => t.replace("input[type=text]'", "input[type=textX]'")
	},

	// --- G32~G45：字体下拉（本机真实系统字体） --------------------------------
	{
		id: 'M63', expect: 'G32',
		desc: '扩展 CMD 表里的命令 id 拼错（页面调的是另一个命令 → 字体清单永远拿不到）',
		file: 'oss/extensions/olympia-onboarding/src/commands.ts',
		mutate: t => t.replace(
			"listSystemFonts: 'olympia.listSystemFonts',",
			"listSystemFonts: 'olympia.listSystemFontsTypo',")
	},
	{
		id: 'M64', expect: 'G33',
		desc: 'editor.fontFamily 的控件类型从 font 退回 string（没有本机字体下拉了）',
		file: OL + 'olympiaSettingsSchema.ts',
		mutate: t => inControlBlockMutate(t, 'editor.fontFamily', "type: 'font',", "type: 'string',")
	},
	{
		id: 'M65', expect: 'G33',
		desc: "控件类型联合里去掉 'font'（这种控件不受支持）",
		file: OL + 'olympiaSettingsSchema.ts',
		mutate: t => t.replace("'theme' | 'font'", "'theme'")
	},
	{
		id: 'M66', expect: 'G34',
		desc: "页面 switch 里没有 case 'font'（字体控件不会被渲染）",
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace("case 'font':", "case 'fontX':")
	},
	{
		id: 'M67', expect: 'G35',
		desc: '下拉框不再强制自绘（useCustomDrawn: true → false，会退回原生 <select>）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private createSelectBox(', 'useCustomDrawn: true,', 'useCustomDrawn: false,')
	},
	{
		id: 'M68', expect: 'G35',
		desc: '页面里出现了第二个 SelectBox 创建入口（绕过「禁原生下拉」的统一入口）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private renderDropdown(',
			'const { wrapper, selectBox } = this.createSelectBox(options, selectedIndex, control, controlId);',
			'const { wrapper, selectBox } = this.createSelectBox(options, selectedIndex, control, controlId);\n\t\tconst extra = new SelectBox([], 0, this.contextViewService, defaultSelectBoxStyles, {});')
	},
	{
		id: 'M69', expect: 'G36',
		desc: 'renderFont 不走统一的 createSelectBox（字体下拉绕过了统一入口）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private renderFont(', 'this.createSelectBox(', 'this.createNativeSelectBox(')
	},
	{
		id: 'M70', expect: 'G37',
		desc: 'loadSystemFonts 把命令 id 写死成字面量（与扩展侧脱钩，改一边就永远对不上）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private loadSystemFonts(',
			'OlympiaSettingsPage.LIST_SYSTEM_FONTS_COMMAND_ID', "'olympia.listSystemFonts'")
	},
	{
		id: 'M71', expect: 'G38',
		desc: 'buildFontOptions 不读本机字体清单（下拉里永远是空的）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private buildFontOptions(',
			'for (const font of this.systemFonts)', 'for (const font of [])')
	},
	{
		id: 'M72', expect: 'G39',
		desc: '字体清单到达后重画整页（会清空用户正在输入的内容）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => t.replace('private refreshFontDropdowns(): void {',
			'private refreshFontDropdowns(): void {\n\t\tthis.render();')
	},
	{
		id: 'M73', expect: 'G40',
		desc: '扩展没有注册这条命令（页面要不到字体清单）',
		file: 'oss/extensions/olympia-onboarding/src/extension.ts',
		mutate: t => t.replace('registerCommand(CMD.listSystemFonts,', 'registerCommand(CMD.listSystemFontsRemoved,')
	},
	{
		id: 'M74', expect: 'G41',
		desc: '字体栈输入框不挂 .olympiaSettings-input（会退回浏览器默认白底）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private renderFontStackInput(',
			"input.classList.add('olympiaSettings-input');", '')
	},
	{
		id: 'M75', expect: 'G42',
		desc: '字体栈留空写成空字符串（editor.fontFamily 会变成非法 font-family）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private renderFontStackInput(',
			"raw === '' ? undefined : raw", 'raw')
	},
	{
		id: 'M76', expect: 'G43',
		desc: '下拉选「系统默认」写成空字符串（editor.fontFamily 会变成非法 font-family）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private renderFont(',
			"picked.value === '' ? undefined : picked.value", 'picked.value')
	},
	{
		id: 'M77', expect: 'G44',
		desc: '字体控件容器改成横排（下拉与字体栈会挤在一行）',
		file: OL + 'media/olympiaSettings.css',
		mutate: t => cssRuleMutate(t, '.olympiaSettings-fontControl',
			b => b.replace('flex-direction: column;', 'flex-direction: row;'))
	},
	{
		id: 'M78', expect: 'G45',
		desc: 'hasUserOverride 不看工作区里的值（工作区设的字体不被认出来）',
		file: OL + 'olympiaSettingsPage.ts',
		mutate: t => inMethodMutate(t, 'private hasUserOverride(',
			'|| info.workspaceValue !== undefined', '|| false')
	},
	{
		id: 'M79', expect: 'G32',
		desc: 'package.json 的 contributes.commands 里没有这条命令（扩展不会激活它）',
		file: 'oss/extensions/olympia-onboarding/package.json',
		mutate: t => t.replace('"command": "olympia.listSystemFonts"', '"command": "olympia.listSystemFontsV2"')
	}
];

// ---------------------------------------------------------------------------
// 建副本
// ---------------------------------------------------------------------------
const schemaText = fs.readFileSync(path.join(REPO, ...(OL + 'olympiaSettingsSchema.ts').split('/')), 'utf8');
const upstreamKeys = schemaKeysOfSchemaText(schemaText).filter(k => !k.startsWith('olympia.'));
const NEEDED = [
	...EXPLICIT,
	...extensionPackageFiles(),
	...pickSrcSubset(upstreamKeys).map(rel => 'oss/src/vs/' + rel)
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia-settings-mutation-'));
let failures = 0;

try {
	buildTree(tmp);

	const base = runCheck(tmp);
	if (base.exit !== 0) {
		console.log('基线不干净 —— 体检脚本在未变异的树上就红了：');
		console.log(base.out.split(/\r?\n/).filter(l => /^(FAIL|MISSING)/.test(l)).join('\n'));
		console.log('（如果是 D4 红了，说明副本里的 oss/src 子集不够 —— 补 pickSrcSubset 的规则）');
		process.exit(1);
	}
	const total = base.out.match(/检查项：(\d+)/)?.[1] ?? '?';
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
		// 版权头断言（A7~A11）判的就是注释本身，走的是 loadRaw 而不是剥注释后的文本，
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
