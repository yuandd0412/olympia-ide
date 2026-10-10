// zh-cn dictionary batch 30 -- integrated browser: tabs, favorites, element commenting, emulation
export default {
	// ---- tabs / basics ----
	'Integrated Browser': '集成浏览器',
	'New Tab': '新建标签页',
	'Close All Browser Tabs': '关闭全部浏览器标签页',
	'Enter a URL': '输入网址',
	'Block': '阻止',
	'Remove from Favorites': '从收藏中移除',
	'Remove from History': '从历史记录中移除',
	'Opening browser page at {0}': '正在打开浏览器页面 {0}',
	'Opened browser page at {0}': '已打开浏览器页面 {0}',
	'Opened {0}': '已打开 {0}',

	// ---- search engines ----
	'Bing': '必应',
	'Google': 'Google',
	'Yahoo!': '雅虎',
	'DuckDuckGo': 'DuckDuckGo',

	// ---- sharing with agent ----
	'Share with Agent': '与智能体共享',
	'Stop Sharing with Agent': '停止与智能体共享',
	'Cannot Share with Agent': '无法与智能体共享',
	'Unable to Share Browser Tab': '无法共享浏览器标签页',
	'Sharing with Agent': '正在与智能体共享',
	'Share with Agent (Opens Isolated Tab)': '与智能体共享（将打开隔离标签页）',
	'Open a New Tab for Sharing?': '要新开标签页以进行共享吗？',
	'This tab does not enforce the configured policy restrictions required for agent sharing.\n\nOpen the page in a new tab to share it with agents.':
		'此标签页未启用智能体共享所需的策略限制。\n\n请在新标签页中打开该页面，以便与智能体共享。',
	'Cannot share with agents due to network domain policy.': '受网络域名策略限制，无法与智能体共享。',
	'Agent access to browser tabs was revoked because network filtering was enabled.':
		'由于启用了网络过滤，智能体对浏览器标签页的访问权限已被收回。',
	'Add to Chat': '添加到对话',

	// ---- confirmation ----
	'&&OK': '确定(&&O)',
	"Don't show again": '不再显示',
	'Use caution when attaching content from untrusted sources.':
		'附加来自不可信来源的内容时请务必谨慎。',
	'Pages may contain hidden prompts that can influence agent behavior. Double-check the attached contents before sending.':
		'页面可能包含能影响智能体行为的隐藏提示。发送前请再次核对所附加的内容。',

	// ---- reload ----
	'Reload (Automatic Refresh Enabled)': '重新加载（已启用自动刷新）',
	'More Reload Actions': '更多重新加载操作',
	'Refresh Automatically': '自动刷新',

	// ---- context keys ----
	'Whether the browser editor is focused': '浏览器编辑器是否已获得焦点',
	'Whether the browser has a URL loaded': '浏览器是否已加载网址',
	'Whether the browser has a load error': '浏览器是否出现加载错误',
	'The storage scope of the current browser view': '当前浏览器视图的存储作用域',
	'Whether developer tools are open for the current browser view': '当前浏览器视图是否已打开开发者工具',
	'The active element selection mode': '当前活动的元素选择模式',
	'Whether area selection is currently active': '当前是否处于区域选择状态',

	// ---- element commenting ----
	'You are in Integrated Browser element commenting mode.': '你正处于集成浏览器的元素评论模式。',
	'Use Tab and Shift+Tab to move through focusable page elements. Press Enter to comment on the focused element.':
		'使用 Tab 和 Shift+Tab 在可聚焦的页面元素之间移动。按 Enter 键对获得焦点的元素发表评论。',
	'In the comment input, press Enter to add the comment or Escape to cancel it.':
		'在评论输入框中，按 Enter 键添加评论，按 Escape 键取消。',
	'Commenting mode remains active after adding a comment. Press Escape outside the comment input to stop commenting.':
		'添加评论后评论模式仍然保持。在评论输入框之外按 Escape 键可停止评论。',
	'Numbered comment pins are in the page tab order. Focus a pin to preview its comment, then Tab to its Remove Comment button.':
		'带编号的评论图钉按页面 Tab 顺序排列。将焦点移到某个图钉可预览其评论，再按 Tab 键移到其「删除评论」按钮。',
	'Element commenting enabled. Press Enter to comment on the focused element. {0}':
		'元素评论已启用。按 Enter 键对获得焦点的元素发表评论。{0}',
	'Element commenting enabled. Press Enter to comment on the focused element.':
		'元素评论已启用。按 Enter 键对获得焦点的元素发表评论。',
	'Element commenting disabled.': '元素评论已禁用。',
	'Element selection enabled. Press Enter to add the focused element to chat.':
		'元素选择已启用。按 Enter 键将获得焦点的元素添加到对话。',
	'Element selection disabled.': '元素选择已禁用。',
	'Controls whether a screenshot of the selected element will be added to the chat.':
		'控制是否将所选元素的屏幕截图添加到对话中。',

	// ---- device emulation ----
	'Whether the browser emulation toolbar is visible': '浏览器模拟工具栏是否可见',
	'Whether the browser emulation is in mobile mode': '浏览器模拟是否处于移动模式',
	'Whether the browser emulation has a custom user agent': '浏览器模拟是否使用自定义用户代理',
	'Mobile Emulation': '移动模拟',
	'Dimensions:': '尺寸：',
	'Viewport width': '视口宽度',
	'Viewport height': '视口高度',
	'Swap Dimensions': '交换宽高',
	'DPR:': 'DPR：',
	'Device pixel ratio (blank = system default)': '设备像素比（留空表示系统默认）',
	'Device pixel ratio': '设备像素比',
	'Scale:': '缩放：',
	'Zoom factor': '缩放系数',
	'Auto ({0}%)': '自动（{0}%）',
	'auto': '自动',
	'mobile': '移动',
	'Select a device preset': '选择设备预设',
	'Apply Preset...': '应用预设...',
	'User agent string (leave empty for Olympia IDE default)': '用户代理字符串（留空则使用 Olympia IDE 默认值）',
	'Set User Agent...': '设置用户代理...',

	// ---- load errors ----
	'Certificate Error': '证书错误',
	'Failed to Load Page': '页面加载失败',
	'This site\'s security certificate could not be verified.': '无法验证此站点的安全证书。',
	'  Your connection is not private.': ' 你的连接不是私密连接。',
	'This usually means the host could not be found.\nEnsure the URL is correct and the server is accessible from the remote machine.':
		'这通常意味着找不到该主机。\n请确认网址正确，且该服务器可从远程计算机访问。',
	'The request was most likely blocked by network domain policy.\nCheck the configured allowed and denied network domains.':
		'该请求很可能被网络域名策略阻止。\n请检查已配置的允许和拒绝的网络域名。',
};