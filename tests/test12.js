// v1.6: Hesaplarım (balances, total, tax saver check, history) + tap-to-see chart values
const { chromium } = require('playwright');
let fails = 0; const check = (ok, m) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 400, height: 900 }, timezoneId: 'Australia/Brisbane', locale: 'tr-TR', serviceWorkers: 'block' });
  await c.clock.setFixedTime(new Date('2026-10-21T12:00:00+10:00')); await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co/, (r) => r.fulfill({ status: 404, body: '' }));
  await c.addInitScript(() => { if (!localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify({ schemaVersion: 1, money: { settings: { salary: 105000, fixed: 7500, cover: true }, weeks: {
    '2026-10-12': { start: '2026-10-12', uberEarn: 1061, uberHours: 24, daily: [{ id: 'a', date: '2026-10-13', name: 'Yakıt', cat: 'yakit', amount: 120 }], extras: [] },
    '2026-10-19': { start: '2026-10-19', uberEarn: 1183.92, uberHours: 19, daily: [{ id: 'b', date: '2026-10-19', name: 'Yakıt', cat: 'yakit', amount: 110 }], extras: [] } } } })); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const t = async (s) => ((await p.textContent(s)) || '').replace(/\s+/g, ' ');
  await p.goto('http://localhost:8766/'); await p.waitForTimeout(200);
  await p.click('#tabs [data-tab="para"]'); await p.click('[data-act="paraSeg"][data-v="kumbara"]'); await p.waitForTimeout(100);
  check(/Hesaplar/.test(await t('.top-seg')) && await p.isVisible('#accCard'), 'A "Hesaplar" tab shows the accounts card');
  const add = async (name, type, bal) => { await p.click('#newAccBtn'); await p.fill('#accName', name); await p.selectOption('#accType', type); await p.fill('#accBal', bal); await p.click('#accSave'); await p.waitForTimeout(120); };
  await add('CommBank Smart Access', 'main', '2.450,30'); await add('NetBank Saver', 'savings', '8.000'); await add('Business Saver', 'tax', '300');
  check(/\$10\.750,30/.test(await t('#accTotal')), 'A total = 2.450,30 + 8.000 + 300: ' + (await t('#accTotal')));
  { const num = (x) => +String(x).replace(/[^0-9,−-]/g, '').replace(/\./g, '').replace(',', '.').replace('−', '-');
    const tot = num(await t('#amTot dd')), gst = await p.isVisible('#amGst') ? num(await t('#amGst dd')) : 0, tax = num(await t('#amTax dd')), mine = num(await t('#amMine dd'));
    check(await p.isVisible('#accMine') && Math.abs(tot + gst + tax - mine) < 0.02 && tax < 0, 'M "Gerçekten senin olan" = total − GST − income tax share: ' + (await t('#accMine'))); }
  check(await p.isVisible('#accTax.short') && /eksik/.test(await t('#accTax')), 'T tax saver below this quarter\'s need → "eksik": ' + (await t('#accTax')));
  await c.clock.setFixedTime(new Date('2026-10-28T12:00:00+10:00'));
  await p.click('#accList [data-act="editAcc"] >> nth=1'); await p.fill('#accBal', '8.250'); await p.click('#accSave'); await p.waitForTimeout(120);
  const m = await p.evaluate(() => window.__adim.state.money.accounts[1]);
  check(m.bal === 8250 && m.log.length === 2 && m.d === '2026-10-28', 'H update keeps history (2 entries)');
  check(/▲\$250/.test(await t('#accList')), 'H change since last update shown ▲$250');
  await p.click('#accList [data-act="editAcc"] >> nth=1'); await p.waitForTimeout(80);
  check(await p.isVisible('#sheetRoot .chart'), 'H balance history chart in the sheet'); await p.click('[data-act="closeOverlay"]');
  // chart tips on Rapor
  await p.click('[data-act="paraSeg"][data-v="rapor"]'); await p.waitForTimeout(120);
  console.log('   lbl', await t('#repLbl'), 'trend?', await p.isVisible('#repTrend'), (await p.$$('circle.hit')).length);
  const hits = await p.$$('#repTrend circle.hit'); check(hits.length === 2, 'C one tap target per data point (' + hits.length + ')');
  await hits[1].click(); await p.waitForTimeout(80);
  check(await p.isVisible('#repTrend .chart-tip') && /19 Eki haftası: \$25,57\/sa/.test(await t('#repTrend .chart-tip')), 'C tapping a point shows the exact value: ' + (await t('#repTrend .chart-tip')));
  await p.click('#repTrend rect.hit >> nth=0'); await p.waitForTimeout(80);
  const tips = await p.$$eval('#repTrend .chart-tip', (a) => a.map((x) => (x.hidden ? '' : x.textContent)));
  check(tips.some((x) => /12 Eki haftası: \$120,00/.test(x)), 'C tapping a bar shows the week\'s spending: ' + tips.join(' | '));
  const ov = await p.evaluate(() => [...document.querySelectorAll('#view *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.right > 400.5 && !el.closest('svg') && !el.classList.contains('chart-tip'); }).map((el) => el.className).slice(0, 5));
  check(ov.length === 0, 'L no overflow ' + ov.join(','));
  await p.evaluate(() => window.__adim.setLang('en')); await p.click('[data-act="paraSeg"][data-v="kumbara"]'); await p.click('#newAccBtn'); await p.click('[data-act="closeOverlay"]');
  const miss = await p.evaluate(() => [...window.__adim.missing]); check(miss.length === 0, 'I EN ' + miss.join(' | '));
  check(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
