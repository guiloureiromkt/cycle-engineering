# 0014-bar-routes-bare-repo-no-tooling

Provenance: written 2026-09-16 building `plans/constraints-bar.md` step 9 (direction 4 of 5: the bare/no-tooling routing this step's bullet list asks for, and `skills/constraints/SKILL.md` Step 0's "nothing detected" fallback). Fixture `l` is deliberately minimal: a README and one shell script, no manifest of any kind.

Verifies: spec `specs/constraints-bar.md` R5 in its emptiest form — no number invented at all, because there is no tooling to check one — and the intent's own sub-intent "stack-agnostic, not JS-specific" taken to its limit (no stack detected).

Hand-check: whether the run still writes the Floor section (tool-free, always applies) even with nothing else to enforce — the grader only checks the file exists and that nothing was invented, not that the Floor specifically survived; worth a human glance.

Not yet run against `claude plugin eval` — see `evals/0011-…/case.meta.md` (real API cost, deferred).

**2026-09-20 · the judge now reads CONSTRAINTS.md, not the trace.** `focus: {source: trace}` is the shape `tests/refs.test.mjs` rejects since today. Condition 2 — *no Enforced row against absent tooling* — is a claim about the file and is graded from the file. Condition 1 — *Step 0's report says plainly that nothing was detected* — is a claim about the conversation with no artifact; it is now a **hand-check**, read by a person once, not scored.

