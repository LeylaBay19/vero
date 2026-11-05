"""Sequence-flow geometry and semantic parity, independently of browser text QA."""
import json,sys
from pathlib import Path
from xml.etree import ElementTree as ET
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import auth_v1_horizontal as h

def segments(points):
    return [(a,b) for a,b in zip(points,points[1:]) if a!=b]

def hit(a,b,box):
    x,y,w,z=box
    if a[0]==b[0]:return x<a[0]<x+w and min(a[1],b[1])<y+z and max(a[1],b[1])>y
    if a[1]==b[1]:return y<a[1]<y+z and min(a[0],b[0])<x+w and max(a[0],b[0])>x
    raise AssertionError('Diagonal sequence flow')

failures=[]
for model in json.loads((ROOT/'processes-v1/model.json').read_text(encoding='utf8')):
    g=h.layout(model);paths=[h.edge_geometry(model,g,i)[0] for i in range(len(model['edges']))]
    for i,(e,pts) in enumerate(zip(model['edges'],paths)):
        for a,b in segments(pts):
            assert a[0]==b[0] or a[1]==b[1]
            for n in g['nodes']:
                if n['id'] in [e['source'],e['target']]:continue
                rx,ry=(18,18) if n['kind'] in ['start','end'] else (28,28) if n['kind']=='gateway' else (110,43)
                if hit(a,b,(n['x']+110-rx,n['y']+43-ry,rx*2,ry*2)):failures.append((model['id'],i,'crosses node',n['id']))
        for j in range(i):
            for a,b in segments(pts):
                for c,d in segments(paths[j]):
                    if a[0]==b[0]==c[0]==d[0]:overlap=min(max(a[1],b[1]),max(c[1],d[1]))-max(min(a[1],b[1]),min(c[1],d[1]))
                    elif a[1]==b[1]==c[1]==d[1]:overlap=min(max(a[0],b[0]),max(c[0],d[0]))-max(min(a[0],b[0]),min(c[0],d[0]))
                    else:continue
                    if overlap>1:failures.append((model['id'],i,'overlaps flow',j,overlap))
    xml=ET.parse(ROOT/'processes-v1'/(model['id'].lower().replace('_','-')+'-horizontal.bpmn'))
    edges=xml.findall('.//{'+h.B+'}sequenceFlow')
    assert [(e.get('sourceRef'),e.get('targetRef'),e.get('name','')) for e in edges]==[(model['id']+'_'+e['source'],model['id']+'_'+e['target'],e['label']) for e in model['edges']]
assert not failures,failures
print('Six horizontal BPMN layouts: orthogonal flows, no node crossings or collinear shared flows, all semantic edges/conditions preserved.')
