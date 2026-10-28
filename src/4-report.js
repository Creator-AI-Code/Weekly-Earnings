// ===================== RAPOR (Para → Rapor): this week vs last week, spending donut, patterns, 8-week trend =====================
const RCOL = { yemek: '#b5536b', market: '#2f7d6b', kahve: '#a0702a', yakit: '#6b4e8a', ulasim: '#4f6fa8', eglence: '#c2603a', fatura: '#7b1e3c', diger: '#8d8178' };
const catOf = (x) => (x.cat && RCOL[x.cat] ? x.cat : 'diger');
function repWeek(id) {
  const w = getWeek(id), c = calc(w || {}), hr = hourly(id), u = hr.rows.find((r) => r.k === 'uber');
  const daily = (w && w.daily) || [], by = {}, reg = {}; let oneOff = 0;
  daily.forEach((x) => { const k = catOf(x), a = +x.amount || 0; by[k] = (by[k] || 0) + a; if (x.oneOff) oneOff += a; else reg[k] = (reg[k] || 0) + a; });
  const spend = daily.reduce((s, x) => s + (+x.amount || 0), 0);
  return { id, w, c, has: hasData(w), E: c.E, H: u ? u.h : 0, gH: u && u.h > 0 ? c.E / u.h : null, nH: u ? u.rate : null, net: c.E > 0 ? c.uberNet : null, spend, left: c.left, by, reg, oneOff, regSpend: spend - oneOff, daily };
}
function chg(a, b, goodUp) {
  const k = (up) => (goodUp == null ? '' : up === goodUp ? 'good' : 'bad');
  if (a == null || b == null || !isFinite(a) || !isFinite(b)) return '<span class="rc">–</span>';
  const d = a - b; if (Math.abs(b) < 0.01) return Math.abs(d) < 0.01 ? '<span class="rc">–</span>' : `<span class="rc ${k(d > 0)}">${d > 0 ? '▲' : '▼'}</span>`;
  const p = d / Math.abs(b) * 100; if (Math.abs(p) < 1) return `<span class="rc">${T('aynı')}</span>`;
  return `<span class="rc ${k(p > 0)}">${p > 0 ? '▲' : '▼'}${nf0.format(Math.abs(p))}%</span>`;
}
function donut(parts, total) {
  const R = 52, C = 2 * Math.PI * R; let off = 0;
  const segs = parts.map((p) => { const len = total > 0 ? p.v / total * C : 0, s = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${RCOL[p.k]}" stroke-width="22" stroke-dasharray="${Math.max(0, len - 1.5).toFixed(2)} ${(C - Math.max(0, len - 1.5)).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"/>`; off += len; return s; }).join('');
  return `<svg class="donut" viewBox="0 0 140 140" role="img" aria-label="${T('Harcama dağılımı')}"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="22"/>${segs}
    <text x="70" y="66" text-anchor="middle" class="dk">${T('Toplam')}</text><text x="70" y="84" text-anchor="middle" class="dv">${usd(total)}</text></svg>`;
}
// patterns over the last 4 weeks that have spending (one-offs left out so a big purchase doesn't skew habits)
function patterns(id) {
  const ids = []; for (let i = 0; i < 8 && ids.length < 4; i++) { const wid = idOf(addDays(fromId(id), -7 * i)); const w = getWeek(wid); if (w && (w.daily || []).some((x) => !x.oneOff && x.cat !== FUEL_CAT)) ids.push(wid); }
  if (!ids.length) return [];
  const ex = []; ids.forEach((wid) => (getWeek(wid).daily || []).forEach((x) => { if (!x.oneOff && x.cat !== FUEL_CAT && /^\d{4}-\d{2}-\d{2}$/.test(x.date || '')) ex.push(x); }));
  const n = ids.length, out = [], by = {}; ex.forEach((x) => { const k = catOf(x); by[k] = (by[k] || 0) + (+x.amount || 0); });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  if (top) out.push({ ic: 'bag', t: T('En çok {c} için harcıyorsun: haftada ~{w}, ayda ~{m}.', { c: dcatName(top[0]) || T('Diğer'), w: usd(top[1] / n), m: usd(top[1] / n * 4.33) }) });
  const cof = ex.filter((x) => x.cat === 'kahve');
  if (cof.length) out.push({ ic: 'spark', t: T('Haftada ortalama {n} kahve ({x}). Ayda ~{m} ediyor.', { n: nf1.format(cof.length / n).replace(/[,.]0$/, ''), x: usd(cof.reduce((s, x) => s + (+x.amount || 0), 0) / n), m: usd(cof.reduce((s, x) => s + (+x.amount || 0), 0) / n * 4.33) }) });
  const wd = [0, 0, 0, 0, 0, 0, 0]; ex.forEach((x) => { wd[parseKey(x.date).getDay()] += +x.amount || 0; });
  const mxD = wd.indexOf(Math.max(...wd)); if (wd[mxD] > 0) out.push({ ic: 'cal', t: T('En çok harcadığın gün: {d} (haftada ortalama {x}).', { d: DAYS_LONG[mxD], x: usd(wd[mxD] / n) }) });
  const we = (wd[0] + wd[6]) / 2, wk = (wd[1] + wd[2] + wd[3] + wd[4] + wd[5]) / 5;
  if (we > 0 && wk > 0 && (we / wk > 1.3 || wk / we > 1.3)) out.push({ ic: 'trend', t: we > wk ? T('Hafta sonu günlük harcaman hafta içinin {r} katı.', { r: nf1.format(we / wk) }) : T('Hafta içi günlük harcaman hafta sonunun {r} katı.', { r: nf1.format(wk / we) }) });
  out.note = n < 4 ? T('{n} haftalık veriye göre; veri arttıkça netleşir.', { n }) : T('Son 4 haftaya göre, tek seferlik harcamalar ve yakıt hariç.');
  return out;
}
function headline(A, B) {
  const s = [];
  if (A.nH != null && B.nH != null && Math.abs(B.nH) > 0.01) { const p = (A.nH - B.nH) / Math.abs(B.nH) * 100; if (Math.abs(p) >= 5) s.push(p > 0 ? T("Uber'de saat başı %{p} daha fazla kazandın.", { p: nf0.format(p) }) : T("Uber'de saat başı %{p} daha az kazandın.", { p: nf0.format(-p) })); }
  else if (A.E > 0 && B.E > 0) { const p = (A.E - B.E) / B.E * 100; if (Math.abs(p) >= 5) s.push(p > 0 ? T('Uber kazancın %{p} arttı.', { p: nf0.format(p) }) : T('Uber kazancın %{p} azaldı.', { p: nf0.format(-p) })); }
  if (B.regSpend > 0) {
    const p = (A.regSpend - B.regSpend) / B.regSpend * 100, d = Object.keys(Object.assign({}, A.reg, B.reg)).map((k) => [k, (A.reg[k] || 0) - (B.reg[k] || 0)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    if (Math.abs(p) >= 5) s.push((p > 0 ? T('Harcaman %{p} arttı', { p: nf0.format(p) }) : T('Harcaman %{p} azaldı', { p: nf0.format(-p) })) + (d && Math.abs(d[1]) >= 5 ? T(', en çok {c} ({x}).', { c: dcatName(d[0]) || T('Diğer'), x: (d[1] > 0 ? '+' : '−') + usd(Math.abs(d[1])) }) : '.'));
    else s.push(T('Harcaman geçen haftayla aynı seviyede.'));
    if (A.oneOff >= 1) s.push(T('(Tek seferlik {x} hariç.)', { x: usd(A.oneOff) }));
  }
  return s.join(' ');
}
function paraReport() {
  const id = U.cur, pid = idOf(addDays(fromId(id), -7)), A = repWeek(id), B = repWeek(pid);
  const nav = `<div class="weeknav" data-swipe-zone="week"><button type="button" data-act="weekGo" data-d="-1" aria-label="${T('Önceki hafta')}">${ico('left')}</button><div class="lbl"><span id="repLbl">${weekLabel(id)}</span><small>${T('{a} ile karşılaştırma', { a: weekLabel(pid) })}</small></div><button type="button" data-act="weekGo" data-d="1" aria-label="${T('Sonraki hafta')}">${ico('right')}</button></div>`;
  if (!A.has && !B.has) return nav + `<section class="sec">${empty('receipt', T('Bu hafta için veri yok'), T('Uber kazancı, saat ve harcamaları girdikçe rapor burada oluşur.'))}</section>`;
  const m = (v) => (v == null ? '–' : usd(v)), mh = (v) => (v == null ? '–' : T('{x}/sa', { x: usd2(r2(v)) })), hh = (v) => (v ? T('{n} sa', { n: nf1.format(v).replace(/[,.]0$/, '') }) : '–');
  const row = (id0, l, a, b, f, goodUp) => `<tr id="${id0}"><th scope="row">${l}</th><td>${f(b)}</td><td>${f(a)}</td><td>${chg(a, b, goodUp)}</td></tr>`;
  const cmp = `<section class="sec" id="repCmp">${secHead(T('Kazanç performansı'))}
    ${headline(A, B) ? `<p class="rep-head" id="repHead">${esc(headline(A, B))}</p>` : ''}
    <div class="tbl-wrap"><table class="rep"><thead><tr><th></th><th>${T('Geçen')}</th><th>${T('Bu hafta')}</th><th></th></tr></thead><tbody>
    ${row('rE', T('Uber brüt'), A.E || null, B.E || null, m, true)}
    ${row('rH', T('Uber saati'), A.H || null, B.H || null, hh, null)}
    ${row('rGH', T('Brüt / saat'), A.gH, B.gH, mh, true)}
    ${row('rNH', T('Net / saat'), A.nH, B.nH, mh, true)}
    ${row('rNet', T('Uber gerçek kâr'), A.net, B.net, m, true)}
    ${row('rSp', T('Harcamalar'), A.spend, B.spend, m, false)}
    ${row('rLeft', T('Elinde kalan'), A.has ? A.left : null, B.has ? B.left : null, m, true)}
    </tbody></table></div><p class="note">${T('Net / saat: GST, yakıt, araç masraf payı ve vergi düşülmüş Uber kazancı. Harcamalar günlük listeden (yakıt dahil); kira gibi tekrarlayanlar hariç.')}</p></section>`;
  const parts = Object.entries(A.by).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v }));
  const pie = parts.length ? `<section class="sec" id="repPie">${secHead(T('Harcama dağılımı'), `<span class="sub">${T('bu hafta')}</span>`)}<div class="pie-wrap">${donut(parts, A.spend)}
    <ul class="legend">${parts.map((p) => { const d = p.v - (B.by[p.k] || 0); return `<li><i style="background:${RCOL[p.k]}"></i><span class="n">${esc(dcatName(p.k) || T('Diğer'))}</span><span class="v">${usd(p.v)}</span><span class="s">${nf0.format(p.v / A.spend * 100)}%${B.has && Math.abs(d) >= 1 ? ` <em class="${d > 0 ? 'bad' : 'good'}">${d > 0 ? '+' : '−'}${usd(Math.abs(d))}</em>` : ''}</span></li>`; }).join('')}</ul></div></section>` : '';
  const pt = patterns(id);
  const pat = pt.length ? `<section class="sec" id="repPat">${secHead(T('Harcama alışkanlıkların'))}<ul class="pats">${pt.map((x) => `<li>${ico(x.ic)}<span>${esc(x.t)}</span></li>`).join('')}</ul><p class="note">${pt.note}</p></section>` : '';
  const wk = []; for (let i = 7; i >= 0; i--) wk.push(idOf(addDays(fromId(id), -7 * i)));
  const rs = wk.map((w0) => repWeek(w0)), lbl = (w0) => dShort(w0);
  const trend = rs.filter((r) => r.has).length >= 2 ? `<section class="sec" id="repTrend">${secHead(T('Son 8 hafta'))}
    <div class="tr-h"><b>${T('Uber net / saat')}</b></div>${lineChart(rs.map((r, i) => ({ v: r.nH == null ? null : r2(r.nH), lbl: lbl(wk[i]) })), { label: T('Uber net / saat'), fmt: (v) => '$' + Math.round(v), tip: (p) => T('{d} haftası: {x}', { d: p.lbl, x: T('{x}/sa', { x: usd2(p.v) }) }) })}
    <div class="tr-h"><b>${T('Harcamalar')}</b></div>${barChart(rs.map((r, i) => ({ v: r.has ? r.spend : 0, lbl: lbl(wk[i]) })), { label: T('Haftalık harcamalar'), color: 'var(--gold-line)', fmt: (v) => '$' + Math.round(v), tip: (p) => T('{d} haftası: {x}', { d: p.lbl, x: usd2(p.v) }) })}</section>` : '';
  return nav + cmp + pie + pat + trend;
}
