# Lifts

An offline gym tracker for two people. No account, no server: everything is stored on the phone. Installable on an iPhone home screen.

- 77 exercises, 4 starter routines (Push, Pull, Legs, Full Body), editable, with custom exercises
- Weight and reps carry down from the last session; "Go heavier" nudge when every set hit 12 reps (+2.5 kg barbell, +2 kg dumbbell, +5 kg machine/cable)
- Rest timer, screen stays awake, mid-workout swap/add, edit past workouts, PR callout, welcome-back after a long break
- Progress chart (top weight, estimated 1RM), export/restore backup, light and dark mode

## Put it online (free, GitHub Pages)
1. Repo **Settings → Pages**, set source to the default branch, folder `/ (root)`.
2. Wait a minute; the site is at `https://<user>.github.io/gym-app/`.

## Install on iPhone (each person)
1. Open the link in **Safari**.
2. Share button → **Add to Home Screen**.
3. Open it once with signal, then it works fully offline.

Pick "Me" or "Partner" on the Home screen; each has separate data. Use **Data → Export backup** now and then. iOS can clear web data for sites unused for weeks, so keep a backup.

## Quality checks
    node tests/unit.js            # logic tests
    node tests/e2e.js             # end-to-end (Chromium)
    node tests/sweep.js           # every screen, light+dark: overflow, tap size, axe
    node tests/resilience.js      # corrupt/blocked/full storage scenarios
    node tests/persona.js 3       # gym-goer playtests -> docs/persona-evidence/round-3
See `docs/persona-review.md`.

## Develop
    node serve.js 8080                       # local server
    node tests/unit.js                       # logic tests
    NODE_PATH=$(npm root -g) node tests/e2e.js   # needs playwright, server running
