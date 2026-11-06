'use strict';

const byId = id => document.getElementById(id);
const main = byId('main');
const directorEmail = 'director@example.test';
const invitedEmail = 'employee@example.test';
const demoPassword = 'Example-2026!';
const company = 'ООО «Пример»';
const employeeRole = 'Сотрудник организации';
const demoAccounts = new Map();
const demoContacts = { contactEmail: 'office@example.test', phone: '+7 900 123-45-67', site: 'https://example.test', kpp: '770501001', shortName: company };
const companyFields = [
  ['contactEmail', 'Контактный email', 'email', 'autocomplete="email"'],
  ['phone', 'Телефон', 'tel', 'autocomplete="tel"'],
  ['site', 'Сайт', 'url', 'placeholder="https://example.ru"'],
  ['kpp', 'КПП', 'text', 'inputmode="numeric" maxlength="9"'],
  ['shortName', 'Сокращённое наименование', 'text', 'maxlength="160"'],
];
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const normalizeEmail = email => email.trim().toLowerCase();
const validEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

let state;

function newAccount(email, password, mos = false) {
  const account = { email, password, mos, membership: null, application: null };
  demoAccounts.set(email, account);
  return account;
}

function reset() {
  demoAccounts.clear();
  const scenario = byId('scenario').value;
  const invited = scenario.startsWith('invite-');
  const invitationStatus = scenario === 'invite-expired' ? 'expired' : scenario === 'invite-revoked' ? 'revoked' : 'active';
  state = {
    screen: invited ? 'invite' : 'login',
    email: invited ? invitedEmail : '',
    invite: invited,
    invitationStatus,
    account: null,
    contacts: {},
    mail: null,
    mosLink: false,
  };
  if (scenario === 'director-existing') {
    newAccount(directorEmail, demoPassword).membership = 'Генеральный директор';
    state.email = directorEmail;
  }
  if (invited && scenario !== 'invite-new') newAccount(invitedEmail, demoPassword);
  render();
}

const button = (label, action, variant = 'secondary') =>
  `<button type="button" class="${variant}" data-action="${action}">${label}</button>`;
const actions = (...items) => `<div class="actions">${items.join('')}</div>`;
const summary = (heading, description = '') =>
  `<div class="notice"><strong>${heading}</strong>${description ? `<div>${description}</div>` : ''}</div>`;

function field(id, label, type = 'text', value = '', attributes = '') {
  const input = `<input id="${id}" name="${id}" type="${type}" value="${escape(value)}" ${attributes}>`;
  const control = type === 'password'
    ? `<span class="password">${input}<button type="button" data-show-password="${id}" aria-label="Показать ${label.toLowerCase()}" aria-pressed="false">Показать</button></span>`
    : input;
  return `<div class="field"><label for="${id}">${label}</label>${control}</div>`;
}
const emailField = (locked = false) => field('email', 'Email', 'email', state.email, `required autocomplete="username" ${locked ? 'readonly' : ''}`);
const passwordField = (fresh = false) => field('password', fresh ? 'Придумайте пароль' : 'Пароль', 'password', '',
  `required autocomplete="${fresh ? 'new-password' : 'current-password'}" ${fresh ? 'minlength="8" aria-describedby="password-hint"' : ''}`);
const passwordFields = () => `<p class="small" id="password-hint">Пароль должен содержать не менее 8 символов.</p>${passwordField(true)}${field('repeat', 'Повторите пароль', 'password', '', 'required autocomplete="new-password"')}`;
const check = (id, label) => `<label class="check"><input id="${id}" name="${id}" type="checkbox" required><span>${label}</span></label>`;
const terms = () => check('terms', 'Принимаю условия использования ВЕРО и обработки персональных данных.');
const form = (name, fields, submit) => `<form data-form="${name}" novalidate>${fields}<p class="error" id="error" role="alert" hidden></p><div class="actions"><button class="primary" type="submit">${submit}</button></div></form>`;
const details = rows => `<dl class="details">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`;

function inviteSummary() {
  return summary(company, `Роль после принятия — ${employeeRole.toLowerCase()}.<br>Приглашение для ${invitedEmail}.`);
}

function applicationData() {
  return `<fieldset><legend>Данные организации</legend>${details([
    ['Наименование', company], ['ИНН', '7705012345'], ['ОГРН', '1237700123456'],
    ['Юридический адрес', 'Москва, Примерная улица, д. 1'],
  ])}</fieldset><fieldset><legend>Владелец сертификата УКЭП</legend>${details([
    ['ФИО', 'Иванов Иван Иванович'], ['ИНН', '770500123456'],
    ['Основание', 'Генеральный директор'], ['Сертификат действителен до', '31.12.2027'],
  ])}</fieldset>`;
}

const screens = {
  login() {
    const invited = state.invite;
    const linking = state.mosLink;
    const context = invited ? inviteSummary() : linking ? summary('Этот email уже зарегистрирован', 'Войдите в существующий аккаунт, чтобы привязать mos.ru.') : '';
    const alternatives = invited
      ? actions(button('Назад к приглашению', 'invite'))
      : linking ? actions(button('Отменить привязку', 'cancel-mos'))
      : actions(button('Войти через mos.ru', 'mos')) + '<div class="inline">Нет аккаунта? ' + button('Зарегистрироваться', 'register', 'link') + '</div>';
    return ['Войти в ВЕРО', context + form('login', emailField(invited || linking) + passwordField(), linking ? 'Войти и привязать mos.ru' : 'Войти') +
      '<div class="inline">' + button('Забыли пароль?', 'recover', 'link') + '</div>' + alternatives];
  },
  register() {
    return ['Регистрация руководителя', '<p>Укажите email. После подтверждения адреса вы сможете задать пароль и подключить организацию.</p>' +
      form('register', emailField(), 'Получить письмо') + actions(button('Вернуться ко входу', 'login'))];
  },
  recover() {
    return ['Восстановить пароль', form('recover', emailField(state.invite || state.mosLink), 'Получить письмо') + actions(button('Вернуться ко входу', 'login'))];
  },
  mail() {
    const { purpose, resent, expired } = state.mail;
    const isReset = purpose === 'recover';
    const heading = expired ? 'Ссылка недействительна' : 'Проверьте почту';
    const message = expired ? 'Запросите новое письмо и откройте последнюю ссылку.' :
      (isReset ? 'Если аккаунт существует, ссылка для смены пароля придёт на ' : 'Ссылка для подтверждения отправлена на ') + `<strong>${escape(state.email)}</strong>.`;
    const canOpen = !isReset || demoAccounts.has(state.email);
    return [heading, `<p>${message}</p>${resent ? '<p role="status">Новое письмо запрошено. Используйте последнюю ссылку.</p>' : ''}` +
      actions(button('Отправить письмо повторно', 'resend', expired ? 'primary' : 'secondary'),
        !state.invite && !state.mosLink ? button('Изменить email', purpose) : button('Вернуться ко входу', 'login')) +
      (expired ? '' : `<div class="demo-action"><p class="small">Демонстрация письма</p>${canOpen ? actions(button('Открыть ссылку из письма', 'open-mail', 'primary')) : '<p class="small">В демонстрации для этого адреса письма нет.</p>'}</div>`)];
  },
  password() {
    const recovery = state.mail.purpose === 'recover';
    return [recovery ? 'Задайте новый пароль' : 'Задайте пароль',
      summary(recovery ? 'Восстановление доступа' : 'Email подтверждён', escape(state.email)) +
      form('password', passwordFields() + (recovery ? '' : terms()), recovery ? 'Сохранить пароль' : 'Создать аккаунт')];
  },
  'password-saved'() {
    return ['Пароль изменён', '<p>Войдите с новым паролем. Email для входа остался прежним.</p>' + actions(button('Войти', 'login', 'primary'))];
  },
  mos() {
    return ['Вход через mos.ru', summary('Демонстрация Mos ID', escape(directorEmail)) +
      '<p>Для входа ВЕРО использует идентификатор аккаунта и email. Данные организации проверяются отдельно при подключении через УКЭП.</p>' +
      form('mos', demoAccounts.has(directorEmail) ? '' : terms(), 'Продолжить через mos.ru') +
      actions(button('Вернуться ко входу', 'cancel-mos'))];
  },
  invite() {
    if (state.invitationStatus !== 'active') {
      const title = { expired: 'Срок приглашения истёк', revoked: 'Приглашение отозвано', accepted: 'Приглашение уже принято' }[state.invitationStatus];
      return [title, `<p>${state.invitationStatus === 'accepted' ? 'Войдите в свой аккаунт, чтобы продолжить.' : 'Для доступа к организации попросите руководителя или администратора прислать новое приглашение.'}</p>` +
        actions(button('Войти без приглашения', 'leave-invite', 'primary'))];
    }
    const exists = demoAccounts.has(invitedEmail);
    return ['Вас пригласили в организацию', inviteSummary() +
      (exists
        ? '<p>На этот email уже есть аккаунт ВЕРО. Войдите, чтобы принять приглашение.</p>' + actions(button('Войти', 'login', 'primary'))
        : '<p>Создайте аккаунт на email приглашения и задайте пароль для входа.</p>' +
          form('invite-signup', emailField(true) + passwordFields() + terms(), 'Создать аккаунт'))];
  },
  'accept-invite'() {
    return ['Принять приглашение', inviteSummary() +
      actions(button('Принять приглашение', 'accept', 'primary'), button('Продолжить без приглашения', 'leave-invite'))];
  },
  'company-intro'() {
    return [state.justCreated ? 'Аккаунт создан' : 'Подключите организацию',
      '<p>Подключите организацию с помощью УКЭП генерального директора.</p>' +
      actions(button('Подключить через УКЭП', 'connect-company', 'primary'))];
  },
  'connect-company'() {
    return ['Выберите сертификат УКЭП',
      '<p>Чтобы зарегистрировать компанию, выберите действующий сертификат УКЭП генерального директора.</p>' +
      form('certificate', '<label class="field" for="certificate">Сертификат УКЭП<select id="certificate" name="certificate" required><option value="">Выберите сертификат</option><option value="valid">Иванов Иван Иванович · ООО «Пример»</option><option value="expired">Сертификат руководителя · просрочен</option><option value="employee">Сертификат сотрудника</option></select></label>', 'Проверить сертификат')];
  },
  'review-company'() {
    const fields = companyFields.map(([id, label, type, attrs]) => field(id, label, type, state.contacts[id], attrs)).join('');
    return ['Проверьте данные организации', applicationData() +
      form('application', `<fieldset><legend>Контакты и дополнительные сведения</legend><p class="small">Заполните нужные поля, если знаете значения.</p>${fields}</fieldset>` +
        check('confirm', 'Я проверил(а) данные организации.'), 'Отправить на проверку') +
      actions(button('Выбрать другой сертификат', 'connect-company'))];
  },
  'company-status'() {
    const { status, contacts } = state.account.application;
    const labels = {
      pending: ['Заявка на подключение на проверке', 'Платформа проверяет данные организации и полномочия руководителя.'],
      approved: ['Организация подключена', 'Полномочия генерального директора подтверждены.'],
      rejected: ['Проверка не пройдена', 'Проверьте сведения о руководителе и выберите действующий сертификат.'],
    };
    const [title, description] = labels[status];
    const snapshot = companyFields.filter(([id]) => contacts[id]).map(([id, label]) => [label, contacts[id]]);
    const next = status === 'pending'
      ? `<div class="demo-action"><p class="small">Решение платформы · демонстрация</p>${actions(button('Одобрить заявку', 'approve'), button('Отклонить заявку', 'reject'))}</div>`
      : status === 'rejected' ? actions(button('Выбрать другой сертификат', 'connect-company', 'primary')) : actions(button('Завершить регистрацию', 'done', 'primary'));
    return [title, summary(company, description) + `<details><summary>Данные заявки</summary>${applicationData()}${snapshot.length ? details(snapshot) : ''}</details>` + next];
  },
  done() {
    let title = 'Вход выполнен';
    if (state.joined) title = 'Вы присоединились к организации';
    if (state.completedCompany) title = 'Регистрация завершена';
    const membership = state.account.membership;
    return [title, membership
      ? summary(company, `Роль — ${membership.toLowerCase()}.`)
      : summary(escape(state.account.email), 'Вы вошли в свой аккаунт.')];
  },
};

function render() {
  const [title, body] = screens[state.screen]();
  main.classList.toggle('wide', ['review-company', 'company-status'].includes(state.screen));
  main.innerHTML = `<section class="card" data-screen="${state.screen}"><h1 tabindex="-1">${title}</h1>${body}</section>`;
  byId('logout').hidden = !state.account;
  byId('viewport').scrollTop = 0;
  main.querySelector('h1').focus({ preventScroll: true });
}

function go(screen) {
  state.screen = screen;
  render();
}

function error(id, message) {
  const notice = byId('error');
  notice.textContent = message;
  notice.hidden = false;
  const input = byId(id);
  if (input) {
    const hint = input.getAttribute('aria-describedby');
    input.setAttribute('aria-describedby', [...new Set([...(hint?.split(' ') || []), 'error'])].join(' '));
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }
}

function signedIn(account) {
  state.account = account;
  if (state.invite) {
    if (account.email === invitedEmail && state.invitationStatus === 'active') return go('accept-invite');
    state.account = null;
    return go('invite');
  }
  if (account.membership || (state.leftInvitation && account.email === invitedEmail)) return go('done');
  if (account.application) {
    state.contacts = { ...account.application.contacts };
    return go('company-status');
  }
  go('company-intro');
}

function startMail(purpose) {
  state.mail = { purpose, expired: false, verified: false };
  go('mail');
}

function passwordValid(data) {
  if (data.password.length < 8 || !data.password.trim()) {
    error('password', 'Введите пароль длиной не менее 8 символов.');
    return false;
  }
  if (data.password !== data.repeat) {
    error('repeat', 'Пароли не совпадают.');
    return false;
  }
  return true;
}

function saveApplication(data) {
  const contacts = Object.fromEntries(companyFields.map(([id]) => [id, data[id].trim()]));
  state.contacts = contacts;
  const { contactEmail, phone, site, kpp } = contacts;
  if (contactEmail && !validEmail(contactEmail)) return error('contactEmail', 'Проверьте контактный email.');
  if (phone && (!/^[+()\s\d-]+$/.test(phone) || !/^\d{10,15}$/.test(phone.replace(/\D/g, '')))) return error('phone', 'Укажите телефон с кодом страны или города.');
  if (site) {
    try {
      const url = new URL(site);
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.')) throw new Error();
    } catch {
      return error('site', 'Укажите адрес сайта в формате https://example.ru.');
    }
  }
  if (kpp && !/^\d{9}$/.test(kpp)) return error('kpp', 'КПП должен содержать 9 цифр.');
  if (!data.confirm) return error('confirm', 'Подтвердите, что проверили данные.');
  state.account.application = { contacts, status: 'pending' };
  go('company-status');
}

main.addEventListener('submit', event => {
  event.preventDefault();
  const kind = event.target.dataset.form;
  const data = Object.fromEntries(new FormData(event.target));
  if ('email' in data) {
    state.email = normalizeEmail(data.email);
    if (!validEmail(state.email)) return error('email', 'Укажите email в формате name@example.ru.');
  }
  if (kind === 'register') {
    if (demoAccounts.has(state.email)) {
      go('login');
      return error('email', 'Аккаунт с этой почтой уже есть. Введите пароль или восстановите его.');
    }
    return startMail('register');
  }
  if (kind === 'recover') return startMail('recover');
  if (kind === 'login') {
    const account = demoAccounts.get(state.email);
    if (!account?.password || data.password !== account.password) return error('password', 'Проверьте email и пароль или восстановите доступ.');
    if (state.mosLink) {
      account.mos = true;
      state.mosLink = false;
    }
    return signedIn(account);
  }
  if (kind === 'mos') {
    const account = demoAccounts.get(directorEmail);
    state.email = directorEmail;
    if (account?.mos) return signedIn(account);
    if (account) {
      state.mosLink = true;
      return go('login');
    }
    if (!data.terms) return error('terms', 'Примите условия, чтобы создать аккаунт.');
    state.justCreated = true;
    return signedIn(newAccount(directorEmail, null, true));
  }
  if (kind === 'invite-signup' || kind === 'password') {
    const recovery = kind === 'password' && state.mail?.purpose === 'recover';
    if (!passwordValid(data)) return;
    if (!recovery && !data.terms) return error('terms', 'Примите условия, чтобы создать аккаунт.');
    if (kind === 'invite-signup' && (state.invitationStatus !== 'active' || state.email !== invitedEmail)) return go('invite');
    if (kind === 'password' && !state.mail?.verified) return go('mail');
    if (recovery) {
      demoAccounts.get(state.email).password = data.password;
      state.mail = null;
      return go('password-saved');
    }
    if (demoAccounts.has(state.email)) return go('login');
    state.justCreated = true;
    state.mail = null;
    return signedIn(newAccount(state.email, data.password));
  }
  if (kind === 'certificate') {
    if (!data.certificate) return error('certificate', 'Выберите сертификат генерального директора.');
    if (data.certificate === 'expired') return error('certificate', 'Срок действия сертификата истёк. Выберите действующий.');
    if (data.certificate === 'employee') return error('certificate', 'Нужен сертификат генерального директора.');
    return go('review-company');
  }
  if (kind === 'application') saveApplication(data);
});

// The iframe sandbox blocks native form submission. Route demo forms locally.
function submitDemoForm(event, form) {
  event.preventDefault();
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

main.addEventListener('click', event => {
  const button = event.target.closest('button[type="submit"]');
  if (button?.form) submitDemoForm(event, button.form);
});

main.addEventListener('keydown', event => {
  const input = event.target;
  if (event.key === 'Enter' && !event.isComposing && input.matches('input:not([type="checkbox"])') && input.form) {
    submitDemoForm(event, input.form);
  }
});

main.addEventListener('input', event => {
  const { name, value } = event.target;
  if (name === 'email' && !event.target.readOnly) state.email = value;
  if (state.screen === 'review-company' && companyFields.some(([id]) => id === name)) {
    state.contacts[name] = value;
    byId('confirm').checked = false;
  }
});

const commands = {
  login: () => go('login'),
  register: () => go('register'),
  recover: () => go('recover'),
  mos: () => go('mos'),
  'cancel-mos': () => { state.mosLink = false; go('login'); },
  invite: () => go('invite'),
  'leave-invite': () => {
    state.invite = false;
    state.leftInvitation = true;
    if (state.account) go('done');
    else go('login');
  },
  accept: () => {
    if (state.invitationStatus !== 'active' || state.account?.email !== invitedEmail) return go('invite');
    state.account.membership = employeeRole;
    state.invitationStatus = 'accepted';
    state.invite = false;
    state.joined = true;
    go('done');
  },
  'connect-company': () => go('connect-company'),
  resend: () => { state.mail = { purpose: state.mail.purpose, resent: true, expired: false, verified: false }; render(); },
  'expire-mail': () => { state.mail.expired = true; render(); },
  'open-mail': () => {
    if (state.mail.purpose === 'recover' && !demoAccounts.has(state.email)) return;
    state.mail.verified = true;
    go('password');
  },
  approve: () => {
    state.account.application.status = 'approved';
    state.account.membership = 'Генеральный директор';
    render();
  },
  reject: () => { state.account.application.status = 'rejected'; render(); },
  done: () => { state.completedCompany = true; go('done'); },
};

main.addEventListener('click', event => {
  const control = event.target.closest('button');
  if (!control) return;
  if (control.dataset.showPassword) {
    const input = byId(control.dataset.showPassword);
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    control.textContent = visible ? 'Скрыть' : 'Показать';
    const label = document.querySelector(`label[for="${input.id}"]`).textContent.toLowerCase();
    control.setAttribute('aria-label', `${control.textContent} ${label}`);
    control.setAttribute('aria-pressed', String(visible));
    return;
  }
  commands[control.dataset.action]?.();
});

byId('scenario').addEventListener('change', reset);
byId('reset').addEventListener('click', reset);
byId('logout').addEventListener('click', () => {
  state.account = null;
  state.joined = false;
  state.completedCompany = false;
  state.justCreated = false;
  state.contacts = {};
  go('login');
});

byId('fill').addEventListener('click', () => {
  const defaults = { email: directorEmail, password: demoPassword, repeat: demoPassword, certificate: 'valid', ...demoContacts };
  for (const [id, value] of Object.entries(defaults)) {
    const input = byId(id);
    if (!input || input.value || input.readOnly) continue;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

reset();
