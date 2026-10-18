"""
Draws the ELUM Account logos in the brand kit's construction: glass discs, the meeting point lit
in the Account colour (leaf, #94c858), and the monoline wordmark. Run: python3 scripts/brand.py <output dir>
"""
import sys
from pathlib import Path

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'public/brand/account')
OUT.mkdir(parents=True, exist_ok=True)

LEAF = '#94C858'
# A head over shoulders: two discs, the lit meeting point is "you".
HEAD = (60, 38, 20)
BODY = (60, 72, 30)

GLASS_DEFS = '''<radialGradient id="ag" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9ECF4"/></radialGradient>
<linearGradient id="arim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C5E3A0"/><stop offset=".55" stop-color="#EEF0F6"/><stop offset="1" stop-color="#C5E3A0"/></linearGradient>
<linearGradient id="alens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A8D474"/><stop offset="1" stop-color="#7FB443"/></linearGradient>'''


def circle(c, extra):
    return f'<circle cx="{c[0]}" cy="{c[1]}" r="{c[2]}" {extra}/>'


def mark(kind, pid):
    clip = f'<clipPath id="{pid}"><circle cx="{HEAD[0]}" cy="{HEAD[1]}" r="{HEAD[2]}"/></clipPath>'
    if kind == 'glass':
        return (f'<defs>{GLASS_DEFS}{clip}</defs>'
                + circle(BODY, 'fill="url(#ag)" stroke="url(#arim)" stroke-width="2"')
                + circle(HEAD, 'fill="url(#ag)" fill-opacity=".92" stroke="url(#arim)" stroke-width="2"')
                + circle(BODY, f'fill="url(#alens)" clip-path="url(#{pid})"'))
    if kind == 'reversed':
        return (f'<defs>{clip}</defs>'
                + circle(BODY, f'fill="#1A2033" stroke="{LEAF}" stroke-opacity=".6" stroke-width="2"')
                + circle(HEAD, f'fill="#1A2033" fill-opacity=".9" stroke="{LEAF}" stroke-opacity=".6" stroke-width="2"')
                + circle(BODY, f'fill="{LEAF}" clip-path="url(#{pid})"'))
    # flat: single ink, rims drawn inside like the kit's flat marks
    return (f'<defs>{clip}</defs>'
            + circle((BODY[0], BODY[1], BODY[2] - 2), f'fill="none" stroke="{LEAF}" stroke-width="4"')
            + circle((HEAD[0], HEAD[1], HEAD[2] - 2), f'fill="none" stroke="{LEAF}" stroke-width="4"')
            + circle(BODY, f'fill="{LEAF}" clip-path="url(#{pid})"'))


# Monoline letters on the kit's grid: 40 tall, round caps and joins, 4.5 stroke.
LETTERS = {
    'A': 'M0 40L14 0L28 40M5.5 26H22.5',
    'C': 'M24 6.1A14 20 0 1 0 24 33.9',
    'O': 'M14 0A14 20 0 1 1 14 40A14 20 0 1 1 14 0Z',
    'U': 'M0 0V26A14 14 0 0 0 28 26V0',
    'N': 'M0 40V0L28 40V0',
    'T': 'M0 0H28M14 0V40',
}


def wordmark(text, ink, x0):
    paths = ''.join(f'<path d="{LETTERS[ch]}" transform="translate({i * 46} 0)"/>' for i, ch in enumerate(text))
    return (f'<g fill="none" stroke="{ink}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" '
            f'transform="translate({x0} 40)">{paths}</g>')


def svg(view, label, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" role="img" aria-label="{label}">'
            f'<title>{label}</title>{body}</svg>\n')


WORD = 'ACCOUNT'
TEXT_X = 116
WIDTH = TEXT_X + (len(WORD) - 1) * 46 + 28 + 14

files = {
    'elum-account-mark.svg': svg('8 8 104 104', 'ELUM Account', mark('glass', 'amc')),
    'elum-account-mark-reversed.svg': svg('8 8 104 104', 'ELUM Account', mark('reversed', 'amr')),
    'elum-account-mark-flat.svg': svg('8 8 104 104', 'ELUM Account', mark('flat', 'amf')),
    'elum-account-lockup.svg': svg(f'8 8 {WIDTH} 104', 'ELUM Account', mark('glass', 'alc') + wordmark(WORD, '#141A2E', TEXT_X)),
    'elum-account-lockup-reversed.svg': svg(f'8 8 {WIDTH} 104', 'ELUM Account', mark('reversed', 'alr') + wordmark(WORD, '#EEF1FA', TEXT_X)),
    'elum-account-app-icon.svg': svg('0 0 1024 1024', 'ELUM Account app icon',
                                     '<rect width="1024" height="1024" rx="228" fill="#0E1220"/>'
                                     f'<g transform="translate(-16 -16) scale(8.8)">{mark("reversed", "aic")}</g>'),
}
for name, content in files.items():
    (OUT / name).write_text(content)
print('\n'.join(sorted(files)))
