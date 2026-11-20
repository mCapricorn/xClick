import { mediaKinds, requestMedia } from './media.mjs';
import { supportsPostPhotos } from './vision.mjs';
import { composerLabels } from './styles.mjs';
import { referenceLanguage } from './drafts.mjs';
import { postPhotos } from './photos.mjs';
import { configuration } from './config.mjs';
import { providers, apiBase, apiPermission, makeRequest, readReplies, readProviderError } from './providers.mjs';

async function generate({ post, comments = [], images = [], uiLanguage, postLanguage }) {
  if (typeof post !== 'string' || post.length > 6000) return { error: 'context' };
  if (!Array.isArray(comments) || comments.length > 5 ||
      comments.some(text => typeof text !== 'string' || !text.trim() || text.length > 300)) return { error: 'context' };
  let photos;
  try { photos = postPhotos(images); } catch { return { error: 'context' }; }
  if (!post.trim() && !photos.length) return { error: 'context' };
  const config = await configuration('read');
  if (!config || !Object.hasOwn(providers, config.provider)) return { error: 'setup' };
  let permission;
  try { permission = apiPermission(apiBase(config.provider, config.base_url)); } catch { return { error: 'setup' }; }
  if (!await chrome.permissions.contains(permission)) return { error: 'setup' };
  const result = await generateDrafts(config, post, comments, photos, postLanguage);
  if (result.replies) {
    result.labels = composerLabels(result.labelLanguage || uiLanguage);
    result.mediaKinds = mediaKinds(config);
  }
  return result;
}

export async function generateDrafts(config, post, comments, photos, postLanguage) {
  const wantsPhotos = config.includePhotos !== false && photos.length > 0;
  const model = wantsPhotos && supportsPostPhotos(config.provider, config.photoModel) ? config.photoModel : config.model;
  let attachments = wantsPhotos && supportsPostPhotos(config.provider, model) ? photos : [];
  if (!post.trim() && !attachments.length) {
    return { error: config.includePhotos === false ? 'photosDisabled' : 'visionUnknown' };
  }

  async function send() {
    const { url, headers, body } = makeRequest({ ...config, model }, post, comments, attachments, postLanguage);
    return fetch(url, {
      method: 'POST', headers, body: JSON.stringify(body), credentials: 'omit', redirect: 'error',
      cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(25000)
    });
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
    const replies = readReplies(config.provider, await response.json(), native, config.styles);
    return { replies, photoCount: attachments.length, labelLanguage: native };
  } catch { return { error: 'format' }; }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.tab || !/^https:\/\/(x\.com|twitter\.com)\//.test(sender.url)) return;
  if (message?.type === 'xc-ai-settings') {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (message?.type === 'xc-ai-media') {
    configuration('read').then(config => requestMedia(config, message)).then(respond, () => respond({ error: 'mediaFailed' }));
    return true;
  }
  if (message?.type !== 'xc-ai-generate') return;
  generate(message).then(respond, () => respond({ error: 'network' }));
  return true;
});
