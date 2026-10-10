/* Dumps every link entry in the gcc package so the materialisation rules can be written from facts. */
import fs from 'node:fs';
import zlib from 'node:zlib';

const pkg = process.argv[2];
const buf = zlib.zstdDecompressSync(fs.readFileSync(pkg));
const tar = buf;

function readStr(o, len) {
	let end = o;
	const limit = o + len;
	while (end < limit && tar[end] !== 0) { end++; }
	return tar.toString('utf8', o, end);
}

let offset = 0;
let longPath = null;
const links = [];
const files = [];

while (offset + 512 <= tar.length) {
	const header = tar.subarray(offset, offset + 512);
	offset += 512;
	if (header.every(b => b === 0)) { continue; }

	const rawName = readStr(0, 100);
	const size = parseInt(readStr(124, 12).trim(), 8) || 0;
	const typeflag = String.fromCharCode(header[156]);
	const linkName = readStr(157, 100);
	const prefix = readStr(345, 155).trim();

	let name = prefix ? `${prefix}/${rawName}` : rawName;
	if (typeflag === 'L') {
		longPath = tar.subarray(offset, offset + size).toString('utf8').replace(/\0+$/, '');
		offset += Math.ceil(size / 512) * 512;
		continue;
	}
	if (longPath) { name = longPath; longPath = null; }
	if (name.startsWith('mingw64/')) { name = name.slice(7); }

	const dataStart = offset;
	offset += Math.ceil(size / 512) * 512;

	if (typeflag === '2' || typeflag === '1') {
		links.push({ name, linkName, type: typeflag === '2' ? 'sym' : 'hard' });
	} else if (typeflag === '0' || typeflag === '\0' || typeflag === '') {
		if (/g\+\+|gcc$|cc\.exe|c\+\+\.exe/.test(name)) {
			files.push({ name, size });
		}
	}
}

console.log('--- link entries ---');
links.forEach(l => console.log(`  ${l.type}  ${l.name}  ->  ${l.linkName}`));
console.log('');
console.log('--- compiler-ish regular files ---');
files.forEach(f => console.log(`  ${f.size}\t${f.name}`));
console.log('');
console.log(`total links=${links.length}`);