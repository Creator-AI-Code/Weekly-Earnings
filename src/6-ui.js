// ===================== pages: settings, insights =====================
function pageShell(title, body) {
  return `<div class="page" role="dialog" aria-modal="true" aria-label="${esc(title)}" id="page"><div class="wrap"><header class="top"><div class="brand"><button type="button" class="iconbtn flat" data-act="closeOverlay" aria-label="${T('Geri')}">${ico('left')}</button><h1>${esc(title)}</h1></div></header><main>${body}</main></div></div>`;
}
const SET_SECS = [['genel', 'Genel', 'gear', 'a-bug'], ['hesap', 'Hesap ve senkron', 'cloud', 'a-bug'], ['bildirim', 'Bildirimler', 'bell', 'a-bug'], ['para', 'Para', 'wallet', 'a-para'], ['vergi', 'Vergi', 'jar', 'a-para'], ['gelisim', 'Gelişim', 'sprout', 'a-gel'], ['saglik', 'Sağlık', 'heart', 'a-sag'], ['yatirim', 'Yatırım', 'trend', 'a-yat'], ['yedek', 'Yedek', 'backup', 'a-bug']];
const TAB_SEC = { bugun: 'genel', para: 'para', gelisim: 'gelisim', saglik: 'saglik', yatirim: 'yatirim' };
function setShell(sec, body) {
  const S0 = SET_SECS.find((x) => x[0] === sec);
  const title = sec ? T(S0[1]) : T('Ayarlar');
  return `<div class="page" role="dialog" aria-modal="true" aria-label="${esc(sec ? T('Ayarlar') + ' / ' + title : title)}" id="page"><div class="wrap"><header class="top"><div class="brand">
    <button type="button" class="iconbtn flat" data-act="closeOverlay" id="setBack" aria-label="${sec ? T('Ayarlara dön') : T('Geri')}">${ico('left')}</button>
    <div class="crumb">${sec ? `<small>${T('Ayarlar')} ›</small>` : ''}<h1 id="setTitle">${esc(title)}</h1></div></div></header><main class="${sec ? S0[3] : ''}">${body}</main></div></div>`;
}
function setSummary(sec) {
  if (sec === 'genel') return (LANG === 'en' ? 'English' : 'Türkçe') + ' · ' + T({ system: 'Sistem', light: 'Açık', dark: 'Koyu' }[D.ui.theme] || 'Sistem');
  if (sec === 'para') return T('Maaş {x}', { x: usd(S.salary) }) + ' · ' + T('{n} tekrarlayan gider', { n: S.recurring.length });
  if (sec === 'vergi') return T('Logbook {p} · BAS çeyreklik', { p: pct(nf0.format(logbook())) });
  if (sec === 'gelisim') return T('{n} alışkanlık', { n: G().habits.length }) + ' · ' + T('{n} kitap hedefi', { n: G().bookGoal });
  if (sec === 'saglik') return [D.health.height ? D.health.height + ' cm' : '', T('paket {x}', { x: money(+D.health.packPrice || 40) }), 'Samsung Health'].filter(Boolean).join(' · ');
  if (sec === 'yatirim') return IV().finnhubKey ? T('Finnhub anahtarı girildi') : T('Finnhub anahtarı yok');
  if (sec === 'yedek') return T('Dışa ve içe aktar');
  if (sec === 'hesap') return SY.session ? SY.session.user.email + ' · ' + T(SYNC_LBL[U.sync.state] || 'Senkron açık') : T('Giriş yapılmadı');
  if (sec === 'bildirim') return isNative() ? T('{n} hatırlatma açık', { n: Object.values(notifCfg()).filter((x) => x.on).length }) : T('Android uygulamasında');
  return '';
}
function vSettings() {
  const sec = U.setSec;
  if (!sec) return setShell(null, `<div class="card setlist">${SET_SECS.map(([k, l, ic, a]) => `<button type="button" class="setrow ${a}" data-act="setSec" data-v="${k}"><span class="ico">${ico(ic)}</span><span class="st"><b>${T(l)}</b><small>${esc(setSummary(k))}</small></span>${ico('right')}</button>`).join('')}</div>
    <p class="note" style="text-align:center">${T('Momentum · Veriler sadece bu telefonda, tarayıcı hafızasında tutulur. Düzenli olarak yedek al.')}</p>`);
  const rec = S.recurring, iv = IV(), H = D.health;
  const mny = (id, key, v, unit, pre) => `<div class="money">${pre === false ? '' : '<span>$</span>'}<input id="${id}" ${key} inputmode="decimal" value="${v}">${unit ? `<span>${unit}</span>` : ''}</div>`;
  const segB = (act, opts, curv, lbl) => `<div class="seg inline" role="group" aria-label="${lbl}">${opts.map(([v, l, id]) => `<button type="button" data-act="${act}" data-v="${v}"${id ? ` id="${id}"` : ''} aria-pressed="${String(curv) === String(v)}">${l}</button>`).join('')}</div>`;
  const hidCount = Object.keys(D.ui.hiddenInsights).filter((k) => D.ui.hiddenInsights[k]).length;
  const body = {
    genel: () => `<div class="card a-bug">${head('globe', T('Dil'))}<div class="seg" role="group" aria-label="${T('Dil')}"><button type="button" data-act="setLang" data-v="tr" id="lang-tr" aria-pressed="${LANG === 'tr'}" lang="tr">Türkçe</button><button type="button" data-act="setLang" data-v="en" id="lang-en" aria-pressed="${LANG === 'en'}" lang="en">English</button></div></div>
      <div class="card a-bug">${head('palette', T('Tema'))}<div class="seg" role="group" aria-label="${T('Tema')}">${[['system', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu']].map(([v, l]) => `<button type="button" data-act="setTheme" data-v="${v}" id="theme-${v}" aria-pressed="${D.ui.theme === v}">${T(l)}</button>`).join('')}</div></div>
      <div class="card a-bug">${head('layout', T('Bugün kartları'))}${BUGUN_CARDS.map(([k, l]) => `<button type="button" class="trow" data-act="toggleCard" data-k="${k}" aria-pressed="${showCard(k)}"><span>${T(l)}</span><span class="sw" aria-hidden="true"></span></button>`).join('')}
        ${hidCount ? `<button type="button" class="link" data-act="restoreInsights" style="margin-top:6px">${T('Gizlenen {n} içgörüyü geri getir', { n: hidCount })}</button>` : ''}</div>`,
    para: () => `${planSettings()}<div class="card">${head('percent', T('Gelir ve vergi'))}<div class="fields">
      <div class="field"><label for="sSalary">${T('Maaş (brüt, yıllık)')}</label>${mny('sSalary', 'data-set="salary"', fmtIn(S.salary))}</div>
      <div class="field"><label for="sJobHours">${T('Maaşlı işte haftalık saat')}</label>${mny('sJobHours', 'data-set="jobHours"', fmtIn(S.jobHours), T('sa'), false)}</div>
      <div class="field"><label for="sCashRate">${T('Nakit iş saat ücreti')}</label>${mny('sCashRate', 'data-set="cashRate"', fmtIn(S.cashRate))}</div>
      <div class="field inline"><span class="lab">${T('Nakit iş vergisi')}</span>${segB('setCashTax', [['false', T('Vergisiz')], ['true', T('Vergili')]], !!S.cashTax, T('Nakit iş vergisi'))}</div>
      <div class="field inline"><span class="lab">${T('Özel hastane sigortası')}</span>${segB('setCover', [['false', T('Yok')], ['true', T('Var')]], !!S.cover, T('Özel hastane sigortası'))}</div></div></div>
    <div class="card">${head('car', T('Uber masrafları'))}<div class="fields">
      <div class="field"><label for="sFixed">${T('Sabit masraflar (yıllık)')}</label>${mny('sFixed', 'data-set="fixed"', fmtIn(S.fixed))}<span class="hint">${T('Sigorta, servis, rego/CTP, BHSL, telefon. Yakıt hariç, sadece Uber payı.')}</span>${renewalYear().total > 0 ? `<button type="button" class="link" data-act="useRenFixed" id="useRenFixed">${T('Aracım’daki yenilemelerden al: yıllık {x} (Uber payı {p})', { x: usd(renewalYear().total), p: pct(nf0.format(logbook())) })}</button>` : ''}</div>
      <div class="field"><label for="sWeeks">${T('Yılda kaç hafta Uber')}</label>${mny('sWeeks', 'data-set="weeksPerYear"', fmtIn(S.weeksPerYear), T('hf'), false)}</div>
      <div class="field"><label for="sFuel">${T('Haftalık yakıt tahmini')}</label>${mny('sFuel', 'data-set="fuelDefault"', fmtIn(S.fuelDefault))}<span class="hint">${T('Bir haftada “Yakıt (Uber)” harcaması yoksa bu tahmin kullanılır')}</span></div></div></div>
    <div class="card">${head('repeat', T('Her hafta tekrarlayan giderler'))}<div class="list" id="recList">${rec.length ? rec.map((x, i) => `<div class="row"><input class="txt" id="rcN${i}" data-rc="name" data-i="${i}" value="${esc(x.name)}" aria-label="${T('Gider adı')}"><div class="money"><span>$</span><input id="rcV${i}" data-rc="amount" data-i="${i}" inputmode="decimal" value="${fmtIn(x.amount)}" aria-label="${T('Tutar')}"></div><button type="button" class="del" data-act="delRec" data-i="${i}" aria-label="${T('Sil')}">${ico('x')}</button></div>`).join('') : `<p class="empty-txt">${T('Henüz gider yok.')}</p>`}</div>
      <button type="button" class="add" id="recAdd" data-act="addRec">${ico('plus')}${T('Gider ekle')}</button><p class="note">${T("Aylık bir gideri haftalığa çevirmek için 4,33'e böl.")}</p></div>
    <div class="card"><p class="note" style="margin:0">${T("Hesap 2026–27 vergi oranlarına ve %2 Medicare'e göre yapılır. Uber kârı ve vergili nakit iş maaşının üstüne eklenir. MLS eşikleri $105k / $123k / $164k. GST kazancın 1/11'idir; yakıtın ve sabit masrafların %80'i için GST kredisi düşülür. Bu bir tahmindir, vergi danışmanlığı değildir.")}</p></div>`,
    vergi: () => `<div class="card stack">${head('car', T('Logbook'))}<div class="field"><label for="sLogbook">${T('Logbook iş kullanım yüzdesi')}</label>${mny('sLogbook', 'data-set="logbookPct"', fmtIn(logbook()), '%', false)}<span class="hint">${T('Araç giderlerinin iş payı. Logbook bitince otomatik güncellenir (Para → Vergi → Araç logbook).')}</span></div></div>
      <div class="card">${head('receipt', T('Kategori varsayılanları'))}<div class="list">${UEXP_CATS.map(([k, l]) => { const d = catDefaults(k); return `<div class="catrow"><span class="cn">${T(l)}</span><div class="seg inline" role="group" aria-label="${esc(T('{x}: GST', { x: T(l) }))}"><button type="button" data-act="catGst" data-k="${k}" data-v="true" aria-pressed="${d.gst}">GST</button><button type="button" data-act="catGst" data-k="${k}" data-v="false" aria-pressed="${!d.gst}">${T('Yok')}</button></div><div class="money" style="width:84px;min-height:44px"><input data-catbiz="${k}" inputmode="decimal" value="${fmtIn(d.biz)}" aria-label="${esc(T('{x}: iş payı', { x: T(l) }))}"><span>%</span></div></div>`; }).join('')}</div>
        <p class="note">${T('Yeni Uber giderlerinde bu GST ve iş payı değerleri önceden seçili gelir. Araç kategorileri logbook yüzdesini kullanır, değiştirmediğin sürece.')}</p></div>
      <div class="card stack">${head('jar', T('Uber vergisi'))}<div class="kv"><div><span>${T('Maaş')}</span><b>${usd(S.salary)}</b></div><div><span>${T('Hastane sigortası')}</span><b>${S.cover ? T('Var') : T('Yok')}</b></div><div><span>Logbook</span><b>${pct(nf0.format(logbook()))}</b></div></div>
      <p class="note" style="margin:0">${T('Vergi sekmesi maaşını ve hastane sigortanı Para ayarlarından alır. BAS çeyreklik verilir: 28 Ekim, 28 Şubat, 28 Nisan ve 28 Temmuz.')}</p>
      <button type="button" class="btn soft" data-act="setSec" data-v="para">${ico('wallet')}${T('Para ayarlarını aç')}</button></div>
      <div class="card"><p class="note" style="margin:0">${T('Gelir vergisi payı: mali yılın bu çeyreğe kadarki Uber kârı yıllığa çevrilir, maaşının üstüne eklenince çıkan ek vergi (Medicare %2 ve MLS dahil) oranıyla bu çeyreğin kârı çarpılır.')} ${T("Tahmindir; kesin rakamlar için Uber'in vergi özetini kullan.")}</p></div>`,
    gelisim: () => `<div class="card stack">${head('book', T('Okuma'))}<div class="field"><label for="sBookGoal">${T('Yıllık kitap hedefi')}</label><div class="money" style="max-width:180px"><input id="sBookGoal" data-bookgoal inputmode="numeric" value="${G().bookGoal}"><span>${T('kitap')}</span></div></div></div>
      <div class="card stack">${head('sprout', T('Alışkanlıklar'))}<p class="note" style="margin:0">${T('{n} alışkanlık', { n: G().habits.length })}</p><div class="btns"><button type="button" class="btn soft" data-act="openHabitSheet">${ico('pen')}${T('Alışkanlıkları düzenle')}</button><button type="button" class="btn soft" data-act="sampleHabits">${ico('plus')}${T('Örnek alışkanlıklar ekle')}</button></div></div>`,
    saglik: () => `<div class="card"><div class="fields">
      <div class="field"><label for="sHeight">${T('Boy')}</label><div class="money"><input id="sHeight" data-hs="height" inputmode="decimal" value="${H.height || ''}" placeholder="${T('ör. 178')}"><span>cm</span></div></div>
      <div class="field"><label for="sGoalW">${T('Hedef kilo')}</label><div class="money"><input id="sGoalW" data-hs="goalWeight" inputmode="decimal" value="${inNum(H.goalWeight)}" placeholder="${T('ör. 75')}"><span>kg</span></div></div>
      <div class="field"><label for="sPack">${T("Paket fiyatı (20'lik)")}</label><div class="money"><span>$</span><input id="sPack" data-hs="packPrice" inputmode="decimal" value="${fmtIn(H.packPrice)}"></div><span class="hint">${T('Haftalık sigara maliyeti bununla hesaplanır')}</span></div></div></div>
      ${samsungCard()}`,
    yatirim: () => `<div class="card stack"><div class="field"><label for="sKey">${T('Finnhub API anahtarı')}</label><input class="txt" id="sKey" data-ivkey value="${esc(iv.finnhubKey)}" placeholder="${T('ör. c1a2b3…')}" autocomplete="off" autocapitalize="off" spellcheck="false">
      <span class="hint">${T("ABD hisse fiyatları için ücretsiz anahtar: finnhub.io/register adresinden kayıt ol ve paneldeki API anahtarını buraya yapıştır. Anahtar sadece bu telefonda saklanır ve yedeğe eklenir. Stake şifresi ya da oturum anahtarı hiçbir zaman istenmez.")}</span></div>
      <button type="button" class="trow" data-act="toggleHome" aria-pressed="${!!iv.showOnHome}"><span>${T('Portföyü Bugün ekranında göster')}</span><span class="sw" aria-hidden="true"></span></button></div>`,
    hesap: vAccount,
    bildirim: vNotifs,
    yedek: () => `<div class="card stack"><div class="btns"><button type="button" class="btn" data-act="export" id="bkDown">${ico('backup')}${T('Yedek indir')}</button><label class="btn ghost filebtn">${ico('upload')}${T('Yedekten yükle')}<input type="file" id="bkFile" accept=".json,application/json" aria-label="${T('Yedek dosyası seç')}"></label></div>
      ${U.bk ? `<div class="confirm" id="bkConfirm"><b>${esc(U.bk.sum.title)}</b><span>${U.bk.sum.lines.map(esc).join(' · ')}</span><span class="note" style="margin:0">${esc(U.bk.sum.note)}</span><div class="btns"><button type="button" class="btn" data-act="bkYes" id="bkYes">${T('Evet, birleştir')}</button><button type="button" class="btn ghost" data-act="bkNo">${T('Vazgeç')}</button></div></div>` : ''}
      <p class="note" id="bkMsg" style="margin:0">${esc(U.bkMsg || (isNative() ? T('Yedek al, paylaşım menüsünü açar: dosyayı Drive, Dosyalar veya e-postaya kaydet. Geri yüklerken o dosyayı seç.') : '') || T('Yedek, İndirilenler klasörüne adim-adim-yedek-TARİH.json adıyla iner. İçe aktarma üç biçimi tanır: bu uygulamanın yedeği, eski Haftalık Bütçe yedeği ve eski Momentum verisi. Önce bir özet gösterilir; onaylarsan veriler birleştirilir.'))}</p></div>`
  }[sec];
  return setShell(sec, body ? body() : '');
}
function vInsights() {
  const all = insights();
  return pageShell(T('İçgörüler'), `<p class="note" style="margin:0 2px">${T('Girdiğin kayıtlardan çıkan kısa notlar. İlişki türündeki içgörüler en az 14 eşleşen gün olunca görünür ve neden-sonuç anlamına gelmez.')}</p>
    ${all.length ? all.map((x) => { const hid = !!D.ui.hiddenInsights[x.id]; return `<article class="card a-${x.area}" style="${hid ? 'opacity:.6' : ''}"><div class="insight"><span class="ico${x.corr ? '' : ' gold'}">${ico(x.corr ? 'chart' : 'spark')}</span><p>${esc(x.text)}</p></div><div class="insight-actions"><span class="chip">${T({ para: 'Para', gel: 'Gelişim', sag: 'Sağlık' }[x.area] || 'Para')}</span><button type="button" class="link" data-act="${hid ? 'showInsight' : 'hideInsight'}" data-id="${x.id}">${hid ? T('Göster') : T('Gizle')}</button></div></article>`; }).join('')
      : `<div class="card">${empty('journal', T('Henüz içgörü yok'), T('Bütçe, sigara sayacı, kitap ya da akşam değerlendirmesi girdikçe burada notlar görünür.'))}</div>`}`);
}

// ===================== sheets =====================
function sheetShell(title, body, area) { return `<div class="scrim" data-act="scrim" id="scrim"><div class="sheet ${area || ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab" aria-hidden="true"></div><div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="iconbtn flat" data-act="closeOverlay" aria-label="${T('Kapat')}">${ico('x')}</button></div>${body}</div></div>`; }
function vSheet() {
  const sh = U.sheet; if (!sh) return '';
  if (sh.kind === 'fab') {
    const opts = [['fis', 'Fiş tara', 'receipt', 'a-para'], ['harcama', 'Harcama', 'bag', 'a-para'], ['uber', 'Uber vardiyası', 'car', 'a-para'], ['uexp', 'Uber gideri', 'receipt', 'a-para'], ['sigara', 'Sigara +1', 'cig', 'a-sag'], ['alkol', 'Alkol +1', 'glass', 'a-sag'], ['kilo', 'Kilo', 'scale', 'a-sag'], ['aliskanlik', 'Alışkanlık', 'check', 'a-gel']];
    const k = sh.k, w = getWeek(thisWeekId()) || {};
    let form = '';
    if (k === 'harcama') form = `<form class="card a-para stack" id="qForm" data-k="harcama"><div class="row">${comboInput('qName')}</div><div class="row"><div class="money" style="width:112px;flex:0 0 112px"><span>$</span><input id="qAmt" inputmode="decimal" placeholder="0,00" aria-label="${T('Tutar')}" autocomplete="off"></div><button type="button" class="tagbtn" data-act="dOneOff" id="qOneOff" aria-pressed="${!!U.dOneOff}">${T('Tek seferlik')}</button><button class="btn" type="submit" style="margin-left:auto">${T('Bugüne kaydet')}</button></div>${accPick('qAcc')}<p class="note" style="margin:0">${T('Bugünün harcamalarına eklenir ve haftanın giderlerine sayılır.')}</p></form>`;
    if (k === 'uber') form = `<form class="card a-para stack" id="qForm" data-k="uber"><div class="fields"><div class="field"><label for="qEarn">${T('Kazanç')}</label><div class="money"><span>$</span><input id="qEarn" inputmode="decimal" placeholder="0"></div></div><div class="field"><label for="qHours">${T('Çevrimiçi saat')}</label><div class="money"><input id="qHours" inputmode="decimal" placeholder="0"><span>${T('sa')}</span></div></div></div><button class="btn" type="submit">${T('Vardiyayı haftaya ekle')}</button><p class="note" style="margin:0">${T('Bu hafta şu ana kadar {x} · {h} saat. Yeni vardiya bunların üstüne eklenir.', { x: usd(+w.uberEarn || 0), h: nf1.format(+w.uberHours || 0) })}</p></form>`;
    if (k === 'kilo') form = `<form class="card a-sag stack" id="qForm" data-k="kilo"><div class="field"><label for="qWeight">${T('Bugünkü kilo')}</label><div class="money"><input id="qWeight" inputmode="decimal" placeholder="${latestWeight() ? nf1.format(latestWeight().v) : T('ör. 78,5')}"><span>kg</span></div></div><button class="btn" type="submit">${T('Kaydet')}</button></form>`;
    if (k === 'aliskanlik') form = `<div class="card a-gel">${G().habits.length ? `<div class="htiles">${G().habits.map((h) => `<button type="button" class="htile" data-act="habit" data-id="${h.id}" aria-pressed="${isDone(h.id, todayKey())}"><span class="chk">${ico('check')}</span><span class="n">${esc(h.name)}</span></button>`).join('')}</div>` : `<p class="note" style="margin:0">${T('Henüz alışkanlık yok. Gelişim sekmesinden ekleyebilirsin.')}</p>`}</div>`;
    return sheetShell(T('Hızlı kayıt'), `<div class="quick">${opts.map(([v, l, ic, a]) => `<button type="button" class="${a}" data-act="fabPick" data-k="${v}" aria-pressed="${k === v}"><span class="ico">${ico(ic)}</span>${T(l)}</button>`).join('')}</div>${form}`, 'a-bug');
  }
  if (sh.kind === 'conflict') return vConflictSheet(sh);
  if (sh.kind === 'daily') {
    const w = getWeek(sh.week), x = w && w.daily.find((e) => e.id === sh.id); if (!x) return '';
    const days = [...Array(7)].map((_, i) => idOf(addDays(fromId(sh.week), i)));
    return sheetShell(T('Harcamayı düzenle'), `<form class="stack" id="dailyEdit"><div class="fields"><div class="field"><label for="deAmt">${T('Tutar')}</label><div class="money"><span>$</span><input id="deAmt" inputmode="decimal" value="${sh.amt != null ? esc(sh.amt) : fmtIn(x.amount)}"></div></div>
      <div class="field"><label for="deDate">${T('Gün')}</label><select class="txt" id="deDate">${days.map((k) => { const d = fromId(k); return `<option value="${k}" ${(sh.date || x.date) === k ? 'selected' : ''}>${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}</option>`; }).join('')}</select></div></div>
      <div class="field"><label for="deName">${T('Ne için?')}</label><input class="txt" id="deName" value="${esc(sh.name != null ? sh.name : x.name || '')}" autocomplete="off"></div>
      ${catChips(sh.cat, 'deCat')}${accPick('deAcc', x.acc || '')}<button type="button" class="tagbtn" data-act="deOneOff" id="deOneOff" aria-pressed="${!!(sh.oneOff != null ? sh.oneOff : x.oneOff)}">${T('Tek seferlik')}</button><button class="btn" type="submit" id="deSave">${T('Kaydet')}</button>${x.rc ? `<button type="button" class="btn soft" data-act="viewRc" data-p="${esc(x.rc)}">${ico('receipt')}${T('Fişi gör')}</button>` : ''}<button type="button" class="btn ghost" data-act="delDaily" data-id="${x.id}" id="deDel">${T('Harcamayı sil')}</button></form>`, 'a-para');
  }
  if (sh.kind === 'shift') return shiftSheet(sh);
  if (sh.kind === 'receipt') return receiptSheet(sh);
  if (sh.kind === 'car') return carSheet();
  if (sh.kind === 'acc') return accSheet(sh);
  if (sh.kind === 'summary') return summarySheet(sh);
  if (sh.kind === 'ubersum') return uberSumSheet(sh);
  if (sh.kind === 'ren') return renSheet(sh);
  if (sh.kind === 'rcview') return rcViewSheet(sh);
  if (sh.kind === 'uexp') return sheetShell(sh.id ? T('Uber giderini düzenle') : T('Uber gideri ekle'), uexpSheet(sh), 'a-para');
  if (sh.kind === 'habits') {
    return sheetShell(T('Alışkanlıkları düzenle'), `<div class="list">${sh.draft.map((h, i) => `<div class="row"><input class="txt" data-hedit="${i}" value="${esc(h.name)}" aria-label="${T('Alışkanlık adı')}"><select class="txt" data-hband="${i}" style="flex:0 0 100px;width:100px" aria-label="${T('Zaman dilimi')}">${BANDS.map(([b, l]) => `<option value="${b}" ${h.band === b ? 'selected' : ''}>${T(l)}</option>`).join('')}</select><button type="button" class="del" data-act="delHabitDraft" data-i="${i}" aria-label="${T('Kaldır')}">${ico('trash')}</button></div>`).join('') || `<p class="empty-txt">${T('Liste boş.')}</p>`}</div>
      <form class="row" id="hsAdd"><input class="txt" id="hsNew" placeholder="${T('Yeni alışkanlık')}" autocomplete="off" aria-label="${T('Yeni alışkanlık')}"><button class="btn sm ghost" type="submit">${ico('plus')}${T('Ekle')}</button></form>
      <div class="btns"><button type="button" class="btn" data-act="saveHabits" style="flex:1">${T('Kaydet')}</button><button type="button" class="btn ghost" data-act="closeOverlay">${T('Vazgeç')}</button></div>
      <p class="note" style="margin:0">${T('Sildiğin alışkanlığın geçmiş işaretleri saklanır ama hesaplara katılmaz.')}</p>`, 'a-gel');
  }
  if (sh.kind === 'pot') {
    const p = sh.id ? D.money.pots.find((x) => x.id === sh.id) : null;
    return sheetShell(p ? T('Kumbarayı düzenle') : T('Yeni kumbara'), `<form class="stack" id="potForm"><div class="field"><label for="potName">${T('Ad')}</label><input class="txt" id="potName" value="${esc(p ? p.name : '')}" placeholder="${T('ör. PS5, Türkiye bileti')}" autocomplete="off"></div>
      <div class="field"><span class="lab">${T('Simge')}</span><div class="iconpick" role="group" aria-label="${T('Simge')}">${POT_ICONS.map(([v, l]) => `<button type="button" data-act="potIcon" data-v="${v}" aria-pressed="${sh.icon === v}" aria-label="${T(l)}" title="${T(l)}">${ico(v)}</button>`).join('')}</div></div>
      <div class="field"><label for="potTarget">${T('Hedef')}</label><div class="money"><span>$</span><input id="potTarget" inputmode="decimal" value="${p ? fmtIn(p.target) : ''}" placeholder="0"></div></div>
      <div class="field"><label for="potDue">${T('Son gün (isteğe bağlı)')}</label><input class="txt" type="date" id="potDue" value="${p && p.due ? p.due : ''}"><span class="hint">${T('Tarih verirsen her hafta ne kadar ayırman gerektiğini hesaplarım.')}</span></div>
      ${p ? '' : `<div class="field"><label for="potStart">${T('Başlangıç tutarı (isteğe bağlı)')}</label><div class="money"><span>$</span><input id="potStart" inputmode="decimal" placeholder="0"></div></div>`}
      <button class="btn" type="submit">${p ? T('Kaydet') : T('Kumbarayı aç')}</button>${p ? `<button type="button" class="btn ghost" data-act="delPot" data-id="${p.id}">${U.armed === p.id ? T('Silmek için tekrar dokun') : T('Kumbarayı sil')}</button>` : ''}</form>`, 'a-para');
  }
  if (sh.kind === 'potbuy') {
    const p = D.money.pots.find((x) => x.id === sh.id); if (!p) return '';
    return sheetShell(T('Satın aldım'), `<form class="stack" id="potBuyForm"><p style="margin:0">${esc(T('{x} için ne kadar harcadın? Tutar bugünün harcamalarına tek seferlik olarak eklenir ve kumbara tamamlandı olarak işaretlenir.', { x: p.name }))}</p>
      <div class="field"><label for="buyAmt">${T('Harcanan tutar')}</label><div class="money"><span>$</span><input id="buyAmt" inputmode="decimal" value="${fmtIn(p.saved)}"></div></div><button class="btn" type="submit" id="buyOk">${ico('check')}${T('Harcamaya ekle ve kapat')}</button></form>`, 'a-para');
  }
  if (sh.kind === 'holding') {
    const h = sh.id ? IV().holdings.find((x) => x.id === sh.id) : null;
    return sheetShell(h ? h.symbol : T('Varlık ekle'), `<form class="stack" id="holdForm"><div class="fields"><div class="field"><label for="hdSym">${T('Sembol')}</label><input class="txt" id="hdSym" value="${esc(h ? h.symbol : '')}" placeholder="${T('ör. AAPL, VAS')}" autocapitalize="characters" autocomplete="off"></div>
      <div class="field"><span class="lab">${T('Piyasa')}</span><div class="seg" role="group" aria-label="${T('Piyasa')}"><button type="button" data-act="holdMkt" data-v="US" aria-pressed="${sh.market === 'US'}">${T('ABD')}</button><button type="button" data-act="holdMkt" data-v="ASX" aria-pressed="${sh.market === 'ASX'}">ASX</button></div></div></div>
      <div class="fields"><div class="field"><label for="hdUnits">${T('Adet')}</label><div class="money"><input id="hdUnits" inputmode="decimal" value="${h ? inNum(h.units) : ''}" placeholder="0"></div></div>
      <div class="field"><label for="hdAvg">${T('Ortalama maliyet')}</label><div class="money"><span>${sh.currency === 'USD' ? 'US$' : '$'}</span><input id="hdAvg" inputmode="decimal" value="${h ? inNum(h.avgCost) : ''}" placeholder="0"></div></div></div>
      <div class="field inline"><span class="lab">${T('Para birimi')}</span><div class="seg inline" role="group" aria-label="${T('Para birimi')}"><button type="button" data-act="holdCur" data-v="USD" aria-pressed="${sh.currency === 'USD'}">USD</button><button type="button" data-act="holdCur" data-v="AUD" aria-pressed="${sh.currency === 'AUD'}">AUD</button></div></div>
      <div class="field"><label for="hdPrice">${T('Son fiyat (elle)')}</label><div class="money"><span>${sh.currency === 'USD' ? 'US$' : '$'}</span><input id="hdPrice" inputmode="decimal" value="${h && h.manualPrice ? inNum(h.manualPrice) : ''}" placeholder="${sh.market === 'ASX' ? T('ASX için gerekli') : T('Finnhub varsa boş bırak')}"></div><span class="hint">${sh.market === 'ASX' ? T("ASX fiyatı için ücretsiz bir kaynak yok. Stake'teki son fiyatı ara ara buraya yaz.") : T("ABD fiyatı Finnhub'dan gelir. Anahtar yoksa ya da fiyat alınamazsa bu değer kullanılır.")}</span></div>
      <button class="btn" type="submit" id="hdSave">${T('Kaydet')}</button>${h ? `<button type="button" class="btn ghost" data-act="delHolding" data-id="${h.id}">${U.armed === h.id ? T('Silmek için tekrar dokun') : T('Varlığı sil')}</button>` : ''}</form>`, 'a-yat');
  }
  return '';
}

// ===================== render =====================
function applyTheme() {
  const t = D.ui.theme, html = document.documentElement;
  if (t === 'light' || t === 'dark') html.setAttribute('data-theme', t); else html.removeAttribute('data-theme');
  const dark = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#1b1520' : '#f4eee6');
}
function applyLang() {
  setLocale(D.ui.lang);
  document.title = 'Momentum';
  $('fab').setAttribute('aria-label', T('Hızlı kayıt'));
  $('gearBtn').setAttribute('aria-label', T('Ayarlar ve yedek'));
  $('tabs').setAttribute('aria-label', T('Bölümler'));
  document.querySelectorAll('#tabs button').forEach((b) => { b.querySelector('.tl').textContent = T(TITLE[b.dataset.tab] === 'Momentum' ? 'Bugün' : TITLE[b.dataset.tab]); });
}
function keepFocus(fn) {
  const ae = document.activeElement, id = ae && ae.id, caret = id && ae.selectionStart;
  fn();
  if (id && ae.tagName !== 'BUTTON' && ae.type !== 'file') { const el = $(id); if (el && el !== ae) { el.focus({ preventScroll: true }); try { if (caret != null) el.setSelectionRange(caret, caret); } catch (e) {} } }
}
function render(dir) {
  if (typeof taxCacheReset === 'function') taxCacheReset();
  keepFocus(() => {
    const v = $('view');
    v.className = AREA[U.tab];
    v.innerHTML = ({ bugun: vBugun, para: vPara, gelisim: vGelisim, saglik: vSaglik, yatirim: vYatirim })[U.tab]();
    $('topTitle').textContent = U.tab === 'bugun' ? 'Momentum' : T(TITLE[U.tab]);
    document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === U.tab)));
    $('fab').hidden = U.tab !== 'bugun';
    const sg = $('secGear'); if (sg) { sg.dataset.sec = TAB_SEC[U.tab]; sg.setAttribute('aria-label', T('Bu sekmenin ayarları')); sg.title = T('Bu sekmenin ayarları'); }
    if (U.tab === 'para' && U.paraSeg === 'hafta') paraCalc();
    paintSyncChip(); fitText($('view'));
  });
  if (dir) { const v = $('view'); v.classList.remove('slide-l', 'slide-r'); void v.offsetWidth; v.classList.add(dir < 0 ? 'slide-r' : 'slide-l'); }
}
function renderSheet() { keepFocus(() => { $('sheetRoot').innerHTML = vSheet(); }); rcHydrate(); }
function renderPage() { keepFocus(() => { $('pageRoot').innerHTML = U.page === 'settings' ? vSettings() : U.page === 'insights' ? vInsights() : ''; }); }
function renderAll() { render(); renderSheet(); renderPage(); }
function go(tab, seg) {
  U.tab = tab; U.armed = null;
  if (seg && tab === 'para') U.paraSeg = seg; if (seg && tab === 'gelisim') U.gelSeg = seg;
  if (seg === 'vergi') U.taxQ = quarterOf(thisWeekId()).key;
  try { localStorage.setItem(TAB_KEY, tab); } catch (e) {}
  render(); window.scrollTo({ top: 0 });
  if (tab === 'yatirim') refreshPrices(false);
}
let ovDepth = 0;
function openOverlay(kind, v) {
  if (kind === 'page') { U.page = v; U.bk = null; if (v === 'settings') U.setSec = null; renderPage(); } else if (kind === 'setSec') { U.setSec = v; U.bk = null; if (v === 'hesap' && SY.session) loadDevices(); renderPage(); const pg = $('page'); if (pg) pg.scrollTop = 0; } else { U.sheet = v; renderSheet(); }
  try { history.pushState({ ov: ++ovDepth }, ''); } catch (e) {}
}
function closeTop() { U.armed = null; if (U.sheet) { const wasConflict = U.sheet.kind === 'conflict'; U.sheet = null; renderSheet(); if (wasConflict) resolveConflict(null); } else if (U.page === 'settings' && U.setSec) { U.setSec = null; U.bk = null; renderPage(); } else if (U.page) { U.page = null; U.bk = null; renderPage(); render(); } }
function closeOverlay() { if (history.state && history.state.ov) history.back(); else closeTop(); }
window.addEventListener('popstate', () => { ovDepth = Math.max(0, ovDepth - 1); closeTop(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (U.sheet || U.page)) closeOverlay(); });
