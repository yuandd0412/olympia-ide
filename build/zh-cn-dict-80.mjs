// Batch 80 — the diff editor a user lands in right after @coach edits a file.
//
// Reviewing an edit is the single most common action in this product after asking a question, and
// the unchanged-region control was still half English: the compact toggle reads 「折叠未更改的行」/
// "Collapse unchanged lines" while its sibling on the very same element already says
// 「{0} 个隐藏的行」 (`hiddenLines`, line 305/502) and 「双击展开」 (`diff.hiddenLines.expandAll`).
// The new wording follows those two so the control reads consistently, which is also why
// 'Show {0} hidden lines' becomes 「显示 {0} 个隐藏的行」 rather than a literal 「行隐藏内容」.
//
// 'Collapse unchanged lines' is keyed twice in the same file (lines 384 and 504, same localize id),
// so both branches of the compact control flip together — the batch-78 rule. 'Open Diff' was
// checked to occur at exactly one localize site in the whole tree (the binary-file button in the
// multi-diff editor), so there is no generic-label fan-out.
//
// The last three are the `deprecationMessageSeverity` enum descriptions in the configuration
// extension point — settings-UI text an extension author sees, reachable and cheap.
//
// Deliberately left alone this batch: `chatEntitlementService` plan names (Copilot Student/Pro/…),
// `sessionArchiveActions` (Mark as Done / Archive — the PR-driven archive flow batch 79 excluded),
// terminal dictation, and the next-edit-suggestion announcements, which no provider in this BYOK
// build produces.
export default {
	'Collapse unchanged lines': '折叠未更改的行',
	'Show {0} hidden lines': '显示 {0} 个隐藏的行',
	'Binary file changed': '二进制文件已更改',
	'Open Diff': '打开差异视图',
	'Controls the severity used to display the deprecation message.': '控制显示弃用提示时使用的严重级别。',
	'Shows the deprecation message using the standard warning treatment.': '以标准警告样式显示弃用提示。',
	'Shows the deprecation message using an informational treatment.': '以提示信息样式显示弃用提示。',
};
