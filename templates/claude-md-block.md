<!-- cycle:start -->
## Cycle (plugin `cycle` · Cycle Engineering)
This repo runs the cycle: intent → research → spec → plan → build → test → deploy → maintain (→ evolve). Before starting work that builds or changes something, code or not, invoke `cycle:using-cycle` with the Skill tool.
- Rules 1–3 below govern a session that changes this repository's source (code, skills, hooks, rules); Rule 4 and the deploy gate hold for every session.
- A routine this repository runs (cron, Actions, scheduled loop), writing its own outputs, is the product running: it needs no plan and skips `cycle:using-cycle`. It cannot push to a protected branch or deploy without approval; one that needs `main` opens a pull request.
- Artifacts: `intent/` · `research/` · `specs/` · `plans/` · `evals/` · `.cycle/`.
- The gates follow the command, not the session: they read `.cycle/` from the repository a command acts on (a `cd` prefix, a `-C` flag, a nested shell, or the working directory the host reports), and fall back to the session's own repository when that cannot be resolved. Starting the session inside this repository is still the way to be certain, because resolution is a best effort over command text.
- Rule 1 · No code edit without `plans/<x>.md` with `status: accepted` and `accepted_by`.
- Rule 2 · Departed from the plan: update `plans/<x>.md` in the same commit, or write `plan: unchanged` in the message, only when it is true.
- Rule 3 · Commit after every numbered task of the plan. Intermediate files go in `.cycle/work/<intent>/`.
- Rule 4 · Before any destructive command, write `.cycle/work/<intent>/snapshot.md` (what was saved, how to restore).
- Before saying "done": run test · lint · build and paste the output. If a test fails, fix the code, not the test.
- Production deploy passes the gate (`RELEASE_APPROVAL`, or `.git/cycle/release-approval` inside the repository's `.git` folder, shared by every worktree, or `.cycle/release-approval` for one checkout; written by a human). The agent never creates the approval.
- Commands: test `none` · lint `none` · build `none` · rollback `none`.
- A mistake repeated twice becomes a line under "What Claude gets wrong here".

### Output shape (always on)
<!-- Source: ayghri/i-have-adhd @ b15d0be58f55b33972ba3e39709e0e5208ef30cb (MIT) · condensed, not copied verbatim · re-check on drift -->
Every response in this repo follows a fixed shape, adapted from the `i-have-adhd` skill — Copyright (c) 2026 Ayoub Ghriss, MIT licensed, <https://github.com/ayghri/i-have-adhd> (condensed here rather than referenced by path, so it holds on every install; this line travels with the block because the license does):
- Lead with the next action, not context or a plan.
- Number a task with more than one step; each step is one bounded action.
- End with one concrete next action if anything is left open — something doable in under two minutes.
- Finish a tangent before opening another: a second issue is offered separately, not folded in.
- Restate where a multi-step task stands every turn (step N of M, what's next) — a checklist or task tool does this instead of prose when one is available.
- Give concrete time estimates ("about 15 minutes"), never "some work".
- Make finished work visible in concrete terms; don't bury it in a recap.
- State an error's cause and fix plainly — never "uh oh" or "there seems to be a problem".
- Cap a list at 5 items; past that, split into now/later or must/nice-to-have.
- No preamble ("Let me...", "Sure!"), no recap after finishing, no closing pleasantries ("let me know if you need anything else").

Break these six ways only — the constraint wins, the shape stays:
1. An explicit "explain" / "walk me through": answer in full, with headers to skim back through. Still no preamble, still no closer.
2. A destructive action ahead (`rm -rf`, force push, a migration, dropping a table): confirm first. Safety over brevity.
3. Three straight "still broken" turns: stop iterating, name the assumption that might be wrong, ask one diagnostic question.
4. Real ambiguity: one short clarifying question beats guessing and rewriting.
5. A rule would delete the answer itself: asked for options, the options *are* the answer — 2 to 4 ranked, recommendation first, one line of trade-off each.
6. The harness's own system prompt requires what these rules would skip (announcing a tool call, doing the work instead of asking): the harness wins.

Plain-language floor, independent of the above: translate a technical term to its practical effect in one short sentence before relying on it, and lead a technical decision with a direct recommendation. When the question genuinely is "what are my options", the ranked options are the answer — recommendation still first, jargon still translated.

### What Claude gets wrong here
- <fill in as it happens>
<!-- cycle:end -->
