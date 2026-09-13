# 0008-council-all-agree · provenance and hand-checks

**origin:** council demand on plan v1 (2026-09-12): the 'all seats agree' warning must exist in a run, not only in the agent text. Two runs on 0.4.0, both 4/4; the warning branch has never been seen in practice, because even a typo plan gives the seats something true to demand.

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| resolver shows five seats, no pool seat | `the-resolver-ran` plus the llm grader's condition 1 |
| the all-agree warning, or real demands without it | llm grader, condition 2 |
| the Mule dispatched separately | llm grader, condition 3, plus `the-gates-were-real-dispatches` (Agent min 2) |
| status draft; only the plan modified | llm grader, condition 4 |

**hand-checks:** none.
