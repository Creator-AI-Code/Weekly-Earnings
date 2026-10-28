# Audit: `sadelik` (Momentum v2.0 simplification)

Date: 28 Oct 2026 · App build: current `main` (`python3 src/build.py`) · Auditor: momentum-designer

## How this was measured

- Running app on port 8766, Playwright Chromium, clock fixed at **Wed 28 Oct 2026 17:40 (Brisbane)**, Turkish UI.
- Viewports: **360×780** (main), **412×915** (check). Light and dark (`colorScheme`).
- Seed data: **invented** (`design/shots/` script seed). It covers 4 Uber weeks, 4 accounts, 2 pots, 3 renewals, an active logbook, 3 shifts, 2 Uber expenses, 3 habits, 2 tasks, 2 ASX holdings, a $500 weekly target and an Uber plan (Thu evening 4 h, Fri evening 5 h, Sat all day 7 h).
- Metrics (`design/shots/metrics.json`) were collected in the DOM: blocks above the fold (above the tab bar), page height, controls under 44 px, and the distinct font size/weight pairs.
- Console: 0 page errors. The only console errors are 404s for web fonts, which the test blocked on purpose.
- `tests/contrast-scan.js`: **0 low-contrast text nodes** in light and dark. It does not check icons, input borders or sheets (see A-11).

### Screen weight at 360×780 (light)

| Screen | Top-level blocks | Above fold | Page height | Screens to scroll | Font size/weight pairs | Controls < 44 px |
|---|---|---|---|---|---|---|
| Bugün | 9 | 3 (hero, tax line, plan) | 1 795 px | 2.3 | 18 | 0 |
| Para · Hafta | 7 | 4 | 3 226 px | 4.1 | 32 | 8 |
| Para · Rapor | 6 | 3 | 1 902 px | 2.4 | 19 | 5 |
| Para · Geçmiş | 4 | 3 | 1 585 px | 2.0 | 15 | 5 |
| Para · Hesaplar | 5 | 2 | 2 035 px | 2.6 | 23 | 5 |
| Para · Vergi | **12** | 4 | **4 381 px** | **5.6** | **33** | 5 |
| Gelişim | 9 | 7 | 1 369 px | 1.8 | 15 | 29 |
| Sağlık | 5 | 2 | 1 902 px | 2.4 | 23 | 0 |
| Yatırım | 5 | 3 | 1 520 px | 1.9 | 17 | 3 |
| Ayarlar (root) | 9 rows | – | – | – | – | – |
| Ayarlar · Para | 28 fields | – | 2 270 px | 2.9 | – | – |

The Para tab, with its 5 segments, holds about **13 000 px** of content. That is the clutter Emre feels.

---

## Headline findings (ranked)

| # | Severity | Finding | Evidence |
|---|---|---|---|
| A-1 | Blocker | **Two different "per day" numbers on Today.** The hero says "günde $121 · 5 gün kaldı" and the plan card under it says "Günde $70 harcama alanın var". The hero ignores the $500 target and the pots; the plan includes them. Emre can't tell which number to trust, which defeats the screen's only job. | `shots/bugun-360-light.png` |
| A-2 | Blocker | **The Uber shift card is below the fold** at 360×780: it starts at about y = 870. The most time-critical action between trips ("Uber'e başla") needs a scroll. At 412×915 it just makes it. | `shots/bugun-360-light.png`, `shots/bugun-412-light.png`, metrics `aboveList` |
| A-3 | High | **The same tax number appears 3 times**: Today tax line "$112", Para·Hafta tax box "$111,63", Para·Vergi "Bu hafta $111,63". The rounding differs too ($112 vs $111,63). | `bugun-360-light.png`, `para-hafta-360-light-full.png`, `para-vergi-360-light-full.png` |
| A-4 | High | **The "left this week" number appears twice as a hero**: Today "$604 harcayabileceğin" and Para·Hafta "$604 elinde kalan". It is the same number under two names. | `bugun-360-light.png`, `para-hafta-360-light.png` |
| A-5 | High | **"Uber vardiyası" means two different things.** On Today it is the odometer/logbook shift (start/end km). In the FAB sheet, "Uber vardiyası" is a form that adds earnings + hours to the week ("Vardiyayı haftaya ekle"). Same label, different data. | `fab-360-light.png`, `bugun-shift-on-360-light.png` |
| A-6 | High | **There are three ways to log fuel**: FAB → Harcama with category "Yakıt (Uber)"; FAB → Uber gideri (which then tells you to use Harcama instead, `ueFuelHint`); FAB → Fiş tara → Kimin için: Uber → Yakıt. All three end in the same place. | `fab-360-light.png`, `receipt-360-light-full.png` |
| A-7 | High | **Adding an expense takes 6 taps + typing**: FAB → Harcama → tap "Ne için?" → pick a name → tap amount → type → "Bugüne kaydet". The amount field is second; the keyboard opens on the name field. | `fab-harcama-360-light.png`, `fab-harcama-combo-360-light.png` |
| A-8 | High | **Para·Vergi is 5.6 screens long with 12 blocks**: the quarter hero, Uber summary import, weekly transfers, set-aside log, car + renewals, logbook (with 3 trips), Uber expenses, main-job expenses, quarter breakdown, and the FY summary. Most of it is quarterly. | `para-vergi-360-light-full.png` |
| A-9 | High | **Layout breaks at 360 px.** (a) In Para·Hafta → open day, the "Kaydet" button is clipped at the right edge, so the primary action of the form is cut off. (b) In Vergi → Uber giderleri, the expense name wraps one letter per line ("Ya / kıt", "Am / pol") because 3 chips squeeze the text. (c) In the Vergi hero, the "Kalan" tile is clipped on the right. | crops of `para-hafta-360-light-full.png` (y≈1850–2500) and `para-vergi-360-light-full.png` (y≈900–1500, 6000–7200) |
| A-10 | Medium | **Wrong BAS dates in copy.** Settings → Vergi says "BAS çeyreklik verilir: 28 Ekim, 28 Şubat, 28 Nisan ve 28 Temmuz". The engine (and CLAUDE.md) use the self-lodge dates 11 Nov / 28 Feb / 12 May / 25 Aug. Today correctly shows "BAS'a 14 gün" (11 Nov), so the two screens contradict each other. | `src/6-ui.js` vergi settings note; `bugun-360-light.png` |
| A-11 | Medium | **Inputs barely stand out from cards.** The input fill `--surface-2 #efe7dd` on card `#fbf8f3` is 1.16:1, and the border `--line-strong #cbbdad` is 1.74:1. Both are below the 3:1 non-text minimum, so in sunlight the fields disappear. Dark mode is similar (`#54465c` on `#251c2b` = 1.88:1). | computed; `para-hafta-360-light.png` |
| A-12 | Medium | **Too many type styles**: 18 size/weight pairs on Today and 33 on Vergi (11.84, 12.48, 12.8, 13.12, 13.44, 13.6 … px; weights 400/600/650/700/800). The target is 4 sizes and 2 weights. | metrics `fontStyles` |
| A-13 | Medium | **More than one accent colour**: bordo (Para), purple (Gelişim, also the "Ekle" buttons on Yatırım and the counters' "+" on Today), steel blue (Sağlık), navy (Yatırım hero) and gold (meters). Combined, the accent use is well beyond the 10% budget. | `bugun-360-light-full.png` counters, `yatirim-360-light.png` |
| A-14 | Medium | **The FAB overlaps content.** At 360×780 it sits on top of the plan card text ("Kumbaralar hesaplarındaki parada[…]"), and there is no bottom padding for it. | `bugun-360-light.png` |
| A-15 | Medium | **Starting or ending a shift needs a sheet + km typing + a second tap.** Both are 2 taps + digits. Ending also shows a "Bu vardiyayı sil" outline button right under "Bitir": a destructive action next to the primary one. It does use arm-to-confirm. | `shift-start-360-light.png`, `shift-end-360-light.png` |
| A-16 | Medium | **Settings has 9 sections**, and Settings·Para is 2.9 screens with 28 fields. The weekly Uber plan alone is 7 `<select>` + 7 number inputs. | `settings-360-light.png`, `settings-para-360-light-full.png` |
| A-17 | Nit | The Para segment buttons are 40 px tall (< 48 dp). | metrics `under44ex` |
| A-18 | Nit | Rapor shows the headline "Uber'de saat başı %95 daha az kazandın" on a Wednesday, when the week is half done. It reads as an alarm when it's just timing. | `para-rapor-360-light.png` |
| A-19 | Nit | In the receipt sheet the photo `alt` text shows as broken-image text ("Fiş fotoğrafı") until the image loads. | `receipt-360-light.png` |

**Can one app be simple enough?** Yes. Almost every item above is placement, duplication or naming, not scope. The Uber toolkit and personal money share the same accounts, weeks, fuel and tax set-aside. Splitting it out would mean two copies of the weeks/accounts data, or cross-app sync. **No split is recommended.**

---

## Inventory per screen

Legend:
- **Freq**: D = daily, W = weekly, Q = quarterly, R = rare / one-off.
- **Primary?**: ★ marks the item that should be the screen's main action.
- **Verdict**: Keep · Merge · Deeper (move one tap down) · Remove · Hide (module off).

### 1. Bugün (Today), `bugun-360-light.png`, `bugun-360-light-full.png`, `bugun-shift-on-360-light.png`

| Item | Type | Freq | Primary? | Verdict | Note |
|---|---|---|---|---|---|
| Header: brand + title "Momentum" | header | – | | Keep | Show the screen name instead ("Bugün"). |
| Header: section-settings icon (sliders) | button | R | | Remove | Two gear-like icons side by side. One gear is enough (it can open the current tab's section). |
| Header: settings gear | button | R | | Keep | |
| Header: sync chip (when signed in) | chip | R | | Keep | Show it only on error/offline. |
| Notice banner (migration) | banner | R | | Keep | Only shows once. |
| Swipe hint chip | chip | R | | Remove | Swiping between 3 tabs needs no tutorial. |
| Hero "Bu hafta harcayabileceğin $604 · günde $121" | card | D | | **Merge** | Merge with the plan card into one number (A-1). |
| Tax line "Vergi için ayır $112 · BAS'a 14 gün" | row | W | | **Merge** | Merge into a "Bu hafta" to-do card. |
| Plan card: title + edit pen + "Claude'a sor" | card | D/W | | **Merge / Deeper** | The advice text becomes the hero subline. The breakdown (Uber plan left, pot needs, coverage, $/h) goes to the hero's tap-through sheet. "Claude'a sor" moves into that sheet. |
| Plan card: advice "Kahve de dışarıda yemek de olur" | text | D | | Keep (as hero subline) | Good, human copy. |
| Plan card: meter "Plan tutarsa $848 %100" | meter | W | | Deeper | |
| Plan card: 4 bullet lines | list | W | | Deeper | |
| Plan setup form (when no target) | form | R | | Keep | Show it only when there is no target. One line + CTA. |
| Uber shift card (off) "Uber'e başla" | card + btn | D | ★ (on Uber days) | **Keep, move up** | It is below the fold today (A-2). |
| Uber shift card (on) "Uber'desin · Bitir" | card + btn | D | ★ | Keep → **Uber mode** | |
| Renewal lines (BHSL 11 gün, Rego 23 gün) | rows | Q | | Merge | Into the "Bu hafta" to-do list, only when due ≤ 14 days. |
| FY odometer line (June only) | row | R | | Merge | Same to-do list. |
| Habits band card (Akşam 0/2) | card | D | | **Hide** (Gelişim off) | Comes back as one line when the module is on. |
| Tasks card (Yapılacaklar) | card | D | | **Hide** (Gelişim off) | |
| Smoking / alcohol counters | card | D | | **Hide** (Sağlık off) | |
| Portfolio line (opt-in, off) | row | R | | Keep opt-in | Keep it off by default. |
| Health summary (opt-in, off) | card | – | | Hide | |
| Insight card (opt-in, off) | card | W | | Deeper | Into Para·Geçmiş. |
| Evening review (≥ 18:00) | card | D | | **Hide** (Gelişim off) | Replace it with an end-of-day summary (peak-end). |
| FAB "+" | button | D | ★ (off-shift) | Keep | It should open the expense entry directly (see FAB). |

### 2. FAB / quick add, `fab-360-light.png`, `fab-harcama-360-light.png`, `fab-harcama-combo-360-light.png`

| Item | Freq | Primary? | Verdict | Note |
|---|---|---|---|---|
| Fiş tara | W | | Merge | Becomes a "Fiş" button inside the expense sheet (the camera icon next to the amount). |
| Harcama | D | ★ | Keep → the default view of the sheet | |
| Uber vardiyası (weekly earnings form) | W | | **Rename + Deeper** | "Uber kazancı" lives in Para·Hafta (A-5). |
| Uber gideri | W | | Merge | Becomes an "Uber için" toggle in the expense sheet. |
| Sigara +1 / Alkol +1 / Kilo | D | | Hide (Sağlık off) | |
| Alışkanlık | D | | Hide (Gelişim off) | |
| Form: "Ne için?" combobox + Kategori dropdown | D | | Merge | Category chips + recent-name chips (selection over typing). |
| Form: amount | D | | Keep, **first** | It should come first, with the keypad open. |
| Form: "Tek seferlik" toggle | W | | Deeper | Under "Daha fazla seçenek". |
| Form: "Hesaptan düşme" account picker | D/W | | Keep as chip | The default is "Hesaptan düşme". |
| Form: help note | – | | Remove | |

### 3. Uber shift sheets, `shift-start-360-light.png`, `shift-end-360-light.png`

| Item | Freq | Primary? | Verdict | Note |
|---|---|---|---|---|
| Gösterge (km) input | D | | Keep, but **after** the tap | Capture the time on the tap; take the km when parked (see proposal). |
| Online/offline time (datetime-local) | R | | Deeper | Only needed when correcting. |
| Başla / Bitir | D | ★ | Keep | Make it 1 tap from Today. |
| Bu vardiyayı sil | R | | Deeper | Move it to the shift detail in the logbook list. |
| Logbook start/end/odo modes | Q | | Keep in the logbook page | |

### 4. Receipt sheet, `receipt-360-light-full.png`

It has 9 fields: Toplam, Tarih, Mağaza, GST, Kimin için (Uber / Ana iş / Kişisel), Uber gider türü, Gösterge, Litre, Hesap.

| Item | Freq | Verdict |
|---|---|---|
| Toplam, Mağaza (from OCR) | W | Keep (prefilled) |
| Tarih | W | Deeper (it defaults to the receipt date) |
| GST | W | Keep; read-only "GST $5,31 fişten" with an edit link |
| Kimin için segment | W | Keep (3 chips) |
| Uber gider türü select (11 options) | W | Chips, with the 4 most-used first (Yakıt, Yıkama, Otopark, Diğer…) |
| Gösterge km + Litre | W | Keep only for fuel; mark them optional |
| Hesap | W | Chip |
| Vazgeç (outline) | – | Ghost |

### 5. Para · Hafta, `para-hafta-360-light.png`, `para-hafta-360-light-full.png`

| Item | Freq | Primary? | Verdict | Note |
|---|---|---|---|---|
| Segment bar (5) | – | | Merge → 4 | Rapor goes into Geçmiş. |
| Week nav | W | | Keep | |
| Hero "Elinde kalan $604" | W | | **Merge** | Duplicate of the Today hero (A-4). Replace it with a 3-number strip (Gelir · Gider · Kalan). |
| Gelir: Uber kazancı input | W | | Keep, collapsed | Show a one-line row "Uber $310 · 11 sa" that expands to edit. |
| Gelir: Çevrimiçi saat | W | | Keep, collapsed (same row) | |
| Gelir: Nakit iş saati | W | | Deeper | Show it only if cash work is used (cashHours > 0 in the last 8 weeks) or from "Daha fazla gelir". |
| Fuel note | – | | Remove | The single expense flow makes it moot. |
| Harcamalar by day (7 rows, today open, inline form) | D | ★ (on this tab) | Keep, **remove the inline form** | Adding goes through the FAB, so there is one way to add. Rows stay tappable for edit. |
| Swipe-to-delete hint note | – | | Remove | Use an undo toast instead. |
| Haftanın dökümü waterfall (11 rows) | W | | Deeper | Opens from the strip. |
| Hourly rate table | W | | Deeper | Inside the döküm. |
| Tax box "Bu hafta vergi kumbarasına $111,63 aktar · Aktardım" | W | | Merge | Only in the Today to-do and the Vergi hub (A-3). |
| Not (week note) | R | | Deeper | Inside the döküm. |

### 6. Para · Rapor, `para-rapor-360-light-full.png`

| Item | Freq | Verdict | Note |
|---|---|---|---|
| Week nav + comparison headline | W | Merge → Geçmiş | |
| Earnings performance table (7 rows) | W | Merge → Geçmiş, collapsed | |
| Spending donut | W | Merge → Geçmiş | Keep it; it's the best "where did it go" view. |
| Spending patterns | W | Merge → Geçmiş, collapsed | |
| 8-week trend charts | W | Merge → Geçmiş | |

### 7. Para · Geçmiş, `para-gecmis-360-light-full.png`

| Item | Freq | Verdict |
|---|---|---|
| Year nav + 12-month grid | W | Keep (it becomes Geçmiş's top) |
| Month's week list | W | Keep |
| Daily totals list | W | Deeper (in a month detail) |
| Averages tiles (3) | W | Keep, compact |

### 8. Para · Hesaplar (accounts + pots), `para-kumbara-360-light-full.png`

| Item | Freq | Primary? | Verdict | Note |
|---|---|---|---|---|
| "Hesap" add button | R | | Ghost | |
| Total + 4 account rows | W | ★ | Keep | Tap a row to update its balance. |
| "Serbest para" breakdown (bank − GST − tax − pots) | W | | Keep the **number**, put the breakdown deeper | "Serbest para $5.974" is the real answer. Show it as the hero of this segment. |
| Tax-saver status line | Q | | Keep (one line) | |
| Pots summary tiles (2) | W | | Merge | It repeats the sum of the rows below. |
| Pot card: amount input + Ekle + Çek + Satın aldım + Düzenle + Hareketler | W | | Deeper | Show a compact row (name, progress, $/week) → tap → pot sheet with those actions. |

### 9. Para · Vergi, `para-vergi-360-light-full.png`, `para-vergi-360-dark.png`

| Item | Freq | Verdict | Where it goes |
|---|---|---|---|
| Quarter nav | Q | Keep | Vergi hub |
| "Bu hafta" tax box + Aktardım | W | Merge | Today to-do (Aktardım) |
| Hero "Kenara ayrılması gereken $895,90" + 2 tiles + meter + BAS chip | Q (glanced W) | Keep, slim | Hub top card |
| Uber vergi özeti (PDF import) | Q | Deeper | Hub row "Uber özetini yükle" |
| Haftalık aktarımlar (list) | W | Deeper | Hub row "Haftalık aktarımlar 1/4" |
| Kenara ayırdığın (log + add form) | W | Deeper | Inside "Haftalık aktarımlar" |
| Araç card (car info + 3 renewals + add) | Q | Deeper | Hub row "Araç ve yenilemeler" |
| Araç logbook (tiles, meter, 4 buttons, cancel link, trips list) | D (via shifts) / Q | Deeper | Hub row "Logbook 4/12 hafta" |
| Uber giderleri (list + Fiş tara + Ekle) | W | Deeper | Hub row "Uber giderleri · $351" |
| Ana iş giderleri | R | Deeper | Hub row (only when there are any) |
| Çeyrek dökümü (G1/1A/1B) + exact-figure inputs | Q | Deeper | Hub row "BAS rakamları" |
| Mali yıl summary | R | Deeper | Hub row "Mali yıl" |

### 10. Gelişim / Sağlık, `gelisim-360-light.png`, `saglik-360-light.png`

Hide both (module off). Gelişim has the worst touch targets: 29 controls under 44 px (week-grid habit cells). Note this for when the module is turned back on, but it is out of scope for v2.0.

### 11. Yatırım, `yatirim-360-light-full.png`

| Item | Freq | Verdict | Note |
|---|---|---|---|
| Hero total (AUD) + eye toggle | W | Keep | |
| Hero tiles: Bugün / Toplam kazanç | W | Keep | |
| Status chips (market closed, last update, FX rate) + Yenile | W | Merge | One line: "17:40 güncellendi · kur 1,55 ↻" |
| FX warning banner | R | Keep as a small inline note | |
| Holdings list + Ekle | W | Keep | Make "Ekle" ghost (it is currently purple). |
| Watchlist | R | Deeper | Collapsed |
| Stake import (dashed card, 3 paragraphs) | R | Deeper | One row "Stake'ten içe aktar" → sheet |

### 12. Ayarlar, `settings-360-light.png`, `settings-genel-360-light-full.png`, `settings-para-360-light-full.png`, `settings-vergi-360-light-full.png`

| Section / item | Freq | Verdict |
|---|---|---|
| Genel: Dil, Tema | R | Keep |
| Genel: "Bugün kartları" (9 toggles) | R | **Remove**: Today becomes fixed and simple. The habits/health cards go with their modules. |
| *(new)* **Modüller** | R | **Add, first row** |
| Hesap ve senkron | R | Keep |
| Bildirimler | R | Keep. Hide the habit and evening reminders while Gelişim is off. |
| Para: Birikim planı (target, start date, 7-day Uber plan) | W/R | Keep the target; turn the Uber plan into day chips + hour chips (no selects). |
| Para: Gelir ve vergi (salary, job hours, cash rate, cash tax, hospital cover) | R | Keep, renamed "Gelir" |
| Para: Uber masrafları (fixed, weeks/yr, fuel estimate) | R | Move → "Uber ve vergi" |
| Para: Tekrarlayan giderler | R | Keep |
| Para: tax explainer note | – | Deeper ("Nasıl hesaplanır?" link) |
| Vergi: Logbook %, Kategori varsayılanları, Uber vergisi info, explainer | R | Merge → "Uber ve vergi"; **fix the BAS dates (A-10)** |
| Gelişim / Sağlık sections | R | Show only when the module is on |
| Yatırım (Finnhub key, show on Today) | R | Keep |
| Yedek | R | Keep |

---

## Frequency summary: what Emre actually touches

| Daily | Weekly | Quarterly | Rare |
|---|---|---|---|
| How much can I spend today | Uber earnings + hours | BAS figures / Uber summary PDF | Car details |
| Start/end shift (+ km) | Tax "Aktardım" | Logbook start/end/report | Salary, tax settings |
| Add expense (incl. fuel) | Review the week / where it went | Renewals (rego, BHSL, insurance) | Backup, sync, language |
| | Account balances, pots | FY summary | Stake import, Finnhub key |
| | Receipts | | Recurring costs |

Today should carry only the first column. Para carries the second. A Vergi hub carries the third. Settings carries the fourth.
