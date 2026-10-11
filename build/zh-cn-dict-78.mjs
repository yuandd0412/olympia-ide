// Batch 78 — the chat answer footer and the tool/step rows under it.
//
// These are the strings a user sees after every single @coach answer: the "Completed 3 steps in
// 12s" header (chatListRenderer.ts:384-389), the hover timestamps (583/586), the response-details
// token tooltip (425-436), the spinner's "This is taking a little longer than usual", the tool
// progress labels ("Tool calls", "Tool execution failed", "Terminal Output · <id>"), the
// confirmation line "1 file created", and the question-carousel "Question:" prefix.
//
// Every key here was checked to occur as a quoted literal at exactly one non-test site, so there
// is no semantic fan-out to review. The applier skips `.test.ts` (apply-zh-cn-ast.mjs:67), so the
// test assertions that reference these English strings by hand stay valid.
//
// Deliberately skipped: `chat.subagent.*`, `automationConfigured.*`, `fusionPhasePill*` and the
// `chatRequestOrigin`/Codex delegation labels — this BYOK build has no subagent harness, no
// automations and no Codex, so those parts never render. `Authenticating {0}...` and the MCP
// starting labels wait on the open question of whether MCP surfaces get translated at all.
export default {
	'Completed 1 step in {0}': '已在 {0} 内完成 1 个步骤',
	'Completed 1 step': '已完成 1 个步骤',
	'Completed {0} steps in {1}': '已在 {1} 内完成 {0} 个步骤',
	'Completed {0} steps': '已完成 {0} 个步骤',
	'Response details': '响应详情',
	'Cached input tokens: {0}': '缓存输入令牌数：{0}',
	'Completed: {0}': '完成于：{0}',
	'Completed {0}': '完成于 {0}',
	'Elapsed time {0}': '耗时 {0}',
	'This is taking a little longer than usual': '这次花费的时间比平常长一些',
	'Tool calls': '工具调用',
	'Tool execution failed': '工具执行失败',
	// These three sit next to each other in the same ternary / same function
	// (chatTerminalToolProgressPart.ts:1664-1665 and 1872, whose 1874 sibling already reads
	// 「输出被截断。」), so they are translated as a set — one branch Chinese and the other English
	// would be visible on screen. `Open Full Output (Read-Only)` is left verbatim on purpose: it is
	// the name of a command the user has to find in the UI, and no localize site in this fork
	// carries that label, so translating the reference would point at a button that does not exist.
	'Terminal Output · {0}': '终端输出 · {0}',
	'Output truncated. Click the output preview to view the full output.': '输出被截断。点击输出预览即可查看完整内容。',
	'Use Open Full Output (Read-Only) to view the captured output.': '请使用 Open Full Output (Read-Only) 查看已捕获的输出。',
	'Showing a preview. Use Open Full Output (Read-Only) to view the captured output.':
		'当前显示的是预览。请使用 Open Full Output (Read-Only) 查看已捕获的输出。',
	'Plan summary is outdated': '方案摘要已过期',
	'1 file created': '已创建 1 个文件',
	'{0} files created': '已创建 {0} 个文件',
	'Question:': '问题：',
	'Original conversation': '原始对话',
	'Cancel starting over': '取消重新开始',
	'Cancel restoring this checkpoint': '取消恢复此检查点',
	'Confirm starting over and discarding all edits': '确认重新开始并丢弃全部改动',
};
