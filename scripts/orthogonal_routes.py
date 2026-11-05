"""Small deterministic orthogonal router: fewest bends before path length.

Shapes, captions and already used collinear flow segments are obstacles.
Perpendicular crossings are allowed and rendered with a white gap by the viewer.
"""

DIRECTIONS={'left':(-1,0),'right':(1,0),'top':(0,-1),'bottom':(0,1)}

def segments(points):return list(zip(points,points[1:]))

def hits(a,b,box):
    x,y,w,h=box
    if a[0]==b[0]:return x<a[0]<x+w and min(a[1],b[1])<y+h and max(a[1],b[1])>y
    return y<a[1]<y+h and min(a[0],b[0])<x+w and max(a[0],b[0])>x

def overlap(a,b,c,d):
    if a[0]==b[0]==c[0]==d[0]:return min(max(a[1],b[1]),max(c[1],d[1]))>max(min(a[1],b[1]),min(c[1],d[1]))
    if a[1]==b[1]==c[1]==d[1]:return min(max(a[0],b[0]),max(c[0],d[0]))>max(min(a[0],b[0]),min(c[0],d[0]))
    return False

def simplify(points):
    out=[]
    for p in points:
        if out and p==out[-1]:continue
        if len(out)>1:
            a,b=out[-2:]
            if a[0]==b[0]==p[0] or a[1]==b[1]==p[1]:
                if (b[0]-a[0])*(p[0]-b[0])+(b[1]-a[1])*(p[1]-b[1])<0:return None
                out.pop()
        out.append(p)
    return out

def rect_overlap(a,b):return min(a[0]+a[2],b[0]+b[2])>max(a[0],b[0]) and min(a[1]+a[3],b[1]+b[3])>max(a[1],b[1])

def route(nodes,edges,anchor,obstacles,bounds,label_obstacles=()):
    byid={n['id']:n for n in nodes};used=[];ports={n['id']:set() for n in nodes};labels=[];result={}
    left,top,right,bottom=bounds;reserved={};required_out={};required_in={}
    for i,e in enumerate(edges):
        a,b=byid[e['source']],byid[e['target']]
        side=None
        if a['kind']=='gateway' and e['label']=='Нет' and a['y']!=b['y']:side='top' if b['y']<a['y'] else 'bottom'
        elif b['row']<a['row']:side='left' if b['x']<a['x'] else 'right'
        if side:reserved[(a['id'],side)]=i;required_out[i]=side
    for i,e in enumerate(edges):
        a,b=byid[e['source']],byid[e['target']]
        if b['row']>=a['row']:continue
        preferred='top' if a['y']<b['y'] else 'bottom' if a['y']>b['y'] else 'right' if a['x']>b['x'] else 'left'
        for side in dict.fromkeys([preferred,'right','bottom','left','top']):
            if (b['id'],side) not in reserved:
                reserved[(b['id'],side)]=i;required_in[i]=side;break
    xs=sorted({left+12,right-12,*[v for x,y,w,h in obstacles for v in (x-22,x+w+22)]})
    ys=sorted({top+12,bottom-12,*[v for x,y,w,h in obstacles for v in (y-22,y+h+22)]})
    def label_position(pts,value):
        if not value:return (0,0),None
        width=max(44,len(value)*7.4+16);choices=[]
        for index,(a,b) in enumerate(segments(pts)):
            length=abs(b[0]-a[0])+abs(b[1]-a[1])
            for fraction in (.5,.3,.7):
                x=a[0]+(b[0]-a[0])*fraction;y=a[1]+(b[1]-a[1])*fraction
                box=(x-width/2,y-15,width,28)
                if x-width/2<left or x+width/2>right or y-15<top or y+13>bottom:continue
                if any(rect_overlap(box,o) for o in obstacles+list(label_obstacles)+labels):continue
                choices.append(((0 if a[1]==b[1] and length>width+10 else 1,index,-length),((x,y),box)))
        return min(choices,key=lambda x:x[0])[1] if choices else (None,None)
    # Preserve easy direct connections before routing alternatives and retries.
    def priority(i):
        e=edges[i];a,b=byid[e['source']],byid[e['target']]
        return (b['row']<a['row'],a['y']!=b['y'],i)
    for i in sorted(range(len(edges)),key=priority):
        edge=edges[i];a,b=byid[edge['source']],byid[edge['target']];best=None
        for source_side,source_dir in DIRECTIONS.items():
            if source_side in ports[a['id']] or reserved.get((a['id'],source_side),i)!=i:continue
            if i in required_out and source_side!=required_out[i]:continue
            for target_side,target_dir in DIRECTIONS.items():
                if target_side in ports[b['id']] or reserved.get((b['id'],target_side),i)!=i:continue
                if i in required_in and target_side!=required_in[i]:continue
                p,q=anchor(a,source_side),anchor(b,target_side)
                sp=(p[0]+source_dir[0]*18,p[1]+source_dir[1]*18);sq=(q[0]+target_dir[0]*18,q[1]+target_dir[1]*18)
                candidates=[[p,sp,sq,q],[p,sp,(sq[0],sp[1]),sq,q],[p,sp,(sp[0],sq[1]),sq,q]]
                candidates.extend([p,sp,(x,sp[1]),(x,sq[1]),sq,q] for x in xs)
                candidates.extend([p,sp,(sp[0],y),(sq[0],y),sq,q] for y in ys)
                for raw in candidates:
                    pts=simplify(raw)
                    if not pts or len(pts)<2:continue
                    segs=segments(pts)
                    if any(c[0]!=d[0] and c[1]!=d[1] for c,d in segs):continue
                    bends=len(pts)-2;length=sum(abs(c[0]-d[0])+abs(c[1]-d[1]) for c,d in segs)
                    if best and (bends,length)>best[0][:2]:continue
                    if any(not(left<=x<=right and top<=y<=bottom) for x,y in pts):continue
                    if any(hits(c,d,o) for c,d in segs for o in obstacles):continue
                    if any(overlap(c,d,v,w) for c,d in segs for v,w in used):continue
                    pos,box=label_position(pts,edge['label'])
                    if pos is None:continue
                    score=(bends,length,tuple(pts))
                    if best is None or score<best[0]:best=(score,pts,pos,box,source_side,target_side)
        if best is None:raise ValueError(f'No clear orthogonal route: {edge}')
        _,pts,pos,box,s,t=best;ports[a['id']].add(s);ports[b['id']].add(t);used.extend(segments(pts))
        if box:labels.append(box)
        result[i]=(pts,pos)
    return result
