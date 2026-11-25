(() => {
  const editorSelector = '[contenteditable="true"][data-testid^="tweetTextarea_"], [data-testid^="tweetTextarea_"] [contenteditable="true"]';
  const postSelector = '[data-testid="tweetText"]';
  const articleSelector = 'article, [data-testid="tweet"]';
  const mounted = new Map();
  const progressListeners = new Map();
  let pendingReply;
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type !== 'xc-ai-progress') return;
    progressListeners.get(message.requestId)?.(message);
  });
  const zh = (document.documentElement.lang || navigator.language).toLowerCase().startsWith('zh');
  const t = (en, cn) => zh ? cn : en;
  const errors = {
    mediaFailed: t('Could not generate or decode the media. Check the request with your provider.', '媒体生成或解码失败，请到当前厂商查看请求状态。'),
    noImage: t('The provider returned no image. Check the generation result with your provider.', '接口没有返回图片，请到当前厂商查看生成结果。'),
    imageEndpoint: t('Check that your API address supports /responses and its image_generation tool for this model.', '请确认当前 API 地址支持 /responses，并为该模型开放了 image_generation 工具。'),
    mediaTimeout: t('Still waiting for the video. Check this task in Ark.', '视频任务等待超时，请到方舟查看任务。'),
    mediaSize: t('This file is too large for the reply preview.', '文件超过回复预览的大小限制。'),
    download: t('Could not download the generated video.', '未能下载生成的视频。'),
    mediaSetup: t('Check the media models in AI settings.', '请核对 AI 设置中的媒体生成模型。'),
    workspace: t('Check your Claude workspace ID in AI settings.', '请在 AI 设置中核对 Claude 工作区 ID。'),
    setup: t('Set up your provider and key in AI settings.', '请在 AI 设置中配置厂商、密钥并授予访问权限。'),
    key: t('Check your API key and model access.', '请检查密钥与模型访问权限。'),
    quota: t('Check provider balance or try again later.', '请检查厂商余额或稍后重试。'),
    provider: t('The provider could not complete the request.', '模型厂商未能完成请求。'),
    notFound: t('The provider could not find the requested resource. Check the model and API access in AI settings.', '厂商未找到请求的资源。请在 AI 设置中核对模型及其接口访问权限。'),
    arkActivation: t('Activate the selected model in the Beijing Ark console, or choose an activated model in AI settings.', '请在火山方舟北京区开通当前模型，或在 AI 设置中选择已开通的模型。'),
    arkEndpoint: t('Ark requires a custom endpoint for this account. Enter its ep-… ID under Model in AI settings.', '方舟要求此账号使用自定义接入点。请在 AI 设置的模型栏手动填写 ep-… 接入点 ID。'),
    arkAccess: t('Ark could not find or grant access to this model or endpoint. Check its ID and key permissions in the Beijing Ark console.', '方舟找不到此模型或接入点，或密钥无权访问。请在北京区控制台核对 ID 和密钥的授权范围。'),
    network: t('Request failed or timed out. Try again.', '请求失败或超时，请重试。'),
    timeout: t('The provider did not respond in time. Try again.', '厂商响应超时，请重试。'),
    cancelled: t('Generation canceled.', '已取消生成。'),
    format: t('The response contained no readable suggestions. Try generating again.', '返回内容中没有可读取的候选回复，请重新生成。'),
    photosDisabled: t('Turn on Send post photos in AI settings and save to use this image-only post.', '这条帖子只有图片，请在 AI 设置中开启发送配图并保存。'),
    visionUnknown: t('xClick does not recognize the saved model ID as a vision model. Check the model in AI settings.', 'xClick 尚未将已保存的型号识别为视觉模型，请核对 AI 设置中的型号。'),
    photoRequest: t('The provider could not process the X photo. Check the image request in your provider console.', '厂商未能处理这条帖子的配图，请在厂商控制台查看本次图片请求。'),
    context: t('No original post text or photos available.', '未找到原帖正文或配图。')
  };
  const translationSelector = '.immersive-translate-target-wrapper, .immersive-translate-target-inner, .immersive-translate-translation-spacing, .immersive-translate-target-wrapper-error';
  const sourceAttr = 'data-immersive-translate-source-text';
  function postText(node) {
    if (!node || node.closest(translationSelector)) return '';
    const stored = node.getAttribute(sourceAttr)?.trim();
    if (stored) return stored.slice(0, 6000);
    if (!node.querySelector(`${translationSelector}, [${sourceAttr}], img[alt]`)) return node.innerText.trim().slice(0, 6000);
    // Read a detached copy so hidden original spans survive translation-only mode.
    const copy = node.cloneNode(true);
    for (const translated of copy.querySelectorAll(translationSelector)) translated.remove();
    for (const original of copy.querySelectorAll(`[${sourceAttr}]`)) {
      const text = original.getAttribute(sourceAttr);
      if (text) original.replaceWith(text);
    }
    for (const br of copy.querySelectorAll('br')) br.replaceWith('\n');
    for (const emoji of copy.querySelectorAll('img[alt]')) emoji.replaceWith(emoji.alt);
    return copy.textContent.trim().slice(0, 6000);
  }
  function postLanguage(node) {
    // X labels the tweet itself. Page and translation UI locales describe the reader.
    const tag = node?.lang?.toLowerCase() || '';
    if (/^en(?:-|$)/.test(tag)) return 'en';
    if (/^zh-(hant|tw|hk|mo)(?:-|$)/.test(tag)) return 'zh-Hant';
    if (/^zh-(hans|cn|sg)(?:-|$)/.test(tag)) return 'zh-Hans';
    return undefined;
  }

  // Some dialogs omit the parent tweet. Associate only the next dialog opened by a reply click.
  document.addEventListener('click', event => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const reply = event.target.closest('[data-testid="reply"]');
    if (!reply) { pendingReply = undefined; return; }
    const article = reply.closest(articleSelector);
    const body = articleBody(article);
    const post = postText(body);
    const column = article?.closest('[data-testid="primaryColumn"], main, [role="main"]');
    const id = detailId();
    const editor = id && findInlineEditor(column);
    // Opening the reply dialog can change the route or hide the underlying thread.
    const comments = editor && inlineArticle(column, editor, id) === article
      ? threadComments(column, editor, article, post) : [];
    pendingReply = { author: authorHandle(article), post, postLanguage: postLanguage(body), images: photosIn(article), comments, expires: Date.now() + 3000 };
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') pendingReply = undefined;
  }, true);

  function photosIn(scope, before) {
    const images = new Set();
    for (const img of scope?.querySelectorAll('[data-testid="tweetPhoto"] img, a[href*="/photo/"] img') || []) {
      if (before && !(img.compareDocumentPosition(before) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (img.closest('[contenteditable="true"], [data-testid="attachments"], aside, [hidden], [aria-hidden="true"]')) continue;
      const src = img.currentSrc || img.src;
      if (/^https:\/\/pbs\.twimg\.com\/media\/[\w-]+(?:[.?]|$)/.test(src)) images.add(src);
      if (images.size === 4) break;
    }
    return [...images];
  }

  function dialogContext(dialog, editor, origin) {
    const texts = [...dialog.querySelectorAll(postSelector)].filter(node =>
      !node.closest(translationSelector) && !node.closest('[contenteditable="true"], [role="link"]') &&
      (node.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING));
    const parent = texts.at(-1);
    const post = postText(parent) || origin?.post || '';
    const images = photosIn(parent?.closest(articleSelector) || dialog, editor);
    const sameOrigin = origin && origin.post === post;
    return { author: authorHandle(parent?.closest(articleSelector)) || (sameOrigin ? origin.author : ''), post, postLanguage: postLanguage(parent) || (sameOrigin ? origin.postLanguage : undefined),
      images: !images.length && sameOrigin ? origin.images : images };
  }

  function detailId() {
    return location.pathname.match(/^\/(?:[^/]+|i\/web)\/status\/(\d+)\/?$/)?.[1];
  }

  function belongsToArticle(node, article) {
    const card = node.closest('[role="link"]');
    return node.closest(articleSelector) === article && !(card && card !== article && article.contains(card));
  }

  function authorHandle(article) {
    const user = [...article?.querySelectorAll('[data-testid="User-Name"]') || []].find(node => belongsToArticle(node, article));
    return user?.innerText.match(/(?:^|\s)(@[A-Za-z0-9_]{1,15})\b/)?.[1] || '';
  }

  function articleBody(article) {
    if (!article) return null;
    return [...article.querySelectorAll(postSelector)].find(node => belongsToArticle(node, article) && !node.closest(translationSelector)) ||
      [...article.querySelectorAll('div[lang]')].find(node => belongsToArticle(node, article) &&
        !node.closest(translationSelector) && !node.closest('[data-testid="User-Name"], [contenteditable="true"]'));
  }

  function inlineArticle(column, editor, id) {
    if (!id || detailId() !== id) return null;
    let nearest;
    for (const article of column.querySelectorAll(articleSelector)) {
      if (!(article.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      // Quoted posts can have their own timestamp and text inside a link card.
      if (article.parentElement.closest(articleSelector)) continue;
      const links = [...article.querySelectorAll('a[href*="/status/"]')].filter(link =>
        belongsToArticle(link, article) && !link.closest(postSelector));
      const ids = links.map(link => link.pathname.match(/\/status\/(\d+)(?:\/|$)/)?.[1]).filter(Boolean);
      if (ids.includes(id)) return article;
      // X can render the expanded post's timestamp as plain text. Only use the
      // adjacent preceding post, and never substitute one linked to another ID.
      nearest = ids.length ? null : article;
    }
    return nearest;
  }

  function threadComments(column, editor, article, post) {
    if (!article || !post || postText(articleBody(article)) !== post) return [];
    const region = 'section[role="region"], [aria-label][role="region"], section[aria-labelledby], [data-testid="primaryColumn"]';
    const timeline = article.closest(region) || column;
    const comments = new Set();
    for (const node of timeline.querySelectorAll(articleSelector + ', h1, h2, h3, h4, h5, h6, [role="heading"]')) {
      if (!(editor.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (node.closest('aside, [role="dialog"], [contenteditable="true"], [hidden], [aria-hidden="true"], [data-testid="sidebarColumn"]')) continue;
      if ((node.closest(region) || column) !== timeline || node.parentElement.closest(articleSelector)) continue;
      // X may append a separate recommendation section after the conversation.
      if (!node.matches(articleSelector)) break;
      if (!node.getClientRects().length || node.closest('[data-testid="placementTracking"]') ||
          node.querySelector('[data-testid="placementTracking"], [data-testid="promotedIndicator"]')) continue;
      const text = postText(articleBody(node));
      if (text && text !== post) comments.add(text.slice(0, 300));
      if (comments.size === 5) break;
    }
    return [...comments];
  }

  const nativeSelector = '[data-testid="emojiPicker"], [data-testid="gifSearchButton"], [data-testid="fileInput"]';
  const toolSelector = '[data-testid="toolBar"], [role="toolbar"], ' + nativeSelector;
  const sendSelector = '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]';
  function toolbarPlacement(editor, container) {
    for (let scope = editor.parentElement; scope && container.contains(scope); scope = scope.parentElement) {
      const tools = [...scope.querySelectorAll(toolSelector)].filter(node =>
        node.closest('[role="dialog"]') === editor.closest('[role="dialog"]') &&
        (editor.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING));
      if (tools.length) {
        const toolbar = tools[0];
        const native = toolbar.matches(nativeSelector) ? toolbar : toolbar.querySelector('[data-testid="emojiPicker"]') || toolbar.querySelector(nativeSelector) ||
          toolbar.querySelector('button, [role="button"]');
        if (!native) continue;
        let group = native.parentElement;
        // X wraps individual icons in extra elements on some layouts.
        while (group !== scope && group !== toolbar && group.querySelectorAll('button, [role="button"]').length < 2) {
          group = group.parentElement;
        }
        let before = group.querySelector(sendSelector);
        while (before && before.parentElement !== group) before = before.parentElement;
        let row = toolbar.contains(group) ? toolbar : group;
        while (row.parentElement && scope.contains(row.parentElement) &&
               !row.parentElement.contains(editor) && !row.querySelector(sendSelector)) row = row.parentElement;
        return { group, before, row, native, scope };
      }
    }
  }

  async function appendDraft(editor, text) {
    editor.focus();
    const selection = window.getSelection();
    selection.selectAllChildren(editor);
    selection.collapseToEnd();
    const before = editor.innerText;
    const insertion = (before.trim() && !/\s$/.test(before) ? ' ' : '') + text;
    if (!editor.matches('[data-contents], .public-DraftEditor-content') && !editor.querySelector('[data-contents], [data-block="true"], [data-offset-key]')) {
      return document.execCommand('insertText', false, insertion);
    }
    // Draft.js owns the document model. Give it one paste transaction and let it render.
    // Retrying a native insert after dispatch can race its asynchronous state update.
    const leaf = [...editor.querySelectorAll('[data-offset-key]')].at(-1);
    if (leaf) {
      const range = document.createRange();
      range.selectNodeContents(leaf.querySelector('[data-text]') || leaf);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    // Synchronize the controlled selection before the editor reads it for paste.
    document.dispatchEvent(new Event('selectionchange'));
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', insertion);
    const updated = () => editor.innerText !== before && editor.innerText.trimEnd().endsWith(text.trimEnd());
    editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
    if (updated()) return true;
    return new Promise(resolve => {
      const finish = () => { observer.disconnect(); clearTimeout(timer); resolve(updated()); };
      const observer = new MutationObserver(() => { if (updated()) finish(); });
      const timer = setTimeout(finish, 750);
      observer.observe(editor, { childList: true, characterData: true, subtree: true });
    });
  }

  function mount(editor, container, context, postId, placement, commentsFor) {
    let applying = false;
    const host = document.createElement('span');
    const ui = host.attachShadow({ mode: 'closed' });
    const panel = document.createElement('div');
    const feedback = panel.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      :host { display:inline-flex; align-self:center; align-items:center; vertical-align:middle;
        flex:none; line-height:0; color:var(--draft-ink); }
      button { display:grid; place-items:center; box-sizing:border-box; inline-size:var(--tool-size,34px);
        block-size:var(--tool-size,34px); padding:0; margin:0; appearance:none; border:0;
        border-radius:8px; background:transparent; cursor:pointer;
        color:color-mix(in srgb,var(--mark) 40%,var(--draft-ink)); }
      svg { display:block; width:19px; height:19px; }
      .generate { --mark:var(--xc-draft-primary,#00f6ff); position:relative; isolation:isolate; }
      .generate::before { content:""; position:absolute; inset:0; margin:auto; width:28px; height:28px;
        pointer-events:none; z-index:-1; opacity:.75; background:var(--xc-draft-halo,none); }
      @media (prefers-reduced-motion:no-preference) {
        .generate::before { animation:var(--xc-draft-breathe,none) 3.8s ease-in-out infinite; }
      }
      @keyframes draft-breathe { 0%,100% { opacity:.48; } 50% { opacity:.95; } }
      .generate svg { filter:var(--xc-draft-glow,none); }
      .settings { --mark:var(--xc-draft-accent,#ff2bd6); }
      .settings:hover:not(:disabled),.settings:focus-visible { background:color-mix(in srgb,var(--mark) 13%,transparent); }
      button:focus-visible { outline:2px solid currentColor; outline-offset:-2px; }
      button:disabled { cursor:progress; }
    `;
    function button(label) {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = label;
      return el;
    }
    function icon(label, path) {
      const el = button('');
      el.title = label;
      el.setAttribute('aria-label', label);
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      const outline = document.createElementNS(ns, 'path');
      outline.setAttribute('d', path);
      outline.setAttribute('fill', 'none');
      outline.setAttribute('stroke', 'currentColor');
      outline.setAttribute('stroke-width', '1.7');
      outline.setAttribute('stroke-linejoin', 'round');
      outline.setAttribute('stroke-linecap', 'round');
      svg.append(outline);
      el.append(svg);
      return el;
    }
    const generate = icon(t('AI Generate', 'AI 生成'), 'M10 4l2.2 6.3L18 13l-5.8 2.7L10 22l-2.3-6.3L2 13l5.7-2.7z M19 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z');
    const settings = icon(t('AI settings', 'AI 设置'), 'M3 7h6m5 0h7M3 17h10m5 0h3M14 7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0M18 17a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0');
    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    const results = document.createElement('div');
    results.className = 'results';
    ui.append(style, generate, settings);
    const panelStyle = document.createElement('style');
    panelStyle.textContent = `
      :host { display:block; min-width:0; color:var(--draft-ink); font:14px/1.5 system-ui,sans-serif;
        --highlight:color-mix(in srgb,var(--xc-draft-primary,#00f6ff) 35%,var(--draft-ink));
        --rule:color-mix(in srgb,currentColor 14%,transparent); }
      [role="status"]:not(:empty) { display:flex; align-items:center; gap:8px; padding:10px 0 6px;
        font-size:12px; line-height:1.45; color:color-mix(in srgb,var(--draft-ink) 76%,transparent); }
      [role="status"][data-loading] { color:var(--highlight); font-weight:550; }
      [data-loading]::before { content:""; width:18px; height:3px; flex:none; border-radius:3px;
        background:linear-gradient(90deg,transparent,var(--highlight),transparent) 0 0 / 55% 100% no-repeat,
          color-mix(in srgb,currentColor 24%,transparent); }
      .results:not(:empty) { border-block:1px solid var(--rule); margin-block:2px 8px; }
      .draft { box-sizing:border-box; display:grid; gap:3px; width:100%; margin:0; padding:10px 8px;
        text-align:start; font:inherit; color:inherit; border:0; background:transparent; cursor:pointer;
        white-space:pre-wrap; overflow-wrap:anywhere; }
      .draft:disabled { cursor:progress; }
      .draft-row + .draft-row { border-block-start:1px solid var(--rule); }
      .draft:hover,.draft:focus-visible { background:color-mix(in srgb,var(--xc-draft-primary,#00f6ff) 7%,transparent); }
      .draft:focus-visible { outline:2px solid var(--highlight); outline-offset:-2px; }
      .media-actions,.media-preview { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .media-actions { padding:0 8px 8px; }
      .media-actions button,.media-preview button,.media-preview a { font:inherit; font-size:12px; color:var(--highlight); background:transparent; border:0; cursor:pointer; padding:4px; }
      .media-actions button:disabled { opacity:.6; cursor:progress; }
      .media-preview img { flex-basis:100%; min-width:0; max-width:100%; max-height:200px; object-fit:contain; object-position:left; }
      strong { display:flex; align-items:center; gap:7px; color:var(--highlight); font:600 12px/1.4 system-ui,sans-serif; }
      strong::before { content:""; width:8px; height:2px; border-radius:2px; background:currentColor; }
      .text { font-size:15px; line-height:1.45; }
      small { font-size:13px; line-height:1.45; color:color-mix(in srgb,var(--draft-ink) 72%,transparent); }
      @media (prefers-reduced-motion:no-preference) {
        [data-loading],[data-loading]::before { animation:var(--xc-draft-busy,none) 1.2s ease-in-out infinite alternate; }
        .draft,[role="status"][data-added] { animation:var(--xc-draft-entrance,none) 180ms ease-out; }
      }
      @keyframes draft-scan { to { background-position:100% 0; color:var(--draft-ink); } }
      @keyframes draft-appear { from { opacity:.5; transform:translateY(3px); } }
    `;
    const target = document.createElement('small');
    target.hidden = true;
    feedback.append(panelStyle, target, status, results);
    generate.className = 'generate';
    settings.className = 'settings';
    const ink = getComputedStyle(editor).color;
    for (const element of [host, panel]) element.style.setProperty('--draft-ink', ink);
    const nativeSize = placement.native.closest('button,[role="button"]')?.getBoundingClientRect().height;
    if (nativeSize) host.style.setProperty('--tool-size', `${Math.max(24, Math.min(40, nativeSize))}px`);
    placement.group.insertBefore(host, placement.before);
    placement.row.after(panel);
    let cancelGeneration = () => {};
    const cardRequests = new Set();
    function cancelCardRequests() {
      for (const requestId of cardRequests) chrome.runtime.sendMessage({ type: 'xc-ai-cancel', requestId }).catch(() => {});
      cardRequests.clear();
    }
    async function requestCard(message) {
      const requestId = crypto.randomUUID();
      cardRequests.add(requestId);
      try { return await chrome.runtime.sendMessage({ ...message, requestId }); }
      catch { return { error: 'network' }; }
      finally { cardRequests.delete(requestId); }
    }
    mounted.set(editor, { host, panel, postId, container, cancel() { cancelGeneration(); cancelCardRequests(); } });
    const current = snapshot => host.isConnected && container.contains(editor) &&
      (!postId || detailId() === postId) && JSON.stringify(context()) === JSON.stringify(snapshot);
    let labels = {};
    let mediaKinds = [];
    let mediaBarShown = false;
    let activeRequestId;
    let generationMessage;
    const draftRows = new Map();
    function addMediaSetup() {
      if (mediaBarShown || mediaKinds.includes('image')) return;
      mediaBarShown = true;
      const bar = document.createElement('div');
      bar.className = 'media-actions';
      const setup = button(t('Set up image generation', '配置生图模型'));
      setup.onclick = settings.onclick;
      const hint = document.createElement('small');
      hint.textContent = t('Choose OpenAI GPT-6.2 Sol or configure a Doubao image model.', '可选择 OpenAI 的 GPT-6.2 Sol，或在豆包高级设置里配置生图模型。');
      bar.append(setup, hint);
      results.prepend(bar);
    }
    function showFailure(failure, snapshot) {
      const { tone } = failure;
      const existing = draftRows.get(tone);
      if (existing?.failed || existing?.ready) return;
      existing?.row.remove();
      const row = document.createElement('div');
      row.className = 'draft-row media-actions';
      const name = document.createElement('strong');
      name.textContent = labels[tone] || tone;
      const detail = document.createElement('small');
      detail.textContent = errors[failure.error] || errors.network;
      const retry = button(t('Retry this style', '重试此风格'));
      row.append(name, detail, retry);
      results.append(row);
      draftRows.set(tone, { row, failed: true });
      const message = { ...generationMessage, type: 'xc-ai-retry-style', style: tone };
      retry.onclick = async event => {
        if (!event.isTrusted || retry.disabled || !current(snapshot)) return;
        retry.disabled = true;
        detail.textContent = t('Generating…', '正在生成…');
        const result = await requestCard(message);
        if (!row.isConnected || !current(snapshot)) return;
        retry.disabled = false;
        const reply = result?.replies?.find(item => item.tone === tone);
        if (!reply) { detail.textContent = errors[result?.error] || errors.network; return; }
        row.remove();
        draftRows.delete(tone);
        appendReply(reply, result.labels, result.mediaKinds, result.labelLanguage, snapshot);
        status.textContent = t('Choose a reply', '选择回复');
      };
    }

    function appendReply(reply, replyLabels, replyMediaKinds, language, snapshot, partial = false) {
      if (!reply?.tone) return;
      if (reply.error) {
        labels = replyLabels || labels;
        showFailure(reply, snapshot);
        return;
      }
      const style = reply.tone;
      let entry = draftRows.get(style);
      if (reply.remove) {
        entry?.row.remove();
        draftRows.delete(style);
        return;
      }
      if (entry?.ready) return;
      labels = replyLabels || labels;
      mediaKinds = replyMediaKinds || mediaKinds;
      if (!entry) {
        addMediaSetup();
        const row = document.createElement('div');
        row.className = 'draft-row';
        const choice = button('');
        choice.className = 'draft';
        const tone = document.createElement('strong');
        tone.textContent = labels[style] || style;
        const wording = document.createElement('span');
        wording.className = 'text';
        const note = document.createElement('small');
        choice.append(tone, wording, note);
        row.append(choice);
        results.append(row);
        entry = { row, choice, wording, note, ready: false };
        draftRows.set(style, entry);
      }
      const { row, choice, wording, note } = entry;
      const { text, reference } = reply;
      wording.textContent = text;
      note.textContent = reference || (partial && language && language !== snapshot.postLanguage
        ? t('Waiting for translation…', '等待译文…') : '');
      note.hidden = !note.textContent;
      if (reference && language) note.lang = language;
      choice.disabled = partial;
      if (partial) return;
      entry.ready = true;
      const actions = document.createElement('div');
      actions.className = 'media-actions';
      const fill = button(t('Fill', '填入'));
      const copy = button(t('Copy', '复制'));
      actions.append(fill, copy);
      row.append(actions);
      choice.onclick = fill.onclick = async event => {
        if (!event.isTrusted || applying || !current(snapshot)) return;
        applying = true;
        try {
          if (!await appendDraft(editor, text)) {
            status.textContent = t('Use Copy to paste this draft into your reply.', '请点击复制，再粘贴到回复框。');
            return;
          }
          chrome.runtime.sendMessage({ type: 'xc-ai-style-selected', style }).catch(() => {});
          fill.textContent = t('Added', '已填入');
          globalThis.xClickDraftSound?.('draftInsert');
        } finally { applying = false; }
      };
      copy.onclick = async event => {
        if (!event.isTrusted || !current(snapshot)) return;
        try {
          await navigator.clipboard.writeText(text);
          copy.textContent = t('Copied', '已复制');
        } catch { status.textContent = t('Clipboard unavailable. Select the draft text to copy it.', '无法访问剪贴板，请选中正文复制。'); }
      };
      if (reply.referenceMissing && language) {
        const translate = button(t('Retry translation', '重试翻译'));
        note.hidden = false;
        note.textContent = t('Translation unavailable.', '暂无译文。');
        actions.append(translate);
        translate.onclick = async event => {
          if (!event.isTrusted || translate.disabled || !current(snapshot)) return;
          translate.disabled = true;
          note.textContent = t('Translating…', '正在翻译…');
          const result = await requestCard({ type: 'xc-ai-translate', text, language });
          if (!row.isConnected || !current(snapshot)) return;
          translate.disabled = false;
          note.textContent = result?.reference || errors[result?.error] || errors.network;
          if (result?.reference) { note.lang = language; translate.remove(); }
        };
      }
      if (mediaKinds.length) globalThis.xClickMediaActions({ kinds:mediaKinds, parent:row, t, text, snapshot, current, scope:placement.scope, status, errors });
    }

    function hasReadyReply() {
      return [...draftRows.values()].some(entry => entry.ready);
    }

    function discardUnfinishedRows() {
      for (const [tone, entry] of draftRows) {
        if (!entry.ready && !entry.failed) { entry.row.remove(); draftRows.delete(tone); }
      }
    }
    settings.onclick = event => {
      if (event.isTrusted) chrome.runtime.sendMessage({ type: 'xc-ai-settings' });
    };
    const generationLabel = active => active
      ? t('Cancel AI generation', '取消 AI 生成')
      : t('AI Generate', 'AI 生成');
    function updateGenerationLabel(active) {
      const label = generationLabel(active);
      generate.title = label;
      generate.setAttribute('aria-label', label);
    }
    generate.onclick = async event => {
      if (!event.isTrusted) return;
      if (activeRequestId) {
        cancelGeneration();
        return;
      }
      const snapshot = context();
      const { post, images } = snapshot;
      results.replaceChildren();
      cancelCardRequests();
      draftRows.clear();
      labels = {};
      mediaKinds = [];
      mediaBarShown = false;
      target.textContent = [snapshot.author, post.replace(/\s+/g, ' ').slice(0, 100) || (images.length ? t('Photo post', '图片帖') : '')].filter(Boolean).join(' · ');
      target.hidden = !target.textContent;
      if (!post && !images.length) { status.textContent = errors.context; return; }
      globalThis.xClickDraftSound?.('draftStart');
      status.dataset.loading = '';
      status.textContent = t('Preparing…', '正在准备…');
      const requestId = globalThis.crypto?.randomUUID?.() || `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      activeRequestId = requestId;
      updateGenerationLabel(true);
      cancelGeneration = () => {
        if (activeRequestId !== requestId) return;
        activeRequestId = undefined;
        progressListeners.delete(requestId);
        chrome.runtime.sendMessage({ type: 'xc-ai-cancel', requestId }).catch(() => {});
        delete status.dataset.loading;
        discardUnfinishedRows();
        status.textContent = errors.cancelled;
        updateGenerationLabel(false);
      };
      progressListeners.set(requestId, progress => {
        if (!current(snapshot)) { cancelGeneration(); return; }
        if (progress.status) {
          status.textContent = {
            preparing: t('Preparing…', '正在准备…'),
            analyzing: t('Analyzing context…', '正在分析上下文…'),
            generating: t('Generating…', '正在生成…'),
            validating: t('Checking suggestions…', '正在检查候选…'),
            done: t('Choose a reply', '请选择回复。')
          }[progress.status] || status.textContent;
        }
        appendReply(progress.reply, progress.labels, progress.mediaKinds, progress.labelLanguage, snapshot, progress.partial);
        if (progress.reply || progress.status === 'generating') {
          status.textContent = hasReadyReply()
            ? t('Replies ready · receiving more…', '已有回复可用 · 正在接收其余候选…')
            : t('Receiving replies…', '正在接收回复…');
        }
      });
      try {
        const comments = commentsFor?.(post) || [];
        generationMessage = { post, comments, images, postLanguage: snapshot.postLanguage, uiLanguage: t('en', 'zh-Hans') };
        const response = await chrome.runtime.sendMessage({ type: 'xc-ai-generate', requestId, ...generationMessage });
        if (activeRequestId !== requestId) return;
        activeRequestId = undefined;
        progressListeners.delete(requestId);
        if (!current(snapshot)) { status.textContent = ''; return; }
        labels = response?.labels || labels;
        mediaKinds = response?.mediaKinds || mediaKinds;
        for (const reply of response?.replies || []) appendReply(reply, labels, mediaKinds, response.labelLanguage, snapshot);
        discardUnfinishedRows();
        for (const failure of response?.failures || []) showFailure(failure, snapshot);
        if (!hasReadyReply()) {
          status.textContent = errors[response?.error] || errors.network;
          return;
        }
        status.textContent = [...draftRows.values()].some(entry => entry.failed) ? t('Choose a reply · some styles unavailable', '选择回复 · 部分风格未返回') : t('Choose a reply', '选择回复');
        if (images.length) status.textContent += response?.photoCount
          ? t(` · ${response.photoCount} photos`, ` · ${response.photoCount} 张配图`)
          : t(' · Text only', ' · 仅文字');
      } catch {
        if (activeRequestId !== requestId) return;
        activeRequestId = undefined;
        progressListeners.delete(requestId);
        discardUnfinishedRows();
        status.textContent = hasReadyReply()
          ? t('Some replies are ready. Try again for the remaining styles.', '部分回复已生成，可重新生成剩余风格。')
          : errors.network;
      }
      finally {
        if (activeRequestId === requestId) activeRequestId = undefined;
        if (!activeRequestId) {
          delete status.dataset.loading;
          updateGenerationLabel(false);
        }
      }
    };
  }
  function findInlineEditor(column) {
    return [...(column?.querySelectorAll(editorSelector) || [])].find(node =>
      !node.closest('[role="dialog"], aside, [data-testid="sidebarColumn"]'));
  }
  function scan() {
    const id = detailId();
    const column = document.querySelector('[data-testid="primaryColumn"]') || document.querySelector('main, [role="main"]');
    const inlineEditor = id && findInlineEditor(column);
    for (const [editor, { host, panel, postId, container, cancel }] of mounted) {
      if (!editor.isConnected || !host.isConnected || !panel.isConnected || !container.contains(editor) || (postId && postId !== id)) {
        cancel?.();
        host.remove();
        panel.remove();
        mounted.delete(editor);
      }
    }
    for (const dialog of document.querySelectorAll('[role="dialog"]')) {
      const editor = dialog.querySelector(editorSelector);
      if (!editor || mounted.has(editor)) continue;
      const origin = pendingReply?.expires > Date.now() ? pendingReply : null;
      const context = () => dialogContext(dialog, editor, origin);
      const placement = toolbarPlacement(editor, dialog);
      const { post, images } = context();
      if (placement && (post || images.length)) {
        pendingReply = undefined;
        mount(editor, dialog, context, undefined, placement, post => post === origin?.post ? origin.comments : []);
      }
    }
    const editor = inlineEditor;
    if (editor && !mounted.has(editor)) {
      const placement = toolbarPlacement(editor, column);
      if (placement) {
        const source = () => inlineArticle(column, editor, id);
        const context = () => {
          const article = source();
          const body = articleBody(article);
          return { author: authorHandle(article), post: postText(body), postLanguage: postLanguage(body), images: photosIn(article) };
        };
        mount(editor, column, context, id, placement, post => threadComments(column, editor, source(), post));
      }
    }
  }
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; scan(); });
  }).observe(document.body, { childList: true, subtree: true });
  scan();
})();
