// ===================== cloud sync (Supabase) + native notifications =====================
// Local-first: localStorage stays the source of truth; each area (money, growth, health, invest, ui) is one row in
// public.user_docs. Last writer wins per area by updated_at. Auth + REST use plain fetch (no library needed, works
// offline-first); supabase-js is lazily loaded only for realtime push and the app works without it.
const SB_URL = 'https://xauhwvoqfavngiphfueh.supabase.co', SB_KEY = 'sb_publishable_zolMrSzkgMnwMcbBaoAhKQ_BFRORcpl';
const SB_UMD = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
const SYNC_KEY = 'momentum-sync-v1', AREAS = ['money', 'growth', 'health', 'invest', 'ui'];
const isNative = () => { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } };
function autoDeviceName() {
  const ua = navigator.userAgent || '';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Web';
  if (isNative()) return os + ' uygulaması';
  const br = /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Tarayıcı';
  return os + ' · ' + br;
}
const platformName = () => (isNative() ? 'android-app' : /Android/.test(navigator.userAgent) ? 'android-web' : 'web');
function loadSyncMeta() {
  let o = null; try { o = JSON.parse(localStorage.getItem(SYNC_KEY) || 'null'); } catch (e) {}
  o = o && typeof o === 'object' ? o : {};
  if (!o.deviceId) o.deviceId = 'd' + Date.now().toString(36) + uid() + uid();
  if (!o.deviceName) o.deviceName = autoDeviceName();
  if (!isObj(o.updatedAt)) o.updatedAt = {};
  return o;
}
const SY = loadSyncMeta();
function saveSync() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(SY)); } catch (e) {} }
saveSync();

// ---------- per-area change stamping (called after every local save) ----------
function areaData(a) {
  if (a === 'money') { const m = clone(D.money), w = {}; Object.entries(D.money.weeks).forEach(([id, x]) => { if (hasData(x)) w[id] = x; }); m.weeks = w; return m; }
  if (a === 'ui') { const u = clone(D.ui); delete u.notice; return u; }
  return clone(D[a]);
}
const lastSer = {}; let snapped = false;
function snapAreas() { AREAS.forEach((a) => { lastSer[a] = JSON.stringify(areaData(a)); }); snapped = true; }
function stampChanges() {
  if (!snapped) return; let ch = false;
let uiCh = false;
  let moneyCh = false;
  AREAS.forEach((a) => { const s = JSON.stringify(areaData(a)); if (s !== lastSer[a]) { lastSer[a] = s; SY.updatedAt[a] = Date.now(); ch = true; if (a === 'ui') uiCh = true; if (a === 'money') moneyCh = true; } });
  if (ch) { saveSync(); scheduleSync(2000); if ((uiCh || moneyCh) && isNative()) scheduleNotifs(); }
}
function hasContent(a, d) {
  if (!d) return false;
  if (a === 'money') return Object.keys(d.weeks || {}).length > 0 || (d.pots || []).length > 0 || (d.uberExpenses || []).length > 0 || (d.setAsides || []).length > 0 || (d.accounts || []).length > 0;
  if (a === 'growth') return ['habits', 'tasks', 'goals', 'books'].some((k) => (d[k] || []).length) || Object.keys(d.journal || {}).length > 0;
  if (a === 'health') return Object.keys(d.days || {}).length > 0;
  if (a === 'invest') return (d.holdings || []).length > 0 || (d.watchlist || []).length > 0;
  return false;
}
function applyRemote(a, r) {
  const rt = Date.parse(r.updated_at) || Date.now(), before = lastSer[a];
  const n = normalize({ schemaVersion: 1, [a]: r.data || {} });
  if (a === 'ui') n.ui.notice = D.ui.notice;
  D[a] = n[a]; if (a === 'money') S = D.money.settings;
  SY.updatedAt[a] = rt; lastSer[a] = JSON.stringify(areaData(a));
  saveNow(); saveSync();
  if (a === 'ui') { applyLang(); applyTheme(); if (isNative()) scheduleNotifs(); }
  return lastSer[a] !== before;
}

// ---------- tiny Supabase client: GoTrue (email OTP) + PostgREST ----------
async function sbFetch(path, opts, auth) {
  opts = opts || {};
  const h = Object.assign({ apikey: SB_KEY, 'Content-Type': 'application/json' }, opts.headers || {});
  if (auth) { await ensureFresh(); h.Authorization = 'Bearer ' + SY.session.access_token; }
  let r;
  try { r = await fetch(SB_URL + path, { method: opts.method || 'GET', headers: h, body: opts.body != null ? JSON.stringify(opts.body) : undefined, cache: 'no-store' }); }
  catch (e) { const er = new Error('network'); er.network = true; throw er; }
  const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
  if (!r.ok) { const er = new Error((j && (j.msg || j.message || j.error_description || j.error)) || 'HTTP ' + r.status); er.status = r.status; er.code = j && (j.error_code || j.code); throw er; }
  return j;
}
function setSession(j) {
  SY.session = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: { id: j.user.id, email: j.user.email } };
  saveSync(); if (rtClient) try { rtClient.realtime.setAuth(SY.session.access_token); } catch (e) {}
}
async function ensureFresh(force) {
  const s = SY.session; if (!s) { const e = new Error('signed out'); e.status = 401; throw e; }
  if (force || !s.expires_at || s.expires_at * 1000 - Date.now() < 60e3) setSession(await sbFetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token } }, false));
}
async function rest(method, path, body, headers) {
  try { return await sbFetch(path, { method, body, headers }, true); }
  catch (e) { if (e.status === 401 && SY.session) { await ensureFresh(true); return sbFetch(path, { method, body, headers }, true); } throw e; }
}
async function signInPassword(email, password) { setSession(await sbFetch('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } }, false)); return true; }
// returns true when signed in, false when the account needs email confirmation first
async function signUpPassword(email, password) {
  const j = await sbFetch('/auth/v1/signup', { method: 'POST', body: { email, password } }, false);
  if (j && j.access_token) { setSession(j); return true; }
  if (j && Array.isArray(j.identities) && !j.identities.length) { const e = new Error('User already registered'); e.code = 'user_already_exists'; e.status = 422; throw e; }
  return false;
}
function authErrorMsg(e) {
  const c = String(e.code || ''), m = String(e.message || '').toLowerCase();
  if (e.network) return T('Bağlantı kurulamadı. İnternetini kontrol et.');
  if (c === 'invalid_credentials' || /invalid login credentials/.test(m)) return T('E-posta ya da şifre yanlış.');
  if (c === 'user_already_exists' || c === 'email_exists' || /already registered/.test(m)) return T('Bu e-postayla zaten bir hesap var. "Giriş yap"ı kullan.');
  if (c === 'weak_password' || /password should/.test(m)) return T('Şifre çok zayıf. En az 8 karakter kullan; harf ve rakam karıştır.');
  if (c === 'email_not_confirmed' || /not confirmed/.test(m)) return T("E-posta adresin henüz onaylanmamış. Gelen e-postadaki bağlantıya tıkla ya da Supabase'te e-posta onayını kapat.");
  if (e.status === 429 || /rate limit/.test(m)) return T('Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.');
  if (c === 'signup_disabled') return T("Supabase'te yeni hesap açma kapalı.");
  return T('Giriş yapılamadı: {x}', { x: e.message });
}

// ---------- status ----------
U.sync = { state: SY.session ? (navigator.onLine === false ? 'offline' : 'ok') : 'off', msg: '' };
const SYNC_LBL = { ok: 'Senkron açık', syncing: 'Eşitleniyor', offline: 'Çevrimdışı', error: 'Hata', wait: 'Seçim bekleniyor' };
function setSyncState(state, msg) { U.sync = { state, msg: msg || '' }; paintSyncChip(); if (U.page === 'settings' && U.setSec === 'hesap') renderPage(); }
function paintSyncChip() {
  const c = $('syncChip'); if (!c) return; const st = SY.session ? U.sync.state : 'off';
  c.hidden = st === 'off'; document.querySelector('.top').classList.toggle('has-sync', st !== 'off');
  c.className = 'sync-chip st-' + st; const lbl = SYNC_LBL[st] ? T(SYNC_LBL[st]) : '';
  c.querySelector('span').textContent = lbl; c.setAttribute('aria-label', T('Senkron durumu: {x}', { x: lbl }));
}

// ---------- sync loop ----------
let syncing = false, syncAgain = false, syncTimer = null;
function scheduleSync(ms) { if (!SY.session) return; clearTimeout(syncTimer); syncTimer = setTimeout(() => syncAll(), ms == null ? 2000 : ms); }
async function syncAll() {
  if (!SY.session) return;
  if (syncing) { syncAgain = true; return; }
  if (navigator.onLine === false) { setSyncState('offline'); return; }
  syncing = true; setSyncState('syncing');
  try {
    if (saveTimer) saveNow();
    const rows = await rest('GET', '/rest/v1/user_docs?select=doc,data,updated_at,device_id');
    const R = {}; (rows || []).forEach((r) => { R[r.doc] = r; });
    const me = SY.session.user.id; let applied = false;
    if (SY.syncedUser !== me) {
      const remoteHas = AREAS.some((a) => R[a] && hasContent(a, R[a].data)), localHas = AREAS.some((a) => hasContent(a, areaData(a)));
      if (remoteHas && localHas) {
        const choice = await askConflict(R);
        if (!choice) { setSyncState('wait', T('Hangi verilerin kullanılacağını seçmen gerekiyor.')); return; }
        if (choice === 'cloud') AREAS.forEach((a) => { if (R[a] && applyRemote(a, R[a])) applied = true; });
        else { const now = Date.now(); AREAS.forEach((a) => { SY.updatedAt[a] = now; }); }
      } else if (remoteHas) AREAS.forEach((a) => { if (R[a] && applyRemote(a, R[a])) applied = true; });
      SY.syncedUser = me; saveSync();
    }
    const ups = [];
    for (const a of AREAS) {
      const r = R[a], lt = SY.updatedAt[a] || 0, rt = r ? Date.parse(r.updated_at) || 0 : 0;
      if (r && rt > lt) { if (applyRemote(a, r)) applied = true; }
      else if (!r || lt > rt) { const ts = lt || Date.now(); SY.updatedAt[a] = ts; ups.push({ user_id: me, doc: a, data: areaData(a), updated_at: new Date(ts).toISOString(), device_id: SY.deviceId }); }
    }
    if (ups.length) await rest('POST', '/rest/v1/user_docs?on_conflict=user_id,doc', ups, { Prefer: 'resolution=merge-duplicates,return=minimal' });
    await rest('POST', '/rest/v1/devices?on_conflict=id,user_id', [{ id: SY.deviceId, user_id: me, name: SY.deviceName, platform: platformName(), last_seen: new Date().toISOString() }], { Prefer: 'resolution=merge-duplicates,return=minimal' });
    SY.lastSync = Date.now(); saveSync(); setSyncState('ok');
    if (applied) renderAll();
    startRealtime();
  } catch (e) {
    if (e.network) setSyncState('offline');
    else if (e.status === 401 || e.status === 400 && /refresh/i.test(e.message)) { localSignOut(); setSyncState('off'); toast(T('Oturum süresi doldu, yeniden giriş yap.')); }
    else setSyncState('error', T('Senkron hatası: {x}', { x: e.message }));
  } finally {
    syncing = false; if (syncAgain) { syncAgain = false; scheduleSync(300); }
  }
}
let conflictResolve = null;
function askConflict(R) {
  const rts = AREAS.map((a) => (R[a] ? Date.parse(R[a].updated_at) || 0 : 0)), lts = AREAS.map((a) => SY.updatedAt[a] || 0);
  const remote = Math.max(...rts), local = Math.max(...lts);
  return new Promise((res) => { conflictResolve = res; openOverlay('sheet', { kind: 'conflict', local, remote }); });
}
function resolveConflict(choice) { const f = conflictResolve; conflictResolve = null; if (f) f(choice); }

// ---------- realtime (optional, via supabase-js) ----------
let rtClient = null, rtChan = null, rtFailed = false;
async function loadSupabaseLib() {
  if (window.supabase && window.supabase.createClient) return window.supabase;
  if (isNative()) { try { return await loadScript('vendor/supabase.min.js', 'supabase'); } catch (e) {} }
  return loadScript(SB_UMD, 'supabase');
}
async function startRealtime() {
  if (rtChan || rtFailed || !SY.session) return;
  try {
    const lib = await loadSupabaseLib();
    rtClient = rtClient || lib.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    rtClient.realtime.setAuth(SY.session.access_token);
    rtChan = rtClient.channel('docs-' + SY.deviceId).on('postgres_changes', { event: '*', schema: 'public', table: 'user_docs', filter: 'user_id=eq.' + SY.session.user.id }, (p) => {
      const r = p && p.new; if (!r || !r.doc || r.device_id === SY.deviceId || !AREAS.includes(r.doc)) return;
      if ((Date.parse(r.updated_at) || 0) > (SY.updatedAt[r.doc] || 0)) { if (applyRemote(r.doc, r)) renderAll(); SY.lastSync = Date.now(); saveSync(); paintSyncChip(); }
    }).subscribe();
  } catch (e) { rtFailed = true; }
}
function stopRealtime() { try { if (rtClient) rtClient.removeAllChannels(); } catch (e) {} rtChan = null; }
function localSignOut() { stopRealtime(); SY.session = null; saveSync(); U.devices = null; }
async function signOut() {
  try { if (SY.session) await sbFetch('/auth/v1/logout', { method: 'POST' }, true); } catch (e) {}
  localSignOut(); setSyncState('off'); toast(T('Çıkış yapıldı. Bu cihazdaki verilerin duruyor.')); renderPage();
}
async function loadDevices() {
  try { U.devices = await rest('GET', '/rest/v1/devices?select=id,name,platform,last_seen&order=last_seen.desc'); U.devErr = false; }
  catch (e) { U.devErr = true; }
  if (U.page === 'settings' && U.setSec === 'hesap') renderPage();
}
function startSyncLoop() {
  window.addEventListener('online', () => scheduleSync(300));
  window.addEventListener('offline', () => { if (SY.session) setSyncState('offline'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSync(500); });
  setInterval(() => { if (!document.hidden) scheduleSync(0); }, 60000);
  if (SY.session) scheduleSync(300);
}

// ---------- settings section: Hesap ve senkron ----------
const fmtDT = (t) => (t ? new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(t)) : '—');
function vAccount() {
  const s = SY.session, st = U.sync.state;
  if (!s) {
    const A = U.auth || {};
    return `<div class="card stack">${head('cloud', T('Hesap ve senkron'))}
      <p class="note" style="margin:0">${T('Verilerini telefonun ve bilgisayarın arasında eşitlemek için e-posta ve şifreyle giriş yap. İlk kez kullanıyorsan "Hesap oluştur"a dokun.')}</p>
      <div class="field"><label for="syEmail">${T('E-posta')}</label><input class="txt" id="syEmail" type="email" inputmode="email" autocomplete="email" value="${esc(A.email || SY.lastEmail || '')}" placeholder="ad@ornek.com"></div>
      <div class="field"><label for="syPass">${T('Şifre')}</label><div class="row"><input class="txt" id="syPass" type="${A.show ? 'text' : 'password'}" autocomplete="current-password" minlength="8" placeholder="${T('En az 8 karakter')}"><button type="button" class="del" data-act="syShow" id="syShow" aria-pressed="${!!A.show}" aria-label="${A.show ? T('Şifreyi gizle') : T('Şifreyi göster')}">${ico(A.show ? 'eyeoff' : 'eye')}</button></div></div>
      <div class="btns"><button type="button" class="btn" data-act="syLogin" id="syLogin" ${A.busy ? 'disabled' : ''}>${ico('check')}${A.busy === 'login' ? T('Giriş yapılıyor…') : T('Giriş yap')}</button><button type="button" class="btn ghost" data-act="sySignup" id="sySignup" ${A.busy ? 'disabled' : ''}>${A.busy === 'signup' ? T('Hesap oluşturuluyor…') : T('Hesap oluştur')}</button></div>
      ${A.msg ? `<div class="status-msg ${A.err ? 'err' : ''}" id="syMsg">${esc(A.msg)}</div>` : ''}</div>
      <p class="note" style="margin:0 4px">${T('Giriş yapmazsan uygulama sadece bu cihazda çalışmaya devam eder.')}</p>`;
  }
  const devs = U.devices;
  return `<div class="card stack">${head('cloud', T('Hesap ve senkron'), `<span class="chip ${st === 'ok' ? 'gain' : st === 'error' ? 'loss' : st === 'syncing' ? 'acc' : 'warn'}" id="syState">${T(SYNC_LBL[st] || 'Senkron açık')}</span>`)}
      <div class="kv"><div style="grid-column:1/-1"><span>${T('Giriş yapıldı')}</span><b id="syEmailShown" style="overflow-wrap:anywhere">${esc(s.user.email)}</b></div><div style="grid-column:1/-1"><span>${T('Son eşitleme')}</span><b id="syLast">${SY.lastSync ? fmtDT(SY.lastSync) : T('Henüz eşitlenmedi')}</b></div></div>
      ${U.sync.msg ? `<div class="status-msg err">${esc(U.sync.msg)}</div>` : ''}
      <div class="btns"><button type="button" class="btn" data-act="sySync" id="sySync" ${st === 'syncing' ? 'disabled' : ''}>${ico('refresh')}${T('Şimdi eşitle')}</button><button type="button" class="btn ghost" data-act="syOut" id="syOut">${T('Çıkış yap')}</button></div>
      <p class="note" style="margin:0">${T("Veriler bu cihazda kalır ve Supabase'deki hesabına da kaydedilir; sadece sen görebilirsin. Çıkış yapınca bu cihazdaki veriler silinmez.")}</p></div>
    <div class="card stack">${head('phone', T('Cihazlar'))}
      <div class="field"><label for="syDevName">${T('Bu cihazın adı')}</label><input class="txt" id="syDevName" value="${esc(SY.deviceName)}" autocomplete="off"></div>
      ${devs ? `<div class="list" id="devList">${devs.map((d) => `<div class="hold"><span class="sym">${ico(/android/.test(d.platform || '') ? 'phone' : 'layout')}</span><span class="mid"><b>${esc(d.name || '—')} ${d.id === SY.deviceId ? `<span class="chip gain">${T('bu cihaz')}</span>` : ''}</b><span>${T('Son görülme: {t}', { t: fmtDT(Date.parse(d.last_seen)) })}</span></span>${d.id === SY.deviceId ? '' : `<button type="button" class="del ${U.armed === d.id ? 'arm' : ''}" data-act="delDevice" data-id="${esc(d.id)}" aria-label="${T('Cihazı kaldır')}">${U.armed === d.id ? T('Sil?') : ico('x')}</button>`}</div>`).join('')}</div>`
        : `<p class="note" style="margin:0">${U.devErr ? T('Cihaz listesi yüklenemedi.') : T('Yükleniyor…')}</p>`}</div>`;
}
function vConflictSheet(sh) {
  const newer = sh.local >= sh.remote ? 'local' : 'cloud', d = (t) => (t ? fmtDT(t) : T('bilinmiyor'));
  const b = (k, title, t) => `<button type="button" class="btn ${newer === k ? '' : 'ghost'} wide" data-act="conflict" data-v="${k}" id="cf-${k}">${title}<small style="display:block;font-weight:500;opacity:.85">${T('Son değişiklik: {d}', { d: d(t) })}${newer === k ? ' · ' + T('daha yeni') : ''}</small></button>`;
  return sheetShell(T('Hangi veriler kullanılsın?'), `<p style="margin:0">${T('Bu cihazda ve bulutta farklı veriler var. Birini seç; diğer taraf seçtiğinle değiştirilir.')}</p>
    <div class="stack">${b('local', T('Bu cihazdaki verileri kullan'), sh.local)}${b('cloud', T('Buluttaki verileri kullan'), sh.remote)}</div>`, 'a-bug');
}

// ---------- notifications (Android app via Capacitor LocalNotifications) ----------
const NOTIF_DEF = { evening: { on: false, time: '21:00' }, habit: { on: false, time: '07:00' }, weekly: { on: false, time: '19:00' }, bas: { on: false, time: '09:00' }, taxweek: { on: false, time: '19:00' }, car: { on: true, time: '09:00' } };
function notifCfg() { const n = D.ui.notif = Object.assign({}, D.ui.notif); Object.keys(NOTIF_DEF).forEach((k) => { n[k] = Object.assign({}, NOTIF_DEF[k], n[k]); }); return n; }
function lnPlugin() { const C = window.Capacitor; if (!C) return null; return (C.Plugins && C.Plugins.LocalNotifications) || (C.registerPlugin ? C.registerPlugin('LocalNotifications') : null); }
let notifTimer = null;
function scheduleNotifs() { clearTimeout(notifTimer); notifTimer = setTimeout(doScheduleNotifs, 300); }
async function doScheduleNotifs() {
  const LN = isNative() && lnPlugin(); if (!LN) return;
  const N = notifCfg(), hm = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return { hour: h || 0, minute: m || 0 }; };
  try {
    const pend = await LN.getPending(); if (pend && pend.notifications && pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
    const list = [], base = { smallIcon: 'ic_stat_momentum', iconColor: '#E4B552' };
    if (N.evening.on) list.push(Object.assign({ id: 101, title: 'Momentum', body: T('Akşam değerlendirmesi: bugün nasıl geçti?'), schedule: { on: hm(N.evening.time), allowWhileIdle: true } }, base));
    if (N.habit.on) list.push(Object.assign({ id: 102, title: 'Momentum', body: T('Günün alışkanlıklarını işaretlemeyi unutma.'), schedule: { on: hm(N.habit.time), allowWhileIdle: true } }, base));
    if (N.weekly.on) list.push(Object.assign({ id: 103, title: 'Momentum', body: T('Haftalık kontrol: Uber kazancını ve harcamalarını gir.'), schedule: { on: Object.assign({ weekday: 1 }, hm(N.weekly.time)), allowWhileIdle: true } }, base));
    if (N.taxweek.on) { const x = r2(weekTaxOf(thisWeekId())); if (x > 0 && !weekSetAside(thisWeekId())) list.push(Object.assign({ id: 104, title: 'Momentum', body: T('Bu haftanın vergi payı: {x}. Aktardın mı?', { x: usd2(x) }), schedule: { on: Object.assign({ weekday: 1 }, hm(N.taxweek.time)), allowWhileIdle: true } }, base)); }
    if (N.bas.on) {
      let q = qShift(quarterOf(thisWeekId()).key, -1), id = 200; /* previous quarter BAS falls due during the current one */ const t = hm(N.bas.time);
      for (let i = 0; i < 5; i++, q = qShift(q, 1)) {
        const due = qInfo(q).due;
        [14, 3].forEach((before) => { const at = new Date(due.getFullYear(), due.getMonth(), due.getDate() - before, t.hour, t.minute); if (at > new Date()) list.push(Object.assign({ id: id++, title: 'Momentum', body: T('{q} BAS son günü {d}. Vergi için ayırdığın tutarı kontrol et.', { q: qName(q), d: longDate(due) }), schedule: { at, allowWhileIdle: true } }, base)); });
      }
    }
    if (N.car.on) list.push(...renewalNotifs(base, hm));
    if (list.length) await LN.schedule({ notifications: list });
  } catch (e) {}
}
async function enableNotif(k, on) {
  const N = notifCfg();
  if (on && isNative()) {
    const LN = lnPlugin();
    try { const p = await LN.requestPermissions(); if (!p || p.display !== 'granted') { toast(T('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.')); renderPage(); return; } }
    catch (e) { toast(T('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.')); return; }
  }
  N[k].on = on; save(); renderPage(); scheduleNotifs();
}
function vNotifs() {
  const N = notifCfg(), native = isNative();
  const row = (k, label, hint, timeLbl) => `<div class="nrow"><button type="button" class="trow" data-act="notifToggle" data-k="${k}" aria-pressed="${N[k].on}" ${native ? '' : 'disabled'}><span>${label}<small>${hint}</small></span><span class="sw" aria-hidden="true"></span></button>
    ${N[k].on ? `<label class="ntime">${timeLbl}<input class="txt" type="time" data-ntime="${k}" value="${N[k].time}"></label>` : ''}</div>`;
  return `${native ? '' : `<div class="card"><p class="note" style="margin:0" id="notifWebNote">${T('Bildirimler Android uygulamasında çalışır. Uygulamayı GitHub’daki “Sürümler” sayfasından Momentum.apk olarak indirebilirsin.')}</p></div>`}
    <div class="card">${row('evening', T('Akşam değerlendirmesi'), T('Her gün'), T('Saat'))}${row('habit', T('Alışkanlık hatırlatması'), T('Her gün'), T('Saat'))}${row('weekly', T('Haftalık giriş'), T('Her pazar: Uber kazancı ve harcamalar'), T('Saat'))}${row('car', T('Araç hatırlatmaları'), T('Rego, sigorta, BHSL: 30, 7 ve 1 gün önce · 30 Haziran gösterge km'), T('Saat'))}${row('bas', T('BAS hatırlatması'), T('BAS son gününden 14 ve 3 gün önce'), T('Saat'))}${row('taxweek', T('Haftalık vergi payı'), T("Her pazar: bu haftanın vergi payını kumbaraya aktardın mı?"), T('Saat'))}</div>`;
}
