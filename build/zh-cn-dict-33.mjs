// zh-cn dictionary batch 33 -- comments panel: threads, providers, view settings
export default {
	// ---- errors ----
	'Deleting the comment reaction failed': '删除评论回应失败',
	'Toggling the comment reaction failed': '切换评论回应失败',
	'The cursor must be on a line with a comment to focus the comment':
		'光标必须位于带有评论的行上才能聚焦该评论',
	'The cursor must be within a commenting range to add a comment.':
		'光标必须位于可评论范围内才能添加评论。',
	'File comments are not allowed on this file.': '此文件不允许添加文件级评论。',

	// ---- view settings ----
	'Controls when the comments panel should open.': '控制批注面板何时打开。',
	'This setting is deprecated in favor of `comments.openView`.': '此设置已弃用，请改用 `comments.openView`。',
	'The comments view will never be opened.': '批注视图永远不会被打开。',
	'The comments view will open when a file with comments is active.': '当激活的文件含有评论时打开批注视图。',
	'If the comments view has not been opened yet during this session it will open the first time during a session that a file with comments is active.':
		'如果本次会话中批注视图尚未打开过，那么在首次激活含评论的文件时会自动打开。',
	'Controls when the comments view should open.': '控制批注视图何时打开。',
	'Determines if relative time will be used in comment timestamps (ex. \'1 day ago\').':
		'控制评论时间戳是否使用相对时间（例如「1 天前」）。',
	'Controls whether the comments widget scrolls or expands.': '控制批注小部件是滚动还是展开。',
	'Controls whether the comment thread should collapse when the thread is resolved.':
		'控制评论会话在解决后是否自动折叠。',
	'Show a confirmation dialog when collapsing a comment thread with unsubmitted comments.':
		'折叠含有未提交评论的会话时显示确认对话框。',
	'Never show a confirmation dialog when collapsing a comment thread.': '折叠评论会话时从不显示确认对话框。',
	'Controls whether a confirmation dialog is shown when collapsing a comment thread.':
		'控制折叠评论会话时是否显示确认对话框。',

	// ---- navigation commands ----
	'Go to Next Commented Range': '转到下一个已评论范围',
	'Go to Previous Commented Range': '转到上一个已评论范围',
	'Go to Next Commenting Range': '转到下一个可评论范围',
	'Go to Previous Commenting Range': '转到上一个可评论范围',
	'Toggle Editor Commenting': '切换编辑器批注',
	'Add Comment on Current Selection': '在当前选区上添加评论',
	'Focus Comment on Current Line': '聚焦到当前行的评论',
	'Collapse All Comments': '折叠所有评论',
	'Expand All Comments': '展开所有评论',
	'Expand Unresolved Comments': '展开未解决的评论',
	'Select Comment Provider': '选择评论提供程序',

	// ---- accessibility help ----
	'The editor contains commentable range(s). Some useful commands include:':
		'编辑器中包含可评论范围。可用命令包括：',
	'Some useful comment commands include:': '常用的评论命令包括：',
	'- Dismiss Comment{0}.': '- 忽略评论{0}。',
	'- Go to Next Commenting Range{0}.': '- 转到下一个可评论范围{0}。',
	'- Go to Previous Commenting Range{0}.': '- 转到上一个可评论范围{0}。',
	'- Go to Next Comment Thread{0}.': '- 转到下一个评论会话{0}。',
	'- Go to Previous Comment Thread{0}.': '- 转到上一个评论会话{0}。',
	'- Go to Next Commented Range{0}.': '- 转到下一个已评论范围{0}。',
	'- Go to Previous Commented Range{0}.': '- 转到上一个已评论范围{0}。',
	'- Add Comment on Current Selection{0}.': '- 在当前选区上添加评论{0}。',
	'- Submit Comment{0}.': '- 提交评论{0}。',
	'Editor has commenting ranges, run the command Open Accessibility Help ({0}), for more information.':
		'编辑器中有可评论范围，运行命令「打开无障碍帮助」（{0}）了解更多信息。',
	'Editor has commenting ranges, run the command Open Accessibility Help, which is currently not triggerable via keybinding, for more information.':
		'编辑器中有可评论范围，运行命令「打开无障碍帮助」了解更多信息，该命令目前无法通过快捷键触发。',
	'Editor has commenting ranges.': '编辑器中有可评论范围。',
	'\nInspect this in the accessible view ({0}).': '\n在无障碍视图中查看此项（{0}）。',
	'\nInspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.':
		'\n通过命令「打开无障碍视图」查看此项，该命令目前无法通过快捷键触发。',

	// ---- counts / empty ----
	'There are no comments in this workspace yet.': '此工作区还没有任何评论。',
	'{0} replies': '{0} 条回复',
	'1 reply': '1 条回复',
	'1 comment': '1 条评论',

	// ---- thread rendering ----
	'Image: {0}': '图片：{0}',
	'Outdated': '已过期',
	'[Ln {0}]': '[第 {0} 行]',
	'[Ln {0}-{1}]': '[第 {0}-{1} 行]',
	'Last reply from {0}': '{0} 的最后回复',
	'Filter (e.g. text, author)': '筛选（例如文本、作者）',
	'Filter comments': '筛选评论',
	'in {0}': '在 {0} 中',
	'at line {0} column {1} in {2}': '位于 {2} 的第 {0} 行第 {1} 列',
	'from line {0} to line {1} in {2}': '位于 {2} 的第 {0} 行至第 {1} 行',
};