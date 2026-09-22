# 0013-bar-lens-silent-on-unrelated-diff

Provenance: written 2026-09-16 building `plans/constraints-bar.md` step 9 (direction 3 of 5: the true-negative half of R6, and the Risk-1 concern the advocate raised about runaway/false-positive dispatch once `CONSTRAINTS.md` exists). Same custom two-commit `scaffold.sh` pattern as `0012` and for the same reason — see that case's `case.meta.md`.

Verifies: spec `specs/constraints-bar.md` R6 together with `plans/constraints-bar.md`'s step 4 scope bound ("dispatch only on files matched by that rule, never repo-wide").

Hand-check: an `llm` grader asserting an *absence* is weaker evidence than one asserting a presence (it cannot distinguish "correctly silent" from "silent because the run did nothing at all"); this case does not pair with a `tool_used … max: 0` grader because `cycle:verification-gate` firing generically (its own `>8 files` or other lenses) is not itself wrong here — only a Bar-specific finding on this diff would be.

Not yet run against `claude plugin eval` — see `evals/0011-…/case.meta.md` (real API cost, deferred).

**2026-09-20 · the judge now reads `.cycle/work/verification-gate.md`, not the trace.** `focus: {source: trace}` is the shape `tests/refs.test.mjs` rejects since today. This case's only grader was that judge — the true-negative half of R6 ("the lens stays silent on an unrelated diff") has no `tool_used` shape: silence is the absence of a tool call, and the sandbox cannot dispatch verifiers anyway (`Agent` is not in `allowed_tools`). The artifact it now reads exists because `cycle:verification-gate` appends its record to `.cycle/work/verification-gate.md` when there is no plan to record in (one line added to the skill on 2026-09-20). The case was never run by its authors; its first run is still owed, and it is the RED→GREEN of that skill line.

**2026-09-20, later · `verification-gate-fired` added** (the deterministic grader `0012` already had). The verifier's finding: `skills/verification-gate/SKILL.md`'s description never names Bar or `CONSTRAINTS.md` as a reason to invoke it, so on a README-only diff the skill may simply not fire — and then `.cycle/work/verification-gate.md` is never written and the judge would throw on a missing focus file. With this grader that outcome is a plain red ("the skill did not fire"), which is a finding about the skill's trigger, not a broken grader.
