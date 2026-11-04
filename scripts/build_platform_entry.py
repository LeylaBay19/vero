from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
version=(ROOT/'VERSION').read_text().strip()
html=(ROOT/'src/platform-entry.html').read_text().replace('__VERSION__',version)
for path in [ROOT/'platform-entry.html',ROOT/'web/platform-entry.html',ROOT/'deliverables'/f'vero-platform-entry-v{version}.html']:
 path.parent.mkdir(exist_ok=True,parents=True);path.write_text(html)
print('Built standalone platform entry: platform-entry.html and portable HTML')
