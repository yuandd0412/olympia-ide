// zh-cn dictionary batch 46 -- tasks: run task, quick pick, task states, automatic tasks
export default {
	// ---- run / manage ----
	'Run Build Task': '运行构建任务',
	'Run Test Task': '运行测试任务',
	'Configure Default Build Task': '配置默认构建任务',
	'Configure Default Test Task': '配置默认测试任务',
	'Open Workspace Tasks': '打开工作区任务',
	'Open User Tasks': '打开用户任务',
	'Show All Tasks...': '显示所有任务...',
	'All {0} tasks': '全部 {0} 个任务',
	'Type the name of a task to run.': '输入要运行的任务名称。',
	'The task\'s label or a term to filter by': '任务的标签，或用于筛选的关键词',
	'No matching tasks': '没有匹配的任务',
	'Filters the tasks shown in the quickpick': '筛选快速选择器中显示的任务',

	// ---- running states ----
	'Running Tasks': '正在运行的任务',
	'Show Running Tasks': '显示正在运行的任务',
	'{0} running tasks': '{0} 个正在运行的任务',
	'Terminate Task': '终止任务',
	'Task is running': '任务正在运行',
	'Task succeeded': '任务已成功',
	'Task succeeded and waiting...': '任务已成功，正在等待...',
	'Task has errors': '任务有错误',
	'Task has errors and is waiting...': '任务有错误，正在等待...',
	'Task has warnings': '任务有警告',
	'Task has warnings and is waiting...': '任务有警告，正在等待...',
	'Task has infos': '任务有提示信息',
	'Task has infos and is waiting...': '任务有提示信息，正在等待...',
	'Show Task Log': '显示任务日志',
	'Rerun Last Task': '重新运行上一个任务',
	'Restart Running Task': '重启正在运行的任务',
	'Rerun All Running Tasks': '重新运行所有正在运行的任务',
	'There are issues with task "{0}". See the output for more details.':
		'任务「{0}」存在问题。查看输出了解详细信息。',
	'Beginning of detected errors for this run': '本次运行检测到的错误开始处',
	'There is no task provider registered for tasks of type "{0}".': '没有为类型「{0}」的任务注册任务提供程序。',
	'The contributed task type': '贡献的任务类型',
	'The task provider for "{0}" tasks unexpectedly provided a task of type "{1}".\n':
		'「{0}」任务的任务提供程序意外提供了类型为「{1}」的任务。\n',

	// ---- save before run ----
	'Save all editors?': '要保存所有编辑器吗？',
	'Do you want to save all editors before running the task?': '运行任务前要保存所有编辑器吗？',
	'Open Files': '打开的文件',

	// ---- automatic tasks ----
	'Manage Automatic Tasks': '管理自动任务',
	'Allow Automatic Tasks': '允许自动任务',
	'Disallow Automatic Tasks': '禁止自动任务',
	'Disallow': '禁止',
	'Enable automatic tasks - note that tasks won\'t run in an untrusted workspace.':
		'启用自动任务 —— 注意：在不受信任的工作区中任务不会运行。',
	'{0} task detection is turned off. Enable {1} task detection...': '{0} 任务检测已关闭。启用 {1} 任务检测...',

	// ---- settings ----
	'Configures whether a warning is shown when a provider is slow':
		'配置当提供程序响应缓慢时是否显示警告',
	'Controls the number of recent items tracked in task quick open dialog.':
		'控制任务快速打开对话框中跟踪的最近项目数量。',
	'Controls whether to show the task detail for tasks that have a detail in task quick picks, such as Run Task.':
		'控制是否在「运行任务」等任务快速选择器中显示任务的详细信息。',
	'Controls whether the task quick pick is skipped when there is only one task to pick from.':
		'控制当只有一个可选任务时是否跳过任务快速选择器。',
	'Causes the Tasks: Run Task command to use the slower "show all" behavior instead of the faster two level picker where tasks are grouped by provider.':
		'让「任务：运行任务」命令使用较慢的「显示全部」行为，而不是按提供程序分组的更快两级选择器。',
	'On window reload, reconnect to tasks that have problem matchers.':
		'窗口重新加载时，重新连接到带问题匹配器的任务。',
	'Enable verbose logging for tasks.': '启用任务的详细日志记录。',
	'Always': '总是',
	'Never': '从不',

	// ---- trust gate ----
	'Listing and running tasks requires that some of the files in this workspace be executed as code.':
		'列出和运行任务需要将当前工作区中的某些文件作为代码执行。',

	// ---- deprecation ----
	'The deprecated tasks version 0.1.0 has been removed. Your tasks have been upgraded to version 2.0.0. Open the diff to review the upgrade.':
		'已弃用的任务版本 0.1.0 已被移除。你的任务已升级到 2.0.0 版本。打开差异以查看升级内容。',
	'The deprecated tasks version 0.1.0 has been removed. Your tasks have been upgraded to version 2.0.0. Open the diffs to review the upgrade.':
		'已弃用的任务版本 0.1.0 已被移除。你的任务已升级到 2.0.0 版本。打开差异以查看升级内容。',
	'Open diff': '打开差异',
	'Open diffs': '打开差异',

	// ---- fix with ai ----
	'Fix with AI': '用 AI 修复',
};