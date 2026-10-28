// Native (Capacitor) path: notifications scheduling with a stand-in LocalNotifications plugin; no service worker.
const { chromium } = require('playwright');
let fails = 0; const check = (ok, m) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 400, height: 860 }, timezoneId: 'Australia/Brisbane' });
  await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co/, (r) => r.fulfill({ status: 404, body: '' }));
  await c.addInitScript(() => {
    if (!localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify({ schemaVersion: 1, ui: { modules: { gelisim: true } } })); // v2.0: Gelişim reminders need the module on
    window.__sched = []; window.__swReg = 0;
    const orig = navigator.serviceWorker && navigator.serviceWorker.register; if (orig) navigator.serviceWorker.register = function () { window.__swReg++; return Promise.resolve(); };
    window.Capacitor = { isNativePlatform: () => true, registerPlugin: (n) => n === 'LocalNotifications' ? {
      requestPermissions: async () => ({ display: 'granted' }), getPending: async () => ({ notifications: window.__sched.map((x) => ({ id: x.id })) }),
      cancel: async () => { window.__sched = []; }, schedule: async (o) => { window.__sched = o.notifications; } } : null };
  });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8766/'); await p.waitForTimeout(300);
  await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="bildirim"]');
  check(!(await p.$('#notifWebNote')), 'N native: no "works in the Android app" note');
  for (const k of ['evening', 'weekly', 'bas']) { await p.click(`[data-act="notifToggle"][data-k="${k}"]`); await p.waitForTimeout(450); }
  await p.fill('[data-ntime="evening"]', '20:30'); await p.dispatchEvent('[data-ntime="evening"]', 'change'); await p.waitForTimeout(500);
  const s = await p.evaluate(() => window.__sched.map((n) => ({ id: n.id, on: n.schedule.on, at: n.schedule.at, body: n.body })));
  console.log('   scheduled: ' + JSON.stringify(s).slice(0, 600));
  const ev = s.find((n) => n.id === 101), wk = s.find((n) => n.id === 103), bas = s.filter((n) => n.id >= 200);
  check(ev && ev.on.hour === 20 && ev.on.minute === 30, 'N evening review scheduled daily 20:30');
  check(wk && wk.on.weekday === 1 && wk.on.hour === 19, 'N weekly entry Sunday 19:00');
  check(bas.length >= 6 && bas.every((n) => new Date(n.at) > new Date()), 'N BAS reminders 14 and 3 days before upcoming due dates (' + bas.length + ')');
  check(!s.find((n) => n.id === 102), 'N habit reminder off stays unscheduled');
  check((await p.evaluate(() => window.__swReg)) === 0, 'N service worker not registered inside Capacitor');
  check(errs.length === 0, 'no page errors ' + errs.join('|'));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); await b.close();
})();
