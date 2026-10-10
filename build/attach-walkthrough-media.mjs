// Attach walkthrough step media programmatically.
// The workbench logs "missing media in walkthrough step" and renders a blank page
// when a step has no media, so every step needs one.
//   node build/attach-walkthrough-media.mjs
import { readFileSync, writeFileSync } from 'fs';

const PKG = 'D:/oler-ide-v2/oss/extensions/olympia-onboarding/package.json';

const MEDIA = {
	'olympia.step.openFolder': ['media/openFolder.svg', '工程目录里的源文件列表'],
	'olympia.step.pickProfile': ['media/pickProfile.svg', '编译配置选择列表'],
	'olympia.step.checkEnv': ['media/checkEnv.svg', '环境自检结果列表'],
	'olympia.step.website': ['media/website.svg', 'Olympia 官网'],
	'olympia.compiler.check': ['media/compilerCheck.svg', '编译器版本检测结果'],
};

const raw = readFileSync(PKG, 'utf8');
const json = JSON.parse(raw);
const walkthroughs = json.contributes?.walkthroughs ?? [];

let attached = 0;
const missing = [];
for (const w of walkthroughs) {
	for (const step of w.steps ?? []) {
		const entry = MEDIA[step.id];
		if (!entry) { missing.push(step.id); continue; }
		const [markdown, altText] = entry;
		// rebuild the step so `media` sits right after `description`, matching upstream style
		const rebuilt = {};
		for (const [k, v] of Object.entries(step)) {
			rebuilt[k] = v;
			if (k === 'description') {
				rebuilt.media = { altText, markdown };
			}
		}
		if (!rebuilt.media) { rebuilt.media = { altText, markdown }; }
		for (const key of Object.keys(step)) { delete step[key]; }
		Object.assign(step, rebuilt);
		attached++;
	}
}

writeFileSync(PKG, JSON.stringify(json, null, '\t') + '\n', 'utf8');
console.log(`walkthroughs: ${walkthroughs.length}, steps given media: ${attached}`);
if (missing.length) { console.log(`no media mapped for: ${missing.join(', ')}`); }