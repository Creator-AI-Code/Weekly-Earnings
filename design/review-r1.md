### Design review: sadelik R0 (v1.9.2, 4e88403) + R1 (v2.0.0, 03a7a30)

Reviewer: momentum-designer (did not write this code). Checked against `design/proposal-sadelik.md`: §12 rows R0 and R1, AC 1–5, 17, 18, 24–27, 29 and 30 in §11, plus §2 and §9a. Emre's decision: Grafit is the default, with a picker.

**Verdict: SHIP.** There are no blockers. The 2 Highs are cheap to fix and nothing loses data, so they can go in 2.0.1 or ride along with R2.

What works:
- Modüller does what §2 says. It hides only the UI and never touches the data, it survives a reload, and old saves load fine.
- The 3-tab bar with Grafit looks calm and stays readable in both themes.
- All the R0 clipping bugs are gone at 360.

---

#### Evidence: fresh test run (built with `python3 src/build.py`, which left no diff; served on :8766)

```
contrast-scan.js: low-contrast nodes (text + input borders): 0
test11.js: ALL PASS
test12.js: ALL PASS
test15.js: ALL PASS
test16.js: ALL PASS
test17.js: ALL PASS
test18.js: ALL PASS
test4.js:  ALL PASSED
test5.js:  ALL PASSED
test7.js:  ALL PASS
test8.js:  ALL PASS
v1smoke.js: errors []
```

#### Evidence: my own Playwright run (invented seed `tests/fixtures/sadelik-seed.json`, clock fixed at 28 Oct 17:40 Brisbane)

| Check | Result |
|---|---|
| Bugün, Para, Yatırım × 3 palettes × light/dark × 360 and 412 | Tabs are `bugun,para,yatirim`. No button or tile pokes out of its card, nothing scrolls sideways, 0 console errors (12 combinations). |
| Default palette | `data-palette="grafit"`, hero `#18181B` (light) / `#26262B` (dark) |
| Ayarlar, first row | "Modüller · Para, Uber araçları, Yatırım açık · 2 kapalı" |
| Module switch rows | `role="switch"` + `aria-checked`, ≥ 56 px. Para is locked as "Her zaman açık". |
| Gelişim on | Toast "Gelişim açıldı. Sekmesi altta.", tabs `bugun,para,gelisim,yatirim` with no reload. Bugün shows the habits and tasks. FAB adds "Alışkanlık". |
| Gelişim off | Snackbar "Gelişim gizlendi. Verilerin duruyor." + Geri al. Still visible at 3.5 s, hidden at 5.6 s. Geri al brings the tab back. |
| `state.growth` before/after all toggles | byte-identical |
| Palette picker | Grafit → Petrol → Lacivert applies instantly. After a reload: `lacivert`, theme `dark`, modules `{uber,yatirim,gelisim:true,saglik:false}` are all kept. |
| Old save (no `ui.modules`, no `ui.palette`) | Opens on Grafit with 3 tabs. Turning Gelişim and Sağlık on shows "Erken kalk" with its 27 Oct tick, and the Sağlık score and sleep. growth, health, invest and money.weeks are byte-identical. (shot: old-save-gelisim-restored.png) |
| G1 swipe | Bugün → Para → Gelişim → Yatırım works, and hidden Sağlık is skipped. A drag from x=345 on Bugün and from x=10 on Yatırım is ignored. A 200 px vertical drag with 60 px drift does nothing. Inputs don't swipe. |
| R0 at 360 (TR/EN × light/dark) | Day form "Kaydet" ends at 302 px against a card inner edge of 318 px ("Save": 306/322). The Vergi hero "Kalan $447,07" tile is inside the hero. Uber expense names wrap between words only ("Otopark ve / geçiş ücreti"). The BAS copy lists 11 Kasım, 28 Şubat, 12 Mayıs, 25 Ağustos (EN: 11 November…25 August). (shot: r0-360.png) |
| Console | `ALL ERRS []` across every run |

---

#### Blocker
- None.

#### High
- **Two switches control the same thing, and one of them does nothing.**
  - Ayarlar → Genel → "Bugün kartları" still lists Alışkanlıklar, Yapılacaklar, Sigara ve alkol sayaçları and Akşam değerlendirmesi, all shown **on**, while Gelişim and Sağlık are off.
  - Turning them on or off changes nothing on Bugün, so the app looks broken.
  - The same goes for "Uber vardiyası" when Uber araçları is off.
  - This misses AC 3 ("removes its … settings section") and goes against the single-control idea behind Modüller. It also adds clutter, which is Emre's main complaint.
  - Evidence: `aria-pressed=true` on all 4 rows with the default modules. (shot: design/shots/review-r1/genel-bugun-kartlari.png)
  - Note: R2 removes the "Bugün kartları" setting altogether. Until then, these rows should follow the modules.
- **Red is used for "due soon", which breaks AC 26 (listed under R1).**
  - The Bugün line "BHSL 8 Kas bitiyor · 11 gün · $65" uses the danger colours (`.due-line.hot` = `--loss` on `--loss-soft`) whenever the renewal is ≤ 14 days away.
  - It isn't overdue. Per §9a, red is only for over / overdue / error / delete, and this case is the amber warning one. It also has no "!" sign.
  - Impact: Emre learns that red means "something is wrong" while nothing is wrong yet. That weakens the signal for a real overdue item.
  - This is not a regression (v1.9.1 did the same), but R1 claims AC 24–27.
  - Evidence: computed bg `rgb(59,26,26)` in dark. (shot: design/shots/review-r1/bugun-due-red.png)

#### Medium
- **The undo snackbar is squeezed to 180 px wide.**
  - "Gelişim gizlendi. Verilerin duruyor." breaks into 4 one-word lines next to "Geri al", so the key reassurance of Modüller reads as a cramped block.
  - The cause is the existing toast positioning, not new code. It hits every undo toast (expense delete too).
  - The "Geri al" button is 40 px tall (< 48).
  - The button uses the gold milestone colour (`--gold-line`). §9a reserves gold for celebrations only, never for UI.
  - (shot: design/shots/review-r1/moduller-snackbar.png)
- **The tab bar is a bit below the §1 spec.** At 360 the tabs are 115 × 58 px against the spec's ≥ 120 × 64 (412: 132 × 58). They still meet the 48 px tap-target rule. test18 only asserts ≥ 110.
- **Gold is still used as a UI background.** The Para·Hafta tax box uses `--gold-soft` (`rgb(241,231,211)` light, `rgb(58,46,28)` dark). Under §9a's "one accent" rule gold is for milestones only. AC 25's scan doesn't list gold, so it passes.
- **Known and pre-existing, owned by R2 (not R1).** I checked the v1.9.1 build (a3143a2) and these look identical there:
  - At 360 the FAB covers part of "Uber'e başla" and the last line of the plan card (AC 10).
  - The Uber shift card squeezes its subtitle into a 6-line, about 70 px column. The card is 200 px tall in both builds.
  - Two different per-day numbers sit on Bugün: "günde $234" in the hero and "Günde $176" in the advice card (AC 7).
  - The Bugün hero (weekly $1.168) and the Para "Elinde kalan" hero (also $1.168) duplicate each other (AC 15).
  - (shot: design/shots/review-r1/overview.png)

#### Nit
- **Uneven module row heights.** Para (71 px) and Gelişim (72 px) are taller than the others (56 px) because "Bütçe, hesaplar, kumbaralar" and "Alışkanlık, görev, kitap, günlük" wrap at 360. (shot: overview.png, Modüller panels)
- **The selected Grafit swatch's check mark is hard to see.** The white check sits half on the light half of the swatch. Selection is still clear from the border, the tonal fill and `aria-checked`. (shot: genel-bugun-kartlari.png)
- **The Ayarlar gear is 44 × 44** (< 48). AC 20 is scheduled for R8.
- **G1 details.** The tab-swipe threshold is 60 px against the 64 px in §9b, and there is no fling detection. On Para, a swipe on the content changes tabs, not segments. The segment-first behaviour in §9b G1 isn't in the R1 scope line, so treat it as an R5 item.
- **Petrol next to green.** Petrol's teal accent sits close to the green "on track" card, as §9a predicted. It's only an option, so this is fine, but it's worth a line in the picker help if Emre ever asks why the default isn't Petrol.
- **Clipped placeholder.** In the day form, the placeholder "Ne için? Seç ya da yaz" is cut to "Seç ya da ya" next to "Kategori ↓" at 360.

---

Shots (256 colours) in `design/shots/review-r1/`:
- `overview.png`: Bugün in Grafit, Lacivert and Petrol, light and dark, plus Modüller
- `moduller-snackbar.png`
- `genel-bugun-kartlari.png`
- `bugun-due-red.png`
- `fab-gelisim-on.png`
- `old-save-gelisim-restored.png`
- `r0-360.png`
