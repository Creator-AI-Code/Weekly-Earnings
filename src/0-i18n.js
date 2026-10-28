// ===================== i18n =====================
// Turkish source strings are the keys (tr dictionary = identity); EN holds the English for every key (see 8-en.js).
// T(key, vars): {name} placeholders; an EN entry may be a function(vars) for plurals.
let LANG = 'tr', LOC = 'tr-TR';
const MISSING = new Set();
function T(s, v) {
  let r = s;
  if (LANG === 'en') { const e = EN[s]; if (e == null) MISSING.add(s); else r = e; }
  if (typeof r === 'function') r = r(v || {});
  if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
  return r;
}
let MONTHS, MONTHS_FULL, DAYS, DAYS_LONG, nf0, nf1, nf2, nf4;
function setLocale(lang) {
  LANG = lang === 'en' ? 'en' : 'tr'; LOC = LANG === 'en' ? 'en-AU' : 'tr-TR';
  const f = (o) => new Intl.DateTimeFormat(LOC, o);
  MONTHS = [...Array(12)].map((_, m) => f({ month: 'short' }).format(new Date(2026, m, 1)).replace('.', ''));
  MONTHS_FULL = [...Array(12)].map((_, m) => f({ month: 'long' }).format(new Date(2026, m, 1)));
  DAYS = [...Array(7)].map((_, d) => f({ weekday: 'short' }).format(new Date(2026, 9, 11 + d)));
  DAYS_LONG = [...Array(7)].map((_, d) => f({ weekday: 'long' }).format(new Date(2026, 9, 11 + d)));
  nf0 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 0 });
  nf1 = new Intl.NumberFormat(LOC, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  nf2 = new Intl.NumberFormat(LOC, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  nf4 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 4 });
  document.documentElement.lang = LANG;
}
setLocale('tr');
// Turkish puts the percent sign first
const pct = (s) => (LANG === 'en' ? s + '%' : '%' + s);
