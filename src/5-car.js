// ===================== ARACIM (vehicle profile, renewals with costs + reminders, fuel consumption, FY odometer) =====================
// money.car: { make, model, year, engine, plate, fuel }   money.renewals: [{ id, kind, due, cost, every (months, 0 = once), note }]
const REN_KINDS = [['rego', 'Rego (CTP dahil)', 'receipt', 'rego'], ['insurance', 'Kasko sigortası', 'receipt', 'insurance'], ['bhsl', 'BHSL', 'receipt', 'rego'], ['da', 'Sürücü izni (DA)', 'receipt', 'rego'], ['inspection', 'Araç muayenesi', 'car', 'service'], ['service', 'Servis', 'car', 'service'], ['tyres', 'Lastik', 'car', 'tyres'], ['other', 'Diğer', 'list', 'other']];
const renName = (r) => { const k = REN_KINDS.find((x) => x[0] === r.kind); return r.kind === 'other' && r.note ? r.note : T(k ? k[1] : 'Diğer'); };
const CAR = () => D.money.car || {};
const carName = () => { const c = CAR(); return [c.make, c.model, c.year].filter(Boolean).join(' '); };
const addMonths = (k, n) => { const d = parseKey(k), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return keyOf(d); };
const daysTo = (k) => Math.round((parseKey(k).setHours(0, 0, 0, 0) - parseKey(todayKey()).setHours(0, 0, 0, 0)) / 864e5);
// the next 12 months of renewal costs (a 6-monthly rego counts twice)
function renewalYear() {
  const end = keyOf(addDays(new Date(), 365)), items = [];
  D.money.renewals.forEach((r) => { if (!r.due) return; let d = r.due; for (let i = 0; i < 6 && d <= end; i++) { if (d >= todayKey()) items.push({ r, d, cost: +r.cost || 0 }); if (!(+r.every > 0)) break; d = addMonths(d, +r.every); } });
  items.sort((a, b) => a.d.localeCompare(b.d));
  const total = items.reduce((s, x) => s + x.cost, 0);
  return { items, total, weekly: total / 52 };
}
const dueSoon = () => D.money.renewals.filter((r) => r.due && daysTo(r.due) <= 30).sort((a, b) => a.due.localeCompare(b.due));
function dueChip(k) { const n = daysTo(k); return `<span class="chip ${n < 0 ? 'loss' : n <= 14 ? 'loss' : n <= 30 ? 'warn' : ''}">${n < 0 ? T('{n} gün geçti', { n: -n }) : n === 0 ? T('bugün') : T('{n} gün', { n })}</span>`; }

// ---------- fuel consumption from fills that carry an odometer reading and litres ----------
function fuelStats() {
  const fills = []; Object.values(D.money.weeks).forEach((w) => (w.daily || []).forEach((x) => { if (x.odo > 0 && x.litres > 0) fills.push(x); }));
  fills.sort((a, b) => a.odo - b.odo); if (fills.length < 2) return null;
  const last = fills.slice(-4); let km = 0, l = 0, cost = 0;
  for (let i = 1; i < last.length; i++) { const d = last[i].odo - last[i - 1].odo; if (d <= 0 || d > 2500) continue; km += d; l += +last[i].litres; cost += +last[i].amount || 0; }
  return km > 0 ? { lPer100: l / km * 100, perKm: cost / km, km, n: last.length - 1 } : null;
}

// ---------- Vergi tab: Aracım card ----------
function carCard() {
  const c = CAR(), ry = renewalYear(), fs = fuelStats(), list = D.money.renewals.slice().sort((a, b) => String(a.due).localeCompare(String(b.due)));
  const row = (r) => `<button type="button" class="hold wrap" data-act="editRen" data-id="${r.id}"><span class="sym">${ico(REN_KINDS.find((x) => x[0] === r.kind) ? REN_KINDS.find((x) => x[0] === r.kind)[2] : 'list')}</span><span class="mid"><b>${esc(renName(r))}</b><span>${r.due ? T('Bitiş {d}', { d: longDate(parseKey(r.due)) }) : T('Tarih yok')}${+r.every > 0 ? ' · ' + T('{n} ayda bir', { n: r.every }) : ''}</span></span><span class="rt"><b>${+r.cost > 0 ? usd2(+r.cost) : '–'}</b>${r.due ? dueChip(r.due) : ''}</span></button>`;
  return `<div class="card" id="carCard">${head('car', carName() ? esc(carName()) : T('Aracım'), `<button type="button" class="btn sm soft" data-act="editCar" id="editCarBtn">${ico('pen')}${c.plate ? esc(c.plate) : T('Bilgiler')}</button>`)}
    ${carName() ? `<p class="note" style="margin-top:0">${[c.engine ? T('{x} L motor', { x: inNum(c.engine) }) : '', c.fuel ? T(c.fuel === 'diesel' ? 'Dizel' : c.fuel === 'hybrid' ? 'Hibrit' : c.fuel === 'ev' ? 'Elektrik' : 'Benzin') : '', fs ? T('{l} L/100km · km başı {x}', { l: nf1.format(fs.lPer100), x: usd2(fs.perKm) }) : ''].filter(Boolean).join(' · ')}</p>` : `<p class="note" style="margin-top:0">${T('Marka, model, motor hacmi ve plakayı gir. Logbook dosyasına da yazılır.')}</p>`}
    ${list.length ? `<div class="list" id="renList">${list.map(row).join('')}</div>` : `<p class="note">${T('Rego, sigorta, BHSL ve muayene bitiş tarihlerini ekle; yaklaşınca hatırlatayım ve masrafı önceden biriktir.')}</p>`}
    <div class="btns" style="margin-top:10px"><button type="button" class="btn sm" data-act="newRen" id="newRenBtn">${ico('plus')}${T('Yenileme ekle')}</button></div>
    ${ry.total > 0 ? `<div class="ren-sum" id="renSum"><span>${T('Önümüzdeki 12 ay: {x}', { x: usd(ry.total) })}</span><b>${T('Haftada {x} ayır', { x: usd2(r2(ry.weekly)) })}</b></div>` : ''}
    ${fs ? '' : `<p class="note">${T('Yakıt fişinde gösterge km’sini ve litreyi girersen arabanın gerçek tüketimini (L/100km) ve km başı maliyetini hesaplarım.')}</p>`}</div>`;
}
function carSheet() {
  const c = CAR();
  return sheetShell(T('Aracım'), `<form class="stack" id="carForm"><div class="fields"><div class="field"><label for="carMake">${T('Marka')}</label><input class="txt" id="carMake" value="${esc(c.make || '')}" placeholder="BMW" autocomplete="off"></div>
    <div class="field"><label for="carModel">${T('Model')}</label><input class="txt" id="carModel" value="${esc(c.model || '')}" placeholder="X3 xDrive20d" autocomplete="off"></div></div>
    <div class="fields"><div class="field"><label for="carYear">${T('Yıl')}</label><input class="txt" id="carYear" inputmode="numeric" value="${esc(c.year || '')}" placeholder="2015"></div>
    <div class="field"><label for="carEngine">${T('Motor hacmi')}</label><div class="money"><input id="carEngine" inputmode="decimal" value="${c.engine ? inNum(c.engine) : ''}" placeholder="2,0"><span>L</span></div></div></div>
    <div class="fields"><div class="field"><label for="carPlate">${T('Plaka (rego)')}</label><input class="txt" id="carPlate" value="${esc(c.plate || '')}" autocapitalize="characters" autocomplete="off"></div>
    <div class="field"><label for="carFuel">${T('Yakıt')}</label><select class="txt" id="carFuel">${[['petrol', 'Benzin'], ['diesel', 'Dizel'], ['hybrid', 'Hibrit'], ['ev', 'Elektrik']].map(([k, l]) => `<option value="${k}" ${c.fuel === k ? 'selected' : ''}>${T(l)}</option>`).join('')}</select></div></div>
    <p class="note" style="margin:0">${T('ATO logbook’ta marka, model, motor hacmi ve plakayı ister.')}</p><button class="btn" type="submit">${T('Kaydet')}</button></form>`, 'a-para');
}
function renSheet(sh) {
  const r = sh.id ? D.money.renewals.find((x) => x.id === sh.id) : null, v = (k, d) => (sh[k] != null ? sh[k] : r ? r[k] : d);
  return sheetShell(r ? renName(r) : T('Yenileme ekle'), `<form class="stack" id="renForm">
    <div class="field"><label for="renKind">${T('Ne?')}</label><select class="txt" id="renKind">${REN_KINDS.map(([k, l]) => `<option value="${k}" ${v('kind', 'rego') === k ? 'selected' : ''}>${T(l)}</option>`).join('')}</select></div>
    <div class="fields"><div class="field"><label for="renDue">${T('Bitiş / son gün')}</label><input class="txt" type="date" id="renDue" value="${esc(v('due', ''))}"></div>
    <div class="field"><label for="renCost">${T('Tahmini maliyet')}</label><div class="money"><span>$</span><input id="renCost" inputmode="decimal" value="${v('cost', '') !== '' && v('cost', '') != null ? fmtIn(+v('cost', 0)) : ''}" placeholder="0"></div></div></div>
    <div class="field"><label for="renEvery">${T('Tekrar')}</label><select class="txt" id="renEvery">${[[12, 'Yılda bir'], [6, '6 ayda bir'], [3, '3 ayda bir'], [0, 'Tek sefer']].map(([n, l]) => `<option value="${n}" ${+v('every', 12) === n ? 'selected' : ''}>${T(l)}</option>`).join('')}</select></div>
    <div class="field"><label for="renNote">${T('Not (isteğe bağlı)')}</label><input class="txt" id="renNote" value="${esc(v('note', ''))}" autocomplete="off" placeholder="${T('ör. Suncorp, poliçe no')}"></div>
    <p class="err" id="renErr" role="alert" hidden></p><button class="btn" type="submit" id="renSave">${T('Kaydet')}</button>
    ${r ? `<button type="button" class="btn soft" data-act="renDone" data-id="${r.id}" id="renDone">${ico('check')}${T('Yeniledim')}</button><button type="button" class="btn ghost" data-act="delRen" data-id="${r.id}">${U.armed === r.id ? T('Silmek için tekrar dokun') : T('Sil')}</button>` : ''}</form>`, 'a-para');
}
function saveRen() {
  const due = val('renDue'), cost = parse(val('renCost')), kind = val('renKind');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return T('Bitiş tarihini seç.');
  const rec = { kind, due, cost: cost === '' ? 0 : cost, every: +val('renEvery') || 0, note: val('renNote').trim() };
  const sh = U.sheet, r = sh.id ? D.money.renewals.find((x) => x.id === sh.id) : null;
  if (r) Object.assign(r, rec); else D.money.renewals.push(Object.assign({ id: uid() }, rec));
  save(); scheduleNotifs(); return { msg: T('Kaydedildi: {x}', { x: renName(rec) }) };
}
// "Yeniledim": log the payment as an Uber expense (GST/logbook rules of its category) and roll the date forward
function renewDone(id) {
  const r = D.money.renewals.find((x) => x.id === id); if (!r) return;
  const k = REN_KINDS.find((x) => x[0] === r.kind), cat = k ? k[3] : 'other', def = catDefaults(cat);
  if (+r.cost > 0) D.money.uberExpenses.push({ id: uid(), d: todayKey(), cat, amount: +r.cost, gst: def.gst, biz: def.biz, bizAuto: isCarCat(cat) && Math.abs(def.biz - logbook()) < 0.01, note: renName(r) });
  if (+r.every > 0) { let d = addMonths(r.due, +r.every); while (d <= todayKey()) d = addMonths(d, +r.every); r.due = d; } else D.money.renewals = D.money.renewals.filter((x) => x.id !== id);
  save(); scheduleNotifs();
  toast(+r.cost > 0 ? T('{x} Uber giderlerine eklendi. Yeni bitiş: {d}', { x: usd2(+r.cost), d: r.due ? dShort(r.due) : '–' }) : T('Yeni bitiş: {d}', { d: dShort(r.due) }));
}
// Bugün: one line per renewal due within 30 days; around 30 June / 1 July: the financial-year odometer reading
function carLines() {
  let h = '';
  dueSoon().slice(0, 2).forEach((r) => { const n = daysTo(r.due); h += `<button type="button" class="taxline a-para due-line${n <= 14 ? ' hot' : ''}" data-act="go" data-tab="para" data-seg="vergi">${ico('car')}<span>${n < 0 ? T('{x} {n} gün önce bitti', { x: renName(r), n: -n }) : T('{x} {d} bitiyor · {n} gün', { x: renName(r), d: dShort(r.due), n })}${+r.cost > 0 ? ' · ' + usd(+r.cost) : ''}</span>${ico('right')}</button>`; });
  if (fyOdoDue()) h += `<button type="button" class="taxline a-para" data-act="odoRead" id="fyOdoLine">${ico('flag')}<span>${T('Mali yıl sonu: arabanın gösterge km’sini gir (ATO)')}</span>${ico('right')}</button>`;
  return h;
}
function fyOdoDue() {
  const t = new Date(), y = t.getMonth() >= 6 ? t.getFullYear() : t.getFullYear(), a = new Date(y, 5, 24).getTime(), b = new Date(y, 6, 7, 23, 59).getTime(), now = t.getTime();
  if (now < a || now > b || (!D.money.trips.length && !D.money.lb)) return false;
  return !odoReadings().some((x) => x.ts >= a && x.ts <= b);
}
// odometer reading nearest to 1 July of a year (for the logbook file / FY summary)
function fyOdo(y) { const t = new Date(y, 6, 1).getTime(); let best = null; odoReadings().forEach((x) => { if (Math.abs(x.ts - t) <= 10 * 864e5 && (!best || Math.abs(x.ts - t) < Math.abs(best.ts - t))) best = x; }); return best; }
function renewalNotifs(base, hm) {
  const out = []; let id = 300; const t = hm(notifCfg().car.time);
  D.money.renewals.forEach((r) => { if (!r.due) return; const due = parseKey(r.due); [30, 7, 1].forEach((before) => { const at = new Date(due.getFullYear(), due.getMonth(), due.getDate() - before, t.hour, t.minute); if (at > new Date() && id < 380) out.push(Object.assign({ id: id++, title: 'Momentum', body: T('{x} {d} tarihinde bitiyor{c}.', { x: renName(r), d: longDate(due), c: +r.cost > 0 ? ' (' + usd(+r.cost) + ')' : '' }), schedule: { at, allowWhileIdle: true } }, base)); }); });
  const y = new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear(), at = new Date(y, 5, 30, 18, 0);
  if (at > new Date() && (D.money.trips.length || D.money.lb)) out.push(Object.assign({ id: 390, title: 'Momentum', body: T('Mali yıl bitiyor: arabanın gösterge km’sini Momentum’a gir (ATO logbook).'), schedule: { at, allowWhileIdle: true } }, base));
  return out;
}
