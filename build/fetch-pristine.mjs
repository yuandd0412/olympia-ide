// Fetch the pristine upstream content of the 79 damaged files, one blob at a
// time, out of the partial clone at build/recovery/vscode-pristine.
// Each `git show` triggers a targeted promisor fetch (a few KB), which is far
// more reliable than pulling the whole src/vs tree over this network.
//
//   node build/fetch-pristine.mjs
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const REPO = 'D:/oler-ide-v2/build/recovery/vscode-pristine';
const OUT = 'D:/oler-ide-v2/build/recovery/pristine/src/vs';
const LIST = 'D:/oler-ide-v2/build/damaged-files.json';

const files = JSON.parse(readFileSync(LIST, 'utf8'));
console.log(`fetching ${files.length} pristine blobs from ${REPO}\n`);

const env = { ...process.env, HTTP_PROXY: '', HTTPS_PROXY: '', ALL_PROXY: '' };
const gitArgs = ['-C', REPO, '-c', 'http.proxy=', '-c', 'https.proxy=', '-c', 'core.symlinks=false', 'show'];

let ok = 0;
const failed = [];

files.forEach((rel, i) => {
	const dst = join(OUT, rel);
	if (existsSync(dst)) { ok++; return; }
	mkdirSync(dirname(dst), { recursive: true });
	try {
		const buf = execFileSync('git', [...gitArgs, `HEAD:src/vs/${rel}`], {
			env, maxBuffer: 64 * 1024 * 1024, encoding: 'buffer',
		});
		writeFileSync(dst, buf);
		ok++;
		process.stdout.write(`  [${String(i + 1).padStart(2)}/${files.length}] ${String(buf.length).padStart(7)}b  ${rel}\n`);
	} catch (e) {
		failed.push(rel);
		process.stdout.write(`  [${String(i + 1).padStart(2)}/${files.length}] FAILED  ${rel}  ${String(e.message).slice(0, 90)}\n`);
	}
});

console.log(`\nfetched ${ok}/${files.length}`);
if (failed.length) {
	console.log(`FAILED (${failed.length}):`);
	for (const f of failed) { console.log('  ' + f); }
	process.exitCode = 1;
}