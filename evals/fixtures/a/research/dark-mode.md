---
type: research
status: done
intent: intent/dark-mode.md
date: 2026-09-12
depth: standard
author: fixture
---

# Research: how do small settings screens ship a dark mode

Depth: standard because the change adds a user-facing control on an existing screen.

## What we know
| Finding | Source (URL or path · accessed YYYY-MM-DD) | Confidence |
|---|---|---|
| `prefers-color-scheme` is the OS signal; an explicit choice must override it and persist | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme · accessed 2026-09-12 | 🟢 fact |
| Applying the theme before first paint avoids a flash of the wrong theme | https://web.dev/articles/prefers-color-scheme · accessed 2026-09-12 | 🟢 fact |

## What the market does (benchmarks)
| Product or practice | Direct / indirect | What it does | Evidence (screenshot path under research/<name>/ or URL · date) | Verdict | What we do differently |
|---|---|---|---|---|---|
| GitHub appearance settings | indirect | light · dark · sync with system, per account | https://github.com/settings/appearance · 2026-09-12 | adapt | same three states, stored locally, no account |
| VS Code theme picker | indirect | a list of themes with live preview | https://code.visualstudio.com/docs/getstarted/themes · 2026-09-12 | refuse | one control, no list |
| Linear settings | direct | a toggle in settings remembered per device | https://linear.app/docs/preferences · 2026-09-12 | use | same |

## What we assume
- Users expect the choice to survive a reload — cheap check: set it, reload, read `localStorage` in the mock.

## What we did not check
- Contrast ratios of the current palette on a dark ground.

## Recommendation for the spec
A three-state setting (light · dark · system), persisted locally, applied before first paint; one control on the existing settings screen.
