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
const logStub = { info: m => logs.push(['info', m]), warn: m => logs.push(['warn', m]), error: m => logs.push(['error', m]), debug: m => logs.push(['debug', m]) };

/** 编译出来的扩展只会用 registerCommand 注册；这里把 handler 收下来，好直接驱动它。 */
const registered = {};

const vscodeStub = {
	LanguageModelTextPart: TextPart,
	workspace: { getConfiguration: () => ({ get: key => configStore[`olympia.ai.${key}`] }), onDidChangeConfiguration: () => ({ dispose() { } }) },
	lm: { registerLanguageModelChatProvider: () => ({ dispose() { } }) },
	commands: { registerCommand: (id, handler) => { registered[id] = handler; return { dispose() { } }; } },
	window: { showInputBox: async () => undefined, showInformationMessage: async () => undefined },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'vscode') { return vscodeStub; }
	return originalLoad.call(this, request, parent, isMain);
};

const { OlympiaChatProvider, parseModelIds, invalidateModelsCache } = require('./provider.js');

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

invalidateModelsCache();
serveModels({ data: [{ id: 'ds-chat' }, { id: 'ds-Embedding-1' }, { id: 'ds-reasoner' }, { id: 'ds-chat' }] });
let listed = (await list()).map(m => m.id);
assert.strictEqual(lastModelsUrl, 'https://example.test/v1/models', 'listed from the same normalised baseUrl');
assert.strictEqual(lastModelsAuth, 'Bearer sk-test');
assert.deepStrictEqual(listed, ['ds-chat', 'ds-reasoner'], 'embedding filtered, order kept, duplicates removed');

invalidateModelsCache();
serveModels(['a', 'b']);
assert.deepStrictEqual((await list()).map(m => m.id), ['a', 'b'], 'root-array payload shape');

invalidateModelsCache();
serveModels({ models: [{ name: 'x' }, { model: 'y' }] });
assert.deepStrictEqual((await list()).map(m => m.id), ['x', 'y'], 'models[] with name/model as the id field');

modelsFetches = 0;
assert.deepStrictEqual((await list()).map(m => m.id), ['x', 'y'], 'the cached list is reused');
assert.strictEqual(modelsFetches, 0, 'a cache hit must not hit the network');

invalidateModelsCache();
globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => 'invalid api key' });
logs.length = 0;
assert.deepStrictEqual((await list()).map(m => m.id), ['deepseek-chat', 'deepseek-reasoner'], '401 falls back to the built-in list');
assert.ok(logs.some(([, message]) => /HTTP 401/.test(message)), 'the reason for the fallback is logged');

invalidateModelsCache();
globalThis.fetch = async () => { throw new Error('ETIMEDOUT'); };
logs.length = 0;
assert.deepStrictEqual((await list()).map(m => m.id), ['deepseek-chat', 'deepseek-reasoner'], 'a network failure falls back too');
assert.ok(logs.some(([, message]) => /ETIMEDOUT/.test(message)), 'the thrown reason is logged');

invalidateModelsCache();
serveModels('this is not json');
assert.deepStrictEqual((await list()).map(m => m.id), ['deepseek-chat', 'deepseek-reasoner'], 'an unparseable 200 falls back instead of returning an empty picker');

invalidateModelsCache();
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

// ==================== 题面抽取命令 olympia.ai.extract ====================
//
// 退役 Tauri 版 `frontend/src-tauri/src/enrich.rs` 移植过来的那条路：抓完题面觉得残缺时，
// 叫一次用户自己配的模型，让它回一个严格 JSON。这一半只管「问得出东西来问」，
// 填不填、盖不盖由 olympia-contest 那边判断（那条路由 test-practice-list 验）。
// 要钉住的是失败的那一侧：没有密钥、没有地址、HTTP 报错、回散文、读不到密钥——
// 全都只能变成 `{ ok: false }`，一次多余的请求不许发，一个异常也不许抛回调用方。
const constants = require('./constants.js');
const extract = require('./extract.js');

let failed = 0;
async function check(name, body) {
	try {
		await body();
		console.log(`ok    ${name}`);
	} catch (error) {
		failed++;
		console.log(`FAIL  ${name}\n      ${error.message}`);
	}
}

/** 每 POST 一次记一条；第 n 次 POST 的回包由 chatResponses 决定。 */
const chatPosts = [];
let chatResponses = [];
let modelsResponse;
let modelsCalls = 0;

/** 网关回的是 chat/completions 那层信封，content 才是模型写的话。 */
const envelope = content => JSON.stringify({ choices: [{ message: { content } }] });

function resetNetwork() {
	chatPosts.length = 0;
	chatResponses = [];
	modelsResponse = undefined;
	modelsCalls = 0;
	globalThis.fetch = async (url, init) => {
		if (init?.method === 'POST') {
			const slot = chatPosts.length;
			chatPosts.push({ url, body: JSON.parse(init.body), headers: init.headers, signal: init.signal });
			const next = chatResponses[Math.min(slot, Math.max(0, chatResponses.length - 1))];
			if (!next) { throw new Error('没有为这一次 POST 准备回包'); }
			return { ok: next.ok ?? true, status: next.status ?? 200, text: async () => next.body ?? envelope(next.content) };
		}
		modelsCalls++;
		if (!modelsResponse) { throw new Error('这一步不该去问 /models'); }
		return modelsResponse();
	};
}

/** null 才是「这台机器上没存过」；undefined 会撞上默认值参数，别用它当哨兵。 */
const coachContext = ({ key = 'sk-test', chosen = 'ds-chosen' } = {}) => ({
	subscriptions: { push() { } },
	secrets: { get: async () => (key === null ? undefined : key) },
	globalState: { get: () => (chosen === null ? undefined : chosen) },
});

/** 每次重新注册，让 context 里那个密钥/模型状态跟着测试用例换。 */
const runExtract = async (request = { id: 'P1001', platform: 'luogu', title: 'A+B', text: '给两个整数，输出它们的和。' }, context = coachContext()) => {
	extract.registerExtractCommand(context, logStub);
	return registered[constants.EXTRACT_COMMAND](request);
};

const jsonReply = { hint: '注意 long long', samples: [{ input: '3 4', output: '7' }] };
const fenced = `Sure, here you go:\n\`\`\`json\n${JSON.stringify(jsonReply)}\n\`\`\`\nHope that helps!`;
const prose = '这道题看起来是并查集，我先给你讲讲思路……';

await check('没有密钥：{ok:false}，一个请求都不发（连 /models 也不问）', async () => {
	resetNetwork();
	const result = await runExtract(undefined, coachContext({ key: null }));
	assert.equal(result.ok, false);
	assert.match(result.reason, /密钥/);
	assert.strictEqual(chatPosts.length, 0, '没有密钥还发请求，等于拿着空 Authorization 去撞网关');
	assert.strictEqual(modelsCalls, 0, '没有密钥就不该再去问 /models');
});

await check('没有 baseUrl：{ok:false}，同样不发请求', async () => {
	resetNetwork();
	const saved = configStore['olympia.ai.baseUrl'];
	configStore['olympia.ai.baseUrl'] = '';
	try {
		const result = await runExtract();
		assert.equal(result.ok, false);
		assert.match(result.reason, /服务地址|baseUrl/);
		assert.strictEqual(chatPosts.length, 0);
	} finally {
		configStore['olympia.ai.baseUrl'] = saved;
	}
});

await check('读密钥这步本身炸了也不许抛：题面导入不能被一次 SecretStorage 故障弄失败', async () => {
	resetNetwork();
	const boom = { subscriptions: { push() { } }, secrets: { get: async () => { throw new Error('keychain locked'); } }, globalState: { get: () => 'ds-chosen' } };
	const result = await runExtract(undefined, boom);
	assert.equal(result.ok, false);
	assert.match(result.reason, /keychain locked/);
});

await check('严格请求就拿到了 JSON：只问一次，围栏 + 客套话都吃得下', async () => {
	resetNetwork();
	chatResponses = [{ content: fenced }];
	const result = await runExtract();
	assert.equal(result.ok, true, JSON.stringify(result));
	assert.strictEqual(chatPosts.length, 1, '严格那一次成功就不该再问第二次');
	assert.strictEqual(result.model, 'ds-chosen');
	assert.deepStrictEqual(result.fields.hint, '注意 long long');
	assert.deepStrictEqual(result.fields.samples, [{ input: '3 4', output: '7' }]);
	const sent = chatPosts[0];
	assert.strictEqual(sent.url, 'https://example.test/v1/chat/completions');
	assert.deepStrictEqual(sent.body.response_format, { type: 'json_object' });
	assert.strictEqual(sent.body.stream, false);
	assert.strictEqual(sent.body.temperature, constants.EXTRACT_TEMPERATURE);
	assert.strictEqual(sent.body.max_tokens, constants.EXTRACT_MAX_TOKENS);
	assert.strictEqual(sent.body.model, 'ds-chosen');
	assert.strictEqual(sent.headers.authorization, 'Bearer sk-test');
	assert.strictEqual(sent.headers['content-type'], 'application/json');
	assert.strictEqual(sent.signal.constructor.name, 'AbortSignal', '总预算得挂在 signal 上，不然慢服务能把拉题面卡死');
	assert.strictEqual(sent.body.messages[0].content, constants.EXTRACT_SYSTEM_PROMPT);
	assert.strictEqual(sent.body.messages[0].role, 'system');
	assert.ok(sent.body.messages[1].content.includes('给两个整数'), '题面原文要进 user 那条');
});

await check('第一次回散文：去掉 response_format 再问一次，正好两次', async () => {
	resetNetwork();
	chatResponses = [{ content: prose }, { content: `结果如下：${JSON.stringify(jsonReply)}` }];
	const result = await runExtract();
	assert.equal(result.ok, true, JSON.stringify(result));
	assert.strictEqual(chatPosts.length, 2, '严格那一次回散文就必须重试一次');
	assert.deepStrictEqual(chatPosts[0].body.response_format, { type: 'json_object' }, '第一次是严格请求');
	assert.strictEqual(chatPosts[1].body.response_format, undefined, '第二次不能再带 response_format：有些自建网关直接拒收这个字段');
	assert.strictEqual(chatPosts[1].body.model, 'ds-chosen', '重试问的应该是同一个模型');
	assert.deepStrictEqual(result.fields.hint, '注意 long long');
});

await check('两次都回散文：{ok:false}，理由说清楚，字段一个不给', async () => {
	resetNetwork();
	chatResponses = [{ content: prose }, { content: '我还是讲讲思路吧' }];
	const result = await runExtract();
	assert.equal(result.ok, false);
	assert.match(result.reason, /JSON/);
	assert.strictEqual(result.fields, undefined);
	assert.strictEqual(chatPosts.length, 2, '重试只许一次');
});

await check('HTTP 500：不抛，reason 带状态码并且截到 ERROR_SNIPPET_LEN', async () => {
	resetNetwork();
	const long = 'E'.repeat(900);
	chatResponses = [{ ok: false, status: 500, body: long }, { ok: false, status: 500, body: long }];
	const result = await runExtract();
	assert.equal(result.ok, false, JSON.stringify(result));
	assert.match(result.reason, /HTTP 500/);
	assert.ok(result.reason.length <= constants.ERROR_SNIPPET_LEN + 30, `错误正文没截断：${result.reason.length}`);
});

await check('模型选择顺序：globalState 那个 > /models 第一个 > 兜底名字', async () => {
	resetNetwork();
	chatResponses = [{ content: JSON.stringify(jsonReply) }];
	invalidateModelsCache();
	const chosen = await runExtract(undefined, coachContext({ chosen: 'ds-chosen' }));
	assert.strictEqual(chosen.ok, true);
	assert.strictEqual(chatPosts[0].body.model, 'ds-chosen', '存过的选择就该排在最前面');
	assert.strictEqual(modelsCalls, 0, '已经知道用哪个模型，不必再去列一遍');

	invalidateModelsCache();
	modelsResponse = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ data: [{ id: 'srv-1' }, { id: 'srv-2' }] }) });
	chatPosts.length = 0;
	await runExtract(undefined, coachContext({ chosen: null }));
	assert.strictEqual(chatPosts[0].body.model, 'srv-1', '没存过选择时用服务列表里的第一个');

	invalidateModelsCache();
	modelsResponse = () => ({ ok: false, status: 401, text: async () => 'invalid key' });
	chatPosts.length = 0;
	const fallback = await runExtract(undefined, coachContext({ chosen: null }));
	assert.strictEqual(chatPosts[0].body.model, constants.FALLBACK_CHAT_MODELS[0], '列不出来也要有个名字可问');
	assert.equal(fallback.ok, true);
	invalidateModelsCache();
});

await check('题面原文进提示词前先截到 12000 字，不把没上限的正文发出去', async () => {
	resetNetwork();
	chatResponses = [{ content: JSON.stringify(jsonReply) }];
	await runExtract({ id: 'P1001', platform: 'luogu', title: 't', text: 'x'.repeat(20000) });
	const prompt = chatPosts[0].body.messages[1].content;
	assert.ok(prompt.includes('x'.repeat(constants.EXTRACT_INPUT_CHAR_CAP)), '该带上上限那么长的原文');
	assert.ok(!prompt.includes('x'.repeat(constants.EXTRACT_INPUT_CHAR_CAP + 1)), '原文没被截断');
	assert.ok(prompt.includes('【题面原文结束】'), '截断不能把结尾的定界符吃掉');
});

await check('提示词要的正好是那一个 JSON 对象的形状', () => {
	const prompt = extract.buildExtractPrompt({ id: 'P1001', platform: 'luogu', title: 'A+B Problem', text: '给两个整数' });
	for (const key of ['statement', 'inputFormat', 'outputFormat', 'samples', 'hint']) {
		assert.ok(prompt.includes(`"${key}"`), `提示词里没写出 ${key} 这个字段名，模型就会按自己猜的键名回`);
	}
	assert.ok(prompt.includes('仅含 JSON'), '要的是纯 JSON，不是带围栏的答案');
	assert.ok(prompt.includes('不要编造样例'));
	assert.ok(prompt.includes('luogu P1001 A+B Problem'), `元数据那行没拼出来：${prompt.slice(prompt.indexOf('【元数据】'), prompt.indexOf('【元数据】') + 60)}`);
});

await check('extractJsonObject：围栏、客套话、最外层 {…} 三种写法都读得出来', () => {
	assert.strictEqual(extract.extractJsonObject('```json\n{"hint":"x"}\n```').hint, 'x', '旧版的围栏用例');
	assert.strictEqual(extract.extractJsonObject('Here you go:\n{"a":1}\nHope that helps!').a, 1, '旧版的周围有废话那一条');
	assert.deepStrictEqual(extract.extractJsonObject('前头一句话 {"a":{"b":1}} 后头一句话').a, { b: 1 }, '嵌套的花括号要连最外层一起取');
	assert.strictEqual(extract.extractJsonObject('纯散文，一个花括号都没有'), undefined);
	assert.strictEqual(extract.extractJsonObject('{坏的 JSON'), undefined);
	assert.strictEqual(extract.extractJsonObject('[1,2,3]'), undefined, '数组不是字段袋子，不能当成功');
	assert.strictEqual(extract.extractJsonObject(''), undefined);
});

await check('sanitizeFields：白名单外的键不要，字符串去过空白，空壳样例丢掉', () => {
	const fields = extract.sanitizeFields({
		statement: '  两边有空  ',
		inputFormat: 42,
		hint: null,
		difficulty: '编的',
		timeLimit: '999 ms',
		samples: [{ input: ' a ', output: '' }, { input: '', output: '' }, 'x', null, { input: '', output: 'b' }],
	});
	assert.deepStrictEqual(fields, { statement: '两边有空', samples: [{ input: 'a', output: '' }, { input: '', output: 'b' }] });
	assert.ok(!('difficulty' in fields) && !('timeLimit' in fields) && !('inputFormat' in fields), '模型想顺带改的东西不能跟着进题面文件');
});

console.log(failed ? '\nFAILED' : '\ncoach extract harness: all assertions passed');
process.exitCode = failed ? 1 : 0;
