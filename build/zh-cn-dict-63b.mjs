// Batch 63b — the 12 theme.ts descriptions that extract-batch.mjs silently dropped.
//
// Root cause: extract-batch.mjs filtered with `l.text.length <= 200`, and every
// colour description that repeats the shared explanatory sentence runs 202-284
// chars. Nothing warned; the batch simply looked smaller than it was. The cap is
// removed and all batches were re-scanned afterwards.
//
// Same note constants as batch 63 so the shared sentences stay byte-identical.
export default (() => {
	const TABS = 'Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.';
	const PANEL = 'Panels are shown below the editor area and contain views like output and integrated terminal.';
	const PANEL_SEC = PANEL + ' Panel sections are views nested within the panels.';
	const SIDEBAR = 'The side bar is the container for views like explorer and search.';
	const SIDEBAR_SEC = SIDEBAR + ' Side bar sections are views nested within the side bar.';

	const Z_TABS = '标签页是编辑器区域中编辑器的容器，一个编辑器组中可以打开多个标签页，也可以有多个编辑器组。';
	const Z_PANEL = '面板显示在编辑器区域下方，包含输出和集成终端等视图。';
	const Z_PANEL_SEC = Z_PANEL + '面板分区是嵌套在面板内部的视图。';
	const Z_SIDEBAR = '侧边栏是资源管理器和搜索等视图的容器。';
	const Z_SIDEBAR_SEC = Z_SIDEBAR + '侧边栏分区是嵌套在侧边栏内部的视图。';

	const k = (prefix, note) => `${prefix} ${note}`;

	return {
		[k('Border on the bottom of an active tab in an unfocused group.', TABS)]:
			'未聚焦编辑器组中活动标签页底部的边框。' + Z_TABS,
		[k('Border to highlight tabs in an unfocused group when hovering.', TABS)]:
			'在未聚焦编辑器组中悬停时，用于突出显示标签页的边框。' + Z_TABS,
		[k('Border between tabs to indicate that a tab can be inserted between two tabs.', TABS)]:
			'标签页之间的边框，用于表示可以在两个标签页之间插入新标签页。' + Z_TABS,
		[k('Border on the top of modified active tabs in an active group.', TABS)]:
			'活动编辑器组中已修改的活动标签页顶部的边框。' + Z_TABS,
		[k('Border on the top of modified inactive tabs in an active group.', TABS)]:
			'活动编辑器组中已修改的非活动标签页顶部的边框。' + Z_TABS,
		[k('Border on the top of modified active tabs in an unfocused group.', TABS)]:
			'未聚焦编辑器组中已修改的活动标签页顶部的边框。' + Z_TABS,
		[k('Border on the top of modified inactive tabs in an unfocused group.', TABS)]:
			'未聚焦编辑器组中已修改的非活动标签页顶部的边框。' + Z_TABS,

		'Status bar background color when a workspace or folder is opened and the window is inactive. Debugging and other background overrides take precedence. If not set, the current status bar background is used.':
			'已打开工作区或文件夹但窗口未激活时的状态栏背景色。调试等其他背景覆盖项的优先级更高。若未设置，则沿用当前的状态栏背景。',

		[k('Drag and drop feedback color for the panel sections. The color should have transparency so that the panel sections can still shine through.', PANEL_SEC)]:
			'面板分区的拖放反馈颜色。该颜色应带有透明度，以便面板分区仍然可以透出。' + Z_PANEL_SEC,
		[k('Panel section header border color used when multiple views are stacked vertically in the panel.', PANEL_SEC)]:
			'面板中纵向堆叠多个视图时所用的分区标题边框颜色。' + Z_PANEL_SEC,
		[k('Panel section border color used when multiple views are stacked horizontally in the panel.', PANEL_SEC)]:
			'面板中横向堆叠多个视图时所用的分区边框颜色。' + Z_PANEL_SEC,

		[k('Drag and drop feedback color for the side bar sections. The color should have transparency so that the side bar sections can still shine through.', SIDEBAR_SEC)]:
			'侧边栏分区的拖放反馈颜色。该颜色应带有透明度，以便侧边栏分区仍然可以透出。' + Z_SIDEBAR_SEC,
	};
})();