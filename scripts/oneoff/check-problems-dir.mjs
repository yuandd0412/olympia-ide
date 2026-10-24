// 几个 Olympia 扩展共用「题面库目录」这一个事实：olympia-contest 往里写，olympia-onboarding
// 与 olympia-coach 从里面读。跨扩展没有 import 这条路，所以每个读的一侧要么读那条设置，
// 要么就写死了一份——写死的那份在学生改过目录之后立刻变成静默错误：题面明明在盘上，
// 教练却回「题面库里找不到这道题」（2026-10-17 查 coach.ts 时就是这个状态）。
//
// 这个门只回答两个问题：
//   1) 除了定义这条设置的 contest，谁还把 `.olympia/problems` 当作目录名硬编在代码里；
//   2) 各处的兜底默认值和 contest 注册的默认值是不是同一个字符串。
//
//   node scripts/oneoff/check-problems-dir.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverOlympiaExtensions } from './lib/olympia-extensions.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const extRoot = path.join(repoRoot, 'oss', 'extensions');
const SETTING = 'olympia.problem.problemsDir';
// 名单从磁盘发现，不写死：加了新扩展而忘了改这里，它写死题面目录就没人抓了。
const EXTENSIONS = discoverOlympiaExtensions(extRoot);

/** contest 是这条设置的主人：它的 package.json 里那个 default 就是目录的唯一真源。
 *  package.json 的 contributes.configuration 有好几种合法形状（对象、数组、带 properties 一层），
 *  所以这里递归找键名，而不是押某一种写法——押错了这个门会天天报「找不到定义」。 */
function findSettingSchema(node) {
	if (!node || typeof node !== 'object') { return undefined; }
	const direct = node[SETTING];
	if (direct && typeof direct === 'object') { return direct; }
	for (const child of Object.values(node)) {
		const found = findSettingSchema(child);
		if (found) { return found; }
	}
	return undefined;
}
const contestManifest = JSON.parse(fs.readFileSync(path.join(extRoot, 'olympia-contest', 'package.json'), 'utf8'));
const declared = findSettingSchema(contestManifest.contributes?.configuration);
assert.ok(declared?.default, `${SETTING} 在 olympia-contest/package.json 里找不到带 default 的定义`);
const ownerDefault = declared.default;

const fail = [];
const readers = [];
for (const ext of EXTENSIONS) {
	const srcDir = path.join(extRoot, ext, 'src');
	for (const name of fs.readdirSync(srcDir).filter(n => n.endsWith('.ts'))) {
		const file = path.join(srcDir, name);
		const text = fs.readFileSync(file, 'utf8');
		// 读了设置：文件里既调了 getConfiguration，又出现设置名本身。两侧写法不同
		// （一边 getConfiguration('olympia').get('problem.problemsDir')，一边把设置名存成常量），
		// 所以这里只要求两个线索都在同一个文件里，不押某一种形状。
		const readsSetting = /getConfiguration\(/.test(text) && /problemsDir/.test(text);
		if (readsSetting) { readers.push(`${ext}/src/${name}`); }
		// 只有真正拿这个目录去读文件的位置才算「依赖目录名」；注释行里提到不算，所以按行筛。
		const hardcoded = text.split(/\r?\n/)
			.filter(line => !/^\s*(\*|\/\/|\/\*)/.test(line))
			.map(line => line.match(/['"`]([^'"`\n]*\.olympia\/problems[^'"`\n]*)['"`]/))
			.filter(Boolean)
			.map(m => m[1]);
		if (!hardcoded.length) { continue; }
		if (ext === 'olympia-contest' && !readsSetting) { continue; }   // 主人自己那份是默认值的定义处
		if (!readsSetting) {
			fail.push(`${ext}/src/${name}：把题面目录写死成 ${hardcoded.join(' / ')}，却没读 ${SETTING}`);
			continue;
		}
		for (const h of hardcoded) {
			if (h !== ownerDefault) {
				fail.push(`${ext}/src/${name}：兜底默认 ${JSON.stringify(h)} 与 ${SETTING} 注册的默认 ${JSON.stringify(ownerDefault)} 不一致`);
			}
		}
	}
}
if (fail.length) {
	console.error(fail.map(f => `FAIL  ${f}`).join('\n'));
	process.exit(1);
}
// 数一下「读设置」的有几处：只有 1 处说明另一侧改回写死而没被上面的筛子抓到（比如它换了目录写法）。
assert.ok(readers.length >= 2, `只数到 ${readers.length} 处读 ${SETTING} 的文件（${readers.join('、')}），比预期少：多半是某一侧改了写法，这个门得跟着改`);
console.log(`ok    题面目录只有一个真源（${SETTING} = ${JSON.stringify(ownerDefault)}）；读它的 ${readers.length} 个文件：${readers.join('、')}`);
