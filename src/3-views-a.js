// ===================== UI state =====================
const U = {
  tab: 'bugun', paraSeg: 'hafta', gelSeg: 'aliskanlik', bookSeg: 'reading', taskFilter: 'all', taskCat: 'kisisel', taskPrio: 2, newBand: 'sabah',
  cur: thisWeekId(), calYear: new Date().getFullYear(), calMonth: new Date().getMonth(), taxQ: quarterOf(thisWeekId()).key,
  sheet: null, page: null, armed: null, shMsg: null, shErr: false, bk: null, bkMsg: null, investMsg: null, investErr: false, imp: null, refreshing: false
};
try { const t = localStorage.getItem(TAB_KEY); if (['bugun', 'para', 'gelisim', 'saglik', 'yatirim'].includes(t)) U.tab = t; } catch (e) {}
const AREA = { bugun: 'a-bug', para: 'a-para', gelisim: 'a-gel', saglik: 'a-sag', yatirim: 'a-yat' };
const TITLE = { bugun: 'Momentum', para: 'Para', gelisim: 'Gelişim', saglik: 'Sağlık', yatirim: 'Yatırım' };
const BANDS = [['sabah', 'Sabah', 'sunrise'], ['is', 'İş', 'brief'], ['aksam', 'Akşam', 'moon']];
const MOODS = [['f1', 'Kötü'], ['f2', 'İdare eder'], ['f3', 'İyi'], ['f4', 'Çok iyi'], ['f5', 'Harika']];
const JTAGS = ['Uber', 'Kebapçı', 'Spor', 'İş'];
const POT_ICONS = [['jar', 'Kumbara'], ['console', 'Konsol'], ['car', 'Araba'], ['plane', 'Seyahat'], ['home', 'Ev'], ['gift', 'Hediye'], ['tax', 'Vergi']];
const SPINE = ['#6B4E8A', '#8A4B2E', '#3B5B8C', '#6D5A8E', '#9C6B0C', '#4F6B2F', '#7B1E3C'];
const SAMPLE_HABITS = [["06:00'da kalk", 'sabah', 'Wake up at 6:00'], ['2 litre su iç', 'sabah', 'Drink 2 litres of water'], ['30 dk çıraklık / teknik çalışma', 'is', '30 min apprenticeship study'], ['30 dk spor ya da yürüyüş', 'aksam', '30 min exercise or walk'], ['20 sayfa kitap oku', 'aksam', 'Read 20 pages'], ['Günün harcamalarını yaz', 'aksam', "Write down today's spending"]];
const BUGUN_CARDS = [['money', 'Harcayabileceğin ve vergi satırı'], ['uber', 'Uber vardiyası'], ['habits', 'Alışkanlıklar'], ['tasks', 'Yapılacaklar'], ['counters', 'Sigara ve alkol sayaçları'], ['evening', 'Akşam değerlendirmesi'], ['portfolio', 'Portföy satırı'], ['health', 'Sağlık özeti'], ['insight', 'İçgörü kartı']];
// portfolio, health and insight are off by default on Bugün (opt-in), the rest are on unless hidden
const OPTIN_CARDS = ['portfolio', 'health', 'insight'];
const showCard = (k) => (OPTIN_CARDS.includes(k) ? !!D.ui.shownCards[k] : !D.ui.hiddenCards[k]);
// Modüller (ui.modules): a missing key means the defaults; Para is always on. Hiding a module only hides its UI:
// its data, sync and backups stay untouched.
const MODULES = [['para', 'Para', 'wallet', 'Bütçe, hesaplar, kumbaralar'], ['uber', 'Uber araçları', 'car', 'Vardiya, logbook, vergi, BAS'], ['yatirim', 'Yatırım', 'trend', 'Portföy ve takip listesi'], ['gelisim', 'Gelişim', 'sprout', 'Alışkanlık, görev, kitap, günlük'], ['saglik', 'Sağlık', 'heart', 'Sigara, alkol, uyku, kilo']];
const MOD_DEF = { uber: true, yatirim: true, gelisim: false, saglik: false };
const modOn = (k) => { if (!k || k === 'para') return true; const m = isObj(D.ui.modules) ? D.ui.modules : {}; return m[k] != null ? !!m[k] : MOD_DEF[k]; };
function setModule(k, on) { D.ui.modules = Object.assign({}, MOD_DEF, isObj(D.ui.modules) ? D.ui.modules : {}, { [k]: !!on }); }
const tabOn = (t) => t === 'bugun' || modOn(t);
function toggleCardPref(k) { if (OPTIN_CARDS.includes(k)) { if (D.ui.shownCards[k]) delete D.ui.shownCards[k]; else D.ui.shownCards[k] = true; } else if (D.ui.hiddenCards[k]) delete D.ui.hiddenCards[k]; else D.ui.hiddenCards[k] = true; }

// ===================== shared pieces =====================
function tile(k, v, u, id) { return `<div class="tile"><span class="k">${k}</span><span class="v"${id ? ` id="${id}"` : ''}>${v}</span><span class="u">${u}</span></div>`; }
function head(icon, title, right, gold) { return `<div class="card-head"><span class="ico${gold ? ' gold' : ''}" aria-hidden="true">${ico(icon)}</span><h2>${title}</h2>${right || ''}</div>`; }
function ring(p, label, color) { const C = 2 * Math.PI * 36; return `<div class="ring" role="img" aria-label="${esc(label)}"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="36" fill="none" stroke="var(--surface-2)" stroke-width="9"/><circle cx="42" cy="42" r="36" fill="none" stroke="${color || 'var(--acc-line)'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.max(0, Math.min(100, p)) / 100)}"/></svg><div class="pct">${esc(label)}</div></div>`; }
function delta(v, txt) { if (v == null || !isFinite(v)) return '<span class="delta">–</span>'; const up = v >= 0; return `<span class="delta ${up ? 'up' : 'down'}">${ico(up ? 'up' : 'down')}${txt}</span>`; }
const sgn = (v, f) => (v >= 0 ? '+' : '−') + f(Math.abs(v));
const ILLO = {
  habits: '<svg viewBox="0 0 120 92" aria-hidden="true"><path class="il-dash" d="M8 84h104"/><path class="il-card" d="M40 58h40l-5 26H45z"/><path class="il-accline" d="M60 58V34"/><path class="il-soft" d="M60 40c0-12-9-19-22-19 0 12 9 19 22 19z"/><path class="il-acc" d="M60 34c0-11 8-19 21-19 0 11-8 19-21 19z"/><circle class="il-gold" cx="94" cy="26" r="9"/></svg>',
  tasks: '<svg viewBox="0 0 120 92" aria-hidden="true"><rect class="il-card" x="26" y="10" width="68" height="76" rx="10"/><rect class="il-soft" x="36" y="24" width="12" height="12" rx="3"/><path class="il-accline" d="M38.5 30l3 3 5-6"/><path class="il-line" d="M56 30h28M56 50h28M56 68h20"/><rect class="il-dash" x="36" y="44" width="12" height="12" rx="3"/><rect class="il-dash" x="36" y="62" width="12" height="12" rx="3"/></svg>',
  goals: '<svg viewBox="0 0 120 92" aria-hidden="true"><path class="il-dash" d="M8 84h104"/><path class="il-line" d="M18 84V70h22V56h22V42h22"/><path class="il-accline" d="M84 42V12"/><path class="il-acc" d="M84 12h22l-6 7 6 7H84z"/><circle class="il-gold" cx="30" cy="62" r="6"/></svg>',
  books: '<svg viewBox="0 0 120 92" aria-hidden="true"><path class="il-dash" d="M8 84h104"/><rect class="il-acc" x="28" y="26" width="16" height="58" rx="3"/><rect class="il-card" x="46" y="18" width="16" height="66" rx="3"/><rect class="il-soft" x="64" y="32" width="14" height="52" rx="3"/><path class="il-card" d="M82 40l14-4 12 46-14 4z"/></svg>',
  journal: '<svg viewBox="0 0 120 92" aria-hidden="true"><rect class="il-card" x="28" y="10" width="64" height="76" rx="8"/><path class="il-acc" d="M28 18a8 8 0 0 1 8-8h6v76h-6a8 8 0 0 1-8-8z"/><path class="il-line" d="M52 30h28M52 44h28M52 58h18"/><circle class="il-gold" cx="88" cy="74" r="10"/></svg>',
  pots: '<svg viewBox="0 0 120 92" aria-hidden="true"><path class="il-dash" d="M8 86h104"/><path class="il-card" d="M42 18h36v8c10 4 16 12 16 22v26a10 10 0 0 1-10 10H36a10 10 0 0 1-10-10V48c0-10 6-18 16-22z"/><path class="il-line" d="M40 18h40"/><circle class="il-gold" cx="60" cy="58" r="13"/><path class="il-goldline" d="M60 52v12"/><circle class="il-soft" cx="92" cy="22" r="9"/></svg>',
  invest: '<svg viewBox="0 0 120 92" aria-hidden="true"><path class="il-dash" d="M8 84h104"/><rect class="il-soft" x="22" y="58" width="14" height="26" rx="3"/><rect class="il-soft" x="42" y="46" width="14" height="38" rx="3"/><rect class="il-acc" x="62" y="34" width="14" height="50" rx="3"/><path class="il-accline" d="M22 44l20-12 16 8 28-22"/><circle class="il-gold" cx="96" cy="18" r="10"/></svg>',
  weeks: '<svg viewBox="0 0 140 96" aria-hidden="true"><path class="il-card" d="M70 20C60 14 44 12 28 14v52c16-2 32 0 42 6zM70 20c10-6 26-8 42-6v52c-16-2-32 0-42 6z"/><path class="il-line" d="M36 26c9-1 18 0 26 3M36 36c9-1 18 0 26 3M36 46c6-1 11 0 15 1.5"/><circle class="il-gold" cx="91" cy="38" r="10"/><path class="il-goldline" d="M91 33v10"/><path class="il-dash" d="M6 90h128"/></svg>',
  receipt: '<svg viewBox="0 0 120 92" aria-hidden="true"><path class="il-card" d="M34 8h52v78l-8.7-5-8.7 5-8.6-5-8.7 5-8.6-5-8.7 5z"/><path class="il-line" d="M44 26h32M44 40h32M44 54h18"/><circle class="il-gold" cx="90" cy="66" r="13"/><path class="il-goldline" d="M86 70l8-8M86 63v.1M94 70v.1"/></svg>',
  cal: '<svg viewBox="0 0 120 92" aria-hidden="true"><rect class="il-card" x="18" y="16" width="76" height="66" rx="11"/><path class="il-acc" d="M18 27a11 11 0 0 1 11-11h54a11 11 0 0 1 11 11v5H18z"/><rect class="il-dash" x="29" y="42" width="14" height="11" rx="3"/><rect class="il-dash" x="49" y="42" width="14" height="11" rx="3"/><rect class="il-dash" x="69" y="42" width="14" height="11" rx="3"/><rect class="il-dash" x="29" y="60" width="14" height="11" rx="3"/><circle class="il-gold" cx="94" cy="72" r="14"/><path class="il-goldline" d="M94 66v12M88 72h12"/></svg>'
};
function empty(illo, title, hint, actions) { return `<div class="illo">${ILLO[illo] || ''}<b>${title}</b><span>${hint}</span>${actions ? `<div class="btns">${actions}</div>` : ''}</div>`; }

// ---------- charts (ported) ----------
const tipOf = (o, p, fmt) => (o.tip ? o.tip(p) : (p.lbl ? p.lbl + ': ' : '') + fmt(p.v));
function chartTip(el) {
  const box = el.closest('.chart-box'), tip = box && box.querySelector('.chart-tip'); if (!tip) return;
  box.querySelectorAll('.hit.on').forEach((h) => h.classList.remove('on'));
  if (!tip.hidden && tip.dataset.for === el.dataset.x) { tip.hidden = true; tip.dataset.for = ''; return; }
  el.classList.add('on'); tip.textContent = el.dataset.tip; tip.hidden = false; tip.dataset.for = el.dataset.x;
  const w = box.clientWidth, h = box.querySelector('svg').clientHeight, px = +el.dataset.x * w, py = +el.dataset.y * h;
  tip.style.left = Math.max(4, Math.min(w - tip.offsetWidth - 4, px - tip.offsetWidth / 2)) + 'px'; tip.style.top = Math.max(0, py - tip.offsetHeight - 10) + 'px';
}
function lineChart(pts, o = {}) {
  const W = o.w || 300, H = o.h || 90, P = { l: 30, r: 8, t: 10, b: 18 };
  const vals = pts.filter((p) => p.v != null);
  if (vals.length < 1) return `<div class="note">${T('Veri yok')}</div>`;
  let mn = Math.min(...vals.map((p) => p.v)), mx = Math.max(...vals.map((p) => p.v));
  if (o.min != null) mn = Math.min(mn, o.min); if (o.max != null) mx = Math.max(mx, o.max);
  if (mx - mn < 1) { mx += 1; mn -= 1; }
  const pad2 = (mx - mn) * 0.12; mn -= pad2; mx += pad2;
  const x = (i) => P.l + (pts.length < 2 ? (W - P.l - P.r) / 2 : i * (W - P.l - P.r) / (pts.length - 1));
  const y = (v) => P.t + (1 - (v - mn) / (mx - mn)) * (H - P.t - P.b);
  const col = o.color || 'var(--acc-line)';
  let dpath = '', started = false, firstX = 0, lastX = 0;
  pts.forEach((p, i) => { if (p.v == null) return; const cmd = started ? 'L' : 'M'; if (!started) firstX = x(i); dpath += cmd + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1) + ' '; lastX = x(i); started = true; });
  const area = dpath + `L${lastX.toFixed(1)} ${H - P.b} L${firstX.toFixed(1)} ${H - P.b} Z`;
  const li = pts.map((p, i) => [p, i]).filter((a) => a[0].v != null).pop();
  const fmt = o.fmt || ((v) => Math.round(v));
  const top = mx - pad2, bot = mn + pad2;
  const band = o.band ? `<rect x="${P.l}" y="${y(Math.min(o.band[1], mx)).toFixed(1)}" width="${W - P.l - P.r}" height="${Math.max(0, y(Math.max(o.band[0], mn)) - y(Math.min(o.band[1], mx))).toFixed(1)}" fill="${col}" opacity=".08"/>` : '';
  const goal = o.goal != null ? `<line x1="${P.l}" x2="${W - P.r}" y1="${y(o.goal).toFixed(1)}" y2="${y(o.goal).toFixed(1)}" stroke="var(--gold-line)" stroke-dasharray="3 3"/>` : '';
  return `<div class="chart-box"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || T('grafik'))}">${band}${goal}
    <line x1="${P.l}" x2="${W - P.r}" y1="${y(top)}" y2="${y(top)}" stroke="var(--line)" stroke-dasharray="2 3"/>
    <line x1="${P.l}" x2="${W - P.r}" y1="${y(bot)}" y2="${y(bot)}" stroke="var(--line)" stroke-dasharray="2 3"/>
    <text x="${P.l - 4}" y="${y(top) + 3}" text-anchor="end">${fmt(top)}</text><text x="${P.l - 4}" y="${y(bot) + 3}" text-anchor="end">${fmt(bot)}</text>
    ${vals.length > 1 ? `<path d="${area}" fill="${col}" opacity=".12"/><path d="${dpath}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    ${o.dots !== false ? pts.map((p, i) => (p.v == null ? '' : `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="2.6" fill="${col}" opacity=".55"/>`)).join('') : ''}
    <circle cx="${x(li[1])}" cy="${y(li[0].v)}" r="3.5" fill="${col}" stroke="var(--surface)" stroke-width="1.5"/>
    ${pts.map((p, i) => (p.v == null ? '' : `<circle class="hit" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="13" data-act="chartTip" data-x="${(x(i) / W).toFixed(4)}" data-y="${(y(p.v) / H).toFixed(4)}" data-tip="${esc(tipOf(o, p, fmt))}" tabindex="0" role="button" aria-label="${esc(tipOf(o, p, fmt))}"/>`)).join('')}
    <text x="${P.l}" y="${H - 4}">${esc(pts[0].lbl || '')}</text><text x="${W - P.r}" y="${H - 4}" text-anchor="end">${esc(pts[pts.length - 1].lbl || '')}</text></svg><div class="chart-tip" hidden></div></div>`;
}
function barChart(pts, o = {}) {
  const W = o.w || 300, H = o.h || 90, P = { l: 30, r: 4, t: 10, b: 18 };
  const mx = Math.max(o.goal || 0, ...pts.map((p) => p.v || 0), 1);
  const bw = (W - P.l - P.r) / pts.length;
  const y = (v) => P.t + (1 - v / mx) * (H - P.t - P.b);
  const col = o.color || 'var(--acc-line)';
  const fmt = o.fmt || ((v) => Math.round(v));
  return `<div class="chart-box"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || T('grafik'))}">
    <text x="${P.l - 4}" y="${y(mx) + 3}" text-anchor="end">${fmt(mx)}</text><text x="${P.l - 4}" y="${H - P.b + 3}" text-anchor="end">0</text>
    <line x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}" stroke="var(--line)"/>
    ${o.goal ? `<line x1="${P.l}" x2="${W - P.r}" y1="${y(o.goal)}" y2="${y(o.goal)}" stroke="var(--gold-line)" stroke-dasharray="3 3"/>` : ''}
    ${pts.map((p, i) => (p.v ? `<rect x="${(P.l + i * bw + bw * 0.18).toFixed(1)}" y="${y(p.v).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${(H - P.b - y(p.v)).toFixed(1)}" rx="2" fill="${col}"/>` : '')).join('')}
    ${pts.map((p, i) => (p.v ? `<rect class="hit" x="${(P.l + i * bw).toFixed(1)}" y="${P.t}" width="${bw.toFixed(1)}" height="${H - P.b - P.t}" data-act="chartTip" data-x="${((P.l + i * bw + bw / 2) / W).toFixed(4)}" data-y="${(y(p.v) / H).toFixed(4)}" data-tip="${esc(tipOf(o, p, fmt))}" tabindex="0" role="button" aria-label="${esc(tipOf(o, p, fmt))}"/>` : '')).join('')}
    <text x="${P.l}" y="${H - 4}">${esc(pts[0].lbl || '')}</text><text x="${W - P.r}" y="${H - 4}" text-anchor="end">${esc(pts[pts.length - 1].lbl || '')}</text></svg><div class="chart-tip" hidden></div></div>`;
}
function series(field, days, tf) { const out = []; for (let i = days - 1; i >= 0; i--) { const d = addDays(new Date(), -i), k = keyOf(d); let v = hd(k)[field]; if (v != null && tf) v = tf(v); out.push({ v: v == null ? null : v, lbl: i === 0 ? T('bugün') : d.getDate() + ' ' + MONTHS[d.getMonth()] }); } return out; }
function series7(field) { const out = []; for (let i = 6; i >= 0; i--) { const d = addDays(new Date(), -i); const v = hd(keyOf(d))[field]; out.push({ v: v || 0, lbl: i === 0 ? T('bugün') : DAYS[d.getDay()] }); } return out; }

// ===================== BUGÜN =====================
// Top to bottom: what I can spend this week, the week's tax line, current-band habits, top tasks, counters, evening review.
const bandNow = (h) => (h < 11 ? 'sabah' : h < 17 ? 'is' : 'aksam');
function vBugun() {
  const now = new Date(), k = todayKey(), h = now.getHours();
  let html = '';
  if (D.ui.notice) html += `<div class="banner" id="notice">${ico('check')}<span>${esc(T(D.ui.notice))}</span><button type="button" class="link" data-act="dismissNotice">${T('Tamam')}</button></div>`;
  if (!D.ui.swipeHintSeen) html += `<div class="hint-chip" id="swipeHint">${ico('swipe')}<span>${T('İpucu: sağa/sola kaydırarak geçiş yapabilirsin')}</span><button type="button" class="iconbtn flat" data-act="hideSwipeHint" aria-label="${T('Kapat')}">${ico('x')}</button></div>`;
  if (showCard('money')) {
    const s = safeToSpend(now), over = s.x < 0;
    html += `<button type="button" class="hero home-hero a-para${over ? ' over' : ''}" data-act="go" data-tab="para" data-seg="hafta" data-week="${s.id}" id="safeHero">
      <span class="k">${T('Bu hafta harcayabileceğin')}</span><span class="v" id="safeX">${usd(s.x)}</span>
      <span class="u" id="safeDay">${over ? T('Bu hafta bütçeyi aştın') : T('günde {x} · {n} gün kaldı', { x: usd(s.perDay), n: s.daysLeft })}</span></button>`;
    const c = s.c, sa = weekSetAside(s.id), bas = nextBas(), z = sa ? 0 : r2(c.weekTax);
    if (modOn('uber') && (c.weekTax > 0 || bas && taxFull(bas.q).need > 0.005)) html += `<button type="button" class="taxline a-para" data-act="go" data-tab="para" data-seg="vergi" id="bTaxLine">${ico('jar')}<span>${sa ? T('Bu haftanın vergi payı ayrıldı') : T('Vergi için ayır: {x} bu hafta', { x: usd(z) })}${bas ? ' · ' + T("BAS'a {n} gün", { n: bas.days }) : ''}</span>${ico('right')}</button>`;
  }
  if (showCard('money')) html += planCard();
  if (showCard('uber') && modOn('uber')) html += shiftCard() + carLines();
  if (showCard('habits') && modOn('gelisim')) html += `<section class="sec a-gel">${habitTodayCard(k, bandNow(h))}</section>`;
  if (showCard('tasks') && modOn('gelisim')) {
    const open = G().tasks.filter((t) => !t.done).sort((a, b) => a.prio - b.prio || String(a.created).localeCompare(String(b.created)));
    html += `<section class="sec a-gel">${secHead(T('Yapılacaklar'), `<button type="button" class="link" data-act="go" data-tab="gelisim" data-seg="gorev">${T('Tümü ({n})', { n: open.length })}${ico('right')}</button>`)}
      ${open.length ? `<div class="list">${open.slice(0, 3).map(taskRow).join('')}</div>` : `<p class="note" style="margin:0">${T('Açık görev yok.')} <button type="button" class="link" data-act="go" data-tab="gelisim" data-seg="gorev">${T('Görev ekle')}</button></p>`}</section>`;
  }
  if (showCard('counters') && modOn('saglik')) html += `<section class="sec a-sag">${secHead(T('Sigara ve alkol'), `<span class="sub">${T('bugün')}</span>`)}${countersHTML(k)}</section>`;
  if (showCard('portfolio') && modOn('yatirim') && D.invest.holdings.length) {
    const p = portfolio();
    html += `<button type="button" class="card tight pline a-yat" data-act="go" data-tab="yatirim"><span class="ico">${ico('trend')}</span><span class="t">${T('Portföy bugün')}</span>${p.dayAud != null ? delta(p.dayAud, sgn(p.dayAud, (v) => '$' + nf2.format(v)) + (p.dayPct != null ? ' (' + sgn(p.dayPct, (v) => pct(nf2.format(v))) + ')' : '')) : `<span class="chip">${T('fiyat yok')}</span>`}${ico('right')}</button>`;
  }
  if (showCard('health') && modOn('saglik')) {
    const sl = latest('sleep', 1), st = latest('steps', 1), w = latestWeight();
    html += `<section class="sec a-sag">${secHead(T('Sağlık özeti'), `<button type="button" class="link" data-act="go" data-tab="saglik">${T('Sağlık')}${ico('right')}</button>`)}
      <div class="snap">${tile(T('Uyku'), sl ? T('{n} sa', { n: nf1.format(sl.v / 60) }) : '–', sl ? (sl.i ? T('dün gece') : T('bugün')) : T('girilmedi'))}${tile(T('Adım'), st ? nf0.format(st.v) : '–', st ? (st.i ? T('dün') : T('bugün')) : T('girilmedi'))}${tile(T('Kilo'), w ? nf1.format(w.v) + ' kg' : '–', w ? dShort(w.k) : T('girilmedi'))}</div></section>`;
  }
  if (showCard('insight')) {
    const ins = visibleInsights().filter((x) => (x.area === 'gel' ? modOn('gelisim') : x.area === 'sag' ? modOn('saglik') : true));
    if (ins.length) { const one = ins[now.getDate() % ins.length]; html += `<section class="sec a-${one.area}"><div class="insight"><span class="ico gold">${ico('spark')}</span><p id="insightText">${esc(one.text)}</p></div><div class="insight-actions"><button type="button" class="link" data-act="hideInsight" data-id="${one.id}">${T('Gizle')}</button><button type="button" class="link" data-act="openInsights">${T('İçgörüler ({n})', { n: ins.length })}${ico('right')}</button></div></section>`; }
  }
  if (showCard('evening') && modOn('gelisim') && h >= 18) html += eveningCard(k);
  return html;
}
function secHead(title, right) { return `<div class="sec-h"><h2>${title}</h2>${right || ''}</div>`; }
function habitTodayCard(k, band) {
  const hs = G().habits;
  if (!hs.length) return secHead(T('Alışkanlıklar')) + `<p class="note" style="margin:0">${T('Henüz alışkanlık yok.')}</p><div class="btns" style="margin-top:8px"><button type="button" class="btn sm ghost" data-act="sampleHabits">${ico('plus')}${T('Örnek alışkanlıklar ekle')}</button></div>`;
  const B = BANDS.find((x) => x[0] === band) || BANDS[0], list = hs.filter((h) => h.band === band), done = list.filter((h) => isDone(h.id, k)).length;
  return secHead(`${ico(B[2])}${T(B[1])}`, `<span class="sub num">${done}/${list.length}</span><button type="button" class="link" data-act="go" data-tab="gelisim" data-seg="aliskanlik" id="habitsAll">${T('tümü')}${ico('right')}</button>`) +
    (list.length ? `<div class="htiles" id="bandHabits" data-band="${band}">${list.map((h) => `<button type="button" class="htile" data-act="habit" data-id="${h.id}" aria-pressed="${isDone(h.id, k)}"><span class="chk">${ico('check')}</span><span class="n">${esc(h.name)}</span></button>`).join('')}</div>`
      : `<p class="note" style="margin:0">${T('Bu zaman diliminde alışkanlık yok.')}</p>`);
}
function taskRow(t) {
  const del = U.armed === t.id;
  return `<div class="task ${t.done ? 'done' : ''}"><button type="button" class="tick" data-act="task" data-id="${t.id}" aria-label="${esc(T(t.done ? 'Geri al: {t}' : 'Tamamla: {t}', { t: t.text }))}"><span>${ico('check')}</span></button><span class="t">${esc(t.text)}</span>
    ${!t.done && t.prio === 1 ? `<span class="chip gold">${T('Önemli')}</span>` : ''}
    ${U.tab === 'gelisim' ? `<button type="button" class="del ${del ? 'arm' : ''}" data-act="delTask" data-id="${t.id}" aria-label="${T('Sil')}">${del ? T('Sil?') : ico('x')}</button>` : ''}</div>`;
}
function countersHTML(k) {
  const d = hd(k), cw = weekSum('cig'), aw = weekSum('alc');
  const one = (f, lbl, icn, hint) => `<div class="counter"><div class="lbl"><span style="display:flex;gap:6px;align-items:center">${ico(icn)}${lbl}</span></div>
    <div class="ctl"><button type="button" class="rb" data-act="cnt" data-f="${f}" data-d="-1" aria-label="${T('{x}: bir azalt', { x: lbl })}">${ico('minus')}</button><b id="cnt-${f}">${d[f] == null ? 0 : d[f]}</b><button type="button" class="rb plus" data-act="cnt" data-f="${f}" data-d="1" aria-label="${T('{x}: bir artır', { x: lbl })}">${ico('plus')}</button></div>
    <div class="hint">${hint}</div></div>`;
  const none = (f) => `<button type="button" class="link zero-link" data-act="zero" data-f="${f}">${T('Bugün hiç yok')}</button>`;
  return `<div class="counters">${one('cig', T('Sigara'), 'cig', cw.s ? T('Bu hafta {n} · ≈ {x}', { n: cw.s, x: usd2(cw.s * cigPrice()) }) : d.cig == null ? none('cig') : T('Bu hafta temiz'))}
    ${one('alc', T('Alkol'), 'glass', d.alc == null && !aw.s ? none('alc') : T('Bu hafta {n}/10 standart içki', { n: aw.s }))}</div>`;
}
function eveningCard(k) {
  const j = G().journal[k] || {}, tags = j.tags || [];
  return `<section class="sec a-gel" id="evening">${secHead(T('Akşam değerlendirmesi'), `<span class="sub">${T('1 dakika')}</span>`)}
    <div class="moods" role="group" aria-label="${T('Ruh hâli')}">${MOODS.map((m, i) => `<button type="button" class="mood" data-act="mood" data-m="${i + 1}" aria-pressed="${j.mood === i + 1}">${ico(m[0])}${T(m[1])}</button>`).join('')}</div>
    <div class="tags" role="group" aria-label="${T('Bugün neler vardı')}">${JTAGS.map((t) => `<button type="button" class="tagbtn" data-act="jtag" data-t="${t}" aria-pressed="${tags.includes(t)}">${T(t)}</button>`).join('')}</div>
    <input class="txt" id="jLine" data-j="line" value="${esc(j.line || '')}" placeholder="${T('Bugünü tek satırda anlat')}" aria-label="${T('Bugünü tek satırda anlat')}" autocomplete="off">
    <p class="note">${T('Otomatik kaydedilir. Geçmiş kayıtlar: Gelişim → Günlük.')}</p></section>`;
}

// ===================== PARA =====================
function vPara() {
  if (U.paraSeg === 'takvim') U.paraSeg = 'gecmis';
  if (U.paraSeg === 'vergi' && !modOn('uber')) U.paraSeg = 'hafta';
  const segs = [['hafta', 'Hafta'], ['rapor', 'Rapor'], ['gecmis', 'Geçmiş'], ['kumbara', 'Hesaplar'], ['vergi', 'Vergi']].filter(([k]) => k !== 'vergi' || modOn('uber'));
  const top = `<div class="seg top-seg" role="group" aria-label="${T('Para bölümleri')}" data-swipe-zone="paraSeg">${segs.map(([k, l]) => `<button type="button" data-act="paraSeg" data-v="${k}" aria-pressed="${U.paraSeg === k}">${T(l)}</button>`).join('')}</div>`;
  return top + ({ hafta: paraWeek, rapor: paraReport, gecmis: paraHist, kumbara: paraPots, vergi: paraTax })[U.paraSeg]();
}
// period badge for a week: "bu hafta" / "geçen hafta" / its date range
function perW(id) { const tw = thisWeekId(), pw = idOf(addDays(fromId(tw), -7)); return `<span class="per">${id === tw ? T('bu hafta') : id === pw ? T('geçen hafta') : weekLabel(id)}</span>`; }
function paraWeek() {
  const w = getWeek(U.cur) || {};
  return `<div class="weeknav" data-swipe-zone="week"><button type="button" id="prevW" data-act="weekGo" data-d="-1" aria-label="${T('Önceki hafta')}">${ico('left')}</button><div class="lbl"><span id="wkLbl">–</span><small id="wkSub">–</small></div><button type="button" id="nextW" data-act="weekGo" data-d="1" aria-label="${T('Sonraki hafta')}">${ico('right')}</button></div>
  <section class="hero" aria-live="polite" data-swipe-zone="week"><svg class="hero-deco" viewBox="0 0 210 210" aria-hidden="true"><circle cx="105" cy="105" r="96"/><circle cx="105" cy="105" r="74"/><circle cx="105" cy="105" r="52"/></svg>
    <div class="big"><span class="k">${T('Elinde kalan')} ${perW(U.cur)}</span><span class="v" id="hLeft">–</span><span class="u" id="hLeftSub">–</span></div></section>
  <section class="sec">${secHead(T('Gelir'), perW(U.cur))}<div class="fields">
    <div class="field"><label for="wEarn">${T('Uber kazancı')}</label><div class="money"><span>$</span><input id="wEarn" data-wk="uberEarn" inputmode="decimal" value="${fmtIn(w.uberEarn)}"></div><span class="hint">${T('Uygulamadaki haftalık kazanç, geçiş ücretleri hariç')}</span></div>
    <div class="field"><label for="wHours">${T('Çevrimiçi saat')}</label><div class="money"><input id="wHours" data-wk="uberHours" inputmode="decimal" value="${fmtIn(w.uberHours)}"><span>${T('sa')}</span></div></div>
    <div class="field"><label for="wCashH">${T('Nakit iş saati')}</label><div class="money"><input id="wCashH" data-wk="cashHours" inputmode="decimal" value="${fmtIn(w.cashHours)}"><span>${T('sa')}</span></div><span class="hint" id="wCashHint">–</span></div></div>
    <p class="note">${T("Yakıtı aşağıda harcama olarak, “Yakıt (Uber)” kategorisiyle aldığın güne gir.")}</p></section>
  ${dailyCard(w)}
  <section class="sec" id="wfCard">${secHead(T('Haftanın dökümü'), perW(U.cur))}<dl class="wf" id="receipt"></dl><div id="rateBox"></div><div id="wkTaxBox"></div></section>
  <section class="sec">${secHead(`<label for="wNote">${T('Not')}</label>`)}<input class="txt" id="wNote" data-wk="note" value="${esc(w.note || '')}" placeholder="${T('Bu haftayla ilgili bir not')}"></section>`;
}
// live numbers for the week view: hero + waterfall + tax box
function wfRow(id, sign, label, value, expl, cls, extra) {
  return `<div class="wf-row${cls ? ' ' + cls : ''}" id="${id}"><dt><span class="wf-l">${sign ? `<i>${sign}</i>` : ''}${label}${extra || ''}</span>${expl ? `<small>${expl}</small>` : ''}</dt><dd>${value}</dd></div>`;
}
function paraCalc() {
  if (!$('hLeft')) return;
  const cur = U.cur, thisWeek = thisWeekId();
  const w = getWeek(cur) || {};
  if (typeof taxCacheReset === 'function') taxCacheReset();
  const c = calc(w), N = Math.max(1, S.weeksPerYear);
  $('wkLbl').textContent = weekLabel(cur) + (cur === thisWeek ? ' · ' + T('bu hafta') : '');
  $('wkSub').textContent = hasData(getWeek(cur)) ? T('Kayıtlı') : T('Henüz kayıt yok');
  $('hLeft').textContent = usd(c.left); $('hLeft').className = 'v' + (c.left < 0 ? ' neg' : '');
  $('hLeftSub').textContent = T('Gelir {a} − giderler {b}', { a: usd(c.income), b: usd(c.spendAll) });
  $('wCashHint').textContent = T('{r}/sa × saat = {x}', { r: usd2(S.cashRate), x: usd(c.cashGross) });
  const dt = $('dailyWeekTotal'); if (dt) dt.textContent = c.daily ? money(c.daily) : '';
  const m2 = (v) => usd2(r2(v)), neg = (v) => '−' + usd2(Math.abs(r2(v)));
  let h = '';
  if (c.E > 0) {
    h += wfRow('wfE', '', T('Uber brüt'), m2(c.E), T('Uygulamadaki haftalık kazanç'));
    h += wfRow('wfGst', '−', 'GST', neg(c.gst), T("Kazancın 1/11'i, bu haftaki gerçek Uber giderlerinin GST kredisi düşüldü"));
    h += wfRow('wfFuel', '−', T('Yakıt'), neg(c.fuel), c.fuelEst ? T('Yakıt girilmedi; ayarlardaki haftalık tahmin. Planlama içindir, vergiyi düşürmez.') : T('Bu haftaki “Yakıt (Uber)” harcamaları ({n})', { n: c.nFuel }), '', c.fuelEst ? ` <span class="chip warn">${T('tahmin')}</span>` : '');
    h += wfRow('wfPocket', '=', T('Bu hafta cebine giren'), m2(c.pocket), '', 'sub');
    h += wfRow('wfFixed', '−', T('Araç masrafları için ayır'), neg(c.fx), T('Sigorta, rego, servis gibi yıllık {x} masrafın haftalık payı ({n} hafta). Bu para bu hafta harcanmadı; o faturalar gelince ödemek için. Vergiyi düşürmez, çünkü vergi sadece gerçekten ödediğin ve girdiğin giderlerle hesaplanır.', { x: usd(S.fixed), n: N }));
    h += wfRow('wfTax', '−', T('Gelir vergisi + Medicare'), neg(c.incTax), T('Brütten değil, kârdan: GST, yakıt ve girdiğin Uber giderleri düşüldükten sonra kalan {x} üzerinden', { x: usd2(r2(c.taxProfit || 0)) }));
    if (c.mlsTax > 0.005) h += wfRow('wfMls', '−', 'MLS', neg(c.mlsTax), T('Hastane sigortası yok'));
    h += wfRow('wfProfit', '=', T("Uber'den gerçek kâr"), m2(c.uberNet), c.H > 0 ? T('Saatte {x}', { x: usd2(c.netH) }) : '', 'sub strong');
  } else h += `<p class="note" style="margin:0 0 8px">${T('Bu hafta Uber kazancı yok.')}</p>`;
  h += wfRow('wfSalary', '+', T('Maaş (net)'), m2(c.salaryNet), T('Haftalık, vergi sonrası'));
  if (c.cashGross > 0) h += wfRow('wfCash', '+', T('Nakit iş'), m2(c.cashNet), c.cashTax > 0 ? T('Vergisi düşülmüş') : T('Vergisiz'));
  h += wfRow('wfSpend', '−', T('Harcamalar'), neg(c.spendAll), T('Tekrarlayan {a} + günlük {b}', { a: money(r2(c.rec)), b: money(r2(c.extra)) }) + (c.oneOff ? ' · ' + T('{x} tek seferlik', { x: money(c.oneOff) }) : ''));
  h += wfRow('wfLeft', '=', T('Elinde kalan'), usd(c.left), '', 'total');
  $('receipt').innerHTML = h; fitText();
  const rb = $('rateBox'); if (rb) rb.innerHTML = rateTable(cur);
  const tb = $('wkTaxBox'); if (tb) {
    const qk = quarterOf(cur).key, f = taxFull(qk);
    const cross = qk !== quarterOf(idOf(addDays(fromId(cur), 6))).key;
    tb.innerHTML = taxBox(cur) + (c.E > 0 ? `<p class="note" id="wkQNote">${T('Bu çeyrek: ayrılan {a} / gereken {b}', { a: usd2(f.saved), b: usd2(f.need) })}</p>` : '') + (cross ? `<p class="note" id="wkCross">${T('Bu hafta iki çeyreğe yayılıyor; kazanç haftanın başladığı çeyreğe yazılır.')}</p>` : '');
  }
}
// net hourly earnings per income source (salary / Uber / cash) + total, vs the previous week
function hourly(id) {
  const w = getWeek(id), c = calc(w || {}), jh = Math.max(0, +S.jobHours || 0);
  const uh = w && +w.uberHours > 0 ? +w.uberHours : typeof weekShifts === 'function' ? r2(weekShifts(id).ms / 36e5) : 0, ch = w ? +w.cashHours || 0 : 0;
  const rows = [];
  if (jh > 0) rows.push({ k: 'job', l: T('Maaş'), net: c.salaryNet, h: jh });
  if (c.E > 0) rows.push({ k: 'uber', l: 'Uber', net: c.uberNet, h: uh });
  if (ch > 0) rows.push({ k: 'cash', l: T('Nakit iş'), net: c.cashNet, h: ch });
  const withH = rows.filter((r) => r.h > 0), tn = withH.reduce((s, r) => s + r.net, 0), th = withH.reduce((s, r) => s + r.h, 0);
  rows.forEach((r) => { r.rate = r.h > 0 ? r.net / r.h : null; });
  return { rows, total: th > 0 ? { net: tn, h: th, rate: tn / th } : null, hasData: hasData(w) };
}
function rateTable(id) {
  const cur = hourly(id); if (!cur.hasData || !cur.rows.length) return '';
  const prev = hourly(idOf(addDays(fromId(id), -7))), pr = (k) => { const r = k === 'total' ? prev.total : prev.rows.find((x) => x.k === k); return prev.hasData && r && r.rate != null ? r.rate : null; };
  const dlt = (now, k) => { const p = pr(k); if (now == null || p == null || Math.abs(p) < 0.01) return ''; const d = (now - p) / Math.abs(p) * 100; if (Math.abs(d) < 1) return ''; return `<span class="rd ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}${nf0.format(Math.abs(d))}%</span>`; };
  const hf = (h) => (h > 0 ? T('{n} sa', { n: nf1.format(h).replace(/[,.]0$/, '') }) : `<button type="button" class="link" data-act="focusHours">${T('saat gir')}</button>`);
  const row = (r) => `<div class="rt-row${r.k === 'total' ? ' tot' : ''}" id="rate-${r.k}"><span class="n">${r.l}</span><span class="r${r.rate != null && r.rate < 0 ? ' neg' : ''}">${r.rate == null ? '–' : T('{x}/sa', { x: usd2(r2(r.rate)) })}${dlt(r.rate, r.k)}</span><span class="h">${hf(r.h)}</span><span class="t">${usd(r.net)}</span></div>`;
  return `<div class="rates" id="rates"><div class="rt-head"><b>${T('Saatlik kazancın')}</b><small>${T('net, vergi ve masraflar sonrası')}</small></div>
    ${cur.rows.map(row).join('')}${cur.total && cur.rows.length > 1 ? row({ k: 'total', l: T('Toplam'), rate: cur.total.rate, h: cur.total.h, net: cur.total.net }) : ''}</div>`;
}
// Geçmiş = calendar (month grid) + that month's weeks + daily totals + averages
function paraHist() {
  const calYear = U.calYear, calMonth = U.calMonth, today = new Date();
  let yearLeft = 0, yearWeeks = 0;
  const months = MONTHS_FULL.map((name, m) => {
    const ids = mondaysIn(calYear, m).filter((id) => hasData(getWeek(id)));
    const left = ids.reduce((a, id) => a + calc(getWeek(id)).left, 0);
    yearLeft += left; yearWeeks += ids.length;
    const isNow = calYear === today.getFullYear() && m === today.getMonth();
    return `<button type="button" class="month${ids.length ? ' has' : ''}${left < 0 ? ' neg' : ''}${isNow ? ' now' : ''}" data-act="month" data-m="${m}" aria-pressed="${m === calMonth}"><span class="mn">${MONTHS[m]}</span><span class="mv">${ids.length ? usd(left) : '—'}</span></button>`;
  }).join('');
  const ids = mondaysIn(calYear, calMonth);
  const cs = ids.map((id) => [id, getWeek(id), hasData(getWeek(id)) ? calc(getWeek(id)) : null]);
  const all = Object.keys(D.money.weeks).filter((id) => hasData(getWeek(id))).map((id) => calc(getWeek(id)));
  const uw = all.filter((c) => c.E > 0), n = uw.length, hrs = uw.reduce((a, c) => a + c.H, 0);
  const avg = (arr, f) => (arr.length ? arr.reduce((a, c) => a + f(c), 0) / arr.length : 0);
  return `<section class="sec"><div class="yearnav"><button type="button" data-act="yearGo" data-d="-1" aria-label="${T('Önceki yıl')}">${ico('left')}</button><div class="ylbl"><span id="yLbl">${calYear}</span><small id="ySub">${yearWeeks ? T('Bu yıl biriken {x} · {n} hafta', { x: usd(yearLeft), n: yearWeeks }) : T('Bu yıl henüz kayıt yok')}</small></div><button type="button" data-act="yearGo" data-d="1" aria-label="${T('Sonraki yıl')}">${ico('right')}</button></div><div class="months" id="months">${months}</div></section>
  <section class="sec" id="mDetail">${secHead(MONTHS_FULL[calMonth] + ' ' + calYear, `<span class="sub">${per('m')}</span>`)}
    <div class="wklist" id="mdWeeks">${cs.map(([id, w, c]) => (c
      ? `<button type="button" class="wk" data-act="openWeek" data-id="${id}"><span class="wl">${weekLabel(id)}<small>${c.E > 0 ? 'Uber ' + usd(c.E) + ' · ' : ''}${T('harcama {x}', { x: usd(c.spendAll) })}</small></span><span class="wr"><b>${usd(c.left)}</b><small>${T('kalan')}</small></span></button>`
      : `<button type="button" class="wk empty-wk" data-act="openWeek" data-id="${id}"><span class="wl">${weekLabel(id)}<small>${T('Kayıt yok, girmek için dokun')}</small></span><span class="wr"><b>—</b></span></button>`)).join('')}</div>
    ${monthDaily(calYear, calMonth)}</section>
  <section class="sec">${secHead(T('Ortalamalar'), `<span class="sub">${T('tek seferlikler hariç')}</span>`)}<div class="tiles" id="avgTiles">${tile(T('Uber brüt / hafta'), usd(avg(uw, (c) => c.E)), T('{n} haftanın ortalaması', { n }))}${tile(T('Uber gerçek kâr (tahmini sabit masraf dahil)'), usd(avg(uw, (c) => c.uberNet)), hrs > 0 ? T('Saatte {x}', { x: usd2(uw.reduce((a, c) => a + c.uberNet, 0) / hrs) }) : '–')}${tile(T('Kalan / hafta'), usd(avg(all, (c) => c.leftNoOneOff)), T('{n} kayıtlı hafta', { n: all.length }))}</div></section>`;
}
// per-day totals of daily spending in the selected month (Uber fuel excluded)
function monthDaily(y, m) {
  const pre = `${y}-${pad(m + 1)}-`, byDay = {};
  Object.values(D.money.weeks).forEach((w) => (w.daily || []).forEach((x) => { if (x.cat !== FUEL_CAT && String(x.date).startsWith(pre)) (byDay[x.date] = byDay[x.date] || []).push(x); }));
  const ks = Object.keys(byDay).sort(); if (!ks.length) return '';
  const tot = r2(ks.reduce((a, k) => a + sumAmt(byDay[k]), 0));
  return `<div id="mDaily" class="mdaily">${secHead(T('Günlük harcamalar'), `<span class="sub">${money(tot)}</span>`)}<div class="log">${ks.map((k) => { const d = fromId(k), es = byDay[k];
    return `<div><span>${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${T('{n} kayıt', { n: es.length })}</span><b>${money(sumAmt(es))}</b></div>`; }).join('')}</div></div>`;
}
function potState(p) { if (p.done) return [T('Satın alındı'), 'chip']; if (p.target > 0 && p.saved >= p.target) return [T('Hedefe ulaştı'), 'chip gold']; return [T('Yolda'), 'chip acc']; }
function paraPots() {
  const pots = D.money.pots, active = pots.filter((p) => !p.done), done = pots.filter((p) => p.done);
  const total = active.reduce((a, p) => a + p.saved, 0);
  let html = accountsCard() + `<div class="card">${head('jar', T('Kumbaralar'), `<button type="button" class="btn sm" data-act="newPot">${ico('plus')}${T('Yeni')}</button>`)}
    ${pots.length ? `<div class="tiles">${tile(T('Kumbaralarda'), usd(total), T('{n} açık kumbara', { n: active.length }))}${tile(T('Hedeflere kalan'), usd(active.reduce((a, p) => a + Math.max(0, p.target - p.saved), 0)), T('Toplam'))}</div>`
      : empty('pots', T('Henüz kumbaran yok'), T('Bir şey için ayrı para biriktir: konsol, araba bakımı, Türkiye bileti ya da vergi gibi. Hedefe ulaşınca "Satın aldım" ile tutarı tek seferlik harcama olarak yaz.'), `<button type="button" class="btn sm" data-act="newPot">${ico('plus')}${T('İlk kumbarayı aç')}</button>`)}</div>`;
  html += active.map(potCard).join('');
  if (done.length) html += `<details class="card fold"><summary>${T('Tamamlananlar ({n})', { n: done.length })}</summary><div class="stack" style="margin-top:8px">${done.map(potCard).join('')}</div></details>`;
  return html;
}
function potCard(p) {
  const pc = p.done ? 100 : p.target ? Math.min(100, Math.round(p.saved / p.target * 100)) : 0, [st, cls] = potState(p);
  return `<article class="card pot" data-pot="${p.id}"><div class="pot-h"><span class="ico">${ico(p.icon || 'jar')}</span><div class="nm"><h3>${esc(p.name)}</h3><div class="amt"><b>${money(p.saved)}</b> / ${money(p.target)}</div>${p.due && !p.done ? `<div class="pot-due">${T('Son gün {d}', { d: dShort(p.due) })}${(() => { const x = potNeeds().find((q) => q.p.id === p.id); return x ? ' · ' + T('haftada {x}', { x: usd(x.perWeek) }) : ''; })()}</div>` : ''}</div><span class="${cls}">${st}</span></div>
    <div><div class="meter${p.target && p.saved >= p.target ? ' gold' : ''}"><i style="width:${pc}%"></i></div><div class="meter-l"><span>${pct(pc)}</span><span>${p.done ? T('Harcanan: {x}', { x: usd(p.spent || 0) }) + (p.doneOn ? ' · ' + dShort(p.doneOn) : '') : T('kalan {x}', { x: usd(Math.max(0, p.target - p.saved)) })}</span></div></div>
    ${p.done ? '' : `<div class="pot-ctl"><div class="money"><span>$</span><input id="pa-${p.id}" inputmode="decimal" placeholder="${T('Tutar')}" aria-label="${esc(T('{x} için tutar', { x: p.name }))}"></div><button type="button" class="btn sm" data-act="potAdd" data-id="${p.id}">${T('Ekle')}</button><button type="button" class="btn sm ghost" data-act="potTake" data-id="${p.id}">${T('Çek')}</button></div>
    <div class="btns"><button type="button" class="btn sm soft" data-act="potBuy" data-id="${p.id}">${ico('bag')}${T('Satın aldım')}</button><button type="button" class="btn sm soft" data-act="editPot" data-id="${p.id}">${ico('pen')}${T('Düzenle')}</button></div>`}
    ${p.log.length ? `<details class="fold"><summary>${T('Hareketler ({n})', { n: p.log.length })}</summary><div class="log">${p.log.slice().reverse().slice(0, 20).map((l) => `<div><span>${dShort(l.d)}${l.note ? ' · ' + esc(T(l.note)) : ''}</span><b class="${l.a >= 0 ? 'up' : 'down'}">${l.a >= 0 ? '+' : '−'}${usd(Math.abs(l.a))}</b></div>`).join('')}</div></details>` : ''}</article>`;
}

// ---------- one spending list: daily entries inside the week ----------
// "Yakıt (Uber)" entries are the week's fuel (shown in the waterfall and in Vergi), not personal spending.
const DCATS = [['yemek', 'Yemek'], ['market', 'Market'], ['kahve', 'Kahve'], ['yakit', 'Yakıt (Uber)'], ['ulasim', 'Ulaşım'], ['eglence', 'Eğlence'], ['fatura', 'Fatura'], ['diger', 'Diğer']];
const dcatName = (k) => { const c = DCATS.find((x) => x[0] === k); return c ? T(c[1]) : ''; };
function catChips(cur, act) { return `<div class="chips" role="group" aria-label="${T('Kategori')}">${DCATS.map(([k, l]) => `<button type="button" class="chipbtn${k === FUEL_CAT ? ' fuel' : ''}" data-act="${act}" data-v="${k}" aria-pressed="${cur === k}">${T(l)}</button>`).join('')}</div>`; }
// ---------- "Ne için?" combobox: tap for categories + recent names, type to filter, or keep your own text ----------
const fold0 = (s) => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
const CAT_WORDS = [['kahve', /kahve|coffee|latte|cappuccino|flat white|long black|espresso|starbucks|gloria jean|zarraffa|merlo/], ['market', /market|woolworths|woolies|coles(?! express)|aldi|\biga\b|costco|bakkal|grocer|supermarket|bim\b|migros/], ['yakit', /yakit|fuel|shell|\bbp\b|ampol|caltex|7.?eleven|benzin|mazot|diesel|dizel|petrol|unleaded/], ['ulasim', /ulasim|go ?card|translink|train|tren|otobus|\bbus\b|toll|linkt|parking|otopark|taxi|taksi|didi|uber ride/], ['eglence', /eglence|sinema|cinema|netflix|spotify|disney|\bbar\b|bira|beer|club|ps5|playstation|game|oyun|konser|concert/], ['fatura', /fatura|bill|elektrik|electricity|internet|telefon|phone|telstra|optus|vodafone|kira|rent|insurance|sigorta|kredi karti|credit card|abonelik|subscription|gym/], ['yemek', /yemek|food|lunch|dinner|breakfast|kahvalti|ogle|aksam|kebab|kebap|pizza|burger|mcdonald|kfc|subway|sushi|restaurant|restoran|cafe|kafe|uber eats|doordash|menulog|snack|vending|bakery|firin|guzman|nandos/]];
function guessCat(name) { const n = fold0(name).trim(); if (!n) return null; const m = pastNames(); for (const [k, c] of m) if (fold0(k) === n) return c || null; const c = CAT_WORDS.find(([, re]) => re.test(n)); return c ? c[0] : null; }
function comboInput(id) {
  return `<div class="combo" id="${id}Box"><div class="combo-in"><input class="txt" id="${id}" placeholder="${T('Ne için? Seç ya da yaz')}" aria-label="${T('Ne için?')}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}List">
    <button type="button" class="combo-cat${U.dCat ? ' set' : ''}" data-act="comboCats" data-for="${id}" id="${id}Cat" aria-label="${T('Kategori')}">${U.dCat ? esc(dcatName(U.dCat)) : T('Kategori')}${ico('down')}</button></div>
    <div class="combo-list" id="${id}List" role="listbox" hidden></div></div>`;
}
function comboItems(id, catsOnly) {
  const inp = $(id), q = catsOnly ? '' : fold0(inp ? inp.value : '').trim(), out = [];
  if (!catsOnly) {
    const names = [...pastNames()].reverse().filter(([n]) => !DCATS.some((c) => T(c[1]) === n));
    names.filter(([n]) => !q || fold0(n).includes(q)).slice(0, q ? 6 : 5).forEach(([n, c]) => out.push({ n, c, kind: 'name' }));
  }
  DCATS.filter(([k, l]) => !q || fold0(T(l)).includes(q) || fold0(k).includes(q)).forEach(([k, l]) => out.push({ n: T(l), c: k, kind: 'cat' }));
  if (q && inp && !out.some((x) => fold0(x.n) === q)) out.unshift({ n: inp.value.trim(), c: guessCat(inp.value), kind: 'new' });
  return out;
}
function comboOpen(id, catsOnly) {
  const box = $(id + 'List'), inp = $(id); if (!box) return;
  const items = comboItems(id, catsOnly);
  box.innerHTML = (catsOnly ? `<div class="combo-h">${T('Kategori seç')}</div>` : '') + items.map((x) => `<button type="button" class="combo-it ${x.kind}" role="option" data-act="comboPick" data-for="${id}" data-n="${esc(x.n)}" data-c="${x.c || ''}"${catsOnly ? ' data-only="1"' : ''}><span>${x.kind === 'new' ? `${ico('plus')}${esc(T('“{x}” ekle', { x: x.n }))}` : esc(x.n)}</span>${x.c && x.kind !== 'cat' ? `<small>${esc(dcatName(x.c))}</small>` : x.kind === 'cat' ? `<small>${T('kategori')}</small>` : ''}</button>`).join('');
  box.hidden = !items.length; if (inp) inp.setAttribute('aria-expanded', String(!box.hidden));
}
function comboClose() { document.querySelectorAll('.combo-list').forEach((l) => { l.hidden = true; }); document.querySelectorAll('.combo input').forEach((i) => i.setAttribute('aria-expanded', 'false')); }
function comboSetCat(id, c) { U.dCat = c || null; const b = $(id + 'Cat'); if (b) { b.innerHTML = (U.dCat ? esc(dcatName(U.dCat)) : T('Kategori')) + ico('down'); b.classList.toggle('set', !!U.dCat); } }
// past names → last used category (for autocomplete)
function pastNames() {
  const m = new Map();
  Object.keys(D.money.weeks).sort().forEach((id) => (D.money.weeks[id].daily || []).forEach((x) => { const n = (x.name || '').trim(); if (n) { m.delete(n); m.set(n, x.cat || null); } }));
  return m;
}
const namesList = () => `<datalist id="pastNames">${[...pastNames().keys()].reverse().slice(0, 60).map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>`;
function dailyRow(x) {
  const fuel = x.cat === FUEL_CAT, meta = [x.cat ? dcatName(x.cat) : '', x.work ? T('ana iş') : '', x.acc ? accName(x.acc) : '', x.oneOff ? T('tek seferlik') : '', fuel ? T('Uber yakıtı, harcamaya sayılmaz') : ''].filter(Boolean).join(' · ');
  return `<div class="swipe${fuel ? ' is-fuel' : ''}" data-swipe="${x.id}"><div class="swipe-bg"><button type="button" class="swipe-del" data-act="delDaily" data-id="${x.id}" tabindex="-1" aria-hidden="true">${ico('trash')}<span>${T('Sil')}</span></button></div><div class="swipe-fg">
    <button type="button" class="dent" data-act="editDaily" data-id="${x.id}"><span class="dn"><b>${esc(x.name || T('Harcama'))}${x.rc ? ico('receipt', 'clip') : ''}</b>${meta ? `<small>${esc(meta)}</small>` : ''}</span><span class="da">${money(+x.amount || 0)}</span></button>
    <button type="button" class="del" data-act="delDaily" data-id="${x.id}" aria-label="${esc(T('Sil: {x}', { x: x.name || T('Harcama') }))}">${ico('x')}</button></div></div>`;
}
function dailyCard(w) {
  const mon = fromId(U.cur), tk = todayKey(), days = [...Array(7)].map((_, i) => idOf(addDays(mon, i)));
  if (U.openDayWeek !== U.cur) { U.openDayWeek = U.cur; U.openDay = days.includes(tk) ? tk : null; }
  const list = (w && w.daily) || [];
  return `<section class="sec" id="dailyCard">${secHead(T('Harcamalar'), `<span class="sub" id="dailyWeekTotal"></span>`)}<div class="days">
    ${days.map((k) => { const d = fromId(k), es = list.filter((x) => x.date === k), sp = sumAmt(es.filter((x) => x.cat !== FUEL_CAT)), fu = sumAmt(es.filter((x) => x.cat === FUEL_CAT)), open = U.openDay === k;
      return `<div class="day${open ? ' open' : ''}"><button type="button" class="day-h" data-act="dayOpen" data-d="${k}" aria-expanded="${open}"><span class="dn">${DAYS_LONG[d.getDay()]}<small>${d.getDate()} ${MONTHS[d.getMonth()]}${k === tk ? ' · ' + T('bugün') : ''}${fu ? ' · ' + T('yakıt {x}', { x: money(fu) }) : ''}</small></span><span class="dt" id="dayTot-${k}">${es.some((x) => x.cat !== FUEL_CAT) ? money(sp) : ''}</span>${ico(open ? 'up' : 'down')}</button>
      ${open ? `<div class="day-b">${es.length ? `<div class="dlist">${es.map(dailyRow).join('')}</div>` : ''}
        <form class="stack" id="dailyForm" data-d="${k}"><div class="row">${comboInput('dName')}</div>
        <div class="row wrap"><div class="money" style="width:112px;flex:0 0 112px"><span>$</span><input id="dAmt" inputmode="decimal" placeholder="0,00" aria-label="${T('Tutar')}" autocomplete="off"></div><button type="button" class="tagbtn" data-act="dOneOff" id="dOneOff" aria-pressed="${!!U.dOneOff}">${T('Tek seferlik')}</button><button class="btn" type="submit" id="dSave" style="margin-left:auto">${T('Kaydet')}</button></div>${accPick('dAcc')}</form></div>` : ''}</div>`; }).join('')}</div>
    ${namesList()}<p class="note">${T('Sola kaydırarak sil, düzenlemek için dokun. “Tek seferlik” harcamalar haftadan düşülür ama ortalamalara katılmaz.')}</p></section>`;
}

// big money numbers stay on one line; shrink the font until they fit their box
function fitText(root) {
  (root || document).querySelectorAll('.hero .v, .home-hero .v, .wf dd, .tile .v').forEach((el) => {
    el.style.fontSize = ''; let i = 0;
    while (el.scrollWidth > el.clientWidth + 1 && i++ < 12) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * 0.9) + 'px';
  });
}
