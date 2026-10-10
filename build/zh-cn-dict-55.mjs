// Batch 55 — editor core: standaloneStrings / editorContextKeys / languages / editorOptions
// Keys containing an apostrophe use double-quoted JS strings.
// Single-word keys (Class, Method, Enum Member, ...) were collision-checked with
// build/check-key-collisions.mjs first: every one of them has exactly one call site
// in languages.ts, except Method/Event/Text/Issue which also appear in
// terminalSuggestAddon.ts, chatDebugFlowGraph.ts, screenshotAnnotation.ts and
// agentHostSessionInputPills.ts -- all four are the same "symbol/tool kind" label,
// so the same Chinese translation is correct there too.
export default {
	// ===================== standaloneStrings.ts =====================
	'Opening the Accessibility documentation page.': '正在打开无障碍功能文档页面。',
	'You are in a read-only pane of a diff editor.': '你位于差异编辑器的只读窗格中。',
	'You are in a pane of a diff editor.': '你位于差异编辑器的一个窗格中。',
	'You are in a read-only code editor.': '你位于只读的代码编辑器中。',
	'You are in a code editor.': '你位于代码编辑器中。',
	'activeEditorState - such as modified, problems, and more, is included as a part of the window.title setting by default. Disable it with accessibility.windowTitleOptimized.':
		'默认情况下，窗口标题设置中会包含活动编辑器状态（如已修改、问题等）。可通过 accessibility.windowTitleOptimized 禁用。',
	'activeEditorState - such as modified, problems, and more, is currently not included as a part of the window.title setting by default. Enable it with accessibility.windowTitleOptimized.':
		'默认情况下，窗口标题设置中不包含活动编辑器状态（如已修改、问题等）。可通过 accessibility.windowTitleOptimized 启用。',
	"Around the workbench, when the screen reader announces you've landed in a toolbar, use narrow keys to navigate between the toolbar's actions.":
		'在工作台中，当屏幕阅读器提示你已进入工具栏时，可用左右方向键在工具栏的操作项之间导航。',
	'Configure the application to be optimized for usage with a Screen Reader (Command+E).':
		'将应用配置为针对屏幕阅读器优化（Command+E）。',
	'Configure the application to be optimized for usage with a Screen Reader (Control+E).':
		'将应用配置为针对屏幕阅读器优化（Control+E）。',
	'The application is configured to be optimized for usage with a Screen Reader.':
		'应用已配置为针对屏幕阅读器优化。',
	'The application is configured to never be optimized for usage with a Screen Reader.':
		'应用已配置为永不对屏幕阅读器做优化。',
	'Screen Reader Optimized Mode enabled.': '已启用屏幕阅读器优化模式。',
	'Screen Reader Optimized Mode disabled.': '已禁用屏幕阅读器优化模式。',
	'Pressing Tab in the current editor will move focus to the next focusable element. Toggle this behavior{0}.':
		'在当前编辑器中按 Tab 键会将焦点移到下一个可聚焦元素。切换此行为{0}。',
	'Pressing Tab in the current editor will insert the tab character. Toggle this behavior{0}.':
		'在当前编辑器中按 Tab 键会插入制表符。切换此行为{0}。',
	'Focus Sticky Scroll{0} to focus the currently nested scopes.': '聚焦粘性滚动{0}以聚焦当前嵌套的作用域。',
	'Trigger the suggest widget{0} to show possible inline suggestions.': '触发表建议控件{0}以显示可能的内联建议。',
	'Accept suggestion{0} to accept the currently selected suggestion.': '接受建议{0}以接受当前选中的建议。',
	'Toggle focus between the suggest widget and the editor{0} and toggle details focus with{1} to learn more about the suggestion.':
		'在建议控件和编辑器之间切换焦点{0}，并用{1}切换详情焦点以了解建议的更多信息。',
	"Use code folding to collapse blocks of code and focus on the code you're interested in via the Toggle Folding Command{0}.":
		'使用代码折叠收起代码块，并通过"切换折叠"命令{0}聚焦你关心的代码。',
	'Use Intellisense to improve coding efficiency and reduce errors. Trigger suggestions{0}.':
		'使用 IntelliSense 提高编码效率并减少错误。触发建议{0}。',
	'Show or focus the hover{0} to read information about the current symbol.': '显示或聚焦悬停{0}以查看当前符号的信息。',
	'Go to Symbol{0} to quickly navigate between symbols in the current file.': '转到符号{0}以在当前文件的符号之间快速导航。',
	'Show Accessibility Help': '显示无障碍功能帮助',
	'Run the command: List Signal Sounds for an overview of all sounds and their current status.':
		'运行命令"List Signal Sounds（列出提示音）"可查看所有提示音及其当前状态。',
	'Run the command: List Signal Announcements for an overview of announcements and their current status.':
		'运行命令"List Signal Announcements（列出播报）"可查看所有播报及其当前状态。',
	'Run the command: Announce Cursor Position{0} to hear the current line and column.':
		'运行命令"Announce Cursor Position（播报光标位置）"{0}以听取当前行列号。',
	'Focus notification toasts{0} to navigate them with the keyboard. Accept the primary action of a focused notification{1}.':
		'聚焦通知弹出项{0}以使用键盘导航。接受已聚焦通知的主要操作{1}。',
	'Toggle quick chat{0} to open or close a chat session.': '切换快速聊天{0}以打开或关闭聊天会话。',
	'Start inline chat{0} to create an in editor chat session.': '启动内联聊天{0}以在编辑器中创建聊天会话。',
	'The Debug: Inline Breakpoint command{0} will set or unset a breakpoint at the current cursor position in the active editor.':
		'"调试: 内联断点"命令{0}将在活动编辑器的当前光标位置设置或取消断点。',
	'The Debug: Add to Watch command{0} will add the selected text to the watch view.':
		'"调试: 添加到监视"命令{0}会将选中的文本添加到监视视图。',
	'The Debug: Execute Selection command{0} will execute the selected text in the debug console.':
		'"调试: 执行所选内容"命令{0}将在调试控制台中执行选中的文本。',
	'The editor contains pending modifications that have been made by chat.': '编辑器中包含由聊天产生的待处理修改。',
	'The editor is currently waiting for modifications to be made by chat.': '编辑器正在等待聊天产生的修改。',
	'Navigate between edits in the editor with navigate previous{0} and next{1} and accept{2}, reject{3} or view the diff{4} for the current change. Accept edits across all files{5}.':
		'使用"上一个"{0}和"下一个"{1}在编辑器中的修改之间导航，并对当前更改"接受"{2}、"拒绝"{3}或"查看差异"{4}。接受所有文件的修改{5}。',
	'Start or stop dictation in the editor{0}.': '在编辑器中开始或停止听写{0}。',
	'Developer: Inspect Tokens': '开发者: 检查词元',
	'Go to Offset...': '转到偏移量...',
	'Command Palette': '命令面板',
	'Show And Run Commands': '显示并运行命令',
	'Go to Symbol...': '转到符号...',
	'Go to Symbol by Category...': '按类别转到符号...',
	'Toggle High Contrast Theme': '切换高对比度主题',
	'Made {0} edits in {1} files': '已在 {1} 个文件中完成 {0} 处修改',

	// ===================== editorContextKeys.ts =====================
	'Whether the editor text has focus (cursor is blinking)': '编辑器文本是否获得焦点（光标闪烁）',
	'Whether the editor or an editor widget has focus (e.g. focus is in the find widget)':
		'编辑器或编辑器部件是否获得焦点（例如焦点在查找小部件中）',
	'Whether an editor or a rich text input has focus (cursor is blinking)':
		'编辑器或富文本输入框是否获得焦点（光标闪烁）',
	'Whether the editor is read-only': '编辑器是否为只读',
	'Whether the context is a diff editor': '当前上下文是否为差异编辑器',
	'Whether the context is an embedded diff editor': '当前上下文是否为嵌入式差异编辑器',
	'Whether the context is a multi diff editor': '当前上下文是否为多文件差异编辑器',
	'Whether all files in multi diff editor are collapsed': '多文件差异编辑器中的所有文件是否都已折叠',
	'Whether all unchanged regions of a multi diff editor file are revealed':
		'多文件差异编辑器文件中的所有未更改区域是否都已展开',
	'Whether the multi diff editor renders diffs side by side instead of inline':
		'多文件差异编辑器是否并排显示差异而非内联显示',
	'Whether the diff editor has changes': '差异编辑器是否有更改',
	'Whether a moved code block is selected for comparison': '是否选中了移动的代码块以供比较',
	'Whether the accessible diff viewer is visible': '无障碍差异查看器是否可见',
	'Whether the diff editor render side by side inline breakpoint is reached':
		'是否达到差异编辑器并排渲染的内联断点',
	'Whether inline mode is active': '内联模式是否处于激活状态',
	'Whether inline mode is temporarily active after manually resizing the diff editor':
		'手动调整差异编辑器大小后内联模式是否临时激活',
	'Whether automatic diff editor layout would render side by side': '自动差异编辑器布局是否会并排显示',
	'Whether modified is writable in the diff editor': '差异编辑器中的修改内容是否可写',
	'The uri of the original document': '原始文档的 uri',
	'The uri of the modified document': '修改后文档的 uri',
	'Whether `editor.columnSelection` is enabled': '是否启用 `editor.columnSelection`',
	'Whether the editor has text selected': '编辑器中是否有选中的文本',
	'Whether the editor has multiple selections': '编辑器中是否有多个选区',
	'Whether `Tab` will move focus out of the editor': '`Tab` 键是否会将焦点移出编辑器',
	'Whether the editor hover is visible': '编辑器悬停是否可见',
	'Whether the editor hover is focused': '编辑器悬停是否获得焦点',
	'Whether the sticky scroll is focused': '粘性滚动是否获得焦点',
	'Whether the sticky scroll is visible': '粘性滚动是否可见',
	'Whether the standalone color picker is visible': '独立颜色选择器是否可见',
	'Whether the standalone color picker is focused': '独立颜色选择器是否获得焦点',
	'Whether the editor is in the composition mode': '编辑器是否处于组合模式',
	'Whether the editor is part of a larger editor (e.g. notebooks)': '编辑器是否属于更大的编辑器（例如笔记本）',
	'The language identifier of the editor': '编辑器的语言标识符',
	'Whether the editor has a completion item provider': '编辑器是否提供补全项',
	'Whether the editor has a code actions provider': '编辑器是否提供代码操作',
	'Whether the editor has a code lens provider': '编辑器是否提供代码透镜',
	'Whether the editor has a definition provider': '编辑器是否提供定义',
	'Whether the editor has a declaration provider': '编辑器是否提供声明',
	'Whether the editor has an implementation provider': '编辑器是否提供实现',
	'Whether the editor has a type definition provider': '编辑器是否提供类型定义',
	'Whether the editor has a hover provider': '编辑器是否提供悬停信息',
	'Whether the editor has a document highlight provider': '编辑器是否提供文档高亮',
	'Whether the editor has a document symbol provider': '编辑器是否提供文档符号',
	'Whether the editor has a reference provider': '编辑器是否提供引用',
	'Whether the editor has a rename provider': '编辑器是否提供重命名',
	'Whether the editor has a signature help provider': '编辑器是否提供签名帮助',
	'Whether the editor has an inline hints provider': '编辑器是否提供内联提示',
	'Whether the editor has a document formatting provider': '编辑器是否提供文档格式化',
	'Whether the editor has a document selection formatting provider': '编辑器是否提供所选内容格式化',
	'Whether the editor has multiple document formatting providers': '编辑器是否提供多种文档格式化',
	'Whether the editor has multiple document selection formatting providers':
		'编辑器是否提供多种所选内容格式化',
	'Whether any diagnostic is present in the current editor selection': '当前编辑器选区中是否存在任何诊断信息',

	// ===================== languages.ts — completion item kinds =====================
	'Method': '方法',
	'Function': '函数',
	'Constructor': '构造函数',
	'Field': '字段',
	'Variable': '变量',
	'Class': '类',
	'Struct': '结构体',
	'Interface': '接口',
	'Module': '模块',
	'Property': '属性',
	'Event': '事件',
	'Operator': '运算符',
	'Unit': '单位',
	'Constant': '常量',
	'Enum': '枚举',
	'Enum Member': '枚举成员',
	'Keyword': '关键字',
	'Text': '文本',
	'Color': '颜色',
	'Reference': '引用',
	'Custom Color': '自定义颜色',
	'Type Parameter': '类型参数',
	'Issue': '问题',
	'Tool': '工具',
	'Snippet': '代码片段',

	// ===================== languages.ts — symbolKindNames =====================
	'array': '数组',
	'boolean': '布尔值',
	'constant': '常量',
	'constructor': '构造函数',
	'enumeration': '枚举',
	'enumeration member': '枚举成员',
	'event': '事件',
	'field': '字段',
	'function': '函数',
	'interface': '接口',
	'key': '键',
	'method': '方法',
	'module': '模块',
	'namespace': '命名空间',
	'null': 'null',
	'number': '数字',
	'object': '对象',
	'operator': '运算符',
	'package': '包',
	'property': '属性',
	'string': '字符串',
	'struct': '结构体',
	'type parameter': '类型参数',
	'variable': '变量',
	'{0} ({1})': '{0}（{1}）',

	// ===================== editorOptions.ts =====================
	'Controls if empty lines should be ignored with toggle, add or remove actions for line comments.':
		'控制在使用切换、添加或移除行注释的操作时是否忽略空行。',
	'Never seed search string from the editor selection.': '始终不从编辑器选区填充搜索字符串。',
	'Always seed search string from the editor selection, including word at cursor position.':
		'始终从编辑器选区填充搜索字符串，包括光标处的单词。',
	'Only seed search string from the editor selection.': '仅从编辑器选区填充搜索字符串。',
	'Never turn on Find in Selection automatically (default).': '从不自动启用"在选中项中查找"（默认）。',
	'Always turn on Find in Selection automatically.': '始终自动启用"在选中项中查找"。',
	'Turn on Find in Selection automatically when multiple lines of content are selected.':
		'当选中多行内容时自动启用"在选中项中查找"。',
	'Do not store search history from the find widget.': '不存储来自查找小部件的搜索历史。',
	'Store search history across the active workspace': '在活动工作区中存储搜索历史',
	'Do not store history from the replace widget.': '不存储来自替换小部件的历史。',
	'Store replace history across the active workspace': '在活动工作区中存储替换历史',
	"Configures font ligatures or font features. Can be either a boolean to enable/disable ligatures or a string for the value of the CSS 'font-feature-settings' property.":
		'配置字体连字或字体特性。可以是布尔值以启用/禁用连字，也可以是 CSS \'font-feature-settings\' 属性的字符串值。',
	"Enables/Disables the translation from font-weight to font-variation-settings. Change this to a string for fine-grained control of the 'font-variation-settings' CSS property.":
		'启用/禁用从 font-weight 到 font-variation-settings 的转换。改为字符串可对 \'font-variation-settings\' CSS 属性进行更精细的控制。',
	'Show Peek view of the results (default)': '显示结果的速览视图（默认）',
	'Go to the primary result and show a Peek view': '转到主要结果并显示速览视图',
	'Go to the primary result and enable Peek-less navigation to others': '转到主要结果并启用无需速览的其他结果导航',
	"This setting is deprecated, please use separate settings like 'editor.editor.gotoLocation.multipleDefinitions' or 'editor.editor.gotoLocation.multipleImplementations' instead.":
		'此设置已废弃，请改用 \'editor.editor.gotoLocation.multipleDefinitions\' 或 \'editor.editor.gotoLocation.multipleImplementations\' 等单独设置。',
	'Assumes that all characters are of the same width. This is a fast algorithm that works correctly for monospace fonts and certain scripts (like Latin characters) where glyphs are of equal width.':
		'假定所有字符宽度相同。这是一种快速算法，对等宽字体和某些脚本（如拉丁字符）等字形等宽的情况能正确工作。',
	'Disable the code action menu.': '禁用代码操作菜单。',
	'Show the code action menu when the cursor is on lines with code.': '当光标位于有代码的行上时显示代码操作菜单。',
	'Show the code action menu when the cursor is on lines with code or on empty lines.':
		'当光标位于有代码的行上或空行上时显示代码操作菜单。',
	'Controls whether all non-basic ASCII characters are highlighted. Only characters between U+0020 and U+007E, tab, line-feed and carriage-return are considered basic ASCII.':
		'控制是否高亮所有非基本 ASCII 字符。仅 U+0020 到 U+007E 之间的字符、制表符、换行符和回车符被视为基本 ASCII。',
	'Controls how inline suggestions interact with the suggest widget. If enabled, the suggest widget is not shown automatically when inline suggestions are available.':
		'控制内联建议与建议控件的交互方式。启用后，当有内联建议可用时不会自动显示建议控件。',
	'Controls how many lines of surrounding context are shown above and below the target line in the long distance inline suggestion preview. Set to 0 to only show the target line.':
		'控制长距离内联建议预览中，目标行上下显示多少行上下文。设为 0 则只显示目标行。',
	'Locales to be used for word segmentation when doing word related navigations or operations. Specify the BCP 47 language tag of the word you wish to recognize (e.g., ja, zh-CN, zh-Hant-TW, etc.).':
		'进行与单词相关的导航或操作时用于分词的区域设置。指定要识别的单词所使用的 BCP 47 语言标记（例如 ja、zh-CN、zh-Hant-TW 等）。',
	'Controls whether suggestions should be accepted on commit characters. For example, in JavaScript, the semi-colon (`;`) can be a commit character that accepts a suggestion and types that character.':
		'控制是否在输入提交字符时接受建议。例如在 JavaScript 中，分号（`;`）可以是提交字符，用于接受建议并输入该字符。',
	'Controls whether to allow using variable line heights in the editor.': '控制是否允许在编辑器中使用可变行高。',
	'Controls whether to allow using variable fonts in the editor.': '控制是否允许在编辑器中使用可变字体。',
	'Controls whether to allow using variable fonts in the editor in the accessibility mode.':
		'控制是否允许在无障碍模式的编辑器中使用可变字体。',
	"The editor will keep the current line's indentation, honor language defined brackets, invoke special onEnterRules defined by languages, and honor indentationRules defined by languages.":
		'编辑器将保持当前行的缩进、遵循语言定义的括号、调用语言定义的特殊 onEnterRules，并遵循语言定义的 indentationRules。',
	"Controls the minimal number of visible leading lines (minimum 0) and trailing lines (minimum 1) surrounding the cursor. Known as 'scrollOff' or 'scrollOffset' in some other editors.":
		'控制光标周围可见的前置行（最小 0）和后置行（最小 1）的最小数量。在其他一些编辑器中称为 \'scrollOff\' 或 \'scrollOffset\'。',
	'The maximum number of foldable regions. Increasing this value may result in the editor becoming less responsive when the current source has a large number of foldable regions.':
		'可折叠区域的最大数量。增大该值可能会在当前源码包含大量可折叠区域时降低编辑器的响应速度。',
	'Controls whether the editor should automatically format the pasted content. A formatter must be available and the formatter should be able to format a range in a document.':
		'控制编辑器是否自动格式化粘贴的内容。必须存在可用的格式化程序，且该程序能够格式化文档中的某个范围。',
	'Scroll only along the predominant axis when scrolling both vertically and horizontally at the same time. Prevents horizontal drift when scrolling vertically on a trackpad.':
		'同时垂直和水平滚动时，仅沿主要轴滚动。可防止在触控板上垂直滚动时发生水平漂移。',
	'Lines will wrap at `#editor.wordWrapColumn#`.': '将在 `#editor.wordWrapColumn#` 处换行。',
	'Lines will wrap at the minimum of viewport and `#editor.wordWrapColumn#`.':
		'将在视口与 `#editor.wordWrapColumn#` 两者中较小的位置换行。',
	'Controls how lines should wrap.': '控制行的换行方式。',
	'Controls whether an indicator is rendered at the wrapping column of lines that wrap. Only has an effect when `#editor.wordWrap#` is enabled.':
		'控制是否在换行处的换行列渲染指示标记。仅在启用 `#editor.wordWrap#` 时生效。',
	'Controls the wrapping column of the editor when `#editor.wordWrap#` is `wordWrapColumn` or `bounded`.':
		'当 `#editor.wordWrap#` 为 `wordWrapColumn` 或 `bounded` 时，控制编辑器的换行列。',
};