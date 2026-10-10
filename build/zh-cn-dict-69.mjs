// Batch 69 — workbench/contrib/accessibility/browser/accessibilityConfiguration.ts
// (50 lines / 49 unique; `accessibility.verboseChatProgressUpdates` is declared twice
// with identical text, so one entry covers both sites).
//
// These are screen-reader announcement scripts. They must stay phrased as "provide
// information about ..." because the verbosity level switches them on or off as whole
// sentences — a reworded sentence simply never gets read out.
export default {
	'Provide information about how to access the terminal accessibility help menu when the terminal is focused.':
		'在终端获得焦点时，提供如何访问终端无障碍帮助菜单的信息。',

	'Provide information about how to navigate changes in the diff editor when it is focused.':
		'在差异编辑器获得焦点时，提供如何在各项更改之间导航的信息。',

	'Provide information about how to access the chat help menu when the chat input is focused.':
		'在聊天输入框获得焦点时，提供如何访问聊天帮助菜单的信息。',

	'Provide information about how to access the inline editor chat accessibility help menu and alert with hints that describe how to use the feature when the input is focused.':
		'在输入框获得焦点时，提供如何访问内联编辑器聊天的无障碍帮助菜单，以及如何通过提示了解该功能用法的信息。',

	'Provide information about how to open the chat terminal output in the Accessible View.':
		'提供如何在无障碍视图中打开聊天终端输出的信息。',

	'Provide information about how to access the inline completions hover and Accessible View.':
		'提供如何访问内联补全的悬停提示和无障碍视图的信息。',

	'Provide information about how to change a keybinding in the keybindings editor when a row is focused and how to navigate to the results table.':
		'在快捷键编辑器的某一行获得焦点时，提供如何修改快捷键以及如何导航到结果表格的信息。',

	'Provide information about how to focus the cell container or inner editor when a notebook cell is focused.':
		'在笔记本单元格获得焦点时，提供如何将焦点落到单元格容器或内部编辑器上的信息。',

	'Provide information about how to open the hover in an Accessible View.':
		'提供如何在无障碍视图中打开悬停提示的信息。',

	'Provide information about how to open the notification in an Accessible View.':
		'提供如何在无障碍视图中打开通知的信息。',

	'Provide information about relevant actions in an empty text editor.':
		'提供空文本编辑器中相关操作的信息。',

	'Provide information about how to access the REPL editor accessibility help menu when the REPL editor is focused.':
		'在 REPL 编辑器获得焦点时，提供如何访问 REPL 编辑器无障碍帮助菜单的信息。',

	'Provide information about actions that can be taken in the comment widget or in a file which contains comments.':
		'提供在批注小工具中、或在包含批注的文件中可以执行哪些操作的信息。',

	'Indicate when a diff editor becomes the active editor.':
		'在差异编辑器成为活动编辑器时给出提示。',

	'Provide information about how to access the debug console accessibility help dialog when the debug console or run and debug viewlet is focused. Note that a reload of the window is required for this to take effect.':
		'在调试控制台或运行和调试视图获得焦点时，提供如何访问调试控制台无障碍帮助对话框的信息。请注意，此项需要重新加载窗口后才会生效。',

	'Provide information about how to open the walkthrough in an Accessible View.':
		'提供如何在无障碍视图中打开演练流程的信息。',

	'Provide information about how to access the source control accessibility help menu when the input is focused.':
		'在源代码管理输入框获得焦点时，提供如何访问源代码管理无障碍帮助菜单的信息。',

	'Provide information about how to access the find accessibility help menu when the find input is focused.':
		'在查找输入框获得焦点时，提供如何访问查找无障碍帮助菜单的信息。',

	'Provide information about how to access the Agents window accessibility help menu when the chat input is focused.':
		'在聊天输入框获得焦点时，提供如何访问智能体窗口无障碍帮助菜单的信息。',

	'Provide information about how to access the Changes view accessibility help menu when the Changes view is focused.':
		'在更改视图获得焦点时，提供如何访问更改视图无障碍帮助菜单的信息。',

	'Provide information about how to navigate and interact with the chat question carousel, including how to focus the terminal when applicable.':
		'提供如何浏览和操作聊天提问轮播控件的信息，包括在适用时如何将焦点移到终端。',

	'Provide information about how to navigate and interact with the survey editor pane.':
		'提供如何浏览和操作调查编辑器窗格的信息。',

	'Provide information about how to use Automations management views, including keyboard navigation and how to inspect scheduled runs.':
		'提供如何使用自动化管理视图的信息，包括键盘导航以及如何查看已计划的运行。',

	'Provide information about how to access element commenting accessibility help in the Integrated Browser.':
		'提供如何在集成浏览器中访问元素批注无障碍帮助的信息。',

	'Provide information about how to access chat pet achievements accessibility help when the Achievements modal is focused.':
		'在成就弹窗获得焦点时，提供如何访问聊天宠物成就无障碍帮助的信息。',

	'Plays a signal - sound / audio cue and/or announcement (alert) when there is a next edit suggestion.':
		'当出现下一处编辑建议时，播放提示信号 —— 声音/音频提示和/或语音播报（警报）。',

	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a terminal command fails (non-zero exit code) or when a command with such an exit code is navigated to in the accessible view.':
		'当终端命令失败（退出码非零）时，或在无障碍视图中导航到具有此类退出码的命令时，播放提示信号 —— 声音（音频提示）和/或语音播报（警报）。',

	'Plays a signal - sound (audio cue) and/or announcement (alert) - when a terminal command succeeds (zero exit code) or when a command with such an exit code is navigated to in the accessible view.':
		'当终端命令成功（退出码为零）时，或在无障碍视图中导航到具有此类退出码的命令时，播放提示信号 —— 声音（音频提示）和/或语音播报（警报）。',

	'Plays a sound when the focus moves to a modified line in Accessible Diff Viewer mode or to the next/previous change.':
		'在无障碍差异查看器模式下，焦点移动到已修改的行，或移动到下一个/上一个更改时，播放提示音。',

	'Plays a signal - sound (audio cue) and/or announcement (alert) - when user action is required in the chat.':
		'当聊天中需要用户进行操作时，播放提示信号 —— 声音（音频提示）和/或语音播报（警报）。',

	'Plays a sound when user action is required in the chat.':
		'当聊天中需要用户进行操作时，播放提示音。',

	'Announces when a user action is required in the chat - including information about the action and how to take it.':
		'当聊天中需要用户进行操作时发出播报，其中包含该操作的信息以及如何执行它。',

	'Controls whether links should be underlined in the workbench.':
		'控制工作台中的链接是否加下划线。',

	'Controls whether variable changes should be announced in the debug watch view.':
		'控制调试监视视图中是否播报变量的变化。',

	'Controls whether the output from an execution in the native REPL will be announced.':
		'控制是否播报原生 REPL 中某次执行的输出。',

	'Control whether focus should automatically be sent to the REPL when code is executed.':
		'控制执行代码时是否自动把焦点切换到 REPL。',

	'Controls whether the {0} should be optimized for screen readers when in screen reader mode. When enabled, the window title will have {1} appended to the end.':
		'控制在屏幕阅读器模式下是否针对屏幕阅读器优化 {0}。启用后，窗口标题末尾会追加 {1}。',

	'Controls whether files should be opened when the chat agent has applied edits to them.':
		'控制当聊天智能体对文件应用了编辑后，是否打开这些文件。',

	'Controls whether verbose progress announcements should be made when a chat request is in progress, including information like searched text for <search term> with X results, created file <file_name>, or read file <file path>.':
		'控制聊天请求进行期间是否发出详细的进度播报，包括为 <搜索词> 搜索到 X 条结果、创建了文件 <文件名>、读取了文件 <文件路径> 之类的信息。',

	'Whether to dim unfocused editors and terminals, which makes it more clear where typed input will go to. This works with the majority of editors with the notable exceptions of those that utilize iframes like notebooks and extension webview editors.':
		'是否将未获得焦点的编辑器和终端变暗，这样可以更清楚地看出输入会送到哪里。它对大多数编辑器都有效，但使用 iframe 的编辑器除外，例如笔记本和扩展的网页视图编辑器。',

	'The opacity fraction (0.2 to 1.0) to use for unfocused editors and terminals. This will only take effect when {0} is enabled.':
		'未获得焦点的编辑器和终端所用的不透明度（0.2 到 1.0）。仅在启用 {0} 后才会生效。',

	'Controls whether the Accessible View is hidden.':
		'控制是否隐藏无障碍视图。',

	'Controls whether checkmark icons are shown on completed tool calls and other collapsible items in chat responses.':
		'控制是否在聊天回复中已完成的工具调用和其它可折叠项上显示对勾图标。',

	'The duration in milliseconds that voice speech recognition remains active after you stop speaking. For example in a chat session, the transcribed text is submitted automatically after the timeout is met. Set to `0` to disable this feature.':
		'在你停止说话之后，语音识别继续保持有效的时长（毫秒）。例如在一次对话中，转写出来的文本会在该超时结束后自动提交。设为 0 可禁用此功能。',

	'Whether to ignore code snippets in text-to-speech synthesis.':
		'是否在语音合成中忽略代码片段。',

	'The language that text-to-speech and speech-to-text should use. Select `auto` to use the configured display language if possible. Note that not all display languages maybe supported by speech recognition and synthesizers.':
		'语音合成与语音识别所使用的语言。选择 auto 会在可能的情况下使用所配置的显示语言。请注意，并非所有显示语言都可能被语音识别和语音合成支持。',

	'Enable the feature. When a screen reader is enabled, note that this will disable aria updates.':
		'启用此功能。请注意，当屏幕阅读器启用时，这会禁用 aria 更新。',

	'Whether a textual response should automatically be read out aloud when speech was used as input. For example in a chat session, a response is automatically synthesized when voice was used as chat request.':
		'当输入方式为语音时，是否自动朗读文字回复。例如在一次对话中，若用语音发起了聊天请求，回复就会被自动合成朗读。',

	'Auto (Use Display Language)': '自动（使用显示语言）',
};