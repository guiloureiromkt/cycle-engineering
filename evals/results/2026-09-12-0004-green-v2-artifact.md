---
type: research
status: done
intent: intent/dark-mode.md
date: 2026-09-12
depth: standard
author: Claude (session for Gui) · benchmarks via WebFetch + one fresh-context researcher
---

# Research: should the theme toggle follow the OS preference by default, and how is the choice remembered without a flash?

Depth: standard because the change touches a user surface (settings screen and global CSS). The intent is size S, but the deeper trigger wins. The owner's ten-minute budget shortened the prose, not the depth.

## What we know
| Finding | Source (URL or path · accessed YYYY-MM-DD) | Confidence |
|---|---|---|
| `src/settings.js` holds `settings.theme = 'light'` in memory only; `setTheme(t)` mutates it with no validation and no persistence. Nothing reads it yet. | `src/settings.js` · 2026-09-12 | 🟢 fact |
| The only test in the repo covers `billing.charge`; there is no test for settings, so the shortcut of `cycle:using-cycle` ("one file with an existing test") does not apply. | `tests/run.js`, `package.json` · 2026-09-12 | 🟢 fact |
| No CSS, HTML or bundler exists in the repo; "CSS global" named in the intent is not in this fixture, so the theme must be applied through a hook the spec defines (class or `data-theme` on the root element). | repo tree, `git log` (single commit `fixture`) · 2026-09-12 | 🟢 fact |
| `prefers-color-scheme` is Baseline "widely available" since January 2020, values `light` and `dark`; the `color-scheme` CSS property lets a page declare which schemes it supports so form controls and scrollbars follow. | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme · 2026-09-12 | 🟢 fact |
| The reference pattern is: honour the stored choice if there is one, otherwise follow `matchMedia('(prefers-color-scheme: dark)')`; run this inline in `<head>` before first paint to avoid a flash of the wrong theme. | https://tailwindcss.com/docs/dark-mode · 2026-09-12 | 🟢 fact |
| "System" is represented by the absence of a stored key; light and dark are stored explicitly (`localStorage.theme = 'light' \| 'dark'`, `removeItem` for system). | https://tailwindcss.com/docs/dark-mode · 2026-09-12 | 🟢 fact |
| Google's guidance is the same order: respect the OS preference first, then let the user override and remember the override (localStorage). | https://web.dev/articles/prefers-color-scheme · 2026-09-12 | 🟢 fact |
| A `localStorage`-only preference is per browser, not per account: the same user on a second device starts from the OS default again. | inference from the two sources above · 2026-09-12 | 🟡 inference |
| The intent's "40% of accesses after 20h" is the motivation; it is not evidence that those users have dark OS themes. Default-to-system covers them only if their OS is dark at night (automatic scheduling on iOS, Android, macOS, Windows). | `intent/dark-mode.md` · 2026-09-12 | 🟡 inference |
| A blocking inline script in `<head>` placed before the stylesheet `<link>` is the accepted fix for the flash of wrong theme with localStorage; a server-side/cookie preference removes the flash but changes the storage model. | https://dev.to/137foundry/how-to-prevent-the-flash-of-wrong-theme-when-implementing-dark-mode-2pg1 (2024-05-31) · 2026-09-12 | 🟢 fact |
| WCAG AA applies unchanged in dark: 4.5:1 body text, 3:1 large text and UI. Palette advice: avoid pure `#000`, use `#121212`–`#1A1A1A`, desaturate accents. | https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/ (2025-04-15) · 2026-09-12 | 🟢 fact (numbers) · 🔴 opinion (palette) |
| In `system` mode, keep listening to the media query: the OS can change theme while the tab is open. | https://dev.to/adioof/the-three-state-dark-mode-toggle-is-the-correct-answer-1lja · 2026-09-12 | 🟢 fact (behaviour) |
| Counter-view: a two-state toggle can express the three-state model by storing an override only when it differs from the system value; a "System" option is rarely what users look for. | https://lea.verou.me/blog/2026/dark-mode-toggles/ (2026-08-06) · 2026-09-12 | 🔴 opinion |
| No 2024–2026 source found that recommends forcing light as the default for a portal that has an OS signal available. | researcher sweep (5 sources above) · 2026-09-12 | 🟡 inference |
| `.cycle/config.json` has an empty `knowledge` list, so no vault or NotebookLM source applies. | `.cycle/config.json` · 2026-09-12 | 🟢 fact |

## What the market does (benchmarks)
| Product or practice | Direct / indirect | What it does | Evidence (screenshot path under research/<name>/ or URL · date) | Verdict | What we do differently |
|---|---|---|---|---|---|
| GitHub · Settings › Appearance | direct (settings page of a web portal) | Three modes: single light, single dark, or "sync with system" with separate day and night themes; high-contrast and colorblind variants; stored at account level. | https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-user-account-settings/managing-your-theme-settings · 2026-09-12 | adapt | Keep the three modes; drop day/night pairs and variants (out of scope, "no new dependency"). Store locally first, account-level later. |
| Tailwind CSS dark-mode guide | indirect (framework practice) | Class strategy on `<html>`, three-way toggle, `localStorage` with "system" as absent key, inline head script against flash. | https://tailwindcss.com/docs/dark-mode · 2026-09-12 | use | Same logic in plain JS, no framework: `data-theme` attribute instead of a class. |
| web.dev `prefers-color-scheme` article (Google) | indirect (platform guidance) | OS preference first, user override with "remember" checkbox, split stylesheets by media query, inline script to avoid flash. | https://web.dev/articles/prefers-color-scheme · 2026-09-12 | adapt | One stylesheet with variables, not two files; remembering is implicit (any explicit choice is remembered). |
| Notion · Settings › Appearance | direct (settings page) | Light / Dark / "Use system setting"; account-wide across workspaces; keyboard shortcut. | https://www.notion.so/help/appearance-settings · 2026-09-12 | adapt | Same three options; no shortcut in v1; local, not account-wide, in v1. |
| Slack · Preferences › Themes | direct (settings page) | Light / Dark plus a "Sync with OS setting" checkbox; preference is per device, not synced. | https://slack.com/help/articles/360019434914 · 2026-09-12 | use | Confirms per-device storage is an accepted v1 in a mainstream product. Present as a single three-way control instead of radio + checkbox. |
| Lea Verou · "Dark mode toggles" | indirect (practitioner essay) | Two-state toggle, store only when it differs from system. | https://lea.verou.me/blog/2026/dark-mode-toggles/ · 2026-09-12 | refuse | Our control lives in Settings, where three explicit states are the dominant pattern; two-state fits header toggles. |
| MDN `prefers-color-scheme` + `color-scheme` | indirect (standard) | Media feature with `light`/`dark`; `color-scheme` property propagates to form controls and embedded content. | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme · 2026-09-12 | use | Set `color-scheme: light dark` on the root so native controls follow without extra CSS. |

## What we assume
- Users expect the toggle to follow the OS by default (the intent's open question). — cheap check: ask Ana (product) for a yes/no; or ship default `system` behind the same toggle and watch how many users pick an explicit value in the first two weeks.
- A per-browser `localStorage` preference is acceptable for the first version, with account-level storage as a later intent. — cheap check: confirm with Ana whether the portal has a server-side user preferences endpoint today.
- The portal's global CSS can be expressed with variables so a single `data-theme` on `<html>` switches palette without duplicating rules. — cheap check: grep the real portal CSS for hardcoded colours; count them.
- The dark palette must keep WCAG AA contrast (4.5:1 body text, 3:1 UI) and the toggle needs a text label that states the current mode, not an icon alone. — cheap check: run the chosen colours through a contrast checker and read the control with a screen reader before the spec is approved.

## What we did not check
- The real portal's CSS and markup: this fixture has none, so the "must not break the light theme" constraint could not be verified against actual styles.
- Brazilian consumer benchmarks (Nubank, gov.br) hands-on in a real browser: only documentation was read, no screenshots taken, because of the owner's time budget. Benchmarks here are URL-evidenced, not screenshot-evidenced.
- Hands-on behaviour of Notion and Slack in a real browser (documentation only, no screenshots).
- Whether the portal already has a server-side user-preferences field: decides if `localStorage` is the store or a cache of the server value.

## Recommendation for the spec
Three-state setting `light | dark | system`, default `system`, so the OS preference decides until the user chooses. Apply the theme as `data-theme` on `<html>` plus `color-scheme: light dark`, resolved by an inline head script before first paint. Persist explicit choices in `localStorage` under one key; "system" is the absence of the key. Keep `settings.theme` as the single source in `src/settings.js`, with `setTheme` validating the three values and writing the storage and the attribute. In `system` mode, listen to the media query so an OS change mid-session is followed. Dark palette starts from `#121212`-range surfaces, AA contrast checked. Account-level storage goes to a follow-up intent.
