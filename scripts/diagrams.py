from pathlib import Path
from html import escape
import xml.etree.ElementTree as E
from PIL import Image,ImageDraw,ImageFont
from process_details import DETAILS
import shutil

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'diagrams';OUT.mkdir(parents=True,exist_ok=True)
VERSION=(ROOT/'VERSION').read_text(encoding='utf-8').strip()
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

def diagram(slug,title,precondition,nodes,flows,lanes=None,size=(2300,1060)):
    # Reserve a separate left column for role labels; shift all process content.
    gutter=180
    W,H=size
    W+=gutter
    nodes={nid:(kind,label,(x+gutter,y,w,h),lane) for nid,(kind,label,(x,y,w,h),lane) in nodes.items()}
    flows=[(source,target,[(x+gutter,y) for x,y in points],label,(labelpos[0]+gutter,labelpos[1]) if labelpos else None) for source,target,points,label,labelpos in flows]
    lanes=lanes or [('person','ГЕНЕРАЛЬНЫЙ ДИРЕКТОР' if slug in ('organization-registration','employee-mchd') else 'СОТРУДНИК',130,310),('system','ПЛАТФОРМА',440,450)]
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
    box(35,130,W-70,lanes[-1][2]+lanes[-1][3]-130,'#ffffff',0)
    for lane,label,y,h in lanes:
        if y!=130:line([(35,y),(W-35,y)],False)
        line([(35+gutter,y),(35+gutter,y+h)],False)
        label_size=18
        while ImageFont.truetype(font_file(True),label_size).getlength(label)>h-36:label_size-=1
        ft=ImageFont.truetype(font_file(True),label_size)
        length=int(ft.getlength(label))+12
        tile=Image.new('RGBA',(length,label_size*2),(255,255,255,0))
        ImageDraw.Draw(tile).text((length/2,label_size),label,font=ft,fill='#193936',anchor='mm')
        tile=tile.rotate(90,expand=True)
        cx,cy=35+gutter/2,y+h/2
        im.paste(tile,(int(cx-tile.width/2),int(cy-tile.height/2)),tile)
        svg.append(f'<text transform="translate({cx} {cy}) rotate(-90)" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-size="{label_size}" font-weight="700" fill="#193936">{escape(label)}</text>')
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
    text(35,H-117,f'Предлагаемый процесс · v{VERSION} · интерфейс и BPMN одной версии',23,True,False)
    text(35,H-74,'Для уже подключённого сотрудника. В едином подключении полномочия берутся из приглашения; МЧД подписывает руководитель.' if slug=='employee-mchd' else 'Получение организации из mos.ru — гипотеза интеграции, не подтверждённая документами Тринити.' if slug=='employee-mos-organization' else 'Единый процесс: организация из приглашения; обычный доступ после принятия, полномочия МЧД — после подписи руководителя.' if slug=='employee-invitation' else 'Вариант 2: проверки выполняются по задаче; интеграции и юридические требования требуют уточнения.' if slug.startswith('v2-') else 'Проверка платформой обязательна; способ её реализации и сроки здесь не определяются.',21,False,False)
    svg.append('</svg>');(OUT/(slug+'.svg')).write_text('\n'.join(svg),encoding='utf-8');im.save(OUT/(slug+'.png'))
    defs=E.Element('{'+NS['bpmn']+'}definitions',id=slug.replace('-','_')+'_defs',targetNamespace='urn:proposed:registration')
    proc=el(defs,'bpmn:process',id='Process',name=title,isExecutable='false')
    el(proc,'bpmn:documentation').text=precondition+' Предлагаемый вариант; версия '+VERSION+'. Технический механизм проверки платформой и сроки не определены.'
    if slug in DETAILS:
        el(proc,'bpmn:documentation').text='\n'.join(DETAILS[slug])
    ls=el(proc,'bpmn:laneSet',id='Lanes')
    for lane,label,_,_ in lanes:
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
    for lane,_,y,h in lanes:
        sh=el(plane,'bpmndi:BPMNShape',id=lane+'_di',bpmnElement=lane,isHorizontal='true');el(sh,'dc:Bounds',x=35,y=y,width=W-70,height=h)
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

diagram('organization-registration','Предлагаемый вариант · регистрация и доступ к организации','Гендиректору подключённой организации приглашение не требуется: проверяется существующий доступ или подтверждаются полномочия.',{
 'Start':('startEvent','Начало',(70,243,34,34),'person'),
 'Auth':('userTask','Войти / создать личный аккаунт',(150,210,220,100),'person'),
 'INN':('userTask','Указать организацию по ИНН',(440,210,240,100),'person'),
 'Lookup':('serviceTask','Найти организацию',(440,600,240,100),'system'),
 'Exists':('exclusiveGateway','Уже подключена?',(770,625,50,50),'system'),
 'Access':('serviceTask','Проверить сохранённую связь аккаунта с организацией и права',(760,880,280,110),'system'),
 'Known':('exclusiveGateway','Доступ уже\nподтверждён?',(1120,910,50,50),'system'),
 'Record':('userTask','Проверить реквизиты организации',(1100,210,260,100),'person'),
 'Sign':('userTask','Подписать заявление УКЭП гендиректора',(1470,210,270,100),'person'),
 'Check':('serviceTask','Проверить подпись, данные и полномочия гендиректора',(1470,600,270,110),'system'),
 'Valid':('exclusiveGateway','Проверка пройдена?',(1840,630,50,50),'system'),
 'Ready':('serviceTask','Новая компания: подключить; существующая: подтвердить доступ без дубля',(2070,600,300,120),'system'),
 'Cabinet':('userTask','Открыть кабинет с подтверждёнными правами',(2070,210,300,100),'person'),
 'End':('endEvent','Кабинет открыт',(2470,243,34,34),'person'),
 'Reject':('serviceTask','Сообщить причину; не выдавать доступ',(1770,880,280,110),'system'),
 'Retry':('exclusiveGateway','Повторная подача?',(2140,910,50,50),'system'),
 'RejectedEnd':('endEvent','Без нового доступа',(2450,918,34,34),'system'),
},[
 ('Start','Auth',[(104,260),(150,260)],'',None),('Auth','INN',[(370,260),(440,260)],'',None),
 ('INN','Lookup',[(560,310),(560,600)],'',None),('Lookup','Exists',[(680,650),(770,650)],'',None),
 ('Exists','Record',[(820,650),(1230,650),(1230,310)],'Нет',(990,625)),
 ('Exists','Access',[(795,675),(795,880)],'Да',(835,775)),
 ('Access','Known',[(1040,935),(1120,935)],'',None),
 ('Known','Cabinet',[(1170,935),(1320,935),(1320,500),(2220,500),(2220,310)],'Да: без новой регистрации',(1700,475)),
 ('Known','Record',[(1145,910),(1145,825),(1060,825),(1060,260),(1100,260)],'Нет: подтвердить полномочия',(1160,780)),
 ('Record','Sign',[(1360,260),(1470,260)],'',None),('Sign','Check',[(1605,310),(1605,600)],'',None),
 ('Check','Valid',[(1740,655),(1840,655)],'',None),('Valid','Ready',[(1890,655),(2070,655)],'Да',(1980,630)),
 ('Ready','Cabinet',[(2220,600),(2220,310)],'',None),('Cabinet','End',[(2370,260),(2470,260)],'',None),
 ('Valid','Reject',[(1865,680),(1865,880)],'Нет',(1910,775)),('Reject','Retry',[(2050,935),(2140,935)],'',None),
 ('Retry','RejectedEnd',[(2190,935),(2450,935)],'Нет',(2310,910)),
 ('Retry','Record',[(2165,960),(2165,1130),(1410,1130),(1410,360),(1230,360),(1230,310)],'Да',(2070,1100)),
],lanes=[('person','ПОЛЬЗОВАТЕЛЬ / ГЕНДИРЕКТОР',130,410),('system','ПЛАТФОРМА',540,650)],size=(2750,1370))
diagram('employee-invitation','Предлагаемый вариант · единое подключение сотрудника','Приглашение на любую почту → mos.ru без повторного ИНН → принятие → МЧД руководителю, если нужна.',{
 'Start':('startEvent','Приглашение\nполучено',(70,243,34,34),'person'),
 'Open':('userTask','Открыть приглашение на личной или рабочей почте',(150,210,240,110),'person'),
 'Mos':('userTask','Войти через свой аккаунт mos.ru',(450,210,240,110),'person'),
 'AuthOK':('exclusiveGateway','Вход выполнен?',(545,600,50,50),'system'),
 'Cancel':('userTask','Вернуться к сохранённому приглашению',(760,210,250,110),'person'),
 'Restore':('serviceTask','Восстановить приглашение, организацию и ИНН',(800,570,260,110),'system'),
 'Accept':('userTask','Проверить свои данные, организацию и права; принять приглашение',(1120,210,270,120),'person'),
 'Check':('serviceTask','Проверить связь приглашения с вошедшим аккаунтом',(1120,570,270,110),'system'),
 'Match':('exclusiveGateway','Контекст верен?',(1460,600,50,50),'system'),
 'Reject':('serviceTask','Не предоставлять доступ; предложить открыть приглашение заново',(1430,790,280,110),'system'),
 'RejectedEnd':('endEvent','Без доступа',(1770,828,34,34),'system'),
 'Grant':('serviceTask','Подключить сотрудника; выдать обычные права кабинета',(1610,570,280,110),'system'),
 'Need':('exclusiveGateway','Нужна МЧД?',(1980,600,50,50),'system'),
 'Without':('userTask','Открыть кабинет без МЧД',(2240,210,260,110),'person'),
 'EndWithout':('endEvent','Подключён без МЧД',(2590,248,34,34),'person'),
 'Generate':('serviceTask','Сформировать МЧД по полномочиям приглашения; направить руководителю',(1900,790,290,120),'system'),
 'Review':('userTask','Проверить сотрудника и сформированную МЧД',(1900,1080,290,110),'director'),
 'Sign':('userTask','Подписать МЧД УКЭП руководителя',(2280,1080,270,110),'director'),
 'Verify':('serviceTask','Проверить подпись и действительность МЧД',(2280,790,270,120),'system'),
 'SignatureOK':('exclusiveGateway','Подпись верна?',(2580,825,50,50),'system'),
 'Activate':('serviceTask','После успешной проверки активировать только полномочия МЧД',(2670,790,290,120),'system'),
 'End':('endEvent','МЧД действует',(3090,828,34,34),'system'),
},[
 ('Start','Open',[(104,260),(150,260)],'',None),
 ('Open','Mos',[(390,265),(450,265)],'',None),
 ('Mos','AuthOK',[(570,320),(570,600)],'',None),
 ('AuthOK','Cancel',[(595,625),(725,625),(725,265),(760,265)],'Отмена',(700,525)),
 ('Cancel','Open',[(885,320),(885,390),(270,390),(270,320)],'Повторить вход',(610,365)),
 ('AuthOK','Restore',[(595,625),(800,625)],'Да',(735,600)),
 ('Restore','Accept',[(1060,625),(1090,625),(1090,270),(1120,270)],'',None),
 ('Accept','Check',[(1255,330),(1255,570)],'',None),
 ('Check','Match',[(1390,625),(1460,625)],'',None),
 ('Match','Reject',[(1485,650),(1485,790)],'Нет',(1530,720)),
 ('Reject','RejectedEnd',[(1710,845),(1770,845)],'',None),
 ('Match','Grant',[(1510,625),(1610,625)],'Да',(1560,600)),
 ('Grant','Need',[(1890,625),(1980,625)],'',None),
 ('Need','Without',[(2030,625),(2370,625),(2370,320)],'Нет',(2200,600)),
 ('Without','EndWithout',[(2500,265),(2590,265)],'',None),
 ('Need','Generate',[(2005,650),(2005,790)],'Да',(2050,720)),
 ('Generate','Review',[(2045,910),(2045,1080)],'',None),
 ('Review','Sign',[(2190,1135),(2280,1135)],'',None),
 ('Sign','Verify',[(2415,1080),(2415,910)],'',None),
 ('Verify','SignatureOK',[(2550,850),(2580,850)],'',None),
 ('SignatureOK','Activate',[(2630,850),(2670,850)],'Да',(2650,875)),
 ('SignatureOK','Sign',[(2605,875),(2605,1240),(2415,1240),(2415,1190)],'Ошибка: исправить и повторить',(2840,1015)),
 ('Activate','End',[(2960,845),(3090,845)],'',None),
],lanes=[('person','СОТРУДНИК',130,350),('system','ПЛАТФОРМА',480,560),('director','ГЕНЕРАЛЬНЫЙ ДИРЕКТОР',1040,260)],size=(3250,1480))

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

from proposal_v2_diagrams import generate
generate(diagram)

card=(ROOT/'docs/PRODUCT.md').read_text(encoding='utf-8')
(OUT/'business-processes.md').write_text(card,encoding='utf-8')
for path in OUT.iterdir():shutil.copyfile(path,SITE/path.name)
page='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Предлагаемый вариант — процессы регистрации</title><style>body{font:16px/1.6 Arial,sans-serif;background:#f5f8fa;color:#193936;margin:0;padding:32px}main{max-width:1500px;margin:auto}h1{font-size:30px}h2{margin-top:40px}img{display:block;width:100%;height:auto;background:white}a{color:#12665d}nav{display:flex;gap:20px;flex-wrap:wrap}p{max-width:1000px}@media(max-width:600px){body{padding:16px}h1{font-size:24px}}</style></head><body><main><a href="/">← К прототипу</a><h1>Предлагаемый вариант: процессы регистрации</h1><p>Организацию регистрирует генеральный директор. Сотрудник входит через mos.ru по сохранённому приглашению; МЧД автоматически направляется руководителю, если нужна. Схемы соответствуют правкам от 03.11.2026.</p>'''
for slug,title in [('organization-registration','Регистрация организации'),('employee-invitation','Сотрудник по приглашению'),('employee-mos-organization','Организация сотрудника есть на mos.ru'),('employee-mchd','Выдача полномочий и МЧД')]:
    page+=f'<section><h2>{title}</h2><p>Откройте SVG для увеличения или скачайте BPMN для редактирования.</p><nav><a href="{slug}.svg">Открыть SVG</a><a href="{slug}.bpmn" download>Скачать BPMN</a><a href="{slug}.png" download>Скачать PNG</a></nav><a href="{slug}.svg"><img src="{slug}.svg" alt="{title}: схема процесса"></a></section>'
page+='<p><a href="business-processes.md" download>Скачать описание процессов и границ</a></p><p>В кейсе mos.ru получение сведений организации показано как гипотеза интеграции. У Тринити такое автоматическое получение не подтверждено: инструкция описывает ввод ИНН и оформление МЧД.</p><p><a href="https://trinityeco.ru/api/trinity-auth-documents/">Официальная инструкция Тринити</a></p><p>Механизм и сроки проверки платформой требуют дальнейшего определения. Схемы описывают предлагаемый вариант.</p></main></body></html>'
(SITE/'processes.html').write_text(page,encoding='utf-8')
print('Created four BPMN/SVG/PNG diagrams, process descriptions and Site page /processes.html.')
