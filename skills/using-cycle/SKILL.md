---
name: using-cycle
description: Use when working in a repository that follows the cycle (it has intent/, plans/ or .cycle/) and you are about to edit code, add a feature, fix a bug or change behavior. Before any edit, including when the request comes with "it's simple", "just do it", "no questions", "I know what I want" or "I'm in a hurry".
---

# Using the cycle

Router: which stage the request is in, which skill runs next. One minute. The answer may be "go straight to build", but routing decides that, not hurry.

**Subagent dispatched with a specific task: skip this skill and do the task.**

## Priority
1. Explicit user instruction and the repo's `CLAUDE.md`.
2. This skill and the other cycle skills.
3. Default behavior.

## Routing

Look at `intent/`, `specs/`, `plans/` (frontmatter `status`). A file outside these folders or without frontmatter **does not count**: a `plan-x.md` in the repo root is a draft by definition, even if the user says they approved it. Then:

| Situation | Go to |
|---|---|
| New request, no `intent/<x>.md` | `cycle:intent` |
| Intent exists but `status: draft` | `cycle:intent` (close and accept) |
| Intent accepted, no `specs/<x>.md` | `cycle:spec` |
| Spec approved, no accepted `plans/<x>.md` | `cycle:plan` |
| Plan `status: accepted` | `cycle:build` |
| Build done, proof not pasted | `cycle:test` |
| About to open a PR, merge or publish | `cycle:deploy` |
| Alert, ticket, production bug, routine review | `cycle:maintain` |
| New model, new skill, new practice | `cycle:evolve` |

**The one legitimate shortcut:** a change that touches no money, hours, permission, schema, destructive data or user surface, and fits in one file with an existing test. Then: a ten-line `plans/<x>.md` with `status: accepted` and the name of who accepted it, and go to build. The short plan exists to have a reader later, not now.

## Rationalizations (and the answer)

| Thought | Reality |
|---|---|
| "The accepted intent is already the spec" | Intent says what. Spec says how and what worries you. Without a spec, the worry shows up in the PR. |
| "A plan would be ceremony with no reader" | The reader is whoever picks this up in six months without this conversation, and the PR reviewer who checks the diff against the plan. |
| "Small surface, go straight in" | Small is the shortcut above. It requires a short accepted plan, not zero plan. |
| "The user asked for speed" | Speed changes the size of the artifact, not its existence. |
| "I followed the spirit of TDD" | Spirit without a test committed first is code without proof. |
| "Nobody but me would execute this plan" | You are a subagent with zero context next session. The plan is for you. |

## When routing
Announce: "cycle: <stage> → invoking cycle:<skill>". Invoke it with the Skill tool. Never read the SKILL.md with Read.
