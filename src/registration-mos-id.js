/* Registration variant 2. UI demonstration only: no requests or real accounts. */
function createMosRegistration({main, refresh, enter, isAuthenticated}) {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button = (label, action, secondary = false) => `<button type="button" class="${secondary ? 'secondary' : 'primary'}" data-r2-action="${action}">${label}</button>`;
  const field = (label, id, type = 'text', attrs = '') => `<label class="field" for="r2-${id}">${label}<input id="r2-${id}" type="${type}" ${attrs}></label>`;
  const password = (label, id, autocomplete = 'new-password') => `<label class="field" for="r2-${id}">${label}<span class="password-wrap"><input id="r2-${id}" type="password" autocomplete="${autocomplete}"><button type="button" class="password-toggle" data-r2-password="${id}" aria-label="Показать пароль" aria-pressed="false">Показать</button></span></label>`;
  const agreement = '<label class="check"><input id="r2-terms" type="checkbox"><span>Принимаю условия использования ВЕРО и обработки персональных данных.</span></label>';
  const message = '<div id="r2-alert" class="alert" role="alert" hidden></div><div id="r2-status" class="status-msg" role="status" hidden></div>';
  const form = (name, content, label) => `<form data-r2-form="${name}" novalidate>${content}<button class="primary" type="submit">${label}</button></form>`;
  const demoMos = {id:'mos-demo-001', name:'Иванов Иван Иванович', email:'ivan.mos@example.test', phone:'+7 000 000-00-00'};
  let screen, accounts, current, origin, purpose, oneTimePassword, draft, notice, sequence;
  function reset() {
    screen='entry'; accounts=[]; current=null; origin='entry'; purpose='login';
    oneTimePassword=''; draft={}; notice=''; sequence=0;
    if($('r2-mos-outcome'))$('r2-mos-outcome').value='success';
  }
  function show(next) {
    if (screen==='created' && next!=='created') oneTimePassword='';
    screen=next; notice=''; refresh(); main.querySelector('h1,h2')?.focus();
  }
  function error(text, id) {
    const box=$('r2-alert'); if(!box)return;
    box.hidden=false; box.textContent=text;
    if(id){$('r2-'+id)?.setAttribute('aria-invalid','true');$('r2-'+id)?.focus();}
  }
  function openCabinet() {
    if(!current)return;
    oneTimePassword=''; screen=null; enter({...current});
  }
  function startMos(mode) {
    if(mode==='link' && (!isAuthenticated() || !current))return;
    origin=screen||'profile'; purpose=mode; show('mos');
  }
  function finishMos() {
    if(screen!=='mos')return;
    const outcome=$('r2-mos-outcome').value;
    if(outcome==='error')return show('oauth-error');
    if(purpose==='link') {
      if(!current || !isAuthenticated())return show('entry');
      const owner=accounts.find(a=>a.mosId===demoMos.id && a.id!==current.id);
      if(outcome==='conflict' || owner){
        if(!owner)accounts.push({id:'demo-other-account',login:'other_user',email:'other@example.test',password:'Example-2026!',mosId:demoMos.id,provider:'mos_linked',name:demoMos.name,phone:demoMos.phone});
        return show('conflict');
      }
      current.mosId=demoMos.id; current.provider='mos_linked';
      current.name=demoMos.name; current.phone=demoMos.phone;
      return show('linked');
    }
    const found=accounts.find(a=>a.mosId===demoMos.id);
    if(found){current=found;return openCabinet();}
    if(!$('r2-terms')?.checked)return error('Примите условия, чтобы создать аккаунт.','terms');
    sequence+=1;
    current={id:'demo-account-'+sequence,login:'mos_7f2a9c'+String(sequence).padStart(2,'0'),email:demoMos.email,name:demoMos.name,phone:demoMos.phone,password:'Example-2026!',mosId:demoMos.id,provider:'mos_auto'};
    accounts.push(current); oneTimePassword=current.password; show('created');
  }
  function view() {
    if(!screen)return null;
    let title='',body='';
    const back=button('← Назад','back',true);
    if(screen==='entry') {
      title='Войти в ВЕРО';
      body='<p>Используйте Mos ID или свой логин и пароль.</p>'+button('<span class="r2-mos-brand">mos.ru</span> Войти через Mos ID','mos-login')+'<div class="separator">или</div>'+button('Войти по логину и паролю','login',true)+'<p class="signup">Нет аккаунта? <button type="button" class="text-btn" data-r2-action="register">Зарегистрироваться</button></p>';
    }
    if(screen==='login') {
      title='Вход по логину и паролю';
      body=form('login',field('Логин','login','text',`autocomplete="username" value="${esc(draft.login||'')}"`)+password('Пароль','password','current-password'),'Войти')+'<div class="separator">или</div>'+button('Войти через Mos ID','mos-login',true)+'<p class="signup">Нет аккаунта? <button class="text-btn" type="button" data-r2-action="register">Зарегистрироваться</button></p>';
    }
    if(screen==='register') {
      title='Регистрация';
      body=form('register',field('Логин','login','text',`autocomplete="username" value="${esc(draft.login||'')}"`)+field('Email','email','email',`autocomplete="email" value="${esc(draft.email||'')}"`)+password('Пароль','new-password')+'<p class="mini" style="margin:0">Не менее 8 символов.</p>'+password('Повторите пароль','confirm-password')+agreement,'Зарегистрироваться')+'<div class="separator">или</div>'+button('Зарегистрироваться через Mos ID','mos-login',true)+'<p class="signup">Уже есть аккаунт? <button type="button" class="text-btn" data-r2-action="login">Войти</button></p>';
    }
    if(screen==='mos') {
      const returning=accounts.some(a=>a.mosId===demoMos.id);
      title=purpose==='link'?'Подключение Mos ID':'Вход через Mos ID';
      body='<p>Подтвердите вход в аккаунт mos.ru.</p><div class="summary"><strong>'+esc(demoMos.name)+'</strong><span>'+esc(demoMos.email)+'</span></div>'+ (purpose==='link'?'<p>Подключим Mos ID к вашему текущему аккаунту. Логин, организации и права сохранятся.</p>':!returning?agreement:'<p>Вы уже входили с этим Mos ID. Откроется ваш существующий аккаунт.</p>')+button(purpose==='link'?'Подтвердить подключение':'Продолжить','mos-return')+button('Отменить и вернуться','cancel-mos',true);
    }
    if(screen==='created') {
      title='Аккаунт создан';
      body='<div class="r2-success" aria-hidden="true">✓</div><p>Вы вошли через Mos ID. Сохраните логин и пароль, чтобы входить и без mos.ru.</p><div class="r2-credentials"><h3>Данные для входа</h3><label class="field" for="r2-generated-login">Логин<div class="r2-copy-row"><input id="r2-generated-login" readonly value="'+esc(current.login)+'"><button type="button" class="secondary" data-r2-copy="login" aria-label="Копировать логин">Копировать</button></div></label><label class="field" for="r2-generated-password">Пароль<span class="password-wrap"><input id="r2-generated-password" type="password" readonly autocomplete="off" value="'+esc(oneTimePassword)+'"><button type="button" class="password-toggle" data-r2-password="generated-password" aria-label="Показать пароль" aria-pressed="false">Показать</button></span></label><button class="text-btn" type="button" data-r2-copy="password" aria-label="Копировать пароль">Копировать пароль</button></div><div class="r2-warning">Пароль показывается только один раз. Сохраните его в надёжном месте.</div>'+button('Продолжить','cabinet');
    }
    if(screen==='offer') {
      title='Добро пожаловать!';
      body='<div class="r2-success" aria-hidden="true">✓</div><p>Аккаунт создан. Подключите Mos ID, чтобы входить через mos.ru в этот же аккаунт.</p><div class="summary"><strong>Что даёт Mos ID</strong><span>Ещё один способ входа</span><span>Вход без ввода пароля ВЕРО</span></div>'+button('Подключить Mos ID','link')+button('Сделать позже','cabinet',true);
    }
    if(screen==='linked') {
      title='Mos ID подключён';
      body='<div class="r2-success" aria-hidden="true">✓</div><p>Теперь можно входить через mos.ru или по своему логину и паролю. Это один и тот же аккаунт.</p>'+button('Перейти в профиль','cabinet');
    }
    if(screen==='conflict') {
      title='Этот Mos ID уже привязан к другому аккаунту';
      body='<p>Войдите через Mos ID в тот аккаунт или обратитесь в поддержку. Текущий аккаунт и его данные не изменились.</p>'+button('Войти через Mos ID','conflict-login')+button('Вернуться в профиль','cabinet',true);
    }
    if(screen==='oauth-error') {
      title='Не удалось подключиться к Mos ID';
      body='<p>Попробуйте ещё раз. Ваш аккаунт и способы входа не изменились.</p>'+button('Повторить','retry-mos')+button('Вернуться','cancel-mos',true);
    }
    if(screen==='unlink') {
      title='Отвязать Mos ID?';
      body='<p>Вы сможете входить по своему логину и паролю. Для входа через mos.ru потребуется снова подключить Mos ID.</p>'+button('Отвязать','unlink-confirm')+button('Отмена','cabinet',true);
    }
    if(screen==='password') {
      title='Сменить пароль';
      body=form('password',password('Текущий пароль','current-password','current-password')+password('Новый пароль','new-password')+password('Повторите новый пароль','confirm-password'),'Сохранить пароль')+button('Отмена','cabinet',true);
    }
    const content=`<div class="eyebrow">Вариант 2 · регистрация</div><h2 id="r2-title" tabindex="-1">${title}</h2>${body}${message}${notice?'<p class="status-msg" role="status">'+esc(notice)+'</p>':''}${['login','register'].includes(screen)?back:''}`;
    if(['unlink','password'].includes(screen))return `<section class="workspace"><h1>Профиль</h1>${profile()}</section><dialog id="r2-dialog" class="app-dialog r2-card" aria-labelledby="r2-title" data-registration-screen="${screen}">${content}</dialog>`;
    return `<div class="layout"><section class="card r2-card" data-registration-screen="${screen}">${content}</section></div>`;
  }
  function profile() {
    if(!current)return '';
    return `<section class="r2-profile" aria-label="Способы входа"><div class="r2-profile-grid"><div><h2>Данные аккаунта</h2><dl><dt>Логин</dt><dd>${esc(current.login)}</dd><dt>ФИО</dt><dd>${esc(current.name||'Не заполнено')}</dd><dt>Телефон</dt><dd>${esc(current.phone||'Не заполнено')}</dd></dl></div><div><h2>Способы входа</h2><div class="r2-method"><div><strong>Логин и пароль</strong><span class="status-green">Активен</span></div>${button('Сменить пароль','password',true)}</div><div class="r2-method"><div><strong>Mos ID</strong><span class="${current.mosId?'status-green':'mini'}">${current.mosId?'Подключён':'Не подключён'}</span></div>${button(current.mosId?'Отвязать':'Подключить Mos ID',current.mosId?'unlink':'link',true)}</div></div></div>${current.provider==='mos_auto'?'<div class="notice">Аккаунт создан через Mos ID. Сгенерированный пароль можно сменить в любой момент.</div>':''}${notice?'<div class="notice good" role="status">'+esc(notice)+'</div>':''}<p class="mini">Подключение Mos ID не назначает организации, роли или полномочия подписи.</p></section>`;
  }
  function cancelMos() {
    const target=origin;
    if(target==='profile'){screen=null;notice='Вход через Mos ID отменён';refresh();}
    else {show(target);const box=$('r2-status');if(box){box.hidden=false;box.textContent='Вход через Mos ID отменён';}}
  }
  function signout() {screen='entry';oneTimePassword='';current=null;draft={};notice='';}
  main.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.r2Password){const x=$('r2-'+b.dataset.r2Password),show=x.type==='password';x.type=show?'text':'password';b.textContent=show?'Скрыть':'Показать';b.setAttribute('aria-label',(show?'Скрыть':'Показать')+' пароль');b.setAttribute('aria-pressed',String(show));return;}
    if(b.dataset.r2Copy){
      const text=b.dataset.r2Copy==='login'?current?.login:oneTimePassword;
      const target=$('r2-status');
      if(!text||!target)return;
      try{if(!navigator.clipboard?.writeText)throw new Error('clipboard');await navigator.clipboard.writeText(text);if(target.isConnected){target.hidden=false;target.textContent='Скопировано';}}
      catch{if(target.isConnected){target.hidden=false;target.textContent='Копирование недоступно. Выделите поле и скопируйте вручную.';}}return;
    }
    const action=b.dataset.r2Action;
    if(!action)return;
    if(action==='login'||action==='register'){draft={};return show(action);}
    if(action==='back')return show('entry');
    if(action==='mos-login')return startMos('login');
    if(action==='mos-return')return finishMos();
    if(action==='cancel-mos')return cancelMos();
    if(action==='retry-mos')return show('mos');
    if(action==='cabinet')return openCabinet();
    if(action==='link')return startMos('link');
    if(action==='conflict-login'){current=null;return startMos('login');}
    if(!current||!isAuthenticated())return;
    if(action==='unlink'||action==='password')return show(action);
    if(action==='unlink-confirm'){current.mosId=null;current.provider='local_only';notice='Mos ID отвязан. Вход по логину и паролю сохранён.';screen=null;return refresh();}
  });
  main.addEventListener('submit',e=>{
    const kind=e.target.dataset.r2Form;if(!kind)return;e.preventDefault();
    const value=id=>$('r2-'+id)?.value||'';
    if(kind==='login'){
      const account=accounts.find(a=>a.login===value('login').trim()&&a.password===value('password'));
      if(!account)return error('Неверный логин или пароль.','password');current=account;return openCabinet();
    }
    if(kind==='register'){
      const login=value('login').trim(),email=value('email').trim();
      if(!login)return error('Укажите логин.','login');
      if(accounts.some(a=>a.login===login))return error('Этот логин уже занят. Выберите другой.','login');
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return error('Проверьте email.','email');
      if(accounts.some(a=>a.email.toLowerCase()===email.toLowerCase()))return error('Этот email уже используется. Войдите в существующий аккаунт.','email');
      if(value('new-password').length<8||!value('new-password').trim())return error('Используйте пароль не короче 8 символов.','new-password');
      if(value('new-password')!==value('confirm-password'))return error('Пароли не совпадают.','confirm-password');
      if(!$('r2-terms').checked)return error('Примите условия, чтобы создать аккаунт.','terms');
      current={id:'demo-account-'+(++sequence),login,email,password:value('new-password'),provider:'local_only',mosId:null,name:'',phone:''};accounts.push(current);
      screen='offer';enter({...current},true);return;
    }
    if(kind==='password'&&current&&isAuthenticated()){
      if(value('current-password')!==current.password)return error('Текущий пароль неверный.','current-password');
      if(value('new-password').length<8||!value('new-password').trim())return error('Используйте пароль не короче 8 символов.','new-password');
      if(value('new-password')!==value('confirm-password'))return error('Пароли не совпадают.','confirm-password');
      current.password=value('new-password');screen=null;notice='Пароль изменён';enter({...current});
    }
  });
  main.addEventListener('input',e=>{
    if(!e.target.id.startsWith('r2-'))return;
    e.target.removeAttribute('aria-invalid');if($('r2-alert'))$('r2-alert').hidden=true;
    if(screen==='register'||screen==='login'){draft.login=$('r2-login')?.value||'';draft.email=$('r2-email')?.value||'';}
  });
  function fill() {
    const values={login:screen==='login'?(accounts[accounts.length-1]?.login||'ivan'):'ivan',email:'ivan@example.test',password:'Example-2026!','new-password':'Example-2026!','confirm-password':'Example-2026!','current-password':current?.password||'Example-2026!'};
    for(const [id,value] of Object.entries(values)){const el=$('r2-'+id);if(el&&!el.value.trim())el.value=value;}
  }
  reset();
  function mount(){const dialog=$('r2-dialog');if(dialog){dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();openCabinet();});}}
  return {reset,view,profile,signout,fill,mount,hasScreen:()=>!!screen,screen:()=>screen};
}
