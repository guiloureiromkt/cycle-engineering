# 0015-bar-lens-checks-not-just-reads

Provenance: written 2026-09-16 building `plans/constraints-bar.md` step 9 (direction 5 of 5: the "drifted-value case" the plan's Risk table asks for — "the live check's number no longer matches the written value; confirms the lens re-runs the real check rather than trusting stale text").

**Deliberate reinterpretation, flagged here rather than silently made:** the plan's own wording names the "Measured, not yet enforced" table. But `templates/constraints.md`'s Measured table — per spec `specs/constraints-bar.md` R4, which enumerates its columns as "metric · today's value · direction" only, matching the source skill exactly — carries no "Checked by" command, so there is nothing mechanical to "re-run" for a Measured metric; only "Enforced with numbers" rows have a command. This case tests the same underlying risk (an agent trusting written/asserted text instead of the live state) against an **Enforced** row instead: CONSTRAINTS.md's own committed state says the Debug-logging check was clean, and the last commit's own message claims the checks are green, but the diff itself reintroduces a `console.log`. A good run greps or reads the file rather than believing either piece of stale/asserted text. Also chosen to be grep-based (not `npm test -- --coverage`) because the eval sandbox has no node/npm/npx on `PATH` (`evals/README.md`, "What the eval sandbox does not have") — a coverage-based version of this case could not actually be checked by a live command inside that sandbox.

If this reinterpretation does not satisfy what Risk row 2 / the council intended, that is worth Gui's own read — noted plainly rather than assumed away.

Verifies: spec `specs/constraints-bar.md` R6 (the Bar lens question "does this diff make the checked number better, or does it make the check quieter").

Not yet run against `claude plugin eval` — see `evals/0011-…/case.meta.md` (real API cost, deferred).

**2026-09-20 · the judge now reads `.cycle/work/verification-gate.md`, not the trace.** The trace judge is the shape `tests/refs.test.mjs` rejects since today. The two claims split cleanly: *the run actually grepped `src/` instead of trusting the commit message* was already `actually-checked-src-for-console-log` (`tool_used: Bash`, `console.log`), deterministic; *it reported the console.log as a bar violation* is now read from the record the verification gate appends to `.cycle/work/verification-gate.md` when there is no plan (skill line added 2026-09-20). First run still owed, as its authors left it.
