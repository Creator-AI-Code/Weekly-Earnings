# Proposal: `sadelik` (Momentum v2.0)

Based on `design/audit-sadelik.md`. Mockup: `design/mockup-sadelik.html`, shots in `design/shots/mock-*.png`.

**One sentence:** three tabs, one number per screen, one way to add things, and quarterly tools one tap away.

## 0. Principles applied

1. **Each screen answers one question.**
   - Bugün: "Bugün ne kadar harcayabilirim, yolunda mıyım, şimdi ne girmeliyim?"
   - Para: "Bu hafta para nereye gitti, elimde ne var?"
   - Yatırım: "Portföyüm ne durumda?"
2. **Every number lives in one place.** The spend number lives on Bugün, the weekly tax on Bugün's to-do card, and the quarterly tax in the Vergi hub.
3. **One add flow.** The FAB opens the expense sheet. Fuel, Uber expenses and receipts are options inside it, not separate doors.
4. **Uber mode.** While a shift is open, Bugün shows only shift things.
5. **No new data.** The one new field is `ui.modules`, and one value is relaxed: `trips[].kmStart` may be `null` until entered. See §8.

---

## 1. Navigation

### Tab bar (default for Emre)

```
[ Bugün ]   [ Para ]   [ Yatırım ]
```

- There are 3 tabs, each 1/3 of the width (≥ 120 px at 360). Each has an icon + label and is 64 px tall.
- When Gelişim or Sağlık is turned on in Modüller, its tab comes back in the original order. The maximum is 5 tabs.
- If Yatırım is also turned off, there are 2 tabs (Bugün, Para). The bar is never hidden.
- Swiping between tabs skips hidden tabs.
- If the stored tab (`adim-adim-v2:tab`) points to a hidden tab, open Bugün.
- **Header:** title on the left; one gear on the right (opens Ayarlar). The second "sliders" icon is removed. The sync chip shows only on an error or offline.

### FAB

- It shows on Bugün and Para only. It is 56 px, at the bottom right, 16 px above the tab bar.
- It opens **"Gider ekle"** directly. There is no picker grid any more.
- Content gets 88 px of bottom padding so the FAB never covers text (fixes A-14).
- In Uber mode the FAB hides. The shift card carries the actions.

### "Daha fazla" for quarterly tools

Quarterly items live in the **Vergi hub** (Para → Vergi). It is a list of rows, and each opens a full page:

| Row (TR) | Opens | Badge |
|---|---|---|
| Haftalık aktarımlar | weekly transfers + set-aside log + add form | `1/4` |
| Uber giderleri | expense list (fixed row layout) + Ekle | `$351` |
| Araç ve yenilemeler | car details + renewals | `BHSL 11 gün` (when ≤ 30 d) |
| Logbook | current logbook, trips list, Gösterge oku, Logbook dosyası, end/cancel | `4/12 hafta` |
| Uber özetini yükle | PDF import sheet | `Q1 yok` until imported |
| BAS rakamları | G1 / 1A / 1B / profit breakdown + exact-figure inputs | `Tahmin` / `Kesin` |
| Mali yıl | FY summary | – |
| Ana iş giderleri | list | count (shown only when > 0) |

There is no separate "Daha fazla" tab. Emre already thinks of "Vergi" as the place for this. One home for quarterly work is easier to find than a generic "More".

---

## 2. Settings → **Modüller** (new)

It is the first row of Ayarlar, with the subtitle "Para, Uber, Yatırım açık · 2 kapalı".

```
Ayarlar › Modüller

Sadece kullandıklarını aç. Kapattığın modülün verisi silinmez,
senkron devam eder. Tekrar açınca her şey yerinde.

[wallet]  Para                       Her zaman açık        (locked, no switch)
          Bütçe, hesaplar, kumbaralar
[car]     Uber araçları              [■■ on ]
          Vardiya, logbook, vergi, BAS
[trend]   Yatırım                    [■■ on ]
          Portföy ve takip listesi
[sprout]  Gelişim                    [ off ■]
          Alışkanlık, görev, kitap, günlük
[heart]   Sağlık                     [ off ■]
          Sigara, alkol, uyku, kilo
```

Rules:

- **Defaults:**
  - `ui.modules` missing → `{ uber: true, yatirim: true, gelisim: false, saglik: false }`.
  - Old backups and old app versions simply don't have the key. Old versions ignore it, so it is backward compatible.
- **Turning a module off:**
  - Hides its tab, its Bugün lines, its FAB options and its settings section.
  - Pauses its notifications: Gelişim → `habit` and `evening`; Uber → `bas`, `taxweek` and `car`.
  - It **never** touches `growth` / `health` / `invest` data or their sync.
- **Turning a module on:** the tab comes back immediately, with a toast "Gelişim açıldı. Sekmesi altta."
- **Toggling off needs no confirmation** because nothing is lost. Instead it shows the toast "Sağlık gizlendi. Verilerin duruyor." with a **Geri al** link (4 s).
- **Uber araçları off:**
  - Hides the shift card, the Vergi segment, the "Uber için" toggle and the Uber fields in Para·Hafta.
  - This is for a future non-driving period. Default on.
- **Switch rows:** 56 px tall. The whole row is the tap target, `role="switch"` with `aria-checked`, and the label is the module name.

---

## 3. Bugün (Today)

### 3a. Normal (no shift open), at most 3 blocks above the fold at 360×780

```
┌ Bugün                                        ⚙ ┐
│                                                │
│ ┌ HERO (accent fill) ────────────────────────┐ │
│ │ Bugün harcayabileceğin                     │ │
│ │ $70                                         │ │
│ │ Kahve olur, dışarıda yemek de.             │ │
│ │ Hafta: $604 kaldı · $500 hedef ayrıldı     │ │
│ │                          Nasıl hesaplandı ›│ │
│ └────────────────────────────────────────────┘ │
│ ┌ UBER (surface) ────────────────────────────┐ │
│ │ 🚗 Uber · bu hafta $310 · 2 vardiya · 333 km│ │
│ │ [ Vardiyaya başla ]  (tonal, full width)   │ │
│ └────────────────────────────────────────────┘ │
│ ┌ BU HAFTA YAPILACAKLAR ─────────────────────┐ │
│ │ Vergiye $111,63 ayır          [Aktardım]   │ │
│ │ BHSL 8 Kas'ta bitiyor · $65            ›   │ │
│ │ BAS (Q1) 11 Kas · 14 gün               ›   │ │
│ └────────────────────────────────────────────┘ │
│                                         ( + )  │
└ Bugün | Para | Yatırım ─────────────────────── ┘
```

1. **Hero (one number).**
   - The value is `weekPlan().perDay` when a target is set; otherwise it is `safeToSpend().perDay`. This fixes A-1: the $121/$70 conflict goes away.
   - The label says "Bugün harcayabileceğin". The number is per **day**, because that is the decision Emre makes at the counter.
   - The subline is the advice line from `todayAdvice()`, plus the week context.
   - Over budget:
     - The value shows "$0" in white on the accent fill, never red on red.
     - The status line reads "Bu hafta hedefin $X gerisindesin · ~N saat Uber" with an icon, so it doesn't rely on colour alone.
   - **Tap → "Nasıl hesaplandı?" sheet:**
     - the old plan card bullets (remaining Uber plan ≈ $245, pot per-week needs, accounts coverage note, $/h);
     - the meter "Plan tutarsa $848";
     - an edit-target link and "Claude'a sor".
2. **Uber card.**
   - It shows a summary line plus one **tonal** button "Vardiyaya başla". Tonal, because the filled primary off-shift is the FAB (one filled primary per screen).
   - The logbook progress goes to the subline only when a logbook is active: "Logbook 4/12".
3. **"Bu hafta" to-do card.**
   - It has at most 3 actionable rows, sorted by urgency:
     - weekly tax (Aktardım is the only button);
     - renewals due ≤ 14 days;
     - BAS ≤ 21 days;
     - FY odometer (June).
   - Empty state: the card hides. When everything is done, it shows one line instead: "Bu hafta her şey tamam ✓".
4. **End-of-day card** (after 18:00, replaces the evening review).
   - Content: "Bugün: $19,50 harcadın · 1 vardiya · 152 km. Yarın günde $72."
   - Below the fold is fine. It is the peak-end moment.
5. **Gelişim on:** one compact line "Alışkanlıklar 2/3 ›" under the to-do card. **Sağlık on:** one line "Sigara bugün 2 · + ›". Never full cards.

### 3b. Uber mode (shift open)

```
┌ Bugün · Uber'desin                           ⚙ ┐
│ ┌ SHIFT (accent fill) ───────────────────────┐ │
│ │ ● Uber'desin                               │ │
│ │ 1 sa 12 dk                                  │ │
│ │ 17:40'tan beri · başlangıç 154.600 km      │ │
│ └────────────────────────────────────────────┘ │
│  [⛽ Yakıt fişi]  [🧾 Gider]  [⌖ Gösterge]     │  ← tonal chips, 48 px
│ ┌ Bugün harcayabileceğin  $70   ›  (1 line) ┐ │
│                                                │
│ [        Vardiyayı bitir        ]  ← filled,   │
│                                    thumb zone  │
└ Bugün | Para | Yatırım ─────────────────────── ┘
```

- **Start = 1 tap.** "Vardiyaya başla" creates the shift at `now`.
  - Its `kmStart` is **prefilled from the last odometer reading only if** no logbook is active.
  - With a logbook active, the shift card shows a pending chip "Başlangıç km'si gir" that opens a numeric keypad, so Emre types it while parked.
  - If the start km is still missing when he ends, the end sheet asks for both readings.
  - (Today it takes 3 actions: the sheet, the km and Başla.)
- **End = 1 tap.** "Vardiyayı bitir" records the end time immediately, then shows the **shift-done sheet**:
  - it summarises the shift and has a numeric keypad for the end km;
  - "Kaydet" is optional now, and later as a pending chip.
  - The time is exact because it is captured on the tap. The km is typed when it's safe.
- **Celebration (≤ 600 ms):**
  - On end: a check pop + "Vardiya bitti: 4 sa 10 dk · 152 km".
  - When the weekly target is reached: a gold meter fill + "Bu haftanın hedefi tamam!" once.
  - With `prefers-reduced-motion`: no animation, text only.
- **Delete shift** moves to the logbook trips list, using the existing arm-to-confirm.

---

## 4. Gider ekle (the only add flow)

FAB → a sheet that opens at about 85% height with the keypad up.

```
Gider ekle                                    ✕
            $ 14,00                    [📷 Fiş]
Son:   (Woolworths) (Ampol) (Öğle yemeği)        ← recent names (sets name+cat)
Kategori: (Market)(Kahve)(Yemek)(Yakıt ⛽)(Ulaşım)(Fatura)(Eğlence)(Diğer)
[ Uber için ]  [ Ana hesap ▾ ]  Daha fazla ›     ← chips/toggles
[ 1 ][ 2 ][ 3 ]
[ 4 ][ 5 ][ 6 ]
[ 7 ][ 8 ][ 9 ]
[ , ][ 0 ][ ⌫ ]
[             Kaydet             ]               ← filled, bottom
```

- **Taps:** FAB (1) → type the amount (digits) → category or recent chip (2) → Kaydet (3). **3 taps.**
- **Recent-name chips:** the last 3 unique names, from `pastNames()`. A recent chip sets both the name and the category.
- **Yakıt chip:**
  - It turns on **Uber için** automatically, which is the existing `FUEL_CAT` behaviour.
  - It reveals optional "Gösterge km" and "Litre" inside "Daha fazla".
- **Uber için toggle on, non-fuel category:**
  - The category chips swap to the Uber categories (Servis, Lastik, Yıkama, Telefon, Otopark, Sigorta, Rego, Diğer).
  - GST and the business-use % come from `catDefaults()`, shown read-only under "Daha fazla".
  - This replaces the separate "Uber gideri" sheet.
- **Fiş button:** opens the camera/photo, then OCR prefills the amount, the name and the GST in **this same sheet**. One sheet instead of two.
- **"Daha fazla ›"** expands to: Tarih (default today), Not, Tek seferlik, GST and business-use % (Uber only), and km/litre (fuel only).
- **Validation:**
  - Kaydet is disabled until the amount is > 0. The error text sits under the amount and does not rely on colour alone.
  - Success: the sheet closes, with the toast "Kaydedildi: $14 · Yemek" + **Geri al**.
- The **system keyboard is never opened** for the amount: the custom keypad gives 56 px keys. Name entry (optional) uses the system keyboard and only appears under "Daha fazla › Not / ad".

---

## 5. Para

Segments go from 5 to **4**: `Hafta · Hesaplar · Geçmiş · Vergi`, each 48 px tall. Rapor merges into Geçmiş, and Vergi hides when Uber araçları is off.

### 5a. Hafta

```
‹  26 Eki – 1 Kas · bu hafta  ›
┌ Gelir $1.260 │ Gider $656 │ Kalan $604 ┐   ← strip, tap → Haftanın dökümü sheet
┌ Uber  $310 · 11 sa                  Düzenle ┐ ← one row, expands inline (2 fields)
Harcamalar                               $80,90
  Pzt 26 Eki                              $61,40 ›
  Sal 27 Eki · yakıt $64,20                $5,50 ›
  Çar 28 Eki · bugün                        $14  ˅
     Öğle yemeği · Yemek                    $14
  Per · Cum · Cmt · Paz  (empty, muted, not tappable)
```

- The hero "Elinde kalan" is gone (A-4). The number moves into the strip as "Kalan".
- There is no inline add form in the day rows (A-9a goes away). Adding goes through the FAB.
- Empty future days collapse into one muted line.
- **Haftanın dökümü sheet:**
  - the waterfall;
  - the hourly-rate table;
  - the "Nakit iş saati" field, which is visible in Hafta only if it was used in the last 8 weeks;
  - the week note.
- The tax box is removed here; it lives on Bugün and in Vergi (A-3).
- Empty state (no entries this week): "Bu hafta henüz gider yok. + ile ilk gideri ekle." with a CTA button "Gider ekle".

### 5b. Hesaplar

- **Hero:**
  - "Serbest para $5.974". This is the one number that matters here: bank − GST − tax − pots.
  - Subline: "Bankada $8.090 · vergi ve kumbaralar ayrıldı". Tap → the breakdown.
- **Accounts:** a list of 4 rows (name, "dün", balance). Tap → the update sheet.
- **Pots:** compact rows with a name, a progress bar, "$69/hafta" and "%40". Tap → the pot sheet (Ekle, Çek, Satın aldım, Düzenle, Hareketler).
- "Hesap ekle" and "Kumbara aç" are ghost buttons at the end of each list.

### 5c. Geçmiş (now includes Rapor)

The order, top to bottom:

1. "Bu hafta vs geçen hafta" headline + donut (from Rapor). The headline shows only from Sunday, or for past weeks (A-18).
2. The 12-month grid.
3. The selected month's weeks.
4. Averages.
5. "Son 8 hafta" charts, collapsed.
6. Insights (moved from Today), collapsed.

### 5d. Vergi (hub)

```
‹  Q2 2026–27 · Eki–Ara  ›
┌ Bu çeyrek kenara ayır  $895,90 ┐  accent text, surface card
│ Ayrılan $150 · Kalan $745,90  │
│ ███░░░░░░░ %17                 │
│ BAS (Q1) son gün 11 Kas · 14 gün│
└────────────────────────────────┘
Haftalık aktarımlar              1/4  ›
Uber giderleri                  $351  ›
Araç ve yenilemeler     BHSL 11 gün  ›
Logbook                  4/12 hafta  ›
Uber özetini yükle            Tahmin  ›
BAS rakamları (G1 · 1A · 1B)          ›
Mali yıl 2026–27                      ›
```

- Fits in 1 screen at 360×780.
- **Uber giderleri page:** the rows use a two-line layout:
  - line 1: name + amount;
  - line 2: date · chips.
  - The name never shares a line with the chips (fixes A-9b).

---

## 6. Yatırım (light touch)

- Hero unchanged.
- The status chips collapse into one line: "17:40 güncellendi · kur 1,55 · ↻ Yenile".
- "Ekle" becomes ghost, in the accent colour (no purple).
- The watchlist and the Stake import become rows that open sheets.
- Empty state: "Henüz varlık yok. İlk hisseni ekle ya da Stake'ten aktar." with the CTA "Varlık ekle".

---

## 7. Settings structure

| Order | Section | Contains |
|---|---|---|
| 1 | **Modüller** (new) | the toggles above |
| 2 | Genel | Dil, Tema. "Bugün kartları" is removed. |
| 3 | Hesap ve senkron | unchanged |
| 4 | Bildirimler | hides the reminders of hidden modules |
| 5 | Para ve hedef | Haftalık birikim hedefi, start date, **Uber planı as chips** (see below), Gelir (salary, job hours), Tekrarlayan giderler |
| 6 | Uber ve vergi | sabit masraflar, yılda kaç hafta, yakıt tahmini, nakit iş, hastane sigortası, logbook %, kategori varsayılanları. BAS dates fixed to 11 Kas / 28 Şub / 12 May / 25 Ağu (A-10). |
| 7 | Yatırım | Finnhub key, show on Today |
| 8 | Gelişim / Sağlık | only when the module is on |
| 9 | Yedek | unchanged |

**Uber planı as chips:**
- A row of day chips `Pzt Sal Çar Per Cum Cmt Paz`. Tap a day → part chips `Sabah · Akşam · Tüm gün` + hour chips `3 · 4 · 5 · 6 · 7 · 8`.
- This replaces 7 selects + 7 inputs and stores the same `uberPlan` shape.

---

## 8. Data impact (for `momentum-database` check)

| Change | Shape | Back-compat |
|---|---|---|
| `ui.modules` `{ uber, yatirim, gelisim, saglik }` booleans | new optional key in the `ui` area | A missing key means the defaults. Old versions ignore it. Synced with `ui` (last writer wins), like the theme. |
| `trips[].kmStart` may be `null` while a shift is open (1-tap start with a logbook) | value relaxation | `odoReadings()` and `shiftKm()` already guard `!= null`. **Check:** an older app version on another device that ends a shift with a `null` kmStart. Its `submitShift('end')` compares `km < o.kmStart`, and `null` coerces to 0, so it passes. That is safe, but the logbook would lose that shift's km until it is fixed. Acceptable; flag it in the release notes. |
| `ui.hiddenCards` / `shownCards` | no longer used by the UI | Keep the keys (don't drop them), so an old version still reads them. |

No Supabase schema, RLS or storage change.

---

## 9. Design tokens

### Colour 60 / 30 / 10 (light · dark)

| Role | Share | Light | Dark | Contrast |
|---|---|---|---|---|
| Background | 60% | `--bg #f4eee6` | `#1b1520` | – |
| Surface (cards, sheets) | | `--surface #fbf8f3` | `#251c2b` | – |
| Surface-2 (tonal buttons, strips) | | `#efe7dd` | `#2e2435` | – |
| Text 100% (headings, values) | 30% | `--ink #1f1a17` | `#f3edea` | 14.9 / 15.4 |
| Text 80% (body) | | `--ink-2 #544a43` | `#d0c5cc` | 7.5 / 9.8 |
| Text 65% (secondary) | | `--ink-3 #685d55` | `#a99da8` | 5.6 / 6.3 |
| **Accent** (one: bordo) | 10% | `--para #7b1e3c` (text on surface), fill `#7b1e3c` + ink `#ffffff` | text `#cd917f`, fill `#7b1e3c` + ink `#f8ece6` | 9.5 / 10.0 · 6.2 / 8.7 |
| **Input border (new)** | | `#8a7d72` | `#7a6b80` | 3.8 / 3.3 (≥ 3:1, fixes A-11) |
| Gain (meaning only) | | `#376a30` | `#9fcf82` | 6.1 / 9.2 |
| Loss / error (meaning only) | | `#a93d28` | `#ff8a66` | 5.9 / 7.1 |
| Gold (milestone only) | | `#7f5c14` text, `#c2a15a` meter | `#ddb25a` | celebration only |

Rules:

- **Accent use.** Use bordo only for: the hero fill, the one filled primary button, key numbers and the selected tab/segment.
- **Retired colours.** Purple, steel blue and navy are retired from shared UI. Each survives only inside its own module's tab when that module is on; the Yatırım hero keeps navy as its identity. The "+" counters and the Yatırım "Ekle" use the accent or tonal.
- **Red and green** mean only over/under, loss/gain or error. Each is always paired with an icon or sign (▲▼, −, ✓), never colour alone.

### Spacing (8-pt)

`4 · 8 · 12 · 16 · 24 · 32 · 48`

- Screen side padding: 16
- Card padding: 16 (20 on the hero)
- Gap between items inside a card: 8–12
- Gap between cards: 16. Between groups (section headers): 24–32.
- Bottom padding of scroll content: 88 (FAB clearance).

### Type (4 sizes, 2 weights)

Fonts stay Bricolage Grotesque (display) and Figtree (body).

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `--t-hero` | 40 / 44 | 700 | the one hero number per screen |
| `--t-title` | 18 / 24 | 700 | card titles, sheet titles, values in rows |
| `--t-body` | 15 / 22 | 400 | body, row labels, buttons (700) |
| `--t-cap` | 13 / 18 | 400 | captions, sublines, chips (700 for chips) |

- Money values use `font-variant-numeric: tabular-nums`.
- The value is always larger than its label: a value is 18 or 40, its label 13.
- Sizes are in `rem`, so the Android font scale is respected. At 130% scale the hero shrinks via the existing `fitText`, and nothing clips.

### Radii

| Element | Radius |
|---|---|
| Chip | 999 |
| Button | 14 |
| Input | 12 |
| Card | 20 |
| Hero | 24 |
| Sheet top | 24 |

### Buttons

| Kind | Look | Where |
|---|---|---|
| Filled | accent fill, 52 px tall, full width in sheets | exactly **one per screen**: FAB on Bugün/Para; "Vardiyayı bitir" in Uber mode; "Kaydet" in sheets |
| Tonal | surface-2 fill, ink text, 48 px | Vardiyaya başla (off-shift), Aktardım, chips |
| Ghost | no fill, accent text, 48 px | add-to-list, secondary links |
| Destructive | ghost with loss text | always arm-to-confirm or a confirm sheet, never next to the primary |

- Tap targets are ≥ 48×48 with ≥ 8 px between them. Segments are 48 px tall (fixes A-17).

---

## 10. Copy (TR, casual, verbs on buttons)

| Where | Old | New |
|---|---|---|
| Hero label | Bu hafta harcayabileceğin | **Bugün harcayabileceğin** |
| Hero link (whole hero is the button) | – | Nasıl? › (aria: "Nasıl hesaplandı?") |
| Hero over budget | Bu hafta bütçeyi aştın | Hedefin $X gerisindesin · ~N saat Uber |
| Shift start | Uber'e başla | **Vardiyaya başla** |
| Shift on title | Uber'desin | Uber'desin (keep) |
| Shift end | Bitir | **Vardiyayı bitir** |
| Pending km chip | – | Başlangıç km'si gir · Bitiş km'si gir |
| Shift done toast | Vardiya kaydedildi: … | Vardiya bitti: {d} · {k} km |
| Target reached | – | Bu haftanın hedefi tamam! |
| FAB aria-label | Hızlı kayıt | Gider ekle |
| Sheet title | Hızlı kayıt / Harcama | **Gider ekle** |
| Toggle | Uber gideri (FAB) | **Uber için** |
| Expense save | Bugüne kaydet | **Kaydet** |
| Expense toast | – | Kaydedildi: {x} · {kat} · Geri al |
| FAB "Uber vardiyası" (earnings) | Uber vardiyası / Vardiyayı haftaya ekle | removed; in Para·Hafta: **Uber kazancı** · Düzenle |
| To-do card title | – | **Bu hafta yapılacaklar** |
| To-do tax row | Vergi için ayır: $X bu hafta | Vergiye {x} ayır · [Aktardım] |
| To-do all done | – | Bu hafta her şey tamam ✓ |
| End-of-day | Akşam değerlendirmesi | **Günün özeti** |
| Para strip | Elinde kalan | Gelir · Gider · Kalan |
| Hesaplar hero | Serbest para (in breakdown) | **Serbest para** |
| Vergi hub card | Kenara ayrılması gereken | **Bu çeyrek kenara ayır** |
| Vergi rows | – | Haftalık aktarımlar · Uber giderleri · Araç ve yenilemeler · Logbook · Uber özetini yükle · BAS rakamları · Mali yıl |
| Settings row | – | **Modüller** – "Sadece kullandıklarını aç. Kapattığın modülün verisi silinmez." |
| Module off toast | – | {Modül} gizlendi. Verilerin duruyor. · Geri al |
| Module on toast | – | {Modül} açıldı. Sekmesi altta. |
| Para empty week | – | Bu hafta henüz gider yok. + ile ilk gideri ekle. · [Gider ekle] |
| BAS settings note | 28 Ekim, 28 Şubat, 28 Nisan, 28 Temmuz | 11 Kasım, 28 Şubat, 12 Mayıs, 25 Ağustos (kendin verirsen) |

Every new string needs an EN entry in `src/8-en.js`.

---

## 11. Acceptance criteria (testable)

All at 360×780 and 412×915, light + dark, TR + EN, clock fixed, with the invented seed from the audit.

**Navigation / Modüller**

1. On a fresh install, and on any data without `ui.modules`, the tab bar shows exactly 3 tabs: Bugün, Para, Yatırım.
2. Turning Gelişim on in Ayarlar → Modüller shows its tab without a reload. Turning it off hides it. `JSON.stringify(state.growth)` is byte-identical before and after both toggles.
3. Turning a module off removes its FAB options, Bugün lines and settings section. Its notifications (`habit` and `evening` for Gelişim) are not scheduled while it is off.
4. Stored tab `gelisim` with Gelişim off → the app opens on Bugün, with no console error.
5. Importing an old backup with `growth` and `health` data works unchanged, and the modules stay as they were.

**Bugün**

6. Normal mode: ≤ 3 top-level blocks start above the tab bar at 360×780, and the Uber card's primary button is fully visible without scrolling.
7. Exactly one money number on Bugün is ≥ 32 px. The hero value equals `weekPlan().perDay` (target set) or `safeToSpend().perDay` (no target). No other element shows a different per-day amount.
8. The weekly tax amount appears once on Bugün, and nowhere in Para·Hafta.
9. Uber mode (open shift): the screen shows the shift card, the action chips, a one-line spend row and "Vardiyayı bitir". The FAB is hidden, and "Vardiyayı bitir" sits in the bottom third of the viewport (top ≥ 520 px at 780).
10. No text is overlapped by the FAB at any scroll position. There is ≥ 88 px of bottom padding.

**Flows**

11. Add expense: FAB → digits → category chip → Kaydet = **3 taps** (digits excluded). The entry lands in today's `daily` with the chosen category.
12. A fuel expense via the Yakıt chip lands as `cat: 'yakit'` (it shows in Vergi as fuel). There is no separate "Uber gideri" or "Fiş tara" entry in the FAB.
13. Start shift = **1 tap** from Bugün (no sheet). End shift = **1 tap**, which records `end` and then shows the shift-done sheet with the km keypad. A shift with a missing km shows a pending chip until the km is entered.
14. The end-shift celebration lasts ≤ 600 ms and is skipped under `prefers-reduced-motion`.

**Para**

15. Para has 4 segments, each ≥ 48 px tall. No "Elinde kalan" hero exists in Hafta.
16. Para·Vergi at 360×780 is ≤ 1.2 screens tall (≤ 940 px), and every quarterly tool is reachable in 1 tap from it.
17. No horizontal clipping at 360: every button's right edge is ≤ its card's inner edge (fixes "Kaydet" and the Vergi hero tile). Uber expense names never wrap mid-word.

**Visual / a11y**

18. `tests/contrast-scan.js` reports 0 issues in light + dark, **and** the extended scan covers open sheets and input borders (≥ 3:1).
19. Each of Bugün, Para·Hafta and Vergi hub uses ≤ 4 distinct font sizes and ≤ 2 weights (DOM scan of the computed `font-size` / `font-weight` of text nodes).
20. Every tappable element in `#view`, `#tabs` and the sheets is ≥ 48×48 CSS px, except inline text links inside paragraphs.
21. Every list (expenses, accounts, pots, holdings, Uber expenses, trips) has an empty state with one sentence and one CTA.
22. At 130% font scale nothing clips horizontally at 360.
23. All suites still end with `ALL PASS`, and `v1smoke` shows `errors []`.

---

## 12. Releases: small and ordered (one screen per release)

| # | Version | Scope | Acceptance criteria | Why this order |
|---|---|---|---|---|
| R0 | 1.x hotfix | Fix the 360 px clipping (Kaydet, Vergi hero tile, Uber expense name wrap), the BAS dates copy, and the input border contrast | 17, 18 (borders) | Bugs; no design debate needed |
| R1 | **2.0.0** | **Modüller + 3-tab nav**: `ui.modules`, the hidden tabs, FAB and Bugün lines filtered by module, notifications paused, header single gear | 1–5 | The approved decision and the biggest visible win |
| R2 | 2.1.0 | **Bugün**: the one-number hero + "Nasıl hesaplandı" sheet, the Uber card up, the "Bu hafta yapılacaklar" card, the end-of-day card, removal of the "Bugün kartları" setting | 6–8, 10 | The daily screen |
| R3 | 2.2.0 | **Gider ekle** sheet (keypad, chips, Uber için, Fiş inside) and the FAB opening it directly | 11, 12 | The most frequent input |
| R4 | 2.3.0 | **Uber mode** + 1-tap start/end + pending km + celebration | 9, 13, 14 | Needs R2's card. Data check on `kmStart: null` first. |
| R5 | 2.4.0 | **Para·Hafta + Geçmiş** (strip, collapsed Uber row, no inline form, Rapor merged) | 15 | |
| R6 | 2.5.0 | **Vergi hub** + sub-pages | 16 | Quarterly; BAS Q1 is due 11 Nov, so ship it after that date to avoid moving things mid-lodgement |
| R7 | 2.6.0 | **Hesaplar** (Serbest para hero, compact pots) + **Yatırım** light touch | 21 | |
| R8 | 2.7.0 | **Settings regroup** + Uber plan chips + type/colour token pass | 19, 20, 22 | Pure polish, done last |

Each release ships with a fresh run of all suites + screenshots, reviewed by an agent other than the builder (CLAUDE.md flow).

---

## 13. Open questions for Emre

1. **Hero number:** is a **daily** amount ("Bugün $70") right, or do you think in **weekly** terms ("Bu hafta $604")? The proposal is daily, with the weekly figure in the subline.
2. **km at shift start:** with a logbook running, is it OK to tap "Vardiyaya başla" first and type the km while waiting for the first ride? Or do you want the km asked up front, as it is now?
3. **Uber araçları module:** should it be toggleable at all, or always on while you drive?
4. **Nakit iş (cash hours):** do you still use it? If not, it moves fully into the döküm sheet.
5. **Vergi hub timing:** do you want R6 before or after you lodge the Q1 BAS (due 11 Nov)?
