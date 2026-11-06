"""Build the standalone registration UX variant using the existing sandbox."""
from pathlib import Path

from prepare_site import wrap

ROOT = Path(__file__).resolve().parents[1]


def main():
    page = (ROOT / 'src/registration-ux.html').read_text(encoding='utf-8')
    for marker, source in (
        ('__SHARED_UI__', 'simple-ui.css'),
        ('__REGISTRATION_UX__', 'registration-ux.js'),
    ):
        page = page.replace(marker, (ROOT / 'src' / source).read_text(encoding='utf-8'))
    result = wrap(page).replace('ВЕРО — два варианта регистрации', 'ВЕРО — регистрация · UX-вариант')
    result = result.replace('title="ВЕРО — регистрация и кабинет"', 'title="ВЕРО — регистрация · UX-вариант"')
    (ROOT / 'registration-ux.html').write_text(result, encoding='utf-8')


if __name__ == '__main__':
    main()
