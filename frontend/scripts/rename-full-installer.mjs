// tauri:full 后处理：完整版与精简版 productName 相同，NSIS 输出同名文件会
// 相互覆盖；构建完成后立即改名为 -full-setup.exe，让两个产物得以共存。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, '..', 'src-tauri', 'target', 'release', 'bundle', 'nsis');
// 版本号以 tauri.conf.json 为准（package.json 的 version 与发布版本无关）
const conf = JSON.parse(fs.readFileSync(path.join(here, '..', 'src-tauri', 'tauri.conf.json'), 'utf8'));
const version = conf.version;
const src = path.join(dir, `Olympia IDE_${version}_x64-setup.exe`);
const dest = path.join(dir, `Olympia IDE_${version}_x64-full-setup.exe`);

if (!fs.existsSync(src)) {
  console.error(`[rename-full] installer not found: ${src}`);
  process.exit(1);
}
fs.renameSync(src, dest);
console.log(`[rename-full] ${src} -> ${dest}`);
