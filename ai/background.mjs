import { mediaKinds, requestMedia } from './media.mjs';
import { composerLabels } from './styles.mjs';
import { referenceLanguage } from './drafts.mjs';
import { generateDrafts } from './generation.mjs';
export { generateDrafts } from './generation.mjs';
import { postPhotos } from './photos.mjs';
import { configuration } from './config.mjs';
import { providers, apiBase, apiPermission } from './providers.mjs';

const activeRequests = new Map();

function requestKey(tabId, requestId) {
  return `${tabId}:${requestId}`;
}

function cancelTabRequests(tabId, reason) {
  for (const [key, controller] of activeRequests) {
    if (key.startsWith(`${tabId}:`)) {
      controller.abort(new DOMException(reason, 'AbortError'));
      activeRequests.delete(key);
    }
  }
}

async function generate({ post, comments = [], images = [], uiLanguage, postLanguage }, onReply, onStatus, signal) {
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
  const progress = typeof onReply === 'function'
    ? (reply, partial = false) => onReply({ reply, partial, labels: composerLabels(referenceLanguage(config) || uiLanguage, config.customStyles),
      labelLanguage: referenceLanguage(config), mediaKinds: mediaKinds(config) })
    : undefined;
  const result = await generateDrafts(config, post, comments, photos, postLanguage, {
    onReply: progress,
    onStatus,
    signal
  });
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
  if (message?.type === 'xc-ai-style-selected') {
    if (typeof message.style === 'string') configuration('selectStyle', { style: message.style }).catch(() => {});
    return;
  }
  if (message?.type === 'xc-ai-media') {
    configuration('read').then(config => requestMedia(config, message)).then(respond, () => respond({ error: 'mediaFailed' }));
    return true;
  }
  if (message?.type === 'xc-ai-cancel') {
    const controller = activeRequests.get(requestKey(sender.tab.id, message.requestId));
    controller?.abort(new DOMException('The request was cancelled.', 'AbortError'));
    respond({ error: 'cancelled' });
    return true;
  }
  if (message?.type !== 'xc-ai-generate') return;
  const key = requestKey(sender.tab.id, message.requestId);
  activeRequests.get(key)?.abort(new DOMException('The request was replaced.', 'AbortError'));
  const controller = new AbortController();
  activeRequests.set(key, controller);
  const sendProgress = message.requestId && sender.tab.id
    ? update => chrome.tabs.sendMessage(sender.tab.id, { type: 'xc-ai-progress', requestId: message.requestId, ...update }).catch(() => {})
    : undefined;
  const onStatus = sendProgress && (status => sendProgress({ status }));
  onStatus?.('preparing');
  generate(message, sendProgress, onStatus, controller.signal).then(respond, () => respond({ error: 'network' }))
    .finally(() => activeRequests.delete(key));
  return true;
});

chrome.tabs?.onRemoved?.addListener(tabId => {
  cancelTabRequests(tabId, 'The tab was closed.');
});

chrome.tabs?.onUpdated?.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') cancelTabRequests(tabId, 'The page was changed.');
});
