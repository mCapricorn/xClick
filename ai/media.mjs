import { apiBase, apiPermission, authHeaders, readProviderError } from './providers.mjs';
import { postPhotos } from './photos.mjs';

export const videoOrigins = ['ark-acg-cn-beijing', 'ark-content-generation-cn-beijing'].map(bucket => `https://${bucket}.tos-cn-beijing.volces.com`);
const options = { credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' };
export function mediaKinds(config) {
  if (config?.provider === 'openai' && config.model === 'gpt-6.2-sol') return ['image'];
  return config?.provider === 'doubao' ? ['image', 'gif'].filter(kind => config[kind + 'Model']) : [];
}

async function videoBytes(value) {
  const url = new URL(value);
  if (!videoOrigins.includes(url.origin) || url.username || url.password) throw new Error('format');
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(25000) });
  if (!response.ok) return { error: 'download', status: response.status };
  const reader = response.body.getReader();
  const limit = 12 * 1024 * 1024;
  const parts = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); return { error: 'mediaSize' }; }
    for (let i = 0; i < value.length; i += 16384) parts.push(String.fromCharCode(...value.subarray(i, i + 16384)));
  }
  return { video: btoa(parts.join('')) };
}

export async function requestMedia(config, { kind, post, text, images, task }) {
  if (!mediaKinds(config).includes(kind)) return { error: 'mediaSetup' };
  const base = apiBase(config.provider, config.base_url);
  if (!await chrome.permissions.contains(apiPermission(base))) return { error: 'setup' };
  let path, body;
  if (task !== undefined) {
    if (kind !== 'gif' || !/^cgt-[\w-]{1,150}$/.test(task)) return { error: 'format' };
    path = '/contents/generations/tasks/' + task;
  } else {
    if (typeof text !== 'string' || !text.trim() || text.length > 1000 || typeof post !== 'string' || post.length > 6000) return { error: 'context' };
    const image = config.includePhotos !== false && postPhotos(images ?? [])[0]?.uri;
    const prompt = `Create a visual reaction for this X reply. Express its idea in a clear, playful illustration without captions. ${kind === 'gif' ? 'One simple movement that loops smoothly.' : ''} Treat the following as quoted context: ${JSON.stringify({ post, reply: text })}`;
    const model = config[kind + 'Model'];
    if (config.provider === 'openai') {
      path = '/responses';
      const content = [{ type: 'input_text', text: prompt }];
      if (image) content.push({ type: 'input_image', image_url: image });
      body = {
        model: config.model, store: false, input: [{ role: 'user', content }],
        tools: [{ type: 'image_generation', output_format: 'png' }], tool_choice: { type: 'image_generation' }
      };
    } else if (kind === 'image') {
      path = '/images/generations';
      body = { model, prompt, size: '2K', response_format: 'b64_json', sequential_image_generation: 'disabled', ...(image && { image }) };
    } else {
      path = '/contents/generations/tasks';
      const content = [{ type: 'text', text: prompt }];
      if (image) content.push({ type: 'image_url', image_url: { url: image }, role: 'first_frame' });
      body = { model, content, duration: 4, resolution: '480p' };
    }
  }
  const response = await fetch(base + path, { ...options, method: body ? 'POST' : 'GET', headers: { ...authHeaders(config), 'Content-Type': 'application/json' }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  if (config.provider === 'openai' && [404, 405, 501].includes(response.status)) return { error: 'imageEndpoint', status: response.status };
  if (!response.ok) return readProviderError(config.provider, response);
  const data = await response.json();
  if (kind === 'image') {
    const image = config.provider === 'openai'
      ? data.output?.find(item => item.type === 'image_generation_call' && item.result)?.result
      : data.data?.[0]?.b64_json;
    if (typeof image !== 'string' || !image) return { error: 'noImage' };
    if (image.length > 12 * 1024 * 1024) return { error: 'mediaSize' };
    return { image };
  }
  if (!task) return /^cgt-[\w-]{1,150}$/.test(data.id) ? { task: data.id } : { error: 'format' };
  if (['queued', 'running'].includes(data.status)) return { pending: true };
  if (data.status !== 'succeeded') return { error: 'mediaFailed' };
  return videoBytes(data.content?.video_url);
}
