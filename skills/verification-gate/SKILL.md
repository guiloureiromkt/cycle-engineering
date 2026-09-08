---
name: verification-gate
description: Use before calling any slice of code done when it touches money, hours or time tracking, permission, schema or migration, destructive data or a user surface, and whenever a slice just feels risky. It decides whether independent verification is needed, with which lenses, and merges the findings. If no lens lights, it says so and dispatches nobody.
---

# Verification gate

Whoever reviews their own work in their own context does not see their own error. This gate decides **if** a slice needs verifiers in separate context, **which lenses**, and runs the merge. It is not generic review: with no trigger it records "no lens lit" and stops.

## 1 · Triage by lens
| Lens | Lights when the slice touches | The verifier asks |
|---|---|---|
| Integrity | money, hours, quantities, anything summed or billed | Does the number survive zero, negative, duplicate, concurrent, rounding? Is there a test that fails when the formula is wrong? |
| Permission | auth, roles, ownership checks, tokens, gates | Who else can reach this now? Can the caller forge the input? Can the agent itself bypass the gate? |
| Regression | schema, migration, shared helper, public signature | Who calls this? Run every caller's test. Does the migration reverse? |
| Reach | user surface (screen, route, CLI output, email) | Does the target user get to the surface, on their device, without a flag or a hidden breakpoint? |

More than 8 files changed lights Regression by itself.

## 2 · Ammunition
If `.cycle/work/**/scars.md` exists, read it: past failures in this repo, one line each, are the cheapest questions. Add one question per relevant scar.

## 3 · Caller map (no language server needed)
For every changed symbol: `grep -rn "<symbol>(" --include=*.<ext>` plus the import/require sites. The list of callers goes to the Regression verifier verbatim.

## 4 · Dispatch
One verifier per lit lens, in parallel, fresh context, read-only tools plus the test runner (agent `verifier`; model from `.cycle/config.json` → `models.verifier`, default `sonnet`). Each receives: the diff, the plan's Proof section, the lens's questions, the caller map, the scars. Each returns three blocks: ran · saw · does not match the plan.

## 5 · Merge (the main session)
Deduplicate, rank by the plan's risk table, fix or record. A finding nobody acts on is written in the plan's Risks with "accepted, because…". Record in the plan: lenses lit, verifiers dispatched, findings, decision. When nothing lit: one line, "verification gate: no lens lit (<date>)".

## Not this
- Line-by-line human review: that is the PR.
- Running the suite yourself and calling it verification: the point is the separate context.
