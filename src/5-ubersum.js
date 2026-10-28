// ===================== UBER TAX SUMMARY IMPORT (monthly PDF from drivers.uber.com → exact BAS figures) =====================
// The PDF's text is read on the device with pdf.js (no upload). money.uberSums[<start date>] keeps one parsed period;
// the quarter's taxSummaries entry is rebuilt from the periods that start inside it.
// GST treatment (Simpler BAS): G1 = transportation + delivery + incentives/misc (tips left out: not a sale),
// 1A = G1 ÷ 11; Uber's "Potential Tax Deductions" (service fee, other Uber charges, tolls/airport/city fees) give 1B = ÷ 11.
// Tolls and airport/city fees appear on both sides, so they cancel out in profit and GST.
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const MONTHS_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const monIdx = (s) => { const t = String(s || '').toLowerCase().slice(0, 3); return MONTHS_EN.findIndex((m) => m.startsWith(t)); };
const amt$ = (s) => { const m = /(-?)\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/.exec(s || ''); return m ? (m[1] ? -1 : 1) * +m[2].replace(/,/g, '') : null; };
function parseUberSummary(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!lines.some((l) => /tax summary/i.test(l)) || !lines.some((l) => /uber/i.test(l))) return null;
  // period: "01-30 September 2026" or "1 July 2025 - 30 June 2026" / "01 Jul 2025 - 30 Jun 2026"
  let a = null, b = null; const all = lines.join('\n');
  let m = /\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/.exec(all);
  if (m && monIdx(m[3]) >= 0) { a = new Date(+m[4], monIdx(m[3]), +m[1]); b = new Date(+m[4], monIdx(m[3]), +m[2]); }
  if (!a) { m = /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/.exec(all); if (m && monIdx(m[2]) >= 0 && monIdx(m[5]) >= 0) { a = new Date(+m[3], monIdx(m[2]), +m[1]); b = new Date(+m[6], monIdx(m[5]), +m[4]); } }
  if (!a || !b || b < a) return null;
  const r = { start: idOf(a), end: idOf(b), fare: 0, split: 0, safe: 0, tollsT: 0, miscT: 0, city: 0, airport: 0, booking: 0, transport: null, delivery: null, deliveryFee: 0, deliveryInc: 0, tollsD: 0, other: null, miscO: 0, incentives: 0, tips: 0, serviceFee: 0, uberOther: 0, thirdParty: 0, deductions: null, km: null, trips: null, name: '', abn: '' };
  let sec = '';
  const nm = lines.find((l) => /^[A-Z][A-Z' -]{3,}$/.test(l) && !/TAX|UBER/.test(l)); if (nm) r.name = nm;
  const abn = /\(ABN\)\s*:?\s*(\d[\d ]{9,13}\d)/.exec(all); if (abn) r.abn = abn[1].replace(/\s/g, '');
  for (const l of lines) {
    const v = amt$(l), L = l.toLowerCase();
    if (/^transportation income$/.test(L) && v == null) sec = 't'; else if (/^delivery income$/.test(L) && v == null) sec = 'd'; else if (/^other income$/.test(L) && v == null) sec = 'o'; else if (/^deductions$/.test(L)) sec = 'x';
    if (/^total transportation income/.test(L) && v != null) r.transport = v;
    else if (/^total delivery income/.test(L) && v != null) r.delivery = v;
    else if (/^total other income/.test(L) && v != null) r.other = v;
    else if (/^total potential tax deductions/.test(L) && v != null) r.deductions = v;
    else if (/^gross transportation fare/.test(L) && v != null) r.fare = v;
    else if (/^split fare/.test(L) && v != null) r.split = v;
    else if (/^safe rides fee/.test(L) && v != null) r.safe = v;
    else if (/^tolls reimbursement/.test(L) && v != null) { if (sec === 'd') r.tollsD = v; else r.tollsT = v; }
    else if (/^miscellaneous/.test(L) && v != null) { if (sec === 'o') r.miscO = v; else r.miscT = v; }
    else if (/^city fee/.test(L) && v != null) r.city = v;
    else if (/^airport fee/.test(L) && v != null) r.airport = v;
    else if (/^booking fee/.test(L) && v != null) r.booking = v;
    else if (/^delivery fee/.test(L) && v != null) r.deliveryFee = v;
    else if (/^delivery incentives/.test(L) && v != null) r.deliveryInc = v;
    else if (/^referral ?\/ ?incentives/.test(L) && v != null) r.incentives = v;
    else if (/^tips\b/.test(L) && v != null && sec === 'o') r.tips = v;
    else if (/^uber service fee/.test(L) && v != null) r.serviceFee = v;
    else if (/^other charges from uber/.test(L) && v != null) r.uberOther = v;
    else if (/^charges from 3rd parties/.test(L) && v != null) r.thirdParty = v;
    else if (/^on trip mileage\b.*\bkm\b/.test(L)) { const k = /([\d,.]+)\s*km/i.exec(l); if (k) r.km = +k[1].replace(/,/g, ''); }
    // page 1 summary row: "123 km   45   $6.00" (km, trips, tips)
    const row = /^([\d,.]+)\s*km\s+(\d[\d,]*)\s+\$/.exec(l); if (row) { if (r.km == null) r.km = +row[1].replace(/,/g, ''); r.trips = +row[2].replace(/,/g, ''); }
  }
  const sum = (...xs) => xs.reduce((s, x) => s + (+x || 0), 0);
  if (r.transport == null) r.transport = sum(r.fare, r.split, r.safe, r.tollsT, r.miscT, r.city, r.airport, r.booking);
  if (r.delivery == null) r.delivery = sum(r.deliveryFee, r.deliveryInc, r.tollsD);
  if (r.other == null) r.other = sum(r.miscO, r.incentives, r.tips);
  if (r.deductions == null) r.deductions = sum(r.serviceFee, r.uberOther, r.thirdParty);
  r.g1 = r2(r.transport + r.delivery + r.other - r.tips);
  r.income = r2(r.transport + r.delivery + r.other);
  return r;
}
// pdf.js text items → lines (items on the same baseline joined left to right)
async function pdfText(file) {
  const lib = await loadScript(PDFJS + 'pdf.min.js', 'pdfjsLib');
  lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent(), rows = [];
    tc.items.forEach((it) => { if (!it.str || !it.str.trim()) return; const y = it.transform[5], x = it.transform[4]; let r = rows.find((q) => Math.abs(q.y - y) < 3); if (!r) rows.push(r = { y, items: [] }); r.items.push({ x, s: it.str }); });
    rows.sort((p, q) => q.y - p.y).forEach((r) => out.push(r.items.sort((p, q) => p.x - q.x).map((x) => x.s).join('  ')));
  }
  return out.join('\n');
}
function pickUberPdf() {
  return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,.pdf'; i.style.display = 'none'; i.onchange = () => { const f = i.files && i.files[0]; i.remove(); res(f || null); }; document.body.appendChild(i); i.click(); });
}
async function importUberPdf() {
  const f = await pickUberPdf(); if (!f) return;
  let text = ''; try { text = await pdfText(f); } catch (e) { toast(T('PDF okunamadı. İnternet bağlantını kontrol et (okuyucu bir kez indirilir).')); return; }
  importUberText(text);
}
function importUberText(text) {
  const r = parseUberSummary(text);
  if (!r) { toast(T('Bu bir Uber vergi özeti gibi görünmüyor.')); return null; }
  openOverlay('sheet', { kind: 'ubersum', r });
  return r;
}
const sumKey = (r) => r.start + '_' + r.end;
function uberSumSheet(sh) {
  const r = sh.r, row = (l, v, cls) => `<div class="${cls || ''}"><dt>${l}</dt><dd>${usd2(v)}</dd></div>`;
  const overlaps = Object.values(D.money.uberSums).filter((x) => x.start <= r.end && x.end >= r.start);
  const today = todayKey(), partial = r.end >= today;
  return sheetShell(T('Uber vergi özeti'), `<div class="stack" id="ubSum">
    <p class="note" style="margin:0"><b>${longDate(parseKey(r.start))} – ${longDate(parseKey(r.end))}</b>${r.trips != null ? ' · ' + T('{n} yolculuk', { n: r.trips }) : ''}${r.km != null ? ' · ' + T('{k} km yolcuyla', { k: fmtKm(r.km) }) : ''}</p>
    ${partial ? `<p class="acc-tax short" style="margin:0">${T('Bu dönem henüz bitmedi; ay sonunda özeti yeniden yükle.')}</p>` : ''}
    <dl class="receipt">${row(T('Yolcu taşıma geliri'), r.transport)}${r.delivery ? row(T('Teslimat geliri'), r.delivery) : ''}${r.other - r.tips ? row(T('Teşvik ve diğer'), r.other - r.tips) : ''}
      ${row(T('Toplam satış (G1)'), r.g1, 'sub-tot')}${row(T('Satışlardaki GST (1A)'), r.g1 / 11)}
      ${row(T('Uber hizmet bedeli'), r.serviceFee)}${row(T('Diğer Uber kesintileri'), r.uberOther)}${row(T('Otoyol, havalimanı, şehir ücretleri'), r.thirdParty)}
      ${row(T('Uber kesintilerinin GST’si (1B’ye)'), r.deductions / 11, 'sub-tot')}${r.tips ? row(T('Bahşiş (GST yok, gelir vergisine girer)'), r.tips) : ''}
      <div class="tot"><dt>${T('Net (kesintiler sonrası)')}</dt><dd>${usd2(r.income - r.deductions)}</dd></div></dl>
    <p class="note" style="margin:0">${T('Otoyol ve havalimanı ücretleri hem gelirde hem giderde yer alır; birbirini götürür. Rakamlar Uber’in özetinden, telefonunda okundu.')}</p>
    ${overlaps.length ? `<p class="note" style="margin:0">${T('Bu dönemle çakışan {n} özet var; kaydedersen onların yerine geçer.', { n: overlaps.length })}</p>` : ''}
    <button type="button" class="btn" data-act="ubSave" id="ubSave">${T('Kaydet ve BAS’a uygula')}</button><button type="button" class="btn ghost" data-act="closeOverlay">${T('Vazgeç')}</button></div>`, 'a-para');
}
function saveUberSum(r) {
  Object.keys(D.money.uberSums).forEach((k) => { const x = D.money.uberSums[k]; if (x.start <= r.end && x.end >= r.start) delete D.money.uberSums[k]; });
  D.money.uberSums[sumKey(r)] = Object.assign({}, r, { at: Date.now() });
  rebuildTaxSummary(quarterOf(r.start).key);
  save();
}
// quarter's exact figures = sum of imported periods that start in it
function rebuildTaxSummary(key) {
  const qi = qInfo(key), xs = Object.values(D.money.uberSums).filter((x) => x.start >= qi.startId && x.start <= qi.endId);
  if (!xs.length) return;
  const s = (f) => r2(xs.reduce((a, x) => a + (+x[f] || 0), 0));
  D.money.taxSummaries[key] = { grossFares: s('g1'), uberFees: s('deductions'), tips: s('tips'), km: s('km'), trips: s('trips'), src: 'pdf', periods: xs.map((x) => x.start + '…' + x.end).sort() };
}
function uberSumCard(key) {
  const qi = qInfo(key), ms = [0, 1, 2].map((i) => { const d = parseKey(qi.startId); d.setMonth(d.getMonth() + i); return { y: d.getFullYear(), m: d.getMonth() }; });
  const has = (y, m) => Object.values(D.money.uberSums).some((x) => { const d = parseKey(x.start); return d.getFullYear() === y && d.getMonth() === m; });
  return `<div class="card" id="ubCard">${head('receipt', T('Uber vergi özetleri'), `<button type="button" class="btn sm" data-act="ubImport" id="ubImport">${ico('upload')}${T('PDF yükle')}</button>`)}
    <div class="ub-months">${ms.map(({ y, m }) => `<span class="chip ${has(y, m) ? 'gain' : ''}">${has(y, m) ? ico('check') : ''}${MONTHS_FULL[m]}</span>`).join('')}</div>
    ${uberSumList(key) || `<p class="note">${T('Uber Driver uygulaması → Hesap → Vergi bilgileri’nden (ya da drivers.uber.com) aylık vergi özetini PDF olarak indir ve buraya yükle. BAS’taki G1, 1A ve 1B kesin rakamlarla hesaplanır.')}</p>`}</div>`;
}
function uberSumList(key) {
  const qi = qInfo(key), xs = Object.values(D.money.uberSums).filter((x) => x.start >= qi.startId && x.start <= qi.endId).sort((a, b) => a.start.localeCompare(b.start));
  if (!xs.length) return '';
  return `<div class="list" id="ubList">${xs.map((x) => `<div class="hold"><span class="sym">${ico('receipt')}</span><span class="mid"><b>${dShort(x.start)} – ${dShort(x.end)}</b><span>${T('G1 {a} · Uber kesintileri {b}', { a: usd2(x.g1), b: usd2(x.deductions) })}${x.km != null ? ' · ' + T('{k} km', { k: fmtKm(x.km) }) : ''}</span></span><button type="button" class="del${U.armed === sumKey(x) ? ' arm' : ''}" data-act="delUbSum" data-id="${sumKey(x)}" aria-label="${T('Sil')}">${U.armed === sumKey(x) ? T('Sil?') : ico('x')}</button></div>`).join('')}</div>`;
}
