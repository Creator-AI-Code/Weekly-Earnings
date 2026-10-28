// v1.9: weekly savings plan — target, Uber plan slots, pots with due dates, today's advice, Ask Claude summary
const { chromium } = require('playwright');
let fails = 0; const check = (ok, m) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 400, height: 900 }, timezoneId: 'Australia/Brisbane', locale: 'tr-TR', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
  await c.clock.setFixedTime(new Date('2026-10-22T09:30:00+10:00')); await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co/, (r) => r.fulfill({ status: 404, body: '' }));
  await c.addInitScript(() => { if (!localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify({ schemaVersion: 1, money: { settings: { salary: 105000, fixed: 7500, cover: true, logbookPct: 72, recurring: [{ name: 'Kira', amount: 380 }] }, weeks: {
    '2026-10-12': { start: '2026-10-12', uberEarn: 1183.92, uberHours: 25, daily: [{ id: 'f', date: '2026-10-13', cat: 'yakit', name: 'Yakıt', amount: 150 }], extras: [] },
    '2026-10-19': { start: '2026-10-19', uberEarn: 300, uberHours: 6, daily: [{ id: 'a', date: '2026-10-19', cat: 'yemek', name: 'Yemek', amount: 60 }, { id: 'b', date: '2026-10-20', cat: 'kahve', name: 'Kahve', amount: 5 }], extras: [] } }, pots: [] } })); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const t = async (s) => ((await p.textContent(s)) || '').replace(/\s+/g, ' ');
  await p.goto('http://localhost:8766/'); await p.waitForTimeout(200);
  check(!(await p.isVisible('#planCard')) && await p.isVisible('#planSetup'), 'O Bugün shows a goal setup card until a target is set');
  await p.fill('#goalAmt', '1.500'); await p.click('#goalSave'); await p.waitForTimeout(100);
  check(await p.isVisible('#planCard') && (await p.evaluate(() => window.__adim.state.money.settings.saveTarget)) === 1500 && await p.isVisible('#editGoal'), 'O goal set from the home screen → plan card with edit button');
  await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="para"]'); await p.waitForTimeout(80);
  await p.fill('#sSave', '1500'); await p.press('#sSave', 'Tab');
  for (const [wd, part, h] of [[3, 'sabah', 3], [4, 'sabah', 3], [5, 'aksam', 4], [6, 'gun', 6], [0, 'gun', 6]]) { await p.selectOption(`[data-uplan="${wd}"]`, part); await p.waitForTimeout(40); await p.fill(`[data-uplanh="${wd}"]`, String(h)); await p.press(`[data-uplanh="${wd}"]`, 'Tab'); }
  let s = await p.evaluate(() => window.__adim.state.money.settings);
  check(s.saveTarget === 1500 && s.uberPlan.length === 5 && s.uberPlan.find((x) => x.wd === 5).part === 'aksam' && s.uberPlan.find((x) => x.wd === 0).h === 6, 'S target 1500 + 5 weekly Uber slots saved');
  await p.click('[data-act="closeOverlay"]'); await p.click('[data-act="closeOverlay"]').catch(() => {});
  // pots with due dates
  await p.click('#tabs [data-tab="para"]'); await p.click('[data-act="paraSeg"][data-v="kumbara"]');
  const pot = async (n, tgt, due) => { await p.click('[data-act="newPot"] >> nth=0'); await p.fill('#potName', n); await p.fill('#potTarget', tgt); await p.fill('#potDue', due); await p.click('#potForm button[type=submit]'); await p.waitForTimeout(100); };
  await pot('Bond', '1140', '2026-10-26'); await pot('Sidney', '1000', '2026-11-05');
  check(/Son gün 26 Eki · haftada \$1\.140/.test(await t('[data-pot]:nth-of-type(1), .pot >> nth=0')) || /Son gün 26 Eki/.test(await t('#view')), 'P bond pot shows due date and weekly amount');
  await p.click('#tabs [data-tab="bugun"]'); await p.waitForTimeout(100);
  const pc = await t('#planCard'); console.log('   PC', pc.slice(200, 520));
  check(/Bu hafta hedef: \$1\.500 birikim/.test(pc) && /Bond: bu hafta \$1\.140 ayır/.test(pc) && /Sidney: bu hafta \$333 ayır/.test(pc), 'B plan card: target, Bond $1.140 this week, Sidney $333/week (3 weeks)');
  check(/Kalan Uber planı: Per sabah 3sa · Cum akşam 4sa · Cmt tüm gün 6sa · Paz tüm gün 6sa/.test(pc), 'B remaining Uber plan includes this Thursday morning (Wed already passed): ' + pc.slice(0, 260));
  check(/Bugün harcama yok/.test(await t('#advice')) && /eksik/.test(await t('#advice')), 'A no accounts: bond + Sidney + 1500 out of this week → red: ' + (await t('#advice')));
  // accounts cover the pots → they no longer eat this week's income
  await p.evaluate(() => { const m = window.__adim.state.money; m.accounts = [{ id: 'x', name: 'Smart Access', type: 'main', bal: 1838, d: '2026-10-22', log: [] }, { id: 'y', name: 'Saver', type: 'savings', bal: 2006, d: '2026-10-22', log: [] }]; window.__adim.saveNow(); }); await p.reload(); await p.waitForTimeout(200);
  check(/hesaplarındaki paradan karşılanıyor/.test(await t('#planCard')), 'A with $3.844 in accounts the pots are covered from balances: ' + (await t('#advice')));
  // goal start date
  await p.evaluate(() => { window.__adim.state.money.settings.saveFrom = '2026-11-09'; window.__adim.saveNow(); }); await p.reload(); await p.waitForTimeout(200);
  check(/Birikim hedefi 9 Kas haftası başlıyor/.test(await t('#planCard')) && !/Bugün harcama yok/.test(await t('#advice')), 'G before the start week there is no target to hit: ' + (await t('#advice')));
  await p.evaluate(() => { window.__adim.state.money.settings.saveFrom = ''; window.__adim.state.money.accounts = []; window.__adim.saveNow(); }); await p.reload(); await p.waitForTimeout(200);
  // pay bond → advice improves
  await p.evaluate(() => { const b0 = window.__adim.state.money.pots.find((x) => x.name === 'Bond'); b0.saved = 1140; b0.log.push({ d: '2026-10-22', a: 1140 }); window.__adim.saveNow(); }); await p.reload(); await p.waitForTimeout(200);
  const adv = await t('#advice'); check(!/Bond: bu hafta/.test(await t('#planCard')), 'A full bond pot drops out of this week\'s list (' + adv + ')');
  await p.click('#askClaude'); await p.waitForTimeout(150);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  check(/Momentum haftalık özet/.test(clip) && /Birikim hedefi: \$1\.500/.test(clip) && /Sidney \$0\/\$1\.000 \(son 2026-11-05\)/.test(clip), 'C "Claude’a sor" copies a weekly summary');
  const ov = await p.evaluate(() => [...document.querySelectorAll('#view *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.right > 400.5 && !el.closest('svg'); }).map((el) => el.className).slice(0, 5));
  check(ov.length === 0, 'L no overflow ' + ov.join(','));
  await p.evaluate(() => window.__adim.setLang('en')); await p.waitForTimeout(80); await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="para"]'); await p.waitForTimeout(80);
  const miss = await p.evaluate(() => [...window.__adim.missing]); check(miss.length === 0, 'I EN ' + miss.join(' | '));
  check(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
