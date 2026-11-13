// v2.1: goal ring on the plan card — final values in the markup, fill + count-up animation, motivational line, confetti at 100%, reduced motion
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'out', 'goal-ring'); fs.mkdirSync(OUT, { recursive: true });
let fails = 0; const check = (ok, m) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
const seed = (uber) => ({ schemaVersion: 1, money: { settings: { salary: 105000, fixed: 7500, cover: true, logbookPct: 72, saveTarget: 1500, uberPlan: [{ wd: 6, part: 'gun', h: 6 }, { wd: 0, part: 'gun', h: 6 }], recurring: [{ name: 'Kira', amount: 380 }] }, weeks: {
  '2026-10-12': { start: '2026-10-12', uberEarn: 1183.92, uberHours: 25, daily: [], extras: [] },
  '2026-10-19': { start: '2026-10-19', uberEarn: uber, uberHours: uber / 50, daily: [{ id: 'a', date: '2026-10-19', cat: 'yemek', name: 'Yemek', amount: 60 }], extras: [] } }, pots: [] } });
(async () => {
  const b = await chromium.launch();
  const open = async (uber, opts) => {
    const c = await b.newContext(Object.assign({ viewport: { width: 360, height: 780 }, timezoneId: 'Australia/Brisbane', locale: 'tr-TR', serviceWorkers: 'block' }, opts || {}));
    await c.clock.setFixedTime(new Date('2026-10-22T09:30:00+10:00')); await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co/, (r) => r.fulfill({ status: 404, body: '' }));
    await c.addInitScript((d) => { if (!localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify(d)); }, seed(uber));
    const p = await c.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto('http://localhost:8766/'); return p;
  };
  const ring = (p) => p.evaluate(() => { const e = document.getElementById('goalRing'), a = e.querySelector('.gr-arc'); return { pc: +e.dataset.pc, off: parseFloat(getComputedStyle(a).strokeDashoffset), num: document.getElementById('goalPc').textContent, amt: document.getElementById('goalKeep').textContent, msg: document.getElementById('goalMsg').textContent, gold: e.classList.contains('gold'), conf: e.querySelectorAll('.confetti i').length, w: e.getBoundingClientRect().width, sw: document.documentElement.scrollWidth }; });
  // below target
  let p = await open(300); await p.waitForTimeout(120);
  let mid = await ring(p); await p.screenshot({ path: path.join(OUT, 'mid.png') });
  await p.waitForTimeout(1500); let r = await ring(p); await p.screenshot({ path: path.join(OUT, 'below.png') });
  console.log('   below', JSON.stringify(mid), JSON.stringify(r));
  check(r.pc > 0 && r.pc < 100 && mid.off > r.off + 1 && Math.abs(r.off - (100 - r.pc)) < 0.5, 'R ring animates from empty to its share: offset ' + mid.off.toFixed(1) + ' → ' + r.off.toFixed(1));
  check(r.num === '%' + r.pc && /^\$[\d.]+$/.test(r.amt) && /kaldı\./.test(r.msg) && !r.gold && r.conf === 0, 'R final numbers and a "to go" line, no confetti below 100%: ' + r.num + ' ' + r.amt + ' · ' + r.msg);
  check(/Bu tempoyla yılda \$/.test(await p.textContent('#planCard')) && r.sw <= 360, 'R yearly pace line shown, no horizontal overflow at 360px');
  // a re-render with the same numbers does not replay the animation
  await p.click('#tabs [data-tab="para"]'); await p.click('#tabs [data-tab="bugun"]'); await p.waitForTimeout(60);
  const again = await ring(p); check(Math.abs(again.off - r.off) < 0.5 && again.num === r.num, 'R coming back to Bugün keeps the ring still');
  check(!p.errs.length, 'R no page errors ' + p.errs.join('|')); await p.context().close();
  // goal reached
  p = await open(4000); await p.waitForTimeout(1700); r = await ring(p); await p.screenshot({ path: path.join(OUT, 'party.png') });
  check(r.pc === 100 && r.gold && r.conf === 18 && /Hedef tamam/.test(r.msg), 'G at 100% the ring turns gold with confetti: ' + r.msg);
  await p.click('#tabs [data-tab="para"]'); await p.click('#tabs [data-tab="bugun"]'); await p.waitForTimeout(60);
  check((await ring(p)).conf === 0, 'G confetti plays once, not on every visit'); check(!p.errs.length, 'G no page errors'); await p.context().close();
  // reduced motion: final state at once
  p = await open(300, { reducedMotion: 'reduce' }); await p.waitForTimeout(80); r = await ring(p);
  check(Math.abs(r.off - (100 - r.pc)) < 0.5 && r.num === '%' + r.pc, 'M reduced motion shows the final ring immediately'); await p.context().close();
  // English + dark
  p = await open(300, { colorScheme: 'dark' }); await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('adim-adim-v2')); d.ui = Object.assign(d.ui || {}, { lang: 'en' }); localStorage.setItem('adim-adim-v2', JSON.stringify(d)); });
  await p.reload(); await p.waitForTimeout(1500); await p.screenshot({ path: path.join(OUT, 'dark.png') });
  const en = await p.textContent('#planCard'); console.log('   EN', en.replace(/\s+/g, ' ').slice(0, 200));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
