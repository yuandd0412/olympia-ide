/* Runs the bundled g++ and prints everything it said, so a link failure names the missing piece. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || 'D:/oler-ide-v2/oss/.build/toolchain';
const gpp = path.join(root, 'bin', 'g++.exe');
const dir = fs.mkdtempSync(path.join(process.env.TEMP || 'C:/Windows/Temp', 'gccprobe-'));
const src = path.join(dir, 'main.cpp');
fs.writeFileSync(src, '#include <cstdio>\nint main(){int a,b;if(scanf("%d%d",&a,&b)!=2)return 1;printf("%d\\n",a+b);return 0;}\n');

const args = ['-std=c++23', '-fPIC', '-DONLINE_JUDGE', '-Wall', '-fno-asm', '-lm',
	'-o', path.join(dir, 'main.exe'), src];

const child = spawn(gpp, args, {
	cwd: dir,
	windowsHide: true,
	env: { ...process.env, PATH: `${path.join(root, 'bin')};${process.env.PATH}` },
});
let out = '', err = '';
child.stdout.on('data', c => out += c);
child.stderr.on('data', c => err += c);
child.on('close', code => {
	console.log(`exit=${code}`);
	if (out.trim()) { console.log('--- stdout ---'); console.log(out.trim()); }
	if (err.trim()) { console.log('--- stderr ---'); console.log(err.trim()); }
});