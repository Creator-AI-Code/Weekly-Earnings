// ===================== core: keys, utils =====================
const KEY = 'adim-adim-v2', OLD_BUDGET_KEY = 'haftalik-butce-v1', OLD_ADIM_KEY = 'adim-adim-v1', TAB_KEY = 'adim-adim-v2:tab';
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

// ---------- defaults (budget, verbatim) ----------
const DEF_SET = { salary: 100000, fixed: 10000, weeksPerYear: 48, cover: false, fuelDefault: 180, cashRate: 30, cashTax: false, recurring: [], jobHours: 38, saveTarget: 0, uberPlan: [] };
let S = JSON.parse(JSON.stringify(DEF_SET)); // budget settings; always === D.money.settings after load

// ---------- tax engine (2026-27 resident) — copied verbatim from Haftalık Bütçe ----------
const BR = [[18200, 0], [45000, 0.15], [135000, 0.30], [190000, 0.37], [Infinity, 0.45]];
function itax(ti) { let t = 0, p = 0; for (const [cap, r] of BR) { if (ti > p) t += (Math.min(ti, cap) - p) * r; p = cap; }
  let l = 0; if (ti <= 37500) l = 700; else if (ti <= 45000) l = 700 - 0.05 * (ti - 37500); else if (ti <= 66667) l = 325 - 0.015 * (ti - 45000);
  return Math.max(0, t - l); }
function mls(ti, c) { if (c || ti <= 105000) return 0; if (ti <= 123000) return 0.01 * ti; if (ti <= 164000) return 0.0125 * ti; return 0.015 * ti; }
const ttax = (ti, c) => itax(ti) + 0.02 * ti + mls(ti, c);
const sum = (arr) => (arr || []).reduce((a, x) => a + (+x.amount || 0), 0);

function weekCalc(w) {
  const N = Math.max(1, S.weeksPerYear);
  const E = +w.uberEarn || 0, H = +w.uberHours || 0;
  const fuel = E > 0 ? (w.fuel == null || w.fuel === '' ? S.fuelDefault : +w.fuel) : 0;
  const fx = E > 0 ? S.fixed / N : 0;
  const go = E / 11, gc = fuel / 11 + fx * 0.8 / 11, gst = go - gc;
  const pa = Math.max(0, ((E - go) - (fuel + fx - gc)) * N);
  const uberTax = (ttax(S.salary + pa, S.cover) - ttax(S.salary, S.cover)) / N;
  const uberNet = E - gst - fuel - fx - uberTax;
  const cashGross = (+w.cashHours || 0) * S.cashRate;
  const cashA = cashGross * N;
  const cashTax = S.cashTax ? (ttax(S.salary + pa + cashA, S.cover) - ttax(S.salary + pa, S.cover)) / N : 0;
  const cashNet = cashGross - cashTax;
  const salaryNet = (S.salary - ttax(S.salary, S.cover)) / 52;
  const rec = sum(S.recurring), extra = sum(w.extras);
  const income = salaryNet + uberNet + cashNet;
  return { E, H, fuel, fx, gst, uberTax, uberNet, netH: H > 0 ? uberNet / H : 0, cashGross, cashTax, cashNet, salaryNet, rec, extra, income, left: income - rec - extra, setAside: gst + uberTax + cashTax };
}

// ---------- dates (budget, verbatim) ----------
// MONTHS / DAYS come from Intl in 0-i18n.js (tr-TR gives the same Oca/Şub/... the budget app used)
const pad = (n) => String(n).padStart(2, '0');
const idOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromId = (id) => { const [y, m, d] = id.split('-').map(Number); return new Date(y, m - 1, d); };
function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }
function weekLabel(id) { const a = fromId(id), b = new Date(a); b.setDate(b.getDate() + 6);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS[a.getMonth()]}` : `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`; }
function quarterOf(id) { const d = fromId(id); const m = d.getMonth(); const fy = m >= 6 ? d.getFullYear() + 1 : d.getFullYear();
  const q = m >= 6 && m <= 8 ? 1 : m >= 9 ? 2 : m <= 2 ? 3 : 4; const names = { 1: 'Tem–Eyl', 2: 'Eki–Ara', 3: 'Oca–Mar', 4: 'Nis–Haz' };
  return { key: fy + '-Q' + q, name: names[q] + ' ' + (q <= 2 ? d.getFullYear() : d.getFullYear()) }; }
function mondaysIn(y, m) { const out = []; const d = new Date(y, m, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); while (d.getMonth() === m) { out.push(idOf(d)); d.setDate(d.getDate() + 7); } return out; }
const keyOf = idOf;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayKey = () => keyOf(new Date());
const parseKey = (k) => new Date(k + 'T12:00:00');
const thisWeekId = () => idOf(mondayOf(new Date()));

// ---------- format (budget, verbatim) ----------
// nf0/nf1/nf2/nf4 are locale-aware (0-i18n.js): TR $1.234, EN $1,234
const usd = (v) => (v < -0.5 ? '−$' : '$') + nf0.format(Math.abs(Math.round(v)));
const usd2 = (v) => (v < 0 ? '−$' : '$') + nf2.format(Math.abs(v));
// One parser for every number field: accepts "11,50", "11.50", "15.9", "1.234,56", "1,234.56", "$1 234". Money is rounded to cents.
function parseNum(v, money) {
  let s = String(v == null ? '' : v).trim().replace(/[\s$€£\u00a0]|AUD|USD/gi, ''); if (!s) return null;
  let neg = /^[-−]/.test(s); s = s.replace(/^[-−]/, '');
  const hasD = s.includes('.'), hasC = s.includes(',');
  if (hasD && hasC) { const dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ','; s = s.split(dec === '.' ? ',' : '.').join('').replace(dec, '.'); }
  else if (hasC) s = /^[1-9]\d{0,2}(,\d{3})+$/.test(s) && !/^\d+,\d{1,2}$/.test(s) ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  else if (hasD && money && /^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^\d*\.?\d*$/.test(s) || s === '.' ) return null;
  let n = parseFloat(s); if (!isFinite(n)) return null; if (neg) n = -n;
  return money ? Math.round(n * 100) / 100 : n;
}
const parse = (v) => { const n = parseNum(v, true); return n == null ? '' : n; };
const cents = (v) => Math.round(Math.abs(+v || 0) * 100) % 100 !== 0;
const fmtIn = (v) => (v === '' || v == null ? '' : cents(v) ? nf2.format(v) : nf0.format(v));
// user-entered amounts keep their cents ($11,50); computed totals use usd() (whole dollars, as in the budget app)
const money = (v) => (cents(v) ? usd2(Math.round(v * 100) / 100) : usd(v));
const r2 = (v) => Math.round((+v || 0) * 100) / 100;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = () => Math.random().toString(36).slice(2, 9);
const num = (v) => parseNum(v, false);
const inNum = (v) => (v == null || v === '' ? '' : String(v).replace('.', LANG === 'en' ? '.' : ','));
const ico = (id, cls) => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const hhmm = (t) => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const dShort = (k) => { const d = parseKey(k); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };

// ===================== state =====================
function blank() {
  return {
    schemaVersion: 1,
    money: { settings: clone(DEF_SET), weeks: {}, pots: [], uberExpenses: [], taxSummaries: {}, setAsides: [], trips: [], odo: [], lb: null, car: {}, renewals: [], accounts: [], uberSums: {} },
    growth: { habits: [], log: {}, tasks: [], goals: [], books: [], bookGoal: 12, readLog: {}, journal: {}, identity: '' },
    health: { days: {}, height: null, goalWeight: null, packPrice: 40, lastImport: null },
    invest: { holdings: [], watchlist: [], prices: {}, fx: null, finnhubKey: '', showOnHome: true, lastRefresh: 0 },
    ui: { theme: 'system', lang: 'tr', hiddenCards: {}, hiddenInsights: {}, hideValues: false, notice: null }
  };
}
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
function applySettings(v) { D.money.settings = Object.assign(clone(DEF_SET), clone(v || {})); if (!Array.isArray(D.money.settings.recurring)) D.money.settings.recurring = []; S = D.money.settings; }
// v1 migration (idempotent, so it effectively runs once): week.fuel → one "Yakıt (Uber)" daily entry on the week's Monday,
// week.extras → tek-seferlik daily entries on Monday. The fields are cleared afterwards, so a second pass changes nothing.
const FUEL_CAT = 'yakit';
function migrateWeek(id, v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(id || ''))) return v;
  const f = v.fuel === '' || v.fuel == null ? null : +v.fuel;
  if (f != null && isFinite(f) && f > 0) { if (!v.daily.some((x) => x.id === 'mig-fuel-' + id)) v.daily.push({ id: 'mig-fuel-' + id, date: id, name: 'Yakıt (Uber)', amount: r2(f), cat: FUEL_CAT, migrated: true }); v.fuel = ''; }
  if (v.extras.length) {
    v.extras.forEach((x, i) => { const a = r2(+x.amount || 0); if (a > 0 && !v.daily.some((d) => d.id === 'mig-x-' + id + '-' + i)) v.daily.push({ id: 'mig-x-' + id + '-' + i, date: id, name: x.name || 'Harcama', amount: a, cat: null, oneOff: true, migrated: true }); });
    v.extras = [];
  }
  return v;
}
function normWeek(w, id) { const v = clone(w || {}); if (!Array.isArray(v.extras)) v.extras = []; if (!Array.isArray(v.daily)) v.daily = []; if (id && /^\d{4}-\d{2}-\d{2}$/.test(id)) v.start = id; return migrateWeek(id || v.start, v); }
// v1.1 migration: fuel logged as an "Uber gideri" moves to the daily list as "Yakıt (Uber)" on its date (one place for fuel).
// Skipped when a daily fuel entry with the same date and amount already exists (the same fill logged twice).
function migrateUexpFuel(m) {
  const keep = [];
  (m.uberExpenses || []).forEach((e) => {
    if (e.cat !== 'fuel' || !/^\d{4}-\d{2}-\d{2}$/.test(String(e.d || ''))) { keep.push(e); return; }
    const wid = idOf(mondayOf(fromId(e.d))), amt = r2(+e.amount || 0);
    if (!m.weeks[wid]) m.weeks[wid] = normWeek({ start: wid, uberEarn: '', uberHours: '', fuel: '', cashHours: '', extras: [], daily: [], note: '' }, wid);
    const w = m.weeks[wid];
    const dup = Object.values(m.weeks).some((x) => (x.daily || []).some((d) => d.cat === FUEL_CAT && d.date === e.d && Math.abs((+d.amount || 0) - amt) < 0.005));
    if (!dup && amt > 0) w.daily.push({ id: 'mig-ue-' + e.id, date: e.d, name: e.note || 'Yakıt (Uber)', amount: amt, cat: FUEL_CAT, migrated: true });
  });
  m.uberExpenses = keep;
}
function normalize(o) {
  const b = blank();
  const D0 = isObj(o) ? o : {};
  const out = b;
  ['money', 'growth', 'health', 'invest', 'ui'].forEach((k) => { if (isObj(D0[k])) out[k] = Object.assign(b[k], D0[k]); });
  const m = out.money; m.settings = Object.assign(clone(DEF_SET), isObj(m.settings) ? m.settings : {}); if (!Array.isArray(m.settings.recurring)) m.settings.recurring = [];
  if (!isObj(m.weeks)) m.weeks = {}; Object.keys(m.weeks).forEach((id) => { m.weeks[id] = normWeek(m.weeks[id], id); });
  ['uberExpenses', 'setAsides', 'trips', 'odo', 'renewals', 'accounts'].forEach((k) => { if (!Array.isArray(m[k])) m[k] = []; }); if (!isObj(m.taxSummaries)) m.taxSummaries = {}; if (!isObj(m.lb)) m.lb = null; if (!isObj(m.car)) m.car = {}; if (!Array.isArray(m.settings.uberPlan)) m.settings.uberPlan = []; if (!isObj(m.uberSums)) m.uberSums = {}; m.accounts.forEach((a) => { if (!Array.isArray(a.log)) a.log = []; });
  migrateUexpFuel(m);
  if (m.settings.logbookPct == null) m.settings.logbookPct = 100;
  // v1.1: car expenses follow the logbook % (bizAuto). Old car expenses saved at 100 % were the logbook default then.
  if (!m.settings.bizAutoMig) { m.uberExpenses.forEach((e) => { const c = UEXP_CATS.find((x) => x[0] === e.cat); if (c && c[2] === 'car' && (e.biz == null || +e.biz === 100)) e.bizAuto = true; }); m.settings.bizAutoMig = true; }
  if (!Array.isArray(m.pots)) m.pots = []; m.pots.forEach((p) => { p.log = Array.isArray(p.log) ? p.log : []; p.saved = +p.saved || 0; p.target = +p.target || 0; p.icon = p.icon || 'jar'; });
  const g = out.growth;
  ['habits', 'tasks', 'goals', 'books'].forEach((k) => { if (!Array.isArray(g[k])) g[k] = []; });
  ['log', 'readLog', 'journal'].forEach((k) => { if (!isObj(g[k])) g[k] = {}; });
  g.habits.forEach((h) => { if (!h.band) h.band = guessBand(h.name); });
  g.tasks.forEach((t) => { if (!t.cat) t.cat = 'kisisel'; if (!t.prio) t.prio = 2; });
  g.goals.forEach((x) => { if (!Array.isArray(x.steps)) x.steps = []; });
  if (g.bookGoal == null) g.bookGoal = 12; if (g.identity == null) g.identity = '';
  const h = out.health; if (!isObj(h.days)) h.days = {}; if (h.packPrice == null) h.packPrice = 40;
  const iv = out.invest; ['holdings', 'watchlist'].forEach((k) => { if (!Array.isArray(iv[k])) iv[k] = []; }); if (!isObj(iv.prices)) iv.prices = {};
  const u = out.ui; if (u.lang !== 'en') u.lang = 'tr'; ['hiddenCards', 'hiddenInsights', 'shownCards'].forEach((k) => { if (!isObj(u[k])) u[k] = {}; });
  out.schemaVersion = 1;
  return out;
}
function guessBand(name) {
  const n = String(name || '').toLocaleLowerCase('tr-TR');
  if (/kalk|sabah|kahvalt|meditasyon|06|07|05|wake|morning|breakfast/.test(n)) return 'sabah';
  if (/iş|çıraklık|teknik|çalış|rapor|ders|standart|work|study|apprentice/.test(n)) return 'is';
  if (/akşam|kitap|oku|harcama|yürüyüş|spor|günlük|uyku|su\b|litre|read|walk|gym|journal|water|evening/.test(n)) return 'aksam';
  return 'sabah';
}

let D = null, firstRun = false, saveTimer = null, storageOk = true;
function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { storageOk = false; }
  if (raw) { try { D = normalize(JSON.parse(raw)); } catch (e) { D = normalize(null); toastLater(T('Kayıt okunamadı, uygulama boş başlatıldı.')); } }
  else {
    firstRun = true; D = normalize(null);
    // automatic migration from the old budget PWA (same origin), keep old key untouched
    try {
      const ob = JSON.parse(localStorage.getItem(OLD_BUDGET_KEY) || 'null');
      if (ob && (ob.settings || ob.weeks)) {
        applySettings(ob.settings);
        Object.entries(ob.weeks || {}).forEach(([id, w]) => { if (/^\d{4}-\d{2}-\d{2}$/.test(id)) D.money.weeks[id] = normWeek(w, id); });
        D.ui.notice = 'Bütçe verilerin taşındı';
      }
    } catch (e) {}
    try {
      const oa = JSON.parse(localStorage.getItem(OLD_ADIM_KEY) || 'null');
      if (oa && Array.isArray(oa.habits) && oa.log) { mergeLegacyAdim(oa); D.ui.notice = D.ui.notice ? 'Bütçe ve Momentum verilerin taşındı' : 'Momentum verilerin taşındı'; }
    } catch (e) {}
    if (D.ui.notice) saveNow();
  }
  S = D.money.settings;
}
function serial() {
  const o = clone(D);
  const weeks = {}; Object.entries(D.money.weeks).forEach(([id, w]) => { if (hasData(w)) weeks[id] = w; });
  o.money.weeks = weeks;
  return JSON.stringify(o);
}
function saveNow(noStamp) {
  clearTimeout(saveTimer); saveTimer = null;
  try { localStorage.setItem(KEY, serial()); storageOk = true; if (!noStamp && typeof stampChanges === 'function') stampChanges(); }
  catch (e) { if (storageOk) toast(T('Kaydedilemedi: telefon hafızası dolu ya da kapalı.')); storageOk = false; }
}
function save() { if (typeof taxCacheReset === 'function') taxCacheReset(); clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); }
window.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) saveNow(); });

// ---------- budget helpers ----------
const hasData = (w) => w && ((+w.uberEarn || 0) > 0 || (+w.uberHours || 0) > 0 || (+w.cashHours || 0) > 0 || (w.extras || []).length > 0 || (w.daily || []).length > 0 || (w.note || '') !== '');
// Spending model (v1): every expense is a daily entry. "Yakıt (Uber)" entries are the week's fuel line (not personal
// spending); the rest is spending, tek-seferlik ones included but kept out of averages/insights. The budget engine
// (weekCalc) is untouched: we only feed it the week's fuel and one lump of spending.
const sumAmt = (arr) => r2((arr || []).reduce((a, x) => a + (+x.amount || 0), 0));
function weekParts(w) {
  const daily = (w && w.daily) || [], fuelE = daily.filter((x) => x.cat === FUEL_CAT), spendE = daily.filter((x) => x.cat !== FUEL_CAT);
  return { fuelE, spendE, fuel: sumAmt(fuelE), spend: sumAmt(spendE), oneOff: sumAmt(spendE.filter((x) => x.oneOff)), extras: sumAmt(w && w.extras) };
}
const dailySum = (w) => { const p = weekParts(w); return r2(p.spend + ((+(w && w.uberEarn) || 0) > 0 ? 0 : p.fuel)); };
function calc(w) {
  w = w || {}; const p = weekParts(w), E = +w.uberEarn || 0;
  const fuelIn = p.fuelE.length ? p.fuel : w.fuel === 0 || w.fuel === '0' ? 0 : '';
  const fuelAsSpend = E > 0 ? 0 : p.fuel; // fuel bought in a week without Uber earnings is plain spending
  const outside = r2(p.spend + p.extras + fuelAsSpend);
  const c = weekCalc(Object.assign({}, w, { fuel: fuelIn, extras: outside ? [{ name: 'spend', amount: outside }] : [] }));
  const N = Math.max(1, S.weeksPerYear), gc = c.fuel / 11 + c.fx * 0.8 / 11, pa = Math.max(0, ((c.E - c.E / 11) - (c.fuel + c.fx - gc)) * N);
  c.incTax = E > 0 ? ((itax(S.salary + pa) + 0.02 * (S.salary + pa)) - (itax(S.salary) + 0.02 * S.salary)) / N : 0;
  c.mlsTax = E > 0 ? (mls(S.salary + pa, S.cover) - mls(S.salary, S.cover)) / N : 0;
  c.fuelEst = E > 0 && fuelIn === ''; c.fuelLogged = p.fuel; c.nFuel = p.fuelE.length;
  c.weekTax = E > 0 ? c.gst + c.uberTax : 0;
  // v1.1: one tax number everywhere. GST and income tax/Medicare/MLS come from ACTUAL logged data (this week's earnings,
  // "Yakıt (Uber)" entries and Uber gideri dated in the week, business-use %), taxed at the quarter's effective rate, so the
  // weekly amounts add up exactly to the quarter/BAS figure. The fuel estimate and the fixed-cost share stay planning costs:
  // they lower "gerçek kâr" and "elinde kalan" but never the tax.
  const tp = E > 0 && w.start && typeof weekTaxParts === 'function' ? weekTaxParts(w.start) : null;
  if (tp) {
    c.gst = tp.gst; c.incTax = tp.inc; c.mlsTax = tp.mls; c.uberTax = tp.inc + tp.mls; c.weekTax = tp.tax;
    c.taxProfit = tp.profit; c.taxQ = tp.key;
    c.uberNet = c.E - c.gst - c.fuel - c.fx - c.uberTax; c.netH = c.H > 0 ? c.uberNet / c.H : 0;
    c.income = c.salaryNet + c.uberNet + c.cashNet; c.left = c.income - c.rec - c.extra; c.setAside = c.weekTax + c.cashTax;
  }
  c.pocket = c.E - c.gst - c.fuel;          // = Bu hafta cebine giren
  c.daily = r2(p.spend + fuelAsSpend); c.oneOff = r2(p.oneOff + p.extras); c.extraOnly = p.extras;
  c.spendAll = r2(c.rec + c.extra);          // recurring + all spending
  c.leftNoOneOff = c.left + c.oneOff;        // for averages / insights
  return c;
}
const weekTaxOf = (id) => calc(getWeek(id)).weekTax;
const weekSetAside = (id) => D.money.setAsides.find((x) => x.week === id) || null;
// Bugün: what is left to spend this week, and per remaining day (today included)
function safeToSpend(now) {
  now = now || new Date(); const id = idOf(mondayOf(now)), c = calc(getWeek(id));
  const daysLeft = 7 - ((now.getDay() + 6) % 7);
  return { id, c, x: c.left, daysLeft, perDay: c.left > 0 ? c.left / daysLeft : 0 };
}
function weekObj(id) { const W = D.money.weeks; if (!W[id]) W[id] = { start: id, uberEarn: '', uberHours: '', fuel: '', cashHours: '', extras: [], daily: [], note: '' }; if (!Array.isArray(W[id].extras)) W[id].extras = []; if (!Array.isArray(W[id].daily)) W[id].daily = []; return W[id]; }
const getWeek = (id) => D.money.weeks[id];
function monthWeeks(y, m) { return mondaysIn(y, m).filter((id) => hasData(getWeek(id))); }
function monthSummary(y, m) { const ids = monthWeeks(y, m); const cs = ids.map((id) => calc(getWeek(id))); return { n: ids.length, left: cs.reduce((a, c) => a + c.left, 0), leftNoOneOff: cs.reduce((a, c) => a + c.leftNoOneOff, 0), income: cs.reduce((a, c) => a + c.income, 0) }; }

// ---------- growth helpers ----------
const G = () => D.growth;
const doneOn = (k) => G().log[k] || [];
const isDone = (h, k) => doneOn(k).includes(h);
function toggleHabit(h, k) { const a = doneOn(k).slice(), i = a.indexOf(h); if (i >= 0) a.splice(i, 1); else a.push(h); if (a.length) G().log[k] = a; else delete G().log[k]; save(); }
function firstLog(hid) { const ks = Object.keys(G().log).filter((k) => G().log[k].includes(hid)).sort(); return ks[0] || null; }
function habitStart(h) { const c = h.created || null, f = firstLog(h.id); if (c && f) return c < f ? c : f; return c || f; }
// habit strength: exponential moving average of daily completion (alpha 0.1) over the last 60 days
function habitStrength(h) {
  const st = habitStart(h); if (!st) return 0;
  const tk = todayKey(); let from = keyOf(addDays(new Date(), -59)); if (st > from) from = st;
  let s = 0;
  for (let d = parseKey(from); keyOf(d) <= tk; d = addDays(d, 1)) { const k = keyOf(d), on = isDone(h.id, k); if (k === tk && !on) break; s += 0.1 * ((on ? 1 : 0) - s); }
  return Math.round(s * 100);
}
function missedYesterday(h) { const st = habitStart(h), y = keyOf(addDays(new Date(), -1)); return !!st && st <= y && !isDone(h.id, y) && !isDone(h.id, todayKey()); }
function dayPct(k) { const hs = G().habits; if (!hs.length) return 0; const ids = new Set(hs.map((h) => h.id)); return Math.round(doneOn(k).filter((x) => ids.has(x)).length / hs.length * 100); }
function xp() {
  let n = 0; const g = G(), ids = new Set(g.habits.map((h) => h.id));
  for (const k in g.log) n += g.log[k].filter((x) => ids.has(x)).length * 10;
  n += g.tasks.filter((t) => t.done).length * 5;
  g.goals.forEach((x) => x.steps.forEach((s) => { if (s.done) n += 25; }));
  g.books.forEach((b) => { if (b.status === 'done') n += 100; });
  for (const k in g.readLog) n += Math.round(g.readLog[k] / 2);
  for (const k in D.health.days) { const d = D.health.days[k]; if (d.cig === 0) n += 15; if (d.alc === 0) n += 5; }
  D.money.pots.forEach((p) => p.log.forEach((l) => { if (l.a > 0) n += Math.min(50, Math.round(l.a / 20)); }));
  return n;
}
function level() { const x = xp(), lv = Math.floor(Math.sqrt(x / 50)) + 1, lo = 50 * (lv - 1) ** 2, hi = 50 * lv ** 2; return { x, lv, p: Math.round((x - lo) / (hi - lo) * 100) }; }

// ---------- health helpers (ported) ----------
const hd = (k) => D.health.days[k] || {};
function setH(k, patch) { const H = D.health.days; H[k] = Object.assign({}, H[k], patch); Object.keys(H[k]).forEach((f) => { if (H[k][f] == null) delete H[k][f]; }); if (!Object.keys(H[k]).length) delete H[k]; save(); }
function latest(field, maxBack = 3) { for (let i = 0; i <= maxBack; i++) { const k = keyOf(addDays(new Date(), -i)); const v = hd(k)[field]; if (v != null) return { v, k, i }; } return null; }
function latestWeight() { const ks = Object.keys(D.health.days).filter((k) => D.health.days[k].weight != null).sort(); return ks.length ? { v: D.health.days[ks[ks.length - 1]].weight, k: ks[ks.length - 1] } : null; }
function bmi() { const w = latestWeight(), h = D.health.height; if (!w || !h) return null; const m = h / 100; return w.v / (m * m); }
function bmiCat(b) { if (b < 18.5) return [T('Zayıf'), 'warn']; if (b < 25) return [T('Normal'), 'gain']; if (b < 30) return [T('Fazla kilolu'), 'warn']; return [T('Obez'), 'loss']; }
function streakOf(test) { let d = new Date(), n = 0; if (!test(keyOf(d))) d = addDays(d, -1); while (test(keyOf(d))) { n++; d = addDays(d, -1); if (n > 2000) break; } return n; }
function healthScore() {
  const k = todayKey(), d = hd(k), parts = [];
  if (d.cig != null) parts.push([T('Sigara'), 25, d.cig === 0 ? 1 : d.cig <= 5 ? 0.4 : 0, d.cig === 0 ? T('yok') : T('{n} adet', { n: d.cig })]);
  if (d.alc != null) parts.push([T('Alkol'), 15, d.alc === 0 ? 1 : d.alc <= 2 ? 0.6 : d.alc <= 4 ? 0.3 : 0, d.alc === 0 ? T('yok') : T('{n} içki', { n: d.alc })]);
  const st = latest('steps', 1); if (st) parts.push([T('Adım'), 20, Math.min(1, st.v / 8000), nf0.format(st.v)]);
  const sl = latest('sleep', 1); if (sl) { const h = sl.v / 60; parts.push([T('Uyku'), 20, h >= 7 && h <= 9 ? 1 : h >= 6 ? 0.6 : h >= 5 ? 0.3 : 0, T('{n} sa', { n: nf1.format(h) })]); }
  const sr = latest('stress', 2); if (sr) parts.push([T('Stres'), 10, sr.v <= 30 ? 1 : sr.v <= 50 ? 0.7 : sr.v <= 70 ? 0.4 : 0.1, Math.round(sr.v)]);
  const b = bmi(); if (b) parts.push(['BMI', 10, b >= 18.5 && b < 25 ? 1 : b < 30 ? 0.6 : 0.3, nf1.format(b)]);
  if (!parts.length) return null;
  const W = parts.reduce((s, p) => s + p[1], 0), V = parts.reduce((s, p) => s + p[1] * p[2], 0);
  return { score: Math.round(V / W * 100), parts };
}
function weekSum(field, ws) { let s = 0, n = 0; const st = ws || mondayOf(new Date()); for (let i = 0; i < 7; i++) { const d = addDays(st, i); if (keyOf(d) > todayKey()) break; const v = hd(keyOf(d))[field]; if (v != null) { s += v; n++; } } return { s, n }; }
const cigPrice = () => (+D.health.packPrice || 40) / 20;

// ---------- toast ----------
let toastT = null, pendingToast = null;
function toast(msg) { const t = $('toast'); if (!t) { pendingToast = msg; return; } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
function toastLater(m) { pendingToast = m; }

// ---------- lazy script loader ----------
const scriptCache = {};
function loadScript(url, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  if (scriptCache[url]) return scriptCache[url];
  scriptCache[url] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = url; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => (window[globalName] ? res(window[globalName]) : rej(new Error('missing')));
    s.onerror = () => { delete scriptCache[url]; s.remove(); rej(new Error('load')); };
    document.head.appendChild(s);
  });
  return scriptCache[url];
}

// ---------- CSV parsing (ported, delimiter aware) ----------
function parseCSV(text, delim) {
  delim = delim || ',';
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
function sniffDelim(text) { const line = text.split(/\r?\n/).find((l) => l.trim()) || ''; const c = (line.match(/,/g) || []).length, s = (line.match(/;/g) || []).length, t = (line.match(/\t/g) || []).length; return t > c && t > s ? '\t' : s > c ? ';' : ','; }
