// 检查台：聊天提示位与扩展推荐询问这两处噪声，出厂必须是不显示的。
//
//   node scripts/oneoff/test-noise-trim.mjs
//
// 2026-10-17 真机对照过：同一份工作区（.scratch/rec-shot，带 .vscode/extensions.json 推荐
// ms-vscode.cpptools / dbaeumer.vscode-eslint），把 extensions.ignoreRecommendations 显式设回
// 上游默认 false 时，右下角确实弹出「要安装为 此存储库 推荐的 来自 ms-vscode、dbaeumer 和
// 其他的扩展 吗？」；不设（走我们的出厂默认 true）时一条通知都没有。所以这条 PASS 不是空转。
//
// 这里盯的是另一种空转：被隐藏的 tip id 如果哪天被上游改名，隐藏名单会"成功"地什么也没隐藏。
import assert from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const ROOT = new URL('../../oss/src/vs/', import.meta.url);
const read = rel => readFileSync(new URL(rel, ROOT), 'utf8');
const results = [];
const check = (name, pass) => results.push([name, pass]);

// ---- 1. 扩展推荐：出厂把通知关掉，靠的是设置默认值，不是把代码路径删了 ----
const extContribution = read('workbench/contrib/extensions/browser/extensions.contribution.ts');
const block = (() => {
	const start = extContribution.indexOf("'extensions.ignoreRecommendations': {");
	assert.ok(start >= 0, '找不到 extensions.ignoreRecommendations 的设置块');
	const rest = extContribution.slice(start);
	const end = rest.indexOf('\n\t\t\t\'', 1);
	return end < 0 ? rest : rest.slice(0, end);
})();
check('设置块取到了，而且里面确实写着 default', /default: (true|false)/.test(block));
// 位置断言，不能只 test(/default: true/)：这一项下面还有 agentsWindow: { default: true, ... }，
// 光看"块里有没有 default: true"会把子作用域那条当成顶层那条，顶层改回 false 也照样绿。
const topLevelDefault = block.slice(0, block.indexOf('agentsWindow')).match(/default:\s*(true|false)/)?.[1];
check('extensions.ignoreRecommendations 出厂默认 true（顶层那一条，不是 agentsWindow 里的）', topLevelDefault === 'true');
// 夹具：只把「单独占一行的顶层 default」换成 false（agentsWindow 那条是写在行内的，
// 不会被这个替换命中），断言必须翻红——这才证明上面那条读的是顶层。
const upstreamBlock = block.replace(/(\n\t\t\t\t)default: true,/, '$1default: false,');
const upstreamTop = upstreamBlock.slice(0, upstreamBlock.indexOf('agentsWindow')).match(/default:\s*(true|false)/)?.[1];
check('夹具：顶层默认改回 false 时这一条会红', upstreamTop === 'false' && upstreamBlock !== block);
// 服务照旧在，只是不再弹通知：想主动装的人还能用「安装工作区推荐的扩展」这条命令。
const notifService = read('workbench/contrib/extensions/browser/extensionRecommendationNotificationService.ts');
check('推荐通知服务本身没被拆掉（只是默认不再打扰）',
	/async promptWorkspaceRecommendations\(/.test(notifService) && /hasToIgnoreRecommendationNotifications\(\)/.test(notifService));
check('命令仍在（学生主动装推荐扩展的路子留着）',
	/id: 'workbench\.extensions\.action\.installWorkspaceRecommendedExtensions'/.test(extContribution));

// ---- 2. 聊天提示位：/fork 那条不再出现在 Olympia ----
const tips = read('workbench/contrib/chat/browser/chatTipCatalog.ts');
const hidden = (() => {
	const start = tips.indexOf('const TIPS_HIDDEN_IN_OLYMPIA');
	assert.ok(start >= 0, '找不到 TIPS_HIDDEN_IN_OLYMPIA');
	const rest = tips.slice(start);
	return rest.slice(0, rest.indexOf('];'));
})();
check('tip.forkConversation 在隐藏名单里', hidden.includes("'tip.forkConversation'"));
// 关键的一条非空判断：被隐藏的 id 必须真的存在于上游清单里，
// 否则上游改个名，这条隐藏就成了"隐藏了一条不存在的提示"，界面照旧弹。
const allTipsBody = (() => {
	const start = tips.indexOf('const ALL_TIPS');
	const end = tips.indexOf('TIPS_HIDDEN_IN_OLYMPIA', start);
	return tips.slice(start, end);
})();
const hiddenIds = [...hidden.matchAll(/'(tip\.[\w]+)'/g)].map(m => m[1]);
check(`隐藏名单里 ${hiddenIds.length} 条 id 都还在上游 ALL_TIPS 清单中（改名就会翻红）`,
	hiddenIds.length >= 9 && hiddenIds.every(id => allTipsBody.includes(`id: '${id}'`)));
check('过滤真的接在导出上（TIP_CATALOG = ALL_TIPS.filter(...)）',
	/export const TIP_CATALOG: readonly ITipDefinition\[\] = ALL_TIPS\.filter\(tip => !TIPS_HIDDEN_IN_OLYMPIA\.includes\(tip\.id\)\)/.test(tips));
// 夹具：把过滤换成直接导出 ALL_TIPS，断言必须翻红。
check('夹具：换成不过滤时，接在导出上这条会红',
	!/export const TIP_CATALOG: readonly ITipDefinition\[\] = ALL_TIPS\.filter/.test(
		tips.replace(/export const TIP_CATALOG[^\n]*/, 'export const TIP_CATALOG: readonly ITipDefinition[] = ALL_TIPS;')));

let failed = 0;
for (const [name, pass] of results) { if (!pass) { failed++; } console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); }
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exitCode = failed === 0 ? 0 : 1;
