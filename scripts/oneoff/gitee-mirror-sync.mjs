#!/usr/bin/env node
// Gitee 镜像同步自动化：把 GitHub 上的提交同步到 Gitee 镜像仓。
//
// 为什么需要这个脚本：Gitee 的「从 GitHub 导入」镜像**不会自动同步**，
// 公开 API 也没有同步端点，只能在已登录 Gitee 的浏览器里点
// 仓主页「从 GitHub 同步」→ 弹窗「确定」。本脚本用本机 eGO（Chromium 内核）
// 的持久登录态 + CDP 直连自动完成这一步，并在完成后核对 head 与关键文件字节。
//
// 用法（先只读预演，再真正执行）：
//   node scripts/oneoff/gitee-mirror-sync.mjs --ego "<eGO 可执行文件路径>" --target <sha>
//   node scripts/oneoff/gitee-mirror-sync.mjs --ego "<...>" --target <sha> --confirm
//
// 退出码：0 = 目标已达成 / 预演通过；非 0 = 未达成（见日志最后一行 VERDICT=）。
//
// 本脚本不读写任何凭据：登录态完全由 eGO 自己的 profile 提供，脚本只做页面操作。

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------- 参数解析

function parseArgs(argv) {
  const out = {
    repo: 'yuanddMSK/olympia-ide-mirror',
    source: 'yuandd0412/olympia-ide',
    target: '',
    repoDir: '',
    ego: process.env.EGO_PATH || '',
    port: Number(process.env.EGO_CDP_PORT || 9333),
    verifyFiles: [],
    confirm: false,
    logFile: '',
    stateFile: '',
    keepOpen: false,
    timeoutSec: 420,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`参数 ${a} 缺少取值`);
      return v;
    };
    switch (a) {
      case '--repo': out.repo = next(); break;
      case '--source': out.source = next(); break;
      case '--target': out.target = next(); break;
      case '--repo-dir': out.repoDir = next(); break;
      case '--ego': out.ego = next(); break;
      case '--port': out.port = Number(next()); break;
      case '--verify-file': out.verifyFiles.push(next()); break;
      case '--confirm': out.confirm = true; break;
      case '--keep-open': out.keepOpen = true; break;
      case '--log': out.logFile = next(); break;
      case '--state': out.stateFile = next(); break;
      case '--timeout': out.timeoutSec = Number(next()); break;
      case '--help': case '-h': out.help = true; break;
      default: throw new Error(`未知参数 ${a}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------- 日志

const args = parseArgs(process.argv);
const logLines = [];
function log(line) {
  const s = String(line);
  console.log(s);
  logLines.push(s);
  if (args.logFile) {
    try { fs.appendFileSync(args.logFile, s + '\n', 'utf8'); } catch { /* 日志失败不阻塞主流程 */ }
  }
}
function die(tag, msg, code = 2) {
  log(`[${tag}] ${msg}`);
  log(`VERDICT=FAIL tag=${tag}`);
  if (args.stateFile) {
    try { fs.writeFileSync(args.stateFile, JSON.stringify({ ok: false, tag, msg, at: new Date().toISOString() }, null, 2), 'utf8'); } catch { /* ignore */ }
  }
  process.exit(code);
}

// ---------------------------------------------------------------- 预检断言

if (args.help) {
  log('用法: node scripts/oneoff/gitee-mirror-sync.mjs --ego <路径> --target <sha> [--confirm] [--verify-file <路径>]');
  process.exit(0);
}
if (typeof WebSocket === 'undefined') die('PRECHECK', 'Node 缺少内置 WebSocket，需要 Node >= 22', 3);
if (!/^[^/]+\/[^/]+$/.test(args.repo)) die('PRECHECK', `--repo 格式不对: ${args.repo}`);
if (!/^[^/]+\/[^/]+$/.test(args.source)) die('PRECHECK', `--source 格式不对: ${args.source}`);
if (!args.ego) die('PRECHECK', '缺少 --ego（或设置环境变量 EGO_PATH）指向本机 eGO 可执行文件');
if (!fs.existsSync(args.ego)) die('PRECHECK', `eGO 不存在: ${args.ego}`);
if (!args.target) die('PRECHECK', '缺少 --target <sha>');
if (!/^[0-9a-f]{7,40}$/i.test(args.target)) die('PRECHECK', `--target 不是合法 sha: ${args.target}`);
if (args.repoDir && !fs.existsSync(args.repoDir)) die('PRECHECK', `--repo-dir 不存在: ${args.repoDir}`);
log(`[precheck] repo=${args.repo} source=${args.source} target=${args.target}`);
log(`[precheck] ego=${args.ego}`);
log(`[precheck] mode=${args.confirm ? 'EXECUTE' : 'DRY-RUN'}`);

const API = `https://gitee.com/api/v5/repos/${args.repo}`;
const MIRROR_WEB = `https://gitee.com/${args.repo}`;

async function apiHead() {
  const r = await fetch(`${API}/branches/master`);
  if (!r.ok) return null;
  const j = await r.json();
  return j && j.commit ? j.commit.sha : null;
}

// ---------------------------------------------------------------- eGO 进程管理

const EGO_DIR = path.dirname(args.ego);
function egoPids() {
  const ps = `$ErrorActionPreference='SilentlyContinue'; Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '*${EGO_DIR}*' } | Select-Object -ExpandProperty ProcessId`;
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', timeout: 30000 });
  if (r.status !== 0) return [];
  return String(r.stdout || '').split(/\s+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n));
}
function killPids(pids) {
  for (const pid of pids) {
    spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `$ErrorActionPreference='SilentlyContinue'; Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`], { timeout: 20000 });
  }
}

const PIDS_BEFORE = new Set(egoPids());
log(`[ego] 启动前已有 eGO 进程: ${PIDS_BEFORE.size}`);

// ---------------------------------------------------------------- 最小 CDP 客户端

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForEndpoint(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = 'not-tried';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return res.json();
      last = `http ${res.status}`;
    } catch (e) { last = String(e && e.message ? e.message : e); }
    await sleep(500);
  }
  throw new Error(`CDP 端点未就绪: ${last}`);
}

async function listTargets(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!res.ok) throw new Error(`/json/list -> ${res.status}`);
  return res.json();
}

async function newTab(port, url) {
  const u = `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`;
  let res = await fetch(u, { method: 'PUT' });
  if (!res.ok) res = await fetch(u);
  if (!res.ok) throw new Error(`/json/new -> ${res.status}`);
  return res.json();
}

class Cdp {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      let m; try { m = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)); } catch { return; }
      if (m.id !== undefined && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        if (m.error) reject(new Error(m.error.message)); else resolve(m.result);
      }
    });
  }
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      const onOpen = () => { ws.removeEventListener('error', onErr); resolve(); };
      const onErr = () => { ws.removeEventListener('open', onOpen); reject(new Error('ws 连接失败')); };
      ws.addEventListener('open', onOpen, { once: true });
      ws.addEventListener('error', onErr, { once: true });
    });
    return new Cdp(ws);
  }
  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP 超时: ${method}`)); }, 45000);
      this.pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`页面脚本异常: ${r.exceptionDetails.text}`);
    return r.result ? r.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

// ---------------------------------------------------------------- 主流程

let cdp = null;
let spawned = null;
async function cleanup() {
  try { if (cdp) cdp.close(); } catch { /* ignore */ }
  if (args.keepOpen) { log('[ego] --keep-open：保留 eGO 窗口'); return; }
  const now = egoPids();
  const mine = now.filter((p) => !PIDS_BEFORE.has(p));
  if (mine.length) { killPids(mine); log(`[ego] 已清理本次拉起的 eGO 进程 ${mine.length} 个`); }
  else log('[ego] 本次未新增 eGO 进程，无需清理');
}

try {
  const before = await apiHead();
  log(`BEFORE_HEAD=${before}`);
  if (before && before.startsWith(args.target)) {
    log(`ALREADY_SYNCED=1 target=${args.target}`);
    log('VERDICT=OK reason=already-synced');
    if (args.stateFile) fs.writeFileSync(args.stateFile, JSON.stringify({ ok: true, reason: 'already-synced', head: before, at: new Date().toISOString() }, null, 2), 'utf8');
    await cleanup();
    process.exit(0);
  }

  // 启动 eGO（用默认持久 profile，登录态在里面）
  spawned = spawn(args.ego, [`--remote-debugging-port=${args.port}`], { detached: true, stdio: 'ignore' });
  spawned.unref();
  log(`[ego] 已拉起 ego pid=${spawned.pid} port=${args.port}`);
  const ver = await waitForEndpoint(args.port, 90000);
  log(`[ego] CDP 就绪 browser=${ver.Browser || '?'}`);

  const targets = await listTargets(args.port);
  let page = targets.find((t) => t.type === 'page' && t.url.includes('gitee.com'));
  if (!page) page = await newTab(args.port, MIRROR_WEB);
  cdp = await Cdp.connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  if (!page.url.startsWith(MIRROR_WEB)) {
    await cdp.send('Page.navigate', { url: MIRROR_WEB });
    await sleep(4000);
  }
  await sleep(2000);

  // 登录态判据：有退出登录入口，且没有「登录/注册」按钮
  const login = JSON.parse(await cdp.evaluate(`(() => {
    const qa = (s) => Array.from(document.querySelectorAll(s));
    const logout = qa('a[href*="logout"], a[href*="/sign_out"]').length;
    const loginBtn = qa('a').filter(a => { const t=(a.textContent||'').trim(); return t==='登录'||t==='登录/注册'||t==='Sign in'||t==='Sign In'; }).length;
    const syncBtn = !!document.querySelector('#btn-sync-from-github');
    return JSON.stringify({ logout, loginBtn, syncBtn, url: location.href, title: document.title });
  })()`));
  log(`[login] ${JSON.stringify(login)}`);
  if (login.logout < 1 || login.loginBtn > 0) {
    die('LOGIN', 'eGO profile 里没有有效的 Gitee 登录态：需要人在 eGO 窗口里登录一次，再重跑本脚本', 4);
  }
  if (!login.syncBtn) die('NOSYNCH', '页面上找不到「从 GitHub 同步」按钮（#btn-sync-from-github）', 5);

  // 打开弹窗
  const clicked = await cdp.evaluate(`(() => { const b=document.querySelector('#btn-sync-from-github'); if(!b) return 'NO_BTN'; b.click(); return 'CLICKED'; })()`);
  if (clicked !== 'CLICKED') die('NOSYNCH', '点击「从 GitHub 同步」失败', 5);
  log('[sync] 已点「从 GitHub 同步」');

  let modal = null;
  for (let i = 0; i < 30; i++) {
    await sleep(700);
    const raw = await cdp.evaluate(`(() => {
      const m=document.querySelector('#modal-sync-from-github'); if(!m) return null;
      const r=m.getBoundingClientRect();
      return JSON.stringify({ visible: r.width>0 && r.height>0, text: (m.innerText||'').replace(/\\s+/g,' ').slice(0,600) });
    })()`);
    if (raw) { const m = JSON.parse(raw); if (m.visible) { modal = m; break; } }
  }
  if (!modal) die('NOMODAL', '同步确认弹窗没有出现', 6);

  // 安全阀 A：弹窗必须写明源仓库与「强制同步」
  const sourceTail = args.source.split('/')[1];
  if (!modal.text.includes('强制同步') || !modal.text.includes(sourceTail)) {
    die('MODAL_MISMATCH', `弹窗内容与预期源仓库不符，拒绝点击。实际: ${modal.text.slice(0, 200)}`, 7);
  }
  log(`[sync] 弹窗安全阀通过（源仓库 ${args.source}）`);

  if (!args.confirm) {
    log('[sync] 未指定 --confirm：只做只读预演，不执行同步');
    log('VERDICT=OK reason=dry-run');
    if (args.stateFile) fs.writeFileSync(args.stateFile, JSON.stringify({ ok: true, reason: 'dry-run', head: before, at: new Date().toISOString() }, null, 2), 'utf8');
    await cleanup();
    process.exit(0);
  }

  // 等 Gitee 完成远端校验（按钮 disabled -> 可点）
  let ok = null;
  for (let i = 0; i < 90; i++) {
    const raw = await cdp.evaluate(`(() => {
      const b=document.querySelector('#modal-sync-from-github .actions .button.orange.ok'); if(!b) return null;
      const r=b.getBoundingClientRect();
      return JSON.stringify({ text:(b.textContent||'').trim().slice(0,40), cls:(b.getAttribute('class')||''), visible:r.width>0&&r.height>0, disabled: b.disabled===true || /disabled/.test(b.getAttribute('class')||'') });
    })()`);
    if (raw) { ok = JSON.parse(raw); if (ok.visible && !ok.disabled) break; }
    await sleep(2000);
  }
  log(`[sync] 确认按钮状态 ${JSON.stringify(ok)}`);
  if (!ok || !ok.visible || ok.disabled) die('BTN_DISABLED', '确认按钮一直不可用（Gitee 远端校验未通过）', 8);
  // 安全阀 B：按钮文案白名单
  const OK_TEXTS = ['确定', '同步', '确认', 'OK', 'Confirm', 'Yes'];
  if (!OK_TEXTS.includes(ok.text)) die('BTN_TEXT', `确认按钮文案不在白名单: ${ok.text}`, 9);

  const okClicked = await cdp.evaluate(`(() => { const b=document.querySelector('#modal-sync-from-github .actions .button.orange.ok'); if(!b) return 'NO_EL'; b.click(); return 'CLICKED'; })()`);
  if (okClicked !== 'CLICKED') die('CLICKFAIL', '点击确认失败', 9);
  log('[sync] 已点击确认');

  // 轮询 head
  let after = null;
  const t0 = Date.now();
  while ((Date.now() - t0) / 1000 < args.timeoutSec) {
    await sleep(5000);
    after = await apiHead();
    log(`POLL t=${Math.round((Date.now() - t0) / 1000)}s head=${after}`);
    if (after && after.startsWith(args.target)) break;
  }
  log(`AFTER_HEAD=${after}`);
  if (!after || !after.startsWith(args.target)) {
    die('NOTSYNCED', `同步未在 ${args.timeoutSec}s 内完成，head 仍不是 ${args.target}`, 10);
  }

  // 关键文件字节核验（Gitee raw vs 本地）
  let bad = 0;
  for (const f of args.verifyFiles) {
    const localPath = args.repoDir ? path.join(args.repoDir, f) : '';
    if (!localPath || !fs.existsSync(localPath)) { log(`[verify] SKIP ${f}（缺 --repo-dir 或本地不存在）`); continue; }
    const localSha = sha256(fs.readFileSync(localPath));
    let remoteSha = null;
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`https://gitee.com/${args.repo}/raw/master/${f}?t=${Date.now()}`);
      if (res.ok) {
        remoteSha = sha256(Buffer.from(await res.arrayBuffer()));
        break;
      }
      log(`[verify] ${f} http=${res.status}，重试`);
      await sleep(3000);
    }
    const same = remoteSha === localSha;
    if (!same) bad++;
    log(`[verify] ${same ? 'MATCH' : 'DIFF'} ${f} local=${String(localSha).slice(0, 12)} gitee=${String(remoteSha).slice(0, 12)}`);
  }

  log(`BAD_COUNT=${bad}`);
  log('VERDICT=OK reason=synced');
  if (args.stateFile) {
    fs.writeFileSync(args.stateFile, JSON.stringify({ ok: bad === 0, reason: 'synced', head: after, bad, at: new Date().toISOString() }, null, 2), 'utf8');
  }
  await cleanup();
  process.exit(bad === 0 ? 0 : 11);
} catch (e) {
  log(`[error] ${e && e.message ? e.message : e}`);
  await cleanup();
  die('EXCEPTION', '执行中断', 12);
}
