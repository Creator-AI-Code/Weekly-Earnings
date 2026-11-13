// ===================== PLAN (weekly savings target, pots with due dates, Uber shift plan, "what can I do today", ask Claude) =====================
// settings.saveTarget: $ to keep each week; settings.uberPlan: [{ wd 0–6 (Sun=0), part 'sabah'|'aksam'|'gun', h }]
const PARTS = [['sabah', 'Sabah', 12], ['aksam', 'Akşam', 23], ['gun', 'Tüm gün', 21]];
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
const planOn = () => (+S.saveTarget || 0) > 0;
// average net Uber $/h (after GST, fuel, car reserve, tax) over the last 6 weeks with hours; fallback 22
function uberRate() {
  let n = 0, h = 0;
  Object.keys(D.money.weeks).sort().reverse().slice(0, 8).forEach((id) => { const c = calc(D.money.weeks[id]); if (c.E > 0 && c.H > 0) { n += c.uberNet + c.fx; h += c.H; } });
  return h >= 5 ? Math.max(5, n / h) : 22;
}
// pots with a due date: what to put in this week so they are full in time
function potNeeds(now) {
  now = now || new Date(); const tk = keyOf(now);
  return D.money.pots.filter((p) => !p.done && p.due && p.target > p.saved).map((p) => {
    const days = Math.max(0, daysTo(p.due)), weeks = Math.max(1, Math.ceil((days + 1) / 7)), need = p.target - p.saved;
    const thisWeek = (p.log || []).filter((l) => l.a > 0 && l.d >= idOf(mondayOf(now)) && l.d <= tk).reduce((s, l) => s + l.a, 0);
    return { p, need, weeks, perWeek: need / weeks, days, left: Math.max(0, need / weeks - 0) , added: thisWeek };
  });
}
function plannedLeft(now) {
  now = now || new Date(); const wd = now.getDay(), hr = now.getHours(), out = [];
  const order = (d) => (d + 6) % 7; // Mon=0 … Sun=6
  (S.uberPlan || []).forEach((s) => {
    const part = PARTS.find((x) => x[0] === s.part) || PARTS[2];
    if (order(s.wd) > order(wd) || (s.wd === wd && hr < part[2] - 1)) out.push(s);
  });
  return out.sort((a, b) => order(a.wd) - order(b.wd));
}
function weekPlan(now) {
  now = now || new Date(); const s = safeToSpend(now), c = s.c, rate = uberRate();
  const left = plannedLeft(now), planH = left.reduce((a, x) => a + (+x.h || 0), 0), planNet = planH * rate;
  const pots = potNeeds(now), potsWeek = pots.reduce((a, x) => a + Math.max(0, x.perWeek - x.added), 0);
  // pots are paid from money you already have when your accounts cover them; only the uncovered part comes out of this week
  let cover = 0;
  if (D.money.accounts.length) { const tot = D.money.accounts.reduce((a, x) => a + (+x.bal || 0), 0), o = moneyOwed(); cover = Math.max(0, tot - o.gst - o.tax - D.money.pots.filter((q) => !q.done).reduce((a, q) => a + (+q.saved || 0), 0)); }
  const potsFromWeek = Math.max(0, potsWeek - cover);
  const started = !S.saveFrom || s.id >= idOf(mondayOf(parseKey(S.saveFrom)));
  const target = started ? +S.saveTarget || 0 : 0, projected = c.left + planNet;
  const room = projected - target - potsFromWeek, perDay = room / s.daysLeft;
  const short = room < 0 ? -room : 0, extraH = short > 0 ? Math.ceil(short / rate) : 0;
  return { s, c, rate, left, planH, planNet, pots, potsWeek, potsFromWeek, covered: potsWeek - potsFromWeek, target, started, projected, room, perDay, short, extraH };
}
function todayAdvice(P) {
  if (P.room < 0) return { cls: 'red', ic: 'x', t: T('Bugün harcama yok'), sub: P.extraH <= 15 ? T('Hedefe {x} eksik: planın dışında ~{h} saat Uber gerekiyor.', { x: usd(P.short), h: P.extraH }) : T('Bu hafta hedefe {x} eksik; plana göre {y} birikir. Harcamayı en aza indir.', { x: usd(P.short), y: usd(Math.max(0, P.projected - P.potsFromWeek)) }) };
  if (P.perDay >= 25) return { cls: 'green', ic: 'check', t: T('Kahve de dışarıda yemek de olur'), sub: T('Günde {x} harcama alanın var, hedef ve kumbaralar ayrıldıktan sonra.', { x: usd(P.perDay) }) };
  if (P.perDay >= 7) return { cls: 'amber', ic: 'spark', t: T('Kahve olur, yemeği evde ye'), sub: T('Günde {x} harcama alanın var.', { x: usd(P.perDay) }) };
  return { cls: 'red', ic: 'x', t: T('Bugün harcama yok'), sub: T('Günde sadece {x} alanın var; hedefi korumak için bugün harcama yapma.', { x: usd(Math.max(0, P.perDay)) }) };
}
const dayShort = (wd) => DAYS[wd];
// one short, encouraging line for the goal ring; x = $ still missing
function goalMsg(pc, x) {
  if (pc >= 100) return T('Hedef tamam! Harika iş.');
  if (pc >= 85) return T('Son düzlük: {x} kaldı.', { x: usd(x) });
  if (pc >= 60) return T('İyi gidiyorsun: hedefe {x} kaldı.', { x: usd(x) });
  if (pc >= 30) return T('Yol alıyorsun: hedefe {x} kaldı.', { x: usd(x) });
  return T('Her dolar sayılır: hedefe {x} kaldı.', { x: usd(x) });
}
// goal ring animation: fills and counts up from the last shown value, so re-renders only move when the numbers change;
// a confetti burst once per week per app launch when the goal is reached
let planSeen = null, planParty = '';
function planAnim() {
  const el = $('goalRing'); if (!el) return;
  const pc = +el.dataset.pc, keep = +el.dataset.keep, from = planSeen || { pc: 0, keep: 0 };
  planSeen = { pc, keep };
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (pc >= 100 && planParty !== el.dataset.week) {
    planParty = el.dataset.week; el.classList.add('party');
    const cols = ['var(--gold-line)', 'var(--gain)', 'var(--acc-line)'];
    el.insertAdjacentHTML('beforeend', `<span class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * 2 * Math.PI, d = 60 + (i % 3) * 26; return `<i style="--x:${Math.round(Math.cos(a) * d)}px;--y:${Math.round(Math.sin(a) * d - 20)}px;--r:${(i % 2 ? 1 : -1) * (200 + i * 20)}deg;--c:${cols[i % 3]};--d:${1.0 + (i % 4) * 0.04}s"></i>`; }).join('')}</span>`);
  }
  if (from.pc === pc && from.keep === keep) return;
  const arc = el.querySelector('.gr-arc'), num = $('goalPc'), amt = $('goalKeep'), t0 = performance.now(), dur = 1100;
  arc.style.transition = 'none'; arc.style.opacity = ''; arc.style.strokeDashoffset = 100 - from.pc; void arc.getBoundingClientRect();
  arc.style.transition = ''; arc.style.strokeDashoffset = 100 - pc;
  const step = (now) => {
    if (!el.isConnected) return;
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    num.textContent = pct(Math.round(from.pc + (pc - from.pc) * e)); amt.textContent = usd(from.keep + (keep - from.keep) * e);
    if (k < 1) requestAnimationFrame(step); else if (!pc) arc.style.opacity = 0;
  };
  requestAnimationFrame(step);
}
function planCard() {
  if (!planOn()) return `<section class="sec a-para plan" id="planSetup">${secHead(T('Haftalık birikim hedefi'))}
    <p class="note" style="margin:0 0 10px">${T('Her hafta ne kadar biriktirmek istiyorsun? Hedefi koyunca her gün “bugün ne harcayabilirim” ve hedefe kaç saat Uber kaldığını gösteririm.')}</p>
    <form class="row" id="saveGoalForm"><div class="money" style="flex:1"><span>$</span><input id="goalAmt" inputmode="decimal" placeholder="1.500" aria-label="${T('Haftalık birikim hedefi')}"></div><button class="btn" type="submit" id="goalSave">${T('Hedefi koy')}</button></form></section>`;
  const P = weekPlan(), A = todayAdvice(P), keep = Math.max(0, P.projected - P.potsFromWeek), pc = P.target > 0 ? Math.max(0, Math.min(100, Math.round(keep / P.target * 100))) : 100;
  return `<section class="sec a-para plan" id="planCard">${secHead(P.started ? T('Bu hafta hedef: {x} birikim', { x: usd(P.target) }) : T('Birikim hedefi {d} haftası başlıyor', { d: dShort(S.saveFrom) }), `<span class="plan-acts"><button type="button" class="iconbtn flat" data-act="openSettings" data-sec="para" data-focus="sSave" id="editGoal" aria-label="${T('Hedefi ve Uber planını düzenle')}">${ico('pen')}</button><button type="button" class="link" data-act="askClaude" id="askClaude">${ico('spark')}${T('Claude’a sor')}</button></span>`)}
    ${!(S.uberPlan || []).length ? `<p class="note" style="margin:0 0 8px"><button type="button" class="link" data-act="openSettings" data-sec="para" data-focus="sSave">${T('Uber planını ekle')}</button> ${T('— hangi gün kaç saat çalışacağını girersen haftalık tahmin yaparım.')}</p>` : ''}
    <div class="advice ${A.cls}" id="advice"><span class="dot">${ico(A.ic)}</span><span><b>${A.t}</b><small>${A.sub}</small></span></div>
    ${P.started ? `<div class="goal${pc >= 100 ? ' gold' : ''}" id="goalRing" data-pc="${pc}" data-keep="${Math.round(keep)}" data-week="${P.s.id}">
      <div class="goal-ring"><svg viewBox="0 0 84 84" aria-hidden="true"><circle class="gr-track" cx="42" cy="42" r="36"/><circle class="gr-arc" cx="42" cy="42" r="36" pathLength="100" style="stroke-dashoffset:${100 - pc}${pc ? '' : ';opacity:0'}"/></svg><b id="goalPc">${pct(pc)}</b></div>
      <div class="goal-t"><span class="k">${T('Plan tutarsa bu hafta')}</span><span class="v" id="goalKeep">${usd(keep)}</span><span class="m" id="goalMsg">${goalMsg(pc, P.target - keep)}</span>${keep > 0 ? `<span class="y">${T('Bu tempoyla yılda {x}', { x: usd(keep * 52) })}</span>` : ''}</div></div>` : ''}
    <ul class="plan-l">
      ${P.left.length ? `<li>${ico('car')}<span>${T('Kalan Uber planı: {s}', { s: P.left.map((x) => dayShort(x.wd) + ' ' + T((PARTS.find((p) => p[0] === x.part) || PARTS[2])[1]).toLowerCase() + ' ' + x.h + T('sa')).join(' · ') })} <b>≈ ${usd(P.planNet)}</b></span></li>` : `<li>${ico('car')}<span>${T('Bu hafta planlı Uber vardiyası kalmadı.')}</span></li>`}
      ${P.pots.map((x) => `<li>${ico('jar')}<span>${T('{n}: bu hafta {x} ayır ({d} kaldı)', { n: esc(x.p.name), x: usd(Math.max(0, x.perWeek - x.added)), d: x.days === 0 ? T('bugün') : T('{n} gün', { n: x.days }) })}</span></li>`).join('')}
      ${P.covered > 0.5 ? `<li>${ico('wallet')}<span>${T('Kumbaralar hesaplarındaki paradan karşılanıyor; bu haftanın gelirinden düşülmedi.')}</span></li>` : ''}
      <li>${ico('trend')}<span>${T('Uber’den saatte ~{x} net kalıyor (son haftaların ortalaması).', { x: usd(P.rate) })}</span></li>
    </ul></section>`;
}
// a plain-text summary of the week to paste into a chat with Claude
function weekSummaryText() {
  const P = weekPlan(), c = P.c, id = P.s.id, w = getWeek(id) || {}, by = {};
  (w.daily || []).forEach((x) => { const k = x.cat || 'diger'; by[k] = (by[k] || 0) + (+x.amount || 0); });
  const L = [`Momentum haftalık özet — ${weekLabel(id)}`, `Birikim hedefi: ${usd(P.target)} / hafta`, `Maaş (net): ${usd(c.salaryNet)}`,
    `Uber: brüt ${usd(c.E)}, ${nf1.format(c.H || 0)} sa, gerçek kâr ${usd(c.E > 0 ? c.uberNet : 0)} (saatte ~${usd(P.rate)})`,
    `Nakit iş: ${usd(c.cashNet || 0)}`, `Harcamalar: ${Object.entries(by).map(([k, v]) => (dcatName(k) || k) + ' ' + usd(v)).join(', ') || '—'}`,
    `Tekrarlayan giderler: ${usd(c.rec)}`, `Elinde kalan (şu an): ${usd(c.left)}`,
    `Kalan Uber planı: ${P.left.map((x) => DAYS[x.wd] + ' ' + x.part + ' ' + x.h + 'sa').join(', ') || 'yok'} ≈ ${usd(P.planNet)}`,
    `Kumbaralar: ${D.money.pots.filter((p) => !p.done).map((p) => `${p.name} ${usd(p.saved)}/${usd(p.target)}${p.due ? ' (son ' + p.due + ')' : ''}`).join(', ') || 'yok'}`,
    `Hesaplar: ${D.money.accounts.map((a) => a.name + ' ' + usd(+a.bal || 0)).join(', ') || 'yok'}`,
    `Plan tutarsa birikim: ${usd(Math.max(0, P.projected - P.potsWeek))}; ${P.room < 0 ? 'hedefe ' + usd(P.short) + ' eksik' : 'günde ' + usd(P.perDay) + ' harcama alanı'}`,
    '', 'Bu haftaya göre ne önerirsin?'];
  return L.join('\n');
}
async function askClaude() {
  const t = weekSummaryText();
  try { await navigator.clipboard.writeText(t); toast(T('Haftanın özeti kopyalandı. Claude sohbetine yapıştır.')); }
  catch (e) { openOverlay('sheet', { kind: 'summary', text: t }); }
}
function summarySheet(sh) { return sheetShell(T('Claude’a sor'), `<p class="note" style="margin:0">${T('Metni seçip kopyala ve Claude sohbetine yapıştır.')}</p><textarea class="txt" rows="14" readonly id="sumText">${esc(sh.text)}</textarea>`, 'a-para'); }
// settings UI: target + weekly Uber plan
function planSettings() {
  const plan = S.uberPlan || [], get = (wd) => plan.find((x) => x.wd === wd);
  return `<div class="card stack" id="planSet">${head('target', T('Birikim planı'))}
    <div class="field"><label for="sSave">${T('Haftalık birikim hedefi')}</label><div class="money"><span>$</span><input id="sSave" data-set="saveTarget" inputmode="decimal" value="${fmtIn(+S.saveTarget || 0)}"></div><span class="hint">${T('0 yazarsan plan kapanır.')}</span></div>
    <div class="field"><label for="sSaveFrom">${T('Hedef başlangıcı (isteğe bağlı)')}</label><input class="txt" type="date" id="sSaveFrom" data-setdate="saveFrom" value="${S.saveFrom || ''}"><span class="hint">${T('Taşınma ve tatil gibi büyük harcamalar bitince başlat.')}</span></div>
    <div class="field"><span class="lab">${T('Uber planı (her hafta)')}</span><div class="uplan">${WD_ORDER.map((wd) => { const x = get(wd); return `<div class="up-row"><span>${DAYS_LONG[wd]}</span><select class="txt" data-uplan="${wd}" aria-label="${esc(DAYS_LONG[wd])}"><option value="">${T('Yok')}</option>${PARTS.map(([k, l]) => `<option value="${k}" ${x && x.part === k ? 'selected' : ''}>${T(l)}</option>`).join('')}</select><div class="money"><input data-uplanh="${wd}" inputmode="decimal" value="${x ? inNum(x.h) : ''}" placeholder="0" aria-label="${esc(T('{x}: saat', { x: DAYS_LONG[wd] }))}"><span>${T('sa')}</span></div></div>`; }).join('')}</div></div></div>`;
}
function setPlan(wd, part, h) {
  let plan = (S.uberPlan || []).filter((x) => x.wd !== wd);
  if (part) plan.push({ wd, part, h: h != null ? h : (part === 'gun' ? 6 : 3) });
  S.uberPlan = plan.sort((a, b) => ((a.wd + 6) % 7) - ((b.wd + 6) % 7));
}
