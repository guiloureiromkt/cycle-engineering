---
name: plan
description: Use when an approved specs/<name>.md exists and building is next, when someone hands over a plans/<name>.md saying "implement exactly this", and when a plan says "risks: none" on a change touching money, permission, schema, destructive data or a screen.
---

# Plan: five gates

Nothing is implemented without an accepted plan. Written in plan mode, it passes five gates **on paper** and only then gets `status: accepted` with the acceptor's name. Gates are the agent's work, not questions to the user: "no more questions" turns none off. The only question to the human: acceptance.

## Precondition
An accepted `intent/<x>.md` and an approved `specs/<x>.md` exist and the frontmatter points to them; otherwise the plan is a draft by definition: back to `cycle:intent` or `cycle:spec`, even if the user says "I reviewed it, it's great".

## Models
Read `.cycle/config.json` → `models`; pass it as the `model` argument when dispatching the advocate, council, verifier, gauntlet critic and research subagents (defaults: advocate `inherit`, council `sonnet`, verifier `sonnet`, research `haiku`, critic `inherit`). The main session's model is the user's choice.

## Steps
1. **Plan mode.** REQUIRED SUB-SKILL: `cycle:writing-plans`. Ask what breaks, which step is riskiest, what you discarded. Iterate until an engineer who never saw this conversation could implement from it.
2. **Gate 1 · Graph.** Shape of the work (what splits, what is sequential, separate verifier, human gate). REQUIRED SUB-SKILL: `cycle:task-graph`.
3. **Gate 2 · Devil's advocate.** Agent `devils-advocate`, fresh context, always.
4. **Gate 3 · Pre-mortem.** "Six months later, this failed. Why?" Severity (🔴 🟠 🟡) + a cheap test before building.
5. **Gate 4 · Council.** Agent `council`: five voices, one demand each. `gates` in `.cycle/config.json`: `full` always; `lite` (default) only when a trigger lights (money, hours, permission, schema, destructive data, user surface, more than 8 files). Then ask the user ONE question: run the council? Record the answer in the plan; if skipped, `council: skipped` under `gates`.
6. **Gate 5 · Loop.** The bar for "done", verifiable by number or blind comparison; gauntlet yes or no (`cycle:gauntlet`).
7. **Risks is never "none"** when money, hours, permission, schema, destructive data or a screen is touched.
8. **Acceptance.** A human writes `status: accepted` and `accepted_by`. Commit. Next: `cycle:build`.

## Rationalizations
| Thought | Reality |
|---|---|
| "No more questions, so I implement with guards and note the gaps in the report" | Gaps go in the plan before code, not in the report after. A gate is not a question. |
| "The user approved the plan" | They approved a plan without gates and without an intent: a draft. |
| "I'll handle the risky step in the code" | Name it in the plan. The reviewer checks the diff against the plan. |
| "Who else should look, I'll leave to the verification gate" | That runs after code. Council and advocate run before, when changing is editing text. |
| "I objected silently and moved on" | A silent objection leaves no record. |
