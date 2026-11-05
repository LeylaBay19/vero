"""Prepare static Site files in an existing checkout; does not publish or change access."""
from pathlib import Path
import argparse, html, re, shutil

parser=argparse.ArgumentParser()
parser.add_argument('--target',type=Path,required=True,help='Existing Sites checkout with .openai/hosting.json')
args=parser.parse_args()
project=Path(__file__).resolve().parents[1]
site=args.target.resolve()
assert (site/'.openai/hosting.json').is_file(), 'Use the existing Sites project checkout'
shell=(project/'templates/sandbox-shell.html').read_text(encoding='utf-8')
match=re.search(r'data-srcdoc="([\s\S]*?)"',shell)
assert match
inner=html.unescape(match.group(1))
assert '__AUTH_PROTOTYPE_FRAGMENT__' in inner
csp=lambda text:re.findall(r'<meta http-equiv="Content-Security-Policy"[^>]*>',text)
sandbox=lambda text:re.findall(r'<iframe[^>]*?sandbox="[^"]*"',text)

def wrap(page):
    styles=''.join(re.findall(r'<style[^>]*>[\s\S]*?</style>',page))
    body=re.search(r'<body[^>]*>([\s\S]*)</body>',page).group(1)
    if 'data-default-registration="2"' in page:
        body='<script>document.body.dataset.defaultRegistration="2";</script>'+body
    root_style='<style>#auth-flow-prototype{height:100dvh;min-height:0;max-width:none;display:flex;flex-direction:column;overflow:hidden}</style>'
    authored='<div id="auth-flow-prototype">'+styles+root_style+body+'</div>'
    updated=inner.replace('__AUTH_PROTOTYPE_FRAGMENT__',authored)
    updated=re.sub(r'<script\b[^>]*\bsrc="https://unpkg\.com/[^"]*"[^>]*>\s*</script>','',updated)
    result=shell[:match.start(1)]+html.escape(updated,quote=True)+shell[match.end(1):]
    outer_style='<style>html,body{height:100%;overflow:hidden}body{padding:0}iframe{width:100%;max-width:1440px;height:100dvh!important;margin:0 auto}</style>'
    result=result.replace('</head>',outer_style+'</head>',1)
    result=result.replace('<title>auth-registration-four-flows.html</title>','<title>ВЕРО — два варианта регистрации</title>',1)
    result=result.replace('title="auth-registration-four-flows.html"','title="ВЕРО — регистрация и кабинет"',1)
    assert csp(result)==csp(shell) and csp(updated)==csp(inner)
    assert sandbox(result)==sandbox(shell)
    return result

dist=site/'dist'
dist.mkdir(exist_ok=True)
for page in (project/'web').iterdir():
    if page.is_file() and page.name!='index.html':
        shutil.copy2(page,dist/page.name)
shutil.copy2(project/'web/index.html',dist/'comparison.html')
shutil.copy2(project/'schemes-all.html',dist/'processes.html')
(dist/'index.html').write_text(wrap((project/'platform-entry.html').read_text(encoding='utf-8')),encoding='utf-8')
(dist/'registration-2.html').write_text(wrap((project/'platform-entry-variant2.html').read_text(encoding='utf-8')),encoding='utf-8')
print('Prepared screen-sized Site with internal scrolling, unchanged sandbox/CSP, registration variants, comparisons and 7 BPMN.')
