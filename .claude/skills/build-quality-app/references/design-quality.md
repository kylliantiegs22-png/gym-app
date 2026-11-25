# Visual quality: what "not amateur" means, concretely

Design is judged on a phone, in the first second, then on consistency. These rules turned a plain build into one that read as shipped by a funded team.

## Foundation rules

1. **One token file.** Every colour, gradient, radius, spacing step, type size and duration is defined once. Components use only those values. Inconsistency is the main tell of a hobby app.
2. **A real palette with meaning.** One primary colour (action), one success, one error, one reward colour used *only* for rewards. Don't use the colour of a famous competitor as your primary. 70% neutral, 20% primary, 10% the rest. Never white text on a light accent; pick the darker shade or a dark label.
3. **Real dark mode**, not an inverted light mode: near-black navy ground, accents one or two steps lighter, surfaces lighter instead of shadows. Support the system setting plus a manual override; apply the theme before first paint (inline script) so there is no white flash.
4. **Type: two families, self-hosted.** A display face for headings and numbers, a text face for body. Self-host (Fontsource or files) so offline works and there is no layout shift. Tabular figures for any money or counts (`font-variant-numeric: tabular-nums`). Size in rem. Nothing under 12 px (the sweep flags it).
5. **One icon family**, in one style per role (regular for nav, fill for selected, duotone for badges). No emoji as icons (platform-dependent, off-brand). Icon-only buttons need an accessible name.
6. **Motion system**: three durations (about 150, 250, 400 ms), one ease-out, one spring. Animate only `transform` and `opacity`. Honour `prefers-reduced-motion` by replacing slides, shakes and confetti with fades, plus a manual toggle. Beware: a keyframe that sets `transform` overrides a centring `translate(-50%)` on the same element; give such elements their own keyframes.
7. **Feedback as a moment**: answer or action feedback in a bottom sheet with icon plus words (never colour alone), a one-line reason, a single primary button. Celebrate in proportion: small win, small feedback; rare win, a big moment.
8. **Touch**: 44 to 48 px minimum targets, primary action pinned in thumb reach, one job per screen.
9. **Numbers as hero content** where the app is about numbers: large display digits, tabular.
10. **Safe areas and installability**: `viewport-fit=cover` plus `env(safe-area-inset-*)`, theme-color meta per scheme, a real icon set (including maskable), splash colours.

## Amateur tells (look for these in every screenshot)

- Default browser controls, default system font, blue links, unstyled inputs.
- Mixed icon styles or emoji; mixed corner radii; three different greys for borders.
- Walls of text; centred paragraphs; no visual hierarchy (everything the same weight).
- Buttons that don't look pressable; no pressed state; no focus ring.
- Content jammed against the edges or hidden under a fixed bar; clipped text; horizontal scroll.
- Labels that wrap awkwardly ("5 min · 30 / XP"); orphan words in titles.
- Empty states that are just blank space; spinners instead of skeletons.
- Dark mode with pure black on pure white leftovers, or low-contrast greys.
- Celebration on everything, so nothing feels special.

## How to review a screenshot

For each screen and each theme: (1) What is the one thing the user should do here, and is it the most obvious element? (2) Is spacing on one rhythm (a 4 px grid)? (3) Do alignments hold? (4) Is every text pair readable? (5) Is it calm: could any element be removed? (6) Does it match the other screens? Write the faults down, fix, re-screenshot.

## What the sweep checks for you

Overflow, tap targets, text under 12 px, fonts not loaded or defaulting, emoji, images without alt, console errors, failed requests, axe contrast and ARIA, in light and dark. It does not judge taste. After a UI change, always read the new screenshot.
