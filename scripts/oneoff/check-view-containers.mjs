// 左栏容器与视图的"看得见"检查：图标写法、provider 注册、贡献点里的文件真的存在。
//
// 为什么要有这一条（2026-10-16 实测踩到）：把 viewsContainers.activitybar 的 icon 写成
// `$(book)` 这种 codicon 引用，工作台不报错、不警告，整个容器就是不出现在左栏——
// 题面视图当时就是这样"注册成功但看不见"。容器只有在它下面所有视图都有 provider 时才画图标，
// 所以 webview 视图忘了 registerWebviewViewProvider 也是同一个症状：一个都不剩。
// 这两件事都只能从贡献点反查，读代码看不出来，所以在这里对着文件系统核。
//
//   node scripts/oneoff/check-view-containers.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const extensionsRoot = path.join(repoRoot, 'oss/extensions');
const OLYMPIA_EXTENSIONS = ['olympia-onboarding', 'olympia-contest', 'olympia-coach'];

let failed = 0;
function report(ok, label) {
	console.log(`${ok ? 'ok   ' : 'FAIL '} ${label}`);
	if (!ok) { failed++; }
}

/** 扩展源码里注册过的视图 provider id（tree 与 webview 两类都要算，漏一类就是假红）。 */
function providerIds(srcDir) {
	const ids = new Set();
	for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.ts'))) {
		const text = fs.readFileSync(path.join(srcDir, file), 'utf8');
		for (const m of text.matchAll(/(?:register(?:WebviewViewProvider|TreeDataProvider)|createTreeView)\(\s*(?:'([^']+)'|([A-Za-z_][\w.]*))/g)) {
			if (m[1]) {
				ids.add(m[1]);
				continue;
			}
			// registerWebviewViewProvider(STATEMENT_VIEW_ID, …)：常量得回到同一个扩展里查值。
			const decl = new RegExp(`export const ${m[2]}\\s*=\\s*'([^']+)'`).exec(text);
			if (decl) {
				ids.add(decl[1]);
				continue;
			}
			// 常量常常住在同一个扩展的另一个文件里（STATEMENT_VIEW_ID 就在 statementView.ts）。
			for (const other of fs.readdirSync(srcDir).filter(f => f.endsWith('.ts') && f !== file)) {
				const otherText = fs.readFileSync(path.join(srcDir, other), 'utf8');
				const inOther = new RegExp(`export const ${m[2]}\\s*=\\s*'([^']+)'`).exec(otherText);
				if (inOther) { ids.add(inOther[1]); break; }
			}
		}
	}
	return ids;
}

for (const name of OLYMPIA_EXTENSIONS) {
	const dir = path.join(extensionsRoot, name);
	const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
	const contributes = manifest.contributes ?? {};
	const srcDir = path.join(dir, 'src');
	const registered = fs.existsSync(srcDir) ? providerIds(srcDir) : new Set();

	for (const container of contributes.viewsContainers?.activitybar ?? []) {
		const icon = String(container.icon ?? '');
		if (icon.startsWith('$(')) {
			report(false, `${name}: 容器 ${container.id} 的 icon 写成 codicon（${icon}）——左栏不会画这个图标，容器会整个消失`);
			continue;
		}
		const file = path.join(dir, icon);
		report(icon.endsWith('.svg') && fs.existsSync(file), `${name}: 容器 ${container.id} 的图标 ${icon} 是一个真实存在的 SVG`);
	}

	for (const [location, views] of Object.entries(contributes.views ?? {})) {
		for (const view of views) {
			const hasProvider = registered.has(view.id);
			report(hasProvider, `${name}: 视图 ${view.id}（${location}，type=${view.type ?? 'tree'}）在源码里有对应的 provider 注册`);
			if (view.icon && String(view.icon).startsWith('media/')) {
				report(fs.existsSync(path.join(dir, view.icon)), `${name}: 视图 ${view.id} 的图标文件 ${view.icon} 存在`);
			}
		}
	}

	// 贡献点里引用的 media 文件必须真的会被打包带走：产物树里没有就等于装了个空图标。
	const shipped = path.join(repoRoot, 'VSCode-win32-x64/resources/app/extensions', name);
	if (fs.existsSync(shipped)) {
		for (const container of contributes.viewsContainers?.activitybar ?? []) {
			const rel = String(container.icon ?? '');
			if (rel && !rel.startsWith('$(')) {
				report(fs.existsSync(path.join(shipped, rel)), `${name}: 出厂产物里带着 ${rel}（不是只在源码里有）`);
			}
		}
	}
}

console.log(failed ? `\n${failed} 处左栏贡献点不成立` : '\nall view-container checks passed');
process.exit(failed ? 1 : 0);
