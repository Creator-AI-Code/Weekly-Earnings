# Generates Android launcher icons (legacy, round, adaptive foreground) and a monochrome notification icon
# from the repo's icon-512.png. Run after `npx cap add android`.
import os, sys
from PIL import Image, ImageDraw

here = os.path.dirname(os.path.abspath(__file__))
app = os.path.dirname(here)
res = os.path.join(app, 'android', 'app', 'src', 'main', 'res')
src = Image.open(os.path.join(os.path.dirname(app), 'icon-512.png')).convert('RGBA')
BG = '#1F1B17'
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

def save(img, d, name):
    p = os.path.join(res, 'mipmap-' + d); os.makedirs(p, exist_ok=True); img.save(os.path.join(p, name))

for d, k in DENS.items():
    n = round(48 * k)
    legacy = src.resize((n, n), Image.LANCZOS)
    save(legacy, d, 'ic_launcher.png')
    mask = Image.new('L', (n * 4, n * 4), 0); ImageDraw.Draw(mask).ellipse([0, 0, n * 4 - 1, n * 4 - 1], fill=255)
    rnd = Image.new('RGBA', (n, n), (0, 0, 0, 0)); rnd.paste(legacy, (0, 0), mask.resize((n, n), Image.LANCZOS))
    save(rnd, d, 'ic_launcher_round.png')
    f = round(108 * k); inner = round(72 * k)
    fg = Image.new('RGBA', (f, f), (0, 0, 0, 0)); fg.paste(src.resize((inner, inner), Image.LANCZOS), ((f - inner) // 2, (f - inner) // 2))
    save(fg, d, 'ic_launcher_foreground.png')
    # notification small icon: white staircase + coin on transparent
    s = round(24 * k); S4 = s * 4; ic = Image.new('RGBA', (S4, S4), (0, 0, 0, 0)); g = ImageDraw.Draw(ic); u = S4 / 24
    g.polygon([(3 * u, 21 * u), (3 * u, 16 * u), (8 * u, 16 * u), (8 * u, 12 * u), (13 * u, 12 * u), (13 * u, 8 * u), (18 * u, 8 * u), (18 * u, 21 * u)], fill='white')
    g.ellipse([16 * u, 1.5 * u, 22.5 * u, 8 * u], fill='white')
    dp = os.path.join(res, 'drawable-' + d); os.makedirs(dp, exist_ok=True)
    ic.resize((s, s), Image.LANCZOS).save(os.path.join(dp, 'ic_stat_momentum.png'))

vals = os.path.join(res, 'values'); os.makedirs(vals, exist_ok=True)
with open(os.path.join(vals, 'ic_launcher_background.xml'), 'w') as fh:
    fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">%s</color>\n</resources>\n' % BG)
any_dir = os.path.join(res, 'mipmap-anydpi-v26'); os.makedirs(any_dir, exist_ok=True)
for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
    with open(os.path.join(any_dir, name), 'w') as fh:
        fh.write('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')
print('icons written to', res)
