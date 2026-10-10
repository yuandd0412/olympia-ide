// zh-cn dictionary batch 18 -- integrated terminal: profiles, tabs, rendering, shell integration, confirmations
export default {
	// ---- profiles / settings schema ----
	'A terminal profile already exists with that name': '已存在同名的终端配置文件',
	'Configure Terminal Profile': '配置终端配置文件',
	'profiles': '配置文件',
	'contributed': '扩展贡献',
	'detected': '自动检测',
	'The ID of the terminal profile provider.': '终端配置提供程序的 ID。',
	'Title for this terminal profile.': '此终端配置文件的标题。',
	'A codicon, URI, or light and dark URIs to associate with this terminal type.':
		'与此类终端关联的 codicon、URI，或浅色与深色 URI。',
	'Defines additional terminal profiles that the user can create.': '定义用户可以创建的额外终端配置文件。',
	'Defines terminal completion providers that will be registered when the extension activates.':
		'定义在扩展激活时注册的终端补全提供程序。',
	'A description of what the completion provider does. This will be shown in the settings UI.':
		'说明该补全提供程序的作用。此说明会显示在设置界面中。',
	'Background color when dragging on top of terminals. The color should have transparency so that the terminal contents can still shine through.':
		'拖放到终端上方时的背景颜色。该颜色应带透明度，以便下层终端内容仍然可见。',
	'Do you want to terminate the active terminal session?': '要终止当前活动的终端会话吗？',
	'Do you want to terminate the {0} active terminal sessions?': '要终止这 {0} 个活动的终端会话吗？',

	// ---- remote indicator ----
	'This shell is open to a {0}local{1} folder, NOT to the virtual folder': '此 shell 打开的是{0}本地{1}文件夹，而不是虚拟文件夹',
	'This shell is running on your {0}local{1} machine, NOT on the connected remote machine':
		'此 shell 运行在你的{0}本地{1}计算机上，而不是已连接的远程计算机上',

	// ---- tabs view ----
	'Move Tabs Right': '把标签页移到右侧',
	'Move Tabs Left': '把标签页移到左侧',
	'Hide Tabs': '隐藏标签页',
	'Show hidden chat terminals': '显示隐藏的对话终端',
	'{0} Hidden Terminal': '{0} 个隐藏的终端',
	'{0} Hidden Terminals': '{0} 个隐藏的终端',
	'Show 1 hidden chat terminal': '显示 1 个隐藏的对话终端',
	'Show {0} hidden chat terminals': '显示 {0} 个隐藏的对话终端',
	'Terminal tabs': '终端标签页',
	'Never hide the terminal tabs view': '从不隐藏终端标签页视图',
	'Hide the terminal tabs view when there is only a single terminal opened': '仅打开一个终端时隐藏终端标签页视图',
	'Hide the terminal tabs view when there is only a single terminal group opened': '仅打开一个终端组时隐藏终端标签页视图',
	'Always show the active terminal': '始终显示活动终端',
	'Show the active terminal when it is the only terminal opened': '当活动终端是唯一打开的终端时显示它',
	'Show the active terminal when it is the only terminal opened or when the tabs view is in its narrow textless state':
		'当活动终端是唯一打开的终端，或标签页视图处于窄无文字状态时显示它',
	'Never show the active terminal': '从不显示活动终端',
	'Always show the actions': '始终显示操作按钮',
	'Show the actions when it is the only terminal opened': '当它是唯一打开的终端时显示操作按钮',
	'Show the actions when it is the only terminal opened or when the tabs view is in its narrow textless state':
		'当它是唯一打开的终端，或标签页视图处于窄无文字状态时显示操作按钮',
	'Never show the actions': '从不显示操作按钮',
	'Show the terminal tabs view to the left of the terminal': '在终端左侧显示终端标签页视图',
	'Show the terminal tabs view to the right of the terminal': '在终端右侧显示终端标签页视图',
	'Controls the location of the terminal tabs, either to the left or right of the actual terminal(s).':
		'控制终端标签页的位置，可在实际终端的左侧或右侧。',
	'Create terminals in the editor': '在编辑器区域创建终端',
	'Create terminals in the terminal view': '在终端视图中创建终端',
	'Controls where newly created terminals will appear.': '控制新建终端显示在何处。',
	'Focus the terminal when clicking a terminal tab': '单击终端标签页时聚焦终端',
	'Focus the terminal when double-clicking a terminal tab': '双击终端标签页时聚焦终端',
	'Controls whether focusing the tab\'s terminal happens on double or single click.':
		'控制聚焦标签页对应终端是在双击还是单击时发生。',
	'The terminal tabs widget is focused.': '终端标签页小部件已获得焦点。',
	'Whether one terminal is selected in the terminal tabs list.': '终端标签页列表中是否选中了一个终端。',
	'Whether the focused tab\'s terminal is a split terminal.': '获得焦点的标签页所对应终端是否为拆分终端。',
	'The active terminal is a split pane.': '活动终端是否为拆分窗格。',

	// ---- font / rendering ----
	"Use 'monospace'": '使用\'等宽\'字体',
	"The terminal only supports monospace fonts. Be sure to restart Olympia IDE if this is a newly installed font.":
		'终端仅支持等宽字体。如果这是新安装的字体，请务必重启 Olympia IDE。',
	'Controls the font family of the terminal. Defaults to {0}\'s value.': '控制终端字体。默认为 {0} 的值。',
	'Controls the font size in pixels of the terminal.': '控制终端字号（像素）。',
	'Controls the letter spacing of the terminal. This is an integer value which represents the number of additional pixels to add between characters.':
		'控制终端的字间距。该值为整数，表示字符之间额外增加的像素数。',
	'Controls the line height of the terminal. This number is multiplied by the terminal font size to get the actual line-height in pixels.':
		'控制终端行高。该数值会乘以终端字号，得到实际的行高（像素）。',
	'Controls how terminal text is antialiased on high-DPI displays.': '控制在高 DPI 显示器上终端文字的抗锯齿方式。',
	'Follow {0}.': '跟随 {0}。',
	'Use grayscale antialiasing, which can make text look sharper. With GPU acceleration, this may require **Developer: Reload Window** to take effect.':
		'使用灰度抗锯齿，可让文字看起来更锐利。在启用 GPU 加速时，可能需要执行**开发人员：重新加载窗口**才能生效。',
	'Controls whether font ligatures are enabled in the terminal. Ligatures will only work if the configured {0} supports them.':
		'控制是否在终端中启用字体连字。只有当配置的 {0} 支持连字时才会生效。',
	'The font weight to use within the terminal for non-bold text. Accepts "normal" and "bold" keywords or numbers between 1 and 1000.':
		'终端中非粗体文字使用的字重。接受 "normal" 和 "bold" 关键字，或 1 到 1000 之间的数字。',
	'The font weight to use within the terminal for bold text. Accepts "normal" and "bold" keywords or numbers between 1 and 1000.':
		'终端中粗体文字使用的字重。接受 "normal" 和 "bold" 关键字，或 1 到 1000 之间的数字。',
	'The number of cells in a tab stop.': '一个制表位包含的单元格数。',
	'A multiplier to be used on the `deltaY` of mouse wheel scroll events.': '应用于鼠标滚轮滚动事件 `deltaY` 的倍数。',
	'The number of milliseconds to show the bell within a terminal tab when triggered.':
		'响铃时在终端标签页内显示提示的毫秒数。',

	// ---- cursor / bell / rendering mode ----
	'Controls whether the terminal cursor blinks.': '控制终端光标是否闪烁。',
	'Controls whether text blinking is enabled in the terminal.': '控制终端中是否启用文字闪烁。',
	'Controls the style of terminal cursor when the terminal is focused.': '控制终端获得焦点时的光标样式。',
	'Controls the style of terminal cursor when the terminal is not focused.': '控制终端未获得焦点时的光标样式。',
	'Controls the width of the cursor when {0} is set to {1}.': '当 {0} 设为 {1} 时控制光标宽度。',
	'The number of milliseconds to show the bell within a terminal tab when triggered.': '响铃时在终端标签页内显示提示的毫秒数。',
	'This is now deprecated. Instead use the `terminal.integrated.enableVisualBell` and `accessibility.signals.terminalBell` settings.':
		'此设置已弃用。请改用 `terminal.integrated.enableVisualBell` 和 `accessibility.signals.terminalBell` 设置。',
	'Controls whether the visual terminal bell is enabled. This shows up next to the terminal\'s name.':
		'控制是否启用终端视觉响铃。它会显示在终端名称旁边。',
	'The visual terminal bell is enabled': '终端视觉响铃已启用',
	'The visual terminal bell is disabled': '终端视觉响铃已禁用',
	'Let Olympia IDE detect which renderer will give the best experience.': '让 Olympia IDE 自动检测能提供最佳体验的渲染器。',
	'Enable GPU acceleration within the terminal.': '在终端中启用 GPU 加速。',
	'Disable GPU acceleration within the terminal. The terminal will render much slower when GPU acceleration is off but it should reliably work on all systems.':
		'在终端中禁用 GPU 加速。关闭 GPU 加速后终端渲染会慢很多，但应该能在所有系统上可靠工作。',
	'Controls whether the terminal will leverage the GPU to do its rendering.': '控制终端是否利用 GPU 进行渲染。',
	'Version 6 of Unicode. This is an older version which should work better on older systems.':
		'Unicode 第 6 版。这是一个较旧的版本，在较老的系统上表现更好。',
	'Version 11 of Unicode. This version provides better support on modern systems that use modern versions of Unicode.':
		'Unicode 第 11 版。此版本在使用较新 Unicode 版本的新系统上支持更好。',

	// ---- $LANG ----
	"Set the `$LANG` environment variable if the existing variable does not exist or it does not end in '.UTF-8'.":
		'如果 `$LANG` 环境变量不存在，或其值不以 \'.UTF-8\' 结尾，则设置该变量。',
	"Do not set the `$LANG` environment variable.": '不设置 `$LANG` 环境变量。',
	"Always set the `$LANG` environment variable.": '始终设置 `$LANG` 环境变量。',

	// ---- mouse ----
	'Controls whether to treat the option key as the meta key in the terminal on macOS.':
		'控制在 macOS 上是否把终端中的 option 键视为 meta 键。',
	'Controls whether text selected in the terminal will be copied to the clipboard.':
		'控制在终端中选中的文本是否会被复制到剪贴板。',
	'Show the context menu.': '显示上下文菜单。',
	'Copy when there is a selection, otherwise paste.': '有选中内容时复制，否则粘贴。',
	'Paste on right click.': '右键时粘贴。',
	'Select the word under the cursor and show the context menu.': '选中光标下的单词并显示上下文菜单。',
	'Do nothing and pass event to terminal.': '不做任何处理，把事件传递给终端。',
	'Controls how terminal reacts to right click.': '控制终端对右键单击的反应方式。',
	'The platform default to focus the terminal. On Linux this will also paste the selection.':
		'采用平台默认行为来聚焦终端。在 Linux 上这还会粘贴选中的内容。',
	'Paste on middle click.': '中键单击时粘贴。',
	'Controls how terminal reacts to middle click.': '控制终端对中键单击的反应方式。',
	'Controls whether the terminal will scroll using an animation.': '控制终端滚动时是否使用动画。',

	// ---- close confirmations ----
	'Always confirm if there are terminals.': '存在终端时总是要求确认。',
	'Confirm if there are any terminals that have child processes.': '存在带子进程的终端时要求确认。',
	'Confirm if the terminal is in the editor.': '终端位于编辑器中时要求确认。',
	'Confirm if the terminal is in the panel.': '终端位于面板中时要求确认。',
	'Confirm if the terminal is either in the editor or panel.': '终端位于编辑器或面板中时要求确认。',
	'Always off.': '始终关闭。',
	'Always on.': '始终开启。',
	'Enable only when not in a remote workspace.': '仅在非远程工作区中启用。',

	// ---- paste / bold / split ----
	'Controls whether to show a warning dialog when pasting multiple lines into the terminal.':
		'控制向终端粘贴多行内容时是否显示警告对话框。',
	'Always show the warning if the text contains a new line.': '文本包含换行符时始终显示警告。',
	'Never show the warning.': '从不显示警告。',
	'Controls whether bold text in the terminal will always use the "bright" ANSI color variant.':
		'控制终端中的粗体文字是否始终使用「明亮」变体的 ANSI 颜色。',
	'Controls the working directory a split terminal starts with.': '控制拆分终端启动时使用的工作目录。',
	'A new split terminal will use the workspace root as the working directory. In a multi-root workspace a choice for which root folder to use is offered.':
		'新建的拆分终端将使用工作区根目录作为工作目录。在多根工作区中会让你选择使用哪个根文件夹。',
	'A new split terminal will use the working directory that the parent terminal started with.':
		'新建的拆分终端将使用父终端启动时的工作目录。',
	'On macOS and Linux, a new split terminal will use the working directory of the parent terminal. On Windows, this behaves the same as initial.':
		'在 macOS 和 Linux 上，新建拆分终端将使用父终端的工作目录。在 Windows 上则与初始状态相同。',
	'The parent terminal started as the initial terminal': '父终端作为初始终端启动',
	'The parent terminal started as a split terminal': '父终端作为拆分终端启动',
	'The initial terminal': '初始终端',

	// ---- persistence ----
	'Persist terminal sessions/history for the workspace across window reloads.':
		'在窗口重新加载后为该工作区保留终端会话和历史记录。',
	'Never restore the terminal buffers or recreate the process.': '从不恢复终端缓冲区，也不重建进程。',
	'Whether to relaunch terminals automatically if extensions want to contribute to their environment and have not been interacted with yet.':
		'当扩展希望为其环境提供内容但尚未被交互时，是否自动重新启动终端。',
	'open the default settings JSON': '打开默认设置 JSON',
	'Whether to hide the terminal view on startup, avoiding creating a terminal when there are no persistent sessions.':
		'是否在启动时隐藏终端视图，从而在没有持久会话时避免创建终端。',
	'Never hide the terminal view on startup.': '从不在启动时隐藏终端视图。',
	'Only hide the terminal when there are no persistent sessions restored.': '仅当没有恢复任何持久会话时才隐藏终端。',
	'Always hide the terminal, even when there are persistent sessions restored.':
		'始终隐藏终端，即使恢复了持久会话。',
	'Whether to hide the terminal view when the last terminal is closed. This will only happen when the terminal is the only visible view in the view container.':
		'是否在最后一个终端关闭时隐藏终端视图。仅当终端是视图容器中唯一可见的视图时才会发生。',
	'Whether to enable the win32 input mode, which provides enhanced keyboard input support on Windows.':
		'是否启用 win32 输入模式，它可在 Windows 上提供增强的键盘输入支持。',
	'Whether to use the conpty.dll (v1.25.260303002) shipped with Olympia IDE, instead of the one bundled with Windows.':
		'是否使用 Olympia IDE 自带的 conpty.dll（v1.25.260303002），而不是 Windows 捆绑的那个。',
	'Controls whether to show the alert "The terminal process terminated with exit code" when exit code is non-zero.':
		'控制当退出码非零时是否显示「终端进程已终止，退出码为……」的提示。',

	// ---- shell integration ----
	'When shell integration is enabled, adds a decoration for each command.':
		'启用 shell 集成后，为每条命令添加装饰标记。',
	'Show decorations in the gutter (left) and overview ruler (right)': '在装订线（左侧）和概览标尺（右侧）显示装饰标记',
	'Show gutter decorations to the left of the terminal': '在终端左侧的装订线显示装饰标记',
	'Show overview ruler decorations to the right of the terminal': '在终端右侧的概览标尺显示装饰标记',
	'Do not show decorations': '不显示装饰标记',
	'When shell integration is enabled, enables quick fixes for terminal commands that appear as a lightbulb or sparkle icon to the left of the prompt.':
		'启用 shell 集成后，为终端命令启用快速修复，提示图标（灯泡或星光）显示在提示符左侧。',
	'Controls whether to report the shell environment, enabling its use in features such as {0}. This may cause a slowdown when printing your shell\'s prompt.':
		'控制是否报告 shell 环境，以便在 {0} 等功能中使用。打印 shell 提示符时可能因此变慢。',
	'Whether shell integration is enabled in the active terminal': '活动终端中是否启用了 shell 集成',

	// ---- title / description variables ----
	'Controls the terminal title. Variables are substituted based on the context:': '控制终端标题。变量会根据上下文进行替换：',
	'Controls the terminal description, which appears to the right of the title. Variables are substituted based on the context:':
		'控制终端描述，显示在标题右侧。变量会根据上下文进行替换：',
	'the terminal\'s current working directory.': '终端当前的工作目录。',
	'the workspace in which the terminal was launched.': '终端启动时所在的工作区。',
	'the `name` of the workspace in which the terminal was launched.': '终端启动时所在工作区的 `name`。',
	'indicates a local terminal in a remote workspace.': '表示这是远程工作区中的本地终端。',
	'the name of the terminal process.': '终端进程的名称。',
	'the progress state as reported by the `OSC 9;4` sequence.': '由 `OSC 9;4` 序列上报的进度状态。',
	'a conditional separator {0} that only shows when it\'s surrounded by variables with values or static text.':
		'条件分隔符 {0}，仅当它两侧是有值的变量或静态文本时才显示。',
	'the name provided to the terminal by the process.': '进程提供给终端的名称。',
	'indicates this terminal is associated with a task.': '表示该终端与某个任务关联。',
	'the detected shell type.': '检测到的 shell 类型。',
	'the shell\'s full prompt input according to shell integration.': '根据 shell 集成得到的 shell 完整提示输入。',
	'A theme color ID to associate with terminal icons by default.': '默认与终端图标关联的主题颜色 ID。',
	'A codicon ID to associate with terminal icons by default.': '默认与终端图标关联的 codicon ID。',
	'Separator used by {0} and {1}.': '{0} 和 {1} 使用的分隔符。',

	// ---- keybinding dispatch ----
	'Dispatches most keybindings to the terminal instead of the workbench, overriding {0}, which can be used alternatively for fine tuning.':
		'将大多数快捷键分发到终端而非工作台，覆盖 {0}。也可以改用 {0} 进行精细调整。',

	// ---- dev / sim ----
	'Simulated latency in milliseconds applied to all calls made to the pty host. This is useful for testing terminal behavior under high latency conditions.':
		'对所有发往 pty 宿主的调用施加的模拟延迟（毫秒）。这有助于在高延迟条件下测试终端行为。',
	'Simulated startup delay in milliseconds for the pty host process. This is useful for testing terminal initialization under slow startup conditions.':
		'pty 宿主进程的模拟启动延迟（毫秒）。这有助于在启动缓慢的条件下测试终端初始化。',
	'Enable developer mode for the terminal. This shows additional debug information and visualizations for shell integration sequences.':
		'启用终端的开发者模式。这会显示额外的调试信息和 shell 集成序列可视化。',
	'When terminal process debugging is enabled': '启用终端进程调试时',

	// ---- focus ----
	'Controls whether the terminal, accessible buffer, or neither will be focused after `Terminal: Run Selected Text In Active Terminal` has been run.':
		'控制执行「终端：在活动终端中运行选中内容」之后，聚焦终端、无障碍缓冲区，还是都不聚焦。',
	'Always focus the terminal.': '始终聚焦终端。',
	'Always focus the accessible buffer.': '始终聚焦无障碍缓冲区。',
	'Focus Terminal and Hide Accessible Buffer': '聚焦终端并隐藏无障碍缓冲区',
	'The platform default to focus the terminal. On Linux this will also paste the selection.':
		'采用平台默认行为来聚焦终端。在 Linux 上这还会粘贴选中的内容。',

	// ---- context keys ----
	'Integrated Terminal': '集成终端',
	'Whether the terminal is focused.': '终端是否已获得焦点。',
	'Whether any terminal is focused, including detached terminals used in other UI.':
		'是否有任何终端获得焦点，包括其他界面中使用的分离终端。',
	'Whether a terminal in the editor area is focused.': '编辑器区域中的终端是否已获得焦点。',
	'The current number of terminals.': '当前的终端数量。',
	'The shell type of the active terminal, this is set if the type can be detected.':
		'活动终端的 shell 类型。如果能检测到类型，则会设置该值。',
	"Whether the terminal's alt buffer is active.": '终端的备用缓冲区是否处于活动状态。',
	"Whether the terminal's suggest widget is visible.": '终端的建议小部件是否可见。',
	'Whether the terminal view is showing': '终端视图是否正在显示',
	'Whether text is selected in the active terminal.': '活动终端中是否选中了文本。',
	'Whether text is selected in a focused terminal.': '获得焦点的终端中是否选中了文本。',
	'Whether terminal processes can be launched in the current workspace.': '当前工作区中是否可以启动终端进程。',
	'Whether the terminal run command picker is currently open.': '终端运行命令选择器当前是否已打开。',
	'Whether the focused tab\'s terminal is a split terminal.': '获得焦点的标签页所对应终端是否为拆分终端。',
	'Whether the active terminal is a split pane.': '活动终端是否为拆分窗格。',
	'The active terminal is a split pane.': '活动终端是否为拆分窗格。',

	// ---- commands ----
	'Move Terminal into Editor Area': '把终端移入编辑器区域',
	'Move Terminal into New Window': '把终端移入新窗口',
	'New Terminal Window': '新建终端窗口',
	'Move Terminal into Panel': '把终端移入面板',
	'Unsplit Terminal': '取消拆分终端',
	'Toggle Size to Content Width': '切换为按内容宽度调整大小',
	'Focus Hover': '聚焦悬停',
	'Create New Terminal Starting in a Custom Working Directory': '在自定义工作目录中创建新终端',
	'Rename the Currently Active Terminal': '重命名当前活动的终端',
	'Scroll to Previous Command': '滚动到上一条命令',
	'Scroll to Next Command': '滚动到下一条命令',
	'Reveal Command in Terminal': '在终端中显示该命令',
	'Run Recent Command': '运行最近的命令',
	'Go To Recent Directory': '转到最近的目录',
	'Show Command Actions': '显示命令操作',
	'Type terminal name. Press Enter to confirm or Escape to cancel.': '输入终端名称。按 Enter 确认，按 Escape 取消。',
	'Starting...': '正在启动...',
	'Toggle Visibility': '切换可见性',
	'Split': '拆分',
	'Kill': '终止',
};