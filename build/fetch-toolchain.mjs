/*---------------------------------------------------------------------------------------------
 *  Downloads and assembles the bundled MinGW-w64 toolchain.
 *
 *  Olympia ships a working C++ compiler so a student never has to install one. The toolchain is
 *  assembled from MSYS2's official `mingw-w64-x86_64-*` packages, which are plain
 *  `.pkg.tar.zst` archives — Node 24 can decompress zstd natively, so no external tooling is
 *  required on any machine that can run Olympia.
 *
 *  Why MSYS2 packages rather than a single prebuilt tarball: the individual packages are the
 *  upstream's own build output, they are individually verifiable (every one ships a .sig), and
 *  assembling only the six packages a compiler needs keeps the payload at ~64 MB instead of the
 *  ~1 GB a full MSYS2 environment carries.
 *
 *  Output layout:  <out>/mingw64/       toolchain root (add this to PATH)
 *                  <out>/LICENSE.txt   upstream notices, shipped alongside the binaries
 *
 *  Usage:  node fetch-toolchain.mjs --out=D:/oler-ide-v2/oss/.build/toolchain
 *--------------------------------------------------------------------------------------------*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import { spawn } from 'node:child_process';
import { buildProviderIndex, scanPES } from './pe-imports.mjs';

/** Mirrors in preference order. The default MSYS2 host is kept as a fallback. */
const MIRRORS = [
	'https://mirrors.tuna.tsinghua.edu.cn/msys2/mingw/mingw64/',
	'https://mirror.nju.edu.cn/msys2/mingw/mingw64/',
	'https://repo.msys2.org/mingw/mingw64/',
];

/**
 * Windows' own bsdtar is pinned rather than looked up. Git Bash puts a GNU tar without zstd support
 * earlier on PATH, and that one also reads an absolute `C:\…` argument as `host:path`, so an
 * assembly started from a Git shell fails on the very first package instead of producing a tree.
 */
const TAR = fs.existsSync('C:/Windows/System32/tar.exe') ? 'C:/Windows/System32/tar.exe' : 'tar';

/**
 * The packages a working g++ needs at runtime.
 *
 * The list is NOT a judgement call about what a compiler "should" need — `ensureDependencyClosure`
 * below reads every PE's import table and fails the build when something is still unresolved, so
 * adding a package here is the only way to keep the tree loadable.
 *
 * `zlib`, `zstd` and `gettext-runtime` look optional but are not: `ld.exe` from binutils imports
 * `zlib1.dll`, `libzstd.dll` and `libintl-8.dll` directly. Without them the linker fails at process
 * start and collect2 reports only `error: ld returned 8 exit status`; the raw exit code is
 * `0xC0000138` (entry point not found) or `0xC0000135` (DLL not found), neither of which names the
 * culprit.
 *
 * `gmp`/`isl`/`mpc`/`mpfr` and `libiconv` were excluded on the strength of an earlier note here
 * claiming they are build-time-only dependencies. That was wrong and it shipped a toolchain that
 * could not compile anything on a machine without another MinGW on PATH: `cc1plus.exe` imports all
 * four math libraries, and `libintl-8.dll` imports `libiconv-2.dll`, which takes down every
 * binutils program — 41 executables in the shipped tree. A DLL the loader cannot find is not a
 * warning; the process dies before it prints anything, which is why the failure looked like a
 * silent `--- 编译失败 ---`.
 */
const PACKAGES = [
	{ name: 'gcc-libs', why: 'libstdc++ / libgcc — linked into every produced binary' },
	{ name: 'gcc', why: 'g++, gcc, cpp drivers and cc1/cc1plus' },
	{ name: 'binutils', why: 'as, ld, ar — the assembler and linker' },
	{ name: 'crt', why: 'crt*.o startup objects' },
	{ name: 'headers', why: 'standard headers plus what they transitively include' },
	{ name: 'libwinpthread', why: 'libwinpthread-1.dll — the POSIX threads runtime' },
	/**
	 * `winpthreads-git`, not `winpthreads-stub`. The stub carries only `libpthread.a` plus the three
	 * `pthread_*.h` sub-headers, and the staged tree then compiles every program that reaches
	 * libstdc++'s `gthr-default.h` — i.e. anything including `<iostream>` or `<bits/stdc++.h>` —
	 * with `fatal error: pthread.h: No such file or directory`, because this GCC was configured
	 * `--enable-threads=posix` and only the -git package installs `pthread.h` / `semaphore.h`.
	 * The -git package is a superset of the stub's link libraries, so nothing else is lost.
	 */
	{ name: 'winpthreads-git', why: 'pthread.h / semaphore.h and the -lpthread import libraries' },
	{ name: 'zlib', why: 'zlib1.dll — ld.exe will not start without it' },
	{ name: 'zstd', why: 'libzstd.dll — imported by ld.exe for compressed debug sections' },
	{ name: 'gettext-runtime', why: 'libintl-8.dll — imported by ld.exe' },
	// Imported by libintl-8.dll itself, so it is invisible to anyone who only checks ld.exe.
	{ name: 'libiconv', why: 'libiconv-2.dll — imported by libintl-8.dll, i.e. by all of binutils' },
	{ name: 'gmp', why: 'libgmp-10.dll — imported by cc1/cc1plus' },
	{ name: 'mpfr', why: 'libmpfr-6.dll — imported by cc1/cc1plus' },
	{ name: 'mpc', why: 'libmpc-3.dll — imported by cc1/cc1plus' },
	{ name: 'isl', why: 'libisl-23.dll — imported by cc1/cc1plus (graphite loops)' },
	{ name: 'windows-default-manifest', why: 'default-manifest.o — collect2 links it unconditionally' },
];

const TMP = path.join(process.env.TEMP || 'C:/Windows/Temp', 'olympia-toolchain-fetch');

function arg(name, fallback) {
	const hit = process.argv.find(a => a.startsWith(`--${name}=`));
	return hit ? hit.slice(name.length + 3) : fallback;
}

const OUT = path.resolve(arg('out', 'D:/oler-ide-v2/oss/.build/toolchain'));
/** MSYS2's own layout expects the prefix to survive; see extractPkg. */
const ROOT = path.join(OUT, 'mingw64');
/** --force ignores the download cache and re-pulls every package */
const FORCE = process.argv.includes('--force');
const VERBOSE = process.argv.includes('--verbose');

function log(...a) { if (VERBOSE) { console.log(...a); } }

/** Downloads with redirect following; MSYS2 mirrors occasionally 302 to a CDN. */
function download(url, redirectsLeft = 5) {
	return new Promise((resolve, reject) => {
		const req = https.get(url, { headers: { 'User-Agent': 'olympia-ide-toolchain/1' } }, res => {
			if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				res.resume();
				if (redirectsLeft <= 0) { reject(new Error(`too many redirects: ${url}`)); return; }
				resolve(download(new URL(res.headers.location, url).toString(), redirectsLeft - 1));
				return;
			}
			if (res.statusCode !== 200) {
				res.resume();
				reject(new Error(`HTTP ${res.statusCode} for ${url}`));
				return;
			}
			resolve(res);
		});
		req.on('error', reject);
		req.setTimeout(120000, () => req.destroy(new Error(`timeout: ${url}`)));
	});
}

/** Streams the index once, then resolves each package to its newest build. */
async function resolveLatestVersions() {
	const index = await fetchText(`${MIRRORS[0]}`);
	const resolved = new Map();
	for (const { name } of PACKAGES) {
		const rx = new RegExp(
			`mingw-w64-x86_64-${name}-([0-9][^"]*?)\\.pkg\\.tar\\.zst"[^>]*>[^<]*</a></td><td class="size">([^<]*)<`,
			'g');
		const builds = [];
		let m;
		while ((m = rx.exec(index)) !== null) {
			builds.push({ ver: m[1], size: m[2].trim() });
		}
		if (!builds.length) { throw new Error(`package ${name} not found in index`); }
		builds.sort((a, b) => cmpVersion(a.ver, b.ver));
		resolved.set(name, builds[builds.length - 1]);
	}
	return resolved;
}

function fetchText(url) {
	return new Promise((resolve, reject) => {
		const req = https.get(url, { headers: { 'User-Agent': 'olympia-ide-toolchain/1' } }, res => {
			if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				res.resume();
				resolve(fetchText(new URL(res.headers.location, url).toString()));
				return;
			}
			if (res.statusCode !== 200) { res.reject(new Error(`HTTP ${res.statusCode}`)); return; }
			let d = '';
			res.setEncoding('utf8');
			res.on('data', c => d += c);
			res.on('end', () => resolve(d));
		});
		req.on('error', reject);
		req.setTimeout(120000, () => req.destroy(new Error('timeout')));
	});
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

/**
 * Extracts one `.pkg.tar.zst` into `dest/mingw64`.
 *
 * The archive's `mingw64/` prefix is KEPT rather than stripped. GCC resolves its sysroot relative
 * to its own location as `<prefix>/x86_64-w64-mingw32/...`, and that relationship only holds in
 * MSYS2's native layout — stripping the prefix produces a tree where every internal path resolves
 * one level too high and linking fails with a bare `collect2: error: ld returned 8`.
 *
 * `-C dest` (not `dest/mingw64`): the archive already carries the prefix, so pointing tar at an
 * extra mingw64 directory nests it twice and `bin/` ends up out of reach.
 */
function extractPkg(pkgPath, dest) {
	return new Promise((resolve, reject) => {
		const child = spawn(TAR, ['-xf', pkgPath, '-C', dest], {
			windowsHide: true,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let err = '';
		child.stderr.on('data', c => { err += c; });
		child.on('error', reject);
		child.on('close', code => {
			if (code === 0) { resolve(); return; }
			reject(new Error(`tar -xf 失败（退出码 ${code}）: ${err.trim().split('\n').slice(0, 3).join(' / ')}`));
		});
	});
}

/**
 * Replaces dangling/missing symlinks with real copies.
 *
 * Windows without developer mode cannot create symlinks, so an installer running `tar -xf` on a
 * machine in that state drops the link instead of creating it. The compiled driver that matters is
 * `g++.exe`; if the link did not survive, copy the binary it pointed at. Runs after extraction and
 * is a no-op when the links are already intact.
 */
function materialiseLinks(root) {
	const binDir = path.join(root, 'bin');
	if (!fs.existsSync(binDir)) { return 0; }

	// GCC's C++ driver is `g++ -> g++-<major> -> gcc`; the versioned name is what actually carries
	// the binary on some builds, so both are candidates for the copy source.
	const sources = ['gcc.exe', 'cc.exe'];
	let created = 0;

	for (const name of ['g++.exe', 'x86_64-w64-mingw32-g++.exe']) {
		const target = path.join(binDir, name);
		if (fs.existsSync(target)) { continue; }
		const src = sources.map(s => path.join(binDir, s)).find(s => fs.existsSync(s));
		if (!src) { continue; }
		fs.copyFileSync(src, target);
		created++;
	}
	return created;
}

/**
 * Picks the first mirror that answers.
 *
 * A 404 still counts as reachable: it proves DNS resolved and the host completed a request, which
 * is all this probe is for. Only network-level failures reject the mirror.
 */
async function pickMirror() {
	for (const m of MIRRORS) {
		try {
			await new Promise((resolve, reject) => {
				const req = https.get(`${m}mingw-w64-x86_64-zstd-1.5.7-2-any.pkg.tar.zst`,
					{ headers: { 'User-Agent': 'olympia-ide-toolchain/1' } },
					res => { res.resume(); resolve(); });
				req.on('error', reject);
				req.setTimeout(15000, () => req.destroy(new Error('timeout')));
			});
			console.log(`使用镜像: ${m}`);
			return m;
		} catch (err) {
			console.log(`  跳过 ${m} (${err.message})`);
		}
	}
	throw new Error('没有可用镜像：三个 MSYS2 镜像都无法访问');
}

async function main() {
	console.log(`输出目录: ${OUT}`);
	fs.mkdirSync(TMP, { recursive: true });
	fs.mkdirSync(OUT, { recursive: true });

	const mirror = await pickMirror();

	const latest = await resolveLatestVersions();
	console.log('');
	for (const { name, why } of PACKAGES) {
		const v = latest.get(name);
		console.log(`  ${name.padEnd(15)} ${v.ver.padEnd(32)} ${v.size.padEnd(10)} ${why}`);
	}
	console.log('');

	let total = 0;
	for (const { name } of PACKAGES) {
		const ver = latest.get(name).ver;
		// `ver` already carries MSYS2's release suffix (e.g. `15.2.0-14-any`), so the file name is
		// just prefix + ver. Appending `-any` again — as an earlier revision did — yields a 404.
		const file = `mingw-w64-x86_64-${name}-${ver}.pkg.tar.zst`;
		const url = `${mirror}${file}`;
		const dest = path.join(TMP, file);

		if (FORCE || !fs.existsSync(dest) || fs.statSync(dest).size === 0) {
			process.stdout.write(`  下载 ${name} (${latest.get(name).size}) ... `);
			const res = await download(url);
			const chunks = [];
			for await (const c of res) { chunks.push(c); }
			fs.writeFileSync(dest, Buffer.concat(chunks));
			console.log(`${(fs.statSync(dest).size / 1e6).toFixed(1)} MB`);
		} else {
			console.log(`  ${name}: 已有缓存，跳过`);
		}
		total += fs.statSync(dest).size;

		process.stdout.write(`  解压 ${name} ... `);
		await extractPkg(dest, OUT);
		console.log('完成');
	}

	const linked = materialiseLinks(ROOT);
	if (linked) {
		console.log(`  实体化 ${linked} 个编译器驱动（Windows 无符号链接支持）`);
	}

	// Import tables, not a hand-kept list, decide which DLL has to sit next to which image.
	const closure = ensureDependencyClosure(ROOT);
	const placed = new Map();
	for (const step of closure) { placed.set(step.dll, (placed.get(step.dll) ?? 0) + 1); }
	console.log(`  依赖闭包: 补位 ${closure.length} 次，涉及 ${placed.size} 个 DLL`);

	// Relocate licence texts before the docs prune: mpfr's only copy lives under share/doc.
	const relocated = relocateLicenceTexts(ROOT);

	const pruned = prune(ROOT);
	if (pruned.length) {
		console.log(`  精简: 移除 ${pruned.join(', ')}`);
	}

	const filled = ensureLicenceTexts(ROOT);
	if (relocated || filled.length) {
		console.log(`  许可证文本: 搬迁 ${relocated} 份，补齐 ${filled.join(' / ') || '无'}`);
	}

	console.log('');
	console.log(`下载总量: ${(total / 1e6).toFixed(1)} MB`);

	// report what actually landed, so a truncated download is obvious
	const gpp = path.join(ROOT, 'bin', 'g++.exe');
	const cc1plus = path.join(ROOT, 'lib', 'gcc', 'x86_64-w64-mingw32');
	console.log(`g++.exe      : ${fs.existsSync(gpp) ? 'OK' : 'MISSING'}`);
	console.log(`lib/gcc 目录 : ${fs.existsSync(cc1plus) ? 'OK' : 'MISSING'}`);

	let bytes = 0;
	let files = 0;
	const walk = d => {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			const p = path.join(d, e.name);
			if (e.isDirectory()) { walk(p); }
			else { files++; bytes += fs.statSync(p).size; }
		}
	};
	walk(OUT);
	console.log(`产物: ${files} 文件 / ${(bytes / 1e6).toFixed(1)} MB`);

	if (!fs.existsSync(gpp)) {
		process.exitCode = 1;
		console.log('\n失败：g++.exe 不存在，工具链不完整。');
		return;
	}

	// Existence proves nothing, and neither does the driver: see verifyToolchain for why the check
	// loads every image and compiles-and-runs under both shipped standards.
	console.log('');
	console.log('验证：逐个加载 exe，并按出厂参数在 c++23 / c++14 下各编译运行一次 ...');
	const problems = await verifyToolchain(ROOT);
	const provenance = await recordProvenance(ROOT, latest, total);
	console.log(`  编译器自报: ${provenance.compilerVersion}`);
	for (const problem of problems) { console.log(`  FAIL ${problem}`); }
	if (problems.length) {
		process.exitCode = 1;
		console.log(`\n失败：${problems.length} 项没通过，这份工具链不出厂。`);
		return;
	}
	console.log('\n内置工具链可用：所有 exe 可加载，两套标准均编译并运行成功。');
}

/**
 * Moves licence texts out of `share/doc` before the doc prune deletes it.
 *
 * MSYS2 packages are inconsistent about where the licence lives: `mpfr` ships `COPYING` and
 * `COPYING.LESSER` under `share/doc`, nowhere else, so pruning the docs directory would have been
 * stripping the licence of a library the installer distributes. LGPL and MIT both require the text
 * to travel with the binary, so anything that looks like a licence is relocated into the
 * `share/licenses/<package>` tree the notice files point at.
 */
function relocateLicenceTexts(root) {
	const doc = path.join(root, 'share', 'doc');
	const licences = path.join(root, 'share', 'licenses');
	if (!fs.existsSync(doc)) { return 0; }

	let moved = 0;
	for (const pkg of fs.readdirSync(doc)) {
		const from = path.join(doc, pkg);
		if (!fs.statSync(from).isDirectory()) { continue; }
		const texts = fs.readdirSync(from).filter(f => /^(copying|licen[cs]e|copyright)/i.test(f));
		if (!texts.length) { continue; }
		const to = path.join(licences, pkg);
		fs.mkdirSync(to, { recursive: true });
		for (const file of texts) {
			fs.renameSync(path.join(from, file), path.join(to, file));
			moved++;
		}
	}
	return moved;
}

/**
 * Makes sure every bundled runtime library has a licence text that actually ships.
 *
 * `gmp` and `mpc` carry none in their MSYS2 binary packages. Their licence is the FSF's LGPL-3.0,
 * whose canonical text the tree already distributes inside binutils, so the same bytes are placed
 * under their own `share/licenses` entry — the alternative is shipping an LGPL library with no
 * licence, which the notice file would then describe wrongly.
 *
 * `isl` is MIT, and the MIT text is a copyright line plus a permission notice: only the author's
 * own copy is valid, and neither this package nor any other file in the tree carries it. Shipping a
 * boilerplate MIT with a guessed copyright holder would be a fabrication, so this writes a pointer
 * and the declared licence stays honest in ThirdPartyNotices.txt until the upstream text is added.
 */
function ensureLicenceTexts(root) {
	const licences = path.join(root, 'share', 'licenses');
	const canonical = {
		lgpl3: path.join(licences, 'binutils', 'COPYING3.LIB'),
		gpl3: path.join(licences, 'binutils', 'COPYING3'),
	};
	const filled = [];

	for (const pkg of ['gmp', 'mpc']) {
		const dir = path.join(licences, pkg);
		if (fs.existsSync(dir) && fs.readdirSync(dir).length) { continue; }
		if (!fs.existsSync(canonical.lgpl3)) {
			throw new Error(`找不到 LGPL-3.0 正文（预期在 ${path.relative(root, canonical.lgpl3)}），`
				+ `无法为 ${pkg} 补上许可证；不能把一个 LGPL 库发出去却不带文本`);
		}
		fs.mkdirSync(dir, { recursive: true });
		fs.copyFileSync(canonical.lgpl3, path.join(dir, 'COPYING.LESSER'));
		if (fs.existsSync(canonical.gpl3)) { fs.copyFileSync(canonical.gpl3, path.join(dir, 'COPYING')); }
		filled.push(pkg);
	}

	const isl = path.join(licences, 'isl');
	if (!fs.existsSync(path.join(isl, 'COPYING'))) {
		fs.mkdirSync(isl, { recursive: true });
		fs.writeFileSync(path.join(isl, 'LICENCE-NOTICE.txt'),
			'libisl-23.dll - the ISL integer set library, MIT licensed.\r\n'
			+ 'Author: Cedric Bastoul and contributors, https://isl.inria.fr/\r\n'
			+ '\r\n'
			+ 'The MSYS2 binary package mingw-w64-x86_64-isl does not carry the licence text, and\r\n'
			+ 'MIT is a copyright notice plus a permission notice, so only the author\'s own copy of\r\n'
			+ 'it is a valid licence. Olympia IDE does not restate it here. Get it from the upstream\r\n'
			+ 'source release, where the COPYING file is part of the repository.\r\n');
		filled.push('isl(指针)');
	}
	return filled;
}

/**
 * Removes everything a compiler never reads.
 *
 * MSYS2 packages ship docs, man pages, info pages and gettext catalogues alongside the toolchain.
 * None of it is consulted during a build, and it is dead weight in an installer that ships to
 * students on metered connections. `share/licenses` is deliberately kept: the GPL notice has to
 * travel with the binaries.
 */
function prune(root) {
	const removed = [];
	for (const dir of ['share/doc', 'share/man', 'share/info', 'share/locale', 'share/gettext']) {
		const target = path.join(root, dir);
		if (fs.existsSync(target)) {
			removed.push(dir);
			removeTree(target);
		}
	}
	removed.push(...pruneStaticLibraries(root));
	return removed;
}

/**
 * Deletes static archives that no course-level C++ program links against.
 *
 * The `gcc-libs` package carries roughly 955 `.a` files totalling over 200 MB. Only two groups are
 * safe to drop:
 *
 *   - `cc1.exe.a` / `cc1plus.exe.a` (~61 MB) — GCC builds these to bootstrap itself during a
 *     compiler build. A shipped toolchain never loads them.
 *   - the Windows API-set archives (`libonecore*.a`, `libwindowscoreheadless*`, `libucrt*.a`, …) —
 *     nothing in a student's build names them, and the linker only pulls them if asked to.
 *
 * Everything else stays. An earlier revision tried to prune by a broad `lib*.a` pattern and the
 * toolchain stopped linking with `cannot find -lm / -lmsvcrt / -lkernel32` — those *are* required,
 * because the default GCC link line asks for them by name. Pruning has to be a short, explicit
 * deny-list; anything unproven stays.
 */
function pruneStaticLibraries(root) {
	const libDir = path.join(root, 'lib');
	if (!fs.existsSync(libDir)) { return []; }

	const removed = [];
	let freed = 0;

	const walk = dir => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, entry.name);
			if (entry.isDirectory()) { walk(p); continue; }
			const name = entry.name.toLowerCase();
			if (!name.endsWith('.a')) { continue; }

			// cc1/cc1plus archives exist only for GCC's self-bootstrap.
			const isBootstrap = name.startsWith('cc1');
			// Windows API-set archives, never named by a default or hand-written link line.
			const isApiSet = /^lib(onecore|windowscoreheadless|windows_[a-z]+|ucrt[a-z]+|api-ms-win)/.test(name);
			if (!isBootstrap && !isApiSet) { continue; }

			try {
				freed += fs.statSync(p).size;
				fs.unlinkSync(p);
				removed.push(entry.name);
			} catch {
				// a file the antivirus is holding is not worth failing the build over
			}
		}
	};
	walk(libDir);

	if (removed.length) {
		return [`${removed.length} 个自举/API-set 静态库 (${(freed / 1e6).toFixed(0)} MB)`];
	}
	return [];
}

function removeTree(target) {
	for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
		const p = path.join(target, entry.name);
		if (entry.isDirectory()) { removeTree(p); } else { fs.unlinkSync(p); }
	}
	fs.rmdirSync(target);
}

/**
 * Makes every PE in the tree loadable by itself.
 *
 * Windows looks for a DLL next to the image that imports it and then on PATH; it never searches a
 * sibling directory. The toolchain has three kinds of host directory — `bin`, the multi-arch
 * `x86_64-w64-mingw32\bin` that gcc actually spawns `as`/`ld` from, and
 * `lib\gcc\<triple>\<version>` that holds `cc1`/`cc1plus` — and the latter two originally held no
 * runtime DLLs at all. Filling only `bin` yields a tree where `-fsyntax-only` passes while `-c` and
 * linking die silently, a state harder to diagnose than the original failure, so the rule here is
 * per-image rather than per-package.
 *
 * Iterates to a fixpoint because a copied DLL carries its own imports: `libintl-8.dll` needs
 * `libiconv-2.dll`, which is how binutils was dead in the shipped tree.
 */
function ensureDependencyClosure(root) {
	const providers = buildProviderIndex(root);
	const copied = [];
	const unresolved = new Set();

	for (let pass = 0; pass < 5; pass++) {
		let didWork = false;
		for (const image of scanPES(root)) {
			for (const name of image.missing) {
				const source = providers.get(name);
				if (!source) {
					unresolved.add(`${path.relative(root, image.file)} → ${name}`);
					continue;
				}
				if (path.dirname(source).toLowerCase() === image.dir.toLowerCase()) { continue; }
				fs.copyFileSync(source, path.join(image.dir, path.basename(source)));
				copied.push({ dll: name, into: path.dirname(path.relative(root, image.file)) || '.' });
				didWork = true;
			}
		}
		if (!didWork) { break; }
	}

	if (unresolved.size) {
		const list = [...unresolved];
		throw new Error(
			`${list.length} 个导入在树里找不到提供者，这是缺包不是缺复制。往 PACKAGES 里补上对应的 `
			+ `mingw-w64-x86_64-* 包再重跑：\n  ${list.slice(0, 15).join('\n  ')}`);
	}
	return copied;
}

/** Every executable in the tree, so the health check can load each one. */
function listExecutables(root) {
	const out = [];
	const walk = dir => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, entry.name);
			if (entry.isDirectory()) { walk(p); } else if (/\.exe$/i.test(entry.name)) { out.push(p); }
		}
	};
	walk(root);
	return out.sort();
}

/**
 * Records what the tree really is.
 *
 * MSYS2 packages each carry a `.PKGINFO`/`.BUILDINFO` at the prefix root, so unpacking several
 * packages into one prefix leaves behind whichever one landed last — in the shipped tree that
 * described a package set that never existed here, including a GCC version the disk disagrees with.
 * Metadata that contradicts the binaries it labels is worse than none, so the foreign descriptors
 * are removed and replaced by provenance derived from this run: the package versions the index
 * served, the version the compiler reports when asked with no inherited PATH, and the digest of
 * each runtime DLL.
 */
async function recordProvenance(root, latest, fetchedBytes) {
	const bin = path.join(root, 'bin');
	for (const junk of ['.PKGINFO', '.BUILDINFO', '.MTREE', '.INSTALL']) {
		const p = path.join(root, junk);
		if (fs.existsSync(p)) { fs.rmSync(p); }
	}

	const version = await run(path.join(bin, 'g++.exe'), ['--version'], { cwd: bin, extraPath: bin });
	const dlls = {};
	for (const entry of fs.readdirSync(bin).filter(f => /\.dll$/i.test(f)).sort()) {
		const p = path.join(bin, entry);
		dlls[entry] = {
			sha256: crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),
			size: fs.statSync(p).size,
		};
	}

	const provenance = {
		generatedBy: 'build/fetch-toolchain.mjs',
		generatedAt: new Date().toISOString(),
		packages: [...latest.entries()].map(([name, v]) => ({ name: `mingw-w64-x86_64-${name}`, version: v.ver, size: v.size })),
		downloadedBytes: fetchedBytes,
		compilerVersion: (version.stdout || '').split('\n')[0].trim(),
		runtimeDlls: dlls,
	};
	fs.writeFileSync(path.join(root, '.olympia-toolchain.json'), `${JSON.stringify(provenance, null, '\t')}\n`);
	return provenance;
}

/**
 * The acceptance check: every image loads, and a real program compiles and runs.
 *
 * `g++ --version` proves almost nothing — the driver imports four DLLs that all tend to survive,
 * while `cc1plus`/`as`/`ld` die before printing a line, which is why a fatally broken tree once
 * reported "编译器就绪". A load failure arrives as an NTSTATUS in the 0xC00000xx range with empty
 * output, so that is what gets classified, not the exit code alone.
 *
 * The compile is split by stage (`-fsyntax-only` / `-c` / link / run) because each stage spawns a
 * different program, and it runs under both shipped standards: `c++23` is the Luogu profile,
 * `c++14` the NOI Linux one. Compiling without running is not enough either — the produced exe is
 * the only thing in the chain that needs the C++ runtime to be reachable at process start.
 */
async function verifyToolchain(root) {
	const bin = path.join(root, 'bin');
	const problems = [];

	const exes = listExecutables(root);
	let unloadable = 0;
	for (const file of exes) {
		const r = await run(file, ['--version'], { cwd: path.dirname(file), extraPath: bin });
		const code = r.code >>> 0;
		if (code >= 0xC0000000 && code <= 0xC00002FF) {
			unloadable++;
			problems.push(`${path.relative(root, file)} 无法启动（0x${code.toString(16)}），导入的 DLL 不在它自己那个目录里`);
		}
	}
	console.log(`  加载检查: ${exes.length} 个 exe，${unloadable} 个起不来`);

	const dir = fs.mkdtempSync(path.join(TMP, 'verify-'));
	const src = path.join(dir, 'main.cpp');
	fs.writeFileSync(src,
		'#include <bits/stdc++.h>\n'
		+ 'using namespace std;\n'
		+ 'int main() { int a, b; if (scanf("%d%d", &a, &b) != 2) return 1; cout << a + b << endl; return 0; }\n');
	// The flags the Luogu profile ships, minus the output selection.
	const flags = ['-x', 'c++', '-fPIC', '-DONLINE_JUDGE', '-Wall', '-fno-asm', '-lm'];

	for (const std of ['c++23', 'c++14']) {
		const stages = [
			{ name: '前端', args: ['-fsyntax-only', ...flags, `-std=${std}`, src] },
			{ name: '汇编', args: ['-c', ...flags, `-std=${std}`, '-o', 'main.o', src] },
			{ name: '链接', args: [...flags, `-std=${std}`, '-o', 'main.exe', src] },
		];
		for (const stage of stages) {
			const r = await run(path.join(bin, 'g++.exe'), stage.args, { cwd: dir, extraPath: bin });
			if (r.code !== 0) {
				const detail = (r.stderr || r.stdout).trim();
				problems.push(`-std=${std} 的「${stage.name}」阶段失败（退出码 ${r.code}）：`
					+ (detail ? detail.split('\n').slice(0, 3).join(' / ') : '编译器没有任何输出，可能是它自身无法启动'));
			}
		}

		const exe = path.join(dir, 'main.exe');
		if (!fs.existsSync(exe)) { problems.push(`-std=${std} 链接成功但没有产出 exe`); continue; }
		fs.writeFileSync(path.join(dir, 'in.txt'), '20 30\n');
		const ran = await run(exe, [], { cwd: dir, extraPath: bin, stdinFile: path.join(dir, 'in.txt') });
		const got = ran.stdout.trim();
		console.log(`  -std=${std}: 输入 20 30 -> "${got}"`);
		if (ran.code !== 0 || got !== '50') {
			problems.push(`-std=${std} 的产物运行失败（退出码 ${ran.code}，输出 ${JSON.stringify(got)}）`
				+ '，产物需要 libstdc++-6 / libgcc_s_seh-1 / libwinpthread-1 在 PATH 上或同目录');
		}
	}
	return problems;
}

/**
 * The environment a probe runs in.
 *
 * Never inherit PATH here. This assembly box has its own MinGW installed, so a check that borrows
 * the ambient PATH hands a broken tree a green result: `cc1plus` happily loads `libgmp-10.dll` from
 * an unrelated compiler and the shipped toolchain then fails on every machine that does not have
 * that compiler. The probe PATH is the toolchain's own `bin` plus System32, which is the same
 * situation a student's machine is in. Never let the build machine's ambient PATH decide the answer.
 */
function childEnv(extraDirs) {
	const systemRoot = process.env.SystemRoot || 'C:/Windows';
	return {
		SystemRoot: systemRoot,
		WINDIR: process.env.WINDIR || systemRoot,
		COMSPEC: process.env.COMSPEC || path.join(systemRoot, 'System32', 'cmd.exe'),
		TEMP: process.env.TEMP,
		TMP: process.env.TMP,
		PATH: [...extraDirs, path.join(systemRoot, 'System32')].join(';'),
	};
}

/** Spawns a binary, optionally feeding stdin from a file. */
function run(program, args, { cwd, extraPath, stdinFile } = {}) {
	return new Promise(resolve => {
		const child = spawn(program, args, {
			cwd,
			windowsHide: true,
			env: childEnv(extraPath ? [extraPath] : []),
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', c => { stdout += c; });
		child.stderr.on('data', c => { stderr += c; });
		// Pipe stdin from a file when asked. Calling child.stdin.end() here as well raced the
		// stream's own teardown and threw `dest.end is not a function` on the second path.
		child.stdin.on('error', () => { /* the child may exit before reading stdin */ });
		if (stdinFile) {
			fs.createReadStream(stdinFile).pipe(child.stdin);
		} else {
			child.stdin.end();
		}
		child.on('error', error => resolve({ code: -1, stdout, stderr: String(error) }));
		child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }));
	});
}

main().catch(err => {
	console.error(`失败: ${err.message}`);
	process.exitCode = 1;
});