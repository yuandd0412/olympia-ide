// zh-cn dictionary batch 16 -- editor core settings: font, minimap, inlay hints, suggest, folding, render
export default {
	// ---- font / tree-sitter ----
	'Controls whether tree sitter parsing should be turned on for css. This will take precedence over `#editor.experimental.treeSitterTelemetry#` for css.':
		'控制是否为 css 启用 tree sitter 解析。对 css 而言，此设置的优先级高于 `#editor.experimental.treeSitterTelemetry#`。',
	'Controls whether tree sitter parsing should be turned on for ini. This will take precedence over `#editor.experimental.treeSitterTelemetry#` for ini.':
		'控制是否为 ini 启用 tree sitter 解析。对 ini 而言，此设置的优先级高于 `#editor.experimental.treeSitterTelemetry#`。',
	'Controls whether tree sitter parsing should be turned on for regex. This will take precedence over `#editor.experimental.treeSitterTelemetry#` for regex.':
		'控制是否为 regex 启用 tree sitter 解析。对 regex 而言，此设置的优先级高于 `#editor.experimental.treeSitterTelemetry#`。',
	'Assume a screen reader is not attached.': '假定未连接屏幕阅读器。',
	"Explicit 'font-feature-settings' CSS property. A boolean can be passed instead if one only needs to turn on/off ligatures.":
		'显式的 \'font-feature-settings\' CSS 属性。如果只需要开关连字，也可以传入布尔值。',
	"Explicit 'font-variation-settings' CSS property. A boolean can be passed instead if one only needs to translate font-weight to font-variation-settings.":
		'显式的 \'font-variation-settings\' CSS 属性。如果只需要把 font-weight 映射到 font-variation-settings，也可以传入布尔值。',
	'Controls the font size in pixels.': '控制字号（像素）。',
	'Controls the font family.': '控制字体。',
	'Controls the font family for CodeLens.': '控制 CodeLens 的字体。',
	'Controls the font size in pixels for CodeLens. When set to 0, 90% of `#editor.fontSize#` is used.':
		'控制 CodeLens 的字号（像素）。设为 0 时使用 `#editor.fontSize#` 的 90%。',
	'Only "normal" and "bold" keywords or numbers between 1 and 1000 are allowed.':
		'只允许 "normal" 和 "bold" 关键字，或 1 到 1000 之间的数字。',
	'Controls the font weight. Accepts "normal" and "bold" keywords or numbers between 1 and 1000.':
		'控制字重。接受 "normal" 和 "bold" 关键字，或 1 到 1000 之间的数字。',
	'Controls the letter spacing in pixels.': '控制字间距（像素）。',

	// ---- go to definition behavior ----
	"Controls the behavior the 'Go to Definition'-command when multiple target locations exist.":
		'当存在多个目标位置时，控制「转到定义」命令的行为。',
	"Controls the behavior the 'Go to Type Definition'-command when multiple target locations exist.":
		'当存在多个目标位置时，控制「转到类型定义」命令的行为。',
	"Controls the behavior the 'Go to Declaration'-command when multiple target locations exist.":
		'当存在多个目标位置时，控制「转到声明」命令的行为。',
	"Controls the behavior the 'Go to Implementations'-command when multiple target locations exist.":
		'当存在多个目标位置时，控制「转到实现」命令的行为。',
	"Controls the behavior the 'Go to References'-command when multiple target locations exist.":
		'当存在多个目标位置时，控制「转到引用」命令的行为。',
	"Alternative command id that is being executed when the result of 'Go to Definition' is the current location.":
		'当「转到定义」的结果就是当前位置时，执行的其他命令 ID。',
	"Alternative command id that is being executed when the result of 'Go to Type Definition' is the current location.":
		'当「转到类型定义」的结果就是当前位置时，执行的其他命令 ID。',
	"Alternative command id that is being executed when the result of 'Go to Declaration' is the current location.":
		'当「转到声明」的结果就是当前位置时，执行的其他命令 ID。',
	"Alternative command id that is being executed when the result of 'Go to Implementation' is the current location.":
		'当「转到实现」的结果就是当前位置时，执行的其他命令 ID。',
	"Alternative command id that is being executed when the result of 'Go to Reference' is the current location.":
		'当「转到引用」的结果就是当前位置时，执行的其他命令 ID。',

	// ---- hover ----
	'Hover is enabled.': '悬停提示已启用。',
	'Hover is disabled.': '悬停提示已禁用。',
	'Hover is shown when holding `{0}` or `Alt` (the opposite modifier of `#editor.multiCursorModifier#`)':
		'按住 `{0}` 或 `Alt`（与 `#editor.multiCursorModifier#` 相反的修饰键）时显示悬停提示',
	'Controls whether the hover is shown.': '控制是否显示悬停提示。',
	'Controls the delay in milliseconds after which the hover is shown.': '控制显示悬停提示前的延迟（毫秒）。',
	'Controls whether the hover should remain visible when mouse is moved over it.':
		'控制鼠标移入悬停提示时它是否保持可见。',
	'Controls the delay in milliseconds after which the hover is hidden. Requires `#editor.hover.sticky#` to be enabled.':
		'控制隐藏悬停提示前的延迟（毫秒）。需要启用 `#editor.hover.sticky#`。',
	'Prefer showing hovers above the line, if there\'s space.': '空间足够时优先把悬停提示显示在行上方。',
	'Controls whether long line warning hovers are shown, such as when tokenization is skipped or rendering is paused.':
		'控制是否显示长行警告类悬停提示，例如在跳过分词或暂停渲染时。',
	'Focus the tree when opening peek': '打开速览视图时聚焦到树',
	'Focus the editor when opening peek': '打开速览视图时聚焦到编辑器',
	'Controls whether to focus the inline editor or the tree in the peek widget.':
		'控制速览小部件中聚焦到内联编辑器还是树。',
	'Controls whether the Go to Definition mouse gesture always opens the peek widget.':
		'控制「转到定义」的鼠标操作是否总是打开速览小部件。',
	'Controls whether to use plain text for accessibility help.': '控制无障碍帮助是否使用纯文本。',

	// ---- word wrap ----
	'Delegates wrapping points computation to the browser. This is a slow algorithm, that might cause freezes for large files, but it works correctly in all cases.':
		'将换行点的计算交给浏览器处理。这是一种较慢的算法，大文件下可能导致卡顿，但在所有情况下都能正确工作。',
	'Controls the algorithm that computes wrapping points. Note that when in accessibility mode, advanced will be used for the best experience.':
		'控制计算换行点所用的算法。注意：在无障碍模式下会使用「高级」算法以获得最佳体验。',

	// ---- code action / sticky / inlay ----
	'Enables the Code Action lightbulb in the editor.': '在编辑器中启用代码操作灯泡图标。',
	'Shows the nested current scopes during the scroll at the top of the editor.':
		'在编辑器顶部滚动时显示嵌套的当前作用域。',
	'Defines the maximum number of sticky lines to show.': '定义最多显示多少条粘滞行。',
	"Enable scrolling of Sticky Scroll with the editor's horizontal scrollbar.": '允许通过编辑器的水平滚动条滚动粘滞视图。',
	'Enables the inlay hints in the editor.': '在编辑器中启用内嵌提示（inlay hints）。',
	'Inlay hints are enabled': '内嵌提示已启用',
	'Inlay hints are showing by default and hide when holding {0}': '内嵌提示默认显示，按住 {0} 时隐藏',
	'Inlay hints are hidden by default and show when holding {0}': '内嵌提示默认隐藏，按住 {0} 时显示',
	'Inlay hints are disabled': '内嵌提示已禁用',
	'Controls font size of inlay hints in the editor. As default the {0} is used when the configured value is less than {1} or greater than the editor font size.':
		'控制编辑器中内嵌提示的字号。当配置值小于 {1} 或大于编辑器字号时，默认使用 {0}。',
	'Controls font family of inlay hints in the editor. When set to empty, the {0} is used.':
		'控制编辑器中内嵌提示的字体。设为空时使用 {0}。',
	'Enables the padding around the inlay hints in the editor.': '启用编辑器中内嵌提示周围的内边距。',
	'Maximum overall length of inlay hints, for a single line, before they get truncated by the editor. Set to `0` to never truncate':
		'单行内嵌提示在被编辑器截断前允许的最大总长度。设为 `0` 表示永不截断',

	// ---- minimap ----
	'Controls whether the minimap is shown.': '控制是否显示缩略图（minimap）。',
	'The minimap is always shown.': '缩略图始终显示。',
	'The minimap is hidden when mouse is not over the minimap and shown when mouse is over the minimap.':
		'鼠标不在缩略图上时隐藏缩略图，鼠标移入时显示。',
	'The minimap is only shown when the editor is scrolled': '仅当编辑器滚动时显示缩略图',
	'Controls whether the minimap is hidden automatically.': '控制是否自动隐藏缩略图。',
	'The minimap has the same size as the editor contents (and might scroll).': '缩略图与编辑器内容同尺寸（可能会滚动）。',
	'The minimap will stretch or shrink as necessary to fill the height of the editor (no scrolling).':
		'缩略图会按需拉伸或收缩以填满编辑器高度（不滚动）。',
	'The minimap will shrink as necessary to never be larger than the editor (no scrolling).':
		'缩略图会按需缩小，确保不会大于编辑器（不滚动）。',
	'Controls the size of the minimap.': '控制缩略图的尺寸。',
	'Controls the side where to render the minimap.': '控制缩略图渲染在哪一侧。',
	'Controls when the minimap slider is shown.': '控制缩略图滑块何时显示。',
	'Scale of content drawn in the minimap: 1, 2 or 3.': '缩略图中绘制内容的缩放比例：1、2 或 3。',
	'Render the actual characters on a line as opposed to color blocks.': '渲染行中的实际字符，而不是色块。',
	'Limit the width of the minimap to render at most a certain number of columns.': '限制缩略图宽度，最多渲染指定数量的列。',
	'Controls whether named regions are shown as section headers in the minimap.':
		'控制是否把命名区域作为分节标题显示在缩略图中。',
	'Controls whether MARK: comments are shown as section headers in the minimap.':
		'控制是否把 MARK: 注释作为分节标题显示在缩略图中。',
	'Controls the font size of section headers in the minimap.': '控制缩略图中分节标题的字号。',
	'Controls the amount of space (in pixels) between characters of section header. This helps the readability of the header in small font sizes.':
		'控制分节标题字符之间的间距（像素）。这有助于在小字号下提升标题的可读性。',
	'Show default color decorators only when no extension provides colors decorators.':
		'仅当没有扩展提供颜色装饰器时，才显示默认颜色装饰器。',
	'Always show default color decorators.': '始终显示默认颜色装饰器。',
	'Never show default color decorators.': '从不显示默认颜色装饰器。',
	'Controls whether inline color decorations should be shown using the default document color provider.':
		'控制是否使用默认的文档颜色提供程序显示内联颜色装饰。',

	// ---- whitespace / scrollbar ----
	'Controls the amount of space between the top edge of the editor and the first line.':
		'控制编辑器上边缘与第一行之间的间距。',
	'Controls the amount of space between the bottom edge of the editor and the last line.':
		'控制编辑器下边缘与最后一行之间的间距。',
	'The vertical scrollbar will be visible only when necessary.': '垂直滚动条仅在必要时显示。',
	'The vertical scrollbar will always be visible.': '垂直滚动条始终显示。',
	'The vertical scrollbar will always be hidden.': '垂直滚动条始终隐藏。',
	'Controls the visibility of the vertical scrollbar.': '控制垂直滚动条的可见性。',
	'The horizontal scrollbar will be visible only when necessary.': '水平滚动条仅在必要时显示。',
	'The horizontal scrollbar will always be visible.': '水平滚动条始终显示。',
	'The horizontal scrollbar will always be hidden.': '水平滚动条始终隐藏。',
	'Controls the visibility of the horizontal scrollbar.': '控制水平滚动条的可见性。',
	'The width of the vertical scrollbar.': '垂直滚动条的宽度。',
	'The height of the horizontal scrollbar.': '水平滚动条的高度。',
	'Controls whether clicks scroll by page or jump to click position.':
		'控制单击时是按页滚动还是跳转到单击位置。',
	"When set, the horizontal scrollbar will not increase the size of the editor's content.":
		'启用后，水平滚动条不会增大编辑器内容的尺寸。',
	'Controls whether characters that just reserve space or have no width at all are highlighted.':
		'控制是否高亮仅用于占位、完全没有宽度的字符。',
	'Controls whether characters are highlighted that can be confused with basic ASCII characters, except those that are common in the current user locale.':
		'控制是否高亮那些可能与基本 ASCII 字符混淆的字符（当前用户语言区域中常见的除外）。',
	'Controls whether characters in comments should also be subject to Unicode highlighting.':
		'控制注释中的字符是否也接受 Unicode 高亮。',
	'Controls whether characters in strings should also be subject to Unicode highlighting.':
		'控制字符串中的字符是否也接受 Unicode 高亮。',
	'Defines allowed characters that are not being highlighted.': '定义允许出现且不被高亮的字符。',
	'Unicode characters that are common in allowed locales are not being highlighted.':
		'在允许的语言区域中常见的 Unicode 字符不会被高亮。',

	// ---- unicode highlights / line numbers / rulers ----
	'Line numbers are not rendered.': '不渲染行号。',
	'Line numbers are rendered as absolute number.': '以绝对行号渲染。',
	'Line numbers are rendered as distance in lines to cursor position.':
		'以与光标位置相差的行数渲染。',
	'Line numbers are rendered every 10 lines.': '每 10 行渲染一次行号。',
	'Controls the display of line numbers.': '控制行号的显示方式。',
	'Number of monospace characters at which this editor ruler will render.':
		'该编辑器标尺按多少个等宽字符的位置渲染。',
	'Color of this editor ruler.': '该编辑器标尺的颜色。',
	'Render vertical rulers after a certain number of monospace characters. Use multiple values for multiple rulers. No rulers are drawn if array is empty.':
		'每隔一定数量的等宽字符渲染一条垂直标尺。可传入多个值绘制多条标尺。数组为空时不绘制标尺。',
	'Controls whether a border should be drawn around the overview ruler.': '控制是否在概览标尺周围绘制边框。',
	'Controls whether the cursor should be hidden in the overview ruler.': '控制是否在概览标尺中隐藏光标。',

	// ---- inlay / parameter hints ----
	'Enables a pop-up that shows parameter documentation and type information as you type.':
		'启用弹窗，在输入时显示参数文档和类型信息。',
	'Controls whether the parameter hints menu cycles or closes when reaching the end of the list.':
		'控制参数提示菜单到达列表末尾时是循环还是关闭。',

	// ---- quick suggestions ----
	'Quick suggestions show inside the suggest widget': '快速建议显示在建议控件内',
	'Quick suggestions show as ghost text': '快速建议以幽灵文本（ghost text）显示',
	'Quick suggestions are disabled': '快速建议已禁用',
	'Quick suggestions are disabled when inline completions are showing': '显示内联补全时，快速建议被禁用',
	'Quick suggestions are enabled for all token types': '对所有词法单元类型启用快速建议',
	'Quick suggestions show as ghost text for all token types': '对所有词法单元类型以幽灵文本显示快速建议',
	'Quick suggestions are disabled for all token types': '对所有词法单元类型禁用快速建议',
	'Quick suggestions are disabled for all token types when inline completions are showing': '显示内联补全时，对所有词法单元类型禁用快速建议',
	'Enable quick suggestions inside strings.': '在字符串内启用快速建议。',
	'Enable quick suggestions inside comments.': '在注释内启用快速建议。',
	'Enable quick suggestions outside of strings and comments.': '在字符串和注释之外启用快速建议。',
	'Controls the delay in milliseconds after which quick suggestions will show up.':
		'控制显示快速建议前的延迟（毫秒）。',
	'Controls whether an active snippet prevents quick suggestions.': '控制激活的代码片段是否阻止快速建议。',
	'Controls whether suggestions should automatically show up when typing trigger characters.':
		'控制输入触发字符时建议是否自动弹出。',
	'Controls the behavior the \'Go to Definition\'-command when multiple target locations exist.':
		'当存在多个目标位置时，控制「转到定义」命令的行为。',

	// ---- inline suggestions ----
	'Controls whether to automatically show inline suggestions in the editor.':
		'控制是否在编辑器中自动显示内联建议。',
	'Show the inline suggestion toolbar whenever an inline suggestion is shown.':
		'每当显示内联建议时，都显示内联建议工具栏。',
	'Show the inline suggestion toolbar when hovering over an inline suggestion.':
		'悬停到内联建议上时显示内联建议工具栏。',
	'Never show the inline suggestion toolbar.': '从不显示内联建议工具栏。',
	'Controls when to show the inline suggestion toolbar.': '控制何时显示内联建议工具栏。',
	'Controls whether to show syntax highlighting for inline suggestions in the editor.':
		'控制是否为编辑器中的内联建议显示语法高亮。',
	'Controls whether inline suggestions are suppressed when in snippet mode.':
		'控制处于代码片段模式时是否抑制内联建议。',
	'Controls the minimal delay in milliseconds after which inline suggestions are shown after typing.':
		'控制输入后显示内联建议前的最小延迟（毫秒）。',
	'Suppresses inline completions for specified extension IDs -- comma separated.':
		'禁止指定扩展 ID 的内联补全 —— 使用英文逗号分隔。',
	'Controls whether to send request information from the inline suggestion provider.':
		'控制是否发送来自内联建议提供程序的请求信息。',
	'Controls whether to trigger a command when the inline suggestion provider changes.':
		'控制内联建议提供程序变化时是否触发命令。',
	'Controls whether to show inline suggestions when there is a suggest conflict.':
		'控制出现建议冲突时是否显示内联建议。',
	'Controls the font family of the inline suggestions.': '控制内联建议的字体。',
	'Controls whether showing a suggestion will shift the code to make space for the suggestion inline.':
		'控制显示建议时是否为内联建议腾出空间而移动代码。',
	'Controls whether long distance inline suggestions are shown.': '控制是否显示距离较远的内联建议。',
	'Controls whether larger suggestions can be shown side by side.': '控制较大的建议是否可以并排显示。',
	'Larger suggestions will show side by side if there is enough space, otherwise they will be shown below.':
		'空间足够时较大的建议将并排显示，否则显示在下方。',
	'Larger suggestions are never shown side by side and will always be shown below.':
		'较大的建议从不并排显示，始终显示在下方。',
	'Controls whether the suggestion will show as collapsed until jumping to it.':
		'控制建议是否先折叠显示，直到跳转到它。',
	'Control whether inline suggestions are announced by a screen reader.':
		'控制屏幕阅读器是否播报内联建议。',
	'Controls whether the accessibility hint should be provided to screen reader users when an inline completion is shown.':
		'控制显示内联补全时是否向屏幕阅读器用户提供无障碍提示。',

	// ---- brackets / guides / indent guides ----
	'Controls whether bracket pair colorization is enabled or not. Use {0} to override the bracket highlight colors.':
		'控制是否启用括号对着色。使用 {0} 可覆盖括号高亮颜色。',
	'Controls whether each bracket type has its own independent color pool.':
		'控制每种括号类型是否拥有各自独立的颜色池。',
	'Enables bracket pair guides.': '启用括号对参考线。',
	'Enables bracket pair guides only for the active bracket pair.': '仅为当前活动的括号对启用括号对参考线。',
	'Disables bracket pair guides.': '禁用括号对参考线。',
	'Controls whether bracket pair guides are enabled or not.': '控制是否启用括号对参考线。',
	'Enables horizontal guides as addition to vertical bracket pair guides.':
		'在垂直括号对参考线之外启用水平参考线。',
	'Enables horizontal guides only for the active bracket pair.': '仅为当前活动的括号对启用水平参考线。',
	'Disables horizontal bracket pair guides.': '禁用水平括号对参考线。',
	'Controls whether horizontal bracket pair guides are enabled or not.': '控制是否启用水平括号对参考线。',
	'Controls whether the editor should highlight the active bracket pair.': '控制编辑器是否高亮当前活动的括号对。',
	'Highlight matching brackets.': '高亮匹配的括号。',
	'Controls whether the editor should render indent guides.': '控制编辑器是否渲染缩进参考线。',
	'Highlights the active indent guide.': '高亮当前的缩进参考线。',
	'Highlights the active indent guide even if bracket guides are highlighted.':
		'即使已高亮括号参考线，也高亮当前的缩进参考线。',
	'Do not highlight the active indent guide.': '不高亮当前的缩进参考线。',
	'Controls whether the editor should highlight the active indent guide.': '控制编辑器是否高亮当前的缩进参考线。',

	// ---- suggest: accept / overwrite ----
	'Insert suggestion without overwriting text right of the cursor.': '插入建议且不覆盖光标右侧的文本。',
	'Insert suggestion and overwrite text right of the cursor.': '插入建议并覆盖光标右侧的文本。',
	'Controls whether words are overwritten when accepting completions. Note that this depends on extensions opting into this feature.':
		'控制接受补全时是否覆盖单词。注意：这取决于扩展是否选择启用此功能。',
	'Controls whether filtering and sorting suggestions accounts for small typos.':
		'控制建议的筛选和排序是否考虑小的拼写错误。',
	'Controls whether sorting favors words that appear close to the cursor.':
		'控制排序是否优先选择出现在光标附近的词。',
	'Controls whether remembered suggestion selections are shared between multiple workspaces and windows (needs `#editor.suggestSelection#`).':
		'控制记住的建议选择是否在多个工作区和窗口之间共享（需要 `#editor.suggestSelection#`）。',
	'Always select a suggestion when automatically triggering IntelliSense.':
		'自动触发 IntelliSense 时总是选中一条建议。',
	'Never select a suggestion when automatically triggering IntelliSense.':
		'自动触发 IntelliSense 时从不选中建议。',
	'Select a suggestion only when triggering IntelliSense from a trigger character.':
		'仅当由触发字符触发 IntelliSense 时才选中建议。',
	'Select a suggestion only when triggering IntelliSense as you type.':
		'仅当输入过程中触发 IntelliSense 时才选中建议。',
	'Controls whether to show or hide icons in suggestions.': '控制是否在建议中显示图标。',
	'Controls the visibility of the status bar at the bottom of the suggest widget.':
		'控制建议控件底部状态栏的可见性。',
	'Controls whether to preview the suggestion outcome in the editor.': '控制是否在编辑器中预览接受建议后的结果。',
	'Controls whether suggest details show inline with the label or only in the details widget.':
		'控制建议详情是与标签同行显示，还是仅在详情小部件中显示。',
	'This setting is deprecated, please use separate settings like \'editor.suggest.showKeywords\' or \'editor.suggest.showSnippets\' instead.':
		'此设置已弃用，请改用 \'editor.suggest.showKeywords\' 或 \'editor.suggest.showSnippets\' 等单独设置。',
	'Font size for the suggest widget. When set to {0}, the value of {1} is used.':
		'建议控件的字号。设为 {0} 时使用 {1} 的值。',
	'Line height for the suggest widget. When set to {0}, the value of {1} is used. The minimum value is 8.':
		'建议控件的行高。设为 {0} 时使用 {1} 的值。最小值为 8。',
	'Always select the first suggestion.': '总是选中第一条建议。',
	'Select recent suggestions unless further typing selects one, e.g. `console.| -> console.log` because `log` has been completed recently.':
		'优先选中最近用过的建议，除非继续输入选中了别的建议。例如 `console.| -> console.log`，因为最近补全过 `log`。',
	'Select suggestions based on previous prefixes that have completed those suggestions, e.g. `co -> console` and `con -> const`.':
		'根据此前补全过这些建议的前缀来选择建议，例如 `co -> console`、`con -> const`。',
	'Controls how suggestions are pre-selected when showing the suggest list.':
		'控制显示建议列表时如何预选建议。',
	'Tab complete will insert the best matching suggestion when pressing tab.':
		'Tab 补全：按 Tab 键时插入匹配度最高的建议。',
	'Disable tab completions.': '禁用 Tab 补全。',
	'Tab complete snippets when their prefix match. Works best when \'quickSuggestions\' aren\'t enabled.':
		'当前缀匹配时用 Tab 补全代码片段。在未启用 \'quickSuggestions\' 时效果最佳。',
	'Enables tab completions.': '启用 Tab 补全。',
	'Show snippet suggestions on top of other suggestions.': '把代码片段建议显示在其他建议之上。',
	'Show snippet suggestions below other suggestions.': '把代码片段建议显示在其他建议之下。',
	'Show snippets suggestions with other suggestions.': '把代码片段建议与其他建议一起显示。',
	'Do not show snippet suggestions.': '不显示代码片段建议。',
	'Controls whether snippets are shown with other suggestions and how they are sorted.':
		'控制代码片段是否与其他建议一起显示，以及如何排序。',
	'Only accept a suggestion with `Enter` when it makes a textual change.':
		'仅当建议会带来文本变更时，才用 `Enter` 接受它。',
	'Controls whether suggestions should be accepted on `Enter`, in addition to `Tab`. Helps to avoid ambiguity between inserting new lines or accepting suggestions.':
		'控制除 `Tab` 之外，是否也用 `Enter` 接受建议。有助于避免「插入换行」与「接受建议」之间的歧义。',

	// ---- showMethods etc. ----
	'When enabled IntelliSense shows `method`-suggestions.': '启用后，IntelliSense 会显示 `method`（方法）建议。',
	'When enabled IntelliSense shows `function`-suggestions.': '启用后，IntelliSense 会显示 `function`（函数）建议。',
	'When enabled IntelliSense shows `constructor`-suggestions.': '启用后，IntelliSense 会显示 `constructor`（构造函数）建议。',
	'When enabled IntelliSense shows `deprecated`-suggestions.': '启用后，IntelliSense 会显示 `deprecated`（已弃用）建议。',
	'When enabled IntelliSense shows `field`-suggestions.': '启用后，IntelliSense 会显示 `field`（字段）建议。',
	'When enabled IntelliSense shows `variable`-suggestions.': '启用后，IntelliSense 会显示 `variable`（变量）建议。',
	'When enabled IntelliSense shows `class`-suggestions.': '启用后，IntelliSense 会显示 `class`（类）建议。',
	'When enabled IntelliSense shows `struct`-suggestions.': '启用后，IntelliSense 会显示 `struct`（结构体）建议。',
	'When enabled IntelliSense shows `interface`-suggestions.': '启用后，IntelliSense 会显示 `interface`（接口）建议。',
	'When enabled IntelliSense shows `module`-suggestions.': '启用后，IntelliSense 会显示 `module`（模块）建议。',
	'When enabled IntelliSense shows `property`-suggestions.': '启用后，IntelliSense 会显示 `property`（属性）建议。',
	'When enabled IntelliSense shows `event`-suggestions.': '启用后，IntelliSense 会显示 `event`（事件）建议。',
	'When enabled IntelliSense shows `operator`-suggestions.': '启用后，IntelliSense 会显示 `operator`（运算符）建议。',
	'When enabled IntelliSense shows `unit`-suggestions.': '启用后，IntelliSense 会显示 `unit`（单元）建议。',
	'When enabled IntelliSense shows `value`-suggestions.': '启用后，IntelliSense 会显示 `value`（值）建议。',
	'When enabled IntelliSense shows `constant`-suggestions.': '启用后，IntelliSense 会显示 `constant`（常量）建议。',
	'When enabled IntelliSense shows `enum`-suggestions.': '启用后，IntelliSense 会显示 `enum`（枚举）建议。',
	'When enabled IntelliSense shows `enumMember`-suggestions.': '启用后，IntelliSense 会显示 `enumMember`（枚举成员）建议。',
	'When enabled IntelliSense shows `keyword`-suggestions.': '启用后，IntelliSense 会显示 `keyword`（关键字）建议。',
	'When enabled IntelliSense shows `text`-suggestions.': '启用后，IntelliSense 会显示 `text`（文本）建议。',
	'When enabled IntelliSense shows `color`-suggestions.': '启用后，IntelliSense 会显示 `color`（颜色）建议。',
	'When enabled IntelliSense shows `file`-suggestions.': '启用后，IntelliSense 会显示 `file`（文件）建议。',
	'When enabled IntelliSense shows `reference`-suggestions.': '启用后，IntelliSense 会显示 `reference`（引用）建议。',
	'When enabled IntelliSense shows `customcolor`-suggestions.': '启用后，IntelliSense 会显示 `customcolor`（自定义颜色）建议。',
	'When enabled IntelliSense shows `folder`-suggestions.': '启用后，IntelliSense 会显示 `folder`（文件夹）建议。',
	'When enabled IntelliSense shows `typeParameter`-suggestions.': '启用后，IntelliSense 会显示 `typeParameter`（类型参数）建议。',
	'When enabled IntelliSense shows `snippet`-suggestions.': '启用后，IntelliSense 会显示 `snippet`（代码片段）建议。',
	'When enabled IntelliSense shows `user`-suggestions.': '启用后，IntelliSense 会显示 `user`（用户）建议。',
	'When enabled IntelliSense shows `issues`-suggestions.': '启用后，IntelliSense 会显示 `issues`（问题）建议。',

	// ---- select / paste / multicursor ----
	'Whether leading and trailing whitespace should always be selected.': '是否总是选中首尾的空白字符。',
	"Whether subwords (like 'foo' in 'fooBar' or 'foo_bar') should be selected.":
		'是否选中子词（例如 \'fooBar\' 或 \'foo_bar\' 中的 \'foo\'）。',
	'Each cursor pastes a single line of the text.': '每个光标粘贴文本中的一行。',
	'Each cursor pastes the full text.': '每个光标粘贴完整文本。',
	'Controls pasting when the line count of the pasted text matches the cursor count.':
		'控制当粘贴文本的行数与光标数量一致时的粘贴行为。',
	'Controls the max number of cursors that can be in an active editor at once.':
		'控制活动编辑器中同时最多可存在多少个光标。',
	'Merge multiple cursors when they are overlapping.': '当多个光标重叠时将它们合并。',
	'Maps to `Control` on Windows and Linux and to `Command` on macOS.':
		'在 Windows 和 Linux 上映射为 `Control`，在 macOS 上映射为 `Command`。',
	'Maps to `Alt` on Windows and Linux and to `Option` on macOS.':
		'在 Windows 和 Linux 上映射为 `Alt`，在 macOS 上映射为 `Option`。',
	'Controls what happens when middle mouse button is clicked in the editor.':
		'控制在编辑器中点击鼠标中键时会发生什么。',
	'Controls whether pasting should overtype.': '控制粘贴时是否覆盖。',
	'Controls whether you can drag and drop a file into a text editor by holding down the `Shift` key (instead of opening the file in an editor).':
		'控制是否可以按住 `Shift` 键把文件拖放到文本编辑器中（而不是在编辑器中打开该文件）。',
	'Controls if a widget is shown when dropping files into the editor. This widget lets you control how the file is dropped.':
		'控制向编辑器拖放文件时是否显示选择小部件。该小部件让你决定文件的放置方式。',
	'Show the drop selector widget after a file is dropped into the editor.': '文件被拖放到编辑器后显示放置方式选择小部件。',
	'Never show the drop selector widget. Instead the default drop provider is always used.':
		'从不显示放置方式选择小部件，始终使用默认的放置处理方式。',
	'Controls whether you can paste content in different ways.': '控制是否可以按不同方式粘贴内容。',
	'Controls if a widget is shown when pasting content in to the editor. This widget lets you control how the file is pasted.':
		'控制向编辑器粘贴内容时是否显示选择小部件。该小部件让你决定内容的粘贴方式。',
	'Show the paste selector widget after content is pasted into the editor.': '内容被粘贴到编辑器后显示粘贴方式选择小部件。',
	'Never show the paste selector widget. Instead the default pasting behavior is always used.':
		'从不显示粘贴方式选择小部件，始终使用默认的粘贴行为。',

	// ---- auto closing ----
	'Editor content': '编辑器内容',
	'Use language configurations to determine when to autoclose brackets.': '使用语言配置来确定何时自动闭合括号。',
	'Autoclose brackets only when the cursor is to the left of whitespace.': '仅当光标位于空白字符左侧时才自动闭合括号。',
	'Controls whether the editor should automatically close brackets after the user adds an opening bracket.':
		'控制用户输入左括号后，编辑器是否自动补全右括号。',
	'Use language configurations to determine when to autoclose comments.': '使用语言配置来确定何时自动闭合注释。',
	'Autoclose comments only when the cursor is to the left of whitespace.': '仅当光标位于空白字符左侧时才自动闭合注释。',
	'Controls whether the editor should automatically close comments after the user adds an opening comment.':
		'控制用户输入注释起始符后，编辑器是否自动补全注释结束符。',
	'Remove adjacent closing quotes or brackets only if they were automatically inserted.':
		'仅当相邻的右引号或右括号是自动插入的时才将其移除。',
	'Controls whether the editor should remove adjacent closing quotes or brackets when deleting.':
		'控制删除时编辑器是否移除相邻的右引号或右括号。',
	'Type over closing quotes or brackets only if they were automatically inserted.':
		'仅当右引号或右括号是自动插入的，打键时才直接跳过它。',
	'Controls whether the editor should type over closing quotes or brackets.':
		'控制编辑器是否在输入右引号或右括号时直接跳过它们。',
	'Use language configurations to determine when to autoclose quotes.': '使用语言配置来确定何时自动闭合引号。',
	'Autoclose quotes only when the cursor is to the left of whitespace.': '仅当光标位于空白字符左侧时才自动闭合引号。',
	'Controls whether the editor should automatically close quotes after the user adds an opening quote.':
		'控制用户输入左引号后，编辑器是否自动补全右引号。',

	// ---- auto indent ----
	'The editor will not insert indentation automatically.': '编辑器不会自动插入缩进。',
	"The editor will keep the current line's indentation.": '编辑器将保持当前行的缩进。',
	"The editor will keep the current line's indentation and honor language defined brackets.":
		'编辑器将保持当前行的缩进，并遵循语言定义的括号规则。',
	"The editor will keep the current line's indentation, honor language defined brackets and invoke special onEnterRules defined by languages.":
		'编辑器将保持当前行的缩进，遵循语言定义的括号规则，并调用语言定义的特殊 onEnterRules。',
	'Controls whether the editor should automatically adjust the indentation when users type, paste, move or indent lines.':
		'控制用户输入、粘贴、移动或缩进行时，编辑器是否自动调整缩进。',
	'Controls whether the editor should automatically auto-indent the pasted content.':
		'控制编辑器是否自动为粘贴的内容添加缩进。',
	'Controls whether the editor should automatically auto-indent the pasted content when pasted within a string. This takes effect when autoIndentOnPaste is true.':
		'控制粘贴到字符串内部时编辑器是否自动为粘贴内容添加缩进。在 autoIndentOnPaste 为 true 时生效。',
	'Use language configurations to determine when to automatically surround selections.':
		'使用语言配置来确定何时自动为选中内容加上外围符号。',
	'Surround with quotes but not brackets.': '加引号，但不加括号。',
	'Surround with brackets but not quotes.': '加括号，但不加引号。',
	'Controls whether the editor should automatically surround selections when typing quotes or brackets.':
		'控制输入引号或括号时，编辑器是否自动为选中内容加上外围符号。',
	'Emulate selection behavior of tab characters when using spaces for indentation. Selection will stick to tab stops.':
		'在使用空格缩进时模拟制表符的选择行为。选中区域会吸附到制表位。',
	'Controls the indentation of wrapped lines.': '控制折行的缩进。',
	'No indentation. Wrapped lines begin at column 1.': '不缩进。折行从第 1 列开始。',
	'Wrapped lines get the same indentation as the parent.': '折行与父级保持相同缩进。',
	'Wrapped lines get +1 indentation toward the parent.': '折行相对父级多缩进 1 级。',
	'Wrapped lines get +2 indentation toward the parent.': '折行相对父级多缩进 2 级。',
	'Whether leading and trailing whitespace should always be selected.': '是否总是选中首尾的空白字符。',
	'Whether subwords (like \'foo\' in \'fooBar\' or \'foo_bar\') should be selected.':
		'是否选中子词（例如 \'fooBar\' 或 \'foo_bar\' 中的 \'foo\'）。',

	// ---- color decorators / selection ----
	'Controls whether the editor should render the inline color decorators and color picker.':
		'控制编辑器是否渲染内联颜色装饰器和颜色选择器。',
	'Make the color picker appear both on click and hover of the color decorator':
		'单击和悬停颜色装饰器时都显示颜色选择器',
	'Make the color picker appear on hover of the color decorator': '悬停颜色装饰器时显示颜色选择器',
	'Make the color picker appear on click of the color decorator': '单击颜色装饰器时显示颜色选择器',
	'Controls the condition to make a color picker appear from a color decorator.':
		'控制从颜色装饰器弹出颜色选择器的条件。',
	'Controls the max number of color decorators that can be rendered in an editor at once.':
		'控制一个编辑器中同时最多渲染多少个颜色装饰器。',
	'Enable that the selection with the mouse and keys is doing column selection.':
		'启用后，使用鼠标和按键进行选择时将进行列选择。',
	'Controls whether syntax highlighting should be copied into the clipboard.':
		'控制复制到剪贴板时是否带上语法高亮。',
	'Controls whether selections should have rounded corners.': '控制选中区域是否使用圆角。',
	'Controls whether double-clicking next to a bracket or quote selects the content inside.':
		'控制双击括号或引号旁边时是否选中其内部内容。',
	'Controls whether the editor should allow moving selections via drag and drop.':
		'控制是否允许通过拖放移动选中的内容。',
	'Controls whether the editor should detect links and make them clickable.':
		'控制编辑器是否检测链接并使其可点击。',
	'Controls whether the editor has linked editing enabled. Depending on the language, related symbols such as HTML tags, are updated while editing.':
		'控制是否启用编辑器的联动编辑。视语言而定，编辑时会同步更新相关符号（例如 HTML 标签）。',

	// ---- cursor / caret ----
	'Control the cursor animation style.': '控制光标动画样式。',
	'Smooth caret animation is disabled.': '平滑光标动画已禁用。',
	'Smooth caret animation is enabled only when the user moves the cursor with an explicit gesture.':
		'仅当用户通过明确的手势移动光标时，才启用平滑光标动画。',
	'Smooth caret animation is always enabled.': '始终启用平滑光标动画。',
	'Controls whether the smooth caret animation should be enabled.': '控制是否启用平滑光标动画。',
	'Controls the cursor style in insert input mode.': '控制插入输入模式下的光标样式。',
	'Controls the cursor style in overtype input mode.': '控制覆盖输入模式下的光标样式。',
	'`cursorSurroundingLines` is enforced only when triggered via the keyboard or API.':
		'`cursorSurroundingLines` 仅在通过键盘或 API 触发时才生效。',
	'`cursorSurroundingLines` is enforced always.': '`cursorSurroundingLines` 始终生效。',
	'Controls when `#editor.cursorSurroundingLines#` should be enforced.': '控制何时应用 `#editor.cursorSurroundingLines#`。',
	'Controls the width of the cursor when `#editor.cursorStyle#` is set to `line`.':
		'当 `#editor.cursorStyle#` 设为 `line` 时，控制光标的宽度。',
	'Controls the height of the cursor when `#editor.cursorStyle#` is set to `line`. Cursor\'s max height depends on line height.':
		'当 `#editor.cursorStyle#` 设为 `line` 时，控制光标的高度。光标的最大高度取决于行高。',
	'Controls whether the editor should allow moving selections via drag and drop.': '控制是否允许通过拖放移动选中的内容。',
	'Sets whether the EditContext API should be used instead of the text area to power input in the editor.':
		'设置是否改用 EditContext API（而非文本区域）为编辑器提供输入。',
	'Whether to render rich screen reader content when the `#editor.editContext#` setting is enabled.':
		'当 `#editor.editContext#` 启用时，是否渲染富文本的屏幕阅读器内容。',
	'A multiplier to be used on the `deltaX` and `deltaY` of mouse wheel scroll events.':
		'应用于鼠标滚轮滚动事件 `deltaX` 和 `deltaY` 的倍数。',
	'Zoom the font of the editor when using mouse wheel and holding `Cmd`.':
		'使用鼠标滚轮并按住 `Cmd` 时缩放编辑器字体。',
	'Zoom the font of the editor when using mouse wheel and holding `Ctrl`.':
		'使用鼠标滚轮并按住 `Ctrl` 时缩放编辑器字体。',
	'Scrolling speed multiplier when pressing `Alt`.': '按住 `Alt` 时的滚动速度倍数。',

	// ---- rendering ----
	'Use regular DOM-based rendering.': '使用常规的基于 DOM 的渲染。',
	'Use GPU acceleration.': '使用 GPU 加速。',
	'Controls whether to use the experimental GPU acceleration to render the editor.':
		'控制是否使用实验性的 GPU 加速来渲染编辑器。',
	'Use a new rendering method with svgs.': '使用基于 svg 的新渲染方法。',
	'Use a new rendering method with font characters.': '使用基于字体字符的新渲染方法。',
	'Use the stable rendering method.': '使用稳定的渲染方法。',
	'Controls whether whitespace is rendered with a new, experimental method.':
		'控制是否用新的实验性方法渲染空白字符。',
	'Controls whether the editor should render the vertical glyph margin. Glyph margin is mostly used for debugging.':
		'控制编辑器是否渲染字形边距。字形边距主要用于调试。',
	'Controls whether the editor should render control characters.': '控制编辑器是否渲染控制字符。',
	'Render full-width characters using the width defined by the font.':
		'使用字体定义的宽度渲染全角字符。',
	'Controls the width used to render full-width characters.': '控制渲染全角字符时使用的宽度。',
	'Controls whether the editor should automatically format the line after typing.':
		'控制输入后编辑器是否自动格式化该行。',

	// ---- folding ----
	'Controls whether the editor has code folding enabled.': '控制是否启用编辑器代码折叠。',
	'Use a language-specific folding strategy if available, else the indentation-based one.':
		'如果有特定语言的折叠策略则使用它，否则使用基于缩进的策略。',
	'Use the indentation-based folding strategy.': '使用基于缩进的折叠策略。',
	'Controls the strategy for computing folding ranges.': '控制计算折叠范围的策略。',
	'Controls whether the editor should highlight folded ranges.': '控制编辑器是否高亮已折叠的区域。',
	'Controls whether the editor automatically collapses import ranges.': '控制编辑器是否自动折叠 import 区域。',
	'Controls whether clicking on the empty content after a folded line will unfold the line.':
		'控制单击折叠行之后的空白内容时是否展开该行。',
	'Always show the folding controls.': '始终显示折叠控件。',
	'Never show the folding controls and reduce the gutter size.': '从不显示折叠控件，并缩小装订线宽度。',
	'Only show the folding controls when the mouse is over the gutter.': '仅当鼠标位于装订线上时显示折叠控件。',
	'Controls when the folding controls on the gutter are shown.': '控制装订线上的折叠控件何时显示。',
	'Controls fading out of unused code.': '控制未使用代码的淡出效果。',
	'Controls strikethrough deprecated variables.': '控制是否为已弃用的变量添加删除线。',
	'Controls whether the editor auto renames on type.': '控制编辑器是否在输入时自动重命名。',
	'Deprecated, use `#editor.linkedEditing#` instead.': '已弃用，请改用 `#editor.linkedEditing#`。',
	'Render last line number when the file ends with a newline.':
		'当文件以换行符结尾时，仍渲染最后一行的行号。',
	'Highlights both the gutter and the current line.': '同时高亮装订线和当前行。',
	'Controls how the editor should render the current line highlight.': '控制编辑器如何渲染当前行高亮。',
	'Controls if the editor should render the current line highlight only when the editor is focused.':
		'控制是否仅在编辑器获得焦点时才渲染当前行高亮。',

	// ---- current line / whitespace / scroll ----
	'Render whitespace characters except for single spaces between words.': '渲染空白字符，但词与词之间的单个空格除外。',
	'Render whitespace characters only on selected text.': '仅在选中的文本上渲染空白字符。',
	'Render only trailing whitespace characters.': '仅渲染行尾的空白字符。',
	'Controls how the editor should render whitespace characters.': '控制编辑器如何渲染空白字符。',
	'Controls the number of extra characters beyond which the editor will scroll horizontally.':
		'控制超出多少个字符后编辑器开始水平滚动。',
	'Controls whether the editor will scroll beyond the last line.': '控制编辑器是否可以滚动到最后一行之后。',
	'Controls whether the editor will scroll when the middle button is pressed.':
		'控制按下鼠标中键时编辑器是否滚动。',
	'Controls whether the Linux primary clipboard should be supported.': '控制是否支持 Linux 的主剪贴板。',
	'Controls whether the editor should highlight matches similar to the selection.':
		'控制编辑器是否高亮与选中内容相似的匹配项。',
	'Controls how many characters can be in the selection before similar matches are not highlighted. Set to zero for unlimited.':
		'控制选中内容超过多少个字符后不再高亮相似匹配。设为 0 表示不限制。',
	'Controls whether the editor should highlight selection matches that span multiple lines.':
		'控制编辑器是否高亮跨多行的选中匹配项。',
	'Use the Find widget\'s match case and whole word settings.':
		'使用查找小部件的「区分大小写」和「全字匹配」设置。',
	'Match occurrences case-sensitively and independently of the Find widget.':
		'区分大小写地匹配出现处，且独立于查找小部件的设置。',
	'Match occurrences case-insensitively and independently of the Find widget.':
		'不区分大小写地匹配出现处，且独立于查找小部件的设置。',
	'Controls whether occurrences should be highlighted across open files.':
		'控制是否在已打开的文件之间高亮所有出现处。',
	'Controls the delay in milliseconds after which occurrences are highlighted.':
		'控制高亮出现处之前的延迟（毫秒）。',
	'Does not highlight occurrences.': '不高亮出现处。',
	'Highlights occurrences only in the current file.': '仅在当前文件中高亮出现处。',
	'Experimental: Highlights occurrences across all valid open files.':
		'实验性功能：在所有有效的已打开文件中高亮出现处。',
	'Controls whether the editor will scroll using an animation.': '控制编辑器滚动时是否使用动画。',
	'Controls whether the editor will also delete the next line\'s indentation whitespace when deleting a newline.':
		'控制删除换行符时，编辑器是否也删除下一行的缩进空白。',
	'Controls whether allowing variable line heights in the editor.': '控制是否允许编辑器使用可变行高。',
	'Controls whether the editor should allow using variable fonts in the editor.':
		'控制编辑器是否允许使用可变字体。',
	'Controls whether the editor should allow using variable fonts in the editor in the accessibility mode.':
		'控制在无障碍模式下编辑器是否允许使用可变字体。',

	// ---- line endings / word separators ----
	'Unusual line terminators are automatically removed.': '自动移除异常的行尾符。',
	'Unusual line terminators are ignored.': '忽略异常的行尾符。',
	'Unusual line terminators prompt to be removed.': '提示是否移除异常的行尾符。',
	'Remove unusual line terminators that might cause problems.': '移除可能引发问题的异常行尾符。',
	'Spaces and tabs are inserted and deleted in alignment with tab stops.':
		'空格和制表符的插入与删除会与制表位对齐。',
	'Use the default line break rule.': '使用默认的换行规则。',
	'Word breaks should not be used for Chinese/Japanese/Korean (CJK) text. Non-CJK text behavior is the same as for normal.':
		'中日韩（CJK）文本不使用断词规则。非 CJK 文本的行为与正常情况相同。',
	'Controls the word break rules used for Chinese/Japanese/Korean (CJK) text.':
		'控制中日韩（CJK）文本使用的断词规则。',
	'Characters that will be used as word separators when doing word related navigations or operations.':
		'执行与单词相关的导航或操作时，用作单词分隔符的字符。',
	'Make scrolling inertial - mostly useful with touchpad on linux.':
		'启用惯性滚动 —— 在 Linux 上对触控板尤其有用。',
	'Controls whether the editor receives tabs or defers them to the workbench for navigation.':
		'控制 Tab 键由编辑器处理，还是交给工作台用于导航。',
};