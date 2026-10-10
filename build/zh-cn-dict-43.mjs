// zh-cn dictionary batch 43 -- workspace trust: restricted mode, trust prompts, settings
export default {
	// ---- trust prompts ----
	'Do you trust the authors of the files in this folder?': '你信任此文件夹中文件的作者吗？',
	'Do you trust the authors of the files in this workspace?': '你信任此工作区中文件的作者吗？',
	'You are trying to open an untrusted folder. Do you trust the authors of this content?':
		'你正尝试打开一个不受信任的文件夹。你信任此内容的作者吗？',
	'Do you want to allow untrusted files in this workspace?': '要允许此工作区中不受信任的文件吗？',
	'Do you want to allow untrusted files in this window?': '要允许此窗口中不受信任的文件吗？',
	'You are trying to open untrusted files in a workspace which is trusted.':
		'你正尝试在受信任的工作区中打开不受信任的文件。',
	'You are trying to open untrusted files in a window which is trusted.':
		'你正尝试在受信任的窗口中打开不受信任的文件。',
	'You are adding files that are not currently trusted to a trusted workspace. Do you trust the authors of these new files?':
		'你正在向受信任的工作区添加当前不受信任的文件。你信任这些新文件的作者吗？',
	'Trust the authors of all files in the parent folder \'{0}\'': '信任父文件夹 \'{0}\' 中所有文件的作者',
	'Remember my decision for all workspaces': '我的决定适用于所有工作区',
	'A feature you are trying to use may be a security risk if you do not trust the source of the files or folders you currently have open.':
		'如果你不信任当前打开的文件或文件夹的来源，那么你想使用的功能可能存在安全风险。',
	'{0} provides features that may automatically execute files in this workspace.':
		'{0} 提供的功能可能会自动执行此工作区中的文件。',
	'{0} provides features that may automatically execute files in this folder.':
		'{0} 提供的功能可能会自动执行此文件夹中的文件。',

	// ---- actions ----
	'Trust Folder': '信任此文件夹',
	'Select Folder To Trust': '选择要信任的文件夹',
	'Trust folder and enable all features': '信任文件夹并启用所有功能',
	'Trust workspace and enable all features': '信任工作区并启用所有功能',
	'Trusting this workspace will also mark it as trusted in {0}.': '信任此工作区同时也会在 {0} 中将其标记为受信任。',
	'Trusting this folder will also mark it as trusted in {0}.': '信任此文件夹同时也会在 {0} 中将其标记为受信任。',
	'Open folder in restricted mode': '在受限模式下打开文件夹',
	'Open workspace in restricted mode': '在受限模式下打开工作区',

	// ---- restricted mode ----
	'In Restricted Mode': '在受限模式下',
	'Restricted Mode: Some features are disabled because this window is not trusted.':
		'受限模式：由于当前窗口不受信任，部分功能已被禁用。',
	'Restricted Mode: Some features are disabled because this folder is not trusted.':
		'受限模式：由于当前文件夹不受信任，部分功能已被禁用。',
	'Restricted Mode: Some features are disabled because this workspace is not trusted.':
		'受限模式：由于当前工作区不受信任，部分功能已被禁用。',
	'Restricted Mode is intended for safe code browsing. Trust this window to enable all features. Use navigation keys to access banner actions.':
		'受限模式用于安全地浏览代码。信任此窗口即可启用所有功能。使用导航键可访问横幅操作。',
	'Restricted Mode is intended for safe code browsing. Trust this folder to enable all features. Use navigation keys to access banner actions.':
		'受限模式用于安全地浏览代码。信任此文件夹即可启用所有功能。使用导航键可访问横幅操作。',
	'Restricted Mode is intended for safe code browsing. Trust this workspace to enable all features. Use navigation keys to access banner actions.':
		'受限模式用于安全地浏览代码。信任此工作区即可启用所有功能。使用导航键可访问横幅操作。',
	'Restricted Mode is intended for safe code browsing. Trust this window to enable all features.':
		'受限模式用于安全地浏览代码。信任此窗口即可启用所有功能。',
	'Restricted Mode is intended for safe code browsing. Trust this folder to enable all features.':
		'受限模式用于安全地浏览代码。信任此文件夹即可启用所有功能。',
	'Restricted Mode is intended for safe code browsing. Trust this workspace to enable all features.':
		'受限模式用于安全地浏览代码。信任此工作区即可启用所有功能。',
	'Tasks are allowed to run': '允许运行任务',
	'Debugging is enabled': '调试已启用',
	'All enabled extensions are activated': '所有已启用的扩展均已激活',
	'Tasks are not allowed to run': '不允许运行任务',
	'Debugging is disabled': '调试已禁用',

	// ---- trust editor / settings ----
	'Trusted Folders & Workspaces': '受信任的文件夹和工作区',
	'Workspace Trust Editor': '工作区信任编辑器',
	'Configure Workspace Trust Settings': '配置工作区信任设置',
	'Controls whether or not Workspace Trust is enabled within Olympia IDE.': '控制 Olympia IDE 中是否启用工作区信任。',
	'Controls when the startup prompt to trust a workspace is shown.': '控制信任工作区的启动提示何时显示。',
	'Ask for trust every time an untrusted workspace is opened.': '每次打开不受信任的工作区时都询问是否信任。',
	'Ask for trust the first time an untrusted workspace is opened.': '首次打开不受信任的工作区时询问是否信任。',
	'Do not ask for trust when an untrusted workspace is opened.': '打开不受信任的工作区时不询问是否信任。',
	'Controls when the restricted mode banner is shown.': '控制受限模式横幅何时显示。',
	'Show the banner every time an untrusted workspace is open.': '每次打开不受信任的工作区时都显示横幅。',
	'Show the banner when an untrusted workspace is opened until dismissed.': '打开不受信任的工作区时显示横幅，直到手动关闭。',
	'Do not show the banner when an untrusted workspace is open.': '打开不受信任的工作区时不显示横幅。',
};