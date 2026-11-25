# Validation report

Five lenses, in order, then again: 1 usability (Nielsen heuristics), 2 accessibility (WCAG 2.2 AA), 3 driven testing, 4 code and data layer, 5 diagnose and verify.

Severity: **blocker** (progress lost, blank screen, flow impossible) / **major** (key task frustrated, user misled, or WCAG AA failure) / **minor**. Every fixed blocker and major names its regression test.

## Pass 1

### 1. Usability
| # | Sev | Heuristic | Where | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| N1 | | | | | fixed + test name / won't-fix + reason |

### 2. Accessibility
Method: axe (A/AA, light and dark, every main screen and state), keyboard-only pass, accessibility tree, touch targets, reduced motion.
| # | Sev | WCAG | Where | Evidence | Status |
| --- | --- | --- | --- | --- | --- |

### 3. Driven testing
Method: sweep of every screen at 390x844, console and network recorded.
| # | Sev | Where | Evidence | Status |
| --- | --- | --- | --- | --- |

### 4. Code and data layer
| # | Sev | Rule / area | Where | Evidence | Status |
| --- | --- | --- | --- | --- | --- |

### 5. Diagnose and verify
| Finding | Root cause (traced) | Failing test first | Proof after fix |
| --- | --- | --- | --- |

## Pass 2 (on the fixed app; look for what the fixes broke)
Repeat the five tables. State plainly: "no new blocker or major" or list them.

## Final verification
`check` output: validator, typecheck, unit tests (count), e2e (count), sweep. Table of data-safety outcomes (missing, corrupt, partly corrupt, older, full quota, private mode, offline reload mid-flow, two tabs, render error).
