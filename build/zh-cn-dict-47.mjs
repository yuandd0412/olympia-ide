// zh-cn dictionary batch 47 -- problems view: filtering, counts, navigation, view modes
export default {
	// ---- view ----
	'Problems View': '问题视图',
	'Show the problems view as a tree.': '以树状图显示问题视图。',
	'Show the problems view as a table.': '以表格显示问题视图。',
	'View as Table': '以表格视图显示',
	'Controls the default view mode of the Problems view.': '控制问题视图的默认视图模式。',
	'Controls whether Problems view should automatically reveal files when opening them.':
		'控制问题视图在打开文件时是否自动展开定位到该文件。',
	'Focus problems view': '聚焦到问题视图',
	'Focus problems filter': '聚焦到问题筛选框',

	// ---- filters ----
	'Show Errors': '显示错误',
	'Show Warnings': '显示警告',
	'Show Infos': '显示提示信息',
	'Show or hide errors in the problems view.': '在问题视图中显示或隐藏错误。',
	'Show or hide warnings in the problems view.': '在问题视图中显示或隐藏警告。',
	'Show or hide infos in the problems view.': '在问题视图中显示或隐藏提示信息。',
	'Show Active File Only': '仅显示活动文件',
	'Show or hide problems (errors, warnings, info) only from the active file in the problems view.':
		'在问题视图中仅显示来自活动文件的问题（错误、警告、提示信息）。',
	'Show Excluded Files': '显示已排除的文件',
	'Show or hide excluded files in the problems view.': '在问题视图中显示或隐藏已排除的文件。',
	'Hide Excluded Files': '隐藏已排除的文件',
	'Filter Problems': '筛选问题',
	'Clear filters text': '清除筛选文本',
	'Clear Filters': '清除筛选',
	'Filter (e.g. text, **/*.ts, !**/node_modules/**, @source:ts)':
		'筛选条件（例如 text、**/*.ts、!**/node_modules/**、@source:ts）',
	'No results found with provided filter criteria.': '按提供的筛选条件未找到结果。',

	// ---- counts ----
	'Errors: {0}': '错误：{0}',
	'Warnings: {0}': '警告：{0}',
	'Infos: {0}': '提示信息：{0}',
	'errors': '错误',
	'warnings': '警告',
	'infos': '提示信息',
	'1 Error': '1 个错误',
	'{0} Errors': '{0} 个错误',
	'1 problem in this file': '此文件中有 1 个问题',
	'{0} problems in this file': '此文件中有 {0} 个问题',
	'No Problems': '没有问题',
	'No problems have been detected in the current file.': '当前文件中未检测到任何问题。',
	'Showing {0} problems': '正在显示 {0} 个问题',
	'Showing {0} of {1} problems': '正在显示 {1} 个问题中的 {0} 个',

	// ---- messages / details ----
	'Message': '消息',
	'Show message in multiple lines': '以多行显示消息',
	'Show message in single line': '以单行显示消息',
	'[Ln {0}, Col {1}]': '[第 {0} 行，第 {1} 列]',
	'Show fixes': '显示修复方案',
	'Show Errors & Warnings on files and folder. Overwritten by {0} when it is off.':
		'在文件和文件夹上显示错误与警告。当 {0} 关闭时会被其覆盖。',

	// ---- problems turned off ----
	'Problems are turned off. Click to open settings.': '问题检测已关闭。点击以打开设置。',
	'Problems Visibility': '问题可见性',
	'10K+': '1 万+',

	// ---- navigation ----
	'Toggle Problems (Errors, Warnings, Infos)': '切换问题（错误、警告、提示信息）',
	'Focus Problems (Errors, Warnings, Infos)': '聚焦到问题（错误、警告、提示信息）',
	'When enabled shows the current problem in the status bar.': '启用后在状态栏中显示当前问题。',
	'Controls the order in which problems are navigated.': '控制问题的导航顺序。',
	'Navigate problems ordered by severity': '按严重程度顺序浏览问题',
	'Navigate problems ordered by position': '按位置顺序浏览问题',
};