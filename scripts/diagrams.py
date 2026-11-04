from pathlib import Path
from html import escape
import xml.etree.ElementTree as E
from PIL import Image,ImageDraw,ImageFont
from process_details import DETAILS
import shutil

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'diagrams';OUT.mkdir(parents=True,exist_ok=True)
SITE=ROOT/'web'
SITE.mkdir(parents=True,exist_ok=True)
NS={'bpmn':'http://www.omg.org/spec/BPMN/20100524/MODEL','bpmndi':'http://www.omg.org/spec/BPMN/20100524/DI','dc':'http://www.omg.org/spec/DD/20100524/DC','di':'http://www.omg.org/spec/DD/20100524/DI'}
for k,v in NS.items():E.register_namespace(k,v)
def el(parent,tag,**attrs):
    a,b=tag.split(':');return E.SubElement(parent,'{'+NS[a]+'}'+b,{k:str(v) for k,v in attrs.items()})

def font_file(bold=False):
    import os
    if os.environ.get('PROTOTYPE_FONT_DIR'):
        candidate=Path(os.environ['PROTOTYPE_FONT_DIR'])/('arialbd.ttf' if bold else 'arial.ttf')
        if candidate.exists():return str(candidate)
    choices=[
        Path('C:/Windows/Fonts')/('arialbd.ttf' if bold else 'arial.ttf'),
        Path('/usr/share/fonts/truetype/dejavu')/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'),
        Path('/System/Library/Fonts/Supplemental')/('Arial Bold.ttf' if bold else 'Arial.ttf'),
        Path('/Library/Fonts')/('Arial Bold.ttf' if bold else 'Arial.ttf'),
    ]
    for candidate in choices:
        if candidate.exists():return str(candidate)
    raise RuntimeError('Install Arial/DejaVu Sans or set PROTOTYPE_FONT_DIR to an Arial font directory.')

def diagram(slug,title,precondition,nodes,flows):
    W,H=2300,1060
    im=Image.new('RGB',(W,H),'white');d=ImageDraw.Draw(im)
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img"><title>{escape(title)}</title><rect width="100%" height="100%" fill="white"/>']
    def text(x,y,body,size=24,bold=False,center=True):
        ft=ImageFont.truetype(font_file(bold),size)
        lines=body.split('\n');height=size*1.32
        for i,line in enumerate(lines):
            yy=y+(i-(len(lines)-1)/2)*height
            d.text((x,yy),line,font=ft,fill='#193936',anchor='mm' if center else 'lm')
            svg.append(f'<text x="{x}" y="{yy}" dominant-baseline="central" text-anchor="{"middle" if center else "start"}" font-family="Arial,sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="#193936">{escape(line)}</text>')
    def box(x,y,w,h,fill='white',r=10):
        d.rounded_rectangle((x,y,x+w,y+h),radius=r,fill=fill,outline='#8ba6a1',width=2)
        svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="#8ba6a1" stroke-width="2"/>')
    def line(points,arrow=True):
        d.line(points,fill='#466760',width=2)
        svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in points)+'" fill="none" stroke="#466760" stroke-width="2"/>')
        if arrow:
            (x1,y1),(x2,y2)=points[-2:];length=((x2-x1)**2+(y2-y1)**2)**.5;ux=(x2-x1)/length;uy=(y2-y1)/length
            pts=[(x2,y2),(x2-12*ux+5*uy,y2-12*uy-5*ux),(x2-12*ux-5*uy,y2-12*uy+5*ux)]
            d.polygon(pts,fill='#466760');svg.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in pts)+'" fill="#466760"/>')
    text(35,40,title,34,True,False);text(35,88,precondition,22,False,False)
    box(35,130,2230,760,'#ffffff',0);line([(35,440),(2265,440)],False)
    text(1150,154,'ГЕНЕРАЛЬНЫЙ ДИРЕКТОР' if slug in ('organization-registration','employee-mchd') else 'СОТРУДНИК',18,True)
    text(1150,466,'ПЛАТФОРМА',18,True)
    for source,target,points,label,labelpos in flows:
        line(points)
        if label:text(*labelpos,label,20)
    for nid,(kind,label,(x,y,w,h),lane) in nodes.items():
        if kind in ('startEvent','endEvent'):
            d.ellipse((x,y,x+w,y+h),fill='white',outline='#193936',width=5 if kind=='endEvent' else 2)
            svg.append(f'<circle cx="{x+w/2}" cy="{y+h/2}" r="{w/2}" fill="white" stroke="#193936" stroke-width="{5 if kind=="endEvent" else 2}"/>');text(x+w/2,y+h+55,label,18)
        elif kind=='exclusiveGateway':
            points=[(x+w/2,y),(x+w,y+h/2),(x+w/2,y+h),(x,y+h/2)];d.polygon(points,fill='#f0f6f4',outline='#193936',width=2)
            svg.append('<polygon points="'+' '.join(f'{a},{b}' for a,b in points)+'" fill="#f0f6f4" stroke="#193936" stroke-width="2"/>');text(x+w/2,y+h/2,'×',28);text(x+w/2,y-40,label,20)
        else:
            box(x,y,w,h,'#f0f6f4' if lane=='system' else '#ffffff')
            for task_size in range(23,16,-1):
                ft=ImageFont.truetype(font_file(),task_size)
                lines=[];current=''
                for word in label.split():
                    candidate=(current+' '+word).strip()
                    if current and d.textlength(candidate,font=ft)>w-28:lines.append(current);current=word
                    else:current=candidate
                if current:lines.append(current)
                if len(lines)*task_size*1.32<=h-8:break
            assert len(lines)*task_size*1.32<=h-8,(nid,lines)
            text(x+w/2,y+h/2,'\n'.join(lines),task_size)
    text(35,943,'Предлагаемый процесс · проект поведения после правок пользователя от 03.11.2026',23,True,False)
    text(35,986,'Выбор полномочий чекбоксами не заменяет подписание МЧД электронной подписью руководителя.' if slug=='employee-mchd' else 'Получение организации из mos.ru — гипотеза интеграции, не подтверждённая документами Тринити.' if slug=='employee-mos-organization' else 'Доступ — только по приглашению и с назначенными правами. Полномочия МЧД оформляются отдельно.' if slug=='employee-invitation' else 'Проверка платформой обязательна; способ её реализации и сроки здесь не определяются.',21,False,False)
    svg.append('</svg>');(OUT/(slug+'.svg')).write_text('\n'.join(svg),encoding='utf-8');im.save(OUT/(slug+'.png'))
    defs=E.Element('{'+NS['bpmn']+'}definitions',id=slug.replace('-','_')+'_defs',targetNamespace='urn:proposed:registration')
    proc=el(defs,'bpmn:process',id='Process',name=title,isExecutable='false')
    el(proc,'bpmn:documentation').text=precondition+' Предлагаемый вариант по решению пользователя, 03.11.2026. Технический механизм проверки платформой и сроки не определены.'
    if slug in DETAILS:
        el(proc,'bpmn:documentation').text='\n'.join(DETAILS[slug])
    ls=el(proc,'bpmn:laneSet',id='Lanes')
    for lane,label in [('person','Генеральный директор' if slug in ('organization-registration','employee-mchd') else 'Сотрудник'),('system','Платформа')]:
        row=el(ls,'bpmn:lane',id=lane,name=label)
        for nid,(_,_,_,owner) in nodes.items():
            if owner==lane:el(row,'bpmn:flowNodeRef').text=nid
    for nid,(kind,label,_,_) in nodes.items():
        obj=el(proc,'bpmn:'+kind,id=nid,name=label.replace('\n',' '))
        for i,(source,target,*_) in enumerate(flows):
            if source==nid:el(obj,'bpmn:outgoing').text='F'+str(i)
            if target==nid:el(obj,'bpmn:incoming').text='F'+str(i)
    for i,(source,target,_,label,_) in enumerate(flows):el(proc,'bpmn:sequenceFlow',id='F'+str(i),sourceRef=source,targetRef=target,**({'name':label} if label else {}))
    dia=el(defs,'bpmndi:BPMNDiagram',id='Diagram');plane=el(dia,'bpmndi:BPMNPlane',id='Plane',bpmnElement='Process')
    for nid,(_,label,box_,_) in nodes.items():
        shape=el(plane,'bpmndi:BPMNShape',id=nid+'_di',bpmnElement=nid);x,y,w,h=box_;el(shape,'dc:Bounds',x=x,y=y,width=w,height=h)
        if nodes[nid][0] in ('exclusiveGateway','startEvent','endEvent'):
            lab=el(shape,'bpmndi:BPMNLabel');el(lab,'dc:Bounds',x=max(35,x-95),y=y-65 if nodes[nid][0]=='exclusiveGateway' else y+h+32,width=w+190,height=50)
    for lane,y,h in [('person',130,310),('system',440,450)]:
        sh=el(plane,'bpmndi:BPMNShape',id=lane+'_di',bpmnElement=lane,isHorizontal='true');el(sh,'dc:Bounds',x=35,y=y,width=2230,height=h)
    for i,(_,_,points,_,_) in enumerate(flows):
        edge=el(plane,'bpmndi:BPMNEdge',id='F'+str(i)+'_di',bpmnElement='F'+str(i))
        for x,y in points:el(edge,'di:waypoint',x=x,y=y)
    E.indent(defs);E.ElementTree(defs).write(OUT/(slug+'.bpmn'),encoding='utf-8',xml_declaration=True)
    ids=[x.attrib['id'] for x in defs.iter() if 'id' in x.attrib];assert len(ids)==len(set(ids))
    for source,target,*_ in flows:assert source in nodes and target in nodes
    seen=set();todo=['Start']
    while todo:
        cur=todo.pop()
        if cur in seen:continue
        seen.add(cur);todo += [t for s,t,*_ in flows if s==cur]
    assert seen==set(nodes),(set(nodes)-seen)

diagram('organization-registration','Предлагаемый вариант · регистрация организации','Организацию регистрирует только генеральный директор. Сотрудники не могут создать её кабинет.',{
 'Start':('startEvent','Начало',(70,243,34,34),'person'),
 'Auth':('task','Войти / создать\nличный аккаунт',(150,210,210,100),'person'),
 'INN':('userTask','Ввести ИНН\nорганизации',(420,210,210,100),'person'),
 'Lookup':('task','Найти\nорганизацию',(420,520,210,100),'system'),
 'Exists':('exclusiveGateway','Уже подключена?',(750,545,50,50),'system'),
 'Request':('userTask','Обратиться\nв свою организацию',(680,210,220,100),'person'),
 'ExistingEnd':('endEvent','Нужно\nприглашение',(940,243,34,34),'person'),
 'Record':('userTask','Проверить\nреквизиты',(1000,210,210,100),'person'),
 'Sign':('userTask','Подписать заявление\nЭП гендиректора',(1280,210,235,100),'person'),
 'Check':('task','Проверить данные\nи полномочия',(1280,520,235,100),'system'),
 'Valid':('exclusiveGateway','Проверка пройдена?',(1600,545,50,50),'system'),
 'Ready':('task','Подключить компанию\nи дать права админа',(1810,520,260,100),'system'),
 'Invite':('userTask','Открыть кабинет; при необходимости пригласить сотрудников',(1810,210,260,100),'person'),
 'End':('endEvent','Кабинет готов',(2160,243,34,34),'person'),
 'Reject':('task','Отклонить заявку:\nуказать причину',(1510,730,260,100),'system'),
 'Retry':('exclusiveGateway','Исправить данные?',(1840,755,50,50),'system'),
 'RejectedEnd':('endEvent','Не подключена',(2110,763,34,34),'system'),
},[
 ('Start','Auth',[(104,260),(150,260)],'',None),('Auth','INN',[(360,260),(420,260)],'',None),('INN','Lookup',[(525,310),(525,520)],'',None),
 ('Lookup','Exists',[(630,570),(750,570)],'',None),('Exists','Request',[(775,545),(775,310)],'Да',(805,395)),('Request','ExistingEnd',[(900,260),(940,260)],'',None),
 ('Exists','Record',[(800,570),(1105,570),(1105,310)],'Нет',(965,549)),('Record','Sign',[(1210,260),(1280,260)],'',None),('Sign','Check',[(1397,310),(1397,520)],'',None),
 ('Check','Valid',[(1515,570),(1600,570)],'',None),('Valid','Ready',[(1650,570),(1810,570)],'Да',(1725,548)),('Ready','Invite',[(1940,520),(1940,310)],'',None),('Invite','End',[(2070,260),(2160,260)],'',None),
 ('Valid','Reject',[(1625,595),(1625,730)],'Нет',(1657,666)),('Reject','Retry',[(1770,780),(1840,780)],'',None),
 ('Retry','RejectedEnd',[(1890,780),(2110,780)],'Нет',(1990,755)),
 ('Retry','Record',[(1865,805),(1865,865),(1240,865),(1240,350),(1105,350),(1105,310)],'Да',(1780,842)),
])
diagram('employee-invitation','Предлагаемый вариант · сотрудник по приглашению','Организация подключена. Администратор указал email сотрудника и назначил права в приглашении.',{
 'Start':('startEvent','Приглашение\nполучено',(70,243,34,34),'person'),
 'Open':('userTask','Открыть ссылку\nприглашения',(150,210,210,100),'person'),
 'Account':('exclusiveGateway','Есть аккаунт?',(450,235,50,50),'person'),
 'Login':('userTask','Ввести email\nи существующий пароль',(620,175,255,100),'person'),
 'Password':('userTask','Задать и повторить пароль; принять условия',(620,325,255,100),'person'),
 'Merge':('exclusiveGateway','',(980,265,50,50),'person'),
 'Accept':('userTask','Принять приглашение\nи назначенные права',(1100,240,260,100),'person'),
 'Check':('task','Сопоставить аккаунт\nс email приглашения',(1100,520,260,100),'system'),
 'Match':('exclusiveGateway','Email совпадает?',(1470,545,50,50),'system'),
 'Ready':('task','Предоставить назначенные права',(1630,520,240,100),'system'),
 'Workspace':('userTask','Открыть кабинет организации',(1940,210,220,100),'person'),
 'End':('endEvent','Кабинет открыт',(2210,243,34,34),'person'),
 'Reject':('task','Сообщить:\nemail не совпадает',(1370,730,270,100),'system'),
 'Retry':('exclusiveGateway','Другой email?',(1790,755,50,50),'system'),
 'RejectedEnd':('endEvent','Без доступа',(2110,763,34,34),'system'),
},[
 ('Start','Open',[(104,260),(150,260)],'',None),('Open','Account',[(360,260),(450,260)],'',None),
 ('Account','Login',[(475,235),(475,220),(620,220)],'Да',(565,241)),('Account','Password',[(475,285),(475,370),(620,370)],'Нет',(542,350)),
 ('Login','Merge',[(875,220),(1005,220),(1005,265)],'',None),('Password','Merge',[(875,370),(1005,370),(1005,315)],'',None),('Merge','Accept',[(1030,290),(1100,290)],'',None),
 ('Accept','Check',[(1230,340),(1230,520)],'',None),('Check','Match',[(1360,570),(1470,570)],'',None),('Match','Ready',[(1520,570),(1630,570)],'Да',(1570,546)),('Ready','Workspace',[(1870,570),(2050,570),(2050,310)],'',None),('Workspace','End',[(2160,260),(2210,260)],'',None),
 ('Match','Reject',[(1495,595),(1495,730)],'Нет',(1525,666)),('Reject','Retry',[(1640,780),(1790,780)],'',None),
 ('Retry','RejectedEnd',[(1840,780),(2110,780)],'Нет',(1970,755)),
 ('Retry','Login',[(1815,805),(1815,855),(580,855),(580,220),(620,220)],'Да',(1720,832)),
])

diagram('employee-mos-organization','Предлагаемый вариант · организация на mos.ru','Сотрудник добавлен только в организацию на mos.ru. На платформе членство и права ему ещё не назначены.',{
 'Start':('startEvent','Начало',(70,243,34,34),'person'),
 'Auth':('userTask','Войти через\nличный аккаунт mos.ru',(150,210,260,100),'person'),
 'Identity':('task','Получить\nрезультат входа',(450,520,260,100),'system'),
 'Organization':('task','Получить сведения\nоб организации',(800,520,260,100),'system'),
 'View':('userTask','Увидеть свою\nорганизацию',(1160,210,260,100),'person'),
 'Access':('task','Проверить доступ\nна платформе',(1160,520,260,100),'system'),
 'Contact':('task','Показать обращение\nв организацию',(1560,520,260,100),'system'),
 'End':('endEvent','Нужно\nприглашение',(2110,553,34,34),'system'),
},[
 ('Start','Auth',[(104,260),(150,260)],'',None),('Auth','Identity',[(280,310),(280,570),(450,570)],'',None),
 ('Identity','Organization',[(710,570),(800,570)],'',None),('Organization','View',[(930,520),(930,260),(1160,260)],'',None),
 ('View','Access',[(1290,310),(1290,520)],'',None),('Access','Contact',[(1420,570),(1560,570)],'Прав нет',(1490,546)),('Contact','End',[(1820,570),(2110,570)],'',None),
])

diagram('employee-mchd','Предлагаемый вариант · выдача полномочий сотруднику','Организация и сотрудник уже подключены. Обычный доступ к кабинету не требует оформления этой МЧД.',{
 'Start':('startEvent','Начало',(70,243,34,34),'person'),
 'Powers':('userTask','Выбрать полномочия\nчекбоксами',(150,210,260,100),'person'),
 'Generate':('task','Сформировать МЧД\nпо выбранным правам',(450,520,260,100),'system'),
 'Review':('userTask','Проверить сотрудника\nи полномочия в МЧД',(850,210,260,100),'person'),
 'Sign':('userTask','Подписать МЧД\nэлектронной подписью',(1240,210,260,100),'person'),
 'Signed':('task','Сохранить\nподписанную МЧД',(1240,520,260,100),'system'),
 'Ready':('task','Показать сотруднику\nоформленные полномочия',(1720,520,300,100),'system'),
 'End':('endEvent','МЧД\nподписана',(2150,553,34,34),'system'),
},[
 ('Start','Powers',[(104,260),(150,260)],'',None),('Powers','Generate',[(280,310),(280,570),(450,570)],'',None),
 ('Generate','Review',[(580,520),(580,260),(850,260)],'',None),('Review','Sign',[(1110,260),(1240,260)],'',None),
 ('Sign','Signed',[(1370,310),(1370,520)],'',None),('Signed','Ready',[(1500,570),(1720,570)],'',None),('Ready','End',[(2020,570),(2150,570)],'',None),
])

card='''# Предлагаемый вариант: регистрация

Статус: to-be, проект предлагаемого решения по правкам пользователя от 03.11.2026; описание прототипа, а не реализованной серверной системы. Это отдельный вариант, а не описание Тринити или Орбиты.

## PR-REG-ORG Организация

Цель: генеральный директор подключает организацию и получает кабинет для работы и управления сотрудниками. Запуск: намерение впервые подключить организацию. Участники: гендиректор и платформа. Владелец процесса не определён. Объекты: личный аккаунт, организация, заявление с ЭП, результат проверки, членство, права.

Основной путь: вход или создание личного аккаунта → поиск по ИНН → проверка реквизитов → заявление с ЭП гендиректора → проверка платформой → подключение организации и права администратора → приглашения сотрудникам.

Если организация уже подключена, показывается заглушка с просьбой обратиться в организацию за приглашением. Запрос доступа на платформе не создаётся. Если проверка гендиректора не пройдена, показывается причина, организация и права не предоставляются. В прототипе можно исправить данные и подать заявление заново.

Только генеральный директор регистрирует юридическое лицо. Пользователь не выбирает между ЭП и проверкой оператором: после ЭП следует обязательная проверка платформой. Способ проверки и сроки не определены. В прототипе результат переключается демонстрационными кнопками. Подписание документов в дальнейшей работе — отдельное полномочие.

## PR-REG-EMP Сотрудник по приглашению

Цель: подключить сотрудника к конкретной организации с назначенными правами. Запуск: сотрудник открывает приглашение. Условия: организация подключена; уполномоченный администратор создал приглашение с именем, email и правами. Участники: сотрудник, платформа; администратор формирует приглашение до старта этого процесса.

Если аккаунт есть — сотрудник вводит email и существующий пароль. Если нет — задаёт и повторяет пароль, принимает условия; имя и email берутся из приглашения. Далее принимает приглашение. Платформа сопоставляет email аккаунта и приглашения, затем предоставляет только назначенные права. При несовпадении доступ не предоставляется, можно войти с другим email. Три отдельные страницы подтверждения email и успешного создания аккаунта удалены по просьбе пользователя. Получение приглашения само по себе не назначает административные права.

## PR-REG-CONTACT Сотрудник без приглашения

Показывается только заглушка: обратитесь к руководителю или администратору своей организации, чтобы он добавил вас и направил приглашение. Самостоятельный поиск работодателя, отправка запроса доступа, рассмотрение и одобрение такого запроса удалены по решению пользователя. Сотрудник входит по полученному приглашению.

## PR-AUTH-MOS-ORG Организация есть только на mos.ru

Уточнённое пользователем условие: сотрудник добавлен в личный кабинет организации на mos.ru, но не в организацию на предлагаемой платформе. Предлагаемый путь: личный вход через mos.ru → показ организации → отсутствие прав на платформе → заглушка с обращением в организацию за приглашением. Показ сведений организации не создаёт её кабинет на платформе, не назначает сотруднику членство или права администратора и не выдаёт полномочия подписи.

Получение организации из mos.ru в этом прототипе — гипотеза интеграции, а не подтверждённый состав ответа mos ID. На стенде есть явная отметка об этом. В реальной интеграции нужно подтвердить наличие сведений и применимость проверки принадлежности сотрудника организации.

Сверка с Тринити: в опубликованной инструкции ЛК заказчика, с. 6–13, описаны полная учётная запись mos.ru, вход через СУДИР, данные физлица, ручной выбор организации по ИНН и МЧД с подписью руководителя. Автоматическое получение организации именно из кабинета mos.ru и достаточность такого членства для доступа к Тринити не подтверждены. Повторный вход сотрудника в этой инструкции подробно не описан. Источник: https://trinityeco.ru/api/trinity-auth-documents/.

Внутренние права интерфейса назначаются администратором; они не заменяют МЧД там, где требуется подтверждение полномочий представителя. Чекбоксы могут служить выбором полномочий для последующего формирования и подписания МЧД. Основание для природы МЧД: https://www.nalog.gov.ru/rn77/related_activities/el_doc/use_electronic_sign/.

## PR-POW-MCHD Выдача полномочий через чекбоксы

По отдельному поручению пользователя реализован прототип: генеральный директор выбирает сотруднику полномочия чекбоксами → платформа формирует предварительный вид МЧД → директор проверяет сотрудника и полномочия → подписывает МЧД ЭП → сотрудник видит оформленные полномочия. Выбор без подписания не выдаёт право подписи. При изменении выбранных полномочий нужно снова сформировать и подписать МЧД. Пустой набор не допускается.

Условия: организация проверена; генеральный директор действует в её кабинете; сотрудник уже подключён. В стенде отдельный путь «Полномочия сотрудника · МЧД» начинает демонстрацию с этими условиями. Из кабинета гендиректора также доступна кнопка «Выдать право подписи». Администратор, не являющийся гендиректором, таким правом автоматически не наделяется.

Примеры полномочий прототипа: подписывать договоры, акты, заявки. Это проект продуктового перечня; он не объявлен нормативным классификатором или утверждённым форматом МЧД. Макет содержит упрощённую сводку, а не полный юридический документ. Фактическое формирование XML, криптографическая подпись и регистрация МЧД не реализованы. Состав реквизитов, срок действия, отзыв и интеграции требуют отдельного проектирования.

Вход и обычные права интерфейса продолжают работать независимо: приглашение даёт назначенный доступ к кабинету, оформленная МЧД не добавляет права администратора, управления командой или финансами. Контроль: до подписи статус prepared; после демонстрации подписи — signed. Контроль старого состояния не позволяет открыть успешный результат до подписи.

## Границы

Общий личный аккаунт поддерживает email/пароль и демонстрацию mos.ru. По приглашению показана запрошенная пользователем ветка email/пароль. Прототип не реализует серверную аутентификацию и криптографическую проверку. Точные требования к паролям, срокам приглашения, восстановлению доступа и правилам проверки гендиректора не определены этими правками. Отдельные экраны подтверждения email удалены в предлагаемом варианте. Первые три конкурентных флоу не менялись.

Схемы .bpmn содержат BPMN 2.0 XML и координаты DI; также доступны SVG и PNG. Проверены уникальность идентификаторов, ссылки и достижимость узлов. Импорт в конкретный BPMN-редактор и XSD-проверка не выполнялись.
'''
(OUT/'business-processes.md').write_text(card,encoding='utf-8')
for path in OUT.iterdir():shutil.copyfile(path,SITE/path.name)
page='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Предлагаемый вариант — процессы регистрации</title><style>body{font:16px/1.6 Arial,sans-serif;background:#f5f8fa;color:#193936;margin:0;padding:32px}main{max-width:1500px;margin:auto}h1{font-size:30px}h2{margin-top:40px}img{display:block;width:100%;height:auto;background:white}a{color:#12665d}nav{display:flex;gap:20px;flex-wrap:wrap}p{max-width:1000px}@media(max-width:600px){body{padding:16px}h1{font-size:24px}}</style></head><body><main><a href="/">← К прототипу</a><h1>Предлагаемый вариант: процессы регистрации</h1><p>Организацию регистрирует генеральный директор. Сотрудник по приглашению входит с существующим паролем или задаёт новый. Схемы соответствуют правкам от 03.11.2026.</p>'''
for slug,title in [('organization-registration','Регистрация организации'),('employee-invitation','Сотрудник по приглашению'),('employee-mos-organization','Организация сотрудника есть на mos.ru'),('employee-mchd','Выдача полномочий и МЧД')]:
    page+=f'<section><h2>{title}</h2><p>Откройте SVG для увеличения или скачайте BPMN для редактирования.</p><nav><a href="{slug}.svg">Открыть SVG</a><a href="{slug}.bpmn" download>Скачать BPMN</a><a href="{slug}.png" download>Скачать PNG</a></nav><a href="{slug}.svg"><img src="{slug}.svg" alt="{title}: схема процесса"></a></section>'
page+='<p><a href="business-processes.md" download>Скачать описание процессов и границ</a></p><p>В кейсе mos.ru получение сведений организации показано как гипотеза интеграции. У Тринити такое автоматическое получение не подтверждено: инструкция описывает ввод ИНН и оформление МЧД.</p><p><a href="https://trinityeco.ru/api/trinity-auth-documents/">Официальная инструкция Тринити</a></p><p>Механизм и сроки проверки платформой требуют дальнейшего определения. Схемы описывают предлагаемый вариант.</p></main></body></html>'
(SITE/'processes.html').write_text(page,encoding='utf-8')
print('Created four BPMN/SVG/PNG diagrams, process descriptions and Site page /processes.html.')
