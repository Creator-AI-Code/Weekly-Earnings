// ===================== GELİŞİM =====================
function vGelisim() {
  const L = level();
  const segs = [['aliskanlik', 'Alışkanlık'], ['gorev', 'Görev'], ['hedef', 'Hedef'], ['kitap', 'Kitap'], ['gunluk', 'Günlük']];
  return `<div class="seg top-seg" role="group" aria-label="${T('Gelişim bölümleri')}" data-swipe-zone="gelSeg">${segs.map(([k, l]) => `<button type="button" data-act="gelSeg" data-v="${k}" aria-pressed="${U.gelSeg === k}">${T(l)}</button>`).join('')}</div>
    <div class="gel-top"><button type="button" class="link" data-act="openInsights" id="gelInsights">${ico('spark')}${T('İçgörüler')}</button><span class="xp">${T('Seviye {n}', { n: L.lv })}<i><b style="width:${L.p}%"></b></i>${nf0.format(L.x)} XP</span></div>` +
    ({ aliskanlik: gelHabits, gorev: gelTasks, hedef: gelGoals, kitap: gelBooks, gunluk: gelJournal })[U.gelSeg]();
}
function gelHabits() {
  const hs = G().habits, tk = todayKey(), today = new Date(), ids = new Set(hs.map((h) => h.id));
  let tot = 0, hit = 0; for (let i = 0; i < 30; i++) { const k = keyOf(addDays(today, -i)); tot += hs.length; hit += doneOn(k).filter((x) => ids.has(x)).length; }
  const addForm = `<form class="card" id="habitForm" style="display:grid;gap:10px"><label class="card-title" for="habitInput">${T('Yeni alışkanlık')}</label><input class="txt" id="habitInput" placeholder="${T('ör. 10 dakika esneme')}" autocomplete="off">
    <div class="seg" role="group" aria-label="${T('Zaman dilimi')}">${BANDS.map(([b, l]) => `<button type="button" data-act="newBand" data-v="${b}" aria-pressed="${U.newBand === b}">${T(l)}</button>`).join('')}</div><button class="btn" type="submit">${ico('plus')}${T('Ekle')}</button></form>`;
  if (!hs.length) return `<div class="card">${empty('habits', T('Alışkanlık listen boş'), T('Küçük başla: günde 2–3 alışkanlık yeterli. Yaptıkça güçlenir; bir gün kaçırınca sıfırlanmaz.'), `<button type="button" class="btn sm" data-act="sampleHabits">${ico('plus')}${T('Örnek alışkanlıklar ekle')}</button>`)}</div>` + addForm;
  const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
  return `<div class="card"><div class="tiles">${tile(T('Bugün'), `${doneOn(tk).filter((x) => ids.has(x)).length}/${hs.length}`, T('işaretlendi'))}${tile(T('Son 30 gün'), pct(tot ? Math.round(hit / tot * 100) : 0), T('tamamlandı'))}</div>
    <p class="note">${T('Güç, son 60 günün ağırlıklı ortalamasıdır. Yaptıkça yükselir; bir gün kaçırırsan biraz düşer ama sıfırlanmaz.')}</p></div>` +
    BANDS.map(([b, lbl, ic]) => { const list = hs.filter((h) => h.band === b); if (!list.length) return ''; return `<div class="band-h" style="margin:4px 4px -2px">${ico(ic)}${T(lbl)}</div>` + list.map((h) => {
      const s = habitStrength(h), miss = missedYesterday(h);
      return `<article class="card habit"><div class="habit-h"><span class="nm">${esc(h.name)}</span>${miss ? `<span class="chip gold" title="${T('Dün yapılmadı. Bugün yaparsan sorun yok.')}">${T('İki kez kaçırma')}</span>` : ''}<button type="button" class="del" data-act="openHabitSheet" aria-label="${T('Düzenle')}">${ico('pen')}</button></div>
        <div class="strength"><span>${T('Güç')}</span><div class="meter"><i style="width:${s}%"></i></div><b>${pct(s)}</b></div>
        <div class="dots">${days.map((d) => { const k = keyOf(d), on = isDone(h.id, k); return `<button type="button" class="dot${k === tk ? ' today' : ''}" data-act="cell" data-id="${h.id}" data-k="${k}" aria-pressed="${on}" aria-label="${esc(h.name)}, ${d.getDate()} ${MONTHS[d.getMonth()]}: ${on ? T('yapıldı') : T('yapılmadı')}"><i></i>${k === tk ? T('Bgn') : DAYS[d.getDay()]}</button>`; }).join('')}</div></article>`; }).join(''); }).join('') + addForm;
}
function gelTasks() {
  let open = G().tasks.filter((t) => !t.done); if (U.taskFilter !== 'all') open = open.filter((t) => t.cat === U.taskFilter);
  open.sort((a, b) => a.prio - b.prio);
  const closed = G().tasks.filter((t) => t.done);
  return `<form class="card" id="taskForm" style="display:grid;gap:10px"><div class="row"><input class="txt" id="taskInput" placeholder="${T('Yeni görev')}" autocomplete="off" aria-label="${T('Yeni görev')}"><button class="btn" type="submit">${T('Ekle')}</button></div>
    <div class="row" style="flex-wrap:wrap"><div class="seg inline" role="group" aria-label="${T('Görev türü')}"><button type="button" data-act="tcat" data-v="is" aria-pressed="${U.taskCat === 'is'}">${T('İş')}</button><button type="button" data-act="tcat" data-v="kisisel" aria-pressed="${U.taskCat === 'kisisel'}">${T('Kişisel')}</button></div>
    <div class="seg inline" role="group" aria-label="${T('Öncelik')}"><button type="button" data-act="prio" data-p="1" aria-pressed="${U.taskPrio === 1}">${T('Önemli')}</button><button type="button" data-act="prio" data-p="2" aria-pressed="${U.taskPrio === 2}">${T('Normal')}</button></div></div></form>
    <div class="card"><div class="seg" role="group" aria-label="${T('Görev filtresi')}" style="margin-bottom:6px">${[['all', 'Tümü'], ['is', 'İş'], ['kisisel', 'Kişisel']].map(([k, l]) => `<button type="button" data-act="filter" data-v="${k}" aria-pressed="${U.taskFilter === k}">${T(l)}</button>`).join('')}</div>
      ${open.length ? `<div class="list">${open.map(taskRow).join('')}</div>` : empty('tasks', T('Açık görev yok'), T('Yukarıdan bir görev ekle. Önemli olanlar Bugün ekranında en üstte görünür.'))}
      ${closed.length ? `<details class="fold"><summary>${T('Tamamlanan ({n})', { n: closed.length })}</summary><div class="list">${closed.map(taskRow).join('')}</div><button type="button" class="link" data-act="clearDone">${T('Tamamlananları temizle')}</button></details>` : ''}</div>`;
}
function gelGoals() {
  const gs = G().goals;
  return `<div class="card"><label class="eyebrow" for="idText" style="color:var(--acc-text)">${T('Olmak istediğim kişi')}</label><textarea class="txt" id="idText" data-idtext rows="2" style="margin-top:6px;font-family:var(--f-display);font-weight:600;font-size:1.05rem" placeholder="${T('ör. Disiplinli, kitap okuyan ve kendi işini kuran bir usta elektrikçi.')}">${esc(G().identity)}</textarea></div>
    <form class="card row" id="goalForm"><input class="txt" id="goalInput" placeholder="${T('Yeni hedef')}" autocomplete="off" aria-label="${T('Yeni hedef')}"><button class="btn" type="submit">${T('Ekle')}</button></form>
    ${gs.length ? gs.map((g) => { const n = g.steps.length, d = g.steps.filter((s) => s.done).length, p = n ? Math.round(d / n * 100) : 0, del = U.armed === g.id;
      return `<article class="card goal stack"><div class="row" style="align-items:flex-start"><div style="flex:1;min-width:0"><h3>${esc(g.title)}</h3>${g.why ? `<div class="why">${esc(g.why)}</div>` : ''}</div><button type="button" class="del ${del ? 'arm' : ''}" data-act="delGoal" data-id="${g.id}" aria-label="${T('Hedefi sil')}">${del ? T('Sil?') : ico('x')}</button></div>
        <div><div class="meter${p === 100 ? ' gold' : ''}"><i style="width:${p}%"></i></div><div class="meter-l"><span>${T('{d} / {n} adım', { d, n })}</span><span>${pct(p)}</span></div></div>
        <div>${g.steps.map((s) => `<div class="step ${s.done ? 'done' : ''}"><button type="button" class="tick" data-act="step" data-g="${g.id}" data-id="${s.id}" aria-pressed="${!!s.done}" aria-label="${esc(T('Adımı işaretle: {t}', { t: s.text }))}"><span>${ico('check')}</span></button><span class="t">${esc(s.text)}</span><button type="button" class="del" data-act="delStep" data-g="${g.id}" data-id="${s.id}" aria-label="${T('Adımı sil')}">${ico('x')}</button></div>`).join('')}</div>
        <form class="mini-add" data-g="${g.id}"><input class="txt" id="st-${g.id}" placeholder="${T('Adım ekle')}" aria-label="${T('Adım ekle')}" autocomplete="off"><button class="btn sm ghost" type="submit">${T('Ekle')}</button></form></article>`; }).join('')
      : `<div class="card">${empty('goals', T('Henüz hedef yok'), T('Büyük bir hedef yaz, sonra küçük adımlara böl. Her adım bir basamak.'))}</div>`}`;
}
function gelBooks() {
  const g = G(), yr = String(new Date().getFullYear());
  const doneYr = g.books.filter((b) => b.status === 'done' && (b.fin || '').startsWith(yr)).length;
  const p = g.bookGoal ? Math.min(100, Math.round(doneYr / g.bookGoal * 100)) : 0;
  const ws = mondayOf(new Date()); let wp = 0; for (let i = 0; i < 7; i++) wp += g.readLog[keyOf(addDays(ws, i))] || 0;
  let yp = 0; for (const k in g.readLog) if (k.startsWith(yr)) yp += g.readLog[k];
  const seg = U.bookSeg, list = g.books.filter((b) => b.status === seg), cnt = (s) => g.books.filter((b) => b.status === s).length;
  return `<div class="card summary">${ring(p, doneYr + '/' + g.bookGoal, p >= 100 ? 'var(--gold-line)' : 'var(--acc-line)')}<div><div class="quote">${T('{y} okuma hedefi', { y: yr })}</div><div class="meta num">${T('Bu hafta {a} sayfa · bu yıl {b} sayfa', { a: wp, b: nf0.format(yp) })}</div>
    <div class="row" style="margin-top:8px"><label for="bGoal" class="meta" style="margin:0">${T('Yıllık hedef')}</label><div class="money" style="width:96px;min-height:44px"><input id="bGoal" inputmode="numeric" value="${g.bookGoal}"></div><span class="meta" style="margin:0">${T('kitap')}</span></div></div></div>
    <div class="seg" role="group" aria-label="${T('Kitap listesi')}">${[['reading', 'Okuyorum'], ['want', 'Okunacak'], ['done', 'Okundu']].map(([k, l]) => `<button type="button" data-act="bseg" data-v="${k}" aria-pressed="${seg === k}">${T(l)} (${cnt(k)})</button>`).join('')}</div>
    ${list.length ? list.map(bookCard).join('') : `<div class="card">${empty('books', seg === 'reading' ? T('Şu an okuduğun kitap yok') : seg === 'want' ? T('Okuma listen boş') : T('Henüz bitirdiğin kitap yok'), seg === 'reading' ? T('"Okunacak" listesinden bir kitap başlat.') : seg === 'want' ? T('Aşağıdan okumak istediğin bir kitabı ekle.') : T('Bitirdiğin kitaplar burada birikir.'))}</div>`}
    <form class="card stack" id="bookForm"><h2 class="card-title">${T('Kitap ekle')}</h2><input class="txt" id="bTitle" placeholder="${T('Kitap adı')}" autocomplete="off" aria-label="${T('Kitap adı')}">
      <div class="row"><input class="txt" id="bAuthor" placeholder="${T('Yazar')}" autocomplete="off" aria-label="${T('Yazar')}"><input class="txt" id="bPages" inputmode="numeric" placeholder="${T('Sayfa')}" aria-label="${T('Sayfa sayısı')}" style="flex:0 0 96px;width:96px"></div><button class="btn" type="submit">${T('Okunacaklara ekle')}</button></form>`;
}
function bookCard(b) {
  const col = SPINE[(b.title.charCodeAt(0) + b.title.length) % SPINE.length], p = b.pages ? Math.min(100, Math.round((b.page || 0) / b.pages * 100)) : 0, del = U.armed === b.id;
  return `<article class="card book stack"><div class="book-h"><div class="spine" style="background:${col}">${esc(b.title.trim()[0] || '?')}</div><div style="flex:1;min-width:0"><h3>${esc(b.title)}</h3><div class="au">${esc(b.author || '')}${b.pages ? ' · ' + T('{n} sayfa', { n: b.pages }) : ''}</div>${b.status === 'done' && b.fin ? `<div class="note" style="margin-top:2px">${T('Bitirdiğin tarih: {d}', { d: dShort(b.fin) })}</div>` : ''}</div>
    <button type="button" class="del ${del ? 'arm' : ''}" data-act="delBook" data-id="${b.id}" aria-label="${T('Kitabı sil')}">${del ? T('Sil?') : ico('x')}</button></div>
    ${b.status === 'reading' ? `<div><div class="meter"><i style="width:${p}%"></i></div><div class="meter-l"><span>${T('Sayfa {a}', { a: b.page || 0 })}${b.pages ? ' / ' + b.pages : ''}</span><span>${pct(p)}</span></div></div>
      <div class="btns"><button type="button" class="btn sm soft" data-act="pages" data-id="${b.id}" data-n="10">${T('+10 sayfa')}</button><button type="button" class="btn sm soft" data-act="pages" data-id="${b.id}" data-n="25">+25</button><div class="money" style="width:104px;min-height:44px"><input id="bp-${b.id}" data-bpage="${b.id}" inputmode="numeric" placeholder="${T('Sayfa no')}" aria-label="${T('Bulunduğun sayfa')}"></div><button type="button" class="btn sm" data-act="finish" data-id="${b.id}">${T('Bitirdim')}</button></div>` : ''}
    ${b.status === 'want' ? `<div class="btns"><button type="button" class="btn sm" data-act="startBook" data-id="${b.id}">${T('Okumaya başla')}</button></div>` : ''}
    ${b.status === 'done' ? `<div class="stars" role="group" aria-label="${T('Puan')}">${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="${(b.rate || 0) >= i ? 'on' : ''}" data-act="rate" data-id="${b.id}" data-n="${i}" aria-label="${T('{n} yıldız', { n: i })}">${ico('star')}</button>`).join('')}</div>
      <label class="field"><span class="lab">${T('Aklımda kalan')}</span><textarea class="txt" data-bnote="${b.id}" placeholder="${T('Bu kitaptan aklında kalan 1–2 fikir')}">${esc(b.note || '')}</textarea></label>` : ''}</article>`;
}
function gelJournal() {
  const ks = Object.keys(G().journal).sort().reverse();
  if (!ks.length) return `<div class="card">${empty('journal', T('Günlüğün boş'), T('Her akşam 18:00’den sonra Bugün ekranında kısa bir değerlendirme kartı çıkar. Yazdıkların burada birikir.'))}</div>`;
  return ks.slice(0, 120).map((k) => { const e = G().journal[k], d = parseKey(k);
    return `<article class="card entry"><div class="d"><span>${d.getDate()} ${MONTHS_FULL[d.getMonth()]} · ${DAYS_LONG[d.getDay()]}</span>${e.mood ? `<span style="display:flex;align-items:center;gap:6px">${T(MOODS[e.mood - 1][1])}${ico(MOODS[e.mood - 1][0])}</span>` : ''}</div>
      ${(e.tags || []).length ? `<div class="btns" style="gap:4px">${e.tags.map((t) => `<span class="chip acc">${esc(T(t))}</span>`).join('')}</div>` : ''}
      ${e.line ? `<p>${esc(e.line)}</p>` : ''}${e.win ? `<p><b>${T('İyi giden:')}</b> ${esc(e.win)}</p>` : ''}${e.learn ? `<p><b>${T('Öğrendiğim:')}</b> ${esc(e.learn)}</p>` : ''}${e.focus ? `<p><b>${T('Yarınki odak:')}</b> ${esc(e.focus)}</p>` : ''}</article>`; }).join('');
}

// ===================== SAĞLIK =====================
const ago = (i) => (i === 0 ? T('bugün') : i === 1 ? T('dün') : T('{n} gün önce', { n: i }));
const stressLbl = (v) => (v <= 30 ? T('düşük') : v <= 60 ? T('orta') : T('yüksek'));
const scoreColor = (s) => (s >= 75 ? 'var(--gain)' : s >= 50 ? 'var(--gold)' : 'var(--loss)');
function vSaglik() {
  const k = todayKey(), d = hd(k), hs = healthScore(), b = bmi(), lw = latestWeight();
  const hr = latest('hr', 7), hrMin = latest('hrMin', 7), str = latest('stress', 7), stp = latest('steps', 7), slp = latest('sleep', 7);
  const cw = weekSum('cig'), smokeFree = streakOf((x) => hd(x).cig === 0), alcFree = streakOf((x) => hd(x).alc === 0), aw = weekSum('alc');
  let cig7 = 0, cigDays = 0; for (let i = 0; i < 7; i++) { const v = hd(keyOf(addDays(new Date(), -i))).cig; if (v != null) { cig7 += v; cigDays++; } }
  const wSeries = Object.keys(D.health.days).filter((x) => D.health.days[x].weight != null).sort().slice(-30).map((x) => ({ v: D.health.days[x].weight, lbl: dShort(x) }));
  const [bc, bcc] = b ? bmiCat(b) : ['', ''];
  const gw = D.health.goalWeight;
  return `<div class="card summary">${ring(hs ? hs.score : 0, hs ? String(hs.score) : '–', hs ? scoreColor(hs.score) : 'var(--surface-2)')}<div><div class="quote" id="scoreMsg">${hs ? (hs.score >= 75 ? T('Bugün iyi gidiyorsun.') : hs.score >= 50 ? T('Fena değil, biraz daha zorlayabilirsin.') : T('Bugün kendine biraz daha iyi bak.')) : T('Skorunu görmek için bugünün bilgilerini gir.')}</div>
      ${hs ? `<div class="parts">${hs.parts.map((p) => `<span class="chip ${p[2] >= 0.9 ? 'gain' : p[2] < 0.4 ? 'loss' : ''}">${p[0]}: ${esc(p[3])}</span>`).join('')}</div>` : ''}<p class="note">${T('Sağlık skoru kişisel bir göstergedir, tıbbi değerlendirme değildir.')}</p></div></div>
    <section class="card">${head('cig', T('Sigara ve alkol'), `<span class="sub">${T('bugün')}</span>`)}${countersHTML(k)}
      <div class="tiles" style="margin-top:10px">${tile(T('Bu hafta sigaraya giden'), cw.s ? '≈ ' + usd2(cw.s * cigPrice()) : '$0', T('{n} adet · paketi {x}', { n: cw.s, x: usd(+D.health.packPrice || 40) }))}${tile(T('Sigarasız seri'), T('{n} gün', { n: smokeFree }), cigDays ? T('son 7 günde {n} adet', { n: cig7 }) : T('kayıt yok'))}${tile(T('Alkolsüz seri'), T('{n} gün', { n: alcFree }), T('bu hafta {n}/10 içki', { n: aw.s }))}</div>
      <div class="metrics" style="margin-top:10px"><div class="metric"><div class="mh"><span>${T('Sigara · 7 gün')}</span></div>${barChart(series7('cig'), { w: 170, h: 84, label: T('Son 7 gün sigara') })}</div><div class="metric"><div class="mh"><span>${T('Alkol · 7 gün')}</span></div>${barChart(series7('alc'), { w: 170, h: 84, label: T('Son 7 gün alkol'), goal: 4 })}</div></div>
      <p class="note">${T("Avustralya rehberi: haftada en fazla 10, bir günde en fazla 4 standart içki. Paket fiyatını Ayarlar → Sağlık'tan değiştirebilirsin.")}</p></section>
    <section class="card">${head('scale', T('Vücut'))}<div class="fields" style="margin-bottom:12px">
      <div class="field"><label for="hWeight">${T('Bugünkü kilo')}</label><div class="money"><input id="hWeight" data-h="weight" inputmode="decimal" placeholder="${lw ? nf1.format(lw.v) : T('ör. 78,5')}" value="${d.weight != null ? inNum(d.weight) : ''}"><span>kg</span></div></div>
      <div class="field"><label for="hSleep">${T('Dün gece uyku')}</label><div class="money"><input id="hSleep" data-h="sleep" inputmode="decimal" placeholder="${T('ör. 7,5')}" value="${d.sleepM != null ? inNum(Math.round(d.sleepM / 6) / 10) : ''}"><span>${T('sa')}</span></div></div></div>
      <div class="kv"><div><span>${T('Son kilo')}</span><b>${lw ? nf1.format(lw.v) + ' kg' : '–'}</b></div><div><span>BMI</span><b>${b ? nf1.format(b) : '–'} ${b ? `<span class="chip ${bcc}">${bc}</span>` : ''}</b></div><div><span>${T('Hedefe kalan')}</span><b>${lw && gw ? (lw.v - gw > 0 ? '−' : '+') + nf1.format(Math.abs(lw.v - gw)) + ' kg' : '–'}</b></div></div>
      ${wSeries.length ? `<div style="margin-top:10px">${lineChart(wSeries, { label: T('Kilo'), fmt: (v) => nf1.format(v), goal: gw || undefined, min: gw || undefined, max: gw || undefined })}</div>` : `<p class="note">${T('Kilonu girdikçe grafiğin burada oluşur.')}${D.health.height ? '' : ' ' + T("BMI için boyunu Ayarlar → Sağlık'a gir.")}</p>`}</section>
    <section class="card">${head('pulse', T('Uyku, adım, nabız, stres'), `<span class="sub">${D.health.lastImport ? T('aktarım: {d}', { d: new Date(D.health.lastImport).toLocaleDateString(LOC) }) : ''}</span>`)}
      <div class="metrics">
        <div class="metric"><div class="mh"><span>${T('Uyku')}</span><small>${slp ? ago(slp.i) : ''}</small></div><b>${slp ? nf1.format(slp.v / 60) : '–'}<small>${T('saat')}</small></b>${barChart(series('sleep', 14, (v) => v / 60), { w: 170, label: T('Uyku'), goal: 7, fmt: (v) => v.toFixed(0) })}</div>
        <div class="metric"><div class="mh"><span>${T('Adım')}</span><small>${stp ? ago(stp.i) : ''}</small></div><b>${stp ? nf0.format(stp.v) : '–'}</b>${barChart(series('steps', 14), { w: 170, label: T('Adım'), goal: 8000, fmt: (v) => (v >= 1000 ? Math.round(v / 1000) + T('b') : Math.round(v)) })}</div>
        <div class="metric"><div class="mh"><span>${T('Ortalama nabız')}</span><small>${hr ? ago(hr.i) : ''}</small></div><b>${hr ? Math.round(hr.v) : '–'}<small>bpm</small></b>${lineChart(series('hr', 14), { w: 170, label: T('Nabız'), band: [60, 100] })}<div class="note" style="margin:2px 0 0">${hrMin ? T('En düşük: {n} bpm', { n: Math.round(hrMin.v) }) : ''}</div></div>
        <div class="metric"><div class="mh"><span>${T('Stres')}</span><small>${str ? ago(str.i) : ''}</small></div><b>${str ? Math.round(str.v) : '–'}<small>${str ? stressLbl(str.v) : ''}</small></b>${lineChart(series('stress', 14), { w: 170, label: T('Stres'), min: 0 })}</div></div>
      <details class="fold"><summary>${T('Bugünü elle gir')}</summary><div class="fields">
        <div class="field"><label for="hSteps">${T('Adım')}</label><div class="money"><input id="hSteps" data-h="steps" inputmode="numeric" value="${d.steps != null ? d.steps : ''}"></div></div>
        <div class="field"><label for="hHr">${T('Nabız')}</label><div class="money"><input id="hHr" data-h="hr" inputmode="numeric" value="${d.hr != null ? Math.round(d.hr) : ''}"><span>bpm</span></div></div>
        <div class="field"><label for="hStress">${T('Stres (0–100)')}</label><div class="money"><input id="hStress" data-h="stress" inputmode="numeric" value="${d.stress != null ? Math.round(d.stress) : ''}"></div></div></div></details></section>
    <button type="button" class="card tight pline" data-act="openSettings" data-sec="saglik"><span class="ico">${ico('upload')}</span><span class="t">${T('Samsung Health verilerini aktar')}<small style="display:block;font-weight:500;color:var(--ink-3);font-size:0.78rem">${D.health.lastImport ? T('aktarım: {d}', { d: new Date(D.health.lastImport).toLocaleDateString(LOC) }) : T('Ayarlar → Sağlık')}</small></span>${ico('right')}</button>`;
}
function samsungCard() {
  return `<section class="card import-box">${head('upload', T('Samsung Health verilerini aktar'))}
      <p class="note" style="margin:0">${T("Galaxy Watch'ın ölçtüğü nabız, stres, adım, uyku ve kilo verileri buraya gelir. Dosyalar telefonunda işlenir; sadece günlük özetler kaydedilir.")}</p>
      <details class="fold"><summary>${T('Nasıl yapılır?')}</summary><ol><li>${T('Samsung Health → sağ üstteki menü → Ayarlar.')}</li><li>${T('Kişisel verileri indir → İndir → hesabını doğrula.')}</li><li>${T('Dosyalarım → İndirilenler → Samsung Health klasörünü aç.')}</li><li>${T('Klasöre uzun bas → Sıkıştır (.zip). İstersen içindeki CSV dosyalarını da seçebilirsin.')}</li><li>${T('Aşağıdaki düğmeyle zip dosyasını ya da CSV dosyalarını seç.')}</li></ol></details>
      <label class="btn filebtn">${ico('upload')}${T('ZIP ya da CSV seç')}<input type="file" id="shFile" accept=".zip,.csv,application/zip,text/csv" multiple aria-label="${T('Samsung Health dosyalarını seç')}"></label>
      ${U.shMsg ? `<div class="status-msg ${U.shErr ? 'err' : ''}">${esc(U.shMsg)}</div>` : ''}</section>`;
}

// ---------- Samsung Health import (ported) ----------
function tableOf(text) {
  const rows = parseCSV(text); if (rows.length < 2) return [];
  let hi = 0;
  const looksHeader = (r) => r.some((c) => /(start_time|day_time|create_time)$/.test(c.trim()));
  if (!looksHeader(rows[0]) && rows[1] && looksHeader(rows[1])) hi = 1;
  const hdr = rows[hi].map((h) => h.trim().split('.').pop());
  const out = [];
  for (let i = hi + 1; i < rows.length; i++) { const r = rows[i]; if (r.length < 2) continue; const o = {}; hdr.forEach((h, j) => { if (h && o[h] == null) o[h] = r[j]; }); out.push(o); }
  return out;
}
function offMin(s) { const m = /([+-])(\d{2}):?(\d{2})/.exec(s || ''); return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : null; }
function tsOf(v) { if (!v) return null; v = String(v).trim(); if (/^\d{11,}$/.test(v)) return new Date(+v); const d = new Date(v.replace(' ', 'T') + (/[zZ+]|[+-]\d\d:?\d\d$/.test(v) ? '' : 'Z')); return isNaN(d) ? null : d; }
function keyAt(v, off) { const d = tsOf(v); if (!d) return null; if (off != null) return new Date(d.getTime() + off * 60000).toISOString().slice(0, 10); return keyOf(d); }
function dayKey(r, which) {
  if (which !== 'end' && r.day_time && /^\d{11,}$/.test(r.day_time)) return new Date(+r.day_time).toISOString().slice(0, 10);
  return keyAt(which === 'end' ? (r.end_time || r.start_time) : (r.start_time || r.create_time), offMin(r.time_offset));
}
function kindOf(name) {
  const n = name.toLowerCase().split('/').pop();
  if (!n.endsWith('.csv')) return null;
  if (/tracker\.heart_rate\.|health\.heart_rate\./.test(n)) return 'hr';
  if (/shealth\.stress\.\d|health\.stress\.\d/.test(n)) return 'stress';
  if (/health\.weight\./.test(n)) return 'weight';
  if (/step_daily_trend/.test(n)) return 'stepsDaily';
  if (/pedometer_day_summary/.test(n)) return 'stepsDaily';
  if (/pedometer_step_count/.test(n)) return 'stepsRaw';
  if (/shealth\.sleep\.\d|health\.sleep\.\d/.test(n)) return 'sleep';
  return null;
}
async function importSamsung(files) {
  U.shMsg = T('Dosyalar okunuyor…'); U.shErr = false; renderAll();
  const texts = [];
  try {
    for (const f of files) {
      if (/\.zip$/i.test(f.name) || (f.type || '').includes('zip')) {
        let JSZip; try { JSZip = await loadScript(JSZIP_URL, 'JSZip'); } catch (e) { U.shMsg = T('Zip açıcı yüklenemedi (internet gerekli). Klasördeki CSV dosyalarını doğrudan seçmeyi dene.'); U.shErr = true; renderAll(); return; }
        const z = await JSZip.loadAsync(f);
        const names = Object.keys(z.files).filter((n) => kindOf(n));
        for (const n of names) texts.push([kindOf(n), await z.files[n].async('string')]);
      } else if (kindOf(f.name)) texts.push([kindOf(f.name), await f.text()]);
    }
  } catch (e) { U.shMsg = T('Zip dosyası açılamadı. Klasördeki CSV dosyalarını doğrudan seçmeyi dene.'); U.shErr = true; renderAll(); return; }
  if (!texts.length) { U.shMsg = T('Tanınan bir Samsung Health dosyası bulunamadı. Dosya adları “com.samsung.” ile başlamalı ve .csv ile bitmeli.'); U.shErr = true; renderAll(); return; }
  const agg = {}; const A = (k) => agg[k] || (agg[k] = { hr: [], hrMin: [], stress: [], stepsD: 0, stepsR: 0, sleep: 0, weight: null, wT: 0 });
  let height = null;
  for (const [kind, txt] of texts) {
    const rows = tableOf(txt);
    for (const r of rows) {
      if (kind === 'sleep') { const k = dayKey(r, 'end'); if (!k) continue; const s = tsOf(r.start_time), e = tsOf(r.end_time); let m = num(r.sleep_duration); if (m == null && s && e) m = (e - s) / 60000; if (m && m > 0 && m < 1080) A(k).sleep += m; continue; }
      const k = dayKey(r); if (!k) continue;
      if (kind === 'hr') { const v = num(r.heart_rate); if (v && v > 25 && v < 230) { A(k).hr.push(v); const mn = num(r.heart_rate_min); A(k).hrMin.push(mn && mn > 25 ? mn : v); } }
      else if (kind === 'stress') { const v = num(r.score); if (v != null && v >= 0 && v <= 100) A(k).stress.push(v); }
      else if (kind === 'stepsDaily') { const v = num(r.count != null ? r.count : r.step_count); if (v != null && v > A(k).stepsD) A(k).stepsD = v; }
      else if (kind === 'stepsRaw') { const v = num(r.count); if (v) A(k).stepsR += v; }
      else if (kind === 'weight') { const v = num(r.weight); const t = (tsOf(r.start_time) || new Date(0)).getTime(); if (v && v > 25 && v < 300 && t >= A(k).wT) { A(k).weight = v; A(k).wT = t; } const h = num(r.height); if (h && h > 100 && h < 230) height = h; }
    }
  }
  const cutoff = keyOf(addDays(new Date(), -400));
  const n = { hr: 0, stress: 0, steps: 0, sleep: 0, weight: 0 };
  for (const k in agg) {
    if (k < cutoff) continue; const a = agg[k], p = {};
    if (a.hr.length) { p.hr = Math.round(a.hr.reduce((s, v) => s + v, 0) / a.hr.length); p.hrMin = Math.round(Math.min(...a.hrMin)); n.hr++; }
    if (a.stress.length) { p.stress = Math.round(a.stress.reduce((s, v) => s + v, 0) / a.stress.length); n.stress++; }
    const st = Math.max(a.stepsD, a.stepsR); if (st) { p.steps = Math.round(st); n.steps++; }
    if (a.sleep) { p.sleep = Math.round(a.sleep); n.sleep++; }
    if (a.weight && hd(k).weight == null) { p.weight = Math.round(a.weight * 10) / 10; n.weight++; }
    if (Object.keys(p).length) setH(k, p);
  }
  if (height && !D.health.height) D.health.height = Math.round(height);
  const cut = keyOf(addDays(new Date(), -400)); Object.keys(D.health.days).forEach((k) => { if (k < cut) delete D.health.days[k]; });
  D.health.lastImport = Date.now();
  const parts = [n.hr && T('{n} gün nabız', { n: n.hr }), n.stress && T('{n} gün stres', { n: n.stress }), n.steps && T('{n} gün adım', { n: n.steps }), n.sleep && T('{n} gece uyku', { n: n.sleep }), n.weight && T('{n} kilo ölçümü', { n: n.weight })].filter(Boolean);
  U.shMsg = parts.length ? T('Aktarıldı: {x}.', { x: parts.join(', ') }) : T('Dosyalar okundu ama son 400 güne ait ölçüm bulunamadı.');
  U.shErr = !parts.length; save(); renderAll();
}
