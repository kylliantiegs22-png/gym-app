# Gotchas (each one cost real time)

**Test tooling**
- Playwright **deletes `test-results/` at the start of every run**, wiping anything you wrote there (transcripts, logs). Write artefacts elsewhere and git-ignore them.
- Reloading while the previous page's favicon request is in flight logs `ERR_ABORTED`. That is the harness, not the app. Wait for network idle before reloading, and filter only that one case.
- A fake clock: install it before the first `goto`, then jump with `set_system_time` and reload. Assertions on "today" must read the faked date.
- `getByRole('dialog', { name })` needs the dialog's accessible name; `aria-label` on the dialog gives it.
- If an element is "not stable" when clicking, something is still moving (an entrance animation, or a popover overflowing the viewport); measure its box over time instead of adding retries.
- Playwright's bundled browser version must match the installed package; in containers with a preinstalled Chromium pass `executablePath`.
- Serve the **built** app with `vite preview --port N --strictPort --outDir D` on a second port when another run is using the first, so two runs never fight over one server.
- Don't rebuild `dist` while a long run is using it.
- Keep per-spec seeds in `addInitScript` guarded by a `sessionStorage` flag, otherwise a reload re-seeds and hides persistence bugs.

**Test honesty**
- A new regression test that passes without the fix proves nothing. Revert the fix and watch it fail.
- Make e2e specs fail on **console errors**, not just page errors.
- A harness flag read after the app has run can lie (storage looked non-empty because the app wrote defaults on load). Record at page start.
- When you run a test to watch it fail, make sure the server is serving the build **without** the fix; a preview server serves whatever is in `dist` at request time, so rebuild deliberately before each run.

**Bugs that only real play found**
- UI state keyed to the wrong thing: answer state carried from one question type to the next (an array expected, a number found) and blanked the app. Key per-screen state to the screen's identity.
- Re-queued items inserted after a terminal screen so a flow ended on the wrong thing; clamp insertion positions.
- A keyframe `transform` overrode a `translateX(-50%)` centring; the element slid in off-centre and a hit-test passed because it ran mid-animation.
- A fixed banner covered a header's Close button; place status UI below fixed controls.
- Quoted text in tests drifts from copy; assert on stable `data-testid`s and a few exact phrases that matter.

**PWA and hosting**
- Auto-update helpers reload on activation. Defer to a safe moment (`data-layer.md`).
- Users on an installed app see the new version after it downloads in the background: close fully and reopen, sometimes twice. Opening the site in the browser fetches it too.
- iOS: deleting a home-screen web app typically deletes its saved data (it is separate from the browser's). Offer export first.
- GitHub Pages: set the Pages source to "GitHub Actions"; the first publish fails if that isn't set before the first run, so re-run after enabling. Confirm the deploy job's conclusion is success. Hash routing avoids 404s on refresh.
- On free GitHub plans, Pages needs a public repo (check the current plan rules before relying on this).
- Branch vs main: work on a branch is invisible to users until merged to the branch that deploys.

**Sources and facts**
- Government and regulator sites often block automated fetching. Say so in the facts file ("could not verify, taken from X") rather than implying it was checked; verify what you can (some sites do respond) and mark each fact with how it was verified.
- Round-trip figures through code: every worked example's arithmetic is recomputed by the validator or the plan check.
