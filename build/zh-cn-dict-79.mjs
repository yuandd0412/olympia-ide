// Batch 79 — the six reachable strings left in the chat *input* area.
//
// `workbench/contrib/chat/browser/widget/input` still holds ~100 English messages, but almost all
// of them belong to chrome this BYOK build never shows: `chatSessionArchiveNudge.ts` (15 strings,
// keyed off merged GitHub PRs), the `Sign in to Copilot` / `Use Auto mode` / `GitHub Copilot`
// built-in-provider labels, `[Upgrade](command:workbench.action.chat.upgradePlan)`,
// `Sandboxing is managed by your organization`, and the `{0}% off` promo badge. Translating those
// would produce fluent Chinese for a flow with no entry point, which is the mistake recorded in
// batch 77's header, so they stay English on purpose.
//
// What does render here: the attachment chip you get when a long paste becomes an artifact, its
// a11y role, the notice focus hint, and the unknown price-category fallback that a BYOK model with
// no declared cost hits. `Restricted mode` / `Trust Workspace` in the model-picker hover are real
// in this product — untrusted folders do disable model selection.
//
// Each key was checked as a quoted literal and occurs at exactly one non-test localize site;
// `notification` in particular hits a dozen enum/type positions (`Notification = 'notification'`,
// `TEMPLATE_ID`, JSON-RPC frame kinds) that are protocol or template identifiers and must not be
// translated — the applier only rewrites `localize*` default messages, so those are untouched.
export default {
	'Pasted Text Attachment': '粘贴文本附件',
	'Pasted text #{0}': '粘贴文本 #{0}',
	'notification': '通知',
	'{0} cost': '{0}费用',
	'{0}. Use Shift+Tab to reach the notice.': '{0}。按 Shift+Tab 可聚焦到该提示。',
	'{0} • Unavailable while in Restricted mode. Trust Workspace to enable models.':
		'{0} • 受限模式下不可用。信任工作区后即可启用模型。',
};
