// Batch 63 — workbench/common/theme.ts (188) + workbench/common/contextkeys.ts (87)
// These two files are almost entirely boilerplate: every tab colour repeats the same
// "Tabs are the containers for editors…" sentence, every editor-group colour repeats
// "Editor groups are the containers of editors.", and so on. The English SENTENCES are
// therefore factored into constants and used as computed keys, which keeps the ~190
// entries consistent and auditable. Every computed key resolves to the exact source
// literal, which audit-dict-padding.mjs verifies against the AST.
//
// Keys containing an apostrophe use double-quoted JS strings.
export default (() => {
	// ---------------------------------------------------------------- note constants
	const TABS = 'Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.';
	const GROUP = 'Editor groups are the containers of editors.';
	const SB = 'The status bar is shown in the bottom of the window.';
	const SB_PROM = 'Prominent items stand out from other status bar entries to indicate importance. ' + SB;
	const SB_ERR = 'Error items stand out from other status bar entries to indicate error conditions. ' + SB;
	const SB_WARN = 'Warning items stand out from other status bar entries to indicate warning conditions. ' + SB;
	const AB = 'The activity bar is showing on the far left or right and allows to switch between views of the side bar.';
	const AB_TOP = 'The activity allows to switch between views of the side bar.';
	const PANEL = 'Panels are shown below the editor area and contain views like output and integrated terminal.';
	const PANEL_SEC = PANEL + ' Panel sections are views nested within the panels.';
	const SIDEBAR = 'The side bar is the container for views like explorer and search.';
	const SIDEBAR_SEC = SIDEBAR + ' Side bar sections are views nested within the side bar.';
	const BANNER = 'The banner is shown under the title bar of the window.';
	const NOTIF = 'Notifications slide in from the bottom right of the window.';
	const SURFACE_CARDS = 'framed container surfaces ("cards"), such as the floating workbench panels in the modern layout';
	const MODERN_UI = 'when the modern UI is enabled.';
	// same trailing clause, for prefixes that already end in "and" ("... when hovering and the modern UI is enabled.")
	const MODERN_UI_TAIL = 'the modern UI is enabled.';
	const MODERN_TAB = 'the modern tab style is enabled.';
	const WIN_CTL = 'Requires custom title bar style and custom or hidden window controls on Linux.';

	// ---------------------------------------------------------------- Chinese notes
	const Z_TABS = '标签页是编辑器区域中编辑器的容器，一个编辑器组中可以打开多个标签页，也可以有多个编辑器组。';
	const Z_GROUP = '编辑器组是编辑器的容器。';
	const Z_SB = '状态栏显示在窗口底部。';
	const Z_SB_PROM = '突出显示的项目会与其他状态栏条目区分开来，以标示其重要性。' + Z_SB;
	const Z_SB_ERR = '错误项目会与其他状态栏条目区分开来，以标示错误状态。' + Z_SB;
	const Z_SB_WARN = '警告项目会与其他状态栏条目区分开来，以标示警告状态。' + Z_SB;
	const Z_AB = '活动栏显示在最左侧或最右侧，用于在侧边栏的各个视图之间切换。';
	const Z_AB_TOP = '活动栏用于在侧边栏的各个视图之间切换。';
	const Z_PANEL = '面板显示在编辑器区域下方，包含输出和集成终端等视图。';
	const Z_PANEL_SEC = Z_PANEL + '面板分区是嵌套在面板内部的视图。';
	const Z_SIDEBAR = '侧边栏是资源管理器和搜索等视图的容器。';
	const Z_SIDEBAR_SEC = Z_SIDEBAR + '侧边栏分区是嵌套在侧边栏内部的视图。';
	const Z_BANNER = '横幅显示在窗口标题栏下方。';
	const Z_NOTIF = '通知从窗口右下角滑入。';
	const Z_MODERN_UI = '启用新式界面时';
	const Z_MODERN_TAB = '启用新式标签页样式时';
	const Z_WIN_CTL = '在 Linux 上需要自定义标题栏样式以及自定义或隐藏的窗口控件。';

	/** join a sentence prefix with an optional trailing note into one English literal */
	const k = (prefix, note) => (note ? `${prefix} ${note}` : prefix);

	const dict = {

		// ============================================================ theme.ts — tabs
		[k('Active tab background color in an active group.', TABS)]: '活动编辑器组中活动标签页的背景颜色。' + Z_TABS,
		[k('Active tab background color in an unfocused group.', TABS)]: '未聚焦编辑器组中活动标签页的背景颜色。' + Z_TABS,
		[k('Inactive tab background color in an active group.', TABS)]: '活动编辑器组中非活动标签页的背景颜色。' + Z_TABS,
		[k('Inactive tab background color in an unfocused group.', TABS)]: '未聚焦编辑器组中非活动标签页的背景颜色。' + Z_TABS,
		[k('Active tab foreground color in an active group.', TABS)]: '活动编辑器组中活动标签页的前景色。' + Z_TABS,
		[k('Inactive tab foreground color in an active group.', TABS)]: '活动编辑器组中非活动标签页的前景色。' + Z_TABS,
		[k('Active tab foreground color in an unfocused group.', TABS)]: '未聚焦编辑器组中活动标签页的前景色。' + Z_TABS,
		[k('Inactive tab foreground color in an unfocused group.', TABS)]: '未聚焦编辑器组中非活动标签页的前景色。' + Z_TABS,
		[k('Tab background color when hovering.', TABS)]: '悬停时的标签页背景颜色。' + Z_TABS,
		[k('Tab background color in an unfocused group when hovering.', TABS)]: '在未聚焦编辑器组中悬停时的标签页背景颜色。' + Z_TABS,
		[k('Tab foreground color when hovering.', TABS)]: '悬停时的标签页前景色。' + Z_TABS,
		[k('Tab foreground color in an unfocused group when hovering.', TABS)]: '在未聚焦编辑器组中悬停时的标签页前景色。' + Z_TABS,
		[k('Border to separate tabs from each other.', TABS)]: '用于分隔标签页的边框。' + Z_TABS,
		[k('Border to separate pinned tabs from other tabs.', TABS)]: '用于将固定标签页与其他标签页分隔开的边框。' + Z_TABS,
		[k('Border on the bottom of an active tab.', TABS)]: '活动标签页底部的边框。' + Z_TABS,
		[k('Border to the top of an active tab.', TABS)]: '活动标签页顶部的边框。' + Z_TABS,
		[k('Border to the top of an active tab in an unfocused group.', TABS)]: '未聚焦编辑器组中活动标签页顶部的边框。' + Z_TABS,
		[k('Border to the top of a selected tab.', TABS)]: '选中标签页顶部的边框。' + Z_TABS,
		[k('Background of a selected tab.', TABS)]: '选中标签页的背景。' + Z_TABS,
		[k('Foreground of a selected tab.', TABS)]: '选中标签页的前景色。' + Z_TABS,
		[k('Border to highlight tabs when hovering.', TABS)]: '悬停时用于突出显示标签页的边框。' + Z_TABS,

		// ================================================ theme.ts — editor pane / groups
		'Background color of the editor pane visible on the left and right side of the centered editor layout.':
			'居中编辑器布局中显示在编辑器区域左右两侧的编辑器窗格背景颜色。',
		[k('Background color of an empty editor group.', GROUP)]: '空编辑器组的背景颜色。' + Z_GROUP,
		[k('Border color of an empty editor group that is focused.', GROUP)]: '处于聚焦状态的空编辑器组的边框颜色。' + Z_GROUP,
		[k('Background color of the editor group title header when tabs are enabled.', GROUP)]: '启用标签页时，编辑器组标题栏的背景颜色。' + Z_GROUP,
		[k('Background color of connected tabs in editor group title headers.', GROUP)]: '编辑器组标题栏中关联标签页的背景颜色。' + Z_GROUP,
		[k('Border color of the editor group title header when tabs are enabled.', GROUP)]: '启用标签页时，编辑器组标题栏的边框颜色。' + Z_GROUP,
		[k('Background color of the editor group title header when (`"workbench.editor.showTabs": "single"`).', GROUP)]:
			'当 ("workbench.editor.showTabs": "single") 时，编辑器组标题栏的背景颜色。' + Z_GROUP,
		[k('Border color of the editor group title header.', GROUP)]: '编辑器组标题栏的边框颜色。' + Z_GROUP,
		[k('Color to separate multiple editor groups from each other.', GROUP)]: '用于分隔多个编辑器组的颜色。' + Z_GROUP,
		'Background color when dragging editors around. The color should have transparency so that the editor contents can still shine through.':
			'拖动编辑器时的背景颜色。该颜色应带有透明度，以便编辑器内容仍然可以透出。',
		'Foreground color of text shown over editors when dragging files. This text informs the user that they can hold shift to drop into the editor.':
			'拖动文件时显示在编辑器上方的文字前景色。该文字会提示用户可以按住 Shift 键将文件放入编辑器。',
		'Background color of text shown over editors when dragging files. This text informs the user that they can hold shift to drop into the editor.':
			'拖动文件时显示在编辑器上方的文字背景色。该文字会提示用户可以按住 Shift 键将文件放入编辑器。',
		'Border color of text shown over editors when dragging files. This text informs the user that they can hold shift to drop into the editor.':
			'拖动文件时显示在编辑器上方的文字边框色。该文字会提示用户可以按住 Shift 键将文件放入编辑器。',
		'Color to separate two editors from each other when shown side by side in an editor group from top to bottom.':
			'在编辑器组中从上到下并排显示两个编辑器时，用于分隔两者的颜色。',
		'Color to separate two editors from each other when shown side by side in an editor group from left to right.':
			'在编辑器组中从左到右并排显示两个编辑器时，用于分隔两者的颜色。',

		// ============================================================ theme.ts — output
		'Output view background color.': '输出视图的背景颜色。',
		'Output view sticky scroll background color.': '输出视图中粘性滚动的背景颜色。',

		// ============================================================ theme.ts — banner
		[k('Banner background color.', BANNER)]: '横幅的背景颜色。' + Z_BANNER,
		[k('Banner foreground color.', BANNER)]: '横幅的前景色。' + Z_BANNER,
		[k('Banner icon color.', BANNER)]: '横幅的图标颜色。' + Z_BANNER,

		// ========================================================= theme.ts — status bar
		[k('Status bar foreground color when a workspace or folder is opened.', SB)]: '打开工作区或文件夹时的状态栏前景色。' + Z_SB,
		[k('Status bar foreground color when no folder is opened.', SB)]: '未打开任何文件夹时的状态栏前景色。' + Z_SB,
		[k('Status bar background color when a workspace or folder is opened.', SB)]: '打开工作区或文件夹时的状态栏背景色。' + Z_SB,
		[k('Status bar background color when no folder is opened.', SB)]: '未打开任何文件夹时的状态栏背景色。' + Z_SB,
		[k('Status bar border color separating to the sidebar and editor.', SB)]: '用于分隔状态栏与侧边栏、编辑器的边框颜色。' + Z_SB,
		[k('Status bar border color when focused on keyboard navigation.', SB)]: '通过键盘导航聚焦时的状态栏边框颜色。' + Z_SB,
		[k('Status bar border color separating to the sidebar and editor when no folder is opened.', SB)]: '未打开任何文件夹时，用于分隔状态栏与侧边栏、编辑器的边框颜色。' + Z_SB,
		[k('Status bar item background color when clicking.', SB)]: '点击时的状态栏项背景颜色。' + Z_SB,
		[k('Status bar item border color when focused on keyboard navigation.', SB)]: '通过键盘导航聚焦时的状态栏项边框颜色。' + Z_SB,
		[k('Status bar item background color when hovering.', SB)]: '悬停时的状态栏项背景颜色。' + Z_SB,
		[k('Status bar item foreground color when hovering.', SB)]: '悬停时的状态栏项前景色。' + Z_SB,
		[k('Status bar item background color when hovering an item that contains two hovers.', SB)]: '悬停于包含两个悬停状态的项目时，状态栏项的背景颜色。' + Z_SB,
		[k('Status bar prominent items foreground color.', SB_PROM)]: '状态栏突出显示项目的前景色。' + Z_SB_PROM,
		[k('Status bar prominent items background color.', SB_PROM)]: '状态栏突出显示项目的背景色。' + Z_SB_PROM,
		[k('Status bar prominent items foreground color when hovering.', SB_PROM)]: '悬停时状态栏突出显示项目的前景色。' + Z_SB_PROM,
		[k('Status bar prominent items background color when hovering.', SB_PROM)]: '悬停时状态栏突出显示项目的背景色。' + Z_SB_PROM,
		[k('Status bar error items background color.', SB_ERR)]: '状态栏错误项目的背景色。' + Z_SB_ERR,
		[k('Status bar error items foreground color.', SB_ERR)]: '状态栏错误项目的前景色。' + Z_SB_ERR,
		[k('Status bar error items foreground color when hovering.', SB_ERR)]: '悬停时状态栏错误项目的前景色。' + Z_SB_ERR,
		[k('Status bar error items background color when hovering.', SB_ERR)]: '悬停时状态栏错误项目的背景色。' + Z_SB_ERR,
		[k('Status bar warning items background color.', SB_WARN)]: '状态栏警告项目的背景色。' + Z_SB_WARN,
		[k('Status bar warning items foreground color.', SB_WARN)]: '状态栏警告项目的前景色。' + Z_SB_WARN,
		[k('Status bar warning items foreground color when hovering.', SB_WARN)]: '悬停时状态栏警告项目的前景色。' + Z_SB_WARN,
		[k('Status bar warning items background color when hovering.', SB_WARN)]: '悬停时状态栏警告项目的背景色。' + Z_SB_WARN,
		'Status bar item background color when the workbench is offline.': '工作台处于离线状态时的状态栏项背景颜色。',
		'Status bar item foreground color when the workbench is offline.': '工作台处于离线状态时的状态栏项前景色。',
		'Status bar item foreground hover color when the workbench is offline.': '工作台处于离线状态时的状态栏项悬停前景色。',
		'Status bar item background hover color when the workbench is offline.': '工作台处于离线状态时的状态栏项悬停背景色。',
		'Background color for the remote indicator on the status bar.': '状态栏上远程指示器的背景颜色。',
		'Foreground color for the remote indicator on the status bar.': '状态栏上远程指示器的前景色。',
		'Foreground color for the remote indicator on the status bar when hovering.': '悬停时状态栏上远程指示器的前景色。',
		'Background color for the remote indicator on the status bar when hovering.': '悬停时状态栏上远程指示器的背景色。',
		'Background color for the remote badge in the extensions view.': '扩展视图中远程徽标的背景颜色。',
		'Foreground color for the remote badge in the extensions view.': '扩展视图中远程徽标的前景色。',

		// ======================================================= theme.ts — activity bar
		[k('Activity bar background color.', AB)]: '活动栏的背景颜色。' + Z_AB,
		[k('Activity bar item foreground color when it is active.', AB)]: '处于活动状态时活动栏项的前景色。' + Z_AB,
		[k('Activity bar item foreground color when it is inactive.', AB)]: '处于非活动状态时活动栏项的前景色。' + Z_AB,
		[k('Activity bar border color separating to the side bar.', AB)]: '用于分隔活动栏与侧边栏的边框颜色。' + Z_AB,
		[k('Activity bar border color for the active item.', AB)]: '活动项的活动栏边框颜色。' + Z_AB,
		[k('Activity bar focus border color for the active item.', AB)]: '活动项的活动栏聚焦边框颜色。' + Z_AB,
		[k('Activity bar background color for the active item.', AB)]: '活动项的活动栏背景颜色。' + Z_AB,
		[k('Drag and drop feedback color for the activity bar items.', AB)]: '活动栏项目的拖放反馈颜色。' + Z_AB,
		[k('Activity notification badge background color.', AB)]: '活动通知徽标的背景颜色。' + Z_AB,
		[k('Activity notification badge foreground color.', AB)]: '活动通知徽标的前景色。' + Z_AB,
		[k('Active foreground color of the item in the Activity bar when it is on top / bottom.', AB_TOP)]: '活动栏位于顶部/底部时，其中活动项的前景色。' + Z_AB_TOP,
		[k('Focus border color for the active item in the Activity bar when it is on top / bottom.', AB_TOP)]: '活动栏位于顶部/底部时，活动项的聚焦边框颜色。' + Z_AB_TOP,
		[k('Background color for the active item in the Activity bar when it is on top / bottom.', AB_TOP)]: '活动栏位于顶部/底部时，活动项的背景颜色。' + Z_AB_TOP,
		[k('Inactive foreground color of the item in the Activity bar when it is on top / bottom.', AB_TOP)]: '活动栏位于顶部/底部时，非活动项的前景色。' + Z_AB_TOP,
		[k('Drag and drop feedback color for the items in the Activity bar when it is on top / bottom.', AB_TOP)]: '活动栏位于顶部/底部时，其中项目的拖放反馈颜色。' + Z_AB_TOP,
		'Background color of the activity bar when set to top / bottom.': '活动栏设置为顶部/底部时的背景颜色。',

		// ============================================================== theme.ts — panel
		[k('Panel background color.', PANEL)]: '面板的背景颜色。' + Z_PANEL,
		[k('Panel border color to separate the panel from the editor.', PANEL)]: '用于分隔面板与编辑器的面板边框颜色。' + Z_PANEL,
		[k('Panel title border color on the bottom, separating the title from the views.', PANEL)]: '面板标题底部的边框颜色，用于分隔标题与视图。' + Z_PANEL,
		[k('Title color for the active panel.', PANEL)]: '活动面板的标题颜色。' + Z_PANEL,
		[k('Title color for the inactive panel.', PANEL)]: '非活动面板的标题颜色。' + Z_PANEL,
		[k('Border color for the active panel title.', PANEL)]: '活动面板标题的边框颜色。' + Z_PANEL,
		[k('Panel title badge background color.', PANEL)]: '面板标题徽标的背景颜色。' + Z_PANEL,
		[k('Panel title badge foreground color.', PANEL)]: '面板标题徽标的前景色。' + Z_PANEL,
		[k('Drag and drop feedback color for the panel titles.', PANEL)]: '面板标题的拖放反馈颜色。' + Z_PANEL,
		[k('Panel section header background color.', PANEL_SEC)]: '面板分区标题的背景颜色。' + Z_PANEL_SEC,
		[k('Panel section header foreground color.', PANEL_SEC)]: '面板分区标题的前景色。' + Z_PANEL_SEC,
		'Input box border for inputs in the panel.': '面板中输入框的边框。',
		'Background color of sticky scroll in the panel.': '面板中粘性滚动的背景颜色。',
		'Border color of sticky scroll in the panel.': '面板中粘性滚动的边框颜色。',
		'Shadow color of sticky scroll in the panel.': '面板中粘性滚动的阴影颜色。',
		'Border color for integrated browser pages.': '集成浏览器页面的边框颜色。',
		'Profile badge background color. The profile badge shows on top of the settings gear icon in the activity bar.':
			'个人资料徽标的背景颜色。该徽标显示在活动栏的设置齿轮图标上方。',
		'Profile badge foreground color. The profile badge shows on top of the settings gear icon in the activity bar.':
			'个人资料徽标的前景色。该徽标显示在活动栏的设置齿轮图标上方。',

		// =========================================================== theme.ts — side bar
		[k('Side bar background color.', SIDEBAR)]: '侧边栏的背景颜色。' + Z_SIDEBAR,
		[k('Side bar foreground color.', SIDEBAR)]: '侧边栏的前景色。' + Z_SIDEBAR,
		[k('Side bar border color on the side separating to the editor.', SIDEBAR)]: '侧边栏与编辑器分隔那一侧的边框颜色。' + Z_SIDEBAR,
		[k('Side bar title background color.', SIDEBAR)]: '侧边栏标题的背景颜色。' + Z_SIDEBAR,
		[k('Side bar title foreground color.', SIDEBAR)]: '侧边栏标题的前景色。' + Z_SIDEBAR,
		[k('Side bar title border color on the bottom, separating the title from the views.', SIDEBAR)]: '侧边栏标题底部的边框颜色，用于分隔标题与视图。' + Z_SIDEBAR,
		[k('Side bar section header background color.', SIDEBAR_SEC)]: '侧边栏分区标题的背景颜色。' + Z_SIDEBAR_SEC,
		[k('Side bar section header foreground color.', SIDEBAR_SEC)]: '侧边栏分区标题的前景色。' + Z_SIDEBAR_SEC,
		[k('Side bar section header border color.', SIDEBAR_SEC)]: '侧边栏分区标题的边框颜色。' + Z_SIDEBAR_SEC,
		'Border color between the activity bar at the top/bottom and the views.': '顶部/底部活动栏与视图之间的边框颜色。',
		'Background color of sticky scroll in the side bar.': '侧边栏中粘性滚动的背景颜色。',
		'Border color of sticky scroll in the side bar.': '侧边栏中粘性滚动的边框颜色。',
		'Shadow color of sticky scroll in the side bar.': '侧边栏中粘性滚动的阴影颜色。',

		// ============================================== theme.ts — surfaces / modern layout
		[`Background color of ${SURFACE_CARDS}.`]: '新式布局中带边框容器表面（卡片）的背景颜色，例如浮动的工作台面板。',
		[`Foreground color of ${SURFACE_CARDS}.`]: '新式布局中带边框容器表面（卡片）的前景色，例如浮动的工作台面板。',
		[`Border color of ${SURFACE_CARDS}.`]: '新式布局中带边框容器表面（卡片）的边框颜色，例如浮动的工作台面板。',
		'Border color of the editor surface in the modern layout.': '新式布局中编辑器表面的边框颜色。',
		[k('Border color of the panel surface', MODERN_UI)]: Z_MODERN_UI + '面板表面的边框颜色。',
		[k('Color of the grip handles marking the resizable boundaries between workbench parts', MODERN_UI)]:
			Z_MODERN_UI + '标记工作台各部分之间可调整边界的拖拽手柄颜色。',
		[k('Background color of the shell visible around floating workbench surfaces', MODERN_UI)]:
			Z_MODERN_UI + '浮动工作台表面周围可见外壳的背景颜色。',
		'Background color of the shell visible around floating workbench surfaces when the window is inactive and the modern UI is enabled.':
			'窗口未激活且' + Z_MODERN_UI + '浮动工作台表面周围可见外壳的背景颜色。',

		// ======================================================== theme.ts — modern tabs
		[k('Background color of active tabs when', MODERN_TAB)]: Z_MODERN_TAB + '活动标签页的背景颜色。',
		[k('Foreground color of active tabs when', MODERN_TAB)]: Z_MODERN_TAB + '活动标签页的前景色。',
		[k('Background color of tabs when hovering and', MODERN_TAB)]: '悬停于标签页且' + Z_MODERN_TAB + '标签页的背景颜色。',
		[k('Foreground color of tabs when hovering and', MODERN_TAB)]: '悬停于标签页且' + Z_MODERN_TAB + '标签页的前景色。',
		[k('Background color of active editor tabs when', MODERN_TAB)]: Z_MODERN_TAB + '活动编辑器标签页的背景颜色。',
		[k('Foreground color of active editor tabs when', MODERN_TAB)]: Z_MODERN_TAB + '活动编辑器标签页的前景色。',
		[k('Opaque background color of tab actions on active editor tabs when', MODERN_TAB)]: Z_MODERN_TAB + '活动编辑器标签页上标签页操作的不透明背景颜色。',
		[k('Background color of inactive editor tabs when', MODERN_TAB)]: Z_MODERN_TAB + '非活动编辑器标签页的背景颜色。',
		[k('Background color of editor tabs when hovering and', MODERN_TAB)]: '悬停于编辑器标签页且' + Z_MODERN_TAB + '标签页的背景颜色。',
		[k('Foreground color of editor tabs when hovering and', MODERN_TAB)]: '悬停于编辑器标签页且' + Z_MODERN_TAB + '标签页的前景色。',
		[k('Background color of active editor tabs when hovering and', MODERN_TAB)]: '悬停于活动编辑器标签页且' + Z_MODERN_TAB + '标签页的背景颜色。',
		[k('Opaque background color of tab actions on editor tabs when hovering and', MODERN_TAB)]: '悬停于编辑器标签页且' + Z_MODERN_TAB + '标签页操作的不透明背景颜色。',
		[k('Opaque background color of tab actions on active editor tabs when hovering and', MODERN_TAB)]: '悬停于活动编辑器标签页且' + Z_MODERN_TAB + '标签页操作的不透明背景颜色。',
		[k('Opaque background color of tab actions on selected editor tabs when', MODERN_TAB)]: Z_MODERN_TAB + '选中编辑器标签页上标签页操作的不透明背景颜色。',

		// ================================================== theme.ts — modern activity bar
		[k('Background color of the Activity bar in the default side position', MODERN_UI)]: Z_MODERN_UI + '默认边侧位置活动栏的背景颜色。',
		'Background color of the Activity bar in an inactive window when it is in the default side position and the modern UI is enabled.':
			'窗口未激活、处于默认边侧位置且' + Z_MODERN_UI + '活动栏的背景颜色。',
		[k('Background color of active Activity bar items in the default side position', MODERN_UI)]: Z_MODERN_UI + '默认边侧位置活动栏中活动项的背景颜色。',
		[k('Foreground color of active Activity bar items in the default side position', MODERN_UI)]: Z_MODERN_UI + '默认边侧位置活动栏中活动项的前景色。',
		[k('Background color of Activity bar items in the default side position when hovering and', MODERN_UI_TAIL)]: '启用新式界面时，悬停于默认边侧位置活动栏项目的背景颜色。',
		[k('Foreground color of Activity bar items in the default side position when hovering and', MODERN_UI_TAIL)]: '启用新式界面时，悬停于默认边侧位置活动栏项目的前景色。',
		[k('Border color of the Activity bar in the default side position', MODERN_UI)]: Z_MODERN_UI + '默认边侧位置活动栏的边框颜色。',
		"'modernActivityBar.activeBackground' is deprecated. Use 'modernActivityBarItem.activeBackground' instead.":
			"'modernActivityBar.activeBackground' 已弃用，请改用 'modernActivityBarItem.activeBackground'。",
		"'modernActivityBar.activeForeground' is deprecated. Use 'modernActivityBarItem.activeForeground' instead.":
			"'modernActivityBar.activeForeground' 已弃用，请改用 'modernActivityBarItem.activeForeground'。",
		"'modernActivityBar.hoverBackground' is deprecated. Use 'modernActivityBarItem.hoverBackground' instead.":
			"'modernActivityBar.hoverBackground' 已弃用，请改用 'modernActivityBarItem.hoverBackground'。",
		"'modernActivityBar.hoverForeground' is deprecated. Use 'modernActivityBarItem.hoverForeground' instead.":
			"'modernActivityBar.hoverForeground' 已弃用，请改用 'modernActivityBarItem.hoverForeground'。",

		// ============================================== theme.ts — title bar / menu bar
		'Title bar foreground when the window is active.': '窗口处于活动状态时的标题栏前景色。',
		'Title bar foreground when the window is inactive.': '窗口未激活时的标题栏前景色。',
		'Title bar background when the window is active.': '窗口处于活动状态时的标题栏背景色。',
		'Title bar background when the window is inactive.': '窗口未激活时的标题栏背景色。',
		'Title bar border color.': '标题栏的边框颜色。',
		'Foreground color of the selected menu item in the menubar.': '菜单栏中所选菜单项的前景色。',
		'Background color of the selected menu item in the menubar.': '菜单栏中所选菜单项的背景色。',
		'Border color of the selected menu item in the menubar.': '菜单栏中所选菜单项的边框颜色。',

		// ==================================================== theme.ts — command center
		'Foreground color of the command center': '命令中心的前景色',
		'Active foreground color of the command center': '命令中心处于活动状态时的前景色',
		'Foreground color of the command center when the window is inactive': '窗口未激活时命令中心的前景色',
		'Background color of the command center': '命令中心的背景色',
		'Active background color of the command center': '命令中心处于活动状态时的背景色',
		'Border color of the command center': '命令中心的边框颜色',
		'Active border color of the command center': '命令中心处于活动状态时的边框颜色',
		'Border color of the command center when the window is inactive': '窗口未激活时命令中心的边框颜色',

		// ===================================================== theme.ts — notifications
		[k('Notifications center border color.', NOTIF)]: '通知中心的边框颜色。' + Z_NOTIF,
		[k('Notification toast border color.', NOTIF)]: '通知浮窗的边框颜色。' + Z_NOTIF,
		[k('Notifications foreground color.', NOTIF)]: '通知的前景色。' + Z_NOTIF,
		[k('Notifications background color.', NOTIF)]: '通知的背景色。' + Z_NOTIF,
		[k('Notification links foreground color.', NOTIF)]: '通知链接的前景色。' + Z_NOTIF,
		[k('Notifications center header foreground color.', NOTIF)]: '通知中心标题栏的前景色。' + Z_NOTIF,
		[k('Notifications center header background color.', NOTIF)]: '通知中心标题栏的背景色。' + Z_NOTIF,
		[k('Notifications border color separating from other notifications in the notifications center.', NOTIF)]: '通知中心中用于与其他通知分隔的边框颜色。' + Z_NOTIF,
		[k('The color used for the icon of error notifications.', NOTIF)]: '错误通知图标所使用的颜色。' + Z_NOTIF,
		[k('The color used for the icon of warning notifications.', NOTIF)]: '警告通知图标所使用的颜色。' + Z_NOTIF,
		[k('The color used for the icon of info notifications.', NOTIF)]: '信息通知图标所使用的颜色。' + Z_NOTIF,

		// ========================================================== theme.ts — window
		[k('The color used for the border of the window when it is active on macOS or Linux.', WIN_CTL)]: '在 macOS 或 Linux 上，窗口处于活动状态时窗口边框所使用的颜色。' + Z_WIN_CTL,
		[k('The color used for the border of the window when it is inactive on macOS or Linux.', WIN_CTL)]: '在 macOS 或 Linux 上，窗口未激活时窗口边框所使用的颜色。' + Z_WIN_CTL,

		// ============================================ contextkeys.ts — workbench & window
		"The kind of workspace opened in the window, either 'empty' (no workspace), 'folder' (single folder) or 'workspace' (multi-root workspace)":
			'窗口中打开的工作区类型，取值为 empty（无工作区）或 folder（单个文件夹）或 workspace（多根工作区）',
		'The number of root folders in the workspace': '工作区中根文件夹的数量',
		'Whether there are any working copies with unsaved changes': '是否存在带未保存更改的工作副本',
		'The name of the remote the window is connected to or an empty string if not connected to any remote':
			'窗口所连接的远程的名称，若未连接任何远程则为空字符串',
		'The scheme of the current workspace is from a virtual file system or an empty string.':
			'当前工作区的方案是否来自虚拟文件系统，若不是则为空字符串。',
		'The scheme of the current workspace is from a temporary file system.':
			'当前工作区的方案是否来自临时文件系统。',
		'Whether the current window is a agent sessions window.': '当前窗口是否为智能体会话窗口。',
		'The identifier of the embedder according to the product service, if one is defined':
			'产品服务中定义的嵌入程序标识符（如果有）',
		'Whether Olympia IDE is running under automation/smoke test': 'Olympia IDE 是否正在自动化/冒烟测试下运行',
		'Whether the main window is in fullscreen mode': '主窗口是否处于全屏模式',
		'Whether an auxiliary window is focused': '辅助窗口是否获得焦点',
		'Whether the window is always on top': '窗口是否始终置顶',
		'Window is an auxiliary window': '该窗口是辅助窗口',

		// ============================================= contextkeys.ts — active editor
		'Whether the active editor has unsaved changes': '活动编辑器是否存在未保存的更改',
		'Whether the active editor is not in preview mode': '活动编辑器是否不处于预览模式',
		'Whether the active editor is the first one in its group': '活动编辑器是否为所在组中的第一个',
		'Whether the active editor is the last one in its group': '活动编辑器是否为所在组中的最后一个',
		'Whether the active editor is pinned': '活动编辑器是否已固定',
		'Whether the active editor is read-only': '活动编辑器是否为只读',
		'Whether the active compare editor can swap sides': '活动的比较编辑器是否可以交换两侧',
		'Whether the active editor can toggle between being read-only or writeable': '活动编辑器是否可以在只读与可写之间切换',
		'Whether the active editor can revert': '活动编辑器是否可以还原',
		'Whether the active editor cannot be closed through standard user actions': '活动编辑器是否无法通过标准用户操作关闭',
		'The identifier of the active editor': '活动编辑器的标识符',
		'The available editor identifiers that are usable for the active editor': '可用于活动编辑器的编辑器标识符',
		'Whether a text compare editor is visible': '文本比较编辑器是否可见',
		'Whether a text compare editor is active': '文本比较编辑器是否处于活动状态',
		'Whether a side by side editor is active': '并排编辑器是否处于活动状态',
		'Whether the active custom editor diff can toggle between inline and side by side layout':
			'活动的自定义编辑器差异视图是否可以在内联与并排布局之间切换',
		'Whether the active custom editor diff is backed by text documents': '活动的自定义编辑器差异视图是否基于文本文档',

		// ================================================ contextkeys.ts — editor groups
		'The number of opened editor groups': '已打开的编辑器组数量',
		'Whether the editor group is the top right editor group in the editor part': '该编辑器组是否为编辑器区域右上角的编辑器组',
		'Whether the active editor group is empty': '活动编辑器组是否为空',
		'The index of the active editor group': '活动编辑器组的索引',
		'Whether the active editor group is the last group': '活动编辑器组是否为最后一个组',
		'Whether the active editor group is locked': '活动编辑器组是否已锁定',
		'Whether there are multiple editor groups opened': '是否打开了多个编辑器组',
		'Whether multiple editors have been selected in an editor group': '是否在某个编辑器组中选中了多个编辑器',
		'Whether exactly two editors have been selected in an editor group': '是否在某个编辑器组中恰好选中了两个编辑器',
		'Whether all selected editors in a group have a file or untitled resource associated':
			'该组中所选编辑器是否都关联了文件或未命名资源',
		'Whether there are multiple editor groups opened in an editor part': '某个编辑器区域中是否打开了多个编辑器组',
		'Editor Part has a maximized group': '该编辑器区域中存在已最大化的组',
		'Whether focus is in a modal editor part': '焦点是否位于模态编辑器区域中',
		'Whether a modal editor part is visible': '模态编辑器区域是否可见',
		'Whether the modal editor part is maximized': '模态编辑器区域是否已最大化',
		'Whether the modal editor part has navigation context': '模态编辑器区域是否具有导航上下文',
		'Whether the modal editor part has a sidebar': '模态编辑器区域是否具有侧边栏',
		'Whether the modal editor part sidebar is visible': '模态编辑器区域的侧边栏是否可见',

		// ============================================ contextkeys.ts — editor area & chrome
		'Whether an editor is open': '是否打开了某个编辑器',
		'Whether the editor area (any editor part) has keyboard focus': '编辑器区域（任意编辑器区域）是否具有键盘焦点',
		'Whether Zen mode is enabled': '是否启用了禅模式',
		'Whether centered layout is enabled for the main editor': '主编辑器是否启用了居中布局',
		'Whether editors split vertically': '编辑器是否垂直拆分',
		'Whether the editor area in the main window is visible': '主窗口中的编辑器区域是否可见',
		'Whether editor tabs are visible': '编辑器标签页是否可见',
		'Whether the sidebar is visible': '侧边栏是否可见',
		'Whether the sidebar has keyboard focus': '侧边栏是否具有键盘焦点',
		'The identifier of the active viewlet': '当前活动视图容器的标识符',
		'Whether the status bar has keyboard focus': '状态栏是否具有键盘焦点',
		'Style of the window title bar': '窗口标题栏的样式',
		'Whether the title bar is visible': '标题栏是否可见',
		'Title bar is in compact mode': '标题栏处于紧凑模式',
		'Whether the banner has keyboard focus': '横幅是否具有键盘焦点',
		'Whether a notification has keyboard focus': '通知是否具有键盘焦点',
		'Whether the notifications center is visible': '通知中心是否可见',
		'Whether a notification toast is visible': '通知浮窗是否可见',

		// ============================================== contextkeys.ts — auxiliary & panel
		'The identifier of the active auxiliary panel': '当前活动辅助面板的标识符',
		'Whether the auxiliary bar has keyboard focus': '辅助栏是否具有键盘焦点',
		'Whether the auxiliary bar is visible': '辅助栏是否可见',
		'Whether the layout surface representing the secondary side bar is visible': '表示次要边侧栏的布局表面是否可见',
		'Whether the auxiliary bar is maximized': '辅助栏是否已最大化',
		'The identifier of the active panel': '当前活动面板的标识符',
		'Whether the panel has keyboard focus': '面板是否具有键盘焦点',
		"The position of the panel, always 'bottom'": '面板的位置，固定为 bottom',
		"The alignment of the panel, either 'center', 'left', 'right' or 'justify'":
			'面板的对齐方式，取值为 center 或 left 或 right 或 justify',
		'Whether the panel is visible': '面板是否可见',
		'Whether the panel is maximized': '面板是否已最大化',
		'The identifier of the view that has keyboard focus': '当前具有键盘焦点的视图的标识符',

		// ================================================== contextkeys.ts — resources
		'The scheme of the resource': '资源的方案',
		'The file name of the resource': '资源的文件名',
		'The folder name the resource is contained in': '资源所在的文件夹名称',
		'The full path of the resource': '资源的完整路径',
		'The language identifier of the resource': '资源的语言标识符',
		'The full value of the resource including scheme and path': '包含方案与路径的资源完整值',
		'The extension name of the resource': '资源的扩展名',
		'Whether a resource is present or not': '是否存在某个资源',
		'Whether the resource is backed by a file system provider': '该资源是否由文件系统提供程序支持',
	};

	return dict;
})();