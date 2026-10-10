// zh-cn dictionary batch 42 -- terminal: find widget, command history, send sequence/signal, suggestions
export default {
	// ---- command history ----
	'Remove from Command History': '从命令历史中移除',
	'View Command Output': '查看命令输出',
	'Fuzzy search': '模糊搜索',
	'Controls the number of recently used commands to keep in the terminal command history. Set to 0 to disable terminal command history.':
		'控制终端命令历史中保留的最近使用命令数量。设为 0 表示禁用终端命令历史。',

	// ---- terminal actions ----
	'Create New Terminal': '新建终端',
	'Create New Terminal With Profile...': '使用配置文件新建终端...',
	'Rename Terminal': '重命名终端',
	'Show All Opened Terminals': '显示所有已打开的终端',
	'Type the name of a terminal to open.': '输入要打开的终端名称。',
	'Free port {0}': '释放端口 {0}',
	'Create PR {0}': '创建 PR {0}',

	// ---- links ----
	'Follow link': '跟随链接',
	'Follow link using forwarded port': '使用转发端口跟随链接',
	'Select the link to open, type to filter all links': '选择要打开的链接，输入内容可筛选所有链接',
	'option + click': 'option + 单击',
	'alt + click': 'alt + 单击',
	'cmd + click': 'cmd + 单击',
	'ctrl + click': 'ctrl + 单击',

	// ---- send sequence / signal ----
	'Send Sequence': '发送序列',
	'Enter sequence to send to the terminal': '输入要发送到终端的序列',
	'The sequence of text to send to the terminal': '要发送到终端的文本序列',
	'Send Signal': '发送信号',
	'The signal to send to the terminal process (e.g., \'SIGTERM\', \'SIGINT\', \'SIGKILL\')':
		'要发送给终端进程的信号（例如 \'SIGTERM\'、\'SIGINT\'、\'SIGKILL\'）',

	// ---- sticky scroll / current command ----
	'Shows the current command at the top of the terminal. This feature requires [shell integration]({0}) to be activated. See {1}.':
		'在终端顶部显示当前命令。此功能需要激活 [shell 集成]({0})。参见 {1}。',
	'Defines the maximum number of sticky lines to show. Sticky scroll lines will never exceed 40% of the viewport regardless of this setting.':
		'定义最多显示多少条粘滞行。无论此设置如何，粘滞滚动行都不会超过视口的 40%。',
	'A list of commands that should not trigger sticky scroll. When a command from this list is detected, the sticky scroll overlay will be hidden.':
		'不应触发粘滞滚动的命令列表。检测到列表中的命令时，粘滞滚动浮层会被隐藏。',

	// ---- quick fix provider schema ----
	'The ID of the quick fix provider': '快速修复提供程序的 ID',
	'A regular expression or string to test the command line against': '用于匹配命令行测试的正则表达式或字符串',
	'The command exit result to match on': '要匹配的命令退出结果',
	'The kind of the resulting quick fix. This changes how the quick fix is presented. Defaults to {0}.':
		'生成的快速修复类型。这会影响快速修复的呈现方式。默认为 {0}。',

	// ---- suggestion run on enter ----
	'Controls whether suggestions should run immediately when `Enter` (not `Tab`) is used to accept the result.':
		'控制使用 `Enter`（而非 `Tab`）接受结果时建议是否立即运行。',
	'Never run on `Enter`.': '在 `Enter` 上从不运行。',
	'Run on `Enter` when the suggestion is typed in its entirety.': '当建议被完整输入时在 `Enter` 上运行。',
	'Run on `Enter` when the suggestion is typed in its entirety or when a file is typed without its extension included.':
		'当建议被完整输入，或输入文件路径时未包含扩展名，则在 `Enter` 上运行。',
	'Always run on `Enter`.': '始终在 `Enter` 上运行。',

	// ---- suggestions ----
	'Controls how suggestion selection works in the integrated terminal.':
		'控制集成终端中建议选择的方式。',
	'Always select a suggestion when automatically triggering IntelliSense. `Enter` or `Tab` can be used to accept the first suggestion.':
		'自动触发 IntelliSense 时总是选中一条建议。可用 `Enter` 或 `Tab` 接受第一条建议。',
	'Controls whether the terminal suggestions status bar should be shown.': '控制是否显示终端建议状态栏。',
	'Show suggestions from {0}.': '显示来自 {0} 的建议。',
	'Terminal Suggest Providers': '终端建议提供程序',
	'Controls which suggestions automatically show up while typing. Suggestion providers are enabled by default.':
		'控制输入时自动显示哪些建议。建议提供程序默认启用。',
	'Providers are enabled by default. Omit them by setting the id of the provider to `false`.':
		'提供程序默认启用。将提供程序的 ID 设为 `false` 可将其排除。',
	'Controls whether the shell\'s inline suggestion should be detected and how it is scored.':
		'控制是否检测 shell 的内联建议及其评分方式。',
	'Enable the feature and sort the inline suggestion without forcing it to be on top. This means that exact matches will be above the inline suggestion.':
		'启用该功能并对内联建议排序，但不强制将其置顶。这意味着精确匹配项会排在内联建议之上。',
	'Enable the feature and always put the inline suggestion on top.': '启用该功能并始终把内联建议置顶。',
	'Enable the feature and use relative paths.': '启用该功能并使用相对路径。',
	'Enable the feature and use absolute paths. This is useful when the shell doesn\'t natively support `$CDPATH`.':
		'启用该功能并使用绝对路径。当 shell 本身不支持 `$CDPATH` 时这很有用。',

	// ---- local echo ----
	'When local echo should be enabled. This will override {0}': '何时启用本地回显。这将覆盖 {0}',
	'Always enabled': '始终启用',
	'Always disabled': '始终禁用',
	'Enabled only for remote workspaces': '仅对远程工作区启用',

	// ---- resize overlay ----
	'Whether to show a visual overlay with the terminal\'s columns and rows when it is resized.':
		'控制调整终端大小时是否显示行列信息的可视浮层。',

	// ---- hint ----
	' Start typing to dismiss or ': ' 开始输入以关闭，或 ',
	'Type copilot to use Copilot CLI.': '输入 copilot 可使用 Copilot CLI。',
	'Controls if the first terminal without input will show a hint about available actions when it is focused. This will only show when {0} is disabled.':
		'控制第一个无输入的终端在获得焦点时是否显示可用操作提示。仅当 {0} 已禁用时才会显示。',

	// ---- terminal find accessibility help ----
	'Note: Terminal Find keeps focus in the Find input. If you need to return to the terminal command line, press Escape to close Find.':
		'注意：终端查找会将焦点保留在查找输入框内。如需返回终端命令行，按 Escape 键关闭查找。',
	'Find Options:': '查找选项：',
	'Terminal Find has limited configuration options. Most behavior is controlled by the terminal itself.':
		'终端查找的可配置选项有限。多数行为由终端本身控制。',
	'- `accessibility.verbosity.find`: Controls whether the Terminal Find input announces the Accessibility Help hint.':
		'- `accessibility.verbosity.find`：控制终端查找输入框是否播报无障碍帮助提示。',
	'Press Escape to close Terminal Find. Focus moves to the terminal command line, and your search history is available on next Find.':
		'按 Escape 键关闭终端查找。焦点会移到终端命令行，下次查找时你的搜索历史仍然可用。',
};