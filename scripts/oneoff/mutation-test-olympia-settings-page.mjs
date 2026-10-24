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
	'oss/src/vs/workbench/workbench.common.main.ts'
];

const SRC_ROOT = path.join(REPO, 'oss', 'src', 'vs');

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
