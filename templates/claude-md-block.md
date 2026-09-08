<!-- cycle:start -->
## Cycle (plugin `cycle` · Cycle Engineering)
This repo runs the cycle: intent → spec → plan → build → test → deploy → maintain (→ evolve). Before editing code, invoke `cycle:using-cycle` with the Skill tool.
- Artifacts: `intent/` · `specs/` · `plans/` · `evals/` · `.cycle/`.
- Rule 1 · No code edit without `plans/<x>.md` with `status: accepted` and `accepted_by`.
- Rule 2 · Departed from the plan: update `plans/<x>.md` in the same commit, or write `plan: unchanged` in the message, only when it is true.
- Rule 3 · Commit after every numbered task of the plan. Intermediate files go in `.cycle/work/<intent>/`.
- Rule 4 · Before any destructive command, write `.cycle/work/<intent>/snapshot.md` (what was saved, how to restore).
- Before saying "done": run test · lint · build and paste the output. If a test fails, fix the code, not the test.
- Production deploy passes the gate (`RELEASE_APPROVAL` or `.cycle/release-approval`, written by a human). The agent never creates the approval.
- Commands: test `none` · lint `none` · build `none` · rollback `none`.
- A mistake repeated twice becomes a line under "What Claude gets wrong here".

### What Claude gets wrong here
- <fill in as it happens>
<!-- cycle:end -->
