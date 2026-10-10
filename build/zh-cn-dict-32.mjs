// zh-cn dictionary batch 32 -- editor find/replace, diff view, accessibility help
export default {
	// ---- find settings descriptions ----
	'- `editor.find.findOnType`: Runs Find as you type.': '- `editor.find.findOnType`：输入时即执行查找。',
	'- `editor.find.cursorMoveOnType`: Moves the cursor to the best match while you type.':
		'- `editor.find.cursorMoveOnType`：输入时把光标移到最佳匹配项。',
	'- `editor.find.seedSearchStringFromSelection`: Controls when selection text is used to seed Find.':
		'- `editor.find.seedSearchStringFromSelection`：控制何时用选中文本作为查找的初始内容。',
	'- `editor.find.autoFindInSelection`: Automatically enables Find in Selection based on selection type.':
		'- `editor.find.autoFindInSelection`：根据选区类型自动启用「在选中内容中查找」。',
	'- `editor.find.loop`: Wraps search at the beginning or end of the file.':
		'- `editor.find.loop`：搜索到文件开头或结尾时循环。',
	'- `editor.find.history`: Controls whether Find search history is stored.': '- `editor.find.history`：控制是否保存查找搜索历史。',
	'- `editor.occurrencesHighlight`: Highlights other occurrences of the current symbol.':
		'- `editor.occurrencesHighlight`：高亮当前符号的其他出现处。',
	'- `editor.occurrencesHighlightDelay`: Controls how soon occurrences are highlighted.':
		'- `editor.occurrencesHighlightDelay`：控制出现处高亮的延迟时间。',
	'- `editor.selectionHighlight`: Highlights other matches of the current selection.':
		'- `editor.selectionHighlight`：高亮与当前选区相同的其他匹配项。',
	'- `editor.selectionHighlightMaxLength`: Limits selection highlight length.':
		'- `editor.selectionHighlightMaxLength`：限制选区高亮的长度。',
	'- `editor.selectionHighlightMultiline`: Controls whether multi-line selections are highlighted.':
		'- `editor.selectionHighlightMultiline`：控制是否高亮跨行选区。',
	'- `editor.find.globalFindClipboard`: Uses the shared macOS Find clipboard when available.':
		'- `editor.find.globalFindClipboard`：在可用时使用 macOS 共享的查找剪贴板。',
	'- `accessibility.verbosity.find`: Controls whether the Find input announces the Accessibility Help hint.':
		'- `accessibility.verbosity.find`：控制查找输入框是否播报无障碍帮助提示。',
	'- `editor.find.addExtraSpaceOnTop`: Adds extra scroll space so matches are not hidden behind the Find and Replace dialog.':
		'- `editor.find.addExtraSpaceOnTop`：增加额外滚动空间，避免匹配项被查找替换对话框遮挡。',
	'- `editor.find.replaceHistory`: Controls whether Replace history is stored.': '- `editor.find.replaceHistory`：控制是否保存替换历史。',
	'Disable Empty Editor Hint': '禁用空编辑器提示',

	// ---- accessibility mode ----
	'Toggle Screen Reader Accessibility Mode': '切换屏幕阅读器无障碍模式',
	'Toggles an optimized mode for usage with screen readers, braille devices, and other assistive technologies.':
		'切换一种针对屏幕阅读器、盲文点显器和其他辅助技术的优化模式。',
	'Announce Cursor Position': '播报光标位置',
	'Announce the current cursor position (line and column) via screen reader.':
		'通过屏幕阅读器播报当前光标位置（行号和列号）。',
	'Line {0}, Column {1}': '第 {0} 行，第 {1} 列',
	'Voice': '语音',

	// ---- dictation ----
	'Start Dictation in Editor': '在编辑器中开始听写',
	'Stop Dictation in Editor': '在编辑器中停止听写',
	'Stop Dictation ({0})': '停止听写（{0}）',

	// ---- diff editor ----
	'Run the command Diff Editor: Switch Side{0} to toggle between the original and modified editors.':
		'运行命令「差异编辑器：切换边」{0}可在原始和修改后的编辑器之间切换。',
	'Use Diff View in the editor title area\'s More Actions menu to select inline, side-by-side, or automatic layout.':
		'在编辑器标题栏的「更多操作」菜单中使用「差异视图」选择行内、并排或自动布局。',
	'The setting, accessibility.verbosity.diffEditorActive, controls if a diff editor announcement is made when it becomes the active editor.':
		'设置项 accessibility.verbosity.diffEditorActive 控制差异编辑器成为活动编辑器时是否播报。',
	'You are in a diff editor.': '你正处于差异编辑器中。',
	'View the next{0} or previous{1} diff in diff review mode, which is optimized for screen readers.':
		'在针对屏幕阅读器优化的差异审阅模式中，查看下一个{0}或上一个{1}差异。',
	'To control which accessibility signals should be played, the following settings can be configured: {0}.':
		'要控制播放哪些无障碍信号，可以配置以下设置：{0}。',
	'Show Whitespace Differences': '显示空白字符差异',
	'The diff algorithm was stopped early (after {0} ms.)': '差异算法提前停止（{0} 毫秒后）。',
	'Remove Limit': '移除限制',
	'Try Smart Diff Layout': '尝试智能差异布局',
	'Open a read-only sample comparison. Use Diff View to choose Inline, Side by Side, or Automatic, then resize the editor.':
		'打开一个只读的示例对比。使用「差异视图」选择行内、并排或自动布局，然后调整编辑器尺寸。',
	'Smart Diff Layout Example': '智能差异布局示例',

	// ---- find / replace accessibility help ----
	'Accessibility Help: Editor Find and Replace': '无障碍帮助：编辑器查找和替换',
	'Accessibility Help: Editor Find': '无障碍帮助：编辑器查找',
	'Replacement text: "{0}".': '替换文本：「{0}」。',
	'No replacement text entered yet. Press Tab to move to the Replace input and type your replacement.':
		'尚未输入替换文本。按 Tab 键切换到替换输入框并输入替换内容。',
	'Inside the Find and Replace Dialog (What It Does):': '在查找和替换对话框内（它的作用）：',
	'When you replace from the Replace input, the match is replaced and focus moves to the next match. If you have replaced all matches, the dialog remains open.':
		'在替换输入框中执行替换时，当前匹配项会被替换，焦点移到下一个匹配项。如果已替换完所有匹配项，对话框会保持打开。',
	'If you want to move focus into the editor to edit text, press Escape to close the dialog. Focus returns to the editor at the last replacement location.':
		'如果你想把焦点移入编辑器去编辑文本，按 Escape 关闭对话框。焦点会回到编辑器中上一次替换的位置。',
	'While focused IN the Replace input:': '焦点位于替换输入框内时：',
	'- Enter: Replace the current match and move to the next.': '- Enter：替换当前匹配项并移到下一个。',
	'- {0}: Replace only the current match.': '- {0}：仅替换当前匹配项。',
	'- {0}: Replace all matches at once.': '- {0}：一次性替换所有匹配项。',
	'- Enter: Move to the next match while staying in Find.': '- Enter：停留在查找中并移到下一个匹配项。',
	'- Shift+Enter: Move to the previous match while staying in Find.': '- Shift+Enter：停留在查找中并移到上一个匹配项。',
	'- Tab: Move between Find and Replace inputs.': '- Tab：在查找和替换输入框之间切换。',
	'- Enter: Move to the next match while staying in the Find dialog.': '- Enter：停留在查找对话框中并移到下一个匹配项。',
	'- Shift+Enter: Move to the previous match while staying in the Find dialog.':
		'- Shift+Enter：停留在查找对话框中并移到上一个匹配项。',
	'Find and Replace Options in the Dialog:': '对话框中的查找和替换选项：',
	'- Preserve Case: When replacing, maintains the case of the original match.':
		'- Preserve Case（保留大小写）：替换时保持原匹配项的大小写形式。',
	'These settings affect how Find and Replace behave or how matches are highlighted.':
		'以下设置会影响查找和替换的行为，或匹配项的高亮方式。',
	'Press Escape to close Find and Replace. Focus returns to the editor at the last replacement location, and your search and replace history is preserved.':
		'按 Escape 键关闭查找和替换。焦点会回到编辑器中上一次替换的位置，且你的搜索和替换历史会被保留。',
	'Inside the Find Dialog (What It Does):': '在查找对话框内（它的作用）：',
	'Each navigation step gives you a complete spoken update so you always know where you are. The order is consistent:':
		'每次导航都会给出完整的语音反馈，让你始终知道自己的位置。顺序是固定的：',
	'This sequence happens every time you move forward or backward.': '每次向前或向后移动时都会按此顺序播报。',
	'Outside the Find Dialog (Inside the Editor):': '在查找对话框之外（编辑器内）：',
	'When you are focused in the editor instead of the Find dialog, you can still navigate matches.':
		'当焦点在编辑器中而非查找对话框时，你仍然可以在匹配项之间导航。',
	'- Press {0} to move to the next match.': '- 按 {0} 移到下一个匹配项。',
	'- Press {0} to move to the previous match.': '- 按 {0} 移到上一个匹配项。',
	'You hear the same three-step sequence: full line, match position, then line and column.':
		'你会听到同样的三步播报：整行内容、匹配位置，然后是行号和列号。',
	'Find Options in the Dialog:': '对话框中的查找选项：',
	'These settings affect how Find behaves or how matches are highlighted.': '以下设置会影响查找行为或匹配项的高亮方式。',
};