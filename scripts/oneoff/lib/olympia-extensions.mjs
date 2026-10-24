// 内置扩展名单从磁盘发现，不写死。
//
// 为什么要有这个：这份名单以前在六处各写一遍 —— 打包脚本（build/oss-package.ps1）
// 加上五扇门（check-config-defaults / check-keybinding-mirrors / check-keybinding-tokens /
// check-olympia-command-ids / check-problems-dir），还有 build/verify-product-extensions.mjs。
// 新增第 4 个 olympia-* 扩展时，写死的那几处不会跟着变，后果分两种：
//   - 打包脚本那处最要命：它负责逐个编译扩展。不编译就等于新扩展根本不在产物里，
//     而**没有一扇门会红** —— 门的名单也写死了，它们根本看不见这个新扩展。
//     （2026-10-24 审计发现：整套发版链路对"多一个扩展"这件事完全无感。）
//   - 门那几处：新扩展的键位 / 命令 id / 配置默认值没人查。
// 改成按目录发现之后，加一个扩展只需要建目录，不该还要改六个文件。
//
// 这个函数只负责"发现"，并且对三种坏情况关门：
//   - 目录读不到 / 一个扩展都没有 → 抛错。空名单会让所有检查静默通过，那是假绿。
//   - 少了一个必须存在的扩展 → 抛错。删扩展是产品决定，得有人显式改这份名单，
//     而不是靠"把目录删掉"来达成 —— 那样的话门会集体变空，然后集体静默通过。
import fs from 'node:fs';

/**
 * 必须存在的内置扩展。
 * 删掉其中一个是要显式改这里的产品决定，不能靠目录消失来达成。
 */
export const REQUIRED_EXTENSIONS = ['olympia-coach', 'olympia-contest', 'olympia-onboarding'];

/**
 * 发现内置扩展的目录名（已排序）。
 * @param {string} extRoot oss/extensions 目录
 * @returns {string[]} 形如 ['olympia-coach', 'olympia-contest', 'olympia-onboarding']
 */
export function discoverOlympiaExtensions(extRoot) {
	let entries;
	try {
		entries = fs.readdirSync(extRoot, { withFileTypes: true });
	} catch (e) {
		throw new Error(`扩展目录读不到：${extRoot}（${e.message}）`);
	}
	const found = entries
		.filter(d => d.isDirectory() && d.name.startsWith('olympia-'))
		.map(d => d.name)
		.sort();
	if (!found.length) {
		throw new Error(`${extRoot} 下一个 olympia-* 扩展目录都没有。空名单会让所有检查静默通过（假绿），先确认路径对不对。`);
	}
	const missing = REQUIRED_EXTENSIONS.filter(name => !found.includes(name));
	if (missing.length) {
		throw new Error(`这些内置扩展不见了：${missing.join('、')}（${extRoot}）。`
			+ '删扩展是产品决定，要显式改 lib/olympia-extensions.mjs 的 REQUIRED_EXTENSIONS。');
	}
	return found;
}
