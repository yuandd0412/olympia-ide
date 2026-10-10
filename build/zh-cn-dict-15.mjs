// zh-cn dictionary batch 15 -- debug settings descriptions, launch.json schema, disassembly, preLaunchTask
export default {
	// ---- settings: inline values / toolbar ----
	'Always show variable values inline in editor while debugging.': '调试时始终在编辑器中内联显示变量值。',
	'Never show variable values inline in editor while debugging.': '调试时从不在编辑器中内联显示变量值。',
	'Show variable values inline in editor while debugging when the language supports inline value locations.':
		'调试时，若语言支持内联值位置，则在编辑器中内联显示变量值。',
	'Show debug toolbar in all views.': '在所有视图中显示调试工具栏。',
	'Show debug toolbar only in debug views.': '仅在调试视图中显示调试工具栏。',
	'`(Experimental)` Show debug toolbar in the command center.': '`（实验性）`在命令中心中显示调试工具栏。',
	'Do not show debug toolbar.': '不显示调试工具栏。',
	'Never show debug item in status bar': '从不在状态栏显示调试项',
	'Always show debug item in status bar': '始终在状态栏显示调试项',
	'Show debug item in status bar only after debug was started for the first time': '仅在首次开始调试后于状态栏显示调试项',
	'When in screen reader optimized mode, automatically expand lazy variables.': '在屏幕阅读器优化模式下，自动展开惰性变量。',
	'Always automatically expand lazy variables.': '始终自动展开惰性变量。',
	'Never automatically expand lazy variables.': '从不自动展开惰性变量。',
	'Controls whether variables that are lazily resolved, such as getters, are automatically resolved and expanded by the debugger.':
		'控制调试器是否自动解析并展开惰性求值的变量（例如 getter）。',
	'Hide the warning shown when a `preLaunchTask` has been running for a while.': '隐藏 `preLaunchTask` 运行较久时显示的警告。',
	'Color of the status bar when the debugger is active.': '调试器活动时状态栏的颜色。',
	'Color for the debug inline value text.': '调试内联值文本的颜色。',
	'Color for the debug inline value background.': '调试内联值的背景颜色。',
	'Debug toolbar background color.': '调试工具栏背景颜色。',
	'Debug toolbar border color.': '调试工具栏边框颜色。',
	'Debug toolbar icon for start debugging.': '开始调试的调试工具栏图标。',
	'Debug toolbar icon for pause.': '暂停的调试工具栏图标。',
	'Debug toolbar icon for stop.': '停止的调试工具栏图标。',
	'Debug toolbar icon for disconnect.': '断开连接的调试工具栏图标。',
	'Debug toolbar icon for restart.': '重新启动的调试工具栏图标。',
	'Debug toolbar icon for step into.': '步入的调试工具栏图标。',
	'Debug toolbar icon for continue.': '继续的调试工具栏图标。',
	'Debug toolbar icon for step back.': '单步回退的调试工具栏图标。',
	'Show Source Code in Disassembly View.': '在反汇编视图中显示源代码。',
	'Toggle Source Code in Disassembly View': '切换反汇编视图中的源代码',
	'Color of the status bar when the debugger is active.': '调试器活动时状态栏的颜色。',
	'Status bar background color when a program is being debugged. The status bar is shown in the bottom of the window':
		'调试程序时状态栏的背景颜色。状态栏显示在窗口底部',
	'Status bar foreground color when a program is being debugged. The status bar is shown in the bottom of the window':
		'调试程序时状态栏的前景色。状态栏显示在窗口底部',
	'Status bar border color separating to sidebar and editor when a program is being debugged. The status bar is shown in the bottom of the window':
		'调试程序时状态栏与侧边栏和编辑器之间的分隔边框颜色。状态栏显示在窗口底部',
	'Command center background color when a program is being debugged': '调试程序时命令中心的背景颜色',

	// ---- settings: debug console ----
	'Controls if the Debug Console should be automatically closed when the debug session ends.':
		'控制调试会话结束时是否自动关闭调试控制台。',
	'Controls the font size in pixels in the Debug Console.': '控制调试控制台中的字号（像素）。',
	'Controls the font family in the Debug Console.': '控制调试控制台中的字体。',
	'Controls the line height in pixels in the Debug Console. Use 0 to compute the line height from the font size.':
		'控制调试控制台中的行高（像素）。设为 0 时按字号自动计算行高。',
	'Controls if the lines should wrap in the Debug Console.': '控制调试控制台中的内容是否自动换行。',
	'Controls if the Debug Console should suggest previously typed input.': '控制调试控制台是否建议之前输入过的内容。',
	'Controls if the Debug Console should collapse identical lines and show a number of occurrences with a badge.':
		'控制调试控制台是否折叠相同内容的行，并用徽标显示出现次数。',
	'Controls whether suggestions should be accepted on Enter in the Debug Console. Enter is also used to evaluate whatever is typed in the Debug Console.':
		'控制调试控制台中是否用 Enter 键接受建议。Enter 键也用于对输入内容求值。',
	'Controls the maximum number of lines in the Debug Console.': '控制调试控制台保留的最大行数。',
	'Controls when the internal Debug Console should open.': '控制内部调试控制台在何时打开。',

	// ---- settings: focus / preLaunchTask / views ----
	'Controls whether the workbench window should be focused when the debugger breaks.':
		'控制调试器中断时是否将焦点切换到工作台窗口。',
	'Controls whether the editor should be focused when the debugger breaks.': '控制调试器中断时是否将焦点切换到编辑器。',
	'Controls what to do when errors are encountered after running a preLaunchTask.':
		'控制运行 preLaunchTask 后出现错误时的处理方式。',
	'Ignore task errors and start debugging.': '忽略任务错误并开始调试。',
	'Show the Problems view and do not start debugging.': '显示「问题」视图且不开始调试。',
	'Prompt user.': '询问用户。',
	'Cancel debugging.': '取消调试。',
	'Controls whether breakpoints are displayed in a tree view grouped by file, or as a flat list.':
		'控制断点是以按文件分组的树视图显示，还是以平铺列表显示。',
	'Controls what editors to save before starting a debug session.': '控制开始调试会话前要保存哪些编辑器。',
	'Save all editors in the active group before starting a debug session.': '开始调试会话前保存活动编辑器组中的所有编辑器。',
	'Save all editors in the active group except untitled ones before starting a debug session.':
		'开始调试会话前保存活动编辑器组中除未命名文件外的所有编辑器。',
	"Don't save any editors before starting a debug session.": '开始调试会话前不保存任何编辑器。',
	'Controls whether to confirm when the window closes if there are active debug sessions.':
		'控制存在活动调试会话时，关闭窗口是否需要确认。',
	'Always confirm if there are debug sessions.': '存在调试会话时总是要求确认。',
	'Remember my choice in user settings': '在用户设置中记住我的选择',
	'Remember my choice for this task': '为该任务记住我的选择',
	'Show Source Code in Disassembly View.': '在反汇编视图中显示源代码。',

	// ---- preLaunchTask ----
	'Errors exist after running preLaunchTask \'{0}\'.': '运行 preLaunchTask \'{0}\' 后存在错误。',
	'Error exists after running preLaunchTask \'{0}\'.': '运行 preLaunchTask \'{0}\' 后存在错误。',
	'The preLaunchTask \'{0}\' terminated with exit code {1}.': 'preLaunchTask \'{0}\' 已终止，退出码为 {1}。',
	'The preLaunchTask \'{0}\' terminated.': 'preLaunchTask \'{0}\' 已终止。',
	'Task \'{0}\' can not be referenced from a launch configuration that is in a different workspace folder.':
		'任务 \'{0}\' 不能被位于其他工作区文件夹中的启动配置引用。',
	'Could not find the task \'{0}\'.': '找不到任务 \'{0}\'。',
	'Could not find the specified task.': '找不到指定的任务。',
	'The task \'{0}\' has not exited and doesn\'t have a \'problemMatcher\' defined. Make sure to define a problem matcher for watch tasks.':
		'任务 \'{0}\' 尚未退出，且未定义 \'problemMatcher\'。请确保为监视任务定义了问题匹配器。',
	'Waiting for preLaunchTask \'{0}\'...': '正在等待 preLaunchTask \'{0}\'...',
	'Configure Task': '配置任务',

	// ---- disassembly ----
	'Disassembly not available.': '反汇编不可用。',
	'instructions': '条指令',
	'from disassembly': '来自反汇编',
	'Disassembly View': '反汇编视图',
	'Open Disassembly View': '打开反汇编视图',
	'Address': '地址',
	'Bytes': '字节',
	'follow link using forwarded port': '使用转发端口跟随链接',
	'follow link': '跟随链接',
	'Cmd + click to {0}\n{1}': 'Cmd + 单击以{0}\n{1}',
	'Ctrl + click to {0}\n{1}': 'Ctrl + 单击以{0}\n{1}',
	'Cmd + click to {0}': 'Cmd + 单击以{0}',
	'Ctrl + click to {0}': 'Ctrl + 单击以{0}',

	// ---- launch.json schema ----
	'Debugger \'type\' can not be omitted and must be of type \'string\'.': '调试器的 \'type\' 不能省略，且必须为 \'string\' 类型。',
	'Name of configuration; appears in the launch configuration dropdown menu.': '配置名称；显示在启动配置下拉菜单中。',
	'For debug extension development only: if a port is specified Olympia IDE tries to connect to a debug adapter running in server mode':
		'仅用于调试扩展开发：指定端口时，Olympia IDE 会尝试连接以服务器模式运行的调试适配器',
	'Task to run before debug session starts.': '调试会话开始前要运行的任务。',
	'Task to run after debug session ends.': '调试会话结束后要运行的任务。',
	'Disable the warning when trying to start the same debug configuration more than once.':
		'禁止在多次启动同一调试配置时显示警告。',
	"You don't have an extension for debugging {0}. Should we find a {0} extension in the Marketplace?":
		'你没有用于调试 {0} 的扩展。要在开放 VSX 市场（Marketplace）中为你查找 {0} 扩展吗？',
	'Suggested': '建议',
	'More {0} options...': '更多 {0} 选项...',
	'Install an extension for {0}...': '安装 {0} 扩展...',
	'Install extension...': '安装扩展...',
	'Select debugger': '选择调试器',
	'Type of configuration.': '配置类型。',
	'The debug type is not recognized. Make sure that you have a corresponding debug extension installed and that it is enabled.':
		'无法识别该调试类型。请确认已安装并启用对应的调试扩展。',
	'Request type of configuration. Can be "launch" or "attach".': '请求类型。可以是 "launch"（启动）或 "attach"（附加）。',
	'Windows specific launch configuration attributes.': 'Windows 平台专用的启动配置属性。',
	'OS X specific launch configuration attributes.': 'OS X 平台专用的启动配置属性。',
	'Linux specific launch configuration attributes.': 'Linux 平台专用的启动配置属性。',
	'Unique identifier for this debug adapter.': '此调试适配器的唯一标识符。',
	'Display name for this debug adapter.': '此调试适配器的显示名称。',
	'Path to the debug adapter program. Path is either absolute or relative to the extension folder.':
		'调试适配器程序的路径。可以是绝对路径，也可以是相对于扩展文件夹的路径。',
	'Optional arguments to pass to the adapter.': '传递给适配器的可选参数。',
	'Optional runtime in case the program attribute is not an executable but requires a runtime.':
		'当 program 属性不是可执行文件、需要借助运行时时的可选运行时。',
	'Optional runtime arguments.': '可选的运行时参数。',
	'Mapping from interactive variables (e.g. ${action.pickProcess}) in `launch.json` to a command.':
		'将 `launch.json` 中的交互式变量（例如 ${action.pickProcess}）映射到命令。',
	'Configurations for generating the initial \'launch.json\'.': '用于生成初始 `launch.json` 的配置。',
	'List of languages for which the debug extension could be considered the "default debugger".':
		'可将此调试扩展视为「默认调试器」的语言列表。',
	'Snippets for adding new configurations in \'launch.json\'.': '用于在 `launch.json` 中添加新配置的代码片段。',
	'JSON schema configurations for validating \'launch.json\'.': '用于校验 `launch.json` 的 JSON Schema 配置。',
	'When this condition is true, this debugger type is hidden from the debugger list, but is still enabled.':
		'当该条件为 true 时，此调试器类型会从调试器列表中隐藏，但仍然启用。',
	'Optional message to mark this debug type as being deprecated.': '用于标记该调试类型已弃用的可选消息。',
	'Windows specific settings.': 'Windows 平台专用设置。',
	'Runtime used for Windows.': 'Windows 上使用的运行时。',
	'macOS specific settings.': 'macOS 平台专用设置。',
	'Runtime used for macOS.': 'macOS 上使用的运行时。',
	'Linux specific settings.': 'Linux 平台专用设置。',
	'Runtime used for Linux.': 'Linux 上使用的运行时。',
	'UI strings contributed by this debug adapter.': '此调试适配器贡献的界面文案。',
	'Allow breakpoints for this language.': '允许为该语言设置断点。',
	'Condition which must be true to enable breakpoints in this language. Consider matching this to the debugger when clause as appropriate.':
		'启用该语言断点的必要条件。请酌情将其与调试器的 when 子句匹配。',
	'Presentation options on how to show this configuration in the debug configuration dropdown and the command palette.':
		'关于如何在调试配置下拉菜单和命令面板中展示该配置的显示选项。',
	'Controls if this configuration should be shown in the configuration dropdown and the command palette.':
		'控制是否在配置下拉菜单和命令面板中显示该配置。',
	'Group that this configuration belongs to. Used for grouping and sorting in the configuration dropdown and the command palette.':
		'该配置所属的分组。用于在配置下拉菜单和命令面板中分组和排序。',
	'Order of this configuration within a group. Used for grouping and sorting in the configuration dropdown and the command palette.':
		'该配置在分组内的排序。用于在配置下拉菜单和命令面板中分组和排序。',
	'Launch': '启动',
	'Version of this file format.': '此文件格式的版本。',
	'List of configurations. Add new configurations or edit existing ones by using IntelliSense.':
		'配置列表。可通过 IntelliSense 添加新配置或编辑现有配置。',
	'List of compounds. Each compound references multiple configurations which will get launched together.':
		'复合配置列表。每个复合配置引用多个将一起启动的配置。',
	'Please use unique configuration names.': '请使用唯一的配置名称。',
	'Name of folder in which the compound is located.': '复合配置所在文件夹的名称。',
	'Names of configurations that will be started as part of this compound.': '将作为该复合配置一部分启动的配置名称。',
	'Controls whether manually terminating one session will stop all of the compound sessions.':
		'控制手动终止其中一个会话是否会停止该复合配置的所有会话。',
	'Task to run before any of the compound configurations start.': '复合配置中任一配置开始前要运行的任务。',
	'Debuggers': '调试器',
	'Configure Launch Configuration': '配置启动配置',
	'Remove Launch Configuration': '移除启动配置',
	'Edit Debug Configuration in launch.json': '在 launch.json 中编辑调试配置',
	'Select Launch Configuration': '选择启动配置',
	'Unable to create \'launch.json\' file inside the \'.vscode\' folder ({0}).': '无法在 \'.vscode\' 文件夹内创建 `launch.json` 文件（{0}）。',
	'workspace': '工作区',
	'user settings': '用户设置',
	'configure': '配置',
	'No matching launch configurations': '没有匹配的启动配置',
	'Could not find launch configuration \'{0}\' in the workspace.': '在工作区中找不到启动配置 \'{0}\'。',
	'There are multiple launch configurations \'{0}\' in the workspace. Use folder name to qualify the configuration.':
		'工作区中存在多个名为 \'{0}\' 的启动配置。请用文件夹名来限定该配置。',
	'Can not find folder with name \'{0}\' for configuration \'{1}\' in compound \'{2}\'.':
		'在复合配置 \'{2}\' 中，找不到配置 \'{1}\' 所需的文件夹 \'{0}\'。',
	'Configuration \'{0}\' is missing in \'launch.json\'.': '`launch.json` 中缺少配置 \'{0}\'。',
	'\'launch.json\' does not exist for passed workspace folder.': '所传入的工作区文件夹没有 `launch.json`。',
	'Attribute \'{0}\' has an unsupported value \'{1}\' in the chosen debug configuration.':
		'所选调试配置中，属性 \'{0}\' 的值 \'{1}\' 不受支持。',
	'Attribute \'{0}\' is missing from the chosen debug configuration.': '所选调试配置缺少属性 \'{0}\'。',
	'Configured debug type \'{0}\' is not supported.': '不支持已配置的调试类型 \'{0}\'。',
	'Configured debug type \'{0}\' is installed but not supported in this environment.':
		'已安装调试类型 \'{0}\'，但当前环境不支持它。',
	'Missing property \'type\' for the chosen launch configuration.': '所选启动配置缺少 \'type\' 属性。',
	'The active file can not be debugged. Make sure it is saved and that you have a debug extension installed for that file type.':
		'当前文件无法调试。请确认它已保存，并且已为该文件类型安装了调试扩展。',
	'\\"node2\\" is no longer supported, use \\"node\\" instead and set the \\"protocol\\" attribute to \\"inspector\\".':
		'不再支持 \\"node2\\"，请改用 \\"node\\"，并将 \\"protocol\\" 属性设为 \\"inspector\\"。',
	'Timeout after {0} ms for \'{1}\'': '\'{1}\' 超时，阈值 {0} 毫秒',
	'Debug type of the active debug session. For example \'python\'.': '活动调试会话的调试类型。例如 \'python\'。',
	'Debug type of the selected launch configuration. For example \'python\'.': '所选启动配置的调试类型。例如 \'python\'。',
	'State that the focused debug session is in. One of the following: \'inactive\', \'initializing\', \'stopped\' or \'running\'.':
		'获得焦点的调试会话所处的状态。可为：\'inactive\'、\'initializing\'、\'stopped\' 或 \'running\'。',
	'Debug UX state. When there are no debug configurations it is \'simple\', otherwise \'default\'. Used to decide when to show welcome views in the debug viewlet.':
		'调试界面状态。没有调试配置时为 \'simple\'，否则为 \'default\'。用于决定何时在调试视图容器中显示欢迎页。',
	'All debug extensions are disabled. Enable a debug extension or install a new one from the Marketplace.':
		'所有调试扩展均已禁用。请启用某个调试扩展，或从市场安装一个新扩展。',
	'Debug Hover': '调试悬停',
	'Attach to Current Code Renderer': '附加到当前代码渲染器',
	'Unknown Source': '未知来源',
	'Search loaded scripts by name': '按名称搜索已加载的脚本',
	'Open Loaded Script...': '打开已加载的脚本...',
	'Open \'{0}\'': '打开 \'{0}\'',
	'Could not load source \'{0}\': {1}.': '无法加载源文件 \'{0}\'：{1}。',
	'Could not load source \'{0}\'.': '无法加载源文件 \'{0}\'。',
	'Cannot find debug adapter for type \'{0}\'.': '找不到类型为 \'{0}\' 的调试适配器。',
	'Unable to resolve the resource without a debug session': '没有调试会话时无法解析该资源',
	'Running executes build tasks and program code from your workspace.': '「运行」会执行构建任务和工作区中的程序代码。',
	'Debugging executes build tasks and program code from your workspace.': '「调试」会执行构建任务和工作区中的程序代码。',
	'1 active session': '1 个活动会话',
	'{0} active sessions': '{0} 个活动会话',
};