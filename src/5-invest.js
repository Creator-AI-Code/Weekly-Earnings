// ===================== YATIRIM =====================
const FX_FALLBACK = 1.55;
const IV = () => D.invest;
const pKey = (sym) => 'US:' + sym;
function fxRate() { const f = IV().fx; return f && f.rate ? { r: f.rate, est: false } : { r: FX_FALLBACK, est: true }; }
function holdingView(h) {
  const fx = fxRate().r, cur = h.currency || (h.market === 'ASX' ? 'AUD' : 'USD'), toAud = cur === 'USD' ? fx : 1;
  let price = null, src = 'none', day = null, dayPct = null, at = null;
  if (h.market === 'US') {
    const q = IV().prices[pKey(h.symbol)];
    if (q && q.c) { price = q.c; day = q.d; dayPct = q.dp; at = q.at; src = Date.now() - (q.at || 0) > 20 * 3600e3 ? 'stale' : 'live'; }
    else if (h.manualPrice) { price = h.manualPrice; src = 'manual'; at = h.manualAt; }
  } else if (h.manualPrice) { price = h.manualPrice; src = 'manual'; at = h.manualAt; }
  const pr = price != null ? price : h.avgCost || 0;
  const value = (h.units || 0) * pr * toAud, cost = (h.units || 0) * (h.avgCost || 0) * toAud;
  return { h, cur, price, src: price == null ? 'cost' : src, at, value, cost, gain: value - cost, gainPct: cost ? (value - cost) / cost * 100 : null, dayAud: day != null ? day * (h.units || 0) * toAud : null, dayPct };
}
function portfolio() {
  const rows = IV().holdings.map(holdingView).sort((a, b) => b.value - a.value);
  const total = rows.reduce((a, r) => a + r.value, 0), cost = rows.reduce((a, r) => a + r.cost, 0);
  const dayRows = rows.filter((r) => r.dayAud != null), dayAud = dayRows.length ? dayRows.reduce((a, r) => a + r.dayAud, 0) : null;
  const prevBase = dayRows.reduce((a, r) => a + (r.value - r.dayAud), 0);
  return { rows, total, cost, gain: total - cost, gainPct: cost ? (total - cost) / cost * 100 : null, dayAud, dayPct: dayAud != null && prevBase ? dayAud / prevBase * 100 : null };
}
function nyseOpen() {
  try {
    const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
    const mins = (+p.hour % 24) * 60 + +p.minute; return !['Sat', 'Sun'].includes(p.weekday) && mins >= 570 && mins < 960;
  } catch (e) { return false; }
}
const usSymbols = () => [...new Set(IV().holdings.filter((h) => h.market === 'US').map((h) => h.symbol).concat(IV().watchlist.filter((w) => w.market === 'US').map((w) => w.symbol)))];
async function refreshPrices(force) {
  if (U.refreshing) return;
  const iv = IV(), syms = usSymbols();
  if (!force && Date.now() - (iv.lastRefresh || 0) < 15 * 60e3) return;
  if (!syms.length && !iv.holdings.length) return;
  U.refreshing = true; U.investMsg = null; U.investErr = false; if (U.tab === 'yatirim') render();
  const errs = [];
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=AUD', { cache: 'no-store' });
    if (!r.ok) throw new Error('fx ' + r.status);
    const j = await r.json(); if (j && j.rates && j.rates.AUD) iv.fx = { rate: j.rates.AUD, date: j.date || null, at: Date.now() };
  } catch (e) { errs.push(navigator.onLine === false ? 'offline' : 'fx'); }
  if (syms.length && !iv.finnhubKey) errs.push('nokey');
  else for (const s of syms) {
    try {
      const r = await fetch('https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(s) + '&token=' + encodeURIComponent(iv.finnhubKey), { cache: 'no-store' });
      if (r.status === 401 || r.status === 403) { errs.push('key'); break; }
      if (r.status === 429) { errs.push('rate'); break; }
      if (!r.ok) { errs.push('http'); continue; }
      const q = await r.json();
      if (!q || !q.c) { errs.push('sym:' + s); continue; }
      iv.prices[pKey(s)] = { c: q.c, d: q.d, dp: q.dp, pc: q.pc, t: q.t ? q.t * 1000 : null, at: Date.now() };
    } catch (e) { errs.push('offline'); break; }
  }
  iv.lastRefresh = Date.now(); U.refreshing = false; save();
  if (errs.length) {
    U.investErr = true;
    U.investMsg = errs.includes('offline') ? T('İnternete bağlanılamadı. Son kaydedilen fiyatlar gösteriliyor.')
      : errs.includes('key') ? T("Finnhub anahtarı geçersiz görünüyor. Ayarlar → Yatırım'dan kontrol et.")
      : errs.includes('rate') ? T("Finnhub istek sınırına ulaşıldı (dakikada 60). Bir dakika sonra Yenile'ye dokun.")
      : errs.includes('nokey') ? T("ABD fiyatları için Ayarlar → Yatırım'a ücretsiz Finnhub anahtarını gir. Döviz kuru yine de güncellendi.")
      : errs.some((x) => x.startsWith('sym:')) ? T('Fiyatı bulunamayan sembol: {x}.', { x: errs.filter((x) => x.startsWith('sym:')).map((x) => x.slice(4)).join(', ') })
      : errs.includes('fx') ? T('Döviz kuru alınamadı; son kaydedilen kur kullanılıyor.') : T('Bazı fiyatlar alınamadı; son kaydedilen fiyatlar gösteriliyor.');
  }
  render();
}
const hide = (s) => (D.ui.hideValues ? '••••' : s);
const money2 = (v, cur) => (cur === 'USD' ? 'US$' : '$') + nf2.format(v);
function srcLabel(r) {
  if (r.src === 'live') return '';
  if (r.src === 'stale') return `<span class="chip warn">${T('eski fiyat')} · ${dShort(keyOf(new Date(r.at)))}</span>`;
  if (r.src === 'manual') return `<span class="chip">${T('elle girildi')}${r.at ? ' · ' + dShort(r.at) : ''}</span>`;
  return `<span class="chip warn">${T('fiyat yok')}</span>`;
}
const mktName = (m) => (m === 'US' ? T('ABD') : 'ASX');
function vYatirim() {
  const iv = IV(), p = portfolio(), open = nyseOpen(), fx = fxRate(), hv = D.ui.hideValues;
  const last = iv.lastRefresh ? hhmm(iv.lastRefresh) : null;
  let html = `<section class="hero"><svg class="hero-deco" viewBox="0 0 210 210" aria-hidden="true"><circle cx="105" cy="105" r="96"/><circle cx="105" cy="105" r="74"/><circle cx="105" cy="105" r="52"/></svg>
    <div class="hero-row" style="justify-content:space-between"><div class="big"><span class="k">${T('Toplam değer (AUD)')}</span><span class="v" id="ivTotal">${hide(usd(p.total))}</span></div>
      <button type="button" class="iconbtn" data-act="toggleHide" aria-label="${hv ? T('Tutarları göster') : T('Tutarları gizle')}" aria-pressed="${hv}">${ico(hv ? 'eyeoff' : 'eye')}</button></div>
    <div class="tiles"><div class="tile"><span class="k">${T('Bugün')}</span><span class="v ${p.dayAud == null ? '' : p.dayAud >= 0 ? 'up' : 'down'}" id="ivDay">${p.dayAud == null ? '–' : hv ? '••••' : `${ico(p.dayAud >= 0 ? 'up' : 'down')} ${sgn(p.dayAud, (v) => '$' + nf2.format(v))}`}</span><span class="u">${p.dayPct != null ? sgn(p.dayPct, (v) => pct(nf2.format(v))) + ' · ' + T('ABD hisseleri') : T('ABD fiyatı gerekli')}</span></div>
      <div class="tile"><span class="k">${T('Toplam kazanç')}</span><span class="v ${p.gain >= 0 ? 'up' : 'down'}" id="ivGain">${!iv.holdings.length ? '–' : hv ? '••••' : `${ico(p.gain >= 0 ? 'up' : 'down')} ${sgn(p.gain, (v) => '$' + nf0.format(v))}`}</span><span class="u">${p.gainPct != null ? sgn(p.gainPct, (v) => pct(nf1.format(v))) + ' · ' + T('maliyet {x}', { x: hide(usd(p.cost)) }) : T('maliyete göre')}</span></div></div>
    <div class="hero-row"><span class="chip">${open ? T('ABD piyasası açık') : T('ABD piyasası kapalı')}</span><span class="chip" id="ivUpdated">${last ? T('Son güncelleme {t}', { t: last }) : T('Henüz güncellenmedi')}</span><span class="chip">${fx.est ? T('Tahmini kur {x}', { x: nf2.format(fx.r) }) : 'USD/AUD ' + nf4.format(fx.r)}</span>
      <button type="button" class="btn sm" data-act="refresh" id="refreshBtn" style="margin-left:auto;background:var(--hero-tile);border-color:var(--hero-tile);color:var(--hero-ink)" ${U.refreshing ? 'disabled' : ''}>${ico('refresh')}${U.refreshing ? T('Yenileniyor…') : T('Yenile')}</button></div></section>`;
  if (U.investMsg) html += `<div class="status-msg ${U.investErr ? 'err' : ''}" id="investMsg">${esc(U.investMsg)}</div>`;
  if (!iv.finnhubKey && usSymbols().length) html += `<div class="card tight row"><span class="ico">${ico('key')}</span><span style="flex:1;font-size:0.88rem">${T('ABD hisselerinin güncel fiyatı için ücretsiz bir Finnhub anahtarı gerekli.')}</span><button type="button" class="link" data-act="openSettings" data-focus="sKey">${T('Ayarlar')}</button></div>`;
  html += `<section class="card">${head('trend', T('Varlıklar'), `<button type="button" class="btn sm" data-act="newHolding">${ico('plus')}${T('Ekle')}</button>`)}
    ${p.rows.length ? `<div class="list" id="holdList">${p.rows.map((r) => `<button type="button" class="hold" data-act="editHolding" data-id="${r.h.id}"><span class="sym">${esc(r.h.symbol.slice(0, 5))}</span><span class="mid"><b>${esc(r.h.symbol)} <span class="chip" style="font-size:0.66rem;vertical-align:1px">${mktName(r.h.market)}</span></b><span>${T('{n} adet', { n: nf4.format(r.h.units) })} × ${r.price != null ? money2(r.price, r.cur) : T('maliyet {x}', { x: money2(r.h.avgCost || 0, r.cur) })}</span></span>
        <span class="rt"><b>${hide(usd(r.value))}</b>${r.dayPct != null && r.src !== 'stale' ? `<span>${delta(r.dayPct, sgn(r.dayPct, (v) => pct(nf2.format(v))))}</span>` : `<span>${srcLabel(r)}</span>`}</span></button>`).join('')}</div>
      <p class="note">${T("Değerler AUD cinsindendir. ABD fiyatları Finnhub'dan gelir (15 dakika gecikmeli olabilir); ASX için son fiyatı elle girersin. Kazanç bugünkü kurla hesaplanır.")}</p>`
    : empty('invest', T('Henüz varlık yok'), T("Stake'ten dışa aktardığın işlem dosyasını yükle ya da hisseyi elle ekle."), `<button type="button" class="btn sm" data-act="newHolding">${ico('plus')}${T('Elle ekle')}</button>`)}</section>`;
  html += `<section class="card">${head('eye', T('Takip listesi'))}
    ${iv.watchlist.length ? `<div class="list">${iv.watchlist.map((w, i) => { const q = w.market === 'US' ? iv.prices[pKey(w.symbol)] : null;
      return `<div class="hold"><span class="sym">${esc(w.symbol.slice(0, 5))}</span><span class="mid"><b>${esc(w.symbol)} <span class="chip" style="font-size:0.66rem">${mktName(w.market)}</span></b><span>${q && q.c ? 'US$' + nf2.format(q.c) : w.market === 'ASX' ? T('ASX fiyatı otomatik alınamıyor') : T('fiyat bekleniyor')}</span></span><span class="rt">${q && q.dp != null ? delta(q.dp, sgn(q.dp, (v) => pct(nf2.format(v)))) : ''}</span><button type="button" class="del" data-act="delWatch" data-i="${i}" aria-label="${esc(T('{x} takipten çıkar', { x: w.symbol }))}">${ico('x')}</button></div>`; }).join('')}</div>` : `<p class="note" style="margin-top:0">${T('Almayı düşündüğün hisseleri buraya ekle; fiyatlarını ve günlük değişimlerini görürsün.')}</p>`}
    <form class="row" id="watchForm" style="margin-top:10px"><input class="txt" id="watchSym" placeholder="${T('Sembol (ör. MSFT)')}" autocomplete="off" autocapitalize="characters" aria-label="${T('Takip edilecek sembol')}"><div class="seg inline" role="group" aria-label="${T('Piyasa')}"><button type="button" data-act="watchMkt" data-v="US" aria-pressed="${(U.watchMkt || 'US') === 'US'}">${T('ABD')}</button><button type="button" data-act="watchMkt" data-v="ASX" aria-pressed="${U.watchMkt === 'ASX'}">ASX</button></div><button class="btn sm" type="submit" aria-label="${T('Takibe ekle')}">${ico('plus')}</button></form></section>`;
  html += `<section class="card import-box">${head('upload', T("Stake'ten içe aktar"))}
    <p class="note" style="margin:0">${T('Stake uygulamasında işlem geçmişini (ABD ve ASX) XLSX ya da CSV olarak dışa aktar, sonra buradan seç. Dosya telefonunda okunur, hiçbir yere gönderilmez.')}</p>
    <label class="btn filebtn">${ico('upload')}${T('XLSX ya da CSV seç')}<input type="file" id="stakeFile" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="${T('Stake dosyası seç')}"></label>
    <div id="impBox">${impPreview()}</div>
    <p class="note" style="margin:0">${T("Neden doğrudan giriş yok? Stake'in herkese açık bir API'si yok. Şifreni ya da oturum anahtarını bir uygulamaya vermek hesabını riske atar; bu yüzden sadece dışa aktardığın dosyayı okuyoruz.")}</p></section>`;
  return html;
}

// ---------- Stake XLSX / CSV import ----------
const FIELDS = [
  ['symbol', 'Sembol', /^(symbol|ticker|code|stock code|asx code|security code|instrument code|sembol|instrument)$|symbol|ticker|\bcode\b/i],
  ['units', 'Adet', /units|quantity|qty|shares|no\.? of|adet|volume/i],
  ['price', 'Fiyat', /effective price|avg|average|unit price|price|fiyat/i],
  ['value', 'Tutar', /value|amount|consideration|total|tutar|cost/i],
  ['side', 'Yön (al/sat)', /\bside\b|\btype\b|action|direction|buy\s*\/\s*sell|transaction|order type|trade type|işlem/i],
  ['date', 'Tarih', /date|time|tarih/i],
  ['market', 'Piyasa', /market|exchange|borsa/i],
  ['currency', 'Para birimi', /currency|ccy|döviz/i]
];
function numLoose(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = String(v == null ? '' : v).trim(); if (!s) return null;
  let neg = false; if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/[A-Za-z$€£\s]/g, '');
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
  if (/,\d{1,2}$/.test(s) && !/\.\d/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
  const n = parseFloat(s); return isFinite(n) ? (neg ? -n : n) : null;
}
function detectHeader(rows) {
  let best = -1, bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const score = rows[i].filter((c) => { const t = String(c || '').trim(); return t && t.length < 40 && FIELDS.some((f) => f[2].test(t)); }).length;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return bestScore >= 2 ? best : -1;
}
function autoMap(headers) {
  const map = {}, used = new Set();
  const pick = (key, re, prefer) => {
    let idx = -1;
    if (prefer) idx = headers.findIndex((h, i) => !used.has(i) && prefer.test(h));
    if (idx < 0) idx = headers.findIndex((h, i) => !used.has(i) && re.test(h));
    if (idx >= 0) { map[key] = idx; used.add(idx); }
  };
  FIELDS.forEach(([k, , re]) => {
    if (k === 'symbol') pick(k, re, /^(symbol|ticker|code)$/i);
    else if (k === 'price') pick(k, re, /effective|avg|average/i);
    else if (k === 'value') pick(k, re, /value|amount/i);
    else if (k === 'side') pick(k, re, /\bside\b|buy\s*\/\s*sell|action|direction/i);
    else pick(k, re);
  });
  return map;
}
function sheetFrom(name, rows) {
  rows = rows.map((r) => r.map((c) => (c == null ? '' : c)));
  const hi = detectHeader(rows);
  const headers = (hi >= 0 ? rows[hi] : (rows[0] || [])).map((h, i) => String(h || '').trim() || T('Sütun {n}', { n: i + 1 }));
  const body = rows.slice(hi >= 0 ? hi + 1 : 1).filter((r) => r.some((c) => String(c).trim() !== ''));
  return { name, headers, rows: body, map: autoMap(headers), detected: hi >= 0 };
}
const sheetOk = (sh) => sh.map.symbol != null && sh.map.units != null && (sh.map.price != null || sh.map.value != null);
function marketOf(sh, r, sym) {
  const mk = sh.map.market != null ? String(r[sh.map.market] || '') : '', cc = sh.map.currency != null ? String(r[sh.map.currency] || '') : '';
  if (/asx|\bau\b|australia/i.test(mk)) return 'ASX'; if (/nyse|nasdaq|\bus\b|amex|arca|bats|america/i.test(mk)) return 'US';
  if (/aud/i.test(cc)) return 'ASX'; if (/usd/i.test(cc)) return 'US';
  if (/\.ax$/i.test(sym)) return 'ASX';
  if (/asx|\bau\b|aus/i.test(sh.name)) return 'ASX'; if (/\bus\b|wall|usa|nyse|nasdaq/i.test(sh.name)) return 'US';
  return 'US';
}
function aggregate(sheets) {
  const trades = [], skipped = { rows: 0 };
  sheets.forEach((sh) => {
    if (!sheetOk(sh)) return;
    sh.rows.forEach((r) => {
      let sym = String(r[sh.map.symbol] || '').trim().toUpperCase(); if (!sym || sym.length > 12 || /total|toplam/i.test(sym)) { skipped.rows++; return; }
      let units = numLoose(r[sh.map.units]); if (units == null || units === 0) { skipped.rows++; return; }
      let price = sh.map.price != null ? numLoose(r[sh.map.price]) : null; const value = sh.map.value != null ? numLoose(r[sh.map.value]) : null;
      if ((price == null || price === 0) && value != null) price = Math.abs(value / units);
      if (price == null) { skipped.rows++; return; }
      let side = 'buy';
      if (sh.map.side != null) { const sv = String(r[sh.map.side] || '').trim(); if (/sell|sold|^s$|^sat(ış|is)?$/i.test(sv)) side = 'sell'; else if (/buy|bought|^b$|^al(ış|is)?$/i.test(sv)) side = 'buy'; else { skipped.rows++; return; } }
      if (units < 0) { side = 'sell'; units = -units; }
      const market = marketOf(sh, r, sym); sym = sym.replace(/\.AX$/i, '');
      const dv = sh.map.date != null ? r[sh.map.date] : ''; const t = dv instanceof Date ? dv.getTime() : Date.parse(String(dv || '').replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1'));
      trades.push({ sym, market, side, units, price: Math.abs(price), t: isFinite(t) ? t : null, i: trades.length });
    });
  });
  trades.sort((a, b) => (a.t != null && b.t != null ? a.t - b.t : 0) || a.i - b.i);
  const H = {};
  trades.forEach((tr) => {
    const k = tr.market + ':' + tr.sym, h = H[k] || (H[k] = { symbol: tr.sym, market: tr.market, units: 0, cost: 0, n: 0 });
    h.n++;
    if (tr.side === 'buy') { h.cost += tr.units * tr.price; h.units += tr.units; }
    else { const avg = h.units ? h.cost / h.units : 0; h.units = Math.max(0, h.units - tr.units); h.cost = avg * h.units; }
  });
  const list = Object.values(H).map((h) => ({ symbol: h.symbol, market: h.market, units: Math.round(h.units * 1e6) / 1e6, avgCost: h.units ? h.cost / h.units : 0, n: h.n }));
  return { list: list.sort((a, b) => a.market.localeCompare(b.market) || a.symbol.localeCompare(b.symbol)), trades: trades.length, skipped: skipped.rows };
}
async function readStakeFile(f) {
  U.imp = { busy: true, name: f.name }; render();
  try {
    let sheets = [];
    if (/\.csv$/i.test(f.name) || /csv|text\/plain/.test(f.type || '')) {
      const text = (await f.text()).replace(/^﻿/, '');
      sheets = [sheetFrom(f.name.replace(/\.csv$/i, ''), parseCSV(text, sniffDelim(text)))];
    } else {
      let X; try { X = await loadScript(XLSX_URL, 'XLSX'); } catch (e) { U.imp = { err: T('Excel okuyucu yüklenemedi (internet gerekli). Dosyayı CSV olarak dışa aktarıp tekrar dene.') }; render(); return; }
      const wb = X.read(new Uint8Array(await f.arrayBuffer()), { type: 'array', cellDates: true });
      sheets = wb.SheetNames.map((n) => sheetFrom(n, X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }))).filter((s) => s.rows.length);
    }
    if (!sheets.length) { U.imp = { err: T('Dosyada okunabilir satır bulunamadı.') }; render(); return; }
    U.imp = { name: f.name, sheets }; render();
  } catch (e) { U.imp = { err: T("Dosya okunamadı. Stake'ten aldığın XLSX ya da CSV dosyasını seçtiğinden emin ol.") }; render(); }
}
function impPreview() {
  const I = U.imp; if (!I) return '';
  if (I.busy) return `<div class="status-msg">${T('Dosya okunuyor…')}</div>`;
  if (I.err) return `<div class="status-msg err">${esc(I.err)}</div>`;
  if (I.done) return `<div class="status-msg">${esc(T(I.done.k, I.done.v))}</div>`;
  const agg = aggregate(I.sheets);
  const sheetInfo = I.sheets.map((sh, si) => {
    const ok = sheetOk(sh), names = (k) => (sh.map[k] != null ? esc(sh.headers[sh.map[k]]) : '—');
    return `<div class="stack" style="gap:6px"><div style="font-size:0.84rem"><b>${esc(sh.name)}</b> · ${T('{n} satır', { n: sh.rows.length })} ${ok ? `<span class="chip gain">${T('sütunlar bulundu')}</span>` : `<span class="chip warn">${T('sütunları seç')}</span>`}</div>
      ${ok ? `<div class="note" style="margin:0">${T('Sembol')}: ${names('symbol')} · ${T('Adet')}: ${names('units')} · ${T('Fiyat')}: ${names('price')}${sh.map.value != null ? ' · ' + T('Tutar') + ': ' + names('value') : ''} · ${T('Yön')}: ${names('side')} · ${T('Tarih')}: ${names('date')}</div>` : `<div class="note" style="margin:0">${T('Bulunan başlıklar')}: ${sh.headers.map(esc).join(', ')}</div>`}
      <details class="fold" ${ok ? '' : 'open'}><summary>${ok ? T('Sütunları düzelt') : T('Sütunları seç')}</summary><div class="mapgrid">${FIELDS.slice(0, 6).map(([k, l]) => `<label>${T(l)}<select class="txt" data-map="${k}" data-sheet="${si}"><option value="">—</option>${sh.headers.map((h, i) => `<option value="${i}" ${sh.map[k] === i ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></label>`).join('')}</div></details></div>`;
  }).join('');
  return `<div class="stack"><div class="card-title" style="font-size:0.95rem">${T('Önizleme')} · ${esc(I.name)}</div>${sheetInfo}
    ${agg.list.length ? `<div class="tbl-wrap"><table class="prev" id="impTable"><thead><tr><th>${T('Sembol')}</th><th>${T('Piyasa')}</th><th>${T('Adet')}</th><th>${T('Ort. maliyet')}</th><th>${T('İşlem')}</th></tr></thead><tbody>${agg.list.map((h) => `<tr><td>${esc(h.symbol)}</td><td>${mktName(h.market)}</td><td>${h.units ? nf4.format(h.units) : T('satıldı')}</td><td>${h.units ? money2(h.avgCost, h.market === 'US' ? 'USD' : 'AUD') : '–'}</td><td>${h.n}</td></tr>`).join('')}</tbody></table></div>
      <p class="note" style="margin:0">${T('{n} işlem okundu.', { n: agg.trades })}${agg.skipped ? ' ' + T('{n} satır atlandı (temettü, para yatırma ya da boş satır).', { n: agg.skipped }) : ''} ${T('Aynı sembol zaten varsa adet ve maliyeti bu dosyadakiyle değişir; elle girdiğin son fiyat korunur.')}</p>` : `<div class="status-msg err">${T('Bu sütunlarla hiç işlem bulunamadı. Sembol, adet ve fiyat sütunlarını seç.')}</div>`}
    <div class="btns"><button type="button" class="btn" data-act="impConfirm" id="impConfirm" ${agg.list.length ? '' : 'disabled'}>${ico('check')}${T('İçe aktar')}</button><button type="button" class="btn ghost" data-act="impCancel">${T('Vazgeç')}</button></div></div>`;
}
function impApply() {
  const agg = aggregate(U.imp.sheets); let add = 0, upd = 0, rem = 0;
  agg.list.forEach((a) => {
    const i = IV().holdings.findIndex((h) => h.symbol === a.symbol && h.market === a.market);
    if (!a.units) { if (i >= 0) { IV().holdings.splice(i, 1); rem++; } return; }
    const base = { symbol: a.symbol, market: a.market, units: a.units, avgCost: Math.round(a.avgCost * 10000) / 10000, currency: a.market === 'US' ? 'USD' : 'AUD' };
    if (i >= 0) { Object.assign(IV().holdings[i], base); upd++; } else { IV().holdings.push(Object.assign({ id: uid() }, base)); add++; }
  });
  save();
  U.imp = { done: rem ? { k: 'İçe aktarıldı: {a} yeni, {u} güncellendi, satılmış {r} varlık kaldırıldı.', v: { a: add, u: upd, r: rem } } : { k: 'İçe aktarıldı: {a} yeni, {u} güncellendi.', v: { a: add, u: upd } } };
  refreshPrices(true);
}
