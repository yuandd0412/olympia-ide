// zh-cn dictionary batch 34 -- file operations: copy/paste, download, explorer settings, save conflicts
export default {
	// ---- copy / paste ----
	'Copying...': '正在复制...',
	'Use the actions in the editor tool bar to either undo your changes or overwrite the content of the file with your changes.':
		'使用编辑器工具栏中的操作，可以撤销你的更改，或用你的更改覆盖文件内容。',
	'Do you want to copy the folders or add the folders to the workspace?':
		'你是想复制这些文件夹，还是把它们添加到工作区？',
	'Do you want to copy \'{0}\' or add \'{0}\' as a folder to the workspace?':
		'你是想复制 \'{0}\'，还是把 \'{0}\' 作为文件夹添加到工作区？',
	'Are you sure to want to copy folders?': '确定要复制文件夹吗？',
	'Are you sure to want to copy \'{0}\'?': '确定要复制 \'{0}\' 吗？',
	'&&Copy Folders': '复制文件夹(&&C)',
	'&&Copy Folder': '复制文件夹(&&C)',
	'&&Add Folders to Workspace': '将文件夹添加到工作区(&&A)',
	'&&Add Folder to Workspace': '将文件夹添加到工作区(&&A)',
	'Are you sure you want to paste the following {0} items?': '确定要粘贴以下 {0} 个项目吗？',
	'Are you sure you want to paste \'{0}\'?': '确定要粘贴 \'{0}\' 吗？',
	'File to paste is an ancestor of the destination folder': '要粘贴的文件是目标文件夹的上级目录',
	'Some or all of the dropped files could not be accessed for import.': '拖放的部分或全部文件无法访问以进行导入。',
	'The dropped file could not be accessed for import.': '该拖放的文件无法访问以进行导入。',

	// ---- download / upload ----
	'Uploading': '正在上传',
	'Downloading': '正在下载',
	'Choose Where to Download': '选择下载位置',
	'Download {0}': '下载 {0}',
	'Downloading {0}': '正在下载 {0}',
	'Overwrite {0}': '覆盖 {0}',
	'Overwriting {0}': '正在覆盖 {0}',
	'The following {0} files and/or folders already exist in the destination folder. Do you want to replace them?':
		'以下 {0} 个文件和/或文件夹在目标文件夹中已存在。要替换它们吗？',

	// ---- revert / save ----
	'Create {0}': '创建 {0}',
	'Rename {0} to {1}': '将 {0} 重命名为 {1}',
	'Revert All': '全部还原',
	'Failed to revert \'{0}\': {1}': '还原 \'{0}\' 失败：{1}',
	'Save without Formatting': '保存但不格式化',
	'Binary File Editor': '二进制文件编辑器',
	'{0} (in file) ↔ {1}': '{0}（文件中）↔ {1}',

	// ---- read-only session ----
	'Set Active Editor Read-only in Session': '在本会话中把活动编辑器设为只读',
	'Set Active Editor Writeable in Session': '在本会话中把活动编辑器设为可写',
	'Toggle Active Editor Read-only in Session': '在本会话中切换活动编辑器的只读状态',
	'Reset Active Editor Read-only in Session': '在本会话中重置活动编辑器的只读状态',

	// ---- encoding / eol ----
	'Enable the pattern.': '启用该模式。',
	'Disable the pattern.': '禁用该模式。',
	'The default character set encoding to use when reading and writing files. This setting can also be configured per language.':
		'读写文件时使用的默认字符集编码。此设置也可按语言单独配置。',
	'LF': 'LF（换行）',
	'CRLF': 'CRLF（回车换行）',
	'Uses operating system specific end of line character.': '使用操作系统特定的行尾符。',
	'The default end of line character.': '默认的行尾符。',
	'Moves files/folders to the OS trash (recycle bin on Windows) when deleting. Disabling this will delete files/folders permanently.':
		'删除时把文件/文件夹移入系统回收站（Windows 上为回收站）。禁用后将永久删除文件/文件夹。',
	'When enabled, will trim trailing whitespace when saving a file.': '启用后，保存文件时会裁剪行尾空白字符。',
	'When enabled, insert a final new line at the end of the file when saving it.':
		'启用后，保存文件时会在文件末尾插入一个换行符。',
	'When enabled, will trim all new lines after the final new line at the end of the file when saving it.':
		'启用后，保存文件时会裁剪文件末尾换行符之后的所有换行。',

	// ---- save conflicts ----
	'Restore the undo stack when a file is reopened.': '重新打开文件时恢复撤销栈。',
	'Will refuse to save and ask for resolving the save conflict manually.':
		'将拒绝保存，并要求手动解决保存冲突。',
	'Will resolve the save conflict by overwriting the file on disk with the changes in the editor.':
		'将用编辑器中的更改覆盖磁盘上的文件，以解决保存冲突。',
	'Timeout in milliseconds after which file participants for create, rename, and delete are cancelled. Use `0` to disable participants.':
		'创建、重命名和删除的文件参与者超时时间（毫秒）。使用 `0` 表示禁用参与者。',

	// ---- dialogs ----
	'Default path for file dialogs must be an absolute path (e.g. C:\\\\myFolder or /myFolder).':
		'文件对话框的默认路径必须是绝对路径（例如 C:\\\\myFolder 或 /myFolder）。',
	'Default path for file dialogs, overriding user\'s home path. Only used in the absence of a context-specific path, such as most recently opened file or folder.':
		'文件对话框的默认路径，会覆盖用户主目录路径。仅在没有特定上下文路径（如最近打开的文件或文件夹）时使用。',
	'Enables the simple file dialog for opening and saving files and folders. The simple file dialog replaces the system file dialog when enabled.':
		'启用用于打开和保存文件及文件夹的简易文件对话框。启用后该对话框会替代系统文件对话框。',
	'Controls if format on save formats the whole file or only modifications. Only applies when `#editor.formatOnSave#` is enabled.':
		'控制「保存时格式化」是格式化整个文件还是仅格式化修改部分。仅在启用 `#editor.formatOnSave#` 时生效。',

	// ---- explorer ----
	'File Explorer': '文件资源管理器',
	'Controls whether the Explorer should automatically reveal and select files when opening them.':
		'控制资源管理器在打开文件时是否自动显示并选中它们。',
	'Controls whether the Explorer should allow to move files and folders via drag and drop. This setting only effects drag and drop from inside the Explorer.':
		'控制资源管理器是否允许通过拖放移动文件和文件夹。此设置仅对资源管理器内部的拖放生效。',
	'Controls whether the Explorer should ask for confirmation to move files and folders via drag and drop.':
		'控制通过拖放移动文件和文件夹时是否要求确认。',
	'Controls whether the Explorer should ask for confirmation when pasting native files and folders.':
		'控制粘贴本地文件和文件夹时是否要求确认。',
};