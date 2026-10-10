// Probe the structure of the language pack's main.i18n.json without dumping it.
import { readFileSync } from 'fs';
const p = 'D:/oler-ide-v2/build/langpack/extension/translations/main.i18n.json';
const o = JSON.parse(readFileSync(p, 'utf8'));
console.log('top-level keys:', Object.keys(o));
for (const [k, v] of Object.entries(o)) {
	const t = Array.isArray(v) ? `array(${v.length})` : typeof v === 'object' && v ? `object(${Object.keys(v).length})` : typeof v;
	console.log(`  ${k}: ${t}`);
}
for (const [k, v] of Object.entries(o)) {
	if (v && typeof v === 'object' && !Array.isArray(v)) {
		const first = Object.entries(v).slice(0, 3);
		console.log(`\nsample from ${k}:`);
		for (const [kk, vv] of first) {
			console.log(`  ${kk}  =>  ${JSON.stringify(vv).slice(0, 120)}`);
		}
	}
	if (Array.isArray(v)) {
		console.log(`\nsample from ${k}[0]:`, JSON.stringify(v[0]).slice(0, 400));
	}
}