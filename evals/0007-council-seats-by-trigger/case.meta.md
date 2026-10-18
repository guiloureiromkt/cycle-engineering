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

**2026-09-20 · which judge graded this, and why the question is on the record.** This case still carries one `llm` grader (`seats-scenario-and-signposts`), and the judge model is chosen by the `claude plugin eval` CLI, not by anything in this repository. **No graded verdict has been recorded for it since the seven-seat council landed**, so there is nothing yet to attribute. When one is recorded here, it names the judge model it was produced under. Without that, a later re-run that disagrees is unreadable: "the judge changed" and "the resolver regressed" look identical, and nobody re-runs a paid case to find out which. Raised by the Mule at gate 4 of `2026-09-20-pool-triggers-match-prose` (domain: platform). Doing the same for every case is a follow-up, not that cycle's work — and note `0008`, the case that gates the publish, has carried no `llm` grader since 2026-09-20, so no judge can flip it.

**2026-09-20 · the criteria said "five" twice.** Both meant the fixed seats, which have been seven since `2026-09-19-two-seats-the-council-does-not-have`. Corrected to "seven" in the same commit. The seat **ids** the criteria name are unaffected by the trigger change: under the new triggers, fixture `g` lights `commercial`, `cx`, `marketing`, `brand-voice` and `content`, so condition 1 keeps a five-seat margin.

### 2026-10-17 · no run, and why
Slice 1 (the diagnosis) changed a file this case covers, but its fixture has no `size:`, which keeps the old path by design (asserted by `tests/diagnosis.test.mjs`), and `small`/`project` keep the five gates until slice 7. 0002 and 0017 ran for the routing and the session text; 0018 and 0019 for the new skill.
