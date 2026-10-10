// Pass 2: template-form localize() defaults (those containing \n or {0}).
// Pure formatting patterns like "{0}, {1}" are deliberately left alone.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = 'D:/oler-ide-v2/oss/src/vs';

const D = {
	// Explorer empty states (literally what a new user sees first)
	"You have not yet opened a folder.\\n{0}": "你还没有打开任何文件夹。\\n{0}",
	"You have not yet opened a folder.\\n{0}\\n{1}": "你还没有打开任何文件夹。\\n{0}\\n{1}",
	"You have not yet opened a folder.\\n{0}\\nOpening a folder will close all currently open editors. To keep them open, {1} instead.":
		"你还没有打开任何文件夹。\\n{0}\\n打开文件夹会关闭当前所有编辑器。若想保持打开，请改为{1}。",
	"You have not yet added a folder to the workspace.\\n{0}": "你还没有向工作区添加文件夹。\\n{0}",
	"Connected to remote.\\n{0}": "已连接到远程。\\n{0}",
	"Open a File": "打开文件",

	// debug / run
	"No debugger available, can not send '{0}'": "没有可用的调试器，无法发送“{0}”",
	"Duration: {0}ms": "耗时：{0} 毫秒",
	"Exit Code: {0}": "退出码：{0}",
	"Status: {0}": "状态：{0}",
	"Result: {0}": "结果：{0}",
	"Warning: {0}": "警告：{0}",
	"Info: {0}": "信息：{0}",
	"Line {0}": "第 {0} 行",
	"Running {0}": "正在运行 {0}",
	"Ran {0}": "已运行 {0}",
	"Press {0} for accessibility help": "按 {0} 打开无障碍说明",
	"{0}, use ({1}) for accessibility help": "{0}，按 ({1}) 打开无障碍说明",

	// files / explorer actions
	"Renaming {0} to {1}": "正在将 {0} 重命名为 {1}",
	"Creating {0}": "正在创建 {0}",
	"Unable to modify read-only file '{0}'": "无法修改只读文件“{0}”",
	"Unable to install plugin: {0}": "无法安装插件：{0}",
	"Search for {0}": "搜索 {0}",
	"Read {0}": "读取 {0}",
	"Select {0}": "选择 {0}",
	"Toggle {0}": "切换 {0}",
	"Configure {0}": "配置 {0}",
	"Enable {0}": "启用 {0}",
	"Disable {0}": "禁用 {0}",
	"Install {0}": "安装 {0}",
	"Start {0}": "开始 {0}",
	"Edit {0}": "编辑 {0}",
	"Open {0}": "打开 {0}",
	"New {0}": "新建 {0}",
	"Show More ({0})": "显示更多（{0}）",
	"Hide '{0}'": "隐藏“{0}”",
	"Sign in to {0}": "登录 {0}",
	"Continue with {0}": "使用 {0} 继续",
	"Speak or use {0}": "说出或使用 {0}",
	"Hold {0} to talk": "按住 {0} 说话",
	"Attached context, {0}": "附加上下文，{0}",

	// counts / lists
	"{0} files": "{0} 个文件",
	"1 file": "1 个文件",
	"{0} files changed": "{0} 个文件已更改",
	"{0} comments": "{0} 条评论",
	"{0} found": "找到 {0} 项",
	"{0} found for '{1}'": "为“{1}”找到 {0} 项",
	"{0} of {1}": "{0} / {1}",
	"Showing {0} of {1}": "显示 {0} / {1}",
	"{0} used": "已用 {0}",
	"{0} selected.": "已选择 {0}。",
	"{0} inserted.": "已插入 {0}。",
	"{0} removed from session.": "已从会话中移除 {0}。",
	"Could not remove {0} from this session: {1}": "无法从此会话移除 {0}：{1}",
	"Reconnecting to {0}...": "正在重新连接到 {0}...",
	"Continue in {0}": "在 {0} 中继续",
	"Lines will wrap according to the {0} setting.": "将根据 {0} 设置自动换行。",
	"on {0}": "于 {0}",
	"choices: {0}": "可选项：{0}",
	"Search: {0}": "搜索：{0}",
	"Extension: {0}": "扩展：{0}",
	"Extension '{0}' not found.": "未找到扩展“{0}”。",
	"Cannot install the '{0}' extension because it is not available in this setup.": "无法安装扩展“{0}”，因为当前安装中不提供该扩展。",
	"Installing Extension {0} failed: Manifest is not found.": "安装扩展 {0} 失败：未找到清单文件。",
	"This publisher has verified ownership of {0}": "该发布者已验证对 {0} 的所有权",
	"Please allow pop-ups for this website in your [browser settings]({0}).": "请在[浏览器设置]({0})中允许此网站显示弹出窗口。",
	"'{0}' is not a valid plugin source. Enter a GitHub repository (owner/repo), a git clone URL, or a local folder path.":
		"“{0}”不是有效的插件源。请输入 GitHub 仓库（owner/repo）、git 克隆地址，或本地文件夹路径。",
	"This action is irreversible!": "此操作不可撤销！",
	"Are you sure you want to delete '{0}'?": "确定要删除“{0}”吗？"
};

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const st = statSync(p);
		if (st.isDirectory()) { out.push(...walk(p)); }
		else if (name.endsWith('.ts') && !name.endsWith('.d.ts') && !/\.test\.ts$/.test(name)) { out.push(p); }
	}
	return out;
}

const RE = /(\blocalize2?\(\s*(?:\{[\s\S]*?\}\s*,\s*)?(?:'[^']*'|"[^"]*")\s*(?:,\s*(?:'[^']*'|"[^"]*"))*\s*,\s*)"((?:[^"\\]|\\.)*)"/g;

const used = new Set();
let total = 0;
const files = [];
for (const file of walk(ROOT)) {
	const before = readFileSync(file, 'utf8');
	let n = 0;
	const after = before.replace(RE, (m, prefix, str) => {
		// source literals store a real backslash-n as the two chars \ + n
		const key = str.replace(/\\n/g, '\\n');
		const hit = D[key];
		if (hit === undefined) { return m; }
		used.add(key);
		n++;
		return prefix + '"' + hit + '"';
	});
	if (n > 0) { writeFileSync(file, after, 'utf8'); total += n; files.push([n, file.replace(ROOT, '')]); }
}
files.sort((a, b) => b[0] - a[0]);
console.log(`template replacements: ${total} across ${files.length} files`);
console.log(`dict used: ${used.size} / ${Object.keys(D).length}`);
for (const [n, f] of files.slice(0, 20)) { console.log(`  ${String(n).padStart(3)}  ${f}`); }
const unused = Object.keys(D).filter(k => !used.has(k));
if (unused.length) { console.log('unused: ' + unused.length); }
