// Batch 58 — source control + update
export default {
	// ===================== scm: quick diff =====================
	'{0} pending changes': '{0} 项待处理的更改',
	'Added lines': '新增的行',
	'Changed lines': '修改的行',
	'Removed lines': '删除的行',
	'Switch quick diff base': '切换快速差异对比基准',
	'Next &&Change': '下一个更改(&&C)',
	'Previous &&Change': '上一个更改(&&C)',

	// ===================== scm.contribution.ts =====================
	'View icon of the Source Control view.': '源代码管理视图的视图图标。',
	'Source &&Control': '源代码管理(&&C)',
	'Controls the font for the input message. Use `default` for the workbench user interface font family, `editor` for the `#editor.fontFamily#`\'s value, or a custom font family.':
		'控制输入消息所使用的字体。`default` 表示使用工作台界面字体，`editor` 表示使用 `#editor.fontFamily#` 的值，也可以指定自定义字体。',
	'Repositories in the Source Control Repositories view are sorted by discovery time. Repositories in the Source Control view are sorted in the order that they were selected.':
		'"代码仓库"视图中的仓库按发现时间排序；"源代码管理"视图中的仓库按被选中的顺序排序。',
	'Controls whether the Source Control view should render folders in a compact form. In such a form, single child folders will be compressed in a combined tree element.':
		'控制源代码管理视图是否以紧凑形式呈现文件夹。在这种形式下，仅含单个子项的文件夹会被压缩为一个合并的树元素。',
	'Controls which badges are shown in the Source Control Graph view. The badges are shown on the right side of the graph indicating the names of history item groups.':
		'控制源代码管理图视图中显示哪些徽章。徽章显示在图的右侧，用于标明历史项分组的名称。',

	// ===================== scmAccessibilityHelp.ts =====================
	'- Use the up/down arrow keys to navigate the list of repositories.': '- 使用上/下方向键在仓库列表中导航。',
	'- Use the Enter or Space keys to select a repository.': '- 使用 Enter 或空格键选择仓库。',
	'- Use Shift + up/down keys to select multiple repositories.': '- 使用 Shift + 上/下方向键选择多个仓库。',
	'- Use the up/down arrow keys to navigate the list of repositories, resource groups and resources.':
		'- 使用上/下方向键在仓库、资源组和资源列表中导航。',
	'- Use the Space key to expand or collapse a resource group.': '- 使用空格键展开或折叠资源组。',
	'The Source Control Graph view displays a graph history items of the repository. If the workspace contains more than one repository it will list the history items of the active repository.':
		'源代码管理图视图以图的形式展示仓库的历史项。如果工作区包含多个仓库，则会列出活动仓库的历史项。',
	'- Use the up/down arrow keys to navigate the list of history items.': '- 使用上/下方向键在历史项列表中导航。',
	'- Use the Space key to open the history item details in the multi-file diff editor.':
		'- 使用空格键在多文件差异编辑器中打开历史项详情。',

	// ===================== scmHistoryChatContext.ts =====================
	'Source Control...': '源代码管理...',
	'Select a change': '选择一项更改',
	'file(s)': '个文件',
	'Explain Changes': '解释更改',

	// ===================== scmHistoryViewPane.ts =====================
	'{0} Load More...': '{0} 加载更多...',
	'Source Control History': '源代码管理历史',
	'Show the source control graph for the active repository': '显示活动仓库的源代码管理图',
	'Select the repository to view, type to filter all repositories': '选择要查看的仓库，输入内容可筛选所有仓库',
	'Current history item reference(s)': '当前历史项引用',
	'Select one/more history item references to view, type to filter': '选择要查看的一个或多个历史项引用，输入内容可筛选',
	'Please refresh the graph using the refresh action ({0}).': '请使用刷新操作（{0}）刷新该图形。',

	// ===================== scmInput.ts =====================
	'{0}, Use {1} to open Source Control Accessibility Help.': '{0}，使用 {1} 打开源代码管理无障碍功能帮助。',
	'{0}, Run the Open Accessibility Help command for more information.': '{0}，运行"打开无障碍功能帮助"命令以了解更多信息。',
	'Generate Commit Message': '生成提交信息',

	// ===================== scmViewPane.ts =====================
	'Source Control Management': '源代码管理',
	'Source Control Input': '源代码管理输入框',
	'Source Control Input, Use {0} to open Source Control Accessibility Help.':
		'源代码管理输入框，使用 {0} 打开源代码管理无障碍功能帮助。',
	'Source Control Input, Run the Open Accessibility Help command for more information.':
		'源代码管理输入框，运行"打开无障碍功能帮助"命令以了解更多信息。',
	'View & Sort': '查看和排序(&S)',
	'Sort by Discovery Time': '按发现时间排序',
	'Sort by Name': '按名称排序',
	'Sort by Path': '按路径排序',
	'Select Single Repository': '选择单个仓库',
	'Select Multiple Repositories': '选择多个仓库',
	'Sort Changes by Name': '按名称对更改排序',
	'Sort Changes by Path': '按路径对更改排序',
	'Sort Changes by Status': '按状态对更改排序',
	'Collapse All Repositories': '折叠所有仓库',
	'Expand All Repositories': '展开所有仓库',

	// ===================== common/quickDiff.ts =====================
	'Editor gutter background color for lines that are modified.': '已修改行的编辑器装订线背景色。',
	'Editor gutter secondary background color for lines that are modified.': '已修改行的编辑器装订线次要背景色。',
	'Editor gutter background color for lines that are added.': '新增行的编辑器装订线背景色。',
	'Editor gutter secondary background color for lines that are added.': '新增行的编辑器装订线次要背景色。',
	'Editor gutter background color for lines that are deleted.': '删除行的编辑器装订线背景色。',
	'Editor gutter secondary background color for lines that are deleted.': '删除行的编辑器装订线次要背景色。',
	'Minimap gutter background color for lines that are modified.': '已修改行的缩略图装订线背景色。',
	'Minimap gutter background color for lines that are added.': '新增行的缩略图装订线背景色。',
	'Minimap gutter background color for lines that are deleted.': '删除行的缩略图装订线背景色。',
	'Overview ruler marker color for modified content.': '修改内容的概览标尺标记颜色。',
	'Overview ruler marker color for added content.': '新增内容的概览标尺标记颜色。',
	'Overview ruler marker color for deleted content.': '删除内容的概览标尺标记颜色。',
	'Editor gutter decoration color for gutter item glyphs.': '装订线项字形的编辑器装订线装饰颜色。',
	'Editor gutter decoration color for gutter item background. This color should be opaque.':
		'装订线项背景的编辑器装订线装饰颜色。该颜色应为不透明色。',

	// ===================== update =====================
	'Press Tab or Shift+Tab to move between links, settings, the update preference checkbox, and available setup actions. Press Enter to activate a link. Press Space or Enter to activate a setup button.':
		'按 Tab 或 Shift+Tab 可在链接、设置、更新偏好复选框和可用的安装操作之间移动。按 Enter 可激活链接，按空格或 Enter 可激活安装按钮。',
	'{0} ({1})': '{0}（{1}）',
	'Show &&Release Notes': '显示发行说明(&&R)',
	'Download Update': '下载更新',
	'Install Update': '安装更新',
	'Restart to Update': '重启以更新',
	'Apply Update from File...': '从文件应用更新...',
	'&&Update': '更新(&&U)',
	'&&Reload': '重新加载(&&R)',
	'Choose the settings sync service to use after changing the version': '选择更改版本后要使用的设置同步服务',
	'The Insiders version of Olympia IDE will synchronize your settings, keybindings, extensions, snippets and UI State using separate insiders settings sync service by default.':
		'Olympia IDE 的 Insiders 版本默认使用独立的 insiders 设置同步服务，同步你的设置、按键绑定、扩展、代码片段和界面状态。',
	'&&Insiders': 'Insiders(&&I)',
	'&&Stable (current)': '稳定版(&&S)（当前）',

	// --- title bar indicator ---
	'Updating...': '正在更新...',
	'Downloading...': '正在下载...',
	'Restarting...': '正在重启...',
	'Cancelling...': '正在取消...',

	// --- update tooltip ---
	'Current Version: {0} ({1})': '当前版本：{0}（{1}）',
	'Current Version: {0}': '当前版本：{0}',
	'Initializing': '正在初始化',
	'Initializing update service...': '正在初始化更新服务...',
	'Updates Disabled': '更新已禁用',
	'Updates are not available for this build.': '此版本不支持更新。',
	'Updates are disabled by the --disable-updates command line flag.': '更新已被 --disable-updates 命令行标志禁用。',
	'Updates are manually disabled. Change the "update.mode" setting to enable.':
		'更新已被手动禁用。更改 "update.mode" 设置即可启用。',
	'Updates are disabled by organization policy.': '更新已被组织策略禁用。',
	'Updates are disabled because no update URL is configured.': '由于未配置更新 URL，更新已禁用。',
	'Updates are disabled because the update URL is invalid.': '由于更新 URL 无效，更新已禁用。',
	'Updates are not available when running a user install of {0} as administrator.':
		'以管理员身份运行用户安装的 {0} 时不支持更新。',
	'Updates are disabled.': '更新已禁用。',
	'Update Error': '更新错误',
	'No Update Available': '没有可用的更新',
	'There are no updates currently available.': '当前没有可用的更新。',
	'Up to Date': '已是最新版本',
	'Automatic updates are disabled.': '自动更新已禁用。',
	'Automatic updates will be checked but not installed automatically.': '会自动检查更新，但不会自动安装。',
	'Updates will be applied on restart.': '更新将在重启后应用。',
	'Automatic updates are enabled. Happy Coding!': '自动更新已启用。祝你编程愉快！',
	'Checking for Updates': '正在检查更新',
	'Checking for updates, please wait...': '正在检查更新，请稍候...',
	'Update Available': '有可用更新',
	'Downloading Update': '正在下载更新',
	'{0}/s': '{0}/秒',
	'Downloading update, please wait...': '正在下载更新，请稍候...',
	'Update is Ready to Install': '更新已就绪，可以安装',
	'Installing Update': '正在安装更新',
	'Installing update, please wait...': '正在安装更新，请稍候...',
	'Update Installed': '更新已安装',
	'Downloading Newer Update': '正在下载更新的版本',
	'A newer update was released. Downloading, please wait...': '已发布更新的版本，正在下载，请稍候...',
	'Restarting {0}': '正在重启 {0}',
	'Restarting to update, please wait...': '正在重启以应用更新，请稍候...',
	'Cancelling Update': '正在取消更新',
	'Cancelling update, please wait...': '正在取消更新，请稍候...',
	'Latest Version: {0} ({1})': '最新版本：{0}（{1}）',
	'Latest Version: {0}': '最新版本：{0}',
	'Released {0}': '发布于 {0}',

	// --- updateUtils ---
	'{0} hour': '{0} 小时',
	'{0} hours': '{0} 小时',
	'{0} min': '{0} 分钟',
	'{0}s': '{0} 秒',
	'{0} B': '{0} B',
	'{0} KB': '{0} KB',
	'{0} MB': '{0} MB',
	'{0} GB': '{0} GB',
};