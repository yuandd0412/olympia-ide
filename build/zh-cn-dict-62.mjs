// Batch 62 — workbench.contribution.ts: every workbench-level setting description
// shown in Settings UI (title bar, tabs, density, activity bar, panels, window title
// variables, menu bar, hover/motion/transparency).
// Keys containing an apostrophe use double-quoted JS strings.
export default {
	// --- title bar / scrollbars / tabs ---
	'The default size.': '默认大小。',
	'Increases the size, so it can be grabbed more easily with the mouse.':
		'增大尺寸，以便更容易用鼠标抓取。',
	'Controls the height of the scrollbars used for tabs and breadcrumbs in the editor title area.':
		'控制编辑器标题区域中用于标签页和导航头的滚动条高度。',
	'Controls the visibility of the scrollbars used for tabs and breadcrumbs in the editor title area.':
		'控制编辑器标题区域中用于标签页和导航头的滚动条可见性。',
	'Controls whether opened editors should show as individual tabs, one single large tab or if the title area should not be shown.':
		'控制已打开的编辑器是显示为多个独立标签页、合并为一个大标签页，还是不显示标题区域。',

	// --- editor actions location ---
	'Show editor actions in the window title bar when {0} is set to {1}. Otherwise, editor actions are shown in the editor tab bar.':
		'当 {0} 设为 {1} 时，在窗口标题栏中显示编辑器操作；否则编辑器操作显示在编辑器标签栏中。',
	'Show editor actions in the window title bar. If {0} is set to {1}, editor actions are hidden.':
		'在窗口标题栏中显示编辑器操作。若 {0} 设为 {1}，则隐藏编辑器操作。',
	'Editor actions are not shown.': '不显示编辑器操作。',
	'Controls where the editor actions are shown.': '控制编辑器操作的显示位置。',
	'Controls whether to always show the editor actions, even when the editor group is not active.':
		'控制是否始终显示编辑器操作，即使编辑器组未处于活动状态。',

	// --- tab appearance ---
	"Controls whether tabs should be wrapped over multiple lines when exceeding available space or whether a scrollbar should appear instead. This value is ignored when {0} is not set to '{1}'.":
		'控制标签页超出可用空间时是换行显示还是显示滚动条。当 {0} 不为 \'{1}\' 时该设置无效。',
	'Controls whether a top border is drawn on tabs for editors that have unsaved changes. This value is ignored when {0} is not set to {1}.':
		'控制是否为包含未保存更改的编辑器标签页绘制顶部边框。当 {0} 不为 {1} 时该设置无效。',
	'Controls whether editor file decorations should use badges.': '控制编辑器文件装饰是否使用徽章。',
	'Controls whether editor file decorations should use colors.': '控制编辑器文件装饰是否使用颜色。',

	// --- custom editor labels ---
	'Controls whether the custom workbench editor labels should be applied.': '控制是否应用自定义的工作台编辑器标签。',
	'`${dirname}`: name of the folder in which the file is located (e.g. `WORKSPACE_FOLDER/folder/file.txt -> folder`).':
		'`${dirname}`：文件所在文件夹的名称（例如 `WORKSPACE_FOLDER/folder/file.txt -> folder`）。',
	'`${filename}`: name of the file without the file extension (e.g. `WORKSPACE_FOLDER/folder/file.txt -> file`).':
		'`${filename}`：不含扩展名的文件名（例如 `WORKSPACE_FOLDER/folder/file.txt -> file`）。',
	'`${extname}`: the file extension (e.g. `WORKSPACE_FOLDER/folder/file.txt -> txt`).':
		'`${extname}`：文件扩展名（例如 `WORKSPACE_FOLDER/folder/file.txt -> txt`）。',
	'Example: `"**/static/**/*.html": "${filename} - ${dirname} (${extname})"` will render a file `WORKSPACE_FOLDER/static/folder/file.html` as `file - folder (html)`.':
		'示例：`"**/static/**/*.html": "${filename} - ${dirname} (${extname})"` 会把文件 `WORKSPACE_FOLDER/static/folder/file.html` 渲染为 `file - folder (html)`。',
	'The template which should be rendered when the pattern matches. May include the variables ${dirname}, ${filename} and ${extname}.':
		'模式匹配时要渲染的模板。可以包含变量 ${dirname}、${filename} 和 ${extname}。',
	'Show the name of the file followed by its directory name.': '显示文件名及其所在目录名。',
	'Show the name of the file followed by its path relative to the workspace folder.':
		'显示文件名及其相对于工作区文件夹的路径。',
	'Show the name of the file followed by its absolute path.': '显示文件名及其绝对路径。',
	'Controls the format of the label for an editor.': '控制编辑器标签的格式。',
	'The name of the untitled file is not derived from the contents of the file.': '未命名文件的名称不根据文件内容生成。',
	'Controls the format of the label for an untitled editor.': '控制未命名编辑器标签的格式。',
	'Controls if the empty editor text hint should be visible in the editor.': '控制编辑器为空时的提示文字是否可见。',

	// --- language detection hints ---
	'When enabled, a language detection model that takes into account editor history will be given higher precedence.':
		'启用后，会优先使用考虑编辑器历史记录的语言检测模型。',
	"When enabled, shows a status bar Quick Fix when the editor language doesn't match detected content language.":
		'启用后，当编辑器语言与检测到的内容语言不匹配时，在状态栏显示快速修复入口。',
	'Show in untitled text editors': '在未命名文本编辑器中显示',
	'Show in notebook editors': '在笔记本编辑器中显示',

	// --- tab action buttons / sizing ---
	"Controls the position of the editor's tabs action buttons (close, unpin). This value is ignored when {0} is not set to {1}.":
		'控制编辑器标签操作按钮（关闭、取消固定）的位置。当 {0} 不为 {1} 时该设置无效。',
	'Controls whether Modern UI editor tabs always reserve space for tab action buttons. When disabled, clean tabs stay compact; tabs with persistent dirty or pinned indicators reserve space regardless.':
		'控制新版界面的编辑器标签页是否始终为标签操作按钮预留空间。禁用时，干净的标签页保持紧凑；带常驻脏标记或固定标记的标签页仍会预留空间。',
	'Controls the visibility of the tab close action button.': '控制标签页关闭按钮的可见性。',
	'Controls the visibility of the tab unpin action button.': '控制标签页取消固定按钮的可见性。',
	'When enabled, will show the tab index. This value is ignored when {0} is not set to {1}.':
		'启用后显示标签页序号。当 {0} 不为 {1} 时该设置无效。',
	'Always keep tabs large enough to show the full editor label.': '始终保持标签页足够大，以显示完整的编辑器标签。',
	'Allow tabs to get smaller when the available space is not enough to show all tabs at once.':
		'当可用空间不足以一次显示所有标签页时，允许标签页缩小。',
	'Make all tabs the same size, while allowing them to get smaller when the available space is not enough to show all tabs at once.':
		'使所有标签页大小一致，同时在可用空间不足时允许它们缩小。',
	'Controls the size of editor tabs. This value is ignored when {0} is not set to {1}.':
		'控制编辑器标签页的大小。当 {0} 不为 {1} 时该设置无效。',
	'Controls the minimum width of tabs when {0} size is set to {1}.': '当 {0} 大小设为 {1} 时，控制标签页的最小宽度。',
	'Controls the maximum width of tabs when {0} size is set to {1}.': '当 {0} 大小设为 {1} 时，控制标签页的最大宽度。',
	'Controls the height of editor tabs. Also applies to the title control bar when {0} is not set to {1}.':
		'控制编辑器标签页的高度。当 {0} 不为 {1} 时，该设置同样适用于标题控制栏。',

	// --- density ---
	'Uses the standard spacing between workbench parts.': '使用工作台各部分之间的标准间距。',
	'Removes the gaps between workbench parts and reduces their internal spacing to provide more room for content.':
		'移除工作台各部分之间的间隙并缩小其内部间距，为内容提供更多空间。',
	'Controls the spacing density of the workbench layout. Only applies when {0} is enabled.':
		'控制工作台布局的间距密度。仅在启用 {0} 时生效。',

	// --- pinned tabs ---
	'A pinned tab inherits the look of non pinned tabs.': '固定的标签页沿用未固定标签页的外观。',
	'A pinned tab will show in a compact form with only icon or first letter of the editor name.':
		'固定的标签页以紧凑形式显示，仅包含图标或编辑器名称的首字母。',
	'A pinned tab shrinks to a compact fixed size showing parts of the editor name.':
		'固定的标签页缩小为紧凑的固定大小，显示编辑器名称的部分内容。',
	'Controls the size of pinned editor tabs. Pinned tabs are sorted to the beginning of all opened tabs and typically do not close until unpinned. This value is ignored when {0} is not set to {1}.':
		'控制固定编辑器标签页的大小。固定标签页排在所有已打开标签页的最前面，通常在取消固定前不会关闭。当 {0} 不为 {1} 时该设置无效。',
	'When enabled, displays pinned tabs in a separate row above all other tabs. This value is ignored when {0} is not set to {1}.':
		'启用后，固定标签页显示在其他所有标签页上方的独立行中。当 {0} 不为 {1} 时该设置无效。',
	'Always prevent closing the pinned editor when using mouse middle click or keyboard.':
		'使用鼠标中键或键盘时，始终阻止关闭固定的编辑器。',
	'Prevent closing the pinned editor when using the keyboard.': '使用键盘时阻止关闭固定的编辑器。',
	'Prevent closing the pinned editor when using mouse middle click.': '使用鼠标中键时阻止关闭固定的编辑器。',
	'Never prevent closing a pinned editor.': '从不阻止关闭固定的编辑器。',
	'Controls whether pinned editors should close when keyboard or middle mouse click is used for closing.':
		'控制使用键盘或鼠标中键关闭时，是否关闭固定的编辑器。',

	// --- splitting / dragging / ordering ---
	'Splits the active editor group to equal parts, unless all editor groups are already in equal parts. In that case, splits all the editor groups to equal parts.':
		'将活动编辑器组拆分为等份，除非所有编辑器组已经是等份；此时会将所有编辑器组拆分为等份。',
	'Splits all the editor groups to equal parts.': '将所有编辑器组拆分为等份。',
	'Splits the active editor group to equal parts.': '将活动编辑器组拆分为等份。',
	'Controls the size of editor groups when splitting them.': '控制拆分时编辑器组的大小。',
	'Controls if editor groups can be split from drag and drop operations by dropping an editor or file on the edges of the editor area.':
		'控制是否可以通过将编辑器或文件拖放到编辑器区域边缘来拆分编辑器组。',
	'Controls if editors can be dragged out of the window to open them in a new window. Press and hold the `Alt` key while dragging to toggle this dynamically.':
		'控制是否可以将编辑器拖出窗口以在新窗口中打开。拖动时按住 `Alt` 键可动态切换此行为。',
	'Controls whether editors are closed in most recently used order or from left to right.':
		'控制关闭编辑器时是按最近使用顺序还是从左到右。',
	'Controls whether opened editors should show with an icon or not. This requires a file icon theme to be enabled as well.':
		'控制已打开的编辑器是否显示图标。该功能需要同时启用文件图标主题。',
	'Controls where editors open. Select {0} or {1} to open editors to the left or right of the currently active one. Select {2} or {3} to open editors independently from the currently active one.':
		'控制编辑器打开的位置。选择 {0} 或 {1} 可在当前活动编辑器的左侧或右侧打开；选择 {2} 或 {3} 可独立于当前活动编辑器打开。',
	'Controls the behavior of empty editor groups when the last tab in the group is closed. When enabled, empty groups will automatically close. When disabled, empty groups will remain part of the grid.':
		'控制关闭组内最后一个标签页时空编辑器组的行为。启用时空组会自动关闭；禁用时空组会保留在布局中。',

	// --- modal overlay / navigation scope ---
	'Editors never open in a modal overlay.': '编辑器从不在模态浮层中打开。',
	'Certain editors such as Settings and Keyboard Shortcuts may open in a centered modal overlay.':
		'某些编辑器（如设置和键盘快捷方式）可能在居中的模态浮层中打开。',
	'All editors open in a centered modal overlay.': '所有编辑器都在居中的模态浮层中打开。',
	'Controls whether editors open in a modal overlay.': '控制编辑器是否在模态浮层中打开。',
	"Navigate between open files using three-finger swipe horizontally. Note that System Preferences > Trackpad > More Gestures > 'Swipe between pages' must be set to 'Swipe with two or three fingers'.":
		'使用三指水平滑动在打开的文件之间导航。注意：系统偏好设置 > 触控板 > 更多手势 > "页面之间轻扫"必须设为"用两指或三指轻扫"。',
	"Enables the use of mouse buttons four and five for commands 'Go Back' and 'Go Forward'.":
		'启用鼠标第四、第五按键来执行"后退"和"前进"命令。',
	"Controls the scope of history navigation in editors for commands such as 'Go Back' and 'Go Forward'.":
		'控制编辑器中"后退""前进"等命令的历史导航范围。',
	'Navigate across all opened editors and editor groups.': '在所有已打开的编辑器和编辑器组之间导航。',
	'Navigate only in editors of the active editor group.': '仅在活动编辑器组的编辑器中导航。',
	'Navigate only in the active editor.': '仅在活动编辑器中导航。',
	'Preserves the most recent editor view state (such as scroll position) across all editor groups and restores that if no specific editor view state is found for the editor group.':
		'在所有编辑器组之间保留最近的编辑器视图状态（如滚动位置）；若找不到该编辑器组特有的视图状态，则恢复此状态。',
	'Controls whether editors are restored on startup. When disabled, only dirty editors will be restored from the previous session.':
		'控制启动时是否恢复编辑器。禁用时，仅从上次的会话中恢复有未保存更改的编辑器。',
	'Controls the layout for when an editor is split in an editor group to be either vertical or horizontal.':
		'控制在编辑器组内拆分编辑器时采用垂直还是水平布局。',
	'Editors are positioned from top to bottom.': '编辑器自上而下排列。',
	'Editors are positioned from left to right.': '编辑器自左向右排列。',
	'Controls if the centered layout should automatically resize to maximum width when more than one group is open. Once only one group is open it will resize back to the original centered width.':
		'控制居中布局在打开多个组时是否自动调整为最大宽度。当只剩一个组时会恢复为原始居中宽度。',
	'Controls whether the centered layout tries to maintain constant width when the window is resized.':
		'控制居中布局在调整窗口大小时是否尝试保持宽度恒定。',
	'Controls how the editor group is resized when double clicking on a tab. This value is ignored when {0} is not set to {1}.':
		'控制双击标签页时如何调整编辑器组大小。当 {0} 不为 {1} 时该设置无效。',
	'All other editor groups are hidden and the current editor group is maximized to take up the entire editor area.':
		'隐藏所有其他编辑器组，并将当前编辑器组最大化以占满整个编辑区域。',
	'The editor group takes as much space as possible by making all other editor groups as small as possible.':
		'通过将所有其他编辑器组缩到最小，使当前编辑器组占据尽可能多的空间。',
	'No editor group is resized when double clicking on a tab.': '双击标签页时不调整任何编辑器组的大小。',

	// --- editor limits / history ---
	'Controls if the number of opened editors should be limited or not. When enabled, less recently used editors will close to make space for newly opening editors.':
		'控制是否限制已打开编辑器的数量。启用后，较久未使用的编辑器会被关闭以为新编辑器腾出空间。',
	'Controls the maximum number of opened editors. Use the {0} setting to control this limit per editor group or across all groups.':
		'控制已打开编辑器的最大数量。使用 {0} 设置可控制该限制是按编辑器组还是对所有组生效。',
	'Controls if the maximum number of opened editors should exclude dirty editors for counting towards the configured limit.':
		'控制统计已打开编辑器数量时是否排除有未保存更改的编辑器。',
	'Controls if the limit of maximum opened editors should apply per editor group or across all editor groups.':
		'控制已打开编辑器数量上限是按编辑器组生效还是对所有编辑器组生效。',
	'Controls the maximum number of local file history entries per file. When the number of local file history entries exceeds this number for a file, the oldest entries will be discarded.':
		'控制每个文件的本地历史记录条目上限。当某文件的本地历史条目数超过该值时，最旧的条目将被丢弃。',

	// --- command palette / quick open ---
	'Controls the number of recently used commands to keep in history for the command palette. Set to 0 to disable command history.':
		'控制命令面板保留在历史记录中的最近使用命令数量。设为 0 可禁用命令历史。',
	'Controls whether the last typed input to the command palette should be restored when opening it the next time.':
		'控制下次打开命令面板时是否恢复上次输入的内容。',
	'Controls whether the command palette should have a list of commonly used commands.': '控制命令面板是否显示常用命令列表。',
	'Controls where the command palette should ask chat questions.': '控制命令面板在何处向聊天提问。',
	'Ask chat questions in the Chat view.': '在聊天视图中提问。',
	'Ask chat questions in Quick Chat.': '在快速聊天中提问。',
	"Controls whether the command palette shows 'Ask in Chat' option at the bottom.":
		'控制命令面板底部是否显示"在聊天中提问"选项。',
	'Controls whether the command palette should include similar commands. You must have an extension installed that provides Natural Language support.':
		'控制命令面板是否包含相似命令。必须安装提供自然语言支持的扩展。',
	'Controls whether Quick Open should close automatically once it loses focus.': '控制快速打开在失去焦点后是否自动关闭。',
	'Controls whether the last typed input to Quick Open should be restored when opening it the next time.':
		'控制下次打开快速打开时是否恢复上次输入的内容。',

	// --- settings editor ---
	'Controls whether opening settings also opens an editor showing all default settings.':
		'控制打开设置时是否同时打开显示所有默认设置的编辑器。',
	'Controls whether to use the split JSON editor when editing settings as JSON.':
		'控制以 JSON 格式编辑设置时是否使用分栏 JSON 编辑器。',
	'Controls whether opening keybinding settings also opens an editor showing all default keybindings.':
		'控制打开快捷键设置时是否同时打开显示所有默认快捷键的编辑器。',
	'Controls whether advanced settings are always shown in the settings editor without requiring the `@tag:advanced` filter.':
		'控制设置编辑器是否始终显示高级设置，而无需 `@tag:advanced` 筛选器。',

	// --- side bars / panel / activity bar ---
	'Controls the location of the primary side bar and activity bar. They can either show on the left or right of the workbench. The secondary side bar will show on the opposite side of the workbench.':
		'控制主侧边栏和活动栏的位置。它们可以显示在工作台的左侧或右侧，辅助侧边栏则显示在工作台的另一侧。',
	'Controls whether activity items in the panel title are shown as label or icon.':
		'控制面板标题中的活动项显示为标签还是图标。',
	'Controls the default location of the panel (Terminal, Debug Console, Output, Problems) in a new workspace. It can either show at the bottom, top, right, or left of the editor area.':
		'控制新工作区中面板（终端、调试控制台、输出、问题）的默认位置，可显示在编辑区域的下、上、右或左侧。',
	'Controls whether the panel opens maximized. It can either always open maximized, never open maximized, or open to the last state it was in before being closed.':
		'控制面板是否以最大化方式打开。可以始终最大化打开、从不最大化打开，或恢复为上次关闭前的状态。',
	'Always maximize the panel when opening it.': '打开面板时始终最大化。',
	'Never maximize the panel when opening it.': '打开面板时从不最大化。',
	'Open the panel to the state that it was in, before it was closed.': '将面板恢复为关闭前的状态。',
	'Controls the default visibility of the secondary side bar in workspaces or empty windows that are opened for the first time. Can be overridden by the agent sessions startup editor setting.':
		'控制首次打开的工作区或空窗口中辅助侧边栏的默认可见性。可由智能体会话启动编辑器设置覆盖。',
	'The secondary side bar is hidden by default.': '辅助侧边栏默认隐藏。',
	'The secondary side bar is visible by default if a workspace is opened.': '打开工作区时辅助侧边栏默认可见。',
	'The secondary side bar is visible by default.': '辅助侧边栏默认可见。',
	'The secondary side bar is visible and maximized by default if a workspace is opened.':
		'打开工作区时辅助侧边栏默认可见并最大化。',
	'The secondary side bar is visible and maximized by default.': '辅助侧边栏默认可见并最大化。',
	'Controls whether the secondary side bar is enforced to always show maximized on startup and when there are no open editors, in layouts that support a maximized secondary side bar.':
		'在支持辅助侧边栏最大化的布局中，控制是否强制辅助侧边栏在启动时以及没有打开的编辑器时始终以最大化方式显示。',
	'Controls whether activity items in the secondary side bar title are shown as label or icon. This setting only has an effect when {0} is not set to {1}.':
		'控制辅助侧边栏标题中的活动项显示为标签还是图标。仅当 {0} 不为 {1} 时生效。',
	'Controls the location of the Activity Bar relative to the Primary and Secondary Side Bars.':
		'控制活动栏相对于主侧边栏和辅助侧边栏的位置。',
	'Show the Activity Bar on the side of the Primary Side Bar and on top of the Secondary Side Bar.':
		'活动栏显示在主侧边栏的侧边、辅助侧边栏的上方。',
	'Show the Activity Bar on top of the Primary and Secondary Side Bars.':
		'活动栏显示在主侧边栏和辅助侧边栏的上方。',
	'Show the Activity Bar at the bottom of the Primary and Secondary Side Bars.':
		'活动栏显示在主侧边栏和辅助侧边栏的下方。',
	'Hide the Activity Bar in the Primary and Secondary Side Bars.': '在主侧边栏和辅助侧边栏中隐藏活动栏。',
	'Controls whether the Activity Bar is automatically hidden when there is only one view container to show. This applies to the Primary and Secondary Side Bars when {0} is set to {1} or {2}.':
		'控制当只有一个视图容器时是否自动隐藏活动栏。当 {0} 设为 {1} 或 {2} 时，这适用于主侧边栏和辅助侧边栏。',
	'Controls whether the Activity Bar uses a compact layout with smaller icons and reduced width. This setting only applies when {0} is set to {1}.':
		'控制活动栏是否使用图标更小、宽度更窄的紧凑布局。仅当 {0} 设为 {1} 时生效。',
	'Controls the behavior of clicking an Activity Bar icon in the workbench. This value is ignored when {0} is not set to {1}.':
		'控制单击工作台中活动栏图标时的行为。当 {0} 不为 {1} 时该设置无效。',
	'Hide the Primary Side Bar if the clicked item is already visible.': '如果点击的项已可见，则隐藏主侧边栏。',
	'Focus the Primary Side Bar if the clicked item is already visible.': '如果点击的项已可见，则聚焦主侧边栏。',
	'Controls the visibility of view header actions. View header actions may either be always visible, or only visible when that view is focused or hovered over.':
		'控制视图标题操作按钮的可见性。视图标题操作可以始终可见，也可以仅在该视图获得焦点或被悬停时可见。',
	'If an extension requests a hidden view to be shown, display a clickable status bar indicator instead.':
		'当扩展请求显示一个隐藏的视图时，改为显示一个可点击的状态栏提示。',
	'Output view': '输出视图',

	// --- status bar / notifications / accounts ---
	'Controls the visibility of the status bar at the bottom of the workbench.': '控制工作台底部状态栏的可见性。',
	'Controls the position of the notification toasts and notification center.': '控制通知弹出项和通知中心的位置。',
	'Show notifications in the bottom right corner.': '在右下角显示通知。',
	'Show notifications in the bottom left corner.': '在左下角显示通知。',
	'Show notifications in the top right corner, similar to OS-level notifications.':
		'在右上角显示通知，与操作系统级通知类似。',
	'Controls the visibility of the Notifications button in the title bar. Only applies when notifications are positioned at the top right.':
		'控制标题栏中"通知"按钮的可见性。仅当通知位于右上角时生效。',
	'Controls whether signed-in account profile images (avatars) are shown in account-related UI, such as the Accounts item in the Activity Bar.':
		'控制账户相关界面（如活动栏中的"账户"项）是否显示已登录账户的头像。',

	// --- rendering: font aliasing / motion / transparency ---
	'Controls font aliasing method in the workbench.': '控制工作台中的字体抗锯齿方式。',
	'Sub-pixel font smoothing. On most non-retina displays this will give the sharpest text.':
		'亚像素字体平滑。在大多数非视网膜屏幕上，这能给出最锐利的文字。',
	'Smooth the font on the level of the pixel, as opposed to the subpixel. Can make the font appear lighter overall.':
		'按像素而非亚像素对字体进行平滑处理，可能让字体整体看起来更细。',
	'Disables font smoothing. Text will show with jagged sharp edges.': '禁用字体平滑，文字将呈现锯齿状的锐利边缘。',
	'Applies `default` or `antialiased` automatically based on the DPI of displays.':
		'根据显示器的 DPI 自动应用 `default` 或 `antialiased`。',
	'Use the settings UI editor.': '使用设置界面编辑器。',
	'Use the JSON file editor.': '使用 JSON 文件编辑器。',
	'Determines which Settings editor to use by default.': '确定默认使用哪个设置编辑器。',
	'Controls whether the AI search results toggle is shown in the search bar in the Settings editor after doing a search and once AI search results are available.':
		'控制执行搜索且 AI 搜索结果可用后，设置编辑器的搜索栏中是否显示 AI 搜索结果开关。',
	'Controls the reduced delay in milliseconds used for showing hovers in specific contexts where faster feedback is beneficial.':
		'控制在需要更快反馈的特定场景中显示悬停所采用的缩短延迟（毫秒）。',
	'Controls whether the workbench should render with fewer animations.': '控制工作台是否减少动画渲染。',
	'Always render with reduced motion.': '始终以减少动效方式渲染。',
	'Do not render with reduced motion': '不以减少动效方式渲染',
	'Render with reduced motion based on OS configuration.': '根据操作系统配置以减少动效方式渲染。',
	'Controls whether the workbench should render with fewer transparency and blur effects for improved performance.':
		'控制工作台是否减少透明和模糊效果以提升性能。',
	'Always render without transparency and blur effects.': '始终不使用透明和模糊效果渲染。',
	'Do not reduce transparency and blur effects.': '不减少透明和模糊效果。',
	'Reduce transparency and blur effects based on OS configuration.': '根据操作系统配置减少透明和模糊效果。',

	// --- title bar controls ---
	'Controls whether the navigation control in the title bar is shown.': '控制是否显示标题栏中的导航控件。',
	'Controls whether the navigation control is shown in the custom title bar. This setting only has an effect when {0} is not set to {1}.':
		'控制是否在自定义标题栏中显示导航控件。仅当 {0} 不为 {1} 时生效。',
	'Controls whether the layout control in the title bar is shown.': '控制是否显示标题栏中的布局控件。',
	'Controls whether the layout control is shown in the custom title bar. This setting only has an effect when {0} is not set to {1}.':
		'控制是否在自定义标题栏中显示布局控件。仅当 {0} 不为 {1} 时生效。',
	'Shows a single button with a dropdown of layout options.': '显示一个按钮，点击后展开布局选项下拉列表。',
	'Shows several buttons for toggling the visibility of the panels and side bar.':
		'显示多个按钮，用于切换面板和侧边栏的可见性。',
	'Shows both the dropdown and toggle buttons.': '同时显示下拉按钮和切换按钮。',
	'Controls whether the layout control in the custom title bar is displayed as a single menu button or with multiple UI toggles.':
		'控制自定义标题栏中的布局控件显示为单个菜单按钮还是多个界面切换按钮。',
	'When enabled, will show the watermark tips when no editor is open.': '启用后，在没有打开编辑器时显示水印提示。',
	'Controls whether shadow effects are shown around the side panels and other workbench elements.':
		'控制是否在侧面板和其他工作台元素周围显示阴影效果。',
	'Controls whether view headers, side bar titles, and panel tabs use uppercase text when {0} is enabled.':
		'控制启用 {0} 时，视图标题、侧边栏标题和面板标签页是否使用大写文本。',
	'Connect the active tab to the editor surface with an outside border and curved shoulders.':
		'用外边框和弧形肩部将活动标签页与编辑区域连接起来。',
	'Show editor tabs as separate rounded pills.': '将编辑器标签页显示为独立的圆角标签。',
	'Controls the editor tab style when {0} is enabled, and the chat and side-panel tab style in the Agents window. High contrast themes retain explicit selection and focus borders.':
		'控制启用 {0} 时的编辑器标签页样式，以及智能体窗口中聊天和侧面板的标签页样式。高对比度主题会保留明确的选中与焦点边框。',

	// --- window title variables ---
	'Controls the window title based on the current context such as the opened workspace or active editor. Variables are substituted based on the context:':
		'根据当前上下文（如已打开的工作区或活动编辑器）控制窗口标题。变量会依据上下文进行替换：',
	'`${activeEditorShort}`: the file name (e.g. myFile.txt).': '`${activeEditorShort}`：文件名（例如 myFile.txt）。',
	'`${activeEditorMedium}`: the path of the file relative to the workspace folder (e.g. myFolder/myFileFolder/myFile.txt).':
		'`${activeEditorMedium}`：文件相对于工作区文件夹的路径（例如 myFolder/myFileFolder/myFile.txt）。',
	'`${activeEditorLong}`: the full path of the file (e.g. /Users/Development/myFolder/myFileFolder/myFile.txt).':
		'`${activeEditorLong}`：文件的完整路径（例如 /Users/Development/myFolder/myFileFolder/myFile.txt）。',
	'`${activeEditorLanguageId}`: the language identifier of the active editor (e.g. typescript).':
		'`${activeEditorLanguageId}`：活动编辑器的语言标识符（例如 typescript）。',
	'`${activeFolderShort}`: the name of the folder the file is contained in (e.g. myFileFolder).':
		'`${activeFolderShort}`：文件所在文件夹的名称（例如 myFileFolder）。',
	'`${activeFolderMedium}`: the path of the folder the file is contained in, relative to the workspace folder (e.g. myFolder/myFileFolder).':
		'`${activeFolderMedium}`：文件所在文件夹相对于工作区文件夹的路径（例如 myFolder/myFileFolder）。',
	'`${activeFolderLong}`: the full path of the folder the file is contained in (e.g. /Users/Development/myFolder/myFileFolder).':
		'`${activeFolderLong}`：文件所在文件夹的完整路径（例如 /Users/Development/myFolder/myFileFolder）。',
	'`${folderName}`: name of the workspace folder the file is contained in (e.g. myFolder).':
		'`${folderName}`：文件所在工作区文件夹的名称（例如 myFolder）。',
	'`${folderPath}`: file path of the workspace folder the file is contained in (e.g. /Users/Development/myFolder).':
		'`${folderPath}`：文件所在工作区文件夹的文件路径（例如 /Users/Development/myFolder）。',
	'`${rootName}`: name of the workspace with optional remote name and workspace indicator if applicable (e.g. myFolder, myRemoteFolder [SSH] or myWorkspace (Workspace)).':
		'`${rootName}`：工作区名称，可选包含远程名称和工作区标识（例如 myFolder、myRemoteFolder [SSH] 或 myWorkspace (Workspace)）。',
	'`${rootNameShort}`: shortened name of the workspace without suffixes (e.g. myFolder, myRemoteFolder or myWorkspace).':
		'`${rootNameShort}`：不带后缀的工作区简称（例如 myFolder、myRemoteFolder 或 myWorkspace）。',
	'`${rootPath}`: file path of the opened workspace or folder (e.g. /Users/Development/myWorkspace).':
		'`${rootPath}`：已打开工作区或文件夹的文件路径（例如 /Users/Development/myWorkspace）。',
	'`${profileName}`: name of the profile in which the workspace is opened (e.g. Data Science (Profile)). Ignored if default profile is used.':
		'`${profileName}`：打开该工作区所用的配置文件名称（例如 Data Science（Profile））。使用默认配置文件时忽略此项。',
	'`${appName}`: e.g. Olympia IDE.': '`${appName}`：例如 Olympia IDE。',
	'`${remoteName}`: e.g. SSH': '`${remoteName}`：例如 SSH',
	'`${dirty}`: an indicator for when the active editor has unsaved changes.':
		'`${dirty}`：活动编辑器存在未保存更改时的指示标记。',
	'`${focusedView}`: the name of the view that is currently focused.': '`${focusedView}`：当前获得焦点的视图名称。',
	'`${activeRepositoryName}`: the name of the active repository (e.g. vscode).':
		'`${activeRepositoryName}`：活动仓库的名称（例如 vscode）。',
	'`${activeRepositoryBranchName}`: the name of the active branch in the active repository (e.g. main).':
		'`${activeRepositoryBranchName}`：活动仓库中活动分支的名称（例如 main）。',
	'`${activeEditorState}`: provides information about the state of the active editor (e.g. modified). This will be appended by default when in screen reader mode with {0} enabled.':
		'`${activeEditorState}`：提供活动编辑器状态的信息（例如已修改）。在屏幕阅读器模式下启用 {0} 后，默认会追加此项。',
	'`${separator}`: a conditional separator (" - ") that only shows when surrounded by variables with values or static text.':
		'`${separator}`：条件分隔符（" - "），仅当其两侧是带值的变量或静态文本时才显示。',
	'Separator used by {0}.': '{0} 使用的分隔符。',
	'Show command launcher together with the window title.': '与窗口标题一起显示命令启动器。',
	'Show command launcher together with the window title. This setting only has an effect when {0} is not set to {1}.':
		'与窗口标题一起显示命令启动器。仅当 {0} 不为 {1} 时生效。',

	// --- menu bar / mnemonics ---
	'Menu is displayed at the top of the window and only hidden in full screen mode.':
		'菜单显示在窗口顶部，仅在全屏模式下隐藏。',
	'Menu is always visible at the top of the window even in full screen mode.':
		'菜单始终显示在窗口顶部，即使在全屏模式下也是如此。',
	'Menu is hidden but can be displayed at the top of the window by executing the `Focus Application Menu` command.':
		'菜单默认隐藏，可通过执行"聚焦应用程序菜单"命令显示在窗口顶部。',
	'Menu is hidden but can be displayed at the top of the window via the Alt key.':
		'菜单默认隐藏，可通过 Alt 键显示在窗口顶部。',
	'Menu is always hidden.': '菜单始终隐藏。',
	'Menu is displayed as a compact button in the side bar.': '菜单在侧边栏中显示为一个紧凑按钮。',
	'Menu is displayed as a compact button in the side bar. This value is ignored when {0} is {1} and {2} is either {3} or {4}.':
		'菜单在侧边栏中显示为一个紧凑按钮。当 {0} 为 {1} 且 {2} 为 {3} 或 {4} 时该设置无效。',
	'Controls whether the main menus can be opened via Alt-key shortcuts. Disabling mnemonics allows to bind these Alt-key shortcuts to editor commands instead.':
		'控制是否可以通过 Alt 键快捷键打开主菜单。禁用助记符后，可以将这些 Alt 键快捷键改为绑定到编辑器命令。',
	'Controls whether the menu bar will be focused by pressing the Alt-key. This setting has no effect on toggling the menu bar with the Alt-key.':
		'控制按 Alt 键时是否聚焦菜单栏。该设置不影响用 Alt 键切换菜单栏显示。',

	// --- window behaviour / confirm before close / problems ---
	'Files will open in a new window.': '文件将在新窗口中打开。',
	"Files will open in the window with the files' folder open or the last active window.":
		'文件将在已打开该文件所在文件夹的窗口中打开，或在最后活动的窗口中打开。',
	"Files will open in the window with the files' folder open or the last active window unless opened via the Dock or from Finder.":
		'除非通过程序坞或访达打开，否则文件将在已打开该文件所在文件夹的窗口中打开，或在最后活动的窗口中打开。',
	'Files will open in a new window unless picked from within the application (e.g. via the File menu).':
		'除非从应用内部选取（例如通过"文件"菜单），否则文件将在新窗口中打开。',
	'Folders will open in a new window.': '文件夹将在新窗口中打开。',
	'Folders will replace the last active window.': '文件夹将替换最后活动的窗口。',
	'Folders will open in a new window unless a folder is picked from within the application (e.g. via the File menu).':
		'除非从应用内部选取文件夹（例如通过"文件"菜单），否则文件夹将在新窗口中打开。',
	'Always try to ask for confirmation. Note that browsers may still decide to close a tab or window without confirmation.':
		'始终尝试请求确认。请注意，浏览器仍可能在未经确认的情况下关闭标签页或窗口。',
	'Always ask for confirmation.': '始终要求确认。',
	'Only ask for confirmation if a keybinding was used to close the window. Note that detection may not be possible in some cases.':
		'仅当使用快捷键关闭窗口时才请求确认。请注意，某些情况下可能无法检测。',
	'Only ask for confirmation if a keybinding was used.': '仅当使用快捷键时才请求确认。',
	'Never explicitly ask for confirmation unless data loss is imminent.': '除非即将丢失数据，否则从不主动请求确认。',
	'Never explicitly ask for confirmation.': '从不主动请求确认。',
	'Controls whether to show a confirmation dialog before closing a window or quitting the application.':
		'控制关闭窗口或退出应用程序前是否显示确认对话框。',
	'Controls whether the problems are visible throughout the editor and workbench.':
		'控制问题是否在整个编辑器和工作台中可见。',
};