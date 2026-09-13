# 0007-council-seats-by-trigger · provenance and hand-checks

**origin:** the owner's improvised seven-seat council on 2026-09-12 14:50; the pool experiment (six pool seats added six demands the five did not); RED under 0.3.0 and two GREEN runs in evals/results/2026-09-12-0007-*.md.

**accepted_if, from the retiring JSON case, and where each landed**

| old check | landed as |
|---|---|
| resolver run and summary pasted with the right seats | `the-resolver-ran` (tool_used: Bash with input_match `resolve-seats`) plus the llm grader's condition 1 |
| pool seat lines name a lens or say what is missing | llm grader over the produced plan — the seat lines land in the risks table's origins; the council's own transcript is not in the plan file |
| two pool-origin demands in the risks table | llm grader, condition 3 |
| scenario block format and signposts | llm grader, condition 4 |
| frontmatter council: and joker: | llm grader, conditions 1 and 2 |
| the joker dispatch happens after a commit carrying the advocate's rows | `the-mule-came-after-a-commit` (tool_order: a `git commit` Bash call before an Agent call matching joker/Mule/shock) |
| status draft; no src/tests modified | llm grader, condition 5, plus `created-nothing-under-src` |

**hand-checks:** that the commit the Mule followed already contained the advocate's and the pre-mortem's rows. `tool_order` proves the shape, not the contents of the commit.
