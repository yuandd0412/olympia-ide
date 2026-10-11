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

const logs = [];
const logStub = { info: m => logs.push(['info', m]), warn: m => logs.push(['warn', m]), error: m => logs.push(['error', m]) };

const vscodeStub = {
	LanguageModelTextPart: TextPart,
	workspace: { getConfiguration: () => ({ get: key => configStore[`olympia.ai.${key}`] }), onDidChangeConfiguration: () => ({ dispose() { } }) },
	lm: { registerLanguageModelChatProvider: () => ({ dispose() { } }) },
	commands: { registerCommand: () => ({ dispose() { } }) },
	window: { showInputBox: async () => undefined, showInformationMessage: async () => undefined },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};

const { OlympiaChatProvider, parseModelIds } = require('./provider.js');

const context = { secrets: { get: async () => 'sk-test' } };
const provider = new OlympiaChatProvider(context, logStub);

// ---- an explicit list must win, and must not touch the network ----
let modelRequests = 0;
globalThis.fetch = async () => { modelRequests++; throw new Error('must not be called'); };
const models = await provider.provideLanguageModelChatInformation({ silent: false }, { });
assert.strictEqual(models.length, 2, 'one model per configured id');
assert.strictEqual(models[0].vendor, 'olympia');
assert.ok(models[0].capabilities, 'capabilities is required by the d.ts');
assert.strictEqual(modelRequests, 0, 'a non-empty olympia.ai.models must short-circuit the /models fetch');

// ---- no key must mean no models, and no crash ----
const noKeyProvider = new OlympiaChatProvider({ secrets: { get: async () => undefined } }, logStub);
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

// ---- GET /models, the default path once olympia.ai.models is left empty ----
configStore['olympia.ai.models'] = [];
let modelsFetches = 0;
let lastModelsUrl;
let lastModelsAuth;
const serveModels = payload => {
	globalThis.fetch = async (url, init) => {
		modelsFetches++;
		lastModelsUrl = url;
		lastModelsAuth = init.headers.authorization;
		return { ok: true, status: 200, text: async () => typeof payload === 'string' ? payload : JSON.stringify(payload) };
	};
};
const list = () => provider.provideLanguageModelChatInformation({ silent: false }, {});

provider.invalidateModelsCache();
serveModels({ data: [{ id: 'ds-chat' }, { id: 'ds-Embedding-1' }, { id: 'ds-reasoner' }, { id: 'ds-chat' }] });
let listed = (await list()).map(m => m.id);
assert.strictEqual(lastModelsUrl, 'https://example.test/v1/models', 'listed from the same normalised baseUrl');
assert.strictEqual(lastModelsAuth, 'Bearer sk-test');
assert.deepStrictEqual(listed, ['ds-chat', 'ds-reasoner'], 'embedding filtered, order kept, duplicates removed');

provider.invalidateModelsCache();
serveModels(['a', 'b']);
assert.deepStrictEqual((await list()).map(m => m.id), ['a', 'b'], 'root-array payload shape');

provider.invalidateModelsCache();
serveModels({ models: [{ name: 'x' }, { model: 'y' }] });
assert.deepStrictEqual((await list()).map(m => m.id), ['x', 'y'], 'models[] with name/model as the id field');

modelsFetches = 0;
assert.deepStrictEqual((await list()).map(m => m.id), ['x', 'y'], 'the cached list is reused');
assert.strictEqual(modelsFetches, 0, 'a cache hit must not hit the network');

provider.invalidateModelsCache();
globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => 'invalid api key' });
logs.length = 0;
assert.deepStrictEqual((await list()).map(m => m.id), ['deepseek-chat', 'deepseek-reasoner'], '401 falls back to the built-in list');
assert.ok(logs.some(([, message]) => /HTTP 401/.test(message)), 'the reason for the fallback is logged');

provider.invalidateModelsCache();
globalThis.fetch = async () => { throw new Error('ETIMEDOUT'); };
logs.length = 0;
assert.deepStrictEqual((await list()).map(m => m.id), ['deepseek-chat', 'deepseek-reasoner'], 'a network failure falls back too');
assert.ok(logs.some(([, message]) => /ETIMEDOUT/.test(message)), 'the thrown reason is logged');

provider.invalidateModelsCache();
serveModels('this is not json');
assert.deepStrictEqual((await list()).map(m => m.id), ['deepseek-chat', 'deepseek-reasoner'], 'an unparseable 200 falls back instead of returning an empty picker');

provider.invalidateModelsCache();
serveModels({ data: [{ id: 'text-embedding-3' }, { id: 'rerank-v1' }] });
assert.deepStrictEqual((await list()).map(m => m.id), ['deepseek-chat', 'deepseek-reasoner'], 'a server that lists only non-chat models must not produce a dead picker');

// ---- the parser is defensive about shape but never about content it cannot use ----
assert.deepStrictEqual(parseModelIds({ data: [{ id: 'a' }, null, 5, { id: '' }, {}] }), ['a'], 'junk rows ignored');
assert.deepStrictEqual(parseModelIds(null), []);
assert.deepStrictEqual(parseModelIds(undefined), []);
assert.deepStrictEqual(parseModelIds('string'), []);
assert.deepStrictEqual(parseModelIds({ models: 'not-an-array' }), []);
assert.deepStrictEqual(parseModelIds({ data: ['r', 'r', 'q'] }), ['r', 'q'], 'duplicates collapse, order preserved');

console.log('coach provider harness: all assertions passed');
