const main = document.getElementById('kontur-flow');
const letterMode = document.body.dataset.variant === 'kontur-letter';
const demoCode = '123456';
const employee = {name: 'Петрова Анна Сергеевна', contact: 'anna@vector.example.test', mobile: '+79000000001'};
const newEmployee = {name: 'Иванова Мария Александровна', contact: 'maria@vector.example.test', mobile: '+79000000002'};
const demoAccount = {id: 'anna', name: employee.name, login: 'anna@example.test', mobile: employee.mobile, password: 'Example-2026!'};
const initialState = () => ({scene: 'sender', screen: 'admin', senderScreen: 'admin', employeeScreen: 'mail',
  accounts: [{...demoAccount}], invitation: null, signed: false});
let state = initialState();

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => (
  {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]
));
const field = (label, name, type = 'text', value = '', extra = '') =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${escape(value)}" required ${extra}></label>`;
const action = (label, key, primary = false) =>
  `<button type="button" data-action="${key}"${primary ? ' class="primary"' : ''}>${label}</button>`;
const actions = buttons => '<div class="actions">' + buttons.join('') + '</div>';
const form = (key, fields, label) => `<form data-form="${key}">${fields}<div class="actions"><button class="primary" type="submit">${label}</button></div></form>`;
const phone = value => String(value ?? '').replace(/[\s()+-]/g, '');
const email = value => String(value ?? '').trim().toLowerCase();

function invitationSummary() {
  return `<div class="summary"><strong>ООО «Вектор»</strong><br>${escape(state.invitation.name)}</div>`;
}

function selectScene(scene) {
  if (scene === state.scene) return;
  state.scene = scene;
  if (scene === 'employee' && !state.invitation) {
    state.invitation = {name: newEmployee.name, contact: newEmployee.contact, used: false};
  }
  show(scene === 'sender' ? state.senderScreen : state.employeeScreen);
}

function render() {
  const {screen, invitation, account, signed} = state;
  let title = '';
  let body = '';

  if (screen === 'admin') {
    title = 'Пригласить сотрудника';
    body = '<p class="muted">Кабинет компании · ООО «Вектор»</p>'
      + form('invite',
        `<label class="field">Карточка сотрудника<select name="employee"><option value="manual">Заполнить вручную</option><option value="directory">${escape(employee.name)}</option></select></label>`
        + field('ФИО сотрудника', 'name', 'text', '', 'autocomplete="name"')
        + field('Почта для приглашения (обязательно)', 'contact', 'email', '', 'autocomplete="email"'), 'Отправить приглашение');
  } else if (screen === 'sent') {
    title = 'Приглашение отправлено';
    body = invitationSummary() + `<p>Письмо для <strong>${escape(invitation.contact)}</strong>.</p>`
      + actions([action('Открыть сценарий сотрудника', 'open-employee', true)]);
  } else if (screen === 'mail') {
    title = 'Приглашение в ВЕРО';
    body = invitationSummary() + actions([action('Принять приглашение', 'accept', true)]);
  } else if (screen === 'choice') {
    title = 'Присоединиться к компании';
    body = invitationSummary()
      + actions([action('Зарегистрироваться', 'register', true), action('Войти в свой аккаунт', 'login')]);
  } else if (screen === 'register') {
    title = 'Создать аккаунт ВЕРО';
    body = form('register',
      field('Почта приглашения', 'contact', 'email', invitation.contact, 'readonly')
      + field('Придумайте пароль', 'password', 'password', '', 'autocomplete="new-password" minlength="8"')
      + (letterMode ? field('Повторите пароль', 'repeat', 'password', '', 'autocomplete="new-password"')
        + '<label><input type="checkbox" name="consent" required> Принимаю условия использования ВЕРО и обработки персональных данных.</label>' : ''),
      letterMode ? 'Присоединиться в качестве сотрудника' : 'Продолжить')
      + actions([action('Войти в свой аккаунт', 'login')]);
  } else if (screen === 'login') {
    title = 'Войти в ВЕРО';
    body = form('password',
      field(letterMode ? 'Логин (email)' : 'Почта или телефон аккаунта', 'login', letterMode ? 'email' : 'text',
        state.suggestedLogin || '', 'autocomplete="username"')
      + field('Пароль', 'password', 'password', '', 'autocomplete="current-password"'), letterMode && !invitation.used && state.suggestedLogin ? 'Войти и присоединиться' : 'Войти')
      + actions([...(letterMode ? [] : [action('Войти по коду из письма', 'email-code'), action('Войти по коду из СМС', 'sms-code'),
        action('Войти по сертификату', 'certificate')]), invitation && !invitation.used && !findAccount(invitation.contact) ? action('Создать аккаунт', 'register') : '']);
  } else if (screen === 'confirm') {
    title = 'Присоединиться к компании';
    body = invitationSummary() + actions([action('Присоединиться в качестве сотрудника', 'join', true)]);
  } else if (screen === 'email-code' || screen === 'sms-code') {
    const viaEmail = screen === 'email-code';
    title = viaEmail ? 'Войти по электронной почте' : 'Войти по телефону';
    body = form(screen, field(viaEmail ? 'Почта аккаунта' : 'Телефон аккаунта', 'login', viaEmail ? 'email' : 'tel'), 'Получить код')
      + actions([action('Другой способ входа', 'login')]);
  } else if (screen === 'certificate') {
    title = 'Войти по сертификату';
    body = form('certificate',
      '<label class="field">Сертификат<select name="certificate" required><option value="">Выберите сертификат</option><option value="demo">Петрова Анна Сергеевна · демонстрационный сертификат</option></select></label>', 'Войти')
      + actions([action('Другой способ входа', 'login')]);
  } else if (screen === 'profile') {
    title = 'Проверьте данные аккаунта';
    body = form('profile',
      field('ФИО', 'name', 'text', state.pendingAccount?.name ?? invitation.name)
      + field('Телефон', 'mobile', 'tel', state.pendingAccount?.mobile || '', 'autocomplete="tel"')
      + '<label><input type="checkbox" name="consent" required> Согласен на обработку персональных данных</label>', 'Получить код')
      + actions([action('Войти в свой аккаунт', 'login')]);
  } else if (screen === 'code') {
    title = state.challenge.purpose === 'invite' ? 'Подтвердите почту приглашения' : 'Введите код';
    body = `<p>Код отправлен на <strong>${escape(state.challenge.address)}</strong>.</p>`
      + form('code', field('Код', 'code', 'text', '', 'inputmode="numeric" autocomplete="one-time-code" maxlength="6"'), 'Подтвердить')
      + (state.challenge.purpose === 'invite' ? actions([action('Отправить код повторно', 'resend')]) : '')
      + '<p class="muted">В демонстрации код можно подставить кнопкой «Заполнить пример».</p>';
  } else if (screen === 'done') {
    title = signed ? 'Доступ к компании открыт' : 'Вы вышли из аккаунта';
    body = signed ? invitationSummary() + `<p>Аккаунт ВЕРО · ${escape(account.login || account.mobile)}</p>`
      + actions([action('Выйти', 'sign-out')]) : actions([action('Войти в ВЕРО', 'login', true)]);
  }

  document.querySelectorAll('[data-scene]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.scene === state.scene));
  });
  main.innerHTML = `<h1 tabindex="-1">${title}</h1><p class="error" role="alert" hidden></p>${body}`;
}

function show(screen) {
  state.screen = screen;
  state[state.scene === 'sender' ? 'senderScreen' : 'employeeScreen'] = screen;
  render();
  main.querySelector('h1').focus();
}

function error(message) {
  const alert = main.querySelector('[role=alert]');
  alert.textContent = message;
  alert.hidden = false;
}

function fillEmployee(formElement) {
  for (const key of ['name', 'contact']) {
    formElement.elements[key].value = employee[key];
  }
}

function finish(account) {
  const intended = state.invitation.acceptedBy || findAccount(state.invitation.contact)?.id;
  if (intended && intended !== account.id) return error('Войдите в аккаунт, которому адресовано приглашение.');
  if (!state.accounts.some(saved => saved.id === account.id)) state.accounts.push(account);
  state.account = account;
  state.signed = true;
  state.invitation.acceptedBy = account.id;
  state.invitation.used = true;
  delete state.pendingAccount;
  delete state.challenge;
  show('done');
}

function afterLogin(account) {
  const {invitation} = state;
  const intended = invitation.acceptedBy || findAccount(invitation.contact)?.id;
  if (intended && intended !== account.id) return error('Войдите в аккаунт, которому адресовано приглашение.');
  if (invitation.used || account.login === invitation.contact) return finish(account);
  return issueCode(invitation.contact, 'invite', account);
}

function issueCode(address, purpose, account) {
  state.challenge = {address, purpose, account};
  show('code');
}

function submit(formElement) {
  if (!formElement.reportValidity()) return;
  const fields = new FormData(formElement);
  const read = key => String(fields.get(key) ?? '').trim();
  const password = String(fields.get('password') ?? '');
  const {invitation} = state;

  switch (formElement.dataset.form) {
    case 'invite': {
      if (!read('name')) return error('Укажите ФИО сотрудника.');
      state.invitation = {name: read('name'), contact: email(read('contact')), used: false};
      state.employeeScreen = 'mail';
      state.signed = false;
      delete state.account;
      delete state.pendingAccount;
      delete state.challenge;
      delete state.suggestedLogin;
      return show('sent');
    }
    case 'register': {
      if (invitation.used || findAccount(invitation.contact)) {
        return error('Аккаунт с этим адресом уже есть. Войдите в него.');
      }
      if (password.length < 8) return error('Введите пароль длиной от восьми символов.');
      if (letterMode && password !== fields.get('repeat')) return error('Пароли не совпадают.');
      state.pendingAccount = {id: `email:${invitation.contact}`, name: invitation.name, login: invitation.contact, mobile: '', password};
      return letterMode ? finish(state.pendingAccount) : show('profile');
    }
    case 'password': {
      const account = findAccount(read('login'));
      if (!account || account.password !== password) return error('Проверьте логин и пароль.');
      return afterLogin(account);
    }
    case 'email-code':
    case 'sms-code': {
      const account = findAccount(read('login'));
      if (!account || (formElement.dataset.form === 'email-code' ? email(read('login')) !== account.login : phone(read('login')) !== phone(account.mobile))) {
        return error('Проверьте контакт, указанный в аккаунте ВЕРО.');
      }
      return issueCode(read('login'), 'login', account);
    }
    case 'certificate':
      return afterLogin(state.accounts.find(account => account.id === demoAccount.id));
    case 'profile': {
      const mobile = read('mobile');
      if (!/^\d{10,15}$/.test(phone(mobile))) return error('Укажите телефон для подтверждения.');
      if (!read('name')) return error('Укажите ФИО.');
      if (findAccount(mobile)) return error('Этот телефон уже связан с аккаунтом. Войдите в него.');
      state.pendingAccount = {...state.pendingAccount, name: read('name'), mobile};
      return issueCode(mobile, 'profile');
    }
    case 'code':
      if (read('code') !== demoCode) return error('Код не совпадает. Проверьте и введите его ещё раз.');
      if (state.challenge.purpose === 'invite') return show('confirm');
      if (state.challenge.purpose === 'profile') return finish(state.pendingAccount);
      return afterLogin(state.challenge.account);
  }
}

function findAccount(contact) {
  if (!contact) return undefined;
  return state.accounts.find(account => (account.login && email(contact) === account.login) ||
    (account.mobile && phone(contact) === phone(account.mobile)));
}

main.addEventListener('change', event => {
  const {name, form: formElement, value} = event.target;
  if (name === 'employee' && value === 'directory') fillEmployee(formElement);
});
main.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.type === 'submit') {
    event.preventDefault();
    submit(button.form);
    return;
  }
  const key = button.dataset.action;
  if (key === 'open-employee') return selectScene('employee');
  if (key === 'accept') {
    const account = state.accounts.find(item => item.id === state.invitation.acceptedBy) || findAccount(state.invitation.contact);
    state.suggestedLogin = account?.login || '';
    return show(state.invitation.used || account ? 'login' : 'choice');
  }
  if (key === 'resend') return issueCode(state.challenge.address, 'invite', state.challenge.account);
  if (key === 'join') return finish(state.challenge.account);
  if (key === 'sign-out') {
    state.signed = false;
    return show('done');
  }
  if (key) show(key);
});
main.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.matches('input:not([type=checkbox])')) {
    event.preventDefault();
    const formElement = event.target.form;
    submit(formElement);
  }
});

function fillExample() {
  const formElement = main.querySelector('form');
  if (!formElement) return;
  const {screen, pendingAccount} = state;
  if (screen === 'admin') {
    for (const key of ['name', 'contact']) {
      if (!formElement.elements[key].value) formElement.elements[key].value = newEmployee[key];
    }
    return;
  }
  const account = findAccount(formElement.elements.login?.value) || state.account || demoAccount;
  const login = screen === 'sms-code' ? account.mobile : account.login || account.mobile;
  const values = {login, password: screen === 'register' ? demoAccount.password : account.password,
    name: pendingAccount?.name, mobile: newEmployee.mobile, code: demoCode, certificate: 'demo', repeat: demoAccount.password};
  if (formElement.elements.consent) formElement.elements.consent.checked = true;
  for (const [key, value] of Object.entries(values)) {
    const input = formElement.elements[key];
    if (input && !input.value && value) input.value = value;
  }
}

document.querySelectorAll('[data-scene]').forEach(button => {
  button.addEventListener('click', () => selectScene(button.dataset.scene));
});

document.getElementById('start-over').addEventListener('click', () => {
  state = initialState();
  show('admin');
  history.reset();
});
addEventListener('message', event => {
  if (event.source === parent && event.data?.type === 'vero:fill') fillExample();
});
render();

const history = createPrototypeHistory({
  scope: () => document.body.dataset.variant,
  read: () => ({signature: [state.screen, state.signed].join('|'), model: state}),
  write: model => { state = model; render(); },
});
