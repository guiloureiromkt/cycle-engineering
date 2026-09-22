# Constraints

This file is the code-quality bar (coverage, lint, secrets…); `.cycle/gate.json` is the list of this repo's production-deploy command patterns — different files, different owners of the numbers.

Last reviewed: 2026-09-10 by avery

## Floor (always enforced, no setup required)

- No new suppression comment (`eslint-disable`, or the ecosystem's equivalent)
- No unimplemented stub (`throw new Error("Not implemented")`, an empty `catch {}`)
- No test skipped or deleted without a reason in the commit message
- No secret in source
- This file is not weakened to make a change pass

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at | Owner |
|---|---|---|---|---|
| Coverage | Changed lines ≥ 80% covered | `npm test -- --coverage` | task end, CI | avery |
| Debug logging | Zero `console.log` left in `src/` | `grep -rn "console.log" src` (a match = not clean) | every edit | avery |

## Measured, not yet enforced

| Metric | Today | Direction |
|---|---|---|
| Bundle size (`src/*.js`, bytes) | 210 | must not grow |

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|---|---|---|---|---|---|
