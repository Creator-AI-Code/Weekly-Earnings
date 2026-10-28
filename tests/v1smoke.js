const { chromium } = require('playwright');
const path = require('path'); const SP = path.resolve(__dirname, 'out');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const scheme of ['light']) {
    const c = await b.newContext({ viewport: { width: 400, height: 860 }, timezoneId: 'Australia/Brisbane', colorScheme: scheme, serviceWorkers: 'block' });
    await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co|finnhub|frankfurter/, (r) => r.fulfill({ status: 404, body: '' }));
    const data = { schemaVersion: 1, money: { settings: { salary: 105000, fixed: 7000, weeksPerYear: 48, cover: false, fuelDefault: 160, cashRate: 30, cashTax: false, recurring: [{ name: 'Kira', amount: 380 }, { name: 'Market', amount: 150 }] },
      weeks: { '2026-10-19': { start: '2026-10-19', uberEarn: 467, uberHours: 20, fuel: '', cashHours: '', extras: [], note: '', daily: [{ id: 'a', date: '2026-10-21', name: 'Shell', amount: 80, cat: 'yakit' }, { id: 'b', date: '2026-10-19', name: 'Dışarıda yemek', amount: 11.5, cat: 'yemek' }] },
               '2026-10-12': { start: '2026-10-12', uberEarn: 1061, uberHours: 24, fuel: 150, cashHours: '', extras: [{ name: 'PS5', amount: 700 }], note: '' } } },
      growth: { habits: [{ id: 'h1', name: "06:00'da kalk", band: 'sabah' }, { id: 'h2', name: '20 sayfa kitap oku', band: 'aksam' }, { id: 'h3', name: 'Çıraklık çalışması', band: 'is' }], log: {}, tasks: [{ id: 't1', text: 'Araba servisi', prio: 1, cat: 'kisisel', done: false }] } };
    await c.addInitScript((d) => { if (!localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify(d)); }, data);
    const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.setFixedTime(new Date('2026-10-21T19:10:00+10:00'));
    await p.goto('http://localhost:8766/'); await p.waitForTimeout(300);
    const shot = async (n) => { const h = await p.evaluate(() => document.documentElement.scrollHeight); await p.setViewportSize({ width: 400, height: h }); await p.screenshot({ path: path.join(SP, n) }); await p.setViewportSize({ width: 400, height: 860 }); };
    await shot('smoke-bugun.png');
    const c1 = await p.evaluate(() => { const c = window.__adim.calc(window.__adim.state.money.weeks['2026-10-19']); return { pocket: c.pocket, profit: c.uberNet, weekTax: c.weekTax, inc: c.incTax, mls: c.mlsTax, left: c.left, fuel: c.fuel }; });
    console.log(JSON.stringify(c1));
    const mig = await p.evaluate(() => JSON.stringify(window.__adim.state.money.weeks['2026-10-12']));
    console.log(mig);
    await p.click('#tabs [data-tab="para"]'); await p.click('[data-act="paraSeg"][data-v="hafta"]'); await p.waitForTimeout(150); await shot('smoke-hafta.png');
    await p.click('[data-act="paraSeg"][data-v="vergi"]'); await p.waitForTimeout(150); await shot('smoke-vergi.png');
    await p.click('[data-act="paraSeg"][data-v="gecmis"]'); await p.waitForTimeout(150); await shot('smoke-gecmis.png');
    console.log('sw', await p.evaluate(() => document.documentElement.scrollWidth));
  }
  console.log('errors', errs); await b.close();
})();
