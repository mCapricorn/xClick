import { supportsPostPhotos } from './vision.mjs';
import { referenceLanguage, nativeLanguages } from './drafts.mjs';
import { adaptiveStyles, styleLimits } from './styles.mjs';
import { makeRequest, jsonRequest, readProviderJSON, readReplies, readProviderError, readProviderStreamText, streamingProviders, fetchProvider, requestError } from './providers.mjs';

function sendRequest(request, options) {
  return fetchProvider(request, options);
}

export async function generateSample(config, language) {
  const request = jsonRequest(config, 'Invent a short original social post about an everyday moment with a concrete detail. Return only a JSON object with a single string field named post.',
    `Write in ${nativeLanguages[language] || 'English'}. Vary the topic. Use one or two sentences.`);
  const response = await sendRequest(request);
  if (!response.ok) return readProviderError(config.provider, response);
  try {
    const { post } = readProviderJSON(config.provider, await response.json());
    if (typeof post === 'string' && post.trim() && post.trim().length <= styleLimits.sample) return { post: post.trim() };
  } catch { /* Invalid provider JSON uses the same format error as drafts. */ }
  return { error: 'format' };
}

function partialReply(value, style) {
  const key = String(style).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fields = new RegExp('"' + key + '"\\s*:\\s*\\{[\\s\\S]*?"(?:text|reply|content)"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)(?:"|$)');
  let match;
  while ((match = fields.exec(value))) {
    const valueText = match[1].replace(/\\u[0-9a-fA-F]{0,3}$/, '').replace(/\\$/, '');
    let text;
    try { text = JSON.parse('"' + valueText + '"').trim(); }
    catch { text = valueText.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim(); }
    if (!text) continue;
    const referenceMatch = value.match(/"(?:reference|translation|native)"\s*:\s*"((?:\\.|[^"\\])*)"/);
    let reference;
    try { reference = referenceMatch ? JSON.parse('"' + referenceMatch[1] + '"').trim() : undefined; }
    catch { reference = undefined; }
    return { tone: style, text, ...(reference ? { reference } : {}) };
  }
  return null;
}

async function generateBatch(config, post, comments, photos, postLanguage, styles, onPartial, options = {}) {
  const wantsPhotos = config.includePhotos !== false && photos.length > 0;
  const model = wantsPhotos && supportsPostPhotos(config.provider, config.photoModel) ? config.photoModel : config.model;
  let attachments = wantsPhotos && supportsPostPhotos(config.provider, model) ? photos : [];
  if (!post.trim() && !attachments.length) {
    return { error: config.includePhotos === false ? 'photosDisabled' : 'visionUnknown' };
  }

  const streaming = typeof onPartial === 'function' && streamingProviders.has(config.provider);
  async function send(stream = false) {
    return sendRequest(makeRequest({ ...config, model, ...(styles ? { styles } : {}) }, post, comments, attachments, postLanguage,
      stream ? { stream: true } : {}), options);
  }

  options.onStatus?.('generating');
  let response;
  try { response = await send(streaming); }
  catch (error) {
    const failure = requestError(error);
    if (!streaming || failure.error === 'cancelled') return failure;
    try { response = await send(false); }
    catch (fallbackError) { return requestError(fallbackError); }
  }
  if (!response.ok) {
    const failure = await readProviderError(config.provider, response, attachments.length > 0);
    if (failure.error !== 'photoRequest') {
      const streamUnsupported = streaming && [400, 404, 405, 415, 422, 501].includes(response.status);
      if (!streamUnsupported) return failure;
      try { response = await send(false); }
      catch (fallbackError) { return requestError(fallbackError); }
      if (!response.ok) return readProviderError(config.provider, response);
    }
    if (failure.error === 'photoRequest') {
      if (!post.trim()) return failure;
      attachments = [];
      try { response = await send(streaming); }
      catch (error) { return requestError(error); }
      if (!response.ok) return readProviderError(config.provider, response);
    }
  }
  const native = referenceLanguage(config);
  if (streaming && /text\/event-stream/i.test(response.headers.get('content-type') || '')) {
    try {
      const text = await readProviderStreamText(config.provider, response, async value => {
        for (const style of styles) {
          const draft = partialReply(value, style);
          if (draft && draft.text.length >= 2) await onPartial(draft);
        }
      }, options);
      options.onStatus?.('validating');
      const replies = readReplies(config.provider, { choices: [{ message: { content: text } }] }, native, styles, config.customStyles);
      options.onStatus?.('done');
      return { replies, photoCount: attachments.length, labelLanguage: native };
    } catch (error) {
      const failure = requestError(error);
      if (failure.error === 'cancelled') return failure;
      try { response = await send(false); }
      catch (fallbackError) { return requestError(fallbackError); }
      if (!response.ok) return readProviderError(config.provider, response);
    }
  }
  try {
    options.onStatus?.('validating');
    const replies = readReplies(config.provider, await response.json(), native, styles || config.styles, config.customStyles);
    options.onStatus?.('done');
    return { replies, photoCount: attachments.length, labelLanguage: native };
  } catch { return { error: 'format' }; }
}

async function generateProgressively(config, post, comments, photos, postLanguage, onReply, options) {
  const styles = adaptiveStyles(config.styles, config.customStyles, config.adaptiveStyles, config.stylePreferences);
  options.onStatus?.('analyzing');
  const partialTones = new Set();
  const result = await generateBatch(config, post, comments, photos, postLanguage, styles,
    async reply => { partialTones.add(reply.tone); await onReply(reply, true); }, options);
  const completeTones = new Set(result.replies?.map(reply => reply.tone) || []);
  for (const tone of partialTones) {
    if (!completeTones.has(tone)) await onReply({ tone, remove: true }, false);
  }
  if (!result.replies?.length) return result;
  for (const reply of result.replies) await onReply(reply, false);
  return result;
}

export async function generateDrafts(config, post, comments, photos, postLanguage, options = {}) {
  if (typeof options.onReply === 'function') {
    return generateProgressively(config, post, comments, photos, postLanguage, options.onReply, options);
  }
  return generateBatch(config, post, comments, photos, postLanguage, config.styles, undefined, options);
}
