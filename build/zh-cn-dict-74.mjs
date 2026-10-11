// Batch 74 — model-picker badges, attachment feedback and provider icon descriptions.
//
// This is the part of `workbench/contrib/chat` that a BYOK student really sees: the badges next
// to each model in the picker (speed / cost / context length), the aria labels around the picker,
// the transient messages when something gets attached to a request, and the theme descriptions
// for the per-provider icons — which Settings search surfaces the moment someone adds a
// Claude/Gemini/Kimi/OpenAI/xAI key, i.e. exactly this product's setup.
//
// Skipped as before: GitHub PR / automation / session-archive nudges, dictation, HydraFusion
// and Copilot-only badges, and the `Open source *` entries that belong to the Sessions window.
//
// Note on short generic keys (`Fast`, `Configurable`, `Cache Read`): the applier rewrites every
// matching literal in `src/vs`, not just chat, so these words must be correct wherever else they
// appear. Each one chosen here keeps its ordinary meaning in any other surface it hits.
export default {
	// model picker badges and labels
	'Fast': '快速',
	'Lightweight': '轻量',
	'Long Context': '长上下文',
	'Configurable': '可配置',
	'Low cost': '低成本',
	'Medium cost': '中等成本',
	'High cost': '高成本',
	'Credits per 1M tokens': '每 100 万 token 的额度',
	'Max context': '最大上下文',
	'Manage Models...': '管理模型…',
	'Models, {0}': '模型，{0}',
	'Cache Read': '缓存读取',
	'Cache Write': '缓存写入',
	// attachment and output feedback around a request
	'Attached context': '已附加上下文',
	'Attached pasted text as {0}': '已将粘贴内容作为 {0} 附加',
	'Link copied to clipboard': '链接已复制到剪贴板',
	'Hide details for {0}': '收起 {0} 的详情',
	'Open Full Output (Read-Only)': '展开完整输出（只读）',
	'Evaluates risk before running tools': '执行工具前先评估风险',
	'MCP authentication required': '需要 MCP 身份验证',
	// platform/theme icon descriptions, surfaced by Settings search once a provider is added
	'Icon for Claude models.': 'Claude 模型图标。',
	'Icon for Gemini models.': 'Gemini 模型图标。',
	'Icon for OpenAI models.': 'OpenAI 模型图标。',
	'Icon for Kimi models.': 'Kimi 模型图标。',
	'Icon for xAI models.': 'xAI 模型图标。',
	'Icon for Microsoft models.': 'Microsoft 模型图标。',
	'Icon for Copilot models.': 'Copilot 模型图标。',
	'Icon for other model providers.': '其他模型提供方的图标。',
	'Compact icon for other model providers.': '其他模型提供方的紧凑图标。',
};
