from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
version=(ROOT/'VERSION').read_text(encoding='utf-8').strip()
html=(ROOT/'src/platform-entry.html').read_text(encoding='utf-8').replace('__VERSION__',version)
html=html.replace('__REGISTRATION_VARIANT2_SCRIPT__',(ROOT/'src/registration-mos-id.js').read_text(encoding='utf-8'))
for path in [ROOT/'platform-entry.html',ROOT/'web/platform-entry.html',ROOT/'deliverables'/f'vero-platform-entry-v{version}.html']:
 path.parent.mkdir(exist_ok=True,parents=True);path.write_text(html,encoding='utf-8')
variant2=html.replace('<body>','<body data-default-registration="2">',1)
for path in [ROOT/'platform-entry-variant2.html',ROOT/'web/platform-entry-variant2.html',ROOT/'deliverables'/f'vero-registration-variant2-v{version}.html']:
 path.parent.mkdir(exist_ok=True,parents=True);path.write_text(variant2,encoding='utf-8')
print('Built standalone platform entry: platform-entry.html and portable HTML')
