---
name: using-cycle
description: Use at the start of work that builds or changes something in a repository that follows the cycle (it has intent/, plans/ or .cycle/), code or not (a feature, a bug, a page, a campaign, a note), and before editing anything. Including when the request comes with "it's simple", "just do it", "no questions", "I know what I want" or "I'm in a hurry". A question that changes nothing needs no routing.
---

# Using the cycle

Router: which stage the request is in, which skill runs next. One minute. The answer may be "go straight to build", only when an accepted plan exists; routing decides that, not hurry.

**Subagent dispatched with a specific task: skip this skill and do the task.**

## Priority
1. Explicit user instruction and the repo's `CLAUDE.md`.
2. This skill and the other cycle skills.
3. Default behavior.

## Routing

Look at `intent/`, `research/`, `specs/`, `plans/` (frontmatter `status`). A file outside these folders or without frontmatter **does not count**: a `plan-x.md` in the repo root is a draft by definition, even if the user says they approved it. Then:

| Situation | Go to |
|---|---|
| New request, no `intent/<x>.md` | `cycle:intent` (it opens with `cycle:diagnosis`) |
| A plan-looking file outside `plans/`, or handed over as "approved" | `cycle:intent`: it is a draft by definition, and the diagnosis opens there |
| Intent exists but `status: draft` | `cycle:intent` (close and accept) |
| Intent accepted with `size: quick` and its ten-line plan accepted | `cycle:build` |
| Intent accepted with `size: small`, and `path: known` or its research done | `cycle:plan` (the spec may be skipped: the size is the reason) |
| Intent accepted, no `specs/<x>.md`, no `research/<x>.md` with `status: done` | `cycle:research` |
| Research done, no `specs/<x>.md` | `cycle:spec` |
| `specs/<x>.md` exists (approved or draft), no accepted `plans/<x>.md` | `cycle:spec` to approve, then `cycle:plan` — never back to research: artifacts from before 0.3.0 are not re-routed |
| Plan `status: accepted` | `cycle:build` |
| Build done, proof not pasted | `cycle:test` |
| About to open a PR, merge or publish | `cycle:deploy` |
| Alert, ticket, production bug, routine review | `cycle:maintain` |
| New model, new skill, new practice | `cycle:evolve` |

## Sizes

`cycle:diagnosis` says the size out loud at the intent; the person can object, and the size only grows. Each size is defined in `cycle:diagnosis`; this table says only what runs.

**The router never sizes.** A new request goes to `cycle:intent`, whose diagnosis says the size. Even at `quick`, the short intent and the ten-line plan come first, and nothing is edited before the person's one word.

| Size | Stops | Research | Spec | Reviews before the build | After the build |
|---|---|---|---|---|---|
| **quick** | 1: the intent and the ten-line plan, accepted with one word | none | none | none | proof shown + verifier |
| **small** | 2: intent, plan | one shallow pass when the path is not known | optional; the size is the reason | advocate only when a real decision is left after research; none when the path is known | proof + verifier |
| **project** | 2, plus the release | the trigger table of `cycle:research` | required | the advocate and the pre-mortem while a real decision is left (none on a known path); the Mule is offered here only (`cycle:plan`, "Gates by size") | proof + verifier |
| any size **+ a stake** | the owner's step before the action, with the hand-written file for a production release | at least as above | as above | the council joins, without asking | as above |

The stakes are listed once, in `skills/diagnosis/references/stakes.md`. `quick` skips research and spec and still has an accepted ten-line plan (`size: quick`, `research: skipped · quick`, `spec: skipped · quick`); `small` skips research when the path is known and may skip the spec, saying so in the plan; nothing else skips them. An artifact with no `size:`, or with `S`, `M`, `L` (written before 0.10.0), keeps the old path: research by trigger, a spec, all five gates; a legacy plan marked `research: skipped · shortcut` stays valid. Never give a size to an artifact that has none.

## Rationalizations (and the answer)

| Thought | Reality |
|---|---|
| "The accepted intent is already the spec" | Intent says what. Spec says how and what worries you. Without a spec, the worry shows up in the PR. |
| "A plan would be ceremony with no reader" | The reader is whoever picks this up in six months without this conversation, and the PR reviewer who checks the diff against the plan. |
| "It's quick, I'll just do it" | Quick is a size the diagnosis says out loud, and it still waits for one word: the short intent and the ten-line plan come first. |
| "Small surface, go straight in" | Small is a size the diagnosis says out loud. Quick still requires a ten-line accepted plan, not zero plan. |
| "The user asked for speed" | Speed changes the size of the artifact, not its existence. |
| "I followed the spirit of TDD" | Spirit without a test committed first is code without proof. |
| "Nobody but me would execute this plan" | You are a subagent with zero context next session. The plan is for you. |

## When routing
Announce: "cycle: <stage> → invoking cycle:<skill>". Invoke it with the Skill tool. Never read the SKILL.md with Read.
