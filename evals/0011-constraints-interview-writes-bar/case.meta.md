# 0011-constraints-interview-writes-bar

Provenance: written 2026-09-16 building `plans/constraints-bar.md` step 9 (direction 1 of 5: R2/R4/R5). Fixture `k` is a fresh, minimal JS repo (`package.json`, `.eslintrc.json`, one source file, one hand-written test) with no `CONSTRAINTS.md`, so Step 0's detection has real signal to report against.

Verifies: spec `specs/constraints-bar.md` R2 (four-question interview, one at a time, each with a default) and R4/R5 together (the file lands with the four sections in the fixed order, and "Enforced with numbers" never states a number the fixture's own tooling — eslint and a bare test script, no coverage — cannot check today).

Hand-check the graders cannot express: whether the two-line Step-0 report is genuinely a *report* ("found X, Y") and not a rephrased version of the four questions. Not graded here; read the trace by hand once before trusting this case's llm grader long-term, per `evals/README.md`'s note that a judge over a long trace gets noisy — this trace should stay short (small fixture, one file to write), so the risk is low but not zero.

Not yet run against `claude plugin eval` — built as a standing artifact per `plans/constraints-bar.md` step 9/10, validation with `--case '0011-constraints-interview-writes-bar' --max-cost-usd 0.02` deferred to whoever runs the gate next (real API cost, out of scope for this build session).

**2026-09-20 · the judge now reads CONSTRAINTS.md, not the trace.** `focus: {source: trace}` is the shape `tests/refs.test.mjs` rejects since today (a judge over a trace sees the first and last twelve messages; a judge over the last message voted 3–0 against a correct `0005` run on 2026-09-17). Condition 2 of the old criteria — *no invented Enforced number* — is a claim about the file and is now graded from the file. Condition 1 — *at most four questions, one at a time, each with a default* — is a claim about the conversation and has no artifact; it is now the **hand-check** this file already named for the Step-0 report, read by a person once, not scored. If the skill ever writes its interview to `.cycle/work/`, it becomes gradable from a file.

