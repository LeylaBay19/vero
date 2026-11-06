"""Build the three registration variants and their BPMN viewer as one offline package."""
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
from zipfile import ZipFile, ZIP_DEFLATED

import auth_v1_diagrams as diagrams
from auth_v1_horizontal import bpmn as horizontal_bpmn, layout, svg as horizontal_svg
from build_registration_ux import main as build_ux
from prepare_site import csp, inner, shell
from registration_stand_models import BRIEF, UX

ROOT = Path(__file__).resolve().parents[1]
VERSION = '1.25.0'
ARCHIVE = Path('archive/prototype-v1.24.0.html')
POLICY = csp(inner)[0]
DOWNLOAD = re.compile(r'<a\b[^>]*\bdownload="[^"]+"[^>]*>[\s\S]*?</a>')


class FramePages(HTMLParser):
    def __init__(self, document):
        super().__init__()
        self.pages = {}
        self.feed(document)

    def handle_starttag(self, tag, attributes):
        if tag == 'iframe':
            attrs = dict(attributes)
            content = attrs.get('data-srcdoc') or attrs.get('data-stand-srcdoc')
            if content:
                self.pages[attrs['id']] = content


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def frame(name, title, page):
    state_element = '<script type="application/json" id="codex-visualization-widget-state">'
    page = page.replace(state_element + '__CODEX_VISUALIZATION_WIDGET_STATE__</script>',
                        state_element + '{}</script>', 1)
    hidden = '' if name in ('ux', 'schemes') else ' hidden'
    return (f'<iframe id="stand-frame-{name}" title="{title}" sandbox="allow-scripts" '
            f'referrerpolicy="no-referrer" data-page="{escape(page, quote=True)}"{hidden}></iframe>')


def group(key, title, cards, models):
    links = ''.join(f'<a href="#{m["id"]}">{escape(m["title"])}</a>' for m in models)
    return (f'<section data-process-group="{key}" id="group-{key}"><h2>{title}</h2>'
            f'<nav aria-label="{title}">{links}</nav>{cards}</section>')


def new_cards(models, files):
    cards = []
    for number, model in enumerate(models, 1):
        name = model['id'].lower().replace('_', '-')
        svg, xml = diagrams.svg(model), diagrams.bpmn(model)
        geometry = layout(model)
        hsvg, hxml = horizontal_svg(model, geometry), horizontal_bpmn(model, geometry, xml)
        for suffix, payload in [
            ('.svg', svg), ('.bpmn', xml), ('-horizontal.svg', hsvg), ('-horizontal.bpmn', hxml),
        ]:
            files[name + suffix] = payload
        card = diagrams.process_card(number, model, (name + '.bpmn', svg, xml),
                                     (name + '-horizontal.bpmn', hsvg, hxml))
        fit = '<button data-zoom="fit">По ширине</button>'
        cards.append(card.replace(fit, fit + '<button data-expand aria-expanded="false">На весь экран</button>', 1))
    return ''.join(cards)


def schemes_page(archived_page):
    files = {p.name: p.read_text(encoding='utf-8') for p in (ROOT / 'processes-v1').iterdir()
             if p.suffix in ('.bpmn', '.svg')}
    source = read('schemes-all.html')
    legacy_cards = ''.join(re.findall(r'<article\b[^>]* data-process-card>[\s\S]*?</article>', source))
    assert legacy_cards.count('data-process-card') == len(diagrams.MODELS)
    ux = group('ux', '1. С UX-правками', new_cards(UX, files), UX)
    letter = group('letter', '2. Письмо → пароль', legacy_cards, diagrams.MODELS)
    brief = group('brief', '3. По ТЗ', new_cards(BRIEF, files), BRIEF)
    links = ('<nav aria-label="Варианты схем"><a href="#group-ux">1. С UX-правками</a>'
             '<a href="#group-letter">2. Письмо → пароль</a><a href="#group-brief">3. По ТЗ</a></nav>')
    body = ('<main data-registration-schemes><h1>Схемы регистрации и входа</h1>'
            '<p>Для каждой схемы доступны вертикальный вид и горизонтальный BPMN с дорожками. '
            'Выберите масштаб или разверните схему на весь экран.</p>'
            + links + ux + letter + brief + '</main>')
    page = re.sub(r'<main\b[\s\S]*?</main>', lambda _: body, source, count=1)
    page = re.sub(r'<title>[^<]*</title>', '<title>ВЕРО — схемы регистрации</title>', page, count=1)
    page = page.replace('</head>', '<style>[data-process-group]>h2{font-size:23px;margin-top:30px}</style></head>', 1)
    standalone = page
    embedded = page.replace('</head>', POLICY + '</head>', 1)
    # The previous stand delegated downloads to the parent of its sandboxed frame.
    bridge = re.search(r"<script>document.addEventListener\('click',e=>\{const a=e.target.closest\('a'\);[\s\S]*?</script>", archived_page)
    assert bridge
    embedded = embedded.replace('</body>', bridge.group(0) + '</body>', 1)
    return standalone, embedded, files


def main():
    build_ux()
    pages = FramePages(read(ARCHIVE)).pages
    ux = FramePages(read('registration-ux.html')).pages['codex-visualization']
    letter = pages['codex-visualization']
    # Hide the demo choices in the active stand. The archived controls stay intact.
    letter = re.sub(r'<option value="invite-(?:expired|revoked)"[^>]*>[^<]*</option>', '', letter)
    brief = pages['stand-frame-brief']
    standalone, schemes, files = schemes_page(pages['stand-frame-schemes'])
    variants = (frame('ux', 'Вариант с UX-правками', ux)
                + frame('letter', 'Письмо → пароль', letter)
                + frame('brief', 'Личный кабинет и кошелёк по ТЗ', brief))
    result = read('templates/registration-stand.html')
    for key, value in (
        ('VERSION', VERSION), ('CSP', csp(shell)[0]), ('VARIANTS', variants), ('SCHEMES', frame('schemes', 'Схемы регистрации', schemes)),
        ('DOWNLOADS', ''.join(DOWNLOAD.findall(schemes))), ('NAVIGATION', read('src/registration-stand.js')),
    ):
        result = result.replace(f'__{key}__', value)
    for target in ('prototype.html', 'web/prototype.html'):
        (ROOT / target).write_text(result, encoding='utf-8')
    web_archive = ROOT / 'web' / ARCHIVE
    web_archive.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / ARCHIVE, web_archive)
    (ROOT / 'deliverables' / f'vero-unified-v{VERSION}.html').write_text(
        result.replace(f'href="{ARCHIVE}"', f'href="../{ARCHIVE}"', 1), encoding='utf-8')
    with ZipFile(ROOT / 'deliverables' / f'vero-registration-stand-v{VERSION}.zip', 'w', ZIP_DEFLATED) as package:
        package.writestr('prototype.html', result)
        package.write(ROOT / ARCHIVE, ARCHIVE)
        package.writestr('schemes.html', standalone)
        for name, content in files.items():
            package.writestr('schemes/' + name, content)
    print(f'Built v{VERSION}: 3 variants, {len(files) // 4} BPMN models and the v1.24.0 archive.')


if __name__ == '__main__':
    main()
