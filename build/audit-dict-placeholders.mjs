/*---------------------------------------------------------------------------------------------
 *  Reports dictionary entries whose `{n}` placeholder set does not match their English source.
 *
 *  A translation that drops `{2}` or invents one renders wrong: the argument is never substituted,
 *  so the user sees a stray "{2}" inside a Chinese sentence, or loses a value entirely. The existing
 *  audits cover whitespace (audit-dict-padding.mjs) and escaped-newline mismatch
 *  (fix-dict-newlines.mjs); neither looks at placeholders.
 *
 *  Usage:
 *    node build/audit-dict-placeholders.mjs            report only
 *    node build/audit-dict-placeholders.mjs --restore  write the English source back into oss/src,
 *                                                      so the string ships English instead of a
 *                                                      broken sentence
 *    node build/audit-dict-placeholders.mjs --restore --quarantine
 *                                                      additionally rewrite the offending dictionary
 *                                                      values to their English key, so a later
 *                                                      apply-zh-cn-ast run cannot reintroduce them
 *
 *  --restore edits the vendored source, not the dictionaries: the repaired keys still have to be
 *  re-translated by hand before anyone re-runs apply-zh-cn-ast.mjs, otherwise the damage returns.
 *--------------------------------------------------------------------------------------------*/

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const BUILD = 'D:/oler-ide-v2/build';
const SRC = 'D:/oler-ide-v2/oss/src/vs';
const restore = process.argv.includes('--restore');

function placeholderSignature(text) {
	const found = String(text).match(/\{\d+(?::[^{}}]*)?\}/g) ?? [];
	return [...new Set(found)].sort().join(',');
}

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

const dictFiles = fs.readdirSync(BUILD).filter(name => /^zh-cn-dict-.*\.mjs$/.test(name));
const mismatches = [];

for (const name of dictFiles) {
	const mod = await import(pathToFileURL(path.join(BUILD, name)).href);
	const dict = mod.default;
	if (!dict || typeof dict !== 'object') {
		continue;
	}
	for (const [english, chinese] of Object.entries(dict)) {
		if (typeof chinese !== 'string') {
			continue;
		}
		const fromSource = placeholderSignature(english);
		const fromTranslation = placeholderSignature(chinese);
		if (fromSource !== fromTranslation) {
			mismatches.push({ file: name, english, chinese, fromSource, fromTranslation });
		}
	}
}

console.log(`${mismatches.length} 条词典条目的占位符与原文不一致${restore ? '' : '（仅报告）'}`);
for (const item of mismatches) {
	console.log(`  [${item.file}] 期望 {${item.fromSource || '无'}} 实为 {${item.fromTranslation || '无'}}`);
	console.log(`      EN: ${item.english}`);
	console.log(`      ZH: ${item.chinese}`);
}

if (!restore || mismatches.length === 0) {
	process.exit(0);
}

if (process.argv.includes('--quarantine')) {
	// Make the entry an identity mapping: the applier then leaves the English literal alone
	// instead of writing a sentence whose arguments cannot bind.
	const byFile = new Map();
	for (const item of mismatches) {
		const list = byFile.get(item.file) ?? [];
		list.push(item);
		byFile.set(item.file, list);
	}
	for (const [name, items] of byFile) {
		const full = path.join(BUILD, name);
		const original = fs.readFileSync(full, 'utf8');
		let updated = original;
		for (const item of items) {
			const escaped = JSON.stringify(item.chinese);
			const replacement = JSON.stringify(item.english);
			updated = updated.split(escaped).join(replacement);
		}
		if (updated !== original) {
			fs.writeFileSync(full, updated);
		}
	}
	console.log(`已隔离 ${mismatches.length} 条词典条目（改为与原文相同，重跑 applier 不会再引入损坏译文）`);
}

const sources = walk(SRC);
const repaired = new Map();
for (const file of sources) {
	const original = fs.readFileSync(file, 'utf8');
	let updated = original;
	for (const item of mismatches) {
		// Values with escapes are stored differently in source than in the dictionary literal, so
		// they need a human pass rather than a blind replace.
		if (/["\\\n\r]/.test(item.chinese)) {
			continue;
		}
		if (updated.includes(item.chinese)) {
			updated = updated.split(item.chinese).join(item.english);
			repaired.set(item.chinese, (repaired.get(item.chinese) ?? 0) + 1);
		}
	}
	if (updated !== original) {
		fs.writeFileSync(file, updated);
	}
}

console.log(`已在 ${sources.length} 个源文件中回退 ${repaired.size} 条损坏译文，共 ${[...repaired.values()].reduce((a, b) => a + b, 0)} 处`);
console.log('注意：词典里的这些键仍是坏的，重新执行 apply-zh-cn-ast.mjs 前必须先修正译文。');
