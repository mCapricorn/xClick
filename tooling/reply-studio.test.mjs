import assert from 'node:assert/strict';
import test from 'node:test';
import { composerLabels, customDefinitions } from '../ai/styles.mjs';
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
