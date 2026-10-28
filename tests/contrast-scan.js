const { chromium } = require('playwright');
const SETTINGS = { salary: 105000, fixed: 7000, weeksPerYear: 48, cover: false, fuelDefault: 160, cashRate: 30, recurring: [{ name: 'Kira', amount: 380 }] };
const data = { schemaVersion: 1, money: { settings: SETTINGS, weeks: { '2026-10-19': { start: '2026-10-19', uberEarn: 467, uberHours: 20, daily: [{ id: 'f', date: '2026-10-21', name: 'Shell', amount: 80, cat: 'yakit' }, { id: 'd', date: '2026-10-21', name: 'Konsol', amount: 650, oneOff: true }] } }, pots: [{ id: 'p', name: 'Servis', icon: 'car', target: 600, saved: 240, log: [] }] },
  growth: { habits: [{ id: 'h1', name: 'Kalk', band: 'aksam' }, { id: 'h2', name: 'Oku', band: 'sabah' }], log: { '2026-10-20': { h1: 1 } }, tasks: [{ id: 't', text: 'Görev', prio: 1 }] }, ui: { swipeHintSeen: false } };
(async () => { const b = await chromium.launch(); let total = 0;
for (const scheme of ['light', 'dark']) {
  const c = await b.newContext({ viewport: { width: 400, height: 860 }, colorScheme: scheme, timezoneId: 'Australia/Brisbane', serviceWorkers: 'block' });
  await c.clock.setFixedTime(new Date('2026-10-21T19:10:00+10:00'));
  await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co|finnhub|frankfurter/, (r) => r.fulfill({ status: 404, body: '' }));
  await c.addInitScript((d) => { if (!localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify(d)); }, data);
  const p = await c.newPage(); await p.goto('http://localhost:8766/'); await p.waitForTimeout(200);
  const scan = () => p.evaluate(() => {
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
    const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return null; const bc = parse(cs.backgroundColor); if (bc && bc.a > 0) { stack.push(bc); if (bc.a >= 1) break; } } let res = { r: 255, g: 255, b: 255, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) res = blend(stack[i], res); return res; };
    const out = [];
    document.querySelectorAll('#app *, #tabs *').forEach((el) => {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
      const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height) return;
      if (el.closest('[disabled], [aria-disabled="true"], .hero-deco')) return;
      let fg = parse(cs.color); const bg = bgOf(el); if (!fg || !bg) return; if (fg.a < 1) fg = blend(fg, bg);
      const [L1, L2] = [lum(fg), lum(bg)].sort((a, b) => b - a); const cr = (L1 + 0.05) / (L2 + 0.05);
      const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700; const need = (size >= 24 || (bold && size >= 18.66)) ? 3 : 4.5;
      if (cr < need) out.push(`${cr.toFixed(2)}<${need} "${el.textContent.trim().slice(0, 30)}" ${cs.color} on rgb(${bg.r|0},${bg.g|0},${bg.b|0})`);
    });
    return out;
  });
  const res = {};
  for (const tab of ['bugun', 'para', 'gelisim', 'saglik', 'yatirim']) {
    await p.click(`#tabs [data-tab="${tab}"]`); await p.waitForTimeout(80);
    if (tab === 'para') for (const s of ['hafta', 'gecmis', 'kumbara', 'vergi']) { await p.click(`[data-act="paraSeg"][data-v="${s}"]`); await p.waitForTimeout(60); res['para/' + s] = await scan(); }
    else if (tab === 'gelisim') { for (const s of await p.$$eval('[data-act="gelSeg"]', (bs) => bs.map((x) => x.dataset.v))) { await p.click(`[data-act="gelSeg"][data-v="${s}"]`); await p.waitForTimeout(60); res['gel/' + s] = await scan(); } }
    else res[tab] = await scan();
  }
  await p.click('#gearBtn'); await p.waitForTimeout(80); res.settings = await scan();
  for (const [k, v] of Object.entries(res)) if (v.length) { total += v.length; console.log(scheme, k, [...new Set(v)].slice(0, 6).join(' || ')); }
  await c.close();
}
console.log('low-contrast text nodes:', total); await b.close(); })();
