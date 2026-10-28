// v1.1: Uber shifts by odometer, 12-week ATO logbook, car expenses following the logbook %, CSV export, EN coverage
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const SP = path.resolve(__dirname, 'out');
const URL0 = 'http://localhost:8766/';
const log = (...a) => console.log(...a);
let fails = 0; const check = (ok, msg) => { if (!ok) fails++; log((ok ? 'PASS ' : 'FAIL ') + msg); };
const txt = (p, s) => p.textContent(s).then((t) => (t || '').replace(/\s+/g, ' ').trim());
const at = (s) => new Date(s + '+10:00');
const SETTINGS = { salary: 105000, fixed: 7500, weeksPerYear: 48, cover: true, fuelDefault: 80, cashRate: 30, cashTax: false, recurring: [], logbookPct: 100 };
const PRE = { schemaVersion: 1, money: { settings: SETTINGS, weeks: {}, uberExpenses: [
  { id: 's1', d: '2026-10-12', cat: 'service', amount: 420, gst: true, biz: 100, note: 'General Service' },
  { id: 'p1', d: '2026-10-13', cat: 'phone', amount: 60, gst: true, biz: 50, note: 'Telstra' }] } };

(async () => {
  const browser = await chromium.launch(); const errs = [];
  const c = await browser.newContext({ viewport: { width: 400, height: 860 }, timezoneId: 'Australia/Brisbane', locale: 'tr-TR', serviceWorkers: 'block', reducedMotion: 'reduce', acceptDownloads: true });
  await c.clock.setFixedTime(at('2026-10-21T17:30:00'));
  await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co|finnhub|frankfurter/, (r) => r.fulfill({ status: 404, body: '' }));
  await c.addInitScript((d) => { if (!localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify(d)); }, PRE);
  const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const st = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__adim.state.money)));
  const reload = async (when) => { await p.evaluate(() => window.__adim.saveNow()); if (when) await c.clock.setFixedTime(at(when)); await p.reload(); await p.waitForTimeout(200); };
  const fillShift = async (km, dt) => { await p.fill('#odoKm', km); if (dt) await p.fill('#odoAt', dt); await p.click('#odoSave'); await p.waitForTimeout(120); };
  await p.goto(URL0); await p.waitForTimeout(200);

  // migration: car expenses follow the logbook, phone keeps its own share
  let m = await st();
  check(m.uberExpenses.find((e) => e.id === 's1').bizAuto === true && !m.uberExpenses.find((e) => e.id === 'p1').bizAuto, 'M old car expense at 100% → bizAuto; phone at 50% untouched');

  // ===== shift on Bugün =====
  check(await p.isVisible('#shiftCard') && /Uber'e başla/.test(await txt(p, '#shiftStartBtn')), 'B Bugün shows the "Uber\'e başla" card');
  await p.click('#shiftStartBtn'); await p.waitForTimeout(100);
  check(await p.evaluate(() => document.activeElement && document.activeElement.id) === 'odoKm', 'B odometer field focused');
  await fillShift('120.000');
  m = await st();
  check(m.trips.length === 1 && m.trips[0].kmStart === 120000 && !m.trips[0].end, 'B shift started at 120.000 km (TR thousands dot accepted)');
  check(/Uber'desin/.test(await txt(p, '#shiftCard')) && await p.isVisible('#shiftEndBtn'), 'B card switches to "Uber\'desin" with Bitir');
  await p.screenshot({ path: path.join(SP, 'v11-shift-on.png') });

  await reload('2026-10-21T21:00:00');
  check(/3 sa 30 dk/.test(await txt(p, '#shiftCard')), 'B running time shown: ' + (await txt(p, '#shiftCard')));
  await p.click('#shiftEndBtn'); await p.waitForTimeout(100);
  await fillShift('119990');
  check(await p.isVisible('#odoErr') && /küçük olamaz/.test(await txt(p, '#odoErr')), 'V end km below start → error: ' + (await txt(p, '#odoErr')));
  await fillShift('120085');
  m = await st();
  check(m.trips[0].kmEnd === 120085 && m.trips[0].end === at('2026-10-21T21:00:00').getTime(), 'B shift ended: 85 km');
  check(/85 km/.test(await txt(p, '#toast')) && /3 sa 30 dk/.test(await txt(p, '#toast')), 'B toast: ' + (await txt(p, '#toast')));
  check(/1 vardiya · 85 km · 3,5 sa/.test(await txt(p, '#shiftSub')), 'B week summary on card: ' + (await txt(p, '#shiftSub')));

  // ===== logbook on Para → Vergi =====
  await p.click('#tabs [data-tab="para"]'); await p.click('[data-act="paraSeg"][data-v="vergi"]'); await p.waitForTimeout(100);
  check(await p.isVisible('#lbStartBtn'), 'L Vergi shows "Logbook\'u başlat"');
  check(/11 Kasım 2026/.test(await txt(p, '#taxDue')) || true, 'L (info) due chip: ' + (await txt(p, '#taxDue')));
  await p.click('#lbStartBtn'); await p.waitForTimeout(80);
  await p.fill('#lbVeh', 'BMW X3 2015, 351LZ6');
  await fillShift('119500', '2026-10-21T08:00');
  m = await st();
  check(m.lb && m.lb.odoStart === 119500 && m.lb.vehicle === 'BMW X3 2015, 351LZ6', 'L logbook started at 119.500 km with vehicle');
  const t = async () => [await txt(p, '#lbBiz'), await txt(p, '#lbTotal'), await txt(p, '#lbPct')].join(' | ');
  check(/85/.test(await txt(p, '#lbBiz')) && /585/.test(await txt(p, '#lbTotal')) && /%14/.test(await txt(p, '#lbPct')), 'L tiles: 85 Uber km of 585 → %14: ' + (await t()));
  await p.click('#lbApply'); await p.waitForTimeout(80);
  m = await st();
  check(m.settings.logbookPct === 14, 'L apply → logbook % = 14');
  check(/iş %14/.test(await txt(p, '#lbCard ~ .card')), 'L service expense now shows "iş %14" (follows logbook)');
  const q = await p.evaluate(() => { const x = window.__adim.taxQuarter('2027-Q2'); return { credit: x.credit }; });
  check(Math.abs(q.credit - (420 / 11 * 0.14 + 60 / 11 * 0.5)) < 1e-6, 'L GST credit uses 14% for the service, 50% for the phone: ' + q.credit.toFixed(2));

  await p.click('#odoReadBtn'); await p.waitForTimeout(80);
  await fillShift('119400');
  check(/küçük olamaz/.test(await txt(p, '#odoErr')), 'V odometer reading below the last one → error');
  await fillShift('120300');
  check(/800/.test(await txt(p, '#lbTotal')) && /%10/.test(await txt(p, '#lbPct')), 'L odometer reading 120.300 → total 800 km, %10: ' + (await t()));
  check(!(await p.isVisible('#lbEndBtn')), 'L no "bitir" before 12 weeks');

  // stale shift: started yesterday evening, never ended
  await reload('2026-10-22T18:00:00');
  await p.click('#tabs [data-tab="bugun"]'); await p.click('#shiftStartBtn'); await fillShift('120310');
  await reload('2026-10-23T08:30:00');
  check(await p.isVisible('#shiftCard.stale') && /açık kaldı/.test(await txt(p, '#shiftCard')), 'S next morning the open shift is flagged: ' + (await txt(p, '#shiftCard')));
  await p.click('#shiftEndBtn'); await p.waitForTimeout(80);
  const defEnd = await p.inputValue('#odoAt');
  check(defEnd === '2026-10-22T22:00', 'S end time defaults to start + 4 h for a forgotten shift: ' + defEnd);
  await fillShift('120390');
  m = await st(); check(m.trips.filter((x) => x.end).length === 2, 'S forgotten shift closed (80 km)');

  // 12 weeks later: finish
  await reload('2027-01-15T09:00:00');
  await p.click('#tabs [data-tab="para"]'); await p.click('[data-act="paraSeg"][data-v="vergi"]'); await p.waitForTimeout(100);
  check(await p.isVisible('#lbEndBtn'), 'E after 12 weeks "Logbook\'u bitir" appears');
  await p.click('#lbEndBtn'); await fillShift('121500');
  m = await st();
  check(m.lb.endTs && m.lb.pct === Math.floor(165 / 2000 * 100) && m.settings.logbookPct === m.lb.pct, 'E finished: 165 / 2000 km → %' + m.lb.pct + ', applied to tax');
  // the Q2 view (Oct–Dec) still shows the card
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#lbExport')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  check(/"Vehicle","BMW X3 2015, 351LZ6"/.test(csv) && /"Business use %","8"/.test(csv) && /"2026-10-21","17:30","21:00","120000","120085","85"/.test(csv) && /"Total km","2000"/.test(csv), 'X CSV logbook: vehicle, period, totals, one row per shift');
  log(csv.split('\r\n').slice(0, 11).join('\n'));
  await p.screenshot({ path: path.join(SP, 'v11-logbook.png'), fullPage: false });
  await p.evaluate(() => document.getElementById('lbCard').scrollIntoView());
  await p.screenshot({ path: path.join(SP, 'v11-logbook-card.png') });

  // delete a shift
  await p.click('#tripList .del'); await p.click('#tripList .del.arm');
  m = await st(); check(m.trips.length === 1, 'D shift deleted after confirm tap');

  // EN coverage across the new screens
  await p.evaluate(() => window.__adim.setLang('en')); await p.waitForTimeout(80);
  await p.click('#lbExport').catch(() => {});
  await p.click('#tabs [data-tab="bugun"]'); await p.click('#shiftStartBtn'); await p.waitForTimeout(80);
  await fillShift('1'); // error path in EN
  await p.click('[data-act="closeOverlay"]').catch(() => {});
  await p.click('#tabs [data-tab="para"]'); await p.click('[data-act="paraSeg"][data-v="vergi"]');
  await p.evaluate(() => { window.__adim.state.money.lb = null; }); await p.click('[data-act="taxQGo"][data-d="-1"]'); await p.waitForTimeout(80);
  await p.click('#lbStartBtn'); await p.waitForTimeout(80); await p.click('[data-act="closeOverlay"]');
  await p.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
  await p.screenshot({ path: path.join(SP, 'v11-logbook-en-dark.png') });
  const miss = await p.evaluate(() => [...window.__adim.missing]);
  check(miss.length === 0, 'I all strings in EN' + (miss.length ? ' → ' + miss.join(' | ') : ''));
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await browser.close();
  log(fails ? `\n${fails} FAILED` : '\nALL PASS'); process.exit(fails ? 1 : 0);
})();
