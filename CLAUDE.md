# Momentum — project memory

Momentum is Emre's personal money / habits / health / investing app with an Uber-driver toolkit: shifts, logbook, fuel receipts, GST/BAS.
It ships as one PWA (repo root, GitHub Pages) and an Android app (Capacitor 8, `android-app/`, built by GitHub Actions).
The user speaks Turkish; the UI is Turkish first, with English via `src/8-en.js`.

## Layout

- `src/`: the only place to edit app code.
  - `build.py` concatenates `src/[0-9]-*.js` (sorted by name), `style.css` and `body.html` into the root `index.html`, `sw.js`, `manifest.webmanifest` and the icons.
  - **Never hand-edit the root `index.html`.**
- `src/8-en.js`: the EN dictionary. Every `T('…')` string needs an entry, and there must be no duplicate keys.
  - `src/keys.py` regenerates `keys.json` (the list of translatable strings).
- `tests/`: Playwright suites. Run them against the built app on port 8766.
- `android-app/`: Capacitor project.
  - `scripts/patch-android.py` sets adjustResize, the fixed signing key (`momentum-debug.jks`) and the versionCode.
  - **Never change the signing key**: users would have to reinstall and would lose their local data.
- `VERSION` + `RELEASE_NOTES.md`: a push to `main` with a new VERSION publishes `vX.Y.Z` plus a `latest` APK.
  - The release notes are written in Turkish and kept short, from the user's point of view.

## Data

- Data lives in localStorage under the key `adim-adim-v2`, with areas `money`, `growth`, `health`, `invest` and `ui`.
  - Sync: Supabase project `xauhwvoqfavngiphfueh`, table `public.user_docs` (`user_id, doc, data jsonb, updated_at, device_id`). The last writer wins per area.
  - Receipts: private Storage bucket `receipts`, path `<uid>/…`, with RLS limiting each user to their own folder.
  - The client uses plain `fetch` with the publishable key. Never put a service_role/secret key in the client.
- Key `money` fields: `trips, odo, lb (logbook), car, renewals, accounts, uberSums, pots`. Key settings: `saveTarget, saveFrom, uberPlan, jobHours`.
- **Migrations must be backward compatible.** Old app versions and old backups must still load: add fields with defaults and never rename or drop them.

## Tax rules encoded (Australia, Uber X, GST-registered, cash basis, quarterly Simpler BAS)

- G1 = Uber transport + delivery + other − tips.
- 1A = G1/11.
- 1B = GST in business-use share of expenses /11.
- Car expenses × logbook business-use % (currently 72%).
- Tips are income tax only, with no GST.
- BAS self-lodge due dates: Q1 11 Nov, Q2 28 Feb, Q3 12 May, Q4 25 Aug.

## Commands

```bash
python3 src/build.py                                   # build
(python3 -m http.server 8766 >/dev/null 2>&1 &)        # serve repo root
cd tests && for t in *.js; do NODE_PATH=$(npm root -g) node $t | tail -1; done
```

- Every suite must end with `ALL PASS`/`ALL PASSED`, `contrast-scan` must report 0 low-contrast nodes, and `v1smoke` must show `errors []`.
- Tests and fixtures must never contain the user's real data: the repo is **public**.

## Team workflow (agents in `.claude/agents/`)

| Agent | Use for |
|---|---|
| `momentum-designer` | Screen audits, simplification, colors/buttons/spacing, mockups. Read-only on `src/`. |
| `momentum-developer` | Implementing an approved change in `src/`, tests, build, release notes. |
| `momentum-database` | Supabase schema/RLS/storage/sync questions, advisors, logs. Read-only unless the user approves a migration. |

Flow for any feature or redesign. The product-management skills drive it:

1. **Spec** (`product-management:write-spec`): problem, goals, non-goals, acceptance criteria. Add the item to `ROADMAP.md`.
2. **Design** (`momentum-designer`): audit and proposal. The user approves.
3. **Data check** (`momentum-database`): only if the shape of stored data, sync or storage changes.
4. **Build** (`momentum-developer`): smallest change that meets the acceptance criteria, then tests.
5. **Verify**: a fresh run of all tests plus screenshots. A different agent reviews it (not the one that wrote the code).
6. **Release**: `changelog-generator` produces the Turkish release notes, then bump VERSION.
7. **Update** `ROADMAP.md` (`product-management:roadmap-update`).

Rules for every agent:

- Coding: think before coding, keep it simple, make surgical changes, use goal-driven checks (karpathy-guidelines).
- Debugging: find the root cause first (systematic-debugging).
- Completion: no claim without fresh evidence (verification-before-completion).
- Ask the user before anything irreversible: a migration, deleting data, changing the signing key, or anything that loses local data.
- Reports back to the main conversation use the caveman style: answer first, no filler, and exact paths, numbers and errors.
