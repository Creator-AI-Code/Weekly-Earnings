// ===================== init =====================
load();
snapAreas();
applyLang();
applyTheme();
if (window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) {}
render();
if (pendingToast) { toast(pendingToast); pendingToast = null; }
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !isNative()) navigator.serviceWorker.register('sw.js').catch(() => {});
setTimeout(() => { if (IV().holdings.length || IV().watchlist.length) refreshPrices(false); }, 600);
let lastDay = todayKey();
const dayCheck = () => { if (todayKey() !== lastDay) { lastDay = todayKey(); render(); } };
document.addEventListener('visibilitychange', () => { if (!document.hidden) { dayCheck(); if (U.tab === 'yatirim') refreshPrices(false); } });
setInterval(dayCheck, 60000);
startSyncLoop();
// on-screen keyboard: keep the field you type in visible above it. If the WebView does not shrink (Android edge-to-edge),
// --kb lifts sheets and pads the page by the keyboard height; tabs and the + button hide while typing.
(() => {
  const root = document.documentElement; let base = window.innerHeight, viaPlugin = false;
  const isField = (el) => el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !/^(checkbox|radio|button|submit|file)$/.test(el.type || '');
  const keep = () => { const el = document.activeElement; if (!isField(el)) return; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  const set = (h) => { h = Math.max(0, Math.round(h)); root.style.setProperty('--kb', h + 'px'); root.classList.toggle('kb-open', h > 80 || (isField(document.activeElement) && window.innerHeight < base - 120)); setTimeout(keep, 80); };
  window.addEventListener('resize', () => { if (!isField(document.activeElement)) base = Math.max(base, window.innerHeight); if (!viaPlugin) set(window.visualViewport ? window.innerHeight - visualViewport.height - visualViewport.offsetTop : 0); });
  if (window.visualViewport) visualViewport.addEventListener('resize', () => { if (!viaPlugin) set(window.innerHeight - visualViewport.height - visualViewport.offsetTop); });
  const K = isNative() && capPlugin('Keyboard');
  if (K && K.addListener) {
    K.addListener('keyboardDidShow', (i) => { viaPlugin = true; const h = +(i && i.keyboardHeight) || 0; set(window.innerHeight < base - 80 ? 0 : h); root.classList.add('kb-open'); });
    K.addListener('keyboardDidHide', () => { viaPlugin = false; set(0); root.classList.remove('kb-open'); });
  }
  document.addEventListener('focusin', (e) => { if (isField(e.target)) setTimeout(keep, 320); });
  document.addEventListener('focusout', () => setTimeout(() => { if (!isField(document.activeElement)) root.classList.remove('kb-open'); }, 120));
})();
// sticky segment row sits exactly under the header, whatever its real height (status bar, sync chip, font size)
(() => { const h = document.querySelector('header.top'); if (!h) return; const set = () => document.documentElement.style.setProperty('--hdr-h', Math.round(h.getBoundingClientRect().height) + 'px'); set(); if (window.ResizeObserver) new ResizeObserver(set).observe(h); window.addEventListener('resize', set); })();
setTimeout(() => rcFlush(), 4000); window.addEventListener('online', () => rcFlush());
if (isNative()) scheduleNotifs();
window.__adim = { get state() { return D; }, parseReceipt, parseUberSummary, importUberText, weekCalc: (w) => weekCalc(w), insights, saveNow, taxFull, taxQuarter, quarterOf, weekTaxParts, ttax, missing: MISSING, parse, num, calc, sync: { get meta() { return SY; }, syncAll, areaData }, setLang: (l) => { D.ui.lang = l; applyLang(); renderAll(); } };
