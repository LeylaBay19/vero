"""Classic horizontal BPMN view of the same variant 1 models; no new behavior."""
from copy import deepcopy
from html import escape
from xml.etree import ElementTree as ET
import textwrap
from orthogonal_routes import route

B='http://www.omg.org/spec/BPMN/20100524/MODEL';D='http://www.omg.org/spec/BPMN/20100524/DI';C='http://www.omg.org/spec/DD/20100524/DC';I='http://www.omg.org/spec/DD/20100524/DI'
def wrap(value,width=28):return textwrap.wrap(value,width=width,break_long_words=False,break_on_hyphens=False)
def lane(n):return 1 if n['role'].startswith('Платформа') else 0
def txt(x,y,value,size=14,width=28):
    return f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}">'+''.join(f'<tspan x="{x}" dy="{0 if i==0 else 18}">{escape(s)}</tspan>' for i,s in enumerate(wrap(value,width)))+'</text>'
def layout(model):
    nodes=deepcopy(model['nodes']);groups={};byid={n['id']:n for n in nodes}
    # Longest-path ranks of the forward DAG. Alternate/error nodes must follow
    # their condition, even when they shared a row in the vertical view.
    backs=[i for i,e in enumerate(model['edges']) if byid[e['source']]['row']>byid[e['target']]['row']]
    ranks={n['id']:0 for n in nodes};pending={n['id']:0 for n in nodes}
    for i,e in enumerate(model['edges']):
        if i not in backs:pending[e['target']]+=1
    queue=[key for key,value in pending.items() if not value];visited=0
    while queue:
        key=queue.pop(0);visited+=1
        for i,e in enumerate(model['edges']):
            if i in backs or e['source']!=key:continue
            ranks[e['target']]=max(ranks[e['target']],ranks[key]+1);pending[e['target']]-=1
            if not pending[e['target']]:queue.append(e['target'])
    assert visited==len(nodes),'Forward layout must be acyclic'
    for n in nodes:
        n['rank']=ranks[n['id']];groups.setdefault((lane(n),n['rank']),[]).append(n)
    maxima=[max([len(v) for (l,_),v in groups.items() if l==i] or [1]) for i in range(2)]
    heights=[250+(v-1)*180 for v in maxima];tops=[80,80+heights[0]]
    for (l,row),group in groups.items():
        group.sort(key=lambda n:n['col']);center=tops[l]+heights[l]/2
        for j,n in enumerate(group):n.update(x=200+row*420,y=center+(j-(len(group)-1)/2)*180-43,w=220,h=86,lane=l)
    base=80+sum(heights);heights[1]+=100+len(backs)*42
    incoming={n['id']:[] for n in nodes};outgoing={n['id']:[] for n in nodes}
    for i,e in enumerate(model['edges']):incoming[e['target']].append(i);outgoing[e['source']].append(i)
    g={'nodes':nodes,'incoming':incoming,'outgoing':outgoing,'lanes':[{'name':'Пользователь / руководитель','y':tops[0],'h':heights[0]},{'name':'Платформа ВЕРО','y':tops[1],'h':heights[1]}],'w':max(n['x'] for n in nodes)+390,'h':80+sum(heights)+25,'loop_y':{i:base+55+j*42 for j,i in enumerate(backs)}}
    for n in nodes:
        n['label_below']=n['kind']=='gateway' and any(e['source']==n['id'] and e['label']=='Нет' and byid[e['target']]['y']<n['y'] for e in model['edges'])
    obstacles=[]
    for n in nodes:
        cx,cy=n['x']+110,n['y']+43;rx,ry=(18,18) if n['kind'] in ['start','end'] else (28,28) if n['kind']=='gateway' else (110,43)
        obstacles.append((cx-rx,cy-ry,rx*2,ry*2))
        if n['kind']=='gateway':obstacles.append(caption(n)[1])
        elif n['kind'] in ['start','end']:obstacles.append((n['x']-10,cy+23,240,len(wrap(n['text'],30))*18+12))
    g['routes']=route(nodes,model['edges'],anchor,obstacles,(155,85,g['w']-30,g['h']-30))
    return g
def anchor(n,side):
    cx,cy=n['x']+110,n['y']+43;rx,ry=(18,18) if n['kind'] in ['start','end'] else (28,28) if n['kind']=='gateway' else (110,43)
    return {'left':(cx-rx,cy),'right':(cx+rx,cy),'top':(cx,cy-ry),'bottom':(cx,cy+ry)}[side]
def edge_geometry(model,g,i):
    return g['routes'][i]

def caption(n):
    count=len(wrap(n['text']));cy=n['y']+43
    ty=cy+55 if n.get('label_below') else cy-45-(count-1)*18
    return ty,(n['x']-10,ty-15,240,count*18+7)

def svg(model,g):
    mid=model['id']+'_H';W,H=g['w'],g['h'];masks=[];paths=[];labels=[];shapes=[]
    for i,e in enumerate(model['edges']):
        pts,(x,y)=edge_geometry(model,g,i);points=' '.join(f'{a},{b}' for a,b in pts);paths.append(f'<g data-flow="{i}"><polyline points="{points}" stroke="white" stroke-width="6"/><polyline points="{points}" marker-end="url(#{mid}_arrow)"/></g>')
        if e['label']:
            w=max(42,len(e['label'])*7.4+16);masks.append(f'<rect x="{x-w/2}" y="{y-15}" width="{w}" height="28" fill="black"/>');labels.append(f'<g data-edge-label="{i}"><rect x="{x-w/2}" y="{y-15}" width="{w}" height="28" fill="white"/>'+txt(x,y+4,e['label'],13,40)+'</g>')
    for n in g['nodes']:
        x,y=n['x'],n['y'];cx,cy=x+110,y+43;k=n['kind']
        if k in ['start','end']:
            ls=wrap(n['text'],30);masks.append(f'<rect x="{x-10}" y="{cy+23}" width="240" height="{len(ls)*18+12}" fill="black"/>');shapes.append(f'<g data-node="{n["id"]}"><circle cx="{cx}" cy="{cy}" r="18" fill="white" stroke="#222" stroke-width="{3 if k=="end" else 1.5}"/>'+txt(cx,cy+40,n['text'],14,30)+'</g>')
        elif k=='gateway':
            ls=wrap(n['text']);ty=caption(n)[0];masks.append(f'<rect x="{x-10}" y="{ty-15}" width="240" height="{len(ls)*18+7}" fill="black"/>');shapes.append(f'<g data-node="{n["id"]}"><rect x="{x-10}" y="{ty-15}" width="240" height="{len(ls)*18+7}" fill="white"/>'+txt(cx,ty,n['text'])+f'<path d="M{cx},{cy-28}L{cx+28},{cy}L{cx},{cy+28}L{cx-28},{cy}Z" fill="white" stroke="#222"/>'+txt(cx,cy+6,'×',20)+'</g>')
        else:
            ls=wrap(n['text'],27);ty=cy+5-(len(ls)-1)*9;shapes.append(f'<g data-node="{n["id"]}"><rect x="{x}" y="{y}" width="220" height="86" rx="8" fill="white" stroke="#222"/>'+txt(cx,ty,n['text'],14,27)+'</g>')
    pool=f'<rect x="20" y="35" width="{W-40}" height="{H-55}" fill="white" stroke="#333"/>'+txt(W/2,60,model['title']+' · вариант 1',16,100)
    for l in g['lanes']:
        pool+=f'<rect x="20" y="{l["y"]}" width="120" height="{l["h"]}" fill="#f7f7f7" stroke="#555"/><path d="M140 {l["y"]}H{W-20}" stroke="#555"/>'+txt(80,l['y']+l['h']/2-9,l['name'],14,13)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" data-process="{model["id"]}_H" data-bpmn-layout="horizontal" role="img" aria-label="{escape(model["title"])} — горизонтальная BPMN"><defs><marker id="{mid}_arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#222"/></marker><mask id="{mid}_mask"><rect width="{W}" height="{H}" fill="white"/>'+''.join(masks)+'</mask></defs><style>text{font-family:Arial,sans-serif;fill:#222}</style>'+pool+f'<g fill="none" stroke="#222" stroke-width="1.5" mask="url(#{mid}_mask)">'+''.join(paths)+'</g>'+''.join(shapes)+''.join(labels)+'</svg>'

def bpmn(model,g,vertical_xml):
    root=ET.fromstring(vertical_xml);mid=model['id'];process=root.find(f'{{{B}}}process');ls=ET.Element(f'{{{B}}}laneSet',{'id':mid+'_lanes'})
    for i,l in enumerate(g['lanes']):
        el=ET.SubElement(ls,f'{{{B}}}lane',{'id':mid+'_lane_'+str(i),'name':l['name']})
        for n in g['nodes']:
            if n['lane']==i:ET.SubElement(el,f'{{{B}}}flowNodeRef').text=mid+'_'+n['id']
    process.insert(1,ls);collab=ET.SubElement(root,f'{{{B}}}collaboration',{'id':mid+'_collaboration'});ET.SubElement(collab,f'{{{B}}}participant',{'id':mid+'_pool','name':model['title'],'processRef':mid});diagram=root.find(f'{{{D}}}BPMNDiagram');root.remove(diagram);root.append(diagram);plane=diagram.find(f'{{{D}}}BPMNPlane');plane.clear();plane.set('id',mid+'_horizontal_plane');plane.set('bpmnElement',mid+'_collaboration')
    def shape(ident,x,y,w,h,horizontal=False):
        attrs={'id':ident+'_h_di','bpmnElement':ident}
        if horizontal:attrs['isHorizontal']='true'
        sh=ET.SubElement(plane,f'{{{D}}}BPMNShape',attrs);ET.SubElement(sh,f'{{{C}}}Bounds',{'x':str(x),'y':str(y),'width':str(w),'height':str(h)});return sh
    shape(mid+'_pool',20,35,g['w']-40,g['h']-55,True)
    for i,l in enumerate(g['lanes']):shape(mid+'_lane_'+str(i),50,l['y'],g['w']-70,l['h'],True)
    for n in g['nodes']:
        cx,cy=n['x']+110,n['y']+43;w,h=(36,36) if n['kind'] in ['start','end'] else (56,56) if n['kind']=='gateway' else (220,86);sh=shape(mid+'_'+n['id'],cx-w/2,cy-h/2,w,h)
        if n['kind']!='task':
            count=len(wrap(n['text'],28 if n['kind']=='gateway' else 30));label_y=caption(n)[1][1] if n['kind']=='gateway' else cy+23
            label=ET.SubElement(sh,f'{{{D}}}BPMNLabel');ET.SubElement(label,f'{{{C}}}Bounds',{'x':str(n['x']-10),'y':str(label_y),'width':'240','height':str(count*18+12)})
    for i,e in enumerate(model['edges']):
        el=ET.SubElement(plane,f'{{{D}}}BPMNEdge',{'id':mid+'_flow_'+str(i)+'_h_di','bpmnElement':mid+'_flow_'+str(i)});pts,(x,y)=edge_geometry(model,g,i)
        for a,b in pts:ET.SubElement(el,f'{{{I}}}waypoint',{'x':str(a),'y':str(b)})
        if e['label']:
            width=max(42,len(e['label'])*7.4+16)
            label=ET.SubElement(el,f'{{{D}}}BPMNLabel');ET.SubElement(label,f'{{{C}}}Bounds',{'x':str(x-width/2),'y':str(y-15),'width':str(width),'height':'28'})
    ET.indent(root);return '<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(root,encoding='unicode')
