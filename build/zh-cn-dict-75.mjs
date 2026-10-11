// Batch 75 — MCP server management chrome.
//
// Reachable once chat is enabled (which @coach does): the palette entries for adding or opening
// an MCP server, the invalid-config and gallery errors, and the enable/disable-in-session labels
// in the MCP view. Total MCP residual is 60 messages; this covers the ones a user can actually
// read, in short form.
//
// Skipped: `True` / `False` (schema enum values — generic single words that collide with any
// other `localize('...', 'True')` in the tree, exactly the case the fan-out audit exists for),
// `<Empty>` and `URL：` (already partly non-prose), and the proper nouns `Windsurf`,
// `GitHub Copilot CLI`, `Copilot Global`. `Authenticate` is not repeated here — batch 73
// already landed it.
export default {
	'Add MCP Server to {0}': '向 {0} 添加 MCP 服务器',
	'Open MCP Configuration in {0}': '在 {0} 中打开 MCP 配置',
	'Select the configuration file to open': '选择要打开的配置文件',
	'Select the global configuration': '选择全局配置',
	'The MCP server configuration is invalid.': 'MCP 服务器配置无效。',
	'The MCP gallery is not configured.': '未配置 MCP 图库。',
	'The MCP gallery has no query endpoint.': 'MCP 图库没有查询端点。',
	'The MCP gallery returned HTTP {0}.': 'MCP 图库返回 HTTP {0}。',
	'This server requires .vscode/mcp.json': '该服务器需要 .vscode/mcp.json',
	'Authentication Required': '需要身份验证',
	'Enablement': '启用状态',
	'Enable (Session)': '启用（本会话）',
	'Disable (Session)': '禁用（本会话）',
	'(Running in 1 session)': '（在 1 个会话中运行）',
	'(Running in {0} sessions)': '（在 {0} 个会话中运行）',
	'Workspace root': '工作区根目录',
	'Olympia IDE workspace configuration': 'Olympia IDE 工作区配置',
};
