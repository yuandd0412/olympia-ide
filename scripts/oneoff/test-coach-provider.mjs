// One-off harness for the compiled BYOK provider.
//
// The provider is new code that parses SSE frames and maps core's message types onto an
// OpenAI-compatible request, and none of that can be exercised through the UI in this environment.
// Rather than test a re-implementation, this loads the actual build output
// (`extensions/olympia-coach/out/provider.js`) with the `vscode` module stubbed, feeds a fake
// streaming response, and asserts what the provider reports and sends.
//
//   node scripts/oneoff/test-coach-provider.mjs
//
// Requires `npm run gulp compile-extension:olympia-coach` to have run first.
import Module from 'module';
import assert from 'assert';
import { createRequire } from 'module';

const require = createRequire(new URL('../../oss/extensions/olympia-coach/out/provider.js', import.meta.url));

class TextPart {
	constructor(text) { this.text = text; }
}

const configStore = {
	'olympia.ai.baseUrl': 'https://example.test/v1/',
	'olympia.ai.models': ['m-A', 'm-B']
};

const vscodeStub = {
	LanguageModelTextPart: TextPart,
	workspace: { getConfiguration: () => ({ get: key => configStore[`olympia.ai.${key}`] }) },
	lm: { registerLanguageModelChatProvider: () => ({ dispose() { } }) },
	commands: { registerCommand: () => ({ dispose() { } }) },
	window: { showInputBox: async () => undefined, showInformationMessage: async () => undefined },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};

const { OlympiaChatProvider } = require('./provider.js');

const context = { secrets: { get: async () => 'sk-test' } };
const provider = new OlympiaChatProvider(context);

// ---- what does the provider advertise? ----
const models = await provider.provideLanguageModelChatInformation({ silent: false }, { });
assert.strictEqual(models.length, 2, 'one model per configured id');
assert.strictEqual(models[0].vendor, 'olympia');
assert.ok(models[0].capabilities, 'capabilities is required by the d.ts');

// ---- no key must mean no models, and no crash ----
const noKeyProvider = new OlympiaChatProvider({ secrets: { get: async () => undefined } });
assert.deepStrictEqual(await noKeyProvider.provideLanguageModelChatInformation({ silent: true }, {}), []);

// ---- request mapping + SSE parsing ----
let sentBody;
globalThis.fetch = async (url, init) => {
	sentBody = { url, init };
	const frames = [
		'data: {"choices":[{"delta":{"content":"你好"}}]}\n',
		'\n',
		'data: {"choices":[{"delta":{"content":"，同学"}}]}\n',
		'data: not-json-so-it-is-skipped\n',
		': keepalive comment line\n',
		'data: [DONE]\n',
	];
	let i = 0;
	return {
		ok: true,
		status: 200,
		text: async () => '',
		body: {
			getReader() {
				return {
					async read() {
						if (i >= frames.length) { return { done: true }; }
						return { done: false, value: new TextEncoder().encode(frames[i++]) };
					}
				};
			}
		}
	};
};

const reported = [];
const progress = { report: part => reported.push(part.text) };
await provider.provideLanguageModelChatResponse(
	{ id: 'm-A' },
	[
		{ role: 2, content: ['system persona'] },                    // Assistant(2) -> assistant
		{ role: 1, content: [{ value: '为什么 WA' }, { mimeType: 'image/png', data: 'AAAA' }, { notText: true }] },
		{ role: 1, content: [] },                                     // empty content is dropped
	],
	{},
	progress,
	{ onCancellationRequested: () => ({ dispose() { } }) },
);

assert.strictEqual(sentBody.url, 'https://example.test/v1/chat/completions', 'trailing slash normalised');
assert.strictEqual(sentBody.init.headers.authorization, 'Bearer sk-test');
assert.strictEqual(sentBody.init.signal.constructor.name, 'AbortSignal');
const messages = JSON.parse(sentBody.init.body).messages;
assert.strictEqual(JSON.parse(sentBody.init.body).stream, true);
assert.deepStrictEqual(messages.map(m => m.role), ['assistant', 'user'], 'empty message dropped');
assert.strictEqual(messages[1].content, '为什么 WA', 'non-text parts skipped, .value read');
assert.deepStrictEqual(reported, ['你好', '，同学'], 'only real deltas reported');

// ---- token estimate: CJK is ~1 token/char, Latin ~4 chars/token ----
assert.strictEqual(await provider.provideTokenCount({ id: 'm-A' }, '给这段代码找错因'.repeat(10), { }), 80);
assert.strictEqual(await provider.provideTokenCount({ id: 'm-A' }, 'a'.repeat(40), { }), 10);
assert.strictEqual(await provider.provideTokenCount({ id: 'm-A' }, '', { }), 1, 'never zero');

// ---- errors carry the status, not a bare failure ----
globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => 'invalid api key' });
await assert.rejects(
	() => provider.provideLanguageModelChatResponse({ id: 'm-A' }, [{ role: 1, content: ['x'] }], {}, progress, { onCancellationRequested: () => ({ dispose() { } }) }),
	/HTTP 401 invalid api key/,
);

console.log('coach provider harness: all assertions passed');
