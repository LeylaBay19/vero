"""Current variant 1 only: one model produces offline SVG, editable BPMN and HTML."""
from pathlib import Path
from xml.etree import ElementTree as ET
from html import escape
from urllib.parse import quote
from zipfile import ZipFile, ZIP_DEFLATED
import json, textwrap
import auth_v1_horizontal as horizontal
from orthogonal_routes import route

ROOT=Path(__file__).resolve().parents[1]
VERSION=(ROOT/'VERSION').read_text(encoding='utf-8').strip()
OUT=ROOT/'processes-v1'; OUT.mkdir(exist_ok=True)
B='http://www.omg.org/spec/BPMN/20100524/MODEL'
D='http://www.omg.org/spec/BPMN/20100524/DI'
C='http://www.omg.org/spec/DD/20100524/DC'
I='http://www.omg.org/spec/DD/20100524/DI'
for name,uri in [('bpmn',B),('bpmndi',D),('dc',C),('di',I)]: ET.register_namespace(name,uri)

def node(key,text,col,row,kind='task',role='Пользователь'):
    return dict(id=key,text=text,col=col,row=row,kind=kind,role=role,x=60+col*310,y=90+row*190,w=240,h=90)
def edge(a,b,label='',route=None): return dict(source=a,target=b,label=label,route=route)
def model(key,title,goal,nodes,edges,notes):return dict(id=key,title=title,goal=goal,nodes=nodes,edges=edges,notes=notes)

MODELS=[
 model('AUTH1_EMAIL','Регистрация по email','Создать подтверждённый личный аккаунт перед подключением организации.',[
  node('start','Начать регистрацию',1,0,'start'),node('email','Указать email',1,1),node('mail','Показать отправку письма',1,2,role='Платформа'),node('open','Открыть письмо и подтвердить email',1,3),node('valid_link','Ссылка действительна?',1,4,'gateway','Платформа'),node('expired','Запросить новое письмо',0,4),node('password','Задать пароль, повторить и принять условия',1,5),node('valid_form','Данные и согласие верны?',1,6,'gateway','Платформа'),node('fix','Исправить ввод; остальные данные сохранены',2,6),node('create','Создать аккаунт; email становится логином',1,7,role='Платформа'),node('mos_offer','Подключить Mos ID или сделать позже',1,8),node('done','Аккаунт готов; далее подключение организации',1,9,'end')
 ],[edge('start','email'),edge('email','mail'),edge('mail','open'),edge('open','valid_link'),edge('valid_link','password','Да'),edge('valid_link','expired','Нет'),edge('expired','mail','Новое письмо','left'),edge('password','valid_form'),edge('valid_form','create','Да'),edge('valid_form','fix','Нет'),edge('fix','password','Повторить','right'),edge('create','mos_offer'),edge('mos_offer','done')],['Поле логина после подтверждения email заблокировано. Пароль задаётся пользователем, согласие не отмечается автоматически.','Необязательная привязка Mos ID раскрыта в схеме «Привязка mos.ru». При отказе от неё аккаунт сохраняется.','Ошибка сервиса оставляет пользователя на текущей форме с введёнными данными. Реальные письма в прототипе не отправляются.']),
 model('AUTH1_MOS','Регистрация и вход через mos.ru','Войти по Mos ID или создать личный аккаунт при первом входе.',[
  node('start','Выбрать вход через mos.ru',1,0,'start'),node('provider','Ввести данные учётной записи mos.ru',1,1,role='Пользователь / mos.ru'),node('consent','Разрешить передачу данных; для нового аккаунта принять условия',1,2),node('response','Вход подтверждён и данные разрешены?',1,3,'gateway','Платформа'),node('error','Показать ошибку или отмену; аккаунт не менять',0,3,role='Платформа'),node('retry','Повторить вход?',0,4,'gateway'),node('cancel','Вход не выполнен',0,5,'end'),node('known','Mos ID уже связан с аккаунтом?',1,4,'gateway','Платформа'),node('existing','Сохранить существующие организацию и роль',2,4,role='Платформа'),node('entered','Вход выполнен; сценарий завершён',2,5,'end'),node('new','Создать аккаунт без локального пароля',1,5,role='Платформа'),node('registered','Аккаунт создан; предложить подключение организации',1,6,'end')
 ],[edge('start','provider'),edge('provider','consent'),edge('consent','response'),edge('response','error','Нет'),edge('error','retry'),edge('retry','provider','Да','left'),edge('retry','cancel','Нет'),edge('response','known','Да'),edge('known','existing','Да'),edge('existing','entered'),edge('known','new','Нет'),edge('new','registered')],['ФИО и email в предлагаемом варианте обязательны для передачи; телефон и сведения об организациях необязательны.','Сведения об организации на mos.ru сами по себе не назначают права на ВЕРО. Это предлагаемый сценарий интеграции, не подтверждение фактического API.','Пароль не генерируется и не показывается. Позже его можно задать в профиле. После успешного обычного входа кабинет на этом стенде не открывается.']),
 model('AUTH1_COMPANY','Подключение организации через УКЭП','Подключить организацию и получить подтверждённые полномочия генерального директора.',[
  node('start','Аккаунт создан; подключить организацию',1,0,'start'),node('select','Выбрать сертификат УКЭП',1,1,'task','Генеральный директор'),node('certificate','Сертификат действующий и принадлежит гендиректору?',1,2,'gateway','Платформа'),node('invalid','Показать причину; доступ не предоставлять',0,2,role='Платформа'),node('review','Проверить сведения; дополнить контакты и недостающие поля',1,3,role='Генеральный директор'),node('confirm','Подтвердить данные и контакты',1,4,role='Генеральный директор'),node('send','Принять данные на проверку',1,5,role='Платформа'),node('decision','Проверка пройдена?',1,6,'gateway','Платформа'),node('reject','Сообщить причину отказа; права не выдавать',0,6,role='Платформа'),node('again','Выбрать другой сертификат?',0,7,'gateway','Генеральный директор'),node('no_access','Организация не подключена',0,8,'end'),node('approve','Подключить организацию и сохранить роль руководителя',1,7,role='Платформа'),node('done','Организация подключена; регистрация завершена',1,8,'end')
 ],[edge('start','select'),edge('select','certificate'),edge('certificate','review','Да'),edge('certificate','invalid','Нет'),edge('invalid','select','Другой сертификат','left'),edge('review','confirm'),edge('confirm','send'),edge('send','decision'),edge('decision','approve','Да'),edge('decision','reject','Нет'),edge('reject','again'),edge('again','select','Да','left'),edge('again','no_access','Нет'),edge('approve','done')],['Контакты, КПП и сокращённое наименование можно дополнить до отправки. ИНН, ОГРН и сведения сертификата остаются только для чтения. Нет поиска по ИНН, приглашения команды и отдельной страницы ожидания.','После отправки остаются данные и нейтральная кнопка «Отправлено». До положительного решения права руководителя не выдаются.','ТЗ §6.2/LK-06 предусматривает проверку, но не устанавливает её длительность. В прототипе результат задаёт демонстрационная панель; реальные проверки не подключены.']),
 model('AUTH1_INVITE','Подключение сотрудника по приглашению','Получить только назначенный организацией доступ после принятия действующего приглашения.',[
  node('start','Открыть приглашение организации',1,0,'start'),node('form','Показать приглашение и неизменяемый email',1,1,role='Платформа'),node('account','Уже есть аккаунт?',1,2,'gateway'),node('new_password','Задать пароль, повторить и принять условия',0,3),node('login','Ввести пароль существующего аккаунта',2,3),node('merge','Продолжить выбранный путь',1,4,'gateway'),node('valid','Данные входа / регистрации верны?',1,5,'gateway','Платформа'),node('fix','Показать ошибку; исправить ввод',0,5,role='Платформа / пользователь'),node('invitation','Приглашение действует?',1,6,'gateway','Платформа'),node('expired','Сообщить об истечении / отзыве; обратиться к организации',2,6,role='Платформа / сотрудник'),node('denied','Без доступа к организации',2,7,'end'),node('accept','Создать аккаунт при необходимости; принять приглашение',1,7,role='Платформа'),node('done','Вход выполнен с назначенными правами сотрудника',1,8,'end')
 ],[edge('start','form'),edge('form','account'),edge('account','new_password','Нет'),edge('account','login','Да'),edge('new_password','merge'),edge('login','merge'),edge('merge','valid'),edge('valid','fix','Нет'),edge('fix','form','Исправить','left'),edge('valid','invitation','Да'),edge('invitation','expired','Нет'),edge('expired','denied'),edge('invitation','accept','Да'),edge('accept','done')],['Логин — email, на который отправлено приглашение; в новой регистрации сотрудника поле заблокировано.','Просроченное или отозванное приглашение не выдаёт доступ. Самостоятельного запроса доступа нет: сотрудник обращается к организации.','Принятие приглашения не назначает административную роль и не создаёт МЧД. Дополнительные полномочия вне области этих схем.']),
 model('AUTH1_PASSWORD','Вход по email и восстановление пароля','Войти в существующий аккаунт; при необходимости восстановить пароль.',[
  node('start','Начать вход',1,0,'start'),node('login','Ввести email и пароль',1,1),node('valid','Данные входа верны?',1,2,'gateway','Платформа'),node('done','Вход выполнен; организация и роль сохранены',2,2,'end'),node('error','Сообщить об ошибке входа',1,3,role='Платформа'),node('recover','Восстановить пароль?',1,4,'gateway'),node('email','Указать email аккаунта',1,5),node('mail','Показать нейтральное сообщение об отправке письма',1,6,role='Платформа'),node('open','Открыть письмо и ссылку восстановления',1,7),node('link','Ссылка действительна?',1,8,'gateway','Платформа'),node('expired','Запросить новое письмо',0,8),node('password','Задать новый пароль и повторить',1,9),node('match','Новый пароль корректен и совпадает?',1,10,'gateway','Платформа'),node('fix','Исправить пароль; остальные данные сохранены',0,10),node('save','Сохранить новый пароль; старый больше не подходит',1,11,role='Платформа')
 ],[edge('start','login'),edge('login','valid'),edge('valid','done','Да'),edge('valid','error','Нет'),edge('error','recover'),edge('recover','login','Нет','left'),edge('recover','email','Да'),edge('email','mail'),edge('mail','open'),edge('open','link'),edge('link','expired','Нет'),edge('expired','email','Новое письмо','left'),edge('link','password','Да'),edge('password','match'),edge('match','fix','Нет'),edge('fix','password','Исправить','left'),edge('match','save','Да'),edge('save','login','Войти с новым паролем','right')],['При обычном входе организация уже подключена; новый поиск или повторная регистрация организации не предлагаются.','После восстановления нет автоматического входа: пользователь возвращается к форме и вводит новый пароль.','Неизвестный email получает такое же нейтральное сообщение, но не позволяет сменить пароль другого аккаунта. Ошибка сервиса сохраняет форму.']),
 model('AUTH1_LINK','Необязательная привязка mos.ru','Добавить вход через mos.ru к существующему аккаунту без создания дубля.',[
  node('start','Аккаунт уже создан',1,0,'start'),node('choose','Выбрать «Подключить Mos ID»',1,1),node('provider','Войти в mos.ru',1,2,role='Пользователь / mos.ru'),node('consent','Разрешить передачу данных',1,3),node('valid','Авторизация подтверждена?',1,4,'gateway','Платформа'),node('error','Ошибка / отмена; аккаунт не изменён',0,4,role='Платформа'),node('retry','Повторить?',0,5,'gateway'),node('cancel','Привязка не выполнена',0,6,'end'),node('free','Mos ID свободен для этого аккаунта?',1,5,'gateway','Платформа'),node('conflict','Сообщить о другой привязке; аккаунты не объединять',2,5,role='Платформа'),node('no_change','Существующий аккаунт сохранён',2,6,'end'),node('link','Сохранить Mos ID в текущем аккаунте',1,6,role='Платформа'),node('done','Дополнительный способ входа подключён',1,7,'end')
 ],[edge('start','choose'),edge('choose','provider'),edge('provider','consent'),edge('consent','valid'),edge('valid','error','Нет'),edge('error','retry'),edge('retry','provider','Да','left'),edge('retry','cancel','Нет'),edge('valid','free','Да'),edge('free','conflict','Нет'),edge('conflict','no_change'),edge('free','link','Да'),edge('link','done')],['Привязка не меняет существующий локальный пароль, организацию и назначенные права.','При конфликте Mos ID другой аккаунт не объединяется с текущим. Можно отменить либо отдельно войти через mos.ru.','Отвязка mos.ru в профиле допускается после задания локального пароля, чтобы сохранить способ входа.'])
]

def anchor(n,side):
    cx,cy=n['x']+120,n['y']+45
    rx,ry=(18,18) if n['kind'] in ['start','end'] else (30,30) if n['kind']=='gateway' else (120,45)
    return {'left':(cx-rx,cy),'right':(cx+rx,cy),'top':(cx,cy-ry),'bottom':(cx,cy+ry)}[side]

VERTICAL_ROUTES={}
def vertical_routes(m):
    if m['id'] not in VERTICAL_ROUTES:
        obstacles=[];captions=[]
        for n in m['nodes']:
            cx,cy=n['x']+120,n['y']+45;rx,ry=(18,18) if n['kind'] in ['start','end'] else (30,30) if n['kind']=='gateway' else (120,45)
            obstacles.append((cx-rx,cy-ry,rx*2,ry*2))
            if n['kind']=='gateway':
                count=len(lines(n['text'],31));captions.append((n['x']-5,n['y']-27-(count-1)*17,250,count*17+7))
            elif n['kind'] in ['start','end']:captions.append((n['x'],cy+25,240,len(lines(n['text'],30))*17+10))
        VERTICAL_ROUTES[m['id']]=route(m['nodes'],m['edges'],anchor,obstacles,(10,30,1030,max(n['y'] for n in m['nodes'])+130),captions)
    return VERTICAL_ROUTES[m['id']]

def geometry(m,e):return vertical_routes(m)[m['edges'].index(e)][0]

def lines(text,width=27):return textwrap.wrap(text,width=width,break_long_words=False,break_on_hyphens=False)
def label_geo(m,e,points):
    return vertical_routes(m)[m['edges'].index(e)][1]
def text(x,y,words,size=13,anchor='middle',cls='',width=27):
    ls=lines(words,width);return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" class="{cls}">'+''.join(f'<tspan x="{x}" dy="{0 if i==0 else 17}">{escape(s)}</tspan>' for i,s in enumerate(ls))+'</text>'

def svg(m):
    height=max(n['y'] for n in m['nodes'])+140;mid=m['id'];shapes=[];masks=[];paths=[];labels=[]
    for i,e in enumerate(m['edges']):
        points=geometry(m,e);paths.append(f'<polyline data-edge="{i}" points="'+ ' '.join(f'{x},{y}' for x,y in points)+f'" marker-end="url(#{mid}_arrow)"/>')
        if e['label']:
            x,y=label_geo(m,e,points)
            w=min(195,max(44,len(e['label'])*7+18));h=25
            masks.append(f'<rect x="{x-w/2}" y="{y-14}" width="{w}" height="{h}" fill="black"/>')
            labels.append(f'<g data-edge-label="{i}"><rect x="{x-w/2}" y="{y-14}" width="{w}" height="{h}" fill="white"/>'+text(x,y+3,e['label'],12,width=30)+'</g>')
    for n in m['nodes']:
        x,y=n['x'],n['y'];cx,cy=x+120,y+45;kind=n['kind']
        if kind in ['start','end']:
            masks.append(f'<rect data-event-text-mask="{n["id"]}" x="{x}" y="{cy+25}" width="240" height="{len(lines(n["text"],30))*17+10}" fill="black"/>')
            shapes.append(f'<g data-node="{n["id"]}"><circle cx="{cx}" cy="{cy}" r="18" fill="white" stroke="#294d52" stroke-width="{3 if kind=="end" else 1.5}"/>'+text(cx,cy+40,n['text'],13,width=30)+'</g>')
        elif kind=='gateway':
            ls=lines(n['text'],31);top=y-12-(len(ls)-1)*17
            masks.append(f'<rect x="{x-5}" y="{top-15}" width="250" height="{len(ls)*17+7}" fill="black"/>')
            shapes.append(f'<g data-node="{n["id"]}"><rect x="{x-5}" y="{top-15}" width="250" height="{len(ls)*17+7}" fill="white"/>'+text(cx,top,n['text'],13,width=31)+f'<path d="M{cx},{cy-30} L{cx+30},{cy} L{cx},{cy+30} L{cx-30},{cy}Z" fill="white" stroke="#54747a"/>'+text(cx,cy+5,'×',19)+'</g>')
        else:
            fill='#eef5f6' if n['role']=='Платформа' else '#fff'
            ls=lines(n['text']);ty=y+43 if len(ls)<=2 else y+35
            shapes.append(f'<g data-node="{n["id"]}"><rect x="{x}" y="{y}" width="240" height="90" rx="7" fill="{fill}" stroke="#8da8ad"/>'+text(cx,y+18,n['role'],10,cls='role',width=38)+text(cx,ty,n['text'])+'</g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1040 {height}" width="1040" height="{height}" role="img" aria-labelledby="{mid}_title" data-process="{mid}"><title id="{mid}_title">{escape(m["title"])}</title><defs><marker id="{mid}_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#54747a"/></marker><mask id="{mid}_mask"><rect width="1040" height="{height}" fill="white"/>'+''.join(masks)+f'</mask></defs><style>text{{font-family:Arial,sans-serif;fill:#193a40}}.role{{fill:#62777b}}</style><g fill="none" stroke="#54747a" stroke-width="1.5" mask="url(#{mid}_mask)">'+''.join(paths)+'</g>'+''.join(shapes)+''.join(labels)+'</svg>'

def bpmn(m):
    mid=m['id'];root=ET.Element(f'{{{B}}}definitions',{'id':mid+'_definitions','targetNamespace':'https://vero.prototype/processes/v1','exporter':'VERO prototype','exporterVersion':VERSION});p=ET.SubElement(root,f'{{{B}}}process',{'id':mid,'name':m['title'],'isExecutable':'false'});ET.SubElement(p,f'{{{B}}}documentation').text=m['goal']+' Предлагаемый процесс по текущему прототипу; не исполняемый серверный процесс.'
    incoming={n['id']:[] for n in m['nodes']};outgoing={n['id']:[] for n in m['nodes']}
    for i,e in enumerate(m['edges']):outgoing[e['source']].append(mid+'_flow_'+str(i));incoming[e['target']].append(mid+'_flow_'+str(i))
    for n in m['nodes']:
        tag={'start':'startEvent','end':'endEvent','gateway':'exclusiveGateway','task':'task'}[n['kind']];attrs={'id':mid+'_'+n['id'],'name':n['text']}
        if n['kind']=='gateway':attrs['gatewayDirection']='Diverging' if len(outgoing[n['id']])>1 else 'Converging'
        el=ET.SubElement(p,f'{{{B}}}{tag}',attrs);ET.SubElement(el,f'{{{B}}}documentation').text='Участник: '+n['role']
        for key,values in [('incoming',incoming[n['id']]),('outgoing',outgoing[n['id']])]:
            for val in values:ET.SubElement(el,f'{{{B}}}{key}').text=val
    for i,e in enumerate(m['edges']):ET.SubElement(p,f'{{{B}}}sequenceFlow',{'id':mid+'_flow_'+str(i),'sourceRef':mid+'_'+e['source'],'targetRef':mid+'_'+e['target'],'name':e['label']})
    diagram=ET.SubElement(root,f'{{{D}}}BPMNDiagram',{'id':mid+'_diagram'});plane=ET.SubElement(diagram,f'{{{D}}}BPMNPlane',{'id':mid+'_plane','bpmnElement':mid})
    for n in m['nodes']:
        shape=ET.SubElement(plane,f'{{{D}}}BPMNShape',{'id':mid+'_'+n['id']+'_di','bpmnElement':mid+'_'+n['id']});cx,cy=n['x']+120,n['y']+45;w,h=(36,36) if n['kind'] in ['start','end'] else (60,60) if n['kind']=='gateway' else (240,90)
        ET.SubElement(shape,f'{{{C}}}Bounds',{'x':str(cx-w/2),'y':str(cy-h/2),'width':str(w),'height':str(h)})
        if n['kind']!='task':
            label=ET.SubElement(shape,f'{{{D}}}BPMNLabel');ET.SubElement(label,f'{{{C}}}Bounds',{'x':str(cx+30 if n['kind']=='start' else n['x']),'y':str(cy-20 if n['kind']=='start' else n['y']-45 if n['kind']=='gateway' else cy+25),'width':'240','height':'42'})
    for i,e in enumerate(m['edges']):
        el=ET.SubElement(plane,f'{{{D}}}BPMNEdge',{'id':mid+'_flow_'+str(i)+'_di','bpmnElement':mid+'_flow_'+str(i)})
        points=geometry(m,e)
        for x,y in points:ET.SubElement(el,f'{{{I}}}waypoint',{'x':str(x),'y':str(y)})
        if e['label']:
            x,y=label_geo(m,e,points);label=ET.SubElement(el,f'{{{D}}}BPMNLabel');ET.SubElement(label,f'{{{C}}}Bounds',{'x':str(x-90),'y':str(y-15),'width':'180','height':'30'})
    ET.indent(root);return '<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(root,encoding='unicode')

def process_card(i, m, vertical, horizontal):
    bn, s, xml = vertical
    hbn, hs, hxml = horizontal
    sn, hsn = bn.replace('.bpmn', '.svg'), hbn.replace('.bpmn', '.svg')
    def download(name, mime, value, label):
        return f'<a download="{name}" href="data:{mime};charset=utf-8,{quote(value,safe="")}">{label}</a>'
    return f'<article id="{m["id"]}" data-process-card><div class="card-head"><span class="number">{i:02}</span><div><h2>{escape(m["title"])}</h2><p>{escape(m["goal"])}</p></div></div><div class="tools"><button data-layout="vertical" aria-pressed="true">Вертикально</button><button data-layout="horizontal" aria-pressed="false">Горизонтально · BPMN</button><button data-zoom="out" aria-label="Уменьшить схему">−</button><span data-scale>По ширине</span><button data-zoom="in" aria-label="Увеличить схему">+</button><button data-zoom="fit">По ширине</button><span class="downloads" data-layout-downloads="vertical">'+download(bn,'application/xml',xml,'Скачать BPMN')+download(sn,'image/svg+xml',s,'Скачать SVG')+'</span><span class="downloads" data-layout-downloads="horizontal" hidden>'+download(hbn,'application/xml',hxml,'Скачать BPMN')+download(hsn,'image/svg+xml',hs,'Скачать SVG')+'</span></div><div class="diagram" data-orientation="vertical" tabindex="0" aria-label="Вертикальная схема с прокруткой">'+s+'</div><div class="diagram" data-orientation="horizontal" tabindex="0" aria-label="Горизонтальная BPMN-схема с дорожками" hidden>'+hs+'</div><ul>'+''.join('<li>'+escape(t)+'</li>' for t in m['notes'])+'</ul></article>'

def main():
    cards=[];manifest=[]
    for i,m in enumerate(MODELS,1):
        s=svg(m);xml=bpmn(m);h_layout=horizontal.layout(m);hs=horizontal.svg(m,h_layout);hxml=horizontal.bpmn(m,h_layout,xml);slug=m['id'].lower().replace('_','-');bn=slug+'.bpmn';sn=slug+'.svg'
        for folder in [OUT,ROOT/'web']:(folder/bn).write_text(xml,encoding='utf-8');(folder/sn).write_text(s,encoding='utf-8')
        hbn=slug+'-horizontal.bpmn';hsn=slug+'-horizontal.svg'
        for folder in [OUT,ROOT/'web']:(folder/hbn).write_text(hxml,encoding='utf-8');(folder/hsn).write_text(hs,encoding='utf-8')
        cards.append(process_card(i, m, (bn, s, xml), (hbn, hs, hxml)))
        manifest.append(m)
    page='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Вариант 1 — схемы регистрации и входа</title><style>*{box-sizing:border-box}[hidden]{display:none!important}.diagram[data-orientation=horizontal] svg{width:auto}.tools [aria-pressed=true]{background:#25343a;color:white}body{margin:0;background:#f6f8f8;color:#18383f;font:14px/1.5 Arial,sans-serif}main{max-width:1160px;margin:auto;padding:26px 18px}h1{font-size:28px;margin:0 0 10px}h2{font-size:20px;margin:0}p{color:#65767b}nav{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}nav a{padding:7px 10px;background:white;border:1px solid #cedadb;border-radius:4px}a{color:#1c6876}article{background:white;border:1px solid #cfdbdd;border-radius:8px;padding:20px;margin:20px 0}.card-head{display:flex;gap:14px}.card-head p{margin:7px 0 16px}.number{display:grid;place-items:center;flex:none;width:36px;height:36px;border-radius:6px;background:#eaf2f3}.tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:10px 0}button,.downloads a{font:12px Arial,sans-serif;border:1px solid #cddbdd;border-radius:4px;padding:8px 10px;background:white;color:#1c5964;cursor:pointer}button:focus-visible,a:focus-visible,.diagram:focus-visible{outline:3px solid #96b9f5;outline-offset:3px}.downloads{margin-left:auto;display:flex;gap:8px}.downloads a{text-decoration:none}.diagram{border:1px solid #d3dfe0;border-radius:5px;overflow:auto;max-height:650px;padding:14px;background:white}.diagram svg{display:block;width:100%;height:auto;max-width:none}.tools [data-scale]{font-size:12px;min-width:64px;text-align:center}li{margin:7px 0}ul{padding-left:20px;margin-bottom:0}.meta{font-size:12px;color:#60757b}@media(max-width:600px){main{padding:18px 10px}article{padding:12px}h1{font-size:23px}h2{font-size:18px}.downloads{margin-left:0;width:100%}.diagram{max-height:70vh}}</style></head><body><main data-variant1-schemes><h1>Вариант 1 · регистрация и вход</h1><p>Новые схемы по текущему прототипу. Выберите вертикальный вид или горизонтальный BPMN с дорожками участников. Кабинет и работа после входа не рассматриваются. Участник указан в каждом действии; ромб обозначает условие, круг — начало или результат.</p><p class="meta">Версия __VERSION__. Все интеграции и проверки имитируются. Источник поведения — прототип и решения пользователя; это предлагаемый процесс.</p><nav>__NAV__</nav>__CARDS__<p class="meta">Подписи не накладываются. Под пересекающей подписью стрелка прерывается. BPMN содержит редактируемые элементы и координаты; SVG подходит для просмотра.</p></main><script>document.addEventListener('click',e=>{const mode=e.target.closest('[data-layout]');if(mode){const card=mode.closest('article'),orientation=mode.dataset.layout;card.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b===mode)));card.querySelectorAll('[data-orientation]').forEach(box=>{box.hidden=box.dataset.orientation!==orientation;box.scrollTop=0;box.scrollLeft=0;});card.querySelectorAll('[data-layout-downloads]').forEach(el=>el.hidden=el.dataset.layoutDownloads!==orientation);const svg=card.querySelector('.diagram:not([hidden]) svg');delete svg.dataset.scale;svg.style.width=orientation==='horizontal'?svg.viewBox.baseVal.width+'px':'100%';card.querySelector('[data-scale]').textContent=orientation==='horizontal'?'100%':'По ширине';return;}const b=e.target.closest('[data-zoom]');if(!b)return;const card=b.closest('article'),box=card.querySelector('.diagram:not([hidden])'),svg=box.querySelector('svg'),base=svg.viewBox.baseVal.width;let scale=Number(svg.dataset.scale||Math.min(1,(box.clientWidth-30)/base));scale=b.dataset.zoom==='fit'?Math.min(1,(box.clientWidth-30)/base):Math.max(.2,Math.min(2.5,scale+(b.dataset.zoom==='in'?.15:-.15)));svg.dataset.scale=scale;svg.style.width=base*scale+'px';card.querySelector('[data-scale]').textContent=Math.round(scale*100)+'%';});</script></body></html>'''
    page=page.replace('__VERSION__',VERSION).replace('__NAV__',''.join(f'<a href="#{m["id"]}">{i}. {escape(m["title"])}</a>' for i,m in enumerate(MODELS,1))).replace('__CARDS__',''.join(cards))
    page=page[:page.index('<script>')]+'<script>'+(ROOT/'src/scheme-viewer.js').read_text(encoding='utf-8')+'</script></body></html>'
    page=page.replace('</head>','<style>'+(ROOT/'src/scheme-viewer.css').read_text(encoding='utf-8')+'</style></head>')
    page=page.replace('<button data-zoom="fit">По ширине</button>','<button data-zoom="fit">По ширине</button><button data-expand aria-expanded="false">На весь экран</button>')
    for folder in [ROOT,ROOT/'web']:
        for name in ['schemes.html','schemes-all.html','processes.html']:(folder/name).write_text(page,encoding='utf-8')
    (ROOT/'deliverables'/f'vero-variant1-processes-v{VERSION}.html').write_text(page,encoding='utf-8')
    (OUT/'model.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    with ZipFile(ROOT/'deliverables'/f'vero-variant1-processes-v{VERSION}.zip','w',ZIP_DEFLATED) as z:
        z.writestr('schemes.html',page)
        for p in OUT.glob('*'):
            if p.suffix in ['.svg','.bpmn']:z.write(p,p.name)
    md='# Вариант 1 — процессы регистрации и входа\n\nВерсия '+VERSION+'. Состояние: предлагаемый процесс, отражённый в HTML-прототипе. Владелец бизнес-процессов не установлен. Цели ниже восстановлены из поручения пользователя моделировать регистрацию/авторизацию; серверная реализация не подтверждена.\n\nИсточники: решения пользователя 05.11.2026; src/registration-mos-id.js (функции view/allowMos/openCabinet и обработчики); src/platform-entry.html (authOnly, certificate/application); ТЗ 1.0 §6.2/LK-06 только для сохранения проверки до административных прав.\n\n'
    for m in MODELS:
        md+=f'## {m["id"]} — {m["title"]}\n\nЦель: {m["goal"]}\n\nЗапуск: {m["nodes"][0]["text"]}. Условия запуска: пользователь находится в соответствующем сценарии стенда; для подключения организации аккаунт уже создан, для привязки mos.ru — пользователь авторизован, для приглашения — открыта ссылка организации.\n\n| ID | Участник | Действие / условие |\n|---|---|---|\n'+''.join(f'| {n["id"]} | {n["role"]} | {n["text"]} |\n' for n in m['nodes'])+'\nВетви: '+ '; '.join(f'{e["source"]} → {e["target"]}'+(' ('+e['label']+')' if e['label'] else '') for e in m['edges'])+'.\n\nРезультаты: '+ '; '.join(n['text'] for n in m['nodes'] if n['kind']=='end')+'.\n\n'+'\n'.join('- '+t for t in m['notes'])+'\n\n'
    (ROOT/'docs/business-processes-variant1.md').write_text(md,encoding='utf-8')
    print('Built six variant 1 processes in vertical and horizontal BPMN layouts, offline HTML/ZIP and process cards. Retired schemes were not restored.')

if __name__ == '__main__':
    main()
