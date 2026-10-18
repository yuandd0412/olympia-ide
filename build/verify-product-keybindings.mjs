/* 核对出厂产品里每一条声明过的快捷键真能被解析。
 *
 * 为什么要跑起来看：`olympia.settings` 曾把键位写成 "ctrl+alt+comma"（扫描码名字），
 * VS Code 的用户键位解析器只认字面 ","，于是这个组合键从来没生效过——不报错、不编译失败，
 * 静态检查也看不出问题，只有用户按下去才知道（2026-10-18）。这条门读的是**出厂目录里**的
 * package.json，再用命令面板把每条命令的实际绑定读回来比对。
 *
 *   node build/verify-product-keybindings.mjs <productDir>
 */
import cp from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const productDir = process.argv[2] || 'D:/oler-ide-v2/VSCode-win32-x64';
const app = path.join(productDir, 'Olympia.exe');
if (!fs.existsSync(app)) { console.log(`FAIL 找不到 ${app}`); process.exit(1); }
const appExt = path.join(productDir, 'resources', 'app', 'extensions');

const want = [];
for (const ext of fs.readdirSync(appExt).filter(n => n.startsWith('olympia-'))) {
	const pkg = JSON.parse(fs.readFileSync(path.join(appExt, ext, 'package.json'), 'utf8'));
	const titles = new Map((pkg.contributes?.commands ?? []).map(c => [c.command, `${c.category ? c.category + ': ' : ''}${c.title}`]));
	for (const kb of pkg.contributes?.keybindings ?? []) {
		if (kb.key) { want.push({ ext, command: kb.command, key: kb.key, title: titles.get(kb.command) ?? kb.command }); }
	}
}
if (want.length < 15) { console.log(`FAIL 出厂目录里只读到 ${want.length} 条键位声明，比预期少得多——扩展没进包？`); process.exit(1); }
console.log(`出厂声明 ${want.length} 条快捷键，逐个核对`);

const PORT = 9341;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'olympia-kb-'));
const src = path.join(dir, 'probe.cpp');
fs.writeFileSync(src, '#include <bits/stdc++.h>\nusing namespace std;\nint main(){ return 0; }\n');
// 全新 profile 会让 Olympia 自己的首启页（主题选择卡片那个 webview）抢走键盘焦点，
// 面板就打不开；这条门要的是"能不能解析这条键位"，不是"首启页长什么样"，所以直接关掉启动编辑器。
const profile = path.join(dir, 'profile');
fs.mkdirSync(path.join(profile, 'User'), { recursive: true });
fs.writeFileSync(path.join(profile, 'User', 'settings.json'), JSON.stringify({ 'workbench.startupEditor': 'none' }));
const child = cp.spawn(app, [
	'--disable-workspace-trust', '--user-data-dir', profile,
	`--remote-debugging-port=${PORT}`, src,
], { detached: true, stdio: 'ignore' });
child.unref();

const sleep = ms => new Promise(r => setTimeout(r, ms));
let page = null;
for (let i = 0; i < 60; i++) {
	await sleep(1500);
	try {
		const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
		page = l.find(t => t.type === 'page' && /vscode-file/.test(t.url ?? ''));
		if (page) { break; }
	} catch { /* 还没起来 */ }
}
if (!page) { cp.spawnSync('taskkill.exe', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' }); console.log('FAIL 产品起不来，无法核对键位'); process.exit(1); }
await sleep(9000);

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
await new Promise(r => { ws.onopen = r; });
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result?.result?.value;
const key = async (k, code, vk, modifiers = 0) => {
	await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
	await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
};
const click = async (x, y) => {
	await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
	await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};
await send('Page.enable');
await send('Runtime.enable');

// 首启会弹自己的主题选择卡片，那个 webview 会吃掉键盘事件：先点回源文件标签。
const tabBox = await ev(`(() => { for (const t of document.querySelectorAll('.tab')) { if (/probe\\.cpp/.test(t.innerText)) { const b = t.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; } } return null; })()`);
if (tabBox) { await click(tabBox.x, tabBox.y); await sleep(1200); }
const edBox = await ev(`(() => { const n = document.querySelector('.monaco-editor .view-lines'); if (!n) { return null; } const b = n.getBoundingClientRect(); return { x: b.x + b.width * 0.4, y: b.y + b.height * 0.5 }; })()`);
if (!edBox) { cp.spawnSync('taskkill.exe', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' }); console.log('FAIL 没找到编辑器（源文件没打开？）——这条门不能空转'); process.exit(1); }
await click(edBox.x, edBox.y);
await sleep(800);

const norm = s => String(s).toLowerCase().split('+').join('+');
const shown = s => String(s).toLowerCase().split(/\s*\+\s*/).join('+');
const rowsExpr = `(() => {
	const w = document.querySelector('.quick-input-widget');
	if (!w || getComputedStyle(w).display === 'none') { return JSON.stringify({ err: 'no-widget' }); }
	const out = [];
	for (const r of w.querySelectorAll('.monaco-list-row')) {
		out.push({ label: ((r.querySelector('.label-name')?.textContent) || r.textContent || '').trim().slice(0, 60), kb: [...r.querySelectorAll('.monaco-keybinding-key')].map(k => k.textContent.trim()).join('+') });
	}
	return JSON.stringify(out.slice(0, 6));
})()`;

const bad = [];
let read = 0;
for (const entry of want) {
	let rows = [];
	for (let attempt = 1; attempt <= 3; attempt++) {
		await click(edBox.x, edBox.y);
		await sleep(300 + attempt * 200);
		await key('p', 'KeyP', 80, 10);
		await sleep(1000);
		await send('Input.insertText', { text: entry.title });
		await sleep(1600);
		try { rows = JSON.parse(await ev(rowsExpr)); } catch { rows = []; }
		if (!rows.err) { break; }
		await key('Escape', 'Escape', 27);
		await sleep(600);
	}
	await key('Escape', 'Escape', 27);
	await sleep(400);
	if (rows.err) { bad.push(`${entry.command}: 命令面板三次都没开（焦点被抢？）`); continue; }
	const hit = rows.find(r => r.label.replace(/\s+/g, '') === entry.title.replace(/\s+/g, ''));
	if (!hit) { bad.push(`${entry.command}: 面板里找不到「${entry.title}」`); continue; }
	read++;
	if (!hit.kb || norm(entry.key) !== shown(hit.kb)) {
		bad.push(`${entry.command}: 声明 ${entry.key}，产品解析到 ${hit.kb || '(无)'} —— 用户按这个键不会有反应`);
	}
}
cp.spawnSync('taskkill.exe', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' });
// 刚杀完进程树时临时目录还会被占用几秒：清不掉不是这条门的结论，别让它把结果盖掉。
try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); } catch { console.log('（临时 profile 目录没清掉，稍后可手动删 ' + dir + '）'); }

if (read < want.length - 2) { console.log(`FAIL 只读到 ${read}/${want.length} 条命令的面板行，核对不完整，不算通过`); }
if (bad.length) { console.log(`FAIL ${bad.length} 条快捷键对不上：\n  ${bad.join('\n  ')}`); process.exit(1); }
console.log(`出厂产品的 ${want.length} 条快捷键全部解析一致`);
