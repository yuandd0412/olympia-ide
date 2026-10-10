// zh-cn dictionary batch 20 -- accessibility signals (screen reader announcements + audio cues)
export default {
	// ---- global signal options ----
	'Enable sound when a screen reader is attached.': '连接屏幕阅读器时启用声音。',
	'Enable sound.': '启用声音。',
	'Disable sound.': '禁用声音。',
	'Enable announcement, will only play when in screen reader optimized mode.':
		'启用播报，仅在屏幕阅读器优化模式下生效。',
	'Disable announcement.': '禁用播报。',
	'Never plays the sound.': '从不播放声音。',
	'Never plays the announcement.': '从不播报。',
	'Never announces.': '从不播报。',
	'Enable announcement': '启用播报',
	'The volume of the sounds in percent (0-100).': '声音音量百分比（0-100）。',
	'Whether or not position changes should be debounced': '位置变化是否应去抖动',
	'The delay in milliseconds before an announcement is made.': '播报前的延迟（毫秒）。',
	'The delay in milliseconds before a sound is played.': '播放声音前的延迟（毫秒）。',
	'The delay in milliseconds before an announcement is made when there\'s a warning at the position.':
		'当该位置有警告时，播报前的延迟（毫秒）。',
	'The delay in milliseconds before a sound is played when there\'s a warning at the position.':
		'当该位置有警告时，播放声音前的延迟（毫秒）。',
	'The delay in milliseconds before an announcement is made when there\'s an error at the position.':
		'当该位置有错误时，播报前的延迟（毫秒）。',
	'The delay in milliseconds before a sound is played when there\'s an error at the position.':
		'当该位置有错误时，播放声音前的延迟（毫秒）。',
	'Announce the welcome message when a new session composer is shown.': '显示新的会话编辑器时播报欢迎信息。',

	// ---- generic signal template ----
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a warning.':
		'当当前行有警告时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when the active line has a warning.': '当当前行有警告时播放声音。',
	'Announces when the active line has a warning.': '当当前行有警告时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has an error.':
		'当当前行有错误时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when the active line has an error.': '当当前行有错误时播放声音。',
	'Announces when the active line has an error.': '当当前行有错误时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a breakpoint.':
		'当当前行有断点时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when the active line has a breakpoint.': '当当前行有断点时播放声音。',
	'Announces when the active line has a breakpoint.': '当当前行有断点时进行播报。',
	'Plays a sound / audio cue when the active line has an inline suggestion.': '当当前行有内联建议时播放声音/听觉提示。',
	'Plays a sound when the active line has an inline suggestion.': '当当前行有内联建议时播放声音。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) when there is a next edit suggestion.':
		'当存在下一条编辑建议时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when there is a next edit suggestion.': '当存在下一条编辑建议时播放声音。',
	'Announces when there is a next edit suggestion.': '当存在下一条编辑建议时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - the active line has a folded area that can be unfolded.':
		'当当前行有可展开的折叠区域时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when the active line has a folded area that can be unfolded.': '当当前行有可展开的折叠区域时播放声音。',
	'Announces when the active line has a folded area that can be unfolded.': '当当前行有可展开的折叠区域时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when the debugger stopped on a breakpoint.':
		'当调试器在断点处停下时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when the debugger stopped on a breakpoint.': '当调试器在断点处停下时播放声音。',
	'Announces when the debugger stopped on a breakpoint.': '当调试器在断点处停下时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when trying to read a line with inlay hints that has no inlay hints.':
		'当读取一行本应含内嵌提示却没有内嵌提示的内容时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when trying to read a line with inlay hints that has no inlay hints.':
		'当读取一行本应含内嵌提示却没有内嵌提示的内容时播放声音。',
	'Announces when trying to read a line with inlay hints that has no inlay hints.':
		'当读取一行本应含内嵌提示却没有内嵌提示的内容时进行播报。',

	// ---- terminal ----
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a terminal command fails (non-zero exit code).':
		'当终端命令失败（退出码非零）时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when a terminal command fails (non-zero exit code).': '当终端命令失败（退出码非零）时播放声音。',
	'Announces when a terminal command fails (non-zero exit code).': '当终端命令失败（退出码非零）时进行播报。',
	'Plays a sound when a terminal command fails (non-zero exit code) or when a command with such an exit code is navigated to in the accessible view.':
		'当终端命令失败（退出码非零），或在无障碍视图中导航到具有该退出码的命令时播放声音。',
	'Announces when a terminal command fails (non-zero exit code) or when a command with such an exit code is navigated to in the accessible view.':
		'当终端命令失败（退出码非零），或在无障碍视图中导航到具有该退出码的命令时进行播报。',
	'Plays a sound when a terminal command succeeds (zero exit code) or when a command with such an exit code is navigated to in the accessible view.':
		'当终端命令成功（退出码为零），或在无障碍视图中导航到具有该退出码的命令时播放声音。',
	'Announces when a terminal command succeeds (zero exit code) or when a command with such an exit code is navigated to in the accessible view.':
		'当终端命令成功（退出码为零），或在无障碍视图中导航到具有该退出码的命令时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when terminal Quick Fixes are available.':
		'当终端有可用的快速修复时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when terminal Quick Fixes are available.': '当终端有可用的快速修复时播放声音。',
	'Announces when terminal Quick Fixes are available.': '当终端有可用的快速修复时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when the terminal bell is ringing.':
		'当终端响铃时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when the terminal bell is ringing.': '当终端响铃时播放声音。',
	'Announces when the terminal bell is ringing.': '当终端响铃时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a feature is cleared (for example, the terminal, Debug Console, or Output channel).':
		'当某个区域被清空时（如终端、调试控制台或输出通道）发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when a feature is cleared.': '当某个区域被清空时播放声音。',
	'Announces when a feature is cleared.': '当某个区域被清空时进行播报。',

	// ---- tasks / notebook ----
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a task is completed.':
		'当任务完成时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when a task is completed.': '当任务完成时播放声音。',
	'Announces when a task is completed.': '当任务完成时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a task fails (non-zero exit code).':
		'当任务失败（退出码非零）时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when a task fails (non-zero exit code).': '当任务失败（退出码非零）时播放声音。',
	'Announces when a task fails (non-zero exit code).': '当任务失败（退出码非零）时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a notebook cell execution is successfully completed.':
		'当笔记本单元格执行成功完成时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when a notebook cell execution is successfully completed.': '当笔记本单元格执行成功完成时播放声音。',
	'Announces when a notebook cell execution is successfully completed.': '当笔记本单元格执行成功完成时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a notebook cell execution fails.':
		'当笔记本单元格执行失败时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when a notebook cell execution fails.': '当笔记本单元格执行失败时播放声音。',
	'Announces when a notebook cell execution fails.': '当笔记本单元格执行失败时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - on loop while progress is occurring.':
		'在进度进行期间循环发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound on loop while progress is occurring.': '在进度进行期间循环播放声音。',
	'Alerts on loop while progress is occurring.': '在进度进行期间循环发出提示。',

	// ---- chat / voice ----
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a chat request is made.':
		'当发起对话请求时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when a chat request is made.': '当发起对话请求时播放声音。',
	'Announces when a chat request is made.': '当发起对话请求时进行播报。',
	'Plays a sound / audio cue when the response has been received.': '收到回复时播放声音/听觉提示。',
	'Plays a sound on when the response has been received.': '收到回复时播放声音。',
	'Plays a joyful sound / audio cue when confetti is shown.': '显示彩带庆祝动画时播放欢快的音效。',
	'Plays a joyful sound when confetti is shown.': '显示彩带庆祝动画时播放欢快的声音。',
	'Plays a sound / audio cue when the voice recording has started.': '录音开始时播放声音/听觉提示。',
	'Plays a sound when the voice recording has started.': '录音开始时播放声音。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when voice mode has started.':
		'当语音模式启动时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when voice mode has started.': '当语音模式启动时播放声音。',
	'Announces when voice mode has started.': '当语音模式启动时进行播报。',
	'Plays a sound / audio cue when the voice recording has stopped.': '录音停止时播放声音/听觉提示。',
	'Plays a sound when the voice recording has stopped.': '录音停止时播放声音。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when voice mode has stopped.':
		'当语音模式停止时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when voice mode has stopped.': '当语音模式停止时播放声音。',
	'Announces when voice mode has stopped.': '当语音模式停止时进行播报。',

	// ---- save / format / undo ----
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a file is saved.':
		'当文件被保存时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when a file is saved.': '当文件被保存时播放声音。',
	'Plays the sound when a user explicitly saves a file.': '当用户主动保存文件时播放该声音。',
	'Plays the sound whenever a file is saved, including auto save.': '每当文件被保存时都播放该声音，包括自动保存。',
	'Announces when a file is saved.': '当文件被保存时进行播报。',
	'Announces when a user explicitly saves a file.': '当用户主动保存文件时进行播报。',
	'Announces whenever a file is saved, including auto save.': '每当文件被保存时都进行播报，包括自动保存。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a file or notebook is formatted.':
		'当文件或笔记本被格式化时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when a file or notebook is formatted.': '当文件或笔记本被格式化时播放声音。',
	'Plays the sound when a user explicitly formats a file.': '当用户主动格式化文件时播放该声音。',
	'Plays the sound whenever a file is formatted, including if it is set to format on save, type, or, paste, or run of a cell.':
		'每当文件被格式化时都播放该声音，包括设为保存时、输入时、粘贴时或运行单元格时格式化。',
	'Announces when a file or notebook is formatted.': '当文件或笔记本被格式化时进行播报。',
	'Announces when a user explicitly formats a file.': '当用户主动格式化文件时进行播报。',
	'Announces whenever a file is formatted, including if it is set to format on save, type, or, paste, or run of a cell.':
		'每当文件被格式化时都进行播报，包括设为保存时、输入时、粘贴时或运行单元格时格式化。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when edits have been undone.':
		'当编辑被撤销时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when edits have been undone.': '当编辑被撤销时播放声音。',
	'Announces when edits have been undone.': '当编辑被撤销时进行播报。',
	'Plays a signal - sound (audio cue) and/or announcement (alert) - when edits are kept.':
		'当编辑被保留时发出信号 —— 声音（听觉提示）和/或播报（提示音）。',
	'Plays a sound when edits are kept.': '当编辑被保留时播放声音。',
	'Announces when edits are kept.': '当编辑被保留时进行播报。',

	// ---- code action ----
	'Plays a sound / audio cue - when a code action has been triggered.': '触发代码操作时播放声音/听觉提示。',
	'Plays a sound when a code action has been triggered.': '触发代码操作时播放声音。',
	'Plays a sound / audio cue when the code action has been applied.': '代码操作被应用时播放声音/听觉提示。',
	'Plays a sound when the code action has been applied.': '代码操作被应用时播放声音。',

	// ---- accessible diff viewer ----
	'Plays a sound / audio cue when the focus moves to an inserted line in Accessible Diff Viewer mode or to the next/previous change.':
		'当焦点移到无障碍差异查看模式下的新增行，或移到下一处/上一处更改时，播放声音/听觉提示。',
	'Plays a sound when the focus moves to an inserted line in Accessible Diff Viewer mode or to the next/previous change.':
		'当焦点移到无障碍差异查看模式下的新增行，或移到下一处/上一处更改时，播放声音。',
	'Plays a sound / audio cue when the focus moves to an modified line in Accessible Diff Viewer mode or to the next/previous change.':
		'当焦点移到无障碍差异查看模式下的修改行，或移到下一处/上一处更改时，播放声音/听觉提示。',
	'Plays a sound when the focus moves to an modified line in Accessible Diff Viewer mode or to the next/previous change.':
		'当焦点移到无障碍差异查看模式下的修改行，或移到下一处/上一处更改时，播放声音。',
	'Plays a sound / audio cue when the focus moves to an deleted line in Accessible Diff Viewer mode or to the next/previous change.':
		'当焦点移到无障碍差异查看模式下的删除行，或移到下一处/上一处更改时，播放声音/听觉提示。',
	'Plays a sound when the focus moves to an deleted line in Accessible Diff Viewer mode or to the next/previous change.':
		'当焦点移到无障碍差异查看模式下的删除行，或移到下一处/上一处更改时，播放声音。',
	'Plays a sound / audio cue when revealing a file with changes from chat edits': '显示包含对话编辑改动的文件时播放声音/听觉提示',
	'Plays a sound when revealing a file with changes from chat edits': '显示包含对话编辑改动的文件时播放声音',

	// ---- accessible help ----
	'On keypress, close the Accessible View and focus the element from which it was invoked.':
		'按下按键时，关闭无障碍视图并把焦点交还调用它的元素。',
	'Provide information about how to access release notes accessibility help when the release notes are focused.':
		'在发行说明获得焦点时，提供如何访问发行说明无障碍帮助的信息。',
	'Provide information about how to access connection diagnostics accessibility help when the report is focused.':
		'在报告获得焦点时，提供如何访问连接诊断无障碍帮助的信息。',
	'Provide information about how to access accessibility help for the customization migration checklist.':
		'为自定义项迁移检查清单提供如何访问无障碍帮助的信息。',
	'Provide information about how to access accessibility help when discovering customizations.':
		'在发现自定义项时，提供如何访问无障碍帮助的信息。',
	'({0}) {1}': '（{0}）{1}',
};