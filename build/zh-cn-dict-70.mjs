// Batch 70 — ordinary workbench chrome that the fork's own dictionaries never reached.
//
// Scoped by measurement, not by volume: `scripts/oneoff/nls-gap-split.py` puts 4,175 of the
// remaining English defaults inside the AI subsystems (chat / sessions / agentHost / mcp …),
// 38 more inside `contrib/github` which this product does not ship, and only ~270 in chrome a
// student actually meets. This batch covers the visible slice of that remainder: the editor
// part (diff-layout menu items and the overtype indicator), the shared design-token setting
// descriptions, the two task menu-bar commands, the task-template picker labels and the multi
// diff editor settings.
//
// Kept out on purpose: `installExtensionsTool.*` (only reachable from the AI install tool),
// `indexedDBFileSystemProvider` (browser distro only) and the bare proper noun `VSIX`.
//
// Rules honoured: `{0}` placeholders preserved, no `&&` mnemonics in these sources, and every
// value that ends with CJK punctuation ends on a CJK character (preflight rejects otherwise).
export default {
	// workbench/browser/parts — editor part menu + status bar
	'Manage Trusted Extensions': '管理受信任的扩展',
	'Diff View': '差异视图',
	'Automatic (Currently Side by Side)': '自动（当前为并排）',
	'Automatic (Currently Inline)': '自动（当前为内联）',
	'Inline (Temporary)': '内联（临时）',
	'OVR': '改写',
	// platform/theme — token / size setting descriptions (Settings search hits)
	'Valid token selectors have the form (*|tokenType)(.tokenModifier)*(:tokenLanguage)?.':
		'有效的标记选择器形如 (*|tokenType)(.tokenModifier)*(:tokenLanguage)。',
	'Deprecated: use `fontSize.body1` instead.': '已弃用：请改用 `fontSize.body1`。',
	'Deprecated: use `fontSize.label1` instead.': '已弃用：请改用 `fontSize.label1`。',
	'Deprecated: use `fontSize.body2` instead.': '已弃用：请改用 `fontSize.body2`。',
	'Heading 1 font size (largest heading).': '1 级标题字号（最大标题）。',
	'Heading 2 font size (title).': '2 级标题字号（题名）。',
	'Heading 3 font size (subtitle).': '3 级标题字号（副标题）。',
	'Primary body font size.': '主要正文字号。',
	'Secondary body font size.': '次要正文字号。',
	'Label 1 font size (section title, tabs).': '1 级标签字号（分区标题、选项卡）。',
	'Label 2 font size (metadata).': '2 级标签字号（元信息）。',
	'Label 3 font size (badge).': '3 级标签字号（徽标）。',
	'Regular font weight (400) for body, labels and metadata.':
		'常规字重（400），用于正文、标签与元信息。',
	'SemiBold font weight (600) for headings and strong emphasis.':
		'半粗字重（600），用于标题与强调文本。',
	// workbench/contrib/tasks — task toolbar commands
	'Run Rebuild Task': '运行重新构建任务',
	'Run Clean Task': '运行清理任务',
	// workbench/contrib/tasks — template picker labels shown by "配置任务"
	'Compiles a TypeScript project': '编译 TypeScript 项目',
	'Compiles a TypeScript project in watch mode': '以监听模式编译 TypeScript 项目',
	'Executes .NET Core build command': '执行 .NET Core 生成命令',
	'Executes the build target': '执行生成目标',
	'Example to run an arbitrary external command': '运行任意外部命令的示例',
	'Executes common maven commands': '执行常用的 Maven 命令',
	// workbench/contrib/multiDiffEditor
	'Open Multi Diff Editor Layout Debug State': '打开多重差异编辑器的布局调试状态',
	'Use the compact card-based variant.': '使用基于卡片的紧凑变体。',
	'Use the compact variant without cards.': '使用不带卡片的紧凑变体。',
	'Controls the experimental variant of the multi diff editor.':
		'控制多重差异编辑器的实验性变体。',
};
