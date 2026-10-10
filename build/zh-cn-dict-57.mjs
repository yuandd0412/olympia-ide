// Batch 57 — outline view + comments
// Multi-line messages use \n escapes so the cooked value matches the AST literal.
export default {
	// ===================== outline.contribution.ts =====================
	'View icon of the outline view.': '大纲视图的视图图标。',
	'Outline': '大纲',
	'Render Outline elements with icons.': '使用图标呈现大纲元素。',
	'Controls whether Outline items are collapsed or expanded.': '控制大纲项是折叠还是展开。',
	'Collapse all items.': '折叠所有项。',
	'Expand all items.': '展开所有项。',
	'Show errors and warnings on Outline elements. Overwritten by {0} when it is off.':
		'在大纲元素上显示错误和警告。当 {0} 关闭时该设置无效。',
	'Use colors for errors and warnings on Outline elements. Overwritten by {0} when it is off.':
		'在大纲元素上用颜色表示错误和警告。当 {0} 关闭时该设置无效。',
	'Use badges for errors and warnings on Outline elements. Overwritten by {0} when it is off.':
		'在大纲元素上用徽章表示错误和警告。当 {0} 关闭时该设置无效。',
	'When enabled, Outline shows `file`-symbols.': '启用后，大纲会显示 `file` 符号。',
	'When enabled, Outline shows `module`-symbols.': '启用后，大纲会显示 `module` 符号。',
	'When enabled, Outline shows `namespace`-symbols.': '启用后，大纲会显示 `namespace` 符号。',
	'When enabled, Outline shows `package`-symbols.': '启用后，大纲会显示 `package` 符号。',
	'When enabled, Outline shows `class`-symbols.': '启用后，大纲会显示 `class` 符号。',
	'When enabled, Outline shows `method`-symbols.': '启用后，大纲会显示 `method` 符号。',
	'When enabled, Outline shows `property`-symbols.': '启用后，大纲会显示 `property` 符号。',
	'When enabled, Outline shows `field`-symbols.': '启用后，大纲会显示 `field` 符号。',
	'When enabled, Outline shows `constructor`-symbols.': '启用后，大纲会显示 `constructor` 符号。',
	'When enabled, Outline shows `enum`-symbols.': '启用后，大纲会显示 `enum` 符号。',
	'When enabled, Outline shows `interface`-symbols.': '启用后，大纲会显示 `interface` 符号。',
	'When enabled, Outline shows `function`-symbols.': '启用后，大纲会显示 `function` 符号。',
	'When enabled, Outline shows `variable`-symbols.': '启用后，大纲会显示 `variable` 符号。',
	'When enabled, Outline shows `constant`-symbols.': '启用后，大纲会显示 `constant` 符号。',
	'When enabled, Outline shows `string`-symbols.': '启用后，大纲会显示 `string` 符号。',
	'When enabled, Outline shows `number`-symbols.': '启用后，大纲会显示 `number` 符号。',
	'When enabled, Outline shows `boolean`-symbols.': '启用后，大纲会显示 `boolean` 符号。',
	'When enabled, Outline shows `array`-symbols.': '启用后，大纲会显示 `array` 符号。',
	'When enabled, Outline shows `object`-symbols.': '启用后，大纲会显示 `object` 符号。',
	'When enabled, Outline shows `key`-symbols.': '启用后，大纲会显示 `key` 符号。',
	'When enabled, Outline shows `null`-symbols.': '启用后，大纲会显示 `null` 符号。',
	'When enabled, Outline shows `enumMember`-symbols.': '启用后，大纲会显示 `enumMember` 符号。',
	'When enabled, Outline shows `struct`-symbols.': '启用后，大纲会显示 `struct` 符号。',
	'When enabled, Outline shows `event`-symbols.': '启用后，大纲会显示 `event` 符号。',
	'When enabled, Outline shows `operator`-symbols.': '启用后，大纲会显示 `operator` 符号。',
	'When enabled, Outline shows `typeParameter`-symbols.': '启用后，大纲会显示 `typeParameter` 符号。',

	// ===================== outlineActions.ts =====================
	'Follow Cursor': '跟随光标',
	'Filter on Type': '按类型筛选',
	'Sort By: Position': '排序方式：位置',
	'Sort By: Name': '排序方式：名称',
	'Sort By: Category': '排序方式：类别',

	// ===================== outlinePane.ts =====================
	'The active editor cannot provide outline information.': '当前活动的编辑器无法提供大纲信息。',
	"Loading document symbols for '{0}'...": "正在加载 '{0}' 的文档符号...",
	"No symbols found in document '{0}'": "在文档 '{0}' 中未找到符号",

	// ===================== commentColors.ts =====================
	'Icon color for resolved comments.': '已解决批注的图标颜色。',
	'Icon color for unresolved comments.': '未解决批注的图标颜色。',
	'Background color for comment reply input box.': '批注回复输入框的背景色。',
	'Color of borders and arrow for resolved comments.': '已解决批注的边框和箭头颜色。',
	'Color of borders and arrow for unresolved comments.': '未解决批注的边框和箭头颜色。',
	'Color of background for comment ranges.': '批注范围的背景色。',
	'Color of background for currently selected or hovered comment range.':
		'当前选中或悬停的批注范围的背景色。',

	// ===================== commentGlyphWidget.ts =====================
	'Editor gutter decoration color for commenting ranges. This color should be opaque.':
		'批注范围的编辑器装订线装饰颜色。该颜色应为不透明色。',
	'Editor overview ruler decoration color for resolved comments. This color should be opaque.':
		'已解决批注的编辑器概览标尺装饰颜色。该颜色应为不透明色。',
	'Editor overview ruler decoration color for unresolved comments. This color should be opaque.':
		'未解决批注的编辑器概览标尺装饰颜色。该颜色应为不透明色。',
	'Editor overview ruler decoration color for comment threads with draft comments. This color should be opaque.':
		'含草稿批注的批注线程的编辑器概览标尺装饰颜色。该颜色应为不透明色。',
	'Editor gutter decoration color for commenting glyphs.': '批注字形的编辑器装订线装饰颜色。',
	'Editor gutter decoration color for commenting glyphs for unresolved comment threads.':
		'未解决批注线程的批注字形的编辑器装订线装饰颜色。',
	'Editor gutter decoration color for commenting glyphs for comment threads with draft comments.':
		'含草稿批注的批注线程的批注字形的编辑器装订线装饰颜色。',

	// ===================== comments.contribution.ts =====================
	'If the comments view has not been opened yet during this session and the comment is not resolved, it will open the first time during a session that a file with comments is active.':
		'如果本次会话中尚未打开批注视图且该批注未解决，那么在会话中首次激活带批注的文件时会打开该视图。',
	'{0} Unresolved Comments': '{0} 条未解决批注',

	// ===================== commentsAccessibility.ts =====================
	'This widget contains a text area, for composition of new comments, and actions, that can be tabbed to once tab moves focus mode has been enabled with the command Toggle Tab Key Moves Focus{0}.':
		'该部件包含一个用于编写新批注的文本框和若干操作。在使用"切换 Tab 键移动焦点"命令{0}启用 Tab 键移动焦点模式后，可用 Tab 键导航到这些操作。',

	// ===================== commentsView.ts =====================
	'Outdated from {0}: {1}\n{2}\n{3}\n{4}': '来自 {0} 的过期内容：{1}\n{2}\n{3}\n{4}',
	'{0}: {1}\n{2}\n{3}\n{4}': '{0}：{1}\n{2}\n{3}\n{4}',
	'{0} {1}': '{0} {1}',
	'{0} replies,': '{0} 条回复，',
	'Comments for current workspace': '当前工作区的批注',
	'Comments in {0}, full path {1}': '{0} 中的批注，完整路径 {1}',

	// ===================== commentsViewActions.ts =====================
	'Focus Comments view': '聚焦批注视图',
	'Clear filter text': '清除筛选文本',
	'Focus comments filter': '聚焦批注筛选框',

	// ===================== commentThreadBody.ts =====================
	'Comment thread with {0} comments on lines {1} through {2}. {3}.':
		'批注线程在第 {1} 行到第 {2} 行上有 {0} 条批注。{3}。',
	'Comment thread with {0} comments on the entire document. {1}.': '批注线程在整个文档中有 {0} 条批注。{1}。',
	'Comment thread with {0} comments. {1}.': '批注线程有 {0} 条批注。{1}。',

	// ===================== commentThreadHeader.ts =====================
	'Icon to collapse a review comment.': '用于折叠评审批注的图标。',
	'Collapse': '折叠',
	'Start discussion': '开始讨论',

	// ===================== commentThreadWidget.ts =====================
	'Comment': '批注',

	// ===================== commentThreadZoneWidget.ts =====================
	'Collapsing this comment thread will discard unsubmitted comments. Are you sure you want to discard these comments?':
		'折叠此批注线程将丢弃未提交的批注。确定要丢弃这些批注吗？',
	'Never ask me again': '不再询问',

	// ===================== reactionsAction.ts =====================
	'Pick Reactions...': '选择回应...',
	'Toggle reaction, ': '切换回应，',
	'{0}{1} reaction': '{0}{1} 回应',
	'{0}1 reaction with {1}': '{0}1 条来自 {1} 的回应',
	'{0}{1} reactions with {2}': '{0}{1} 条来自 {2} 的回应',
	'{0}{1} reacted with {2}': '{0}{1} 使用 {2} 作出回应',
	'{0}{1} and {2} more reacted with {3}': '{0}{1} 以及另外 {2} 人使用 {3} 作出回应',

	// ===================== common/commentContextKeys.ts =====================
	'Whether the position at the active cursor has a commenting range': '活动光标所在位置是否有批注范围',
	'Whether the position at the active cursor has a comment': '活动光标所在位置是否有批注',
	'Whether the active editor has a commenting range': '活动编辑器是否有批注范围',
	'Whether the open workspace has either comments or commenting ranges.':
		'打开的工作区是否包含批注或批注范围。',
	'Set when the comment thread has no comments': '当批注线程没有批注时设置',
	'Set when the comment has no input': '当批注没有输入内容时设置',
	'The context value of the comment': '批注的上下文值',
	'The context value of the comment thread': '批注线程的上下文值',
	'The comment controller id associated with a comment thread': '与批注线程关联的批注控制器 ID',
	'Set when the comment is focused': '当批注获得焦点时设置',
	'Set when a comment widget is visible in the editor': '当编辑器中显示批注部件时设置',
	'Whether commenting functionality is enabled': '是否启用批注功能',
};