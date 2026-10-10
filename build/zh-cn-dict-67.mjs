// Batch 67 — files.contribution.ts (16 unique) + editorOptions.ts (12 unique)
//
// The first settings file was previously untouched by any batch, so everything here
// is new. Three entries are multi-line (file nesting tokens, line height rules, and
// the wrapOnEscapedLineFeeds example with an embedded C code block) — the keys must
// reproduce the newlines and the fenced code exactly.
//
// The `#files.readonlyInclude#`-style tokens are Olympia's own setting references and
// must stay verbatim in the translation.
export default {
	'Hot exit will be triggered when the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu). All windows without folders opened will be restored upon next launch. A list of previously opened windows with unsaved files can be accessed via `File > Open Recent > More...`':
		'在 Windows/Linux 上最后一个窗口关闭之后，或触发 workbench.action.quit 命令时（命令面板、快捷键、菜单），将触发热退出。下次启动时会恢复所有未打开文件夹的窗口。可以通过「文件 > 打开最近使用的文件 > 更多...」查看此前打开过且含有未保存文件的窗口列表。',

	'Hot exit will be triggered when the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu), and also for any window with a folder opened regardless of whether it\'s the last window. All windows without folders opened will be restored upon next launch. A list of previously opened windows with unsaved files can be accessed via `File > Open Recent > More...`':
		'在 Windows/Linux 上最后一个窗口关闭之后，或触发 workbench.action.quit 命令时（命令面板、快捷键、菜单），以及对于任何打开了文件夹的窗口（无论它是否是最后一个窗口），都会触发热退出。下次启动时会恢复所有未打开文件夹的窗口。可以通过「文件 > 打开最近使用的文件 > 更多...」查看此前打开过且含有未保存文件的窗口列表。',

	'Configure [glob patterns](https://aka.ms/vscode-glob-patterns) for excluding files and folders. For example, the File Explorer decides which files and folders to show or hide based on this setting. Refer to the `#search.exclude#` setting to define search-specific excludes. Refer to the `#explorer.excludeGitIgnore#` setting for ignoring files based on your `.gitignore`.':
		'配置用于排除文件和文件夹的 [glob 模式](https://aka.ms/vscode-glob-patterns)。例如，资源管理器会根据此设置决定显示或隐藏哪些文件和文件夹。搜索专用的排除项请参阅 search.exclude 设置；依据 .gitignore 忽略文件请参阅 explorer.excludeGitIgnore 设置。',

	'Configure [glob patterns](https://aka.ms/vscode-glob-patterns) of file associations to languages (for example `"*.extension": "html"`). Patterns will match on the absolute path of a file if they contain a path separator and will match on the name of the file otherwise. These have precedence over the default associations of the languages installed.':
		'配置文件与语言之间关联关系的 [glob 模式](https://aka.ms/vscode-glob-patterns)（例如 "*.extension": "html"）。模式中若包含路径分隔符，则按文件的绝对路径匹配，否则按文件名匹配。这些关联的优先级高于已安装语言的默认关联。',

	'When enabled, the editor will attempt to guess the character set encoding when opening files. This setting can also be configured per language. Note, this setting is not respected by text search. Only {0} is respected.':
		'启用后，编辑器在打开文件时会尝试猜测其字符集编码。此设置也可以按语言分别配置。请注意，文本搜索不会遵循此设置，只有 {0} 遵循。',

	'List of character set encodings that the editor should attempt to guess. If guessing fails for non-UTF-8 content, a legacy encoding is used only if it is the only lossless match among the candidates. If no encoding can be determined, {0} is respected.':
		'编辑器应当尝试猜测的字符集编码列表。如果对非 UTF-8 内容的猜测失败，那么只有当某个旧式编码是候选中唯一无损匹配时才会采用它。如果无法确定编码，则遵循 {0}。',

	'When enabled, trailing whitespace will be removed from multiline strings and regexes on save or when executing \'editor.action.trimTrailingWhitespace\'. This can cause whitespace to not be trimmed from lines when there isn\'t up-to-date token information.':
		'启用后，保存时或执行「移除尾部空格」操作时，会把多行字符串和正则表达式中的尾部空白去掉。当没有最新的词法信息时，这可能导致某些行的空白没有被清除。',

	'When enabled, will limit [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors to files that have no errors reported in them at the time the auto save is triggered. Only applies when {0} is enabled.':
		'启用后，编辑器的[自动保存](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save)将仅限于在触发自动保存的那一刻没有报出任何错误的文件。仅在启用 {0} 后生效。',

	'Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to exclude from file watching. Paths can either be relative to the watched folder or absolute. Glob patterns are matched relative from the watched folder. When you experience the file watcher process consuming a lot of CPU, make sure to exclude large folders that are of less interest (such as build output folders).':
		'配置要从文件监视中排除的路径或 [glob 模式](https://aka.ms/vscode-glob-patterns)。路径既可以是相对于被监视文件夹的相对路径，也可以是绝对路径；glob 模式则始终相对于被监视文件夹进行匹配。如果你发现文件监视进程占用了大量 CPU，请确保把不太关心的大文件夹（例如构建输出目录）排除在外。',

	'Configure extra paths to watch for changes inside the workspace. By default, all workspace folders will be watched recursively, except for folders that are symbolic links. You can explicitly add absolute or relative paths to support watching folders that are symbolic links. Relative paths will be resolved to an absolute path using the currently opened workspace.':
		'配置需要额外监视其内部变化的工作区路径。默认情况下，所有工作区文件夹都会被递归监视，符号链接文件夹除外。你可以显式添加绝对路径或相对路径，以支持监视符号链接文件夹。相对路径会依据当前打开的工作区解析为绝对路径。',

	'Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to mark as read-only. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths. You can exclude matching paths via the `#files.readonlyExclude#` setting. Files from readonly file system providers will always be read-only independent of this setting.':
		'配置要标记为只读的路径或 [glob 模式](https://aka.ms/vscode-glob-patterns)。除非使用绝对路径，否则 glob 模式始终相对于工作区文件夹的路径进行求值。你可以通过 files.readonlyExclude 设置排除匹配的路径。来自只读文件系统提供程序的文件无论此设置如何都始终是只读的。',

	'Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to exclude from being marked as read-only if they match as a result of the `#files.readonlyInclude#` setting. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths. Files from readonly file system providers will always be read-only independent of this setting.':
		'配置要从只读标记中排除的路径或 [glob 模式](https://aka.ms/vscode-glob-patterns)，它们原先是因为匹配 files.readonlyInclude 设置而被标记的。除非使用绝对路径，否则 glob 模式始终相对于工作区文件夹的路径进行求值。来自只读文件系统提供程序的文件无论此设置如何都始终是只读的。',

	'A save conflict can occur when a file is saved to disk that was changed by another program in the meantime. To prevent data loss, the user is asked to compare the changes in the editor with the version on disk. This setting should only be changed if you frequently encounter save conflict errors and may result in data loss if used without caution.':
		'当某个文件在此期间已被其它程序修改、而你又把它保存到磁盘时，就可能发生保存冲突。为防止数据丢失，系统会请你比较编辑器中的改动与磁盘上的版本。只有当你经常遇到保存冲突错误时才应修改此设置，贸然使用它反而可能造成数据丢失。',

	'Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) for excluding files and folders from being revealed and selected in the Explorer when they are opened. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths.':
		'配置要从资源管理器的「打开时显示并选中」行为中排除的文件和文件夹路径或 [glob 模式](https://aka.ms/vscode-glob-patterns)。除非使用绝对路径，否则 glob 模式始终相对于工作区文件夹的路径进行求值。',

	'Controls whether the Explorer should render folders in a compact form. In such a form, single child folders will be compressed in a combined tree element. Useful for Java package structures, for example.':
		'控制资源管理器是否以紧凑形式呈现文件夹。在这种形式下，只有一个子项的文件夹会被压缩合并为一个树节点。例如这对于 Java 的包结构会很有用。',

	'Controls nesting of files in the Explorer. {0} must be set for this to take effect. Each __Item__ represents a parent pattern and may contain a single `*` character that matches any string. Each __Value__ represents a comma separated list of the child patterns that should be shown nested under a given parent. Child patterns may contain several special tokens:\n- `${capture}`: Matches the resolved value of the `*` from the parent pattern\n- `${basename}`: Matches the parent file\'s basename, the `file` in `file.ts`\n- `${extname}`: Matches the parent file\'s extension, the `ts` in `file.ts`\n- `${dirname}`: Matches the parent file\'s directory name, the `src` in `src/file.ts`\n- `*`:  Matches any string, may only be used once per child pattern':
		'控制资源管理器中的文件嵌套方式。必须设置 {0} 后才会生效。每个 __Item__ 表示一个父级模式，可以包含一个匹配任意字符串的 * 字符。每个 __Value__ 表示一组以英文逗号分隔的子级模式，它们会嵌套显示在对应父级之下。子级模式中可以包含以下特殊标记：\n- ${capture}：匹配父级模式中 * 解析得到的值\n- ${basename}：匹配父文件的基名，即 file.ts 中的 file\n- ${extname}：匹配父文件的扩展名，即 file.ts 中的 ts\n- ${dirname}：匹配父文件所在的目录名，即 src/file.ts 中的 src\n- *：匹配任意字符串，每个子级模式中只能使用一次。',

	// ------------------------------------------------------- editorOptions.ts
	"Configures font variations. Can be either a boolean to enable/disable the translation from font-weight to font-variation-settings or a string for the value of the CSS 'font-variation-settings' property.":
		'配置字体变体。它可以是一个布尔值，用于启用或禁用从 font-weight 到 font-variation-settings 的转换；也可以是一个字符串，表示 CSS 属性 font-variation-settings 的取值。',

	'Defines the model to use for determining which lines to stick. If the outline model does not exist, it will fall back on the folding provider model which falls back on the indentation model. This order is respected in all three cases.':
		'定义用于确定哪些行会被粘住的模型。如果大纲模型不存在，则回退到折叠提供程序模型，再回退到缩进模型。这三处都遵循同样的优先顺序。',

	'Controls the line height. \n - Use 0 to automatically compute the line height from the font size.\n - Values between 0 and 8 will be used as a multiplier with the font size.\n - Values greater than or equal to 8 will be used as effective values.':
		'控制行高。\n - 设为 0 时会根据字号自动计算行高。\n - 0 到 8 之间的取值会作为字号的倍数使用。\n - 大于或等于 8 的取值会直接作为有效值使用。',

	'Defines the regular expression used to find section headers in comments. The regex must contain a named match group `label` (written as `(?<label>.+)`) that encapsulates the section header, otherwise it will not work. Optionally you can include another match group named `separator`. Use \\n in the pattern to match multi-line headers.':
		'定义用于在注释中查找分节标题的正则表达式。该正则必须包含一个名为 label 的命名捕获组（写作 (?<label>.+)）来包裹分节标题，否则不会生效。你还可以选择性地加入另一个名为 separator 的捕获组。在模式中使用换行符可以匹配跨行的标题。',

	'Controls whether suggestions should automatically show up while typing. This can be controlled for typing in comments, strings, and other code. Quick suggestion can be configured to show as ghost text or with the suggest widget. Also be aware of the {0}-setting which controls if suggestions are triggered by special characters.':
		'控制输入时是否自动弹出建议。可以针对在注释、字符串等位置输入分别进行控制。快速建议可以配置为以虚影文字显示，或通过建议小工具显示。此外请留意 {0} 设置，它控制是否由特殊字符触发建议。',

	'Controls whether a suggestion is selected when the widget shows. Note that this only applies to automatically triggered suggestions ({0} and {1}) and that a suggestion is always selected when explicitly invoked, e.g via `Ctrl+Space`.':
		'控制建议小工具弹出时是否默认选中某条建议。请注意，这只适用于自动触发的建议（{0} 和 {1}）；如果是显式调用（例如通过 Ctrl+Space），则总会选中一条建议。',

	'When enabled IntelliSense filtering requires that the first character matches on a word start. For example, `c` on `Console` or `WebContext` but _not_ on `description`. When disabled IntelliSense will show more results but still sorts them by match quality.':
		'启用后，智能感知筛选要求首个字符在单词起始处匹配。例如在 Console 或 WebContext 上输入 c 可以匹配，但在 description 上则不行。禁用后，智能感知会显示更多结果，但仍会按匹配质量排序。',

	'Controls the number of lines in the editor that can be read out by a screen reader at once. When we detect a screen reader we automatically set the default to be 500. Warning: this has a performance implication for numbers larger than the default.':
		'控制屏幕阅读器一次可以朗读编辑器中的多少行。检测到屏幕阅读器时，我们会自动把默认值设为 500。警告：取值大于默认值会带来性能开销。',

	'Render full-width characters centered in exactly two character cells. Only applies to monospace fonts. Does not apply to multi codepoint full-width characters or to GPU rendering. This has a performance impact on line rendering.':
		'把全角字符渲染为正好占据两个字符单元格并居中显示。仅对等宽字体生效。不适用于由多个码点组成的全角字符，也不适用于 GPU 渲染。此项会对行渲染产生性能影响。',

	'The modifier to be used to add multiple cursors with the mouse. The Go to Definition and Open Link mouse gestures will adapt such that they do not conflict with the [multicursor modifier](https://code.visualstudio.com/docs/editor/codebasics#_multicursor-modifier).':
		'用来通过鼠标添加多个光标的修饰键。跳转到定义和打开链接的鼠标操作会相应调整，以免与[多光标修饰键](https://code.visualstudio.com/docs/editor/codebasics#_multicursor-modifier)冲突。',

	'Controls how occurrences of selected text are matched when selecting the next, previous, or all occurrences and when highlighting selection matches. `caseSensitive` and `caseInsensitive` match substrings independently of the Find widget. An empty selection always starts a whole-word, case-sensitive search.':
		'控制在选择下一个、上一个或全部匹配项以及高亮选中项时，如何匹配所选文本的出现位置。caseSensitive 与 caseInsensitive 独立于查找小工具来匹配子串。空选中项总是从区分大小写的整词搜索开始。',

	'Controls whether literal `\\n` shall trigger a wordWrap when `#editor.wordWrap#` is enabled.\n\nFor example:\n```c\nchar* str="hello\\nworld"\n```\nwill be displayed as\n```c\nchar* str="hello\\n\n           world"\n```':
		'控制启用自动换行时，字面形式的换行标记是否触发换行。\n\n例如：\n```c\nchar* str="hello\\nworld"\n```\n会显示为\n```c\nchar* str="hello\\n\n           world"\n```。',
};