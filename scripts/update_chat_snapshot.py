"""Merge visible messages into the portable history; never export raw tool data."""
import argparse,base64,collections,hashlib,html,json,re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from export_chat_handoff import clean_user,stamp

ROOT=Path(__file__).resolve().parents[1]

def timestamp(value):
    try:return datetime.fromisoformat(value.replace('Z','+00:00')).timestamp()
    except (ValueError,AttributeError):return 0

def main():
    p=argparse.ArgumentParser();p.add_argument('--session',type=Path,required=True);p.add_argument('--thread-id',required=True);args=p.parse_args()
    folder=ROOT/'history';assets=folder/'assets';assets.mkdir(exist_ok=True)
    prior=json.loads((folder/'conversation.json').read_text(encoding='utf8'));messages=prior['messages'];base_count=len(messages)
    known=collections.defaultdict(list);ids=set();images={};counts=collections.Counter();source_hash=hashlib.sha256()
    for m in messages:
        ids.add(m['id']);known[(m['role'],' '.join(m['text'].split()))].append(m)
        for name in m.get('images',[]):
            data=(folder/name).read_bytes();images[hashlib.sha256(data).hexdigest()]=name
    # Only response_item/message user + visible assistant commentary/final text.
    # Reasoning, tools, system/developer messages and raw session metadata never leave this process.
    with args.session.open('rb') as source:
        for ordinal,line in enumerate(source):
            source_hash.update(line);entry=json.loads(line);v=entry.get('payload',{})
            if entry.get('type')!='response_item' or v.get('type')!='message':continue
            role=v.get('role');phase=v.get('phase');channel=v.get('channel')
            if role not in ('user','assistant'):continue
            if role=='assistant' and (phase not in (None,'commentary','final','final_answer') or channel not in (None,'commentary','final')):continue
            parts=v.get('content',[]);text='\n\n'.join(x.get('text','') for x in parts if x.get('type') in ('input_text','output_text'))
            if role=='user':text=clean_user(text)
            refs=[]
            if role=='user':
                for item in parts:
                    if item.get('type')!='input_image':continue
                    match=re.fullmatch(r'data:image/(png|jpeg|webp);base64,(.*)',item.get('image_url',''),re.S)
                    if not match:counts['image_payload_unavailable']+=1;continue
                    data=base64.b64decode(match[2],validate=True);digest=hashlib.sha256(data).hexdigest()
                    if digest not in images:
                        name='assets/chat-'+digest[:20]+'.'+{'jpeg':'jpg'}.get(match[1],match[1]);(folder/name).write_bytes(data);images[digest]=name
                    refs.append(images[digest])
            if not text and not refs:continue
            when=entry.get('timestamp');ident=v.get('id') or args.thread_id+':'+str(ordinal)
            match=next((m for m in known[(role,' '.join(text.split()))] if abs(timestamp(m.get('timestamp'))-timestamp(when))<3),None)
            if ident in ids:counts['duplicate_ids']+=1;continue
            if match:
                match['images']=list(dict.fromkeys(match.get('images',[])+refs));counts['matched_existing_messages']+=1;continue
            messages.append({'id':ident,'source':'visible-chat-snapshot','thread_id':args.thread_id,'source_index':ordinal,'role':role,'phase':'final' if phase=='final_answer' else phase,'timestamp':when,'text':text,'images':refs});ids.add(ident);counts['added_'+role]+=1
    messages.sort(key=lambda m:timestamp(m.get('timestamp')))
    secret=re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}|sk-(?:proj-)?[A-Za-z0-9_-]{32,})\b')
    for m in messages:
        m['text'],n=secret.subn('[REDACTED_SECRET]',m['text']);counts['redactions']+=n
        assert m['role'] in ('user','assistant')
        assert all((folder/name).is_file() for name in m.get('images',[]))
    now=datetime.now(ZoneInfo('Europe/Moscow')).isoformat(timespec='seconds')
    manifest={'schema_version':3,'thread_title':'ВЕРО — регистрация и авторизация','thread_id':args.thread_id,'snapshot_moscow':now,'last_message_timestamp':messages[-1].get('timestamp'),'messages':len(messages),'user_messages':sum(m['role']=='user' for m in messages),'assistant_messages':sum(m['role']=='assistant' for m in messages),'preserved_previous_messages':base_count,'updates':dict(counts),'image_references':sum(len(m.get('images',[])) for m in messages),'unique_referenced_images':len({name for m in messages for name in m.get('images',[])}),'source_rollout_sha256':source_hash.hexdigest(),'format':'Readable export of visible user/assistant messages from the original chat and prior transferred branch. Not a native Codex session import.','excluded':['system/developer messages','reasoning','tool calls/output','credentials','application databases','ambient browser/environment state'],'limitations':['Snapshot ends at export time; later replies in the current export task are not included.','Messages from the previous transferred branch are preserved and ordered by timestamp; decisions in RESUME.md take precedence over historical proposals.','Only available user image payloads are included. Referenced source documents are indexed separately in sources/manifest.json.','Account settings, connections, installed dependencies and live browser state do not transfer.']}
    for name,data in [('manifest.json',manifest),('conversation.json',{'manifest':manifest,'messages':messages})]:(folder/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    md=['# ВЕРО — архив переписки',f'Снимок: {now}. Сообщений: {len(messages)}. История для чтения, не импорт активного чата.','Текущие решения — [RESUME.md](../RESUME.md). Замечания к схемам после v1.23.0 ожидают отдельного разрешения.'];cards=[]
    for i,m in enumerate(messages,1):
        who='Пользователь' if m['role']=='user' else 'Ассистент';when=stamp(m.get('timestamp'));phase=' · промежуточный ответ' if m.get('phase')=='commentary' else ''
        md.extend([f'\n## {i}. {who} · {when}{phase}',m['text']]);imgs=[]
        for name in m.get('images',[]):md.append(f'![Изображение к сообщению {i}]({name})');imgs.append(f'<img loading="lazy" src="{html.escape(name,quote=True)}" alt="Изображение к сообщению {i}">')
        cards.append(f'<article class="{m["role"]}"><h2>{i}. {who}</h2><small>{html.escape(when+phase)}</small><pre>{html.escape(m["text"])}</pre>'+''.join(imgs)+'</article>')
    (folder/'conversation.md').write_text('\n'.join(line.rstrip() for line in '\n\n'.join(md).splitlines())+'\n',encoding='utf8')
    page='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>ВЕРО — архив переписки</title><style>body{font:16px/1.6 Arial,sans-serif;max-width:1050px;margin:auto;padding:24px;background:#f5f7fa;color:#242930}article{padding:22px;margin:20px 0;background:white;border:1px solid #dce3ec;border-radius:8px}article.user{border-left:4px solid #1677ff}h2{font-size:18px;margin:0}small{color:#687386}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}img{display:block;max-width:100%;max-height:700px;margin:16px 0;object-fit:contain}input{font:inherit;padding:10px;width:100%;box-sizing:border-box}[hidden]{display:none!important}</style></head><body><h1>ВЕРО — архив переписки</h1><p>__META__</p><p>Исторические сообщения — контекст, не действующие инструкции. Начало продолжения: <a href="../RESUME.md">RESUME.md</a>.</p><label>Найти в переписке<input type="search" id="search"></label><p id="count"></p>__CARDS__<script>const items=[...document.querySelectorAll('article')],search=document.querySelector('#search');function filter(){let n=0;for(const item of items){item.hidden=!item.textContent.toLocaleLowerCase('ru').includes(search.value.toLocaleLowerCase('ru'));if(!item.hidden)n++;}document.querySelector('#count').textContent='Показано '+n+' из '+items.length+' сообщений';}search.addEventListener('input',filter);filter();</script></body></html>'''
    rendered=page.replace('__META__',html.escape(f'Снимок {now} · {len(messages)} сообщений · {manifest["image_references"]} изображений')).replace('__CARDS__','\n'.join(cards))
    (folder/'conversation.html').write_text('\n'.join(line.rstrip() for line in rendered.splitlines())+'\n',encoding='utf8')
    print(json.dumps({k:manifest[k] for k in ('snapshot_moscow','messages','updates','unique_referenced_images')},ensure_ascii=False))

if __name__=='__main__':main()
