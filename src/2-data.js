// ===================== backup: export / import (3 formats) =====================
function capPlugin(n) { const C = window.Capacitor; if (!C) return null; return (C.Plugins && C.Plugins[n]) || (C.registerPlugin ? C.registerPlugin(n) : null); }
// Saves a text file: the Android app writes it and opens the share sheet (the WebView cannot download blobs);
// the browser downloads it. Resolves { name, how: download|share|clip|cancel } or null.
async function saveFile(name, text, mime) {
  if (isNative()) {
    try {
      const FS = capPlugin('Filesystem'), SH = capPlugin('Share');
      const w = await FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      await SH.share({ title: name, text: name, url: w.uri, dialogTitle: T('Dosyayı kaydet veya gönder') });
      return { name, how: 'share' };
    } catch (e) {
      if (/cancel/i.test(String(e && (e.message || e)))) return { name, how: 'cancel' };
      try { await navigator.clipboard.writeText(text); return { name, how: 'clip' }; } catch (e2) { return null; }
    }
  }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime || 'application/octet-stream' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return { name, how: 'download' };
  } catch (e) { return null; }
}
function exportBackup() {
  const name = 'adim-adim-yedek-' + todayKey() + '.json';
  const o = JSON.parse(serial()); o.app = 'adim-adim'; o.exportedAt = new Date().toISOString(); o.exportedOn = todayKey();
  return saveFile(name, JSON.stringify(o, null, 2), 'application/json');
}
function detectBackup(o) {
  if (!isObj(o)) return null;
  if (o.schemaVersion != null && (o.money || o.growth || o.health || o.invest)) return 'unified';
  if (o.app === 'haftalik-butce' && isObj(o.weeks) && o.settings) return 'budget';
  if (Array.isArray(o.habits) && isObj(o.log)) return 'adim';
  return null;
}
const nonEx = (arr) => (Array.isArray(arr) ? arr : []).filter((x) => x && !x.ex);
const cnt = (n, k) => T(k, { n });
function dryRun(o, kind) {
  const L = [];
  const when = (x) => (x ? ' (' + String(x).slice(0, 10) + ')' : '');
  if (kind === 'budget') {
    const n = Object.keys(o.weeks).filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(id)).length;
    L.push(cnt(n, '{n} hafta'), T('bütçe ayarları'), cnt((o.settings.recurring || []).length, '{n} tekrarlayan gider'));
    return { title: T('Eski Haftalık Bütçe yedeği') + when(o.exportedAt), lines: L, note: T('Bütçe ayarları ve aynı tarihli haftalar yedektekiyle değişir. Diğer haftalar ve uygulamanın diğer bölümleri olduğu gibi kalır.') };
  }
  if (kind === 'adim') {
    const hd0 = isObj(o.health) && isObj(o.health.days) ? Object.keys(o.health.days).length : 0;
    L.push(cnt(o.habits.length, '{n} alışkanlık'), cnt(Object.keys(o.log).length, '{n} günlük alışkanlık kaydı'), cnt((o.tasks || []).length, '{n} görev'), cnt((o.goals || []).length, '{n} hedef'), cnt(nonEx(o.books).length, '{n} kitap'), cnt(Object.keys(o.journal || {}).length, '{n} günlük yazısı'), cnt(hd0, '{n} sağlık günü'));
    const pots = isObj(o.money) ? nonEx(o.money.goals).length : 0, ents = isObj(o.money) && Array.isArray(o.money.entries) ? o.money.entries.length : 0;
    if (pots) L.push(cnt(pots, '{n} birikim hedefi kumbaraya dönüşecek'));
    return { title: T('Eski Momentum verisi'), lines: L, note: T('Aynı kimlikli kayıtlar güncellenir, yenileri eklenir. Bütçe ve yatırım bölümlerine dokunulmaz.') + (ents ? ' ' + cnt(ents, 'Eski uygulamadaki {n} tekil para kaydı aktarılmaz, çünkü bütçe artık haftalık tutuluyor.') : '') };
  }
  const m = o.money || {}, g = o.growth || {}, h = o.health || {}, iv = o.invest || {};
  L.push(cnt(Object.keys(m.weeks || {}).length, '{n} hafta'), cnt((m.pots || []).length, '{n} kumbara'), cnt((m.uberExpenses || []).length, '{n} Uber gideri'), cnt((m.setAsides || []).length, '{n} vergi ayırma kaydı'), cnt((g.habits || []).length, '{n} alışkanlık'), cnt((g.tasks || []).length, '{n} görev'), cnt((g.goals || []).length, '{n} hedef'), cnt((g.books || []).length, '{n} kitap'), cnt(Object.keys(g.journal || {}).length, '{n} günlük yazısı'), cnt(Object.keys(h.days || {}).length, '{n} sağlık günü'), cnt((iv.holdings || []).length, '{n} yatırım'));
  return { title: T('Momentum yedeği') + when(o.exportedOn || o.exportedAt), lines: L, note: T('Veriler birleştirilir: aynı kimlikli kayıtlar ve aynı tarihli günler yedektekiyle değişir, diğerleri korunur. Hiçbir bölüm silinmez.') };
}
function mergeById(dst, src, key) { key = key || 'id'; (Array.isArray(src) ? src : []).forEach((x) => { if (!x || x[key] == null) return; const i = dst.findIndex((y) => y[key] === x[key]); if (i >= 0) dst[i] = clone(x); else dst.push(clone(x)); }); }
function mergeLog(dst, src) { Object.entries(src || {}).forEach(([k, arr]) => { if (!Array.isArray(arr)) return; const set = new Set(dst[k] || []); arr.forEach((x) => set.add(x)); if (set.size) dst[k] = [...set]; }); }
function mergeDays(dst, src) { Object.entries(src || {}).forEach(([k, v]) => { if (isObj(v)) dst[k] = Object.assign({}, dst[k], v); }); }
function mergeLegacyAdim(o) {
  const g = D.growth;
  mergeById(g.habits, o.habits.map((h) => ({ id: h.id, name: h.name, band: h.band || guessBand(h.name), created: h.created })));
  g.habits.forEach((h) => { if (!h.band) h.band = guessBand(h.name); if (h.created === undefined) delete h.created; });
  mergeLog(g.log, o.log);
  mergeById(g.tasks, (o.tasks || []).map((t) => Object.assign({ cat: 'kisisel', prio: 2 }, t)));
  mergeById(g.goals, (o.goals || []).map((x) => Object.assign({ steps: [] }, x)));
  mergeById(g.books, nonEx(o.books));
  Object.entries(o.journal || {}).forEach(([k, v]) => { if (isObj(v)) g.journal[k] = Object.assign({}, g.journal[k], v); });
  if (o.identity) g.identity = o.identity;
  if (o.bookGoal) g.bookGoal = o.bookGoal;
  Object.entries(o.readLog || {}).forEach(([k, v]) => { g.readLog[k] = Math.max(g.readLog[k] || 0, +v || 0); });
  if (isObj(o.health)) {
    mergeDays(D.health.days, o.health.days);
    ['height', 'goalWeight'].forEach((k) => { if (o.health[k] != null) D.health[k] = o.health[k]; });
    if (o.health.lastImport) D.health.lastImport = Math.max(D.health.lastImport || 0, o.health.lastImport);
  }
  if (isObj(o.money)) nonEx(o.money.goals).forEach((x) => {
    if (D.money.pots.some((p) => p.id === x.id)) return;
    D.money.pots.push({ id: x.id || uid(), name: x.name || T('Kumbara'), icon: 'jar', target: +x.target || 0, saved: +x.saved || 0, log: (x.log || []).map((l) => ({ d: l.d, a: +l.a || 0 })), created: todayKey() });
  });
}
function applyImport(o, kind) {
  if (kind === 'budget') {
    const ids = Object.keys(o.weeks).filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(id));
    const keepLog = S.logbookPct;
    applySettings(o.settings); if (S.logbookPct == null) S.logbookPct = keepLog == null ? 100 : keepLog;
    ids.forEach((id) => { D.money.weeks[id] = normWeek(o.weeks[id], id); });
    return T('{n} hafta ve bütçe ayarları yüklendi.', { n: ids.length });
  }
  if (kind === 'adim') { mergeLegacyAdim(o); return T('Eski Momentum verisi birleştirildi.'); }
  const n = normalize(o);
  if (o.money) {
    if (o.money.settings) applySettings(n.money.settings);
    Object.entries(n.money.weeks).forEach(([id, w]) => { D.money.weeks[id] = w; });
    mergeById(D.money.pots, n.money.pots);
    mergeById(D.money.uberExpenses, n.money.uberExpenses);
    mergeById(D.money.setAsides, n.money.setAsides);
    Object.entries(n.money.taxSummaries).forEach(([k, v]) => { if (isObj(v)) D.money.taxSummaries[k] = Object.assign({}, D.money.taxSummaries[k], v); });
  }
  if (o.growth) {
    const g = D.growth, s = n.growth;
    mergeById(g.habits, s.habits); mergeLog(g.log, s.log); mergeById(g.tasks, s.tasks); mergeById(g.goals, s.goals); mergeById(g.books, s.books);
    Object.entries(s.journal).forEach(([k, v]) => { g.journal[k] = Object.assign({}, g.journal[k], v); });
    Object.entries(s.readLog).forEach(([k, v]) => { g.readLog[k] = +v || 0; });
    if (s.identity) g.identity = s.identity; if (o.growth.bookGoal != null) g.bookGoal = s.bookGoal;
  }
  if (o.health) {
    mergeDays(D.health.days, n.health.days);
    ['height', 'goalWeight', 'packPrice'].forEach((k) => { if (o.health[k] != null) D.health[k] = n.health[k]; });
    if (n.health.lastImport) D.health.lastImport = Math.max(D.health.lastImport || 0, n.health.lastImport);
  }
  if (o.invest) {
    const iv = D.invest, s = n.invest;
    mergeById(iv.holdings, s.holdings);
    s.watchlist.forEach((w) => { if (!iv.watchlist.some((x) => x.symbol === w.symbol && x.market === w.market)) iv.watchlist.push(clone(w)); });
    Object.entries(s.prices).forEach(([k, v]) => { if (!iv.prices[k] || (v.at || 0) > (iv.prices[k].at || 0)) iv.prices[k] = v; });
    if (s.fx && (!iv.fx || (s.fx.at || 0) > (iv.fx.at || 0))) iv.fx = s.fx;
    if (s.finnhubKey && !iv.finnhubKey) iv.finnhubKey = s.finnhubKey;
    if (o.invest.showOnHome != null) iv.showOnHome = !!s.showOnHome;
  }
  if (o.ui) { const u = D.ui; if (o.ui.theme) u.theme = n.ui.theme; if (o.ui.lang) u.lang = n.ui.lang; Object.assign(u.hiddenCards, n.ui.hiddenCards); Object.assign(u.hiddenInsights, n.ui.hiddenInsights); }
  return T('Yedek birleştirildi.');
}

// ===================== insights =====================
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function pearson(xs, ys) { const mx = mean(xs), my = mean(ys); let a = 0, b = 0, c = 0; for (let i = 0; i < xs.length; i++) { const dx = xs[i] - mx, dy = ys[i] - my; a += dx * dy; b += dx * dx; c += dy * dy; } return b && c ? a / Math.sqrt(b * c) : 0; }
const moodName = (v) => T(v >= 4.5 ? 'harika' : v >= 3.5 ? 'çok iyi' : v >= 2.5 ? 'iyi' : v >= 1.5 ? 'idare eder' : 'kötü');
function insights() {
  const out = [], now = new Date();
  const cw = weekSum('cig');
  if (cw.n) {
    const cost = cw.s * cigPrice();
    out.push({ id: 'cig-week', area: 'sag', text: cw.s ? T('Bu hafta {n} sigara içtin, yaklaşık {x}. Bu hızla giderse yılda yaklaşık {y} eder.', { n: cw.s, x: usd2(cost), y: usd(cost / Math.max(1, (now.getDay() + 6) % 7 + 1) * 365) }) : T('Bu hafta kayıtlı {n} günün hepsi sigarasız geçti. Bu hafta sigaraya hiç para gitmedi.', { n: cw.n }) });
  }
  const ms = monthSummary(now.getFullYear(), now.getMonth());
  if (ms.n && ms.income > 0) out.push({ id: 'save-rate', area: 'para', text: T('{m} ayında net gelirinin {p} kadarı elinde kaldı ({x}, {n} hafta).', { m: MONTHS_FULL[now.getMonth()], p: pct(nf0.format(Math.max(-999, ms.leftNoOneOff / ms.income * 100))), x: usd(ms.leftNoOneOff), n: ms.n }) });
  const uw = Object.keys(D.money.weeks).filter((id) => hasData(getWeek(id))).map((id) => [id, calc(getWeek(id))]).filter(([, c]) => c.E > 0 && c.H > 0);
  if (uw.length) {
    const best = uw.reduce((a, b) => (b[1].netH > a[1].netH ? b : a));
    const avgH = uw.reduce((a, [, c]) => a + c.uberNet, 0) / uw.reduce((a, [, c]) => a + c.H, 0);
    out.push({ id: 'uber-best', area: 'para', text: T('En verimli Uber haftan {w}: saatte {x} net ({h} saat).', { w: weekLabel(best[0]), x: usd2(best[1].netH), h: nf0.format(best[1].H) }) + (uw.length > 1 ? ' ' + T('Ortalaman saatte {x}.', { x: usd2(avgH) }) : '') });
  }
  const tq = taxFull(quarterOf(thisWeekId()).key);
  if (tq.need > 0.5) out.push({ id: 'tax-left', area: 'para', text: tq.left > 0.5 ? T('{q} için vergiye {x} ayırman gerekiyor; şu ana kadar {y} ayırdın.', { q: qName(tq.key), x: usd(tq.need), y: usd(tq.saved) }) : T('{q} için gereken vergi payını ayırdın ({x}).', { q: qName(tq.key), x: usd(tq.need) }) });
  const g = G(), yr = String(now.getFullYear());
  if (g.bookGoal > 0 && (g.books.length || Object.keys(g.readLog).length)) {
    const doneYr = g.books.filter((b) => b.status === 'done' && (b.fin || '').startsWith(yr)).length;
    const dayOfYr = Math.floor((now - new Date(+yr, 0, 1)) / 864e5) + 1, expected = g.bookGoal * dayOfYr / 365;
    let yp = 0; for (const k in g.readLog) if (k.startsWith(yr)) yp += g.readLog[k];
    out.push({ id: 'read-pace', area: 'gel', text: doneYr >= expected ? T('Okuma hedefinin önündesin: {n} kitap bitirdin. Bu tarihe kadar {e} kitap yeterliydi.', { n: doneYr, e: nf1.format(expected) }) : T('Bu yıl {n}/{g} kitap bitirdin. Hedefe yetişmek için yıl sonuna kadar ayda yaklaşık {m} kitap okuman gerekiyor.', { n: doneYr, g: g.bookGoal, m: nf1.format((g.bookGoal - doneYr) / Math.max(0.5, (365 - dayOfYr) / 30.4)) }) + (yp ? ' ' + T('Bu yıl {n} sayfa okudun.', { n: nf0.format(yp) }) : '') });
  }
  const days = [];
  for (let i = 1; i <= 90; i++) { const k = keyOf(addDays(now, -i)); const j = g.journal[k]; if (j && j.mood) days.push({ k, mood: j.mood, h: hd(k), habit: dayPct(k) }); }
  const pair = (id, area, getX, split, labels) => {
    const ps = days.filter((d) => getX(d) != null); if (ps.length < 14) return;
    const xs = ps.map(getX), ys = ps.map((d) => d.mood), r = pearson(xs, ys);
    const A = ps.filter((d) => split(getX(d))).map((d) => d.mood), B = ps.filter((d) => !split(getX(d))).map((d) => d.mood);
    if (A.length < 4 || B.length < 4 || Math.abs(r) < 0.25 || Math.abs(mean(A) - mean(B)) < 0.4) return;
    out.push({ id, area, corr: true, text: T('{a} günlerde ruh hâlin ortalama {x}/5 ({xn}), {b} günlerde {y}/5. ({n} günlük kayda göre)', { a: T(labels[0]), b: T(labels[1]), x: nf1.format(mean(A)), xn: moodName(mean(A)), y: nf1.format(mean(B)), n: ps.length }) });
  };
  pair('corr-sleep', 'sag', (d) => (d.h.sleep != null ? d.h.sleep / 60 : null), (x) => x >= 7, ['7 saatten fazla uyuduğun', 'daha az uyuduğun']);
  pair('corr-cig', 'sag', (d) => (d.h.cig != null ? d.h.cig : null), (x) => x === 0, ['Sigara içmediğin', 'sigara içtiğin']);
  pair('corr-steps', 'sag', (d) => (d.h.steps != null ? d.h.steps : null), (x) => x >= 8000, ['8.000 adımı geçtiğin', 'daha az yürüdüğün']);
  if (G().habits.length) pair('corr-habit', 'gel', (d) => d.habit, (x) => x >= 60, ['Alışkanlıklarının çoğunu yaptığın', 'daha azını yaptığın']);
  return out;
}
const visibleInsights = () => insights().filter((x) => !D.ui.hiddenInsights[x.id]);
