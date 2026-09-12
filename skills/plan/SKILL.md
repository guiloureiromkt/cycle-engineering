---
name: plan
description: Use when an approved specs/<name>.md exists and building is next, when someone hands over a plans/<name>.md saying "implement exactly this", and when a plan says "risks: none" on a change touching money, permission, schema, destructive data or a screen.
---

# Plan: five gates

Nothing is implemented without an accepted plan. Written in plan mode, it passes five gates **on paper** and only then gets `status: accepted` with the acceptor's name. Gates are the agent's work, not questions to the user: "no more questions" turns none off. The only question to the human: acceptance.

## Precondition
An accepted `intent/<x>.md` and an approved `specs/<x>.md` exist and the frontmatter points to them; otherwise the plan is a draft by definition: back to `cycle:intent` or `cycle:spec`, even if the user says "I reviewed it, it's great".

## Models
Read `.cycle/config.json` → `models`; pass it as the `model` argument when dispatching the advocate, council, verifier, gauntlet critic and research subagents (defaults: advocate `inherit`, council `sonnet`, joker `sonnet`, verifier `sonnet`, sweeps `haiku`, research `inherit`, critic `inherit`). The main session's model is the user's choice.

## Steps
1. **Plan mode.** REQUIRED SUB-SKILL: `cycle:writing-plans`. Ask what breaks, which step is riskiest, what you discarded. Iterate until an engineer who never saw this conversation could implement from it. Technical unknowns (a library to pick, an API limit to confirm) go to a "Technical unknowns" section appended to `research/<name>.md` — decision · justification · alternatives — never a second research file.
2. **Gate 1 · Graph.** Shape of the work (what splits, what is sequential, separate verifier, human gate). REQUIRED SUB-SKILL: `cycle:task-graph`.
3. **Gate 2 · Devil's advocate.** Agent `devils-advocate`, fresh context, always. The request carries four paths: the plan, the spec, the intent and `research/<name>.md`.
4. **Gate 3 · Pre-mortem.** "Six months later, this failed **because of something inside the plan**. Why?" (a step skipped, a test that lied, a wrong assumption, a migration order). Severity (🔴 🟠 🟡) + a cheap test before building. Events from outside the plan belong to the Mule (gate 4).
5. **Gate 4 · Council and the Mule.**
   - **Resolve the seats by script:** `node <plugin root>/scripts/resolve-seats.mjs plans/<x>.md [--extra <ids the owner named>]` (it reads `.cycle/council.json`, or the plugin template when the repo has none). Paste its `summary` line into the conversation: "council: N seats — …".
   - **Lite or full.** `gates: lite` (default): the council and the Mule run only when a gate trigger lights (money, hours, permission, schema, destructive data, user surface, more than 8 files) **and** the owner answers ONE question: "Run the council with these N seats (<ids>) and the Mule? <cost_hint>". Record the answer; if no, `council: skipped` and `joker: skipped`. `gates: full`: run both without asking.
   - **Dispatch the council** (agent `council`, `models.council`) with the four paths, the script's JSON (seats with briefs, `knowledge`, `skill`), and the horizons (the scenario seat writes two or three futures per horizon, one line each).
   - **Write the risks table now**: the advocate's, the pre-mortem's and the council's rows, with origin; the scenario seat's `Signposts:` lines go under `## Signposts` in the plan. Commit.
   - **Then dispatch the Mule** (agent `joker`, `models.joker`, default `sonnet`), in its own fresh context, with: the intent's problem statement, the research's recommendation and "What we did not check", the plan's task list and the **committed** risks table, and the `domains` from the script. Never in the same dispatch as the council. Its demand joins the risks table with origin `joker`.
   - **Record** in the plan's frontmatter: `council: [<ids that sat>, scenario]` and `joker: <domain> — <demand or "survives">`.
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
