"""Offline validation against official OMG BPMN 2.0 schemas and graph invariants."""
from pathlib import Path
from collections import Counter
from lxml import etree as E
ROOT=Path(__file__).resolve().parents[1]
NS={'b':'http://www.omg.org/spec/BPMN/20100524/MODEL','bd':'http://www.omg.org/spec/BPMN/20100524/DI'}
schema=E.XMLSchema(E.parse(str(ROOT/'tests/schemas/bpmn/BPMN20.xsd')))
paths=sorted((ROOT/'diagrams').glob('*.bpmn'))
assert len(paths)==7
for path in paths:
 tree=E.parse(str(path));schema.assertValid(tree)
 proc=tree.find('b:process',NS)
 flows=proc.findall('b:sequenceFlow',NS)
 nodes={n.get('id'):n for n in proc if E.QName(n).localname not in ['documentation','laneSet','sequenceFlow']}
 ids=[n.get('id') for n in tree.iter() if n.get('id')];assert len(ids)==len(set(ids)),path.name
 members=Counter(ref.text for ref in proc.findall('.//b:flowNodeRef',NS))
 assert set(members)==set(nodes) and all(v==1 for v in members.values()),path.name
 edges={(f.get('sourceRef'),f.get('targetRef')) for f in flows}
 for source,target in edges:assert source in nodes and target in nodes
 starts={i for i,n in nodes.items() if E.QName(n).localname=='startEvent'}
 ends={i for i,n in nodes.items() if E.QName(n).localname=='endEvent'}
 def closure(seed,edges):
  found=set(seed)
  while True:
   new=found|{t for s,t in edges if s in found}
   if new==found:return found
   found=new
 assert closure(starts,edges)==set(nodes),(path.name,'unreachable node')
 assert closure(ends,{(t,s) for s,t in edges})==set(nodes),(path.name,'no path to end')
 for i,n in nodes.items():
  incoming=[f.get('id') for f in flows if f.get('targetRef')==i]
  outgoing=[f.get('id') for f in flows if f.get('sourceRef')==i]
  assert set(incoming)=={x.text for x in n.findall('b:incoming',NS)}
  assert set(outgoing)=={x.text for x in n.findall('b:outgoing',NS)}
  kind=E.QName(n).localname
  if kind.endswith('Task') or kind=='task':assert len(outgoing)==1,(path.name,i,'implicit split')
  if kind=='startEvent':assert not incoming and len(outgoing)==1
  if kind=='endEvent':assert incoming and not outgoing
 for f in flows:
  edge=tree.find(f'.//bd:BPMNEdge[@bpmnElement="{f.get("id")}"]',NS);assert edge is not None
  if f.get('name'):assert edge.find('bd:BPMNLabel',NS) is not None,(path.name,f.get('id'),'missing branch label')
 print(path.name+': XSD, references, lanes, paths to completion and branch labels OK')
print('Validated all 7 BPMN documents. Non-executable process models; editor import is not tested.')
