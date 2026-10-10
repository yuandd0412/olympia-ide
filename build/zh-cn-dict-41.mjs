// zh-cn dictionary batch 41 -- remote development: connection, port forwarding, help
export default {
	// ---- explorer / views ----
	'Remote Explorer': '远程资源管理器',
	'Ports': '端口',
	'Switch Remote': '切换远程连接',
	'Toggle Forwarded Ports View': '切换已转发端口视图',
	'Show Remote Menu': '显示远程菜单',
	'Close Remote Connection': '关闭远程连接',
	'Open a Remote Window': '打开远程窗口',
	'Remote Host': '远程主机',
	'Private': '专用',
	'Opening Remote...': '正在打开远程连接...',
	'Select an option to open a Remote Window': '选择打开远程窗口的方式',
	'Select url to open': '选择要打开的网址',
	'Install Remote Development Extensions': '安装远程开发扩展',

	// ---- connection state ----
	'Attempting to reconnect in {0} second...': '将在 {0} 秒后尝试重新连接...',
	'Attempting to reconnect in {0} seconds...': '将在 {0} 秒后尝试重新连接...',
	'Reconnect Now': '立即重新连接',
	'Connection Lost': '连接已丢失',
	'Disconnected. Attempting to reconnect...': '已断开连接。正在尝试重新连接...',
	'Cannot reconnect. Please reload the window.': '无法重新连接。请重新加载窗口。',
	'Disconnected from {0}': '已从 {0} 断开连接',
	'An error occurred while setting up {0}. Would you like to try again?': '配置 {0} 时出错。要重试吗？',
	'Network appears to be offline, certain features might be unavailable.':
		'网络似乎已离线，部分功能可能不可用。',
	'Network appears to have high latency ({0}ms last, {1}ms average), certain features may be slow to respond.':
		'网络延迟似乎较高（最近 {0}ms，平均 {1}ms），部分功能响应可能较慢。',

	// ---- deprecation warnings ----
	'You are about to connect to an OS version that is unsupported by {0}.':
		'你即将连接的操作系统版本不受 {0} 支持。',
	'You are connected to an OS version that is unsupported by {0}.':
		'你连接的操作系统版本不受 {0} 支持。',
	'Support for 32-bit ARM remote servers is deprecated and will be removed in a future release of {0}.':
		'对 32 位 ARM 远程服务器的支持已弃用，将在 {0} 的未来版本中移除。',
	'Do not show again': '不再显示',
	'Do not show again in v{0}': '在 v{0} 中不再显示',

	// ---- port forwarding ----
	'No forwarded ports. Forward a port to access your running services locally.\n[Forward a Port]({0})':
		'没有已转发的端口。转发一个端口即可在本地访问正在运行的服务。\n[转发端口]({0})',
	'No forwarded ports. Forward a port to access your locally running services over the internet.\n[Forward a Port]({0})':
		'没有已转发的端口。转发一个端口即可通过互联网访问本地运行的服务。\n[转发端口]({0})',
	'1 forwarded port': '1 个已转发端口',
	'{0} forwarded ports': '{0} 个已转发端口',
	'No Ports Forwarded': '没有已转发的端口',
	'Forwarded Ports': '已转发的端口',
	'Forwarded Ports: {0}': '已转发的端口：{0}',
	'Your application{0} running on port {1} is available.  ': '你的应用{0}正在端口 {1} 上运行，可以访问了。  ',
	'You\'ll need to run as superuser to use port {0} locally.  ': '本地使用端口 {0} 需要以超级用户身份运行。  ',
	'Make Public': '设为公开',
	'Use Port {0} as Sudo...': '将端口 {0} 作为 Sudo 使用...',

	// ---- auto forwarding settings ----
	'Shows a notification when a port is automatically forwarded.': '端口被自动转发时显示通知。',
	'Opens the browser when the port is automatically forwarded. Depending on your settings, this could open an embedded browser.':
		'端口被自动转发时打开浏览器。取决于你的设置，这可能会打开内嵌浏览器。',
	'Opens a preview in the same window when the port is automatically forwarded.':
		'端口被自动转发时在同一窗口中打开预览。',
	'Shows no notification and takes no action when this port is automatically forwarded.':
		'该端口被自动转发时不显示通知，也不执行任何操作。',
	'This port will not be automatically forwarded.': '此端口不会被自动转发。',
	'Defines the action that occurs when the port is discovered for automatic forwarding':
		'定义在发现该端口可自动转发时执行的操作',
	'Automatically prompt for elevation (if needed) when this port is forwarded. Elevate is required if the local port is a privileged port.':
		'转发此端口时自动提示提权（如需要）。本地端口为特权端口时必须提权。',
	'Label that will be shown in the UI for this port.': '在界面中为此端口显示的标签。',
	'When true, a modal dialog will show if the chosen local port isn\'t used for forwarding.':
		'启用后，如果所选本地端口未用于转发，将显示模态对话框。',
	'The protocol to use when forwarding this port.': '转发此端口时使用的协议。',

	// ---- help ----
	'Read Documentation': '阅读文档',
	'Review Issues': '查看问题',
	'Help and feedback': '帮助与反馈',
	'Remote Help': '远程帮助',
};