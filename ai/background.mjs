import { mediaKinds, requestMedia } from './media.mjs';
import { composerLabels } from './styles.mjs';
import { generateDrafts } from './generation.mjs';
export { generateDrafts } from './generation.mjs';
import { postPhotos } from './photos.mjs';
import { configuration } from './config.mjs';
import { providers, apiBase, apiPermission } from './providers.mjs';

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
    result.labels = composerLabels(result.labelLanguage || uiLanguage, config.customStyles);
    result.mediaKinds = mediaKinds(config);
  }
  return result;
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
