# The full loop

Phases in order. Do not skip ahead: each one makes the next cheaper.

## 0. Spec (10 minutes, saves days)

Write down, in the repo (`docs/` or a goal prompt):

- **Outcome**: one paragraph a stranger could check. Include who it is for and what they can do after using it that they couldn't before.
- **Quality bar**: what "funded product, not tutorial project" means here (design system, motion, sound, copy tone).
- **Scope exclusions**: what you will not build (accounts, backend, sync, new features during review rounds). This stops review rounds turning into feature creep.
- **Definition of done**: measurable (validator passes, all tests pass, scripted run completes the main flow, scores at or above a number, no blocker or major open).
- **Constraints**: hosting cost, offline, data stays on device, licences (free assets only).

`templates/goal-prompt.md` is a fill-in version.

## 1. Foundation

- **Design tokens in one file** (colour, gradient, type, radius, spacing, motion). Every component uses tokens, never literals. See `design-quality.md`.
- **Content as data** if the app has repeatable content (lessons, recipes, drills, listings): JSON files plus a schema, plus a validator script that fails the build on structural problems (counts, limits, missing answers, wrong arithmetic, unknown references). Writing content one unit at a time and validating each before the next is far cheaper than fixing a batch.
- **Facts that change** (rates, prices, thresholds, dates) live in one dated file with source URL and "how it was verified". Content references them by key.
- **Pure logic apart from UI** (scheduling, scoring, unlocking, streaks, parsing). Pure functions take `now` as a parameter so tests can fake the clock.
- **Storage layer** written defensively on day one (`data-layer.md`).
- **Routing that survives reload on static hosting**: hash routes need no server rewrites.
- **Layout shell**: a scroll container with a fixed header and footer works better under test and on phones than window scrolling with sticky bars.

## 2. Close-the-loop command

One script, `check`, that a single command runs and that exits non-zero on any failure:

1. content validator
2. typecheck
3. unit tests (fake clock, fake storage)
4. production build
5. e2e at 390x844 with axe on every main screen, failing on **any** console error or uncaught page error
6. driven sweep of every screen (webapp-testing style) recording console output

Run it after every fix. Keep it fast enough to run often; if e2e takes minutes, run the narrow spec while iterating and the full `check` before committing.

## 3. Drive it and look

Serve the **built** app (not the dev server: service worker, base paths and minification behave differently). Run `scripts/visual-sweep.mjs`, then open every screenshot yourself. For each: hierarchy (one obvious primary action), spacing rhythm, alignment, empty and error states, dark mode, text contrast, anything clipped or cramped, anything that looks default. Fix, rebuild, re-run. Repeat until a stranger would not guess it was made without a designer.

## 4. Validation passes (twice)

`validation-passes.md`. One pass each of five lenses, fixing as you go, logging findings. Second full pass on the fixed app, because fixes cause new issues (in the build this was based on, pass 2 found a banner covering a Close button and an animation that overrode a centring transform, both introduced by pass 1 fixes).

## 5. Persona rounds

`persona-review.md`. Played from cleared storage, scored, fixed, replayed. The last round must be played after the last product-code change.

## 6. Ship

- Deploy from the main branch; confirm the deploy job **finished successfully** (don't assume).
- Know how existing users receive an update (service worker behaviour, `references/gotchas.md`) and tell them.
- Keep a README with run, check and add-content instructions, and the validation and persona reports in `docs/`.
