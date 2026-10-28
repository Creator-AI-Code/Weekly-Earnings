// ===================== LOGBOOK (Uber shifts by odometer → ATO 12-week car logbook) =====================
// money.trips: [{ id, start: ms, end: ms|null, kmStart, kmEnd }]   one Uber shift = online → offline
// money.odo:   [{ id, ts: ms, km }]                                  extra odometer readings (catch private km)
// money.lb:    { startTs, odoStart, vehicle, endTs?, odoEnd?, pct? } the current / last logbook period
const LB_WEEKS = 12, WEEK_MS = 7 * 864e5;
const TRIPS = () => D.money.trips;
const focusSoon = (id) => setTimeout(() => { const el = $(id); if (el) el.focus(); }, 60);
const openShift = () => TRIPS().find((t) => !t.end) || null;
// a shift left open from an earlier day (forgot to tap Bitir)
const isStale = (o) => !!o && keyOf(new Date(o.start)) !== todayKey() && Date.now() - o.start > 6 * 36e5;
const shiftKm = (t) => (t.end && t.kmEnd != null && t.kmStart != null ? Math.max(0, t.kmEnd - t.kmStart) : 0);
const fmtKm = (v) => nf0.format(Math.round(+v || 0));
const durTxt = (ms) => { const m = Math.max(0, Math.round(ms / 6e4)); return m < 60 ? T('{m} dk', { m }) : m % 60 ? T('{h} sa {m} dk', { h: Math.floor(m / 60), m: m % 60 }) : T('{h} sa', { h: m / 60 }); };
const dtLocal = (ts) => { const d = new Date(ts); return idOf(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fromDtLocal = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null; };
// every odometer reading the app knows about, oldest first
function odoReadings() {
  const r = [];
  TRIPS().forEach((t) => { if (t.kmStart != null) r.push({ ts: t.start, km: +t.kmStart }); if (t.end && t.kmEnd != null) r.push({ ts: t.end, km: +t.kmEnd }); });
  D.money.odo.forEach((o) => r.push({ ts: o.ts, km: +o.km }));
  const lb = D.money.lb; if (lb) { r.push({ ts: lb.startTs, km: +lb.odoStart }); if (lb.endTs && lb.odoEnd != null) r.push({ ts: lb.endTs, km: +lb.odoEnd }); }
  return r.filter((x) => isFinite(x.km) && x.ts).sort((a, b) => a.ts - b.ts);
}
const lastOdo = () => { const r = odoReadings(); return r.length ? r[r.length - 1] : null; };
// a reading must not go below the latest earlier reading (odometers only go up)
function odoFloor(ts) { let f = null; odoReadings().forEach((x) => { if (x.ts <= ts && (f == null || x.km > f)) f = x.km; }); return f; }
function lbStats() {
  const lb = D.money.lb; if (!lb) return null;
  const a = lb.startTs, b = lb.endTs || Date.now();
  const trips = TRIPS().filter((t) => t.end && t.start >= a && t.end <= b);
  const biz = trips.reduce((s, t) => s + shiftKm(t), 0);
  const top = odoReadings().filter((x) => x.ts >= a && x.ts <= b).reduce((m, x) => Math.max(m, x.km), +lb.odoStart);
  const total = Math.max(0, top - lb.odoStart), pctV = total > 0 ? Math.min(100, biz / total * 100) : null;
  const weeks = Math.min(LB_WEEKS, Math.floor((b - a) / WEEK_MS)), days = Math.floor((b - a) / 864e5);
  return { lb, a, b, trips, biz, total, top, pct: pctV, weeks, days, ready: b - a >= LB_WEEKS * WEEK_MS, done: !!lb.endTs };
}
function weekShifts(id) {
  const a = fromId(id).getTime(), b = a + WEEK_MS, ts = TRIPS().filter((t) => t.end && t.start >= a && t.start < b);
  return { n: ts.length, km: ts.reduce((s, t) => s + shiftKm(t), 0), ms: ts.reduce((s, t) => s + (t.end - t.start), 0) };
}

// ---------- Bugün card ----------
function shiftCard() {
  const o = openShift(), now = Date.now();
  if (o) {
    const stale = isStale(o);
    return `<section class="sec a-para shift ${stale ? 'stale' : 'on'}" id="shiftCard"><div class="shift-row"><span class="dot" aria-hidden="true"></span><span class="st"><b>${stale ? T('Vardiya açık kaldı') : T('Uber\'desin')}</b><span>${stale ? T('{d} {t} başladı · bitiş km\'sini gir', { d: dShort(keyOf(new Date(o.start))), t: hhmm(o.start) }) : T('{t}\'den beri · {x} · başlangıç {k} km', { t: hhmm(o.start), x: durTxt(now - o.start), k: fmtKm(o.kmStart) })}</span></span>
      <button type="button" class="btn sm" data-act="shiftEnd" id="shiftEndBtn">${T('Bitir')}</button></div></section>`;
  }
  const w = weekShifts(thisWeekId()), st = lbStats();
  const sub = [w.n ? T('Bu hafta {n} vardiya · {k} km · {h} sa', { n: w.n, k: fmtKm(w.km), h: nf1.format(w.ms / 36e5) }) : T('Online olunca gösterge km\'sini gir')];
  if (st && !st.done) sub.push(st.ready ? T('Logbook tamamlandı, bitir') : T('Logbook {n}/{t} hafta', { n: st.weeks, t: LB_WEEKS }));
  return `<section class="sec a-para shift" id="shiftCard"><div class="shift-row"><span class="ico" aria-hidden="true">${ico('car')}</span><span class="st"><b>${T('Uber vardiyası')}</b><span id="shiftSub">${sub.join(' · ')}</span></span>
    <button type="button" class="btn sm" data-act="shiftStart" id="shiftStartBtn">${ico('plus')}${T('Uber\'e başla')}</button></div></section>`;
}

// ---------- Vergi tab card ----------
function logbookCard() {
  const st = lbStats(), recent = TRIPS().filter((t) => t.end).sort((a, b) => b.start - a.start).slice(0, 8);
  const tripRow = (t) => `<div class="trip"><span class="mid"><b>${dShort(keyOf(new Date(t.start)))} · ${hhmm(t.start)}–${hhmm(t.end)}</b><span>${fmtKm(t.kmStart)} → ${fmtKm(t.kmEnd)} km · ${durTxt(t.end - t.start)}</span></span><b class="km">${T('{k} km', { k: fmtKm(shiftKm(t)) })}</b><button type="button" class="del${U.armed === t.id ? ' arm' : ''}" data-act="delTrip" data-id="${t.id}" aria-label="${T('Vardiyayı sil')}">${U.armed === t.id ? T('Sil?') : ico('x')}</button></div>`;
  const list = recent.length ? `<div class="trips" id="tripList">${recent.map(tripRow).join('')}</div>` : '';
  if (!st) {
    return `<div class="card" id="lbCard">${head('car', T('Araç logbook'))}
      <p class="note" style="margin-top:0">${T('ATO, araç giderlerinin Uber payını 12 haftalık logbook ile ister. Uber\'de online olduğun her km (yolcu beklerken bölge değiştirmek dahil) iş kullanımıdır; işe gidiş geliş ve özel kullanım değildir.')}</p>
      <div class="btns"><button type="button" class="btn sm" data-act="lbStart" id="lbStartBtn">${ico('flag')}${T('Logbook\'u başlat')}</button></div>${list}</div>`;
  }
  const p = st.pct, cur = logbook(), applyBtn = p != null && Math.floor(p) !== cur ? `<button type="button" class="btn sm" data-act="lbApply" id="lbApply">${T('Vergiye uygula: {p}', { p: pct(Math.floor(p)) })}</button>` : (p != null ? `<span class="chip gain">${T('Vergide kullanılıyor')}</span>` : '');
  const prog = Math.round(Math.min(st.b - st.a, LB_WEEKS * WEEK_MS) / (LB_WEEKS * WEEK_MS) * 100);
  return `<div class="card" id="lbCard">${head('car', T('Araç logbook'), `<span class="chip ${st.done ? 'gain' : 'acc'}">${st.done ? T('Tamamlandı') : T('{n}/{t} hafta', { n: st.weeks, t: LB_WEEKS })}</span>`)}
    <div class="tiles">${tile(T('Uber km'), fmtKm(st.biz), T('{n} vardiya', { n: st.trips.length }), 'lbBiz')}${tile(T('Toplam km'), fmtKm(st.total), T('gösterge farkı'), 'lbTotal')}${tile(T('Uber payı'), p == null ? '–' : pct(nf0.format(Math.floor(p))), T('vergide {p}', { p: pct(nf0.format(cur)) }), 'lbPct')}</div>
    ${st.done ? '' : `<div class="meter"><i style="width:${prog}%"></i></div>`}
    <p class="note">${st.done ? T('{a} – {b} arası. Logbook 5 yıl geçerli; arabanı ya da çalışma düzenini değiştirirsen yenisini başlat.', { a: longDate(new Date(st.a)), b: longDate(new Date(st.b)) })
      : T('Başlangıç: {d}, {k} km. Toplam km en son gösterge okumasından gelir; arada özel kullanım olduysa "Gösterge oku" ile güncelle.', { d: longDate(new Date(st.a)), k: fmtKm(st.lb.odoStart) })}</p>
    <div class="btns">${applyBtn}${st.done ? '' : `<button type="button" class="btn sm ghost" data-act="odoRead" id="odoReadBtn">${T('Gösterge oku')}</button>`}${!st.done && st.ready ? `<button type="button" class="btn sm" data-act="lbEnd" id="lbEndBtn">${T('Logbook\'u bitir')}</button>` : ''}
      <button type="button" class="btn sm ghost" data-act="lbExport" id="lbExport">${ico('backup')}${T('Logbook dosyası')}</button>${st.done ? `<button type="button" class="btn sm ghost" data-act="lbNew">${T('Yeni logbook')}</button>` : `<button type="button" class="link" data-act="delLb" data-id="lbCancel" id="lbCancel">${U.armed === 'lbCancel' ? T('Emin misin? Tekrar dokun') : T('Logbook\'u iptal et')}</button>`}</div>
    ${list}</div>`;
}

// ---------- sheets ----------
function shiftSheet(sh) {
  const o = sh.id ? TRIPS().find((t) => t.id === sh.id) : null, lo = lastOdo();
  const title = { start: T('Uber\'e başla'), end: T('Vardiyayı bitir'), odo: T('Gösterge oku'), lbStart: T('Logbook\'u başlat'), lbEnd: T('Logbook\'u bitir') }[sh.mode];
  const ts = sh.ts || (sh.mode === 'end' && isStale(o) ? Math.min(Date.now(), o.start + 4 * 36e5) : Date.now());
  const hint = sh.mode === 'end' && o ? T('Başlangıç: {t}, {k} km', { t: hhmm(o.start), k: fmtKm(o.kmStart) }) : lo ? T('Son okuma: {k} km ({d})', { k: fmtKm(lo.km), d: dShort(keyOf(new Date(lo.ts))) }) : T('Aracın göstergesindeki toplam km');
  return sheetShell(title, `<form class="stack" id="shiftForm" data-mode="${sh.mode}">
    <div class="field"><label for="odoKm">${T('Gösterge (km)')}</label><div class="money"><input id="odoKm" inputmode="numeric" autocomplete="off" value="${sh.km != null ? esc(sh.km) : ''}" placeholder="${lo ? fmtKm(lo.km) : '0'}"><span>km</span></div><span class="hint" id="odoHint">${hint}</span></div>
    <div class="field"><label for="odoAt">${sh.mode === 'odo' || sh.mode.startsWith('lb') ? T('Tarih ve saat') : sh.mode === 'start' ? T('Online olduğun saat') : T('Offline olduğun saat')}</label><input class="txt" type="datetime-local" id="odoAt" value="${dtLocal(ts)}"></div>
    ${sh.mode === 'lbStart' ? `<div class="field"><label for="lbVeh">${T('Araç (marka, model, plaka)')}</label><input class="txt" id="lbVeh" value="${esc(sh.veh || [carName(), CAR().engine ? CAR().engine + ' L' : '', CAR().plate].filter(Boolean).join(', '))}" placeholder="${T('ör. BMW X3 2015, 351LZ6')}" autocomplete="off"></div><p class="note" style="margin:0">${T('12 hafta boyunca her Uber vardiyasında başlangıç ve bitiş km\'sini gir. Sonunda Uber payın otomatik hesaplanır.')}</p>` : ''}
    ${sh.mode === 'end' && isStale(o) ? `<p class="note" style="margin:0">${T('Vardiyayı bitirmeyi unutmuşsun; saati gerçek bitiş saatine göre düzelt.')}</p>` : ''}
    <p class="err" id="odoErr" role="alert" hidden></p>
    <button class="btn" type="submit" id="odoSave">${sh.mode === 'start' ? T('Başla') : sh.mode === 'end' ? T('Bitir') : T('Kaydet')}</button>
    ${sh.mode === 'end' && o ? `<button type="button" class="btn ghost" data-act="delTrip" data-id="${o.id}">${U.armed === o.id ? T('Silmek için tekrar dokun') : T('Bu vardiyayı sil')}</button>` : ''}</form>`, 'a-para');
}
// returns an error string or null; saves on success
function submitShift(mode) {
  const raw = val('odoKm').replace(/\D/g, ''), km = raw ? parseInt(raw, 10) : null, ts = fromDtLocal(val('odoAt'));
  if (km == null || !(km >= 0) || km > 3e6) return T('Göstergedeki km\'yi yaz.');
  if (!ts) return T('Tarih ve saati seç.');
  if (ts > Date.now() + 5 * 6e4) return T('Gelecekte bir saat seçilemez.');
  const o = openShift();
  if (mode === 'end') {
    if (!o) return T('Açık vardiya yok.');
    if (ts <= o.start) return T('Bitiş saati başlangıçtan ({t}) sonra olmalı.', { t: hhmm(o.start) });
    if (km < o.kmStart) return T('Bitiş km\'si başlangıçtan ({k}) küçük olamaz.', { k: fmtKm(o.kmStart) });
    if (km - o.kmStart > 1500) return T('Tek vardiyada {k} km çok fazla; rakamı kontrol et.', { k: fmtKm(km - o.kmStart) });
    o.end = ts; o.kmEnd = km; save();
    return { msg: T('Vardiya kaydedildi: {k} km · {d}', { k: fmtKm(km - o.kmStart), d: durTxt(ts - o.start) }) };
  }
  const fl = odoFloor(ts); if (fl != null && km < fl) return T('Gösterge daha önceki okumadan ({k} km) küçük olamaz.', { k: fmtKm(fl) });
  if (mode === 'start') {
    if (o) return T('Zaten açık bir vardiya var.');
    TRIPS().push({ id: uid(), start: ts, end: null, kmStart: km, kmEnd: null }); save();
    return { msg: T('İyi vardiyalar! Başlangıç {k} km', { k: fmtKm(km) }) };
  }
  if (mode === 'odo') { D.money.odo.push({ id: uid(), ts, km }); save(); return { msg: T('Gösterge kaydedildi: {k} km', { k: fmtKm(km) }) }; }
  if (mode === 'lbStart') { D.money.lb = { startTs: ts, odoStart: km, vehicle: val('lbVeh').trim() }; save(); return { msg: T('Logbook başladı. 12 hafta sonra hatırlatacağım.') }; }
  if (mode === 'lbEnd') {
    const lb = D.money.lb; if (!lb) return T('Logbook yok.'); if (ts <= lb.startTs) return T('Bitiş, başlangıçtan sonra olmalı.');
    lb.endTs = ts; lb.odoEnd = km; const st = lbStats(); lb.pct = st.pct == null ? null : Math.floor(st.pct);
    if (lb.pct != null) S.logbookPct = Math.max(1, lb.pct); save();
    return { msg: lb.pct != null ? T('Logbook tamamlandı: Uber payın {p}. Vergi ayarına uygulandı.', { p: pct(lb.pct) }) : T('Logbook tamamlandı.') };
  }
  return null;
}

// ---------- export (ATO logbook as CSV) ----------
function lbCSV() {
  const st = lbStats(); if (!st) return null; const lb = st.lb;
  const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const dt = (ts) => { const d = new Date(ts); return idOf(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const c0 = CAR(), y1 = new Date(st.a).getMonth() >= 6 ? new Date(st.a).getFullYear() : new Date(st.a).getFullYear() - 1, f1 = fyOdo(y1), f2 = fyOdo(y1 + 1);
  const L = [['Momentum car logbook (rideshare)'], ['Vehicle', carName() || lb.vehicle || ''], ['Engine capacity', c0.engine ? c0.engine + ' L' : ''], ['Registration', c0.plate || ''], ['Logbook period', idOf(new Date(st.a)) + ' to ' + idOf(new Date(st.b))],
    ['Odometer at start', Math.round(lb.odoStart)], ['Odometer at end', Math.round(st.top)], ['Total km', Math.round(st.total)], ['Business km', Math.round(st.biz)],
    ['Business use %', st.pct == null ? '' : Math.floor(st.pct)],
    ['Odometer 1 July ' + y1, f1 ? Math.round(f1.km) : ''], ['Odometer 1 July ' + (y1 + 1), f2 ? Math.round(f2.km) : ''], [],
    ['Date', 'Start', 'End', 'Odometer start', 'Odometer end', 'Km', 'Purpose']];
  st.trips.slice().sort((a, b) => a.start - b.start).forEach((t) => L.push([idOf(new Date(t.start)), dt(t.start).slice(11), dt(t.end).slice(11), Math.round(t.kmStart), Math.round(t.kmEnd), Math.round(shiftKm(t)), 'Uber X rideshare: logged on (passenger trips, pickups and repositioning)']));
  return L.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
}
