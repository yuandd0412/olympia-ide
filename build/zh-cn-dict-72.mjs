// Batch 72 — the last reachable, non-AI chrome: file dialogs, folder/workspace open failures
// and file-service error text.
//
// Chosen from `scripts/oneoff/nls-residual-ast.mjs --dump`, which counts only what a
// translation pass can reach. Outside the AI subsystems the whole-tree residual is ~250
// messages, and these are the ones a student actually meets: the open/save dialogs, what
// happens when a folder can't be opened, and the file-service errors behind "目录不为空".
//
// Deliberately left out, with the reason: `&&Open Remote...` and `Open &&Files...` carry
// `&&` mnemonics that must survive translation; `VSIX` is a bare proper noun; the two
// `marketplace.pickAccount` / `signInDifferentAccount` strings belong to Copilot sign-in,
// which this product replaces with BYOK; `terminalChatUsesAgentHostContextKey` is a
// context-key description no user sees; `Open Installed Web Extensions Resource` is a
// developer-only entry; terminal dictation is the voice service.
//
// Two exclusions listed when drafting this batch did not survive contact with the apply:
// `File is Directory` / `File is not a directory` / `Directory is not empty` / `File exceeds
// available storage quota` live in `platform/files/browser/indexedDBFileSystemProvider.ts`
// (4 literals), and `Tool for installing extensions` lives in `installExtensionsTool.ts`.
// The strings themselves are generic file-service errors and a command title, so they are
// translated even though their host file was written off as browser-only or AI-only — which
// is the lesson: scope by the string's surface, not by the file it happens to sit in.
export default {
	// workbench/services/dialogs — open/save dialogs
	"Can't open folders, try adding a folder to the workspace instead.": '无法打开文件夹，请改为向工作区添加一个文件夹。',
	"Can't open workspaces, try adding a folder to the workspace instead.": '无法打开工作区，请改为向工作区添加一个文件夹。',
	'Opening Local Folders is Unsupported': '不支持打开本地文件夹',
	// platform/files — error text surfaced by dialog and explorer operations
	'Directory is not empty': '目录不为空',
	'File is Directory': '该路径是目录',
	'File is not a directory': '该路径不是目录',
	'File exceeds available storage quota': '文件超出可用的存储配额',
	// workbench/contrib/extensions — add-extension feedback
	"Cannot add '{0}' because this extension is not a web extension.": '无法添加 {0}，因为它不是 Web 扩展。',
	'Tool for installing extensions': '用于安装扩展的工具',
	// workbench/contrib/tasks — the confirm dialog before a task file is written
	"Task '{0}' will be created in '{1}' and run with this command:": '任务 {0} 将在 {1} 中创建，并使用以下命令运行：',
};
