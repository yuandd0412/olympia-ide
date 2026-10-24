#!/usr/bin/env node
// stage-site.mjs — 把 website/ 里"该公开的"挑出来，摊到一个干净的发布目录。
//
// 为什么需要它：`wrangler pages deploy .` 会把部署目录里的东西**全部**上传，
// 不认 .gitignore（2026-10-24 实测：放了 website/.gitignore 也没用，
// DEPLOY.md 和 .wrangler/ 照样上公网）。所以发布前先做一次显式清点。
//
// 用法：
//   node scripts/oneoff/stage-site.mjs            # 清点并生成发布目录
//   node scripts/oneoff/stage-site.mjs --dry-run  # 只预演，不写盘
//   node scripts/oneoff/stage-site.mjs --force    # 允许覆盖已存在的发布目录
//   node scripts/oneoff/stage-site.mjs --out <dir>
//
// 退出码：0 = 成功；1 = 前置检查没过（已打印原因）；2 = 参数错误。

import { existsSync, readFileSync, readdirSync, rmSync, cpSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const SRC = path.join(REPO, 'website');
const DEFAULT_OUT = path.join(REPO, '.scratch', 'publish', 'site');

// 不该出现在公网上的：内部发版指南 + wrangler 本地状态 + 安装器暂存区。
const EXCLUDE_DIRS = new Set(['.wrangler', 'downloads', 'node_modules', '.git']);
const EXCLUDE_FILES = new Set(['DEPLOY.md', '.gitignore']);

// 少任何一个都不该发版。
const REQUIRED = [
  'index.html',
  'main.js',
  'style.css',
  'img/product-hero.png',
  'img/shot-firstrun.png',
  'img/shot-welcome.png',
  'docs/index.html',
  'privacy/index.html',
  'terms/index.html',
];

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const dryRun = has('--dry-run');
const force = has('--force');
const OUT = path.resolve(opt('--out', DEFAULT_OUT));

if (argv.some((a) => a.startsWith('--') && !['--dry-run', '--force', '--out'].includes(a))) {
  console.error('参数错误：只支持 --dry-run / --force / --out <dir>');
  process.exit(2);
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');

// ── 前置检查 ────────────────────────────────────────────────────────────────
if (!existsSync(SRC)) {
  console.error(`前置检查失败：源目录不存在 ${SRC}`);
  process.exit(1);
}
const missing = REQUIRED.filter((f) => !existsSync(path.join(SRC, f)));
if (missing.length) {
  console.error(`前置检查失败：缺少必需文件 ${missing.join('、')}`);
  process.exit(1);
}

// index.html 里引用的每个本地资源都得在树里，否则发上去就是裂图。
const html = readFileSync(path.join(SRC, 'index.html'), 'utf8');
const refs = new Set();
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const v = m[1];
  if (/^(https?:|data:|#|mailto:|javascript:)/i.test(v)) continue;
  refs.add(v.replace(/^\//, ''));
}
const dangling = [...refs].filter((r) => !existsSync(path.join(SRC, r)));
if (dangling.length) {
  console.error(`前置检查失败：index.html 引用了不存在的本地资源 ${dangling.join('、')}`);
  process.exit(1);
}

// ── 收集要发布的文件 ───────────────────────────────────────────────────────
const wanted = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      walk(full);
    } else {
      if (EXCLUDE_FILES.has(e.name)) continue;
      wanted.push(full);
    }
  }
})(SRC);
wanted.sort();

// 排除项真的被排掉了？—— 防止以后有人往 EXCLUDE 里加错名字还以为排掉了。
const excludedLeak = wanted.filter((f) => EXCLUDE_FILES.has(path.basename(f)) || EXCLUDE_DIRS.has(path.basename(path.dirname(f))));
if (excludedLeak.length) {
  console.error(`内部检查失败：排除规则没生效 ${excludedLeak.map(rel).join('、')}`);
  process.exit(1);
}
for (const f of EXCLUDE_FILES) {
  if (!existsSync(path.join(SRC, f))) continue;
  console.log(`  已排除文件：${f}`);
}
for (const d of EXCLUDE_DIRS) {
  if (existsSync(path.join(SRC, d))) console.log(`  已排除目录：${d}/`);
}

const total = wanted.reduce((n, f) => n + statSync(f).size, 0);
console.log(`\n源目录：${SRC}`);
console.log(`发布目录：${OUT}`);
console.log(`文件数：${wanted.length}   总字节：${total}`);

if (dryRun) {
  console.log('\n--dry-run：不写盘。计划发布：');
  for (const f of wanted) console.log(`  ${rel(f)}  ${statSync(f).size}`);
  console.log('\n--dry-run 结束');
  process.exit(0);
}

// ── 写盘 ───────────────────────────────────────────────────────────────────
if (existsSync(OUT)) {
  if (!force) {
    console.error(`发布目录已存在：${OUT}\n加 --force 覆盖，或换 --out <dir>。`);
    process.exit(1);
  }
  rmSync(OUT, { recursive: true, force: true });
}
for (const f of wanted) {
  const dest = path.join(OUT, path.relative(SRC, f));
  cpSync(f, dest, { recursive: true });
}

// DEPLOY.md 被排除出发布包，但要在**同一个路径**上放一个无害占位。
// 原因：Cloudflare 只会对"内容变了"的资产自动失效边缘缓存，
// 删除一个已发布过的路径不会触发失效——旧文件会以 s-maxage=604800（7 天）
// 的 TTL 赖在边缘上（2026-10-24 实测：/DEPLOY.md 删掉后仍能读到旧内容）。
// 让这个路径的内容变一次，边缘缓存就会自动刷新，旧的内部内容随之消失。
const STUBS = {
  'DEPLOY.md': [
    '# 发布指南不在这里',
    '',
    '本站是公开的静态站点。内部发版指南（打包、传 Gitee、部署官网的完整步骤）',
    '保留在仓库里，**不随站点发布**。',
    '',
    '要下载 Olympia IDE，用本页顶部的下载按钮即可。',
    '',
  ].join('\n'),
};

for (const [name, body] of Object.entries(STUBS)) {
  writeFileSync(path.join(OUT, name), body);
  console.log(`  已写入占位文件：${name}（用于让边缘缓存自动失效）`);
}

// ── 落地后自检：数量、字节、sha、以及"内部文件确实没跟过来" ────────────────
const staged = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else staged.push(full);
  }
})(OUT);
if (staged.length !== wanted.length + Object.keys(STUBS).length) {
  console.error(`落地自检失败：文件数 ${staged.length} != 预期 ${wanted.length + Object.keys(STUBS).length}`);
  process.exit(1);
}
for (const f of EXCLUDE_FILES) {
  const p = path.join(OUT, f);
  if (!existsSync(p)) continue;
  if (STUBS[f]) {
    // 必须是占位内容，不能是内部指南本身
    if (readFileSync(p, 'utf8') !== STUBS[f]) {
      console.error(`落地自检失败：${f} 是内部原文，不是占位内容`);
      process.exit(1);
    }
    continue;
  }
  console.error(`落地自检失败：${f} 仍被发布了`);
  process.exit(1);
}
for (const d of EXCLUDE_DIRS) {
  if (existsSync(path.join(OUT, d))) {
    console.error(`落地自检失败：${d}/ 仍被发布了`);
    process.exit(1);
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  source: SRC,
  out: OUT,
  fileCount: staged.length,
  totalBytes: staged.reduce((n, f) => n + statSync(f).size, 0),
  files: staged.map((f) => ({
    path: path.relative(OUT, f).split(path.sep).join('/'),
    bytes: statSync(f).size,
    sha256: sha(readFileSync(f)),
  })),
};
// 清单写在发布目录**外面**——它带着本机路径，放进去就等于把它也发到公网上。
const MANIFEST = path.join(path.dirname(OUT), 'stage-manifest.json');
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

// wrangler 装在全局，不在仓库的 node_modules 里；npx 会先去查 npm registry，
// 网络不通时多等一轮，所以优先用全局那份的绝对路径。
// 在发布目录的**父级**执行：wrangler 会把自己的 .wrangler 缓存写到 CWD，
// 放到 .scratch 里就不会污染仓库根目录、也不会被顺手 git add。
const GLOBAL_WRANGLER = path.join(process.env.APPDATA || '', 'npm', 'wrangler.cmd');
const WRANGLER_BIN = existsSync(GLOBAL_WRANGLER) ? `"${GLOBAL_WRANGLER}"` : 'npx wrangler';
const deployCmd = `${WRANGLER_BIN} pages deploy "${path.basename(OUT)}" --project-name olympia-ide --branch main`;

console.log('\n✓ 发布目录就绪');
console.log(`  清单：${MANIFEST}`);
console.log(`  下一步（先 cd 到 ${path.dirname(OUT)} 再执行）：`);
console.log(`    ${deployCmd}`);
console.log('  部署完必须验：线上 index.html 的 sha256 与本地 website/index.html 一致，');
console.log('  且 https://olympia.dpdns.org/DEPLOY.md 读到的只是占位内容、不是内部指南原文。');
