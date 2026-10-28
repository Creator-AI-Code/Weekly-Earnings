// ===================== events =====================
const val = (id) => ($(id) ? $(id).value : '');
const pnum = (id) => { const v = parse(val(id)); return v === '' ? null : v; }; // budget-style parse (accepts 1.061 and 12,5)
const dnum = (id) => num(val(id)); // decimal parse for kg, units, prices
function after() { save(); renderAll(); }

// ---------- daily expenses: add / find / delete with undo ----------
function addDaily(day, name, amount, cat, oneOff) {
  const w = weekObj(idOf(mondayOf(parseKey(day))));
  const e = { id: uid(), date: day, name: name || (cat ? dcatName(cat) : T('Harcama')), amount: r2(amount), cat: cat || null };
  if (oneOff) e.oneOff = true; w.daily.push(e); return e;
}
function findDaily(id) {
  for (const [week, w] of Object.entries(D.money.weeks)) { const i = (w.daily || []).findIndex((x) => x.id === id); if (i >= 0) return { week, w, i, x: w.daily[i] }; }
  return null;
}
let lastDeleted = null, undoTimer = null, lastModule = null;
function deleteDaily(id) {
  const f = findDaily(id); if (!f) return;
  f.w.daily.splice(f.i, 1); lastDeleted = { week: f.week, i: f.i, x: f.x }; if (f.x.acc) accAdjust(f.x.acc, +f.x.amount || 0);
  save(); render();
  toastAction(T('Silindi: {x} ({y})', { x: f.x.name || T('Harcama'), y: money(+f.x.amount || 0) }), T('Geri al'));
}
function undoDelete() {
  if (!lastDeleted) return; const w = weekObj(lastDeleted.week);
  w.daily.splice(Math.min(lastDeleted.i, w.daily.length), 0, lastDeleted.x); if (lastDeleted.x.acc) accAdjust(lastDeleted.x.acc, -(+lastDeleted.x.amount || 0)); lastDeleted = null;
  const t = $('toast'); if (t) t.hidden = true; clearTimeout(undoTimer); save(); render();
}
function toastAction(msg, label, act) {
  const t = $('toast'); if (!t) return;
  t.innerHTML = `<span>${esc(msg)}</span><button type="button" class="toast-act" data-act="${act || 'undo'}" id="undoBtn">${esc(label)}</button>`;
  t.hidden = false; clearTimeout(toastT); clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { t.hidden = true; lastDeleted = null; }, 5000);
}

// ---------- swipe left to delete (pointer events, ~80px threshold) ----------
let swipe = null, swipeSuppress = false;
// no horizontal gesture may start in the 32 px Android back-gesture zone at either screen edge
const edgeZone = (x) => x < 32 || x > window.innerWidth - 32;
document.addEventListener('pointerdown', (e) => {
  const fg = e.target.closest('.swipe-fg'); if (!fg || e.button > 0 || edgeZone(e.clientX)) return;
  swipe = { fg, row: fg.parentElement, x: e.clientX, y: e.clientY, dx: 0, on: false, pid: e.pointerId };
});
document.addEventListener('pointermove', (e) => {
  if (!swipe || e.pointerId !== swipe.pid) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if (!swipe.on) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { swipe.on = true; try { swipe.fg.setPointerCapture(e.pointerId); } catch (err) {} swipe.row.classList.add('swiping'); } else return; }
  swipe.dx = Math.max(-160, Math.min(0, dx));
  swipe.fg.style.transform = `translateX(${swipe.dx}px)`;
  swipe.row.classList.toggle('armed', swipe.dx <= -80);
});
function endSwipe(e) {
  if (!swipe || (e && e.pointerId !== swipe.pid)) return;
  const s = swipe; swipe = null; if (!s.on) return;
  swipeSuppress = true; setTimeout(() => { swipeSuppress = false; }, 350);
  s.row.classList.remove('swiping');
  // full swipe deletes; a partial swipe leaves the red "Sil" button revealed to tap
  if (s.dx <= -120) { s.fg.style.transform = 'translateX(-110%)'; const id = s.row.dataset.swipe; setTimeout(() => deleteDaily(id), 140); }
  else if (s.dx <= -40) { s.fg.style.transform = 'translateX(-96px)'; s.row.classList.add('open'); }
  else { s.fg.style.transform = ''; s.row.classList.remove('armed', 'open'); }
}
document.addEventListener('pointerup', endSwipe);
document.addEventListener('pointercancel', endSwipe);
function addSampleHabits() { const k = todayKey(); SAMPLE_HABITS.forEach(([tr, band, en]) => { const name = LANG === 'en' ? en : tr; if (!G().habits.some((h) => h.name === name)) G().habits.push({ id: uid(), name, band, created: k }); }); toast(T('Örnek alışkanlıklar eklendi. İstediğin gibi düzenleyebilirsin.')); }

document.addEventListener('click', (e) => {
  if (!e.target.closest || !e.target.closest('.combo')) comboClose();
  const tabBtn = e.target.closest('#tabs button[data-tab]'); if (tabBtn) { go(tabBtn.dataset.tab); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id, k = todayKey();
  if (a === 'scrim') { if (e.target === b) closeOverlay(); return; }
  if (!/^del/.test(a)) U.armed = null;
  const arm = (fn) => { if (U.armed === id) { U.armed = null; fn(); } else { U.armed = id; renderAll(); } };
  const pot = id ? D.money.pots.find((p) => p.id === id) : null;
  switch (a) {
    // navigation & overlays
    case 'go': if (b.dataset.week) U.cur = b.dataset.week; go(b.dataset.tab, b.dataset.seg); break;
    case 'setSec': openOverlay('setSec', b.dataset.v); break;
    case 'dayOpen': U.openDay = U.openDay === b.dataset.d ? null : b.dataset.d; render(); { const f0 = $('dAmt'); if (f0 && U.openDay) f0.focus({ preventScroll: true }); } break;
    case 'dOneOff': U.dOneOff = !U.dOneOff; b.setAttribute('aria-pressed', String(!!U.dOneOff)); break;
    case 'deOneOff': { const x0 = findDaily(U.sheet.id); const cur0 = U.sheet.oneOff != null ? U.sheet.oneOff : !!(x0 && x0.x.oneOff); U.sheet.oneOff = !cur0; b.setAttribute('aria-pressed', String(U.sheet.oneOff)); break; }
    case 'openDay': U.tab = 'para'; U.paraSeg = 'hafta'; U.cur = b.dataset.week; U.openDayWeek = U.cur; U.openDay = b.dataset.d; render(); window.scrollTo({ top: 0 }); break;
    case 'taxDone': { const wid = b.dataset.week; markTaxDone(wid); renderAll(); toast(T('Aktarıldı: {x}', { x: usd2(+(weekSetAside(wid) || {}).amount || 0) })); break; }
    case 'taxUndo': undoTaxDone(b.dataset.week); renderAll(); break;
    case 'hideSwipeHint': D.ui.swipeHintSeen = true; after(); break;
    case 'comboCats': { const l = $(b.dataset.for + 'List'); if (l && !l.hidden && l.querySelector('.combo-h')) comboClose(); else comboOpen(b.dataset.for, true); break; }
    case 'comboPick': { const f = b.dataset.for, inp = $(f); if (!b.dataset.only && inp) inp.value = b.dataset.n; comboSetCat(f, b.dataset.c || null); U.catManual = !!b.dataset.only; comboClose(); const a0 = $(f === 'dName' ? 'dAmt' : 'qAmt'); if (a0 && !a0.value) a0.focus(); break; }
    case 'dCat': { const keep = [val('dAmt'), val('dName'), val('qAmt'), val('qName')]; U.dCat = U.dCat === b.dataset.v ? null : b.dataset.v;
      if (U.dCat) { const lbl = dcatName(U.dCat), prev = dcatName(b.dataset.prev || ''); [1, 3].forEach((i) => { if (!keep[i].trim() || DCATS.some((c) => T(c[1]) === keep[i].trim())) keep[i] = lbl; }); } if (U.sheet && U.sheet.kind === 'fab') renderSheet(); else render(); [['dAmt', 0], ['dName', 1], ['qAmt', 2], ['qName', 3]].forEach(([x, i]) => { if ($(x)) $(x).value = keep[i]; }); break; }
    case 'deCat': { Object.assign(U.sheet, { amt: val('deAmt'), name: val('deName'), date: val('deDate'), oneOff: $('deOneOff') ? $('deOneOff').getAttribute('aria-pressed') === 'true' : undefined }); U.sheet.cat = U.sheet.cat === b.dataset.v ? null : b.dataset.v; renderSheet(); break; }
    case 'editDaily': { if (swipeSuppress) { swipeSuppress = false; break; } const f0 = findDaily(id); if (f0) openOverlay('sheet', { kind: 'daily', id, week: f0.week, cat: f0.x.cat || null }); break; }
    case 'delDaily': { const inSheet = U.sheet && U.sheet.kind === 'daily'; deleteDaily(id); if (inSheet) closeOverlay(); break; }
    case 'undo': undoDelete(); break;
    // account & sync
    case 'syShow': { const keep = [val('syEmail'), val('syPass')]; U.auth = Object.assign({}, U.auth, { show: !(U.auth && U.auth.show), email: keep[0], msg: U.auth && U.auth.msg, err: U.auth && U.auth.err }); renderPage(); $('syPass').value = keep[1]; $('syPass').focus(); break; }
    case 'syLogin': case 'sySignup': {
      const email = val('syEmail').trim().toLowerCase(), pass = val('syPass'), show = !!(U.auth && U.auth.show), mode = a === 'syLogin' ? 'login' : 'signup';
      const fail = (msg) => { U.auth = { email, show, msg, err: true }; renderPage(); $('syPass').value = pass; };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail(T('Geçerli bir e-posta adresi gir.')); break; }
      if (pass.length < 8) { fail(T('Şifre en az 8 karakter olmalı.')); break; }
      U.auth = { email, show, busy: mode }; renderPage(); $('syPass').value = pass;
      SY.lastEmail = email; saveSync();
      (mode === 'login' ? signInPassword(email, pass) : signUpPassword(email, pass)).then((ok) => {
        if (!ok) { U.auth = { email, show, msg: T("Hesabın oluşturuldu. Supabase'te e-posta onayı açık; onayı kapat ya da gelen e-postadaki bağlantıya tıkla, sonra giriş yap.") }; renderPage(); return; }
        U.auth = null; toast(T(mode === 'login' ? 'Giriş yapıldı' : 'Hesabın oluşturuldu, giriş yapıldı')); setSyncState('syncing'); renderPage(); syncAll().then(loadDevices);
      }).catch((err) => fail(authErrorMsg(err)));
      break;
    }
    case 'sySync': syncAll().then(loadDevices); break;
    case 'syOut': signOut(); break;
    case 'conflict': { const ch = b.dataset.v; const f = conflictResolve; conflictResolve = null; closeOverlay(); if (f) f(ch); break; }
    case 'delDevice': arm(() => { rest('DELETE', '/rest/v1/devices?id=eq.' + encodeURIComponent(id)).then(loadDevices).catch(() => { toast(T('Cihaz kaldırılamadı.')); }); }); break;
    case 'notifToggle': enableNotif(b.dataset.k, !notifCfg()[b.dataset.k].on); break;
    case 'catGst': setCatDefault(b.dataset.k, { gst: b.dataset.v === 'true' }); save(); renderPage(); break;
    case 'openSettings': openOverlay('page', 'settings'); if (b.dataset.sec) openOverlay('setSec', b.dataset.sec); if (b.dataset.focus) setTimeout(() => { const el = $(b.dataset.focus); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } }, 50); break;
    case 'openInsights': openOverlay('page', 'insights'); break;
    case 'closeOverlay': closeOverlay(); break;
    case 'openFab': U.dCat = null; U.dOneOff = false; openOverlay('sheet', { kind: 'fab', k: null }); break;
    case 'dismissNotice': D.ui.notice = null; after(); break;
    case 'focusHours': { const el = $('wHours'); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } break; }
    case 'newAcc': openOverlay('sheet', { kind: 'acc', type: D.money.accounts.length ? 'savings' : 'main' }); setTimeout(() => { const n = $('accName'); if (n) n.focus(); }, 60); break;
    case 'editAcc': openOverlay('sheet', { kind: 'acc', id }); setTimeout(() => { const n = $('accBal'); if (n) { n.focus(); n.select(); } }, 60); break;
    case 'delAcc': arm(() => { D.money.accounts = D.money.accounts.filter((x) => x.id !== id); closeOverlay(); after(); }); if (U.sheet) renderSheet(); break;
    case 'chartTip': chartTip(b); break;
    case 'askClaude': askClaude(); break;
    case 'ubImport': importUberPdf().catch(() => toast(T('PDF okunamadı.'))); break;
    case 'ubSave': { const r = U.sheet && U.sheet.r; if (r) { saveUberSum(r); closeOverlay(); U.taxQ = quarterOf(r.start).key; renderAll(); toast(T('Uber özeti kaydedildi: G1 {x}', { x: usd2(r.g1) })); } break; }
    case 'delUbSum': arm(() => { const x = D.money.uberSums[id]; delete D.money.uberSums[id]; if (x) { const k = quarterOf(x.start).key; delete D.money.taxSummaries[k]; rebuildTaxSummary(k); } after(); }); break;
    case 'useRenFixed': S.fixed = Math.round(renewalYear().total * logbook() / 100); save(); renderPage(); toast(T('Sabit masraflar: yıllık {x}', { x: usd(S.fixed) })); break;
    // car + renewals
    case 'editCar': openOverlay('sheet', { kind: 'car' }); break;
    case 'newRen': openOverlay('sheet', { kind: 'ren' }); break;
    case 'editRen': openOverlay('sheet', { kind: 'ren', id }); break;
    case 'renDone': closeOverlay(); renewDone(id); renderAll(); break;
    case 'delRen': arm(() => { D.money.renewals = D.money.renewals.filter((x) => x.id !== id); closeOverlay(); after(); scheduleNotifs(); }); if (U.sheet) renderSheet(); break;
    // receipts
    case 'scanRc': scanReceipt().catch(() => toast(T('Fiş açılamadı.'))); break;
    case 'rcWho': rcKeep(); U.sheet.who = b.dataset.v; if (b.dataset.v === 'uber') { if (!U.sheet.ucat) U.sheet.ucat = 'fuel'; } else if (U.sheet.dcat == null && U.sheet.ucat === 'fuel') U.sheet.dcat = FUEL_CAT; renderSheet(); break;
    case 'rcCat': rcKeep(); U.sheet.dcat = U.sheet.dcat === b.dataset.v ? null : b.dataset.v; renderSheet(); break;
    case 'rcDiscard': { const p0 = U.sheet && U.sheet.path; closeOverlay(); if (p0) rcDelete(p0); break; }
    case 'viewRc': if (U.sheet && U.sheet.kind === 'receipt') { const im = $('rcImg'); if (im) im.classList.toggle('big'); } else openOverlay('sheet', { kind: 'rcview', path: b.dataset.p }); break;
    // Uber shifts + logbook
    case 'shiftStart': openOverlay('sheet', { kind: 'shift', mode: 'start' }); focusSoon('odoKm'); break;
    case 'shiftEnd': { const o = openShift(); if (o) { openOverlay('sheet', { kind: 'shift', mode: 'end', id: o.id }); focusSoon('odoKm'); } break; }
    case 'odoRead': openOverlay('sheet', { kind: 'shift', mode: 'odo' }); focusSoon('odoKm'); break;
    case 'lbStart': case 'lbNew': openOverlay('sheet', { kind: 'shift', mode: 'lbStart' }); focusSoon('odoKm'); break;
    case 'lbEnd': openOverlay('sheet', { kind: 'shift', mode: 'lbEnd' }); focusSoon('odoKm'); break;
    case 'delTrip': arm(() => { D.money.trips = TRIPS().filter((t) => t.id !== id); if (U.sheet && U.sheet.kind === 'shift') { U.sheet = null; renderSheet(); } after(); toast(T('Vardiya silindi.')); }); if (U.sheet && U.sheet.kind === 'shift') renderSheet(); break;
    case 'delLb': arm(() => { D.money.lb = null; after(); toast(T('Logbook iptal edildi. Vardiyaların duruyor.')); }); break;
    case 'lbApply': { const st = lbStats(); if (st && st.pct != null) { S.logbookPct = Math.max(1, Math.floor(st.pct)); after(); toast(T('Araç giderlerinin iş payı artık {p}.', { p: pct(S.logbookPct) })); } break; }
    case 'lbExport': { const csv = lbCSV(); if (csv) saveFile('logbook-' + todayKey() + '.csv', csv, 'text/csv').then((r) => { if (r && r.how !== 'cancel') toast(r.how === 'download' ? T('Logbook indirildi: {x}', { x: r.name }) : r.how === 'clip' ? T('Logbook panoya kopyalandı.') : T('Logbook hazır: {x}', { x: r.name })); else if (!r) toast(T('Dosya oluşturulamadı.')); }); break; }
    case 'paraSeg': U.paraSeg = b.dataset.v; render(); break;
    case 'gelSeg': U.gelSeg = b.dataset.v; render(); break;
    // quick add
    case 'fabPick': {
      const q = b.dataset.k;
      if (q === 'sigara' || q === 'alkol') { const f = q === 'sigara' ? 'cig' : 'alc'; const nv = (hd(k)[f] || 0) + 1; setH(k, { [f]: nv }); closeOverlay(); toast(T(q === 'sigara' ? 'Sigara: bugün {n}' : 'Alkol: bugün {n}', { n: nv })); render(); }
      else if (q === 'uexp') { U.sheet = openUexp(null); renderSheet(); }
      else if (q === 'fis') { closeOverlay(); scanReceipt().catch(() => toast(T('Fiş açılamadı.'))); }
      else { if (q === 'harcama' && U.sheet.k !== 'harcama') { U.dCat = null; U.dOneOff = false; } U.sheet.k = q; renderSheet(); const first = document.querySelector('#qForm input'); if (first) first.focus(); }
      break;
    }
    // habits
    case 'habit': toggleHabit(id, k); renderAll(); break;
    case 'cell': toggleHabit(id, b.dataset.k); render(); break;
    case 'sampleHabits': addSampleHabits(); after(); break;
    case 'openHabitSheet': openOverlay('sheet', { kind: 'habits', draft: G().habits.map((h) => ({ ...h })) }); break;
    case 'delHabitDraft': U.sheet.draft.splice(+b.dataset.i, 1); renderSheet(); break;
    case 'saveHabits': { const nv = val('hsNew').trim(); if (nv) U.sheet.draft.push({ id: uid(), name: nv, band: 'sabah', created: k }); G().habits = U.sheet.draft.filter((h) => h.name.trim()).map((h) => Object.assign({}, h, { name: h.name.trim() })); save(); closeOverlay(); render(); break; }
    case 'newBand': U.newBand = b.dataset.v; render(); break;
    // tasks
    case 'task': { const t = G().tasks.find((x) => x.id === id); if (t) { t.done = !t.done; t.doneOn = t.done ? k : null; after(); } break; }
    case 'delTask': arm(() => { G().tasks = G().tasks.filter((x) => x.id !== id); after(); }); break;
    case 'clearDone': G().tasks = G().tasks.filter((t) => !t.done); after(); break;
    case 'filter': U.taskFilter = b.dataset.v; render(); break;
    case 'tcat': U.taskCat = b.dataset.v; render(); break;
    case 'prio': U.taskPrio = +b.dataset.p; render(); break;
    // goals
    case 'delGoal': arm(() => { G().goals = G().goals.filter((x) => x.id !== id); after(); }); break;
    case 'step': { const g = G().goals.find((x) => x.id === b.dataset.g), s = g && g.steps.find((x) => x.id === id); if (s) { s.done = !s.done; if (s.done && g.steps.every((x) => x.done)) toast(T('Hedef tamamlandı: {x}', { x: g.title })); after(); } break; }
    case 'delStep': { const g = G().goals.find((x) => x.id === b.dataset.g); if (g) { g.steps = g.steps.filter((x) => x.id !== id); after(); } break; }
    // books
    case 'bseg': U.bookSeg = b.dataset.v; render(); break;
    case 'startBook': { const bk = G().books.find((x) => x.id === id); if (bk) { bk.status = 'reading'; bk.start = k; U.bookSeg = 'reading'; after(); } break; }
    case 'pages': { const bk = G().books.find((x) => x.id === id); if (bk) { const n = +b.dataset.n; const np = bk.pages ? Math.min(bk.pages, (bk.page || 0) + n) : (bk.page || 0) + n; G().readLog[k] = (G().readLog[k] || 0) + (np - (bk.page || 0)); bk.page = np; if (bk.pages && np >= bk.pages) { bk.status = 'done'; bk.fin = k; } after(); } break; }
    case 'finish': { const bk = G().books.find((x) => x.id === id); if (bk) { if (bk.pages && (bk.page || 0) < bk.pages) { G().readLog[k] = (G().readLog[k] || 0) + (bk.pages - (bk.page || 0)); bk.page = bk.pages; } bk.status = 'done'; bk.fin = k; toast(T('Kitap bitti: {x}', { x: bk.title })); after(); } break; }
    case 'rate': { const bk = G().books.find((x) => x.id === id); if (bk) { bk.rate = +b.dataset.n; after(); } break; }
    case 'delBook': arm(() => { G().books = G().books.filter((x) => x.id !== id); after(); }); break;
    // health
    case 'cnt': { const f = b.dataset.f, c0 = hd(k)[f]; const nv = Math.max(0, (c0 == null ? 0 : c0) + +b.dataset.d); setH(k, { [f]: nv }); render(); break; }
    case 'zero': setH(k, { [b.dataset.f]: 0 }); render(); break;
    // journal
    case 'mood': G().journal[k] = Object.assign({}, G().journal[k], { mood: +b.dataset.m }); after(); break;
    case 'jtag': { const j = G().journal[k] = Object.assign({ tags: [] }, G().journal[k]); j.tags = (j.tags || []).slice(); const t = b.dataset.t, i = j.tags.indexOf(t); if (i >= 0) j.tags.splice(i, 1); else j.tags.push(t); after(); break; }
    // insights
    case 'hideInsight': D.ui.hiddenInsights[id] = true; after(); break;
    case 'showInsight': delete D.ui.hiddenInsights[id]; after(); break;
    case 'restoreInsights': D.ui.hiddenInsights = {}; after(); break;
    // budget
    case 'weekGo': { const d = fromId(U.cur); d.setDate(d.getDate() + 7 * +b.dataset.d); U.cur = idOf(d); render(); break; }
    case 'addExtra': { const w = weekObj(U.cur); w.extras.push({ name: T('Yeni harcama'), amount: 0 }); save(); render(); const n = $('exN' + (w.extras.length - 1)); if (n) { n.focus(); n.select(); } break; }
    case 'delExtra': { const w = weekObj(U.cur); w.extras.splice(+b.dataset.i, 1); save(); render(); break; }
    case 'openWeek': U.cur = id; U.paraSeg = 'hafta'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    case 'month': U.calMonth = +b.dataset.m; render(); { const m = $('mDetail'); if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' }); } break;
    case 'yearGo': U.calYear += +b.dataset.d; render(); break;
    case 'addRec': S.recurring.push({ name: T('Yeni gider'), amount: 0 }); save(); renderPage(); { const n = $('rcN' + (S.recurring.length - 1)); if (n) { n.focus(); n.select(); } } break;
    case 'delRec': S.recurring.splice(+b.dataset.i, 1); save(); renderPage(); break;
    case 'setCashTax': S.cashTax = b.dataset.v === 'true'; after(); break;
    case 'setCover': S.cover = b.dataset.v === 'true'; after(); break;
    // pots
    case 'newPot': openOverlay('sheet', { kind: 'pot', id: null, icon: 'jar' }); break;
    case 'editPot': if (pot) openOverlay('sheet', { kind: 'pot', id, icon: pot.icon || 'jar' }); break;
    case 'potIcon': U.sheet.icon = b.dataset.v; { const nm = val('potName'), tg = val('potTarget'); renderSheet(); $('potName').value = nm; $('potTarget').value = tg; } break;
    case 'delPot': arm(() => { D.money.pots = D.money.pots.filter((p) => p.id !== id); save(); closeOverlay(); render(); }); break;
    case 'potAdd': case 'potTake': {
      if (!pot) break; const v = pnum('pa-' + id); if (!v || v <= 0) { const el = $('pa-' + id); if (el) el.focus(); break; }
      if (a === 'potTake' && v > pot.saved + 1e-9) { toast(T('Kumbarada bu kadar para yok ({x}).', { x: usd(pot.saved) })); break; }
      const sv = a === 'potAdd' ? v : -v; pot.saved = Math.round((pot.saved + sv) * 100) / 100; pot.log.push({ d: k, a: sv });
      if (a === 'potAdd' && pot.target && pot.saved >= pot.target && pot.saved - v < pot.target) toast(T('{x} hedefine ulaştı.', { x: pot.name })); after(); break;
    }
    case 'potBuy': if (pot) openOverlay('sheet', { kind: 'potbuy', id }); break;
    // invest
    case 'toggleHide': D.ui.hideValues = !D.ui.hideValues; after(); break;
    case 'refresh': refreshPrices(true); break;
    case 'newHolding': openOverlay('sheet', { kind: 'holding', id: null, market: 'US', currency: 'USD' }); break;
    case 'editHolding': { const h = IV().holdings.find((x) => x.id === id); if (h) openOverlay('sheet', { kind: 'holding', id, market: h.market, currency: h.currency || (h.market === 'ASX' ? 'AUD' : 'USD') }); break; }
    case 'holdMkt': case 'holdCur': { const keep = ['hdSym', 'hdUnits', 'hdAvg', 'hdPrice'].map((x) => val(x)); if (a === 'holdMkt') { U.sheet.market = b.dataset.v; U.sheet.currency = b.dataset.v === 'ASX' ? 'AUD' : 'USD'; } else U.sheet.currency = b.dataset.v; renderSheet(); ['hdSym', 'hdUnits', 'hdAvg', 'hdPrice'].forEach((x, i) => { $(x).value = keep[i]; }); break; }
    case 'delHolding': arm(() => { IV().holdings = IV().holdings.filter((x) => x.id !== id); save(); closeOverlay(); render(); }); break;
    case 'delWatch': IV().watchlist.splice(+b.dataset.i, 1); after(); break;
    case 'watchMkt': U.watchMkt = b.dataset.v; { const s0 = val('watchSym'); render(); $('watchSym').value = s0; } break;
    case 'impConfirm': impApply(); render(); break;
    case 'impCancel': U.imp = null; render(); break;
    // settings
    case 'toggleCard': toggleCardPref(b.dataset.k); after(); break;
    case 'toggleHome': IV().showOnHome = !IV().showOnHome; after(); break;
    case 'setTheme': D.ui.theme = b.dataset.v; applyTheme(); after(); break;
    case 'setPalette': D.ui.palette = b.dataset.v; applyTheme(); after(); break;
    case 'modToggle': {
      const mk = b.dataset.k, was = modOn(mk), nm = T((MODULES.find((x) => x[0] === mk) || [])[1] || ''); setModule(mk, !was); lastModule = { k: mk, v: was }; after();
      if (was) toastAction(T('{x} gizlendi. Verilerin duruyor.', { x: nm }), T('Geri al'), 'undoModule'); else toast(T(TAB_ORDER.includes(mk) ? '{x} açıldı. Sekmesi altta.' : '{x} açıldı.', { x: nm }));
      break;
    }
    case 'undoModule': if (lastModule) { setModule(lastModule.k, lastModule.v); lastModule = null; const t0 = $('toast'); if (t0) t0.hidden = true; clearTimeout(undoTimer); after(); } break;
    case 'export': {
      exportBackup().then((r) => {
        U.bkMsg = !r ? T('Yedek indirilemedi.') : r.how === 'download' ? T('Yedek indirildi: {x} (İndirilenler klasörü)', { x: r.name })
          : r.how === 'share' ? T('Yedek hazır: {x}. Açılan menüden Drive, Dosyalar veya e-postaya kaydet.', { x: r.name })
          : r.how === 'clip' ? T('Paylaşım açılamadı; yedek panoya kopyalandı. Bir nota veya kendine e-postaya yapıştır.') : T('Yedek iptal edildi.');
        renderPage();
      });
      break;
    }
    case 'bkNo': U.bk = null; renderPage(); break;
    case 'bkYes': { const bk = U.bk; U.bk = null; if (!bk) break; try { U.bkMsg = applyImport(bk.o, bk.kind); } catch (err) { U.bkMsg = T('Yedek yüklenirken bir sorun oldu; verilerin değişmedi.'); } saveNow(); applyTheme(); applyLang(); renderAll(); break; }
    case 'setLang': D.ui.lang = b.dataset.v; applyLang(); after(); break;
    // tax
    case 'taxQGo': U.taxQ = qShift(U.taxQ, +b.dataset.d); render(); break;
    case 'newUexp': openOverlay('sheet', openUexp(null)); break;
    // B2: fuel is entered once, in the daily list: open today's quick spending with "Yakıt (Uber)" chosen
    case 'fuelToDaily': { U.dCat = FUEL_CAT; U.dOneOff = false; if (U.sheet) { U.sheet = { kind: 'fab', k: 'harcama' }; renderSheet(); } else openOverlay('sheet', { kind: 'fab', k: 'harcama' }); const n = $('qName'); if (n) n.value = dcatName(FUEL_CAT); const a0 = $('qAmt'); if (a0) a0.focus(); break; }
    case 'taxTopUp': topUpTaxDone(b.dataset.week); render(); renderSheet(); toast(T('Aktarıldı: {x}', { x: usd2(r2(weekTaxOf(b.dataset.week))) })); break;
    case 'editUexp': openOverlay('sheet', openUexp(id)); break;
    case 'ueGst': { const keep = uexpKeep(); U.sheet.gst = b.dataset.v === 'true'; Object.assign(U.sheet, keep); renderSheet(); break; }
    case 'delUexp': arm(() => { D.money.uberExpenses = D.money.uberExpenses.filter((x) => x.id !== id); save(); closeOverlay(); render(); }); break;
    case 'delSetAside': arm(() => { D.money.setAsides = D.money.setAsides.filter((x) => x.id !== id); after(); }); break;
  }
});

document.addEventListener('focusin', (e) => { const t = e.target; if (t && (t.id === 'dName' || t.id === 'qName')) comboOpen(t.id); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.combo-list:not([hidden])')) { comboClose(); e.stopPropagation(); } }, true);
document.addEventListener('input', (e) => {
  const t = e.target, k = todayKey(), ds = t.dataset;
  if (ds.wk) { const w = weekObj(U.cur); w[ds.wk] = ds.wk === 'note' ? t.value : parse(t.value); save(); paraCalc(); return; }
  if (ds.ex) { const x = weekObj(U.cur).extras[+ds.i]; if (!x) return; if (ds.ex === 'name') x.name = t.value; else { const n = parse(t.value); x.amount = n === '' ? 0 : n; } save(); paraCalc(); return; }
  if (ds.setdate) { S[ds.setdate] = /^\d{4}-\d{2}-\d{2}$/.test(t.value) ? t.value : ''; save(); return; }
  if (ds.uplanh != null) { const wd = +ds.uplanh, x = (S.uberPlan || []).find((q) => q.wd === wd), h = num(t.value); if (x && h > 0) { x.h = h; save(); } else if (!x && h > 0) { setPlan(wd, 'gun', h); save(); } return; }
  if (ds.set) { const v = parse(t.value); S[ds.set] = v === '' ? 0 : v; save(); return; }
  if (ds.tsum) { const v = parse(t.value), sm = D.money.taxSummaries[U.taxQ] = Object.assign({}, D.money.taxSummaries[U.taxQ]); if (v === '' || v <= 0) delete sm[ds.tsum]; else sm[ds.tsum] = v; if (!Object.keys(sm).length) delete D.money.taxSummaries[U.taxQ]; save(); return; }
  if (ds.rc) { const x = S.recurring[+ds.i]; if (!x) return; if (ds.rc === 'name') x.name = t.value; else { const n = parse(t.value); x.amount = n === '' ? 0 : n; } save(); return; }
  if (ds.j) { const j = G().journal[k] = Object.assign({}, G().journal[k], { [ds.j]: t.value }); if (!j.mood && !j.line && !(j.tags || []).length && !j.win && !j.learn && !j.focus) delete G().journal[k]; save(); return; }
  if (t.id === 'dName' || t.id === 'qName') { if (!U.catManual) comboSetCat(t.id, guessCat(t.value)); comboOpen(t.id); return; }
  if (t.hasAttribute('data-idtext')) { G().identity = t.value; save(); return; }
  if (ds.bnote) { const bk = G().books.find((x) => x.id === ds.bnote); if (bk) { bk.note = t.value; save(); } return; }
  if (ds.hedit != null && U.sheet && U.sheet.draft) { U.sheet.draft[+ds.hedit].name = t.value; return; }
  if (t.id === 'syDevName') { SY.deviceName = t.value.trim() || autoDeviceName(); saveSync(); scheduleSync(1500); return; }
  if (ds.catbiz) { const v = num(t.value); if (v != null && v >= 0 && v <= 100) { setCatDefault(ds.catbiz, { biz: v }); save(); } return; }
  if (t.hasAttribute('data-ivkey')) { IV().finnhubKey = t.value.trim(); IV().lastRefresh = 0; save(); return; }
});
document.addEventListener('focusout', (e) => {
  const t = e.target, ds = t.dataset;
  if (ds.wk && ds.wk !== 'note') { const w = getWeek(U.cur); t.value = fmtIn(w ? w[ds.wk] : ''); }
  else if (ds.ex === 'amount') { const w = getWeek(U.cur), x = w && w.extras[+ds.i]; if (x) t.value = fmtIn(x.amount); }
  else if (ds.set) t.value = fmtIn(ds.set === 'logbookPct' ? logbook() : S[ds.set]);
  else if (ds.rc === 'amount') { const x = S.recurring[+ds.i]; if (x) t.value = fmtIn(x.amount); }
});
document.addEventListener('change', async (e) => {
  if (e.target && e.target.dataset && e.target.dataset.uplan != null) { const wd = +e.target.dataset.uplan, h = num(val('') || (document.querySelector(`[data-uplanh="${wd}"]`) || {}).value || ''); setPlan(wd, e.target.value || null, h > 0 ? h : null); save(); renderPage(); return; }
  if (e.target && e.target.id === 'rcUcat' && U.sheet && U.sheet.kind === 'receipt') { rcKeep(); renderSheet(); return; }
  const t = e.target, k = todayKey(), ds = t.dataset;
  if (t.id === 'shFile') { if (t.files && t.files.length) importSamsung([...t.files]); t.value = ''; return; }
  if (t.id === 'stakeFile') { const f = t.files && t.files[0]; t.value = ''; if (f) readStakeFile(f); return; }
  if (t.id === 'bkFile') {
    const f = t.files && t.files[0]; t.value = ''; if (!f) return;
    try { const o = JSON.parse(await f.text()); const kind = detectBackup(o); if (!kind) throw new Error('bad'); U.bk = { o, kind, sum: dryRun(o, kind) }; U.bkMsg = null; }
    catch (err) { U.bk = null; U.bkMsg = T('Bu dosya tanınan bir yedek değil. Momentum yedeği, Haftalık Bütçe yedeği ya da eski Momentum verisi seçmelisin.'); }
    renderPage(); const c = $('bkConfirm'); if (c) c.scrollIntoView({ block: 'center' }); return;
  }
  if (ds.h) {
    const f = ds.h, v = num(t.value);
    if (f === 'sleep') setH(k, { sleepM: v == null ? null : Math.round(v * 60), sleep: v == null ? null : Math.round(v * 60) });
    else if (f === 'weight') setH(k, { weight: v == null ? null : Math.round(v * 10) / 10 });
    else setH(k, { [f]: v == null ? null : Math.round(v) });
    render(); return;
  }
  if (ds.hs) { const v = num(t.value); D.health[ds.hs] = ds.hs === 'packPrice' ? (v && v > 0 ? v : 40) : v; save(); return; }
  if (ds.tsum) { render(); return; }
  if (t.hasAttribute('data-uecat') && U.sheet && U.sheet.kind === 'uexp') { const keep = uexpKeep(), def = catDefaults(t.value); Object.assign(U.sheet, keep, { cat: t.value, gst: def.gst, biz: def.biz }); renderSheet(); return; }
  if (ds.hband != null && U.sheet && U.sheet.draft) { U.sheet.draft[+ds.hband].band = t.value; return; }
  if (ds.ntime) { notifCfg()[ds.ntime].time = t.value || NOTIF_DEF[ds.ntime].time; save(); scheduleNotifs(); return; }
  if (t.hasAttribute('data-bookgoal')) { const v = num(t.value); if (v && v > 0) { G().bookGoal = Math.round(v); save(); } return; }
  if (t.id === 'bGoal') { const v = num(t.value); if (v && v > 0) { G().bookGoal = Math.round(v); after(); } return; }
  if (ds.bpage) { const bk = G().books.find((x) => x.id === ds.bpage), v = num(t.value); if (bk && v != null && v >= 0) { const np = bk.pages ? Math.min(bk.pages, Math.round(v)) : Math.round(v); const diff = np - (bk.page || 0); if (diff > 0) G().readLog[k] = (G().readLog[k] || 0) + diff; bk.page = np; if (bk.pages && np >= bk.pages) { bk.status = 'done'; bk.fin = k; } after(); } return; }
  if (ds.map && U.imp && U.imp.sheets) { const sh = U.imp.sheets[+ds.sheet]; if (t.value === '') delete sh.map[ds.map]; else sh.map[ds.map] = +t.value; $('impBox').innerHTML = impPreview(); return; }
});
document.addEventListener('submit', (e) => {
  e.preventDefault(); const f = e.target, k = todayKey();
  switch (f.id) {
    case 'habitForm': { const v = val('habitInput').trim(); if (!v) return; G().habits.push({ id: uid(), name: v, band: U.newBand, created: k }); after(); $('habitInput') && $('habitInput').focus(); return; }
    case 'hsAdd': { const v = val('hsNew').trim(); if (!v) return; U.sheet.draft.push({ id: uid(), name: v, band: 'sabah', created: k }); renderSheet(); $('hsNew').focus(); return; }
    case 'taskForm': { const v = val('taskInput').trim(); if (!v) return; G().tasks.push({ id: uid(), text: v, prio: U.taskPrio, cat: U.taskCat, done: false, created: k }); after(); $('taskInput') && $('taskInput').focus(); return; }
    case 'goalForm': { const v = val('goalInput').trim(); if (!v) return; G().goals.push({ id: uid(), title: v, why: '', steps: [] }); after(); return; }
    case 'bookForm': { const t = val('bTitle').trim(); if (!t) { $('bTitle').focus(); return; } G().books.push({ id: uid(), title: t, author: val('bAuthor').trim(), pages: num(val('bPages')) || null, page: 0, status: 'want' }); U.bookSeg = 'want'; after(); return; }
    case 'watchForm': { const s = val('watchSym').trim().toUpperCase().replace(/\.AX$/, ''); if (!s) return; const m = U.watchMkt || 'US'; if (!IV().watchlist.some((w) => w.symbol === s && w.market === m)) IV().watchlist.push({ symbol: s, market: m }); after(); if (m === 'US') refreshPrices(true); return; }
    case 'qForm': {
      const q = f.dataset.k, tw = thisWeekId();
      if (q === 'harcama') { const amt = pnum('qAmt'); if (!amt || amt <= 0) { $('qAmt').focus(); return; } { const e0 = addDaily(k, val('qName').trim(), amt, U.dCat || guessCat(val('qName')), U.dOneOff), ac = val('qAcc'); if (ac) { e0.acc = ac; accAdjust(ac, -amt); } if ($('qAcc')) D.ui.lastAcc = ac; } U.dOneOff = false; U.dCat = null; U.catManual = false; save(); closeOverlay(); toast(T('Bugüne eklendi: {x}', { x: money(amt) })); render(); return; }
      if (q === 'uber') { const er = pnum('qEarn') || 0, hr = dnum('qHours') || 0; if (er <= 0 && hr <= 0) { $('qEarn').focus(); return; } const w = weekObj(tw); w.uberEarn = Math.round(((+w.uberEarn || 0) + er) * 100) / 100; w.uberHours = Math.round(((+w.uberHours || 0) + hr) * 100) / 100; save(); closeOverlay(); toast(T('Uber vardiyası eklendi: {x} · {h} sa', { x: usd(er), h: nf1.format(hr) })); render(); return; }
      if (q === 'kilo') { const v = dnum('qWeight'); if (!v || v < 25 || v > 300) { $('qWeight').focus(); return; } setH(k, { weight: Math.round(v * 10) / 10 }); closeOverlay(); toast(T('Kilo kaydedildi: {x} kg', { x: nf1.format(v) })); render(); return; }
      return;
    }
    case 'potForm': {
      const name = val('potName').trim(), target = pnum('potTarget') || 0; if (!name) { $('potName').focus(); return; }
      const due = /^\d{4}-\d{2}-\d{2}$/.test(val('potDue')) ? val('potDue') : null;
      if (U.sheet.id) { const p = D.money.pots.find((x) => x.id === U.sheet.id); if (p) { Object.assign(p, { name, target, icon: U.sheet.icon }); if (due) p.due = due; else delete p.due; } }
      else { const st = pnum('potStart') || 0; const np = { id: uid(), name, icon: U.sheet.icon, target, saved: st, log: st ? [{ d: k, a: st }] : [], created: k }; if (due) np.due = due; D.money.pots.push(np); }
      save(); closeOverlay(); U.paraSeg = 'kumbara'; render(); return;
    }
    case 'potBuyForm': {
      const p = D.money.pots.find((x) => x.id === U.sheet.id); if (!p) return; const amt = pnum('buyAmt'); if (!amt || amt <= 0) { $('buyAmt').focus(); return; }
      addDaily(k, p.name, amt, null, true);
      p.done = true; p.doneOn = k; p.spent = amt; p.log.push({ d: k, a: -Math.min(amt, p.saved), note: 'Satın alındı' }); /* note is a TR key, translated on display */ p.saved = Math.max(0, Math.round((p.saved - amt) * 100) / 100);
      save(); closeOverlay(); toast(T('{x}: {y} tek seferlik harcama olarak eklendi.', { x: p.name, y: money(amt) })); render(); return;
    }
    case 'accForm': {
      const r = saveAcc(); if (typeof r === 'string') { const e = $('accErr'); if (e) { e.textContent = r; e.hidden = false; } return; }
      closeOverlay(); toast(r.msg); renderAll(); return;
    }
    case 'saveGoalForm': { const v = pnum('goalAmt'); if (!v || v <= 0) { $('goalAmt').focus(); return; } S.saveTarget = v; save(); render(); toast(T('Haftalık hedef: {x}', { x: usd(v) })); return; }
    case 'carForm': {
      const eng = num(val('carEngine')); D.money.car = { make: val('carMake').trim(), model: val('carModel').trim(), year: val('carYear').replace(/\D/g, '').slice(0, 4), engine: eng && eng > 0 && eng < 10 ? eng : null, plate: val('carPlate').trim().toUpperCase(), fuel: val('carFuel') };
      save(); closeOverlay(); renderAll(); toast(T('Araç bilgileri kaydedildi.')); return;
    }
    case 'renForm': {
      const r = saveRen(); if (typeof r === 'string') { const e = $('renErr'); if (e) { e.textContent = r; e.hidden = false; } return; }
      closeOverlay(); toast(r.msg); renderAll(); return;
    }
    case 'rcForm': {
      const r = saveReceipt();
      if (typeof r === 'string') { const e = $('rcErr'); if (e) { e.textContent = r; e.hidden = false; } return; }
      closeOverlay(); toast(r.msg); renderAll(); return;
    }
    case 'shiftForm': {
      const r = submitShift(f.dataset.mode);
      if (!r || typeof r === 'string') { const e = $('odoErr'); if (e) { e.textContent = r || T('Kaydedilemedi.'); e.hidden = false; } return; }
      closeOverlay(); toast(r.msg); renderAll(); return;
    }
    case 'uexpForm': {
      const amt = pnum('ueAmt'), d0 = val('ueDate'), biz = dnum('ueBiz');
      if (!amt || amt <= 0) { $('ueAmt').focus(); return; } if (!/^\d{4}-\d{2}-\d{2}$/.test(d0)) { $('ueDate').focus(); return; }
      const sh = U.sheet, cat0 = val('ueCat') || sh.cat, b0 = biz == null ? 100 : Math.max(0, Math.min(100, biz)), rec = { d: d0, cat: cat0, amount: amt, gst: !!sh.gst, biz: b0, bizAuto: isCarCat(cat0) && Math.abs(b0 - logbook()) < 0.01, note: val('ueNote').trim() };
      if (sh.id) { const e = D.money.uberExpenses.find((x) => x.id === sh.id); if (e) Object.assign(e, rec); } else D.money.uberExpenses.push(Object.assign({ id: uid() }, rec));
      save(); closeOverlay(); toast(T('Uber gideri kaydedildi: {x}', { x: usd2(amt) })); render(); return;
    }
    case 'dailyForm': {
      const amt = pnum('dAmt'), day = f.dataset.d; if (!amt || amt <= 0) { $('dAmt').focus(); return; }
      { const e0 = addDaily(day, val('dName').trim(), amt, U.dCat || guessCat(val('dName')), U.dOneOff), ac = val('dAcc'); if (ac) { e0.acc = ac; accAdjust(ac, -amt); } if ($('dAcc')) D.ui.lastAcc = ac; } U.dOneOff = false; U.dCat = null; U.catManual = false; save(); render(); toast(T('{d} gününe eklendi: {x}', { d: dShort(day), x: money(amt) })); { const n = $('dAmt'); if (n) n.focus({ preventScroll: true }); } return;
    }
    case 'dailyEdit': {
      const sh = U.sheet, f0 = findDaily(sh.id); if (!f0) return; const amt = pnum('deAmt'); if (!amt || amt <= 0) { $('deAmt').focus(); return; }
      if ($('deAcc')) { const na = val('deAcc') || null; if (f0.x.acc) accAdjust(f0.x.acc, +f0.x.amount || 0); if (na) accAdjust(na, -amt); if (na) f0.x.acc = na; else delete f0.x.acc; } else if (f0.x.acc) accAdjust(f0.x.acc, (+f0.x.amount || 0) - amt);
      const nd = val('deDate') || f0.x.date; Object.assign(f0.x, { amount: amt, name: val('deName').trim() || T('Harcama'), cat: sh.cat || null, date: nd });
      if (sh.oneOff != null) { if (sh.oneOff) f0.x.oneOff = true; else delete f0.x.oneOff; }
      const nw = idOf(mondayOf(parseKey(nd))); if (nw !== f0.week) { f0.w.daily.splice(f0.i, 1); weekObj(nw).daily.push(f0.x); }
      save(); closeOverlay(); render(); return;
    }
    case 'saForm': {
      const amt = pnum('saAmt'), d0 = val('saDate') || k; if (!amt || amt <= 0) { $('saAmt').focus(); return; }
      D.money.setAsides.push({ id: uid(), d: d0, amount: amt, q: U.taxQ }); after(); return;
    }
    case 'holdForm': {
      const sym = val('hdSym').trim().toUpperCase().replace(/\.AX$/, ''), units = dnum('hdUnits'), avg = dnum('hdAvg'), price = dnum('hdPrice');
      if (!sym) { $('hdSym').focus(); return; } if (!units || units <= 0) { $('hdUnits').focus(); return; }
      const sh = U.sheet, base = { symbol: sym, market: sh.market, units, avgCost: avg || 0, currency: sh.currency };
      let h = sh.id ? IV().holdings.find((x) => x.id === sh.id) : null;
      if (h) Object.assign(h, base); else { h = Object.assign({ id: uid() }, base); IV().holdings.push(h); }
      if (price && price > 0) { if (price !== h.manualPrice) h.manualAt = k; h.manualPrice = price; } else { delete h.manualPrice; delete h.manualAt; }
      save(); closeOverlay(); render(); if (sh.market === 'US') refreshPrices(true); return;
    }
  }
  if (f.dataset.g) { const g = G().goals.find((x) => x.id === f.dataset.g), v = (f.querySelector('input').value || '').trim(); if (g && v) { g.steps.push({ id: uid(), text: v, done: false }); after(); const n = $('st-' + g.id); if (n) n.focus(); } }
});


// ===================== swipe navigation =====================
// Horizontal swipe (|dx| >= 60 and |dx| > 1.5|dy|) switches bottom tabs; on the week header/hero it changes week,
// on the Vergi quarter header changes quarter, on a sub-tab bar switches sub-tab. Never on inputs, spending rows,
// horizontally scrollable elements or overlays.
const TAB_ORDER = ['bugun', 'para', 'gelisim', 'saglik', 'yatirim'];
const SEGS = { paraSeg: ['hafta', 'rapor', 'gecmis', 'kumbara', 'vergi'], gelSeg: ['aliskanlik', 'gorev', 'hedef', 'kitap', 'gunluk'] };
let nav = null, navSuppressUntil = 0;
function hScrollable(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 2) return true;
  }
  return false;
}
document.addEventListener('pointerdown', (e) => {
  nav = null;
  if (e.button > 0 || U.sheet || U.page || edgeZone(e.clientX)) return;
  const t = e.target;
  if (!t.closest || !t.closest('#view') || t.closest('input, textarea, select, [contenteditable], .swipe, .tbl-wrap, .months-scroll') || hScrollable(t)) return;
  nav = { x: e.clientX, y: e.clientY, zone: (t.closest('[data-swipe-zone]') || {}).dataset ? t.closest('[data-swipe-zone]').dataset.swipeZone : 'tab', pid: e.pointerId };
});
document.addEventListener('pointerup', (e) => {
  const n = nav; nav = null; if (!n || e.pointerId !== n.pid) return;
  const dx = e.clientX - n.x, dy = e.clientY - n.y;
  if (Math.abs(dx) < 60 || Math.abs(dx) <= 1.5 * Math.abs(dy)) return;
  const dir = dx < 0 ? 1 : -1; // swipe left → next
  navSuppressUntil = e.timeStamp + 400; // event clock: monotonic, immune to system-time changes
  if (!D.ui.swipeHintSeen) { D.ui.swipeHintSeen = true; save(); }
  if (n.zone === 'week' && U.tab === 'para' && (U.paraSeg === 'hafta' || U.paraSeg === 'rapor')) { const d = fromId(U.cur); d.setDate(d.getDate() + 7 * dir); U.cur = idOf(d); render(dir); return; }
  if (n.zone === 'quarter' && U.tab === 'para' && U.paraSeg === 'vergi') { U.taxQ = qShift(U.taxQ, dir); render(dir); return; }
  if (n.zone === 'paraSeg' || n.zone === 'gelSeg') { const list = SEGS[n.zone].filter((s) => s !== 'vergi' || modOn('uber')), cur = U[n.zone], i = list.indexOf(cur) + dir; if (i >= 0 && i < list.length) { U[n.zone] = list[i]; render(dir); } return; }
  const order = TAB_ORDER.filter(tabOn), i = order.indexOf(U.tab) + dir; if (i < 0 || i >= order.length) return; // hidden module tabs are skipped
  U.tab = order[i]; U.armed = null; try { localStorage.setItem(TAB_KEY, U.tab); } catch (err) {}
  render(dir); window.scrollTo({ top: 0 }); if (U.tab === 'yatirim') refreshPrices(false);
});
document.addEventListener('pointercancel', () => { nav = null; });
// a swipe that ends on a button must not also "tap" it
document.addEventListener('click', (e) => { if (e.timeStamp < navSuppressUntil && e.target.closest && e.target.closest('#view')) { e.stopPropagation(); e.preventDefault(); } }, true);

// remember which collapsible cards (details with an id) the user opened or closed
document.addEventListener('toggle', (e) => { const t = e.target; if (t && t.tagName === 'DETAILS' && t.id) (U.fold = U.fold || {})[t.id] = t.open; }, true);
// a half-swiped row (red "Sil" showing) closes when you tap anywhere else
document.addEventListener('pointerdown', (e) => {
  document.querySelectorAll('.swipe.open').forEach((r) => { if (r.contains(e.target)) return; r.classList.remove('open', 'armed'); const fg = r.querySelector('.swipe-fg'); if (fg) fg.style.transform = ''; });
}, true);
