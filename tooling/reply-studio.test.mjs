import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptiveStyles, composerLabels, customDefinitions } from '../ai/styles.mjs';
import { generateDrafts } from '../ai/generation.mjs';

const style = { id: 'custom-garden', name: 'Garden notes', prompt: 'Focus on one leaf.' };

test('validates stored styles independently of their display names', () => {
  assert.deepEqual(customDefinitions([{ ...style, id: 'minimal' }, null, style, style, { ...style, prompt: '' }]), [style]);
  assert.equal(composerLabels('zh-Hans', [style])[style.id], style.name);
});

test('generates checked built-in and custom styles together from a saved configuration', async t => {
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    const { messages } = JSON.parse(options.body);
    assert.match(messages[0].content, /keys concise, custom-garden\./);
    assert.match(messages[0].content, /Focus on one leaf\./);
    assert.doesNotMatch(messages[0].content, /Disabled prompt/);
    const output = { language: 'en', concise: { text: 'Two fresh leaves.', reference: '两片新叶。' },
      [style.id]: { text: 'That second leaf looks promising.', reference: '第二片叶子很有希望。' } };
    return Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] });
  });
  const { replies } = await generateDrafts({ provider: 'openai', model: 'fixture', key: 'fixture',
    styles: [style.id, 'concise'], customStyles: [style, { ...style, id: 'custom-other', prompt: 'Disabled prompt' }],
    bilingual: true, nativeLanguage: 'zh-Hans' }, 'Two leaves today.', [], []);
  assert.deepEqual(replies.map(draft => draft.tone), ['concise', style.id]);
  assert.equal(replies[1].reference, '第二片叶子很有希望。');
});

test('learns selected styles and sends one request for the adaptive set', async t => {
  assert.deepEqual(adaptiveStyles(['minimal', 'concise', 'conversational', 'vivid', 'enthusiastic', 'sincereFriendly'], [], true, {}),
    ['minimal', 'concise', 'conversational', 'vivid', 'enthusiastic', 'sincereFriendly']);
  assert.deepEqual(adaptiveStyles(['minimal', 'concise', 'conversational', 'vivid', 'enthusiastic', 'sincereFriendly'], [], true, { minimal: 4 }),
    ['minimal', 'concise', 'conversational', 'vivid', 'enthusiastic']);
  assert.deepEqual(adaptiveStyles(['minimal', 'concise', 'conversational', 'vivid', 'enthusiastic', 'sincereFriendly'], [], true,
    { minimal: 5, concise: 2, conversational: 1 }), ['minimal', 'concise', 'conversational', 'vivid']);
  assert.deepEqual(adaptiveStyles(['minimal', 'concise', 'conversational', 'vivid', 'enthusiastic', 'sincereFriendly'], [], true,
    { minimal: 8, concise: 4, conversational: 2 }), ['minimal', 'concise', 'conversational']);
  assert.deepEqual(adaptiveStyles(['minimal', 'concise', 'conversational'], [], false, { minimal: 20 }),
    ['minimal', 'concise', 'conversational']);
  assert.deepEqual(adaptiveStyles(['minimal', 'concise'], [], true, {}),
    ['minimal', 'concise', 'conversational', 'vivid']);
  assert.deepEqual(adaptiveStyles(['minimal', 'concise'], [], true, { vivid: 5 }),
    ['vivid', 'minimal', 'concise', 'conversational']);
  assert.deepEqual(adaptiveStyles(['minimal', 'concise'], [{ id: 'custom-garden', name: 'Garden notes', prompt: 'Focus on one leaf.' }], true, {}),
    ['minimal', 'concise', 'conversational', 'vivid']);

  let calls = 0;
  const progress = [];
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    calls++;
    const { messages } = JSON.parse(options.body);
    const prompt = messages[0].content;
    const match = prompt.match(/keys ([^\.]+)\./);
    const style = match?.[1];
    assert.equal(style, 'minimal, concise, conversational');
    assert.match(prompt, /include a separate reference field/i);
    const output = { language: 'en', minimal: { text: 'minimal reply.', reference: 'minimal reference.' },
      concise: { text: 'concise reply.', reference: 'concise reference.' },
      conversational: { text: 'conversational reply.', reference: 'conversational reference.' } };
    return Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] });
  });
  const result = await generateDrafts({ provider: 'openai', model: 'fixture', key: 'fixture',
    styles: ['minimal', 'concise', 'conversational', 'vivid', 'enthusiastic', 'sincereFriendly'],
    adaptiveStyles: true, stylePreferences: { minimal: 8, concise: 4, conversational: 2 },
    bilingual: true, nativeLanguage: 'zh-Hans' }, 'Post', [], [], undefined, {
    onReply: reply => { progress.push(reply.tone); }
  });
  assert.equal(calls, 1);
  assert.deepEqual(progress, ['minimal', 'concise', 'conversational']);
  assert.deepEqual([...progress].sort(), ['minimal', 'concise', 'conversational'].sort());
  assert.deepEqual(result.replies.map(reply => reply.tone), ['minimal', 'concise', 'conversational']);
  assert.deepEqual(result.replies.map(reply => reply.reference), ['minimal reference.', 'concise reference.', 'conversational reference.']);
});

test('streams the first single-style reply before the full JSON response closes', async t => {
  const progress = [];
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.stream, true);
    const fragments = ['{"language":"en","minimal":{"text":"Fast', ' reply"}}'];
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const fragment of fragments) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: fragment } }] })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
  });
  const result = await generateDrafts({ provider: 'openai', model: 'fixture', key: 'fixture', styles: ['minimal'] },
    'Post', [], [], undefined, { onReply: (reply, partial) => progress.push({ reply, partial }) });
  assert.equal(progress[0].partial, true);
  assert.equal(progress[0].reply.text, 'Fast');
  assert.equal(progress.at(-1).partial, false);
  assert.equal(progress.at(-1).reply.text, 'Fast reply');
  assert.deepEqual(result.replies, [{ tone: 'minimal', text: 'Fast reply' }]);
});

test('parses Doubao SSE fragments through the same streaming path', async t => {
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    assert.equal(JSON.parse(options.body).stream, true);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const emit = content => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
        emit('{"minimal":{"');
        emit('text":"豆包回复。"}}');
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
  });
  const result = await generateDrafts({ provider: 'doubao', model: 'ep-fixture', key: 'fixture', styles: ['minimal'] },
    'Post', [], [], undefined, { onReply() {} });
  assert.deepEqual(result.replies, [{ tone: 'minimal', text: '豆包回复。' }]);
});

for (const provider of ['deepseek', 'qwen', 'glm', 'kimi']) {
  test(`parses ${provider} OpenAI-compatible SSE fragments`, async t => {
    t.mock.method(globalThis, 'fetch', async (_, options) => {
      assert.equal(JSON.parse(options.body).stream, true);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const content of ['{"minimal":{"text":"', `${provider} 回复。"}}`]) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
    });
    const result = await generateDrafts({ provider, model: 'fixture', key: 'fixture', styles: ['minimal'] },
      'Post', [], [], undefined, { onReply() {} });
    assert.deepEqual(result.replies, [{ tone: 'minimal', text: `${provider} 回复。` }]);
  });
}

test('falls back to a complete response when streaming output is unusable', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    requests++;
    const body = JSON.parse(options.body);
    if (requests === 1) {
      assert.equal(body.stream, true);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
    }
    assert.equal(body.stream, undefined);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ minimal: { text: '完整回复。' } }) } }] });
  });
  const result = await generateDrafts({ provider: 'openai', model: 'fixture', key: 'fixture', styles: ['minimal'] },
    'Post', [], [], undefined, { onReply() {} });
  assert.equal(requests, 2);
  assert.deepEqual(result.replies, [{ tone: 'minimal', text: '完整回复。' }]);
});

test('classifies cancellation without retrying and retries timeout without streaming', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', (_, { signal }) => {
    requests++;
    return new Promise((_, reject) => {
      const fail = () => reject(signal.reason);
      if (signal.aborted) fail();
      else signal.addEventListener('abort', fail, { once: true });
    });
  });
  const controller = new AbortController();
  const cancelled = generateDrafts({ provider: 'openai', model: 'fixture', key: 'fixture', styles: ['minimal'] },
    'Post', [], [], undefined, { onReply() {}, signal: controller.signal });
  controller.abort(new DOMException('cancelled', 'AbortError'));
  assert.deepEqual(await cancelled, { error: 'cancelled' });
  assert.deepEqual(await generateDrafts({ provider: 'openai', model: 'fixture', key: 'fixture', styles: ['minimal'] },
    'Post', [], [], undefined, { onReply() {}, timeout: 5 }), { error: 'timeout' });
  assert.equal(requests, 3);
});
