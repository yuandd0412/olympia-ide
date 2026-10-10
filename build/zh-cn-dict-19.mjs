// zh-cn dictionary batch 19 -- theme color token descriptions (shown in the color theme editor)
export default {
	// ---- editor / search ----
	// NOTE: this literal carries a LEADING SPACE in the source
	// (nls.localize('editorStickyScrollShadow', " Shadow color of sticky scroll in the editor")).
	// The space must be part of the key or the replacement never happens.
	' Shadow color of sticky scroll in the editor': '编辑器中粘滞视图的阴影颜色',
	'Border color of the other search matches.': '其他搜索匹配项的边框颜色。',
	'Border color of the range limiting the search. The color must not be opaque so as not to hide underlying decorations.':
		'限制搜索范围的边框颜色。该颜色不能是不透明的，以免遮挡下层装饰。',
	'Background color of the editor hover status bar.': '编辑器悬停状态栏的背景颜色。',
	'Controls whether to show the hover status bar.': '控制是否显示悬停状态栏。',

	// ---- lightbulb / quick fix ----
	'The color used for the lightbulb actions icon.': '灯泡操作图标使用的颜色。',
	'The color used for the lightbulb auto fix actions icon.': '灯泡自动修复操作图标使用的颜色。',
	'The color used for the lightbulb AI icon.': '灯泡 AI 图标使用的颜色。',
	'The color used for the lightbulb accessibility issues icon.': '灯泡无障碍问题图标使用的颜色。',

	// ---- snippet tab stops ----
	'Highlight background color of a snippet tabstop.': '代码片段占位符的高亮背景颜色。',
	'Highlight border color of a snippet tabstop.': '代码片段占位符的高亮边框颜色。',
	'Highlight background color of the final tabstop of a snippet.': '代码片段最后一个占位符的高亮背景颜色。',
	'Highlight border color of the final tabstop of a snippet.': '代码片段最后一个占位符的高亮边框颜色。',

	// ---- diff editor ----
	"Color of the diff editor's diagonal fill. The diagonal fill is used in side-by-side diff views.":
		'差异编辑器的斜线填充颜色。斜线填充用于并排差异视图。',
	'The background color of unchanged blocks in the diff editor.': '差异编辑器中未更改块块的背景颜色。',
	'The foreground color of unchanged blocks in the diff editor.': '差异编辑器中未更改块块的前景色。',
	'The background color of unchanged code in the diff editor.': '差异编辑器中未更改代码的背景颜色。',

	// ---- toolbar / breadcrumbs ----
	'Toolbar background when hovering over actions using the mouse': '鼠标悬停在操作项上方时的工具栏背景',
	'Toolbar outline when hovering over actions using the mouse': '鼠标悬停在操作项上方时的工具栏轮廓',
	'Toolbar background when holding the mouse over actions': '鼠标按住操作项时的工具栏背景',
	'Background color of breadcrumb items.': '导航路径项的背景颜色。',
	'Color of selected breadcrumb items.': '选中的导航路径项的颜色。',
	'Background color of breadcrumb item picker.': '导航路径项选择器的背景颜色。',
	'The color used for the problems error icon.': '「问题」错误图标使用的颜色。',
	'The color used for the problems warning icon.': '「问题」警告图标使用的颜色。',
	'The color used for the problems info icon.': '「问题」信息图标使用的颜色。',

	// ---- input ----
	'Input box background.': '输入框背景。',
	'Input box foreground.': '输入框前景。',
	'Input box border.': '输入框边框。',
	'Border color of activated options in input fields.': '输入字段中已激活选项的边框颜色。',
	'Background color of activated options in input fields.': '输入字段中已激活选项的背景颜色。',
	'Background hover color of options in input fields.': '输入字段中选项的悬停背景颜色。',
	'Foreground color of activated options in input fields.': '输入字段中已激活选项的前景色。',
	'Input box foreground color for placeholder text.': '输入框中占位文本的前景色。',
	'Input validation background color for information severity.': '信息级别输入校验的背景颜色。',
	'Input validation foreground color for information severity.': '信息级别输入校验的前景色。',
	'Input validation border color for information severity.': '信息级别输入校验的边框颜色。',
	'Input validation background color for warning severity.': '警告级别输入校验的背景颜色。',
	'Input validation foreground color for warning severity.': '警告级别输入校验的前景色。',
	'Input validation border color for warning severity.': '警告级别输入校验的边框颜色。',
	'Input validation background color for error severity.': '错误级别输入校验的背景颜色。',
	'Input validation foreground color for error severity.': '错误级别输入校验的前景色。',
	'Input validation border color for error severity.': '错误级别输入校验的边框颜色。',

	// ---- dropdown ----
	'Dropdown background.': '下拉框背景。',
	'Dropdown list background.': '下拉列表背景。',
	'Dropdown foreground.': '下拉框前景。',
	'Dropdown border.': '下拉框边框。',

	// ---- button ----
	'Button foreground color.': '按钮前景颜色。',
	'Button separator color.': '按钮分隔线颜色。',
	'Button background color.': '按钮背景颜色。',
	'Button background color when hovering.': '悬停时的按钮背景颜色。',
	'Button border color.': '按钮边框颜色。',
	'Secondary button foreground color.': '次要按钮前景颜色。',
	'Secondary button background color.': '次要按钮背景颜色。',
	'Secondary button border color.': '次要按钮边框颜色。',
	'Secondary button background color when hovering.': '悬停时的次要按钮背景颜色。',

	// ---- radio / checkbox ----
	'Foreground color of active radio option.': '选中单选项的前景色。',
	'Background color of active radio option.': '选中单选项的背景颜色。',
	'Border color of the active radio option.': '选中单选项的边框颜色。',
	'Foreground color of inactive radio option.': '未选中单选项的前景色。',
	'Background color of inactive radio option.': '未选中单选项的背景颜色。',
	'Border color of the inactive radio option.': '未选中单选项的边框颜色。',
	'Background color of inactive active radio option when hovering.': '悬停在未选中单选项上时的背景颜色。',
	'Background color of checkbox widget.': '复选框小部件的背景颜色。',
	'Background color of checkbox widget when the element it\'s in is selected.': '所在元素被选中时复选框小部件的背景颜色。',
	'Foreground color of checkbox widget.': '复选框小部件的前景色。',
	'Border color of checkbox widget.': '复选框小部件的边框颜色。',
	'Border color of checkbox widget when the element it\'s in is selected.': '所在元素被选中时复选框小部件的边框颜色。',
	'Background of a disabled checkbox.': '禁用状态复选框的背景。',
	'Foreground of a disabled checkbox.': '禁用状态复选框的前景。',

	// ---- keybinding label ----
	'Keybinding label background color. The keybinding label is used to represent a keyboard shortcut.':
		'快捷键标签的背景颜色。快捷键标签用于表示键盘快捷键。',
	'Keybinding label foreground color. The keybinding label is used to represent a keyboard shortcut.':
		'快捷键标签的前景色。快捷键标签用于表示键盘快捷键。',
	'Keybinding label border color. The keybinding label is used to represent a keyboard shortcut.':
		'快捷键标签的边框颜色。快捷键标签用于表示键盘快捷键。',
	'Keybinding label border bottom color. The keybinding label is used to represent a keyboard shortcut.':
		'快捷键标签的底部边框颜色。快捷键标签用于表示键盘快捷键。',

	// ---- list / tree (active) ----
	'List/Tree background color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于活动状态时，焦点项的背景颜色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree foreground color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于活动状态时，焦点项的前景色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree outline color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于活动状态时，焦点项的轮廓颜色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree outline color for the focused item when the list/tree is active and selected. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于活动状态且焦点项被选中时的轮廓颜色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree background color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于活动状态时，选中项的背景颜色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree foreground color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于活动状态时，选中项的前景色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree icon foreground color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于活动状态时，选中项图标的前景色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',

	// ---- list / tree (inactive) ----
	'List/Tree background color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于非活动状态时，选中项的背景颜色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree foreground color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于非活动状态时，选中项的前景色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree icon foreground color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于非活动状态时，选中项图标的前景色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree background color for the focused item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于非活动状态时，焦点项的背景颜色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree outline color for the focused item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not.':
		'列表/树处于非活动状态时，焦点项的轮廓颜色。活动状态表示列表/树拥有键盘焦点，非活动状态则没有。',
	'List/Tree background when hovering over items using the mouse.': '鼠标悬停在项上方时的列表/树背景。',
	'List/Tree foreground when hovering over items using the mouse.': '鼠标悬停在项上方时的列表/树前景。',
	'List/Tree drag and drop background when moving items over other items when using the mouse.':
		'用鼠标把项拖到其他项上方时的列表/树拖放背景。',
	'List/Tree drag and drop border color when moving items between items when using the mouse.':
		'用鼠标在项之间移动时的列表/树拖放边框颜色。',
	'List/Tree foreground color for items that are deemphasized.': '列表/树中被弱化项的前景色。',

	// ---- indentation guides / table ----
	'Tree stroke color for the indentation guides.': '缩进参考线的描边颜色。',
	'Tree stroke color for the indentation guides that are not active.': '非活动缩进参考线的描边颜色。',
	'Table border color between columns.': '表格的列间边框颜色。',
	'Background color for odd table rows.': '奇数行表格单元格的背景颜色。',

	// ---- action list ----
	'Action List background color.': '操作列表的背景颜色。',
	'Action List foreground color.': '操作列表的前景色。',
	'Action List foreground color for the focused item.': '操作列表中焦点项的前景色。',
	'Action List background color for the focused item.': '操作列表中焦点项的背景颜色。',

	// ---- menu ----
	'Border color of menus.': '菜单的边框颜色。',
	'Foreground color of menu items.': '菜单项的前景色。',
	'Background color of menu items.': '菜单项的背景颜色。',
	'Foreground color of the selected menu item in menus.': '菜单中选中项的前景色。',
	'Background color of the selected menu item in menus.': '菜单中选中项的背景颜色。',
	'Border color of the selected menu item in menus.': '菜单中选中项的边框颜色。',
	'Color of a separator menu item in menus.': '菜单中分隔项的颜色。',

	// ---- minimap / sash ----
	'Minimap background color.': '缩略图背景颜色。',
	'Minimap slider background color.': '缩略图滑块背景颜色。',
	'Minimap slider background color when hovering.': '悬停时的缩略图滑块背景颜色。',
	'Minimap slider background color when clicked on.': '单击时的缩略图滑块背景颜色。',
	'Border color of active sashes.': '活动分隔条的边框颜色。',

	// ---- badge / scrollbar ----
	'Badge background color. Badges are small information labels, e.g. for search results count.':
		'徽标背景颜色。徽标是小块的信息标签，例如搜索结果数量。',
	'Badge foreground color. Badges are small information labels, e.g. for search results count.':
		'徽标前景颜色。徽标是小块的信息标签，例如搜索结果数量。',
	'Scrollbar shadow to indicate that the view is scrolled.': '用于指示视图已滚动的滚动条阴影。',
	'Scrollbar slider background color.': '滚动条滑块背景颜色。',
	'Scrollbar slider background color when hovering.': '悬停时的滚动条滑块背景颜色。',
	'Scrollbar slider background color when clicked on.': '单击时的滚动条滑块背景颜色。',
	'Scrollbar track background color.': '滚动条轨道背景颜色。',
	'Background color of the progress bar that can show for long running operations.':
		'长时间运行操作时可显示的进度条背景颜色。',

	// ---- chart ----
	'Line color for the chart.': '图表的线条颜色。',
	'Axis color for the chart.': '图表的坐标轴颜色。',
	'Guide line for the chart.': '图表的参考线。',

	// ---- quick pick ----
	'Quick picker background color. The quick picker widget is the container for pickers like the command palette.':
		'快速选择器的背景颜色。快速选择器小部件是命令面板等选择器的容器。',
	'Quick picker foreground color. The quick picker widget is the container for pickers like the command palette.':
		'快速选择器的前景色。快速选择器小部件是命令面板等选择器的容器。',
	'Quick picker title background color. The quick picker widget is the container for pickers like the command palette.':
		'快速选择器标题的背景颜色。快速选择器小部件是命令面板等选择器的容器。',
	'Quick picker color for grouping labels.': '快速选择器分组标签的颜色。',
	'Quick picker color for grouping borders.': '快速选择器分组边框的颜色。',
	'Please use quickInputList.focusBackground instead': '请改用 quickInputList.focusBackground',
	'Quick picker foreground color for the focused item.': '快速选择器中焦点项的前景色。',
	'Quick picker icon foreground color for the focused item.': '快速选择器中焦点项图标的前景色。',
};