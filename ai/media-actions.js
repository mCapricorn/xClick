(() => {
  globalThis.xClickMediaActions = ({ kinds, parent, t, text, snapshot, current, scope, status, errors }) => {
    const bar = document.createElement('div');
    bar.className = 'media-actions';
    const preview = document.createElement('div');
    preview.className = 'media-preview';
    parent.append(bar, preview);
    const live = () => bar.isConnected && current(snapshot);
    const message = data => chrome.runtime.sendMessage({ type: 'xc-ai-media', ...data });
    const actions = [];
    function control(label, fn, root) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = label;
      btn.onclick = e => { if (e.isTrusted && live()) fn(); };
      root.append(btn);
      return btn;
    }
    async function show(file) {
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      {
        if (!live()) return;
        const img = document.createElement('img'); img.src = reader.result;
        img.alt = t('Generated reaction', '生成的回复配图');
        const save = document.createElement('a');
        save.href = reader.result; save.download = file.name; save.textContent = t('Download', '下载');
        preview.replaceChildren(img);
        control(t('Add to reply', '添加到回复'), () => {
          const inputs = scope.querySelectorAll('input[type=file][data-testid="fileInput"]');
          if (inputs.length !== 1 || inputs[0].disabled || inputs[0].files.length || scope.querySelector('[data-testid="attachments"]')) {
            status.textContent = t('Download this file and add it with X’s media button.', '请下载文件，再通过 X 的媒体按钮添加。'); return;
          }
          const transfer = new DataTransfer(); transfer.items.add(file);
          inputs[0].files = transfer.files;
          inputs[0].dispatchEvent(new Event('change', { bubbles:true }));
          status.textContent = t('Check the attachment in your reply before posting.', '发布前请在回复框确认附件。');
        }, preview);
        preview.append(save);
        status.textContent = t('Preview ready', '预览已就绪');
      }
    }
    async function generate(kind) {
      if (actions.some(btn => btn.disabled)) return;
      actions.forEach(btn => { btn.disabled = true; });
      status.textContent = kind === 'gif' ? t('Generating GIF…', '正在生成动图…') : t('Generating image…', '正在生成配图…');
      try {
        let res = await message({kind, text, post:snapshot.post, images:snapshot.images});
        const task = res?.task;
        if (task) {
          const deadline = Date.now()+10*60*1000;
          do {
            await new Promise(r => setTimeout(r, 4000));
            if (!live()) return;
            if (Date.now() > deadline) throw new Error('mediaTimeout');
            res = await message({kind, task});
          } while (res?.pending);
        }
        if (!live()) return;
        if (res?.error) { status.textContent = (errors[res.error] || errors.mediaFailed) + (res.status ? ` (${res.status})` : ''); return; }
        const bytes = Uint8Array.from(atob(kind === 'gif' ? res.video : res.image), ch => ch.charCodeAt(0));
        if (kind === 'gif') await show(await globalThis.xClickReactionGif(new Blob([bytes], {type:'video/mp4'}), live));
        else {
          const png = bytes[0]===137 && bytes[1]===80;
          if (!png && !(bytes[0]===255 && bytes[1]===216)) throw new Error('format');
          await show(new File([bytes], png ? 'xclick-reaction.png' : 'xclick-reaction.jpg', {type:png ? 'image/png' : 'image/jpeg'}));
        }
      } catch (e) { if (live()) status.textContent = errors[e.message] || errors.mediaFailed; }
      finally { actions.forEach(btn => { btn.disabled = false; }); }
    }
    for (const kind of kinds) actions.push(control(kind === 'gif' ? t('Generate GIF', '生成动图') : t('Generate image', '生成配图'), () => generate(kind), bar));
  };
})();
