// ===================== VERGİ (Uber GST + income tax set-aside, per BAS quarter) =====================
// Quarter keys follow quarterOf(): '<FY end year>-Q<n>', e.g. Oct 2026 → '2027-Q2' (Q2 2026–27).
const UEXP_CATS = [
  ['service', 'Servis ve bakım', 'car'], ['tyres', 'Lastik', 'car'], ['wash', 'Yıkama ve temizlik', 'car'],
  ['phone', 'Telefon ve internet', 'phone'], ['parking', 'Otopark ve geçiş ücreti', 'car'], ['insurance', 'Sigorta', 'car'], ['rego', 'Rego, CTP ve BHSL', 'car'],
  ['amenities', 'Yolcu ikramı (su, şeker)', 'other'], ['fees', 'Muhasebe ve banka ücretleri', 'other'], ['other', 'Diğer', 'other']
];
const UEXP_ICON = { fuel: 'car', service: 'car', tyres: 'car', wash: 'car', phone: 'phone', parking: 'car', insurance: 'receipt', rego: 'receipt', amenities: 'bag', fees: 'percent', other: 'list' };
const catName = (k) => { if (k === 'fuel') return T('Yakıt'); const c = UEXP_CATS.find((x) => x[0] === k); return T(c ? c[1] : 'Diğer'); };
const logbook = () => { const v = +S.logbookPct; return v > 0 && v <= 100 ? v : 100; };
const isCarCat = (cat) => { const c = UEXP_CATS.find((x) => x[0] === cat); return !!c && c[2] === 'car'; };
const bizOf = (e) => (e.bizAuto ? logbook() : e.biz == null ? 100 : +e.biz);
// built-in defaults, overridable per category in Settings → Vergi (money.settings.catDefaults)
function catDefaults(cat) {
  const c = UEXP_CATS.find((x) => x[0] === cat) || UEXP_CATS[UEXP_CATS.length - 1], o = (S.catDefaults || {})[cat] || {};
  return { gst: o.gst != null ? !!o.gst : !['rego', 'fees'].includes(cat), biz: o.biz != null ? o.biz : c[2] === 'car' ? logbook() : c[2] === 'phone' ? 50 : 100 };
}
function setCatDefault(cat, patch) { const all = S.catDefaults = Object.assign({}, S.catDefaults); all[cat] = Object.assign({}, all[cat], patch); }
function qParts(key) { const [fy, q] = key.split('-Q').map(Number); return { fy, q }; }
function qInfo(key) {
  const { fy, q } = qParts(key), sm = [6, 9, 0, 3][q - 1], y = q <= 2 ? fy - 1 : fy;
  const start = new Date(y, sm, 1), end = new Date(y, sm + 3, 0);
  // due dates when you lodge online yourself (ATO 2-week extension for Q1, Q3, Q4; Q2 stays 28 Feb)
  const due = q === 1 ? new Date(y, 10, 11) : q === 2 ? new Date(y + 1, 1, 28) : q === 3 ? new Date(y, 4, 12) : new Date(y, 7, 25);
  return { fy, q, startId: idOf(start), endId: idOf(end), due, range: `${MONTHS[sm]}–${MONTHS[(sm + 2) % 12]} ${y}` };
}
const fyName = (fy) => `${fy - 1}–${String(fy).slice(2)}`;
const qName = (key) => { const { fy, q } = qParts(key); return `Q${q} ${fyName(fy)}`; };
function qShift(key, d) { let { fy, q } = qParts(key); q += d; while (q < 1) { q += 4; fy--; } while (q > 4) { q -= 4; fy++; } return fy + '-Q' + q; }
// Per-tick memo: taxQuarter scans every week; calc() needs it for each week shown. Cleared on save/render/paraCalc.
let TAXC = null;
function taxMemo(k, f) { if (!TAXC) { TAXC = new Map(); Promise.resolve().then(() => { TAXC = null; }); } if (!TAXC.has(k)) TAXC.set(k, f()); return TAXC.get(k); }
function taxCacheReset() { TAXC = null; }
// the Uber week (Monday id) an expense dated d belongs to: its own week if that week drove Uber in this quarter,
// otherwise the nearest Uber week of the same quarter (so Σ weekly tax == the quarter's figure); null = no Uber week yet
function nearestUberWeek(weeks, d) {
  if (!weeks.length) return null; const own = idOf(mondayOf(parseKey(d))); if (weeks.includes(own)) return own;
  const t = parseKey(d).getTime(); let best = null, bd = Infinity;
  weeks.forEach((id) => { const a = parseKey(id).getTime(), b = a + 6 * 864e5, dist = t < a ? a - t : t > b ? t - b : 0; if (dist < bd) { bd = dist; best = id; } });
  return best;
}
function taxQuarter(key) { return taxMemo('tq:' + key, () => taxQuarter0(key)); }
function taxQuarter0(key) {
  const qi = qInfo(key), a = qi.startId, b = qi.endId;
  const weeks = Object.keys(D.money.weeks).filter((id) => id >= a && id <= b && (+D.money.weeks[id].uberEarn || 0) > 0).sort();
  const E = weeks.reduce((s, id) => s + (+D.money.weeks[id].uberEarn || 0), 0);
  // "Yakıt (Uber)" entries from the daily spending list count here too (GST credit 1/11, work share = logbook %)
  const fuelEx = [];
  Object.entries(D.money.weeks).forEach(([wid, w]) => (w.daily || []).forEach((x) => { if (x.cat === FUEL_CAT && x.date >= a && x.date <= b) fuelEx.push({ id: x.id, d: x.date, cat: 'fuel', amount: +x.amount || 0, gst: true, biz: logbook(), fromDaily: true, rc: x.rc, week: wid, note: x.name && x.name !== 'Yakıt (Uber)' ? x.name : '' }); }));
  const ex = D.money.uberExpenses.filter((e) => e.d >= a && e.d <= b).concat(fuelEx);
  const wk = {}; weeks.forEach((id) => { wk[id] = { E: +D.money.weeks[id].uberEarn || 0, gross: 0, fees: 0, credit: 0, exEx: 0 }; });
  const loose = { gross: 0, fees: 0, credit: 0, exEx: 0, n: 0, total: 0 };
  let credit = 0, exEx = 0, exTotal = 0;
  ex.forEach((e) => { const amt = +e.amount || 0, biz = bizOf(e) / 100, g = e.gst ? amt / 11 : 0, cr = g * biz, xx = (amt - g) * biz;
    credit += cr; exEx += xx; exTotal += amt;
    const w = nearestUberWeek(weeks, e.d); if (w) { wk[w].credit += cr; wk[w].exEx += xx; } else { loose.credit += cr; loose.exEx += xx; loose.n++; loose.total += amt; } });
  const sm = D.money.taxSummaries[key] || {}, exact = +sm.grossFares > 0;
  const gross = exact ? +sm.grossFares : E, fees = exact ? +sm.uberFees || 0 : 0;
  // Uber's exact quarter figures are spread over the weeks in proportion to each week's earnings
  if (E > 0) weeks.forEach((id) => { wk[id].gross = gross * wk[id].E / E; wk[id].fees = fees * wk[id].E / E; }); else { loose.gross = gross; loose.fees = fees; }
  const g1A = gross / 11, g1B = credit + fees / 11;
  const profit = (gross - gross / 11) - (fees - fees / 11) - exEx + (exact ? +sm.tips || 0 : 0);
  return { key, qi, E, nWeeks: weeks.length, weeks, wk, loose, ex, exTotal, exact, gross, fees, g1A, g1B, credit, gst: g1A - g1B, exEx, profit };
}
// one week's (or the unattributed rest's) share of the quarter: GST_w + rate_q × profit_w, rate_q from taxShare
function taxPart(x, ts) {
  const gst = x.gross / 11 - x.credit - x.fees / 11, profit = (x.gross - x.gross / 11) - (x.fees - x.fees / 11) - x.exEx;
  const inc = ts.rInc * profit, ml = ts.rMls * profit;
  return { gross: x.gross, credit: x.credit, exEx: x.exEx, gst, profit, inc, mls: ml, tax: gst + inc + ml };
}
function weekTaxParts(id) {
  const w = getWeek(id); if (!w || !((+w.uberEarn || 0) > 0)) return null;
  const key = quarterOf(id).key, tq = taxQuarter(key), x = tq.wk[id]; if (!x) return null;
  return Object.assign(taxPart(x, taxShare(key)), { key });
}
// income tax share: average weekly Uber profit over the weeks driven so far this FY (Q1..this quarter) x weeks per year
// = estimated annual Uber profit, taxed on top of salary. Income tax + Medicare and the MLS are split so the MLS,
// which applies to the whole income once over the threshold, is spread over the whole year's Uber profit.
function taxShare(key) { return taxMemo('ts:' + key, () => taxShare0(key)); }
function taxShare0(key) {
  const { fy, q } = qParts(key); let P = 0, n = 0;
  for (let i = 1; i <= q; i++) { const x = taxQuarter(fy + '-Q' + i); P += x.profit; n += x.nWeeks; }
  const tq = taxQuarter(key), N = Math.max(1, +S.weeksPerYear || 48);
  const A = n > 0 ? P / n * N : P;
  if (A <= 0 || tq.profit <= 0) return { A, rate: 0, rInc: 0, rMls: 0, tax: 0, incTax: 0, mlsTax: 0, mlsRate: 0 };
  const inc = (itax(S.salary + A) + 0.02 * (S.salary + A)) - (itax(S.salary) + 0.02 * S.salary);
  const m = mls(S.salary + A, S.cover) - mls(S.salary, S.cover);
  const incTax = inc / A * tq.profit, mlsTax = m / A * tq.profit;
  return { A, rate: (inc + m) / A, rInc: inc / A, rMls: m / A, tax: incTax + mlsTax, incTax, mlsTax, mlsRate: mls(S.salary + A, false) / (S.salary + A) };
}
function taxFull(key) {
  const tq = taxQuarter(key), ts = taxShare(key);
  const sa = D.money.setAsides.filter((x) => x.q === key), saved = sa.reduce((s, x) => s + (+x.amount || 0), 0);
  const need = tq.gst + ts.tax, looseTax = taxPart(tq.loose, ts).tax;
  return Object.assign({}, tq, ts, { need, looseTax, sa, saved, left: Math.max(0, need - saved) });
}
const daysUntil = (d) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - parseKey(todayKey()).setHours(0, 0, 0, 0)) / 864e5);
const longDate = (d) => new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
function paraTax() {
  const key = U.taxQ, f = taxFull(key), qi = f.qi, dl = daysUntil(qi.due), sm = D.money.taxSummaries[key] || {};
  const pc = f.need > 0 ? Math.min(100, Math.round(f.saved / f.need * 100)) : 0;
  const row = (id, k, v, cls) => `<div${cls ? ` class="${cls}"` : ''}><dt>${k}</dt><dd id="${id}">${v}</dd></div>`;
  // FY summary
  const fy = qi.fy; let fE = 0, fG = 0, fT = 0, fS = 0;
  for (let i = 1; i <= qi.q; i++) { const x = taxFull(fy + '-Q' + i); fE += x.gross; fG += x.gst; fT += x.tax; fS += x.saved; }
  // expenses grouped by month
  const byM = {}; f.ex.slice().sort((a, b) => b.d.localeCompare(a.d)).forEach((e) => { (byM[e.d.slice(0, 7)] = byM[e.d.slice(0, 7)] || []).push(e); });
  const expList = Object.keys(byM).sort().reverse().map((m) => { const [y, mm] = m.split('-').map(Number), tot = byM[m].reduce((s, e) => s + (+e.amount || 0), 0);
    return `<div class="band-h" style="margin-top:6px;justify-content:space-between"><span>${MONTHS_FULL[mm - 1]} ${y}</span><span>${usd2(tot)}</span></div>` + byM[m].map((e) => `<button type="button" class="hold wrap" ${e.fromDaily ? `data-act="openDay" data-week="${e.week}" data-d="${e.d}" title="${T('Günlük harcamalarda aç')}"` : `data-act="editUexp" data-id="${e.id}"`}><span class="sym">${ico(UEXP_ICON[e.cat] || 'list')}</span><span class="mid"><b>${esc(catName(e.cat))}</b><span>${dShort(e.d)}${e.note ? ' · ' + esc(e.note) : ''}</span></span><span class="rt"><b>${usd2(+e.amount || 0)}</b><span class="tags-mini">${e.rc ? `<span class="chip">${ico('receipt')}</span>` : ''}${e.fromDaily ? `<span class="chip">${T('günlükten')}</span>` : ''}${e.gst ? `<span class="chip acc">GST</span>` : `<span class="chip">${T('GST yok')}</span>`}${bizOf(e) < 100 ? `<span class="chip">${T('iş {n}', { n: pct(nf0.format(bizOf(e))) })}</span>` : ''}</span></span></button>`).join(''); }).join('');
  return `<div class="weeknav" data-swipe-zone="quarter"><button type="button" data-act="taxQGo" data-d="-1" id="taxPrev" aria-label="${T('Önceki çeyrek')}">${ico('left')}</button><div class="lbl"><span id="taxQLbl">${qName(key)}</span><small>${qi.range}</small></div><button type="button" data-act="taxQGo" data-d="1" id="taxNext" aria-label="${T('Sonraki çeyrek')}">${ico('right')}</button></div>
  ${taxBox(thisWeekId()) ? `<section class="sec">${secHead(T('Bu hafta'), `<span class="sub">${weekLabel(thisWeekId())}</span>`)}${taxBox(thisWeekId())}</section>` : ''}
  <section class="hero" data-swipe-zone="quarter"><svg class="hero-deco" viewBox="0 0 210 210" aria-hidden="true"><circle cx="105" cy="105" r="96"/><circle cx="105" cy="105" r="74"/><circle cx="105" cy="105" r="52"/></svg>
    <div class="big"><span class="k">${T('Kenara ayrılması gereken')} ${per('q')}</span><span class="v" id="taxNeed">${usd2(f.need)}</span><span class="u">${T('Ödenecek GST {a} + gelir vergisi payı {b}', { a: usd2(f.gst), b: usd2(f.tax) })}</span></div>
    <div class="tiles">${tile(T('Kenara ayırdığın'), usd2(f.saved), pct(pc), 'taxSaved')}${tile(T('Kalan'), usd2(f.left), f.need > 0 && f.left <= 0.005 ? T('Tamamı ayrıldı') : T('Ayrılacak'), 'taxLeft')}</div>
    <div class="meter" style="background:var(--hero-tile)"><i style="width:${pc}%;background:var(--gold-line)"></i></div>
    <div class="hero-row"><span class="chip" id="taxDue">${T('BAS son günü: {d}', { d: longDate(qi.due) })} · ${dl > 0 ? T('{n} gün kaldı', { n: dl }) : dl === 0 ? T('bugün') : T('{n} gün geçti', { n: -dl })}</span></div></section>
  ${uberSumCard(key)}
  ${taxWeeksCard(key)}
  <div class="card">${head('jar', T('Kenara ayırdığın'), '', true)}
    ${f.sa.length ? `<div class="log" style="margin-bottom:10px">${f.sa.slice().sort((a, b) => b.d.localeCompare(a.d)).map((x) => `<div><span>${dShort(x.d)}</span><span style="display:flex;gap:6px;align-items:center"><b>${usd2(+x.amount || 0)}</b><button type="button" class="del" data-act="delSetAside" data-id="${x.id}" aria-label="${T('Sil')}">${U.armed === x.id ? T('Sil?') : ico('x')}</button></span></div>`).join('')}</div>` : `<p class="note" style="margin-top:0">${T('İş birikim hesabına aktardığın tutarları buraya yaz. Kalan tutar otomatik hesaplanır.')}</p>`}
    <form class="row" id="saForm"><input class="txt" type="date" id="saDate" value="${todayKey()}" aria-label="${T('Tarih')}" style="flex:0 0 150px;width:150px"><div class="money" style="flex:1;width:auto"><span>$</span><input id="saAmt" inputmode="decimal" placeholder="${T('Tutar')}" aria-label="${T('Ayrılan tutar')}"></div><button class="btn sm" type="submit" aria-label="${T('Ekle')}">${ico('plus')}</button></form></div>
  ${carCard()}
  ${logbookCard()}
  <div class="card">${head('car', T('Uber giderleri'), `<span class="btns tight"><button type="button" class="btn sm soft" data-act="scanRc" id="scanRcTax">${ico('receipt')}${T('Fiş tara')}</button><button type="button" class="btn sm" data-act="newUexp">${ico('plus')}${T('Ekle')}</button></span>`)}
    ${f.ex.length ? `<div class="list">${expList}</div><p class="note">${T('Bu çeyrekte toplam {x}. Araç giderlerinde iş payı logbook yüzdesinden gelir ({p}).', { x: usd2(f.exTotal), p: pct(nf0.format(logbook())) })}</p>`
      : empty('receipt', T('Bu çeyrekte gider yok'), T('Yakıt, servis, lastik, telefon gibi Uber giderlerini fişleriyle kaydet. GST kredisi ve kâr hesabı bunlardan çıkar.'), `<button type="button" class="btn sm" data-act="newUexp">${ico('plus')}${T('Gider ekle')}</button>`)}</div>
  ${workCard()}
  <details class="card slip fold" id="taxBreak"${fold('taxBreak', f.exact)}><summary>${T('Çeyrek dökümü')} <span class="chip ${f.exact ? 'gain' : ''}" id="taxMethod">${f.exact ? T('Uber vergi özeti') : T('Tahmin')}</span></summary><dl class="receipt">
    ${row('taxE', f.exact ? T('Yolcu ücretleri (GST dahil)') : T('Uber kazancı ({n} hafta)', { n: f.nWeeks }), usd2(f.gross))}
    ${row('tax1A', T('Satışlardaki GST (1A)'), usd2(f.g1A))}
    ${row('tax1B', T('GST kredileri (1B)'), '−' + usd2(f.g1B))}
    ${row('taxGst', T('Ödenecek GST'), usd2(f.gst), 'sub-tot')}
    ${f.exact ? row('taxFees', T('Uber ücretleri (GST hariç)'), '−' + usd2(f.fees - f.fees / 11)) : ''}
    ${row('taxExp', T('Giderler (GST hariç, iş payı)'), '−' + usd2(f.exEx))}
    ${row('taxProfit', T('Vergiye tabi kâr'), usd2(f.profit))}
    ${row('taxShare', T('Gelir vergisi + Medicare'), usd2(f.incTax))}
    ${f.mlsTax > 0.005 ? row('taxMls', T('MLS (hastane sigortası yok)'), usd2(f.mlsTax)) : ''}
    <div class="tot"><dt>${T('Kenara ayrılması gereken')}</dt><dd>${usd2(f.need)}</dd></div></dl>
    ${f.mlsTax > 0.005 ? `<p class="note">${T('Toplam gelirin {t} eşiğini geçtiği için tüm gelirine %{r} Medicare Levy Surcharge eklenir (yılda yaklaşık {y}). Özel hastane sigortan varsa Ayarlar → Para’da “Var” seç, bu satır kalkar.', { t: '$105.000', r: String(+(f.mlsRate * 100).toFixed(2)).replace('.', LOC === 'tr-TR' ? ',' : '.'), y: usd(mls(S.salary + f.A, false)) })}</p>` : ''}
    <p class="note">${f.exact ? T('1A, girdiğin yolcu ücretlerinin 1/11’i. Uber ücretlerinin GST’si 1B’ye eklendi.') : T('1A, Uber kazancının 1/11’i olarak tahmin edildi. Uber’in vergi özetindeki rakamları girersen kesin hesap yapılır.')} ${f.gst < 0 ? T('GST eksi çıktı: bu çeyrekte iade alırsın.') : ''}</p>
    <details class="fold" ${f.exact ? 'open' : ''}><summary>${T('Uber vergi özetinden kesin rakam gir')}</summary><div class="fields">
      <div class="field"><label for="tsGross">${T('Toplam yolcu ücretleri (GST dahil)')}</label><div class="money"><span>$</span><input id="tsGross" data-tsum="grossFares" inputmode="decimal" value="${fmtIn2(sm.grossFares)}"></div></div>
      <div class="field"><label for="tsFees">${T('Uber ücretleri (GST dahil)')}</label><div class="money"><span>$</span><input id="tsFees" data-tsum="uberFees" inputmode="decimal" value="${fmtIn2(sm.uberFees)}"></div></div></div></details></details>
  <details class="card fold" id="taxFyCard"${fold('taxFyCard')}><summary>${T('{fy} mali yılı (şu ana kadar)', { fy: fyName(fy) })}</summary><div class="tiles" id="taxFy" style="margin-top:10px">${tile(T('Uber kazancı'), usd(fE), qi.q === 1 ? 'Q1' : T('Q1–Q{n}', { n: qi.q }))}${tile(T('Ödenecek GST'), usd(fG), 'BAS')}${tile(T('Gelir vergisi payı'), usd(fT), T('Yıl sonu için'))}${tile(T('Ayrılacak / ayrılan'), usd(fG + fT) + ' / ' + usd(fS), T('Toplam'))}</div>
    <p class="note">${T('Gelir vergisi payı: bu mali yılda Uber yaptığın haftaların ortalama kârı, yılda kaç hafta Uber yaptığınla çarpılıp yıllık kâr tahmin edilir. Bu kâr maaşının üstüne eklenince çıkan ek vergi (Medicare %2 ve MLS dahil) oranıyla bu çeyreğin kârı çarpılır.')} ${T("Tahmindir; kesin rakamlar için Uber'in vergi özetini kullan.")}</p></details>`;
}
const fold = (id, def) => ((U.fold && U.fold[id] != null ? U.fold[id] : def) ? ' open' : '');
const fmtIn2 = (v) => (v === '' || v == null ? '' : nf2.format(v));
function uexpSheet(sh) {
  const e = sh.id ? D.money.uberExpenses.find((x) => x.id === sh.id) : null;
  return `<form class="stack" id="uexpForm"><div class="fields"><div class="field"><label for="ueDate">${T('Tarih')}</label><input class="txt" type="date" id="ueDate" value="${sh.d || (e ? e.d : todayKey())}"></div>
    <div class="field"><label for="ueCat">${T('Kategori')}</label><select class="txt" id="ueCat" data-uecat>${UEXP_CATS.map(([k, l]) => `<option value="${k}" ${sh.cat === k ? 'selected' : ''}>${T(l)}</option>`).join('')}</select></div></div>
    <div class="fields"><div class="field"><label for="ueAmt">${T('Tutar (GST dahil)')}</label><div class="money"><span>$</span><input id="ueAmt" inputmode="decimal" value="${sh.amt != null ? sh.amt : e ? inNum(e.amount) : ''}" placeholder="0"></div></div>
    <div class="field"><label for="ueBiz">${T('İş kullanım payı')}</label><div class="money"><input id="ueBiz" inputmode="decimal" value="${sh.biz}"><span>%</span></div></div></div>
    <div class="field inline"><span class="lab">${T('GST içerir')}</span><div class="seg inline" role="group" aria-label="${T('GST içerir')}"><button type="button" data-act="ueGst" data-v="true" aria-pressed="${!!sh.gst}">${T('Evet')}</button><button type="button" data-act="ueGst" data-v="false" aria-pressed="${!sh.gst}">${T('Hayır')}</button></div></div>
    <div class="field"><label for="ueNote">${T('Not (isteğe bağlı)')}</label><input class="txt" id="ueNote" value="${esc(sh.note != null ? sh.note : e ? e.note || '' : '')}" autocomplete="off"></div>
    ${e ? '' : `<div class="fuelhint" id="ueFuelHint">${ico('car')}<span>${T("Yakıtı günlük harcamalara 'Yakıt (Uber)' olarak gir")}</span><button type="button" class="btn sm soft" data-act="fuelToDaily">${T('Yakıt gir')}</button></div>`}
    <p class="note" style="margin:0">${T('Rego, CTP, BHSL ve banka ücretlerinde GST yoktur. Telefonun varsayılan iş payı %50, araç giderlerininki logbook yüzdesidir.')}</p>
    <button class="btn" type="submit" id="ueSave">${T('Kaydet')}</button>${e && e.rc ? `<button type="button" class="btn soft" data-act="viewRc" data-p="${esc(e.rc)}">${ico('receipt')}${T('Fişi gör')}</button>` : ''}${e ? `<button type="button" class="btn ghost" data-act="delUexp" data-id="${e.id}">${U.armed === e.id ? T('Silmek için tekrar dokun') : T('Gideri sil')}</button>` : ''}</form>`;
}
function uexpKeep() { return { d: val('ueDate'), amt: val('ueAmt'), biz: val('ueBiz'), note: val('ueNote') }; }
function openUexp(id) {
  const e = id ? D.money.uberExpenses.find((x) => x.id === id) : null, cat = e ? e.cat : 'service', def = catDefaults(cat);
  return { kind: 'uexp', id: id || null, cat, gst: e ? !!e.gst : def.gst, biz: e ? bizOf(e) : def.biz };
}

// ---------- weekly tax set-aside ("Aktardım") ----------
const per = (k) => `<span class="per">${T({ w: 'bu hafta', q: 'bu çeyrek', m: 'bu ay' }[k])}</span>`;
function weeksOfQuarter(key) { const qi = qInfo(key); return Object.keys(D.money.weeks).filter((id) => id >= qi.startId && id <= qi.endId && (+D.money.weeks[id].uberEarn || 0) > 0).sort(); }
function taxBox(id, compact) {
  const c = calc(getWeek(id)); if (!(c.weekTax > 0)) return '';
  const sa = weekSetAside(id), x = r2(c.weekTax), more = sa ? r2(x - (+sa.amount || 0)) : 0;
  return `<div class="taxbox" id="taxBox-${id}">${sa ? `<div class="tb-done">${ico('check')}<span>${T('Aktarıldı {x}', { x: usd2(+sa.amount || 0) })} ${perW(id)}</span><button type="button" class="link" data-act="taxUndo" data-week="${id}">${T('Geri al')}</button></div>${more > 0.5 ? `<div class="tb-q"><span>${T('Bu haftanın vergi payı arttı: {x} daha aktar', { x: `<b>${usd2(more)}</b>` })}</span><button type="button" class="btn sm" data-act="taxTopUp" data-week="${id}" id="taxTopUp-${id}">${ico('check')}${T('Aktardım')}</button></div>` : ''}`
    : `<div class="tb-q"><span>${T(id === thisWeekId() ? 'Bu hafta vergi kumbarasına {x} aktar' : 'Bu hafta için vergi kumbarasına {x} aktar', { x: `<b>${usd2(x)}</b>` })}</span><button type="button" class="btn sm" data-act="taxDone" data-week="${id}" id="taxDoneBtn-${id}">${ico('check')}${T('Aktardım')}</button></div>`}
    ${compact ? '' : `<p class="note" style="margin:6px 0 0">${T("GST, gelir vergisi, Medicare ve MLS'in bu haftaya düşen payı. Uygulama bankadan para aktarmaz; aktarınca 'Aktardım'a bas.")}</p>`}</div>`;
}
function taxWeeksCard(key) {
  const ids = weeksOfQuarter(key); if (!ids.length && !(Math.abs(taxFull(key).looseTax) > 0.005)) return '';
  const done = ids.filter((id) => weekSetAside(id)).length;
  return `<div class="card" id="taxWeeks">${head('cal', T('Haftalık aktarımlar'), `<span class="sub">${done}/${ids.length}</span>`)}<div class="wkt">${ids.map((id) => { const c = calc(getWeek(id)), sa = weekSetAside(id);
    return `<div class="wkt-row"><span class="wl">${weekLabel(id)}<small>${usd2(r2(c.weekTax))}</small></span>${sa ? `<span class="chip gain">${ico('check')}${T('aktarıldı')}${r2(c.weekTax) - (+sa.amount || 0) > 0.5 ? ' · ' + T('fark {x}', { x: usd2(r2(c.weekTax) - (+sa.amount || 0)) }) : ''}</span>` : `<button type="button" class="btn sm ghost" data-act="taxDone" data-week="${id}">${T('Aktardım')}</button>`}</div>`; }).join('')}</div>
    ${Math.abs(taxFull(key).looseTax) > 0.005 ? `<div class="wkt-row" id="taxLoose"><span class="wl">${T('Haftasız gider')}<small>${usd2(taxFull(key).looseTax)}</small></span><span class="sub">${T('Uber haftası yok')}</span></div>` : ''}
    <p class="note">${T('Haftalık tutarlar o haftanın gerçek kazanç ve giderlerinden hesaplanır; toplamları yukarıdaki çeyrek tutarına eşittir. Gider ekledikçe güncellenir.')}</p></div>`;
}
function markTaxDone(id) {
  if (weekSetAside(id)) return; const x = r2(weekTaxOf(id)); if (!(x > 0)) return;
  D.money.setAsides.push({ id: uid(), d: todayKey(), amount: x, q: quarterOf(id).key, week: id }); save();
}
function topUpTaxDone(id) { const sa = weekSetAside(id), x = r2(weekTaxOf(id)); if (!sa || !(x > (+sa.amount || 0))) return; sa.amount = x; sa.d = todayKey(); save(); }
function undoTaxDone(id) { D.money.setAsides = D.money.setAsides.filter((x) => x.week !== id); save(); }
// nearest upcoming BAS due date (the previous quarter's BAS falls due during the current one)
function nextBas() {
  let q = qShift(quarterOf(thisWeekId()).key, -1);
  for (let i = 0; i < 3; i++, q = qShift(q, 1)) { const d = daysUntil(qInfo(q).due); if (d >= 0) return { q, days: d, due: qInfo(q).due }; }
  return null;
}
