/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/*
 * Proves the licence texts are inside the artifact that ships, not just in the source tree.
 *
 * scripts/oneoff/check-licence-surface.mjs checks the packaging *code* lists the right names;
 * a name that matches nothing is silently dropped, because upstream's gulp.src uses
 * `allowEmpty: true`. That is exactly how an installed directory once ended up with nothing but
 * LICENSES.chromium.html. This script reads the finished product directory instead, so the claim
 * "the product ships its licence text" is checked against the bytes a student receives.
 *
 * Run from a package step:   node build/verify-product-licence.mjs <productDir>
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const dist = process.argv[2];
if (!dist) {
	console.error('usage: node build/verify-product-licence.mjs <productDir>');
	process.exit(1);
}
const appDir = path.join(dist, 'resources', 'app');

let failed = 0;
function check(label, ok, detail) {
	if (ok) {
		console.log(`ok    ${label}`);
	} else {
		failed++;
		console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
	}
}

/** A licence file has to carry its own headline, otherwise an empty stub would pass. */
function expectText(rel, mustContain, minBytes = 1000) {
	const abs = path.join(dist, rel);
	if (!fs.existsSync(abs)) {
		check(rel, false, 'missing from the package');
		return;
	}
	const raw = fs.readFileSync(abs, 'utf8');
	const size = fs.statSync(abs).size;
	check(`${rel} 在产物里`, size >= minBytes && mustContain.every(s => raw.includes(s)),
		size < minBytes ? `只有 ${size} B` : `缺关键句：${mustContain.filter(s => !raw.includes(s)).join(' / ')}`);
}

expectText(path.join('resources', 'app', 'LICENSE.txt'), ['MIT License', 'Microsoft Corporation']);
expectText(path.join('resources', 'app', 'NOTICE.olympia.txt'), ['GPL-3.0-or-later', 'Electron', 'MSYS2']);
expectText(path.join('resources', 'app', 'GPL-3.0.txt'), ['GNU GENERAL PUBLIC LICENSE', 'Version 3'], 30_000);
expectText(path.join('resources', 'app', 'ThirdPartyNotices.txt'),
	['NOTICES', 'This repository incorporates material'], 100_000);
expectText(path.join('LICENSES.chromium.html'), ['Chromium'], 1_000_000);

// gulp drops the UTF-8 BOM on the way in (7,878 B in the repo, 7,875 B in the package). The
// installer's licence page reads NOTICE.olympia.txt out of the repo, where the BOM still is, so
// the strip only affects the copy a student opens by hand — but it has to be the only difference,
// otherwise a transform in the packaging stream is rewriting legal text without anyone deciding it.
const repoNotice = path.join(path.dirname(dist), 'oss', 'NOTICE.olympia.txt');
const shippedNotice = path.join(appDir, 'NOTICE.olympia.txt');
if (fs.existsSync(repoNotice) && fs.existsSync(shippedNotice)) {
	const source = fs.readFileSync(repoNotice);
	const withBom = source.subarray(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF]));
	const body = withBom ? source.subarray(3) : source;
	check('打包进去的 NOTICE 与仓库那份逐字节一致（只差 BOM）',
		withBom && body.equals(fs.readFileSync(shippedNotice)),
		`仓库 ${body.length} B / 产物 ${fs.statSync(shippedNotice).size} B，BOM=${withBom}`);
}

const productPath = path.join(appDir, 'product.json');
if (fs.existsSync(productPath)) {
	const product = JSON.parse(fs.readFileSync(productPath, 'utf8'));
	check('产物里的 licenseFileName 指得开', product.licenseFileName === 'LICENSE.txt', product.licenseFileName);
	check('产物里声明的许可证与 NOTICE 一致', typeof product.licenseName === 'string' &&
		fs.readFileSync(shippedNotice, 'utf8').includes(product.licenseName), product.licenseName);
} else {
	check('resources/app/product.json', false, '产物里没有 product.json');
}

console.log(failed ? '\nlicence text did NOT reach the package' : '\nlicence surface verified in the package');
process.exitCode = failed ? 1 : 0;
