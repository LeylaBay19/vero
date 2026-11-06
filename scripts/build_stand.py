"""Build the registration variants and their BPMN viewer as one offline package."""
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
from registration_stand_models import BRIEF, KONTUR, KONTUR_LETTER, LETTER

ROOT = Path(__file__).resolve().parents[1]
VERSION = '1.31.2'
BASE = Path('archive/prototype-v1.24.0.html')
ARCHIVE = Path('archive/prototype-v1.25.0.html')
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
    hidden = '' if name in ('letter', 'comparison', 'schemes') else ' hidden'
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
    files = {}
    source = read('schemes-all.html')
    letter = group('letter', '1. Письмо → пароль', new_cards(LETTER, files), LETTER)
    brief = group('brief', '2. По ТЗ', new_cards(BRIEF, files), BRIEF)
    kontur = group('kontur', '3. Как в Контуре', new_cards(KONTUR, files), KONTUR)
    kontur_letter = group('kontur-letter', '4. Как в Контуре · письмо → пароль', new_cards(KONTUR_LETTER, files), KONTUR_LETTER)
    links = ('<nav aria-label="Варианты схем">'
             '<a href="#group-letter">1. Письмо → пароль</a><a href="#group-brief">2. По ТЗ</a>'
             '<a href="#group-kontur">3. Как в Контуре</a>'
             '<a href="#group-kontur-letter">4. Как в Контуре · письмо → пароль</a></nav>')
    body = ('<main data-registration-schemes><h1>Схемы регистрации и входа</h1>'
            '<p>Для каждой схемы доступны вертикальный вид и горизонтальный BPMN с дорожками. '
            'Выберите масштаб или разверните схему на весь экран.</p>'
            + links + letter + brief + kontur + kontur_letter + '</main>')
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
    pages = FramePages(read(BASE)).pages
    letter = pages['codex-visualization']
    # Use current login behavior inside the archived layout.
    registration = read('src/registration-mos-id.js')
    start = letter.index('<script>' + registration.splitlines()[0]) + len('<script>')
    end = letter.index('</script>', start)
    letter = letter[:start] + registration.replace('Вариант 2 · регистрация', 'Вариант 1 · регистрация') + letter[end:]
    platform = read('src/platform-entry.html')
    for start_marker, next_marker in (
        (' if(account.acceptInvitation)', ' if(!keepScreen'),
        (" if(authOnly&&q==='auth-complete')", " if(q==='invitations')"),
    ):
        source_start = platform.index(start_marker)
        source_end = platform.index(next_marker, source_start)
        frame_start = letter.index(start_marker)
        frame_end = letter.index(next_marker, frame_start)
        letter = letter[:frame_start] + platform[source_start:source_end] + letter[frame_end:]
    invite_option = '<option value="invite">Сотрудник по приглашению</option>'
    assert letter.count(invite_option) == 1
    letter = letter.replace(invite_option,
                            '<option value="invite">Сотрудник по приглашению · новый аккаунт</option>'
                            '<option value="invite-v2">Сотрудник по приглашению 2</option>', 1)
    removed_scenarios = re.compile(r'<option value="(?:director|multi)"[^>]*>[^<]*</option>')
    letter = re.sub(r'(<select id="scenario">)(.*?)(</select>)',
                    lambda match: match[1] + removed_scenarios.sub('', match[2]) + match[3],
                    letter, count=1, flags=re.S)
    # Invitation-specific demo outcomes are added at runtime.
    letter = re.sub(r'<option value="invite-(?:expired|revoked)"[^>]*>[^<]*</option>', '', letter)
    brief = pages['stand-frame-brief']
    kontur = read('src/registration-kontur.html')
    kontur = (kontur.replace('__CSP__', POLICY, 1)
              .replace('__SHARED_UI__', read('src/simple-ui.css'), 1)
              .replace('__FLOW_JS__', read('src/prototype-history.js') + '\n' + read('src/registration-kontur.js'), 1))
    def kontur_page(mode, title, demo):
        return (kontur.replace('__MODE__', mode, 1).replace('__TITLE__', title, 1)
                .replace('__DEMO__', demo, 1))

    standalone, schemes, files = schemes_page(pages['stand-frame-schemes'])
    variants = (frame('letter', 'Письмо → пароль', letter)
                + frame('brief', 'Личный кабинет и кошелёк по ТЗ', brief)
                + frame('kontur', 'Приглашение как в Контуре',
                        kontur_page('kontur', 'Приглашение как в Контуре',
                                    'Демо по мотивам Диадок КЭДО. Письма, коды входа и сертификат имитируются.'))
                + frame('kontur-letter', 'Как в Контуре · письмо → пароль',
                        kontur_page('kontur-letter', 'Как в Контуре · письмо → пароль',
                                    'Демо ВЕРО. Письма и коды подтверждения имитируются.')))
    comparison = pages['stand-frame-comparison']
    comparison = re.sub(r" } else if\(q==='consent'\)\{.*?(?= } else if\(q==='mosid'\))",
                        '', comparison, count=1, flags=re.S)
    comparison = re.sub(r"\['consent','Доступ(?: к данным)?'\],", '', comparison)
    comparison = comparison.replace("'consent',", "'mosid',").replace("'entry','mosid','mosid'", "'entry','mosid'")
    comparison = comparison.replace("btn.dataset.go==='consent'", "btn.dataset.go==='mosid'")
    result = read('templates/registration-stand.html')
    for key, value in (
        ('VERSION', VERSION), ('CSP', csp(shell)[0]), ('VARIANTS', variants), ('SCHEMES', frame('schemes', 'Схемы регистрации', schemes)),
        ('COMPARISON', frame('comparison', 'Сравнение Тринити и Орбиты', comparison)),
        ('DOWNLOADS', ''.join(DOWNLOAD.findall(schemes))), ('NAVIGATION', read('src/registration-stand.js')),
    ):
        result = result.replace(f'__{key}__', value)
    for target in ('prototype.html', 'web/prototype.html'):
        (ROOT / target).write_text(result, encoding='utf-8')
    for path in (ARCHIVE, BASE):
        web_archive = ROOT / 'web' / path
        web_archive.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / path, web_archive)
    (ROOT / 'deliverables' / f'vero-unified-v{VERSION}.html').write_text(
        result.replace(f'href="{ARCHIVE}"', f'href="../{ARCHIVE}"', 1), encoding='utf-8')
    with ZipFile(ROOT / 'deliverables' / f'vero-registration-stand-v{VERSION}.zip', 'w', ZIP_DEFLATED) as package:
        package.writestr('prototype.html', result)
        for path in (ARCHIVE, BASE):
            package.write(ROOT / path, path)
        package.writestr('schemes.html', standalone)
        for name, content in files.items():
            package.writestr('schemes/' + name, content)
    print(f'Built v{VERSION}: 4 variants, {len(files) // 4} BPMN models and the v1.25.0 archive.')


if __name__ == '__main__':
    main()
