---
name: build-quality-app
description: Build any web or mobile-web app (React, Expo web, PWA) to a high, shippable standard and keep it there. Use when asked to build, create, polish or "close the loop" on an app; to run quality checks, validation passes, accessibility or usability audits; to screenshot every screen and critique the visuals; to test with Playwright at phone size; to harden saved data, offline and storage; to run persona playtests or a scored review; or before handing an app over. Gives the build order, a visual sweep and a data-resilience script, and the review and persona protocols.
---

# Build a quality app, and prove it

Paths below are relative to the app's root (the folder with `package.json`). This skill is app-agnostic: nothing in it assumes a domain. It came out of building and hardening a finance-learning PWA end to end, so every rule is something that actually caught a bug there.

## The idea in one paragraph

An app is "done" when **evidence says so**, not when it looks done. Write the outcome and quality bar first, build from a design system and data-driven content, wire one command (`npm run check`) that fails on any regression, then run the app yourself at phone size, screenshot every screen, **look at the screenshots**, and review it five ways (usability, accessibility, driven testing, code and data layer, root-cause fixing). Then play it as real users (personas), score it honestly, fix, and replay from cleared storage until the scores and the "no blocker or major open" rule hold.

## The loop (details in `references/loop.md`)

1. **Spec**: outcome, audience, quality bar, scope exclusions, "done" definition. Template: `templates/goal-prompt.md`.
2. **Foundation**: design tokens first (`references/design-quality.md`); content as data with a validator; pure logic separated from UI; storage layer written defensively from day one (`references/data-layer.md`).
3. **Close-the-loop command**: `check` = content validator, typecheck, unit tests (fake clock, fake storage), build, e2e at 390x844 with axe, and a console-error sweep. Fail on any page error or console error.
4. **Drive and look**: run the visual sweep below. Open every screenshot. Fix anything that looks amateur. Re-run.
5. **Five validation passes, in order, then again** (`references/validation-passes.md`): usability heuristics, accessibility (WCAG 2.2 AA), driven testing, React/code plus the data layer, diagnose-and-verify. Log every finding with severity and status in `docs/validation-report.md` (`templates/validation-report.md`). The second pass looks for problems the fixes introduced.
6. **Persona rounds** (`references/persona-review.md`): 3 to 5 personas matched to the real audience, each played end to end from **cleared storage** on a faked clock with throttled CPU and network, scored on a 100-point scorecard (`templates/scorecard.md`), then fixed and replayed. Log in `docs/persona-review.md`.
7. **Ship and update**: deploy, confirm the deploy finished, and know how users get the new version (`references/gotchas.md`).

## Run the visual sweep (agent path)

`scripts/visual-sweep.mjs` screenshots each screen in light and dark at 390x844 and checks: horizontal overflow, tap targets under 44 px, text under 12 px, fonts not loaded or falling back to defaults, emoji used as icons, images without alt, console and page errors, failed requests, and axe WCAG 2 A/AA (contrast, names, roles). Exit code 1 means a hard failure. Describe your screens in a JSON config (copy `templates/sweep.config.json`; a filled-in example is `examples/tally.sweep.config.json`).

Build the app and serve the **built** output on its own port (the dev server behaves differently: service worker, base path, minification), in the background:

```bash
npm run -s build >/dev/null 2>&1; (nohup npx vite preview --port 4181 --strictPort > /tmp/preview4181.log 2>&1 &); sleep 3; curl -s -o /dev/null -w "preview: %{http_code}\n" http://localhost:4181/
```

Then run the sweep (the exact command used on the example app; swap in your own config):

```bash
node .claude/skills/build-quality-app/scripts/visual-sweep.mjs --config .claude/skills/build-quality-app/examples/tally.sweep.config.json
```

Screenshots and `report.md` land in the config's `outDir` (here `screenshots/sweep/`). **Read the PNGs.** The script catches objective faults; only your eyes catch "this looks cheap", wrong hierarchy, cramped spacing, unbalanced layouts or dull empty states.

## Run the data-resilience probe (agent path)

`scripts/resilience.mjs` loads the app under 30+ hostile conditions (no saved data, cut-off JSON, wrong types, every top-level field null or garbage, older and newer saved versions, storage full, storage blocked as in private mode, offline reload) and passes a scenario only if the app renders and logs no error. Give it the storage key, a valid saved state, and the selectors that mean "the app is up" (any of):

```bash
node .claude/skills/build-quality-app/scripts/resilience.mjs --url http://localhost:4181 --key tally.v1 --seed .claude/skills/build-quality-app/examples/tally-saved-state.json --ready "[data-testid=path],[data-testid=onboarding]" --version-field v
```

It proves "no blank screen". It does **not** prove progress was kept: add an app-specific e2e test for that. A missing favicon counts as a console error and fails the scenario (fix it, don't ignore it).

## Hard rules

- **Look at screenshots** after every UI change, light and dark. A passing script is not a verdict on design.
- **Test first, then fix, then prove.** For each blocker or major: write a test that fails for the right reason, fix the cause, show it pass. To prove a test is real, temporarily remove the fix and watch it fail.
- **Never delete a test or loosen a check to go green.** If a check is wrong, fix the check and say why.
- **No promise the app can't keep.** Audit every sentence that says "we'll ...": if nothing in the code does it, change the words or build it.
- **Honest scores.** Every point needs evidence (screenshot, quote, measurement). Any total of 85 or more must still list weaknesses. Score from what you see in the latest round, not from what you changed.
- **A round only counts if it was played after the last product-code change.** Change code, replay.
- **State what you could not verify** (blocked sites, unreachable sources) in the product's facts file and the report; never present it as checked.

## Prerequisites

Playwright and `@axe-core/playwright` as dev dependencies of the app (the scripts resolve them from the app's own `node_modules`). In a container with a preinstalled Chromium, set `CHROMIUM_PATH` if it is not at `/opt/pw-browsers/chromium`. Use Node 20+.

## Troubleshooting (all hit for real)

- `Playwright not found in this project`: install it in the app, not globally; the scripts look in the app's `node_modules`.
- Sweep fails every screen on `console.error ... 404`: a missing favicon. Add one.
- Every scenario fails with "app never became ready": your `--ready` selectors don't match what the app shows when healthy; check them in a real run first.
- Other gotchas (Playwright wiping `test-results/`, reload noise, fake clock, service worker reloads, PWA caches): `references/gotchas.md`.
