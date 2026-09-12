---
type: research
status: done
intent: intent/rounding-bug.md
date: 2026-09-12
depth: shallow
author: sample (grader proof of the shallow path)
---

# Research: why does the total lose a cent on 3 × 0.10

Depth: shallow because it is a bug with an accepted intent and one file changes.

## What we know
| Finding | Source (URL or path · accessed YYYY-MM-DD) | Confidence |
|---|---|---|
| The total is computed in floating point in `src/billing.js`; `0.1 * 3` is `0.30000000000000004` | src/billing.js · accessed 2026-09-12 | 🟢 fact |

## What the market does (benchmarks)
Not required at shallow depth. Pass 1 in the intent's "What already exists" table stands.

## What we assume
- No caller depends on the float behaviour — cheap check: grep the callers of `total(` and run their tests.

## What we did not check
- Whether the same pattern exists in the coupon code (out of this intent).

## Recommendation for the spec
Integer cents in `total()`, one test on 3 × 0.10, no other file.
