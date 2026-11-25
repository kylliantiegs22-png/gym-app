# Goal prompt skeleton (paste into /goal, filling the brackets)

OUTCOME
[One paragraph a stranger could verify: the app, who it is for, what a user can do afterwards. Platform, hosting and cost constraints.]

REFERENCE
[Docs the work follows; say which wins on conflict.]

QUALITY BAR
Feels like a funded product shipped it: every screen from one design system, nothing default-browser, real dark mode, AA contrast, [fonts], [icon family], one motion system (about 150/250/400 ms plus one spring; transform and opacity only; reduced motion honoured), feedback with icon and words, celebration in proportion. [Domain content rules: tone, limits, what counts as accurate.]

PROGRESS AND HABIT
[Streaks, reminders, goals, review: what is in scope, what is explicitly not.]

CLOSE THE LOOP
Each iteration run the content validator, the typecheck and unit tests (fake clock, fake storage). Build, serve, and drive the built app with Playwright at 390x844: complete the main flow, check state changes and persists after reload, save screenshots of each key screen (light and dark), look at them, fix anything unpolished. Installable and offline. axe finds no AA failures.
Done = [measurable conditions].

SCOPE
Free to choose: [framework, layout, libraries, as long as free and static].
Not: [accounts, backend, sync, push, new features during review rounds, paid assets, redesigns].

---
Follow-up goal 1, validation: run five lenses (usability, accessibility, driven testing, code plus data layer, diagnose and verify) in order, twice; log in docs/validation-report.md; every blocker and major fixed with a named regression test; data layer proven by tests for corrupt, missing and older saved data, full quota, private mode and offline reload mid-flow.

Follow-up goal 2, persona review: N personas from the real audience, each played from cleared storage on a faked clock with a throttled phone; scored on the scorecard; real-life plan using only what the app taught; findings fixed highest severity first; fresh round until thresholds hold; log in docs/persona-review.md.
