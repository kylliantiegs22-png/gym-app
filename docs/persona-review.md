# Persona review (gym goers)

Five people use Lifts the way they would in a real gym. Each is played end to end by `tests/persona.js` (Playwright, Chromium) from **cleared storage**, on a **faked clock** across several days, at 390×844 with **CPU throttled 4×** and a **slow-4G** network. Each persona has their own habits and mistakes. The harness prints a transcript, takes screenshots, counts taps, and flags what a gym-goer would hit. Evidence: `docs/persona-evidence/round-N/` (screenshots, `<persona>.json` facts, `<persona>.md` transcript).

Severity: **blocker** (data lost, flow impossible) / **major** (promise broken, or the person is misled or loses a set) / **minor**.

**Bar to ship:** no blocker or major open, and every persona at 80 or more.

## The personas

| | Who | What they stress |
| --- | --- | --- |
| **Bea, 19** | First week in a gym | Empty-bar weights, bodyweight and timed exercises, accidental taps, phone locking mid-workout |
| **Marcus, 31** | Experienced, Push/Pull/Legs | Progressive overload, 142.5 kg decimals, extra sets, machine taken mid-workout, wants PR feedback |
| **Priya & Sam** | A couple on one phone | Two people's data, handing the phone over mid-workout, not logging into the wrong person |
| **Dev, 45** | Back after 7 weeks, sore knee | Deload after a break, past typo (1000 kg instead of 100), editing history |
| **Zoe, 27** | Basement gym, no signal | Fully offline, one thumb, sweaty hands, rest between sets, screen locking |

## Scorecard (100)

| Category | Max |
| --- | --- |
| Logging speed & flow (taps per set, no lost sets) | 20 |
| Progression & programming guidance | 15 |
| Data safety (nothing silently lost, fixable mistakes) | 15 |
| Gym-floor usability (one hand, sweat, tap size, rest) | 15 |
| Offline & phone behaviour | 10 |
| Progress feedback & motivation | 10 |
| Visual design | 5 |
| Performance | 5 |
| Privacy | 5 |

---

## Round 1 (baseline: the app after the data-resilience pass)

Played 24 Nov–1 Dec 2026 (fake clock). Evidence: `round-1/`.

| Category | Bea | Marcus | Priya & Sam | Dev | Zoe |
| --- | --- | --- | --- | --- | --- |
| Logging (20) | 11 | 14 | 15 | 14 | 14 |
| Progression (15) | 9 | 11 | 11 | 6 | 10 |
| Data safety (15) | 8 | 13 | 12 | 7 | 13 |
| Gym-floor (15) | 11 | 11 | 12 | 12 | 9 |
| Offline/phone (10) | 8 | 9 | 9 | 9 | 9 |
| Feedback (10) | 6 | 6 | 6 | 4 | 6 |
| Visual (5) | 4 | 4 | 4 | 4 | 4 |
| Performance (5) | 4 | 4 | 4 | 4 | 4 |
| Privacy (5) | 5 | 5 | 5 | 5 | 5 |
| **Total** | **66** | **77** | **78** | **65** | **74** |

**Result: fails the bar.** Nothing crashed and nothing was mixed between people, but five majors were open.

### What each persona hit

- **Bea.** Ticked 12 sets, the log kept **5**. A bodyweight set with no weight, and a tick with nothing typed, vanished at Finish with no warning, so Push-Up and Plank were never recorded. Her plank (30 s typed into the reps box) would also have triggered "Go heavier +1 kg" the moment it was saved, because 30 ≥ 12 reps.
- **Marcus.** Bench went to 102.5×8 as promised (strength). But no way to swap an exercise mid-workout (machine taken), no PR acknowledgement, and tapping a weight box left the caret at the end of "102.5", so replacing it took several backspaces. A set he typed but forgot to tick would have been dropped.
- **Priya & Sam.** Data never mixed (Sam never saw Priya's 40 kg), and her in-progress workout waited intact. But the workout screen never said whose workout it was.
- **Dev.** After a 7-week break the app said "Go heavier" on 2 lifts, including leg press at **1005 kg**, built from his 1000 kg typo. The typo could not be edited: the only option was deleting the whole session, and 1000 kg owned his best on the Progress screen.
- **Zoe.** Offline worked (cold open 190 ms), tap targets were fine, export worked. But no rest timer and the screen was not kept awake, so every set meant unlocking a phone with wet hands.

### Findings

| # | Severity | Finding | Fixed |
| --- | --- | --- | --- |
| G1 | major | Ticked sets with no weight (bodyweight) or nothing typed vanish at Finish | Round 2 |
| G2 | major | Timed holds (plank, farmer carry) read seconds as reps and trigger "Go heavier" | Round 2 |
| G3 | major | Sets typed but not ticked are silently dropped at Finish | Round 2 |
| G4 | major | No swap/add exercise during a workout | Round 2 |
| G5 | major | Workout screen never shows whose workout it is | Round 2 |
| G6 | major | "Go heavier" shown after a long break, never mentions the gap | Round 2 |
| G7 | major | Past workout cannot be edited (typo ruins best and suggestions) | Round 2 |
| G8 | major | No rest timer | Round 2 |
| G9 | major | Screen not kept awake during a workout | Round 2 |
| G10 | minor | Tapping a weight box does not select it | Round 2 |
| G11 | minor | No acknowledgement of a personal record | Round 2 |

---

## Round 2 (after the fixes; played after the last product-code change)

Fixes: a tick now needs reps (and weight, except bodyweight/timed, which default to 0 kg); timed holds log in seconds and never nudge; Finish asks about typed-but-unticked sets; per-exercise **Swap** and **+ Add exercise** in a workout; the person's name on the workout screen; no "Go heavier" after more than 4 weeks away, with a "Welcome back" card and "7 wks ago" on stale numbers; **Edit** on past workouts; a rest timer pill; screen wake lock; tap selects the whole number (and comma decimals work); "New PR" in the finish toast.

Evidence: `round-2/`. Run twice with identical results.

| Category | Bea | Marcus | Priya & Sam | Dev | Zoe |
| --- | --- | --- | --- | --- | --- |
| Logging (20) | 16 | 17 | 17 | 16 | 17 |
| Progression (15) | 11 | 12 | 11 | 11 | 11 |
| Data safety (15) | 14 | 14 | 14 | 14 | 14 |
| Gym-floor (15) | 12 | 13 | 13 | 13 | 12 |
| Offline/phone (10) | 9 | 9 | 9 | 9 | 8 |
| Feedback (10) | 7 | 8 | 7 | 7 | 7 |
| Visual (5) | 4 | 4 | 4 | 4 | 4 |
| Performance (5) | 4 | 4 | 4 | 4 | 4 |
| Privacy (5) | 5 | 5 | 5 | 5 | 5 |
| **Total** | **82** | **86** | **84** | **83** | **82** |

**Result: passes the bar** (no blocker or major open; lowest score 82).

### Measured facts (round 2)

| | Bea | Marcus | Priya & Sam | Dev | Zoe |
| --- | --- | --- | --- | --- | --- |
| Sets ticked → sets saved | 11 → 11 | all | all | all | all |
| Accidental empty tick | blocked ("Enter the reps first") | n/a | n/a | n/a | n/a |
| Draft kept after phone lock/reload | yes | n/a | yes | n/a | n/a |
| Taps for one workout | 40 | 58 (with a swap, extra set and PR) | 33 | 30 | 22 |
| First screen, cold, throttled | 0.7 s | – | – | – | offline cold open 0.17 s |
| Next-session suggestion | Push-Up `BW×6`, Plank `30s`, no nudge | Bench 102.5×8, DB 34×8 | Priya's 40×10 only | Squat 100×12, no nudge after 7 weeks | n/a |
| Special | | Swap worked; "New PR: Barbell Bench Press"; unticked set kept | Name on screen; no data mixing | Edit fixed 1000 → 200 kg; best now 200 | Rest timer shows; export works offline; tap targets ≥ 44 px |
| Console/page errors | 0 | 0 | 0 | 0 | 0 |

### Weaknesses that remain (honest list, none blocking)

- **Not tried on a real phone or in WebKit.** WebKit is not installed in this container. Screen wake lock and "Add to Home Screen" are feature-detected and coded, but unproven on an iPhone; on older iOS the screen may still lock (Zoe's 8 in offline/phone reflects this).
- **kg only.** No pounds option for anyone who thinks in lb.
- **No warm-up sets, plate calculator, or per-set notes.** Marcus still types every working set (34 taps for a day).
- **History is the last 5 workouts on Home.** Older sessions can't be browsed or edited.
- **Bodyweight sets show "0"** in the weight box rather than "BW". Understood, but not pretty.
- **Progress is one lift at a time**; a single-session lift shows a number, not a trend, until it's logged twice.
- **Rest timer is a count-up**, not a target countdown with an alert.
- **Suggestion logic is simple** (all sets at 12 reps → heavier); it doesn't know about RPE, failed reps, or deloads beyond the 4-week rule.
