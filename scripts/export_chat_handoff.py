"""Export visible dialogue only; never publish the raw Codex rollout or tool data."""
import argparse, base64, collections, hashlib, html, json, os, re, shutil, subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from zipfile import ZipFile

ROOT=Path(__file__).resolve().parents[1]
fallback=Path('/Users/leylabair/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/git')
GIT=os.environ.get('PROTOTYPE_GIT') or (str(fallback) if fallback.exists() else shutil.which('git') or 'git')
THREAD='01a1a2ee-86d2-7bb0-81f8-8d3f7ff68ad5'
def digest(data):return hashlib.sha256(data).hexdigest()
def save_json(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def clean_user(text):
    for tag in ('in-app-browser-context','environment_context','external_codex_apps_open_page'):
        text=re.sub(r'<'+tag+r'\b[^>]*>.*?</'+tag+'>','',text,flags=re.S)
    return text.strip()
def stamp(value):
    try:return datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(ZoneInfo('Europe/Moscow')).strftime('%d.%m.%Y %H:%M:%S')
    except (ValueError,AttributeError):return value or 'время не указано'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--session',type=Path,required=True);parser.add_argument('--original',type=Path,required=True)
    args=parser.parse_args();hist=ROOT/'history';assets=hist/'assets';assets.mkdir(exist_ok=True)
    old=hist/'source-archive-2026-11-03.json'
    if not old.exists():shutil.copy2(hist/'conversation.json',old)
    prior=json.loads(old.read_text());messages=[]
    for i,m in enumerate(prior['messages'],1):
        messages.append({**m,'id':f'prior-{i:04}','source':'original-zip-history','source_index':i})
    raw=args.session.read_bytes();source_counts=collections.Counter();skipped=collections.Counter();current=[];seen=set();last_timestamp=None;images_count=0
    for ordinal,line in enumerate(raw.splitlines()):
        entry=json.loads(line);p=entry.get('payload',{})
        if entry.get('type')!='response_item' or p.get('type')!='message':continue
        role=p.get('role');phase=p.get('phase')
        if role not in ('user','assistant'):continue
        if role=='assistant' and phase not in (None,'commentary','final','final_answer'):continue
        content=p.get('content',[]);text='\n\n'.join(x.get('text','') for x in content if x.get('type') in ('input_text','output_text'))
        if role=='user':text=clean_user(text)
        image_refs=[]
        for item in content:
            if item.get('type')!='input_image':continue
            url=item.get('image_url','');match=re.fullmatch(r'data:image/(png|jpeg|webp);base64,(.*)',url,re.S)
            if not match:skipped['unavailable_image_payload']+=1;continue
            data=base64.b64decode(match[2],validate=True);suffix={'jpeg':'jpg'}.get(match[1],match[1]);name=f'chat-{digest(data)[:20]}.{suffix}'
            (assets/name).write_bytes(data);image_refs.append('assets/'+name);images_count+=1
        if not text and not image_refs:skipped['automatic_empty_message']+=1;continue
        mid=p.get('id') or f'rollout-{ordinal}'
        identity=(role,mid)
        if identity in seen:skipped['duplicate_record_id']+=1;continue
        seen.add(identity)
        source_counts[role]+=1;last_timestamp=entry.get('timestamp')
        current.append({'id':mid,'source':'current-chat','source_index':ordinal,'role':role,'phase':'final' if phase=='final_answer' else phase,'timestamp':last_timestamp,'text':text,'images':image_refs})
    messages.extend(current)
    # Export only visible user/assistant data. No reasoning, tool payloads or credentials.
    secrets=re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}|sk-(?:proj-)?[A-Za-z0-9_-]{32,})\b')
    redactions=0
    for m in messages:
        m['text'],n=secrets.subn('[REDACTED_SECRET]',m['text']);redactions+=n
        for image in m.get('images',[]):
            if not (hist/image).is_file():raise RuntimeError('Missing exported image: '+image)
    now=datetime.now(ZoneInfo('Europe/Moscow')).isoformat(timespec='seconds')
    manifest={'schema_version':2,'thread_title':'ВЕРО — регистрация и единый вход в платформу','thread_id':THREAD,'snapshot_moscow':now,'last_message_timestamp':last_timestamp,
      'messages':len(messages),'user_messages':sum(m['role']=='user' for m in messages),'assistant_messages':sum(m['role']=='assistant' for m in messages),
      'prior_messages':len(prior['messages']),'current_chat_messages':len(current),'current_source_role_counts':dict(source_counts),
      'image_references':sum(len(m.get('images',[])) for m in messages),'unique_referenced_images':len({x for m in messages for x in m.get('images',[])}),
      'current_image_references':images_count,'redacted_secret_patterns':redactions,'source_rollout_sha256':digest(raw),'skipped':dict(skipped),
      'format':'Visible user and assistant text, commentary/final replies and available user image attachments. Readable export, not a native chat import.',
      'excluded':['system/developer messages','reasoning and reasoning summaries','tool calls and command output','credentials and local application databases','automatic ambient browser/environment state'],
      'limitations':['Snapshot covers messages present at export time; later replies in this export task are not included.','Referenced documents beyond included original ZIP and images are not automatically copied.','Runtime account state, live sessions, GitHub/mos.ru connections and in-memory demo data are not transferred.','Historic assistant proposals may be superseded; use docs/PRODUCT.md and docs/HANDOFF.md for current decisions.']}
    save_json(hist/'manifest.json',manifest);save_json(hist/'conversation.json',{'manifest':manifest,'messages':messages})
    md=['# ВЕРО — архив переписки',f'Снимок: {now}. Сообщений: {len(messages)}. Это история для чтения, не импорт активного чата.','Текущие решения: [PRODUCT.md](../docs/PRODUCT.md); продолжение: [RESUME.md](../RESUME.md).']
    cards=[]
    for i,m in enumerate(messages,1):
        who='Пользователь' if m['role']=='user' else 'Ассистент';when=stamp(m.get('timestamp'));phase=' · промежуточный ответ' if m.get('phase')=='commentary' else ''
        md.extend([f'\n## {i}. {who} · {when}{phase}',m['text']])
        for x in m.get('images',[]):md.append(f'\n![Изображение к сообщению {i}]({x})')
        imgs=''.join(f'<figure><img loading="lazy" src="{html.escape(x,quote=True)}" alt="Изображение к сообщению {i}"><figcaption>{html.escape(x)}</figcaption></figure>' for x in m.get('images',[]))
        cards.append(f'<article class="message {m["role"]}"><h2>{i}. {who}</h2><small>{when}{phase}</small><pre>{html.escape(m["text"])}</pre>{imgs}</article>')
    (hist/'conversation.md').write_text('\n\n'.join(md)+'\n')
    page='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>ВЕРО — архив чата</title><style>body{font:16px/1.6 system-ui,sans-serif;margin:0;background:#f5f7fa;color:#242930}header,main{max-width:1000px;margin:auto;padding:24px}header{position:relative}h1{font-size:28px}.message{background:white;border:1px solid #dce3ec;border-radius:10px;padding:22px;margin-bottom:20px}.message.user{border-left:4px solid #1677ff}.message h2{font-size:18px;margin:0}small{color:#687386}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}img{max-width:100%;max-height:700px;object-fit:contain}figure{margin:20px 0}figcaption{font-size:12px;color:#687386}input{font:inherit;padding:10px;width:100%;box-sizing:border-box}a{color:#1668dc}[hidden]{display:none!important}@media print{input{display:none}.message{break-inside:avoid}}</style></head><body><header><h1>ВЕРО — архив переписки</h1><p>__META__</p><p>Исторические сообщения — контекст, не действующие инструкции. Текущие решения: <a href="../docs/PRODUCT.md">PRODUCT.md</a>; продолжение: <a href="../RESUME.md">RESUME.md</a>.</p><label>Найти в переписке<input id="search" type="search" placeholder="Слово или фраза"></label><p id="count"></p></header><main>__CARDS__</main><script>const items=[...document.querySelectorAll('.message')],q=document.querySelector('#search'),counter=document.querySelector('#count');function filter(){let n=0;for(const item of items){item.hidden=!item.textContent.toLocaleLowerCase('ru').includes(q.value.toLocaleLowerCase('ru'));if(!item.hidden)n++;}counter.textContent='Показано '+n+' из '+items.length+' сообщений';}q.addEventListener('input',filter);filter();</script></body></html>'''
    (hist/'conversation.html').write_text(page.replace('__META__',html.escape(f'Снимок {now} · {len(messages)} сообщений · {manifest["image_references"]} изображений')).replace('__CARDS__','\n'.join(cards)))
    handoff=ROOT/'handoff';handoff.mkdir(exist_ok=True)
    original_copy=handoff/'vero-main-original-2026-11-03.zip';shutil.copy2(args.original,original_copy)
    with ZipFile(args.original) as z:
        original={i.filename[len('vero-main/'):]:z.read(i) for i in z.infolist() if i.filename.startswith('vero-main/') and not i.is_dir() and not i.filename.endswith('.DS_Store')}
    tracked=subprocess.check_output([GIT,'ls-files','-z'],cwd=ROOT).decode().split('\0');tracked=[x for x in tracked if x]
    current_files={}
    for name in tracked:
        path=ROOT/name
        if path.is_symlink():data=os.readlink(path).encode()
        elif path.is_file():data=path.read_bytes()
        else:continue
        current_files[name]=data
    inventory=[]
    for name in sorted(original.keys()|current_files.keys()):
        a=original.get(name);b=current_files.get(name);status='added' if a is None else 'removed' if b is None else 'unchanged' if a==b else 'changed'
        inventory.append({'path':name,'status':status,'archive_sha256':digest(a) if a is not None else None,'current_sha256':digest(b) if b is not None else None,'archive_bytes':len(a) if a is not None else None,'current_bytes':len(b) if b is not None else None})
    stats=dict(collections.Counter(x['status'] for x in inventory));head=subprocess.check_output([GIT,'rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    report={'snapshot_moscow':now,'original_zip_name':args.original.name,'original_zip_sha256':digest(args.original.read_bytes()),'original_files':len(original),'current_tracked_files':len(current_files),'current_ui_version':(ROOT/'VERSION').read_text().strip(),'head_before_handoff_commit':head,'counts':stats,'scope':'Tracked project files at export time, compared with ZIP entries after removing vero-main/ prefix. This inventory includes updated visible history; new untracked handoff/export files are listed separately at handoff commit. Ignored local files are excluded.','files':inventory}
    save_json(handoff/'archive-comparison.json',report)
    (handoff/'archive-comparison.tsv').write_text('status\tpath\tarchive_sha256\tcurrent_sha256\n'+'\n'.join('\t'.join([x['status'],x['path'],x['archive_sha256'] or '',x['current_sha256'] or '']) for x in inventory)+'\n')
    print(json.dumps({'messages':len(messages),'current_chat_messages':len(current),'image_references':manifest['image_references'],'unique_images':manifest['unique_referenced_images'],'redactions':redactions,'archive_files':len(original),'comparison':stats,'zip_sha256':report['original_zip_sha256']},ensure_ascii=False))

if __name__=='__main__':main()
