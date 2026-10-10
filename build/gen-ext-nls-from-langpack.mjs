/*---------------------------------------------------------------------------------------------
 *  Localizes every built-in extension's `package.nls.json` from the official Simplified Chinese
 *  language pack.
 *
 *  Extension manifests resolve their `%key%` placeholders against `package.nls.json` (English) and,
 *  when the runtime locale matches, `package.nls.<locale>.json`. The workbench itself was localized
 *  by rewriting NLS literals in the source tree, and that mechanism cannot reach extension manifests,
 *  which is why 2,900+ user-facing strings in the extension layer stayed English.
 *
 *  Writing `package.nls.zh-cn.json` alone would not take effect here: Olympia registers no language
 *  pack (`languagepacks.json` is `{}`), so the runtime locale stays `en` and the locale-specific
 *  file is never consulted. Replacing the values in place is the same trade-off the workbench patch
 *  already makes - this product ships Chinese only - and keeps the upstream key set intact, so
 *  re-running this after an upstream update simply refreshes the values.
 *
 *  Usage: node build/gen-ext-nls-from-langpack.mjs [--report]
 *--------------------------------------------------------------------------------------------*/

import fs from 'fs';
import path from 'path';

const LANGPACK = 'D:/oler-ide-v2/build/langpack/extension';
const EXTENSIONS = 'D:/oler-ide-v2/oss/extensions';
const reportOnly = process.argv.includes('--report');

const packManifest = JSON.parse(fs.readFileSync(path.join(LANGPACK, 'package.json'), 'utf8'));
const translations = packManifest.contributes.localizations[0].translations;

// `vscode.cpp` -> the translated `contents.package` block for that extension.
const packageContentsById = new Map();
for (const entry of translations) {
	const file = path.join(LANGPACK, entry.path.replace(/^\.\//, ''));
	if (!fs.existsSync(file)) {
		continue;
	}
	const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
	packageContentsById.set(entry.id.toLowerCase(), parsed.contents?.package ?? {});
}

function donorFor(extensionName) {
	const suffix = `.${extensionName}`.toLowerCase();
	for (const [id, contents] of packageContentsById) {
		if (id === `vscode${suffix}` || id.endsWith(suffix)) {
			return { id, contents };
		}
	}
	return null;
}

function hasCJK(value) {
	return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(value);
}

let localizedFiles = 0;
let replacedValues = 0;
let alreadyChinese = 0;
const shortfalls = [];
const missingDonor = [];

for (const dir of fs.readdirSync(EXTENSIONS, { withFileTypes: true })) {
	if (!dir.isDirectory()) {
		continue;
	}
	const nlsPath = path.join(EXTENSIONS, dir.name, 'package.nls.json');
	if (!fs.existsSync(nlsPath)) {
		continue;
	}
	const manifestPath = path.join(EXTENSIONS, dir.name, 'package.json');
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	const donor = donorFor(manifest.name ?? dir.name);
	if (!donor) {
		missingDonor.push(dir.name);
		continue;
	}

	const english = JSON.parse(fs.readFileSync(nlsPath, 'utf8'));
	const out = {};
	const missing = [];
	for (const [key, value] of Object.entries(english)) {
		const translated = donor.contents[key];
		if (typeof translated === 'string' && translated.trim().length > 0) {
			out[key] = translated;
			if (hasCJK(translated)) {
				replacedValues++;
			} else {
				alreadyChinese++;
			}
		} else if (typeof value === 'string' && hasCJK(value)) {
			out[key] = value;
		} else {
			out[key] = value;
			missing.push(key);
		}
	}

	if (missing.length > 0) {
		shortfalls.push(`${dir.name} [${donor.id}]: ${missing.length}/${Object.keys(english).length} 键无译文 -> ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ' ...' : ''}`);
	}
	if (!reportOnly) {
		fs.writeFileSync(nlsPath, JSON.stringify(out, null, '\t') + '\n');
	}
	localizedFiles++;
}

console.log(`${reportOnly ? '[report] ' : ''}处理 ${localizedFiles} 份 package.nls.json，写入 ${replacedValues} 条中文值（${alreadyChinese} 条译文本身无中文）`);
if (missingDonor.length > 0) {
	console.log(`语言包未收录的扩展 (${missingDonor.length}): ${missingDonor.join(', ')}`);
}
if (shortfalls.length > 0) {
	console.log(`部分缺译文 (${shortfalls.length}):`);
	for (const line of shortfalls) {
		console.log(`  ${line}`);
	}
}
