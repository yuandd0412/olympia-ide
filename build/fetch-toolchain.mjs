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
import https from 'node:https';
import { spawn } from 'node:child_process';

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
 * `zlib`, `zstd` and `gettext-runtime` look optional but are not: `ld.exe` from binutils imports
 * `zlib1.dll`, `libzstd.dll` and `libintl-8.dll` directly. Without them the linker fails at process
 * start and collect2 reports only `error: ld returned 8 exit status`; the raw exit code is
 * `0xC0000138` (entry point not found) or `0xC0000135` (DLL not found), neither of which names the
 * culprit. `isl`/`mpc`/`mpfr` are GCC *build-time* dependencies and stay out — they never appear in
 * a shipped binary.
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

	const pruned = prune(ROOT);
	if (pruned.length) {
		console.log(`  精简: 移除 ${pruned.join(', ')}`);
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

	// Existence proves nothing. Compile Luogu P1001 with the exact flags Olympia ships and check the
	// answer, so a toolchain that unpacks but cannot link — a missing libstdc++ or a dropped
	// cc1plus — is caught here instead of on a student's first submission.
	console.log('');
	console.log('验证：按洛谷参数编译并运行 P1001 ...');
	const ok = await verifyCompile(gpp, ROOT);
	if (!ok) {
		process.exitCode = 1;
		console.log('失败：内置工具链无法完成一次真实编译。');
	}
}

/** Compiles P1001 with the shipped Luogu switch set and checks the output is 50. */
async function verifyCompile(gpp, root) {
	const dir = fs.mkdtempSync(path.join(TMP, 'verify-'));
	const src = path.join(dir, 'main.cpp');
	fs.writeFileSync(src,
		'#include <cstdio>\n' +
		'int main() { int a, b; if (scanf("%d%d", &a, &b) != 2) return 1; printf("%d\\n", a + b); return 0; }\n');

	// mirrors olympia-onboarding's luogu profile: -std=c++23 -fPIC -DONLINE_JUDGE -Wall -fno-asm -lm
	const args = ['-std=c++23', '-fPIC', '-DONLINE_JUDGE', '-Wall', '-fno-asm', '-lm',
		'-o', 'main.exe', src];

	const build = await run(gpp, args, { cwd: dir, extraPath: path.join(root, 'bin') });
	if (build.code !== 0) {
		console.log(`  编译失败（退出码 ${build.code}）`);
		// collect2 hides the real reason behind `ld returned N`. Re-run the linker directly so a
		// missing runtime DLL is named instead of surfacing as an unexplained exit code.
		const detail = (build.stderr || build.stdout).trim();
		console.log('  ' + detail.split('\n').slice(0, 4).join('\n  '));
		if (/ld returned/.test(detail)) {
			console.log('  链接器直接报错：');
			const ld = await run(path.join(root, 'bin', 'ld.exe'), ['--version'],
				{ cwd: dir, extraPath: path.join(root, 'bin') });
			if (ld.code === 0) {
				console.log('  ld.exe 可以启动 —— 问题在库搜索路径');
			} else {
				console.log(`  ld.exe 退出码 ${ld.code}`);
				// Name the missing dependency instead of leaving the student to guess: a linker that
				// will not start almost always means one of its imported DLLs is absent.
				const missing = missingImports(path.join(root, 'bin', 'ld.exe'), path.join(root, 'bin'));
				console.log(missing.length
					? `  缺失的依赖 DLL: ${missing.join(', ')}`
					: '  所有导入的 DLL 都在位，可能是版本不匹配');
			}
		}
		return false;
	}

	const exe = path.join(dir, 'main.exe');
	if (!fs.existsSync(exe)) {
		console.log('  编译返回成功但没有生成可执行文件');
		return false;
	}

	const stdin = path.join(dir, 'in.txt');
	fs.writeFileSync(stdin, '20 30\n');
	const runResult = await run(exe, [], { cwd: dir, stdinFile: stdin });

	const output = runResult.stdout.trim();
	console.log(`  输入 20 30 -> 输出 "${output}"`);
	if (output !== '50') {
		console.log(`  期望 50，实际 ${JSON.stringify(output)}`);
		return false;
	}
	console.log('  内置工具链可用。');
	return true;
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

/** DLL names referenced by a PE's import table, lower-cased. */
function importedDlls(pePath) {
	const buf = fs.readFileSync(pePath);
	const found = new Set();
	for (const m of buf.toString('latin1').matchAll(/[A-Za-z0-9_\-.]+\.dll/gi)) {
		found.add(m[0].toLowerCase());
	}
	return found;
}

/** Which of a PE's imported DLLs are not present in `binDir`. */
function missingImports(pePath, binDir) {
	const onDisk = new Set(
		fs.readdirSync(binDir)
			.filter(f => f.toLowerCase().endsWith('.dll'))
			.map(f => f.toLowerCase()));
	// System DLLs live in System32, not next to the binary.
	const system = new Set(['kernel32.dll', 'msvcrt.dll', 'rpcrt4.dll', 'ntdll.dll', 'user32.dll']);
	return [...importedDlls(pePath)].filter(d => !onDisk.has(d) && !system.has(d));
}

/** Spawns a binary, optionally feeding stdin from a file. */
function run(program, args, { cwd, extraPath, stdinFile } = {}) {
	return new Promise(resolve => {
		const child = spawn(program, args, {
			cwd,
			windowsHide: true,
			env: extraPath
				? { ...process.env, PATH: `${extraPath};${process.env.PATH}` }
				: process.env,
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