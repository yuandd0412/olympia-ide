// zh-cn dictionary batch 44 -- settings sync: enable/turn off, conflicts, service errors
export default {
	// ---- entries ----
	'Turn on Settings Sync...': '开启设置同步...',
	'Turning on Settings Sync...': '正在开启设置同步...',
	'Sign in to Sync Settings': '登录以同步设置',
	'Sign in': '登录',
	'Please sign in to backup and sync your data across devices.':
		'请登录以备份你的数据并在多台设备间同步。',
	'Choose what to sync': '选择要同步的内容',
	'Do you want to turn off sync?': '要关闭同步吗？',
	'Your settings, keybindings, extensions, snippets and UI State will no longer be synced.':
		'你的设置、快捷键、扩展、代码片段和界面状态将不再被同步。',
	'Turn off sync on all your devices and clear the data from the cloud.':
		'在所有设备上关闭同步并清除云端数据。',
	'Clear Data in Cloud...': '清除云端数据...',
	'Show Synced Data': '显示已同步的数据',
	'Open {0} File': '打开 {0} 文件',
	'Operation Id: {0}': '操作 ID：{0}',
	'Settings Sync. Operation Id: {0}': '设置同步。操作 ID：{0}',
	'machine not found with id: {0}': '未找到 ID 为 {0} 的设备',
	'syncing': '正在同步',
	'synced {0}': '已于 {0} 同步',
	'{0}: Configure...': '{0}：配置...',
	'{0}: Select Service': '{0}：选择服务',
	'{0}: Conflicts Detected': '{0}：检测到冲突',
	'{0} ↔ {1}': '{0} ↔ {1}',

	// ---- conflicts ----
	'Replace Remote': '替换为远程版本',
	'Replace Local': '替换为本地版本',
	'Show Conflicts': '显示冲突',
	'Unable to sync due to conflicts in {0}. Please resolve them to continue.':
		'因 {0} 中存在冲突而无法同步。请解决冲突后继续。',
	'Error while accepting changes. Please check [logs]({0}) for more details.':
		'接受更改时出错。查看[日志]({0})了解更多详情。',

	// ---- turned off reasons ----
	'Settings sync was turned off because current session is expired, please sign in again to turn on sync.':
		'由于当前会话已过期，设置同步被关闭。请重新登录后再开启同步。',
	'Settings sync was turned off from another device, please turn on sync again.':
		'设置同步已在其他设备上被关闭，请重新开启同步。',
	'Settings sync was turned off because {0} now uses a separate service. Please turn on sync again.':
		'由于 {0} 现在使用独立服务，设置同步被关闭。请重新开启同步。',

	// ---- disabled reasons ----
	'Disabled syncing {0} because size of the {1} file to sync is larger than {2}. Please open the file and reduce the size and enable sync':
		'已停用 {0} 的同步，因为要同步的 {1} 文件大小超过 {2}。请打开该文件并减小体积后重新启用同步',
	'Settings sync is disabled because the current version ({0}, {1}) is not compatible with the sync service. Please update before turning on sync.':
		'设置同步已被禁用，因为当前版本（{0}，{1}）与同步服务不兼容。请先更新后再开启同步。',
	'Settings sync is disabled because the client is making invalid requests. Please report an issue with the logs.':
		'设置同步已被禁用，因为客户端发出了无效请求。请附上日志报告问题。',
	'Settings sync is disabled because your data in the cloud is older than that of the client. Please clear your data in the cloud before turning on sync.':
		'设置同步已被禁用，因为你云端的数据比客户端的更旧。请先清除云端数据再开启同步。',

	// ---- cannot turn on reasons ----
	'Settings sync cannot be turned on because size of the {0} file to sync is larger than {1}. Please open the file and reduce the size and turn on sync':
		'无法开启设置同步，因为要同步的 {0} 文件大小超过 {1}。请打开该文件并减小体积后开启同步',
	'Settings sync cannot be turned on because the current version ({0}, {1}) is not compatible with the sync service. Please update before turning on sync.':
		'无法开启设置同步，因为当前版本（{0}，{1}）与同步服务不兼容。请先更新再开启同步。',
	'Settings sync cannot be turned on because your data in the cloud is older than that of the client. Please clear your data in the cloud before turning on sync.':
		'无法开启设置同步，因为你云端的数据比客户端的更旧。请先清除云端数据再开启同步。',
	'Unable to sync {0} because the content in the file is not valid. Please open the file and correct it.':
		'无法同步 {0}，因为文件内容无效。请打开该文件并修正。',
	'No authentication providers are available.': '没有可用的身份验证提供程序。',
	'Error while turning on Settings Sync: Authentication failed.': '开启设置同步时出错：身份验证失败。',
	'Error while turning on Settings Sync. Please check [logs]({0}) for more details.':
		'开启设置同步时出错。查看[日志]({0})了解更多详情。',

	// ---- service switch ----
	'Settings Sync has been switched to insiders service': '设置同步已切换到内部服务',
	'Settings Sync has been switched to stable service': '设置同步已切换到稳定服务',
	'Successfully downloaded Settings Sync activity.': '已成功下载设置同步活动记录。',
};