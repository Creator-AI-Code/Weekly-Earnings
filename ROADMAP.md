# Momentum roadmap

Format: Now / Next / Later. Each item gets a slug, a goal, and acceptance criteria before work starts (see the Team workflow in `CLAUDE.md`).

## Now

### `sadelik`: simplify the app (v2.0)
- **Problem:** the app has too many cards and settings. Daily use between Uber trips is slow, and finding things is hard.
- **Goal:** each screen answers one question and shows one primary action. Quarterly tools move out of the way.
- **Decision (28 Oct 2026):** Gelişim and Sağlık are hidden, not deleted. Settings gets a "Modüller" section with these two off by default; their data and sync stay untouched. Yatırım stays.
- **Shipped:** v1.9.2 (R0 fixes) and v2.0.0 (R1: Modüller, 3 tabs, Grafit/Lacivert/Petrol palettes), 28 Oct 2026. Review: `design/review-r1.md`.
- **Open from review:** the Bugün kartları switches ignore hidden modules; due-soon renewals show red (should be amber).
- **Steps:**
  1. `momentum-designer`: screen-by-screen audit, keep/merge/move/remove → `design/audit-sadelik.md`
  2. Emre approves the proposal and mockups (`design/proposal-sadelik.md`)
  3. Decide: simplify within one app, or split into Momentum + Momentum Drive (only if step 1 shows simplification is not enough)
  4. `momentum-developer`: implement in small releases, one screen per release
- **Acceptance (draft):**
  - Today shows ≤ 3 cards above the fold at 360×780.
  - Adding an expense takes ≤ 3 taps.
  - Starting and ending a shift takes 1 tap each.
  - All suites pass, with 0 contrast issues in light and dark.

### `native`: Momentum 3 in Kotlin (decided 14 Nov 2026)
- **Decision:** Emre chose a full native rewrite (Kotlin + Jetpack Compose) for personal use, sideloaded, no Play Store.
- **Where:** `native/`, built by `.github/workflows/native.yml` into the `native-latest` pre-release. App id `app.momentum.next`, so it installs next to the Capacitor app.
- **M1 (this branch):** Bugün (goal ring, count-up, one-tap expenses, keypad sheet, undo, confetti) and Para (animated money flow). Offline, own local file.
- **M2 (done 14 Nov 2026):** sign in to Supabase and read/write the existing `money` document. Writes fetch the latest row, replay only this app's own changes (add/undo an expense, savings target) and save only if `updated_at` still matches, so fields the app does not know are carried over untouched.
- **M3a (done 14 Nov 2026):** the budget and tax engine ported to `Calc.kt` (`weekCalc`, `calc`, quarter tax, `weekPlan`). `native/parity/web-engine.js` runs the web app's own code in Node; `CalcParityTest` fails if Kotlin and web differ by more than half a cent. Regenerate `native/parity/expected/` whenever the engine in `src/` changes.
- **M3b (built 14 Nov 2026, live write test pending):** Uber shifts on Bugün: start and end by odometer with the web app's rules (`Shifts.kt`, `ShiftsTest`). Finished shifts are still deleted in the web app only.
- **M3c (built 15 Nov 2026, read-only):** the Vergi (BAS) screen, a port of `paraTax` / `taxWeeksCard` in `src/5-tax.js`: quarter stepper, set-aside hero with the BAS due date, quarter breakdown (sales, 1A, 1B, GST payable, profit, income tax share, MLS), weekly transfers, expense total, financial year so far. Opened from the tax line on Bugün or the Vergi row on Para. Figures come from `Calc.bas(key)`, parity-tested for five quarters per fixture. Still web only: marking a week "Aktardım" (and undo / top-up), manual set-asides, Uber expenses (add, edit, delete, receipt scan), Uber tax summary (PDF upload, manual gross fares and fees), the expense list itself, car and logbook cards.
- **M3+:** BAS write actions (above), accounts and pots, weather, home-screen widget, receipts. The web app stays the source of truth until parity.

## Next

- Year-end tax summary and an accountant export (CSV + PDF)
- BAS lodging guide inside the app (G1 / 1A / 1B mapped to the ATO form)
- Car depreciation

## Later

- Field for DiDi and other platforms
- Bluetooth auto-detect for starting and ending shifts
- Android home-screen widget
