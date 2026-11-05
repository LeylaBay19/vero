// Independent proposal: account -> organization -> service-specific access.
let V2;
function resetV2(){
 const path=root.querySelector('#ap-v2-path')?.value||'personal';
 V2={path,screen:path==='invite'?'invite':'login',email:path==='invite'?'employee@example.test':'',authenticated:false,member:false,authority:false,service:false,mchd:'none',invitationValid:true,inn:'',name:'',role:'',pending:false,history:[],message:''};
}
const v2Button=(label,action,primary=true)=>`<button type="button" ${primary?'class="ap-primary"':''} data-v2-action="${action}">${label}</button>`;
const v2Status=text=>`<div class="ap-status">${esc(text)}</div>`;
function v2Go(screen){V2.history.push(V2.screen);V2.screen=screen;V2.message='';render();}
function v2Error(message){const e=pane.querySelector('[role=alert]');if(e){e.hidden=false;e.textContent=message;}}
function v2Authenticated(){V2.authenticated=true;if(V2.path==='personal'){const link=root.querySelector('#ap-v2-membership').value;if(link!=='none'){V2.member=true;V2.authority=link==='director';V2.inn='0000000000';V2.name='ООО «Пример»';}}v2Go(V2.path==='invite'&&!V2.member?'accept':'home');}
function v2Journey(){
 const stages=[['Аккаунт','Вход по email или mos.ru'],['Организация','Подтвердить связь с компанией'],['Сота','Настроить выбранный сервис']];
 const current=['login','code','mos','invite','accept'].includes(V2.screen)?0:['company','record','authority','invite-team','invite-sent'].includes(V2.screen)?1:2;
 root.querySelector('#ap-journey').innerHTML=`<div><span class="ap-label">Предлагаемый вариант 2</span><h3>Начните с простого</h3><p class="ap-journey-intro">Общий кабинет сразу после входа. Дополнительные сведения — для выбранной задачи.</p></div><ol class="ap-stage-list">${stages.map(([name,desc],i)=>`<li data-current="${i===current}" data-past="${i<current}"><span class="ap-stage-dot">${i+1}</span><div><strong>${name}</strong><small>${desc}</small></div></li>`).join('')}</ol><div class="ap-journey-foot">Аккаунт, связь с компанией и полномочия сервиса проверяются отдельно.</div>`;
}
function v2Render(){
 if(!V2)resetV2();
 if(!V2.authenticated&&!['login','code','mos','invite','invalid'].includes(V2.screen))V2.screen='login';
 if(V2.screen==='ready'&&!V2.service)V2.screen='service';
 if(V2.screen==='mchd-review'&&V2.mchd!=='pending')V2.screen=V2.service?'ready':'service';
 const q=V2.screen;
 root.querySelector('#ap-proposal-controls').hidden=true;
 for(const id of ['ap-mos-org-note','ap-director-review','ap-sign-result-wrap','ap-return-employee','ap-invite-demo-note','ap-org-control'])root.querySelector('#'+id).hidden=true;
 root.querySelector('#ap-v2-controls').hidden=false;
 root.querySelector('.ap-repeat-label').hidden=true;
 root.querySelector('#ap-repeat').disabled=true;
 root.querySelector('#ap-brand').textContent='Предлагаемый вариант 2';
 root.querySelector('.ap-brand-mark').textContent='05';
 root.querySelector('.ap-preview-badge').textContent='Проект решения · вариант 2';
 root.querySelector('#ap-context').textContent=V2.authenticated?'Общий кабинет':'Вход на платформу';
 root.querySelectorAll('[data-flow]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.flow==='proposal2')));
 root.querySelector('#ap-steps').innerHTML='';root.querySelector('#ap-map-count').textContent='· последовательный процесс';
 root.querySelector('#ap-screen-count').textContent='Вариант 2';root.querySelector('#ap-back').disabled=!V2.history.length;
 root.querySelector('#ap-v2-membership-wrap').hidden=V2.path!=='personal'||V2.authenticated;
 root.querySelector('#ap-v2-code-note').hidden=q!=='code';
 root.querySelector('#ap-v2-outcome-wrap').hidden=!['authority','service-check','mchd-review','mchd-existing'].includes(q);
 root.querySelector('#ap-v2-director').hidden=!(q==='mchd-wait'&&V2.mchd==='pending');
 root.querySelector('#ap-v2-invite-state-wrap').hidden=V2.path!=='invite'||V2.member;
 let body='';
 if(q==='invite')body=wrap('Вас приглашают в команду',`<div class="ap-description"><strong>ООО «Пример»</strong><p>Доступ: внутренние черновики. Операции ОССиГ подключаются отдельно.</p><p>Приглашение для employee@example.test</p></div>${v2Button('Войти и принять приглашение','invite-login')}`);
 if(q==='login')body=wrap('Добро пожаловать',`<p>Войдите, чтобы выбрать сервис и начать работу. Данные компании можно добавить позже.</p>${form(field('Email','v2-email',V2.email,'email')+check('Принимаю условия использования платформы','v2-terms')+submit('Получить код','v2-email'),'v2-email')}<div class="ap-auth-separator">или</div>${v2Button('Войти через mos.ru','mos',false)}`);
 if(q==='code')body=wrap('Проверьте почту',`<p>Код отправлен на ${esc(V2.email)}.</p>${V2.path==='invite'?'<p>Подтвердите почту получателя приглашения. Компания уже указана, вводить ИНН не нужно.</p>':''}${form(field('Код из письма','v2-code','','text')+submit('Продолжить','v2-code'),'v2-code')}${v2Button('Отправить код ещё раз','resend',false)}${v2Button('Изменить email','email-back',false)}`);
 if(q==='mos')body=wrap('Вход через mos.ru',`<p>Подтвердите вход в своём аккаунте mos.ru. Права на компанию назначаются отдельно.</p>${v2Button('Продолжить','mos-return')}${v2Button('Отменить','email-back',false)}`);
 if(q==='accept')body=wrap('Примите приглашение',`<div class="ap-description"><strong>ООО «Пример»</strong><p>ИНН 0000000000 · сотрудник</p><p>Внутренние черновики. Управление командой и операции ОССиГ пока недоступны.</p></div>${check('Присоединиться к организации с указанным доступом','v2-accept')}${v2Button('Принять приглашение','accept')}${v2Button('Отклонить','decline',false)}`);
 if(q==='home')body=wrap('Ваш личный кабинет',`${v2Status(V2.member?`${V2.name||'ООО «Пример»'} · ${V2.authority?'полномочия руководителя подтверждены':V2.orgRepresentative?'полномочия представителя подтверждены':'доступ сотрудника подтверждён'}`:'Аккаунт создан. Организация пока не подключена.')}<div class="ap-group"><h3>Организация</h3><p>${V2.member?'Вы работаете с назначенным доступом.':'Для действий от имени компании подтвердите связь с ней.'}</p>${V2.member?(V2.authority?v2Button('Пригласить сотрудника','invite-team',false):''):v2Button(V2.pending?'Продолжить подключение':'Подключить организацию','company',false)}</div><div class="ap-v2-services"><div class="ap-group"><span class="ap-label">Сота</span><h3>ОССиГ</h3><p>Перевозка и учёт строительных отходов.</p>${v2Button(V2.service?'Открыть сервис':'Подключить сервис','ossig')}</div><div class="ap-group"><span class="ap-label">Сота</span><h3>Закупки</h3><p>Подготовьте личный черновик потребности.</p>${v2Button('Создать черновик','draft',false)}</div></div>`,true);
 if(q==='draft')body=wrap('Черновик потребности',`<p>Черновик виден только вам. Он не отправляется поставщикам и не создаёт обязательств компании.</p>${form(field('Что нужно приобрести','v2-draft',V2.draft||'')+submit('Сохранить черновик','v2-draft'),'v2-draft')}${v2Button('В кабинет','home',false)}`);
 if(q==='company')body=wrap('Подключите организацию',`<p>Найдём реквизиты по ИНН. Если компания уже подключена, используем её существующий кабинет.</p>${form(field('ИНН организации или ИП','v2-inn',V2.inn)+submit('Найти','v2-company'),'v2-company')}${v2Button('Сделать позже','home',false)}`);
 if(q==='record')body=wrap('Проверьте организацию',`<div class="ap-description"><strong>${esc(V2.name)}</strong><p>ИНН ${esc(V2.inn)}</p></div><p>Добавление реквизитов не открывает данные компании. Для подключения подтвердите полномочия или передайте подготовку руководителю.</p>${v2Button('Подтвердить полномочия','authority')}${v2Button('Сохранить для руководителя','prepare',false)}${v2Button('Я сотрудник: как получить доступ','contact',false)}`);
 if(q==='authority')body=wrap('Подтвердите полномочия',`<p>Руководитель или ИП использует свою УКЭП. Представитель — личную УКЭП и действующую МЧД с подходящими полномочиями.</p>${form(select('Основание полномочий','v2-basis',['Руководитель / ИП','Представитель с МЧД'])+submit('Проверить и подключить','v2-authority'),'v2-authority')}${v2Button('Вернуться позже','home',false)}`);
 if(q==='prepared')body=wrap('Подготовка сохранена',`<p>Реквизиты доступны в вашем личном кабинете. Передайте руководителю ИНН компании: он сможет войти и подтвердить полномочия. Доступ к данным организации ещё не открыт.</p>${v2Button('В личный кабинет','home')}`);
 if(q==='contact')body=wrap('Обратитесь в организацию',`<p>Попросите руководителя или администратора пригласить вас на любую удобную почту. Повторно регистрировать компанию не нужно.</p>${v2Button('В личный кабинет','home')}`);
 if(q==='invite-team')body=wrap('Пригласите сотрудника',`${form(field('Имя сотрудника','v2-person')+field('Email приглашения','v2-invite-email','','email')+'<p>Доступ: внутренние черновики. Полномочия для ОССиГ можно оформить при подключении сервиса.</p>'+submit('Создать приглашение','v2-invite'),'v2-invite')}`);
 if(q==='invite-sent')body=wrap('Приглашение подготовлено',`<p>${esc(V2.invitee)} · ${esc(V2.inviteEmail)}</p><p>После входа сотрудник примет приглашение и получит назначенный доступ.</p>${v2Button('В кабинет','home')}`);
 if(q==='service')body=wrap('Подключение ОССиГ',`<p>Проверим организацию и полномочия для выбранной деятельности. Личный кабинет продолжает работать.</p>${v2Status(V2.member?'Связь с организацией подтверждена':'Сначала подтвердите связь с организацией')}${V2.member?form(select('Роль организации в ОССиГ','v2-role',['Отходообразователь','Отходоперевозчик','Отходополучатель'])+check('Принимаю условия использования сервиса ОССиГ','v2-service-terms')+submit('Проверить готовность','v2-service'),'v2-service'):v2Button('Подключить организацию','company')}${v2Button('Позже','home',false)}`);
 if(q==='service-check')body=wrap('Проверка готовности',`<p>${esc(V2.role)} · ${esc(V2.name||'ООО «Пример»')}</p><div class="ap-description"><strong>Для начала работы</strong><p>Проверка сведений организации в реестрах ОССиГ, условий сервиса и полномочий пользователя. Состав дополнительных сведений зависит от роли.</p></div>${v2Button('Выполнить проверку','service-verify')}${v2Button('Вернуться в кабинет','home',false)}`);
 if(q==='mchd')body=wrap('Подтвердите полномочия для ОССиГ',`<p>Доступ сотрудника к компании уже есть. Для передачи данных от её имени нужны подходящие полномочия.</p>${v2Button('Проверить действующую МЧД','mchd-existing')}${v2Button('Подготовить МЧД руководителю','mchd-prepare',false)}${v2Button('Позже','home',false)}`);
 if(q==='mchd-existing')body=wrap('Действующая МЧД',`${form(field('Номер МЧД','v2-mchd-id')+'<p>Проверим доверителя, представителя, срок, отсутствие отзыва и соответствие полномочий выбранным операциям.</p>'+submit('Проверить МЧД','v2-mchd'),'v2-mchd')}`);
 if(q==='mchd-wait')body=wrap('МЧД ожидает руководителя',`<p>Подготовлена доверенность на передачу данных в рамках выбранной роли ОССиГ. Руководитель проверит сотрудника и полномочия, затем подпишет её.</p><p>Вы не подписываете собственную МЧД. Обычный доступ к кабинету сохранён.</p>${v2Button('В кабинет','home')}`);
 if(q==='mchd-review')body=wrap('Проверьте МЧД сотрудника',`<div class="ap-description"><strong>${esc(V2.name||'ООО «Пример»')} → ${esc(V2.email)}</strong><p>${esc(V2.role)}: полномочия на передачу данных в ОССиГ.</p></div><p>После подписи платформа проверит доверенность. Права администратора сотруднику не назначаются.</p>${v2Button('Подписать УКЭП руководителя','mchd-sign')}${v2Button('Отложить','mchd-wait',false)}`);
 if(q==='ready')body=wrap('ОССиГ подключён',`${v2Status('Необходимые проверки пройдены')}<p>${esc(V2.role)}. Доступны только проверенные полномочия сервиса. Для подписи документов потребуется соответствующая УКЭП.</p>${v2Button('В общий кабинет','home')}`);
 if(q==='invalid')body=wrap('Приглашение недоступно',`<p>Срок истёк или приглашение отозвано. Попросите отправить новое. Доступ к организации не предоставлен.</p>${v2Button('Перейти к обычному входу','normal-login')}`);
 if(!body){V2.screen=V2.authenticated?'home':'login';return v2Render();}
 pane.innerHTML=body+`<div class="ap-error" role="alert" hidden></div>`;
 enhance();v2Journey();if(['login','invite','code'].includes(q))pane.querySelector('.ap-form').insertAdjacentHTML('beforeend',`__PLATFORM_HELP__`);root.querySelector('.ap-brand-mark').textContent='05';root.querySelector('#ap-demo').hidden=!pane.querySelector('form');
}
function v2Outcome(){return root.querySelector('#ap-v2-outcome').value;}
function v2Action(action){
 const authOnly=['home','draft','company','record','authority','prepare','contact','ossig','service-verify','mchd-existing','mchd-prepare','mchd-sign','invite-team'];
 if(authOnly.includes(action)&&!V2.authenticated)return v2Error('Сначала войдите в аккаунт.');
 if(action==='invite-login'){if(root.querySelector('#ap-v2-invite-state').value==='invalid')return v2Go('invalid');return v2Go('login');}
 if(action==='normal-login'){resetV2();V2.path='personal';V2.email='';return v2Go('login');}
 if(action==='mos'){if(!pane.querySelector('#v2-terms')?.checked)return v2Error('Примите условия использования платформы.');return v2Go('mos');}
 if(action==='mos-return'){if(V2.path==='invite'){V2.email='employee@example.test';return v2Go('code');}if(V2.email!=='mos-user@example.test'){V2.member=false;V2.authority=false;V2.orgRepresentative=false;V2.service=false;V2.mchd='none';V2.role='';V2.history=[];}V2.email='mos-user@example.test';return v2Authenticated();}
 if(action==='email-back')return v2Go('login');
 if(action==='resend'){v2Error('Новый код отправлен. Используйте последний код из письма.');return;}
 if(action==='accept'){
  if(!V2.authenticated)return v2Error('Сначала подтвердите вход.');
  if(root.querySelector('#ap-v2-invite-state').value==='invalid')return v2Go('invalid');
  if(!pane.querySelector('#v2-accept')?.checked)return v2Error('Подтвердите принятие приглашения.');
  V2.member=true;V2.inn='0000000000';V2.name='ООО «Пример»';return v2Go('home');
 }
 if(action==='decline'){V2.path='personal';return v2Go('home');}
 if(action==='prepare'){V2.pending=true;return v2Go('prepared');}
 if(action==='ossig')return v2Go(V2.service?'ready':V2.mchd==='pending'?'mchd-wait':'service');
 if(action==='service-verify'){
  if(!V2.member||!V2.role)return v2Error('Сначала подключите организацию и выберите роль.');
  if(v2Outcome()!=='success')return v2Error('Проверка не завершена: уточните сведения и повторите. Операции ОССиГ пока недоступны.');
  if(!V2.authority&&V2.mchd!=='valid')return v2Go('mchd');V2.service=true;return v2Go('ready');
 }
 if(action==='mchd-prepare'){if(!V2.member||!V2.role)return;V2.mchd='pending';return v2Go('mchd-wait');}
 if(action==='director-review'){if(V2.mchd!=='pending')return;return v2Go('mchd-review');}
 if(action==='mchd-sign'){
  if(V2.screen!=='mchd-review'||V2.mchd!=='pending')return;
  if(v2Outcome()!=='success')return v2Error(v2Outcome()==='no-certificate'?'Подключите УКЭП руководителя. МЧД остаётся неподписанной.':'Подпись не прошла проверку. Исправьте ошибку и повторите.');
  V2.mchd='valid';return v2Go('service-check');
 }
 if(action==='invite-team'&&!V2.authority)return v2Error('Приглашать сотрудников может уполномоченный администратор.');
 if(['home','draft','company','authority','contact','invite-team','mchd-existing','mchd-wait'].includes(action))return v2Go(action);
}
function v2Submit(action,f){
 const v=id=>f.querySelector('#'+id)?.value.trim()||'';
 const validEmail=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
 if(action==='v2-email'){
  if(!validEmail(v('v2-email')))return v2Error('Укажите корректный email.');
  if(!f.querySelector('#v2-terms').checked)return v2Error('Примите условия использования платформы.');
  if(V2.path==='invite'&&v('v2-email').toLowerCase()!=='employee@example.test')return v2Error('Для этого приглашения подтвердите почту employee@example.test или попросите новое приглашение.');
  if(V2.email&&V2.email!==v('v2-email')){V2.member=false;V2.authority=false;V2.orgRepresentative=false;V2.service=false;V2.mchd='none';V2.role='';V2.history=[];}V2.authenticated=false;V2.email=v('v2-email');return v2Go('code');
 }
 if(action==='v2-code'){if(v('v2-code')!=='123456')return v2Error('Неверный код. Проверьте письмо и повторите.');return v2Authenticated();}
 if(!V2.authenticated)return v2Error('Сначала войдите в аккаунт.');
 if(action==='v2-company'){if(!/^(\d{10}|\d{12})$/.test(v('v2-inn')))return v2Error('Введите ИНН из 10 или 12 цифр.');if(V2.inn!==v('v2-inn')){V2.member=false;V2.authority=false;V2.orgRepresentative=false;V2.service=false;V2.mchd='none';V2.role='';V2.pending=false;V2.history=[];}V2.inn=v('v2-inn');V2.name=V2.inn.length===12?'ИП Иванов И. И.':'ООО «Пример»';return v2Go(V2.member?'home':'record');}
 if(action==='v2-authority'){
  if(!V2.inn)return v2Error('Сначала выберите организацию.');
  if(v2Outcome()!=='success')return v2Error(v2Outcome()==='no-certificate'?'Для подтверждения подключите УКЭП. Можно продолжить в личном кабинете.':'Проверка полномочий не пройдена. Доступ не выдан; исправьте данные или передайте подготовку руководителю.');
  V2.member=true;V2.authority=v('v2-basis')==='Руководитель / ИП';V2.orgRepresentative=!V2.authority;return v2Go('home');
 }
 if(action==='v2-service'){if(!V2.member)return v2Error('Подтвердите связь с организацией.');if(!f.querySelector('#v2-service-terms').checked)return v2Error('Примите условия сервиса.');if(V2.role!==v('v2-role')){V2.service=false;V2.mchd='none';V2.history=[];}V2.role=v('v2-role');return v2Go('service-check');}
 if(action==='v2-mchd'){if(!V2.member||!V2.role)return;if(!v('v2-mchd-id'))return v2Error('Укажите номер МЧД.');if(v2Outcome()!=='success')return v2Error('МЧД не подходит, истекла или отозвана. Проверьте данные либо оформите новую.');V2.mchd='valid';return v2Go('service-check');}
 if(action==='v2-draft'){if(!v('v2-draft'))return v2Error('Опишите потребность.');V2.draft=v('v2-draft');v2Error('Черновик сохранён в текущем сеансе.');return;}
 if(action==='v2-invite'){if(!V2.authority)return;if(!v('v2-person')||!validEmail(v('v2-invite-email')))return v2Error('Укажите имя и корректный email сотрудника.');V2.invitee=v('v2-person');V2.inviteEmail=v('v2-invite-email');return v2Go('invite-sent');}
}

function v2Autofill(){
 const examples={
  'v2-email':V2.path==='invite'?'employee@example.test':'ivan@example.test',
  'v2-code':'123456','v2-inn':'0000000000','v2-person':'Анна Петрова',
  'v2-invite-email':'anna@example.test','v2-draft':'Песок строительный, 20 м³',
  'v2-mchd-id':'00000000-0000-4000-8000-000000000001'
 };
 pane.querySelectorAll('form input:not([readonly]):not([disabled])').forEach(input=>{
  if(!Object.hasOwn(examples,input.id)||input.value.trim())return;
  input.value=examples[input.id];input.removeAttribute('aria-invalid');
  input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 root.querySelector('#ap-demo-message').textContent='Пример заполнен · согласия и отправка — вручную';
}
