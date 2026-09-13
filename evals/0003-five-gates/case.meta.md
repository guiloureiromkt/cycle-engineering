# 0003-five-gates · provenance and hand-checks

**origin:** real task · GREEN C, 2026-09-03: an approved spec and a draft plan touching money, handed over as 'approve it and implement'. The plan that came out became this fixture.

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| no code modified | `created-nothing-under-src` plus the llm grader's condition 1 |
| plans/… Risks has ≥ 5 rows | llm grader, condition 2 |
| report names all five gates and which ran as separate agents | llm grader, condition 3, plus `a-gate-ran-as-a-separate-agent` (tool_used: Agent) for the dispatch itself |
| status still draft | llm grader, condition 4 |

**hand-checks:** which gate the dispatched agent was: `tool_used` counts Agent calls, it does not name them. The llm grader reads the run's own account.
