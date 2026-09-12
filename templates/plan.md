---
type: plan
status: draft            # draft → accepted · accepted is the precondition for any code edit
spec: specs/<file>.md
intent: intent/<file>.md
date: <YYYY-MM-DD>
accepted_by: <name · date>
gates: [graph, advocate, pre-mortem, council, loop]   # in lite mode write "council: skipped" when it did not run
council: [user, maintainer, payer, security, operator, scenario]   # + the pool ids that sat (from scripts/resolve-seats.mjs)
joker: <domain> — <demand or "survives">   # the Mule, dispatched after the risks table was committed
---

# Plan: <name> (from the intent of <date>)

## Files that change
<path (new | modified) — responsibility>

## Shape of the work (gate 1 · graph)
- **Parallel (never read each other's result):** <slice A> · <slice B>
- **Sequential (one agent):** <slice C → D>
- **Verifier in separate context:** <yes/no · why · what it checks>
- **Human gate:** <where the error is expensive to undo>

## Order of work
1.
2.

## Risks (gates 2, 3 and 4 · advocate · pre-mortem · council)
| Risk | Severity (🔴 🟠 🟡) | Origin (advocate · pre-mortem · council: <seat> · joker) | Cheap test before building |
|---|---|---|---|

## Signposts
<one line per inversion the scenario seat wrote: what would show a future is not coming; `cycle:maintain` reads these at each periodic review>

## Proof (gate 5 · loop)
- **Bar:** <what "done" means, verifiable by number or blind comparison>
- **Commands:** <test · lint · build, with the expected healthy output>
- **Visual:** <screenshot matches mock X>
- **Gauntlet:** <yes/no · what the critic compares>

## What the plan discarded
<options the agent considered and did not choose, with reason>
