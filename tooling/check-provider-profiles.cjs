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
    await page.click('#clear');
    await page.waitForFunction(() => document.querySelector('#status').dataset.i18n === 'cleared');
    assert.deepEqual((await state()).profiles, []);
    console.log('PASS legacy upgrade, provider profiles, browse vs activate, key isolation, clear');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
