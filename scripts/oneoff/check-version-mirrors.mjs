/*---------------------------------------------------------------------------------------------
 * 镜像字面量对拍：源码里那些「抄来的版本号」必须等于真源。
 *
 * 为什么留字面量而不是直接取：olympia-contest 的 net.ts 必须能被纯 Node 加载
 * （build/test-contest-fetch.mjs 直接 require out/sources.js），一旦为了取版本 import vscode，
 * 那个测试就当场崩掉——这条是实测出来的，不是推测。所以版本留在字面量里，由这道门钉住。
 * 加新条目时写清楚「真源是谁」，否则下一句「无问题」又是感觉。
 *--------------------------------------------------------------------------------------------*/

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

const productVersion = JSON.parse(read('oss/package.json')).version;
assert.ok(/^\d+\.\d+\.\d+$/.test(productVersion), `oss/package.json 的 version 不像版本号：${productVersion}`);
const majorMinor = productVersion.split('.').slice(0, 2).join('.');

const MIRRORS = [
	{
		file: 'oss/extensions/olympia-contest/src/net.ts',
		name: 'UA_PRODUCT_VERSION',
		re: /const UA_PRODUCT_VERSION = '([^']+)'/,
		want: majorMinor,
		真源: 'oss/package.json 的 version（取 major.minor）',
	},
];

const bad = [];
for (const m of MIRRORS) {
	const text = read(m.file);
	const found = m.re.exec(text);
	if (!found) { bad.push(`${m.file} 里找不到 ${m.name} —— 它被删了或改名了，这道门就白名单失效了`); continue; }
	if (found[1] !== m.want) { bad.push(`${m.file} 的 ${m.name} 是 '${found[1]}'，但 ${m.真源} 现在是 '${m.want}'。改 ${m.name}，别改真源。`); continue; }
	console.log(`ok    ${m.name} = '${found[1]}'  ==  ${m.真源} '${m.want}'`);
}
if (bad.length) { for (const b of bad) { console.log(`FAIL ${b}`); } }
assert.ok(MIRRORS.length >= 1, '一条镜像都没有：这道门空转');
assert.deepStrictEqual(bad, []);
console.log(`\n${MIRRORS.length} 处镜像字面量与真源一致`);
