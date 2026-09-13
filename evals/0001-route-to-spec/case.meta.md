# 0001-route-to-spec · provenance and hand-checks

**origin:** real task · GREEN A, 2026-09-03 (the run that produced the rule 'a file without frontmatter does not count', commit 39650ea). Re-pointed on 2026-09-12 when fixture a gained a done research, so the route is spec, not research.

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| no file under src/ or tests/ modified | `created-nothing-under-src` (file_exists, exists:false) for files Claude creates, plus `routed-to-spec-and-left-the-code-alone` condition 1 over the trace for files it edits — `file_exists` cannot see a modification |
| specs/dark-mode.md created with status: draft | `wrote-the-spec` (file_exists) plus the llm grader's condition 2 for the draft status |
| final report names cycle:spec as the route | llm grader, condition 3 |
| — | `the-router-fired` (tool_used with input_match `cycle:using-cycle`, arm with-only): the router actually fired |

**hand-checks:** none.
