from pathlib import Path
from html import escape
import base64
from process_details import DETAILS

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'diagrams'
destination=ROOT/'schemes.html'
def attachment(slug):
    data=base64.b64encode((source/(slug+'.bpmn')).read_bytes()).decode('ascii')
    return f'data:application/octet-stream;base64,{data}'
panels=[]
for number,slug,title,description,steps in [
    ('01','organization-registration','Регистрация организации','Организацию подключает генеральный директор. До успешной проверки платформой управление кабинетом недоступно.',[
        'Войти или создать личный аккаунт.','Найти организацию по ИНН и проверить реквизиты.','Подписать заявление электронной подписью генерального директора.','Дождаться проверки платформой. После подтверждения — открыть кабинет и при необходимости пригласить сотрудников. При отказе — проверить реквизиты и повторно подписать заявление либо завершить без подключения.'
    ]),
    ('02','employee-invitation','Единое подключение сотрудника','Приглашение на любую почту → mos.ru без повторного ИНН → принятие → МЧД на подпись руководителю, если нужна.',[
        'Открыть приглашение и войти через mos.ru. Почта mos.ru может отличаться от почты доставки.',
        'Вернуться к сохранённому приглашению: организация, ИНН, обычные права и полномочия уже известны. Проверить свои данные и принять приглашение.',
        'Получить назначенный доступ к кабинету. Если полномочия МЧД не выбраны, подключение завершено без МЧД.',
        'Если полномочия выбраны, платформа формирует МЧД и направляет руководителю. Он проверяет и подписывает; сотрудник МЧД не подписывает. Полномочия активируются только после успешной проверки.'
    ]),
    ('03','employee-mos-organization','Организация есть на mos.ru','Сотрудник добавлен только в организацию на mos.ru. Получение этих сведений в прототипе — гипотеза интеграции, а не подтверждённая возможность Тринити.',[
        'Войти через личный аккаунт mos.ru.','Увидеть свою организацию, если интеграция передаёт эти сведения.','Платформа проверяет собственные права сотрудника. Членство на mos.ru само по себе их не назначает.','Если приглашения и прав ещё нет — обратиться к руководителю или администратору организации. Запрос доступа на платформе не создаётся.'
    ]),
    ('04','employee-mchd','Выдача полномочий и МЧД','Обычный доступ сотрудника уже предоставлен. Дополнительный путь для уже подключённого сотрудника. При новом подключении МЧД встроена в единый процесс.',[
        'Руководитель отмечает полномочия сотрудника чекбоксами.','Платформа формирует предварительный вид МЧД. Руководитель проверяет сотрудника и полномочия.','Руководитель подписывает МЧД электронной подписью. Выбор чекбоксов без подписи не выдаёт эти полномочия.','Сотрудник видит оформленные полномочия. МЧД не добавляет административные права в кабинете.'
    ]),
]:
    svg=(source/(slug+'.svg')).read_text(encoding='utf-8')
    details='<div class=details><h3>Условия, данные и результаты</h3><ul>'+''.join('<li>'+escape(item)+'</li>' for item in DETAILS.get(slug,[]))+'</ul></div>' if slug in DETAILS else ''
    panels.append(f'''<section class="process" id="{slug}">
<div class="section-heading"><span class="number">{number}</span><div><h2>{title}</h2><p>{description}</p></div></div>
<div class="toolbar"><div class="zoom-controls" role="group" aria-label="Масштаб: {title}"><button type="button" data-scale="out" aria-label="Уменьшить схему">−</button><output aria-live="polite">100%</output><button type="button" data-scale="in" aria-label="Увеличить схему">+</button><button type="button" data-scale="fit">По ширине</button></div><a class="download" download="{slug}.bpmn" href="{attachment(slug)}">Скачать BPMN</a></div>
<div class="diagram-viewport" tabindex="0" aria-label="Схема. При увеличении можно прокручивать её по горизонтали"><div class="diagram-canvas" data-percent="100">{svg}</div></div>
<ol class="steps">{''.join('<li>'+escape(step)+'</li>' for step in steps)}</ol>
{details}
</section>''')

html='''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
<title>Предлагаемый вариант — схемы регистрации</title>
<style>
:root{color-scheme:light;--ink:#193936;--muted:#536c68;--line:#cedbd7;--accent:#12665d}*{box-sizing:border-box}body{margin:0;background:#f3f6f4;color:var(--ink);font:16px/1.6 Arial,sans-serif}main{max-width:1720px;margin:auto;padding:48px 36px 40px}header{margin-bottom:36px;max-width:1000px}.eyebrow{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:var(--accent);font-weight:700}h1{font-size:36px;line-height:1.2;letter-spacing:-.02em;margin:12px 0 16px}h2{font-size:25px;line-height:1.3;margin:0 0 8px}p{margin:0;color:var(--muted)}nav{display:flex;gap:12px 24px;flex-wrap:wrap;margin-top:22px}a{color:var(--accent);text-underline-offset:3px}.process{background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px;margin:24px 0}.section-heading{display:flex;gap:16px;align-items:flex-start;max-width:1100px}.number{font:700 16px/1 Arial,sans-serif;display:grid;place-items:center;background:#e4efeb;width:44px;height:44px;border-radius:12px;flex-shrink:0}.toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin:24px 0 12px}.zoom-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}button,.download{font:inherit;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);padding:8px 14px;text-decoration:none;min-height:42px;cursor:pointer}.download{color:var(--accent)}button:hover,.download:hover{background:#edf4f0}button:focus-visible,a:focus-visible,.diagram-viewport:focus-visible{outline:3px solid #8db7ac;outline-offset:3px}button:disabled{opacity:.4;cursor:default}output{width:58px;text-align:center;font-variant-numeric:tabular-nums;color:var(--muted)}.diagram-viewport{overflow:auto;border:1px solid var(--line);border-radius:10px;background:white}.diagram-canvas{width:100%;min-width:100%;transform-origin:top left}.diagram-canvas svg{display:block;width:100%;height:auto}.steps{margin:24px 0 0;padding-left:24px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 38px;max-width:1200px}.steps li{padding-left:4px}footer{font-size:14px;color:var(--muted);max-width:1000px;margin-top:28px}footer p+p{margin-top:8px}@media(max-width:700px){main{padding:26px 12px}h1{font-size:28px}h2{font-size:21px}.process{padding:18px 14px;border-radius:12px}.steps{grid-template-columns:1fr}.toolbar{gap:12px}.download{width:100%;text-align:center}.section-heading{gap:12px}}@media print{body{background:white}main{padding:0}.process{break-inside:avoid;border:0;padding:0;margin:32px 0}.toolbar,nav{display:none}.diagram-viewport{overflow:visible;border:0}.diagram-canvas{width:100%!important}.steps{font-size:12px}header{margin-bottom:20px}h1{font-size:26px}h2{font-size:20px}footer{font-size:11px}}
</style></head><body><main>
<header><span class="eyebrow">Предлагаемый вариант · v1.1.0 · 04.11.2026</span><h1>Как зарегистрировать организацию<br>и подключить сотрудника</h1><p>Четыре процесса с отдельными действиями человека и платформы. Схемы можно увеличить, а исходники BPMN — скачать для редактирования.</p><nav aria-label="Разделы"><a href="#organization-registration">Регистрация организации</a><a href="#employee-invitation">Сотрудник по приглашению</a><a href="#employee-mos-organization">Организация на mos.ru</a><a href="#employee-mchd">Полномочия и МЧД</a></nav></header>
'''+''.join(panels)+'''
<footer><p>Схемы описывают предлагаемый процесс. Способ и сроки проверки генерального директора платформой ещё не определены.</p><p>Автоматическое получение организации из mos.ru показано как гипотеза интеграции. В <a href="https://trinityeco.ru/api/trinity-auth-documents/">инструкции Тринити</a> описаны ввод ИНН и оформление МЧД; автоматическое получение организации из mos.ru не подтверждено.</p><p>Все схемы и файлы BPMN встроены. Этот HTML можно переслать одним файлом и открыть в браузере без подключения к интернету.</p></footer>
</main><script>
document.querySelectorAll('.process').forEach(section=>{
 const canvas=section.querySelector('.diagram-canvas'),output=section.querySelector('output');
 section.querySelectorAll('[data-scale]').forEach(button=>button.addEventListener('click',()=>{
  const action=button.dataset.scale,current=Number(canvas.dataset.percent)||100;
  const percent=action==='fit'?100:Math.min(500,Math.max(100,current+(action==='in'?50:-50)));
  canvas.dataset.percent=String(percent);canvas.style.width=percent+'%';output.textContent=percent+'%';
  section.querySelector('[data-scale="out"]').disabled=percent===100;section.querySelector('[data-scale="in"]').disabled=percent===500;
 }));section.querySelector('[data-scale="out"]').disabled=true;
});
</script></body></html>'''
destination.write_text(html,encoding='utf-8')
print(str(destination.resolve()))
print('Self-contained HTML: embedded SVG and BPMN, no external resources; bytes:',destination.stat().st_size)
