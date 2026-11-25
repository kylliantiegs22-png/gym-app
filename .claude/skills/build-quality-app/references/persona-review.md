# Persona playtests and the scorecard

Purpose: find what automated checks can't: whether *people like the audience* can use the app to do something real. In the build this came from, persona rounds found problems that two full validation passes had missed: a missing weekly-to-monthly conversion that left two personas' plans $395 and $625 short, a goal question whose answer did nothing, and examples that matched nobody's life.

## 1. Personas

Pick 3 to 5 covering the real audience's range: age, income, device comfort, reading level, goal, and life constraints (a parent with interrupted evenings, a shift worker, a student, a teen). Give each a one-line life with real numbers, onboarding choices (goal, level, time, theme), a mistake rate and a behaviour: missed days, an interrupted task, an offline commute. Put them in a JSON file.

## 2. The harness

Write one script (`examples/persona-playtest.py` is a full worked example: Python Playwright, one browser context per persona, which is cleared storage by construction):

- 390x844, mobile, touch; **CPU throttle 4x and slow-4G** through a CDP session so "mid-range phone" is measured, not assumed.
- **Fake the clock** (`page.clock.install`, then `set_system_time` + reload per "day") so multi-day behaviour (streaks, due reviews, "next day return") is exercised in minutes.
- The persona's own onboarding choices; deterministic mistakes (e.g. wrong every Nth question); a failed-then-passed gate; a reload mid-way; an offline reload; an interrupted session; a missed day.
- Write a **transcript** of every screen's text (to a git-ignored folder: Playwright wipes `test-results/` on each run) and **screenshots** at key moments to `docs/persona-evidence/round-N/`. Write measured facts to `<persona>.json` (timings, errors, final state). Wait for network idle before each reload; filter only the known cancelled-favicon case.
- Record storage emptiness **at page start** with an init script (the app may write defaults on first load, so reading afterwards lies).

## 3. Play, then read

Read the transcript as the persona: every screen's words, at their reading level. Look for: jargon, examples that aren't their life, steps they can't do, promises that aren't kept, dead ends, "what now?" moments, anything that makes them feel judged.

## 4. The real-life test

After the course, each persona writes a short plan with their own numbers using **only what the app taught** (a budget, a goal, a buffer, a schedule; whatever the app is for). Compute the arithmetic in code. Any step they cannot do is a finding, with the lesson that should have taught it. Steps that belong to a later, not-yet-built part of the product are Recommendations, not penalties, provided the app is honest about what is coming.

## 5. Score (`templates/scorecard.md`)

Nine categories, 100 points, weighted toward whether the persona learned or achieved something real:

| Category | Points |
| --- | --- |
| Educational / outcome value | 20 |
| Content accuracy and quality | 15 |
| UX and navigation | 15 |
| Functionality and reliability | 15 |
| Engagement and interactivity | 10 |
| Accessibility and inclusivity | 10 |
| Visual design | 5 |
| Performance | 5 |
| Privacy and security | 5 |

Bands: 90 to 100 outstanding, 80 to 89 excellent, 70 to 79 good, 60 to 69 satisfactory, below 60 needs improvement.

**Score like a hard but fair reviewer who paid for it, not like the author.** Every point needs evidence (screenshot, quote, measurement). Any score at 85 or above must still list weaknesses. Don't mark down for scope that belongs to later phases; list it under Recommendations. Re-score each round from what you see, not from what you changed.

## 6. Findings and rounds

Log findings (id, severity, personas affected, where, evidence, status: fixed with test name, or won't-fix with reason). Fix highest severity and most-personas-affected first, through diagnose-and-verify, running `check` after each fix and looking at screenshots after UI changes. Then run a **fresh full round from cleared storage**. Typically 3 to 4 rounds: baseline, fixes verified, a close read that finds the subtle ones, a final clean round.

**Done**: the latest round was played from cleared storage after the last product-code change; every persona meets the total and the key-category thresholds you set; each persona's plan is complete and correct; no blocker or major is open; `check` passes. Harness-only and docs-only commits after the round don't invalidate it; say so in the log.
