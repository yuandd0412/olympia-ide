// Batch 60 — notebook core: notebook.contribution + notebookEditorWidget +
// editActions + insertCellActions
export default {
	// ===================== notebook.contribution.ts : settings =====================
	'Settings for code editors used in notebooks. This can be used to customize most editor.* settings.':
		'笔记本中使用的代码编辑器设置。可用于自定义大多数 editor.* 设置。',
	'Priority list for output mime types': '输出 MIME 类型的优先级列表',
	'Where the cell toolbar should be shown, or whether it should be hidden.':
		'单元格工具栏显示的位置，或是否隐藏。',
	'Configure the cell toolbar position for specific file types': '为特定文件类型配置单元格工具栏位置',
	'Whether the cell status bar should be shown.': '是否显示单元格状态栏。',
	'The cell status bar is always hidden.': '单元格状态栏始终隐藏。',
	'The cell status bar is always visible.': '单元格状态栏始终可见。',
	'The cell status bar is hidden until the cell has executed. Then it becomes visible to show the execution status.':
		'单元格状态栏在执行前保持隐藏，执行后显示以呈现执行状态。',
	'Controls the verbosity of the cell execution time in the cell status bar.':
		'控制单元格状态栏中执行时间信息的详细程度。',
	'The cell execution duration is visible, with advanced information in the hover tooltip.':
		'显示单元格执行耗时，悬停提示中提供高级信息。',
	'The cell last execution timestamp and duration are visible, with advanced information in the hover tooltip.':
		'显示单元格上次执行的时间和耗时，悬停提示中提供高级信息。',
	'Whether to use the enhanced text diff editor for notebook.': '是否为笔记本使用增强型文本差异编辑器。',
	'Whether to render the overview ruler in the diff editor for notebook.':
		'是否在笔记本差异编辑器中呈现概览标尺。',
	'Whether the cell toolbar should appear on hover or click.': '单元格工具栏在悬停时还是单击时出现。',
	'Whether to use separate undo/redo stack for each cell.': '是否为每个单元格使用独立的撤销/重做栈。',
	'Control whether the notebook editor should be rendered in a compact form. For example, when turned on, it will decrease the left margin width.':
		'控制是否以紧凑形式呈现笔记本编辑器。例如启用后会减小左侧边距宽度。',
	'Controls where the focus indicator is rendered, either along the cell borders or on the left gutter.':
		'控制焦点指示器的呈现位置：沿单元格边框，或位于左侧装订线。',
	'Control where the insert cell actions should appear.': '控制插入单元格操作的出现位置。',
	'A toolbar that appears on hover between cells.': '在单元格之间悬停时出现的工具栏。',
	'The toolbar at the top of the notebook editor.': '笔记本编辑器顶部的工具栏。',
	'Both toolbars.': '两个工具栏都显示。',
	"The insert actions don't appear anywhere.": '任何位置都不显示插入操作。',
	'Control whether to render a global toolbar inside the notebook editor.':
		'控制是否在笔记本编辑器内呈现全局工具栏。',
	'Experimental. Control whether to render notebook Sticky Scroll headers in the notebook editor.':
		'实验性功能。控制是否在笔记本编辑器中呈现粘性滚动标题。',
	'Control whether nested sticky lines appear to stack flat or indented.':
		'控制嵌套粘性行是平铺显示还是缩进显示。',
	'Nested sticky lines appear flat.': '嵌套粘性行平铺显示。',
	'Nested sticky lines appear indented.': '嵌套粘性行缩进显示。',
	'Control whether outputs action should be rendered in the output toolbar.':
		'控制是否在输出工具栏中呈现输出操作。',
	'Controls when the Markdown header folding arrow is shown.': '控制何时显示 Markdown 标题折叠箭头。',
	'The folding controls are always visible.': '折叠控件始终可见。',
	'The folding controls are visible only on mouseover.': '仅在鼠标悬停时显示折叠控件。',
	'Control whether the notebook editor should allow moving cells through drag and drop.':
		'控制笔记本编辑器是否允许通过拖放移动单元格。',
	'Control whether extra actions are shown in a dropdown next to the run button.':
		'控制运行按钮旁的下拉菜单中是否显示额外操作。',
	'Control whether the actions on the notebook toolbar should render label or not.':
		'控制笔记本工具栏上的操作是否渲染标签。',
	'Controls how many lines of text are displayed in a text output. If {0} is enabled, this setting is used to determine the scroll height of the output.':
		'控制文本输出中显示的行数。若启用 {0}，该设置用于确定输出的滚动高度。',
	'Control whether to disable filepath links in the output of notebook cells.':
		'控制是否禁用笔记本单元格输出中的文件路径链接。',
	'Control whether to render error output in a minimal style.': '控制是否以最简样式呈现错误输出。',
	'Controls the font size in pixels of rendered markup in notebooks. When set to {0}, 120% of {1} is used.':
		'控制笔记本中呈现的标记内容的字号（像素）。设为 {0} 时使用 {1} 的 120%。',
	'Controls the line height in pixels of markdown cells in notebooks. When set to {0}, {1} will be used':
		'控制笔记本中 Markdown 单元格的行高（像素）。设为 {0} 时将使用 {1}',
	'Controls whether code cells in the interactive window are collapsed by default.':
		'控制交互式窗口中的代码单元格是否默认折叠。',
	'Font size for the output text within notebook cells. When set to 0, {0} is used.':
		'笔记本单元格内输出文本的字号。设为 0 时使用 {0}。',
	'The font family of the output text within notebook cells. When set to empty, the {0} is used.':
		'笔记本单元格内输出文本的字体。留空时使用 {0}。',
	'Initially render notebook outputs in a scrollable region when longer than the limit.':
		'当笔记本输出超过限制时，初始在可滚动区域内呈现。',
	'Controls whether the lines in output should wrap.': '控制输出中的行是否换行。',
	'Defines a default notebook formatter which takes precedence over all other formatter settings. Must be the identifier of an extension contributing a formatter.':
		'定义默认的笔记本格式化程序，其优先级高于所有其他格式化设置。必须是提供格式化程序的扩展的标识符。',
	'Format a notebook on save. A formatter must be available and the editor must not be shutting down. When {0} is set to `afterDelay`, the file will only be formatted when saved explicitly.':
		'保存时格式化笔记本。必须存在可用的格式化程序，且编辑器不处于关闭过程中。当 {0} 设为 `afterDelay` 时，仅在显式保存时才会格式化文件。',
	'When enabled, insert a final new line into the end of code cells when saving a notebook.':
		'启用后，保存笔记本时在代码单元格末尾插入一个换行符。',
	'Format a notebook cell upon execution. A formatter must be available.':
		'执行时格式化笔记本单元格。必须存在可用的格式化程序。',
	'Control whether a confirmation prompt is required to delete a running cell.':
		'控制删除正在运行的单元格时是否需要确认提示。',
	'How far to scroll when revealing the next cell upon running {0}.':
		'运行 {0} 时显示下一个单元格需要滚动多远。',
	'Scroll to fully reveal the next cell.': '滚动以完整显示下一个单元格。',
	'Scroll to reveal the first line of the next cell.': '滚动以显示下一个单元格的第一行。',
	'Do not scroll.': '不滚动。',
	'Enable experimental generate action to create code cell with inline chat enabled.':
		'启用实验性的生成操作，以创建启用了内联聊天的代码单元格。',
	'Enable the experimental notebook variables view within the debug panel.':
		'在调试面板中启用实验性的笔记本变量视图。',
	'Always show inline values, with a regex fallback if no inline value provider is registered. Note: There may be a performance impact in larger cells if the fallback is used.':
		'始终显示内联值；若未注册内联值提供程序，则回退使用正则表达式。注意：在较大的单元格中使用回退方案可能会影响性能。',
	'Show inline values only when an inline value provider is registered.':
		'仅在已注册内联值提供程序时显示内联值。',
	'Never show inline values.': '从不显示内联值。',
	'Show available diagnostics for cell failures.': '显示单元格失败时可用的诊断信息。',
	'The limit of notebook output size in kilobytes (KB) where notebook files will no longer be backed up for hot reload. Use 0 for unlimited.':
		'笔记本输出大小的上限（千字节 KB），超过该值后将不再为热重载备份笔记本文件。设为 0 表示不限制。',
	'Controls the font family of rendered markup in notebooks. When left blank, this will fall back to the default workbench font family.':
		'控制笔记本中呈现的标记内容的字体。留空时将回退到默认的工作台字体。',

	// ===================== notebook.contribution.ts : colors =====================
	'The border color for notebook cells.': '笔记本单元格的边框颜色。',
	'The color of the notebook cell editor border.': '笔记本单元格编辑器边框的颜色。',
	'The color of the running cell decoration in the notebook editor overview ruler.':
		'笔记本编辑器概览标尺中运行中单元格装饰的颜色。',
	'The running icon color of notebook cells in the cell status bar.':
		'单元格状态栏中笔记本单元格运行图标的颜色。',
	'The border color of the notebook output container.': '笔记本输出容器的边框颜色。',
	'The color of the notebook output container background.': '笔记本输出容器背景的颜色。',
	'The color of the separator in the cell bottom toolbar': '单元格底部工具栏中分隔线的颜色',
	'The background color of a cell when the cell is focused.': '单元格获得焦点时的背景色。',
	'The background color of a cell when the cell is selected.': '单元格被选中时的背景色。',
	'The background color of a cell when the cell is hovered.': '单元格被悬停时的背景色。',
	"The color of the cell's top and bottom border when the cell is selected but not focused.":
		'单元格被选中但未获得焦点时，其上下边框的颜色。',
	"The color of the cell's borders when multiple cells are selected.": '选中多个单元格时单元格边框的颜色。',
	"The color of the cell's focus indicator borders when the cell is focused.":
		'单元格获得焦点时，其焦点指示边框的颜色。',
	"The color of the cell's top and bottom border when a cell is focused while the primary focus is outside of the editor.":
		'主焦点位于编辑器之外时，单元格获得焦点状态下其上下边框的颜色。',
	'The background color of notebook cell status bar items.': '笔记本单元格状态栏项的背景色。',
	'The color of the notebook cell insertion indicator.': '笔记本单元格插入指示器的颜色。',
	'Notebook scrollbar slider background color.': '笔记本滚动条滑块的背景色。',
	'Notebook scrollbar slider background color when hovering.': '悬停时笔记本滚动条滑块的背景色。',
	'Notebook scrollbar slider background color when clicked on.': '单击时笔记本滚动条滑块的背景色。',
	'Background color of highlighted cell': '高亮单元格的背景色',
	'Cell editor background color.': '单元格编辑器的背景色。',
	'Notebook background color.': '笔记本的背景色。',

	// ===================== notebookEditorWidget.ts =====================
	'Stop Editing Cell': '停止编辑单元格',
	'Stop Editing All Cells': '停止编辑所有单元格',
	'Delete Cell': '删除单元格',
	'This cell is running, are you sure you want to delete it?': '该单元格正在运行，确定要删除它吗？',
	'Clear Cell Outputs': '清空单元格输出',
	'Clear All Outputs': '清空所有输出',
	'Change Cell Language': '更改单元格语言',
	'({0}) - Current Language': '（{0}）- 当前语言',
	'({0})': '（{0}）',
	'Accept Detected Language for Cell': '接受检测到的单元格语言',
	'Unable to detect cell language': '无法检测单元格语言',
	'No notebook editor active at this time': '当前没有活动的笔记本编辑器',
	'The active notebook editor is read-only.': '活动的笔记本编辑器为只读。',
	'Comment Selected Cells': '为选中的单元格添加批注',

	// ===================== editActions.ts / insertCellActions.ts =====================
	'Insert Code Cell Above': '在上方插入代码单元格',
	'Insert Code Cell Above and Focus Container': '在上方插入代码单元格并聚焦容器',
	'Insert Code Cell Below': '在下方插入代码单元格',
	'Insert Code Cell Below and Focus Container': '在下方插入代码单元格并聚焦容器',
	'Insert Markdown Cell Above': '在上方插入 Markdown 单元格',
	'Insert Markdown Cell Below': '在下方插入 Markdown 单元格',
	'Add Code Cell At Top': '在顶部添加代码单元格',
	'Add Markdown Cell At Top': '在顶部添加 Markdown 单元格',
	'Markdown': 'Markdown',
};