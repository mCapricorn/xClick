import { supportsPostPhotos } from './vision.mjs';
import { referenceLanguage, nativeLanguages } from './drafts.mjs';
import { styleLimits } from './styles.mjs';
import { makeRequest, jsonRequest, readProviderJSON, readReplies, readProviderError } from './providers.mjs';

function sendRequest({ url, headers, body }) {
  return fetch(url, {
    method: 'POST', headers, body: JSON.stringify(body), credentials: 'omit', redirect: 'error',
    cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(25000)
  });
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

export async function generateDrafts(config, post, comments, photos, postLanguage) {
  const wantsPhotos = config.includePhotos !== false && photos.length > 0;
  const model = wantsPhotos && supportsPostPhotos(config.provider, config.photoModel) ? config.photoModel : config.model;
  let attachments = wantsPhotos && supportsPostPhotos(config.provider, model) ? photos : [];
  if (!post.trim() && !attachments.length) {
    return { error: config.includePhotos === false ? 'photosDisabled' : 'visionUnknown' };
  }

  async function send() {
    return sendRequest(makeRequest({ ...config, model }, post, comments, attachments, postLanguage));
  }

  let response = await send();
  if (!response.ok) {
    const failure = await readProviderError(config.provider, response, attachments.length > 0);
    if (failure.error !== 'photoRequest') return failure;
    if (!post.trim()) return failure;
    attachments = [];
    response = await send();
    if (!response.ok) return readProviderError(config.provider, response);
  }
  const native = referenceLanguage(config);
  try {
    const replies = readReplies(config.provider, await response.json(), native, config.styles, config.customStyles);
    return { replies, photoCount: attachments.length, labelLanguage: native };
  } catch { return { error: 'format' }; }
}
