# 0006-gates-read-research · provenance and hand-checks

**origin:** reach proof for R9 of specs/ammunition-before-decisions.md, 2026-09-12. Ran 4/4 on 0.3.0 and again on 0.4.0 without council.json (the defaults path).

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| an Agent dispatch to cycle:devils-advocate naming research/… | `the-advocate-was-dispatched-with-the-research` (tool_used: Agent with input_match on the research path) — the dispatch's own argument, not a claim about it |
| a risk row whose origin is the advocate and names a research assumption | `the-risks-trace-back-to-the-research`, an llm grader reading the produced plan |
| status stays draft | same grader, condition 3 |
| no src/tests modified | `created-nothing-under-src` |

**hand-checks:** none.
