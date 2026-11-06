const main = document.getElementById('kontur-flow');
const demoCode = '123456';
const employee = {name: 'Анна Петрова', department: 'Операции', contact: 'anna@vector.example.test', mobile: '+79000000001'};
const newEmployee = {name: 'Мария Иванова', department: 'Логистика', contact: 'maria@vector.example.test', mobile: '+79000000002'};
const demoAccount = {id: 'anna', name: employee.name, login: 'anna@example.test', mobile: employee.mobile, password: 'Example-2026!'};
const initialState = () => ({screen: 'admin', accounts: [{...demoAccount}], invitation: null, signed: false});
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
  const {name, department, role} = state.invitation;
  return `<div class="summary"><strong>ООО «Вектор»</strong><br>${escape(name)} · ${escape(department)}<br>ОССиГ · ${escape(role)}</div>`;
}

function delivery(channel) {
  const isMail = channel === 'email';
  const address = isMail ? state.invitation.contact : state.invitation.mobile;
  return `<p class="muted">${isMail ? 'Письмо' : 'СМС'} для ${escape(address)}</p>`
    + invitationSummary()
    + actions([action('Принять приглашение', 'accept', true)]);
}

function render() {
  const {screen, invitation, account, signed} = state;
  let title = '';
  let body = '';

  if (screen === 'admin') {
    title = 'Пригласить сотрудника';
    body = '<p class="muted">Кабинет компании · ООО «Вектор»</p>'
      + form('invite',
        '<label class="field">Карточка сотрудника<select name="employee"><option value="manual">Заполнить вручную</option><option value="directory">Анна Петрова · Операции</option></select></label>'
        + field('ФИО сотрудника', 'name') + field('Подразделение', 'department')
        + '<label class="field">Роль в ОССиГ<select name="role"><option>Специалист</option><option>Наблюдатель</option></select></label>'
        + '<fieldset><legend>Куда отправить приглашение</legend><label><input name="sendEmail" type="checkbox" checked> Электронная почта</label><label><input name="sendSms" type="checkbox"> СМС</label></fieldset>'
        + field('Почта для приглашения', 'contact', 'email')
        + field('Телефон для приглашения', 'mobile', 'tel', '', 'inputmode="tel"'), 'Отправить приглашение');
  } else if (screen === 'sent') {
    title = 'Приглашение отправлено';
    const mail = invitation.channels.includes('email') ? action('Открыть письмо', 'mail', true) : '';
    const sms = invitation.channels.includes('sms') ? action('Открыть СМС', 'sms', !mail) : '';
    body = invitationSummary() + actions([mail, sms]);
  } else if (screen === 'mail' || screen === 'sms') {
    title = 'Приглашение в ВЕРО';
    body = delivery(screen);
  } else if (screen === 'choice') {
    title = 'Присоединиться к компании';
    body = invitationSummary()
      + actions([action('Зарегистрироваться', 'register', true), action('Войти в свой аккаунт', 'login')]);
  } else if (screen === 'register') {
    title = 'Создать аккаунт ВЕРО';
    const viaEmail = state.delivery === 'mail';
    body = form('register',
      field(viaEmail ? 'Почта приглашения' : 'Телефон приглашения', 'contact', viaEmail ? 'email' : 'tel',
        viaEmail ? invitation.contact : invitation.mobile, 'readonly')
      + field('Придумайте пароль', 'password', 'password', '', 'autocomplete="new-password" minlength="8"'), 'Продолжить')
      + actions([action('Войти в свой аккаунт', 'login')]);
  } else if (screen === 'login') {
    title = 'Войти в ВЕРО';
    body = form('password',
      field('Почта или телефон аккаунта', 'login', 'text', '', 'autocomplete="username"')
      + field('Пароль', 'password', 'password', '', 'autocomplete="current-password"'), 'Войти')
      + actions([action('Войти по коду из письма', 'email-code'), action('Войти по коду из СМС', 'sms-code'),
        action('Войти по сертификату', 'certificate'), invitation && !invitation.used ? action('Создать аккаунт', 'register') : '']);
  } else if (screen === 'email-code' || screen === 'sms-code') {
    const viaEmail = screen === 'email-code';
    title = viaEmail ? 'Войти по электронной почте' : 'Войти по телефону';
    body = form(screen, field(viaEmail ? 'Почта аккаунта' : 'Телефон аккаунта', 'login', viaEmail ? 'email' : 'tel'), 'Получить код')
      + actions([action('Другой способ входа', 'login')]);
  } else if (screen === 'certificate') {
    title = 'Войти по сертификату';
    body = form('certificate',
      '<label class="field">Сертификат<select name="certificate" required><option value="">Выберите сертификат</option><option value="demo">Анна Петрова · демонстрационный сертификат</option></select></label>', 'Войти')
      + actions([action('Другой способ входа', 'login')]);
  } else if (screen === 'profile') {
    title = 'Проверьте данные аккаунта';
    body = form('profile',
      field('ФИО', 'name', 'text', state.pendingAccount?.name ?? invitation.name)
      + field('Телефон', 'mobile', 'tel', state.pendingAccount?.mobile || invitation.mobile, 'autocomplete="tel"')
      + '<label><input type="checkbox" name="consent" required> Согласен на обработку персональных данных</label>', 'Получить код')
      + actions([action('Войти в свой аккаунт', 'login')]);
  } else if (screen === 'code') {
    title = 'Введите код';
    body = `<p>Код отправлен на <strong>${escape(state.challenge.address)}</strong>.</p>`
      + form('code', field('Код', 'code', 'text', '', 'inputmode="numeric" autocomplete="one-time-code" maxlength="6"'), 'Подтвердить')
      + '<p class="muted">В демонстрации код можно подставить кнопкой «Заполнить пример».</p>';
  } else if (screen === 'done') {
    title = signed ? 'Доступ к компании открыт' : 'Вы вышли из аккаунта';
    body = signed ? invitationSummary() + `<p>Аккаунт ВЕРО · ${escape(account.login || account.mobile)}</p>`
      + actions([action('Выйти', 'sign-out')]) : actions([action('Войти в ВЕРО', 'login', true)]);
  }

  main.innerHTML = `<h1 tabindex="-1">${title}</h1><p class="error" role="alert" hidden></p>${body}`;
}

function show(screen) {
  state.screen = screen;
  render();
  main.querySelector('h1').focus();
}

function error(message) {
  const alert = main.querySelector('[role=alert]');
  alert.textContent = message;
  alert.hidden = false;
}

function fillEmployee(formElement) {
  for (const key of ['name', 'department', 'contact', 'mobile']) {
    formElement.elements[key].value = employee[key];
  }
}

function finish(account) {
  const intended = state.invitation.acceptedBy || state.invitation.accountId;
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
      const channels = [fields.has('sendEmail') && 'email', fields.has('sendSms') && 'sms'].filter(Boolean);
      if (!channels.length) return error('Выберите электронную почту, СМС или оба способа.');
      if (!read('name') || !read('department')) return error('Укажите ФИО и подразделение сотрудника.');
      if (channels.includes('sms') && !/^\d{10,15}$/.test(phone(read('mobile')))) return error('Укажите телефон для СМС.');
      state.invitation = {
        name: read('name'), department: read('department'), role: read('role'), channels,
        contact: email(read('contact')), mobile: read('mobile'), used: false,
        accountId: read('employee') === 'directory' ? demoAccount.id : null,
      };
      return show('sent');
    }
    case 'register': {
      const viaEmail = state.delivery === 'mail';
      if (invitation.used || invitation.accountId || findAccount(viaEmail ? invitation.contact : invitation.mobile)) {
        return error('Аккаунт с этим контактом уже есть. Войдите в него.');
      }
      if (password.length < 8) return error('Введите пароль длиной от восьми символов.');
      state.pendingAccount = {id: 'new', name: invitation.name, login: viaEmail ? invitation.contact : '', mobile: invitation.mobile, password};
      return show('profile');
    }
    case 'password': {
      const account = findAccount(read('login'));
      if (!account || account.password !== password) return error('Проверьте логин и пароль.');
      return finish(account);
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
      return finish(state.accounts.find(account => account.id === demoAccount.id));
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
      return finish(state.challenge.purpose === 'profile' ? state.pendingAccount : state.challenge.account);
  }
}

function findAccount(contact) {
  if (!contact) return undefined;
  return state.accounts.find(account => (account.login && email(contact) === account.login) ||
    (account.mobile && phone(contact) === phone(account.mobile)));
}

function updateDeliveryFields(formElement) {
  formElement.elements.contact.required = formElement.elements.sendEmail.checked;
  formElement.elements.mobile.required = formElement.elements.sendSms.checked;
}

main.addEventListener('change', event => {
  const {name, form: formElement, value} = event.target;
  if (name === 'employee' && value === 'directory') fillEmployee(formElement);
  if (name === 'sendEmail' || name === 'sendSms') updateDeliveryFields(formElement);
});
main.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.type === 'submit') {
    event.preventDefault();
    if (button.form.dataset.form === 'invite') updateDeliveryFields(button.form);
    submit(button.form);
    return;
  }
  const key = button.dataset.action;
  if (key === 'accept') {
    state.delivery = state.screen;
    const contact = state.delivery === 'mail' ? state.invitation.contact : state.invitation.mobile;
    state.invitation.accountId ??= findAccount(contact)?.id;
    return show(state.invitation.used ? 'login' : 'choice');
  }
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
    if (formElement.dataset.form === 'invite') updateDeliveryFields(formElement);
    submit(formElement);
  }
});

function fillExample() {
  const formElement = main.querySelector('form');
  if (!formElement) return;
  const {screen, pendingAccount} = state;
  if (screen === 'admin') {
    for (const key of ['name', 'department', 'contact', 'mobile']) {
      if (!formElement.elements[key].value) formElement.elements[key].value = newEmployee[key];
    }
    return;
  }
  const account = findAccount(formElement.elements.login?.value) || state.account || demoAccount;
  const login = screen === 'sms-code' ? account.mobile : account.login || account.mobile;
  const values = {login, password: screen === 'register' ? demoAccount.password : account.password,
    name: pendingAccount?.name, mobile: '+79000000002', code: demoCode, certificate: 'demo'};
  for (const [key, value] of Object.entries(values)) {
    const input = formElement.elements[key];
    if (input && !input.value && value) input.value = value;
  }
}

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
  scope: () => 'kontur',
  read: () => ({signature: [state.screen, state.signed].join('|'), model: state}),
  write: model => { state = model; render(); },
});
