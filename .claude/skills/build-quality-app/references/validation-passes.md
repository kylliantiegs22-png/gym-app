# Five validation passes, twice

Run in this order. One pass each, fixing as you go, then a second full pass on the fixed app. Log everything in `docs/validation-report.md` (`templates/validation-report.md`).

**Severity.** *Blocker*: progress lost, blank screen, flow impossible. *Major*: a key task is frustrated, the user is misled, or a WCAG AA failure. *Minor*: everything else. Every fixed blocker and major gets a regression test, named in the log. Minor items may be won't-fix with a stated reason.

## 1. Usability (Nielsen's 10 heuristics)

Walk onboarding, the home screen, a primary flow, feedback, the end-of-flow screen, review and any settings, in light and dark. Score each heuristic against specifics and quote the screen.

Things that were found this way: a blank page on any render error (error recovery); a sheet that covered the bottom of long questions (visibility); copy promising a skip-ahead that didn't exist (match with the real world); a force-reload on app update that threw away work in progress (user control); unexplained icon chips (recognition); disabled buttons with no reason shown (error prevention).

Add the **promise audit**: grep the UI strings for "we'll", "will", "so that", "to point you", "your X" and check the code does it. Four separate false promises were found this way ("we'll ask how it went", "we'll point you at the right units", "pick this up again", "skip ahead by passing the check").

## 2. Accessibility (WCAG 2.2 AA)

Automated: axe with `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` on every main screen in light and dark, plus the states (feedback sheet, dialogs, banners, popovers). Manual, because automation finds only a subset:

- **Keyboard only**: Tab, Shift-Tab, Enter, Space, Escape through a whole flow. No traps; visible focus; Escape closes popovers and dialogs and returns focus to the opener.
- **Focus management**: when a new screen replaces the last, move focus to its heading (`tabindex=-1`) so screen readers announce it.
- **Dialogs**: `role=dialog`, `aria-modal`, focus moves in, Tab stays inside, Escape closes.
- **Roles that promise behaviour**: `role=radio` promises arrow keys; use toggle buttons with `aria-pressed` in a labelled group unless you implement the pattern.
- **Colour is never the only signal**: matched pairs get numbered badges; right and wrong get icon and words.
- **Accessible names match visible text** (WCAG 2.5.3): hidden extra text goes after the visible text, not in an `aria-label` that replaces it.
- **Headings and titles**: one `h1` per screen, a distinct `<title>` per route (set in an effect, not during render).
- **Targets**: 44 px (the sweep measures; inline links in a sentence are exempt).
- **Reduced motion**: no looping or long animations, no confetti. Verify with `reducedMotion: 'reduce'`.
- **Text joins**: adjacent inline elements need a real space or screen readers read "Unit 3Your goal".

## 3. Driven testing (webapp-testing)

Drive the **built** app in Playwright at 390x844 through every screen: onboarding, every main flow, every setting toggle, offline reload and an offline flow. Record every console error and warning, page error and failed request per screen. Zero is the bar. Waiting for the network to be idle before a reload avoids false alarms from cancelled in-flight requests. Make every e2e spec fail on any console or page error.

## 4. Code, performance and data layer

React: bundle size (measure; barrel imports often don't matter once tree-shaken, check before "fixing"), re-render hygiene (no components defined inside components, derived state not in effects, listeners cleaned up), effects that touch the DOM belong in effects. The data-layer checklist is `data-layer.md`. Measure before changing; log a won't-fix when the measurement shows no gain.

## 5. Diagnose and verify (every fix)

1. **Root cause**: reproduce, read the full error, trace backward through the data flow. Write down the chain.
2. **Failing test first**, failing for the right reason (read the assertion message).
3. **Fix the cause**, not the symptom. Never catch-and-suppress to make an error vanish.
4. **Prove**: run the test and the relevant suite; read the output. To show a new test is real, temporarily revert the fix and watch it fail, then restore.
5. If three fix attempts fail, stop and reassess the design.

Anti-rationalisation: "probably X" means you haven't traced it. "Quick fix" without diagnosis creates a new bug. A test that passes without the fix is not a regression test (this happened once: the assertion ran before an entrance animation moved the element).

## Second pass

Re-run all five on the fixed app, looking specifically for what the fixes broke (new banners over controls, focus moves that paint rings after a tap, copy that now over-promises, tests that pass for the wrong reason). The second pass must find no new blocker or major to close the process.
