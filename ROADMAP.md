# Momentum roadmap

Format: Now / Next / Later. Each item gets a slug, a goal, and acceptance criteria before work starts (see the Team workflow in `CLAUDE.md`).

## Now

### `sadelik`: simplify the app (v2.0)
- **Problem:** the app has too many cards and settings. Daily use between Uber trips is slow, and finding things is hard.
- **Goal:** each screen answers one question and shows one primary action. Quarterly tools move out of the way.
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

## Next

- Year-end tax summary and an accountant export (CSV + PDF)
- BAS lodging guide inside the app (G1 / 1A / 1B mapped to the ATO form)
- Car depreciation

## Later

- Field for DiDi and other platforms
- Bluetooth auto-detect for starting and ending shifts
- Android home-screen widget
