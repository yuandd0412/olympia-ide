import { readFileSync, writeFileSync } from 'fs';

const ROOT = 'D:/oler-ide-v2/oss/src/vs/workbench/contrib/welcomeGettingStarted';

// [file, from, to, expectedOccurrences]
const EDITS = [
	['browser/gettingStarted.ts', "When checked, this page will be shown on startup.", '勾选后启动时显示此页面。', 1],
	['browser/gettingStarted.ts', 'Show welcome page on startup', '启动时显示欢迎页', 1],
	['browser/gettingStarted.ts', "localize('recent', \"Recent\")", "localize('recent', \"最近打开\")", 1],
	['browser/gettingStarted.ts', "You have no recent folders,", '你还没有打开过文件夹，', 1],
	['browser/gettingStarted.ts', "localize('openFolder', \"open a folder\")", "localize('openFolder', \"打开一个文件夹\")", 1],
	['browser/gettingStarted.ts', "localize('toStart', \"to start.\")", "localize('toStart', \"开始使用。\")", 1],
	['browser/gettingStarted.ts', "localize('start', \"Start\")", "localize('start', \"开始\")", 1],
	['browser/gettingStarted.ts', "localize('walkthroughs', \"Walkthroughs\")", "localize('walkthroughs', \"使用指南\")", 1],
	['browser/gettingStarted.ts', "localize('goBack', \"Go Back\")", "localize('goBack', \"返回\")", 2],
	['browser/gettingStarted.ts', "localize('allDone', \"Mark Done\")", "localize('allDone', \"标记完成\")", 1],
	['browser/gettingStarted.ts', "localize('nextOne', \"Next Section\")", "localize('nextOne', \"下一节\")", 1],
	['common/gettingStartedContent.ts', 'Get started with VS Code', '从零开始用 Olympia', 1],
	['common/gettingStartedContent.ts', 'Customize your editor, learn the basics, and start coding', '配置你的编辑器，掌握基础，然后开始写代码', 2],
	['common/gettingStartedContent.ts', "'Setup VS Code'", "'配置 Olympia'", 1],
	['common/gettingStartedContent.ts', 'Get Started with VS Code for the Web', '为网页版准备的入门指南', 1],
	['common/gettingStartedContent.ts', 'Get Started with Accessibility Features', '无障碍功能入门', 1]
];

const cache = new Map();
const load = f => {
	if (!cache.has(f)) { cache.set(f, readFileSync(`${ROOT}/${f}`, 'utf8')); }
	return cache.get(f);
};

let failed = 0;
for (const [file, from, to, expected] of EDITS) {
	const text = load(file);
	const count = text.split(from).length - 1;
	if (count !== expected) {
		console.log(`MISS  ${file}  expected ${expected} got ${count}  :: ${from}`);
		failed++;
		continue;
	}
	cache.set(file, text.split(from).join(to));
	console.log(`OK    ${file}  x${count}  ${from.slice(0, 46)}`);
}

if (failed > 0) {
	console.log(`\n${failed} replacement(s) did not match. Nothing written.`);
	process.exit(1);
}

for (const [file, text] of cache) {
	writeFileSync(`${ROOT}/${file}`, text, 'utf8');
	const hasBom = text.charCodeAt(0) === 0xFEFF;
	const hasReplacement = text.includes('\uFFFD');
	console.log(`WROTE ${file}  bom=${hasBom}  U+FFFD=${hasReplacement}`);
}
