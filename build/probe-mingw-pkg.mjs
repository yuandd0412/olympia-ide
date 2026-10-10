/* Reports the newest build of each MinGW-w64 package we would need, plus its download size. */
import fs from 'node:fs';

const html = fs.readFileSync('D:/oler-ide-v2/build/mingw64-index.html', 'utf8');

/** package prefix -> whether Olympia actually needs it */
const WANT = {
	'gcc-libs': true,      // libstdc++, libgcc, libgomp — required at link time
	'gcc': true,           // g++ / gcc / cpp driver
	'binutils': true,      // as, ld, ar
	'crt': true,           // crt*.o startup objects
	'headers': true,       // standard headers + the bits they include
	'libwinpthread': true, // libstdc++ links against it on mingw-w64
	'isl': false,          // only a gcc build-time dependency, not needed at runtime
	'mpc': false,
	'mpfr': false,
	'zstd': false,
	'windows-default-manifest': false,
};

/** "1.2 MB" / "345 kB" / "1.1 GiB" -> bytes */
function toBytes(text) {
	const m = /([\d.]+)\s*([kMGT]?)(?:i?B)?/i.exec(text);
	if (!m) { return NaN; }
	const mult = { '': 1, k: 1e3, m: 1e6, g: 1e9, t: 1e12 }[m[2].toLowerCase()];
	return Number(m[1]) * mult;
}

function cmpVersion(a, b) {
	const pa = a.split('-').map(Number);
	const pb = b.split('-').map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const d = (pa[i] || 0) - (pb[i] || 0);
		if (d) { return d; }
	}
	return 0;
}

const rows = [];
for (const [pkg, needed] of Object.entries(WANT)) {
	const rx = new RegExp(
		`mingw-w64-x86_64-${pkg}-([0-9][^"]*?)\\.pkg\\.tar\\.zst"[^>]*>[^<]*</a></td><td class="size">([^<]*)<`,
		'g');
	let m;
	const all = [];
	while ((m = rx.exec(html)) !== null) {
		all.push({ ver: m[1], size: m[2].trim() });
	}
	if (!all.length) {
		console.log(`${pkg.padEnd(26)} NOT FOUND`);
		continue;
	}
	all.sort((a, b) => cmpVersion(a.ver, b.ver));
	const newest = all[all.length - 1];
	const bytes = toBytes(newest.size);
	rows.push({ pkg, needed, newest, bytes });
	console.log(
		`${(needed ? '[need] ' : '[opt]  ') + pkg.padEnd(14)}` +
		`${newest.ver.padEnd(34)}${newest.size.padEnd(10)}(${all.length} builds)`);
}

const neededBytes = rows.filter(r => r.needed && !Number.isNaN(r.bytes)).reduce((s, r) => s + r.bytes, 0);
const optBytes = rows.filter(r => !r.needed && !Number.isNaN(r.bytes)).reduce((s, r) => s + r.bytes, 0);

console.log('');
console.log(`必需包压缩后合计 : ${(neededBytes / 1e6).toFixed(1)} MB`);
console.log(`可选依赖合计    : ${(optBytes / 1e6).toFixed(1)} MB`);
console.log('');

// .pkg.tar.zst -> extracted is typically 3-4x for a toolchain
console.log(`解压后估算        : ${(neededBytes * 3 / 1e6).toFixed(0)} ~ ${(neededBytes * 4 / 1e6).toFixed(0)} MB`);
console.log('');
for (const r of rows.filter(r => r.needed)) {
	const url = `https://mirrors.tuna.tsinghua.edu.cn/msys2/mingw/mingw64/mingw-w64-x86_64-${r.pkg}-${r.newest.ver}-any.pkg.tar.zst`;
	console.log(url);
}