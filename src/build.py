# Builds adim-adim/ (index.html, manifest.webmanifest, sw.js, icons) from aa-src/
import os, json, glob
from PIL import Image, ImageDraw

SRC = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(SRC)  # repo root
os.makedirs(OUT, exist_ok=True)
rd = lambda n: open(os.path.join(SRC, n), encoding='utf-8').read()

js = '\n'.join(rd(os.path.basename(p)) for p in sorted(glob.glob(os.path.join(SRC, '[0-9]-*.js'))))
html = f'''<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Momentum</title>
<meta name="description" content="Bütçe, alışkanlık, sağlık ve yatırım: tek telefonda, tek elle.">
<meta name="theme-color" content="#f6f6f7">
<meta name="color-scheme" content="light dark">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Momentum">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap">
<style>
{rd('style.css')}
</style>
</head>
<body>
{rd('body.html')}
<script>
(function () {{
'use strict';
{js}
}})();
</script>
</body>
</html>
'''
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)

manifest = {
    "name": "Momentum", "short_name": "Momentum", "description": "Bütçe, alışkanlık, sağlık ve yatırım takibi",
    "start_url": "./", "scope": "./", "display": "standalone", "orientation": "portrait",
    "background_color": "#f6f6f7", "theme_color": "#f6f6f7", "lang": "tr",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
    ]
}
open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8').write(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

sw = r'''// Momentum service worker: app shell precached, pages network-first, fonts/CDN cache-first, price APIs never cached here.
const CACHE = 'adim-adim-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const RUNTIME = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  // drop every other cache, including the old budget app's butce-v* caches
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/finnhub\.io$|frankfurter\.app$/.test(url.hostname)) return; // prices: straight to network, the app keeps its own cache
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then((r) => {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
    return;
  }
  if (RUNTIME.includes(url.hostname)) {
    e.respondWith(caches.match(req).then((m) => m || fetch(req).then((r) => {
      if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return r;
    })));
  }
});
'''
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(sw)

# ---------- icon: rising steps + gold coin on warm near-black, inside the central 70% (maskable safe zone) ----------
BG = (31, 27, 23); STEP = (241, 230, 216); STEP_SH = (196, 182, 166); GOLD = (228, 181, 82); GOLD_D = (156, 107, 12); RING = (46, 40, 35)
def icon(size):
    S = 4; N = size * S; im = Image.new('RGB', (N, N), BG); d = ImageDraw.Draw(im); u = N / 100
    for r in (40, 31):
        d.ellipse([(50 - r) * u, (50 - r) * u, (50 + r) * u, (50 + r) * u], outline=RING, width=int(1.1 * u))
    # one connected staircase, coin resting on the top step, arrow climbing the stairs
    pts = [(17, 76), (17, 64), (33, 64), (33, 52), (49, 52), (49, 40), (65, 40), (65, 76)]
    d.polygon([(x * u, y * u) for x, y in pts], fill=STEP)
    for x0, y0, x1 in ((17, 64, 33), (33, 52, 49), (49, 40, 65)):
        d.rectangle([x0 * u, y0 * u, x1 * u, (y0 + 2.4) * u], fill=(255, 250, 242))
    d.line([(20 * u, 55 * u), (31 * u, 55 * u), (31 * u, 44 * u), (45 * u, 44 * u), (45 * u, 33 * u), (52 * u, 33 * u)], fill=GOLD, width=int(2.6 * u), joint='curve')
    ax, ay = 57 * u, 33 * u
    d.polygon([(ax, ay), (ax - 6.5 * u, ay - 4.6 * u), (ax - 6.5 * u, ay + 4.6 * u)], fill=GOLD)
    cx, cy, r = 74 * u, 31 * u, 9 * u
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD, outline=GOLD_D, width=int(1.6 * u))
    d.ellipse([cx - r * 0.56, cy - r * 0.56, cx + r * 0.56, cy + r * 0.56], outline=GOLD_D, width=int(1.1 * u))
    return im.resize((size, size), Image.LANCZOS)
for s in (192, 512):
    icon(s).save(os.path.join(OUT, f'icon-{s}.png'), optimize=True)
icon(512).save(os.path.join(os.path.dirname(SRC), 'adim-icon-preview.png'))
for n in sorted(os.listdir(OUT)):
    print(n, os.path.getsize(os.path.join(OUT, n)))
