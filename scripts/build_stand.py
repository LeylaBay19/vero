"""One self-contained stand: current cabinet, historic comparisons, seven diagrams."""
from pathlib import Path
import html,re

ROOT=Path(__file__).resolve().parents[1]

def build_document(wrapper,comparison,schemes):
    from prepare_site import inner,csp
    policy=csp(inner)[0]
    schemes=(ROOT/'src/schemes-empty.html').read_text(encoding='utf-8')
    fill_bridge="""<script>addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='vero:fill')return;const button=document.getElementById('fill')||document.getElementById('ap-demo');button?.click();});</script>"""
    # The standalone current prototype retains its own two-option navigation.
    # In the combined stand the parent is the single source of variant selection.
    current_bridge="""<style>.registration-variants{display:none!important}</style><script>addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='vero:select-registration'||!['1','2'].includes(e.data.variant))return;const b=document.querySelector('[data-registration-variant="'+e.data.variant+'"]');if(b&&b.getAttribute('aria-pressed')!=='true')b.click();document.documentElement.dataset.activeRegistration=e.data.variant;});</script>"""
    authored=re.search(r'data-srcdoc="([\s\S]*?)"',wrapper)
    assert authored
    content=html.unescape(authored.group(1)).replace('Вариант 2','Вариант 1').replace('</body>',current_bridge+fill_bridge+'</body>',1)
    wrapper=wrapper[:authored.start(1)]+html.escape(content,quote=True)+wrapper[authored.end(1):]
    def subset(page,keep,initial):
        pattern=r'<button\b[^>]*\bdata-flow="([^"]+)"[^>]*>[\s\S]*?</button>'
        assert len(re.findall(pattern,page))==5
        page=re.sub(pattern,lambda m:m.group(0) if m.group(1) in keep else '',page)
        return page.replace("flow:location.hash==='#variant2'?'proposal2':'proposal'","flow:'"+initial+"'",1)
    proposal_source=subset(comparison,{'proposal','proposal2'},'proposal').replace('Предлагаемый вариант 2','Вариант 3').replace('Предлагаемый вариант','Вариант 2')
    proposal_source=proposal_source.replace("querySelector('#ap-screen-count').textContent='Вариант 2'","querySelector('#ap-screen-count').textContent='Вариант 3'").replace('Проект решения · вариант 2','Проект решения · вариант 3').replace('Флоу 04 · проект решения','Вариант 2 · проект решения').replace("textContent='04'","textContent='02'").replace("textContent='05'","textContent='03'")
    comparison=subset(comparison,{'mos','ep','orb'},'mos')

    legacy_style='''<style>html,body{height:100%;min-height:0;overflow:auto}body{margin:0;padding:16px;background:#fafafa;font:14px Arial,sans-serif}#auth-flow-prototype{font-family:Arial,sans-serif;--ap-button:#2563eb;--ap-line:#d8dde5;--ap-ink:#20242c}#auth-flow-prototype *{box-shadow:none!important}#auth-flow-prototype button,#auth-flow-prototype input,#auth-flow-prototype select{border-radius:4px!important}#auth-flow-prototype h1{font-size:24px}#auth-flow-prototype .ap-scenarios{display:flex;flex-wrap:wrap;gap:6px}#auth-flow-prototype .ap-scenarios button{flex:1;min-width:130px;padding:9px!important}#auth-flow-prototype .ap-scenarios button strong{font-size:13px}</style>'''
    bridge='''<script>document.addEventListener('click',e=>{const b=e.target.closest('button[type="submit"]');if(b?.form){e.preventDefault();b.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}},true);document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.target.matches('input:not([type="checkbox"]):not([type="radio"])')&&e.target.form){e.preventDefault();e.target.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}},true);</script>'''
    navigation_bridge='''<script>document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const href=a.getAttribute('href');if(a.hasAttribute('download')){e.preventDefault();parent.postMessage({type:'vero:download',name:a.getAttribute('download')},'*');}else if(['schemes-v2.html','schemes.html','schemes-all.html','index.html'].includes(href)){e.preventDefault();parent.postMessage({type:'vero:navigate',view:href==='index.html'?'current':'schemes'},'*');}},true);</script>'''
    comparison=comparison.replace('</head>',policy+legacy_style+'</head>',1).replace('</body>',bridge+navigation_bridge+fill_bridge+'</body>',1)
    schemes=schemes.replace('</head>',policy+'<style>body{margin:0;padding:20px;font-family:Arial,sans-serif}header{margin-bottom:20px}</style></head>',1).replace('</body>',navigation_bridge+'</body>',1)
    proposal_bridge="""<script>addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='vero:select-proposal'||!['proposal','proposal2'].includes(e.data.flow))return;const b=document.querySelector('[data-flow="'+e.data.flow+'"]');if(b&&b.getAttribute('aria-pressed')!=='true')b.click();document.documentElement.dataset.activeProposal=e.data.flow;});</script>"""
    proposals=proposal_source.replace('</head>',policy+legacy_style+'<style>.ap-scenarios{display:none!important}</style></head>',1).replace('</body>',bridge+navigation_bridge+proposal_bridge+fill_bridge+'</body>',1)
    frame=re.search(r'<iframe\b[^>]*id="codex-visualization"[\s\S]*?</iframe>',wrapper)
    assert frame
    descriptions=['Email и пароль','Письмо → пароль','Компания и сотрудники','Код → пароль','ЛК и кошелёк по ТЗ']
    def variant_button(n,archived=False):
        return f'<button type="button" data-cabinet-view="{n}"'+(' data-archived="true"' if archived else '')+f' aria-pressed="{str(n==2).lower()}"><span>Вариант {n-1}</span><small>{descriptions[n-1]}</small></button>'
    switcher='<nav class="entry-variants" aria-label="Варианты входа">'+''.join(variant_button(n) for n in [2,5])+'<details class="stand-archive"><summary>Архив (2)</summary><div>'+''.join(variant_button(n,True) for n in [3,4])+'</div></details></nav>'
    proposal_frame=f'<iframe id="stand-frame-proposals" title="Предлагаемые варианты" sandbox="allow-scripts" referrerpolicy="no-referrer" data-stand-srcdoc="{html.escape(proposals,quote=True)}" hidden></iframe>'
    brief=(ROOT/'cabinet-brief.html').read_text(encoding='utf-8').replace('</body>',bridge+fill_bridge+'</body>',1)
    brief_frame=f'<iframe id="stand-frame-brief" title="Вариант 4 — по ТЗ" sandbox="allow-scripts" referrerpolicy="no-referrer" data-stand-srcdoc="{html.escape(brief,quote=True)}" hidden></iframe>'
    panels='<section class="stand-panel" id="stand-current" role="tabpanel" aria-labelledby="stand-tab-current">'+switcher+'<div class="cabinet-stage">'+frame.group(0)+proposal_frame+brief_frame+'</div></section>'
    for name,content,title in [('comparison',comparison,'Сравнение: Тринити и Орбита'),('schemes',schemes,'Семь схем процессов')]:
        panels+=f'<section class="stand-panel" id="stand-{name}" role="tabpanel" aria-labelledby="stand-tab-{name}" hidden><iframe id="stand-frame-{name}" title="{"Схемы" if name=="schemes" else title}" sandbox="allow-scripts" referrerpolicy="no-referrer" data-stand-srcdoc="{html.escape(content,quote=True)}"></iframe></section>'
    downloads=''.join(re.findall(r'<a\b[^>]*\bdownload="[^"]+"[^>]*>[\s\S]*?</a>',schemes))
    header='''<header class="stand-header"><strong>ВЕРО · прототип</strong><nav role="tablist" aria-label="Разделы стенда"><button role="tab" id="stand-tab-current" data-stand-tab="current" aria-controls="stand-current" aria-selected="true">Вход</button><button role="tab" id="stand-tab-comparison" data-stand-tab="comparison" aria-controls="stand-comparison" aria-selected="false">Сравнение регистрации</button><button role="tab" id="stand-tab-schemes" data-stand-tab="schemes" aria-controls="stand-schemes" aria-selected="false">Схемы</button></nav><a class="stand-window" data-stand-window="stand-overview-data" href="cabinet-overview.html" target="_blank" rel="noopener">ЛК · сводка ↗</a><a class="stand-window" data-stand-window="stand-brief-data" href="cabinet-brief.html" target="_blank" rel="noopener">ЛК · по ТЗ ↗</a><details class="stand-downloads" hidden><summary>Скачать BPMN</summary><div>'''+downloads+'</div></details></header>'
    styles='''<style>html,body{height:100%;margin:0;overflow:hidden}body{display:flex;flex-direction:column;height:100dvh;padding:0;background:#fff;font:13px Arial,sans-serif}.stand-header{display:flex;gap:20px;align-items:center;flex:none;padding:10px 16px;border-bottom:1px solid #d8dde5;background:#fff}.stand-header strong{white-space:nowrap;font-size:14px}.stand-header nav{display:flex;gap:6px;flex-wrap:wrap}.stand-header button{font:inherit;border:1px solid #d8dde5;border-radius:4px;background:#fff;padding:8px 12px;cursor:pointer}.stand-header button[aria-selected=true]{color:#fff;background:#2563eb;border-color:#2563eb}.stand-header button:focus-visible{outline:2px solid #2563eb;outline-offset:3px}.stand-panel{display:block;flex:1;min-height:0;overflow:hidden}.stand-panel[hidden],.stand-downloads[hidden]{display:none!important}.stand-panel iframe{display:block;width:100%;max-width:none;height:100%!important;border:0;margin:0}.stand-downloads{position:relative;margin-left:auto}.stand-downloads summary{cursor:pointer;white-space:nowrap}.stand-downloads>div{position:absolute;z-index:10;right:0;top:24px;min-width:240px;max-height:60vh;overflow:auto;background:#fff;border:1px solid #d8dde5;padding:8px}.stand-downloads a{display:block;padding:7px;color:#1d4ed8}@media(max-width:700px){.stand-header{padding:8px 10px;gap:8px;flex-wrap:wrap}.stand-header strong{font-size:12px}.stand-header nav{gap:4px}.stand-header button{font-size:11px;padding:7px 8px}}</style>'''
    script='<script>'+(ROOT/'src/stand-navigation.js').read_text(encoding='utf-8')+'</script>'
    for name,file in [('overview','cabinet-overview.html')]:
        script+=f'<template id="stand-{name}-data">{html.escape((ROOT/file).read_text(encoding="utf-8"))}</template>'
    styles+='<style>#stand-current{display:flex;flex-direction:column}.cabinet-switcher{display:flex;gap:6px;flex:none;flex-wrap:wrap;padding:8px 16px;border-bottom:1px solid #d8dde5}.cabinet-switcher button{font:13px Arial,sans-serif;background:white;border:1px solid #d8dde5;border-radius:4px;padding:8px 10px;cursor:pointer}.cabinet-switcher [aria-pressed=true]{background:#edf4ff;color:#1d4ed8;border-color:#9dbaf1}.cabinet-stage{flex:1;min-height:0;overflow:hidden}.cabinet-stage iframe[hidden]{display:none!important}.stand-window{font-size:12px;color:#1d4ed8;white-space:nowrap}@media(max-width:700px){.cabinet-switcher{padding:6px 10px}.cabinet-switcher button{font-size:11px;padding:7px}}</style>'

    header=re.sub(r'<a\b[^>]*data-stand-window="stand-brief-data"[\s\S]*?</a>','',header)
    header=re.sub(r'<details class="stand-downloads"[\s\S]*?</details>','',header)
    header=header.replace('<a class="stand-window"','<button type="button" id="stand-fill" title="Заполняет только пример данных; согласия отметьте самостоятельно">Заполнить пример</button><a class="stand-window"',1)
    header=header.replace('<button type="button" id="stand-fill"','<nav id="stand-history" aria-label="История тестирования"><button type="button" id="stand-back" title="Вернуться к предыдущему пройденному экрану с сохранёнными данными" disabled>← Назад</button><button type="button" id="stand-forward" title="Повторно открыть следующий пройденный экран" disabled>Вперёд →</button><span id="stand-history-position" aria-live="polite"></span></nav><button type="button" id="stand-fill"',1)
    styles+='<style>.entry-variants button{text-align:left}.entry-variants small{display:block;font-size:11px;margin-top:4px;font-weight:normal}.entry-variants button[aria-pressed=true] small{color:inherit}.stand-header{flex-wrap:wrap;gap:10px}#stand-fill{margin-left:auto;background:#f4f6f8}.stand-header [hidden]{display:none!important}</style>'
    styles+='<style>.stand-archive{position:relative;align-self:stretch;font:13px Arial,sans-serif}.stand-archive summary{cursor:pointer;padding:14px 12px;border:1px solid #d8dde5;border-radius:4px;background:#f4f6f8}.stand-archive.is-selected summary{background:#242b36;color:white}.stand-archive>div{position:absolute;top:100%;left:0;z-index:20;min-width:220px;max-width:calc(100vw - 24px);padding:8px;background:white;border:1px solid #d8dde5}.stand-archive button{display:block;width:100%;margin:4px 0}</style>'
    styles+='<style>@media(max-width:700px){.entry-variants{position:relative}.stand-archive{position:static}.stand-archive>div{left:10px;right:10px;top:100%;min-width:0;max-width:none}}</style>'
    styles+='<style>#stand-history{display:flex;align-items:center;gap:5px}#stand-history button{white-space:nowrap}#stand-history button:disabled{opacity:.4;cursor:default}#stand-history-position{font-size:11px;color:#647084;white-space:nowrap;min-width:26px}#stand-history[hidden]{display:none!important}@media(max-width:700px){#stand-history{flex-wrap:nowrap}}</style>'
    styles=styles.replace('cabinet-switcher','entry-variants').replace('#2563eb','#242b36').replace('background:#edf4ff;color:#1d4ed8;border-color:#9dbaf1','background:#242b36;color:#fff;border-color:#242b36')
    result=wrapper[:frame.start()]+header+panels+wrapper[frame.end():]
    result=result.replace('</head>',styles+'</head>',1).replace('</body>',script+'</body>',1)
    result=re.sub(r'<title>[^<]*</title>','<title>ВЕРО — единый прототип</title>',result,count=1)
    return re.sub(r'(?m)^[ \t]+$','',result)

def main():
    from prepare_site import wrap
    version=(ROOT/'VERSION').read_text(encoding='utf-8').strip()
    result=build_document(wrap((ROOT/'platform-entry-variant2.html').read_text(encoding='utf-8')),(ROOT/'index.html').read_text(encoding='utf-8'),(ROOT/'schemes-all.html').read_text(encoding='utf-8'))
    for target in [ROOT/'prototype.html',ROOT/'web/prototype.html',ROOT/'deliverables'/f'vero-unified-v{version}.html']:
        target.parent.mkdir(parents=True,exist_ok=True);target.write_text(result,encoding='utf-8')
    print('Built unified stand: active 1/4, archive 2/3, testing history, 3 competitors and empty schemes.')

if __name__=='__main__':main()
