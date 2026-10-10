// zh-cn dictionary batch 13 -- accessible terminal view, find-widget a11y help, terminal sandbox prompts
export default {
	// ---- accessible terminal ----
	'Focus Accessible Terminal View': '聚焦到终端无障碍视图',
	'Accessible Buffer Go to Next Command': '无障碍缓冲区：转到下一条命令',
	'Accessible Buffer Go to Previous Command': '无障碍缓冲区：转到上一条命令',
	'Controls whether the cursor position is preserved in the terminal\'s accessible view.':
		'控制终端无障碍视图中是否保留光标位置。',
	'Always position the cursor at the bottom of the buffer.': '始终把光标定位在缓冲区底部。',
	'Preserve the cursor position on reopen until new terminal content arrives.':
		'重新打开时保留光标位置，直到有新的终端内容到来。',
	'Always preserve the cursor position, including when new terminal content arrives.':
		'始终保留光标位置，包括有新的终端内容到来时。',
	'Focus the terminal accessible view when a command is executed.': '执行命令时聚焦到终端无障碍视图。',
	'Consider using powershell instead of command prompt for an improved experience':
		'建议改用 PowerShell 而不是命令提示符，以获得更好的体验',
	'The terminal has a feature called shell integration that offers an enhanced experience and provides useful commands for screen readers such as:':
		'终端有一项名为 Shell 集成的功能，可提供增强体验，并为屏幕阅读器提供诸如以下的命令：',

	// ---- terminal chat / sandbox (AI 终端) ----
	'Controls whether to allow auto approval in the run in terminal tool.': '控制「在终端中运行」工具是否自动批准。',
	'Allow all commands starting with {0}': '允许所有以 {0} 开头的命令',
	'Array of paths to deny read access. Leave empty to allow reading all paths.': '禁止读取访问的路径数组。留空表示允许读取所有路径。',
	'Array of paths to re-allow read access within denied regions. Takes precedence over denyRead.': '在被拒绝区域内重新允许读取的路径数组。优先级高于 denyRead。',
	'Array of paths to deny write access within allowed paths (takes precedence over allowWrite).': '在允许区域内禁止写入的路径数组（优先级高于 allowWrite）。',
	'Disable the feature.': '禁用该功能。',
	'The reply to send to the process.': '要发送给进程的回复内容。',
	'The terminal will be reused by tasks. Press any key to close.': '该终端将被任务复用，按任意键关闭。',
	'Run in terminal outside the sandbox?': '要在沙盒外的终端中运行吗？',
	'This command will run outside the sandbox.\n\nReason: {0}': '该命令将在沙盒外运行。\n\n原因：{0}',
	'This command will run outside the sandbox.': '该命令将在沙盒外运行。',
	'Rerun Request': '重新发起请求',
	'Inline chat occurs within a terminal. It is useful for suggesting terminal commands. Keep in mind that AI generated code may be incorrect.':
		'内联对话在终端中进行，适合用来建议终端命令。请注意 AI 生成的代码可能有误。',
	'It can be activated using the command: Terminal: Start Chat ({0}), which will focus the input box.':
		'可以用命令「终端: 开始对话（{0}）」激活，它会聚焦到输入框。',

	// ---- find widget accessibility help ----
	'Current Search Status:': '当前搜索状态：',
	'You are searching for: "{0}".': '你正在搜索：「{0}」。',
	'No matches found in the current file. Try adjusting your search text or the options below.':
		'在当前文件中没有找到匹配项。试试调整搜索文本或下方的选项。',
	'No search text entered yet. Start typing to find matches in the editor.': '尚未输入搜索内容。开始输入以在编辑器中查找匹配项。',
	'Match {0} of {1}.': '第 {0} 个匹配，共 {1} 个。',
	'What You Hear Each Time You Move to a Match:': '每次跳转到匹配项时你会听到：',
	'1) The full line that contains the match is read first, so you get immediate context.':
		'1）先朗读包含该匹配项的整行，让你立刻获得上下文。',
	'2) Your position among the matches is announced, so you know how far you are through the results.':
		'2）然后播报你在匹配项中的位置，让你知道进度。',
	'3) The exact line and column are announced, so you know precisely where the match is in the file.':
		'3）最后播报具体的行列号，让你精确定位该匹配项。',
	'Focus Behavior (Important):': '焦点行为（重要）：',
	'Keyboard Navigation Summary:': '键盘导航小结：',
	'While focused IN the Find input:': '焦点在查找输入框内时：',
	'While focused IN the editor (not the Find input):': '焦点在编辑器内时（不在查找输入框中）：',
	'- {0}: Move to the next match.': '- {0}：跳到下一个匹配项。',
	'- {0}: Move to the previous match.': '- {0}：跳到上一个匹配项。',
	'Note: Don\'t press Enter or Shift+Enter when focused in the editor - these will insert line breaks instead of navigating.':
		'注意：焦点在编辑器内时不要按 Enter 或 Shift+Enter，否则会插入换行而不是导航。',
	'- Match Case: Only exact case matches are included.': '- 区分大小写：只匹配大小写完全一致的内容。',
	'- Whole Word: Only full words are matched.': '- 全字匹配：只匹配完整单词。',
	'- Regular Expression: Use pattern matching for advanced searches.': '- 正则表达式：使用模式匹配进行高级搜索。',
	'- Find in Selection: Limit matches to the current selection.': '- 在选中内容中查找：只匹配当前选区内的内容。',
	'Settings You Can Adjust ({0} opens Settings):': '你可以调整的设置（{0} 打开设置）：',
	'Platform-Specific Setting (macOS only):': '平台专属设置（仅 macOS）：',
	'Closing:': '关闭：',
	'Match Case': '区分大小写',
	'Match Whole Word': '全字匹配',
	'Use Regular Expression': '使用正则表达式',
	'Find in Selection': '在选中内容中查找',
	'Find Next': '查找下一个',
	'Find Previous': '查找上一个',
	'Find': '查找',
	'Replace': '替换',
	'Replace All': '全部替换',
	'Find in Files': '在文件中查找',
	'Current Find Match': '当前查找匹配项',
	'Other Find Matches': '其他查找匹配项',
	'Find Result': '查找结果',
	'Editor Find': '编辑器内查找',
};