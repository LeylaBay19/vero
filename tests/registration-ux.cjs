const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PROTOTYPE_BROWSER || undefined,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    const network = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:/, route => {
      network.push(route.request().url());
      return route.abort();
    });
    await page.goto(pathToFileURL(path.resolve('registration-ux.html')).href);
    assert.equal(await page.locator('#codex-visualization').getAttribute('sandbox'), 'allow-scripts');

    const frame = page.frameLocator('#codex-visualization');
    const item = selector => frame.locator(selector);
    const action = name => item(`[data-action="${name}"]`).click();
    const submit = name => item(`[data-form="${name}"] button[type="submit"]`).click();
    const screen = name => item(`[data-screen="${name}"]`).waitFor();
    const fill = () => item('#fill').click();
    async function scenario(name) {
      if (['invite-expired', 'invite-revoked'].includes(name)) {
        // The failure fixtures remain testable without offering them in the demo.
        await item('#scenario').evaluate((select, value) => {
          if (![...select.options].some(option => option.value === value)) {
            select.add(new Option(value, value));
          }
        }, name);
      }
      await item('#scenario').selectOption(name);
    }
    const heading = async text => assert.equal(await item('main h1').textContent(), text);

    // Account creation keeps the confirmed address and offers organization connection before showing the certificate.
    await action('register');
    await item('#email').fill(' director@example.test ');
    await item('#email').press('Enter');
    assert.equal(await item('[data-action=expire-mail]').count(), 0);
    await action('resend');
    assert.match(await item('main').innerText(), /director@example.test/);
    await action('open-mail');
    await screen('password');
    await fill();
    await item('#terms').check();
    await submit('password');
    await screen('company-intro');
    await heading('Аккаунт создан');
    assert.equal(await item('#certificate').count(), 0);
    await action('connect-company');
    await screen('connect-company');
    assert.equal(await item('main h1').evaluate(el => document.activeElement === el), true);

    await item('#certificate').selectOption('employee');
    await submit('certificate');
    assert.match(await item('#error').innerText(), /генерального директора/);
    await item('#certificate').selectOption('expired');
    await submit('certificate');
    assert.match(await item('#error').innerText(), /истёк/);
    await item('#certificate').selectOption('valid');
    await submit('certificate');
    await item('#contactEmail').fill('invalid');
    await submit('application');
    assert.equal(await item('#contactEmail').getAttribute('aria-invalid'), 'true');
    await item('#contactEmail').fill('office@example.test');
    await item('#confirm').check();
    await item('#kpp').fill('770501001');
    assert.equal(await item('#confirm').isChecked(), false);
    await item('#confirm').check();
    await submit('application');
    await heading('Заявка на подключение на проверке');
    assert.equal(await item('[data-action="done"]').count(), 0);
    await action('reject');
    await heading('Проверка не пройдена');

    // A return to the same account retains the submitted contacts.
    await item('#logout').click();
    await fill();
    await submit('login');
    await heading('Проверка не пройдена');
    await action('connect-company');
    await fill();
    await submit('certificate');
    assert.equal(await item('#contactEmail').inputValue(), 'office@example.test');
    assert.equal(await item('#kpp').inputValue(), '770501001');
    await item('#confirm').check();
    await submit('application');
    await action('approve');
    await action('done');
    await heading('Регистрация завершена');
    assert.match(await item('main').innerText(), /генеральный директор/);

    // A repeat attempt keeps the login and Mos ID binds to that account.
    await item('#logout').click();
    await action('register');
    await submit('register');
    await screen('login');
    assert.equal(await item('#email').inputValue(), 'director@example.test');
    await action('mos');
    await submit('mos');
    assert.equal(await item('#email').getAttribute('readonly'), '');
    await fill();
    await submit('login');
    assert.match(await item('main').innerText(), /генеральный директор/);
    await item('#logout').click();
    await action('mos');
    await submit('mos');
    await heading('Вход выполнен');
    assert.match(await item('main').innerText(), /генеральный директор/);

    await scenario('invite-new');
    assert.equal(await item('#email').inputValue(), 'employee@example.test');
    assert.equal(await item('#email').getAttribute('readonly'), '');
    await fill();
    await item('#terms').check();
    await submit('invite-signup');
    await screen('accept-invite');
    assert.match(await item('main').innerText(), /ООО «Пример»/);
    await action('accept');
    await heading('Вы присоединились к организации');

    await scenario('invite-existing');
    assert.equal(await item('[data-form="invite-signup"]').count(), 0);
    await action('login');
    await action('recover');
    await submit('recover');
    assert.equal(await item('[data-action=expire-mail]').count(), 0);
    await action('resend');
    await action('open-mail');
    await item('#password').fill('Replaced-2026!');
    await item('#repeat').fill('Replaced-2026!');
    await submit('password');
    await action('login');
    assert.equal(await item('#email').inputValue(), 'employee@example.test');
    await fill();
    await submit('login');
    assert.match(await item('#error').innerText(), /Проверьте/);
    await item('#password').fill('Replaced-2026!');
    await submit('login');
    await screen('accept-invite');
    await action('accept');
    await heading('Вы присоединились к организации');

    for (const [fixture, title] of [
      ['invite-expired', 'Срок приглашения истёк'],
      ['invite-revoked', 'Приглашение отозвано'],
    ]) {
      await scenario(fixture);
      await heading(title);
      await action('leave-invite');
      await fill();
      await submit('login');
      await heading('Вход выполнен');
      assert.doesNotMatch(await item('main').innerText(), /Роль|ООО/);
    }

    // The alternate new-account route reaches the same organization step.
    await scenario('invite-expired');
    await action('leave-invite');
    await action('mos');
    await item('#terms').check();
    await submit('mos');
    await heading('Аккаунт создан');

    for (const width of [390, 320, 1280]) {
      await page.setViewportSize({ width, height: 720 });
      await scenario('invite-new');
      assert.ok(await item('#viewport').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      assert.equal(await item('main h1').evaluate(el => document.activeElement === el), true);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    console.log('Registration UX passed: director and employee registration, application retry and approval, account linking, recovery, invalid invitations, responsive viewport and sandbox.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
