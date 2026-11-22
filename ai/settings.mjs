import { mediaKinds, videoOrigins } from './media.mjs';
import { nativeLanguages } from './drafts.mjs';
import { replyStudio } from './reply-studio.mjs';
import { setLabel, translated } from '../ui-language.mjs';
import { applyPalette, themeKeys } from '../ui-theme.mjs';
import { configuration } from './config.mjs';
import { supportsPostPhotos } from './vision.mjs';
import { providers, apiBase, apiPermission } from './providers.mjs';
import { catalogues, fetchModels } from './models.mjs';
import { composerLabels } from './styles.mjs';

function refreshTheme() {
  chrome.storage.local.get(themeKeys, values =>
    applyPalette(values.xc_theme || 'cyber', values.xc_theme_primary, values.xc_theme_accent));
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && themeKeys.some(key => key in changes)) refreshTheme();
});
refreshTheme();

const form = document.querySelector('form');
const { provider, model, photoModel, key, workspace, base_url } = form.elements;
const status = document.querySelector('#status');
const manual = form.elements.manualModel;
const refresh = document.querySelector('#refreshModels');
const catalogueStatus = document.querySelector('#catalogueStatus');
let pending;
const profiles = new Map();
let saved; // Profile selected in the form.
const { bilingual, nativeLanguage, includePhotos, adaptiveStyles: adaptiveSwitch } = form.elements;
for (const [id, label] of Object.entries(nativeLanguages)) nativeLanguage.add(new Option(label, id));
bilingual.onchange = () => { nativeLanguage.disabled = !bilingual.checked; };
function modelConfig() {
  return { provider: provider.value, model: model.value || manual.value.trim(), key: effectiveKey(),
    base_url: base_url.value.trim(), workspace: workspace.value.trim(),
    bilingual: bilingual.checked, nativeLanguage: nativeLanguage.value, adaptiveStyles: adaptiveSwitch.checked };
}
const studio = replyStudio(form, modelConfig);
function restoreReplyOptions(active) {
  studio.restore(active);
  includePhotos.checked = active?.includePhotos !== false;
  bilingual.checked = active?.bilingual === true;
  adaptiveSwitch.checked = active?.adaptiveStyles === true;
  nativeLanguage.value = active?.nativeLanguage || document.documentElement.lang;
  bilingual.onchange();
}
for (const [id, entry] of Object.entries(providers)) {
  const option = new Option(entry.name, id);
  if (entry.label) setLabel(option, entry.label);
  provider.add(option);
}
const imageHint = document.querySelector('#imageHint');
function updateImageHint() {
  const selection = { provider: provider.value, model: model.value || manual.value.trim() };
  const hint = selection.provider === 'doubao' ? 'arkImageHint' :
    mediaKinds(selection).includes('image') ? 'solImageHint' : '';
  imageHint.hidden = !hint;
  setLabel(imageHint, hint);
}
function toggleManual() {
  const custom = model.value === '';
  document.querySelector('#manualField').hidden = !custom;
  manual.required = custom;
  updateImageHint();
}
function choices(ids, selected, keepSelected = false, photoSelection = photoModel.value) {
  const options = keepSelected && selected && !ids.includes(selected) ? [selected, ...ids] : ids;
  const inherit = new Option('', '');
  setLabel(inherit, 'useDefaultModel');
  const visionIds = [...new Set([...options, photoSelection])].filter(id => supportsPostPhotos(provider.value, id));
  photoModel.replaceChildren(inherit, ...visionIds.map(id => new Option(id, id)));
  photoModel.value = visionIds.includes(photoSelection) ? photoSelection : '';
  photoModel.disabled = !includePhotos.checked;
  model.replaceChildren(...options.map(id => new Option(id, id)));
  const other = new Option('', '');
  setLabel(other, 'manualModel');
  model.add(other);
  model.value = !selected || options.includes(selected) ? selected : options[0] || '';
  toggleManual();
}
function canReuseKey() {
  if (saved?.provider !== provider.value) return false;
  try { return apiBase(provider.value, base_url.value) === apiBase(saved.provider, saved.base_url); }
  catch { return false; }
}
function updateKeyField() {
  key.required = !canReuseKey();
  setLabel(key, key.required ? '' : 'saved', 'placeholder');
}
function effectiveKey() {
  return key.value.trim() || (canReuseKey() ? saved.key : '');
}
async function loadModels(requestPermission = false) {
  const id = provider.value;
  const credential = effectiveKey();
  if (!credential || !catalogues[id].path) return;
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const override = base_url.value.trim();
  let permission;
  try { permission = apiPermission(apiBase(id, override)); }
  catch { setLabel(catalogueStatus, 'invalidBase'); return; }
  try {
    const allowed = requestPermission ? await chrome.permissions.request(permission) : await chrome.permissions.contains(permission);
    if (controller.signal.aborted) return;
    if (!allowed) {
      if (requestPermission) setLabel(catalogueStatus, 'permission');
      return;
    }
    refresh.disabled = true;
    setLabel(catalogueStatus, 'loadingModels');
    const ids = await fetchModels(id, credential, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]), workspace.value.trim(), override);
    if (controller.signal.aborted) return;
    if (!ids.length) throw new Error('empty');
    const previous = model.value;
    choices(ids, previous, saved?.provider === id && previous === saved.model);
    setLabel(catalogueStatus, id === 'doubao' ? 'arkCatalogue' : 'providerModels');
  } catch {
    if (!controller.signal.aborted) setLabel(catalogueStatus, 'modelsUnavailable');
  } finally {
    if (pending === controller) refresh.disabled = !effectiveKey();
  }
}
function showProvider() {
  pending?.abort();
  saved = profiles.get(provider.value);
  const entry = providers[provider.value];
  const list = catalogues[provider.value];
  const ids = [entry.model, ...list.extra];
  // Older configurations store only the ID. It can be a catalogue model or a private endpoint.
  manual.value = saved && !ids.includes(saved.model) ? saved.model : '';
  choices(ids, saved ? saved.model : entry.model, !!saved, saved ? saved.photoModel || '' : '');
  document.querySelector('#arkMedia').hidden = provider.value !== 'doubao';
  for (const field of ['imageModel', 'gifModel']) form.elements[field].value = saved ? saved[field] || '' : '';
  key.value = '';
  workspace.value = saved && provider.value === 'anthropic' ? saved.workspace || '' : '';
  document.querySelector('#workspaceField').hidden = provider.value !== 'anthropic';
  base_url.value = saved ? saved.base_url || '' : '';
  base_url.placeholder = entry.baseURL;
  updateKeyField();
  document.querySelector('#arkHelp').hidden = provider.value !== 'doubao';
  refresh.hidden = !list.path;
  refresh.disabled = !effectiveKey();
  setLabel(catalogueStatus, 'presetModels');
  if (saved) loadModels();
}
refresh.onclick = () => loadModels(true);
model.onchange = toggleManual;
manual.oninput = updateImageHint;
includePhotos.onchange = () => { photoModel.disabled = !includePhotos.checked; };
base_url.oninput = key.oninput = workspace.oninput = () => {
  updateKeyField();
  pending?.abort();
  refresh.disabled = !effectiveKey();
  const selected = model.value;
  const ids = [providers[provider.value].model, ...catalogues[provider.value].extra];
  choices(ids, selected, true);
  setLabel(catalogueStatus, 'presetModels');
};
// Only auto-refresh credentials for an already saved destination.
key.onchange = workspace.onchange = () => { if (canReuseKey()) loadModels(); };
try {
  const state = await configuration('profiles');
  for (const profile of state.profiles) profiles.set(profile.provider, profile);
  if (state.active) provider.value = state.active.provider;
  restoreReplyOptions(state.active);
} catch { restoreReplyOptions(); setLabel(status, 'readError'); }
showProvider();
provider.onchange = () => { setLabel(status, ''); showProvider(); };
function savedSummary(config) {
  const labels = composerLabels(document.documentElement.lang, config.customStyles);
  const styles = config.styles.map(id => labels[id] || id).join(' / ');
  const providerName = translated(config.provider) || providers[config.provider]?.name || config.provider;
  const native = config.bilingual ? nativeLanguage.selectedOptions[0]?.textContent || config.nativeLanguage : translated('disabled');
  const adaptive = translated(config.adaptiveStyles ? 'enabled' : 'disabled');
  return translated('savedDetails')
    .replace('{provider}', providerName)
    .replace('{model}', config.model)
    .replace('{styles}', styles)
    .replace('{native}', native)
    .replace('{adaptive}', adaptive);
}
form.onsubmit = async event => {
  event.preventDefault();
  const id = provider.value;
  const preferences = studio.preferences();
  if (!preferences) return;
  const next = { ...preferences, ...modelConfig(), includePhotos: includePhotos.checked };
  if (id === 'doubao') {
    for (const field of ['imageModel', 'gifModel']) {
      const value = form.elements[field].value.trim();
      if (value) next[field] = value;
    }
  }
  if (photoModel.value) next.photoModel = photoModel.value;
  if (id !== 'anthropic' || !next.workspace) delete next.workspace;
  let base;
  try { base = apiBase(id, base_url.value); }
  catch { setLabel(status, 'invalidBase'); base_url.focus(); return; }
  if (next.base_url) next.base_url = base;
  else delete next.base_url;
  if (!next.model || !next.key) {
    setLabel(status, 'missing');
    return;
  }
  try {
    const permission = apiPermission(base);
    if (next.gifModel) permission.origins.push(...videoOrigins.map(origin => origin + '/*'));
    const allowed = await chrome.permissions.request(permission);
    if (!allowed) { setLabel(status, 'permission'); return; }
    await configuration('write', next);
    profiles.set(id, next);
    if (provider.value !== id) return;
    saved = next;
    if (!canReuseKey()) { updateKeyField(); return; }
    if (!Array.from(model.options).some(option => option.value === next.model)) {
      model.add(new Option(next.model, next.model), model.options[0]);
    }
    model.value = next.model;
    toggleManual();
    key.value = '';
    key.required = false;
    setLabel(key, 'saved', 'placeholder');
    if (catalogueStatus.dataset.i18n === 'presetModels') loadModels();
    status.removeAttribute('data-i18n');
    status.textContent = savedSummary(next);
  } catch { setLabel(status, 'saveError'); }
};
document.querySelector('#clear').onclick = async () => {
  try {
    await configuration('delete');
    profiles.clear();
    restoreReplyOptions();
    showProvider();
    setLabel(status, 'cleared');
  } catch { setLabel(status, 'clearError'); }
};
