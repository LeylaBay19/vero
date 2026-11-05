"""Portable prototypes without retired diagrams; historic versions remain in Git."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
version=(ROOT/'VERSION').read_text(encoding='utf-8').strip()
out=ROOT/'deliverables';out.mkdir(exist_ok=True)
empty=(ROOT/'src/schemes-empty.html').read_text(encoding='utf-8')
for name in ['schemes.html','schemes-v2.html','schemes-all.html','processes.html']:
 for folder in [ROOT,ROOT/'web']:(folder/name).write_text(empty,encoding='utf-8')
prototype_name=f'vero-prototype-v{version}.html'
prototype=(ROOT/'index.html').read_text(encoding='utf-8').replace("flow:location.hash==='#variant2'?'proposal2':'proposal'","flow:'proposal2'")
(out/prototype_name).write_text(prototype,encoding='utf-8')
with ZipFile(out/f'vero-prototype-v{version}.zip','w',ZIP_DEFLATED) as z:
 z.write(out/prototype_name,prototype_name)
 z.writestr('README.txt',f'ВЕРО v{version}\nОткройте {prototype_name} в браузере. Интернет и сервер не нужны. Все действия демонстрационные. Текущие схемы удалены по решению пользователя.\n')
for name in [f'vero-bpmn-v{version}.html',f'vero-prototype-and-bpmn-v{version}.zip']:
 target=(out/name).resolve();assert target.parent==out.resolve()
 if target.is_file():target.unlink()
print('Portable HTML/ZIP exported; all current diagram pages are empty.')
