// Batch 59 — editor color registry + editor configuration schema (theme editor surface)
export default {
	// ===================== editorColorRegistry.ts =====================
	'Background color for the highlight of line at the cursor position.': '光标所在行的高亮背景色。',
	'Background color for the highlight of line at the cursor position when the editor is not focused.':
		'编辑器未获得焦点时，光标所在行的高亮背景色。',
	'Background color for the border around the line at the cursor position.': '光标所在行周围边框的背景色。',
	'Background color of highlighted ranges, like by quick open and find features. The color must not be opaque so as not to hide underlying decorations.':
		'高亮范围（例如快速打开和查找功能所产生）的背景色。该颜色不能是不透明色，以免遮挡下层装饰。',
	'Background color of the border around highlighted ranges.': '高亮范围周围边框的背景色。',
	'Background color of highlighted symbol, like for go to definition or go next/previous symbol. The color must not be opaque so as not to hide underlying decorations.':
		'高亮符号（例如转到定义或转到上一个/下一个符号所产生）的背景色。该颜色不能是不透明色，以免遮挡下层装饰。',
	'Background color of the border around highlighted symbols.': '高亮符号周围边框的背景色。',
	'Color of the editor cursor.': '编辑器光标的颜色。',
	'The background color of the editor cursor. Allows customizing the color of a character overlapped by a block cursor.':
		'编辑器光标的背景色。可用于自定义被块状光标覆盖的字符的颜色。',
	'Color of the primary editor cursor when multiple cursors are present.': '存在多个光标时主编辑器光标的颜色。',
	'The background color of the primary editor cursor when multiple cursors are present. Allows customizing the color of a character overlapped by a block cursor.':
		'存在多个光标时主编辑器光标的背景色。可用于自定义被块状光标覆盖的字符的颜色。',
	'Color of secondary editor cursors when multiple cursors are present.': '存在多个光标时次要编辑器光标的颜色。',
	'The background color of secondary editor cursors when multiple cursors are present. Allows customizing the color of a character overlapped by a block cursor.':
		'存在多个光标时次要编辑器光标的背景色。可用于自定义被块状光标覆盖的字符的颜色。',
	'Color of whitespace characters in the editor.': '编辑器中空白字符的颜色。',
	'Color of the indicator shown at the end of a soft wrapped line in the editor.':
		'编辑器中软换行行尾所显示标记的颜色。',
	'Color of editor line numbers.': '编辑器行号的颜色。',
	'Color of the editor indentation guides.': '编辑器缩进参考线的颜色。',
	"'editorIndentGuide.background' is deprecated. Use 'editorIndentGuide.background1' instead.":
		"'editorIndentGuide.background' 已废弃。请改用 'editorIndentGuide.background1'。",
	'Color of the active editor indentation guides.': '活动编辑器缩进参考线的颜色。',
	"'editorIndentGuide.activeBackground' is deprecated. Use 'editorIndentGuide.activeBackground1' instead.":
		"'editorIndentGuide.activeBackground' 已废弃。请改用 'editorIndentGuide.activeBackground1'。",
	'Color of the editor indentation guides (1).': '编辑器缩进参考线的颜色（1）。',
	'Color of the editor indentation guides (2).': '编辑器缩进参考线的颜色（2）。',
	'Color of the editor indentation guides (3).': '编辑器缩进参考线的颜色（3）。',
	'Color of the editor indentation guides (4).': '编辑器缩进参考线的颜色（4）。',
	'Color of the editor indentation guides (5).': '编辑器缩进参考线的颜色（5）。',
	'Color of the editor indentation guides (6).': '编辑器缩进参考线的颜色（6）。',
	'Color of the active editor indentation guides (1).': '活动编辑器缩进参考线的颜色（1）。',
	'Color of the active editor indentation guides (2).': '活动编辑器缩进参考线的颜色（2）。',
	'Color of the active editor indentation guides (3).': '活动编辑器缩进参考线的颜色（3）。',
	'Color of the active editor indentation guides (4).': '活动编辑器缩进参考线的颜色（4）。',
	'Color of the active editor indentation guides (5).': '活动编辑器缩进参考线的颜色（5）。',
	'Color of the active editor indentation guides (6).': '活动编辑器缩进参考线的颜色（6）。',
	'Color of editor active line number': '编辑器活动行号的颜色',
	"Id is deprecated. Use 'editorLineNumber.activeForeground' instead.":
		'该标识已废弃。请改用 \'editorLineNumber.activeForeground\'。',
	'Color of the final editor line when editor.renderFinalNewline is set to dimmed.':
		'当 editor.renderFinalNewline 设置为 dimmed 时，编辑器最后一行的颜色。',
	'Color of the editor rulers.': '编辑器标尺的颜色。',
	'Foreground color of editor CodeLens': '编辑器代码透镜的前景色',
	'Background color behind matching brackets': '配对括号后面的背景色',
	'Color for matching brackets boxes': '配对括号方框的颜色',
	'Foreground color for matching brackets': '配对括号的前景色',
	'Color of the overview ruler border.': '概览标尺边框的颜色。',
	'Background color of the editor overview ruler.': '编辑器概览标尺的背景色。',
	'Background color of the editor gutter. The gutter contains the glyph margins and the line numbers.':
		'编辑器装订线的背景色。装订线包含字形边距和行号。',
	'Border color of unnecessary (unused) source code in the editor.': '编辑器中多余（未使用）源代码的边框颜色。',
	'Border color of ghost text in the editor.': '编辑器中虚影文本的边框颜色。',
	'Foreground color of the ghost text in the editor.': '编辑器中虚影文本的前景色。',
	'Background color of the ghost text in the editor.': '编辑器中虚影文本的背景色。',
	'Overview ruler marker color for range highlights. The color must not be opaque so as not to hide underlying decorations.':
		'范围高亮的概览标尺标记颜色。该颜色不能是不透明色，以免遮挡下层装饰。',
	'Overview ruler marker color for errors.': '错误的概览标尺标记颜色。',
	'Overview ruler marker color for warnings.': '警告的概览标尺标记颜色。',
	'Overview ruler marker color for infos.': '信息的概览标尺标记颜色。',
	'Foreground color of brackets (1). Requires enabling bracket pair colorization.':
		'括号的前景色（1）。需要启用括号对着色。',
	'Foreground color of brackets (2). Requires enabling bracket pair colorization.':
		'括号的前景色（2）。需要启用括号对着色。',
	'Foreground color of brackets (3). Requires enabling bracket pair colorization.':
		'括号的前景色（3）。需要启用括号对着色。',
	'Foreground color of brackets (4). Requires enabling bracket pair colorization.':
		'括号的前景色（4）。需要启用括号对着色。',
	'Foreground color of brackets (5). Requires enabling bracket pair colorization.':
		'括号的前景色（5）。需要启用括号对着色。',
	'Foreground color of brackets (6). Requires enabling bracket pair colorization.':
		'括号的前景色（6）。需要启用括号对着色。',
	'Foreground color of unexpected brackets.': '非预期括号的前景色。',
	'Background color of inactive bracket pair guides (1). Requires enabling bracket pair guides.':
		'非活动括号对参考线的背景色（1）。需要启用括号对参考线。',
	'Background color of inactive bracket pair guides (2). Requires enabling bracket pair guides.':
		'非活动括号对参考线的背景色（2）。需要启用括号对参考线。',
	'Background color of inactive bracket pair guides (3). Requires enabling bracket pair guides.':
		'非活动括号对参考线的背景色（3）。需要启用括号对参考线。',
	'Background color of inactive bracket pair guides (4). Requires enabling bracket pair guides.':
		'非活动括号对参考线的背景色（4）。需要启用括号对参考线。',
	'Background color of inactive bracket pair guides (5). Requires enabling bracket pair guides.':
		'非活动括号对参考线的背景色（5）。需要启用括号对参考线。',
	'Background color of inactive bracket pair guides (6). Requires enabling bracket pair guides.':
		'非活动括号对参考线的背景色（6）。需要启用括号对参考线。',
	'Background color of active bracket pair guides (1). Requires enabling bracket pair guides.':
		'活动括号对参考线的背景色（1）。需要启用括号对参考线。',
	'Background color of active bracket pair guides (2). Requires enabling bracket pair guides.':
		'活动括号对参考线的背景色（2）。需要启用括号对参考线。',
	'Background color of active bracket pair guides (3). Requires enabling bracket pair guides.':
		'活动括号对参考线的背景色（3）。需要启用括号对参考线。',
	'Background color of active bracket pair guides (4). Requires enabling bracket pair guides.':
		'活动括号对参考线的背景色（4）。需要启用括号对参考线。',
	'Background color of active bracket pair guides (5). Requires enabling bracket pair guides.':
		'活动括号对参考线的背景色（5）。需要启用括号对参考线。',
	'Background color of active bracket pair guides (6). Requires enabling bracket pair guides.':
		'活动括号对参考线的背景色（6）。需要启用括号对参考线。',
	'Border color used to highlight unicode characters.': '用于高亮 Unicode 字符的边框颜色。',
	'Background color used to highlight unicode characters.': '用于高亮 Unicode 字符的背景色。',

	// ===================== editorConfigurationSchema.ts =====================
	'The number of spaces used for indentation or `"tabSize"` to use the value from `#editor.tabSize#`. This setting is overridden based on the file contents when `#editor.detectIndentation#` is on.':
		'用于缩进的空格数量。设为 `"tabSize"` 时使用 `#editor.tabSize#` 的值。启用 `#editor.detectIndentation#` 时，该设置会根据文件内容被覆盖。',
	'Turn off Word Based Suggestions.': '关闭基于单词的建议。',
	'Turn off Word Based Suggestions when Inline Suggestions are present.': '存在内联建议时关闭基于单词的建议。',
	'Only suggest words from the active document.': '仅从活动文档中推荐单词。',
	'Suggest words from all open documents of the same language.': '从所有已打开的同语言文档中推荐单词。',
	'Suggest words from all open documents.': '从所有已打开的文档中推荐单词。',
	'Semantic highlighting enabled for all color themes.': '对所有配色主题启用语义高亮。',
	'Semantic highlighting disabled for all color themes.': '对所有配色主题禁用语义高亮。',
	"Semantic highlighting is configured by the current color theme's `semanticHighlighting` setting.":
		'语义高亮由当前配色主题的 `semanticHighlighting` 设置决定。',
	'Controls whether tree sitter parsing should be turned on and telemetry collected. Setting `#editor.experimental.preferTreeSitter#` for specific languages will take precedence.':
		'控制是否启用 tree-sitter 解析并收集遥测数据。为特定语言设置 `#editor.experimental.preferTreeSitter#` 时优先生效。',
	'Controls whether tree sitter parsing should be turned on for typescript. This will take precedence over `#editor.experimental.treeSitterTelemetry#` for typescript.':
		'控制是否为 TypeScript 启用 tree-sitter 解析。对 TypeScript 而言，该设置优先于 `#editor.experimental.treeSitterTelemetry#`。',
	'Defines the bracket symbols that increase or decrease the indentation.': '定义用于增加或减少缩进的括号符号。',
	'The opening bracket character or string sequence.': '起始括号字符或字符串序列。',
	'The closing bracket character or string sequence.': '结束括号字符或字符串序列。',
	'Defines the bracket pairs that are colorized by their nesting level if bracket pair colorization is enabled.':
		'定义在启用括号对着色时按嵌套层级着色的括号对。',
	'Controls whether original line numbers are hidden in inline diffs. When set to null, uses the editor\'s default: hidden in compact multi diff editors and visible in other diff editors.':
		'控制是否在内联差异中隐藏原始行号。设为 null 时使用编辑器默认值：紧凑多文件差异编辑器中隐藏，其他差异编辑器中显示。',
};