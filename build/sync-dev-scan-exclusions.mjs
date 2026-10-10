// OLYMPIA-TRIM: push the packaging-time trim list into the dev-mode scanner.
//
// build/lib/extensions.ts `excludedExtensions` only shapes the *packaged* product. In dev
// mode the built-in extensions folder is scanned directory by directory, so everything under
// `extensions/` still gets discovered — this is the same trap that made the Copilot removal
// look like it had worked while the extension kept loading.
//
// Keep this list identical to `excludedExtensions` in build/lib/extensions.ts (minus the
// test-only entries, which were never present as folders).

import { readFileSync, writeFileSync } from 'fs';

const F = 'D:/oler-ide-v2/oss/src/vs/platform/extensionManagement/common/extensionsScannerService.ts';
let t = readFileSync(F, 'utf8');

const NAMES = [
	'git', 'git-base', 'github', 'github-authentication', 'merge-conflict',
	'microsoft-authentication', 'ms-vscode.js-debug', 'ms-vscode.js-debug-companion',
	'ms-vscode.vscode-js-profile-table', 'npm', 'jake', 'grunt', 'gulp', 'dotenv',
	'docker', 'simple-browser', 'media-preview',
	'php', 'php-language-features', 'bat', 'clojure', 'coffeescript', 'dart', 'csharp',
	'fsharp', 'go', 'groovy', 'handlebars', 'hlsl', 'ini', 'java', 'julia', 'latex',
	'less', 'log', 'lua', 'objective-c', 'perl', 'prompt', 'pug', 'python', 'r',
	'razor', 'restructuredtext', 'ruby', 'rust', 'scss', 'shaderlab', 'sql', 'swift',
];

const entries = ['copilot', ...NAMES].map(n => `\t'${n}',`).join('\n');

const OLD = /const OLYMPIA_EXCLUDED_EXTENSION_DIRS = new Set<string>\(\[[^\]]*\]\);/;
if (!OLD.test(t)) { throw new Error('OLYMPIA_EXCLUDED_EXTENSION_DIRS declaration not found'); }

const NEW = `const OLYMPIA_EXCLUDED_EXTENSION_DIRS = new Set<string>([\n${entries}\n]);`;
t = t.replace(OLD, NEW);

writeFileSync(F, t, 'utf8');
console.log(`OLYMPIA_EXCLUDED_EXTENSION_DIRS now holds ${NAMES.length + 1} entries`);
