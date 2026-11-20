const { chromium } = require(process.env.XCLICK_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.XCLICK_CHROME });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'https://test.invalid') return route.abort();
      if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<title>Fixture</title>' });
      if (!/^\/(?:ai\/)?[\w-]+\.(?:html|mjs|css)$/.test(url.pathname)) return route.abort();
      return route.fulfill({ path: path.resolve(__dirname, '..', url.pathname.slice(1)),
        contentType: url.pathname.endsWith('.mjs') ? 'text/javascript' : undefined });
    });
    await page.addInitScript(() => Object.assign(chrome, {
      i18n: { getUILanguage: () => 'en' }, permissions: { request: async () => true, contains: async () => false },
      storage: { local: { get: (_, cb) => cb({}) }, onChanged: { addListener() {} } }
    }));
    await page.goto('https://test.invalid/');
    await page.evaluate(() => new Promise((resolve, reject) => {
      const db = indexedDB.open('xclick-ai', 1);
      db.onupgradeneeded = () => db.result.createObjectStore('settings');
      db.onsuccess = () => {
        const tx = db.result.transaction('settings', 'readwrite');
        tx.objectStore('settings').put({ provider: 'anthropic', key: 'fixture-a', model: 'custom-model-a',
          base_url: 'https://relay.invalid/v1', workspace: 'workspace-a' }, 'active');
        tx.oncomplete = () => { db.result.close(); resolve(); };
        tx.onabort = () => reject(tx.error);
      };
    }));
    await page.goto('https://test.invalid/ai/settings.html');
    const waitProvider = id => page.waitForFunction(id => document.querySelector('#provider').value === id && document.querySelector('#provider').onchange, id);
    const state = () => page.evaluate(async () => (await import('/ai/config.mjs')).configuration('profiles'));
    const save = async () => {
      await page.locator('button[type=submit]').click();
      await page.waitForFunction(() => document.querySelector('#status').dataset.i18n === 'saved');
    };
    await waitProvider('anthropic');
    await page.selectOption('#provider', 'doubao');
    await page.fill('#key', 'fixture-b');
    await page.locator('summary').click();
    await page.fill('#gifModel', 'fixture-gif');
    await save();
    await page.reload();
    await waitProvider('doubao');
    await page.selectOption('#provider', 'anthropic');
    assert.equal((await state()).active.provider, 'doubao');
    assert.equal(await page.inputValue('#model'), 'custom-model-a');
    assert.equal(await page.inputValue('#workspace'), 'workspace-a');
    assert.equal(await page.inputValue('#base_url'), 'https://relay.invalid/v1');
    assert.equal(await page.inputValue('#key'), '');
    assert.equal(await page.locator('#key').evaluate(el => el.required), false);
    await page.fill('#base_url', 'https://another.invalid/v1');
    assert.equal(await page.locator('#key').evaluate(el => el.required), true);
    await page.fill('#base_url', 'https://relay.invalid/v1');
    await save();
    assert.equal((await state()).active.key, 'fixture-a');
    await page.selectOption('#provider', 'doubao');
    assert.equal(await page.inputValue('#gifModel'), 'fixture-gif');
    assert.equal((await state()).profiles.find(p => p.provider === 'doubao').key, 'fixture-b');
    // Preview the unsaved form model, without activating it or sending real traffic.
    const requests = [];
    let invalid = false;
    await page.route('https://ark.cn-beijing.volces.com/api/v3/chat/completions', route => {
      const request = route.request().postDataJSON();
      requests.push(request);
      const instructions = request.messages[0].content;
      const tone = instructions.match(/JSON object with keys ([\w-]+)\./)?.[1];
      const answer = tone ? { [tone]: { text: 'Reply ' + tone } } : { post: 'A new leaf today.' };
      return route.fulfill({ json: { choices: [{ message: { content: invalid ? 'oops' : JSON.stringify(answer) } }] } });
    });
    await page.selectOption('#model', '');
    await page.fill('#manualModel', 'fixture-preview-model');
    await page.click('#addStyle');
    const tone = await page.inputValue('#previewStyle');
    await page.locator('.custom-editor input').fill('Garden notes');
    await page.locator('.custom-editor textarea').fill('Notice one small detail.');
    await page.locator(`#styleChoices input[value="${tone}"]`).uncheck();
    await page.fill('#samplePost', 'The basil has sprouted.');
    await page.click('#testStyle');
    await page.getByText('Reply ' + tone, { exact: true }).waitFor();
    await page.setViewportSize({ width: 375, height: 800 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(requests[0].model, 'fixture-preview-model');
    assert.match(requests[0].messages[0].content, /Notice one small detail/);
    assert.deepEqual(JSON.parse(requests[0].messages[1].content), { post: 'The basil has sprouted.' });
    await page.selectOption('#previewStyle', 'concise');
    await page.click('#testStyle');
    await page.getByText('Reply concise', { exact: true }).waitFor();
    assert.equal(await page.locator('.preview-card').count(), 2);
    assert.equal((await state()).active.provider, 'anthropic');
    assert.ok(!requests[1].messages[0].content.includes('Notice one small detail'));
    await page.click('#randomPost');
    await page.waitForFunction(() => document.querySelector('#samplePost').value === 'A new leaf today.');
    assert.equal(await page.locator('.preview-card').count(), 0);
    invalid = true;
    await page.click('#testStyle');
    await page.locator('#previewStatus[data-i18n="previewFormat"]').waitFor();
    await page.locator(`#styleChoices input[value="${tone}"]`).check();
    await save();
    await page.reload();
    await waitProvider('doubao');
    assert.equal(await page.inputValue('#samplePost'), 'A new leaf today.');
    assert.equal(await page.locator('.custom-editor input').inputValue(), 'Garden notes');
    assert.ok(await page.locator(`#styleChoices input[value="${tone}"]`).isChecked());
    await page.locator('.custom-editor textarea').fill('Keep it lively.');
    await save();
    assert.equal((await state()).active.customStyles[0].prompt, 'Keep it lively.');
    await page.locator('.custom-editor button').click();
    await save();
    await page.waitForFunction(async () => !(await (await import('/ai/config.mjs')).configuration('read')).customStyles.length);
    assert.ok(!(await state()).active.styles.includes(tone));
    await page.click('#clear');
    await page.waitForFunction(() => document.querySelector('#status').dataset.i18n === 'cleared');
    assert.deepEqual((await state()).profiles, []);
    console.log('PASS provider profiles, key isolation, custom styles, preview comparison, random test post, format error, persistence, narrow layout and clear');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
