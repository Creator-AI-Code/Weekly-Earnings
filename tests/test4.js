// Round 4: Supabase sync against an in-memory mock of /auth/v1 and /rest/v1 (two devices, same user).
const { chromium } = require('playwright');
const path = require('path');
const SP = path.resolve(__dirname, 'out');
const URL0 = 'http://localhost:8766/';
const SB = 'https://xauhwvoqfavngiphfueh.supabase.co';
const log = (...a) => console.log(...a);
let fails = 0; const check = (ok, msg) => { if (!ok) fails++; log((ok ? 'PASS ' : 'FAIL ') + msg); };
const txt = (p, s) => p.textContent(s).then((t) => (t || '').replace(/\s+/g, ' ').trim());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- in-memory Supabase ----------
const store = { docs: {}, devices: {}, codes: {}, users: {} }; // docs[uid][doc] = row
const offline = {}; const hits = {};
const userOf = (req) => { const a = req.headers()['authorization'] || ''; const m = /Bearer tok-(\w+)-/.exec(a); return m ? m[1] : null; };
async function mockSupabase(ctx, name, extraLib) {
  hits[name] = 0;
  await ctx.route(/fonts\.|finnhub|frankfurter|cdnjs/, (r) => r.fulfill({ status: 404, body: '' }));
  await ctx.route(/cdn\.jsdelivr\.net/, (r) => (extraLib ? r.fulfill({ status: 200, contentType: 'application/javascript', body: extraLib }) : r.fulfill({ status: 404, body: '' })));
  await ctx.route(SB + '/**', async (route) => {
    hits[name]++;
    if (offline[name]) return route.abort('internetdisconnected');
    const req = route.request(), u = new URL(req.url()), m = req.method(), body = req.postData() ? JSON.parse(req.postData()) : null;
    const json = (status, o) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: o == null ? '' : JSON.stringify(o) });
    if (req.headers()['apikey'] !== 'sb_publishable_zolMrSzkgMnwMcbBaoAhKQ_BFRORcpl') return json(401, { message: 'bad apikey' });
    const sess = (email) => { const id = store.users[email].id; return { access_token: `tok-${id}-${Date.now()}`, refresh_token: 'r-' + id, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id, email } }; };
    if (u.pathname === '/auth/v1/signup') {
      if (store.users[body.email]) return json(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
      if (body.password.length < 8) return json(422, { error_code: 'weak_password', msg: 'Password should be at least 8 characters.' });
      store.users[body.email] = { id: 'u' + Object.keys(store.users).length, pw: body.password };
      if (store.confirm) return json(200, { id: store.users[body.email].id, email: body.email, identities: [{}] });
      return json(200, sess(body.email));
    }
    if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
      const usr = store.users[body.email]; if (!usr || usr.pw !== body.password) return json(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      return json(200, sess(body.email));
    }
    if (u.pathname === '/auth/v1/logout') return json(204, null);
    const uid = userOf(req); if (!uid) return json(401, { message: 'JWT required' });
    if (u.pathname === '/rest/v1/user_docs') {
      const mine = store.docs[uid] || (store.docs[uid] = {});
      if (m === 'GET') return json(200, Object.values(mine).map((r) => ({ doc: r.doc, data: r.data, updated_at: r.updated_at, device_id: r.device_id })));
      if (m === 'POST') { for (const r of body) { if (r.user_id !== uid) return json(403, { message: 'RLS' }); mine[r.doc] = JSON.parse(JSON.stringify(r)); } return json(201, null); }
    }
    if (u.pathname === '/rest/v1/devices') {
      const mine = store.devices[uid] || (store.devices[uid] = {});
      if (m === 'GET') return json(200, Object.values(mine).sort((a, b) => b.last_seen.localeCompare(a.last_seen)));
      if (m === 'POST') { for (const r of body) mine[r.id] = Object.assign({ first_seen: r.last_seen }, mine[r.id], r); return json(201, null); }
      if (m === 'DELETE') { delete mine[u.searchParams.get('id').replace(/^eq\./, '')]; return json(204, null); }
    }
    return json(404, { message: 'not mocked ' + u.pathname });
  });
}
function watch(p, tag, errs) { p.on('pageerror', (e) => errs.push(tag + ': ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(tag + ' console: ' + m.text()); }); }
async function signIn(p, email, mode) {
  if (!(await p.$('#syEmail'))) { await p.click('#gearBtn'); await p.click('[data-act="setSec"][data-v="hesap"]'); }
  await p.fill('#syEmail', email); await p.fill('#syPass', 'wrong-pass-1'); await p.click('#syLogin'); await p.waitForSelector('#syMsg');
  const bad = await txt(p, '#syMsg');
  await p.fill('#syPass', 'Momentum2026'); await p.click(mode === 'signup' ? '#sySignup' : '#syLogin');
  return bad;
}
const closeAll = async (p) => { for (let i = 0; i < 4; i++) { if (!(await p.$('#page, #scrim'))) return; await p.click('[data-act="closeOverlay"] >> nth=0'); await p.waitForTimeout(80); } };
const doc = (uid, d) => (store.docs[uid] || {})[d];

(async () => {
  const browser = await chromium.launch(); const errs = [];
  const mk = async (name, lib) => { const c = await browser.newContext({ viewport: { width: 400, height: 860 }, timezoneId: 'Australia/Brisbane', locale: 'tr-TR', serviceWorkers: 'block' }); await mockSupabase(c, name, lib); const p = await c.newPage(); watch(p, name, errs); await p.goto(URL0); await p.waitForTimeout(200); return { c, p }; };

  // ===== 0. sync disabled: app works, no Supabase traffic =====
  const C = await mk('C');
  await C.p.click('[data-act="sampleHabits"]'); await C.p.waitForTimeout(2600);
  check(hits.C === 0 && (await C.p.isHidden('#syncChip')) && (await C.p.evaluate(() => window.__adim.state.growth.habits.length)) === 6, 'Z sync disabled: app works locally, 0 Supabase requests, no chip');
  await C.c.close();

  // ===== 1. device A: empty → sign in → upload =====
  const A = await mk('A');
  await A.p.click('#gearBtn'); await A.p.click('[data-act="setSec"][data-v="hesap"]');
  await A.p.fill('#syEmail', 'emre@example.com'); await A.p.fill('#syPass', 'kisa'); await A.p.click('#sySignup'); await A.p.waitForSelector('#syMsg');
  check(/en az 8/.test(await txt(A.p, '#syMsg')), 'P short password rejected: ' + (await txt(A.p, '#syMsg')));
  await A.p.click('#syShow'); check((await A.p.getAttribute('#syPass', 'type')) === 'text' && (await A.p.inputValue('#syPass')) === 'kisa', 'P show/hide toggle keeps the typed password');
  store.confirm = true; await A.p.fill('#syPass', 'Onayli2026x'); await A.p.click('#sySignup'); await A.p.waitForTimeout(200);
  check(/e-posta onayı açık/.test(await txt(A.p, '#syMsg')) && (await A.p.isHidden('#syncChip')), 'P signup without session shows the email-confirmation message');
  store.confirm = false; delete store.users['emre@example.com'];
  const bad = await signIn(A.p, 'emre@example.com', 'signup');
  check(/yanlış/.test(bad), 'P wrong password shows "E-posta ya da şifre yanlış."');
  await A.p.waitForFunction(() => document.getElementById('syncChip').textContent.includes('Senkron açık'), null, { timeout: 5000 });
  const uid = store.users['emre@example.com'].id;
  check(['money', 'growth', 'health', 'invest', 'ui'].every((d) => doc(uid, d)) && (await txt(A.p, '#syEmailShown')) === 'emre@example.com', 'A first sign-in uploads all 5 docs; account shows email; chip "Senkron açık"');
  await A.p.waitForSelector('#devList'); log('   A devices: ' + (await txt(A.p, '#devList')));
  check(/bu cihaz/.test(await txt(A.p, '#devList')) && Object.keys(store.devices[uid]).length === 1, 'A device row upserted and listed with "bu cihaz"');
  check(await A.p.evaluate(() => !window.supabase), 'A supabase-js CDN blocked (404): realtime skipped, sync still works');
  await closeAll(A.p); await A.p.click('[data-act="sampleHabits"]'); await A.p.waitForTimeout(2700);
  check(((doc(uid, 'growth') || {}).data.habits || []).length === 6, 'A local change (6 habits) uploaded after 2 s debounce');

  // ===== 2. device B has local data → conflict sheet → use cloud =====
  const B = await mk('B');
  await B.p.click('#tabs [data-tab="gelisim"]'); await B.p.click('[data-act="gelSeg"][data-v="gorev"]'); await B.p.fill('#taskInput', 'B yerel görev'); await B.p.press('#taskInput', 'Enter'); await B.p.waitForTimeout(500);
  await signIn(B.p, 'emre@example.com');
  await B.p.waitForSelector('#cf-local', { timeout: 5000 });
  log('   conflict: ' + (await txt(B.p, '#scrim')));
  check(/daha yeni/.test(await txt(B.p, '#cf-local')) && !/daha yeni/.test(await txt(B.p, '#cf-cloud')) && (await B.p.getAttribute('#cf-local', 'class')).split(' ').indexOf('ghost') < 0, 'B conflict sheet shows both dates; newer side (B\'s later local edit) preselected');
  await B.p.click('#cf-cloud'); await B.p.waitForFunction(() => document.getElementById('syncChip').textContent.includes('Senkron açık'), null, { timeout: 5000 });
  const bState = await B.p.evaluate(() => ({ habits: window.__adim.state.growth.habits.length, tasks: window.__adim.state.growth.tasks.map((t) => t.text) }));
  check(bState.habits === 6 && !bState.tasks.includes('B yerel görev'), 'B "Buluttaki verileri kullan" → B has A\'s habits, local-only task replaced ' + JSON.stringify(bState));
  check(Object.keys(store.devices[uid]).length === 2, 'B registered as second device');

  // ===== 3. change on A appears on B =====
  await A.p.click('#tabs [data-tab="gelisim"]'); await A.p.click('[data-act="gelSeg"][data-v="gorev"]'); await A.p.fill('#taskInput', 'Ortak görev A'); await A.p.press('#taskInput', 'Enter'); await A.p.waitForTimeout(2700);
  await closeAll(B.p); await B.p.click('#gearBtn'); await B.p.click('[data-act="setSec"][data-v="hesap"]'); await B.p.click('#sySync'); await B.p.waitForTimeout(400);
  check(await B.p.evaluate(() => window.__adim.state.growth.tasks.some((t) => t.text === 'Ortak görev A')), 'S change on A (task) appears on B after "Şimdi eşitle"');
  await closeAll(B.p);
  // budget value too, with cents
  await A.p.click('#tabs [data-tab="para"]'); await A.p.click('[data-act="paraSeg"][data-v="hafta"]'); await A.p.fill('#wEarn', '1061,50'); await A.p.press('#wEarn', 'Tab'); await A.p.waitForTimeout(2700);
  await B.p.evaluate(() => window.__adim.sync.syncAll()); await B.p.waitForTimeout(300);
  await B.p.click('#tabs [data-tab="para"]'); await B.p.click('[data-act="paraSeg"][data-v="hafta"]');
  check((await B.p.inputValue('#wEarn')) === '1.061,50', 'S Uber 1.061,50 entered on A shows on B');

  // ===== 4. offline change on B syncs when back online =====
  offline.B = true; await B.c.setOffline(true);
  await B.p.click('#tabs [data-tab="gelisim"]'); await B.p.click('[data-act="gelSeg"][data-v="gorev"]'); await B.p.fill('#taskInput', 'Çevrimdışı görev'); await B.p.press('#taskInput', 'Enter'); await B.p.waitForTimeout(2600);
  const chipOff = await txt(B.p, '#syncChip');
  check(/Çevrimdışı/.test(chipOff) && !((doc(uid, 'growth').data.tasks || []).some((t) => t.text === 'Çevrimdışı görev')), 'O offline: chip "Çevrimdışı", nothing uploaded');
  offline.B = false; await B.c.setOffline(false); await B.p.waitForTimeout(1200);
  check((doc(uid, 'growth').data.tasks || []).some((t) => t.text === 'Çevrimdışı görev') && /Senkron açık/.test(await txt(B.p, '#syncChip')), 'O back online → change uploaded automatically');
  await A.p.evaluate(() => window.__adim.sync.syncAll()); await A.p.waitForTimeout(300);
  check(await A.p.evaluate(() => window.__adim.state.growth.tasks.some((t) => t.text === 'Çevrimdışı görev')), 'O A receives the offline change');

  // ===== 5. realtime path with a stand-in supabase-js (captures the postgres_changes handler) =====
  const fakeLib = 'window.supabase={createClient:function(){var ch={on:function(e,f,cb){window.__rt=cb;window.__rtFilter=f;return ch},subscribe:function(){return ch}};return {realtime:{setAuth:function(t){window.__rtTok=t}},channel:function(){return ch},removeAllChannels:function(){}}}};';
  const R = await mk('R', fakeLib);
  await signIn(R.p, 'emre@example.com'); await R.p.waitForFunction(() => !!window.__rt, null, { timeout: 5000 });
  const filt = await R.p.evaluate(() => window.__rtFilter); log('   realtime subscription: ' + JSON.stringify(filt));
  const row = Object.assign({}, doc(uid, 'growth'), { updated_at: new Date(Date.now() + 1000).toISOString(), device_id: 'other' }); row.data = JSON.parse(JSON.stringify(row.data)); row.data.tasks.push({ id: 'rt1', text: 'Canlı gelen görev', prio: 2, cat: 'is', done: false, created: '2026-10-15' });
  await R.p.evaluate((r) => window.__rt({ new: r }), row); await R.p.waitForTimeout(150);
  check(await R.p.evaluate(() => window.__adim.state.growth.tasks.some((t) => t.text === 'Canlı gelen görev')), 'R realtime postgres_changes event applies a newer remote doc live');
  check(filt && filt.filter === 'user_id=eq.' + uid && filt.table === 'user_docs', 'R realtime filtered to own user_docs');

  // ===== 6. sign out keeps local data =====
  await R.p.click('#syOut'); await R.p.waitForTimeout(200);
  check((await R.p.isHidden('#syncChip')) && (await R.p.evaluate(() => window.__adim.state.growth.habits.length)) === 6 && !!(await R.p.$('#syEmail')), 'X sign out: chip hidden, local data kept, email form shown');
  await R.p.fill('#syEmail', 'emre@example.com'); await R.p.fill('#syPass', 'Baska2026x'); await R.p.click('#sySignup'); await R.p.waitForSelector('#syMsg');
  check(/zaten bir hesap var/.test(await txt(R.p, '#syMsg')), 'P signup with an existing email: ' + (await txt(R.p, '#syMsg')));
  // EN labels
  await R.p.evaluate(() => window.__adim.setLang('en')); await closeAll(R.p);
  await R.p.click('#gearBtn'); log('   EN sections: ' + (await R.p.locator('.setrow b').allTextContents()).join(' | '));
  await R.p.click('[data-act="setSec"][data-v="bildirim"]'); log('   EN notif (web): ' + (await txt(R.p, '#notifWebNote')));
  check((await R.p.evaluate(() => document.documentElement.scrollWidth)) === 400, 'EN notifications page fits 400px');
  await R.p.screenshot({ path: path.join(SP, 'adim-settings-notif-en.png') });

  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await closeAll(A.p); await A.p.click('#gearBtn'); await A.p.click('[data-act="setSec"][data-v="hesap"]'); await A.p.waitForTimeout(300); await A.p.screenshot({ path: path.join(SP, 'adim-settings-hesap-tr.png'), fullPage: true });
  log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close();
})().catch((e) => { console.error('TEST CRASH', e); process.exit(1); });
