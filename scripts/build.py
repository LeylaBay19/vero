from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'build'
base.mkdir(parents=True,exist_ok=True)
version=(ROOT/'VERSION').read_text(encoding='utf-8').strip()
src=(ROOT/'src/base-three-flows.html').read_text(encoding='utf-8')
src=src.replace('<small>v2</small>',f'<small>v{version}</small>',1)
src=src.replace('<span class="ap-scenario-kicker">Сотрудник</span>','<span class="ap-scenario-kicker">01 · Сотрудник</span>',1)
src=src.replace('<span class="ap-scenario-kicker">Руководитель</span>','<span class="ap-scenario-kicker">02 · Руководитель</span>',1)
src=src.replace('<span class="ap-scenario-kicker">Новый пользователь</span>','<span class="ap-scenario-kicker">03 · Новый пользователь</span>',1)
tab='''      <button type="button" data-flow="proposal"><span class="ap-scenario-kicker">Флоу 04 · проект решения</span><strong>Предлагаемый вариант</strong><span>Организация и сотрудник</span></button>
      <button type="button" data-flow="proposal2"><span class="ap-scenario-kicker">Флоу 05 · проект решения</span><strong>Предлагаемый вариант 2</strong><span>Простой вход · сервисы отдельно</span></button>
'''
pos=src.index('    </div>',src.index('<div class="ap-scenarios"'))
src=src[:pos]+tab+src[pos:]
controls='''      <div id="ap-v2-controls" hidden>
        <label>Путь<select id="ap-v2-path"><option value="personal">Новый пользователь</option><option value="invite">Сотрудник по приглашению</option></select></label>
        <label id="ap-v2-membership-wrap">Демо: сохранённый доступ<select id="ap-v2-membership"><option value="none">Не подключён</option><option value="director">Руководитель</option><option value="employee">Сотрудник</option></select></label>
        <label id="ap-v2-outcome-wrap" hidden>Демо: результат проверки<select id="ap-v2-outcome"><option value="success">Успешно</option><option value="failure">Ошибка проверки</option><option value="no-certificate">Нет УКЭП</option></select></label>
        <label id="ap-v2-invite-state-wrap" hidden>Демо: приглашение<select id="ap-v2-invite-state"><option value="valid">Действует</option><option value="invalid">Истекло / отозвано</option></select></label>
        <button type="button" id="ap-v2-director" data-v2-action="director-review" hidden>Демо: руководитель проверяет МЧД</button>
        <span id="ap-v2-code-note" hidden>Демо-код: 123456. Письмо не отправляется.</span>
        <a href="schemes-v2.html" target="_blank" rel="noopener">BPMN варианта 2 ↗</a>
        <span class="ap-mos-assumption">Стенд: email, mos.ru, реестры, УКЭП и МЧД имитируются. Данные живут в текущем сеансе. Требования интеграции ОССиГ требуют согласования.</span>
      </div>
      <div id="ap-proposal-controls" hidden>
        <label>Путь<select id="ap-proposal-path"><option value="company">Регистрация организации</option><option value="employee">Регистрация сотрудника</option><option value="powers">Полномочия сотрудника · МЧД</option></select></label>
        <label id="ap-proposal-entry-wrap">Подключение<select id="ap-proposal-entry"><option value="invite">По приглашению</option><option value="contact">Нет приглашения</option><option value="mos-org">Организация есть на mos.ru</option></select></label>
        <label id="ap-existing-access-wrap" hidden>Сохранённая связь аккаунта<select id="ap-existing-access"><option value="unlinked">Не подтверждена</option><option value="director">Подтверждённый гендиректор</option><option value="employee">Подключённый сотрудник</option></select></label>
        <label id="ap-invite-mchd-wrap">МЧД в приглашении<select id="ap-invite-mchd-mode"><option value="yes">Нужна</option><option value="no">Не нужна</option></select></label>
        <button type="button" id="ap-director-review" data-p-action="invite-director-review" hidden>Демо: перейти к руководителю</button>
        <button type="button" id="ap-return-employee" data-p-action="invite-employee-return" hidden>Демо: вернуться к сотруднику</button>
        <label id="ap-sign-result-wrap" hidden>Проверка подписи<select id="ap-sign-result"><option value="success">Успешно</option><option value="failure">Ошибка</option><option value="no-certificate">Нет УКЭП</option></select></label>
        <span id="ap-invite-demo-note" class="ap-mos-assumption" hidden>Стенд: mos.ru, доставка приглашений и подпись МЧД имитируются. Личная почта mos.ru отличается от почты приглашения; контекст сохраняется в памяти текущего сеанса.</span>
      </div>
      <span id="ap-mos-org-note" class="ap-mos-assumption" hidden>Проект кейса: получение организации из mos.ru — предположение интеграции; у Тринити не подтверждено.</span>
'''
src=src.replace('      <span id="ap-demo-message"',controls+'      <span id="ap-demo-message"',1)
css='''
#auth-flow-prototype #ap-v2-controls{display:contents;}
#auth-flow-prototype .ap-v2-services{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
@media(max-width:700px){#auth-flow-prototype .ap-v2-services{grid-template-columns:1fr;}}

#auth-flow-prototype .ap-scenarios{grid-template-columns:repeat(5,minmax(0,1fr));}
#auth-flow-prototype #ap-proposal-controls{display:contents;}
#auth-flow-prototype #ap-proposal-controls label{display:flex;gap:7px;align-items:center;flex-wrap:wrap;max-width:100%;}
#auth-flow-prototype .ap-options{gap:12px;}
#auth-flow-prototype .ap-scenarios button{padding:13px 14px;}
#auth-flow-prototype .ap-scenarios button strong{overflow-wrap:normal;}
#auth-flow-prototype #ap-proposal-controls select{max-width:100%;}
#auth-flow-prototype input[type="file"]{padding:9px;font-size:12px;max-width:100%;}
#auth-flow-prototype .ap-mos-assumption{color:var(--ap-muted);font-size:12px;flex-basis:100%;}
#auth-flow-prototype .ap-auth-provider button{width:100%;}
#auth-flow-prototype .ap-auth-separator{display:flex;align-items:center;gap:12px;color:var(--ap-muted);margin:18px 0;}
#auth-flow-prototype .ap-auth-separator:before,#auth-flow-prototype .ap-auth-separator:after{content:"";height:1px;background:var(--ap-line);flex:1;}
#auth-flow-prototype .ap-staff-note{margin-top:22px;padding:16px;background:var(--ap-soft);border-radius:12px;}
#auth-flow-prototype .ap-staff-note p{margin:7px 0 0;}
#auth-flow-prototype .ap-auth-help{margin-top:16px;border-top:1px solid var(--ap-line);padding-top:16px;}
#auth-flow-prototype .ap-auth-help summary{font-weight:600;cursor:pointer;}
#auth-flow-prototype .ap-auth-help ol{padding-left:22px;display:grid;gap:12px;}
#auth-flow-prototype .ap-invite-switch{display:flex;gap:8px;margin:18px 0;flex-wrap:wrap;}
#auth-flow-prototype .ap-invite-switch button{flex:1;min-width:140px;}
#auth-flow-prototype .ap-invite-switch button[aria-pressed="true"]{background:var(--ap-button);color:var(--ap-button-fg);}
@media(max-width:580px){#auth-flow-prototype .ap-scenarios{grid-template-columns:repeat(2,minmax(0,1fr));}#auth-flow-prototype .ap-scenarios button strong{font-size:12px;}#auth-flow-prototype .ap-scenarios button{padding:11px;}#auth-flow-prototype .ap-options label{max-width:100%;}#auth-flow-prototype .ap-options select{font-size:14px;}}
'''
src=src.replace('</style>\n<script id="ap-logic">',css+'</style>\n<script id="ap-logic">',1)
src=src.replace("const S={flow:'mos'","const S={flow:location.hash==='#variant2'?'proposal2':'proposal'",1)
src=src.replace("['mos','ep','orb']","['mos','ep','orb','proposal','proposal2']")
src=src.replace("const draftKey=()=>S.flow+':'+S.orgCase+':'+S.screen;","const draftKey=()=>S.flow+':'+S.orgCase+':'+(S.flow==='proposal'?S.proposalPath+':'+S.employeeEntry+':'+S.pIdentity+':':'')+S.screen;")
src=src.replace("e.type!=='password'&&!e.dataset.wasPassword","e.type!=='password'&&e.type!=='file'&&!e.dataset.wasPassword",1)
src=src.replace("function restart(){S.screen='entry';S.history=[];render();persist();}","function restart(){if(S.flow==='proposal')resetProposal();if(S.flow==='proposal2')resetV2();S.screen='entry';S.history=[];render();persist();}",1)
src=src.replace(" journey(S.screen);"," if(S.flow==='proposal'){root.querySelector('.ap-brand-mark').textContent='04';proposalJourney();}else journey(S.screen);",1)
module=(ROOT/'src/proposal-flow.js').read_text(encoding='utf-8')+'\n'+(ROOT/'src/proposal-v2.js').read_text(encoding='utf-8')
src=src.replace('function render(){',module+"\nfunction render(){\n if(S.flow==='proposal2'){v2Render();return;}\n root.querySelector('#ap-v2-controls').hidden=true;root.querySelector('.ap-repeat-label').hidden=false;\n if(S.flow==='proposal'){proposalRender();return;}\n root.querySelector('#ap-proposal-controls').hidden=true;root.querySelector('#ap-director-review').hidden=true;root.querySelector('#ap-sign-result-wrap').hidden=true;root.querySelector('#ap-return-employee').hidden=true;root.querySelector('#ap-invite-demo-note').hidden=true;root.querySelector('#ap-mos-org-note').hidden=true;root.querySelector('#ap-repeat').disabled=false;root.querySelector('.ap-preview-badge').textContent='Концепция интерфейса';",1)
src=src.replace(" if(btn.dataset.flow)"," if(S.flow==='proposal2'&&btn.id==='ap-demo'){v2Autofill();return;}\n if(btn.dataset.v2Action){v2Action(btn.dataset.v2Action);return;}\n if(S.flow==='proposal2'&&btn.id==='ap-back'){if(V2.history.length){V2.screen=V2.history.pop();render();}return;}\n if(btn.dataset.pAction){proposalAction(btn.dataset.pAction);return;}\n if(btn.dataset.flow)",1)
src=src.replace(" if(input.type==='checkbox')return;"," if(input.type==='checkbox'||input.type==='file'||input.type==='radio')return;",1) if " if(input.type==='checkbox')return;" in src else src.replace("if(input.type==='checkbox')return;","if(input.type==='checkbox'||input.type==='file'||input.type==='radio')return;",1)
change='''
 if(e.target.id==='ap-v2-path'){resetV2();render();return;}

 if(e.target.id==='ap-proposal-path'){S.proposalPath=e.target.value;S.orgCase=S.proposalPath==='employee'?'existing':'new';restart();return;}
 if(e.target.id==='ap-proposal-entry'){S.employeeEntry=e.target.value;restart();return;}
 if(e.target.id==='ap-existing-access'){S.existingAccess=e.target.value;restart();return;}
 if(e.target.id==='ap-invite-mchd-mode'){S.invitation.powers=e.target.value==='yes'?['contracts']:[];restart();return;}
 if(e.target.id?.startsWith('p-mchd-power-')){S.mchd.status='draft';}
'''
src=src.replace("root.addEventListener('change',e=>{","root.addEventListener('change',e=>{"+change,1)
submit=" if(S.flow==='proposal2'&&action?.startsWith('v2-')){v2Submit(action,f);return;}\n if(S.flow==='proposal'&&action?.startsWith('p-')){proposalSubmit(action,f);return;}\n"
src=src.replace(" const err=(msg,ids=[])=>",submit+" const err=(msg,ids=[])=>",1)
for word in ['Наша платформа','ap-comments','ap-evidence\'','вопросы к аналитику']:
    assert word not in src,word
src=src.replace('__PLATFORM_HELP__',(ROOT/'src/platform-help.html').read_text(encoding='utf-8').strip())
out=base/'auth-registration-four-flows.html'
out.write_text(src,encoding='utf-8')

standalone=src
a=standalone.index("window.addEventListener('openai:set_globals',e=>{")
b=standalone.index('if(saved?.version===2',a)
standalone=standalone[:a]+standalone[b:]
head='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Регистрация и вход — 5 вариантов</title><style>body{margin:0;padding:24px;background:light-dark(#fff,#141518);color-scheme:light dark}#auth-flow-prototype{max-width:1100px;margin:auto}@media(max-width:580px){body{padding:10px}}</style></head><body>'''
(ROOT/'index.html').write_text(head+standalone+'</body></html>',encoding='utf-8')
import html
web=ROOT/'web'
web.mkdir(parents=True,exist_ok=True)
shell=(ROOT/'templates/sandbox-shell.html').read_text(encoding='utf-8')
(web/'index.html').write_text(shell.replace('__AUTH_PROTOTYPE_FRAGMENT__',html.escape(src,quote=True)),encoding='utf-8')
print('Built index.html, build/auth-registration-four-flows.html, web/index.html')
