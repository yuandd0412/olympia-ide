/*---------------------------------------------------------------------------------------------
 *  Finds user-facing Chinese strings that still name "VS Code".
 *
 *  Olympia is the product name users see, but the dictionaries were generated from the official
 *  VS Code language pack, so many translations kept the old product name inside an otherwise
 *  Chinese sentence. The previous rebrand passes worked over source literals; these leftovers sit
 *  in already-translated text, where a blanket replace is unsafe: strings that genuinely mean
 *  Microsoft's VS Code (a compatibility note, a remote-server mention, a URL, an extension id) have
 *  to stay, so this reports by default and only rewrites the candidates it is shown.
 *
 *  Usage:
 *    node build/audit-brand-leftovers.mjs            list candidates
 *    node build/audit-brand-leftovers.mjs --apply    replace VS Code -> Olympia in those literals
 *--------------------------------------------------------------------------------------------*/

import fs from 'fs';
import path from 'path';

const SRC = 'D:/oler-ide-v2/oss/src/vs';
const BUILD = 'D:/oler-ide-v2/build';
const apply = process.argv.includes('--apply');
const REPLACEMENT = 'Olympia';

// References that are about Microsoft's product, or that must keep the literal for correctness.
const KEEP_PATTERNS = [
	/https?:\/\//,
	/\bvscode:\/\//,
	/\bms-vscode|vscode-icon|vscode-theme/,
	/\bvscode\.[a-z]/i,
	/Visual Studio Code/i,
];

function walk(dir, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full, out);
		} else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
			out.push(full);
		}
	}
	return out;
}

function isChineseBearing(text) {
	return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
}

// Double-quoted literals on a line; localize messages are the only thing worth touching here.
const literalPattern = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;

const findings = [];
for (const file of walk(SRC)) {
	const lines = fs.readFileSync(file, 'utf8').split('\n');
	lines.forEach((line, index) => {
		if (!line.includes('VS Code') || !isChineseBearing(line)) {
			return;
		}
		let match;
		while ((match = literalPattern.exec(line)) !== null) {
			const text = match[1];
			if (!text.includes('VS Code') || !isChineseBearing(text)) {
				continue;
			}
			if (KEEP_PATTERNS.some(pattern => pattern.test(text))) {
				continue;
			}
			findings.push({ file, line: index + 1, text });
		}
	});
	literalPattern.lastIndex = 0;
}

console.log(`${findings.length} 处中文字符串仍写着 "VS Code"${apply ? '' : '（仅报告）'}`);
for (const item of findings) {
	console.log(`  ${path.relative('D:/oler-ide-v2/oss', item.file)}:${item.line}  ${item.text.slice(0, 90)}`);
}

// The donor pack's own extension translations carry the old name too, e.g. emmet's
// "适用于 VS Code 的 Emmet 支持", so the manifest layer is scanned as well.
const EXTENSIONS_DIR = 'D:/oler-ide-v2/oss/extensions';
const manifestFindings = [];
for (const dir of fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })) {
	if (!dir.isDirectory()) {
		continue;
	}
	const nlsPath = path.join(EXTENSIONS_DIR, dir.name, 'package.nls.json');
	if (!fs.existsSync(nlsPath)) {
		continue;
	}
	const contents = JSON.parse(fs.readFileSync(nlsPath, 'utf8'));
	for (const [key, value] of Object.entries(contents)) {
		if (typeof value !== 'string' || !isChineseBearing(value) || !value.includes('VS Code')) {
			continue;
		}
		if (KEEP_PATTERNS.some(pattern => pattern.test(value))) {
			continue;
		}
		manifestFindings.push({ file: nlsPath, key, value });
	}
}

console.log(`${manifestFindings.length} 处扩展 package.nls.json 值仍写着 "VS Code"`);
for (const item of manifestFindings) {
	console.log(`  ${path.relative('D:/oler-ide-v2/oss', item.file)} [${item.key}]  ${item.value.slice(0, 80)}`);
}

if (apply) {
	const byNlsFile = new Map();
	for (const item of manifestFindings) {
		const list = byNlsFile.get(item.file) ?? [];
		list.push(item);
		byNlsFile.set(item.file, list);
	}
	for (const [file, items] of byNlsFile) {
		const contents = JSON.parse(fs.readFileSync(file, 'utf8'));
		for (const item of items) {
			contents[item.key] = item.value.replaceAll('VS Code', REPLACEMENT);
		}
		fs.writeFileSync(file, JSON.stringify(contents, null, '\t') + '\n');
	}
	console.log(`已改写 ${byNlsFile.size} 份 package.nls.json`);
}

if (!apply || (findings.length === 0 && manifestFindings.length === 0)) {
	process.exit(0);
}

const byFile = new Map();
for (const item of findings) {
	const list = byFile.get(item.file) ?? [];
	list.push(item);
	byFile.set(item.file, list);
}

for (const [file, items] of byFile) {
	const lines = fs.readFileSync(file, 'utf8').split('\n');
	for (const item of items) {
		const original = lines[item.line - 1];
		const updated = original.split(item.text).join(item.text.replaceAll('VS Code', REPLACEMENT));
		if (updated !== original) {
			lines[item.line - 1] = updated;
		}
	}
	fs.writeFileSync(file, lines.join('\n'));
}

// Keep the dictionaries honest too, otherwise a later apply-zh-cn-ast.mjs run reintroduces them.
const dictFiles = fs.readdirSync(BUILD).filter(name => /^zh-cn-dict-.*\.mjs$/.test(name));
let dictEntriesFixed = 0;
for (const name of dictFiles) {
	const full = path.join(BUILD, name);
	const original = fs.readFileSync(full, 'utf8');
	const updated = original.replace(/^(\s*)"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"\s*,?$/gm, (whole, indent, key, value) => {
		if (!/[\u4e00-\u9fff]/.test(value) || !value.includes('VS Code') || KEEP_PATTERNS.some(p => p.test(value))) {
			return whole;
		}
		dictEntriesFixed++;
		return `${indent}"${key}": "${value.replaceAll('VS Code', REPLACEMENT)}",`;
	});
	if (updated !== original) {
		fs.writeFileSync(full, updated);
	}
}

console.log(`已改写 ${byFile.size} 个源文件、${findings.length} 处字面量；词典里同步 ${dictEntriesFixed} 条`);
