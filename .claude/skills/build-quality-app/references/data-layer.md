# The data layer: bulletproof local data

For apps that keep state on the device (localStorage, IndexedDB) with no backend. Goal: nothing a user or browser does loses progress or shows a blank screen.

## Rules for the storage module

1. **Guard every access.** In some private and sandboxed modes merely reading `window.localStorage` throws. Wrap access (`getStorage()` returns null if unusable). The app must run from memory with a visible warning.
2. **Version the schema** (`v` field, versioned key). Older saves migrate by filling defaults; newer saves load best-effort and are backed up before anything is written.
3. **Sanitise every read, field by field.** Never spread parsed JSON into state. Validate types and ranges; a bad field falls back to its default and the rest of the progress is kept. Derive what you can (an `onboarded` flag from existing progress; passed units from completed checks).
4. **Back up what you can't read** (unparsable, newer, or repaired data) to a dated key before the first write. Cap the number of backups.
5. **Writes never throw.** Return a result. On `QuotaExceededError`: free what you own (old backups), prune rebuildable data (old day logs), retry, and if it still fails keep working in memory and tell the user with a Try again button. Keep the last good save untouched.
6. **Tell the user** about unreadable data, repairs and failed saves in plain words, once, dismissable. Warnings must not cover primary controls (the first version of this covered a Close button).
7. **Multi-tab**: listen for `storage` events and adopt the newer state, otherwise the last writer rolls back another tab's progress.
8. **Import/export** goes through the same sanitiser as load.
9. **Error boundary** at the root: a calm recovery screen with a way home and a reload, never a blank page. It must not touch saved data.
10. **Clock and timezone**: day keys are local dates; day arithmetic uses UTC date parts so DST can't shift a day. Treat "today is earlier than the last recorded day" (travel, clock fix) as already-counted, not as a reset.

## Service worker and updates

- A new version must not reload the page mid-task. Hold the reload until a safe screen (not mid-lesson/checkout/form, and after onboarding), and apply it when the user next returns to such a screen or hides the app. Some auto-update helpers call `location.reload()` the moment the new worker activates; check what yours does.
- Precache everything needed offline (fonts, icons, sounds, data). Verify with an offline reload that renders a real screen and an offline flow that completes.
- Tell users how updates arrive: the app downloads the new version on open and shows it on the next open or reload; closing fully and reopening is the lever. On iOS, deleting a home-screen web app erases its saved data, so offer export first.

## Test with fake storage and a fake clock

- Unit-test the persistence functions against an in-memory Storage that can be made full or blocked. Cover: missing, unreadable, partly corrupt (keep the valid fields), per-entry corruption, older, newer, blocked, quota with prune-and-retry, quota that stays full (old save intact), backup cap.
- Unit-test time logic with a faked system clock across month and year ends, DST changes, timezones, and the clock going backwards.
- Run `scripts/resilience.mjs` against the built app for the browser-level version of all of this.
- Add an app-specific e2e for "progress kept": seed a known state with partly corrupt fields, load, assert the valid progress is still shown.

## Privacy and safety scan

Scan the built JS and HTML for external URLs, analytics, trackers, keys and tokens. Anything that is only data (source citations) should be data, never fetched. External links open with `rel="noopener noreferrer"`. No third-party requests means nothing to leak.
