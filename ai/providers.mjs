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

export function makeRequest(config, post, comments = [], photos = [], postLanguage) {
  const system = replyInstructions(referenceLanguage(config), config.styles, postLanguage, config.customStyles);
  const user = JSON.stringify(comments.length ? { post, comments } : { post });
  return jsonRequest(config, system, user, photos);
}

export function jsonRequest(config, system, user, photos = []) {
  const { provider, model } = config;
  const { path } = providers[provider];
  const base = apiBase(provider, config.base_url);
  const headers = { ...authHeaders(config), 'Content-Type': 'application/json' };
  if (provider === 'google') {
    const modelId = model.replace(/^models\//, '');
    return { url: base + '/models/' + encodeURIComponent(modelId) + ':generateContent', headers,
      body: { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }, ...photos.map(({ uri, mimeType }) => ({ fileData: { fileUri: uri, mimeType } }))] }],
        generationConfig: { responseMimeType: 'application/json' } } };
  }
  if (provider === 'anthropic') {
    const content = photos.length ? [...photos.map(({ uri }) => ({ type: 'image', source: { type: 'url', url: uri } })), { type: 'text', text: user }] : user;
    return { url: base + path, headers, body: { model, system, max_tokens: 2400, messages: [{ role: 'user', content }] } };
  }
  let content = user;
  if (photos.length) {
    content = provider === 'grok'
      ? [{ type: 'input_text', text: user }, ...photos.map(({ uri }) => ({ type: 'input_image', image_url: uri }))]
      : [{ type: 'text', text: user }, ...photos.map(({ uri }) => ({ type: 'image_url', image_url: { url: uri } }))];
  }
  const messages = [{ role: 'system', content: system }, { role: 'user', content }];
  if (provider === 'grok') {
    const body = { model, input: messages, store: false };
    if (['grok-4.5', 'grok-4.6', 'grok-4.7'].includes(model)) body.reasoning = { effort: 'low' };
    return { url: base + path, headers, body };
  }
  const body = { model, messages };
  if (provider === 'kimi' && ['kimi-k3.1-pro', 'kimi-k3.1-pro-highspeed'].includes(model)) body.reasoning_effort = 'low';
  return { url: base + path, headers, body };
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

export function readProviderJSON(provider, data) {
  let text;
  if (provider === 'anthropic') text = data.content?.filter(p => p.type === 'text').map(p => p.text).join('');
  else if (provider === 'google') text = data.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text).join('');
  else if (provider === 'grok') {
    text = data.output?.filter(item => item.type === 'message' && item.role === 'assistant')
      .flatMap(item => item.content).filter(part => part.type === 'output_text').map(part => part.text).join('');
  }
  else text = data.choices?.[0]?.message?.content;
  return JSON.parse(String(text ?? '').trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
}

export function readReplies(provider, data, native = null, styles, custom) {
  return parseDrafts(readProviderJSON(provider, data), native, styles, custom);
}
