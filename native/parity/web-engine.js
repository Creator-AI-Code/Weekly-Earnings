// Runs the web app's own engine (src/0-*.js … src/8-*.js) in Node and prints this week's numbers as JSON,
// so the Kotlin port (native/.../Calc.kt) can be checked against it. No browser needed: the DOM is a no-op stub.
//
//   node native/parity/web-engine.js <money.json> <YYYY-MM-DDTHH:mm> [--tz Australia/Brisbane]
//
// <money.json> is the money area (what user_docs.data holds for doc = 'money'), or { doc: <money> } as the native app stores it.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

// A fixture file { at, money } carries its own time; then <at> may be left out.
const args = process.argv.slice(2);
const file = args[0];
let money = file && JSON.parse(fs.readFileSync(file, 'utf8'));
let at = args[1];
if (money && money.money && money.at) { at = at || money.at; money = money.money; }
else if (money && money.doc && !money.weeks) money = money.doc;
if (!file || !at) { console.error('usage: node web-engine.js <money.json> <YYYY-MM-DDTHH:mm>'); process.exit(2); }

// a fixed "now" (local time of the process; run with TZ set)
const [d, t] = at.split('T'), [Y, M, D] = d.split('-').map(Number), [h, mi] = (t || '12:00').split(':').map(Number);
const RealDate = Date, FIXED = new RealDate(Y, M - 1, D, h, mi).getTime();
class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIXED); } static now() { return FIXED; } }

// everything the browser would give: a stub that absorbs any property access or call
const stub = () => new Proxy(function () {}, {
  get: (o, k) => (k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : k === Symbol.iterator ? function* () {} : k === 'then' ? undefined : stub()),
  apply: () => stub(), construct: () => stub(), has: () => false, set: () => true,
});
const store = new Map();
const ctx = {
  console, Date: FakeDate, Intl, Math, JSON, Promise, Map, Set, Array, Object, String, Number, Boolean, RegExp, Error, Symbol, parseFloat, parseInt, isFinite, isNaN, encodeURIComponent, decodeURIComponent,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0,
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  addEventListener: () => {}, removeEventListener: () => {}, innerHeight: 800, innerWidth: 400,
  document: stub(), navigator: { userAgent: 'node', onLine: true }, location: { protocol: 'file:', hash: '' }, matchMedia: stub(), fetch: stub(), atob: (s) => s, btoa: (s) => s,
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);

const src = path.join(__dirname, '..', '..', 'src');
const files = fs.readdirSync(src).filter((f) => /^[0-8]-.*\.js$/.test(f)).sort();
const code = files.map((f) => fs.readFileSync(path.join(src, f), 'utf8')).join('\n;\n') + `
;D = normalize({ schemaVersion: 1, money: __MONEY__ }); S = D.money.settings;
(() => {
  const P = weekPlan(), c = P.c, keep = Math.max(0, P.projected - P.potsFromWeek), A = todayAdvice(P);
  const pc = P.target > 0 ? Math.max(0, Math.min(100, Math.round(keep / P.target * 100))) : 100;
  const bas = nextBas();
  return {
    weekId: P.s.id, daysLeft: P.s.daysLeft, perDaySafe: P.s.perDay,
    E: c.E, H: c.H, fuel: c.fuel, fx: c.fx, gst: c.gst, uberTax: c.uberTax, uberNet: c.uberNet, cashNet: c.cashNet, salaryNet: c.salaryNet,
    rec: c.rec, extra: c.extra, income: c.income, left: c.left, weekTax: c.weekTax, daily: c.daily,
    rate: P.rate, planH: P.planH, planNet: P.planNet, potsWeek: P.potsWeek, potsFromWeek: P.potsFromWeek,
    target: P.target, projected: P.projected, room: P.room, perDay: P.perDay, short: P.short, extraH: P.extraH,
    keep, pc, advice: A.t, taxSetAside: !!weekSetAside(P.s.id), basDays: bas ? bas.days : null,
  };
})()`;
const out = vm.runInContext(code.replace('__MONEY__', JSON.stringify(money)), ctx, { filename: 'web-src.js' });
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
