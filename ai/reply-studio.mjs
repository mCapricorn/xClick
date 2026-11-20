import { customDefinitions, selectedStyles, styleIds, styleLimits } from './styles.mjs';
import { generateDrafts, generateSample } from './generation.mjs';
import { apiBase, apiPermission } from './providers.mjs';
import { setLabel, translated } from '../ui-language.mjs';

export function replyStudio(form, modelConfig) {
  const { samplePost, previewStyle } = form.elements;
  const byId = id => document.getElementById(id);
  const choices = byId('styleChoices');
  const editors = byId('customEditors');
  const add = byId('addStyle');
  const random = byId('randomPost');
  const test = byId('testStyle');
  const status = byId('previewStatus');
  const results = byId('previewResults');
  const rows = new Map();
  const checks = new Map();
  let revision = 0;
  let busy = false;
  samplePost.maxLength = styleLimits.sample;

  function invalidate() {
    revision++;
    results.replaceChildren();
    setLabel(status, '');
  }
  form.addEventListener('input', event => {
    if (event.target !== previewStyle && !choices.contains(event.target)) invalidate();
  });

  function addChoice(id, name) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = id;
    const caption = document.createElement('span');
    const option = new Option('', id);
    if (styleIds.includes(id)) {
      setLabel(caption, id);
      setLabel(option, id);
    } else option.textContent = caption.textContent = name || translated('customStyle');
    const label = document.createElement('label');
    label.className = 'switch';
    label.append(input, caption);
    choices.append(label);
    previewStyle.add(option);
    checks.set(id, input);
    return { input, label, caption, option };
  }
  for (const id of styleIds) addChoice(id);

  function field(tag, key, value, max) {
    const label = document.createElement('label');
    const caption = document.createElement('span');
    setLabel(caption, key);
    const input = document.createElement(tag);
    input.value = value;
    input.maxLength = max;
    input.required = true;
    label.append(caption, input);
    return { label, input };
  }
  function addCustom({ id, name, prompt }) {
    const choice = addChoice(id, name);
    const editor = document.createElement('div');
    editor.className = 'custom-editor';
    const title = field('input', 'styleName', name, styleLimits.name);
    const instruction = field('textarea', 'stylePrompt', prompt, styleLimits.prompt);
    const remove = document.createElement('button');
    remove.type = 'button';
    setLabel(remove, 'removeStyle');
    title.input.oninput = () => {
      choice.caption.textContent = choice.option.textContent = title.input.value.trim() || translated('customStyle');
    };
    remove.onclick = () => {
      choice.label.remove();
      choice.option.remove();
      editor.remove();
      checks.delete(id);
      rows.delete(id);
      add.disabled = false;
      invalidate();
      add.focus();
    };
    editor.append(title.label, instruction.label, remove);
    editors.append(editor);
    rows.set(id, { name: title.input, prompt: instruction.input });
    add.disabled = rows.size >= styleLimits.count;
    return title.input;
  }
  add.onclick = () => {
    const id = `custom-${crypto.randomUUID()}`;
    const title = addCustom({ id, name: '', prompt: '' });
    checks.get(id).checked = true;
    previewStyle.value = id;
    title.focus();
  };
  function restore(config) {
    invalidate();
    for (const id of rows.keys()) {
      checks.get(id).parentElement.remove();
      checks.delete(id);
    }
    rows.clear();
    editors.replaceChildren();
    while (previewStyle.length > styleIds.length) previewStyle.remove(styleIds.length);
    add.disabled = false;
    const custom = customDefinitions(config?.customStyles);
    for (const style of custom) addCustom(style);
    const enabled = selectedStyles(config?.styles, custom);
    for (const [id, input] of checks) input.checked = enabled.includes(id);
    previewStyle.value = enabled[0];
    samplePost.value = config?.samplePost || translated('sampleDefault');
  }
  function definitions(ids) {
    const custom = [];
    for (const id of ids) {
      if (!rows.has(id)) continue;
      const { name, prompt } = rows.get(id);
      for (const input of [name, prompt]) {
        if (!input.value.trim()) {
          input.focus();
          setLabel(status, 'needStyle');
          return null;
        }
      }
      custom.push({ id, name: name.value.trim(), prompt: prompt.value.trim() });
    }
    return custom;
  }
  function hasPost() {
    if (samplePost.value.trim()) return true;
    setLabel(status, 'needPost');
    samplePost.focus();
    return false;
  }
  function preferences() {
    const customStyles = definitions(rows.keys());
    if (!customStyles || !hasPost()) return null;
    const styles = [...checks].filter(([, input]) => input.checked).map(([id]) => id);
    if (!styles.length) {
      setLabel(byId('status'), 'chooseStyles');
      checks.get(styleIds[0]).focus();
      return null;
    }
    return { styles, customStyles, samplePost: samplePost.value.trim() };
  }
  function showDraft(id, draft) {
    byId(`preview-${id}`)?.remove();
    const card = document.createElement('div');
    card.id = `preview-${id}`;
    card.className = 'preview-card';
    const title = document.createElement('strong');
    if (rows.has(id)) title.textContent = rows.get(id).name.value.trim();
    else setLabel(title, id);
    card.append(title);
    for (const text of [draft.text, draft.reference].filter(Boolean)) {
      const line = document.createElement('p');
      line.textContent = text;
      card.append(line);
    }
    results.prepend(card);
  }
  async function run(sample) {
    if (busy) return;
    const config = modelConfig();
    if (!config.key || !config.model) { setLabel(status, 'missing'); return; }
    let permission;
    try { permission = apiPermission(apiBase(config.provider, config.base_url)); }
    catch { setLabel(status, 'invalidBase'); return; }
    const id = previewStyle.value;
    if (!sample) {
      config.styles = [id];
      config.customStyles = definitions([id]);
      if (!config.customStyles || !hasPost()) return;
    }
    const post = samplePost.value.trim();
    const start = revision;
    busy = random.disabled = test.disabled = true;
    setLabel(status, 'previewPending');
    try {
      const allowed = await chrome.permissions.request(permission);
      if (start !== revision) return;
      if (!allowed) { setLabel(status, 'permission'); return; }
      const result = sample ? await generateSample(config, document.documentElement.lang) :
        await generateDrafts(config, post, [], []);
      if (start !== revision) return;
      if (result.error) {
        setLabel(status, result.error === 'format' ? 'previewFormat' : 'previewFailed');
        if (result.status) status.append(` (HTTP ${result.status})`);
        return;
      }
      if (sample) {
        invalidate();
        samplePost.value = result.post;
      } else showDraft(id, result.replies[0]);
      setLabel(status, '');
    } catch { if (start === revision) setLabel(status, 'previewFailed'); }
    finally { busy = random.disabled = test.disabled = false; }
  }
  random.onclick = () => run(true);
  test.onclick = () => run(false);
  return { restore, preferences };
}
