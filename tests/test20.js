// v2.1: expense names saved as a category label follow the app language; tax bracket notes in Settings → Para
const { chromium } = require('playwright');
let fails = 0; const check = (ok, m) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 360, height: 780 }, timezoneId: 'Australia/Brisbane', locale: 'tr-TR', serviceWorkers: 'block' });
  await c.clock.setFixedTime(new Date('2026-10-22T09:30:00+10:00')); await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co/, (r) => r.fulfill({ status: 404, body: '' }));
  await c.addInitScript(() => { if (!localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify({ schemaVersion: 1, money: { settings: { salary: 90000, fixed: 7500, cover: false }, weeks: {
    '2026-10-19': { start: '2026-10-19', uberEarn: 300, uberHours: 6, daily: [{ id: 'a', date: '2026-10-22', cat: 'yemek', name: 'Yemek', amount: 20 }, { id: 'b', date: '2026-10-22', cat: 'kahve', name: 'Coffee', amount: 5 }, { id: 'c', date: '2026-10-22', cat: 'market', name: 'groceries', amount: 30 }, { id: 'd', date: '2026-10-22', cat: 'yemek', name: 'Nando’s', amount: 18 }, { id: 'e', date: '2026-10-22', cat: null, name: 'Expense', amount: 4 }], extras: [] } }, pots: [] } })); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8766/'); await p.waitForTimeout(200);
  const names = async () => { await p.click('#tabs [data-tab="para"]'); await p.waitForTimeout(80); const d = await p.$('[data-act="openDay"], [data-act="toggleDay"], .day'); if (!(await p.$('.dent')) && d) { await d.click(); await p.waitForTimeout(80); } return p.$$eval('.dent .dn b', (els) => els.map((e) => e.textContent.trim())); };
  let n = await names(); console.log('   TR', JSON.stringify(n));
  check(n.join('|') === ['Yemek', 'Kahve', 'Market', 'Nando’s', 'Harcama'].join('|') || ['Yemek', 'Kahve', 'Market', 'Nando’s', 'Harcama'].every((x) => n.includes(x)) && n.length === 5, 'L Turkish UI: category-named expenses all read in Turkish, own text untouched');
  await p.evaluate(() => window.__adim.setLang('en')); await p.waitForTimeout(100);
  n = await names(); console.log('   EN', JSON.stringify(n));
  check(['Food', 'Coffee', 'Groceries', 'Nando’s', 'Expense'].every((x) => n.includes(x)) && n.length === 5, 'L English UI: the same expenses all read in English');
  check((await p.evaluate(() => window.__adim.state.money.weeks['2026-10-19'].daily.map((x) => x.name).join('|'))) === 'Yemek|Coffee|groceries|Nando’s|Expense', 'L stored names are not rewritten');
  await p.evaluate(() => window.__adim.setLang('tr')); await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="para"]'); await p.waitForTimeout(100);
  const brk = await p.$$eval('#brkCard .brk', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim() + (e.classList.contains('on') ? ' *' : '')));
  console.log('   BRK', JSON.stringify(brk)); const notes = (await p.textContent('#brkCard .brk-n')).replace(/\s+/g, ' ');
  check(brk.length === 5 && brk.filter((x) => / \*$/.test(x)).length === 1 && /%30/.test(brk[2]) && / \*$/.test(brk[2]) && /%45/.test(brk[4]), 'T five brackets, the $90k salary marks the 30% one');
  check(/%30 gelir vergisi \+ %2 Medicare = %32/.test(notes) && /1\/11/.test(notes) && /\$105\.000/.test(notes), 'T notes: 32% on Uber profit, GST 1/11, MLS threshold');
  check((await p.evaluate(() => document.documentElement.scrollWidth)) <= 360 && !errs.length, 'T no overflow, no page errors ' + errs.join('|'));
  await p.screenshot({ path: require('path').join(__dirname, 'out', 'brackets.png') });
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
