// Batch 76 — the remaining model-picker labels that are not Copilot-account chrome.
//
// What is left in `widget/input/modelPicker` after batch 74 is dominated by GitHub Copilot
// subscription paths — `Sign in to GitHub Copilot…`, `Upgrade to GitHub Copilot Pro(+)`,
// `[Upgrade](command:workbench.action.chat.upgradePlan)` — which this BYOK product never shows,
// plus org-default/admin text for enterprise setups it does not have. Those were skipped.
//
// Included here are the neutral labels a student can actually see while picking a model: the
// category and speed words, the search/reset/pricing affordances, the effort line, the two
// workspace-trust hints, and the update-required title.
//
// Two exclusions are about the tool rather than the product: every string whose dump text was cut
// at the 90-column window (several `This model requires a newer version… [Download Update](command:…`
// variants) cannot be used as a key from a dump, so they are left out instead of guessed — write a
// truncated key and the applier reports it under "matches nothing anywhere".
export default {
	'Powerful': '强大',
	'Versatile': '通用',
	'Standard': '标准',
	'Speed': '速度',
	'Pricing details': '价格说明',
	'Reset to Default': '恢复默认',
	'Retiring': '即将停用',
	'Search Models': '搜索模型',
	'Thinking Effort: {0}': '思考强度：{0}',
	'Org default': '组织默认',
	'Very high cost': '很高成本',
	'Trust the workspace to enable models.': '信任此工作区以启用模型。',
	'Trusting this workspace enables AI models and chat features.': '信任此工作区后会启用 AI 模型与聊天功能。',
	'Update Olympia IDE': '更新 Olympia IDE',
	'This model is not available. Contact your administrator to enable it.': '该模型不可用。请联系管理员启用。',
};
