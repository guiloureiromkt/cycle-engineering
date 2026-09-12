---
type: intent
status: accepted
author: Ana (product owner)
date: 2026-09-12
origin: person
accepted_by: Ana · 2026-09-12
---

# Intent: the README says "recieve"

## Problem
The README's delivery line reads "recieve your order within 3 days". Customers quote it in tickets. One word.

## Proposed outcome
"The README says 'receive'."

## Sub-intents
- none

## What already exists
| What | Where | Solves | Verdict |
|---|---|---|---|
| the sentence | README.md line 2 | the only occurrence (`grep -rn recieve`) | fix |

## Affected users and systems
`README.md` only.

## Constraints
No other copy changes.

## Open questions
- none
