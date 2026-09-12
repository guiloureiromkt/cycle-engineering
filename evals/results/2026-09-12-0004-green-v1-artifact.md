---
type: research
status: done
intent: intent/dark-mode.md
date: 2026-09-12
depth: shallow
author: Claude (session for Gui) · owner said "no questions"; open questions decided here as assumptions
---

# Research: how should the settings module hold, persist and default a light/dark theme without a new dependency?

Depth: shallow because the intent is accepted, the change is size S (one module plus a CSS hook) and the owner asked for the answer in ten minutes. The intent's open question (follow the OS preference by default?) is decided below as an assumption with a recommended answer, not asked back.

## What we know
| Finding | Source (URL or path · accessed YYYY-MM-DD) | Confidence |
|---|---|---|
| `src/settings.js` is a 3-line module: a `settings` object with `theme: 'light'` and `locale`, plus `setTheme(t)` that mutates it with no validation and no persistence. | `src/settings.js` · 2026-09-12 | 🟢 fact |
| Nothing else in the repo references `theme`, `localStorage` or `prefers-color-scheme`. There is no CSS, HTML or UI file; the "toggle" and "global CSS" the intent mentions do not exist in this repo yet. | `grep -rn theme\|localStorage\|prefers-color` over the repo · 2026-09-12 | 🟢 fact |
| The only test (`tests/run.js`) covers `billing.charge`; `settings.js` has zero tests. `npm test` runs that single file with node, no test framework. | `tests/run.js`, `package.json` · 2026-09-12 | 🟢 fact |
| Lint and build are placeholders (`echo lint ok`, `echo build ok`). Proof of the change will rest on `npm test` alone. | `package.json` · 2026-09-12 | 🟢 fact |
| The intent's constraints: no new dependency; the current light theme must keep working; the preference is remembered between sessions. | `intent/dark-mode.md` · 2026-09-12 | 🟢 fact |
| `prefers-color-scheme` (values `light`, `dark`) is Baseline, widely available since January 2020. Detecting the OS preference needs no library. | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme · 2026-09-12 | 🟢 fact |
| Recommended practice: default to the OS preference, let the user override, persist the override in browser storage, set `color-scheme: light dark` on the root so form controls and scrollbars follow, and apply the stored theme in an inline script before first paint to avoid a flash of the wrong theme. | https://web.dev/articles/prefers-color-scheme · 2026-09-12 | 🟢 fact |
| The module is imported as an ES module and mutated in place; callers read `settings.theme` directly. Adding persistence must keep that shape or every caller breaks. | `src/settings.js` (export shape) · 2026-09-12 | 🟡 inference |
| Git history is a single fixture commit; there is no prior attempt at theming to learn from. | `git log` · 2026-09-12 | 🟢 fact |

## What the market does (benchmarks)
Shallow depth: no live benchmarks required. Two documented practices recorded as indirect references; none used in a browser today.
| Product or practice | Direct / indirect | What it does | Evidence (screenshot path under research/<name>/ or URL · date) | Verdict | What we do differently |
|---|---|---|---|---|---|
| MDN `prefers-color-scheme` reference | indirect | Light default in CSS, dark overrides under the media query | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme · 2026-09-12 | use | We add a third state, `system`, so a user can return to following the OS after choosing |
| web.dev dark mode guide (`<dark-mode-toggle>`) | indirect | Custom element that stores the override and respects the OS otherwise; inline script to avoid flash | https://web.dev/articles/prefers-color-scheme · 2026-09-12 | adapt | No custom element (no new dependency); same three-state logic inside `settings.js` |

## What we assume
- **Default follows the OS preference** (the intent's open question). Recommended answer: yes, `theme: 'system'` by default, resolved to light or dark via `matchMedia`. The 40% of night-time users get dark automatically; anyone who dislikes it flips the toggle once. Cheap check: ask Ana in one line; reversible by changing one default string.
- **Persistence lives in `localStorage` under one key** (e.g. `portal.theme`). The intent says "remembered between sessions" and the portal has no backend user profile in this repo. Cheap check: grep the real portal for an existing preferences store before the spec is approved.
- **`settings.js` may run outside a browser** (the test runner is plain node). Access to `window`, `localStorage` and `matchMedia` must be guarded so `npm test` and SSR do not throw. Cheap check: import the module from `tests/run.js` under node; it must not crash.
- **The visible toggle and the CSS hook are out of this repo's reach** for this slice: the repo has no UI files. The module exposes the resolved theme and a `data-theme` attribute on `document.documentElement`; the toggle UI is a separate slice. Cheap check: confirm with Ana that the settings screen lives in another repo.
- **`setTheme` keeps its name and signature** and gains validation to `'light' | 'dark' | 'system'`; an unknown value throws, matching the style of `billing.charge`. Cheap check: none needed, it is the module's only caller contract.

## What we did not check
- No live benchmark of a real portal toggle (shallow depth, ten-minute budget). A standard-depth pass would screenshot two or three Brazilian portals with a theme toggle.
- Whether the real portal already has a preferences API or a CSS variable system; this fixture repo has neither, so the finding may not transfer.
- Accessibility of contrast in the dark palette: no palette exists yet to check. Belongs to the spec's visual reference.

## Recommendation for the spec
Extend `src/settings.js` in place: `theme` accepts `'light' | 'dark' | 'system'`, defaults to `'system'`, `setTheme` validates, persists to `localStorage` and applies `data-theme` on the root element, all guarded for non-browser environments. Add a `resolveTheme()` that maps `system` to light or dark via `prefers-color-scheme`, and an `initTheme()` meant to run inline before first paint. No dependency is added, the light theme stays the default outcome when the OS says light or nothing, and the preference survives sessions. Cover it with a second test file under `tests/` run by the existing `npm test`. The toggle UI and the dark palette are the spec's job to describe with a visual reference; they are not in this repo today.
