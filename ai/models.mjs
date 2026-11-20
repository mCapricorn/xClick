import { apiBase, authHeaders } from './providers.mjs';

// Presets work before a key is entered. Account catalogues can differ by region and key.
export const catalogues = {
  openai: { extra: ['gpt-4.1', 'gpt-5.4-mini'], path: '/models' },
  anthropic: { extra: ['claude-sonnet-4-6'], path: '/models?limit=1000' },
  google: { extra: ['gemini-3.8-flash'], path: '/models?pageSize=1000' },
  grok: { extra: ['grok-4.3'], path: '/language-models' },
  deepseek: { extra: ['deepseek-v4-pro'], path: '/models' },
  qwen: { extra: ['qwen-flash', 'qwen-max', 'qwen-vl-plus'] },
  glm: { extra: ['glm-5.3-flash', 'glm-5.3-flashx', 'glm-4.6v'] },
  kimi: { extra: ['kimi-k3.1-pro-highspeed', 'kimi-k2.6'], path: '/models' },
  doubao: { extra: ['doubao-seed-2-1-pro-260915', 'doubao-seed-2-1-turbo-260628', 'doubao-seed-2-0-mini-260428'], path: '/models' }
};

function textModel(provider, entry, customBase) {
  if (provider === 'google') {
    if (!entry.supportedGenerationMethods?.includes('generateContent')) return;
    const id = entry.name?.replace(/^models\//, '');
    if (id?.startsWith('gemini-') && !/(?:^|-)(?:image|robotics|computer-use)(?:-|$)/.test(id)) return id;
    return;
  }
  if (provider === 'doubao') {
    if (entry.status && !['Published', 'Retiring'].includes(entry.status)) return;
    if (entry.modalities?.input_modalities && !entry.modalities.input_modalities.includes('text')) return;
    if (entry.modalities?.output_modalities && !entry.modalities.output_modalities.includes('text')) return;
    if (entry.domain && !['LLM', 'VLM'].includes(entry.domain)) return;
  }
  if (provider === 'openai') {
    if (!customBase && !/^(?:gpt-|o[1-9]|ft:(?:gpt-|o[1-9]))/.test(entry.id)) return;
    // These model families require Responses or have been retired.
    if (/(?:^|:)gpt-(?:4\.1-nano|5(?:\.\d+)?-pro)(?:-|:|$)|(?:^|-)codex(?:-|:|$)|^o[13]-pro(?:-|$)/.test(entry.id)) return;
  }
  return entry.id;
}

export async function fetchModels(provider, key, signal, workspace, base_url) {
  const url = new URL(apiBase(provider, base_url) + catalogues[provider].path);
  const headers = authHeaders({ provider, key, workspace });
  const ids = new Set();
  const cursors = new Set();
  for (;;) {
    const response = await fetch(url, { headers, signal, credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    for (const entry of data.models ?? data.data) {
      const id = textModel(provider, entry, base_url);
      if (typeof id === 'string' && id && !/(?:embedding|moderation|image-generation|gpt-image|audio|realtime|transcrib|tts|computer-use|image-preview|native-image|deep-research)/i.test(id)) ids.add(id);
    }
    const cursor = provider === 'google' ? data.nextPageToken : provider === 'anthropic' && data.has_more && data.last_id;
    if (!cursor || cursors.has(cursor)) break;
    cursors.add(cursor);
    url.searchParams.set(provider === 'google' ? 'pageToken' : 'after_id', cursor);
  }
  return [...ids].sort();
}
