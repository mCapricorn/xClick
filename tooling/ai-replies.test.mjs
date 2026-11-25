import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { providers, apiBase, apiPermission, makeRequest, readReplies, readProviderError } from '../ai/providers.mjs';
import { translateDraft } from '../ai/generation.mjs';
import { catalogues, fetchModels } from '../ai/models.mjs';

const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
const entries = { minimal: { text: '纸上编程' }, concise: { text: '简洁回复' }, conversational: { text: '自然一点的回复' }, vivid: { text: '更加生动的回复' }, enthusiastic: { text: '等一下，连纸上的缩进都对齐了！最好奇的是下一页会怎么改这个循环。' }, sincereFriendly: { text: '纸上的缩进也排得这么清楚，读起来很舒服。' } };
const drafts = Object.entries(entries).map(([tone, entry]) => ({ tone, ...entry }));
function providerEnvelope(provider, text) {
  return provider === 'google' ? { candidates: [{ content: { parts: [{ thought: true, text: 'hidden' }, { text }] } }] }
      : provider === 'anthropic' ? { content: [{ type: 'text', text }] }
      : provider === 'grok' ? { output: [{ type: 'reasoning' }, { type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }] }
      : { choices: [{ message: { content: text } }] };
}

test('each provider has multiple model suggestions', () => {
  for (const [id, entry] of Object.entries(providers)) {
    assert.ok(new Set([entry.model, ...catalogues[id].extra]).size > 1);
  }
});

test('a versioned relay base is shared by generation and model discovery', async t => {
  const base_url = ' https://relay.example/gateway/v1/ ';
  const base = 'https://relay.example/gateway/v1';
  const operations = { anthropic: '/messages', google: '/models/gemini-flash-latest:generateContent', grok: '/responses' };
  for (const [provider, { model }] of Object.entries(providers)) {
    const request = makeRequest({ provider, model, key: 'fixture', base_url }, 'Post');
    assert.equal(request.url, base + (operations[provider] ?? '/chat/completions'));
  }
  assert.deepEqual(manifest.optional_host_permissions, ['https://*/*', 'http://*/*']);
  assert.deepEqual(apiPermission(apiBase('openai', base_url)), { origins: ['https://relay.example/*'] });
  t.mock.method(globalThis, 'fetch', (url, options) => {
    assert.equal(url.href, base + '/models');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer fixture');
    return Response.json({ data: [{ id: 'relay-chat' }] });
  });
  assert.deepEqual(await fetchModels('openai', 'fixture', undefined, undefined, base_url), ['relay-chat']);
});

test('HTTP relay on a custom port serves model discovery and reply generation', async t => {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push([req.method, req.url, req.headers.authorization]);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.method === 'GET' ? { data: [{ id: 'relay-chat' }] }
      : { choices: [{ message: { content: JSON.stringify(entries) } }] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const base_url = origin + '/v1';
  assert.deepEqual(apiPermission(apiBase('openai', base_url)), { origins: [origin + '/*'] });
  assert.deepEqual(await fetchModels('openai', 'fixture', undefined, undefined, base_url), ['relay-chat']);
  const { url, headers, body } = makeRequest({ provider: 'openai', model: 'relay-chat', key: 'fixture', base_url }, 'Test post');
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  assert.deepEqual(readReplies('openai', await response.json()), drafts);
  assert.deepEqual(requests, [['GET', '/v1/models', 'Bearer fixture'], ['POST', '/v1/chat/completions', 'Bearer fixture']]);
});

test('allocates more output space for adaptive bilingual batches', () => {
  const { body } = makeRequest({ provider: 'openai', model: 'fixture', key: 'fixture',
    styles: ['minimal', 'concise', 'vivid', 'askGrok'], bilingual: true, nativeLanguage: 'zh-Hans' }, 'Post');
  assert.equal(body.max_tokens, 4096);
});

test('invalid relay URLs cannot be used for authenticated requests', () => {
  for (const value of ['ftp://relay.example', 'http://user:password@relay.example', 'https://*.example', 'https://name:secret@relay.example',
    'https://relay.example/v1?token=example', 'https://relay.example/#part', '/relative']) {
    assert.throws(() => apiBase('openai', value));
  }
  assert.equal(apiBase('openai', ' '), 'https://api.openai.com/v1');
});
test('reserves single-style bilingual output space across all providers', () => {
  for (const provider of Object.keys(providers)) {
    const config = { provider, model: 'fixture', styles: ['conversational'] };
    const limit = body => body.max_tokens ?? body.max_output_tokens ?? body.generationConfig?.maxOutputTokens;
    assert.equal(limit(makeRequest(config, 'Post').body), 320);
    assert.equal(limit(makeRequest({ ...config, bilingual: true, nativeLanguage: 'zh-Hans' }, 'Post').body), 1024);
  }
});
test('preserves direct and wrapped single-style references including longer translations', () => {
  const read = (value, native = 'zh-Hans') => readReplies('openai',
    { choices: [{ message: { content: JSON.stringify(value) } }] }, native, ['conversational']);
  const text = 'A longer reply about finding a small bug.';
  const reference = '排查问题需要耐心。'.repeat(120);
  for (const key of ['reference', 'translation', 'nativeText']) {
    const item = { text, [key]: reference };
    for (const value of [item, { data: item }, { replies: item }, { conversational: item }]) {
      assert.deepEqual(read(value), [{ tone: 'conversational', text, reference }]);
      assert.deepEqual(read(value, null), [{ tone: 'conversational', text }]);
    }
  }
  assert.deepEqual(read({ text }), [{ tone: 'conversational', text, referenceMissing: true }]);
  assert.deepEqual(read({ text, reference: '中'.repeat(4001) }), [{ tone: 'conversational', text, referenceMissing: true }]);
  assert.deepEqual(read({ language: 'zh-Hans', text: '排查需要时间。' }),
    [{ tone: 'conversational', text: '排查需要时间。' }]);
});

test('Ark lists text models using only the API key value', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.href, 'https://ark.cn-beijing.volces.com/api/v3/models');
    assert.deepEqual(options.headers, { Authorization: 'Bearer fixture' });
    return Response.json({ data: [
      { id: 'text-model', domain: 'VLM', modalities: { output_modalities: ['text'] } },
      { id: 'picture-model', domain: 'ImageGeneration' },
      { id: 'shutdown-model', status: 'Shutdown', domain: 'LLM' },
      { id: 'audio-only-input', modalities: { input_modalities: ['audio'], output_modalities: ['text'] } }
    ] });
  });
  assert.deepEqual(await fetchModels('doubao', 'fixture'), ['text-model']);
});

test('Ark model access failures reach the composer as actionable categories', async () => {
  for (const [status, code, error] of [
    [404, 'ModelNotOpen', 'arkActivation'],
    [403, 'OperationDenied.ServiceNotOpen', 'arkActivation'],
    [404, 'InvalidEndpointOrModel.ModelIDAccessDisabled', 'arkEndpoint'],
    [404, 'InvalidEndpointOrModel.NotFound', 'arkAccess'],
    [404, 'Unknown', 'notFound']
  ]) {
    const response = Response.json({ error: { code, message: 'untrusted provider detail' } }, { status });
    assert.deepEqual(await readProviderError('doubao', response), { error, status });
  }
  for (const provider of ['doubao', 'openai']) {
    assert.deepEqual(await readProviderError(provider, new Response('Not found', { status: 404 })), { error: 'notFound', status: 404 });
  }
});

test('Gemini lists generateContent models across catalogue pages', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.headers['x-goog-api-key'], 'fixture');
    if (url.searchParams.has('pageToken')) return Response.json({ models: [
      { name: 'models/gemini-b', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-image', supportedGenerationMethods: ['generateContent'] }
    ] });
    return Response.json({ nextPageToken: 'next', models: [
      { name: 'models/gemini-a', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/embed', supportedGenerationMethods: ['embedContent'] }
    ] });
  });
  assert.deepEqual(await fetchModels('google', 'fixture'), ['gemini-a', 'gemini-b']);
});
const generationURLs = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  google: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
  grok: 'https://api.x.ai/v1/responses',
  deepseek: 'https://api.deepseek.com/chat/completions',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  glm: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  kimi: 'https://api.moonshot.cn/v1/chat/completions',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
};
for (const [provider, { model }] of Object.entries(providers)) {
  test(provider + ' authenticates to its permitted origin and handles drafts', () => {
    const key = 'synthetic-test-key';
    const comments = ['第一条评论', 'Another perspective'];
    const { url, body, headers } = makeRequest({ provider, model, key }, '测试原帖', comments);
    const context = provider === 'google' ? body.contents[0].parts[0].text : (body.messages || body.input).at(-1).content;
    assert.deepEqual(JSON.parse(context), { post: '测试原帖', comments });
    assert.equal(url, generationURLs[provider]);
    assert.equal(headers['Content-Type'], 'application/json');
    if (provider !== 'google') assert.equal(body.model, model);
    if (provider === 'anthropic') {
      assert.equal(headers['anthropic-version'], '2026-10-21');
      assert.ok(!('anthropic-workspace-id' in headers));
      assert.ok(body.system && body.max_tokens > 0);
      assert.deepEqual(body.messages.map(m => m.role), ['user']);
    } else if (provider === 'google') {
      assert.ok(body.systemInstruction.parts[0].text);
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      assert.equal(body.contents[0].role, 'user');
    } else if (provider !== 'grok') {
      assert.deepEqual(body.messages.map(m => m.role), ['system', 'user']);
    }
    if (provider === 'grok') {
      assert.equal(new URL(url).pathname, '/v1/responses');
      assert.equal(body.store, false);
      assert.deepEqual(body.input.map(message => message.role), ['system', 'user']);
    }
    assert.deepEqual(apiPermission(apiBase(provider)), { origins: [new URL(url).origin + '/*'] });
    if (provider === 'google') assert.equal(headers['x-goog-api-key'], key);
    else assert.equal(headers.Authorization, 'Bearer ' + key);
    assert.ok(!JSON.stringify({ url, body }).includes(key));
    assert.match(JSON.stringify(body), /Simplified Chinese/);
    assert.match(JSON.stringify(body), /测试原帖/);
    assert.match(JSON.stringify(body), /Traditional Chinese/);
    assert.match(JSON.stringify(body), /English for English posts/);
    const data = providerEnvelope(provider, JSON.stringify(entries));
    assert.deepEqual(readReplies(provider, data), drafts);
  });
}
test('Claude scopes both list and generation requests to the chosen workspace', async t => {
  const config = { provider: 'anthropic', model: 'claude-haiku-4-5', key: 'fixture', workspace: 'wrkspc_fixture' };
  const { headers } = makeRequest(config, 'Post');
  assert.equal(headers['anthropic-workspace-id'], config.workspace);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.href, 'https://api.anthropic.com/v1/models?limit=1000');
    assert.equal(options.headers['anthropic-workspace-id'], config.workspace);
    assert.equal(options.headers.Authorization, headers.Authorization);
    return Response.json({ data: [{ id: config.model }], has_more: false });
  });
  assert.deepEqual(await fetchModels('anthropic', config.key, undefined, config.workspace), [config.model]);
  assert.ok(!('anthropic-workspace-id' in makeRequest({ ...config, provider: 'glm' }, 'Post').headers));
});
test('only sets model-specific reasoning options on supported requests', () => {
  const request = (provider, model) => makeRequest({ provider, model, key: 'fixture' }, 'Post').body;
  assert.deepEqual(request('grok', 'grok-4.7').reasoning, { effort: 'low' });
  assert.ok(!('reasoning' in request('grok', 'custom-model')));
  assert.equal(request('kimi', 'kimi-k3.1-pro').reasoning_effort, 'low');
  assert.ok(!('reasoning_effort' in request('kimi', 'kimi-k2.6')));
});
test('accepts Gemini resource names pasted from the provider', () => {
  const config = { provider: 'google', model: 'models/gemini-flash-latest', key: 'fixture' };
  assert.equal(makeRequest(config, 'Post').url, generationURLs.google);
});
test('omits known Responses-only and retired OpenAI models from chat choices', async t => {
  const ids = ['gpt-5.4-mini', 'gpt-4.1-nano', 'gpt-5.4-pro', 'o3-pro', 'gpt-5-codex'];
  t.mock.method(globalThis, 'fetch', () => Response.json({ data: ids.map(id => ({ id })) }));
  assert.deepEqual(await fetchModels('openai', 'fixture'), ['gpt-5.4-mini']);
});
test('uses the original tweet language across providers even with translated context and references', () => {
  for (const provider of Object.keys(providers)) {
    const request = lang => {
      const { body } = makeRequest({ provider, model: 'fixture', bilingual: true, nativeLanguage: 'zh-Hans' }, 'One blue box 译文', [], [], lang);
      return body.system || body.systemInstruction?.parts[0].text || (body.messages || body.input)[0].content;
    };
    assert.match(request('en'), /Write every reply text in English/);
    assert.match(request('zh-Hant'), /Write every reply text in 繁體中文/);
    assert.doesNotMatch(request(undefined), /X identifies/);
    assert.doesNotMatch(request('untrusted fixture'), /untrusted fixture/);
  }
});
test('generates from the original post alone when there are no comments', () => {
  const { body } = makeRequest({ provider: 'openai', model: 'test', key: 'fixture' }, 'Original');
  assert.deepEqual(JSON.parse(body.messages.at(-1).content), { post: 'Original' });
});
const parse = (value, native) => readReplies('openai', { choices: [{ message: { content: JSON.stringify(value) } }] }, native);
test('keeps translation separate, strips unrequested references and preserves tone order', () => {
  const translated = Object.fromEntries(Object.entries(entries).reverse().map(([tone, entry]) => [tone, { ...entry, reference: 'Reference ' + tone }]));
  assert.deepEqual(parse({ language: 'zh-Hans', ...translated }, 'zh-Hans'), drafts);
  assert.deepEqual(parse(translated), drafts);
  assert.deepEqual(parse({ ...translated, language: 'zh-Hans' }, 'en'), drafts.map(draft => ({ ...draft, reference: 'Reference ' + draft.tone })));
  assert.deepEqual(parse({ ...entries, language: 'zh-Hans' }, 'en'), drafts.map(draft => ({ ...draft, referenceMissing: true })));
  assert.throws(() => parse({}), /format/);
  assert.deepEqual(parse({ ...entries, minimal: null }), drafts.slice(1));
  assert.deepEqual(parse({ ...entries, vivid: entries.minimal }), drafts.filter(draft => draft.tone !== 'vivid'));
});
test('reads fenced JSON, content-part arrays and valid partial replies', () => {
  const value = { minimal: 'A short reply.', concise: { text: 'One clear detail.' }, vivid: { text: '' } };
  const content = [{ type: 'text', text: 'Here is the result:\n```json\n' }, { type: 'text', text: JSON.stringify(value) }, { type: 'text', text: '\n```' }];
  assert.deepEqual(readReplies('openai', { choices: [{ message: { content } }] }), [
    { tone: 'minimal', text: 'A short reply.' }, { tone: 'concise', text: 'One clear detail.' }
  ]);
});
test('accepts structured message content and Responses API output text', () => {
  const value = { minimal: { text: 'Direct object.' } };
  assert.deepEqual(readReplies('openai', { choices: [{ message: { content: value } }] }), [
    { tone: 'minimal', text: 'Direct object.' }
  ]);
  assert.deepEqual(readReplies('grok', { output_text: JSON.stringify(value) }), [
    { tone: 'minimal', text: 'Direct object.' }
  ]);
});
test('accepts omitted language and common language tags when references are enabled', () => {
  const value = { minimal: { text: '简短回复' }, concise: { text: '具体的一句话' } };
  assert.deepEqual(parse(value, 'zh-Hans'), [
    { tone: 'minimal', text: '简短回复' }, { tone: 'concise', text: '具体的一句话' }
  ]);
  assert.deepEqual(parse({ language: 'zh-CN', ...value }, 'zh-Hans'), [
    { tone: 'minimal', text: '简短回复' }, { tone: 'concise', text: '具体的一句话' }
  ]);
  assert.deepEqual(parse({ language: 'English', replies: [{ style: '极简', reply: 'A short reply.' }] }, 'zh-Hans'), [
    { tone: 'minimal', text: 'A short reply.', referenceMissing: true }
  ]);
  assert.deepEqual(parse({ minimal: { text: 'A short reply.', reference: '简短回复。' } }, 'zh-Hans'), [
    { tone: 'minimal', text: 'A short reply.', reference: '简短回复。' }
  ]);
  assert.deepEqual(parse({ language: 'zh-Hans', minimal: { text: 'A short reply.', translation: '简短回复。' } }, 'zh-Hans'), [
    { tone: 'minimal', text: 'A short reply.', reference: '简短回复。' }
  ]);
});
test('maps wrapped or unlabeled provider candidates by requested order', () => {
  const parseStyles = value => readReplies('openai', { choices: [{ message: { content: JSON.stringify(value) } }] }, null, ['minimal', 'concise']);
  assert.deepEqual(parseStyles({ answer_one: { text: 'First reply.' }, answer_two: { content: 'Second reply.' } }), [
    { tone: 'minimal', text: 'First reply.' }, { tone: 'concise', text: 'Second reply.' }
  ]);
  assert.deepEqual(parseStyles({ data: [{ reply: 'First reply.' }, { text: 'Second reply.' }] }), [
    { tone: 'minimal', text: 'First reply.' }, { tone: 'concise', text: 'Second reply.' }
  ]);
});

import { postPhotos } from '../ai/photos.mjs';
import { selectedStyles, generationStyles, styleIds, defaultStyles, composerLabels, styleLanguages } from '../ai/styles.mjs';
import { referenceLanguage } from '../ai/drafts.mjs';
test('uses six ordered defaults for legacy settings and filters stored style IDs', () => {
  assert.deepEqual(defaultStyles, Object.keys(entries));
  for (const value of [undefined, null, [], 'curious', ['unknown']]) assert.deepEqual(selectedStyles(value), defaultStyles);
  assert.deepEqual(selectedStyles(['curious', 'unknown', 'vivid', 'curious']), ['vivid', 'curious']);
  for (const lang of styleLanguages) {
    for (const id of styleIds) assert.ok(composerLabels(lang)[id]);
  }
});
test('limits generated styles to four and randomly samples excess selections', t => {
  t.mock.method(Math, 'random', () => 0);
  assert.deepEqual(generationStyles(['minimal', 'concise']), ['minimal', 'concise']);
  assert.deepEqual(generationStyles(['minimal', 'concise', 'conversational', 'vivid', 'enthusiastic']),
    ['minimal', 'concise', 'conversational', 'vivid']);
  assert.equal(generationStyles([...styleIds]).length, 4);
});
test('requests and parses only enabled styles, including optional bilingual styles', () => {
  const styles = ['dryHumor', 'enthusiastic'];
  const { body } = makeRequest({ provider: 'openai', styles }, 'Post');
  assert.match(body.messages[0].content, /keys enthusiastic, dryHumor\./);
  assert.doesNotMatch(body.messages[0].content, /minimal:|curious:/);
  const output = { language: 'en', enthusiastic: { text: 'A chatty reply.', reference: '健谈的回复。' }, dryHumor: { text: 'Well then.', reference: '好嘛。' }, extra: {} };
  const read = () => readReplies('openai', { choices: [{ message: { content: JSON.stringify(output) } }] }, 'zh-Hans', styles);
  assert.deepEqual(read(), ['enthusiastic', 'dryHumor'].map(tone => ({ tone, ...output[tone] })));
  delete output.dryHumor;
  assert.deepEqual(read(), [{ tone: 'enthusiastic', ...output.enthusiastic }]);
  output.dryHumor = { ...output.enthusiastic };
  delete output.enthusiastic.reference;
  assert.deepEqual(read(), [{ tone: 'enthusiastic', text: 'A chatty reply.', referenceMissing: true }]);
});
test('Ask Grok is opt-in and keeps the mention in the comment and the translation in its own field', () => {
  const prompt = styles => makeRequest({ provider: 'openai', styles }, 'Why is the moon orange?').body.messages[0].content;
  assert.doesNotMatch(prompt(defaultStyles), /@grok|askGrok/i);
  assert.match(prompt([...defaultStyles, 'askGrok']), /askGrok: Address @grok directly/);
  for (const [question, expected] of [
    ['Why orange?', '@grok Why orange?'], ['Hey @Grok, why orange?', 'Hey @Grok, why orange?'],
    ['What does @grokker mean?', '@grok What does @grokker mean?']
  ]) {
    const result = { language: 'en', askGrok: { text: question, reference: '为什么是橙色？' } };
    const response = { choices: [{ message: { content: JSON.stringify(result) } }] };
    assert.deepEqual(readReplies('openai', response, 'zh-Hans', ['askGrok']), [
      { tone: 'askGrok', text: expected, reference: '为什么是橙色？' }
    ]);
  }
});
test('sends bounded X photos as native image inputs, strips unrelated URL data', () => {
  const photos = postPhotos(['https://pbs.twimg.com/media/fixture?format=jpg&name=small&extra=other', 'https://pbs.twimg.com/media/fixture.jpg', 'https://pbs.twimg.com/profile_images/avatar.jpg', 'https://example.org/media/other.png']);
  const uri = 'https://pbs.twimg.com/media/fixture?format=jpg&name=large';
  assert.deepEqual(photos, [{ uri, mimeType: 'image/jpeg' }]);
  assert.throws(() => postPhotos(Array(5).fill(uri)));
  for (const provider of Object.keys(providers).filter(id => id !== 'deepseek')) {
    const { body } = makeRequest({ provider, model: 'fixture' }, 'Post', [], photos);
    if (provider === 'google') assert.deepEqual(body.contents[0].parts[1], { fileData: { fileUri: uri, mimeType: 'image/jpeg' } });
    else if (provider === 'grok') assert.deepEqual(body.input[1].content[1], { type: 'input_image', image_url: uri });
    else if (provider === 'anthropic') assert.deepEqual(body.messages[0].content[0], { type: 'image', source: { type: 'url', url: uri } });
    else assert.deepEqual(body.messages[1].content[1], { type: 'image_url', image_url: { url: uri } });
  }
});
test('old settings default to no translation and unsupported preference values stay out of prompts', () => {
  assert.equal(referenceLanguage({}), null);
  assert.equal(referenceLanguage({ bilingual: true, nativeLanguage: 'bad' }), null);
  assert.equal(referenceLanguage({ bilingual: true, nativeLanguage: 'fr' }), 'fr');
});

// Exercise the service worker's generation path without a live key or network.
test('selects media by model and falls back once only for image input errors', async t => {
  globalThis.chrome = { runtime: { onMessage: { addListener() {} } } };
  let generateDrafts;
  try { ({ generateDrafts } = await import('../ai/background.mjs')); }
  finally { delete globalThis.chrome; }
  const photos = postPhotos(['https://pbs.twimg.com/media/fixture.jpg']);
  const success = () => Response.json({ choices: [{ message: { content: JSON.stringify(entries) } }] });
  const failure = (status, message) => () => Response.json({ error: { message } }, { status });
  let queue;
  let bodies;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return queue.shift()();
  });
  async function run(config, responses, post = 'Text in original post', media = photos) {
    bodies = [];
    queue = [...responses];
    const result = await generateDrafts({ provider: 'openai', model: 'gpt-4.1-mini', key: 'fixture', ...config }, post, ['A comment'], media);
    assert.equal(queue.length, 0);
    return result;
  }
  for (const config of [{ model: 'gpt-3.5-turbo' }, { model: 'unknown' }, { includePhotos: false }, { provider: 'doubao', model: 'ep-fixture' }, { provider: 'qwen', model: 'qwen-max' }]) {
    assert.deepEqual(await run(config, [success]), { replies: drafts, photoCount: 0, labelLanguage: null });
    assert.ok(!JSON.stringify(bodies).includes('pbs.twimg.com'));
  }
  const split = { provider: 'qwen', model: 'qwen-max', photoModel: 'qwen-vl-plus' };
  for (const [settings, media, expectedModel, photoCount] of [
    [split, photos, 'qwen-vl-plus', 1], [split, [], 'qwen-max', 0],
    [{ ...split, includePhotos: false }, photos, 'qwen-max', 0],
    [{ ...split, photoModel: 'unknown' }, photos, 'qwen-max', 0]
  ]) {
    assert.equal((await run(settings, [success], 'Post', media)).photoCount, photoCount);
    assert.deepEqual(bodies.map(body => body.model), [expectedModel]);
    assert.equal(JSON.stringify(bodies).includes('pbs.twimg.com'), photoCount > 0);
  }
  assert.equal((await run(split, [success], '')).photoCount, 1);
  assert.equal((await run(split, [failure(400, 'Unsupported image'), success])).photoCount, 0);
  assert.deepEqual(bodies.map(body => body.model), ['qwen-vl-plus', 'qwen-vl-plus']);
  const goodNight = { minimal: { text: 'Good night!' }, concise: { text: 'Good night!' }, vivid: { text: 'Sleep well.' } };
  const shortPost = await run({ includePhotos: false }, [() => Response.json({ choices: [{ message: { content: JSON.stringify(goodNight) } }] })], 'Good night!');
  assert.deepEqual(shortPost.replies, [{ tone: 'minimal', ...goodNight.minimal }, { tone: 'vivid', ...goodNight.vivid }]);
  assert.equal(bodies.length, 1);
  const sameLanguage = () => Response.json({ choices: [{ message: { content: JSON.stringify({ ...entries, language: 'zh-Hans' }) } }] });
  assert.deepEqual(await run({ bilingual: true, nativeLanguage: 'zh-Hans' }, [sameLanguage]), { replies: drafts, photoCount: 1, labelLanguage: 'zh-Hans' });
  assert.deepEqual(await run({}, [success]), { replies: drafts, photoCount: 1, labelLanguage: null });
  assert.deepEqual(await run({}, [failure(400, 'Unsupported image_url'), success]), { replies: drafts, photoCount: 0, labelLanguage: null });
  assert.match(JSON.stringify(bodies[0]), /pbs\.twimg\.com/);
  assert.equal(bodies[1].messages[1].content, bodies[0].messages[1].content[0].text);
  assert.deepEqual(await run({}, [failure(400, 'invalid model parameter')]), { error: 'provider', status: 400 });
  assert.deepEqual(await run({}, [failure(429, 'image quota exceeded')]), { error: 'quota', status: 429 });
  assert.deepEqual(await run({}, [failure(400, 'Unsupported image'), failure(401, 'Invalid key')]), { error: 'key', status: 401 });
  assert.deepEqual(await run({ model: 'unknown' }, [], ''), { error: 'visionUnknown' });
  const ark = { provider: 'doubao', model: 'doubao-seed-2-0-mini-260428', includePhotos: true };
  assert.deepEqual(await run({ ...ark, includePhotos: false }, [], ''), { error: 'photosDisabled' });
  assert.equal((await run(ark, [success], '')).photoCount, 1);
  assert.deepEqual(bodies[0].messages[1].content[1], { type: 'image_url', image_url: { url: photos[0].uri } });
  assert.deepEqual(await run(ark, [failure(400, 'Image download failed')], ''), { error: 'photoRequest', status: 400 });
  assert.equal((await run(ark, [failure(400, 'Image download failed'), success], '🤗')).photoCount, 0);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).post, '🤗');
});


for (const provider of Object.keys(providers)) {
  test(`reads a standalone translation from ${provider}`, async t => {
    const data = providerEnvelope(provider, JSON.stringify({ reference: '新鲜罗勒。' }));
    t.mock.method(globalThis, 'fetch', async () => Response.json(data));
    assert.deepEqual(await translateDraft({ provider, key: 'fixture', model: 'fixture', bilingual: true, nativeLanguage: 'zh-Hans' },
      'Fresh basil.', 'zh-Hans'), { reference: '新鲜罗勒。' });
  });
}
