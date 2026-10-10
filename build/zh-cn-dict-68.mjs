// Batch 68 — workbench/electron-browser/desktop.contribution.ts (77 lines / 75 unique)
//
// Window, title bar, menu style, native tabs, crash reporting and the CLI `--argv`
// settings. Two entries are multi-line (openWithoutArgumentsInNewWindow and
// telemetry.enableCrashReporting) and the latter has a trailing space after
// "improve stability." that the key must reproduce.
//
// The window.border.* entries are enum labels of the form `{0}: ...`; they must keep
// the `{0}` placeholder and must end with 。 (preflight rejects CJK-punctuation values
// that end in an ASCII character).
export default {
	'New Window Tab': '新建窗口标签页',
	'Show Previous Window Tab': '显示上一个窗口标签页',
	'Show Next Window Tab': '显示下一个窗口标签页',
	'Move Window Tab to New Window': '将窗口标签页移到新窗口',
	'Merge All Windows': '合并所有窗口',
	'Toggle Window Tabs Bar': '切换窗口标签栏的显示',
	'E&&xit': '退出(&&X)',

	'Controls the timeout in seconds before giving up resolving the shell environment when the application is not already launched from a terminal. See our [documentation](https://go.microsoft.com/fwlink/?linkid=2149667) for more information.':
		'控制当应用程序并非从终端启动时，放弃解析 shell 环境之前的超时时间（秒）。更多信息请参阅我们的[文档](https://go.microsoft.com/fwlink/?linkid=2149667)。',

	'Controls whether a confirmation dialog shows asking to save or discard an opened untitled workspace in the window when switching to another workspace. Disabling the confirmation dialog will always discard the untitled workspace.':
		'控制切换到另一个工作区时，是否弹出确认对话框，询问要保存还是丢弃当前窗口中打开的未命名工作区。禁用该确认对话框后，未命名工作区将始终被丢弃。',

	'Open a new empty window.': '打开一个新的空窗口。',
	'Focus the last active running instance.': '聚焦最后一个处于活动状态的运行实例。',

	'Controls whether a new empty window should open when starting a second instance without arguments or if the last running instance should get focus.\nNote that there can still be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).':
		'控制在不带参数启动第二个实例时，是打开一个新的空窗口，还是让最后一个运行实例获得焦点。\n请注意，仍然存在一些会忽略此设置的情况（例如使用了 --new-window 或 --reuse-window 命令行选项时）。',

	'Always reopen all windows. If a folder or workspace is opened (e.g. from the command line) it opens as a new window unless it was opened before. If files are opened they will open in one of the restored windows together with editors that were previously opened.':
		'始终重新打开所有窗口。如果打开了某个文件夹或工作区（例如从命令行打开），除非它之前已经打开过，否则会在新窗口中打开。如果打开的是文件，则会与此前打开的编辑器一起在某个已恢复的窗口中打开。',

	'Reopen all windows unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window.':
		'除非打开了文件夹、工作区或文件（例如从命令行打开），否则重新打开所有窗口。如果打开的是文件，它会替换该窗口中此前打开的编辑器。',

	'Reopen all windows that had folders or workspaces opened unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window.':
		'重新打开所有曾打开过文件夹或工作区的窗口，除非打开了文件夹、工作区或文件（例如从命令行打开）。如果打开的是文件，它会替换该窗口中此前打开的编辑器。',

	'Reopen the last active window unless a folder, workspace or file is opened (e.g. from the command line). If a file is opened, it will replace any of the editors that were previously opened in a window.':
		'重新打开最后一个活动窗口，除非打开了文件夹、工作区或文件（例如从命令行打开）。如果打开的是文件，它会替换该窗口中此前打开的编辑器。',

	'Never reopen a window. Unless a folder or workspace is opened (e.g. from the command line), an empty window will appear.':
		'从不重新打开窗口。除非打开了某个文件夹或工作区（例如从命令行打开），否则会出现一个空窗口。',

	'Controls how windows and editors within are being restored when opening.':
		'控制打开时如何恢复窗口以及其中的编辑器。',

	'Controls whether a window should restore to full screen mode if it was exited in full screen mode.':
		'控制窗口若以全屏模式退出，重新打开时是否也恢复为全屏模式。',

	'Adjust the default zoom level for all windows. Each increment above `0` (e.g. `1`) or below (e.g. `-1`) represents zooming `20%` larger or smaller. You can also enter decimals to adjust the zoom level with a finer granularity. See {0} for configuring if the \'Zoom In\' and \'Zoom Out\' commands apply the zoom level to all windows or only the active window.':
		'调整所有窗口的默认缩放级别。在 0（例如 1）之上或之下（例如 -1）每增减一档，代表放大或缩小 20%。你也可以输入小数，以更精细的粒度调整缩放级别。{0} 用于配置「放大」和「缩小」命令是对所有窗口还是仅对活动窗口应用缩放级别。',

	'Controls if the \'Zoom In\' and \'Zoom Out\' commands apply the zoom level to all windows or only the active window. See {0} for configuring a default zoom level for all windows.':
		'控制「放大」和「缩小」命令是对所有窗口还是仅对活动窗口应用缩放级别。{0} 用于配置所有窗口的默认缩放级别。',

	'Open new windows in the center of the screen.': '在屏幕中央打开新窗口。',
	'Open new windows with same dimension as last active one.': '以与最后一个活动窗口相同的尺寸打开新窗口。',
	'Open new windows with same dimension as last active one with an offset position.': '以与最后一个活动窗口相同的尺寸、并带位置偏移的方式打开新窗口。',
	'Open new windows maximized.': '以最大化方式打开新窗口。',
	'Open new windows in full screen mode.': '以全屏模式打开新窗口。',

	'Controls the dimensions of opening a new window when at least one window is already opened. Note that this setting does not have an impact on the first window that is opened. The first window will always restore the size and location as you left it before closing.':
		'控制已经打开至少一个窗口后，再打开新窗口时的尺寸。请注意，此设置不会影响打开的第一个窗口；第一个窗口始终会恢复到你上次关闭时留下的尺寸和位置。',

	'Controls whether closing the last editor should also close the window. This setting only applies for windows that do not show folders.':
		'控制关闭最后一个编辑器时是否也关闭该窗口。此设置仅对不显示文件夹的窗口生效。',

	'If enabled, this setting will close the window when the application icon in the title bar is double-clicked. The window will not be able to be dragged by the icon. This setting is effective only if {0} is set to `custom`.':
		'启用后，双击标题栏中的应用程序图标将关闭窗口，此时将无法再通过该图标拖动窗口。仅当 {0} 设为 custom 时此设置才生效。',

	'Adjust the appearance of the window title bar to be native by the OS or custom. Changes require a full restart to apply.':
		'调整窗口标题栏的外观，可选择由操作系统原生呈现或使用自定义样式。更改后需要完全重启才会生效。',

	'Adjust the appearance of the window controls to be native by the OS, custom drawn or hidden. Changes require a full restart to apply.':
		'调整窗口控件的外观，可选择由操作系统原生呈现、自定义绘制或隐藏。更改后需要完全重启才会生效。',

	'Automatically changes custom title bar visibility.': '自动改变自定义标题栏的可见性。',

	'Hide custom titlebar in full screen. When not in full screen, automatically change custom title bar visibility.':
		'在全屏模式下隐藏自定义标题栏；不在全屏时则自动改变自定义标题栏的可见性。',

	'Hide custom titlebar when {0} is set to `native`.': '当 {0} 设为 native 时隐藏自定义标题栏。',

	'Adjust when the custom title bar should be shown. The custom title bar can be hidden when in full screen mode with `windowed`. The custom title bar can only be hidden in non full screen mode with `never` when {0} is set to `native`.':
		'调整自定义标题栏何时显示。使用 windowed 时，自定义标题栏可以在全屏模式下被隐藏；使用 never 时，只有在 {0} 设为 native 的情况下，才会在非全屏模式下隐藏自定义标题栏。',

	'Use the custom context menu.': '使用自定义上下文菜单。',
	'Use the native context menu.': '使用原生上下文菜单。',
	'Matches the context menu style to the title bar style defined in {0}.': '使上下文菜单样式与 {0} 中定义的标题栏样式保持一致。',
	'Use the custom menu.': '使用自定义菜单。',
	'Use the native menu. This is ignored when {0} is set to {1}.': '使用原生菜单。当 {0} 设为 {1} 时此项将被忽略。',
	'Matches the menu style to the title bar style defined in {0}.': '使菜单样式与 {0} 中定义的标题栏样式保持一致。',

	'Adjust the context menu appearances to either be native by the OS, custom, or inherited from the title bar style defined in {0}.':
		'调整上下文菜单的外观，可选择由操作系统原生呈现、自定义，或继承 {0} 中定义的标题栏样式。',

	'Adjust the menu style to either be native by the OS, custom, or inherited from the title bar style defined in {0}. This also affects the context menu appearance. Changes require a full restart to apply.':
		'调整菜单样式，可选择由操作系统原生呈现、自定义，或继承 {0} 中定义的标题栏样式。此项同时会影响上下文菜单的外观。更改后需要完全重启才会生效。',

	'Adjust the appearance of dialogs to be native by the OS or custom.':
		'调整对话框的外观，可选择由操作系统原生呈现或使用自定义样式。',

	'Enables macOS native window tabs. Note that changes require a full restart to apply and that native tabs will disable a custom title bar style if configured.':
		'启用 macOS 原生的窗口标签页。请注意，更改后需要完全重启才会生效，并且原生标签页会使已配置的自定义标题栏样式失效。',

	'Controls if native full-screen should be used on macOS. Disable this option to prevent macOS from creating a new space when going full-screen.':
		'控制在 macOS 上是否使用原生全屏。禁用此选项可以避免进入全屏时 macOS 新建一个桌面空间。',

	'If enabled, clicking on an inactive window will both activate the window and trigger the element under the mouse if it is clickable. If disabled, clicking anywhere on an inactive window will activate it only and a second click is required on the element.':
		'启用后，点击未活动的窗口会同时激活该窗口，并在鼠标下方的元素可点击时触发它。禁用后，点击未活动窗口的任意位置只会激活它，需要再点击一次才能触发该元素。',

	'Controls the border color of the window:': '控制窗口的边框颜色，可选项如下。',
	'{0}: respect color theme settings, fallback to Windows settings': '{0}：遵循配色主题设置，回退到 Windows 设置。',
	'{0}: respect Windows settings only': '{0}：仅遵循 Windows 设置。',
	'{0}: disable border colors': '{0}：禁用边框颜色。',
	'{0}: specific color in Hex, RGB, RGBA, HSL, HSLA format': '{0}：以十六进制、RGB、RGBA、HSL 或 HSLA 格式指定具体颜色。',
	'Use {0} to set different colors for active and inactive windows. This setting is ignored when {1} is set to {2}.':
		'使用 {0} 可以为活动窗口和非活动窗口分别设置不同的颜色。当 {1} 设为 {2} 时，此设置将被忽略。',

	'Enable crash reports to be collected. This helps us improve stability. \nThis option requires restart to take effect.':
		'启用崩溃报告的收集，这有助于我们提升稳定性。\n此选项需要重启后才会生效。',

	'If this setting is false, no telemetry will be sent regardless of the new setting\'s value. Deprecated due to being combined into the {0} setting.':
		'如果此设置为 false，无论新设置的取值如何，都不会发送任何遥测数据。由于已合并到 {0} 设置中，此项已弃用。',

	'Enables the macOS touchbar buttons on the keyboard if available.':
		'如果键盘带有 Touch Bar，则启用 macOS 的 Touch Bar 按钮。',

	'A set of identifiers for entries in the touchbar that should not show up (for example `workbench.action.navigateBack`).':
		'一组标识符，指定 Touch Bar 中不应显示的条目（例如 workbench.action.navigateBack）。',

	'If enabled, a dialog will ask for confirmation whenever a local file or workspace is about to open through a protocol handler.':
		'启用后，每当即将通过协议处理程序打开本地文件或工作区时，都会弹出对话框请求确认。',

	'If enabled, a dialog will ask for confirmation whenever a remote file or workspace is about to open through a protocol handler.':
		'启用后，每当即将通过协议处理程序打开远程文件或工作区时，都会弹出对话框请求确认。',

	'The display Language to use. Picking a different language requires the associated language pack to be installed.':
		'要使用的显示语言。选择其它语言需要先安装对应的语言包。',

	'Disables LCD font antialiasing.': '禁用 LCD 字体抗锯齿。',

	'Bypass any specified proxy for the given semi-colon-separated list of hosts. Example value "<local>;*.microsoft.com;*foo.com;1.2.3.4:5678", will use the proxy server for all hosts except for local addresses (localhost, 127.0.0.1 etc.), microsoft.com subdomains, hosts that contain the suffix foo.com and anything at 1.2.3.4:5678':
		'对给定的以分号分隔的主机列表绕过代理。示例值 "<local>;*.microsoft.com;*foo.com;1.2.3.4:5678" 表示除以下目标外，其它所有主机都使用代理服务器：本地地址（localhost、127.0.0.1 等）、microsoft.com 的子域、包含后缀 foo.com 的主机，以及 1.2.3.4:5678 上的任何目标。',

	'Disables hardware acceleration. ONLY change this option if you encounter graphic issues.':
		'禁用硬件加速。只有在遇到图形显示问题时才应修改此选项。',

	'Allows to override the color profile to use. If you experience colors appear badly, try to set this to `srgb` and restart.':
		'允许覆盖要使用的颜色配置文件。如果你发现颜色显示异常，可以尝试将其设为 srgb 并重启。',

	'Allows to disable crash reporting, should restart the app if the value is changed.':
		'允许关闭崩溃报告。修改该取值后应当重启应用。',

	'Unique id used for correlating crash reports sent from this app instance.':
		'用于关联由此应用实例上报的崩溃报告的唯一标识符。',

	'Enable proposed APIs for a list of extension ids (such as `vscode.git`). Proposed APIs are unstable and subject to breaking without warning at any time. This should only be set for extension development and testing purposes.':
		'为一组扩展 ID（例如 vscode.git）启用提议 API。提议 API 尚不稳定，可能在任何时候发生破坏性变更而不另行通知。此项只应出于扩展开发与测试的目的而设置。',

	'Log level to use. Default is \'info\'. Allowed values are \'error\', \'warn\', \'info\', \'debug\', \'trace\', \'off\'.':
		'要使用的日志级别。默认为 info。可选取值为 error、warn、info、debug、trace、off。',

	'Disables the Chromium sandbox. This is useful when running Olympia IDE as elevated on Linux and running under Applocker on Windows.':
		'禁用 Chromium 沙箱。在 Linux 上以提权方式运行 Olympia IDE，或在 Windows 上运行于 AppLocker 之下时，此选项会很有用。',

	'Ensures that an in-memory store will be used for secret storage instead of using the OS\'s credential store. This is often used when running Olympia IDE extension tests or when you\'re experiencing difficulties with the credential store.':
		'确保使用内存中的存储来保存机密，而不是使用操作系统的凭据存储。运行 Olympia IDE 的扩展测试时，或当你遇到凭据存储方面的困难时，通常会用到这一项。',

	'Specifies the port to use for remote debugging.': '指定用于远程调试的端口。',

	'Specifies V8 JavaScript engine flags to pass (e.g. "--max-old-space-size=4096"). These flags are applied to the main process, renderer and utility processes.':
		'指定要传入的 V8 JavaScript 引擎标志（例如 --max-old-space-size=4096）。这些标志会应用到主进程、渲染进程和实用工具进程。',

	'Forces the renderer to be accessible. ONLY change this if you are using a screen reader on Linux. On other platforms the renderer will automatically be accessible. This flag is automatically set if you have editor.accessibilitySupport: on.':
		'强制渲染进程处于可访问状态。只有当你在 Linux 上使用屏幕阅读器时才应修改此项；在其它平台上渲染进程会自动变为可访问。如果设置了 editor.accessibilitySupport: on，该标志会自动开启。',

	'Configures the backend used to store secrets on Linux. This argument is ignored on Windows & macOS.':
		'配置在 Linux 上用于保存机密信息的后端。在 Windows 和 macOS 上该参数会被忽略。',

	'Ensures that maximized windows gets restored to correct display during RDP reconnection.':
		'确保在 RDP 重新连接后，最大化的窗口能够恢复到正确的显示器上。',
};