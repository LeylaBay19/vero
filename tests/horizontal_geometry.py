"""Sequence-flow geometry and semantic parity, independently of browser text QA."""
import sys
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import auth_v1_horizontal as h
from orthogonal_routes import overlap as flows_overlap
from registration_stand_models import BRIEF, LETTER
from build_stand import VERSION

def segments(points):
    return [(a,b) for a,b in zip(points,points[1:]) if a!=b]

def hit(a,b,box):
    x,y,w,z=box
    if a[0]==b[0]:return x<a[0]<x+w and min(a[1],b[1])<y+z and max(a[1],b[1])>y
    if a[1]==b[1]:return y<a[1]<y+z and min(a[0],b[0])<x+w and max(a[0],b[0])>x
    raise AssertionError('Diagonal sequence flow')

failures=[]
models = LETTER + BRIEF
with ZipFile(ROOT/f'deliverables/vero-registration-stand-v{VERSION}.zip') as package:
    exports = {name.split('/')[-1]: package.read(name) for name in package.namelist() if name.endswith('.bpmn')}
for model in models:
    g=h.layout(model);paths=[h.edge_geometry(model,g,i)[0] for i in range(len(model['edges']))]
    assert all(len(p)<=6 for p in paths),model['id']+' excessive bends'
    if model['id']=='AUTH1_EMAIL':
        by_pair={(e['source'],e['target']):paths[i] for i,e in enumerate(model['edges'])}
        assert len(by_pair[('expired','mail')])<=5,'Mail retry should stay within three bends'
        assert len(by_pair[('mos_offer','done')])==2,'Final event should connect directly'
        branch=by_pair[('valid_form','fix')]
        assert branch[1][1]<branch[0][1] and branch[1][0]==branch[0][0],'No branch should go up'
        assert next(n for n in g['nodes'] if n['id']=='valid_form')['label_below']
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
    for suffix in ('','-horizontal'):
        xml=ET.fromstring(exports[model['id'].lower().replace('_','-')+suffix+'.bpmn'])
        edges=xml.findall('.//{'+h.B+'}sequenceFlow')
        assert [(e.get('sourceRef'),e.get('targetRef'),e.get('name','')) for e in edges]==[(model['id']+'_'+e['source'],model['id']+'_'+e['target'],e['label']) for e in model['edges']]
        paths_xml=[]
        for edge in xml.findall('.//{'+h.D+'}BPMNEdge'):
            pts=[(float(w.get('x')),float(w.get('y'))) for w in edge.findall('{'+h.I+'}waypoint')];assert all(a!=b and (a[0]==b[0] or a[1]==b[1]) for a,b in zip(pts,pts[1:]))
            for j,other in enumerate(paths_xml):
                assert not any(flows_overlap(a,b,c,d) for a,b in segments(pts) for c,d in segments(other)),(model['id'],suffix,'shared segment',j)
            paths_xml.append(pts)
        shape_boxes={s.get('bpmnElement'):tuple(float(s.find('{'+h.C+'}Bounds').get(k)) for k in ('x','y','width','height')) for s in xml.findall('.//{'+h.D+'}BPMNShape')}
        for e,pts in zip(model['edges'],paths_xml):
            for n in model['nodes']:
                if n['id'] in (e['source'],e['target']):continue
                assert not any(hit(a,b,shape_boxes[model['id']+'_'+n['id']]) for a,b in segments(pts)),(model['id'],suffix,'crossed node',n['id'])
assert not failures,failures
print('8 BPMN models in both layouts: orthogonal flows, no node crossings or collinear shared flows, all semantic edges/conditions preserved.')
