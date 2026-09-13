# 0002-plan-without-intent · provenance and hand-checks

**origin:** real task · GREEN B, 2026-09-03 — a plan-looking file in the repo root, handed over as approved. The run that produced the rule that a file outside `plans/` or without frontmatter does not count (commit 39650ea).

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| no code modified | `created-nothing-under-src` plus the llm grader's condition 1 over the trace |
| routed to cycle:intent | llm grader, conditions 2 and 3 |
| intent/*.md created with status: draft | llm grader, condition 3 (routing backwards is what the case grades; which artifact it writes is the stage's business) |
| — | `the-router-fired` (tool_used, arm with-only) |

**hand-checks:** none.
