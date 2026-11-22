import { replyInstructions, referenceLanguage, parseDrafts } from './drafts.mjs';

export const providers = {
  openai: { name: 'OpenAI', baseURL: 'https://api.openai.com/v1', path: '/chat/completions', model: 'gpt-4.1-mini' },
  anthropic: { name: 'Anthropic Claude', baseURL: 'https://api.anthropic.com/v1', path: '/messages', model: 'claude-haiku-4-5' },
  google: { name: 'Google Gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-flash-latest' },
  grok: { name: 'xAI Grok', baseURL: 'https://api.x.ai/v1', path: '/responses', model: 'grok-4.7' },
  deepseek: { name: 'DeepSeek', baseURL: 'https://api.deepseek.com', path: '/chat/completions', model: 'deepseek-flash' },
  qwen: { name: 'Alibaba Qwen (Beijing)', label: 'qwen', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', path: '/chat/completions', model: 'qwen-plus' },
  glm: { name: 'Zhipu GLM', label: 'glm', baseURL: 'https://open.bigmodel.cn/api/paas/v4', path: '/chat/completions', model: 'glm-5.3' },
  kimi: { name: 'Moonshot Kimi', label: 'kimi', baseURL: 'https://api.moonshot.cn/v1', path: '/chat/completions', model: 'kimi-k3.1-pro' },
  doubao: { name: 'Doubao (Volcengine Beijing)', label: 'doubao', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', path: '/chat/completions', model: 'doubao-seed-2-1-lite-260915' }
};

export const streamingProviders = new Set(['openai', 'deepseek', 'qwen', 'glm', 'kimi', 'doubao']);
const replyTokenLimit = 320;

// The base includes the version or relay prefix. Operation paths are appended to it.
export function apiBase(provider, base_url = '') {
  const value = base_url.trim() || providers[provider].baseURL;
  if (!/^https?:\/\/[^/]/i.test(value) || /[\s\\?#]/.test(value)) throw new Error('Invalid HTTP(S) base URL');
  const url = new URL(value);
  if (url.username || url.password || url.hostname.includes('*')) throw new Error('Invalid API host');
  return url.href.replace(/\/+$/, '');
}

export function apiPermission(base) {
  return { origins: [new URL(base).origin + '/*'] };
}

export function authHeaders({ provider, key, workspace }) {
  if (provider === 'google') return { 'x-goog-api-key': key };
  const headers = { Authorization: 'Bearer ' + key };
  if (provider === 'anthropic') {
    headers['anthropic-version'] = '2026-10-21';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
    if (workspace) headers['anthropic-workspace-id'] = workspace;
  }
  return headers;
}

export function makeRequest(config, post, comments = [], photos = [], postLanguage, options = {}) {
  const system = replyInstructions(referenceLanguage(config), config.styles, postLanguage, config.customStyles);
  const user = JSON.stringify(comments.length ? { post, comments } : { post });
  return jsonRequest(config, system, user, photos, options);
}

export function jsonRequest(config, system, user, photos = [], options = {}) {
  const { provider, model } = config;
  const { path } = providers[provider];
  const base = apiBase(provider, config.base_url);
  const headers = { ...authHeaders(config), 'Content-Type': 'application/json' };
  if (provider === 'google') {
    const modelId = model.replace(/^models\//, '');
    return { url: base + '/models/' + encodeURIComponent(modelId) + ':generateContent', headers,
      body: { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }, ...photos.map(({ uri, mimeType }) => ({ fileData: { fileUri: uri, mimeType } }))] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: replyTokenLimit } } };
  }
  if (provider === 'anthropic') {
    const content = photos.length ? [...photos.map(({ uri }) => ({ type: 'image', source: { type: 'url', url: uri } })), { type: 'text', text: user }] : user;
    return { url: base + path, headers, body: { model, system, max_tokens: replyTokenLimit, messages: [{ role: 'user', content }] } };
  }
  let content = user;
  if (photos.length) {
    content = provider === 'grok'
      ? [{ type: 'input_text', text: user }, ...photos.map(({ uri }) => ({ type: 'input_image', image_url: uri }))]
      : [{ type: 'text', text: user }, ...photos.map(({ uri }) => ({ type: 'image_url', image_url: { url: uri } }))];
  }
  const messages = [{ role: 'system', content: system }, { role: 'user', content }];
  if (provider === 'grok') {
    const body = { model, input: messages, store: false, max_output_tokens: replyTokenLimit };
    if (['grok-4.5', 'grok-4.6', 'grok-4.7'].includes(model)) body.reasoning = { effort: 'low' };
    return { url: base + path, headers, body };
  }
  const body = { model, messages, max_tokens: replyTokenLimit };
  if (provider === 'kimi' && ['kimi-k3.1-pro', 'kimi-k3.1-pro-highspeed'].includes(model)) body.reasoning_effort = 'low';
  if (options.stream && streamingProviders.has(provider)) body.stream = true;
  return { url: base + path, headers, body };
}

export function requestError(error) {
  if (error?.result) return error.result;
  if (error?.name === 'TimeoutError') return { error: 'timeout' };
  if (error?.name === 'AbortError' || error?.name === 'CanceledError') return { error: 'cancelled' };
  return { error: 'network' };
}

export async function fetchProvider(request, { signal, timeout = 25000 } = {}) {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(new DOMException('The request timed out.', 'TimeoutError')), timeout);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;
  try {
    return await fetch(request.url, {
      method: 'POST', headers: request.headers, body: JSON.stringify(request.body), credentials: 'omit', redirect: 'error',
      cache: 'no-store', referrerPolicy: 'no-referrer', signal: requestSignal
    });
  } catch (error) {
    const result = requestError(error);
    const wrapped = new Error(result.error);
    wrapped.name = error?.name || result.error;
    wrapped.result = result;
    throw wrapped;
  } finally {
    clearTimeout(timer);
  }
}

export async function readProviderError(provider, response, sentPhotos = false) {
  const status = response.status;
  const imageErrorStatus = sentPhotos && [400, 415, 422].includes(status);
  const checkWorkspace = provider === 'anthropic' && [400, 404].includes(status);
  const checkArk = provider === 'doubao' && [403, 404].includes(status);
  const data = imageErrorStatus || checkWorkspace || checkArk ? await response.json().catch(() => null) : null;
  const error = data?.error ?? data;
  const message = typeof error === 'string' ? error : error?.message || '';
  if (checkWorkspace && /anthropic-workspace-id|workspace .+ not found/i.test(message)) return { error: 'workspace', status };
  if (imageErrorStatus && (status === 415 || /image|vision|multimodal|file[_ ]?(?:data|uri)|only supports text|图片|图像|多模态/i.test([message, error?.param, error?.code].join(' ')))) {
    return { error: 'photoRequest', status };
  }
  if (checkArk) {
    // The provider message can echo request data. Return only known error categories.
    switch (data?.error?.code) {
      case 'ModelNotOpen':
      case 'OperationDenied.ServiceNotOpen':
        return { error: 'arkActivation', status };
      case 'InvalidEndpointOrModel.ModelIDAccessDisabled':
        return { error: 'arkEndpoint', status };
      case 'InvalidEndpointOrModel.NotFound':
        return { error: 'arkAccess', status };
    }
  }
  if (status === 401 || status === 403) return { error: 'key', status };
  if (status === 429 || status === 402) return { error: 'quota', status };
  if (status === 404) return { error: 'notFound', status };
  return { error: 'provider', status };
}

function responseText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(responseText).join('');
  if (value && typeof value === 'object') return responseText(value.text ?? value.value);
  return '';
}

export async function readProviderStreamText(provider, response, onText, { signal, firstTokenTimeout = 10000, totalTimeout = 25000 } = {}) {
  if (!response.body) throw new Error('stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let receivedText = false;
  let firstTimer;
  let totalTimer;
  const abortPromise = signal && new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason || new DOMException('The request was aborted.', 'AbortError'));
    else signal.addEventListener('abort', () => reject(signal.reason || new DOMException('The request was aborted.', 'AbortError')), { once: true });
  });
  const firstTokenPromise = new Promise((_, reject) => {
    firstTimer = setTimeout(() => {
      reader.cancel().catch(() => {});
      reject(Object.assign(new Error('First token timeout'), { name: 'TimeoutError' }));
    }, firstTokenTimeout);
  });
  const totalPromise = new Promise((_, reject) => {
    totalTimer = setTimeout(() => {
      reader.cancel().catch(() => {});
      reject(Object.assign(new Error('Total request timeout'), { name: 'TimeoutError' }));
    }, totalTimeout);
  });
  async function line(value) {
    const source = value.trim();
    if (!source.startsWith('data:')) return;
    const payload = source.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    let data;
    try { data = JSON.parse(payload); } catch { return; }
    if (data.error) {
      const error = Object.assign(new Error(data.error.message || 'Provider stream error'), {
        result: { error: 'provider', status: Number(data.error.code || data.error.status) || undefined }
      });
      throw error;
    }
    const fragment = responseText(data.choices?.[0]?.delta?.content ?? data.choices?.[0]?.text);
    if (!fragment) return;
    receivedText = true;
    clearTimeout(firstTimer);
    text += fragment;
    await onText?.(text);
  }
  try {
    for (;;) {
      const read = reader.read();
      const result = await Promise.race([read, abortPromise, totalPromise, !receivedText && firstTokenPromise].filter(Boolean));
      const { done, value } = result;
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const item of lines) await line(item);
      if (done) break;
    }
    if (buffer) await line(buffer);
    return text;
  } finally {
    clearTimeout(firstTimer);
    clearTimeout(totalTimer);
  }
}

function parseJSONText(value) {
  if (value && typeof value === 'object') return value;
  const source = String(value ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(source); } catch { /* Providers sometimes add a short preamble around valid JSON. */ }

  for (let start = 0; start < source.length; start++) {
    if (source[start] !== '{' && source[start] !== '[') continue;
    const stack = [];
    let quoted = false;
    let escaped = false;
    for (let index = start; index < source.length; index++) {
      const character = source[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') quoted = false;
        continue;
      }
      if (character === '"') { quoted = true; continue; }
      if (character === '{' || character === '[') stack.push(character);
      else if (character === '}' || character === ']') {
        const opening = stack.pop();
        if ((character === '}' && opening !== '{') || (character === ']' && opening !== '[')) break;
        if (!stack.length) {
          try { return JSON.parse(source.slice(start, index + 1)); } catch { break; }
        }
      }
    }
  }
  throw new Error('format');
}

export function readProviderJSON(provider, data) {
  let text;
  if (provider === 'anthropic') text = responseText(data.content?.filter(p => p.type === 'text'));
  else if (provider === 'google') text = responseText(data.candidates?.[0]?.content?.parts?.filter(p => !p.thought));
  else if (provider === 'grok') {
    text = data.output_text ?? data.output?.filter(item => item.type === 'message' && item.role === 'assistant')
      .flatMap(item => item.content).filter(part => part.type === 'output_text');
  }
  else text = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text;
  return parseJSONText(text && typeof text === 'object' && !Array.isArray(text) ? text : responseText(text));
}


export function readReplies(provider, data, native = null, styles, custom) {
  return parseDrafts(readProviderJSON(provider, data), native, styles, custom);
}
