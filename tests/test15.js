// v1.8.1: on-screen keyboard — field stays above the keyboard, sheets lift, tabs hide (mocked Capacitor Keyboard events)
const { chromium } = require('playwright');
let fails = 0; const check = (ok, m) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 400, height: 800 }, timezoneId: 'Australia/Brisbane', locale: 'tr-TR', serviceWorkers: 'block' });
  await c.clock.setFixedTime(new Date('2026-10-21T12:00:00+10:00')); await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co/, (r) => r.fulfill({ status: 404, body: '' }));
  await c.addInitScript(() => { window.__kb = {}; window.Capacitor = { isNativePlatform: () => true, Plugins: { Keyboard: { addListener: (n, f) => { window.__kb[n] = f; return { remove() {} }; } }, LocalNotifications: { checkPermissions: async () => ({ display: 'granted' }), getPending: async () => ({ notifications: [] }), cancel: async () => {}, schedule: async () => {} } } }; });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8766/'); await p.waitForTimeout(200);
  await p.click('#tabs [data-tab="para"]'); await p.click('[data-act="paraSeg"][data-v="hafta"]'); await p.waitForTimeout(100);
  await p.focus('#dAmt'); await p.evaluate(() => window.__kb.keyboardDidShow({ keyboardHeight: 340 })); await p.waitForTimeout(700);
  const r = await p.evaluate(() => ({ kb: getComputedStyle(document.documentElement).getPropertyValue('--kb').trim(), open: document.documentElement.classList.contains('kb-open'), tabs: getComputedStyle(document.getElementById('tabs')).display, bot: document.getElementById('dAmt').getBoundingClientRect().bottom, ih: innerHeight }));
  check(r.kb === '340px' && r.open && r.tabs === 'none', 'K keyboard 340px → --kb set, tabs hidden: ' + JSON.stringify(r));
  check(r.bot <= r.ih - 340, 'K amount field sits above the keyboard (bottom ' + Math.round(r.bot) + ' ≤ ' + (r.ih - 340) + ')');
  await p.evaluate(() => window.__kb.keyboardDidHide()); await p.waitForTimeout(150);
  check(await p.evaluate(() => getComputedStyle(document.getElementById('tabs')).display !== 'none'), 'K tabs return after the keyboard hides');
  await p.click('#tabs [data-tab="bugun"]'); await p.click('#fab'); await p.click('[data-act="fabPick"][data-k="harcama"]'); await p.focus('#qAmt');
  await p.evaluate(() => window.__kb.keyboardDidShow({ keyboardHeight: 340 })); await p.waitForTimeout(700);
  const s = await p.evaluate(() => ({ sb: document.querySelector('.sheet').getBoundingClientRect().bottom, qb: document.getElementById('qAmt').getBoundingClientRect().bottom, ih: innerHeight }));
  check(s.sb <= s.ih - 339 && s.qb <= s.ih - 340, 'S quick-add sheet lifted above the keyboard: ' + JSON.stringify(s));
  check(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
