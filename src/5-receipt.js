// ===================== FİŞ TARA (receipt scan → OCR → expense + photo in Supabase Storage) =====================
// Android app: ML Kit document scanner + on-device text recognition. Web: camera/file photo, amounts typed by hand.
// Photos are compressed (~1600 px JPEG) and kept in IndexedDB first, then uploaded to the private 'receipts' bucket
// under <user id>/; an expense refers to its photo by `rc` (the storage path without the user folder).
const FUEL_BRANDS = /\b(shell|bp|ampol|caltex|7[- ]?eleven|united|puma|liberty|metro|mobil|costco fuel|coles express|reddy express|eg (?:fuel|group|ampol)|astron|vibe|speedway|freedom fuels?|on the run|otr)\b/i;
const FUEL_WORDS = /\b(unleaded|diesel|e10|u91|u95|u98|ulp|pulp|vortex|v-power|premium 9[58]|litres?|ltrs?|\/l\b|fuel)\b/i;
const AMT = /(?:\$\s?)?(\d{1,4}(?:[,.]\d{3})*[.,]\d{2})(?!\d)/g;
const toAmt = (s) => { const t = s.replace(/[$\s]/g, ''); const m = /^(\d{1,4}(?:[,.]\d{3})*)[.,](\d{2})$/.exec(t); return m ? +(m[1].replace(/[,.]/g, '') + '.' + m[2]) : null; };
const MON3 = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function parseReceipt(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean), all = lines.join('\n');
  const amtsIn = (l) => [...l.matchAll(AMT)].map((m) => toAmt(m[1])).filter((v) => v != null);
  // total: the amount on (or right after) a TOTAL / AMOUNT DUE / EFTPOS line; "subtotal" lines don't count
  let total = null;
  for (let i = 0; i < lines.length && total == null; i++) {
    const l = lines[i];
    if (/\b(grand\s+)?total\b|amount\s+(due|paid)|balance\s+due|\beftpos\b|\bpurchase\b|\bcredit\b|\bdebit\b|\bvisa\b|\bmastercard\b|\bpaid\b/i.test(l) && !/sub\s*-?\s*total|gst|tax\s+invoice|change|rounding|cash\s*out|tip/i.test(l)) {
      const a = amtsIn(l); if (a.length) total = a[a.length - 1]; else if (lines[i + 1]) { const b = amtsIn(lines[i + 1]); if (b.length) total = b[0]; }
    }
  }
  const every = lines.flatMap(amtsIn).filter((v) => v > 0 && v < 5000);
  if (total == null && every.length) total = Math.max(...every);
  // GST: "GST $6.18", "Includes GST 6.18", "GST included 6.18", "TOTAL INCLUDES GST OF $6.18"
  let gst = null;
  lines.forEach((l, i) => { if (gst == null && /\bgst\b/i.test(l) && !/abn|reg(istered|\.)?\s*for\s*gst|gst\s*(free|exempt)/i.test(l)) { const a = amtsIn(l); if (a.length) gst = a[a.length - 1]; else if (lines[i + 1]) { const b = amtsIn(lines[i + 1]); if (b.length) gst = b[0]; } } });
  if (gst != null && total != null && (gst <= 0 || gst > total / 10 + 0.05)) gst = null; // GST is 1/11 of a fully taxable total, never more
  // date: 21/10/2026, 21-10-26, 21.10.2026, 2026-10-21, 21 Oct 2026, 21OCT26
  let date = null; const now = new Date();
  const ok = (y, m, d) => { if (y < 100) y += 2000; const dt = new Date(y, m - 1, d); return dt.getMonth() === m - 1 && dt.getDate() === d && y >= 2020 && dt <= addDays(now, 2) ? idOf(dt) : null; };
  let m = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(all); if (m) date = ok(+m[1], +m[2], +m[3]);
  if (!date) for (const x of all.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g)) { date = ok(+x[3], +x[2], +x[1]); if (date) break; }
  if (!date) { m = /\b(\d{1,2})\s*-?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*-?\s*(\d{2,4})\b/i.exec(all); if (m) date = ok(+m[3], MON3[m[2].toLowerCase()], +m[1]); }
  // merchant: a known brand, else the first line that looks like a name
  const brand = FUEL_BRANDS.exec(all) || /\b(woolworths|coles|aldi|iga|bunnings|officeworks|kmart|target|big w|jb hi-?fi|mcdonald'?s|kfc|hungry jack'?s|subway|guzman|starbucks|gloria jean'?s|chemist warehouse|supercheap auto|repco|autobarn|ultra tune|mycar|bob jane|kmart tyre)\b/i.exec(all);
  const nameLine = lines.find((l) => /[a-z]{3,}/i.test(l) && !/tax\s+invoice|receipt|abn|phone|ph:|tel|www\.|@|\d{4,}/i.test(l) && l.length <= 40);
  const merchant = brand ? brand[0].replace(/\b\w/g, (c) => c.toUpperCase()) : nameLine ? nameLine.replace(/\s{2,}/g, ' ') : '';
  const isFuel = !!(FUEL_BRANDS.test(all) && FUEL_WORDS.test(all)) || /\b(unleaded|diesel|e10|u91|u95|u98|litres?)\b/i.test(all);
  const lm = /(\d{1,3}[.,]\d{1,3})\s*(?:l\b|ltrs?|litres?)/i.exec(all), litres = lm ? +lm[1].replace(',', '.') : null;
  return { total, gst, date, merchant, isFuel, litres, hasText: lines.length > 0 };
}

// ---------- local photo store (IndexedDB) ----------
let rcDbP = null;
function rcDb() {
  if (!rcDbP) rcDbP = new Promise((res, rej) => { try { const r = indexedDB.open('momentum-receipts', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
  return rcDbP;
}
async function rcPut(path, rec) { const db = await rcDb(); return new Promise((res, rej) => { const t = db.transaction('img', 'readwrite'); t.objectStore('img').put(rec, path); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
async function rcGet(path) { const db = await rcDb(); return new Promise((res) => { const q = db.transaction('img').objectStore('img').get(path); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
async function rcPending() { const db = await rcDb(); return new Promise((res) => { const out = [], q = db.transaction('img').objectStore('img').openCursor(); q.onsuccess = () => { const c = q.result; if (!c) { res(out); return; } if (!c.value.up) out.push(c.key); c.continue(); }; q.onerror = () => res(out); }); }

// ---------- image → compressed JPEG ----------
async function compressImage(blob) {
  const bmp = await createImageBitmap(blob), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height); if (bmp.close) bmp.close();
  return new Promise((res) => cv.toBlob((b) => res(b || blob), 'image/jpeg', 0.72));
}

// ---------- Supabase Storage ----------
const rcFull = (path) => SY.session.user.id + '/' + path;
async function rcUpload(path) {
  if (!SY.session) return false; const r = await rcGet(path); if (!r || r.up) return !!r;
  await ensureFresh();
  const res = await fetch(SB_URL + '/storage/v1/object/receipts/' + rcFull(path), { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SY.session.access_token, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: r.blob });
  if (!res.ok) throw new Error('upload ' + res.status);
  r.up = true; await rcPut(path, r); return true;
}
let rcFlushing = false;
async function rcFlush() {
  if (rcFlushing || !SY.session || !navigator.onLine) return; rcFlushing = true;
  try { for (const p of await rcPending()) { try { await rcUpload(p); } catch (e) { break; } } } catch (e) {} finally { rcFlushing = false; }
}
const rcUrls = {};
async function rcUrl(path) {
  if (rcUrls[path]) return rcUrls[path];
  let r = null; try { r = await rcGet(path); } catch (e) {}
  if (!r && SY.session) {
    try { await ensureFresh(); const res = await fetch(SB_URL + '/storage/v1/object/authenticated/receipts/' + rcFull(path), { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SY.session.access_token } });
      if (res.ok) { r = { blob: await res.blob(), up: true }; rcPut(path, r).catch(() => {}); } } catch (e) {}
  }
  return r ? (rcUrls[path] = URL.createObjectURL(r.blob)) : null;
}
async function rcDelete(path) {
  try { const db = await rcDb(); db.transaction('img', 'readwrite').objectStore('img').delete(path); } catch (e) {}
  if (SY.session) try { await rest('DELETE', '/storage/v1/object/receipts/' + rcFull(path)); } catch (e) {}
}

// ---------- scan flow ----------
async function scanReceipt() {
  let blob = null, text = '';
  if (isNative() && capPlugin('DocumentScanner')) {
    try {
      const r = await capPlugin('DocumentScanner').scanDocument({ pageLimit: 1, resultFormats: 'JPEG', scannerMode: 'FULL', galleryImportAllowed: true });
      const uri = r && r.scannedImages && r.scannedImages[0]; if (!uri) return;
      try { const tr = await capPlugin('TextRecognition').processImage({ path: uri }); text = (tr && tr.text) || ''; } catch (e) { text = ''; }
      blob = await (await fetch(window.Capacitor.convertFileSrc ? window.Capacitor.convertFileSrc(uri) : uri)).blob();
    } catch (e) { if (/cancel/i.test(String(e && (e.message || e)))) return; toast(T('Tarayıcı açılamadı, fotoğraf seç.')); blob = null; }
  }
  if (!blob) { const f = await pickPhoto(); if (!f) return; blob = f; }
  let small = blob; try { small = await compressImage(blob); } catch (e) {}
  const p = parseReceipt(text), path = todayKey() + '-' + uid() + '.jpg';
  await rcPut(path, { blob: small, up: false });
  rcUrls[path] = URL.createObjectURL(small);
  openOverlay('sheet', { kind: 'receipt', path, ocr: !!text, p, amt: p.total != null ? inNum(p.total.toFixed(2)) : '', gst: p.gst != null ? inNum(p.gst.toFixed(2)) : '', d: p.date || todayKey(), name: p.merchant || '', who: p.isFuel ? 'uber' : 'kisisel', ucat: p.isFuel ? 'fuel' : 'service', dcat: p.isFuel ? FUEL_CAT : null });
}
function pickPhoto() {
  return new Promise((res) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.setAttribute('capture', 'environment'); i.style.display = 'none';
    i.onchange = () => { const f = i.files && i.files[0]; i.remove(); res(f || null); };
    document.body.appendChild(i); i.click();
    setTimeout(() => { if (document.body.contains(i)) { /* still waiting for the picker */ } }, 0);
  });
}
const WHO = [['uber', 'Uber', 'car'], ['is', 'Ana iş', 'brief'], ['kisisel', 'Kişisel', 'bag']];
function receiptSheet(sh) {
  const ucats = [['fuel', 'Yakıt']].concat(UEXP_CATS.map(([k, l]) => [k, l]));
  return sheetShell(T('Fiş'), `<form class="stack" id="rcForm">
    <div class="rc-top"><button type="button" class="rc-thumb" data-act="viewRc" data-p="${esc(sh.path)}" aria-label="${T('Fişi büyüt')}"><img id="rcImg" alt="${T('Fiş fotoğrafı')}"></button>
      <p class="note" style="margin:0">${sh.ocr ? (sh.p.total != null ? T('Fişten okundu. Rakamları kontrol et.') : T('Tutar okunamadı; elle gir.')) : T('Tutarı fişten bakarak gir.')}</p></div>
    <div class="fields"><div class="field"><label for="rcAmt">${T('Toplam (GST dahil)')}</label><div class="money"><span>$</span><input id="rcAmt" inputmode="decimal" value="${esc(sh.amt)}" placeholder="0,00"></div></div>
      <div class="field"><label for="rcDate">${T('Tarih')}</label><input class="txt" type="date" id="rcDate" value="${esc(sh.d)}"></div></div>
    <div class="fields"><div class="field"><label for="rcName">${T('Mağaza / ne için')}</label><input class="txt" id="rcName" value="${esc(sh.name)}" autocomplete="off"></div>
      <div class="field"><label for="rcGst">${T('GST')}</label><div class="money"><span>$</span><input id="rcGst" inputmode="decimal" value="${esc(sh.gst)}" placeholder="${T('yok')}"></div></div></div>
    <div class="field"><span class="lab">${T('Kimin için?')}</span><div class="seg" role="group" aria-label="${T('Kimin için?')}">${WHO.map(([k, l, ic]) => `<button type="button" data-act="rcWho" data-v="${k}" aria-pressed="${sh.who === k}">${ico(ic)}${T(l)}</button>`).join('')}</div></div>
    ${sh.who === 'uber' ? `<div class="field"><label for="rcUcat">${T('Uber gider türü')}</label><select class="txt" id="rcUcat">${ucats.map(([k, l]) => `<option value="${k}" ${sh.ucat === k ? 'selected' : ''}>${T(l)}</option>`).join('')}</select><span class="hint">${sh.ucat === 'fuel' ? T('Günlük harcamalara “Yakıt (Uber)” olarak eklenir; GST kredisi logbook payıyla hesaplanır.') : T('Vergi → Uber giderlerine eklenir.')}</span></div>`
      : catChips(sh.dcat, 'rcCat')}
    ${(sh.who === 'uber' && sh.ucat === 'fuel') || sh.dcat === FUEL_CAT || (sh.p && sh.p.isFuel) ? `<div class="fields"><div class="field"><label for="rcOdo">${T('Gösterge (km)')}</label><div class="money"><input id="rcOdo" inputmode="numeric" value="${esc(sh.odo || '')}" placeholder="${lastOdo() ? fmtKm(lastOdo().km) : T('isteğe bağlı')}"><span>km</span></div></div>
      <div class="field"><label for="rcLit">${T('Litre')}</label><div class="money"><input id="rcLit" inputmode="decimal" value="${esc(sh.lit != null ? sh.lit : sh.p && sh.p.litres ? inNum(sh.p.litres) : '')}"><span>L</span></div></div></div><span class="hint" style="margin-top:-6px">${T('Depoyu doldurduğunda gir: tüketim ve km başı maliyet hesaplanır.')}</span>` : ''}
    ${sh.who === 'is' ? `<p class="note" style="margin:0">${T('Ana işin için yaptığın harcamalar ayrıca listelenir: yıl sonu vergiden düşmek ya da işverenden geri almak için.')}</p>` : ''}
    ${accPick('rcAcc', sh.acc)}
    <p class="err" id="rcErr" role="alert" hidden></p>
    <button class="btn" type="submit" id="rcSave">${T('Kaydet')}</button><button type="button" class="btn ghost" data-act="rcDiscard">${T('Vazgeç')}</button></form>`, 'a-para');
}
function rcKeep() { const s = U.sheet; if ($('rcAcc')) s.acc = val('rcAcc'); s.amt = val('rcAmt'); s.d = val('rcDate'); s.name = val('rcName'); s.gst = val('rcGst'); if ($('rcOdo')) s.odo = val('rcOdo'); if ($('rcLit')) s.lit = val('rcLit'); if ($('rcUcat')) s.ucat = val('rcUcat'); }
function saveReceipt() {
  const s = U.sheet; rcKeep();
  const amt = parse(s.amt), g = parse(s.gst), d0 = s.d;
  if (!(amt > 0)) return T('Tutarı gir.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d0)) return T('Tarihi seç.');
  if (g !== '' && g > amt / 10 + 0.05) return T('GST toplamın 1/11’inden fazla olamaz.');
  const name = (s.name || '').trim();
  if (s.who === 'uber' && s.ucat !== 'fuel') {
    const def = catDefaults(s.ucat); D.money.uberExpenses.push({ id: uid(), d: d0, cat: s.ucat, amount: amt, gst: g === '' ? def.gst : g > 0, gstAmt: g === '' ? null : g, biz: def.biz, bizAuto: isCarCat(s.ucat) && Math.abs(def.biz - logbook()) < 0.01, note: name, rc: s.path });
  } else {
    const cat = s.who === 'uber' ? FUEL_CAT : s.dcat, e = addDaily(d0, name || (cat ? dcatName(cat) : T('Harcama')), amt, cat, false);
    e.rc = s.path; if (s.who === 'is') e.work = true; if (g !== '') e.gstAmt = g;
    const odo = parseInt(String(s.odo || '').replace(/\D/g, ''), 10), lit = num(s.lit || '');
    if (odo > 0) { const ts = parseKey(d0).setHours(12, 0, 0, 0), fl = odoFloor(ts); if (fl == null || odo >= fl) { e.odo = odo; D.money.odo.push({ id: uid(), ts, km: odo }); } }
    if (lit > 0 && lit < 200) e.litres = lit;
  }
  if (s.acc) { const tgt = s.who === 'uber' && s.ucat !== 'fuel' ? D.money.uberExpenses[D.money.uberExpenses.length - 1] : null; accAdjust(s.acc, -amt); if (tgt) tgt.acc = s.acc; else { const f = Object.values(D.money.weeks).flatMap((w) => w.daily || []).find((x) => x.rc === s.path); if (f) f.acc = s.acc; } }
  if ($('rcAcc')) D.ui.lastAcc = s.acc || '';
  save(); rcFlush();
  return { msg: T('Fiş kaydedildi: {x}', { x: money(amt) }) };
}
function rcViewSheet(sh) { return sheetShell(T('Fiş'), `<div class="rc-view"><img id="rcBig" alt="${T('Fiş fotoğrafı')}"><p class="note" id="rcViewNote">${T('Yükleniyor…')}</p></div>`, 'a-para'); }
// fill <img> tags after a sheet renders (URLs come from IndexedDB or the bucket, asynchronously)
function rcHydrate() {
  const sh = U.sheet; if (!sh) return;
  const set = (id, p) => rcUrl(p).then((u) => { const el = $(id); if (el && u) el.src = u; const n = $('rcViewNote'); if (n) n.textContent = u ? '' : T('Fiş bulunamadı. Bu cihazda değilse ve buluta yüklenmediyse açılamaz.'); });
  if (sh.kind === 'receipt') set('rcImg', sh.path);
  if (sh.kind === 'rcview') set('rcBig', sh.path);
}
// main-job expenses this financial year (for the tax return / reimbursement)
function workExpenses() {
  const fy = +quarterOf(todayKey()).key.split('-Q')[0], a = (fy - 1) + '-07-01', b = fy + '-06-30', out = [];
  Object.values(D.money.weeks).forEach((w) => (w.daily || []).forEach((x) => { if (x.work && x.date >= a && x.date <= b) out.push(x); }));
  return out.sort((x, y) => y.date.localeCompare(x.date));
}
function workCard() {
  const ws = workExpenses(); if (!ws.length) return '';
  const tot = ws.reduce((s, x) => s + (+x.amount || 0), 0);
  return `<div class="card" id="workCard">${head('brief', T('Ana iş giderleri'), `<span class="chip">${usd2(tot)}</span>`)}<div class="list">${ws.slice(0, 12).map((x) => `<div class="hold"><span class="sym">${ico('brief')}</span><span class="mid"><b>${esc(x.name || T('Harcama'))}</b><span>${dShort(x.date)}</span></span><span class="rt"><b>${usd2(+x.amount || 0)}</b>${x.rc ? `<button type="button" class="link" data-act="viewRc" data-p="${esc(x.rc)}">${ico('receipt')}${T('fiş')}</button>` : ''}</span></div>`).join('')}</div>
    <p class="note">${T('Bu mali yıl, ana işin için. Yıl sonu vergi beyannamesinde iş gideri olarak düşebilir ya da işverenden geri isteyebilirsin.')}</p></div>`;
}
