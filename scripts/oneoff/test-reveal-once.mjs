// 首启一次性带出「Olympia：竞赛工具」面板的实现检查。
//
// 这份断言读的是**源码与 package.json**，不启动 IDE —— 两种窗口形状（有文件夹 /
// 双击单文件无文件夹）的真实核对在装机后的真窗口里做，那是另一件事。
// 断言能守住的是「代码写错了」这一类：把视图 id 当成命令、标记读写不一致、
// 没有延迟、失败会炸启动、依赖了 workspace folder。
//
//   node scripts/oneoff/test-reveal-once.mjs
//
// 只读源码，不需要先编译扩展。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const ext = path.join(repoRoot, 'oss/extensions/olympia-onboarding');
const src = fs.readFileSync(path.join(ext, 'src', 'extension.ts'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(ext, 'package.json'), 'utf8'));

let failed = 0;
function check(ok, msg) {
	if (ok) { console.log(`ok    ${msg}`); } else { failed++; console.log(`FAIL  ${msg}`); }
}

/** 取 globalState.<method>( 的第一个实参：字面量字符串或标识符常量名。 */
function extractKey(method) {
	const re = new RegExp(`globalState\\.${method}\\(\\s*(?:['"]([^'"]+)['"]|([A-Za-z_][A-Za-z0-9_]*))`);
	const m = src.match(re);
	return m ? (m[1] ?? m[2] ?? null) : null;
}

/** 取某个函数名之后的一小段源码，用于局部断言。 */
function snippet(anchor, length = 2200) {
	const i = src.indexOf(anchor);
	return i < 0 ? '' : src.slice(i, i + length);
}

const containerId = pkg.contributes?.viewsContainers?.activitybar?.[0]?.id;
const viewId = pkg.contributes?.views?.[containerId]?.[0]?.id;

check(containerId === 'olympia', `活动栏视图容器 id 是 olympia（实际 ${containerId}）`);
check(viewId === 'olympia.tools', `容器里的视图 id 是 olympia.tools（实际 ${viewId}）`);

// 1) 命令必须由**容器**推出来。视图 id 拼出来的命令根本不存在。
const containerCmd = `workbench.view.extension.${containerId}`;
check(src.includes(containerCmd), `执行的是容器命令 ${containerCmd}`);
check(!src.includes(`workbench.view.extension.${viewId}`),
	`没有把视图 id 当命令用（${containerCmd}.${viewId} 这条不存在）`);
check(!/executeCommand\(\s*['"`]workbench\.view\.extension\.olympia\.tools/.test(src),
	'没有直接对视图 id 执行 workbench.view.extension.*');

// 2) 一次性：标记读和写必须是同一个 key，且都存在。
const getKey = extractKey('get');
const updateKey = extractKey('update');
check(getKey !== null, `读了 globalState 标记（${getKey}）`);
check(updateKey !== null, `写了 globalState 标记（${updateKey}）`);
check(getKey !== null && getKey === updateKey,
	`标记读写的是同一个 key（get=${getKey} update=${updateKey}）`);
check(!/globalState\.set\(/.test(src), '没有绕过 globalState 直接写存储');

// 3) 有延迟，且不短到跟首启演练打架。
const delay = src.match(/(?:REVEAL[A-Z_]*_MS|REVEAL_DELAY)\s*=\s*(\d+)/);
check(delay !== null && Number(delay[1]) >= 1500,
	`带延迟（${delay ? delay[1] : '?'} ms），不跟首启演练抢时机`);
check(/setTimeout/.test(src), '用 setTimeout 延后执行');

// 4) 失败不炸启动：executeCommand 包在 try/catch 里。
check(/try\s*\{[\s\S]{0,600}executeCommand\([\s\S]{0,300}catch/.test(src),
	'executeCommand 包在 try/catch 里，失败不会把启动带崩');
check(/catch/.test(snippet('reveal', 2500)), 'catch 分支把失败原因写下来，而不是吞掉');

// 5) 无文件夹形态：reveal 逻辑不碰 workspace folder。
const revealBody = snippet('reveal', 2500);
check(revealBody.length > 0, '找到 reveal 相关实现');
check(!/workspaceFolders/.test(revealBody),
	'reveal 逻辑不依赖 workspace.workspaceFolders（双击单文件、无文件夹的形态也能用）');

// 6) activate 里确实调用了它。
check(/revealToolsPanelOnce\(\s*context\s*\)/.test(src), 'activate 里调用了 revealToolsPanelOnce(context)');

// 7) 激活时机没被改掉。
check(JSON.stringify(pkg.activationEvents) === JSON.stringify(['onStartupFinished']),
	`activationEvents 仍是 onStartupFinished（实际 ${JSON.stringify(pkg.activationEvents)}）`);

console.log(failed ? `\nFAILED (${failed})` : `\nall reveal-once assertions passed`);
process.exit(failed ? 1 : 0);
