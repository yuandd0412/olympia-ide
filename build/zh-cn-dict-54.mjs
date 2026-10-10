// Batch 54 — files / explorer (settings descriptions, context keys, view actions)
// Keys that contain an apostrophe use double-quoted JS strings.
// MS documentation links were dropped from settings descriptions: the fork ships as
// Olympia, and pointing users at code.visualstudio.com / aka.ms/vscode-* is wrong.
export default {
	// --- save errors ---
	"Failed to save '{0}': The content of the file is newer. Please compare your version with the file contents or overwrite the content of the file with your changes.":
		'保存 \'{0}\' 失败：文件内容已更新。请将你的版本与文件内容进行比较，或用你的更改覆盖文件内容。',
	"Failed to save '{0}': {1}": '保存 \'{0}\' 失败：{1}',

	// --- view icons / menu titles ---
	'View icon of the explorer view.': '资源管理器视图的视图图标。',
	'View icon of the open editors view.': '打开的编辑器视图的视图图标。',
	'&&Explorer': '资源管理器(&&E)',
	'&&New Text File': '新建文本文件(&&N)',
	'&&Save': '保存(&&S)',
	'Save &&As...': '另存为(&&A)...',
	'Save A&&ll': '全部保存(A&&L)',
	'A&&uto Save': '自动保存(A&&U)',
	'Re&&vert File': '还原文件(R&&V)',
	'&&Close Editor': '关闭编辑器(&&C)',
	'Go to &&File...': '转到文件(&&F)...',

	// --- bulk file operations ---
	'&&Move to Trash': '移到回收站(&&M)',
	'&&Delete': '删除(&&D)',
	'&&Delete Permanently': '永久删除(&&D)',
	'&&Retry': '重试(&&R)',
	'&&Paste': '粘贴(&&P)',
	'&&Move': '移动(&&M)',
	'Delete {0} files': '删除 {0} 个文件',
	'Delete {0}': '删除 {0}',
	'Deleting {0} files': '正在删除 {0} 个文件',
	'Deleting {0}': '正在删除 {0}',
	'Moving {0} files': '正在移动 {0} 个文件',
	'Moving {0}': '正在移动 {0}',
	'Move {0} files': '移动 {0} 个文件',
	'Move {0}': '移动 {0}',
	'Copying {0} files': '正在复制 {0} 个文件',
	'Copying {0}': '正在复制 {0}',
	'Paste {0} files': '粘贴 {0} 个文件',
	'Paste {0}': '粘贴 {0}',
	'Copy {0}': '复制 {0}',

	// --- import / export ---
	'Import {0}': '导入 {0}',
	'Import {0} resources': '导入 {0} 个资源',
	'Copying {0} resources': '正在复制 {0} 个资源',

	// --- hot exit ---
	'Disable hot exit. A prompt will show when attempting to close a window with editors that have unsaved changes.':
		'禁用热退出。关闭含有未保存更改的编辑器窗口时将弹出提示。',
	'[Hot Exit](https://aka.ms/vscode-hot-exit) controls whether unsaved files are remembered between sessions, allowing the save prompt when exiting the editor to be skipped.':
		'热退出控制是否在会话之间记住未保存的文件，从而在退出编辑器时跳过保存提示。',
	'Hot exit will be triggered when the browser quits or the window or tab is closed.':
		'当浏览器退出或窗口、标签页关闭时将触发热退出。',

	// --- auto save ---
	'An editor with changes is never automatically saved.': '有更改的编辑器永远不会被自动保存。',
	'An editor with changes is automatically saved after the configured `#files.autoSaveDelay#`.':
		'有更改的编辑器会在配置的 `#files.autoSaveDelay#` 之后自动保存。',
	'An editor with changes is automatically saved when the editor loses focus.':
		'编辑器失去焦点时会自动保存其更改。',
	'An editor with changes is automatically saved when the window loses focus.':
		'窗口失去焦点时会自动保存编辑器中的更改。',
	'Controls [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors that have unsaved changes.':
		'控制是否自动保存包含未保存更改的编辑器。',
	'Controls the delay in milliseconds after which an editor with unsaved changes is saved automatically. Only applies when `#files.autoSave#` is set to `{0}`.':
		'控制自动保存包含未保存更改的编辑器之前等待的毫秒数。仅当 `#files.autoSave#` 设为 `{0}` 时生效。',
	'When enabled, will limit [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors to files that are inside the opened workspace. Only applies when {0} is enabled.':
		'启用后，自动保存的范围将仅限于已打开工作区内的文件。仅当启用 {0} 时生效。',

	// --- new file / readonly / format on save ---
	'The default language identifier that is assigned to new files. If configured to `${activeEditorLanguage}`, will use the language identifier of the currently active text editor if any.':
		'分配给新文件的默认语言标识符。如果配置为 `${activeEditorLanguage}`，将使用当前活动文本编辑器的语言标识符（如果有）。',
	'Marks files as read-only when their file permissions indicate as such. This can be overridden via `#files.readonlyInclude#` and `#files.readonlyExclude#` settings.':
		'当文件权限表明为只读时，将文件标记为只读。可通过 `#files.readonlyInclude#` 和 `#files.readonlyExclude#` 设置覆盖。',
	'Format a file on save. A formatter must be available and the editor must not be shutting down. When {0} is set to `afterDelay`, the file will only be formatted when saved explicitly.':
		'保存时格式化文件。必须存在可用的格式化程序，且编辑器不处于关闭过程中。当 {0} 设为 `afterDelay` 时，仅在显式保存时才会格式化文件。',
	'Format the whole file.': '格式化整个文件。',
	"Format modifications. Requires source control and a formatter that supports 'Format Selection'.":
		'仅格式化修改部分。需要源代码管理，以及支持 \'格式化所选内容\' 的格式化程序。',
	"Will attempt to format modifications only (requires source control and a formatter that supports 'Format Selection'). If source control can't be used, then the whole file will be formatted.":
		'仅尝试格式化修改部分（需要源代码管理，以及支持 \'格式化所选内容\' 的格式化程序）。如果无法使用源代码管理，则会格式化整个文件。',

	// --- open editors pane ---
	'The initial maximum number of editors shown in the Open Editors pane. Exceeding this limit will show a scroll bar and allow resizing the pane to display more items.':
		'"打开的编辑器"窗格初始显示的编辑器最大数量。超出该限制将显示滚动条，并允许调整窗格大小以显示更多项。',
	'The minimum number of editor slots pre-allocated in the Open Editors pane. If set to 0 the Open Editors pane will dynamically resize based on the number of editors.':
		'在"打开的编辑器"窗格中预先分配的编辑器槽位最小数量。如果设为 0，该窗格将根据编辑器数量动态调整大小。',
	'Controls the sorting order of editors in the Open Editors pane.': '控制"打开的编辑器"窗格中编辑器的排序方式。',
	'Editors are ordered in the same order editor tabs are shown.': '编辑器按标签页显示的顺序排列。',
	'Editors are ordered alphabetically by tab name inside each editor group.': '在每个编辑器组内，编辑器按标签页名称的字母顺序排列。',
	'Editors are ordered alphabetically by full path inside each editor group.': '在每个编辑器组内，编辑器按完整路径的字母顺序排列。',

	// --- auto reveal ---
	'Files will be revealed and selected.': '将显示并选中对应文件。',
	'Files will not be revealed and selected.': '不会显示并选中对应文件。',
	'Files will not be scrolled into view, but will still be focused.': '不会将文件滚动到可视区域，但仍会获得焦点。',
	'Additional check on the siblings of a matching file. Use {0} as variable for the matching file name.':
		'对匹配文件的同级文件进行额外检查。使用 {0} 变量表示匹配的文件名。',

	// --- confirm / undo ---
	'Controls whether the Explorer should ask for confirmation when deleting files and folders.':
		'控制删除文件和文件夹时资源管理器是否要求确认。',
	'Controls whether the Explorer should support undoing file and folder operations.':
		'控制资源管理器是否支持撤销文件和文件夹操作。',
	'Controls whether the Explorer should ask for confirmation when undoing.':
		'控制撤销操作时资源管理器是否要求确认。',
	'Explorer will prompt before all undo operations.': '所有撤销操作前资源管理器都会提示。',
	'Explorer will prompt before destructive undo operations.': '破坏性撤销操作前资源管理器会提示。',
	'Explorer will not prompt before undo operations when focused.': '获得焦点时，资源管理器在撤销操作前不会提示。',

	// --- explorer sorting ---
	'Controls whether the Explorer should expand multi-root workspaces containing only one folder during initialization':
		'控制资源管理器初始化时是否展开只包含一个文件夹的多根工作区',
	'Files and folders are sorted by their names. Folders are displayed before files.':
		'文件和文件夹按名称排序。文件夹显示在文件之前。',
	'Files and folders are sorted by their names. Files are interwoven with folders.':
		'文件和文件夹按名称排序。文件与文件夹交错排列。',
	'Files and folders are sorted by their names. Files are displayed before folders.':
		'文件和文件夹按名称排序。文件显示在文件夹之前。',
	'Files and folders are grouped by extension type then sorted by their names. Folders are displayed before files.':
		'文件和文件夹先按扩展名类型分组，再按名称排序。文件夹显示在文件之前。',
	'Files and folders are sorted by last modified date in descending order. Folders are displayed before files.':
		'文件和文件夹按最后修改日期降序排列。文件夹显示在文件之前。',
	'Files and folders are sorted by their names. Folders are displayed before files. Files with nested children are displayed before other files.':
		'文件和文件夹按名称排序。文件夹显示在文件之前。含有嵌套子项的文件显示在其他文件之前。',
	'Controls the property-based sorting of files and folders in the Explorer. When `#explorer.fileNesting.enabled#` is enabled, also controls sorting of nested files.':
		'控制资源管理器中基于属性的文件和文件夹排序方式。启用 `#explorer.fileNesting.enabled#` 时，同时控制嵌套文件的排序。',
	'Uppercase and lowercase names are mixed together.': '大写和小写名称混合排列。',
	'Uppercase names are grouped together before lowercase names.': '大写名称分组排列在小写名称之前。',
	'Lowercase names are grouped together before uppercase names.': '小写名称分组排列在大写名称之前。',
	'Names are sorted in Unicode order.': '按 Unicode 顺序排列名称。',
	'Controls the lexicographic sorting of file and folder names in the Explorer.':
		'控制资源管理器中文件和文件夹名称的字典序排序方式。',
	'Controls whether the file and folder sort order, should be reversed.':
		'控制是否反转文件和文件夹的排序顺序。',

	// --- decorations / incremental naming / nesting ---
	'Controls whether file decorations should use colors.': '控制文件装饰是否使用颜色。',
	'Controls whether file decorations should use badges.': '控制文件装饰是否使用徽章。',
	'Appends the word "copy" at the end of the duplicated name potentially followed by a number.':
		'在复制后的名称末尾追加 \'copy\' 一词，可能还会追加一个数字。',
	'Adds a number at the end of the duplicated name. If some number is already part of the name, tries to increase that number.':
		'在复制后的名称末尾添加一个数字。如果名称中已含有数字，则尝试增大该数字。',
	'Disables incremental naming. If two files with the same name exist you will be prompted to overwrite the existing file.':
		'禁用增量命名。如果已存在两个同名文件，将提示你覆盖已有文件。',
	'Controls which naming strategy to use when giving a new name to a duplicated Explorer item on paste.':
		'控制粘贴时为重复的资源管理器项命名所采用的策略。',
	'Controls whether the Explorer should automatically open a file when it is dropped into the explorer':
		'控制将文件拖放到资源管理器时是否自动打开',
	'The path separation character used when copying relative file paths.':
		'复制相对文件路径时使用的路径分隔符。',
	'The path separation character used when copying file paths.': '复制文件路径时使用的路径分隔符。',
	'Controls whether entries in .gitignore should be parsed and excluded from the Explorer. Similar to {0}.':
		'控制是否解析 .gitignore 中的条目并将其从资源管理器中排除。与 {0} 类似。',
	'Controls whether file nesting is enabled in the Explorer. File nesting allows for related files in a directory to be visually grouped together under a single parent file.':
		'控制资源管理器中是否启用文件嵌套。文件嵌套可以将目录下的相关文件在视觉上归组到同一个父文件下。',
	'Controls whether file nests are automatically expanded. {0} must be set for this to take effect.':
		'控制是否自动展开文件嵌套。需设置 {0} 才能生效。',
	'Each key pattern may contain a single `*` character which will match any string.':
		'每个键的模式最多可包含一个 `*` 字符，它将匹配任意字符串。',

	// --- decorations provider ---
	'Unable to resolve workspace folder ({0})': '无法解析工作区文件夹（{0}）',
	'Symbolic Link': '符号链接',
	'Unknown File Type': '未知文件类型',

	// --- explorer view actions ---
	'Explorer Section: {0}': '资源管理器分区：{0}',
	'Refresh Explorer': '刷新资源管理器',
	'Forces a refresh of the Explorer.': '强制刷新资源管理器。',
	'Collapse Folders in Explorer': '折叠资源管理器中的文件夹',
	'Folds all folders in the Explorer.': '折叠资源管理器中的所有文件夹。',
	'Files Explorer': '文件资源管理器',
	'Directory contains {0} matches': '该目录包含 {0} 处匹配',
	'Type file name. Press Enter to confirm or Escape to cancel.': '输入文件名。按 Enter 确认，按 Esc 取消。',
	'Are you sure you want to change the order of multiple root folders in your workspace?':
		'确定要更改工作区中多个根文件夹的顺序吗？',
	"Are you sure you want to move the following {0} files into '{1}'?":
		'确定要将以下 {0} 个文件移动到 \'{1}\' 中吗？',
	"Are you sure you want to change the order of root folder '{0}' in your workspace?":
		'确定要更改工作区中根文件夹 \'{0}\' 的顺序吗？',
	"Are you sure you want to move '{0}' into '{1}'?": '确定要将 \'{0}\' 移动到 \'{1}\' 中吗？',
	'{0} folders': '{0} 个文件夹',

	// --- open editors view ---
	'Open Unsaved Editor': '打开未保存的编辑器',
	'{0} unsaved': '{0} 个未保存',
	'{0} unsaved, open unsaved editor': '{0} 个未保存，打开未保存的编辑器',
	'Toggle Vertical/Horizontal Editor Layout': '切换编辑器垂直/水平布局',
	'Flip Layout': '翻转布局',
	'Flip &&Layout': '翻转布局(&&L)',

	// --- workspace watcher errors ---
	'Unable to watch for file changes. Please follow the instructions link to resolve this issue.':
		'无法监视文件更改。请按照说明链接解决此问题。',
	'File changes watcher stopped unexpectedly. A reload of the window may enable the watcher again unless the workspace cannot be watched for file changes.':
		'文件更改监视器意外停止。重新加载窗口可能会重新启用监视器，除非该工作区本身无法监视文件更改。',

	// --- dirty file indicator ---
	'1 unsaved file': '1 个未保存文件',
	'{0} unsaved files': '{0} 个未保存文件',

	// --- context keys ---
	'True when the EXPLORER viewlet is visible.': '当资源管理器视图可见时为 true。',
	'True when the FOLDERS view (the file tree within the explorer view container) is visible.':
		'当"文件夹"视图（资源管理器视图容器内的文件树）可见时为 true。',
	'True when the focused item in the EXPLORER is a folder.': '当资源管理器中聚焦的项是文件夹时为 true。',
	'True when the focused item in the EXPLORER is read-only.': '当资源管理器中聚焦的项为只读时为 true。',
	"True when the focused item in the EXPLORER's parent is read-only.":
		'当资源管理器中聚焦项的父级为只读时为 true。',
	'True when the focused item in the EXPLORER is a root folder.': '当资源管理器中聚焦的项是根文件夹时为 true。',
	'True when an item in the EXPLORER has been cut for cut and paste.': '当资源管理器中的某项已被剪切以供剪切粘贴时为 true。',
	'True when the focused item in the EXPLORER can be moved to trash.': '当资源管理器中聚焦的项可以移到回收站时为 true。',
	'True when the focus is inside the EXPLORER view.': '当焦点位于资源管理器视图内时为 true。',
	'True when the focus is inside the OPEN EDITORS view.': '当焦点位于"打开的编辑器"视图内时为 true。',
	'True when the focus is inside the EXPLORER viewlet.': '当焦点位于资源管理器视图内时为 true。',
	'True when a workspace in the EXPLORER view has some collapsible root child.':
		'当资源管理器视图中的某个工作区存在可折叠的根子项时为 true。',
	'True when the explorer tree is using the explorer find provider.': '当资源管理器树正在使用资源管理器查找提供程序时为 true。',
	'True when the focused item in the EXPLORER view is a compact item.': '当资源管理器视图中聚焦的项是紧凑项时为 true。',
	"True when the focus is inside a compact item's first part in the EXPLORER view.":
		'当焦点位于资源管理器视图中某个紧凑项的第一部分时为 true。',
	"True when the focus is inside a compact item's last part in the EXPLORER view.":
		'当焦点位于资源管理器视图中某个紧凑项的最后一部分时为 true。',

	// --- OS integration ---
	'Reveal in File Explorer': '在文件资源管理器中显示',
	'Reveal in Finder': '在访达中显示',
	'Open Containing Folder': '打开所在的文件夹',
};