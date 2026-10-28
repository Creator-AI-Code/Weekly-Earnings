// v1.9.2 (sadelik R0): no clipping at 360 px, BAS self-lodge dates in the settings copy, input borders ≥ 3:1
const { chromium } = require('playwright');
const fs = require('fs');
const SEED = require('./fixtures/sadelik-seed.json');
let fails = 0; const check = (ok, m) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const b = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const c = await b.newContext({ viewport: { width: 360, height: 780 }, colorScheme: scheme, timezoneId: 'Australia/Brisbane', locale: 'tr-TR', serviceWorkers: 'block' });
    await c.clock.setFixedTime(new Date('2026-10-28T17:40:00+10:00'));
    await c.route(/fonts\.|cdnjs|jsdelivr|supabase\.co|finnhub|frankfurter/, (r) => r.fulfill({ status: 404, body: '' }));
    await c.addInitScript((d) => { if (!localStorage.getItem('adim-adim-v2')) localStorage.setItem('adim-adim-v2', JSON.stringify(d)); }, SEED);
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8766/'); await p.waitForTimeout(200);
    // every button stays inside its card's inner edge (card = closest .card/.sec/.hero/.day-b/.sheet)
    const clipped = () => p.evaluate(() => [...document.querySelectorAll('#view button, #view .tile, #sheetRoot button')].filter((el) => {
      const r = el.getBoundingClientRect(); if (!r.width || el.closest('.seg.top-seg, .swipe-bg, .months-scroll, .tbl-wrap')) return false;
      const box = el.parentElement.closest('.card, .sec, .hero, .day-b, .sheet'); if (!box) return false;
      const br = box.getBoundingClientRect(), cs = getComputedStyle(box);
      return r.right > br.right - parseFloat(cs.paddingRight) + 0.5 || r.left < br.left + parseFloat(cs.paddingLeft) - 0.5;
    }).map((el) => (el.id || el.className) + ':' + el.textContent.trim().slice(0, 20)));
    // a name never breaks inside a word: its box is at least as wide as its longest word
    const midWord = (sel) => p.evaluate((s) => [...document.querySelectorAll(s)].filter((el) => {
      const words = el.textContent.trim().split(/\s+/), cs = getComputedStyle(el), m = document.createElement('span');
      m.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`; document.body.appendChild(m);
      const wide = Math.max(...words.map((w) => { m.textContent = w; return m.getBoundingClientRect().width; })); m.remove();
      return el.getBoundingClientRect().width + 0.5 < wide;
    }).map((el) => el.textContent.trim()), sel);
    await p.click('#tabs [data-tab="para"]'); await p.waitForTimeout(100);
    check(await p.isVisible('#dSave'), scheme + ' Hafta: today is open with the day form');
    let cl = await clipped(); check(cl.length === 0, scheme + ' Hafta at 360: no button past its card edge (Kaydet) ' + cl.join(' | '));
    await p.click('[data-act="paraSeg"][data-v="vergi"]'); await p.waitForTimeout(100);
    cl = await clipped(); check(cl.length === 0, scheme + ' Vergi at 360: hero tiles and buttons inside their cards ' + cl.join(' | '));
    const tile = await p.evaluate(() => { const t = document.getElementById('taxLeft').closest('.tile').getBoundingClientRect(), h = document.querySelector('#view .hero'), hr = h.getBoundingClientRect(); return t.right <= hr.right - parseFloat(getComputedStyle(h).paddingRight) + 0.5; });
    check(tile, scheme + ' Vergi hero "Kalan" tile fully inside the hero');
    const mw = await midWord('.hold.wrap .mid b'); check(mw.length === 0 && (await p.$$('.hold.wrap .mid b')).length >= 5, scheme + ' Uber giderleri: names never wrap mid-word ' + mw.join(' | '));
    const hd = await p.evaluate(() => [...document.querySelectorAll('#view .card-head h2')].filter((h) => h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent)); check(hd.length === 0, scheme + ' card titles not cut off ' + hd.join(' | '));
    await p.click('#tabs [data-tab="bugun"]'); await p.click('#fab'); await p.click('[data-act="fabPick"][data-k="harcama"]'); await p.waitForTimeout(80);
    cl = await clipped(); check(cl.length === 0, scheme + ' FAB spending form at 360: save button inside the card ' + cl.join(' | '));
    await p.click('#sheetRoot .sheet-head [data-act="closeOverlay"]'); await p.waitForTimeout(60);
    // input borders vs the card they sit on
    const br = await p.evaluate(() => { const lum = (s) => { const v = s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const cs = getComputedStyle(document.documentElement), get = (n) => { const d = document.createElement('div'); d.style.color = `var(${n})`; document.body.appendChild(d); const v = getComputedStyle(d).color; d.remove(); return v; };
      return Math.min(cr(get('--border'), get('--surface')), cr(get('--border'), get('--surface-2')), cr(get('--border'), get('--bg'))); });
    check(br >= 3, scheme + ' input border token ≥ 3:1 on surface, surface-2 and bg (' + br.toFixed(2) + ')');
    // BAS copy
    await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="vergi"]'); await p.waitForTimeout(80);
    const txt = await p.textContent('#pageRoot');
    check(/11 Kasım, 28 Şubat, 12 Mayıs ve 25 Ağustos/.test(txt) && !/28 Ekim|28 Nisan|28 Temmuz/.test(txt), scheme + ' TR settings: BAS dates 11 Kas / 28 Şub / 12 May / 25 Ağu');
    await p.evaluate(() => window.__adim.setLang('en')); await p.waitForTimeout(80);
    const en = await p.textContent('#pageRoot');
    check(/11 November, 28 February, 12 May and 25 August/.test(en) && !/28 October|28 April|28 July/.test(en), scheme + ' EN settings: BAS dates 11 Nov / 28 Feb / 12 May / 25 Aug');
    check([...(await p.evaluate(() => [...window.__adim.missing]))].length === 0, scheme + ' no missing EN strings');
    check(errs.length === 0, scheme + ' no page errors ' + errs.join(' | '));
    await c.close();
  }
  const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  check(!/28 Ekim|28 Nisan|28 Temmuz|28 October|28 April|28 July/.test(html), 'build: no wrong BAS dates anywhere in index.html');
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
