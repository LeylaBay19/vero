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
    await letter.getByRole('button', { name: 'Зарегистрировать организацию' }).click();
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

    const scenario = letter.locator('#scenario');
    await scenario.selectOption('duplicate-email');
    await letter.getByRole('button', { name: 'Получить письмо' }).click();
    await letter.getByRole('heading', { name: 'Аккаунт уже существует' }).waitFor();
    await letter.getByRole('button', { name: 'Изменить email' }).click();
    assert.equal(await letter.locator('#r2-email').inputValue(), 'demo@example.test');
    await letter.locator('#r2-email').fill('DEMO@example.test');
    await letter.getByRole('button', { name: 'Получить письмо' }).click();
    await letter.getByRole('button', { name: 'Войти', exact: true }).click();
    assert.equal(await letter.locator('#r2-login').inputValue(), 'DEMO@example.test');

    await scenario.selectOption('employee');
    assert.equal(await letter.locator('[data-r2-action=register]').count(), 0);
    await scenario.selectOption('invite');
    const invitation = letter.locator('[data-r2-form=invitation]');
    assert.equal(await letter.getByText('Логином будет почта', { exact: false }).count(), 0);
    assert.equal(await letter.locator('[data-r2-action=invite-login]').count(), 0);
    await letter.locator('#fill').click();
    await invitation.locator('#r2-terms').check();
    await invitation.getByRole('button', { name: 'Присоединиться в качестве сотрудника' }).click();
    assert.match(await letter.locator('[data-auth-complete]').textContent(), /Сотрудник организации/);

    await scenario.selectOption('invite-existing');
    assert.equal(await letter.getByText('Войдите с почтой, на которую пришло приглашение.', { exact: false }).count(), 0);
    assert.equal(await letter.locator('[data-r2-form=invitation], [data-r2-action=invitation], [data-r2-action=register]').count(), 0);
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

    await scenario.selectOption('invite-other');
    await letter.getByRole('heading', { name: 'Вас пригласили в ООО «Вектор»' }).waitFor();
    await letter.getByRole('button', { name: 'Создать аккаунт', exact: true }).waitFor();
    await letter.getByRole('button', { name: 'Войти в свой аккаунт' }).click();
    await letter.locator('#fill').click();
    assert.equal(await letter.locator('#r2-login').inputValue(), 'anna@example.test');
    await letter.getByRole('button', { name: 'Войти', exact: true }).click();
    const code = letter.getByLabel('Код из письма');
    await code.waitFor();
    assert.equal(await letter.getByRole('button', { name: 'Войти в другой аккаунт' }).count(), 0);
    assert.match(await letter.locator('main').textContent(), /anna@vector\.example\.test/);
    assert.equal(await letter.locator('[data-auth-complete]').count(), 0);
    await letter.locator('#fill').click();
    const oldCode = await code.inputValue();
    await letter.getByRole('button', { name: 'Отправить код повторно' }).click();
    await code.fill(oldCode);
    await letter.getByRole('button', { name: 'Подтвердить код' }).click();
    await letter.locator('#r2-alert:not([hidden])').waitFor();
    assert.equal(await code.getAttribute('aria-invalid'), 'true');
    assert.equal(await letter.getByRole('button', { name: 'Присоединиться', exact: true }).count(), 0);
    await code.fill('');
    await letter.locator('#fill').click();
    assert.notEqual(await code.inputValue(), oldCode);
    await letter.getByRole('button', { name: 'Подтвердить код' }).click();
    const join = letter.getByRole('button', { name: 'Присоединиться', exact: true });
    await join.waitFor();
    assert.equal(await letter.locator('[data-auth-complete]').count(), 0);
    await join.click();
    const result = letter.locator('[data-auth-complete]');
    assert.match(await result.textContent(), /anna@example\.test/);
    assert.deepEqual(await result.locator('li').allTextContents(),
      ['ООО «Пример» · Сотрудник организации', 'ООО «Вектор» · Специалист ОССиГ']);
    await letter.locator('#signout').click();
    await letter.locator('#fill').click();
    await letter.getByRole('button', { name: 'Войти', exact: true }).click();
    await result.waitFor();
    assert.equal(await code.count(), 0);
    assert.equal(await result.locator('li').count(), 2);

    const startOther = async () => {
      await scenario.selectOption('new');
      await scenario.selectOption('invite-other');
    };
    const signInOther = async () => {
      await letter.getByRole('button', { name: 'Войти в свой аккаунт' }).click();
      await letter.locator('#fill').click();
      await letter.getByRole('button', { name: 'Войти', exact: true }).click();
    };
    const inviteStatus = letter.locator('#r2-auth-outcome');
    const confirmCode = letter.getByRole('button', { name: 'Подтвердить код' });
    const resendCode = letter.getByRole('button', { name: 'Отправить код повторно' });
    await startOther();
    await letter.getByRole('button', { name: 'Не сейчас' }).click();
    await letter.getByRole('heading', { name: 'Приглашение отложено' }).waitFor();
    assert.equal(await result.count(), 0);
    await letter.getByRole('button', { name: 'Вернуться к приглашению' }).click();
    await inviteStatus.selectOption('code-undelivered');
    await signInOther();
    await code.waitFor();
    await letter.locator('#fill').click();
    assert.equal(await code.inputValue(), '');
    await resendCode.click();
    for (let attempt = 0; attempt < 3; attempt++) {
      await code.fill('000000');
      await confirmCode.click();
      await letter.locator('#r2-alert:not([hidden])').waitFor();
    }
    assert.match(await letter.locator('#r2-alert').textContent(), /Попытки исчерпаны/);
    await resendCode.click();
    await letter.locator('#fill').click();
    await inviteStatus.selectOption('code-expired');
    await confirmCode.click();
    await letter.getByText('Срок действия кода истёк.', { exact: false }).first().waitFor();
    await resendCode.click();
    await letter.locator('#fill').click();
    const previousSessionCode = await code.inputValue();
    await letter.getByText('Демо · повторное открытие ссылки', { exact: true }).click();
    await letter.getByRole('button', { name: 'Открыть ссылку в новой сессии' }).click();
    await signInOther();
    await code.fill(previousSessionCode);
    await confirmCode.click();
    await letter.locator('#r2-alert:not([hidden])').waitFor();
    assert.match(await letter.locator('#r2-alert').textContent(), /Код не совпадает/);
    await code.fill('');
    await letter.locator('#fill').click();
    await confirmCode.click();
    await join.waitFor();
    await inviteStatus.selectOption('invite-role-changed');
    await join.click();
    await letter.getByText('Администратор изменил роль. Проверьте новый доступ', { exact: false }).waitFor();
    assert.equal(await result.count(), 0);
    await join.click();
    await result.getByText('ООО «Вектор» · Наблюдатель ОССиГ').waitFor();

    for (const [outcome, heading] of [
      ['invite-undelivered', 'Письмо с приглашением не пришло'],
      ['invite-expired', 'Срок приглашения истёк'],
      ['invite-revoked', 'Приглашение отозвано'],
      ['invite-reissued', 'Приглашение отправили повторно'],
    ]) {
      await startOther();
      await inviteStatus.selectOption(outcome);
      await letter.getByRole('button', { name: 'Войти в свой аккаунт' }).click();
      await letter.getByRole('heading', { name: heading, exact: true }).waitFor();
      assert.equal(await result.count(), 0);
      await letter.getByRole('button', { name: 'Открыть новое приглашение' }).click();
      await letter.getByRole('heading', { name: 'Вас пригласили в ООО «Вектор»' }).waitFor();
    }
    await scenario.selectOption('invite-shared');
    assert.equal(await result.count(), 0);
    await letter.getByRole('button', { name: 'Открыть приглашение на мой адрес' }).click();
    await letter.getByText('anna@example.test', { exact: true }).waitFor();

    await scenario.selectOption('invite-wrong');
    await letter.getByRole('heading', { name: 'Сотруднику не пришло приглашение' }).waitFor();
    await letter.getByText('annna@vector.example.test', { exact: true }).waitFor();
    await letter.getByRole('button', { name: 'Отозвать ссылку и отправить заново' }).click();
    await letter.getByRole('heading', { name: 'Новое приглашение отправлено' }).waitFor();
    assert.equal(await result.count(), 0);
    await letter.getByRole('button', { name: 'Открыть новое приглашение' }).click();
    await letter.getByText('anna@example.test', { exact: true }).waitFor();
    assert.equal(await letter.getByRole('button', { name: 'Создать аккаунт', exact: true }).count(), 0);

    await startOther();
    await letter.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
    assert.equal(await invitation.locator('#r2-invite-login').inputValue(), 'anna@vector.example.test');
    await letter.locator('#fill').click();
    await invitation.locator('#r2-terms').check();
    await invitation.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
    await join.waitFor();
    assert.equal(await result.count(), 0);
    await join.click();
    await result.getByText('anna@vector.example.test', { exact: true }).waitFor();
    await startOther();
    await signInOther();
    await code.waitFor();
    await letter.getByRole('button', { name: 'Нет доступа к этой почте' }).click();
    await letter.getByRole('heading', { name: 'Нужен доступ к почте приглашения' }).waitFor();
    assert.equal(await result.count(), 0);

    await scenario.selectOption('invite-conflict');
    const conflictHeading = letter.getByRole('heading', { name: 'У этой почты уже есть аккаунт ВЕРО' });
    await conflictHeading.waitFor();
    await letter.getByRole('button', { name: 'Войти с почтой приглашения' }).click();
    await letter.locator('#r2-login').fill('anna@example.test');
    await letter.locator('#fill').click();
    await letter.getByRole('button', { name: 'Войти', exact: true }).click();
    await conflictHeading.waitFor();
    assert.equal(await code.count(), 0);
    assert.equal(await result.count(), 0);
    await letter.getByRole('button', { name: 'Войти с почтой приглашения' }).click();
    assert.equal(await letter.locator('#r2-login').inputValue(), 'anna@vector.example.test');
    await letter.locator('#fill').click();
    await letter.getByRole('button', { name: 'Войти', exact: true }).click();
    await join.waitFor();
    assert.equal(await code.count(), 0);
    await join.click();
    await result.getByText('anna@vector.example.test', { exact: true }).waitFor();

    await page.getByRole('tab', { name: 'Сравнение регистрации' }).click();
    const comparison = frame('comparison');
    await comparison.locator('[data-flow=mos]').waitFor();
    assert.deepEqual(await comparison.locator('[data-flow]').evaluateAll(buttons => buttons.map(b => b.dataset.flow)),
      ['mos', 'ep', 'orb']);
    await comparison.locator('[data-flow=orb]').click();
    await page.getByRole('tab', { name: 'Схемы' }).click();
    const schemes = frame('schemes');
    await schemes.locator('[data-registration-schemes]').waitFor();
    for (const [group, count] of [['letter', 9], ['brief', 2]]) {
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
    console.log('Registration stand: 2 variants, 3 comparisons, invitation scenarios and recovery, 11 diagrams in two layouts, BPMN/SVG, mobile and archive.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
