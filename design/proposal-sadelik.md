# Proposal: `sadelik` (Momentum v2.0)

Based on `design/audit-sadelik.md`. Mockup: `design/mockup-sadelik.html` (palette A, light by default; the button toggles dark).

Images:
- `design/shots/mock-overview.png`: top row light, bottom row dark;
- `design/shots/palette-options.png`;
- `design/shots/gestures.png`.

**Revision 2 (28 Oct):** Emre's answers, start km entered first, cash hours in the Gelir row, palette section §9a, gestures section §9b, and revised acceptance criteria and releases. **Not approved yet.**

**One sentence:** three tabs, one number per screen, one way to add things, and quarterly tools one tap away.

## 0. Principles applied

1. **Each screen answers one question.**
   - Bugün: "Bugün ne kadar harcayabilirim, yolunda mıyım, şimdi ne girmeliyim?"
   - Para: "Bu hafta para nereye gitti, elimde ne var?"
   - Yatırım: "Portföyüm ne durumda?"
2. **Every number lives in one place.** The spend number lives on Bugün, the weekly tax on Bugün's to-do card, and the quarterly tax in the Vergi hub.
3. **One add flow.** The FAB opens the expense sheet. Fuel, Uber expenses and receipts are options inside it, not separate doors.
4. **Uber mode.** While a shift is open, Bugün shows only shift things.
5. **No new data.** The one new field is `ui.modules` (see §8). Trips keep their current shape: the start km is entered when the shift starts.
6. **Gestures speed things up, but nothing depends on them.** Every gesture has a visible button that does the same thing (see §9b).

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

- **Start = km first, then the shift opens** (Emre's decision, 28 Oct). See mockup frame 2b.
  1. Tapping "Vardiyaya başla" opens the **"Vardiyaya başla" sheet**, with a custom numeric keypad already up.
  2. The **Başlangıç göstergesi** field is **prefilled with the last odometer reading** (`lastOdo()`). Under it, a hint: "Son okuma 154.571 km (dün 23:10)". If Emre changes the value, a line shows the gap: "+29 km özel kullanım".
  3. **"Başlat"** (filled) saves `{ start: now, kmStart }` and opens Uber mode.
     - If the km hasn't changed, that is **2 taps**: Vardiyaya başla → Başlat.
     - If he types it, the digits come between the two taps.
  4. **"Saati değiştir"** is a small link that reveals the time field. It is only for correcting a late start.
  5. Validation is the existing `submitShift('start')` rules: not below the last reading, and not in the future. The error appears under the field, with text and an icon.
  - The trips data shape does not change: `kmStart` is always a number. The idea of a `null` start km is dropped.
- **End = 1 tap.** "Vardiyayı bitir" records the end time immediately, then shows the **shift-done sheet**:
  - it summarises the shift and has a numeric keypad for the end km;
  - "Kaydet" is optional now, and later as a pending chip.
  - The time is exact because it is captured on the tap. The km is typed when it's safe.
- End km: the shift-done sheet is **prefilled with start km + the average km per hour of the last 5 shifts × the duration** (a guess, shown selected so the first digit replaces it). "Km'yi kaydet" (filled) or "Sonra gir" (ghost). If he picks "Sonra gir", the trip is saved with the end time and **no** end km. The fields stay the same, but this is a **new state**: `end` set while `kmEnd` is `null`. A to-do row "Bitiş km'si eksik" stays on Bugün until he enters it.
  - `shiftKm()` and `odoReadings()` already test `kmEnd != null`, so the trip just counts 0 km.
  - `lbStats()` would count that trip but not its km, so the logbook % comes out low until the km is entered.
  - Old app versions read it the same way (0 km), and no crash path was found. Ask `momentum-database` to confirm. If Emre prefers, drop "Sonra gir" and make the end km required.
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
┌ Gelir  Uber $310 · 11 sa · Nakit 6 sa  Düzenle ┐ ← one row, expands inline (3 fields)
Harcamalar                               $80,90
  Pzt 26 Eki                              $61,40 ›
  Sal 27 Eki · yakıt $64,20                $5,50 ›
  Çar 28 Eki · bugün                        $14  ˅
     Öğle yemeği · Yemek                    $14
  Per · Cum · Cmt · Paz  (empty, muted, not tappable)
```

- The hero "Elinde kalan" is gone (A-4). The number moves into the strip as "Kalan".
- **Cash-work hours stay (Emre still uses them) in the Gelir row, with no extra card:**
  - Collapsed, the row reads "Uber $310 · 11 sa · Nakit 6 sa". The "Nakit" part shows only when it is > 0 this week.
  - Tapping "Düzenle" expands three fields: **Uber kazancı**, **Çevrimiçi saat** and **Nakit iş saati** (with the hint "$30/sa × saat = $180").
  - The cash rate and the cash-tax setting stay in Settings → Uber ve vergi.
- There is no inline add form in the day rows (A-9a goes away). Adding goes through the FAB.
- Empty future days collapse into one muted line.
- **Haftanın dökümü sheet:**
  - the waterfall;
  - the hourly-rate table;
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
| 6 | Uber ve vergi | sabit masraflar, yılda kaç hafta, yakıt tahmini, nakit iş saat ücreti + vergisi, hastane sigortası, logbook %, kategori varsayılanları. BAS dates fixed to 11 Kas / 28 Şub / 12 May / 25 Ağu (A-10). |
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
| `ui.gestureHintSeen` boolean | new optional flag (shows the gesture hint once) | Missing = false. Old versions ignore it. The old `ui.swipeHintSeen` key stays and is not dropped. |
| Shift start asks for km first | **no change** | `trips[]` keeps `kmStart: number`. |
| "Sonra gir" at shift end | same fields, new state: `end` set, `kmEnd: null` | `shiftKm()` and `odoReadings()` already guard against it, so the trip counts 0 km until the km is entered. Old versions behave the same. The data check should confirm this, or the option can be dropped. |
| `ui.hiddenCards` / `shownCards` | no longer used by the UI | Keep the keys (don't drop them), so an old version still reads them. |

No Supabase schema, RLS or storage change.

---

## 9. Design tokens

### Colour

See **§9a Renk paleti**. The bordo/beige palette is replaced by palette **A · Lacivert**.

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
- Fonts: keep Figtree for body text, and use it for numbers too (tabular figures). Bricolage Grotesque stays only for screen titles; it is optional and can be dropped later to save weight.
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

## 9a. Renk paleti

Emre's feedback: the maroon/beige palette "feels off". The requirements:

- reads as **trust and calm** for a finance app;
- **readable outdoors in sunlight**, which means high contrast and no low-contrast warm greys;
- works in dark mode;
- 60/30/10;
- red is **never** the brand colour.

**Money semantics in every option:**

- green = on track / income (▲, ✓);
- red = over / overdue (−, ✕);
- amber = warning (!).

Each colour is always paired with a sign or icon.

**References** (ui-ux-pro-max `colors.csv`):

- #42 "Banking/Traditional Finance": navy;
- #91 "Personal Finance Tracker": trust blue + profit green;
- #96 "Ride Hailing": graphite.

The search script did not run under `python3 -I` (it can't import `core`), so the CSV was read directly. All ratios below were **measured** with the WCAG 2.x formula. Image: `design/shots/palette-options.png`.

### Option A · Lacivert (navy blue): **recommended**

| Token | Light | Dark |
|---|---|---|
| bg (60%) | `#F5F7FA` | `#0B1020` |
| surface | `#FFFFFF` | `#141B2D` |
| surface-2 (tonal) | `#EAEEF4` | `#1E2740` |
| text (30%) | `#0F172A` | `#F1F5F9` |
| text-2 | `#334155` | `#CBD5E1` |
| text-3 (secondary) | `#526075` | `#9AA6B8` |
| border (inputs, ≥ 3:1) | `#7B8798` | `#6B7A93` |
| divider (decorative only) | `#DCE2EA` | `#26314B` |
| primary (10%) | `#1E40AF` | `#8FB0FF` |
| on-primary | `#FFFFFF` | `#0B1020` |
| primary-soft (selected tab, tonal accent) | `#E3EAFB` | `#1F2C52` |
| hero fill / hero text | `#1E40AF` / `#FFFFFF`, sub `#DBE4FF` | `#1F2C52` / `#F1F5F9`, sub `#C7D2FE` |
| success / soft | `#166534` / `#E7F6EC` | `#4ADE80` / `#12301F` |
| warning / soft | `#B45309` / `#FEF3E2` | `#FBBF24` / `#3A2A0E` |
| danger / soft | `#B42318` / `#FDECEA` | `#FF8A80` / `#3B1A1A` |

| Measured ratio | Light | Dark |
|---|---|---|
| text / bg | 16.63 | 17.28 |
| text / surface | 17.85 | 15.66 |
| text-2 / surface | 10.35 | 11.55 |
| text-3 / surface | 6.39 | 6.96 |
| text-3 / surface-2 | 5.48 | 6.00 |
| border / surface (non-text ≥ 3) | 3.65 | 3.94 |
| border / bg | 3.40 | 4.35 |
| primary / surface (as text) | 8.72 | 8.02 |
| on-primary / primary | 8.72 | 8.86 |
| primary / primary-soft (selected tab) | 7.24 | 6.38 |
| hero text / hero fill | 8.72 | 12.44 |
| hero sub / hero fill | 6.88 | 9.14 |
| success / surface | 7.13 | 9.84 |
| warning / surface | 5.02 | 10.27 |
| danger / surface | 6.57 | 7.51 |
| success / success-soft (chip) | 6.38 | 8.21 |
| warning / warning-soft | 4.58 | 8.29 |
| danger / danger-soft | 5.75 | 6.82 |

### Option B · Petrol (deep teal)

| Token | Light | Dark |
|---|---|---|
| bg / surface / surface-2 | `#F4F7F7` / `#FFFFFF` / `#E6EEEE` | `#0B1414` / `#132020` / `#1C2D2E` |
| text / text-2 / text-3 | `#0F1F21` / `#2F4446` / `#4E6365` | `#EEF5F5` / `#C6D6D7` / `#93A8A9` |
| border | `#768A8C` | `#647C7D` |
| primary / on-primary | `#0E5C63` / `#FFFFFF` | `#5FC4CB` / `#06201F` |
| success / warning / danger | `#166534` / `#B45309` / `#B42318` | `#4ADE80` / `#FBBF24` / `#FF8A80` |

Measured, light / dark:

- text/bg: 15.74 / 16.91
- text-3/surface: 6.37 / 6.70
- border/surface: 3.63 / 3.76
- primary/surface: 7.69 / 8.16
- on-primary/primary: 7.69 / 8.30
- success/surface: 7.13 / 9.60
- warning/surface: 5.02 / 10.02
- danger/surface: 6.57 / 7.33

### Option C · Grafit (graphite, monochrome)

| Token | Light | Dark |
|---|---|---|
| bg / surface / surface-2 | `#F6F6F7` / `#FFFFFF` / `#ECECEF` | `#0C0C0E` / `#17171A` / `#222226` |
| text / text-2 / text-3 | `#111114` / `#3A3A42` / `#5A5A64` | `#F4F4F5` / `#D4D4D8` / `#A1A1AA` |
| border | `#82828C` | `#6E6E78` |
| primary / on-primary | `#18181B` / `#FFFFFF` | `#F4F4F5` / `#18181B` |
| success / warning / danger | `#166534` / `#B45309` / `#B42318` | `#4ADE80` / `#FBBF24` / `#FF8A80` |

Measured, light / dark:

- text/bg: 17.45 / 17.78
- text-3/surface: 6.82 / 6.98
- border/surface: 3.80 / 3.55
- primary/surface: 17.72 / 16.28
- on-primary/primary: 17.72 / 16.12
- success/surface: 7.13 / 10.27
- warning/surface: 5.02 / 10.72
- danger/surface: 6.57 / 7.84

All three pass AA for every text pair (≥ 4.5) and for input borders (≥ 3).

### Why A

1. **Blue reads as "money you can trust".**
   - It is the convention for banks and budgeting apps (refs #42, #91), and it is the furthest hue from the three meaning colours.
   - Green, red and amber all stay unambiguous next to it.
   - **B's teal** sits right next to the success green: "on track" and "primary button" would blur.
2. **Sunlight.** The cool near-white ground with near-black navy text gives 16–18:1, against 14.9:1 for the old beige.
   - Input borders reach 3.65:1, against 1.74:1 before (A-11).
   - C is even higher, but see 3.
3. **10% accent stays meaningful.**
   - In **C** the "accent" is black. The hero, the primary button and the key numbers look like body text, so the 10% signal is lost and the app feels austere.
   - A keeps one clear accent for the hero, the one filled button and the selected tab.
4. **Dark mode.**
   - A's dark primary `#8FB0FF` on `#141B2D` is 8.0:1.
   - The hero becomes a deep navy panel (`#1F2C52`) rather than a bright fill, so it doesn't glare at night while driving.
5. **Brand continuity.** The logo's gold dot can stay as the milestone colour. Use it for celebrations only (meter at 100%), never for UI.

**Rules (all options):**

- One accent only. The module colours (purple Gelişim, blue Sağlık, navy Yatırım) are **retired**: a module tab uses the same accent.
- The hero is the only large accent area per screen.
- Red is only for "over / overdue / error / delete".
- Text hierarchy comes from the three text tokens (100 / 80 / 65% equivalent), not from opacity on coloured backgrounds.
- `contrast-scan.js` should add the token pairs above as fixed assertions.

---

## 9b. Hareketler (gestures)

Diagram: `design/shots/gestures.png`.

**What exists today** (`src/7-events.js`):

- swipe between tabs (≥ 60 px, |dx| > 1.5·|dy|);
- week and quarter swipe on their headers;
- segment swipe on the segment bar;
- swipe-left-to-delete on spending rows (arm at 80 px, delete at 120 px), with an undo toast.

The spec below keeps those and tightens them.

**Global rules:**

- **Axis lock.** Decide the axis after 8 px of movement. Horizontal needs |dx| > 1.5·|dy|. Vertical scroll always wins otherwise. Use CSS `touch-action: pan-y` on horizontally swipeable areas, so the browser keeps native vertical scrolling and momentum.
- **Android back gesture.** No horizontal gesture may **start** within 32 px of the left or right screen edge, which is the system back zone. Those touches are ignored by the app. Vertical gestures may start anywhere.
- **Fallback.** Every gesture has a visible control that does the same thing. The gesture is a shortcut, never the only way. This covers TalkBack, switch access, and people who don't know the gesture.
- **Feedback.** The content follows the finger (1:1, with 0.3 resistance past an end). A short `navigator.vibrate(10)` fires when a threshold is crossed (Android only; skipped if unsupported). Under `prefers-reduced-motion`, snap with no slide animation.
- **Undo.** Every destructive or state-changing gesture shows a snackbar with **"Geri al"** for 5 s, in the thumb zone above the tab bar.
- **No conflicts:**
  - A row gesture beats a page gesture, because rows are excluded from the page swipe zone. They already are (`.swipe`).
  - Long-press is cancelled by movement > 8 px.
  - Pull-to-refresh only arms at `scrollTop === 0`.
  - No gestures run under an open sheet, except the sheet's own drag-down.

| # | Gesture | Trigger and threshold | Feedback | Undo / fallback |
|---|---|---|---|---|
| G1 | **Swipe between tabs / Para segments** | Horizontal on the screen content, ≥ 64 px or a fling > 0.5 px/ms, starting ≥ 32 px from the edges. **On Para:** moves between segments (Hafta → Hesaplar → Geçmiş → Vergi). From the first or last segment, it moves to the neighbouring tab. **On Bugün and Yatırım:** moves between tabs. Hidden module tabs are skipped. | The content slides with the finger; the target tab or segment underline moves along. | Swipe back. Fallback: the tab bar and the segment buttons. |
| G2 | **Week / quarter swipe** | Horizontal on the week header + Gelir/Gider/Kalan strip (Hafta) or the quarter card (Vergi), ≥ 48 px. | The week label slides with a light haptic tick. On a past week, a chip "Bu haftaya dön" appears. | Swipe back or tap the chip. Fallback: the ‹ › arrows (48 px). |
| G3 | **Swipe left on an expense row: delete** | The row follows the finger. At 80 px a red panel with a trash icon and **"Sil"** shows (text + icon, not colour alone). Release past 50% of the row width, or fling > 0.6 px/ms, to delete. Release between 80 px and 50% to leave "Sil" visible to tap. | Row collapses, haptic. | Snackbar "Silindi: Öğle yemeği $14 · **Geri al**" (exists today). Fallback: the edit sheet's "Gideri sil". |
| G4 | **Swipe right on an expense row: copy to today** | ≥ 96 px. A blue panel shows "Bugüne kopyala". | Toast "Bugüne kopyalandı: Kahve $5,50". | **Geri al**. Fallback: long-press menu, edit sheet. |
| G5 | **Pull to refresh = sync** | At `scrollTop === 0`, pull down ≥ 72 px (0.5 resistance, max 120), and |dy| > |dx|. Only when signed in. When signed out, the indicator reads "Senkron kapalı" and nothing happens. Set `overscroll-behavior-y: contain` on the scroller so Chrome's own pull-to-refresh (page reload) never fires. | A spinner ring under the header. Then "Senkronlandı · 17:42", or "Senkron olmadı · **Tekrar dene**" (error = danger text + icon). | Nothing to undo. Fallback: the sync chip in the header, Ayarlar › Hesap › "Şimdi senkronla". |
| G6 | **Drag down to close a sheet** | Drag from the grab handle or the sheet header, or from the content when it is scrolled to the top. Close if dragged > 25% of the sheet height or flung > 0.6 px/ms; otherwise spring back. `touch-action: none` on the handle. | The sheet follows the finger and the scrim fades with it. | If the sheet has unsaved input, it does not close: it springs back and asks "Değişiklikler silinsin mi? · Sil · Devam et". Fallback: ✕, the Android back key (exists), tapping the scrim. |
| G7 | **Long-press for quick actions** | 500 ms hold, < 8 px movement, on an expense row, an account row or a pot row. Set `user-select: none; -webkit-touch-callout: none` on those rows so text selection and the system menu don't appear. | Haptic, then an action sheet. **Expense:** Bugüne kopyala · Düzenle · Kategoriyi değiştir · Sil. **Account:** Bakiye güncelle. **Pot:** Para ekle · Çek. | Each action has its own undo snackbar. Fallback: the same actions in the edit sheet, plus a "Diğer işlemler" button there for screen readers. |
| G8 | **Swipe right on a "Bu hafta yapılacaklar" row: done** | ≥ 96 px on the tax row (= Aktardım) or a renewal row (= Yeniledim). | Green ✓ panel "Aktardım", then the row collapses. | **Geri al**. Fallback: the "Aktardım" button on the row. |
| G9 | **Long-press ⌫ on the keypad: clear** | 400 ms on ⌫. | The amount resets to 0, with a haptic. | Type again. Fallback: tap ⌫ repeatedly. |

**Not added, on purpose:**

- Double-tap: it conflicts with tap, and nothing needs it.
- Edge swipes: the system owns them.
- Shake-to-undo: it isn't discoverable, and it triggers by accident in a moving car.
- Pinch: there is nothing to zoom.

**Implementation:**

- **Code.** One `gestures` block in vanilla JS, about 150–200 lines, using pointer events (`pointerdown/move/up/cancel` + `setPointerCapture`) and extending the existing handlers in `7-events.js`. No library.
- **Shared helper.** A small helper `track(el, { axis, onMove, onEnd })` handles the axis lock, the edge guard and velocity (from the last 3 `pointermove` samples).
- **Clicks.** Suppress the synthetic click after a gesture. `swipeSuppress` / `navSuppressUntil` already exist.
- **Discoverability.** No tutorial screens. The first time an expense is saved, the toast adds one line: "İpucu: sola kaydır sil, basılı tut kopyala". It is shown once (`ui.gestureHintSeen`, a new optional flag that defaults to false).

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
| Start sheet | Uber'e başla / Gösterge (km) / Başla | **Vardiyaya başla** · Başlangıç göstergesi (km) · Son okuma {k} km ({d}) · **Başlat** · Saati değiştir |
| End sheet | Bitir | **Vardiya bitti** · Bitiş göstergesi (km) · **Km'yi kaydet** · Sonra gir |
| Missing end km to-do | – | Bitiş km'si eksik ({d}) |
| Gelir row | Gelir / Uber kazancı / Çevrimiçi saat / Nakit iş saati | **Gelir** Uber {x} · {h} sa · Nakit {c} sa · Düzenle |
| Swipe/long-press hint (once) | İpucu: sağa/sola kaydırarak geçiş yapabilirsin | İpucu: sola kaydır sil, basılı tut kopyala |
| Row copy | – | Bugüne kopyala · Bugüne kopyalandı: {x} |
| Pull to refresh | – | Senkronlanıyor… · Senkronlandı · {t} · Senkron olmadı · Tekrar dene · Senkron kapalı |
| Unsaved sheet | – | Değişiklikler silinsin mi? · Sil · Devam et |
| Week swipe chip | – | Bu haftaya dön |
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
13. **Start shift:**
    - "Vardiyaya başla" opens the start sheet with the keypad up and the field prefilled with `lastOdo().km`.
    - "Başlat" saves a trip with `start ≈ now` and a numeric `kmStart`. That is **2 taps** when the km is unchanged.
    - A value below the last reading shows an error, and nothing is saved.

    **End shift = 1 tap.** It records `end`, then shows the shift-done sheet with the km keypad. "Sonra gir" leaves `kmEnd: null` and a to-do row "Bitiş km'si eksik" until the km is entered.
13b. **Cash hours:** "Nakit iş saati" is editable from the Gelir row in Para·Hafta (1 tap on Düzenle). It shows in the collapsed row only when > 0.
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

**Renk paleti (palette A)**

24. Every token pair in the §9a table measures at or above its listed ratio in both themes. Add them to `contrast-scan.js` as fixed assertions. Text is ≥ 4.5; input borders, icons and the focus ring are ≥ 3.
25. No UI element uses the retired module colours (purple, steel blue, the navy hero, bordo). A DOM scan of computed `background-color`, `color` and `border-color` finds only palette A tokens and their soft variants.
26. Red (`danger`) appears only on: over budget, overdue, errors, and delete. Each red element also has a sign or icon (−, ✕, !) or the word.
27. Light and dark both pass at 360×780, in screenshots and the contrast scan.

**Hareketler (gestures)**

28. Each gesture G1–G9 has a visible control that does the same thing. A test does every action with taps only.
29. A horizontal pointer drag starting within 32 px of either screen edge triggers nothing in the app (G1, G3, G4, G8).
30. A vertical scroll with |dx| ≤ 1.5·|dy| never changes the tab, week or segment, and never moves a row. Playwright: simulate a 200 px vertical drag with 60 px horizontal drift.
31. G3 delete and G4/G8 swipe actions each show a snackbar with "Geri al" for ≥ 4 s. Undo restores the exact previous state (deep-equal).
32. G5 pull-to-refresh only arms at `scrollTop === 0`. It calls the sync once per release, and the page never reloads (`overscroll-behavior-y: contain`).
33. G6: a sheet with unsaved input does not close on drag-down. It shows the confirm instead. A sheet without input closes past 25% of its height.
34. G7: long-press opens its menu after ≥ 450 ms with < 8 px movement, and does not select text or open the system context menu.
35. With `prefers-reduced-motion: reduce`, the gestures still work, with no slide animations.

---

## 12. Releases: small and ordered (one screen per release)

| # | Version | Scope | Acceptance criteria | Why this order |
|---|---|---|---|---|
| R0 | 1.x hotfix | Fix the 360 px clipping (Kaydet, Vergi hero tile, Uber expense name wrap), the BAS dates copy, and the input border contrast | 17, 18 (borders) | Bugs; no design debate needed |
| R1 | **2.0.0** | **Modüller + 3-tab nav** (`ui.modules`, hidden tabs, FAB and Bugün lines filtered by module, notifications paused, single gear) **+ palette C (Grafit) tokens** (CSS variables only, module colours retired). G1 updated with the edge guard and hidden-tab skip. | 1–5, 24–27, 29, 30 | The approved decision. A new look is best shipped as one visible "v2.0" moment. The palette is a token swap, so it adds no layout risk. |
| R2 | 2.1.0 | **Bugün**: the one-number hero + "Nasıl hesaplandı" sheet, the Uber card up, the "Bu hafta yapılacaklar" card (+ G8), the end-of-day card, removal of the "Bugün kartları" setting | 6–8, 10, 31 (G8) | The daily screen |
| R3 | 2.2.0 | **Gider ekle** sheet (keypad, chips, Uber için, Fiş inside), the FAB opening it directly, **G6 drag-down for all sheets**, G9 | 11, 12, 33 | The most frequent input |
| R4 | 2.3.0 | **Uber mode** + start-km sheet + 1-tap end + "Sonra gir" + celebration | 9, 13, 14 | Needs R2's card. Data check on `kmEnd: null` after `end`. |
| R5 | 2.4.0 | **Para·Hafta + Geçmiş** (strip, Gelir row with cash hours, no inline form, Rapor merged) + **G2, G3 tightened, G4, G7** | 13b, 15, 31, 34 | The row gestures land with the new rows |
| R6 | 2.5.0 | **Vergi hub** + sub-pages | 16 | Ship after the Q1 BAS is lodged (11 Nov) so nothing moves mid-lodgement *(assumption, unanswered Q5)* |
| R7 | 2.6.0 | **Hesaplar** (Serbest para hero, compact pots) + **Yatırım** light touch + **G5 pull-to-refresh** | 21, 32 | |
| R8 | 2.7.0 | **Settings regroup** + Uber plan chips + type scale pass + gesture a11y sweep | 19, 20, 22, 28, 35 | Pure polish, done last |

Each release ships with a fresh run of all suites + screenshots, reviewed by an agent other than the builder (CLAUDE.md flow).

---

## 13. Decisions and assumptions

**Emre answered (28 Oct):**

1. The hero is **daily** ("Bugün harcayabileceğin"), with the weekly figure small underneath, as mocked.
2. **Shift start asks for the km first.** The sheet is prefilled with the last odometer reading; "Başlat" saves it. Ending stays as mocked.
3. **Cash-work hours stay.** They live in the Gelir row in Para·Hafta.

**Still open, so the recommendation stands as an assumption:**

4. *(Assumption)* "Uber araçları" is a Modüller toggle, default on.
5. *(Assumption)* The Vergi hub (R6) ships after the Q1 BAS is lodged (11 Nov).

**New questions:**

6. ~~Palette~~ **Decided 28 Oct: C · Grafit** (Emre's choice). Keep accent discipline: key numbers use size/weight, semantic colours only for meaning.
7. "Sonra gir" for the end km: keep it (faster, but the logbook % reads low until filled), or make the end km required?
8. Swipe right on a row = "Bugüne kopyala": useful (repeat coffee or fuel), or is long-press enough?
