// ===================== HESAPLARIM (bank balances typed in by hand: main, savings, business, tax saver, cash) =====================
// money.accounts: [{ id, name, type, bal, d (last update), log: [{ d, v }] }]
const ACC_TYPES = [['main', 'Ana hesap', 'wallet'], ['credit', 'Kredi kartı', 'cash'], ['savings', 'Birikim', 'jar'], ['biz', 'İş hesabı', 'brief'], ['tax', 'Vergi birikimi', 'tax'], ['cash', 'Nakit', 'cash'], ['other', 'Diğer', 'list']];
const accType = (k) => ACC_TYPES.find((x) => x[0] === k) || ACC_TYPES[ACC_TYPES.length - 1];
const agoDays = (k) => { const n = daysTo(k); return n === 0 ? T('bugün') : n === -1 ? T('dün') : T('{n} gün önce', { n: -n }); };
// what is really yours: balances − GST still to pay at BAS − this FY's income tax share (paid after the tax return)
function moneyOwed() {
  const cur = quarterOf(thisWeekId()).key, fy = +cur.split('-Q')[0], q = +cur.split('-Q')[1], today = todayKey();
  let gst = 0, tax = 0;
  for (let i = 1; i <= q; i++) { const k = fy + '-Q' + i, f = taxFull(k); tax += f.tax; if (keyOf(qInfo(k).due) >= today) gst += f.gst; }
  // previous FY's Q4 BAS falls due in August
  const pk = (fy - 1) + '-Q4'; if (keyOf(qInfo(pk).due) >= today) gst += taxFull(pk).gst;
  const pots = D.money.pots.filter((p) => !p.done).reduce((s, p) => s + (+p.saved || 0), 0);
  return { gst: r2(gst), tax: r2(tax), pots: r2(pots), fy };
}
function accountsCard() {
  const A = D.money.accounts, tot = A.reduce((s, a) => s + (+a.bal || 0), 0);
  const tax = A.filter((a) => a.type === 'tax').reduce((s, a) => s + (+a.bal || 0), 0), need = A.some((a) => a.type === 'tax') ? taxFull(quarterOf(thisWeekId()).key).need : 0;
  const row = (a) => { const t = accType(a.type), prev = a.log && a.log.length > 1 ? a.log[a.log.length - 2].v : null, d = prev == null ? null : (+a.bal || 0) - prev;
    return `<button type="button" class="hold acc" data-act="editAcc" data-id="${a.id}"><span class="sym">${ico(t[2])}</span><span class="mid"><b>${esc(a.name)}</b><span>${T(t[1])} · ${a.d ? agoDays(a.d) : T('güncellenmedi')}</span></span><span class="rt"><b class="num${(+a.bal || 0) < 0 ? ' neg' : ''}">${(+a.bal || 0) < 0 ? '−' + usd2(-a.bal) : usd2(+a.bal || 0)}</b>${d != null && Math.abs(d) >= 1 ? `<span class="rd ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}${usd(Math.abs(d))}</span>` : ''}</span></button>`; };
  const stale = A.some((a) => !a.d || daysTo(a.d) < -7);
  return `<div class="card" id="accCard">${head('wallet', T('Hesaplarım'), `<button type="button" class="btn sm" data-act="newAcc" id="newAccBtn">${ico('plus')}${T('Hesap')}</button>`)}
    ${A.length ? `<div class="acc-tot"><span>${T('Toplam param')}</span><b id="accTotal">${usd2(tot)}</b></div><div class="list" id="accList">${A.map(row).join('')}</div>
      ${(() => { const o = moneyOwed(), mine = tot - o.gst - o.tax, free = mine - o.pots; if (!o.gst && !o.tax && !o.pots) return '';
        const ln = (id, l, v, x, cls) => `<div class="${cls || ''}" id="${id}"><dt>${l}${x ? `<small>${x}</small>` : ''}</dt><dd>${v}</dd></div>`;
        return `<dl class="receipt mine" id="accMine">${ln('amTot', T('Bankadaki toplam'), usd2(tot))}
          ${o.gst ? ln('amGst', o.gst > 0 ? T('− GST (BAS’ta ödenecek)') : T('+ GST iadesi (BAS’tan gelecek)'), (o.gst > 0 ? '−' : '+') + usd2(Math.abs(o.gst)), T('Son günü gelmemiş BAS’lar')) : ''}
          ${o.tax ? ln('amTax', T('− Gelir vergisi payı'), '−' + usd2(o.tax), T('{fy} Uber kârının vergisi; beyannameden sonra ödenir', { fy: fyName(o.fy) })) : ''}
          ${o.pots ? ln('amMine', T('= Gerçekten senin olan'), usd2(mine), '', 'sub-tot') + ln('amPots', T('− Kumbaralara ayrılan'), '−' + usd2(o.pots)) + `<div class="tot" id="amFree"><dt>${T('= Serbest para')}</dt><dd>${usd2(free)}</dd></div>`
            : `<div class="tot" id="amMine"><dt>${T('= Gerçekten senin olan')}</dt><dd>${usd2(mine)}</dd></div>`}</dl>`; })()}
      ${need > 0 ? `<p class="acc-tax ${tax + 0.005 >= need ? 'ok' : 'short'}" id="accTax">${tax + 0.005 >= need ? T('Vergi birikiminde {a} var; bu çeyrek için gereken {b}. Yeterli.', { a: usd(tax), b: usd(need) }) : T('Vergi birikiminde {a} var; bu çeyrek için {b} gerekiyor. {c} eksik.', { a: usd(tax), b: usd(need), c: usd(need - tax) })}</p>` : ''}
      <p class="note">${stale ? T('Bakiyeleri haftada bir, banka uygulamasına bakıp güncelle. Uygulama bankana bağlanmaz, sadece senin yazdığını tutar.') : T('Bakiyeler senin girdiğin rakamlar; uygulama bankana bağlanmaz.')}</p>`
      : `<p class="note" style="margin-top:0">${T('Ana hesabını, birikim hesabını, iş hesabını ve vergi birikim hesabını ekle. Bakiyeleri banka uygulamasına bakıp yazarsın; toplam paran ve vergi için yeterince ayırıp ayırmadığın görünür.')}</p>`}</div>`;
}
function accSheet(sh) {
  const a = sh.id ? D.money.accounts.find((x) => x.id === sh.id) : null;
  const hist = a && a.log && a.log.length > 1 ? `<div class="chart-wrap">${lineChart(a.log.slice(-12).map((x) => ({ v: x.v, lbl: dShort(x.d) })), { label: T('Bakiye geçmişi'), fmt: (v) => '$' + nf0.format(Math.round(v)), tip: (p) => p.lbl + ': ' + usd2(p.v) })}</div>` : '';
  return sheetShell(a ? a.name : T('Hesap ekle'), `<form class="stack" id="accForm">
    <div class="field"><label for="accBal">${T('Güncel bakiye')}</label><div class="money"><span>$</span><input id="accBal" inputmode="decimal" value="${a ? fmtIn(a.type === 'credit' ? Math.abs(+a.bal || 0) : +a.bal || 0) : ''}" placeholder="0,00"></div><span class="hint">${a && a.d ? T('Son güncelleme: {d}', { d: longDate(parseKey(a.d)) }) : T('Banka uygulamandaki bakiyeyi yaz.')} ${T('Kredi kartında güncel borcunu yaz; uygulama eksi olarak tutar.')}</span></div>
    ${hist}
    <div class="fields"><div class="field"><label for="accName">${T('Ad')}</label><input class="txt" id="accName" value="${esc(a ? a.name : sh.name || '')}" placeholder="${T('ör. CommBank Smart Access')}" autocomplete="off"></div>
    <div class="field"><label for="accType">${T('Tür')}</label><select class="txt" id="accType">${ACC_TYPES.map(([k, l]) => `<option value="${k}" ${(a ? a.type : sh.type || 'main') === k ? 'selected' : ''}>${T(l)}</option>`).join('')}</select></div></div>
    <p class="err" id="accErr" role="alert" hidden></p><button class="btn" type="submit" id="accSave">${T('Kaydet')}</button>
    ${a ? `<button type="button" class="btn ghost" data-act="delAcc" data-id="${a.id}">${U.armed === a.id ? T('Silmek için tekrar dokun') : T('Hesabı sil')}</button>` : ''}</form>`, 'a-para');
}
function saveAcc() {
  const type = val('accType'), b0 = parse(val('accBal')), bal = b0 !== '' && type === 'credit' ? -Math.abs(b0) : b0, name = val('accName').trim();
  if (!name) return T('Hesaba bir ad ver.'); if (bal === '') return T('Bakiyeyi yaz.');
  const sh = U.sheet, k = todayKey(); let a = sh.id ? D.money.accounts.find((x) => x.id === sh.id) : null;
  if (!a) { a = { id: uid(), name, type, bal, d: k, log: [] }; D.money.accounts.push(a); }
  const changed = +a.bal !== bal || !a.log.length; Object.assign(a, { name, type, bal });
  if (changed) { a.d = k; a.log = (a.log || []).filter((x) => x.d !== k); a.log.push({ d: k, v: bal }); if (a.log.length > 60) a.log = a.log.slice(-60); }
  save(); return { msg: T('{x}: {y}', { x: name, y: usd2(bal) }) };
}

// ---------- paying from an account: spending moves the balance (credit cards hold a negative balance = debt) ----------
const payAccs = () => D.money.accounts.filter((a) => ['main', 'credit', 'biz', 'cash', 'other'].includes(a.type));
function accAdjust(id, delta) {
  const a = id && D.money.accounts.find((x) => x.id === id); if (!a || !delta) return;
  a.bal = r2((+a.bal || 0) + delta); const k = todayKey();
  a.log = (a.log || []).filter((x) => x.d !== k); a.log.push({ d: k, v: a.bal }); if (a.log.length > 60) a.log = a.log.slice(-60);
}
function accPick(id, cur) {
  const P = payAccs(); if (!P.length) return '';
  const sel = cur === undefined ? (P.some((a) => a.id === D.ui.lastAcc) ? D.ui.lastAcc : '') : cur || '';
  return `<label class="acc-pick">${ico('wallet')}<select id="${id}" aria-label="${T('Hangi hesaptan?')}"><option value="">${T('Hesaptan düşme')}</option>${P.map((a) => `<option value="${a.id}" ${sel === a.id ? 'selected' : ''}>${esc(a.name)} · ${usd(+a.bal || 0)}</option>`).join('')}</select></label>`;
}
const accName = (id) => { const a = D.money.accounts.find((x) => x.id === id); return a ? a.name : ''; };
