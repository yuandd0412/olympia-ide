// zh-cn dictionary batch 29b -- search view: settings, accessibility help, scope actions
export default {
	// ---- view modes ----
	'Shows search results as a tree.': '以树状图显示搜索结果。',
	'Shows search results as a list.': '以列表显示搜索结果。',
	'Controls the default search result view mode.': '控制搜索结果的默认视图模式。',
	'Controls whether search file decorations should use badges.': '控制搜索文件装饰是否使用徽标。',
	'Controls whether the last typed input to Quick Search should be restored when opening it the next time.':
		'控制下次打开快速搜索时是否恢复上次输入的内容。',
	'Show notebook editor rich content results for closed notebooks. Please refresh your search results after changing this setting.':
		'显示已关闭笔记本的编辑器富内容结果。更改此设置后请刷新搜索结果。',

	// ---- semantic search ----
	'Controls the behavior of the semantic search results displayed in the Search view.':
		'控制搜索视图中显示的语义搜索结果的行为。',
	'Only request semantic search results manually.': '仅手动请求语义搜索结果。',
	'Request semantic results automatically only when text search results are empty.':
		'仅当文本搜索结果为空时才自动请求语义结果。',
	'Request semantic results automatically with every search.': '每次搜索都自动请求语义结果。',
	'Enable keyword suggestions in the Search view.': '在搜索视图中启用关键字建议。',

	// ---- results ----
	'No results found. Check your search term or adjust options below.': '未找到结果。请检查搜索词或调整下方选项。',
	'{0} results found.': '找到 {0} 个结果。',
	'Type a search term to find results.': '输入搜索词以查找结果。',
	'You are searching across your workspace.': '你正在整个工作区中搜索。',
	'You are in the Search view. This workspace-wide tool lets you find text or patterns across all files in your workspace.':
		'你正处于搜索视图。这个工作区级工具可以在工作区的所有文件中查找文本或模式。',
	'Get Search Results': '获取搜索结果',
	'Open a workspace search': '打开工作区搜索',

	// ---- scope actions ----
	'Restrict Search to Folder': '将搜索限制在此文件夹',
	'Expand Recursively': '递归展开',
	'Exclude Folder from Search': '从搜索中排除此文件夹',
	'Exclude File Type from Search': '从搜索中排除该文件类型',
	'Include File Type from Search': '在搜索中包含该文件类型',
	'Find in Folder...': '在文件夹中查找...',
	'Find in Workspace...': '在工作区中查找...',
	'Toggle Query Details': '切换查询详情',
	'Close Replace Widget': '关闭替换小部件',
	'Toggle Case Sensitive': '切换区分大小写',
	'A set of options for the search': '一组搜索选项',

	// ---- accessibility help ----
	'Accessibility Help: Search Across Files': '无障碍帮助：跨文件搜索',
	'Inside the Search Input (What It Does):': '在搜索输入框内（它的作用）：',
	'What You Hear Each Time You Move to a Result:': '每次移动到结果时你会听到的内容：',
	'Each navigation step gives you a complete spoken update:': '每次导航都会给出完整的语音反馈：',
	'1) The file name where the result is located is read first, so you know which file contains the match.':
		'1) 首先播报结果所在的文件名，让你知道匹配项在哪个文件里。',
	'2) The full line that contains the match is read, so you get immediate context.':
		'2) 接着播报包含匹配项的整行内容，让你立即获得上下文。',
	'3) Your position among the results is announced, so you know how far you are through the results.':
		'3) 然后播报你在结果中的位置，让你知道浏览进度。',
	'4) The exact line and column are announced, so you know precisely where the match is in the file.':
		'4) 最后播报具体的行号和列号，让你确切知道匹配项在文件中的位置。',
	'If you want to focus the editor to edit text at a search result, use {0} to navigate to the result and automatically focus the editor there.':
		'如果你想把焦点切到编辑器去编辑某个搜索结果，请用 {0} 导航到该结果并自动聚焦到该处的编辑器。',
	'While focused IN the Search input:': '焦点位于搜索输入框内时：',
	'- Enter: Run or refresh the search.': '- Enter：运行或刷新搜索。',
	'- Tab: Move focus to the results tree below.': '- Tab：把焦点移到下方的结果树。',
	'Navigating search results:': '浏览搜索结果时：',
	'- Down Arrow: Navigate through results in the tree.': '- 箭头下键：在结果树中逐项浏览。',
	'- Enter (when a result is focused): Navigate to that result in the editor.': '- Enter（当某个结果获得焦点时）：在编辑器中跳转到该结果。',
	'From anywhere (Search input or editor):': '在任意位置（搜索输入框或编辑器）中：',
	'- {0}: Jump to the next result and focus the editor.': '- {0}：跳转到下一个结果并聚焦到编辑器。',
	'- {0}: Jump to the previous result and focus the editor.': '- {0}：跳转到上一个结果并聚焦到编辑器。',
	'Search Options in the Dialog:': '对话框中的搜索选项：',
	'Replace Across Files (Replace Mode Active):': '跨文件替换（替换模式已激活）：',
	'Tab to the Replace input and type your replacement text.': '按 Tab 键切换到替换输入框并输入替换文本。',
	'You can replace individual matches or all matches at once.': '你可以替换单个匹配项，也可以一次性替换全部匹配项。',
	'Warning: This action affects multiple files. Make sure you have searched for exactly what you want to replace.':
		'警告：此操作会影响多个文件。请确认你搜索的正是想要替换的内容。',
	'These settings affect how Search across files behaves.': '以下设置会影响跨文件搜索的行为。',
	'- `accessibility.verbosity.find`: Controls whether the Search input announces the Accessibility Help hint.':
		'- `accessibility.verbosity.find`：控制搜索输入框是否播报无障碍帮助提示。',
	'- `search.smartCase`: Use case-insensitive search if your search term is all lowercase.':
		'- `search.smartCase`：当搜索词全为小写时使用不区分大小写的搜索。',
	'- `search.searchOnType`: Search all files as you type.': '- `search.searchOnType`：输入时即搜索所有文件。',
	'- `search.searchOnTypeDebouncePeriod`: Wait time in milliseconds before searching as you type.':
		'- `search.searchOnTypeDebouncePeriod`：输入时开始搜索前的等待时间（毫秒）。',
	'- `search.maxResults`: Maximum number of search results to show.': '- `search.maxResults`：最多显示的搜索结果数。',
	'- `search.collapseResults`: Expand or collapse results.': '- `search.collapseResults`：展开或折叠结果。',
	'- `search.showLineNumbers`: Show line numbers for results.': '- `search.showLineNumbers`：为结果显示行号。',
	'- `search.sortOrder`: Sort results by file name, type, modified time, or match count.':
		'- `search.sortOrder`：按文件名、类型、修改时间或匹配数排序结果。',
	'- `search.searchEditor.defaultNumberOfContextLines`: Number of context lines shown around matches.':
		'- `search.searchEditor.defaultNumberOfContextLines`：匹配项周围显示的上下文行数。',
	'- `search.defaultViewMode`: Show results as list or tree.': '- `search.defaultViewMode`：以列表或树状图显示结果。',
	'- `search.actionsPosition`: Position of action buttons.': '- `search.actionsPosition`：操作按钮的位置。',
	'- `search.useReplacePreview`: Open preview when replacing matches.': '- `search.useReplacePreview`：替换匹配项时打开预览。',
	'- `search.globalFindClipboard`: Uses the shared macOS Find clipboard when available.':
		'- `search.globalFindClipboard`：在可用时使用 macOS 共享的查找剪贴板。',
	'Press Escape to close Search. Focus returns to the editor, and your search history is preserved.':
		'按 Escape 键关闭搜索。焦点会回到编辑器，且你的搜索历史会被保留。',
};