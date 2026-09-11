// Regenerates the "附录：前端 npm 依赖清单" section of
// src-tauri/THIRD-PARTY-NOTICES.md from package-lock.json.
//
//   node scripts/gen-third-party-notices.mjs          # rewrite in place
//   node scripts/gen-third-party-notices.mjs --check   # exit 1 if out of date
//
// The appendix must cover every package npm actually installs (including
// scoped and transitive ones) because those sources are redistributed inside
// the installer.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(here, '..');
const lockPath = join(frontendDir, 'package-lock.json');
const noticesPath = join(frontendDir, 'src-tauri', 'THIRD-PARTY-NOTICES.md');

const APPENDIX_HEADING = '## 附录：前端 npm 依赖清单';
const APPENDIX_NOTE = '（由 `npm run notices` 从 package-lock.json 生成，请勿手工编辑）';

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const packages = lock.packages ?? {};

const entries = [];
for (const [key, meta] of Object.entries(packages)) {
  if (key === '') continue; // the root project itself
  const marker = 'node_modules/';
  const name = key.slice(key.lastIndexOf(marker) + marker.length);
  if (!name) continue;
  const version = meta.version ?? '0.0.0';
  const license = meta.license ?? (Array.isArray(meta.licenses)
    ? meta.licenses.map((l) => l.type).join(' OR ')
    : 'UNKNOWN');
  entries.push(`${name}@${version} | ${license}`);
}

entries.sort((a, b) => {
  const [an, av] = a.split('@').length > 2 ? [a.slice(0, a.lastIndexOf('@')), a.slice(a.lastIndexOf('@') + 1)] : a.split('@');
  const [bn, bv] = b.split('@').length > 2 ? [b.slice(0, b.lastIndexOf('@')), b.slice(b.lastIndexOf('@') + 1)] : b.split('@');
  return an.localeCompare(bn, 'en') || av.localeCompare(bv, 'en', { numeric: true });
});

const scoped = entries.filter((e) => e.startsWith('@')).length;
const unknown = entries.filter((e) => e.endsWith('| UNKNOWN')).length;

const doc = readFileSync(noticesPath, 'utf8');
const headingIndex = doc.indexOf(APPENDIX_HEADING);
if (headingIndex === -1) {
  console.error(`appendix heading not found in ${noticesPath}`);
  process.exit(2);
}

const head = doc.slice(0, headingIndex);
const rebuilt = `${head}${APPENDIX_HEADING}${APPENDIX_NOTE}\n\n${entries.join('\n')}\n`;

if (process.argv.includes('--check')) {
  if (rebuilt !== doc) {
    console.error('THIRD-PARTY-NOTICES.md appendix is stale - run: npm run notices');
    process.exit(1);
  }
  console.log(`appendix is up to date (${entries.length} packages, ${scoped} scoped)`);
  process.exit(0);
}

writeFileSync(noticesPath, rebuilt, 'utf8');
console.log(`wrote ${entries.length} packages (${scoped} scoped, ${unknown} unknown license)`);
