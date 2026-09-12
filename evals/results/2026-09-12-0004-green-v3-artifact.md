---
type: research
status: done
intent: intent/dark-mode.md
date: 2026-09-12
depth: standard
author: Claude (session for Gui) · researcher subagent for outside sources
---

# Research: how should the portal offer a light/dark toggle in settings, remembered between sessions, and should it follow the OS by default?

Depth: standard because the change is a user surface (a toggle in settings plus global CSS); size S does not lower it. The owner's ten-minute limit shortened the prose, not the depth.

## What we know
| Finding | Source (URL or path · accessed YYYY-MM-DD) | Confidence |
|---|---|---|
| The settings module is 3 lines: an exported object `{ theme: 'light', locale: 'pt-BR' }` and `setTheme(t)` that mutates it. Nothing reads `theme` anywhere else. | `src/settings.js` · `grep -rn theme` over the repo · 2026-09-12 | 🟢 fact |
| There is no CSS, HTML or DOM code in the repo. "CSS global" named in the intent does not exist here yet; the toggle has nowhere to render. | `ls -la`, `git log --stat` (8 files in the only commit) · 2026-09-12 | 🟢 fact |
| No persistence mechanism exists (no localStorage, cookie, or server call anywhere). "Remembered between sessions" is new ground. | `grep -rn "localStorage\|cookie\|fetch" src tests` returns nothing · 2026-09-12 | 🟢 fact |
| The only test exercises `billing.charge`; `settings.js` has zero test coverage. The shortcut in cycle:using-cycle ("one file with an existing test") does not apply on that ground either. | `tests/run.js` · 2026-09-12 | 🟢 fact |
| `settings.js` and `billing.js` do not import each other; a theme change cannot touch money. | `src/billing.js`, `src/settings.js` · 2026-09-12 | 🟢 fact |
| `.cycle/config.json` has `knowledge: []`; there is no notebook, vault or folder to query for this intent. | `.cycle/config.json` · 2026-09-12 | 🟢 fact |
| Runtime is Node 24 with ES modules and no bundler; scripts are `node tests/run.js`, lint and build are echo stubs. | `package.json`, `node --version` · 2026-09-12 | 🟢 fact |
| The intent's "40% of accesses after 20h" is the product owner's claim; no analytics source is in the repo. | `intent/dark-mode.md` · 2026-09-12 | 🟡 inference (unverified number, treated as the owner's input) |
| "System" default with a Light/Dark override is what GitHub, Nubank, Tailwind's docs, web.dev and brandur.org all do. Nubank: "o app seguirá a configuração já escolhida pelo cliente nos ajustes de seu aparelho", with "somente Modo Claro" / "somente Modo Escuro" overrides. | https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-user-account-settings/managing-your-theme-settings · https://nu.com/pt/sala-de-imprensa/consumidores/modo-escuro-chega-ao-aplicativo-do-nubank · https://tailwindcss.com/docs/dark-mode · https://web.dev/articles/prefers-color-scheme · https://brandur.org/fragments/dark-mode-notes · all accessed 2026-09-12 | 🟢 fact that each source does it; 🟡 inference that it is "the" convention (five sources, not a survey) |
| `prefers-color-scheme` (values `light`, `dark`; baseline since 2020) reads the OS/browser preference. `color-scheme: light dark` on `:root` makes native form controls and scrollbars follow the scheme; baseline since 2022. Neither persists anything. | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme · https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme · 2026-09-12 | 🟢 fact |
| localStorage is client-only: a server-rendered page cannot know the theme on first paint. A cookie or account record is needed for SSR or cross-device sync. For a client-rendered site localStorage "is the next best thing". | https://brandur.org/fragments/dark-mode-notes (fetched) · https://medium.com/@kjinengineer/dont-use-localstorage-for-dark-mode-in-next-js-here-s-a-better-way-f6d4c98c3c07 (search summary only) · 2026-09-12 | 🟢 fact (brandur) · 🟡 inference that localStorage fits this portal, since `settings` is a client-side object |
| Flash of wrong theme: the page paints light, then a deferred script flips to dark. Fix agreed by three fetched sources: a blocking inline `<script>` in `<head>`, before stylesheets, that reads the stored value, falls back to `matchMedia('(prefers-color-scheme: dark)')`, and sets `data-theme` on `<html>`. Tailwind's docs: "best to add inline in head to avoid FOUC". | https://dev.to/137foundry/how-to-prevent-the-flash-of-wrong-theme-when-implementing-dark-mode-2pg1 · https://tailwindcss.com/docs/dark-mode · https://brandur.org/fragments/dark-mode-notes · 2026-09-12 | 🟢 fact |
| Storage access can throw in private mode; wrap reads and writes in try/catch. | https://codefronts.com/snippets/css-variable-dark-mode-system/anti-fouc-head-script/ (search summary only) · 2026-09-12 | 🟡 inference |

## What the market does (benchmarks)
| Product or practice | Direct / indirect | What it does | Evidence (screenshot path under research/<name>/ or URL · date) | Verdict | What we do differently |
|---|---|---|---|---|---|
| GitHub · Appearance settings | Direct (settings screen of a web product) | Three-way: a single theme (light or dark) or "follow your system settings", which then asks for a day and a night theme. Account-side preference (server persistence inferred, not documented on the page). | https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-user-account-settings/managing-your-theme-settings · 2026-09-12 | adapt | Keep the three options Light / Dark / System. Drop the day+night sub-picker: overkill for this portal. |
| Nubank · "Aparência" in the app | Direct (Brazilian product, official press release) | Follows the phone's system setting by default; override to "somente Modo Claro", "somente Modo Escuro" or device default. Path: perfil → Configurar → Aparência. Native app, so persistence and flash do not apply. | https://nu.com/pt/sala-de-imprensa/consumidores/modo-escuro-chega-ao-aplicativo-do-nubank · 2026-09-12 | adapt | Reuse the pt-BR labels "Aparência", "Modo Claro", "Modo Escuro", "Padrão do sistema". Web persistence is ours to solve. |
| Tailwind CSS · dark mode docs | Indirect (framework pattern; the library is not installed) | Default via `prefers-color-scheme`; manual toggle via a class or `[data-theme=dark]` on `<html>`; three states in localStorage, where a missing key means "system"; inline head script to avoid FOUC. | https://tailwindcss.com/docs/dark-mode · 2026-09-12 | use (the pattern, not the library) | Store an explicit `'system'` value instead of deleting the key, so it maps onto the existing `settings.theme` field. Zero dependencies, which the intent requires. |
| MDN · `prefers-color-scheme` and `color-scheme` | Indirect (platform reference) | Media query for the OS preference; `color-scheme: light dark` on `:root` for native controls; `only light` to block forced dark. | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme · https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme · 2026-09-12 | use | Current light CSS stays the default branch of `:root`; dark tokens live only under `[data-theme="dark"]` and under the media query guarded by `:not([data-theme="light"])`, so the light theme cannot break. |
| web.dev · "prefers-color-scheme" article | Indirect (Google guidance) | Respect the OS first, then offer an opt-out toggle; uses `color-scheme: light dark`; hides content until the right stylesheet loads to avoid flash. | https://web.dev/articles/prefers-color-scheme · 2026-09-12 | adapt | Its stylesheet-swap approach is heavier than needed; the inline head script from the Tailwind row is simpler. |

Benchmarks were read, not used in a real browser, and no screenshots were committed: the ten-minute budget went to sources with URLs. Named again under "What we did not check".

## What we assume
- The portal is client-rendered and there is (or will be) an HTML shell where the settings toggle and the head script can live. Nothing in the repo renders HTML today. — cheap check: ask the owner where the settings screen renders; or `grep -rn "document\." src` in the real portal repo (empty here).
- Users are not logged into a server profile that should carry the theme across devices; localStorage is enough. — cheap check: does the portal have an authenticated user model with server-side preferences? If yes, persist there and use a cookie for first paint.
- The current default `'light'` in `settings.theme` is a placeholder, not an explicit choice by existing users; the new default can be `'system'`. — cheap check: confirm with the owner that no user has ever picked a theme (no persistence exists, so none can have).
- "40% dos acessos depois das 20h" is true. — cheap check: one analytics query on hour of access; [confidential] the number lives with the product owner, not in the repo.
- The dark palette does not need designer sign-off before the spec: an inverted token set is acceptable for a first release. — cheap check: ask the owner; `cycle:spec` requires a visual reference for a user surface, so this gets settled there anyway.

## What we did not check
- No benchmark was opened in a real browser and no screenshot was committed under `research/dark-mode/`. The verdicts rest on documentation pages, accessed 2026-09-12. Reason: the owner's ten-minute limit.
- How GitHub and Nubank store the preference (server vs local) and which CSS attribute GitHub uses: not documented on the pages fetched; their live markup was not inspected.
- Whether the portal has a server-side user profile: not visible from this repo.
- The host's `deep-research` skill was not invoked; one fresh-context researcher was dispatched instead, as the standard-depth fallback allows.
- Contrast and accessibility of a dark palette (WCAG AA on dark backgrounds): out of scope for this stage; belongs to the spec's visual reference.

## Recommendation for the spec
Three-way preference, `'light' | 'dark' | 'system'`, stored in `settings.theme` with `'system'` as the new default, following the OS via `prefers-color-scheme` when `'system'`.
Persist in localStorage with try/catch; no server round-trip, no new dependency, which respects the intent's constraint.
Apply the theme as a `data-theme` attribute on `<html>` set by a blocking inline script in `<head>`, so the page never flashes the wrong theme.
Keep every existing light token on bare `:root`; add dark tokens only under `[data-theme="dark"]` and under the media query guarded by `:not([data-theme="light"])`, so the light theme is untouched.
Rides on assumptions 1 to 3 above (client-rendered, no server profile, `'light'` is a placeholder); `setTheme` gains one responsibility: write storage and the attribute.
