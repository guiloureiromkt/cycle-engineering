# The retro's numbers, measured before the script exists

R15 of the spec says the metric definitions are fixed **on real history** before `scripts/retro.mjs` is written, because the definitions R7 proposed are wrong in ways that only measuring exposes. This is that measurement, on the two closed cycles of this repository.

| Cycle | Intent | Closed at |
|---|---|---|
| **A** | `ammunition-before-decisions` | 0.3.0, 12/09 15:08 |
| **B** | `2026-09-12-council-seats-joker-and-scenarios` | 0.4.0, 13/09 02h40 (tagged `5867f2a`) |

## Candidate 1 · rework

R7's definition: *spec commits after the first plan commit, plus plan commits after the first code commit.*

| | Cycle A | Cycle B | What a person says |
|---|---|---|---|
| R7's definition | **11** | **8** | about **1** each |
| Ignoring plan commits whose diff is only checkboxes and status | 9 | 6 | still wrong |

The refinement the plan expected — ignore checkbox commits — **does not save the metric**, and that is the finding. Rule 2 of `cycle:build` requires every departure to update the plan **in the same commit**, and the plan doubles as the task tracker. So almost every build commit touches `plans/<x>.md` by design. A metric that counts those commits is measuring the method's own bookkeeping and calling it waste.

**Fixed definition.** Rework is not counted from commits. It is two numbers, both read from the artifacts themselves:

- **`deviations`** — items under the plan's `## Deviations…` heading. Cycle A: **3**. Cycle B: **2**. This is the plan meeting reality, which is what the word means.
- **`spec_amendments`** — commits touching `specs/<intent>.md` after the plan's acceptance commit. Cycle A: **1**. Cycle B: **1**. This is a requirement that changed once code already existed, the expensive kind.

Both match what a person reading the cycle would say. Neither can be inflated by committing often.

## Candidate 2 · stage durations

R7's definition: *stage timestamps from the artifact commits.*

| Gap | Cycle A | Cycle B | Reading it |
|---|---|---|---|
| intent → research | 32 min | **185 min** | B's 185 minutes are a lie: the three intents of 12/09 were created in **one** commit (`4044879`, 12:08), hours before this one's turn came. |
| research → spec | **0 min** | **1 min** | Not speed. One commit wrote both artifacts (`353f76d` in A). The stages **overlapped**. |
| spec → plan | 19 min | 32 min | Honest. |
| plan → build | 25 min | 25 min | Honest. |

**Fixed definition.**

- A stage's clock starts at the commit that **creates** its artifact, except that the handoff from the previous stage is that stage's **acceptance or approval commit** when one exists. Recomputed, intent → research is **2 min** in both cycles: the intent was accepted at 12:37 (A) and 15:11 (B), and research began two minutes later in each. That is the true number, and the naive one was off by a factor of 90 in cycle B.
- When two artifacts are created by the same commit, or the next stage's artifact predates the previous stage's handoff, the retro prints `overlap: <a> and <b> share <sha>` and **never** a duration of zero or less. A negative gap is a bug in the metric, not a fact about the work.

## Candidate 3 · gate findings

R7's definition: *gate findings that cite a policy.* Measured against the vocabulary the plans actually use — which is stable across all three, and is the reason this is computable at all:

| Section | Cycle A | Cycle B | 0.5.0's plan |
|---|---|---|---|
| `## Council demands absorbed (gate 4)` | 6 | 7 | 9 |
| `## Risks (gates 2, 3 and 4 …)` (table rows) | 12 | 11 | 15 |
| `## Deviations…` | 3 | 2 | 12 |
| `## Verifier (regression lens…)` | 4 | **not computable** | **not computable** |

Cycle B's verifier section is a paragraph — *"Reproduced every proof (58/58; 8 fixtures…)"* — not a list, so there is nothing to count. The 0.5.0 plan has no verifier section at all yet. **Both print `not computable: <reason>`**, and the reason names which it is. This is the rule R7 asked for, and it earns its keep on the very first two cycles measured.

Two counting rules that a first attempt gets wrong, both found here:

- The item counter must stop at `###`, not only at `##`, and must skip `- [ ]` checkbox lines. Without that, the 0.5.0 plan's deviations counted **58** items: every task checkbox in the sections below the heading.
- A table's header and separator rows are not findings. Without that, every risks count is two too high.

## What the script must therefore print

```
cycle: ammunition-before-decisions
stages:      intent → research: 2 min · research → spec: overlap (353f76d) · spec → plan: 12 min · plan → build: 25 min
deviations:  3
spec amendments after acceptance: 1
council demands: 6 · risks: 12 · verifier findings: 4

cycle: 2026-09-12-council-seats-joker-and-scenarios
stages:      intent → research: 2 min · research → spec: 1 min · spec → plan: 13 min · plan → build: 1 min
deviations:  2
spec amendments after acceptance: 1
council demands: 7 · risks: 11 · verifier findings: not computable (the section is prose, not a list)
```

That is the script's real output on both cycles, and it matches every number in the tables above except two, both on purpose: **spec → plan** reads 12 and 13 minutes instead of 19 and 32, and **plan → build** reads 1 minute instead of 25 in cycle B. Those are the handoff rule doing its job — the clock runs from the spec's *approval* and the plan's *acceptance*, not from the moment each file first appeared. The naive numbers in the tables above are what the metric returned before the rule; these are what it returns after.

Anything git cannot answer says `not computable: <reason>`. Nothing in this list comes from the session's own account of what it did.
