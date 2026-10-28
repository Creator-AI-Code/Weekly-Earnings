// v2.0.0 (sadelik R1): Modüller (ui.modules), 3-tab nav, single gear, palettes (ui.palette), G1 swipe (edge guard + hidden-tab skip)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const SEED = require('./fixtures/sadelik-seed.json');
const OUT = path.resolve(__dirname, 'out', 'sadelik-r1'); fs.mkdirSync(path.join(OUT, 'palettes'), { recursive: true });
let fails = 0; const check = (ok, m) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
const URL0 = 'http://localhost:8766/';
const withUi = (ui) => Object.assign({}, SEED, { ui: Object.assign({}, SEED.ui, ui) });
(async () => {
  const b = await chromium.launch();
  const mk = async (data, o = {}) => {
    const c = await b.newContext(Object.assign({ viewport: { width: 360, height: 780 }, timezoneId: 'Australia/Brisbane', locale: 'tr-TR', serviceWorkers: 'block' }, o.ctx || {}));
    await c.clock.setFixedTime(new Date('2026-10-28T17:40:00+10:00'));
    await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co|finnhub|frankfurter/, (r) => r.fulfill({ status: 404, body: '' }));
    await c.addInitScript(([d, tab, native]) => {
      if (d && !localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify(d));
      if (tab && !sessionStorage.getItem('tabSet')) { localStorage.setItem('adim-adim-v2:tab', tab); sessionStorage.setItem('tabSet', '1'); }
      if (native) { window.__sched = []; window.Capacitor = { isNativePlatform: () => true, registerPlugin: (n) => n === 'LocalNotifications' ? { requestPermissions: async () => ({ display: 'granted' }), getPending: async () => ({ notifications: window.__sched.map((x) => ({ id: x.id })) }), cancel: async () => { window.__sched = []; }, schedule: async (q) => { window.__sched = q.notifications; } } : null }; }
    }, [data, o.tab || null, !!o.native]);
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL0); await p.waitForTimeout(250);
    return { c, p, errs };
  };
  const tabs = (p) => p.$$eval('#tabs button', (bs) => bs.filter((x) => !x.hidden && x.offsetWidth).map((x) => x.dataset.tab));
  const st = (p, k) => p.evaluate((k0) => JSON.stringify(window.__adim.state[k0]), k);
  const closeAll = async (p) => { for (let i = 0; i < 4; i++) { if (!(await p.$('#page, #scrim'))) return; await p.click('[data-act="closeOverlay"] >> nth=0'); await p.waitForTimeout(80); } };

  // ===== 1. fresh install and old data without ui.modules → Bugün, Para, Yatırım =====
  { const { c, p, errs } = await mk(null);
    check(JSON.stringify(await tabs(p)) === '["bugun","para","yatirim"]', '1 fresh install: tabs are Bugün, Para, Yatırım');
    check((await p.getAttribute('html', 'data-palette')) === 'grafit', '1 fresh install: palette grafit');
    const w = await p.$$eval('#tabs button:not([hidden])', (bs) => bs.map((x) => Math.round(x.getBoundingClientRect().width)));
    check(w.length === 3 && w.every((x) => x >= 110), '1 three tabs share the bar at 360 px ' + w.join(','));
    check(errs.length === 0, '1 no page errors ' + errs.join(' | ')); await c.close(); }
  { const { c, p, errs } = await mk(SEED);
    check(JSON.stringify(await tabs(p)) === '["bugun","para","yatirim"]', '1 v1.9 data (no ui.modules): tabs are Bugün, Para, Yatırım');
    check((await p.$$('#secGear')).length === 0 && (await p.$$('.top-acts .iconbtn')).length === 1, '1 single gear in the header');
    check(!(await p.$('#bandHabits, #evening, .counters')) && !!(await p.$('#shiftCard')) && !!(await p.$('#bTaxLine')), '1 Bugün: no habits / counters / evening, Uber card and tax line shown');
    await p.click('#fab'); await p.waitForTimeout(80);
    const opts = await p.$$eval('[data-act="fabPick"]', (bs) => bs.map((x) => x.dataset.k));
    check(JSON.stringify(opts) === '["fis","harcama","uber","uexp"]', '1 FAB: only Para + Uber options ' + opts.join(','));
    await closeAll(p);
    // nothing is written for modules until the user toggles one; a save keeps it missing
    await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="genel"]'); await p.click('#theme-light'); await p.waitForTimeout(500);
    const raw = await p.evaluate(() => JSON.parse(localStorage.getItem('adim-adim-v2')).ui);
    check(raw.modules === undefined && raw.palette === undefined, '1 old data keeps ui.modules / ui.palette missing after a save (defaults apply)');
    check(errs.length === 0, '1 no page errors ' + errs.join(' | ')); await c.close(); }

  // ===== 4. stored tab points to a hidden module =====
  { const { c, p, errs } = await mk(SEED, { tab: 'gelisim' });
    check((await p.getAttribute('#tabs [data-tab="bugun"]', 'aria-selected')) === 'true' && !!(await p.$('#safeHero')), '4 stored tab "gelisim" with Gelişim off opens Bugün');
    check(errs.length === 0, '4 no console error ' + errs.join(' | ')); await c.close(); }

  // ===== 2/3. Ayarlar → Modüller =====
  { const { c, p, errs } = await mk(SEED);
    await p.waitForTimeout(1200); // the start-up price refresh writes invest.lastRefresh
    const g0 = await st(p, 'growth'), h0 = await st(p, 'health'), i0 = await st(p, 'invest');
    await p.click('#gearBtn'); await p.waitForTimeout(80);
    const rows = await p.$$eval('#pageRoot .setrow', (bs) => bs.map((x) => x.dataset.v));
    check(rows[0] === 'moduller' && !rows.includes('gelisim') && !rows.includes('saglik') && rows.includes('vergi') && rows.includes('yatirim'), '2 Ayarlar: Modüller first, Gelişim/Sağlık sections hidden ' + rows.join(','));
    check(/Para, Uber araçları, Yatırım açık · 2 kapalı/.test(await p.textContent('.setrow[data-v="moduller"]')), '2 Modüller subtitle "Para, Uber araçları, Yatırım açık · 2 kapalı"');
    await p.click('[data-act="setSec"][data-v="moduller"]'); await p.waitForTimeout(80);
    const sw = await p.$$eval('[role="switch"]', (bs) => bs.map((x) => [x.dataset.k, x.getAttribute('aria-checked'), x.getAttribute('aria-label'), Math.round(x.getBoundingClientRect().height)]));
    check(JSON.stringify(sw.map((x) => x.slice(0, 3))) === '[["uber","true","Uber araçları"],["yatirim","true","Yatırım"],["gelisim","false","Gelişim"],["saglik","false","Sağlık"]]' && sw.every((x) => x[3] >= 56), '2 switches: role=switch, aria-checked, module-name label, ≥ 56 px ' + JSON.stringify(sw));
    check(/Her zaman açık/.test(await p.textContent('#mod-para')) && !(await p.$('#mod-para[role="switch"]')), '2 Para is locked "Her zaman açık"');
    await p.click('#mod-gelisim'); await p.waitForTimeout(120);
    check((await p.getAttribute('#mod-gelisim', 'aria-checked')) === 'true' && /Gelişim açıldı\. Sekmesi altta\./.test(await p.textContent('#toast')), '2 Gelişim on: switch checked + toast "Gelişim açıldı. Sekmesi altta."');
    check(JSON.stringify(await tabs(p)) === '["bugun","para","gelisim","yatirim"]', '2 Gelişim tab back in its original place, no reload');
    await p.click('#mod-gelisim'); await p.waitForTimeout(120);
    check(/Gelişim gizlendi\. Verilerin duruyor\./.test(await p.textContent('#toast')) && await p.isVisible('#toast [data-act="undoModule"]'), '2 Gelişim off: snackbar "Gelişim gizlendi. Verilerin duruyor." + Geri al');
    check(JSON.stringify(await tabs(p)) === '["bugun","para","yatirim"]', '2 Gelişim off: tab hidden');
    await p.waitForTimeout(3800); check(await p.isVisible('#toast [data-act="undoModule"]'), '2 Geri al still there after 4 s');
    await p.click('#toast [data-act="undoModule"]'); await p.waitForTimeout(100);
    check(JSON.stringify(await tabs(p)) === '["bugun","para","gelisim","yatirim"]' && (await p.getAttribute('#mod-gelisim', 'aria-checked')) === 'true', '2 Geri al turns Gelişim back on');
    await p.click('#mod-saglik'); await p.waitForTimeout(80); await p.click('#mod-uber'); await p.waitForTimeout(80); await p.click('#mod-yatirim'); await p.waitForTimeout(80);
    check(JSON.stringify(await tabs(p)) === '["bugun","para","gelisim","saglik"]', '2 Sağlık on, Yatırım off → Bugün, Para, Gelişim, Sağlık');
    await p.click('#setBack'); await p.waitForTimeout(80);
    const rows2 = await p.$$eval('#pageRoot .setrow', (bs) => bs.map((x) => x.dataset.v));
    check(rows2.includes('gelisim') && rows2.includes('saglik') && !rows2.includes('vergi') && !rows2.includes('yatirim'), '3 settings sections follow the modules ' + rows2.join(','));
    await closeAll(p);
    check(!(await p.$('#shiftCard')) && !(await p.$('#bTaxLine')) && !!(await p.$('#bandHabits')) && !!(await p.$('.counters')), '3 Bugün: Uber lines gone, habits + counters back');
    await p.click('#fab'); await p.waitForTimeout(80);
    const opts = await p.$$eval('[data-act="fabPick"]', (bs) => bs.map((x) => x.dataset.k)); await closeAll(p);
    check(JSON.stringify(opts) === '["fis","harcama","sigara","alkol","kilo","aliskanlik"]', '3 FAB follows the modules ' + opts.join(','));
    await p.click('#tabs [data-tab="para"]'); await p.waitForTimeout(80);
    check(!(await p.$('[data-act="paraSeg"][data-v="vergi"]')), '3 Uber off: no Vergi segment in Para');
    check(await st(p, 'growth') === g0 && await st(p, 'health') === h0 && await st(p, 'invest') === i0, '2 growth / health / invest byte-identical after all toggles');
    const syncs = await p.evaluate(() => ['growth', 'health', 'invest', 'money'].every((a) => JSON.stringify(window.__adim.sync.areaData(a)) === JSON.stringify(a === 'money' ? window.__adim.sync.areaData('money') : window.__adim.state[a])));
    check(syncs, '2 hidden modules still produce their sync payloads');
    await p.waitForTimeout(500); await p.reload(); await p.waitForTimeout(250);
    check(JSON.stringify(await tabs(p)) === '["bugun","para","gelisim","saglik"]', '2 module choice survives a reload');
    check(errs.length === 0, '2 no page errors ' + errs.join(' | ')); await c.close(); }

  // ===== 5. old backup import: data merges, modules stay as they were =====
  { const { c, p, errs } = await mk(withUi({ modules: { gelisim: true } }));
    const bk = { schemaVersion: 1, exportedOn: '2026-09-01', money: { settings: SEED.money.settings, weeks: {} }, growth: { habits: [{ id: 'hb', name: 'Yürüyüş', band: 'aksam' }], log: { '2026-08-30': ['hb'] }, tasks: [], goals: [], books: [], journal: {} }, health: { days: { '2026-08-30': { cig: 0 } } }, ui: { theme: 'system', lang: 'tr' } };
    await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="yedek"]');
    await p.setInputFiles('#bkFile', { name: 'adim-adim-yedek-2026-09-01.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bk)) }); await p.waitForSelector('#bkYes'); await p.click('#bkYes'); await p.waitForTimeout(150);
    const s = await p.evaluate(() => ({ h: window.__adim.state.growth.habits.map((x) => x.id), d: Object.keys(window.__adim.state.health.days), m: window.__adim.state.ui.modules }));
    check(s.h.includes('hb') && s.h.includes('h1') && s.d.includes('2026-08-30') && s.m.gelisim === true && s.m.saglik === undefined, '5 old backup with growth + health imports unchanged; modules stay as they were ' + JSON.stringify(s));
    await closeAll(p); check(JSON.stringify(await tabs(p)) === '["bugun","para","gelisim","yatirim"]', '5 tabs unchanged after the import');
    check(errs.length === 0, '5 no page errors ' + errs.join(' | ')); await c.close(); }

  // ===== notifications of hidden modules are not scheduled =====
  { const notif = { evening: { on: true, time: '21:00' }, habit: { on: true, time: '07:00' }, weekly: { on: true, time: '19:00' }, bas: { on: true, time: '09:00' }, car: { on: true, time: '09:00' } };
    const { c, p, errs } = await mk(withUi({ notif }), { native: true });
    const ids = async () => { await p.waitForTimeout(1500); return p.evaluate(() => window.__sched.map((n) => n.id)); };
    await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="moduller"]'); await p.click('#mod-yatirim'); await p.waitForTimeout(80); await p.click('#mod-yatirim'); // touch ui → reschedule
    let s = await ids();
    check(!s.includes(101) && !s.includes(102) && s.includes(103) && s.some((x) => x >= 200), '3 Gelişim off: evening (101) + habit (102) paused; weekly + BAS still scheduled ' + s.join(','));
    await p.click('#setBack'); await p.click('[data-act="setSec"][data-v="bildirim"]'); await p.waitForTimeout(80);
    check(!(await p.$('[data-act="notifToggle"][data-k="evening"]')) && !!(await p.$('[data-act="notifToggle"][data-k="bas"]')), '3 Bildirimler hides the Gelişim reminders');
    await p.click('#setBack'); await p.click('[data-act="setSec"][data-v="moduller"]'); await p.click('#mod-gelisim'); await p.click('#mod-uber'); s = await ids();
    check(s.includes(101) && s.includes(102) && !s.some((x) => x >= 200) && s.includes(103), '3 Gelişim on + Uber off: evening/habit back, BAS + car paused ' + s.join(','));
    check(errs.length === 0, 'N no page errors ' + errs.join(' | ')); await c.close(); }

  // ===== G1: swipe skips hidden tabs, ignores the 32 px edges and vertical drags =====
  { const { c, p, errs } = await mk(SEED);
    const sel = () => p.evaluate(() => document.querySelector('#tabs [aria-selected="true"]').dataset.tab);
    const spot = () => p.evaluate(() => { for (let y = 260; y < 700; y += 10) { const e = document.elementFromPoint(180, y); if (e && e.closest('#view') && !e.closest('input, textarea, select, .swipe, [data-swipe-zone], .tbl-wrap, .months-scroll')) return y; } return 400; });
    const drag = async (x0, x1, dy = 0) => { await p.evaluate(() => window.getSelection().removeAllRanges()); /* a mouse drag over selected text starts a native drag */ const y = await spot(); await p.mouse.move(x0, y); await p.mouse.down(); await p.mouse.move((x0 + x1) / 2, y + dy / 2, { steps: 4 }); await p.mouse.move(x1, y + dy, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(150); };
    await drag(260, 100); check(await sel() === 'para', 'G1 swipe left on Bugün → Para');
    await drag(260, 100); check(await sel() === 'yatirim', 'G1 swipe left on Para → Yatırım (hidden Gelişim/Sağlık skipped)');
    await drag(260, 100); check(await sel() === 'yatirim', 'G1 swipe left on the last tab does nothing');
    await drag(100, 260); check(await sel() === 'para', 'G1 swipe right on Yatırım → Para');
    await drag(10, 200); check(await sel() === 'para', 'G1 drag starting 10 px from the left edge is ignored');
    await drag(350, 150); check(await sel() === 'para', 'G1 drag starting 10 px from the right edge is ignored');
    await drag(220, 160, 200); check(await sel() === 'para', 'G1 200 px vertical drag with 60 px drift never changes the tab');
    check(errs.length === 0, 'G1 no page errors ' + errs.join(' | ')); await c.close(); }
  { const { c, p } = await mk(withUi({ modules: { gelisim: true } }));
    await p.click('#tabs [data-tab="para"]'); await p.waitForTimeout(80);
    const y = await p.evaluate(() => { for (let y = 260; y < 700; y += 10) { const e = document.elementFromPoint(180, y); if (e && e.closest('#view') && !e.closest('input, textarea, select, .swipe, [data-swipe-zone]')) return y; } return 400; });
    await p.mouse.move(260, y); await p.mouse.down(); await p.mouse.move(100, y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150);
    check((await p.evaluate(() => document.querySelector('#tabs [aria-selected="true"]').dataset.tab)) === 'gelisim', 'G1 with Gelişim on, Para → Gelişim');
    await c.close(); }

  // ===== palettes =====
  { const { c, p, errs } = await mk(SEED);
    const prim = () => p.evaluate(() => getComputedStyle(document.querySelector('.fab')).backgroundColor);
    check((await p.getAttribute('html', 'data-palette')) === 'grafit' && (await prim()) === 'rgb(24, 24, 27)', 'P default palette grafit (accent #18181B)');
    await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="genel"]'); await p.waitForTimeout(80);
    const radios = await p.$$eval('[role="radio"][data-act="setPalette"]', (bs) => bs.map((x) => [x.dataset.v, x.getAttribute('aria-checked'), !!x.querySelector('.swatch .i')]));
    check(JSON.stringify(radios) === '[["grafit","true",true],["lacivert","false",true],["petrol","false",true]]', 'P Renk teması: Grafit, Lacivert, Petrol swatches with check marks ' + JSON.stringify(radios));
    await p.click('#pal-lacivert'); await p.waitForTimeout(350);
    check((await p.getAttribute('html', 'data-palette')) === 'lacivert' && (await prim()) === 'rgb(30, 64, 175)' && (await p.getAttribute('#pal-lacivert', 'aria-checked')) === 'true', 'P Lacivert applies instantly');
    await p.click('#theme-dark'); await p.waitForTimeout(350);
    check((await prim()) === 'rgb(143, 176, 255)', 'P Lacivert works in dark (accent #8FB0FF)');
    await p.click('#pal-petrol'); await p.waitForTimeout(350); check((await prim()) === 'rgb(95, 196, 203)', 'P Petrol in dark (accent #5FC4CB)');
    await p.click('#theme-light'); await p.waitForTimeout(500); await p.reload(); await p.waitForTimeout(250);
    check((await p.getAttribute('html', 'data-palette')) === 'petrol' && (await prim()) === 'rgb(14, 92, 99)' && (await p.evaluate(() => window.__adim.state.ui.palette)) === 'petrol', 'P palette choice persists after a reload');
    check(errs.length === 0, 'P no page errors ' + errs.join(' | ')); await c.close(); }

  // ===== retired module colours never show =====
  for (const scheme of ['light', 'dark']) {
    const { c, p } = await mk(withUi({ modules: { gelisim: true, saglik: true } }), { ctx: { colorScheme: scheme } });
    const OLD = ['#7b1e3c', '#6b1832', '#5a1428', '#6b4e8a', '#5d427c', '#b6a3cf', '#c5b5db', '#2f5f7e', '#2a5571', '#8db6d0', '#232a42', '#a3b1cc', '#cd917f', '#b97f6e', '#f4eee6', '#1b1520'].map((h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`);
    const bad = [];
    for (const t of ['bugun', 'para', 'gelisim', 'saglik', 'yatirim']) {
      await p.click(`#tabs [data-tab="${t}"]`); await p.waitForTimeout(80);
      bad.push(...await p.evaluate((old) => [...document.querySelectorAll('#app *, #tabs *, .fab')].filter((el) => !el.closest('svg, .legend, .spine')).flatMap((el) => { const cs = getComputedStyle(el); return [cs.color, cs.backgroundColor, cs.borderTopColor].filter((v) => old.includes(v)).map((v) => (el.id || el.className) + ' ' + v); }), OLD));
    }
    check(bad.length === 0, scheme + ' no retired module colours (bordo, purple, steel blue, navy hero, beige) ' + [...new Set(bad)].slice(0, 5).join(' | '));
    await c.close();
  }

  // ===== EN strings + screenshots (360×780; light/dark; TR/EN) =====
  const overflow = (p) => p.evaluate(() => [...document.querySelectorAll('#view *, #pageRoot *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.right > window.innerWidth + 0.5 && !el.closest('svg, .tbl-wrap, .months-scroll'); }).length);
  for (const lang of ['tr', 'en']) for (const scheme of ['light', 'dark']) {
    const { c, p, errs } = await mk(withUi({ lang }), { ctx: { colorScheme: scheme } });
    const shot = async (n) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(OUT, `${n}-${lang}-${scheme}.png`) }); const o = await overflow(p); if (o) console.log('   overflow', n, o); return o; };
    let ov = 0;
    ov += await shot('bugun');
    await p.click('#tabs [data-tab="para"]'); await p.waitForTimeout(100); ov += await shot('para');
    await p.click('#tabs [data-tab="yatirim"]'); await p.waitForTimeout(100); ov += await shot('yatirim');
    await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="moduller"]'); await p.waitForTimeout(100); ov += await shot('ayarlar-moduller');
    await p.click('#setBack'); await p.click('[data-act="setSec"][data-v="genel"]'); await p.waitForTimeout(80);
    if (lang === 'en') { await p.click('#setBack'); await p.click('[data-act="setSec"][data-v="bildirim"]'); const miss = await p.evaluate(() => [...window.__adim.missing]); check(miss.length === 0, scheme + ' EN: no missing strings ' + miss.join(' | ')); }
    check(ov === 0, `${lang} ${scheme}: Bugün, Para, Yatırım, Modüller fit 360 px`);
    check(errs.length === 0, `${lang} ${scheme}: no page errors ` + errs.join(' | '));
    await c.close();
  }
  for (const pal of ['grafit', 'lacivert', 'petrol']) for (const scheme of ['light', 'dark']) {
    const { c, p } = await mk(withUi({ palette: pal }), { ctx: { colorScheme: scheme } });
    await p.screenshot({ path: path.join(OUT, 'palettes', `bugun-${pal}-${scheme}.png`) }); await c.close();
  }
  check(fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).length >= 16 && fs.readdirSync(path.join(OUT, 'palettes')).length >= 6, 'screenshots written to tests/out/sadelik-r1/');
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
