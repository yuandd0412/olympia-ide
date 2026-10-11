// Batch 71 — the chat surfaces this product actually renders.
//
// `nls-residual-ast.mjs` counts 4,626 reachable English defaults, but most of them sit in
// chrome this fork never shows: Copilot "feature example" / guided-tryout dialogs, the chat
// pet achievements, GitHub session/PR/issue counters, dictation and voice questionnaires, and
// the agent-host plugin picker. Those were skipped on purpose; translating them would add
// churn without changing a single pixel of the student's window.
//
// What IS reachable here is the model picker a student opens when choosing a model for
// @coach, the find widget inside the transcript, the question carousel the agent uses when it
// needs an answer, and the three chat approval-mode setting descriptions. Every message below
// was taken verbatim from the AST dump, and all are short enough that the dump's 90-column
// window could not have truncated them.
//
// Deliberately excluded: `GitHub Copilot` (bare proper noun), and nothing here carries a `&&`
// mnemonic. `{0}`/`{1}`/`{2}` placeholders are preserved in their original order.
export default {
	// widget/input/modelPicker — the model dropdown
	"Activating...": '正在启用…',
	'Add Models...': '添加模型…',
	'Alternative routing': '备选路由',
	'Back to Models': '返回模型列表',
	'Contact your admin': '请联系管理员',
	'Context Size: {0}': '上下文长度：{0}',
	'Current model': '当前模型',
	'Dismiss Hint': '关闭提示',
	'Max context: {0}': '最大上下文：{0}',
	'May use multiple models': '可能同时使用多个模型',
	'Model Actions': '模型操作',
	'Model {0}': '模型 {0}',
	'Models unavailable while in Restricted mode': '受限模式下模型不可用',
	'Models, unavailable while in Restricted mode': '模型，受限模式下不可用',
	'Models, sign in to use Copilot': '模型，需登录 Copilot 后使用',
	// widget/chatFind — transcript find
	'Accessibility Help: Chat Transcript Find': '辅助功能说明：聊天记录查找',
	'- Enter: Move to the next match.': '- Enter：跳到下一个匹配项。',
	'- Shift+Enter: Move to the previous match.': '- Shift+Enter：跳到上一个匹配项。',
	// widget/chatContentParts — question carousel and subagent rows
	'Answered': '已回答',
	'Answered automatically': '已自动回答',
	'Answered chat questions': '已回答的会话提问',
	'Answered:': '已回答：',
	'Custom answer: {0}': '自定义回答：{0}',
	'Custom answer: {0}, selected': '自定义回答：{0}，已选中',
	'Active tool {0}': '当前工具 {0}',
	'Active tool: {0}': '当前工具：{0}',
	'Hide subagent details: {0}': '收起子代理详情：{0}',
	// chat.shared.contribution — approval mode descriptions shown in Settings
	'Allow All — runs tool calls without asking.': '全部允许 — 直接执行工具调用，不再询问。',
	'Assisted permissions — evaluates risk before running tools.': '辅助权限 — 执行工具前先评估风险。',
	"Manual permissions — asks when approval settings don't apply.": '手动权限 — 审批设置不适用时询问。',
	// promptTimeline — sticky header over the input
	'(empty prompt)': '（空提示）',
	'Changes · {0}': '更改 · {0}',
	'Go to prompt {0} of {1}: {2}': '前往第 {0}/{1} 条提示：{2}',
};
