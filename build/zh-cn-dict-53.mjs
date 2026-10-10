// Batch 53 — search view / search widget / search actions
// Trimmed keys on purpose: source literals carry leading/trailing spaces and the
// applier's trim() fallback restores them (see apply-zh-cn-ast.mjs).
// Quoting convention: ASCII straight quotes inside Chinese values, escaped as \'
// (matches zh-cn-dict-14).
export default {
	// --- command palette / quick access ---
	'Open to the Bottom': '在底部打开',
	'&&Search': '搜索(&&S)',
	'Find &&in Files': '在文件中查找(&&I)',
	'Go to Symbol in &&Workspace...': '转到工作区中的符号(&&W)...',
	'Go to Symbol in Workspace': '转到工作区中的符号',
	'Quick Search': '快速搜索',
	'No matching workspace symbols': '工作区中没有匹配的符号',
	'Type the name of a symbol to open.': '输入要打开的符号名称。',
	'Search files by name (append {0} to go to line or {1} to go to symbol)':
		'按文件名搜索（在末尾加 {0} 跳转到行，或加 {1} 跳转到符号）',

	// --- search configuration descriptions ---
	'Additional check on the siblings of a matching file. Use \\$(basename) as variable for the matching file name.':
		'对匹配文件的同级文件进行额外检查。使用 \\$(basename) 变量表示匹配的文件名。',
	'History entries are sorted by relevance based on the filter value used. More relevant entries appear first.':
		'历史记录按与筛选条件的相关度排序，相关度高的排在前面。',
	'History entries are sorted by recency. More recently opened entries appear first.':
		'历史记录按最近使用时间排序，最近打开的排在前面。',
	"Update the search query to the editor's selected text when focusing the Search view. This happens either on click or when triggering the `workbench.views.search.focus` command.":
		'聚焦搜索视图时，用编辑器中选中的文本填充搜索框。无论点击搜索视图还是触发 `workbench.views.search.focus` 命令都会执行。',

	// --- accessibility help ---
	'When you navigate from the Search input, the editor updates while your focus stays in the search field. This is intentional, so you can keep refining your search without losing your place.':
		'在搜索输入框内移动时，编辑器会同步更新，而焦点仍保留在搜索框中。这是有意设计的，你可以在不丢失当前位置的情况下继续细化搜索条件。',
	'If you press Tab, focus moves to the results tree below the input, and you can navigate results and open them. When you press Enter on a result, the match is shown in the editor.':
		'按 Tab 键会将焦点移到输入框下方的结果树，可以在其中浏览并打开结果。在某个结果上按 Enter 键会在编辑器中显示匹配位置。',

	// --- find widget toggles ---
	'Toggle Whole Word': '切换全字匹配',
	'Toggle Regex': '切换正则表达式',
	'Toggle Preserve Case': '切换区分大小写',
	'Open Match': '打开匹配项',
	'Open Match To Side': '在侧边打开匹配项',
	'Add Cursors at Search Results': '在搜索结果处添加光标',
	'Focus Next Input': '聚焦下一个输入框',
	'Focus Previous Input': '聚焦上一个输入框',
	'Focus Search From Results': '从结果返回搜索框',
	'Toggle Search on Type': '切换边输入边搜索',
	'Focus List': '聚焦结果列表',
	'Focus Next Search Result': '聚焦下一个搜索结果',
	'Focus Previous Search Result': '聚焦上一个搜索结果',
	'Replace in Files': '在文件中替换',
	'Toggle Context Lines': '切换上下文行',
	'Clear Search History': '清除搜索历史',
	'Cancel Search': '取消搜索',

	// --- find widget labels ---
	'Replace All (Submit Search to Enable)': '全部替换（提交搜索后可用）',
	'Search: Type Search Term and press Enter to search': '搜索：输入搜索内容后按 Enter 执行搜索',
	'Replace: Type replace term and press Enter to preview': '替换：输入替换内容后按 Enter 预览',

	// --- chat context pickers ---
	'Select a symbol': '选择一个符号',
	'Files & Folders...': '文件与文件夹...',
	'Search file or folder by name': '按名称搜索文件或文件夹',
	'Search Results': '搜索结果',
	'Symbols...': '符号...',

	// --- notebook ---
	'Notebook Find Filters': '笔记本查找筛选器',

	// --- icons ---
	'Icon to make search details visible.': '用于显示搜索详情的图标。',
	'Icon to view more context in the search view.': '用于在搜索视图中查看更多上下文的图标。',
	'Icon for toggle the context in the search editor.': '用于在搜索编辑器中切换显示上下文的图标。',
	'Icon to collapse the replace section in the search view.': '用于在搜索视图中折叠替换区域的图标。',
	'Icon to expand the replace section in the search view.': '用于在搜索视图中展开替换区域的图标。',
	'Icon for replace all in the search view.': '用于在搜索视图中全部替换的图标。',
	'Icon for replace in the search view.': '用于在搜索视图中替换的图标。',
	'Icon to remove a search result.': '用于移除搜索结果的图标。',
	'Icon for refresh in the search view.': '用于在搜索视图中刷新的图标。',
	'Icon for collapse results in the search view.': '用于在搜索视图中折叠结果的图标。',
	'Icon for expand results in the search view.': '用于在搜索视图中展开结果的图标。',
	'Icon for viewing results as a tree in the search view.': '用于在搜索视图中以树形显示结果的图标。',
	'Icon for viewing results as a list in the search view.': '用于在搜索视图中以列表显示结果的图标。',
	'Icon for clear results in the search view.': '用于在搜索视图中清除结果的图标。',
	'Icon for stop in the search view.': '用于在搜索视图中停止搜索的图标。',
	'View icon of the search view.': '搜索视图的视图图标。',
	'Icon for the action to open a new search editor.': '用于打开新搜索编辑器操作的图标。',
	'Icon for the action to go to the file of the current search result.': '用于跳转到当前搜索结果所在文件操作的图标。',
	'Icon to show AI results in search.': '用于在搜索中显示 AI 结果的图标。',
	'Icon to hide AI results in search.': '用于在搜索中隐藏 AI 结果的图标。',

	// --- command links ---
	'Unable to open command link from untrusted source: {0}': '无法打开来自不受信任来源的命令链接：{0}',
	'Unable to open unknown link: {0}': '无法打开未知链接：{0}',

	// --- results view ---
	'Text Results': '文本结果',
	'AI-assisted results': 'AI 辅助结果',
	'{0} file found': '找到 {0} 个文件',
	'{0} files found': '找到 {0} 个文件',
	'{0} match found': '找到 {0} 处匹配',
	'{0} matches found': '找到 {0} 处匹配',
	'From line {0}': '起始于第 {0} 行',
	'{0} more lines': '还有 {0} 行',
	'{0} matches in folder root {1}, Search result': '文件夹根目录 {1} 中有 {0} 处匹配，搜索结果',
	'{0} matches outside of the workspace, Search result': '工作区之外有 {0} 处匹配，搜索结果',
	'{0} matches in file {1} of folder {2}, Search result': '文件夹 {2} 的文件 {1} 中有 {0} 处匹配，搜索结果',
	"'{0}' at column {1} replace {2} with {3}": '在第 {1} 列的 \'{0}\' 中将 {2} 替换为 {3}',
	"'{0}' at column {1} found {2}": '在第 {1} 列的 \'{0}\' 中找到 {2}',

	// --- search view messages ---
	'Search was canceled before any results could be found -': '搜索已取消，未能得到任何结果 -',
	'Empty Search': '空搜索条件',
	'Search path not found: {0}': '未找到搜索路径：{0}',
	'Search with AI.': '使用 AI 搜索。',
	'Search again': '重新搜索',
	'Search again in all files': '在所有文件中重新搜索',
	'Search returned {0} results in {1} files': '在 {1} 个文件中返回 {0} 个结果',
	'- Search: {0}': '- 搜索：{0}',
	'Search instead for:': '改为搜索：',
	'You have not opened or specified a folder. Only open files are currently searched -':
		'你尚未打开或指定文件夹，当前仅搜索已打开的文件 -',
	'exclude settings and ignore files are disabled': '已禁用排除设置和忽略文件',
	'enable': '启用',
	'disable': '禁用',
	'searching only in open files': '仅在已打开的文件中搜索',
	'Search in entire workspace': '在整个工作区中搜索',
	'Copy current search results to an editor': '将当前搜索结果复制到编辑器',
	'Open in editor': '在编辑器中打开',
	'e.g. *.ts, src/**/include': '例如 *.ts, src/**/include',
	'e.g. *.ts, src/**/exclude': '例如 *.ts, src/**/exclude',

	// --- no-result messages (trailing " - " trimmed) ---
	"No results found in open editors matching '{0}' excluding '{1}' -":
		'在匹配 \'{0}\' 的已打开编辑器中（排除 \'{1}\'）未找到结果 -',
	"No results found in open editors matching '{0}' -": '在匹配 \'{0}\' 的已打开编辑器中未找到结果 -',
	"No results found in open editors excluding '{0}' -": '在已打开的编辑器中（排除 \'{0}\'）未找到结果 -',
	'No results found in open editors. Review your configured exclusions and check your gitignore files -':
		'在已打开的编辑器中未找到结果。请检查已配置的排除项和你的 gitignore 文件 -',
	"No results found in '{0}' excluding '{1}' -": '在 \'{0}\' 中（排除 \'{1}\'）未找到结果 -',
	"No results found in '{0}' -": '在 \'{0}\' 中未找到结果 -',
	"No results found excluding '{0}' -": '未找到结果（已排除 \'{0}\'） -',
	'No results found. Review your configured exclusions and check your gitignore files -':
		'未找到结果。请检查已配置的排除项和你的 gitignore 文件 -',

	// --- result counters ---
	'{0} result in {1} file': '{1} 个文件中有 {0} 个结果',
	'{0} result in {1} files': '{1} 个文件中有 {0} 个结果',
	'{0} results in {1} file': '{1} 个文件中有 {0} 个结果',
	'{0} results in {1} files': '{1} 个文件中有 {0} 个结果',

	// --- replace / replace all ---
	"Replaced {0} occurrence across {1} file with '{2}'.": '已在 {1} 个文件中把 {0} 处替换为 \'{2}\'。',
	'Replaced {0} occurrence across {1} file.': '已在 {1} 个文件中替换了 {0} 处。',
	"Replaced {0} occurrence across {1} files with '{2}'.": '已在 {1} 个文件中把 {0} 处替换为 \'{2}\'。',
	'Replaced {0} occurrence across {1} files.': '已在 {1} 个文件中替换了 {0} 处。',
	"Replaced {0} occurrences across {1} file with '{2}'.": '已在 {1} 个文件中把 {0} 处替换为 \'{2}\'。',
	'Replaced {0} occurrences across {1} file.': '已在 {1} 个文件中替换了 {0} 处。',
	"Replaced {0} occurrences across {1} files with '{2}'.": '已在 {1} 个文件中把 {0} 处替换为 \'{2}\'。',
	'Replaced {0} occurrences across {1} files.': '已在 {1} 个文件中替换了 {0} 处。',
	"Replace {0} occurrence across {1} file with '{2}'?": '要在 {1} 个文件中把 {0} 处替换为 \'{2}\' 吗？',
	'Replace {0} occurrence across {1} file?': '要在 {1} 个文件中替换 {0} 处吗？',
	"Replace {0} occurrence across {1} files with '{2}'?": '要在 {1} 个文件中把 {0} 处替换为 \'{2}\' 吗？',
	'Replace {0} occurrence across {1} files?': '要在 {1} 个文件中替换 {0} 处吗？',
	"Replace {0} occurrences across {1} file with '{2}'?": '要在 {1} 个文件中把 {0} 处替换为 \'{2}\' 吗？',
	'Replace {0} occurrences across {1} file?': '要在 {1} 个文件中替换 {0} 处吗？',
	"Replace {0} occurrences across {1} files with '{2}'?": '要在 {1} 个文件中把 {0} 处替换为 \'{2}\' 吗？',
	'Replace {0} occurrences across {1} files?': '要在 {1} 个文件中替换 {0} 处吗？',
};