// Batch 77 — the strings batch 76 had to skip because the dump truncated them.
//
// `36a4838` removed the 90-column cut, so the three update-required hovers can finally be used
// as keys: their text carries inline `command:` markdown links that MUST survive byte-for-byte,
// since cutting or rewording the link target breaks the button. Only the prose around them is
// translated. `Choose a Model and Provider` and the provider-info blurb are picker chrome that
// does not assume a Copilot account.
//
// Still skipped, on purpose: the Auto / HydraFusion / tabbed-picker accessibility essays (several
// hundred characters each) describe Copilot's automatic-routing UI, which this BYOK build has no
// equivalent of — translating them would produce fluent Chinese describing a feature that cannot
// be reached. `Sign in to GitHub Copilot…` (4 variants), `Set Up Chat`, the Agents-draft
// highlight failures and the bare proper noun `GitHub Copilot` are the same category.
export default {
	'Choose a Model and Provider': '选择模型与提供方',
	'This model requires a newer version of Olympia IDE. [Download Update](command:update.downloadUpdate) to access it.':
		'该模型需要更高版本的 Olympia IDE。[下载更新](command:update.downloadUpdate) 后方可使用。',
	'This model requires a newer version of Olympia IDE. [Restart to Update](command:update.restartToUpdate) to access it.':
		'该模型需要更高版本的 Olympia IDE。[重启以更新](command:update.restartToUpdate) 后方可使用。',
	'This model requires a newer version of Olympia IDE. [Update Olympia IDE](command:update.checkForUpdate) to access it.':
		'该模型需要更高版本的 Olympia IDE。[更新 Olympia IDE](command:update.checkForUpdate) 后方可使用。',
	'Models can come from different providers and vary in capability, speed, and billing or premium request usage. Review the details for your provider and plan before choosing.':
		'模型可能来自不同提供方，在能力、速度与计费（或高级请求用量）上也有差异。选择前请先查看你所用提供方与方案的具体说明。',
};
