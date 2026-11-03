function resetProposal(){
 S.pIdentity=(S.pIdentity||0)+1;S.accountVerified=false;S.memberActive=false;S.isAdmin=false;S.orgVerified=false;S.pendingCompany=false;S.externalOrgPresent=false;
 S.proposalPath=S.proposalPath||'company';S.employeeEntry=S.employeeEntry==='request'?'contact':S.employeeEntry||'invite';S.verification='ep';S.applicant='director';S.inviteContext=false;S.inviteHasAccount=false;
 S.invitation=S.invitation||{name:'Петров Пётр',email:'petr@example.test',company:'ООО «Пример»',objects:true,requests:true,people:false,finance:false};
 S.companyName=S.proposalPath==='employee'?S.invitation.company:'ООО «Пример»';S.companyINN='0000000000';S.companyType='legal';
 S.email=S.proposalPath==='employee'&&S.employeeEntry==='invite'?S.invitation.email:'ivan@example.test';
 S.personalName=S.proposalPath==='employee'&&S.employeeEntry==='invite'?S.invitation.name:'Иван Иванов';
 S.employeeRights={objects:true,requests:true,people:false,finance:false};S.employeeRole='Сотрудник';S.authMethod='email';S.mosIntent='register';if(['mos-org','contact'].includes(S.employeeEntry)&&S.proposalPath==='employee')S.repeat=false;
 S.isDirector=false;S.legalFlow=false;S.mchd={status:'draft',powers:[]};S.connectedEmployee=null;
 if(S.proposalPath==='powers'){S.repeat=false;S.accountVerified=true;S.memberActive=true;S.orgVerified=true;S.isAdmin=true;S.isDirector=true;S.legalFlow=true;S.connectedEmployee={name:'Петров Пётр',email:'petr@example.test',company:S.companyName};}
}
function pMosOrgCase(){return S.proposalPath==='employee'&&S.employeeEntry==='mos-org';}
const pMchdPowerLabels={contracts:'Подписывать договоры',acts:'Подписывать акты',applications:'Подписывать заявки'};
function pMchdEmployee(){return S.connectedEmployee||(S.invitation?.accepted&&S.invitation.company===S.companyName?S.invitation:null);}
function pMchdList(){return `<ul>${S.mchd.powers.map(k=>`<li>${esc(pMchdPowerLabels[k])}</li>`).join('')}</ul>`;}
function pMchdSummary(){const employee=pMchdEmployee();return pCompany()+`<div class="ap-description"><span class="ap-label">Сотрудник</span><strong>${esc(employee?.name||'')}</strong><p>${esc(employee?.email||'')}</p></div><div class="ap-group"><h3>Полномочия в МЧД</h3>${pMchdList()}</div>`;}
function pMchdWorkspace(){
 if(S.isDirector)return pActions('Выдать право подписи','mchd-start',false);
 if(S.mchd?.status==='signed'&&pMchdEmployee()?.email===S.email)return `<div class="ap-description"><strong>МЧД подписана руководителем</strong>${pMchdList()}</div>`;
 return '';
}
function proposalRoute(){
 if(S.legalFlow)return [['p-mchd-powers','Выбор полномочий'],['p-mchd-review','МЧД сформирована'],['p-mchd-sign','Подпись руководителя'],['p-mchd-done','МЧД подписана'],['p-workspace','Личный кабинет']];
 if(pMosOrgCase())return [['p-login','Вход'],['p-mos','mos.ru'],['p-mos-orgs','Организация из mos.ru'],['p-contact-org','Обратиться в организацию']];
 if(S.proposalPath==='employee'&&S.employeeEntry==='contact')return [['p-contact-org','Обратиться в организацию']];
 if(S.repeat)return [['p-login','Вход'],...(S.authMethod==='mos'?[['p-mos','mos.ru']]:[]),['p-company-picker','Выбор компании'],['p-workspace','Личный кабинет']];
 const auth=[['p-register','Личный аккаунт'],...(S.authMethod==='mos'?[['p-mos','mos.ru'],['p-mos-profile','Данные аккаунта']]:[])];
 if(S.proposalPath==='employee')return [['p-invitation','Вход по приглашению'],['p-accept-invite','Принятие приглашения'],['p-workspace','Личный кабинет']];
 return [...auth,['p-account','Подключение'],['p-company-search','Поиск по ИНН'],...(S.orgCase==='existing'?[['p-company-found','Компания найдена']]:[['p-company-record','Реквизиты'],['p-authority','Генеральный директор'],['p-sign','Электронная подпись'],['p-company-pending','Проверка платформой'],['p-company-ready','Компания подключена'],['p-invite-team','Сотрудники'],['p-invite-sent','Приглашение отправлено']]),['p-workspace','Личный кабинет']];
}
function proposalJourney(){
 const q=S.screen;let steps,title,intro;
 if(S.proposalPath==='powers')root.querySelector('#ap-demo-message').textContent='Организация и сотрудник уже подключены';
 if(S.legalFlow){
  title='Полномочия сотрудника';intro='Организация и сотрудник уже подключены. Обычный доступ в кабинет оформлен отдельно.';
  steps=[['Полномочия','Выбор руководителем',['p-mchd-powers']],['МЧД','Формирование платформой',['p-mchd-review']],['Подпись','Электронная подпись гендиректора',['p-mchd-sign']],['Работа','Полномочия после подписи',['p-mchd-done','p-workspace']]];
 }else if(pMosOrgCase()){
  title='Сотрудник и mos.ru';intro='На mos.ru организация есть; на платформе доступ ещё не назначен.';
  steps=[['Вход','Через личный аккаунт mos.ru',['p-login','p-mos']],['Организация','Сведения из mos.ru',['p-mos-orgs']],['Доступ','Обратиться к своей организации',['p-contact-org']]];
 }else if(S.proposalPath==='employee'&&S.employeeEntry==='contact'){
  title='Нет приглашения';intro='Для подключения нужен руководитель или администратор организации.';
  steps=[['Подключение','Обратиться в организацию',['p-contact-org','p-login','p-register','p-mos','p-mos-profile']]];
 }else if(S.repeat){
  title='Повторный вход';intro='Вход в уже подключённый рабочий кабинет.';
  steps=[['Вход','Ваш личный аккаунт',['p-login','p-mos']],['Компания','Назначенный рабочий кабинет',['p-company-picker']],['Работа','Только назначенные права',['p-workspace']]];
 }else if(S.proposalPath==='employee'){
  title='Подключение сотрудника';intro='Вход по приглашению в конкретную организацию.';
  steps=[['Приглашение','Войти или задать пароль',['p-invitation','p-login','p-register']],['Доступ к компании','Принять назначенные права',['p-accept-invite']],['Работа','Только назначенные права',['p-workspace']]];
 }else{
  title='Регистрация организации';intro='Личный аккаунт, проверка гендиректора и подключение команды.';
  steps=[['Личный аккаунт','Вход или создание аккаунта',['p-register','p-login','p-mos','p-mos-profile']],['Организация','Поиск по ИНН и реквизиты',['p-account','p-company-search','p-company-record','p-company-found','p-contact-org']],['Полномочия','ЭП гендиректора и проверка платформой',['p-authority','p-sign','p-company-pending','p-company-rejected','p-company-ready']],['Команда и работа','Приглашения и права сотрудников',['p-invite-team','p-invite-sent','p-workspace']]];
 }
 const current=Math.max(0,steps.findIndex(v=>v[2].includes(q)));
 const actor=q==='p-company-pending'?'Платформа':S.isDirector&&S.legalFlow?'Генеральный директор':S.isAdmin&&['p-company-ready','p-invite-team','p-invite-sent','p-workspace'].includes(q)?'Администратор организации':'Пользователь';
 root.querySelector('#ap-journey').innerHTML=`<div><span class="ap-label">Флоу 04 · проект решения</span><h3>${title}</h3><p class="ap-journey-intro">${intro}</p></div><ol class="ap-stage-list">${steps.map(([name,desc],i)=>`<li data-current="${i===current}" data-past="${i<current}"><span class="ap-stage-dot">${i+1}</span><div><strong>${name}</strong><small>${desc}</small></div></li>`).join('')}</ol><div class="ap-journey-foot">Сейчас действует: ${actor}.<br><br>Вход, доступ к компании и право подписи оформляются отдельно.</div>`;
}
function proposalError(message,ids=[]){
 const box=pane.querySelector('[role="alert"]');if(box){box.textContent=message;box.hidden=false;}
 ids.forEach(id=>pane.querySelector('#'+id)?.setAttribute('aria-invalid','true'));pane.querySelector('[aria-invalid="true"]')?.focus();
}
function pRights(prefix,values={objects:true,requests:true,people:false,finance:false}){
 const c=(id,label)=>`<label class="ap-check"><input type="checkbox" id="${prefix}-${id}" ${values[id]?'checked':''}><span>${label}</span></label>`;
 return `<div class="ap-group"><h3>Права в организации</h3>${c('objects','Работа с объектами')}${c('requests','Работа с заявками')}${c('people','Приглашение и управление сотрудниками')}${c('finance','Просмотр расчётов')}<p class="ap-muted">Право подписывать документы подтверждается отдельно.</p></div>`;
}
function readRights(prefix){return Object.fromEntries(['objects','requests','people','finance'].map(k=>[k,!!pane.querySelector('#'+prefix+'-'+k)?.checked]));}
function pActions(label,action,primary=true){return `<button type="button" ${primary?'class="ap-primary"':''} data-p-action="${action}">${label}</button>`;}
function pAlert(){return '<div class="ap-error" role="alert" hidden></div>';}
function pAuthHelp(){return `<div class="ap-staff-note"><strong>Вы сотрудник организации?</strong><p>Обратитесь к руководителю или администратору вашей организации. Он добавит вас на платформу и пришлёт приглашение.</p></div><details class="ap-auth-help"><summary>Как пользоваться платформой</summary><ol><li><strong>Войдите или зарегистрируйтесь.</strong> Используйте email и пароль или mos.ru.</li><li><strong>Если вы генеральный директор:</strong> найдите организацию по ИНН, подпишите заявление и дождитесь проверки платформой. Затем пригласите сотрудников.</li><li><strong>Если вы сотрудник:</strong> откройте приглашение от организации. Если приглашения нет, обратитесь к руководителю или администратору.</li><li><strong>Начните работу.</strong> После подключения будут доступны назначенные вам действия.</li></ol><p>Вход через mos.ru подтверждает личность. Наличие организации на mos.ru само по себе не назначает права в её кабинете на платформе.</p></details>`;}
function pContactNotice(){return `<div class="ap-status">Обратитесь в свою организацию</div><p>Попросите руководителя или администратора добавить вас на платформу и направить приглашение на ваш email.</p>`;}
function pMosButton(){return `<div class="ap-auth-provider">${pActions('Войти через mos.ru','start-mos',false)}</div><div class="ap-auth-separator">или по email</div>`;}
function pConnectionScreen(){return S.proposalPath==='employee'?'p-contact-org':'p-account';}
function pAfterLogin(){return S.inviteContext?'p-accept-invite':pMosOrgCase()?S.authMethod==='mos'?'p-mos-orgs':'p-contact-org':S.proposalPath==='employee'&&S.employeeEntry==='contact'?'p-contact-org':S.repeat?'p-company-picker':pConnectionScreen();}
function pAfterRegistration(){S.repeat=false;return S.inviteContext?'p-accept-invite':pConnectionScreen();}
function pCompany(){return `<div class="ap-description"><span class="ap-label">${S.companyType==='ip'?'Индивидуальный предприниматель':'Организация'}</span><strong>${esc(S.companyName)}</strong><p>ИНН ${esc(S.companyINN)}</p></div>`;}
function proposalRender(){
 if(!S.proposalPath)resetProposal();
 if(S.employeeEntry==='request')S.employeeEntry='contact';
 if(S.screen==='entry')S.screen=S.proposalPath==='powers'?'p-mchd-powers':pMosOrgCase()?'p-login':S.proposalPath==='employee'&&S.employeeEntry==='contact'?'p-contact-org':S.repeat?'p-login':S.proposalPath==='employee'&&S.employeeEntry==='invite'?'p-invitation':'p-register';
 if(['p-mail','p-letter','p-verified'].includes(S.screen))S.screen=S.accountVerified?pAfterLogin():'p-register';
 if(['p-documents','p-operator-review'].includes(S.screen))S.screen='p-authority';
 const removedRequestScreens=['p-employee-search','p-request','p-member-pending','p-member-review','p-member-denied','p-membership-ready'];
 if(removedRequestScreens.includes(S.screen))S.screen='p-contact-org';
 if(S.screen==='p-account'&&S.proposalPath==='employee')S.screen='p-contact-org';
 if(S.screen==='p-invitation'){S.inviteContext=true;S.repeat=false;}
 if(S.inviteContext&&['p-login','p-register'].includes(S.screen)){S.inviteHasAccount=S.screen==='p-login';S.screen='p-invitation';}
 S.history=S.history.filter(id=>!['p-mail','p-letter','p-verified','p-documents','p-operator-review',...removedRequestScreens].includes(id));
 const q=S.screen;let html='';
 root.querySelectorAll('[data-flow]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.flow===S.flow)));
 root.querySelector('#ap-repeat').disabled=S.legalFlow||pMosOrgCase()||S.proposalPath==='employee'&&S.employeeEntry==='contact';
 if(S.proposalPath==='powers')root.querySelector('#ap-demo-message').textContent='Организация и сотрудник уже подключены';
 root.querySelector('#ap-mos-org-note').hidden=!pMosOrgCase();
 root.querySelector('#ap-repeat').checked=S.repeat;root.querySelector('#ap-proposal-controls').hidden=false;
 root.querySelector('#ap-proposal-path').value=S.proposalPath;
 root.querySelector('#ap-proposal-entry-wrap').hidden=S.proposalPath!=='employee'||S.repeat&&!pMosOrgCase();
 root.querySelector('#ap-proposal-entry').value=S.employeeEntry;
 root.querySelector('#ap-org-control').hidden=S.proposalPath!=='company'||S.repeat;
 root.querySelector('#ap-org-case').value=S.orgCase;
 root.querySelector('#ap-brand').textContent='Предлагаемый вариант';
 root.querySelector('.ap-preview-badge').textContent='Проект решения';
 root.querySelector('#ap-context').textContent=q==='p-mos-orgs'?'Сведения mos.ru':S.isAdmin&&['p-company-ready','p-invite-team','p-invite-sent','p-workspace'].includes(q)?'Кабинет администратора':q==='p-invitation'?'Приглашение':S.repeat?'Повторный вход':S.proposalPath==='employee'?'Сотрудник':'Организация';
 const r=proposalRoute();const aliases={'p-company-rejected':'p-company-pending','p-login':'p-register'};const active=r.some(v=>v[0]===q)?q:aliases[q];
 root.querySelector('#ap-steps').innerHTML=r.map(([id,label])=>`<button type="button" data-jump="${id}" aria-pressed="${id===active}">${label}</button>`).join('');
 const i=r.findIndex(v=>v[0]===active);root.querySelector('#ap-screen-count').textContent=i>=0?`${i+1} / ${r.length}`:'';
 root.querySelector('#ap-map-count').textContent='· '+r.length+' экранов';root.querySelector('#ap-back').disabled=!S.history.length;
 if(q==='p-register'){
  const invited=S.proposalPath==='employee'&&S.employeeEntry==='invite';
  html=wrap('Создайте личный аккаунт',`<p class="ap-muted">Сначала зарегистрируйтесь как пользователь. Доступ к компании оформляется следующим шагом.</p>`+pMosButton()+form(field('Имя','p-name',S.personalName)+field('Email','p-email',invited?S.invitation.email:S.email,'email',invited)+field('Пароль','p-password','','password')+field('Повторите пароль','p-confirm','','password')+check('Принимаю пользовательское соглашение и условия обработки персональных данных','p-consent')+submit('Создать аккаунт','p-register'),'p-register')+`<p>Уже есть аккаунт? ${B('Войти','p-login',false)}</p>`+pAuthHelp());
 }else if(q==='p-login'){
  html=wrap('Войдите в личный аккаунт',pMosButton()+form(field('Email','p-email',S.email,'email')+field('Пароль','p-password','','password')+submit('Войти','p-login'),'p-login')+`<p>Нет аккаунта? ${B('Зарегистрироваться','p-register',false)}</p>`+pAuthHelp());
 }else if(q==='p-mos'){
  html=wrap('Вход через mos.ru',`<span class="ap-label">Внешний сервис · демонстрация перехода</span><div class="ap-description"><strong>Авторизация на mos.ru</strong><p>В рабочей системе вы перейдёте на mos.ru, войдёте в свой аккаунт и подтвердите передачу данных.</p></div><p>В прототипе вход и возврат показаны условно. Пароль от mos.ru здесь вводить не нужно.</p>${pActions('Продолжить с аккаунтом mos.ru','mos-return')}${pActions('Отменить и вернуться','mos-cancel',false)}`);
 }else if(q==='p-mos-profile'){
  const invited=S.proposalPath==='employee'&&S.employeeEntry==='invite';
  html=wrap('Завершите создание аккаунта',`<div class="ap-status">Вход через mos.ru выполнен. Доступ к организации ещё не предоставлен.</div><p>Укажите имя и контактную почту для личного аккаунта.</p>`+form(field('Имя','p-name',S.personalName)+field('Email','p-email',invited?S.invitation.email:S.email,'email',invited)+check('Принимаю пользовательское соглашение и условия обработки персональных данных','p-consent')+submit('Продолжить','p-mos-profile'),'p-mos-profile'));
 }else if(q==='p-account'){
  html=wrap('Подключитесь к компании',`<p>Аккаунт: ${esc(S.email)}</p><div class="ap-group"><h3>Я генеральный директор</h3><p>Найдите организацию по ИНН и подпишите заявление электронной подписью гендиректора.</p>${pActions('Подключить организацию','connect-company')}</div>`,true);
 }else if(q==='p-company-search'){
  html=wrap('Найдите организацию по ИНН',form(field('ИНН организации','p-inn',S.companyINN)+submit('Найти организацию','p-find-company'),'p-find-company')+`<p class="ap-muted">Поиск компании не предоставляет доступ к её данным и сотрудникам.</p>`);
 }else if(q==='p-company-record'){
  html=wrap('Проверьте реквизиты',form(`<p class="ap-muted">Сведения из реестра · демонстрационные данные</p><div class="ap-grid">${field(S.companyType==='ip'?'ФИО предпринимателя':'Наименование','p-company-name',S.companyName,'text',true)}${field('ИНН','p-inn-view',S.companyINN,'text',true)}${field(S.companyType==='ip'?'ОГРНИП':'ОГРН','p-ogrn',S.companyType==='ip'?'000000000000000':'0000000000000','text',true)}${S.companyType==='ip'?'':field('КПП','p-kpp','000000000','text',true)}${field(S.companyType==='ip'?'Адрес регистрации':'Юридический адрес','p-address','Адрес из реестра · пример','text',true)}${field('Email для связи с организацией','p-contact-email','office@example.test','email')}</div>`+submit('Продолжить','p-company-record'),'p-company-record'),true);
 }else if(q==='p-authority'){
  html=wrap('Подключение организации гендиректором',pCompany()+`<p>Зарегистрировать организацию может только её генеральный директор.</p>${field('Генеральный директор','p-applicant-name',S.personalName,'text',true)}<div class="ap-group"><h3>Электронная подпись гендиректора</h3><p>После подписания платформа проверит данные организации и полномочия руководителя.</p>${pActions('Продолжить с электронной подписью','choose-ep')}</div>`,true);
 }else if(q==='p-sign'){
  html=wrap('Электронная подпись гендиректора',pCompany()+`<div class="ap-description"><span class="ap-label">Пример сертификата</span><strong>${esc(S.personalName)}</strong><p>Генеральный директор</p></div><p>Подпишите заявление на подключение. Доступ к управлению организацией откроется после проверки платформой.</p>${pActions('Подписать и передать на проверку','verify-ep')}${pAlert()}`);
 }else if(q==='p-company-pending'){
  html=wrap('Организация на проверке',pCompany()+`<div class="ap-status">Платформа проверяет данные организации и полномочия генерального директора.</div><p>До завершения проверки приглашение сотрудников и работа с данными компании недоступны.</p><div class="ap-divider"><span class="ap-label">Демонстрация результата проверки</span>${pActions('Показать: проверка пройдена','company-approved',false)}${pActions('Показать: проверка не пройдена','company-rejected',false)}</div>`);
 }else if(q==='p-company-rejected'){
  html=wrap('Подключение не подтверждено',`<div class="ap-status">${esc(S.companyReason||'Не подтверждено, что заявитель является генеральным директором организации.')}</div><p>Доступ к данным организации и приглашение сотрудников не предоставлены.</p>${B('Проверить данные организации','p-company-record')}`);
 }else if(q==='p-company-ready'){
  html=wrap('Организация подключена',pCompany()+`<div class="ap-status">Полномочия подтверждены. Вам доступно администрирование кабинета.</div><p>Пригласите сотрудников и назначьте им права. Подписание документов требует отдельного подтверждения полномочий.</p>${B('Пригласить сотрудника','p-invite-team')}${B('Перейти в кабинет','p-workspace',false)}`);
 }else if(q==='p-invite-team'){
  html=wrap('Пригласите сотрудника',form(field('ФИО сотрудника','p-employee-name',S.invitation.name)+field('Email сотрудника','p-employee-email',S.invitation.email,'email')+pRights('p-invite',S.invitation)+submit('Отправить приглашение','p-invite'),'p-invite'),true);
 }else if(q==='p-invite-sent'){
  html=wrap('Приглашение отправлено',`<div class="ap-description"><strong>${esc(S.invitation.name)}</strong><p>${esc(S.invitation.email)}</p><p>${esc(S.companyName)}</p></div><p>Доступ появится после входа с указанным email и принятия приглашения.</p>${B('Перейти в кабинет','p-workspace')}<div class="ap-divider"><span class="ap-label">Продолжение за сотрудника</span>${pActions('Открыть приглашение сотрудника','handoff-employee',false)}</div>`);
 }else if(q==='p-invitation'){
  const existing=!!S.inviteHasAccount;
  html=wrap('Вас пригласили в организацию',`<div class="ap-description"><strong>${esc(S.invitation.company)}</strong><p>Приглашение для ${esc(S.invitation.email)}</p></div><div class="ap-invite-switch"><button type="button" data-p-action="invite-existing" aria-pressed="${existing}">У меня есть аккаунт</button><button type="button" data-p-action="invite-new" aria-pressed="${!existing}">Нет аккаунта</button></div><p>${existing?'Войдите с email, на который пришло приглашение.':'Задайте пароль для личного аккаунта. Имя и email уже указаны в приглашении.'}</p>`+form((existing?'':field('Имя','p-name',S.invitation.name,'text',true))+field('Email — логин','p-email',existing?S.email:S.invitation.email,'email',!existing)+field(existing?'Пароль':'Придумайте пароль','p-password','','password')+(existing?'':field('Повторите пароль','p-confirm','','password')+check('Принимаю пользовательское соглашение и условия обработки персональных данных','p-consent'))+submit(existing?'Войти':'Задать пароль и продолжить',existing?'p-invite-login':'p-invite-register'),existing?'p-invite-login':'p-invite-register'));
 }else if(q==='p-accept-invite'){
  const rights=S.invitation;const items=[rights.objects?'Работа с объектами':'',rights.requests?'Работа с заявками':'',rights.people?'Управление сотрудниками':'',rights.finance?'Просмотр расчётов':''].filter(Boolean);
  html=wrap('Примите приглашение',`<div class="ap-description"><strong>${esc(S.invitation.company)}</strong><p>Приглашённый email: ${esc(S.invitation.email)}</p><p>Вы вошли как: ${esc(S.email)}</p></div><div class="ap-group"><h3>Назначенные права</h3>${items.map(t=>`<p>${t}</p>`).join('')||'<p>Права ещё не назначены</p>'}</div>${pActions('Принять приглашение','accept-invite')}${B('Войти с другим email','p-login',false)}${pAlert()}`);
 }else if(q==='p-company-found'){
  html=wrap('Организация уже подключена',pCompany()+pContactNotice());
 }else if(q==='p-contact-org'){
  html=wrap('Подключение сотрудника',`${S.externalOrgPresent?pCompany():''}${pContactNotice()}${S.externalOrgPresent?'<p class="ap-muted">Ваша организация найдена на mos.ru. Доступ к данным компании на платформе ещё не назначен.</p>':''}${B('Вернуться ко входу','p-login',false)}`);
 }else if(q==='p-mos-orgs'){
  html=wrap('Ваша организация',`<p>Вход через mos.ru выполнен.</p><div class="ap-description"><span class="ap-label">Организация из mos.ru</span><strong>${esc(S.companyName)}</strong><p>ИНН ${esc(S.companyINN)}</p></div><div class="ap-status">Доступ к кабинету организации ещё не предоставлен</div><p>Вас добавили в организацию на mos.ru. Чтобы работать с её данными на платформе, нужно приглашение от руководителя или администратора.</p>${B('Как подключиться к организации','p-contact-org')}`);
 }else if(q==='p-mchd-powers'){
  const employee=pMchdEmployee();
  html=employee?wrap('Выберите полномочия сотрудника',pCompany()+`<div class="ap-description"><strong>${esc(employee.name)}</strong><p>${esc(employee.email)}</p></div><p>Отметьте, какие документы сотрудник сможет подписывать от имени организации.</p>`+form(Object.entries(pMchdPowerLabels).map(([key,label])=>`<label class="ap-check"><input id="p-mchd-power-${key}" type="checkbox" ${S.mchd.powers.includes(key)?'checked':''}><span>${label}</span></label>`).join('')+`<p class="ap-muted">После выбора платформа сформирует МЧД. Полномочия начнут действовать после её подписания руководителем.</p>`+submit('Сформировать МЧД','p-mchd-generate'),'p-mchd-generate'),true):wrap('Сначала подключите сотрудника',`<p>Выдать полномочия можно сотруднику, который уже принял приглашение организации.</p>${B('Пригласить сотрудника','p-invite-team')}`);
 }else if(q==='p-mchd-review'){
  html=wrap('Проверьте сформированную МЧД',`<div class="ap-status">МЧД сформирована · ещё не подписана</div>`+pMchdSummary()+`<p>Проверьте сотрудника и выбранные полномочия. До подписания эта доверенность не предоставляет ему право подписи.</p>${B('Перейти к подписи ЭП','p-mchd-sign')}${B('Изменить полномочия','p-mchd-powers',false)}`,true);
 }else if(q==='p-mchd-sign'){
  html=wrap('Подпишите МЧД электронной подписью',pMchdSummary()+`<div class="ap-description"><span class="ap-label">Пример сертификата руководителя</span><strong>${esc(S.personalName)}</strong><p>Генеральный директор · ${esc(S.companyName)}</p></div>${pActions('Подписать МЧД','mchd-sign')}${B('Вернуться к проверке МЧД','p-mchd-review',false)}${pAlert()}`,true);
 }else if(q==='p-mchd-done'){
  html=wrap('МЧД подписана',`<div class="ap-status">Доверенность подписана электронной подписью руководителя</div>`+pMchdSummary()+`<p>Сотруднику оформлены выбранные полномочия. Доступ к разделам кабинета настраивается отдельно.</p>${B('В кабинет руководителя','p-workspace')}<div class="ap-divider"><span class="ap-label">Продолжение за сотрудника · демонстрация</span>${pActions('Посмотреть кабинет сотрудника','mchd-employee-view',false)}</div>`,true);
 }else if(q==='p-company-picker'){
  html=wrap('Выберите организацию',`<p>Вы вошли как ${esc(S.email)}. Один аккаунт может быть подключён к нескольким компаниям.</p><div class="ap-grid">${pActions('ООО «Пример» · администратор','pick-admin',false)}${pActions('ООО «Пример 2» · сотрудник','pick-employee',false)}</div>`,true);
 }else if(q==='p-workspace'){
  const rights=S.employeeRights||{};
  html=wrap('Личный кабинет',pCompany()+`<div class="ap-status">Вход выполнен. Вы работаете в выбранной организации.</div><div class="ap-description"><strong>${esc(S.personalName)}</strong><p>${esc(S.email)}</p><p>${S.isAdmin?'Администратор кабинета':'Сотрудник организации'}</p></div><div class="ap-group"><h3>Доступные действия</h3>${S.isAdmin||rights.objects?'<p>Работа с объектами</p>':''}${S.isAdmin||rights.requests?'<p>Работа с заявками</p>':''}${rights.finance?'<p>Просмотр расчётов</p>':''}${S.isAdmin?B('Пригласить сотрудника','p-invite-team',false):'<p>Управление сотрудниками не назначено.</p>'}<p class="ap-muted">Право подписывать документы подтверждается отдельно.</p></div>`,true);
 }else{S.screen='entry';proposalRender();return;}
 if(q==='p-workspace')html=html.replace('<div class="ap-group"><h3>Доступные действия</h3>','<div class="ap-group"><h3>Доступные действия</h3>'+pMchdWorkspace());
 const needsAccount=!['p-register','p-login','p-invitation','p-mos','p-mos-profile','p-contact-org'].includes(q);
 if(needsAccount&&!S.accountVerified)html=wrap('Сначала войдите в личный аккаунт',`<p>Для продолжения войдите в личный аккаунт.</p>${B('Перейти ко входу','p-login')}`);
 else if(q.startsWith('p-mchd-')&&(!S.isDirector||!S.orgVerified))html=wrap('Нужен генеральный директор',`<p>МЧД оформляет и подписывает генеральный директор подключённой организации.</p>${B('Вернуться в кабинет','p-workspace')}`);
 else if(['p-mchd-review','p-mchd-sign'].includes(q)&&(!pMchdEmployee()||!S.mchd.powers.length||!['prepared','signed'].includes(S.mchd.status)))html=wrap('Сначала сформируйте МЧД',B('Выбрать полномочия','p-mchd-powers'));
 else if(q==='p-mchd-done'&&S.mchd.status!=='signed')html=wrap('МЧД ещё не подписана',B('Вернуться к МЧД','p-mchd-review'));
 else if(['p-company-ready','p-invite-team','p-invite-sent'].includes(q)&&(!S.orgVerified||!S.isAdmin))html=wrap('Доступ откроется после проверки',`<p>Для управления сотрудниками нужны подтверждённые полномочия и право администрирования.</p>${B('Подтвердить полномочия','p-authority')}`);
 else if(q==='p-workspace'&&!S.memberActive)html=wrap('Подключение ещё не завершено',`<p>Подтвердите полномочия или получите доступ от администратора.</p>${B('Вернуться к подключению','p-account')}`);
 else if(q==='p-company-pending'&&!S.pendingCompany)html=wrap('Заявка ещё не отправлена',B('Подписать заявление','p-sign'));
 else if(q==='p-mos-orgs'&&(S.authMethod!=='mos'||!S.externalOrgPresent))html=wrap('Войдите через mos.ru',`<p>Чтобы увидеть сведения организации, войдите через mos.ru.</p>${B('Перейти ко входу','p-login')}`);
 pane.innerHTML=html;

 enhance();
}
function proposalAction(action){
 const value=id=>pane.querySelector('#'+id)?.value.trim()||'';
 if(action==='mchd-start'){S.legalFlow=true;go('p-mchd-powers');}
 else if(action==='mchd-sign'){
  if(!S.isDirector||!S.orgVerified||!pMchdEmployee()||S.mchd.status!=='prepared'||!S.mchd.powers.length)return proposalError('Сначала сформируйте МЧД и войдите как генеральный директор.');
  S.mchd.status='signed';go('p-mchd-done');
 }else if(action==='mchd-employee-view'){
  const employee=pMchdEmployee();if(!employee||S.mchd.status!=='signed')return;
  S.personalName=employee.name;S.email=employee.email;S.isDirector=false;S.isAdmin=false;S.employeeRights={objects:true,requests:true,people:false,finance:false};go('p-workspace');
 }else if(action==='start-mos'){S.mosIntent=S.screen==='p-login'?'login':'register';S.authMethod='mos';go('p-mos');}
 else if(action==='mos-cancel'){S.authMethod='email';go(S.mosIntent==='login'?'p-login':'p-register');}
 else if(action==='mos-return'){if(pMosOrgCase()){S.accountVerified=true;S.externalOrgPresent=true;S.companyName='ООО «Пример»';S.companyINN='0000000000';S.memberActive=false;S.isAdmin=false;S.orgVerified=false;go('p-mos-orgs');}else if(S.mosIntent==='register')go('p-mos-profile');else{S.accountVerified=true;go(pAfterLogin());}}
 else if(action==='connect-company'){S.proposalPath='company';go('p-company-search');}
 else if(action==='open-invitation'){S.proposalPath='employee';S.employeeEntry='invite';S.inviteContext=true;go('p-invitation');}
 else if(action==='invite-existing'||action==='invite-new'){S.inviteHasAccount=action==='invite-existing';S.pIdentity++;proposalRender();}
 else if(action==='choose-ep'){S.applicant='director';go('p-sign');}
 else if(action==='verify-ep'){S.pendingCompany=true;S.orgVerified=false;S.memberActive=false;S.isAdmin=false;go('p-company-pending');}
 else if(action==='company-approved'||action==='company-rejected'){
  if(!S.pendingCompany)return proposalError('Сначала подпишите заявление на подключение.');
  S.pendingCompany=false;S.orgVerified=action==='company-approved';S.memberActive=S.orgVerified;S.isAdmin=S.orgVerified;S.isDirector=S.orgVerified;
  S.companyReason='Не подтверждено, что заявитель является генеральным директором организации.';go(S.orgVerified?'p-company-ready':'p-company-rejected');
 }else if(action==='handoff-employee'){
  S.proposalPath='employee';S.employeeEntry='invite';S.accountVerified=false;S.memberActive=false;S.isAdmin=false;S.email=S.invitation.email;S.personalName=S.invitation.name;S.pIdentity++;S.inviteContext=true;S.inviteHasAccount=false;S.repeat=false;go('p-invitation');
 }else if(action==='accept-invite'){
  if(S.email.toLowerCase()!==S.invitation.email.toLowerCase())return proposalError('Приглашение выдано другому email. Войдите с адресом получателя.');
  S.companyName=S.invitation.company;S.orgVerified=true;S.memberActive=true;S.isAdmin=!!S.invitation.people;S.isDirector=false;S.invitation.accepted=true;S.employeeRights={...S.invitation};S.inviteContext=false;go('p-workspace');
 }else if(action==='pick-admin'||action==='pick-employee'){
  S.companyName=action==='pick-admin'?'ООО «Пример»':'ООО «Пример 2»';S.orgVerified=true;S.memberActive=true;S.isAdmin=action==='pick-admin';S.employeeRights={objects:true,requests:true,people:S.isAdmin,finance:false};go('p-workspace');
 }
 persist();
}
function proposalSubmit(action,f){
 const v=id=>f.querySelector('#'+id)?.value.trim()||'';const checked=id=>!!f.querySelector('#'+id)?.checked;
 f.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
 if(action==='p-mchd-generate'){
  if(!S.isDirector||!S.orgVerified||!pMchdEmployee())return proposalError('Для оформления МЧД нужны генеральный директор и подключённый сотрудник.');
  const powers=Object.keys(pMchdPowerLabels).filter(key=>checked('p-mchd-power-'+key));
  if(!powers.length)return proposalError('Выберите хотя бы одно полномочие.');
  S.mchd={status:'prepared',powers};go('p-mchd-review');
 }else if(action==='p-invite-register'||action==='p-invite-login'){
  const existing=action==='p-invite-login';const ids=existing?['p-email','p-password']:['p-email','p-password','p-confirm'];
  const missing=ids.filter(id=>!v(id));if(missing.length)return proposalError('Заполните поля.',missing);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('p-email')))return proposalError('Проверьте email.',['p-email']);
  if(!existing&&v('p-password')!==v('p-confirm'))return proposalError('Пароли не совпадают.',['p-confirm']);
  if(!existing&&!checked('p-consent'))return proposalError('Отметьте принятие условий регистрации.',['p-consent']);
  S.email=v('p-email');S.personalName=S.invitation.name;S.accountVerified=true;S.authMethod='email';go('p-accept-invite');
 }else if(action==='p-register'){
  const missing=['p-name','p-email','p-password','p-confirm'].filter(id=>!v(id));if(missing.length)return proposalError('Заполните поля регистрации.',missing);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('p-email')))return proposalError('Проверьте email.',['p-email']);
  if(v('p-password')!==v('p-confirm'))return proposalError('Пароли не совпадают.',['p-confirm']);
  if(!checked('p-consent'))return proposalError('Отметьте принятие условий регистрации.',['p-consent']);
  S.email=v('p-email');S.personalName=v('p-name');S.accountVerified=true;go(pAfterRegistration());
 }else if(action==='p-mos-profile'){
  const missing=['p-name','p-email'].filter(id=>!v(id));if(missing.length)return proposalError('Укажите имя и email.',missing);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('p-email')))return proposalError('Проверьте email.',['p-email']);
  if(!checked('p-consent'))return proposalError('Отметьте принятие условий регистрации.',['p-consent']);
  S.email=v('p-email');S.personalName=v('p-name');S.accountVerified=true;go(pAfterRegistration());
 }else if(action==='p-login'){
  const missing=['p-email','p-password'].filter(id=>!v(id));if(missing.length)return proposalError('Введите email и пароль.',missing);
  S.email=v('p-email');S.authMethod='email';S.accountVerified=true;go(pAfterLogin());
 }else if(action==='p-find-company'){
  const inn=v('p-inn');if(!/^\d{10}$/.test(inn))return proposalError('Введите ИНН юридического лица из 10 цифр.',['p-inn']);
  S.companyINN=inn;S.companyType=inn.length===12?'ip':'legal';S.companyName=S.companyType==='ip'?'ИП Иванов Иван Иванович':'ООО «Пример»';
  go(S.orgCase==='existing'?'p-company-found':'p-company-record');
 }else if(action==='p-company-record'){
  if(!v('p-contact-email'))return proposalError('Укажите email для связи.',['p-contact-email']);go('p-authority');
 }else if(action==='p-invite'){
  if(!S.orgVerified||!S.isAdmin)return proposalError('Управление сотрудниками пока недоступно.');
  if(!v('p-employee-name')||!v('p-employee-email'))return proposalError('Укажите имя и email сотрудника.',['p-employee-name','p-employee-email'].filter(id=>!v(id)));
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('p-employee-email')))return proposalError('Проверьте email сотрудника.',['p-employee-email']);
  S.invitation={name:v('p-employee-name'),email:v('p-employee-email'),company:S.companyName,...readRights('p-invite')};go('p-invite-sent');

 }
}
