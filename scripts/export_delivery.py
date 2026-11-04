"""Two standalone HTML files and a portable ZIP containing all editable BPMNs."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import re
ROOT=Path(__file__).resolve().parents[1]
version=(ROOT/'VERSION').read_text().strip()
out=ROOT/'deliverables';out.mkdir(exist_ok=True)
prototype_name=f'vero-prototype-v{version}.html'
bpmn_name=f'vero-bpmn-v{version}.html'
first=(ROOT/'schemes.html').read_text();second=(ROOT/'schemes-v2.html').read_text()
def panels(text):
 a=text.index('<section class="process"');b=text.rindex('</section>')+len('</section>')
 return a,b,text[a:b]
a,b,old=panels(first);_,_,new=panels(second)
all_html=first[:a]+'<h2 id="variant1">Предлагаемый вариант 1</h2>'+old+'<h2 id="variant2">Предлагаемый вариант 2</h2>'+new+first[b:]
all_html=re.sub(r'<header>.*?</header>',f'<header><span class="eyebrow">ВЕРО · v{version}</span><h1>BPMN: предлагаемые варианты 1 и 2</h1><p>Семь процессов. Схемы увеличиваются; каждый исходник BPMN можно скачать. Все схемы и файлы встроены — интернет не нужен.</p><nav><a href="{prototype_name}">Открыть прототип</a><a href="#variant1">Вариант 1</a><a href="#variant2">Вариант 2</a></nav></header>',all_html,flags=re.S)
all_html=re.sub(r'<footer>.*?</footer>','<footer><p>Проектируемые процессы. Реальные вход, доставка писем, реестры, УКЭП и МЧД в прототипе имитируются. Юридическая достаточность и технические условия интеграции требуют отдельного подтверждения.</p><p>XML проверены по официальной схеме OMG BPMN 2.0. Проверка импорта в конкретный BPMN-редактор не выполнялась.</p></footer>',all_html,flags=re.S)
all_html=all_html.replace('<title>Предлагаемый вариант — схемы регистрации</title>','<title>ВЕРО — все BPMN</title>')
(out/bpmn_name).write_text(all_html)
(ROOT/'schemes-all.html').write_text(all_html.replace(prototype_name,'index.html'))
(ROOT/'web/schemes-all.html').write_text(all_html.replace(prototype_name,'index.html'))
prototype=(ROOT/'index.html').read_text().replace('href="schemes-v2.html"',f'href="{bpmn_name}#variant2"')
prototype=prototype.replace("flow:location.hash==='#variant2'?'proposal2':'proposal'", "flow:'proposal2'")
prototype=prototype.replace('<body>',f'<body><nav style="max-width:1100px;margin:0 auto 20px;font:14px Arial,sans-serif"><a href="{bpmn_name}">Все BPMN: варианты 1 и 2 ↗</a></nav>',1)
(out/prototype_name).write_text(prototype)
with ZipFile(out/f'vero-prototype-and-bpmn-v{version}.zip','w',ZIP_DEFLATED) as z:
 for name in [prototype_name,bpmn_name]:z.write(out/name,name)
 for path in sorted((ROOT/'diagrams').glob('*.bpmn')):z.write(path,'bpmn/'+path.name)
 z.writestr('README.txt',f'ВЕРО v{version}\nРаспакуйте архив. Откройте {prototype_name} или {bpmn_name} в браузере. Сервер и интернет не нужны.\nВ варианте 2 есть кнопка «Заполнить пример». Согласия и отправка формы остаются ручными.\nВсе операции демонстрационные. Исходники BPMN лежат в bpmn/ и встроены в HTML схем.\n')
print('Portable delivery: '+str(out.resolve()))
