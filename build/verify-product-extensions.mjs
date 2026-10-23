// 产品目录里的三个 Olympia 扩展，是不是从当前源码编出来的？
//
// 为什么要有这一条：上游的扩展清单里没有 olympia-coach / olympia-contest / olympia-onboarding，
// 所以 `compile-extensions-build` 根本不碰它们，`vscode-win32-x64-ci` 只是把
// `oss/extensions/<扩展>/out` 原样拷进产品。谁改了 src 而没单独 compile，产物里就是上一次的
// 旧编译——2026-10-17 实际踩到：教练的题面目录修复 15:00 提交，15:07 出包里 coach.js 还是
// 12:16 那份（字节数与旧的 out 完全一致，所以“拷了”不等于“拷对了”）。
//
//   node build/verify-product-extensions.mjs <产品目录>
// 产品目录一般传 D:\oler-ide-v2\VSCode-win32-x64。
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.argv[2];
assert.ok(dist, '用法：node build/verify-product-extensions.mjs <产品目录>（例如 D:\\oler-ide-v2\\VSCode-win32-x64）');
const extSrcRoot = path.join(repoRoot, 'oss', 'extensions');

/** 递归取一个目录里所有 .ts/.js 的最新 mtime（源码只看 src，产物只看 out）。 */
function newest(dir, exts) {
	if (!fs.existsSync(dir)) { return 0; }
	let max = 0;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) { max = Math.max(max, newest(full, exts)); }
		else if (exts.some(e => entry.name.endsWith(e))) { max = Math.max(max, fs.statSync(full).mtimeMs); }
	}
	return max;
}

/**
 * 结构化比较两个 JSON 值。数组按顺序比（贡献点数组的顺序有意义）。
 */
function deepEqual(a, b) {
	if (a === b) { return true; }
	if (typeof a !== typeof b) { return false; }
	if (a === null || b === null) { return false; }
	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) { return false; }
		return a.every((v, i) => deepEqual(v, b[i]));
	}
	if (typeof a === 'object') {
		const ka = Object.keys(a).sort();
		const kb = Object.keys(b).sort();
		if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) { return false; }
		return ka.every(k => deepEqual(a[k], b[k]));
	}
	return false;
}

/**
 * 每个扩展挑一条“只有当前源码才会写出来”的字符串。它同时是本脚本的自检：
 * 谁把这几处改掉，这里就得跟着改，否则会红——而不是悄悄放行。
 * 扩展的 out/ 不做中文转义（`oss/out` 那套 workbench 包才会写成 \uXXXX），所以中文可以直接当线索。
 */
const MARKERS = {
	'olympia-coach': { file: 'coach.js', needle: 'problemsDir' },
	'olympia-onboarding': { file: 'extension.js', needle: '下载完整版' },
	'olympia-contest': { file: 'templates.js', needle: '.olympia/problems' },
};

const problems = [];
for (const name of ['olympia-coach', 'olympia-contest', 'olympia-onboarding']) {
	const srcNewest = newest(path.join(extSrcRoot, name, 'src'), ['.ts']);
	const treeDir = path.join(dist, 'resources', 'app', 'extensions', name, 'out');
	const treeNewest = newest(treeDir, ['.js']);
	if (!treeNewest) { problems.push(`${name}：产品目录里没有 ${treeDir}`); continue; }
	if (srcNewest > treeNewest) {
		problems.push(`${name}：源码最新 ${new Date(srcNewest).toLocaleString('sv-SE')} 比产物最新 ${new Date(treeNewest).toLocaleString('sv-SE')} 新——`
			+ `产物里是上一次的编译。先在 oss/extensions/${name} 跑 npm run compile，再重出包。`);
	}
	// package.json 也得比一比 —— 而且要比**语义**，不能比字节、也不能比 mtime。
	//
	// 上面那条只比 `src/**/*.ts` 与 `out/**/*.js`，漏掉了**贡献点**：
	// package.json 里的 commands / menus / configuration 不经过 tsc，
	// 它是原样拷进产物的（只是被压成单行）。改了它而只重编 .ts，
	// 产物里的贡献点就是旧的。
	//
	// 实测踩到（2026-10-23）：olympia-contest 的 package.json 补了
	// `olympia.problem.receiveHandoff` 的命令声明，源码里已修好控制台报错，
	// 但出包用了 `-SkipExtensions`（复用 .build/extensions），产物里的
	// package.json 还是前一天的 ⇒ 真机跑起来控制台照样报那条错。
	// 而上面那条新鲜度检查当时是「ok」的 —— 因为 .ts 一行没改。
	//
	// 比 mtime 也不行：打包会把文件**拷贝**一遍，拷完 mtime 就是「现在」，
	// 但内容可能是旧的（实测正是如此：产物 mtime 比源码新，内容却缺那条命令）。
	// 比字节也不行：构建会把 manifest 压成单行 JSON，格式本来就不同。
	// 所以这里解析成对象再比 —— 只有贡献点真的不一样才算问题。
	const srcManifest = path.join(extSrcRoot, name, 'package.json');
	const treeManifest = path.join(dist, 'resources', 'app', 'extensions', name, 'package.json');
	if (!fs.existsSync(treeManifest)) {
		problems.push(`${name}：产品目录里没有 ${treeManifest}`);
	} else if (fs.existsSync(srcManifest)) {
		let srcJson, treeJson;
		try {
			srcJson = JSON.parse(fs.readFileSync(srcManifest, 'utf8'));
			treeJson = JSON.parse(fs.readFileSync(treeManifest, 'utf8'));
		} catch (e) {
			problems.push(`${name}：package.json 解析失败 —— ${e.message}`);
			continue;
		}
		if (!deepEqual(srcJson, treeJson)) {
			problems.push(`${name}：产物里的 package.json 与源码不一致 —— `
				+ `产物里的贡献点（命令 / 菜单 / 配置）是旧的。重新出包时不要带 -SkipExtensions。`);
		}
	}
	// 只比时间还不够：拷过去但内容没变也是同一件事。coach 那次两个字节数一模一样，
	// 所以再挑一条“只有新版才有”的线索，直接读产物确认改动真在里面。
	const marker = MARKERS[name];
	if (marker && !fs.existsSync(path.join(treeDir, marker.file))) { problems.push(`${name}：产物里找不到 ${marker.file}`); }
	else if (marker) {
		const text = fs.readFileSync(path.join(treeDir, marker.file), 'utf8');
		if (!text.includes(marker.needle)) {
			problems.push(`${name}/${marker.file} 里没有 ${JSON.stringify(marker.needle)}：这一条守的是本次改动，改完请同步 needle`);
		}
	}
}
if (problems.length) {
	console.error(problems.map(p => `FAIL  ${p}`).join('\n'));
	process.exit(1);
}
console.log('ok    三个 Olympia 扩展的产物不比源码旧，且关键改动在产物里');
