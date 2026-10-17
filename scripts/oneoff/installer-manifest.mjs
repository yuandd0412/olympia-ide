// 安装器分卷清单：把 DEPLOY.md 里那张「每个文件多少字节」的表按真产物重新生成。
//
//   node scripts/oneoff/installer-manifest.mjs [目录]
//
// 为什么要有这个：那张表原先是手抄的。抄的时候对得上，下一次打包就悄悄错了——
// 而发版的人正是照它逐片核对「有没有下全」的。数字错了不是文档难看，是会让人在
// 该喊「缺片」的地方以为齐了。所以每次打包后跑一遍，把输出贴回 DEPLOY.md。
//
// 默认读打包任务的落盘位置：oss/.build/win32-x64/user-setup
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const dir = process.argv[2] ?? 'oss/.build/win32-x64/user-setup';
if (!existsSync(dir)) {
	console.error(`找不到目录：${dir}\n先跑 build/oss-package.ps1 与 gulp vscode-win32-x64-user-setup。`);
	process.exit(1);
}

const GITEE_LIMIT_DECIMAL = 100_000_000;
const entries = readdirSync(dir)
	.filter(name => /^(OlympiaSetup.*\.(exe|bin)|setup-.*\.json)$/.test(name) && statSync(join(dir, name)).isFile())
	.map(name => ({ name, size: statSync(join(dir, name)).size }))
	.sort((a, b) => a.name.localeCompare(b.name, 'en'));

if (entries.length === 0) { console.error(`${dir} 里没有 OlympiaSetup* 分卷`); process.exit(1); }

const version = existsSync(join(dir, 'product.json'))
	? JSON.parse(readFileSync(join(dir, 'product.json'), 'utf8')).version
	: '(读不到 product.json)';

// 分卷集必须成套：少了任何一片，向导只会说「分卷没下全」，而发版文档得先知道缺的是哪片。
const bins = entries.filter(e => e.name.endsWith('.bin')).map(e => Number(e.name.match(/-(\d+)\.bin$/)?.[1]));
const gaps = bins.length === 0 ? ['没有 .bin 分卷']
	: [...Array(Math.max(...bins)).keys()].map(i => i + 1).filter(n => !bins.includes(n)).map(n => `缺第 ${n} 片`);

console.log(`目录：${dir}`);
console.log(`产品版本：${version}`);
console.log('');
console.log('| 文件 | 字节 |');
console.log('| --- | --- |');
for (const { name, size } of entries) {
	console.log(`| \`${name}\` | ${size.toLocaleString('en-US')} |`);
}
console.log('');
const over = entries.filter(e => e.size > GITEE_LIMIT_DECIMAL);
console.log(over.length === 0
	? `ok  每片都在 Gitee 单文件 ${GITEE_LIMIT_DECIMAL.toLocaleString('en-US')} 字节上限之内（最大一片 ${Math.max(...entries.map(e => e.size)).toLocaleString('en-US')}）`
	: `FAIL 超过上限，上传会被拒：${over.map(e => `${e.name} = ${e.size.toLocaleString('en-US')}`).join('、')}`);
console.log(gaps.length === 0 ? 'ok  分卷编号连续成套' : `FAIL 分卷不成套：${gaps.join('，')}`);
console.log(`合计 ${(entries.reduce((sum, e) => sum + e.size, 0) / 1024 / 1024).toFixed(1)} MiB（${entries.length} 个文件）`);
