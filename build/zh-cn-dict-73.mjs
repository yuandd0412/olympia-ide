// Batch 73 — the chat strings that are actually on screen, found by rejecting the rest.
//
// `workbench/contrib/chat` holds 1,899 of the 2,170 product-reachable English messages, which
// reads like a big translation job. Slicing it says otherwise: the bulk is `chatPet.*`
// (achievement and accessory easter eggs), `chatStt` (voice dictation), `chatDebug` / agent-host
// wire logs, session archive nudges and GitHub-coupled attachment notices — none of which this
// BYOK product renders. Translating those is churn without a single changed pixel.
//
// What IS visible: the working-progress phrases that replace "Working…" during every request
// (only the playful variants are still English; the plain ones landed in earlier batches), two
// Settings descriptions for that same indicator, and four widget labels (side chat, question
// prompt, transcript outline, group aria label, terminal-output preview, tool auth button).
//
// The spinner wording keeps the joke instead of translating it literally-flat, since the whole
// point of these strings is that they are whimsical. `Insiders` / `Stable` / `Olympia IDE` stay
// untranslated as channel and product names. `{0}`/`{1}` preserved.
export default {
	// widget — working progress phrases shown while the model thinks
	'Baking the ideas': '烘焙灵感中',
	'Consulting the oracle': '请示先知中',
	'Digging straight down': '一路往下挖',
	'Letting it cook': '让它再煮一会儿',
	'Mining at night': '连夜挖矿中',
	'Stabilizing the wormhole': '稳定虫洞中',
	'Stirring the solution': '搅拌溶液中',
	'Thanking all the fish': '向所有的鱼道谢',
	// chat.shared.contribution — colour descriptions surfaced by Settings search
	'Foreground color of the Insiders Olympia IDE icon in the chat working progress indicator.':
		'聊天工作进度指示器中 Insiders 版 Olympia IDE 图标的前景色。',
	'Foreground color of the Stable Olympia IDE icon in the chat working progress indicator.':
		'聊天工作进度指示器中 Stable 版 Olympia IDE 图标的前景色。',
	// widget labels
	'Ask in Side Chat': '在侧边对话中提问',
	'Asking a question...': '正在提问…',
	'Chat Outline': '对话大纲',
	'Chat Group {0} of {1}': '对话分组 {0}/{1}',
	'A preview is not available.': '没有可用的预览。',
	'Authenticate': '验证身份',
};
