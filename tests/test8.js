// v1.3: Para → Rapor (week vs last week, donut, patterns, trend), EN coverage, no overflow at 400px
const { chromium } = require('playwright');
let fails = 0; const check = (ok, m) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 400, height: 900 }, timezoneId: 'Australia/Brisbane', locale: 'tr-TR', serviceWorkers: 'block' });
  await c.clock.setFixedTime(new Date('2026-10-21T10:00:00+10:00'));
  await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co|finnhub|frankfurter/, (r) => r.fulfill({ status: 404, body: '' }));
  const st = { schemaVersion: 1, money: { settings: { salary: 105000, fixed: 7500, weeksPerYear: 48, cover: true, fuelDefault: 80, cashRate: 30, cashTax: false, recurring: [{ name: 'Kira', amount: 380 }] }, weeks: {
    '2026-10-12': { start: '2026-10-12', uberEarn: 1061, uberHours: 24, daily: [{ id: 'a', date: '2026-10-13', name: 'Yakıt', cat: 'yakit', amount: 120 }, { id: 'a2', date: '2026-10-13', name: 'Kahve', cat: 'kahve', amount: 5 }, { id: 'a4', date: '2026-10-18', name: 'Akşam', cat: 'yemek', amount: 44 }, { id: 'a5', date: '2026-10-18', name: 'Market', cat: 'market', amount: 62 }], extras: [] },
    '2026-10-19': { start: '2026-10-19', uberEarn: 1183.92, uberHours: 19, cashHours: 3, daily: [{ id: 'b', date: '2026-10-19', name: 'Yakıt', cat: 'yakit', amount: 110 }, { id: 'c', date: '2026-10-20', name: 'Kahve', cat: 'kahve', amount: 5 }, { id: 'c3', date: '2026-10-19', name: 'Kahvaltı', cat: 'yemek', amount: 30.5 }, { id: 'c5', date: '2026-10-19', name: 'Araba bakım', cat: 'diger', amount: 165, oneOff: true }], extras: [] } } } };
  await c.addInitScript((d) => localStorage.setItem('adim-adim-v2', JSON.stringify(d)), st);
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8766/'); await p.waitForTimeout(200);
  await p.click('#tabs [data-tab="para"]'); await p.click('[data-act="paraSeg"][data-v="rapor"]'); await p.waitForTimeout(150);
  const t = async (s) => ((await p.textContent(s)) || '').replace(/\s+/g, ' ');
  check(/\$1\.061.*\$1\.184.*▲12%/.test(await t('#rE')), 'R Uber brüt 1.061 → 1.184 ▲12%');
  check(/\$44,21\/sa.*\$62,31\/sa/.test(await t('#rGH')), 'R gross per hour 44,21 → 62,31');
  check(/saat başı %\d+ daha fazla/.test(await t('#repHead')) && /Tek seferlik \$165 hariç/.test(await t('#repHead')), 'R headline: ' + (await t('#repHead')));
  check((await p.$$('#repPie .legend li')).length === 4 && /Toplam\s*\$311/.test(await t('#repPie svg')), 'R donut with 4 categories, total $311');
  check((await p.$$('#repPat li')).length >= 3, 'R spending patterns listed');
  check(await p.isVisible('#repTrend svg'), 'R 8-week trend charts');
  await p.click('[data-act="weekGo"][data-d="-1"]'); await p.waitForTimeout(100);
  check(/12–18 Eki/.test(await t('#repLbl')), 'R previous-week navigation');
  const ov = await p.evaluate(() => [...document.querySelectorAll('#view *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.right > 400.5 || r.left < -0.5) && !el.closest('svg'); }).map((el) => el.className).slice(0, 5));
  check(ov.length === 0, 'R no horizontal overflow at 400px ' + ov.join(','));
  await p.evaluate(() => window.__adim.setLang('en')); await p.click('[data-act="weekGo"][data-d="1"]'); await p.waitForTimeout(100);
  const ov2 = await p.evaluate(() => [...document.querySelectorAll('#view .top-seg button')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent));
  check(ov2.length === 0, 'R EN segment labels fit ' + ov2.join(','));
  const miss = await p.evaluate(() => [...window.__adim.missing]); check(miss.length === 0, 'R EN strings ' + miss.join(' | '));
  check(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
