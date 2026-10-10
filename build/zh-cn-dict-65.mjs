// Batch 65 — workbench/browser/workbench.contribution.ts (31 remaining)
//
// The first batch written after the extract-batch.mjs 200-char cap was removed, so
// this file also picks up ~25 descriptions that earlier batches could never have seen
// (the long editor-label / local-history / preview-mode paragraphs).
//
// Keys containing an apostrophe use double-quoted JS strings.
export default {
	'Configure the browser to use for opening http or https links externally. This can either be the name of the browser (`edge`, `chrome`, `firefox`) or an absolute path to the browser\'s executable. Will use the system default if not set.':
		'配置用于在外部打开 http 或 https 链接的浏览器。可以是浏览器名称（edge、chrome、firefox），也可以是浏览器可执行文件的绝对路径。若未设置，则使用系统默认浏览器。',

	'Controls whether scrolling over tabs will open them or not. By default tabs will only reveal upon scrolling, but not open. You can press and hold the Shift-key while scrolling to change this behavior for that duration. This value is ignored when {0} is not set to {1}.':
		'控制在标签页上滚动是否会打开它们。默认情况下，在标签页上滚动只会显示相邻标签页，而不会打开它们。你可以在滚动时按住 Shift 键，以在该时段内改变这一行为。当 {0} 不等于 {1} 时，此设置将被忽略。',

	'Controls the rendering of the editor label. Each __Item__ is a pattern that matches a file path. Both relative and absolute file paths are supported. The relative path must include the WORKSPACE_FOLDER (e.g `WORKSPACE_FOLDER/src/**.tsx` or `*/src/**.tsx`). Absolute patterns must start with a `/`. In case multiple patterns match, the longest matching path will be picked. Each __Value__ is the template for the rendered editor when the __Item__ matches. Variables are substituted based on the context:':
		'控制编辑器标签的渲染方式。每个 __Item__ 都是一个匹配文件路径的模式，同时支持相对路径和绝对路径。相对路径必须包含 WORKSPACE_FOLDER（例如 WORKSPACE_FOLDER/src/**.tsx 或 */src/**.tsx）。绝对路径模式必须以 / 开头。若有多个模式同时匹配，将选择匹配路径最长的那个。每个 __Value__ 是当 __Item__ 匹配时用于渲染编辑器标签的模板，其中的变量会根据上下文进行替换：',

	'`${dirname(N)}`: name of the nth parent folder in which the file is located (e.g. `N=2: WORKSPACE_FOLDER/static/folder/file.txt -> WORKSPACE_FOLDER`). Folders can be picked from the start of the path by using negative numbers (e.g. `N=-1: WORKSPACE_FOLDER/folder/file.txt -> WORKSPACE_FOLDER`). If the __Item__ is an absolute pattern path, the first folder (`N=-1`) refers to the first folder in the absolute path, otherwise it corresponds to the workspace folder.':
		'`${dirname(N)}`：文件所在的第 n 级父文件夹的名称（例如 N=2: WORKSPACE_FOLDER/static/folder/file.txt -> WORKSPACE_FOLDER）。可以使用负数从路径开头处选取文件夹（例如 N=-1: WORKSPACE_FOLDER/folder/file.txt -> WORKSPACE_FOLDER）。如果 __Item__ 是绝对路径模式，那么第一个文件夹（N=-1）指的是绝对路径中的第一个文件夹，否则对应工作区文件夹。',

	'`${extname(N)}`: the nth extension of the file separated by \'.\' (e.g. `N=2: WORKSPACE_FOLDER/folder/file.ext1.ext2.ext3 -> ext1`). Extension can be picked from the start of the extension by using negative numbers (e.g. `N=-1: WORKSPACE_FOLDER/folder/file.ext1.ext2.ext3 -> ext2`).':
		'`${extname(N)}`：文件以英文句点分隔的第 n 个扩展名（例如 N=2: WORKSPACE_FOLDER/folder/file.ext1.ext2.ext3 -> ext1）。可以使用负数从扩展名开头处选取（例如 N=-1: WORKSPACE_FOLDER/folder/file.ext1.ext2.ext3 -> ext2）。',

	'Show the name of the file. When tabs are enabled and two files have the same name in one group the distinguishing sections of each file\'s path are added. When tabs are disabled, the path relative to the workspace folder is shown if the editor is active.':
		'显示文件名。启用标签页后，如果同一组中有两个同名文件，则会附加各自路径中用于区分的部分。禁用标签页时，如果编辑器处于活动状态，则会显示相对于工作区文件夹的路径。',

	'The name of the untitled file is derived from the contents of its first line unless it has an associated file path. It will fallback to the name in case the line is empty or contains no word characters.':
		'未命名文件的名称取自其第一行的内容，除非该文件已关联到某个文件路径。如果该行为空或不含单词字符，则会回退为使用名称本身。',

	'Controls whether the language in a text editor is automatically detected unless the language has been explicitly set by the language picker. This can also be scoped by language so you can specify which languages you do not want to be switched off of. This is useful for languages like Markdown that often contain other languages that might trick language detection into thinking it\'s the embedded language and not Markdown.':
		'控制文本编辑器中的语言是否会被自动检测，除非该语言已通过语言选择器显式设置。也可以按语言分别配置，以便指定哪些语言不需要关闭自动检测。这对于 Markdown 这类经常内嵌其它语言的语言很有用，因为内嵌内容可能会让语言检测误以为当前是内嵌的那种语言，而不是 Markdown。',

	'Enables use of editor history in language detection. This causes automatic language detection to favor languages that have been recently opened and allows for automatic language detection to operate with smaller inputs.':
		'允许在语言检测中利用编辑器历史记录。这会让自动语言检测更偏向最近打开过的语言，并且使自动检测在较小的输入上也能正常工作。',

	"Controls whether preview mode is used when editors open. There is a maximum of one preview mode editor per editor group. This editor displays its filename in italics on its tab or title label and in the Open Editors view. Its contents will be replaced by the next editor opened in preview mode. Making a change in a preview mode editor will persist it, as will a double-click on its label, or the 'Keep Open' option in its label context menu. Opening a file from Explorer with a double-click persists its editor immediately.":
		'控制打开编辑器时是否使用预览模式。每个编辑器组最多只能存在一个处于预览模式的编辑器。该编辑器会在标签页、标题标签以及已打开的编辑器视图中以斜体显示其文件名。其内容会被下一个以预览模式打开的编辑器替换。在预览模式的编辑器中做出修改会将其持久保留，双击它的标签、或在它的标签右键菜单中选择「保持打开」也一样。从资源管理器中双击打开文件会立即保留对应的编辑器。',

	'Controls whether editors opened from Quick Open show as preview editors. Preview editors do not stay open, and are reused until explicitly set to be kept open (via double-click or editing). When enabled, hold Ctrl before selection to open an editor as a non-preview. This value is ignored when {0} is not set to {1}.':
		'控制从快速打开中打开的编辑器是否显示为预览编辑器。预览编辑器不会保持打开，会被反复复用，直到通过双击或编辑显式将其设为保持打开。启用后，在选择前按住 Ctrl 可以非预览方式打开编辑器。当 {0} 不等于 {1} 时，此设置将被忽略。',

	'Controls whether editors remain in preview when a code navigation is started from them. Preview editors do not stay open, and are reused until explicitly set to be kept open (via double-click or editing). This value is ignored when {0} is not set to {1}.':
		'控制从编辑器启动代码导航时，该编辑器是否仍保持预览状态。预览编辑器不会保持打开，会被反复复用，直到通过双击或编辑显式将其设为保持打开。当 {0} 不等于 {1} 时，此设置将被忽略。',

	'Controls whether editors showing a file that was opened during the session should close automatically when getting deleted or renamed by some other process. Disabling this will keep the editor open  on such an event. Note that deleting from within the application will always close the editor and that editors with unsaved changes will never close to preserve your data.':
		'控制显示文件的编辑器，在该文件被其它进程删除或重命名时是否自动关闭。禁用后，遇到此类事件时编辑器会保持打开。请注意，在应用程序内部删除文件始终会关闭对应的编辑器，而存在未保存更改的编辑器则永远不会关闭，以保护你的数据。',

	'Controls the default direction of editors that are opened side by side (for example, from the Explorer). By default, editors will open on the right hand side of the currently active one. If changed to `down`, the editors will open below the currently active one. This also impacts the split editor action in the editor toolbar.':
		'控制并排打开的编辑器（例如从资源管理器中打开时）的默认方向。默认情况下，编辑器会打开在当前活动编辑器的右侧。如果改为 down，则编辑器会打开在当前活动编辑器的下方。这也会影响编辑器工具栏中的拆分编辑器操作。',

	'Controls whether an editor is revealed in any of the visible groups if opened. If disabled, an editor will prefer to open in the currently active editor group. If enabled, an already opened editor will be revealed instead of opened again in the currently active editor group. Note that there are some cases where this setting is ignored, such as when forcing an editor to open in a specific group or to the side of the currently active group.':
		'控制打开某个编辑器时，如果它在任一可见的组中已经打开，是否将其显示出来。禁用时，编辑器会优先在当前活动的编辑器组中打开。启用时，已经打开的编辑器会被直接显示，而不是在当前活动的编辑器组中重复打开。请注意，有些情况下此设置会被忽略，例如强制在指定组中打开编辑器，或强制在当前活动组的侧边打开时。',

	'Restores the last editor view state (such as scroll position) when re-opening editors after they have been closed. Editor view state is stored per editor group and discarded when a group closes. Use the {0} setting to use the last known view state across all editor groups in case no previous view state was found for a editor group.':
		'在编辑器被关闭后重新打开时，恢复它上一次的编辑器视图状态（例如滚动位置）。编辑器视图状态按编辑器组分别存储，并在该组关闭时被丢弃。如果某个编辑器组没有找到先前的视图状态，可以使用 {0} 设置，以跨所有编辑器组沿用最后一次已知的视图状态。',

	'Controls whether local file history is enabled. When enabled, the file contents of an editor that is saved will be stored to a backup location to be able to restore or review the contents later. Changing this setting has no effect on existing local file history entries.':
		'控制是否启用本地文件历史记录。启用后，已保存的编辑器内容会被存储到备份位置，以便日后恢复或查阅。修改此设置不会影响已有的本地文件历史记录条目。',

	'Controls the maximum size of a file (in KB) to be considered for local file history. Files that are larger will not be added to the local file history. Changing this setting has no effect on existing local file history entries.':
		'控制多大的文件（以 KB 为单位）才纳入本地文件历史记录。超过该大小的文件不会被加入本地文件历史记录。修改此设置不会影响已有的本地文件历史记录条目。',

	'Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) for excluding files from the local file history. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths. Changing this setting has no effect on existing local file history entries.':
		'配置要从本地文件历史记录中排除的文件路径或 [glob 模式](https://aka.ms/vscode-glob-patterns)。除非使用绝对路径，否则 glob 模式始终相对于工作区文件夹的路径进行求值。修改此设置不会影响已有的本地文件历史记录条目。',

	'Configure an interval in seconds during which the last entry in local file history is replaced with the entry that is being added. This helps reduce the overall number of entries that are added, for example when auto save is enabled. This setting is only applied to entries that have the same source of origin. Changing this setting has no effect on existing local file history entries.':
		'配置一个以秒为单位的时间间隔，在该间隔内本地文件历史记录的最后一条记录会被新加入的记录替换。这有助于减少新增记录的总量，例如在启用自动保存时。此设置仅对来源相同的记录生效。修改此设置不会影响已有的本地文件历史记录条目。',

	'Controls the delay in milliseconds after which the hover is shown for workbench items (ex. some extension provided tree view items). Already visible items may require a refresh before reflecting this setting change.':
		'控制工作台项（例如某些扩展提供的树视图项）在悬停后延迟多少毫秒才显示悬停提示。已经显示出来的项目可能需要刷新后才会反映这一设置的变化。',

	'Controls whether the Modern UI Update is enabled. When on, the side bars and bottom panel are shown as floating cards with rounded corners and gaps, and a set of refreshed workbench styles is applied, matching the Agents window design.':
		'控制是否启用新式界面。启用后，侧边栏和底部面板会以带圆角和间距的浮动卡片形式显示，并应用一套全新的工作台样式，与智能体窗口的设计保持一致。',

	"Control the visibility of the menu bar. A setting of 'toggle' means that the menu bar is hidden and executing `Focus Application Menu` will show it. A setting of 'compact' will move the menu into the side bar.":
		'控制菜单栏的可见性。设置为 toggle 表示菜单栏处于隐藏状态，执行「聚焦应用程序菜单」将显示它。设置为 compact 则会把菜单移入侧边栏。',

	"Control the visibility of the menu bar. A setting of 'toggle' means that the menu bar is hidden and a single press of the Alt key will show it. A setting of 'compact' will move the menu into the side bar.":
		'控制菜单栏的可见性。设置为 toggle 表示菜单栏处于隐藏状态，按一次 Alt 键将显示它。设置为 compact 则会把菜单移入侧边栏。',

	'Controls whether files should open in a new window when using a command line or file dialog.\nNote that there can still be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).':
		'控制在使用命令行或文件对话框时，文件是否应该在新窗口中打开。\n请注意，仍然存在一些会忽略此设置的情况（例如使用了 --new-window 或 --reuse-window 命令行选项时）。',

	'Controls whether folders should open in a new window or replace the last active window.\nNote that there can still be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).':
		'控制文件夹应该在新窗口中打开，还是替换最后一个活动窗口。\n请注意，仍然存在一些会忽略此设置的情况（例如使用了 --new-window 或 --reuse-window 命令行选项时）。',

	'Controls whether to show a confirmation dialog before closing the browser tab or window. Note that even if enabled, browsers may still decide to close a tab or window without confirmation and that this setting is only a hint that may not work in all cases.':
		'控制关闭浏览器标签页或窗口之前是否显示确认对话框。请注意，即使启用了此设置，浏览器仍可能在不确认的情况下关闭标签页或窗口，并且此设置只是一种提示，在所有情况下都不一定生效。',
};