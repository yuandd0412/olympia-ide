// zh-cn dictionary batch 22 -- chat commands and interactions
// NOTE: Copilot plan/quota/upgrade strings are intentionally skipped (BYOK access layer, D11).
export default {
	// ---- new chat / session ----
	'New Chat': '新建对话',
	'New Chat Editor': '新建对话编辑器',
	'New Chat Editor to the Side': '在侧边新建对话编辑器',
	'New Chat Window': '新建对话窗口',
	'Send': '发送',
	'Send to New Chat': '发送到新对话',
	'Open Chat ({0})': '打开对话（{0}）',
	'Toggle Chat': '切换对话面板',
	'Continue Chat in...': '在……中继续对话',
	'Continue In': '继续于',
	'Continue in...': '继续于……',
	'Copied': '已复制',
	'Forked: {0}': '已分叉：{0}',
	"Don't ask again": '不再询问',
	'Select Folder': '选择文件夹',
	'Chat Settings': '对话设置',
	'The query to open the quick chat with': '用于打开快速对话的查询内容',
	'No agent todos to focus right now.': '当前没有可聚焦的智能体待办。',
	'No chat question to focus right now.': '当前没有可聚焦的对话问题。',
	'No chat notice.': '没有对话通知。',

	// ---- focus / navigation ----
	'Clear Input History': '清空输入历史',
	'Focus Chat Input': '聚焦到对话输入框',
	'Toggle Focus Between TODOs and Input': '在待办列表和输入框之间切换焦点',
	'Chat: Toggle Focus Between Question and Input': '对话：在问题区和输入框之间切换焦点',
	'Chat: Previous Question': '对话：上一个问题',
	'Chat: Next Question': '对话：下一个问题',
	'Chat: Focus Terminal from Question Carousel': '对话：从问题轮播聚焦到终端',
	'Chat: Toggle Focus Between Notice and Input': '对话：在通知区和输入框之间切换焦点',
	'Show Context Window Usage': '显示上下文窗口用量',
	'Compact Conversation': '压缩对话',
	'Show Context Usage': '显示上下文用量',

	// ---- code block actions ----
	'Next Code Block': '下一个代码块',
	'Previous Code Block': '上一个代码块',
	'Apply Edits': '应用编辑',
	'Toggle Inline/Side-by-Side Diff': '切换行内/并排差异视图',
	'Open in Diff Editor': '在差异编辑器中打开',
	'Applying code block using {0}...': '正在使用 {0} 应用代码块...',
	'Failed to apply code block: {0}': '应用代码块失败：{0}',
	'No code mapper available.': '没有可用的代码映射器。',
	'Apply to {0}': '应用到 {0}',
	'Apply in Editor': '在编辑器中应用',
	'Insert At Cursor': '在光标处插入',
	'Insert into New File': '插入到新文件',
	'Insert into Terminal': '插入到终端',

	// ---- context ----
	'Add Folder to Chat': '将文件夹添加到对话',
	'Add Pinned Editors to Chat': '将固定的编辑器添加到对话',
	'Add Selection to Chat': '将选区添加到对话',
	'Add Context...': '添加上下文...',
	'Select tools for this custom agent': '为该自定义智能体选择工具',
	'Select a repository': '选择仓库',
	'Previous conversation': '上一段对话',

	// ---- agent management ----
	'Generate Skill': '生成技能',
	'Generate Hook': '生成钩子',
	'Generate Agent Instructions': '生成智能体指令',
	'Generate On-Demand Instructions': '生成按需指令',
	'Generate Prompt File': '生成提示词文件',
	'Generate Prompt': '生成提示词',
	'Generate Custom Agent': '生成自定义智能体',
	'Generate Agent': '生成智能体',
	'Create Plugin': '创建插件',
	'Open Customizations': '打开自定义项',
	'Manage Tool Approval': '管理工具批准',
	'Edit/manage the tool approval and confirmation preferences for AI chat agents.':
		'编辑/管理 AI 对话智能体的工具批准与确认首选项。',
	'Reset Tool Confirmations': '重置工具确认',
	'Tool confirmation preferences have been reset.': '工具确认首选项已重置。',
	'Generate Code': '生成代码',
	'Show View by Default': '默认显示该视图',
	'Show Extensions using Copilot': '显示使用 Copilot 的扩展',
	'Configure Inline Suggestions...': '配置内联建议...',

	// ---- slash commands ----
	'Insert Fork Command': '插入分叉命令',
	'Insert /fork': '插入 /fork',
	'Insert Troubleshoot Command': '插入排障命令',
	'Insert /troubleshoot': '插入 /troubleshoot',
	'Context menu actions may run a request prefixed with a /. Type / to discover such ready-made commands.':
		'右键菜单操作可以执行以 / 开头的请求。输入 / 即可发现这些现成命令。',
	'Use tab to reach conditional parts like commands, status, message responses and more.':
		'按 Tab 键可访问命令、状态、消息回复等条件性内容。',
	'It can be activated via code actions or directly using the command: Inline Chat: Start Inline Chat{0}.':
		'可以通过代码操作激活，或直接使用命令：内联对话：开始内联对话{0}。',
	'If a fix action is invoked, a response will indicate the problem with the current code. A diff editor will be rendered and can be reached by tabbing.':
		'调用修复操作后，回复会指出当前代码的问题。届时会渲染差异编辑器，可用 Tab 键进入。',
	'Once in the diff editor, enter review mode with{0}. Use up and down arrows to navigate lines with the proposed changes.':
		'进入差异编辑器后，按{0}进入审阅模式。使用上下方向键在建议更改的行之间移动。',
	'Long pasted text, including single-line text, is stored as an attached text item and replaced in the input with a numbered inline reference.':
		'粘贴的长文本（包括单行文本）会存为附加文本项，并在输入框中替换为带编号的内联引用。',
	'To paste the clipboard as plain text, without converting it to Markdown or storing it as an attachment, invoke Paste as Text{0}.':
		'若要以纯文本粘贴剪贴板内容（不转换为 Markdown 也不存为附件），请执行「粘贴为文本」{0}。',

	// ---- session switching ----
	'Switching agents will end your current edit session.': '切换智能体将结束当前的编辑会话。',
	'Start new session?': '要开始新会话吗？',
	'Changing the agent will end your current edit session. Would you like to change the agent?':
		'更换智能体将结束当前的编辑会话。要更换智能体吗？',
	'The following is the conversation history from a previous {0} session. Continue working on it.\n\n{1}':
		'以下是之前 {0} 会话的对话历史，请在此基础上继续。\n\n{1}',
	'The following is the conversation history from a previous {0} session. Continue working on it.\n\n{1}\n\nUser: {2}':
		'以下是之前 {0} 会话的对话历史，请在此基础上继续。\n\n{1}\n\n用户：{2}',

	// ---- issue / PR ----
	'Issue...': '问题...',
	'Pull Request...': '拉取请求...',
	'No code mapper available.': '没有可用的代码映射器。',

	// ---- quota (copy only, plan prompts skipped) ----
	'The allowance will reset on {0}.': '额度将于 {0} 重置。',
	'Manage Copilot Settings': '管理 Copilot 设置',
	'The GitHub Enterprise URL is unavailable. Sign in and try again.': '无法获取 GitHub Enterprise 地址。请登录后重试。',
};