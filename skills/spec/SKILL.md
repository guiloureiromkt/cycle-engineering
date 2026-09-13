---
name: spec
description: Use when an intent/<name>.md has status accepted and no approved specs/<name>.md exists yet, and when the spec exists but the change has a user interface and still has no visual reference, design prompt or approved mock.
---

# Spec = Design

Requirements and design in one session, with the repo's policies applied while writing. Output: `specs/<name>.md` from the plugin template — written `status: draft` and turned `approved` only by the owner's own word (step 6) — and, when there is a screen, an approved mock that becomes the plan's visual Proof.

## Precondition
`research/<name>.md` with `status: done`, named in this spec's frontmatter as `research: research/<name>.md`. The only spec-less path is the router's shortcut, which has no spec at all. Each requirement that rests on a finding names its row; each that rests on an assumption says so.

## The prompt (the skill runs it; later it becomes a trigger on intent acceptance)
> Read `intent/<name>.md` and produce a requirements and design spec to integrate this into the existing code. Apply the available skills so the spec follows this repo's brand guidelines, security policies and UX standards. Document it fully in `specs/<name>.md`, ready to hand to engineering. State clearly any area of concern, especially where policies contradict each other and both cannot be satisfied.

## Steps
1. **Policies in force.** Load the policy skills the repo's `CLAUDE.md` names (brand voice, design system, security review, whatever the repo has). List them under "Policies in force" in the spec. They constrain the writing; they are not a checklist afterwards.
2. **Requirements.** Run the prompt. Each requirement points to where it came from (intent section or sub-intent) and how it is verified (test · screenshot · metric).
3. **Design, when there is a screen, in this order:** visual reference (the benchmarks table of the research artifact, not a new search) → existing screen captured → one design prompt per surface → mock approved by the user before code. Details in `references/design-steps.md`. The approved mock is recorded by path in the spec and becomes the visual Proof of `plans/<x>.md`.
4. **Areas of concern first.** Each policy conflict goes in the table with the policy owner. The product owner resolves it before engineering sees the spec.
5. **Questions from the intent:** answered here or explicitly carried to the plan.
6. **Approval is the owner's word, quoted.** The product owner reviews: does it solve the intent's problem? Their answer goes in the frontmatter verbatim — `approved_by: <name> · <date> · "<their words>"` — and only then does `status:` become `approved`. Commit next to the intent. Next: `cycle:plan`.
   **"No questions", "fast-track", "you decide", "don't ask me" are permission to stop asking — not an approval**, and neither is silence. Under any of them the spec is still written, still `status: draft`, and the message ends with the one question that remains. A session that writes `approved_by: user (in-session)` has approved its own work in someone else's name; that is the one signature the method never forges.

## When the spec can be short
No screen, no new data, no policy in play: only the requirements table and "Out of scope". **Short, not absent.** "The intent is already the spec" is the usual rationalization for skipping this stage.

## Common mistakes
- Design decided without a reference: the mock comes out as the average of the internet.
- Mock generated but not approved by the user: not Proof.
- Concern without an owner: becomes a surprise in the PR.
- Reading a hurry as an approval. Measured on 13/09: given an accepted intent, a done research and "no questions", a run wrote `status: approved` with `approved_by: user (in-session) · fast-track`. Nobody had approved anything.
- Spec that slices work into tasks: that is the plan.
