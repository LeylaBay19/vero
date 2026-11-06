const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PROTOTYPE_BROWSER || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1414, height: 827 }, acceptDownloads: true });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
    const url = pathToFileURL(path.resolve('prototype.html')).href;
    await page.goto(url + '#ux');
    const frame = name => page.frameLocator('#stand-frame-' + name);
    const choose = name => page.locator(`[data-variant="${name}"]`).click();

    assert.deepEqual(await page.locator('[data-variant]').allTextContents(),
      ['1. Письмо → пароль', '2. По ТЗ']);
    assert.deepEqual(await page.locator('iframe').evaluateAll(frames => frames.map(f => f.sandbox.value)),
      Array(4).fill('allow-scripts'));

    const letter = frame('letter');
    await letter.locator('[data-r2-action=register]').click();
    await page.locator('#stand-fill').click();
    await page.waitForFunction(() => document.getElementById('stand-history-position').textContent !== '');
    const outcomes = await letter.locator('#r2-auth-outcome option').evaluateAll(options => options.map(option => option.value));
    assert.ok(!outcomes.includes('invite-expired') && !outcomes.includes('invite-revoked'));
    const letterEmail = await letter.locator('#r2-email').inputValue();
    assert.match(letterEmail, /@/);

    await choose('brief');
    const brief = frame('brief');
    await brief.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
    await brief.locator('[data-form=signup]').waitFor();
    await page.locator('#stand-fill').click();
    await brief.locator('#terms').check();
    await brief.locator('[data-form=signup] button[type=submit]').click();
    await brief.locator('[data-form=contact]').waitFor();

    await choose('letter');
    assert.equal(await letter.locator('#r2-email').inputValue(), letterEmail);

    await letter.locator('#scenario').selectOption('invite');
    await letter.locator('[data-r2-action=invite-login]').click();
    assert.equal(await letter.locator('#r2-login').inputValue(), 'employee@example.test');
    const password = letter.locator('#r2-password');
    assert.equal(await password.inputValue(), '');
    await letter.locator('#fill').click();
    assert.equal(await password.inputValue(), 'Example-2026!');
    await password.fill('Entered-manually!');
    await letter.locator('#fill').click();
    assert.equal(await password.inputValue(), 'Entered-manually!');
    await password.fill('');
    await page.locator('#stand-fill').click();
    await password.evaluate(input => new Promise((resolve, reject) => {
      const deadline = Date.now() + 2000;
      const check = () => {
        if (input.value) resolve();
        else if (Date.now() >= deadline) reject(new Error('The stand did not fill the password'));
        else setTimeout(check, 20);
      };
      check();
    }));
    assert.equal(await password.inputValue(), 'Example-2026!');
    await letter.locator('[data-r2-form=login] button[type=submit]').click();
    assert.match(await letter.locator('[data-auth-complete]').textContent(), /Сотрудник организации/);

    await page.getByRole('tab', { name: 'Сравнение регистрации' }).click();
    const comparison = frame('comparison');
    await comparison.locator('[data-flow=mos]').waitFor();
    assert.deepEqual(await comparison.locator('[data-flow]').evaluateAll(buttons => buttons.map(b => b.dataset.flow)),
      ['mos', 'ep', 'orb']);
    await comparison.locator('[data-flow=orb]').click();
    await page.getByRole('tab', { name: 'Схемы' }).click();
    const schemes = frame('schemes');
    await schemes.locator('[data-registration-schemes]').waitFor();
    for (const [group, count] of [['letter', 6], ['brief', 2]]) {
      assert.equal(await schemes.locator(`[data-process-group="${group}"] article`).count(), count);
    }
    const cards = schemes.locator('article[data-process-card]');
    const overlaps = () => schemes.locator('.diagram:not([hidden]) svg').evaluateAll(svgs =>
      svgs.flatMap(svg => {
        const texts = [...svg.querySelectorAll('tspan')].map(el => ({ text: el.textContent, box: el.getBBox() }));
        const conflicts = [];
        for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i], b = texts[j];
          const x = Math.min(a.box.x + a.box.width, b.box.x + b.box.width) - Math.max(a.box.x, b.box.x);
          const y = Math.min(a.box.y + a.box.height, b.box.y + b.box.height) - Math.max(a.box.y, b.box.y);
          if (x > 1 && y > 1) conflicts.push([svg.dataset.process, a.text, b.text]);
        }
        return conflicts;
      }));
    assert.deepEqual(await overlaps(), []);
    for (const card of await cards.all()) {
      await card.locator('[data-layout=horizontal]').click();
      assert.equal(await card.locator('span[data-scale]').textContent(), '70%');
    }
    assert.deepEqual(await overlaps(), []);

    const first = cards.first();
    await first.locator('[data-expand]').click();
    await page.waitForFunction(() => document.body.classList.contains('scheme-expanded'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('scheme-expanded'));
    await first.locator('[data-zoom=fit]').click();

    await page.evaluate(() => {
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = blob => { window.schemeDownload = blob; return create(blob); };
    });
    for (const [extension, type] of [['bpmn', 'application/xml'], ['svg', 'image/svg+xml']]) {
      const anchor = first.locator(`.downloads:not([hidden]) a[download$=".${extension}"]`);
      const expected = decodeURIComponent((await anchor.getAttribute('href')).split(',').slice(1).join(','));
      const [download] = await Promise.all([page.waitForEvent('download'), anchor.click()]);
      assert.equal(download.suggestedFilename(), 'auth1-email-horizontal.' + extension);
      const blob = await page.evaluate(async () => ({ type: window.schemeDownload.type, text: await window.schemeDownload.text() }));
      assert.deepEqual(blob, { type, text: expected });
    }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.getByRole('tab', { name: 'Варианты' }).click();
      await choose('letter');
      await page.getByRole('tab', { name: 'Схемы' }).click();
    }
    const archive = page.getByRole('link', { name: /Архив/ });
    assert.equal(await archive.getAttribute('href'), 'archive/prototype-v1.25.0.html');
    await page.goto(new URL(await archive.getAttribute('href'), url).href);
    await page.locator('[data-variant=ux]').waitFor();
    assert.ok(fs.readFileSync('archive/prototype-v1.25.0.html').equals(fs.readFileSync('web/archive/prototype-v1.25.0.html')));
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    console.log('Registration stand: 2 variants, 3 comparison scenarios, 8 diagrams in two layouts, no label overlaps, expand/Esc, BPMN/SVG payloads, mobile and archive.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
