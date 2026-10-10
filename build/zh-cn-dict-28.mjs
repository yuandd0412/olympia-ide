// zh-cn dictionary batch 28 -- notebook: cells, outline, formatting, kernel, cell actions
export default {
	// ---- kernel ----
	'Notebook Kernel Info': '笔记本内核信息',
	'Notebook Kernel Selection': '笔记本内核选择',
	'Pick a variable from the kernel': '从内核中选择一个变量',
	'Select a kernel variable': '选择内核变量',
	'No kernel variables found': '未找到内核变量',
	'Execute Notebook Variable Provider': '执行笔记本变量提供程序',
	'REPL Variables': 'REPL 变量',
	'Set Profile': '设置配置档案',
	'Display limit reached': '已达到显示上限',
	'Running \'Notebook\' code actions': '正在运行「笔记本」代码操作',
	'Running \'Cell\' code actions': '正在运行「单元格」代码操作',
	'Running \'Format\' code actions': '正在运行「格式化」代码操作',

	// ---- cell basics ----
	'Notebook Cell': '笔记本单元格',
	'Insert Cell': '插入单元格',
	'Edit Cell': '编辑单元格',
	'Copy Cell': '复制单元格',
	'Cut Cell': '剪切单元格',
	'Paste Cell': '粘贴单元格',
	'Paste Cell Above': '在上方粘贴单元格',
	'Join Notebook Cells': '合并笔记本单元格',
	'Cannot join cells of different kinds': '无法合并不同类型的单元格',
	'Format Cell': '格式化单元格',
	'Format Cells': '格式化多个单元格',
	'Center Active Cell': '居中当前单元格',
	'Cell {0} of {1}': '第 {0} 个单元格，共 {1} 个',
	'Cell {0} ({1} selected)': '第 {0} 个单元格（已选中 {1} 个）',
	'Accept and Run': '接受并运行',

	// ---- cell language ----
	'Markdown': 'Markdown',
	'Unknown cell language. Click to search for \'{0}\' extensions':
		'未知的单元格语言。点击以搜索 \'{0}\' 扩展',
	'Select Cell Language Mode': '选择单元格语言模式',
	'Accept Detected Language: {0}': '接受检测到的语言：{0}',
	'{0} • Cell {1} • Output {2}': '{0} • 单元格 {1} • 输出 {2}',

	// ---- output ----
	'Explain Cell Error': '解释单元格错误',
	'Show Empty Outputs': '显示空输出',
	'Copy Cell Output': '复制单元格输出',
	'Open Cell Output in Text Editor': '在文本编辑器中打开单元格输出',
	'Open in Output Preview': '在输出预览中打开',
	'Add Cell Output to Chat': '将单元格输出添加到对话',
	'Whether a chat agent for notebook is registered': '是否为笔记本注册了对话智能体',
	'Keypresses that should be handled by the focused element in the cell output.':
		'按键应由单元格输出中获得焦点的元素处理。',
	'Use the links above to file an issue using the issue reporter.':
		'可使用上方的链接通过问题报告器提交问题。',
	'**Last Execution** {0}\n\n**Execution Time** {1}\n\n**Overhead Time** {2}\n\n**Render Times**\n\n{3}':
		'**上次执行** {0}\n\n**执行耗时** {1}\n\n**额外开销** {2}\n\n**渲染耗时**\n\n{3}',
	'Last Execution: {0}, Duration: {1}': '上次执行：{0}，耗时：{1}',

	// ---- images ----
	'Save Image': '保存图片',
	'Image Files': '图片文件',

	// ---- find / replace in notebooks ----
	'Notebook Indentation': '笔记本缩进',
	'Previous Match': '上一个匹配项',
	'Next Match': '下一个匹配项',
	'Toggle Replace': '切换替换',
	'Find Filters': '查找筛选',
	'Select All Occurrences of Find Match': '选中查找匹配项的所有出现处',
	'Add Selection to Next Find Match': '把选区加入下一个查找匹配项',
	'Exit Multi Cursor Mode': '退出多光标模式',
	'Delete Left': '向左删除',
	'Delete Right': '向右删除',
	'Cell Cursor Page Up': '单元格光标上翻页',
	'Cell Cursor Page Up Select': '单元格光标上翻页并选择',
	'Cell Cursor Page Down': '单元格光标下翻页',
	'Cell Cursor Page Down Select': '单元格光标下翻页并选择',
	'When enabled cursor can navigate to the next/previous cell when the current cursor in the cell editor is at the first/last line.':
		'启用后，当单元格编辑器中的光标位于首行/末行时，可导航到下一个/上一个单元格。',
	'Notebook Editor Selections': '笔记本编辑器选区',

	// ---- source / rendered ----
	'Markdown Source': 'Markdown 源文',
	'Rendered Markdown': '渲染后的 Markdown',
	'Code Cell Source': '代码单元格源文',
	'Code Cell Output': '代码单元格输出',
	'Quick Actions': '快速操作',

	// ---- outline ----
	'Filter Entries': '筛选条目',
	'Markdown Headers Only': '仅 Markdown 标题',
	'Code Cells': '代码单元格',
	'Code Cell Symbols': '代码单元格符号',
	'When enabled, notebook outline will show only markdown cells containing a header.':
		'启用后，笔记本大纲将只显示包含标题的 Markdown 单元格。',
	'When enabled, notebook outline shows code cells.': '启用后，笔记本大纲显示代码单元格。',
	'When enabled, notebook outline shows code cell symbols. Relies on `#notebook.outline.showCodeCells#` being enabled.':
		'启用后，笔记本大纲显示代码单元格符号。依赖于 `#notebook.outline.showCodeCells#` 已启用。',
	'When enabled, notebook breadcrumbs contain code cells.': '启用后，笔记本导航路径包含代码单元格。',
	'When enabled, the Go to Symbol Quick Pick will display full code symbols from the notebook, as well as Markdown headers.':
		'启用后，「转到符号」快速选择器将显示笔记本中的完整代码符号以及 Markdown 标题。',

	// ---- whitespace / trailing ----
	'Notebook Trim Trailing Whitespace': '笔记本裁剪行尾空白',
	'Trim Final New Lines': '裁剪末尾换行',
	'Insert Final New Line': '插入末尾换行',

	// ---- troubleshooting ----
	'Reset notebook getting started': '重置笔记本入门指引',
	'Toggle Notebook Layout Troubleshoot': '切换笔记本布局排查',
	'Inspect Notebook Layout': '检查笔记本布局',
	'Clear Notebook Editor Type Cache': '清除笔记本编辑器类型缓存',
	'{0} (suggestion)': '{0}（建议）',
};