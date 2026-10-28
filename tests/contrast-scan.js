const { chromium } = require('playwright');
const SETTINGS = { salary: 105000, fixed: 7000, weeksPerYear: 48, cover: false, fuelDefault: 160, cashRate: 30, recurring: [{ name: 'Kira', amount: 380 }] };
const data = { schemaVersion: 1, money: { settings: SETTINGS, weeks: { '2026-10-19': { start: '2026-10-19', uberEarn: 467, uberHours: 20, daily: [{ id: 'f', date: '2026-10-21', name: 'Shell', amount: 80, cat: 'yakit' }, { id: 'd', date: '2026-10-21', name: 'Konsol', amount: 650, oneOff: true }] } }, pots: [{ id: 'p', name: 'Servis', icon: 'car', target: 600, saved: 240, log: [] }] },
  growth: { habits: [{ id: 'h1', name: 'Kalk', band: 'aksam' }, { id: 'h2', name: 'Oku', band: 'sabah' }], log: { '2026-10-20': ['h1'] }, tasks: [{ id: 't', text: 'Görev', prio: 1 }] }, ui: { swipeHintSeen: false, modules: { gelisim: true, saglik: true } } };
// Text contrast (WCAG AA) + input borders (≥ 3:1 against what is around the field), on every tab, the settings pages and open sheets,
// for every palette (ui.palette) in light and dark. All modules are on so every tab is scanned.
(async () => { const b = await chromium.launch(); let total = 0;
for (const palette of ['grafit', 'lacivert', 'petrol']) for (const scheme of ['light', 'dark']) {
  const c = await b.newContext({ viewport: { width: 400, height: 860 }, colorScheme: scheme, timezoneId: 'Australia/Brisbane', serviceWorkers: 'block' });
  await c.clock.setFixedTime(new Date('2026-10-21T19:10:00+10:00'));
  await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co|finnhub|frankfurter/, (r) => r.fulfill({ status: 404, body: '' }));
  await c.addInitScript((d) => { if (!localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify(d)); }, Object.assign({}, data, { ui: Object.assign({}, data.ui, { palette }) }));
  const p = await c.newPage(); await p.goto('http://localhost:8766/'); await p.waitForTimeout(200);
  const scan = () => p.evaluate(() => {
    const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
    const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return null; const bc = parse(cs.backgroundColor); if (bc && bc.a > 0) { stack.push(bc); if (bc.a >= 1) break; } } let res = { r: 255, g: 255, b: 255, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) res = blend(stack[i], res); return res; };
    const ratio = (x, y) => { const [L1, L2] = [lum(x), lum(y)].sort((a, b) => b - a); return (L1 + 0.05) / (L2 + 0.05); };
    const out = [], top = document.querySelector('#pageRoot .page') || document.querySelector('#sheetRoot .scrim') ? '#pageRoot *, #sheetRoot *' : '#app *, #tabs *';
    document.querySelectorAll(top).forEach((el) => {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
      const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height) return;
      if (el.closest('[disabled], [aria-disabled="true"], .hero-deco, option, select')) return;
      let fg = parse(cs.color); const bg = bgOf(el); if (!fg || !bg) return; if (fg.a < 1) fg = blend(fg, bg);
      const cr = ratio(fg, bg);
      const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700; const need = (size >= 24 || (bold && size >= 18.66)) ? 3 : 4.5;
      if (cr < need) out.push(`${cr.toFixed(2)}<${need} "${el.textContent.trim().slice(0, 30)}" ${cs.color} on rgb(${bg.r|0},${bg.g|0},${bg.b|0})`);
    });
    // input borders: the field outline must stand out (≥ 3:1) from the surface around the field
    document.querySelectorAll(top.replace(/\*/g, '.money') + ', ' + top.replace(/\*/g, '.txt:not(.money .txt)')).forEach((el) => {
      const cs = getComputedStyle(el), rc = el.getBoundingClientRect(); if (!rc.width || !rc.height || cs.display === 'none' || el.closest('.combo-in .combo-cat')) return;
      let bc = parse(cs.borderTopColor); const around = bgOf(el.parentElement); if (!bc || !around || parseFloat(cs.borderTopWidth) === 0) { out.push(`border missing on ${el.id || el.className}`); return; }
      if (bc.a < 1) bc = blend(bc, around); const cr = ratio(bc, around);
      if (cr < 3) out.push(`border ${cr.toFixed(2)}<3 ${el.id || el.className} ${cs.borderTopColor} on rgb(${around.r|0},${around.g|0},${around.b|0})`);
    });
    return out;
  });
  const res = {};
  // fixed token pairs from design/proposal-sadelik.md §9a: text ≥ 4.5, input borders ≥ 3
  res.tokens = await p.evaluate(() => {
    const get = (n) => { const d = document.createElement('i'); d.style.color = `var(${n})`; document.body.appendChild(d); const v = getComputedStyle(d).color.match(/\d+/g).slice(0, 3).map(Number); d.remove(); return v; };
    const lum = (v) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]); };
    const PAIRS = [['--ink', '--bg', 4.5], ['--ink', '--surface', 4.5], ['--ink-2', '--surface', 4.5], ['--ink-3', '--surface', 4.5], ['--ink-3', '--surface-2', 4.5], ['--border', '--surface', 3], ['--border', '--bg', 3], ['--border', '--surface-2', 3],
      ['--primary', '--surface', 4.5], ['--on-primary', '--primary', 4.5], ['--primary', '--primary-soft', 4.5], ['--hero-ink', '--hero-fill', 4.5], ['--hero-ink-2', '--hero-fill', 4.5], ['--hero-ink-2', '--hero-fill-tile', 4.5],
      ['--gain', '--surface', 4.5], ['--warn', '--surface', 4.5], ['--loss', '--surface', 4.5], ['--gain', '--gain-soft', 4.5], ['--warn', '--warn-soft', 4.5], ['--loss', '--loss-soft', 4.5]];
    return PAIRS.map(([a, b, need]) => { const [x, y] = [lum(get(a)), lum(get(b))].sort((m, n) => n - m), cr = (x + 0.05) / (y + 0.05); return cr < need ? `token ${a}/${b} ${cr.toFixed(2)}<${need}` : null; }).filter(Boolean);
  });
  for (const tab of ['bugun', 'para', 'gelisim', 'saglik', 'yatirim']) {
    if (!(await p.isVisible(`#tabs [data-tab="${tab}"]`))) continue;
    await p.click(`#tabs [data-tab="${tab}"]`); await p.waitForTimeout(80);
    if (tab === 'para') for (const s of ['hafta', 'gecmis', 'kumbara', 'vergi']) { await p.click(`[data-act="paraSeg"][data-v="${s}"]`); await p.waitForTimeout(60); res['para/' + s] = await scan(); }
    else if (tab === 'gelisim') { for (const s of await p.$$eval('[data-act="gelSeg"]', (bs) => bs.map((x) => x.dataset.v))) { await p.click(`[data-act="gelSeg"][data-v="${s}"]`); await p.waitForTimeout(60); res['gel/' + s] = await scan(); } }
    else res[tab] = await scan();
  }
  // sheets: the FAB quick add (spending form) and the spending edit sheet
  await p.click('#tabs [data-tab="bugun"]'); await p.click('#fab'); await p.click('[data-act="fabPick"][data-k="harcama"]'); await p.waitForTimeout(80); res['sheet/harcama'] = await scan();
  await p.click('#sheetRoot .sheet-head [data-act="closeOverlay"]'); await p.waitForTimeout(80);
  await p.click('#tabs [data-tab="para"]'); await p.click('[data-act="paraSeg"][data-v="hafta"]');
  if (!(await p.isVisible('[data-act="editDaily"]'))) { await p.click('[data-act="dayOpen"][data-d="2026-10-21"]'); await p.waitForTimeout(60); }
  if (await p.isVisible('[data-act="editDaily"]')) { await p.click('[data-act="editDaily"] >> nth=0'); await p.waitForTimeout(80); res['sheet/daily'] = await scan(); await p.click('#sheetRoot .sheet-head [data-act="closeOverlay"]'); await p.waitForTimeout(80); }
  // settings root + every section
  await p.click('#gearBtn'); await p.waitForTimeout(80); res.settings = await scan();
  for (const s of await p.$$eval('#pageRoot [data-act="setSec"]', (bs) => bs.map((x) => x.dataset.v))) { await p.click(`#pageRoot [data-act="setSec"][data-v="${s}"]`); await p.waitForTimeout(80); res['settings/' + s] = await scan(); await p.click('#setBack'); await p.waitForTimeout(60); }
  for (const [k, v] of Object.entries(res)) if (v.length) { total += v.length; console.log(palette, scheme, k, [...new Set(v)].slice(0, 6).join(' || ')); }
  console.log(palette, scheme, 'screens scanned:', Object.keys(res).length, 'data-palette=' + (await p.getAttribute('html', 'data-palette')));
  await c.close();
}
console.log('low-contrast nodes (text + input borders):', total); await b.close(); })();
