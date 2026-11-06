/* Registration variant 2. UI demonstration only: no requests or real accounts. */
function createMosRegistration({main, refresh, enter, isAuthenticated, getScenario=()=> 'new', hasOrganization=()=> false, authOnly=false, help=''}) {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button = (label, action, secondary = false) => `<button type="button" class="${secondary ? 'secondary' : 'primary'}" data-r2-action="${action}">${label}</button>`;
  const field = (label, id, type = 'text', attrs = '') => `<label class="field" for="r2-${id}">${label}<input id="r2-${id}" type="${type}" ${attrs}></label>`;
  const password = (label, id, autocomplete = 'new-password', value = '') => `<label class="field" for="r2-${id}">${label}<span class="password-wrap"><input id="r2-${id}" type="password" autocomplete="${autocomplete}" value="${esc(value)}"><button type="button" class="password-toggle" data-r2-password="${id}" aria-label="Показать пароль" aria-pressed="false">Показать</button></span></label>`;
  const agreement = '<label class="check"><input id="r2-terms" type="checkbox"><span>Принимаю условия использования ВЕРО и обработки персональных данных.</span></label>';
  const message = '<div id="r2-alert" class="alert" role="alert" hidden></div><div id="r2-status" class="status-msg" role="status" hidden></div>';
  const form = (name, content, label) => `<form data-r2-form="${name}" novalidate>${content}<button class="primary" type="submit">${label}</button></form>`;
  const demoMos = {id:'mos-demo-001', name:'Иванов Иван Иванович', email:'ivan.mos@example.test', phone:'+7 000 000-00-00'};
  const invitationEmail='employee@example.test';
  const demoEmployee={id:'demo-employee',login:invitationEmail,email:invitationEmail,password:'Example-2026!',provider:'local_only',mosId:null,name:'Анна Петрова',phone:''};
  const otherInvitation={id:'company-vector',email:'anna@vector.example.test',name:'ООО «Вектор»',role:'Сотрудник организации'};
  const primaryEmail='anna@example.test';
  const advancedScenarios=['invite-other','invite-conflict','invite-shared','invite-wrong'];
  const otherEmail=()=>advancedScenarios.includes(getScenario());
  const invited=()=>otherEmail()||['invite','invite-existing'].includes(getScenario());
  const findAccount=email=>accounts.find(account=>account.email.toLowerCase()===email.toLowerCase());
  let screen, accounts, current, origin, purpose, draft, notice, sequence, invitation;
  function reset() {
    const scenario=getScenario();
    const initialScreens={invite:'invitation','duplicate-email':'email','invite-other':'invite-other',
      'invite-conflict':'invite-conflict','invite-shared':'invitation-error','invite-wrong':'invitation-error'};
    screen=initialScreens[scenario]||'entry';
    accounts=[{id:'demo-existing-account',login:'demo@example.test',email:'demo@example.test',password:'Example-2026!',provider:'local_only',mosId:null,name:'Демонстрационный пользователь',phone:'',connectedOrganization:authOnly?{name:'ООО «Пример»',role:'director'}:null}];
    if(['employee','invite-existing'].includes(scenario))accounts.push({...demoEmployee});
    if(scenario==='invite-conflict')accounts.push({...demoEmployee,id:'demo-invited-email',login:otherInvitation.email,email:otherInvitation.email});
    if(otherEmail())accounts.push({...demoEmployee,id:'demo-cross-email',login:primaryEmail,email:primaryEmail,connectedOrganization:{name:'ООО «Пример»',role:'employee'}});
    current=null; origin=screen; purpose='login';
    draft=scenario==='duplicate-email'?{email:accounts[0].email}:{}; notice=''; sequence=0;
    invitation={email:scenario==='invite-shared'?'office@vector.example.test':scenario==='invite-wrong'?'annna@vector.example.test':otherEmail()?otherInvitation.email:invitationEmail,
      serviceRole:'Специалист',codeSequence:0,acceptedBy:null};
    draft.invitationError=scenario==='invite-shared'?'shared':scenario==='invite-wrong'?'wrong':null;
    if($('r2-mos-outcome'))$('r2-mos-outcome').value='success';
    if($('r2-auth-outcome'))$('r2-auth-outcome').value='success';
  }
  function show(next) {
    screen=next; notice=''; refresh(); main.querySelector('h1,h2')?.focus();
  }
  function error(text, id) {
    const box=$('r2-alert'); if(!box)return;
    box.hidden=false; box.textContent=text;
    if(id){const input=$('r2-'+id);if(input){input.setAttribute('aria-invalid','true');const errorId='r2-error-'+id;let inline=$(errorId);if(!inline){inline=document.createElement('span');inline.id=errorId;inline.className='r2-field-error';input.closest('label')?.append(inline);}inline.textContent=text;input.setAttribute('aria-describedby',errorId);input.focus();}}
  }
  const outcome=()=> $('r2-auth-outcome')?.value||'success';
  const roleText=()=>invitation.serviceRole+' ОССиГ';
  function invitationValid(){
    if(!invited()||invitation.acceptedBy)return true;
    const result=invitation.inactiveReason||outcome();
    if(!['invite-expired','invite-revoked','invite-reissued','invite-undelivered'].includes(result))return true;
    invitation.inactiveReason=result;
    current=null;draft={invitationError:result};show('invitation-error');return false;
  }
  function issueInvitationCode(){
    const code=String(123456+invitation.codeSequence++%876544);
    const delivered=outcome()!=='code-undelivered';
    if(!delivered)$('r2-auth-outcome').value='success';
    draft={challenge:{code,failures:0,expires:Date.now()+10*60*1000,delivered}};
    return show('invite-code');
  }
  function restartInvitation({corrected=false,reissued=false}={}){
    if(corrected)invitation.email=primaryEmail;
    if(reissued)invitation.inactiveReason=null;
    if($('r2-auth-outcome'))$('r2-auth-outcome').value='success';
    current=null;draft={};
    if(invitation.acceptedBy)return show('entry');
    if(otherEmail())return show(getScenario()==='invite-conflict'&&!corrected&&invitation.email===otherInvitation.email?'invite-conflict':'invite-other');
    return show(getScenario()==='invite'?'invitation':'entry');
  }
  function reviewInvitation(){
    if(outcome()==='invite-role-changed')invitation.serviceRole='Наблюдатель';
    draft={reviewedRole:invitation.serviceRole};
    return show('invite-confirm');
  }
  async function request(form){
    const previous=screen,inputs=[...form.querySelectorAll('input,button')].map(el=>[el,el.disabled]);
    form.setAttribute('aria-busy','true');inputs.forEach(([el])=>el.disabled=true);
    const status=$('r2-status');if(status){status.hidden=false;status.textContent='Сохраняем…';}
    await new Promise(resolve=>setTimeout(resolve,300));
    if(!form.isConnected||screen!==previous)return false;
    form.removeAttribute('aria-busy');inputs.forEach(([el,disabled])=>el.disabled=disabled);if(status)status.hidden=true;
    if(outcome()==='server'){error('Сервис временно недоступен. Данные сохранены в форме. Повторите попытку.');return false;}
    return true;
  }
  function openCabinet(requestedTarget) {
    if(!current)return;
    const target=requestedTarget||(['password','unlink','conflict'].includes(screen)?'profile':'home');
    const acceptInvitation=otherEmail()?current.invitationMembership:invited()&&current.email===invitationEmail;
    draft={}; screen=null; enter({...current,acceptInvitation},false,target);
  }
  function startMos(mode) {
    if(mode==='link' && (!isAuthenticated() || !current))return;
    if(['entry','login','register','email','invitation'].includes(screen))draft={...draft,login:$('r2-login')?.value||'',email:$('r2-email')?.value||'',password:$('r2-password')?.value||'',newPassword:$('r2-new-password')?.value||'',confirmPassword:$('r2-confirm-password')?.value||'',terms:!!$('r2-terms')?.checked};
    origin=screen||'profile'; purpose=mode; show('mos');
  }
  function finishMos() {
    if(screen!=='mos')return;
    if(!$('r2-mos-login')?.value.trim())return error('Укажите телефон, email или СНИЛС.','mos-login');
    if(!$('r2-mos-password')?.value)return error('Введите пароль mos.ru.','mos-password');
    const outcome=$('r2-mos-outcome')?.value||'success';
    if(outcome==='error')return show('oauth-error');
    draft.mosLogin=$('r2-mos-login').value;draft.mosPassword=$('r2-mos-password').value;
    show('mos-consent');
  }
  function allowMos() {
    if(screen!=='mos-consent')return;
    if(!$('r2-share-name')?.checked||!$('r2-share-email')?.checked)return error('Разрешите передачу ФИО и email для входа в ВЕРО.');
    const grant={name:true,email:true,phone:!!$('r2-share-phone')?.checked,organization:!!$('r2-share-organization')?.checked};
    const outcome=$('r2-mos-outcome')?.value||'success';
    if(purpose==='link') {
      if(!current || !isAuthenticated())return show('entry');
      const owner=accounts.find(a=>a.mosId===demoMos.id && a.id!==current.id);
      if(outcome==='conflict' || owner){
        if(!owner)accounts.push({id:'demo-other-account',login:'other@example.test',email:'other@example.test',password:'Example-2026!',mosId:demoMos.id,provider:'mos_linked',name:demoMos.name,phone:demoMos.phone});
        return show('conflict');
      }
      current.mosId=demoMos.id; current.provider='mos_linked';
      current.name=demoMos.name; current.phone=grant.phone?demoMos.phone:'';current.mosGrants=grant;
      return show('linked');
    }
    const found=accounts.find(a=>a.mosId===demoMos.id);
    if(found){current=found;return openCabinet();}
    if(!$('r2-terms')?.checked)return error('Примите условия, чтобы создать аккаунт.','terms');
    sequence+=1;
    current={id:'demo-account-'+sequence,login:demoMos.email,email:demoMos.email,name:demoMos.name,phone:grant.phone?demoMos.phone:'',mosGrants:grant,password:null,mosId:demoMos.id,provider:'mos_auto'};
    accounts.push(current); show('created');
  }
  function view(screenOverride, background=false) {
    const shown=screenOverride||screen;
    if(!shown)return null;
    let title='',body='';
    const back=button('← Назад','back',true);
    if(shown==='entry'||shown==='login') {
      title='Войти в ВЕРО';
      const invitationLogin=invited()&&!otherEmail();
      let signup='';
      if(!authOnly||(!invited()&&getScenario()!=='employee')){
        signup=invitationLogin
          ? '<p class="signup">Нет аккаунта? '+button('Задать пароль','invitation',true)+'</p>'
          : authOnly
            ? '<p class="signup"><button class="text-btn" type="button" data-r2-action="register">Зарегистрировать организацию</button><br>Сотрудники регистрируются по приглашению.</p>'
            : '<p class="signup">Нет аккаунта? <button class="text-btn" type="button" data-r2-action="register">Зарегистрироваться</button></p>';
      }
      let prompt='';
      if(invitationLogin)prompt='<div class="notice">Вы приглашены в ООО «Пример». Войдите с почтой, на которую пришло приглашение.</div>';
      if(otherEmail()&&!invitation.acceptedBy){
        const instructions=findAccount(invitation.email)?'Войдите с почтой, на которую пришло приглашение.':'Введите email, с которым вы уже входите в ВЕРО. Затем подтвердите почту приглашения.';
        prompt='<div class="notice">'+instructions+'</div>';
      }
      body=prompt+form('login',field('Логин (email)','login','email',`autocomplete="username" value="${esc(invitationLogin?invitationEmail:draft.login||'')}" ${invitationLogin?'readonly':''}`)+password('Пароль','password','current-password',draft.password||''),invitationLogin?'Войти и присоединиться':'Войти')+'<p><button type="button" class="text-btn" data-r2-action="recover">Забыли пароль?</button></p>'+(invited()?'':'<div class="separator">или</div>'+button('Войти через mos.ru','mos-login',true))+signup;
      if(authOnly&&invited()&&!invitation.acceptedBy)body+=button('Не сейчас','invite-defer',true);
    }
    if(shown==='invite-other'){
      title='Вас пригласили в '+otherInvitation.name;
      body='<p>Приглашение для <strong>'+esc(invitation.email)+'</strong>.</p><p>Доступ · '+esc(roleText())+'</p><p>Войдите в свой аккаунт ВЕРО, даже если он зарегистрирован на другую почту.</p>'
        +button('Войти в свой аккаунт','login')+button('Не сейчас','invite-defer',true)+button('Нет доступа к этой почте','invite-no-mail',true);
    }
    if(shown==='invite-conflict'){
      title='У этой почты уже есть аккаунт ВЕРО';
      body='<p>Приглашение для <strong>'+esc(invitation.email)+'</strong>. Войдите в аккаунт на эту почту. Чтобы присоединить компанию к другому аккаунту, попросите администратора отправить приглашение на его адрес.</p>'
        +button('Войти с почтой приглашения','invite-owner')+button('Нужно приглашение на другой адрес','invite-other-account',true);
    }
    if(shown==='invite-code'){
      title='Подтвердите почту приглашения';
      body='<p>Отправили код на <strong>'+esc(invitation.email)+'</strong>. Аккаунт для присоединения · '+esc(current?.email)+'</p>'
        +form('invite-code',field('Код из письма','invitation-code','text','inputmode="numeric" autocomplete="one-time-code" maxlength="6"'),'Подтвердить код')
        +button('Отправить код повторно','invite-resend',true)+button('Войти в другой аккаунт','invite-switch',true)
        +button('Нет доступа к этой почте','invite-no-mail',true)
        +'<details class="mini"><summary>Демо-почта</summary><p>'+(draft.challenge.delivered?'Код из письма · <strong>'+esc(draft.challenge.code)+'</strong>':'Письмо с кодом пока не доставлено. Запросите новый код.')+'</p></details>';
    }
    if(shown==='invite-confirm'){
      title='Присоединиться к организации';
      body='<p>Почта приглашения подтверждена. В аккаунт <strong>'+esc(current?.email)+'</strong> будет добавлен доступ к <strong>'+esc(otherInvitation.name)+'</strong>.</p><p>Доступ · '+esc(roleText())+'</p>'
        +form('invite-confirm','','Присоединиться')+button('Не сейчас','invite-defer',true)+button('Войти в другой аккаунт','invite-switch',true);
    }
    if(shown==='invite-deferred'){
      title='Приглашение отложено';
      body='<p>Вернитесь по ссылке из письма, чтобы продолжить. Доступ появится, когда вы примете приглашение.</p>'+button('Вернуться к приглашению','invite-reopen');
    }
    if(shown==='recover'){
      title='Восстановить пароль';body='<p>Укажите email, который используете для входа в ВЕРО.</p>'+form('recover',field('Логин (email)','recover-email','email',`autocomplete="email" placeholder="name@example.ru" value="${esc(draft.recoverEmail||'')}"`),'Получить письмо')+button('Вернуться ко входу','recovery-cancel',true);
    }
    if(shown==='recovery-sent'){
      title='Проверьте почту';body='<p>Если аккаунт с адресом <strong>'+esc(draft.recoverEmail)+'</strong> существует, на него придёт письмо для восстановления пароля.</p>'+button('Открыть письмо','recovery-letter')+button('Отправить повторно','recovery-resend',true)+button('Изменить email','recover',true)+'<p class="mini">Демонстрация: письма не отправляются.</p>';
    }
    if(shown==='recovery-letter'){
      title='Восстановление пароля';body='<p class="mini">Письмо от ВЕРО · демонстрация</p><p>Кому: '+esc(draft.recoverEmail)+'</p><p>Вы запросили смену пароля. Если это были не вы, просто закройте письмо.</p>'+button('Задать новый пароль','recovery-open')+button('Вернуться','recovery-inbox',true);
    }
    if(shown==='recovery-password'){
      title='Задайте новый пароль';body=form('recovery-password',field('Логин (email)','recover-login','email',`value="${esc(draft.recoverEmail)}" disabled`)+password('Новый пароль','new-password')+'<p class="mini">Не менее 8 символов.</p>'+password('Повторите пароль','confirm-password'),'Сохранить пароль')+button('Вернуться ко входу','recovery-cancel',true);
    }
    if(shown==='recovery-expired'){
      title='Ссылка недействительна';body='<p>Ссылка устарела или уже использована. Запросите новое письмо для восстановления пароля.</p>'+button('Получить новое письмо','recovery-resend')+button('Вернуться ко входу','recovery-cancel',true);
    }
    if(shown==='recovery-success'){
      title='Пароль изменён';body='<p class="notice good">Теперь войдите с новым паролем. Логин остался прежним.</p>'+button('Войти','recovery-cancel');
    }
    if(shown==='invitation-error'){
      const reasons={
        'invite-revoked':['Приглашение отозвано','Попросите администратора организации отправить новое приглашение, если доступ ещё нужен.'],
        'invite-expired':['Срок приглашения истёк','Попросите администратора организации отправить новую ссылку.'],
        'invite-reissued':['Приглашение отправили повторно','Откройте ссылку из последнего письма. Предыдущая ссылка больше не действует.'],
        'invite-undelivered':['Письмо с приглашением не пришло','Проверьте папку «Спам». Если письма нет, попросите администратора проверить адрес и отправить приглашение повторно.'],
        shared:['Приглашение отправили на общий ящик','Попросите администратора отправить приглашение на адрес, к которому есть доступ только у вас.'],
        wrong:['Приглашение отправили на неверный адрес','Администратор отзывает старое приглашение и отправляет новое на правильную почту.'],
        'no-mail':['Нужен доступ к почте приглашения','Если письмо переслали или адрес вам недоступен, попросите администратора пригласить вас на вашу почту.'],
        'other-account':['Попросите приглашение на другой адрес','Сообщите администратору email, с которым вы входите в основной аккаунт ВЕРО. Администратор отзовёт старую ссылку и отправит новую.'],
      };
      const reason=draft.invitationError;
      const detail=reasons[reason]||reasons['invite-expired'];
      title=detail[0];
      body='<p>'+esc(detail[1])+'</p>';
      if(authOnly&&invited()){
        const corrected=['shared','wrong','no-mail','other-account'].includes(reason);
        body+='<p class="mini">Демонстрация нового письма от администратора</p>'+button(corrected?'Открыть приглашение на мой адрес':'Открыть новое приглашение',corrected?'invite-corrected':'invite-reopen');
      } else body+=button('Вернуться ко входу','login',true);
    }
    if(shown==='email'){
      title=authOnly?'Регистрация организации':'Регистрация';
      body='<p>Укажите почту. Отправим письмо для подтверждения адреса, затем вы зададите пароль.</p>'+form('email',field('Email','email','email',`autocomplete="email" value="${esc(draft.email||'')}"`),'Получить письмо')+'<p class="signup">Уже есть аккаунт? <button class="text-btn" type="button" data-r2-action="login">Войти</button></p>';
    }
    if(shown==='email-exists'){
      title='Аккаунт уже существует';
      body='<p>На адрес <strong>'+esc(draft.email)+'</strong> уже зарегистрирован аккаунт ВЕРО. Войдите с этой почтой, чтобы продолжить.</p>'
        +button('Войти','existing-login')+button('Изменить email','edit-email',true);
    }
    if(shown==='email-sent'){
      title='Проверьте почту';body='<p>Отправили ссылку на <strong>'+esc(draft.email)+'</strong>. Перейдите по ней, чтобы продолжить регистрацию.</p>'+button('Открыть письмо','open-email')+button('Изменить email','edit-email',true)+'<p class="mini">Демонстрация письма: реальная отправка не подключена.</p>';
    }
    if(shown==='email-letter'){
      title='Подтвердите email';body='<p class="mini">Письмо от ВЕРО · демонстрация</p><p>Кому: '+esc(draft.email)+'</p><p>Подтвердите адрес, чтобы задать пароль для входа.</p>'+button('Подтвердить email','confirm-email')+button('Запросить новое письмо','edit-email',true);
    }
    if(shown==='invitation'){
      title='Вас пригласили на платформу ВЕРО';body='<p>ООО «Пример» приглашает вас для совместной работы. Придумайте пароль. Логином будет почта, на которую пришло приглашение.</p>'+form('invitation',field('Логин — email приглашения','invite-login','email',`value="${invitationEmail}" disabled`)+password('Придумайте пароль','new-password')+'<p class="mini">Не менее 8 символов.</p>'+password('Повторите пароль','confirm-password')+agreement,authOnly?'Присоединиться в качестве сотрудника':'Создать аккаунт и присоединиться')+(authOnly?'':'<p class="signup">Уже зарегистрированы? <button class="text-btn" type="button" data-r2-action="invite-login">Войти</button></p>');
      if(authOnly)body+=button('Не сейчас','invite-defer',true);
    }
    if(shown==='register') {
      title='Регистрация';
      body='<p class="notice good">Email '+esc(draft.verifiedEmail)+' подтверждён.</p>'+form('register',field('Логин (email)','login','email',`autocomplete="username" value="${esc(draft.verifiedEmail||'')}" disabled`)+password('Пароль','new-password','new-password',draft.newPassword||'')+'<p class="mini" style="margin:0">Не менее 8 символов.</p>'+password('Повторите пароль','confirm-password','new-password',draft.confirmPassword||'')+(draft.terms?agreement.replace('type="checkbox"','type="checkbox" checked'):agreement),'Создать аккаунт');
    }
    if(shown==='mos') {
      title='Вход на mos.ru';
      body='<div class="mos-demo-url">login.mos.ru · демонстрация</div><div class="mos-brand">mos.ru</div>'+field('Телефон, email или СНИЛС','mos-login','text',`autocomplete="off" autofocus value="${esc(draft.mosLogin||'')}"`)+password('Пароль','mos-password','off',draft.mosPassword||'')+button('Войти','mos-return')+button('Отменить и вернуться','cancel-mos',true);
    }
    if(shown==='mos-consent'){
      title='Разрешить доступ к данным?';
      body='<div class="mos-brand">mos.ru</div><p>ВЕРО запрашивает данные вашего профиля. Выберите, что разрешаете передать.</p><fieldset class="mos-permissions"><legend>Данные для ВЕРО</legend><label class="check"><input id="r2-share-name" type="checkbox"><span>ФИО — для идентификации пользователя</span></label><label class="check"><input id="r2-share-email" type="checkbox"><span>Email — для аккаунта и связи</span></label><label class="check"><input id="r2-share-phone" type="checkbox"><span>Телефон</span></label><label class="check"><input id="r2-share-organization" type="checkbox"><span>Сведения об организациях</span></label></fieldset><p class="mini">Для входа нужны ФИО и email. Сведения об организации не назначают роль или права доступа на ВЕРО. Состав данных показан как предлагаемый вариант интеграции.</p>'+(!accounts.some(a=>a.mosId===demoMos.id)&&purpose!=='link'?agreement:'')+button('Разрешить и продолжить','mos-allow')+button('Отменить','cancel-mos',true);
    }
    if(shown==='created') {
      title='Подключите организацию';
      body='<div class="r2-success" aria-hidden="true">✓</div><p>Аккаунт создан через mos.ru. Подключите организацию, чтобы работать от её имени.</p>'+button('Подключить организацию','connect-organization')+button('Сделать позже','cabinet',true)+'<p class="mini">Для входа используйте mos.ru. Пароль для входа по email можно задать позже в профиле.</p>';
    }
    if(shown==='offer') {
      title='Добро пожаловать!';
      body='<div class="r2-success" aria-hidden="true">✓</div><p>Аккаунт создан. Подключите Mos ID, чтобы входить через mos.ru в этот же аккаунт.</p><div class="summary r2-mos-benefits"><strong>Что даёт Mos ID</strong><span>Ещё один способ входа</span><span>Вход без ввода пароля ВЕРО</span></div>'+button('Подключить Mos ID','link')+button('Сделать позже','cabinet',true);
    }
    if(shown==='linked') {
      title=hasOrganization()?'Mos ID подключён':'Подключите организацию';
      body='<div class="r2-success" aria-hidden="true">✓</div><p>Теперь можно входить через mos.ru или по своему логину и паролю. Это один и тот же аккаунт.</p>'+(hasOrganization()?button(authOnly?'Завершить вход':'К сервисам','cabinet'):'<div class="summary"><strong>Подключите организацию</strong><p>'+(authOnly?'Выберите сертификат УКЭП генерального директора и проверьте полученные сведения.':'Найдите компанию по ИНН и подтвердите полномочия, чтобы работать от её имени.')+' Если вы сотрудник, попросите приглашение у организации.</p></div>'+button('Подключить организацию','connect-organization')+button('Сделать позже','cabinet',true));
    }
    if(shown==='organization-offer'){
      title='Подключите организацию';
      body='<p>Аккаунт готов к работе. '+(authOnly?'Выберите сертификат УКЭП генерального директора, чтобы получить данные организации и подтвердить полномочия.':'Найдите компанию по ИНН и пройдите проверку полномочий, чтобы работать от её имени.')+'</p><p class="mini">Если вы сотрудник, попросите приглашение у руководителя или администратора.</p>'+button('Подключить организацию','connect-organization')+button('Сделать позже','cabinet',true);
    }
    if(shown==='conflict') {
      title='Этот Mos ID уже привязан к другому аккаунту';
      body='<p>Войдите через Mos ID в тот аккаунт или обратитесь в поддержку. Текущий аккаунт и его данные не изменились.</p>'+button('Войти через Mos ID','conflict-login')+button('Вернуться в профиль','cabinet',true);
    }
    if(shown==='oauth-error') {
      title='Не удалось подключиться к Mos ID';
      body='<p>Попробуйте ещё раз. Ваш аккаунт и способы входа не изменились.</p>'+button('Повторить','retry-mos')+button('Вернуться','cancel-mos',true);
    }
    if(shown==='unlink') {
      title='Отвязать Mos ID?';
      body='<p>Вы сможете входить по своему логину и паролю. Для входа через mos.ru потребуется снова подключить Mos ID.</p>'+button('Отвязать','unlink-confirm')+button('Отмена','cabinet',true);
    }
    if(shown==='password') {
      title=current.password?'Сменить пароль':'Задайте пароль';
      body=form('password',(current.password?password('Текущий пароль','current-password','current-password'):'<p>Создайте пароль для входа по email. Вход через mos.ru останется доступен.</p>')+password('Новый пароль','new-password')+password('Повторите новый пароль','confirm-password'),'Сохранить пароль')+button('Отмена','cabinet',true);
    }
    const sessionDemo=authOnly&&invited()&&!background&&!['invitation-error','invite-deferred'].includes(shown)
      ?'<details class="mini"><summary>Демо · повторное открытие ссылки</summary><p>Имитирует новое устройство или вкладку. Для входа понадобится пароль, для другой почты — новый код.</p>'+button('Открыть ссылку в новой сессии','invite-new-session',true)+'</details>':'';
    const content=`${['entry','login','mos','mos-consent'].includes(shown)?'':'<div class="eyebrow">Вариант 2 · регистрация</div>'}<h2 id="${['mos','mos-consent'].includes(shown)?'r2-mos-title':'r2-title'}" tabindex="-1">${title}</h2>${body}${background?'':message}${notice&&!background?'<p class="status-msg" role="status">'+esc(notice)+'</p>':''}${['entry','login','email','register','invitation'].includes(shown)?help:''}${['register','email'].includes(shown)?back:''}${sessionDemo}`;
    if(['mos','mos-consent'].includes(shown)){
      const beneath=origin==='profile'?`<section class="workspace"><h1>Профиль</h1>${profile()}</section>`:view(origin,true);
      return `${beneath}<dialog id="r2-dialog" class="app-dialog r2-card mos-dialog" aria-labelledby="r2-mos-title" data-registration-screen="${shown}"><button type="button" class="dialog-close" data-r2-action="close-mos" aria-label="Закрыть авторизацию mos.ru">×</button>${content}</dialog>`;
    }
    if(['unlink','password'].includes(shown))return `<section class="workspace"><h1>Профиль</h1>${profile()}</section><dialog id="r2-dialog" class="app-dialog r2-card" aria-labelledby="r2-title" data-registration-screen="${shown}">${content}</dialog>`;
    const panel=`<div class="layout"><section class="card r2-card" data-registration-screen="${shown}">${content}</section></div>`;
    return background?panel.replaceAll('id="r2-','id="r2-bg-').replaceAll('for="r2-','for="r2-bg-'):panel;
  }
  function profile() {
    if(!current)return '';
    return `<section class="r2-profile" aria-label="Способы входа"><div class="r2-profile-grid"><div><h2>Данные аккаунта</h2><dl><dt>Логин</dt><dd>${esc(current.login)}</dd><dt>ФИО</dt><dd>${esc(current.name||'Не заполнено')}</dd><dt>Телефон</dt><dd>${esc(current.phone||'Не заполнено')}</dd></dl></div><div><h2>Способы входа</h2><div class="r2-method"><div><strong>Логин и пароль</strong><span class="${current.password?'status-green':'mini'}">${current.password?'Активен':'Пароль не задан'}</span></div>${button(current.password?'Сменить пароль':'Задать пароль','password',true)}</div><div class="r2-method"><div><strong>Mos ID</strong><span class="${current.mosId?'status-green':'mini'}">${current.mosId?'Подключён':'Не подключён'}</span></div>${button(current.mosId?'Отвязать':'Подключить Mos ID',current.mosId?'unlink':'link',true)}</div></div></div>${current.provider==='mos_auto'&&!current.password?'<div class="notice">Вы входите через mos.ru. Чтобы также входить по email, задайте пароль в разделе «Способы входа».</div>':''}${notice?'<div class="notice good" role="status">'+esc(notice)+'</div>':''}<p class="mini">Подключение Mos ID не назначает организации, роли или полномочия подписи.</p></section>`;
  }
  function cancelMos() {
    const target=origin;
    if(target==='profile'){screen=null;notice='Вход через Mos ID отменён';refresh();}
    else {show(target);const box=$('r2-status');if(box){box.hidden=false;box.textContent='Вход через Mos ID отменён';}}
  }
  function signout() {screen='entry';current=null;draft={};notice='';}
  main.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.r2Password){const x=$('r2-'+b.dataset.r2Password),show=x.type==='password';x.type=show?'text':'password';b.textContent=show?'Скрыть':'Показать';b.setAttribute('aria-label',(show?'Скрыть':'Показать')+' пароль');b.setAttribute('aria-pressed',String(show));return;}
    const action=b.dataset.r2Action;
    if(!action)return;
    if(action==='invite-owner'&&screen==='invite-conflict'){
      if(!invitationValid())return;
      draft={login:invitation.email};return show('entry');
    }
    if(action==='invite-defer'&&invited()&&['entry','invitation','invite-other','invite-confirm'].includes(screen)){
      current=null;draft={};return show('invite-deferred');
    }
    if(action==='invite-no-mail'&&['invite-other','invite-code','invite-conflict'].includes(screen)){
      current=null;draft={invitationError:'no-mail'};return show('invitation-error');
    }
    if(action==='invite-other-account'&&screen==='invite-conflict'){
      current=null;draft={invitationError:'other-account'};return show('invitation-error');
    }
    if(action==='invite-corrected'&&screen==='invitation-error')return restartInvitation({corrected:true,reissued:true});
    if(action==='invite-new-session'||action==='invite-reopen'){
      if(screen!=='invitation-error'&&!invitationValid())return;
      return restartInvitation({reissued:screen==='invitation-error'});
    }
    if(action==='invite-switch'&&['invite-code','invite-confirm'].includes(screen)){
      current=null;draft={};return show('entry');
    }
    if(action==='invite-resend'&&screen==='invite-code'&&current){
      if(!invitationValid())return;
      if(outcome()==='server')return error('Не удалось отправить код. Попробуйте ещё раз.');
      if(outcome()==='code-expired')$('r2-auth-outcome').value='success';
      return issueInvitationCode();
    }
    if(action==='login'){if(!invitationValid())return;draft={};return show('entry');}
    if(action==='register'){
      if(authOnly&&(invited()||getScenario()==='employee'))return;
      draft={};return show('email');
    }
    if(action==='existing-login'&&screen==='email-exists'){draft={login:draft.email};return show('entry');}
    if(action==='edit-email'){draft={email:draft.email};return show('email');}
    if(action==='open-email'&&draft.email)return show('email-letter');
    if(action==='confirm-email'&&screen==='email-letter'&&draft.email){if(outcome()==='expired-link')return error('Ссылка подтверждения устарела. Вернитесь и запросите новое письмо.');draft.verifiedEmail=draft.email;return show('register');}
    if(action==='recover'){draft={recoverEmail:$('r2-login')?.value.trim()||draft.recoverEmail||''};return show('recover');}
    if(action==='recovery-cancel'){draft={login:draft.recoverEmail};return show('entry');}
    if(action==='recovery-letter'&&draft.recoveryToken)return show('recovery-letter');
    if(action==='recovery-inbox')return show('recovery-sent');
    if(action==='recovery-resend'&&draft.recoverEmail){draft.recoveryToken=true;draft.recoveryVerified=false;show('recovery-sent');notice='Новое письмо запрошено. Используйте последнюю ссылку.';return refresh();}
    if(action==='recovery-open'&&screen==='recovery-letter'){
      if(!draft.recoveryToken||outcome()==='expired-link')return show('recovery-expired');
      draft.recoveryVerified=true;return show('recovery-password');
    }
    if(action==='invitation'&&!authOnly)return show('invitation');
    if(action==='invite-login'&&!authOnly){
      if(!accounts.some(account=>account.email===invitationEmail))accounts.push({...demoEmployee});
      draft={login:invitationEmail};
      return show('entry');
    }
    if(action==='back')return show('entry');
    if(action==='mos-login')return startMos('login');
    if(action==='mos-fill'){if($('r2-mos-login')&&!$('r2-mos-login').value)$('r2-mos-login').value=demoMos.email;if($('r2-mos-password')&&!$('r2-mos-password').value)$('r2-mos-password').value='Example-2026!';$('r2-mos-login')?.removeAttribute('aria-invalid');$('r2-mos-password')?.removeAttribute('aria-invalid');if($('r2-alert'))$('r2-alert').hidden=true;return;}
    if(action==='mos-return')return finishMos();
    if(action==='mos-allow')return allowMos();
    if(action==='cancel-mos'||action==='close-mos')return cancelMos();
    if(action==='retry-mos')return show('mos');
    if(action==='cabinet'){if(screen==='offer'&&!hasOrganization())return show('organization-offer');return openCabinet();}
    if(action==='connect-organization'&&current&&(isAuthenticated()||screen==='created'))return openCabinet('company');
    if(action==='link')return startMos('link');
    if(action==='conflict-login'){current=null;return startMos('login');}
    if(!current||!isAuthenticated())return;
    if(action==='unlink'||action==='password')return show(action);
    if(action==='unlink-confirm'){if(!current.password)return error('Сначала задайте пароль в профиле, чтобы сохранить возможность входа.');current.mosId=null;current.provider='local_only';notice='Mos ID отвязан. Вход по логину и паролю сохранён.';screen=null;return refresh();}
  });
  main.addEventListener('submit',async e=>{
    const kind=e.target.dataset.r2Form;if(!kind)return;e.preventDefault();
    if(e.target.getAttribute('aria-busy')==='true')return;
    const value=id=>$('r2-'+id)?.value||'';
    if(kind==='login'){
      const identifier=value('login').trim();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))return error('Укажите email в формате name@example.ru.','login');
      if(!value('password'))return error('Введите пароль.','password');
      const account=accounts.find(a=>a.email.toLowerCase()===identifier.toLowerCase()&&a.password===value('password'));
      if(!account)return error('Неверный email или пароль. Проверьте данные или восстановите пароль.','password');
      if(!invitationValid()||!await request(e.target)||!invitationValid())return;
      if(invited()&&invitation.acceptedBy&&invitation.acceptedBy!==account.id)return error('Это приглашение уже принято. Войдите в аккаунт, с которым вы его приняли.');
      if(otherEmail()){
        const owner=findAccount(invitation.email);
        if(!invitation.acceptedBy&&owner&&owner!==account){current=null;draft={};return show('invite-conflict');}
        if(!invitation.acceptedBy){
          current=account;
          return owner?reviewInvitation():issueInvitationCode();
        }
      } else if(invited()){
        if(account.email!==invitationEmail)return error('Войдите с почтой, на которую пришло приглашение.','login');
        invitation.acceptedBy=account.id;
      }
      current=account;return openCabinet();
    }
    if(kind==='invite-code'&&screen==='invite-code'&&current){
      if(!invitationValid()||!await request(e.target))return;
      if(!invitationValid())return;
      const challenge=draft.challenge;
      if(outcome()==='code-expired')challenge.expires=0;
      if(challenge.expires<=Date.now())return error('Срок действия кода истёк. Запросите новый код.','invitation-code');
      if(challenge.failures>=3)return error('Попытки исчерпаны. Запросите новый код.','invitation-code');
      const code=value('invitation-code').trim();
      if(!/^\d{6}$/.test(code))return error('Введите шесть цифр из письма.','invitation-code');
      if(code!==challenge.code){
        challenge.failures+=1;
        return error(challenge.failures===3?'Попытки исчерпаны. Запросите новый код.':'Код не совпадает. Проверьте письмо или запросите новый код.','invitation-code');
      }
      return reviewInvitation();
    }
    if(kind==='invite-confirm'&&screen==='invite-confirm'&&current){
      if(!invitationValid()||!await request(e.target)||!invitationValid())return;
      if(outcome()==='invite-role-changed')invitation.serviceRole='Наблюдатель';
      if(draft.reviewedRole!==invitation.serviceRole){
        reviewInvitation();
        notice='Администратор изменил роль. Проверьте новый доступ и подтвердите присоединение.';
        return refresh();
      }
      const {id,name,role}=otherInvitation;
      current.invitationMembership={id,name,role,serviceRoles:{ossig:invitation.serviceRole},kind:'employee'};
      invitation.acceptedBy=current.id;
      return openCabinet();
    }
    if(kind==='recover'){
      const email=value('recover-email').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return error('Укажите email в формате name@example.ru.','recover-email');
      if(!await request(e.target))return;draft={recoverEmail:email,recoveryToken:true,recoveryVerified:false};return show('recovery-sent');
    }
    if(kind==='recovery-password'){
      if(!draft.recoveryToken||!draft.recoveryVerified||outcome()==='expired-link')return show('recovery-expired');
      const newPassword=value('new-password');
      if(newPassword.length<8||!newPassword.trim())return error('Используйте пароль не короче 8 символов.','new-password');
      if(newPassword!==value('confirm-password'))return error('Пароли не совпадают. Повторите новый пароль.','confirm-password');
      if(!await request(e.target))return;
      const account=accounts.find(a=>a.email.toLowerCase()===draft.recoverEmail.toLowerCase());
      if(!account)return error('Не удалось подтвердить ссылку. Запросите новое письмо.');
      account.password=newPassword;draft.recoveryToken=false;draft.recoveryVerified=false;return show('recovery-success');
    }
    if(kind==='email'){
      const email=value('email').trim();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return error('Проверьте email.','email');
      if(findAccount(email)){
        if(!authOnly)return error('Этот email уже используется. Войдите в существующий аккаунт.','email');
        draft={email};
        return show('email-exists');
      }
      if(!await request(e.target))return;draft={email};return show('email-sent');
    }
    if(kind==='invitation'){
      if(screen!=='invitation'||getScenario()!=='invite')return;
      if(accounts.some(a=>a.email===invitationEmail))return error('Аккаунт уже существует. Нажмите «Войти».');
      if(value('new-password').length<8||!value('new-password').trim())return error('Используйте пароль не короче 8 символов.','new-password');
      if(value('new-password')!==value('confirm-password'))return error('Пароли не совпадают.','confirm-password');
      if(!$('r2-terms').checked)return error('Примите условия, чтобы присоединиться.','terms');
      if(!invitationValid()||!await request(e.target)||!invitationValid())return;
      current={id:'invited-'+(++sequence),login:invitationEmail,email:invitationEmail,password:value('new-password'),provider:'local_only',mosId:null,name:'Анна Петрова',phone:''};
      accounts.push(current);invitation.acceptedBy=current.id;return openCabinet();
    }
    if(kind==='register'){
      const email=draft.verifiedEmail,login=email;
      if(!email||value('login').trim()!==email)return error('Сначала подтвердите email по ссылке из письма.','login');
      if(accounts.some(a=>a.email.toLowerCase()===email.toLowerCase()))return error('Этот email уже используется. Войдите в существующий аккаунт.','login');
      if(value('new-password').length<8||!value('new-password').trim())return error('Используйте пароль не короче 8 символов.','new-password');
      if(value('new-password')!==value('confirm-password'))return error('Пароли не совпадают.','confirm-password');
      if(!$('r2-terms').checked)return error('Примите условия, чтобы создать аккаунт.','terms');
      if(!await request(e.target))return;
      current={id:'demo-account-'+(++sequence),login,email,password:value('new-password'),provider:'local_only',mosId:null,name:'',phone:''};accounts.push(current);
      screen='offer';enter({...current},true);return;
    }
    if(kind==='password'&&current&&isAuthenticated()){
      if(current.password&&value('current-password')!==current.password)return error('Текущий пароль неверный.','current-password');
      if(value('new-password').length<8||!value('new-password').trim())return error('Используйте пароль не короче 8 символов.','new-password');
      if(value('new-password')!==value('confirm-password'))return error('Пароли не совпадают.','confirm-password');
      current.password=value('new-password');const saved=accounts.find(a=>a.id===current.id);if(saved)saved.password=current.password;screen=null;notice='Пароль сохранён';enter({...current},false,'profile');
    }
  });
  main.addEventListener('input',e=>{
    if(!e.target.id.startsWith('r2-'))return;
    e.target.removeAttribute('aria-invalid');const inline=$('r2-error-'+e.target.id.slice(3));if(inline)inline.remove();e.target.removeAttribute('aria-describedby');if($('r2-alert'))$('r2-alert').hidden=true;
    if(['entry','register','login'].includes(screen)){draft.login=$('r2-login')?.value||'';draft.email=$('r2-email')?.value||'';draft.password=$('r2-password')?.value||'';}
  });
  function fill() {
    if(screen==='invite-code'){
      const input=$('r2-invitation-code');
      if(input&&!input.value&&draft.challenge.delivered)input.value=draft.challenge.code;
      return;
    }
    if(screen==='mos'){if(!$('r2-mos-login').value)$('r2-mos-login').value=demoMos.email;if(!$('r2-mos-password').value)$('r2-mos-password').value='Example-2026!';return;}
    if(screen==='mos-consent')return;
    const enteredLogin=$('r2-login')?.value.trim();
    const demoAccount=accounts.find(a=>a.login===enteredLogin||a.email.toLowerCase()===enteredLogin?.toLowerCase())||(!enteredLogin?accounts[accounts.length-1]:null);
    let registrationLogin='ivan',registrationEmail='ivan@example.test',suffix=1;
    while(accounts.some(a=>a.login===registrationLogin||a.email===registrationEmail)){registrationLogin='ivan'+suffix;registrationEmail='ivan'+suffix+'@example.test';suffix+=1;}
    const values={login:['entry','login'].includes(screen)?demoAccount?.email:registrationLogin,email:registrationEmail,'recover-email':draft.recoverEmail||accounts[accounts.length-1]?.email,password:demoAccount?.password,'new-password':'Example-2026!','confirm-password':'Example-2026!','current-password':current?.password||'Example-2026!'};
    for(const [id,value] of Object.entries(values)){const el=$('r2-'+id);if(value&&el&&!el.value.trim())el.value=value;}
  }
  reset();
  function mount(){
    const select=$('r2-auth-outcome');
    if(select&&authOnly){
      const invitationOutcomes=[
        ['invite-undelivered','Письмо с приглашением не пришло'],['invite-expired','Приглашение просрочено'],
        ['invite-revoked','Приглашение отозвано'],['invite-reissued','Администратор отправил новую ссылку'],
      ];
      if(otherEmail())invitationOutcomes.push(
        ['code-undelivered','Письмо с кодом не пришло'],['code-expired','Код просрочен'],['invite-role-changed','Администратор изменил роль'],
      );
      const selected=select.value;
      select.querySelectorAll('[data-invitation-outcome]').forEach(option=>option.remove());
      if(invited()){
        for(const [value,label] of invitationOutcomes){
          const option=new Option(label,value);
          option.dataset.invitationOutcome='';
          select.add(option);
        }
        if(invitationOutcomes.some(([value])=>value===selected))select.value=selected;
      }
    }
    const dialog=$('r2-dialog');
    if(dialog){dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();if(['mos','mos-consent'].includes(screen))cancelMos();else openCabinet();});}
  }
  function snapshot(){return structuredClone({screen,accounts,current,origin,purpose,draft,notice,sequence,invitation});}
  function restore(value){({screen,accounts,current,origin,purpose,draft,notice,sequence,invitation}=structuredClone(value));}
  function connectOrganization(name){if(!current)return;current.connectedOrganization={name,role:'director'};const saved=accounts.find(a=>a.id===current.id);if(saved)saved.connectedOrganization={...current.connectedOrganization};}
  return {reset,view,profile,signout,fill,mount,snapshot,restore,connectOrganization,hasScreen:()=>!!screen,screen:()=>screen};
}
